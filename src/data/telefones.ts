// Fonte única dos telefones de serviços públicos exibidos em /contatos,
// /beneficios-sociais e /seguranca. Cada número fica guardado só em dígitos
// (55 + DDD + número) e o texto exibido sai de formatarTelefone, para o número
// mostrado nunca divergir do link.
//
// Números sem `fonte` vêm da versão anterior do site e ainda não foram
// conferidos em fonte oficial.

export type FonteTelefone = {
  nome: string;
  url: string;
  /** Data (AAAA-MM-DD) em que o número foi conferido na fonte. */
  conferidoEm: string;
};

export type TelefonePublico = {
  /** Só dígitos: 55 + DDD + número. */
  numero: string;
  /** "whatsapp" abre wa.me; "telefone" abre tel:. */
  canal: "whatsapp" | "telefone";
  fonte?: FonteTelefone;
};

export const FONTES_TELEFONES = {
  sitePrefeitura: {
    nome: "Site da Prefeitura de Piracanjuba (Fale conosco)",
    url: "https://piracanjuba.go.gov.br/fale-conosco/",
    conferidoEm: "2026-11-17",
  },
  secretariado: {
    nome: "Site da Prefeitura de Piracanjuba (Secretariado)",
    url: "https://piracanjuba.go.gov.br/secretariado/",
    conferidoEm: "2026-11-17",
  },
  cadastroAutoridades: {
    nome: "Cadastro de Autoridades 2026 do Governo de Goiás (atualizado em 2026-09-21)",
    url: "https://goias.gov.br/governo/wp-content/uploads/sites/11/2021/01/CADASTRO-DE-AUTORIDADES-26-307.pdf",
    conferidoEm: "2026-11-17",
  },
  policiaCivil: {
    nome: "Lista Telefônica 2026 da Polícia Civil de Goiás",
    url: "https://goias.gov.br/policiacivil/wp-content/uploads/sites/71/2026/06/Lista-Telefonica-2026.pdf",
    conferidoEm: "2026-11-17",
  },
} as const satisfies Record<string, FonteTelefone>;

export const TELEFONES = {
  // Segurança
  policiaMilitar1: { numero: "5564999719063", canal: "whatsapp" },
  policiaMilitar2: { numero: "5564999714141", canal: "whatsapp" },
  cpe10: { numero: "5564999713304", canal: "whatsapp" },
  bombeiros: { numero: "5562984940249", canal: "whatsapp" },
  delegacia: { numero: "556420880557", canal: "telefone", fonte: FONTES_TELEFONES.policiaCivil },
  delegaciaCelular: { numero: "5562985956139", canal: "telefone", fonte: FONTES_TELEFONES.policiaCivil },
  conselhoTutelar: { numero: "5564999621487", canal: "telefone" },

  // Saúde
  samu: { numero: "5564996265935", canal: "telefone" },
  caps: { numero: "5564996269555", canal: "whatsapp" },

  // Prefeitura e secretarias
  prefeituraFixo: { numero: "556434054045", canal: "telefone", fonte: FONTES_TELEFONES.sitePrefeitura },
  prefeituraCelular: { numero: "5564992382040", canal: "whatsapp", fonte: FONTES_TELEFONES.cadastroAutoridades },
  secObras: { numero: "5564992437140", canal: "whatsapp", fonte: FONTES_TELEFONES.secretariado },
  secAssistenciaSocial: { numero: "5564999558619", canal: "whatsapp", fonte: FONTES_TELEFONES.secretariado },
  secEsportes: { numero: "5564992980102", canal: "whatsapp", fonte: FONTES_TELEFONES.secretariado },
  creas: { numero: "5564996023899", canal: "whatsapp" },
  cadUnico: { numero: "5564999849676", canal: "whatsapp" },
  sine: { numero: "5564992970908", canal: "whatsapp" },
  samarh: { numero: "5564992980070", canal: "whatsapp", fonte: FONTES_TELEFONES.secretariado },
  gabineteEducacao: { numero: "5564920002303", canal: "whatsapp" },
  secSaude: { numero: "5564996015760", canal: "whatsapp", fonte: FONTES_TELEFONES.secretariado },
  secEducacao: { numero: "556434054069", canal: "telefone" },
  clinicaCastracao: { numero: "5564920015516", canal: "whatsapp" },
  fiscalizacaoPostura: { numero: "5564920002295", canal: "whatsapp" },
  trocaLampada: { numero: "5564933008200", canal: "whatsapp" },
} as const satisfies Record<string, TelefonePublico>;

/** Horário da Prefeitura publicado no site oficial (conferido em 2026-11-17). */
export const HORARIO_PREFEITURA = "Segunda a sexta, das 07h às 11h e das 13h às 17h";

/**
 * Formata para exibição: "(64) 99238-2040" (celular) ou "(64) 3405-4045" (fixo).
 * Número fora do padrão brasileiro volta como veio.
 */
export function formatarTelefone(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  const local = digitos.startsWith("55") && digitos.length >= 12 ? digitos.slice(2) : digitos;
  const ddd = local.slice(0, 2);
  const resto = local.slice(2);
  if (resto.length === 9) return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
  if (resto.length === 8) return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  return numero;
}

/** Link de contato: tel: para telefone, wa.me (com mensagem opcional) para WhatsApp. */
export function linkTelefone(telefone: TelefonePublico, mensagem?: string): string {
  if (telefone.canal === "telefone") return `tel:+${telefone.numero}`;
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${telefone.numero}${texto}`;
}
