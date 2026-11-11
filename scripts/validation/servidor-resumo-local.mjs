// Executa o handler local somente com acesso de rede ao banco autorizado.
let handler;
Deno.serve = (value) => { handler = value; };
await import("../../supabase/functions/summarize-servidor/index.ts");
const input = JSON.parse(await new Response(Deno.stdin.readable).text());
const results = {};
for (const [name, value] of Object.entries(input)) {
  const response = await handler(new Request("https://example.test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ servidor_id: value.id }),
  }));
  results[name] = { status: response.status, cache_control: response.headers.get("cache-control"), body: await response.json() };
}
console.log(JSON.stringify(results));
