// Regras de tela do cadastro da página de empresa (/anuncie/cadastro). A validação
// que vale é a da função pedido-pagina-empresa; aqui ficam só os links e textos.
import { gerarPixCopiaECola } from "./pix.ts";
import { linkWhatsapp } from "./whatsapp.ts";
import {
  LINK_STRIPE_PAGINA_EMPRESA,
  PIX_RECEBEDOR,
  PRECO_PAGINA_EMPRESA,
  WHATSAPP_COMERCIAL,
} from "../data/paginaEmpresa.ts";

const CODIGO = /^PBA[2-9A-HJKMNP-Z]{6}$/;

/** Campo-isca: igual ao CAMPO_ISCA da função (o teste de contrato confere). */
export const CAMPO_ISCA = "confirmacao_site";

export const CAMPOS_PEDIDO = [
  "comprador_nome",
  "comprador_email",
  "comprador_whatsapp",
  "comprador_documento",
  "empresa_nome",
  "empresa_categoria",
  "empresa_oferta",
  "empresa_whatsapp",
  "empresa_bairro",
  "empresa_endereco",
  "empresa_horario",
  "empresa_instagram",
  "empresa_site",
  "empresa_mapa_url",
  "endereco_desejado",
  "observacoes",
] as const;

export type CampoPedido = (typeof CAMPOS_PEDIDO)[number];
export type CamposPedido = Record<CampoPedido, string>;
export type FormaPagamento = "pix" | "cartao";

export function camposVazios(): CamposPedido {
  return Object.fromEntries(CAMPOS_PEDIDO.map((campo) => [campo, ""])) as CamposPedido;
}

/** Corpo enviado à função pedido-pagina-empresa. */
export function montarCorpoPedido(
  campos: CamposPedido,
  forma: FormaPagamento,
  consentimento: boolean,
  isca: string,
): Record<string, unknown> {
  return {
    ...campos,
    endereco_desejado: sugerirEndereco(campos.endereco_desejado),
    forma_pagamento: forma,
    consentimento,
    [CAMPO_ISCA]: isca,
  };
}

export function codigoValido(codigo: unknown): codigo is string {
  return typeof codigo === "string" && CODIGO.test(codigo);
}

/** Código PIX do pedido, com o código como identificador (txid). */
export function pixDoPedido(codigo: string): string {
  return gerarPixCopiaECola({ ...PIX_RECEBEDOR, valor: PRECO_PAGINA_EMPRESA, txid: codigo });
}

/**
 * Link de cartão: o link fixo do Stripe com o código do pedido como referência.
 * Só o código vai na URL; nenhum dado pessoal (regra do operador).
 */
export function linkCartaoDoPedido(codigo: string, link = LINK_STRIPE_PAGINA_EMPRESA): string | null {
  if (!link || !codigoValido(codigo)) return null;
  const url = new URL(link);
  url.searchParams.set("client_reference_id", codigo);
  return url.toString();
}

/** WhatsApp para mandar o comprovante do PIX; a mensagem leva só o código. */
export function linkComprovante(codigo: string): string {
  return linkWhatsapp(
    WHATSAPP_COMERCIAL,
    `Olá! Fiz o pedido ${codigo} da página de empresa no Piracanjuba.ai e paguei pelo PIX. Segue o comprovante.`,
  );
}

/** Sugestão de endereço piracanjuba.ai/<slug> a partir do que a pessoa digitou. */
export function sugerirEndereco(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
