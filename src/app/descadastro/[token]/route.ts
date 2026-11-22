export const dynamic = "force-dynamic";

type Context = { params: Promise<{ token: string }> };
const headers = {
  "Cache-Control": "private, no-store",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function page(title: string, message: string, status = 200, form = false) {
  const button = form ? `<form method="post"><input type="hidden" name="List-Unsubscribe" value="One-Click"><button>Cancelar recebimento</button></form>` : "";
  return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | Piracanjuba.ai</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f7f4;color:#19372e;font:1rem/1.55 system-ui,sans-serif}main{max-width:39rem;margin:clamp(2rem,13vh,9rem) auto;padding:2rem}h1{font-size:clamp(2rem,5vw,3rem);line-height:1.1;letter-spacing:-.045em;margin:.8em 0 .3em}p{max-width:36em}button{border:0;border-radius:.5rem;background:#135c43;color:white;padding:.8rem 1.15rem;font:inherit;font-weight:650;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #ad6500;outline-offset:3px}a{color:inherit}footer{border-top:1px solid #c6d5cd;margin-top:3rem;padding-top:1rem;font-size:.85rem}
</style></head><body><main><strong>Piracanjuba.ai</strong><h1>${title}</h1><p>${message}</p>${button}<footer><a href="https://apareca.ai/" rel="noreferrer">Site desenvolvido por Ferro Labs Tecnologia LTDA</a></footer></main></body></html>`, {
    status, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
  });
}

async function requestState(token: string, action: "check" | "unsubscribe") {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return "invalid";
  try {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/descadastro-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: "Bearer " + key },
      body: JSON.stringify({ token, action }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 404) return "invalid";
    if (!response.ok) return "unavailable";
    const state = await response.text();
    if (state === "unsubscribed" || (state === "subscribed" && action === "check")) return state;
  } catch { /* O visitante pode tentar novamente. */ }
  return "unavailable";
}

function render(state: Awaited<ReturnType<typeof requestState>>) {
  if (state === "invalid") return page("Link inválido", "Abra o link de cancelamento do e-mail que você recebeu.", 404);
  if (state === "unavailable") return page("Tente novamente", "O serviço de descadastro está temporariamente indisponível. Tente novamente em alguns instantes.", 503);
  if (state === "unsubscribed") return page("Recebimento cancelado", "Seu endereço foi retirado da lista de convites comerciais do Piracanjuba.ai.");
  return page("Cancelar recebimento", "Confirme para deixar de receber os convites comerciais do Piracanjuba.ai neste endereço de e-mail. Se você já cancelou, sua preferência será mantida.", 200, true);
}

export async function GET(_request: Request, context: Context) {
  const state = await requestState((await context.params).token, "check");
  return render(state === "unsubscribed" ? "subscribed" : state);
}

export async function HEAD(_request: Request, context: Context) {
  const state = await requestState((await context.params).token, "check");
  if (state === "invalid" || state === "unavailable") return new Response(null, { status: state === "invalid" ? 404 : 503, headers });
  return new Response(null, { headers: { ...headers, "X-Subscription-Status": state } });
}

export async function POST(request: Request, context: Context) {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)(?:\s*;|$)/i.test(contentType)) return new Response(null, { status: 415, headers });
  const limit = 4096;
  if (Number(request.headers.get("Content-Length")) > limit) return new Response(null, { status: 413, headers });
  try {
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400, headers });
    const bytes = new Uint8Array(limit);
    let used = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (used + value.length > limit) {
        await reader.cancel();
        return new Response(null, { status: 413, headers });
      }
      bytes.set(value, used);
      used += value.length;
    }
    const form = await new Response(bytes.subarray(0, used), { headers: { "Content-Type": contentType } }).formData();
    if (form.getAll("List-Unsubscribe").length !== 1 || form.get("List-Unsubscribe") !== "One-Click") return new Response(null, { status: 400, headers });
  } catch {
    return new Response(null, { status: 400, headers });
  }
  const state = await requestState((await context.params).token, "unsubscribe");
  if (state === "unsubscribed" && !request.headers.get("Accept")?.includes("text/html")) return new Response(null, { status: 200, headers });
  return render(state);
}
