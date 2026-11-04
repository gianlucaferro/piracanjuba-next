"""Verifica somente versões já publicadas e conferidas, sem envio ou coleta."""
import concurrent.futures
import json
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
ALLOWED = {"send-push", "sync-prefeitura-diaria", "sync-prefeitura-mensal", "import-folha-manual", "import-folha-xlsx"}
config = json.load(sys.stdin)
slugs = config["slugs"]
if not slugs or any(slug not in ALLOWED for slug in slugs) or config.get("readback_confirmed") is not True:
    raise SystemExit("Exige escopo permitido e confirmação do readback publicado")
secret = subprocess.run([
    "/Users/gianlucaferro/.local/agent-tools/bin/op", "read",
    "op://Dev/CRON_SECRET Piracanjuba.ai/credential",
], capture_output=True, text=True, check=True).stdout.strip()
public = {"apikey": config["anon_key"], "Authorization": "Bearer " + config["anon_key"]}
authorized = {**public, "x-cron-secret": secret}

def probe(slug):
    cases = [
        ("public", "POST", {}, {"dry_run": True}, 401),
        ("anon", "POST", public, {"dry_run": True}, 401),
        ("wrong-secret", "POST", {**public, "x-cron-secret": "invalid-probe"}, {"dry_run": True}, 401),
        ("authorized-dry-run", "POST", authorized, {"dry_run": True}, 200),
        ("options", "OPTIONS", {}, None, 204),
        ("get", "GET", authorized, None, 405),
    ]
    if slug == "send-push":
        cases.append(("configuration-dry-run", "POST", authorized, {"dry_run": True, "check_config": True}, 200))
    results = []
    for label, method, headers, body, expected in cases:
        request = urllib.request.Request(
            f"https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/{slug}",
            data=None if body is None else json.dumps(body).encode(),
            headers={**headers, "Content-Type": "application/json"}, method=method,
        )
        start = time.monotonic()
        try:
            response = urllib.request.urlopen(request, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            status = response.status
            raw = response.read(4096)
        passed = status == expected
        if expected == 200:
            try:
                data = json.loads(raw)
                passed = passed and data.get("success") is True and data.get("dry_run") is True
                if label == "configuration-dry-run":
                    passed = passed and data.get("configuration_valid") is True
            except (ValueError, AttributeError):
                passed = False
        results.append({"function": slug, "case": label, "status": status, "expected": expected, "passed": passed, "seconds": round(time.monotonic()-start, 3)})
    return results

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = [case for group in pool.map(probe, slugs) for case in group]
out = ROOT / "outputs/send-push-2026-11-04"
for slug in slugs:
    (out / f"probes-{slug}.json").write_text(json.dumps([r for r in results if r["function"] == slug], indent=2) + "\n")
print(json.dumps({"checks": len(results), "passed": sum(r["passed"] for r in results), "failures": [r for r in results if not r["passed"]]}))
sys.exit(0 if all(r["passed"] for r in results) else 1)
