// Links e formatação de WhatsApp para números brasileiros.
// O número entra só com dígitos, com DDI 55 e DDD: "5564992472510".

const NUMERO_BR = /^55\d{10,11}$/;

export function numeroWhatsappValido(numero: string): boolean {
  return NUMERO_BR.test(numero);
}

/** Monta https://wa.me/<numero> com a mensagem pré-preenchida, se houver. */
export function linkWhatsapp(numero: string, mensagem?: string): string {
  if (!numeroWhatsappValido(numero)) {
    throw new Error(`Número de WhatsApp inválido: ${numero}`);
  }
  const base = `https://wa.me/${numero}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

/** "5564992472510" -> "(64) 99247-2510" */
export function formatarTelefoneBr(numero: string): string {
  if (!numeroWhatsappValido(numero)) return numero;
  const nacional = numero.slice(2);
  const ddd = nacional.slice(0, 2);
  const resto = nacional.slice(2);
  const corte = resto.length - 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}
