"""Confere valores individuais por leitura, sem publicar, gravar ou gerar IA."""
import argparse
from decimal import Decimal, ROUND_HALF_UP
import json
import os
from pathlib import Path
import re
import subprocess
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / "work/resumos-individuais-2026-11-10"
BASE = "https://oinweocqcptwxqsztlcl.supabase.co"
OP = "/Users/gianlucaferro/.local/agent-tools/bin/op"


def read_key(reference):
    return subprocess.run([OP, "read", reference], capture_output=True, text=True, check=True).stdout.strip()


def request(path, headers, data=None):
    req = urllib.request.Request(BASE + path, headers=headers, data=data)
    try:
        response = urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return {"status": response.status, "cache_control": response.headers.get("cache-control"), "body": json.loads(response.read())}


def category(value):
    text = "".join(char for char in unicodedata.normalize("NFD", value or "") if not unicodedata.combining(char)).strip().upper()
    if text == "MENSAL":
        return "mensal"
    if text == "RESCISAO":
        return "rescisoes"
    if re.match(r"^(13[º°O]?(\s|$)|DECIMO TERCEIRO(\s|$))", text):
        return "decimoTerceiro"
    return "outros"


def total(rows, field):
    if any(row[field] is None for row in rows):
        return None
    return float(sum(Decimal(str(row[field])).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) for row in rows))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["local", "production"])
    parser.add_argument("--readback-confirmed", action="store_true")
    args = parser.parse_args()
    if args.mode == "production" and not args.readback_confirmed:
        parser.error("Confirme o pacote deterministico publicado antes de invocar")
    os.umask(0o077)
    cases = json.loads((WORK / "production-cases.json").read_text())
    key = read_key("op://Dev/Supabase Piracanjuba.Ai/service_role_key")
    auth = {"apikey": key, "Authorization": "Bearer " + key}
    local = {}
    if args.mode == "local":
        env = {**os.environ, "SUPABASE_URL": BASE, "SUPABASE_SERVICE_ROLE_KEY": key, "CRON_SECRET": ""}
        result = subprocess.run([
            "deno", "run", "--no-lock", "--no-prompt",
            "--allow-env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,CRON_SECRET",
            "--allow-net=oinweocqcptwxqsztlcl.supabase.co",
            str(ROOT / "scripts/validation/servidor-resumo-local.mjs"),
        ], input=json.dumps(cases), capture_output=True, text=True, env=env, check=True)
        local = json.loads(result.stdout)
    results = []
    for name, case in cases.items():
        rows = []
        for offset in range(0, 5000, 500):
            params = urllib.parse.urlencode({
                "select": "id,competencia,tipo_folha,bruto,liquido,fonte_url",
                "servidor_id": "eq." + case["id"], "order": "competencia.desc,id.asc",
                "limit": 500, "offset": offset,
            })
            reference = request("/rest/v1/remuneracao_servidores?" + params, auth)
            assert reference["status"] == 200, name + ": leitura de referencia falhou"
            rows.extend(reference["body"])
            if len(reference["body"]) < 500:
                break
        actual = local[name] if args.mode == "local" else request(
            "/functions/v1/summarize-servidor", {"Content-Type": "application/json"},
            json.dumps({"servidor_id": case["id"]}).encode(),
        )
        assert actual["status"] == 200, name + ": resumo indisponivel"
        assert actual["cache_control"] == "no-store", name + ": cache HTTP inesperado"
        data = actual["body"]
        assert data["modo"] == "dados_oficiais" and data["cached"] is False
        assert data["servidor"]["id"] == case["id"] and data["servidor"]["orgao_tipo"] == case["orgao_tipo"]
        folha = data["resumo_folha"]
        assert folha["totalRegistros"] == len(rows), name + ": historico truncado"
        checked = {}
        for key_name in ("mensal", "rescisoes", "decimoTerceiro", "outros"):
            candidates = [row for row in rows if category(row["tipo_folha"]) == key_name]
            group = folha[key_name]
            if not candidates:
                assert group is None, name + ": categoria inventada"
                checked[key_name] = None
                continue
            month = max(row["competencia"] for row in candidates)
            selected = [row for row in candidates if row["competencia"] == month]
            assert group["competencia"] == month and group["registros"] == len(selected), name + ": competencia ou contagem incorreta"
            assert {row["id"] for row in group["lancamentos"]} == {row["id"] for row in selected}, name + ": lancamentos divergentes"
            for field in ("bruto", "liquido"):
                assert group[field] == total(selected, field), name + ": valor divergente"
            checked[key_name] = {"competencia": month, "registros": len(selected)}
        private_path = WORK / (args.mode + "-" + name + ".json")
        private_path.write_text(json.dumps(actual, ensure_ascii=False, indent=2) + "\n")
        private_path.chmod(0o600)
        results.append({"case": name, "passed": True, "historico": len(rows), "groups": checked})
    (WORK / (args.mode + "-checks.json")).write_text(json.dumps(results, indent=2) + "\n")
    print(json.dumps({"mode": args.mode, "checks": len(results), "passed": len(results), "cases": results}))


if __name__ == "__main__":
    main()
