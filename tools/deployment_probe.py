#!/usr/bin/env python3
"""Redacted transport probe for Google Apps Script Web App deployments.

Purpose: distinguish application JSON responses from Google hosting/auth/redirect
responses without printing request bodies, response bodies, cookies, or secrets.
Standard library only.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

USER_AGENT = "MTLineCoopBot-DeploymentProbe/1.0"


@dataclass
class Hop:
    code: int
    source_host: str
    target_host: str


@dataclass
class ProbeResult:
    name: str
    method: str
    status: int
    final_host: str
    final_path: str
    content_type: str
    body_bytes: int
    body_sha256_12: str
    json: bool
    json_ok: Optional[bool]
    error_code: Optional[str]
    app_status: Optional[str]
    redirects: list[Hop]
    latency_ms: int


class RecordingRedirectHandler(urllib.request.HTTPRedirectHandler):
    def __init__(self) -> None:
        super().__init__()
        self.hops: list[Hop] = []

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.hops.append(
            Hop(
                int(code),
                urllib.parse.urlsplit(req.full_url).hostname or "",
                urllib.parse.urlsplit(newurl).hostname or "",
            )
        )
        # urllib's default behavior for 301/302/303 is intentionally preserved.
        # This probe records it instead of pretending the method was preserved.
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _request(name: str, method: str, url: str, payload: bytes | None, timeout: float) -> ProbeResult:
    handler = RecordingRedirectHandler()
    opener = urllib.request.build_opener(handler, urllib.request.HTTPSHandler(context=ssl.create_default_context()))
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    start = time.monotonic()
    try:
        with opener.open(req, timeout=timeout) as response:
            status = int(response.status)
            final_url = response.geturl()
            content_type = response.headers.get("Content-Type", "")
            raw = response.read()
    except urllib.error.HTTPError as exc:
        status = int(exc.code)
        final_url = exc.geturl()
        content_type = exc.headers.get("Content-Type", "") if exc.headers else ""
        raw = exc.read()
    latency_ms = int((time.monotonic() - start) * 1000)

    parsed = None
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except Exception:
        pass

    error_code = None
    json_ok = None
    app_status = None
    if isinstance(parsed, dict):
        json_ok = parsed.get("ok") if isinstance(parsed.get("ok"), bool) else None
        app_status = parsed.get("status") if isinstance(parsed.get("status"), str) else None
        err = parsed.get("error")
        if isinstance(err, dict) and isinstance(err.get("code"), str):
            error_code = err["code"]

    parts = urllib.parse.urlsplit(final_url)
    return ProbeResult(
        name=name,
        method=method,
        status=status,
        final_host=parts.hostname or "",
        final_path=parts.path,
        content_type=content_type.split(";", 1)[0].strip().lower(),
        body_bytes=len(raw),
        body_sha256_12=hashlib.sha256(raw).hexdigest()[:12],
        json=isinstance(parsed, (dict, list)),
        json_ok=json_ok,
        error_code=error_code,
        app_status=app_status,
        redirects=handler.hops,
        latency_ms=latency_ms,
    )


def add_path(base: str, path: str) -> str:
    return base.rstrip("/") + "/" + path.lstrip("/")


def main() -> int:
    parser = argparse.ArgumentParser(description="Redacted Apps Script transport probe")
    parser.add_argument("--base-url", default=os.environ.get("APP_SCRIPT_URL"))
    parser.add_argument("--timeout", type=float, default=20.0)
    parser.add_argument("--report", default="deployment-probe.json")
    args = parser.parse_args()
    if not args.base_url:
        parser.error("--base-url or APP_SCRIPT_URL is required")

    empty = b"{}"
    events = b'{"events":[]}'
    cases = [
        ("root-get", "GET", args.base_url, None),
        ("health-get", "GET", add_path(args.base_url, "api/health"), None),
        ("unknown-get", "GET", add_path(args.base_url, "api/definitely-not-a-route"), None),
        ("protected-post", "POST", add_path(args.base_url, "api/member/me/profile"), empty),
        ("root-webhook-post", "POST", args.base_url, events),
    ]

    results = [_request(*case, timeout=args.timeout) for case in cases]
    print("Redacted transport diagnostics (no response bodies/secrets):")
    for r in results:
        hops = " -> ".join(f"{h.code}:{h.source_host}>{h.target_host}" for h in r.redirects) or "none"
        print(
            f"[{r.name}] {r.method} HTTP {r.status} host={r.final_host} "
            f"type={r.content_type or '-'} json={r.json} ok={r.json_ok} "
            f"error={r.error_code} app_status={r.app_status} bytes={r.body_bytes} "
            f"sha256={r.body_sha256_12} redirects={hops} latency={r.latency_ms}ms"
        )

    report = {
        "generated_at_epoch": int(time.time()),
        "base_host": urllib.parse.urlsplit(args.base_url).hostname,
        "results": [asdict(r) for r in results],
        "privacy": "No request body, response body, cookie, Authorization header, or secret is stored.",
    }
    Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Report: {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
