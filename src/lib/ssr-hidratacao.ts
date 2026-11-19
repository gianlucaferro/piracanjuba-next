/**
 * Testes de navegador que simulam o Supabase no próprio navegador (page.route) precisam que a aba
 * carregue pelo navegador. Com a busca no servidor da Onda 2 de SEO (2026-11-19), o HTML chegaria
 * com o dado do Supabase falso de scripts/validation/e2e-server.mjs, e o navegador não buscaria de
 * novo. Outros testes conferem justamente esse HTML do servidor, então o desligamento é por teste:
 * o arquivo de teste grava o cookie COOKIE_SEM_BUSCA_SERVIDOR.
 *
 * O cookie só vale com PIRACANJUBA_E2E=1, que o servidor de e2e liga. Em produção e na prévia a
 * variável não existe, a função devolve false sem ler cookie e as abas buscam no servidor sempre.
 */
export const COOKIE_SEM_BUSCA_SERVIDOR = "e2e_sem_busca_servidor";

export async function buscaNoServidorDesligada(): Promise<boolean> {
  if (process.env.PIRACANJUBA_E2E !== "1") return false;
  const { cookies } = await import("next/headers");
  return (await cookies()).get(COOKIE_SEM_BUSCA_SERVIDOR)?.value === "1";
}
