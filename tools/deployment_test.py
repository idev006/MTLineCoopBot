#!/usr/bin/env python3
"""Production-oriented deployment verifier for MTLineCoopBot.

Standard-library only. Secrets are read from environment variables and are never
printed or written to the JSON report.

Suites:
  smoke   - safe Apps Script deployment checks; no secrets required
  direct  - direct Apps Script webhook gate checks; WEBHOOK_SECRET required
  gateway - LINE signature boundary checks; CHANNEL_SECRET required

Examples:
  python tools/deployment_test.py smoke --base-url https://script.google.com/macros/s/.../exec
  set WEBHOOK_SECRET=...
  python tools/deployment_test.py direct --base-url https://script.google.com/macros/s/.../exec
  set CHANNEL_SECRET=...
  python tools/deployment_test.py gateway --gateway-url https://gateway.example/webhook
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

DEFAULT_TIMEOUT = 20.0
USER_AGENT = "MTLineCoopBot-DeploymentVerifier/1.0"


@dataclass
class HttpResult:
    status: int
    url: str
    body: str
    json_body: Optional[Any]
    latency_ms: int


@dataclass
class TestResult:
    name: str
    passed: bool
    detail: str
    status: Optional[int] = None
    latency_ms: Optional[int] = None


class PreserveMethodRedirect(urllib.request.HTTPRedirectHandler):
    """Preserve method/body for 307/308; use RFC-compatible defaults otherwise."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D401
        if code in (307, 308):
            return urllib.request.Request(
                newurl,
                data=req.data,
                headers=dict(req.headers),
                origin_req_host=req.origin_req_host,
                unverifiable=True,
                method=req.get_method(),
            )
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _opener() -> urllib.request.OpenerDirector:
    context = ssl.create_default_context()
    return urllib.request.build_opener(
        PreserveMethodRedirect(), urllib.request.HTTPSHandler(context=context)
    )


def request(
    method: str,
    url: str,
    *,
    payload: Optional[bytes] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: float = DEFAULT_TIMEOUT,
) -> HttpResult:
    safe_headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if headers:
        safe_headers.update(headers)
    req = urllib.request.Request(url, data=payload, headers=safe_headers, method=method)
    start = time.monotonic()
    try:
        with _opener().open(req, timeout=timeout) as response:
            status = int(response.status)
            final_url = response.geturl()
            raw = response.read()
    except urllib.error.HTTPError as exc:
        status = int(exc.code)
        final_url = exc.geturl()
        raw = exc.read()
    latency = int((time.monotonic() - start) * 1000)
    body = raw.decode("utf-8", errors="replace")
    try:
        parsed = json.loads(body)
    except (json.JSONDecodeError, TypeError):
        parsed = None
    return HttpResult(status, final_url, body, parsed, latency)


def json_post(url: str, obj: Any, timeout: float) -> HttpResult:
    return request(
        "POST",
        url,
        payload=json.dumps(obj, separators=(",", ":")).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        timeout=timeout,
    )


def add_path(base: str, path: str) -> str:
    return base.rstrip("/") + "/" + path.lstrip("/")


def with_secret(base: str, secret: str) -> str:
    parts = urllib.parse.urlsplit(base)
    query = urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
    query.append(("webhook_secret", secret))
    return urllib.parse.urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(query), parts.fragment)
    )


def error_code(result: HttpResult) -> Optional[str]:
    body = result.json_body
    if not isinstance(body, dict):
        return None
    err = body.get("error")
    if isinstance(err, dict):
        return err.get("code")
    return None


def result(name: str, ok: bool, detail: str, r: Optional[HttpResult] = None) -> TestResult:
    return TestResult(
        name=name,
        passed=ok,
        detail=detail,
        status=r.status if r else None,
        latency_ms=r.latency_ms if r else None,
    )


def suite_smoke(base: str, timeout: float) -> list[TestResult]:
    tests: list[TestResult] = []

    r = request("GET", add_path(base, "api/health"), timeout=timeout)
    ok = (
        r.status == 200
        and isinstance(r.json_body, dict)
        and r.json_body.get("ok") is True
        and isinstance(r.json_body.get("data"), dict)
        and r.json_body["data"].get("status") == "ok"
    )
    tests.append(result("health endpoint", ok, "expected ok=true and data.status=ok", r))

    r = request("GET", base, timeout=timeout)
    ok = r.status == 200 and isinstance(r.json_body, dict) and r.json_body.get("ok") is False
    tests.append(result("root GET fails closed", ok, "root must not expose application data", r))

    r = request("GET", add_path(base, "api/definitely-not-a-route"), timeout=timeout)
    ok = r.status == 200 and error_code(r) == "NOT_FOUND"
    tests.append(result("unknown API route", ok, "expected NOT_FOUND envelope", r))

    r = request("GET", add_path(base, "api/loan/calculate"), timeout=timeout)
    ok = r.status == 200 and error_code(r) == "METHOD_NOT_ALLOWED"
    tests.append(result("wrong method rejected", ok, "GET on POST-only route must fail closed", r))

    protected = [
        "api/member/me/profile",
        "api/member/me/savings",
        "api/member/me/loans",
        "api/member/me/dividends",
        "api/web/session/verify",
        "api/web/members/list",
        "api/web/admin/settings",
        "api/web/admin/staff",
        "api/web/admin/roles",
        "api/web/admin/audit-log",
        "api/web/reports/summary",
    ]
    for path in protected:
        r = json_post(add_path(base, path), {}, timeout)
        code = error_code(r)
        ok = r.status == 200 and isinstance(r.json_body, dict) and r.json_body.get("ok") is False and code == "UNAUTHENTICATED"
        tests.append(result(f"unauthenticated: /{path}", ok, f"expected UNAUTHENTICATED, got {code}", r))

    malformed = b'{"broken":'
    r = request(
        "POST",
        add_path(base, "api/loan/calculate"),
        payload=malformed,
        headers={"Content-Type": "application/json"},
        timeout=timeout,
    )
    ok = r.status == 200 and error_code(r) == "VALIDATION"
    tests.append(result("malformed JSON rejected", ok, "expected VALIDATION envelope", r))

    r = json_post(base, {"events": []}, timeout)
    ok = (
        r.status == 200
        and isinstance(r.json_body, dict)
        and r.json_body.get("status") == "error"
        and "Unauthorized" in str(r.json_body.get("message", ""))
    )
    tests.append(result("direct webhook without secret rejected", ok, "must reject before event processing", r))
    return tests


