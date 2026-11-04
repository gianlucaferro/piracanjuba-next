// Parse only with the official ESZIP library. Never import or execute bundle modules.
import { Parser } from "npm:@deno/eszip@0.106.0";

const root = new URL("../../", import.meta.url);
const input = new URL("work/send-push-recovery/send-push.body", root);
const output = new URL("outputs/send-push-2026-11-04/live-backup/", root);
const encoder = new TextEncoder();
async function sha256(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, "0")).join("");
}
function suspectedSecrets(text: string): string[] {
  const findings: string[] = [];
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) findings.push("private-key-block");
  if (/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk_live_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_-]{20,})\b/.test(text)) findings.push("private-token-prefix");
  if (/(?:VAPID_PRIVATE_KEY|service_role_key|serviceRoleKey)\s*[:=]\s*["'][A-Za-z0-9_./+=-]{25,}["']/i.test(text)) findings.push("privileged-literal");
  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(atob(match[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role === "service_role") findings.push("service-role-jwt");
    } catch { /* Not a JWT payload. */ }
  }
  return [...new Set(findings)];
}
const bytes = await Deno.readFile(input);
if (suspectedSecrets(new TextDecoder().decode(bytes)).length) {
  throw new Error("Suspected embedded secret in raw bundle; no files extracted");
}
const inputHash = await sha256(bytes);
if (inputHash !== "569c79466aa6526f9cff41b09ea31c25f7d80d9f8aa821b4f9fc015c686380af") {
  throw new Error("Input hash differs from the authorized live bundle");
}
const parser = await Parser.createInstance();
const specifiers = await parser.parseBytes(bytes) as string[];
await parser.load();
const modules = [];
const skipped = [];
for (const specifier of specifiers) {
  if (specifier === "---EDGE-RUNTIME-METADATA---") {
    skipped.push({specifier, reason: "Supabase binary runtime metadata is not UTF-8 module source; preserved in complete ESZIP backup."});
    continue;
  }
  const source = await parser.getModuleSource(specifier) as string | undefined;
  const sourceMap = await parser.getModuleSourceMap(specifier) as string | undefined;
  const findings = suspectedSecrets((source ?? "") + "\n" + (sourceMap ?? ""));
  if (findings.length) throw new Error("Suspected embedded secret; no files extracted. Types: " + findings.join(","));
  modules.push({ specifier, source, sourceMap });
}
await Deno.mkdir(new URL("modules/", output), { recursive: true });
await Deno.writeFile(new URL("send-push.eszip", output), bytes);
const entries = [];
const originals = [];
for (const module of modules) {
  const id = await sha256(encoder.encode(module.specifier));
  const sourceBytes = encoder.encode(module.source ?? "");
  const mapBytes = encoder.encode(module.sourceMap ?? "");
  const sourcePath = "modules/" + id + ".source.txt";
  const mapPath = module.sourceMap ? "modules/" + id + ".map.json" : null;
  await Deno.writeFile(new URL(sourcePath, output), sourceBytes);
  if (mapPath) await Deno.writeFile(new URL(mapPath, output), mapBytes);
  if (module.sourceMap) {
    const map = JSON.parse(module.sourceMap);
    for (let i = 0; i < (map.sources ?? []).length; i++) {
      const originalName = map.sources[i];
      const original = map.sourcesContent?.[i];
      if (typeof original !== "string") continue;
      if (suspectedSecrets(original).length) throw new Error("Suspected secret in original source");
      if (!/^(send-push|_shared)\/[A-Za-z0-9_./-]+$/.test(originalName) || originalName.includes("..")) {
        throw new Error("Unexpected original source path");
      }
      const originalPath = "sources/" + originalName;
      const originalUrl = new URL(originalPath, output);
      await Deno.mkdir(new URL("./", originalUrl), { recursive: true });
      const originalBytes = encoder.encode(original);
      await Deno.writeFile(originalUrl, originalBytes);
      originals.push({specifier: originalName, path: originalPath, bytes: originalBytes.length, sha256: await sha256(originalBytes), provenance: "Embedded sourcesContent, preserved without normalization."});
    }
  }
  entries.push({
    specifier: module.specifier,
    path: sourcePath, bytes: sourceBytes.length, sha256: await sha256(sourceBytes),
    source_map_path: mapPath, source_map_bytes: mapBytes.length,
    source_map_sha256: mapPath ? await sha256(mapBytes) : null,
  });
}
const manifest = {
  extracted_at: new Date().toISOString(),
  project_id: "oinweocqcptwxqsztlcl",
  function_slug: "send-push",
  live_version: 23,
  verify_jwt: false,
  provenance: {
    input_path: "work/send-push-recovery/send-push.body",
    input_bytes: bytes.length,
    input_magic: new TextDecoder().decode(bytes.slice(0, 8)),
    input_sha256: inputHash,
    download: "Parent retrieved authenticated Supabase Management API body; octet-stream ESZIP, no API request in this extraction.",
    parser: "npm:@deno/eszip@0.106.0",
    parser_npm_integrity: "sha512-D9EOEMA4Wi7H43tFN1KDNpdTpUA9gyRELss4A9sLn2vZXDVcf+IT7wb/neEgXdhokvUF94e81V8m0Ozuu0e+Tg==",
    official_api: "https://github.com/denoland/eszip/blob/8ab14dc4d0cd9abaa98e13e8efd62b769782bc0e/js/mod.ts",
    official_test: "https://github.com/denoland/eszip/blob/8ab14dc4d0cd9abaa98e13e8efd62b769782bc0e/js/eszip_test.ts",
    bundle_code_executed: false,
    source_map_originals_available: entries.some((m) => m.source_map_path),
    secret_scan: "No high-confidence private key, privileged token literal or service-role JWT matched in recovered sources/maps; not proof of exhaustive absence.",
  },
  modules: entries,
  original_sources: originals,
  local_dependencies: entries.filter((m) => m.specifier.startsWith("_shared/")).map((m) => m.specifier),
  skipped,
};
await Deno.writeTextFile(new URL("manifest.json", output), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ extracted_modules: entries.length, source_maps: entries.filter((m) => m.source_map_path).length, manifest: new URL("manifest.json", output).pathname }));

