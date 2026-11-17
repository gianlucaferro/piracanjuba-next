import {
  CAMPO_ISCA,
  criarHandlerPedido,
  emailDoPedido,
  gerarCodigoPedido,
  LIMITE_POR_IP_HORA,
  type PedidoDependencias,
  type PedidoRegistro,
  type ResultadoReserva,
  validarPedido,
} from "./pedido-pagina-empresa.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(actual)}`);
}
function ok(valor: unknown, mensagem: string) {
  if (!valor) throw new Error(mensagem);
}

const ORIGENS = ["https://piracanjuba.ai", "https://www.piracanjuba.ai"];

function corpoValido(extra: Record<string, unknown> = {}) {
  return {
    forma_pagamento: "pix",
    consentimento: true,
    comprador_nome: "Maria Souza",
    comprador_email: "Maria@Exemplo.com.br",
    comprador_whatsapp: "(64) 99123-4567",
    empresa_nome: "Padaria Pão Quente",
    empresa_categoria: "Padaria",
    empresa_oferta: "Pães, bolos e salgados feitos todo dia cedo.",
    empresa_whatsapp: "+55 64 3405-1234",
    ...extra,
  };
}

function deps(over: Partial<PedidoDependencias> = {}) {
  const inseridos: PedidoRegistro[] = [];
  const avisados: PedidoRegistro[] = [];
  const d: PedidoDependencias = {
    ipHash: () => Promise.resolve("hash-ip"),
    reservarEInserir: (r, limites) => {
      equal(limites, { porIpHora: LIMITE_POR_IP_HORA, totalDia: 100 });
      inseridos.push(r);
      return Promise.resolve<ResultadoReserva>("ok");
    },
    avisar: (r) => {
      avisados.push(r);
      return Promise.resolve();
    },
    aleatorio: () => new Uint8Array([0, 1, 2, 3, 4, 30]),
    agora: () => new Date("2026-11-17T12:00:00Z"),
    ...over,
  };
  return { d, inseridos, avisados };
}