def suite_direct(base: str, timeout: float) -> list[TestResult]:
    secret = os.environ.get("WEBHOOK_SECRET")
    if not secret:
        return [result("WEBHOOK_SECRET present", False, "set WEBHOOK_SECRET in environment; never commit it")]

    tests = suite_smoke(base, timeout)
    wrong = "deployment-verifier-intentionally-wrong"
    r = json_post(with_secret(base, wrong), {"events": []}, timeout)
    ok = isinstance(r.json_body, dict) and r.json_body.get("status") == "error"
    tests.append(result("wrong downstream secret rejected", ok, "wrong secret must fail closed", r))

    r = json_post(with_secret(base, secret), {"events": []}, timeout)
    ok = isinstance(r.json_body, dict) and r.json_body.get("status") == "ok"
    tests.append(result("valid downstream secret accepted", ok, "empty webhook should pass secret gate", r))
    return tests


def line_signature(raw: bytes, channel_secret: str) -> str:
    digest = hmac.new(channel_secret.encode("utf-8"), raw, hashlib.sha256).digest()
    return base64.b64encode(digest).decode("ascii")


def gateway_post(url: str, raw: bytes, signature: Optional[str], timeout: float) -> HttpResult:
    headers = {"Content-Type": "application/json"}
    if signature is not None:
        headers["X-Line-Signature"] = signature
    return request("POST", url, payload=raw, headers=headers, timeout=timeout)


def suite_gateway(gateway_url: str, timeout: float) -> list[TestResult]:
    secret = os.environ.get("CHANNEL_SECRET")
    if not secret:
        return [result("CHANNEL_SECRET present", False, "set CHANNEL_SECRET in environment; never commit it")]

    tests: list[TestResult] = []
    raw = b'{"events":[]}'

    r = gateway_post(gateway_url, raw, None, timeout)
    tests.append(result("gateway missing signature", r.status in (400, 401, 403), "must reject", r))

    r = gateway_post(gateway_url, raw, "%%%not-base64%%%", timeout)
    tests.append(result("gateway malformed signature", r.status in (400, 401, 403), "must reject", r))

    wrong_sig = line_signature(raw, secret + "-wrong")
    r = gateway_post(gateway_url, raw, wrong_sig, timeout)
    tests.append(result("gateway wrong signature", r.status in (400, 401, 403), "must reject", r))

    valid_sig = line_signature(raw, secret)
    tampered = b'{"events":[{}]}'
    r = gateway_post(gateway_url, tampered, valid_sig, timeout)
    tests.append(result("gateway tampered body", r.status in (400, 401, 403), "must reject", r))

    r = gateway_post(gateway_url, raw, valid_sig, timeout)
    ok = 200 <= r.status < 300
    tests.append(result("gateway valid signed webhook", ok, "must accept and forward", r))
    return tests


def print_results(tests: Iterable[TestResult]) -> bool:
    tests = list(tests)
    for t in tests:
        marker = "PASS" if t.passed else "FAIL"
        meta = []
        if t.status is not None:
            meta.append(f"HTTP {t.status}")
        if t.latency_ms is not None:
            meta.append(f"{t.latency_ms}ms")
        suffix = f" ({', '.join(meta)})" if meta else ""
        print(f"[{marker}] {t.name}{suffix} — {t.detail}")
    passed = sum(1 for t in tests if t.passed)
    print(f"\nResult: {passed}/{len(tests)} passed")
    return passed == len(tests)


def write_report(path: Optional[str], suite: str, tests: list[TestResult]) -> None:
    if not path:
        return
    report = {
        "suite": suite,
        "generated_at_epoch": int(time.time()),
        "passed": all(t.passed for t in tests),
        "tests": [asdict(t) for t in tests],
        "note": "Secrets and request bodies are intentionally excluded.",
    }
    Path(path).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="MTLineCoopBot deployment verifier")
    parser.add_argument("suite", choices=("smoke", "direct", "gateway"))
    parser.add_argument("--base-url", default=os.environ.get("APP_SCRIPT_URL"))
    parser.add_argument("--gateway-url", default=os.environ.get("GATEWAY_URL"))
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT)
    parser.add_argument("--report", help="write redacted JSON evidence report")
    args = parser.parse_args(argv)

    if args.suite in ("smoke", "direct"):
        if not args.base_url:
            parser.error("--base-url or APP_SCRIPT_URL is required")
        tests = suite_smoke(args.base_url, args.timeout) if args.suite == "smoke" else suite_direct(args.base_url, args.timeout)
    else:
        if not args.gateway_url:
            parser.error("--gateway-url or GATEWAY_URL is required")
        tests = suite_gateway(args.gateway_url, args.timeout)

    ok = print_results(tests)
    write_report(args.report, args.suite, tests)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
