# Deployment Verification Tool

`tools/deployment_test.py` is the operator-side verification runner for deployed MTLineCoopBot environments. It uses Python standard library only and is designed to produce repeatable, redacted evidence.

## Safety rules

- Never put `WEBHOOK_SECRET` or `CHANNEL_SECRET` in source, command arguments, screenshots, or reports.
- Set secrets in the shell environment only for the suite that needs them.
- Generated JSON reports intentionally exclude secrets and request bodies.
- A gateway-suite PASS proves the HTTP signature boundary only. `STAGING_VERIFIED` additionally requires independent downstream evidence that rejected requests produced zero Apps Script arrivals and that a valid request reached `EventHandler`.

## 1. Apps Script smoke suite — no secrets

Windows CMD:

```bat
set APP_SCRIPT_URL=https://script.google.com/macros/s/<deployment-id>/exec
py -3 tools\deployment_test.py smoke --report deployment-smoke.json
```

Linux/macOS:

```bash
APP_SCRIPT_URL='https://script.google.com/macros/s/<deployment-id>/exec' \
python3 tools/deployment_test.py smoke --report deployment-smoke.json
```

Checks include health, root fail-closed behavior, unknown route, wrong method, protected endpoints without credentials, malformed JSON, and direct webhook rejection without downstream secret.

## 2. Direct Apps Script webhook gate

Use this only to prove the downstream Apps Script secret boundary. Do not paste the secret into command-line arguments.

Windows CMD:

```bat
set WEBHOOK_SECRET=<value from Apps Script Script Properties>
py -3 tools\deployment_test.py direct --report deployment-direct.json
set WEBHOOK_SECRET=
```

The suite verifies that an incorrect secret fails and the configured secret accepts an empty webhook after re-running the complete smoke suite.

## 3. Verified ingress gateway signature suite

Windows CMD:

```bat
set GATEWAY_URL=https://<gateway-host>/webhook
set CHANNEL_SECRET=<LINE Messaging API channel secret>
py -3 tools\deployment_test.py gateway --report deployment-gateway.json
set CHANNEL_SECRET=
```

Checks:
- missing `x-line-signature`
- malformed Base64 signature
- valid-format signature produced with the wrong secret
- tampered body with a signature for the original body
- valid signed empty webhook

## Exit code

- `0`: every assertion in the selected suite passed
- `1`: one or more assertions failed
- argparse error: required URL was not provided

## Evidence handling

Keep the generated JSON report with release evidence. Review Apps Script/gateway logs separately for privacy requirements and downstream arrival/non-arrival evidence. Never mark `STAGING_VERIFIED` or `PRODUCTION_VERIFIED` from the Python report alone.
