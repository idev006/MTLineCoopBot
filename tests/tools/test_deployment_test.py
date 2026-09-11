import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("deployment_test", ROOT / "tools" / "deployment_test.py")
dt = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = dt
SPEC.loader.exec_module(dt)


class DeploymentVerifierTests(unittest.TestCase):
    def test_add_path_normalizes_single_separator(self):
        self.assertEqual(dt.add_path("https://example.test/exec/", "/api/health"), "https://example.test/exec/api/health")

    def test_with_secret_preserves_existing_query_and_encodes_secret(self):
        url = dt.with_secret("https://example.test/exec?x=1", "a b&c")
        parts = dt.urllib.parse.urlsplit(url)
        params = dict(dt.urllib.parse.parse_qsl(parts.query))
        self.assertEqual(params["x"], "1")
        self.assertEqual(params["webhook_secret"], "a b&c")

    def test_line_signature_matches_hmac_sha256_base64(self):
        self.assertEqual(
            dt.line_signature(b'{"events":[]}', "secret"),
            "pkK1lVPJPiJ+wPLziRD79xIxohl8AImYM8AEeM7IbzQ=",
        )

    def test_error_code_reads_only_api_envelope(self):
        r = dt.HttpResult(200, "https://example.test", "", {"ok": False, "error": {"code": "UNAUTHENTICATED"}}, 1)
        self.assertEqual(dt.error_code(r), "UNAUTHENTICATED")

    def test_report_never_contains_environment_secrets(self):
        tests = [dt.TestResult("sample", True, "safe")]
        with mock.patch.dict(os.environ, {"WEBHOOK_SECRET": "super-secret", "CHANNEL_SECRET": "channel-secret"}, clear=False):
            with tempfile.TemporaryDirectory() as td:
                path = Path(td) / "report.json"
                dt.write_report(str(path), "smoke", tests)
                text = path.read_text(encoding="utf-8")
                self.assertNotIn("super-secret", text)
                self.assertNotIn("channel-secret", text)
                parsed = json.loads(text)
                self.assertTrue(parsed["passed"])

    def test_direct_suite_requires_secret_without_network_call(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            tests = dt.suite_direct("https://example.test/exec", 1)
        self.assertEqual(len(tests), 1)
        self.assertFalse(tests[0].passed)

    def test_gateway_suite_requires_secret_without_network_call(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            tests = dt.suite_gateway("https://example.test/webhook", 1)
        self.assertEqual(len(tests), 1)
        self.assertFalse(tests[0].passed)

    def test_smoke_suite_asserts_fail_closed_contracts(self):
        health = dt.HttpResult(200, "u", "", {"ok": True, "data": {"status": "ok"}}, 1)
        api_error = lambda code: dt.HttpResult(200, "u", "", {"ok": False, "error": {"code": code}}, 1)
        webhook_error = dt.HttpResult(200, "u", "", {"status": "error", "message": "Unauthorized"}, 1)

        def fake_request(method, url, **kwargs):
            if url.endswith("/api/health"):
                return health
            if url.endswith("/api/definitely-not-a-route"):
                return api_error("NOT_FOUND")
            if url.endswith("/api/loan/calculate") and method == "GET":
                return api_error("METHOD_NOT_ALLOWED")
            if url.endswith("/api/loan/calculate") and method == "POST":
                return api_error("VALIDATION")
            if url.endswith("/exec") and method == "GET":
                return api_error("NOT_FOUND")
            if url.endswith("/exec") and method == "POST":
                return webhook_error
            return api_error("UNAUTHENTICATED")

        with mock.patch.object(dt, "request", side_effect=fake_request), mock.patch.object(
            dt, "json_post", side_effect=lambda url, obj, timeout: fake_request("POST", url)
        ):
            tests = dt.suite_smoke("https://example.test/exec", 1)
        self.assertTrue(all(t.passed for t in tests), [t for t in tests if not t.passed])


if __name__ == "__main__":
    unittest.main()
