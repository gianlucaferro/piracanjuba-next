/**
 * Os testes de navegador (tests/e2e) simulam o Supabase no próprio navegador, com page.route.
 * Com a busca no servidor da Onda 2 de SEO (2026-11-19), o HTML já chega com os dados lidos pelo
 * servidor no Supabase falso de scripts/validation/e2e-server.mjs, e o navegador não busca de novo:
 * o teste deixaria de ver o dado que ele mesmo simulou.
 *
 * O servidor de e2e liga PIRACANJUBA_E2E_SEM_BUSCA_SERVIDOR=1 e as abas de Prefeitura e Câmara
 * voltam a carregar só pelo navegador, que é o mesmo caminho de quando o Supabase falha no
 * servidor. Em produção e na prévia a variável não existe.
 */
export function buscaNoServidorDesligada(): boolean {
  return process.env.PIRACANJUBA_E2E_SEM_BUSCA_SERVIDOR === "1";
}
