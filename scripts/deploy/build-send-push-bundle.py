"""Pacote seletivo, com dependências remotas preservadas quando não alteradas."""
import json
import hashlib
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
FUNCTIONS = ROOT / "supabase/functions"
BACKUP = ROOT / "outputs/send-push-2026-11-04/callers-backup"
manifest = json.loads((BACKUP / "manifest.json").read_text())
allowed = {f["slug"]: f for f in manifest["functions"] if f["slug"] != "sync-health-check"}
allowed["send-push"] = {"verify_jwt": False}
slug = sys.argv[1]
if slug not in allowed:
    raise SystemExit("Função fora do escopo revisado")
imports = re.compile(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.[^"']+)["']''')
files = {}

def include(path):
    path = path.resolve()
    relative = path.relative_to(FUNCTIONS.resolve())
    name = "functions/" + relative.as_posix()
    if name in files:
        return
    # Estes módulos não foram corrigidos nesta etapa. Preservar os bytes publicados.
    backup_path = BACKUP / slug / name
    preserve_backup = relative.as_posix() in {
        "_shared/servidor-origin.ts", "_shared/persistence-guards.ts"
    }
    source = backup_path if preserve_backup else path
    if preserve_backup:
        expected = next((f["sha256"] for f in allowed[slug]["files"] if f["name"] == name), None)
        if not backup_path.is_file() or not expected:
            raise SystemExit("Backup obrigatório ausente: " + name)
        if hashlib.sha256(backup_path.read_bytes()).hexdigest() != expected:
            raise SystemExit("Hash do backup divergente: " + name)
    content = source.read_bytes().decode("utf-8")
    files[name] = content
    for dependency in imports.findall(content):
        include(path.parent / dependency)

include(FUNCTIONS / slug / "index.ts")
for directory in [FUNCTIONS, FUNCTIONS / slug, FUNCTIONS / "_shared"]:
    for config in ["deno.json", "deno.jsonc", "import_map.json"]:
        if (directory / config).exists():
            raise SystemExit("Configuração de runtime adicional exige revisão do pacote")
print(json.dumps({"name": slug, "entrypoint_path": f"functions/{slug}/index.ts", "verify_jwt": allowed[slug]["verify_jwt"], "files": [{"name": name, "content": content} for name, content in sorted(files.items())]}))
