// Endereços das páginas de empresa (piracanjuba.ai/<slug>), o produto "outdoor
// digital" vendido por pagamento único. Fica separado de empresas.ts para que o
// navegador receba só esta lista leve, e não as fichas completas.
//
// Antes de acrescentar um slug: ele não pode repetir o nome de uma seção do
// portal (pasta de src/app) nem de um arquivo ou pasta de public/. O teste
// tests/empresas.test.ts barra a colisão, porque a rota da seção venceria em
// silêncio e a página paga sumiria.
export const SLUGS_EMPRESAS = ["vitorinoperfumes", "apareca"] as const;

export type SlugEmpresa = (typeof SLUGS_EMPRESAS)[number];

export function ehSlugEmpresa(valor: string): valor is SlugEmpresa {
  return (SLUGS_EMPRESAS as readonly string[]).includes(valor);
}

/** true quando o caminho é exatamente a página de uma empresa, como "/apareca" ou "/apareca/". */
export function ehPaginaDeEmpresa(caminho: string | null | undefined): boolean {
  if (!caminho) return false;
  const limpo = caminho.split(/[?#]/)[0].replace(/\/+$/, "");
  const partes = limpo.split("/").filter(Boolean);
  return partes.length === 1 && ehSlugEmpresa(partes[0]);
}
