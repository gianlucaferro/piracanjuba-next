// Pedido da página de empresa (piracanjuba.ai/<slug>), vindo de /anuncie/cadastro.
// Módulo puro (sem importação remota) para os testes do Deno: validação, código do
// pedido, limite de envios e texto do e-mail. A função pedido-pagina-empresa liga
// isto ao banco (service role) e ao Resend.

export const FORMAS_PAGAMENTO = ["pix", "cartao"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export type PedidoValidado = {
  forma_pagamento: FormaPagamento;
  comprador_nome: string;
  comprador_email: string;
  comprador_whatsapp: string;
  comprador_documento: string | null;
  empresa_nome: string;
  empresa_categoria: string;
  empresa_oferta: string;
  empresa_whatsapp: string;
  empresa_bairro: string | null;
  empresa_endereco: string | null;
  empresa_instagram: string | null;
  empresa_site: string | null;
  empresa_horario: string | null;
  empresa_mapa_url: string | null;
  endereco_desejado: string | null;
  observacoes: string | null;
};

export type PedidoRegistro = PedidoValidado & {
  codigo: string;
  ip_hash: string;
  valor_centavos: number;
  consentimento_em: string;
};

export const VALOR_CENTAVOS = 60000;
export const LIMITE_POR_IP_HORA = 5;
export const LIMITE_TOTAL_DIA = 100;
/** Campo-isca: invisível para pessoas, robôs costumam preencher. */
export const CAMPO_ISCA = "confirmacao_site";

type Regra = { obrigatorio: boolean; min?: number; max: number; formato?: RegExp; mensagem: string };

const SO_DIGITOS = (v: string) => v.replace(/\D/g, "");
// Sem espaço, vírgula, ponto e vírgula, aspas, sinais de menor/maior nem parênteses:
// o e-mail vai no reply_to do aviso e não pode virar lista de destinatários.
const EMAIL = /^[^\s@,;:"'<>()[\]\\]+@[^\s@,;:"'<>()[\]\\]+\.[^\s@,;:"'<>()[\]\\]{2,}$/;
const HTTPS = /^https:\/\/\S+$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TEXTOS: Record<string, Regra> = {
  comprador_nome: { obrigatorio: true, min: 2, max: 100, mensagem: "Informe seu nome." },
  comprador_email: { obrigatorio: true, max: 160, formato: EMAIL, mensagem: "Informe um e-mail válido." },
  empresa_nome: { obrigatorio: true, min: 2, max: 120, mensagem: "Informe o nome da empresa." },
  empresa_categoria: { obrigatorio: true, min: 2, max: 80, mensagem: "Informe o ramo da empresa." },
  empresa_oferta: { obrigatorio: true, min: 10, max: 1200, mensagem: "Conte o que a empresa oferece (pelo menos 10 caracteres)." },
  empresa_bairro: { obrigatorio: false, max: 80, mensagem: "Bairro muito longo." },
  empresa_endereco: { obrigatorio: false, max: 160, mensagem: "Endereço muito longo." },
  empresa_instagram: { obrigatorio: false, max: 80, mensagem: "Instagram muito longo." },
  empresa_site: { obrigatorio: false, max: 200, mensagem: "Site muito longo." },
  empresa_horario: { obrigatorio: false, max: 160, mensagem: "Horário muito longo." },
  empresa_mapa_url: { obrigatorio: false, max: 500, formato: HTTPS, mensagem: "Cole o link completo do Google Maps (começando com https://)." },
  endereco_desejado: { obrigatorio: false, max: 40, formato: SLUG, mensagem: "Use só letras minúsculas, números e hífen no endereço desejado." },
  observacoes: { obrigatorio: false, max: 1200, mensagem: "Observações muito longas." },
};

export type ResultadoValidacao =
  | { ok: true; pedido: PedidoValidado; isca: boolean }
  | { ok: false; erro: string };

/** Tamanho em caracteres (pontos de código), como o char_length do Postgres. */
function tamanho(valor: string): number {
  return [...valor].length;
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function telefone(valor: unknown, obrigatorio: boolean, mensagem: string): string | null | Error {
  const digitos = SO_DIGITOS(texto(valor));
  if (!digitos) return obrigatorio ? new Error(mensagem) : null;
  const nacional = digitos.length > 11 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
  if (nacional.length < 10 || nacional.length > 11) return new Error(mensagem);
  return nacional;
}

export function validarPedido(corpo: unknown): ResultadoValidacao {
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return { ok: false, erro: "Pedido inválido." };
  const c = corpo as Record<string, unknown>;
  const isca = texto(c[CAMPO_ISCA]) !== "";

  if (c.consentimento !== true) return { ok: false, erro: "É preciso concordar com o uso dos dados para concluir o pedido." };
  const forma = texto(c.forma_pagamento);
  if (!(FORMAS_PAGAMENTO as readonly string[]).includes(forma)) return { ok: false, erro: "Escolha PIX ou cartão." };

  const campos: Record<string, string | null> = {};
  for (const [nome, regra] of Object.entries(TEXTOS)) {
    const valor = texto(c[nome]);
    if (!valor) {
      if (regra.obrigatorio) return { ok: false, erro: regra.mensagem };
      campos[nome] = null;
      continue;
    }
    const n = tamanho(valor);
    if (n > regra.max || (regra.min && n < regra.min) || (regra.formato && !regra.formato.test(valor))) {
      return { ok: false, erro: regra.mensagem };
    }
    campos[nome] = valor;
  }

  const compradorWhatsapp = telefone(c.comprador_whatsapp, true, "Informe seu WhatsApp com DDD.");
  if (compradorWhatsapp instanceof Error) return { ok: false, erro: compradorWhatsapp.message };
  const empresaWhatsapp = telefone(c.empresa_whatsapp, true, "Informe o WhatsApp da empresa com DDD.");
  if (empresaWhatsapp instanceof Error) return { ok: false, erro: empresaWhatsapp.message };

  const documento = SO_DIGITOS(texto(c.comprador_documento));
  if (documento && documento.length !== 11 && documento.length !== 14) {
    return { ok: false, erro: "CPF ou CNPJ incompleto." };
  }

  return {
    ok: true,
    isca,
    pedido: {
      forma_pagamento: forma as FormaPagamento,
      comprador_nome: campos.comprador_nome!,
      comprador_email: campos.comprador_email!.toLowerCase(),
      comprador_whatsapp: compradorWhatsapp!,
      comprador_documento: documento || null,
      empresa_nome: campos.empresa_nome!,
      empresa_categoria: campos.empresa_categoria!,
      empresa_oferta: campos.empresa_oferta!,
      empresa_whatsapp: empresaWhatsapp!,
      empresa_bairro: campos.empresa_bairro,
      empresa_endereco: campos.empresa_endereco,
      empresa_instagram: campos.empresa_instagram,
      empresa_site: campos.empresa_site,
      empresa_horario: campos.empresa_horario,
      empresa_mapa_url: campos.empresa_mapa_url,
      endereco_desejado: campos.endereco_desejado,
      observacoes: campos.observacoes,
    },
  };
}

// Sem 0/O, 1/I/L: o código é lido e digitado à mão.
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** "PBA" + 6 caracteres; também serve de txid do PIX e de referência no Stripe. */
export function gerarCodigoPedido(aleatorio: Uint8Array): string {
  if (aleatorio.length < 6) throw new Error("bytes insuficientes");
  let codigo = "PBA";
  for (let i = 0; i < 6; i++) codigo += ALFABETO[aleatorio[i] % ALFABETO.length];
  return codigo;
}

function escapar(valor: string): string {
  return valor.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

const ROTULOS: Array<[keyof PedidoValidado, string]> = [
  ["comprador_nome", "Comprador"],
  ["comprador_email", "E-mail"],
  ["comprador_whatsapp", "WhatsApp do comprador"],
  ["comprador_documento", "CPF ou CNPJ"],
  ["empresa_nome", "Empresa"],
  ["empresa_categoria", "Ramo"],
  ["empresa_oferta", "O que oferece"],
  ["empresa_whatsapp", "WhatsApp da empresa"],
  ["empresa_bairro", "Bairro"],
  ["empresa_endereco", "Endereço"],
  ["empresa_instagram", "Instagram"],
  ["empresa_site", "Site"],
  ["empresa_horario", "Horário"],
  ["empresa_mapa_url", "Google Maps"],
  ["endereco_desejado", "Endereço desejado"],
  ["observacoes", "Observações"],
];

export function emailDoPedido(pedido: PedidoRegistro): { assunto: string; html: string; texto: string } {
  const forma = pedido.forma_pagamento === "pix" ? "PIX" : "Cartão (Stripe)";
  const linhas = ROTULOS.filter(([campo]) => pedido[campo]).map(([campo, rotulo]) => [rotulo, String(pedido[campo])]);
  const assunto = `Novo pedido de página de empresa: ${pedido.empresa_nome.replace(/\s+/g, " ")} (${pedido.codigo})`;
  const texto = [
    `Pedido ${pedido.codigo}, pagamento por ${forma}, valor R$ ${(pedido.valor_centavos / 100).toFixed(2).replace(".", ",")}.`,
    "Status: aguardando pagamento.",
    "",
    ...linhas.map(([rotulo, valor]) => `${rotulo}: ${valor}`),
  ].join("\n");
  const html = `<p><strong>Pedido ${escapar(pedido.codigo)}</strong>, pagamento por ${forma}, valor R$ ${(pedido.valor_centavos / 100).toFixed(2).replace(".", ",")}. Status: aguardando pagamento.</p><table>${linhas
    .map(([rotulo, valor]) => `<tr><td><strong>${escapar(rotulo)}</strong></td><td>${escapar(valor)}</td></tr>`)
    .join("")}</table>`;
  return { assunto, html, texto };
}

/** Resultado da reserva atômica no banco (função SQL criar_pedido_pagina_empresa). */
export type ResultadoReserva = "ok" | "limite_ip" | "limite_dia";

export interface PedidoDependencias {
  ipHash(req: Request): Promise<string>;
  /** Confere os limites e grava o pedido numa só transação, sob trava. */
  reservarEInserir(registro: PedidoRegistro, limites: { porIpHora: number; totalDia: number }): Promise<ResultadoReserva>;
  avisar(registro: PedidoRegistro): Promise<void>;
  aleatorio(): Uint8Array;
  agora(): Date;
}

export function criarHandlerPedido(deps: PedidoDependencias, origensPermitidas: string[]) {
  return async (req: Request): Promise<Response> => {
    const origem = req.headers.get("origin") ?? "";
    const headers = {
      "Access-Control-Allow-Origin": origensPermitidas.includes(origem) ? origem : origensPermitidas[0],
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
    };
    const responder = (status: number, corpo: object) => new Response(JSON.stringify(corpo), { status, headers });

    if (req.method === "OPTIONS") return responder(200, {});
    if (req.method !== "POST") return responder(405, { erro: "Método não permitido." });

    let corpo: unknown;
    try {
      const bruto = await req.text();
      if (bruto.length > 20_000) return responder(413, { erro: "Pedido grande demais." });
      corpo = JSON.parse(bruto);
    } catch {
      return responder(400, { erro: "Pedido inválido." });
    }

    const validacao = validarPedido(corpo);
    if (!validacao.ok) return responder(400, { erro: validacao.erro });

    const codigo = gerarCodigoPedido(deps.aleatorio());
    // Robô que preencheu o campo-isca recebe resposta normal, mas nada é gravado.
    if (validacao.isca) return responder(200, { codigo, forma_pagamento: validacao.pedido.forma_pagamento });

    const indisponivel = { erro: "Não foi possível registrar o pedido agora. Tente de novo ou fale no WhatsApp." };
    let ipHash: string;
    try {
      ipHash = await deps.ipHash(req);
    } catch {
      return responder(503, indisponivel);
    }

    const registro: PedidoRegistro = {
      ...validacao.pedido,
      codigo,
      ip_hash: ipHash,
      valor_centavos: VALOR_CENTAVOS,
      consentimento_em: deps.agora().toISOString(),
    };
    let reserva: ResultadoReserva;
    try {
      reserva = await deps.reservarEInserir(registro, { porIpHora: LIMITE_POR_IP_HORA, totalDia: LIMITE_TOTAL_DIA });
    } catch {
      return responder(503, indisponivel);
    }
    if (reserva !== "ok") {
      if (reserva === "limite_dia") console.error("pedido-pagina-empresa: teto diário de pedidos atingido");
      return responder(429, { erro: "Muitos pedidos em pouco tempo. Tente de novo mais tarde ou fale no WhatsApp." });
    }
    try {
      await deps.avisar(registro);
    } catch (falha) {
      // O pedido já está gravado; a falha do e-mail não deve travar o comprador.
      // Só o código do pedido e o motivo técnico vão ao log, sem dado pessoal.
      const motivo = falha instanceof Error ? falha.message : "erro desconhecido";
      console.error(`pedido-pagina-empresa: aviso por e-mail falhou para o pedido ${codigo} (${motivo})`);
    }
    return responder(200, { codigo, forma_pagamento: registro.forma_pagamento });
  };
}
