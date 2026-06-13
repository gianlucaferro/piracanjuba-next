// Canal de retificacao / direito de resposta dos processos publicos.
// Aponta para o e-mail institucional monitorado, com assunto e corpo guiados,
// para que o solicitante informe o que precisa ser revisado ou removido.

export const CONTESTACAO_EMAIL = "contato@piracanjuba.ai";

export function contestacaoMailto(): string {
  const subject = "Solicitação de revisão - Processos públicos";
  const body = [
    "Descreva a imprecisão encontrada:",
    "",
    "1. Nome da pessoa ou número do processo:",
    "2. O que está incorreto:",
    "3. Sua relação com o caso (parte, advogado, terceiro):",
    "",
    "(Responderemos em até 72 horas úteis.)",
  ].join("\n");
  return `mailto:${CONTESTACAO_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}
