import assert from "node:assert/strict";
import test from "node:test";
import { GET, HEAD, POST } from "../src/app/descadastro/[token]/route.ts";

test("descadastro é passivo na leitura e aceita os dois formulários de um clique", async (t) => {
  const token = "a".repeat(43);
  const context = { params: Promise.resolve({ token }) };
  const url = "https://example.invalid/descadastro/" + token;
  const actions: string[] = [];
  const fetch = t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    const action = JSON.parse(String(init?.body)).action;
    actions.push(action);
    return new Response(actions.includes("unsubscribe") ? "unsubscribed" : "subscribed");
  });
  assert.equal((await GET(new Request(url), context)).status, 200);
  assert.equal((await HEAD(new Request(url), context)).headers.get("X-Subscription-Status"), "subscribed");
  assert.deepEqual(actions, ["check", "check"]);
  const post = (body: BodyInit) => POST(new Request(url, { method: "POST", body }), context);
  assert.equal((await post("List-Unsubscribe=One-Click")).status, 415);
  assert.equal((await post(new URLSearchParams("List-Unsubscribe=Wrong"))).status, 400);
  assert.equal((await post(new URLSearchParams("List-Unsubscribe=One-Click&List-Unsubscribe=One-Click"))).status, 400);
  assert.equal((await post(new URLSearchParams("x=" + "x".repeat(4096)))).status, 413);
  assert.deepEqual(actions, ["check", "check"]);
  const form = new FormData();
  form.set("List-Unsubscribe", "One-Click");
  for (const body of [form, new URLSearchParams("List-Unsubscribe=One-Click")]) {
    const result = await post(body);
    assert.equal(result.status, 200);
    assert.equal(await result.text(), "");
  }
  assert.deepEqual(actions, ["check", "check", "unsubscribe", "unsubscribe"]);
  const after = await GET(new Request(url), context);
  assert.match(await after.text(), /<button>Cancelar recebimento<\/button>/);
  const human = await POST(new Request(url, { method: "POST", headers: { Accept: "text/html" }, body: form }), context);
  assert.match(await human.text(), /Recebimento cancelado/);
  assert.equal(after.headers.get("Referrer-Policy"), "no-referrer");
  const invalid = { params: Promise.resolve({ token: "fora-do-formato" }) };
  assert.equal((await GET(new Request(url), invalid)).status, 404);
  fetch.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  assert.equal((await HEAD(new Request(url), context)).status, 503);
});