function post(corpo: unknown, origin = "https://piracanjuba.ai") {
  return new Request("https://exemplo.supabase.co/functions/v1/pedido-pagina-empresa", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
}

Deno.test("validarPedido normaliza e-mail, telefones e campos opcionais", () => {
  const r = validarPedido(corpoValido({ comprador_documento: "66.034.538/0001-25", empresa_site: "  " }));
  ok(r.ok, "deveria validar");
  if (!r.ok) return;
  equal(r.isca, false);
  equal(r.pedido.comprador_email, "maria@exemplo.com.br");
  equal(r.pedido.comprador_whatsapp, "64991234567");
  equal(r.pedido.empresa_whatsapp, "6434051234");
  equal(r.pedido.comprador_documento, "66034538000125");
  equal(r.pedido.empresa_site, null);
});

Deno.test("validarPedido recusa o que falta ou vem fora do formato", () => {
  equal(validarPedido(null), { ok: false, erro: "Pedido inválido." });
  equal(validarPedido([]), { ok: false, erro: "Pedido inválido." });
  equal(validarPedido(corpoValido({ consentimento: "sim" })).ok, false);
  equal(validarPedido(corpoValido({ forma_pagamento: "boleto" })), { ok: false, erro: "Escolha PIX ou cartão." });
  equal(validarPedido(corpoValido({ comprador_email: "maria@" })), { ok: false, erro: "Informe um e-mail válido." });
  equal(validarPedido(corpoValido({ comprador_whatsapp: "99123-4567" })), { ok: false, erro: "Informe seu WhatsApp com DDD." });
  equal(validarPedido(corpoValido({ empresa_oferta: "Pães" })).ok, false);
  equal(validarPedido(corpoValido({ comprador_documento: "123" })), { ok: false, erro: "CPF ou CNPJ incompleto." });
  equal(validarPedido(corpoValido({ empresa_mapa_url: "javascript:alert(1)" })).ok, false);
  equal(validarPedido(corpoValido({ endereco_desejado: "Padaria Pão" })).ok, false);
  equal(validarPedido(corpoValido({ empresa_nome: "x".repeat(121) })).ok, false);
  equal(validarPedido(corpoValido({ endereco_desejado: "padaria-pao-quente" })).ok, true);
  // E-mail vai no reply_to: nada de lista de destinatários.
  equal(validarPedido(corpoValido({ comprador_email: "x,y<z>@b.com" })).ok, false);
  equal(validarPedido(corpoValido({ comprador_email: "a b@c.com" })).ok, false);
});

Deno.test("validarPedido mede caracteres como o char_length do banco (emoji conta 1)", () => {
  equal(validarPedido(corpoValido({ comprador_nome: "😀" })), { ok: false, erro: "Informe seu nome." });
  equal(validarPedido(corpoValido({ empresa_oferta: "🍕🍔🍟🌭🥪" })).ok, false);
  equal(validarPedido(corpoValido({ comprador_nome: "Zé 😀" })).ok, true);
  equal(validarPedido(corpoValido({ empresa_nome: "😀".repeat(120) })).ok, true);
});

Deno.test("validarPedido marca o campo-isca sem recusar", () => {
  const r = validarPedido(corpoValido({ [CAMPO_ISCA]: "http://spam" }));
  ok(r.ok && r.isca, "isca deveria ser marcada");
});

Deno.test("gerarCodigoPedido usa só caracteres sem ambiguidade", () => {
  equal(gerarCodigoPedido(new Uint8Array([0, 1, 2, 3, 4, 30])), "PBA23456Z");
  // 255 % 31 = 7, oitavo caractere do alfabeto.
  equal(gerarCodigoPedido(new Uint8Array([31, 32, 33, 34, 35, 255])), "PBA234569");
  for (let i = 0; i < 200; i++) {
    const codigo = gerarCodigoPedido(crypto.getRandomValues(new Uint8Array(6)));
    ok(/^PBA[2-9A-HJKMNP-Z]{6}$/.test(codigo), `código fora do padrão: ${codigo}`);
  }
});

Deno.test("e-mail do pedido escapa HTML e traz os dados para o atendimento", () => {
  const r = validarPedido(corpoValido({ empresa_nome: "<b>Loja</b>\n& Cia" }));
  if (!r.ok) throw new Error("deveria validar");
  const email = emailDoPedido({ ...r.pedido, codigo: "PBA23456Z", ip_hash: "h", valor_centavos: 60000, consentimento_em: "x" });
  ok(email.assunto.includes("PBA23456Z"), "assunto sem código");
  ok(email.html.includes("&lt;b&gt;Loja&lt;/b&gt;\n&amp; Cia"), "HTML sem escape");
  ok(!/[\r\n]/.test(email.assunto), "quebra de linha no assunto");
  ok(!email.html.includes("<b>Loja"), "HTML injetado");
  ok(email.texto.includes("R$ 600,00"), "texto sem valor");
  ok(email.texto.includes("WhatsApp do comprador: 64991234567"), "texto sem WhatsApp");
});

Deno.test("handler grava, avisa e devolve o código", async () => {
  const { d, inseridos, avisados } = deps();
  const res = await criarHandlerPedido(d, ORIGENS)(post(corpoValido()));
  equal(res.status, 200);
  equal(await res.json(), { codigo: "PBA23456Z", forma_pagamento: "pix" });
  equal(res.headers.get("access-control-allow-origin"), "https://piracanjuba.ai");
  equal(inseridos.length, 1);
  equal(avisados.length, 1);
  equal(inseridos[0].valor_centavos, 60000);
  equal(inseridos[0].ip_hash, "hash-ip");
  equal(inseridos[0].consentimento_em, "2026-11-17T12:00:00.000Z");
});

Deno.test("handler responde preflight e recusa método e corpo inválidos", async () => {
  const h = criarHandlerPedido(deps().d, ORIGENS);
  const pre = await h(new Request("https://x/f", { method: "OPTIONS", headers: { origin: "https://www.piracanjuba.ai" } }));
  equal(pre.status, 200);
  equal(pre.headers.get("access-control-allow-origin"), "https://www.piracanjuba.ai");
  equal((await h(new Request("https://x/f", { method: "GET" }))).status, 405);
  equal((await h(post("{nao-e-json"))).status, 400);
  equal((await h(post("x".repeat(20_001)))).status, 413);
  const estranha = await h(post(corpoValido(), "https://outro-site.com"));
  equal(estranha.headers.get("access-control-allow-origin"), "https://piracanjuba.ai");
});

Deno.test("handler não grava pedido de robô que preencheu a isca", async () => {
  const { d, inseridos, avisados } = deps();
  const res = await criarHandlerPedido(d, ORIGENS)(post(corpoValido({ [CAMPO_ISCA]: "x" })));
  equal(res.status, 200);
  equal(inseridos.length, 0);
  equal(avisados.length, 0);
});

Deno.test("handler devolve 429 quando o banco recusa por limite", async () => {
  for (const motivo of ["limite_ip", "limite_dia"] as const) {
    const { d, avisados } = deps({ reservarEInserir: () => Promise.resolve(motivo) });
    const res = await criarHandlerPedido(d, ORIGENS)(post(corpoValido()));
    equal(res.status, 429);
    equal(avisados.length, 0);
  }
});

Deno.test("falha no banco devolve 503; falha só no e-mail mantém o pedido e loga o código", async () => {
  const banco = deps({ reservarEInserir: () => Promise.reject(new Error("db")) });
  const r1 = await criarHandlerPedido(banco.d, ORIGENS)(post(corpoValido()));
  equal(r1.status, 503);
  equal(banco.avisados.length, 0);

  const ip = deps({ ipHash: () => Promise.reject(new Error("hash")) });
  equal((await criarHandlerPedido(ip.d, ORIGENS)(post(corpoValido()))).status, 503);

  const logs: string[] = [];
  const original = console.error;
  console.error = (msg: string) => logs.push(msg);
  try {
    const email = deps({ avisar: () => Promise.reject(new Error("resend 422")) });
    const r2 = await criarHandlerPedido(email.d, ORIGENS)(post(corpoValido({ forma_pagamento: "cartao" })));
    equal(r2.status, 200);
    equal((await r2.json()).forma_pagamento, "cartao");
    equal(email.inseridos.length, 1);
  } finally {
    console.error = original;
  }
  equal(logs, ["pedido-pagina-empresa: aviso por e-mail falhou para o pedido PBA23456Z (resend 422)"]);
});
