"""Backup privado e verificacao das duas edges de folha no projeto autorizado."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://oinweocqcptwxqsztlcl.supabase.co"
OP = "/Users/gianlucaferro/.local/agent-tools/bin/op"
FUNCTIONS = ("sync-camara-servidores", "sync-folha-prefeitura-nucleogov")
OUT = ROOT / "work/coletores-retroativos-2026-11-10"


def credential(reference):
    result = subprocess.run([OP, "read", reference], capture_output=True, text=True, check=True)
    return result.stdout.strip()


def private_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    path.chmod(0o600)


def request(path, headers, data=None, timeout=180):
    req = urllib.request.Request(BASE + path, headers=headers, data=data)
    try:
        response = urllib.request.urlopen(req, timeout=timeout)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        status = response.status
        payload = json.loads(response.read())
    return status, payload


def snapshot(label):
    key = credential("op://Dev/Supabase Piracanjuba.Ai/service_role_key")
    headers = {"apikey": key, "Authorization": "Bearer " + key}
    tables = {
        "servidores": [("orgao_tipo", "in.(prefeitura,camara)")],
        "remuneracao_servidores": [("competencia", "gte.2026-08"), ("competencia", "lte.2026-11")],
        "prefeitura_folha_nucleogov": [("ano", "eq.2026"), ("mes", "gte.8"), ("mes", "lte.11")],
        "prefeitura_sync_state": [("dataset", "eq.folha")],
    }
    summary = {}
    for table, filters in tables.items():
        rows = []
        order = "chave" if table == "prefeitura_folha_nucleogov" else "scope" if table == "prefeitura_sync_state" else "id"
        for offset in range(0, 100_000, 500):
            params = urllib.parse.urlencode([("select", "*"), ("order", order + ".asc"), ("limit", 500), ("offset", offset), *filters])
            status, batch = request("/rest/v1/" + table + "?" + params, headers)
            if status != 200 or not isinstance(batch, list):
                raise RuntimeError(f"Backup {table}: HTTP {status}")
            rows.extend(batch)
            if len(batch) < 500:
                break
        else:
            raise RuntimeError(f"Backup {table}: limite de seguranca atingido")
        path = OUT / ("snapshot-" + label) / (table + ".json")
        private_json(path, rows)
        summary[table] = {"rows": len(rows), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    private_json(OUT / ("snapshot-" + label) / "manifest.json", summary)
    print(json.dumps({"snapshot": label, "tables": summary}))


def invoke(mode):
    secret = credential("op://Dev/CRON_SECRET Piracanjuba.ai/credential")
    headers = {"Content-Type": "application/json", "x-cron-secret": secret}
    results = []
    for slug in FUNCTIONS:
        body = {"dry_run": mode == "dry-run"}
        start = time.monotonic()
        status, payload = request("/functions/v1/" + slug, headers, json.dumps(body).encode())
        record = {"function": slug, "status": status, "seconds": round(time.monotonic() - start, 3), "body": payload}
        private_json(OUT / (mode + "-" + slug + ".json"), record)
        results.append({"function": slug, "status": status, "seconds": record["seconds"], "success": payload.get("success"), "dry_run": payload.get("dry_run"), "reviewed_competencias": payload.get("reviewed_competencias")})
    print(json.dumps(results))
    if any(row["status"] != 200 or row["success"] is not True for row in results):
        raise SystemExit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["snapshot-before", "snapshot-after", "dry-run", "import"])
    parser.add_argument("--readback-confirmed", action="store_true")
    args = parser.parse_args()
    os.umask(0o077)
    if args.mode.startswith("snapshot-"):
        snapshot(args.mode.removeprefix("snapshot-"))
    else:
        if not args.readback_confirmed:
            parser.error("A invocacao exige conferir a versao publicada e seu dry_run antes")
        invoke(args.mode)
