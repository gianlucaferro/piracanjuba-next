"""Build the exact local source payload for one reviewed Edge Function."""
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
FUNCTIONS = ROOT / "supabase/functions"
manifest = json.loads((ROOT / "outputs/correcoes-consumo-2026-11-03/live-backup/manifest.json").read_text())
excluded = {"sync-prefeitura-diaria", "sync-prefeitura-mensal", "import-folha-manual", "import-folha-xlsx"}
allowed = {f["slug"]: f for f in manifest["functions"] if f["slug"] not in excluded}
slug = sys.argv[1]
if slug not in allowed:
    raise SystemExit("Function is outside the reviewed deployment scope")
files = {}
imports = re.compile(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.[^"']+)["']''')

def include(path):
    path = path.resolve()
    relative = path.relative_to(FUNCTIONS.resolve())
    name = "functions/" + relative.as_posix()
    if name in files:
        return
    content = path.read_text()
    files[name] = content
    for dependency in imports.findall(content):
        include(path.parent / dependency)

include(FUNCTIONS / slug / "index.ts")
for directory in [FUNCTIONS, FUNCTIONS / slug, FUNCTIONS / "_shared"]:
    for config in ["deno.json", "deno.jsonc", "import_map.json"]:
        if (directory / config).exists():
            raise SystemExit("Unexpected runtime/import configuration needs explicit packaging review")
print(json.dumps({"name": slug, "entrypoint_path": f"functions/{slug}/index.ts", "verify_jwt": allowed[slug]["verify_jwt"], "files": [{"name": name, "content": content} for name, content in sorted(files.items())]}))
