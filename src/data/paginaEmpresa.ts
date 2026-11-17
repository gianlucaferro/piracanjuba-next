// Termos do produto "página de empresa" (piracanjuba.ai/<slug>), decididos pelo
// operador em 2026-11-16: preço público em pagamento único, sem mensalidade,
// página no ar sem prazo. Usado no /anuncie, na home, no rodapé e no cadastro.
export const PRECO_PAGINA_EMPRESA = 600;
export const PRECO_PAGINA_EMPRESA_TEXTO = `R$ ${PRECO_PAGINA_EMPRESA}`;

// Preço "de" riscado, pedido do operador em 2026-11-17 ("de R$ 1000 (riscado) por
// R$ 600"); ele escolheu manter o riscado depois do aviso sobre o CDC.
export const PRECO_CHEIO_PAGINA_EMPRESA = 1000;
export const PRECO_CHEIO_PAGINA_EMPRESA_TEXTO = "R$ 1.000";
export const DESCONTO_PAGINA_EMPRESA_TEXTO = `R$ ${PRECO_CHEIO_PAGINA_EMPRESA - PRECO_PAGINA_EMPRESA}`;

export const WHATSAPP_COMERCIAL = "5564992375458";

// Recebedor do PIX: Ferro Labs Tecnologia LTDA (mantém o Piracanjuba.ai), chave CNPJ.
export const PIX_RECEBEDOR = {
  chave: "66034538000125",
  nome: "FERRO LABS TECNOLOGIA",
  cidade: "PIRACANJUBA",
  cnpjFormatado: "66.034.538/0001-25",
  razaoSocial: "Ferro Labs Tecnologia LTDA",
} as const;

// Link de pagamento fixo do Stripe (cartão, R$ 600 em uma vez), decisão de 2026-11-17.
// Conta Stripe "Piracanjuba.Ai": produto prod_VdwK2jakAB7R0s, preço
// price_1UceRoIe1Ao3aSJbuCSrfNo3, link plink_1UceRpIe1Ao3aSJbmPc3vj43 (só cartão,
// volta para /anuncie/cadastro/obrigado). Vazio desliga o cartão e deixa só o PIX.
export const LINK_STRIPE_PAGINA_EMPRESA: string = "https://buy.stripe.com/6oUaEX8tC7XnbqAaJZ2Ji00";
