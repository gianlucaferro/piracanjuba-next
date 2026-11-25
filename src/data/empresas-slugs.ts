// Endereços das páginas de empresa (piracanjuba.ai/<slug>), o produto "outdoor
// digital" vendido por pagamento único. Fica separado de empresas.ts para que o
// navegador receba só esta lista leve, e não as fichas completas.
//
// Antes de acrescentar um slug: ele não pode repetir o nome de uma seção do
// portal (pasta de src/app) nem de um arquivo ou pasta de public/. O teste
// tests/empresas.test.ts barra a colisão, porque a rota da seção venceria em
// silêncio e a página paga sumiria.
export const SLUGS_EMPRESAS = ["vitorinoperfumes", "apareca"] as const;

// Inclui as empresas com rota própria para a navegação do portal e do guia.
export const SLUGS_PAGINAS_EMPRESARIAIS: readonly string[] = [
  ...SLUGS_EMPRESAS,
  "pacifico-siqueira-advocacia",
  "evadvocacia",
  "claro",
  "oticas-diego",
  "agro-franca",
  "quiropraxia",
  "estetica",
  "kamillamorranna",
  "viaggi-vistos",
];

export type SlugEmpresa = (typeof SLUGS_EMPRESAS)[number];

export function ehSlugEmpresa(valor: string): valor is SlugEmpresa {
  return (SLUGS_EMPRESAS as readonly string[]).includes(valor);
}

function normalizarSegmento(segmento: string): string {
  let texto = segmento;
  try {
    texto = decodeURIComponent(segmento);
  } catch {
    // Codificação inválida: compara o texto como veio.
  }
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Endereço digitado com maiúscula, acento, hífen ou espaço a mais, como
 * "/VitorinoPerfumes", "/apareça" ou "/vitorino-perfumes": devolve o caminho
 * certo da empresa para redirecionar. Devolve null quando o caminho já é o
 * certo ou não é de empresa. Útil porque o endereço circula em material
 * impresso e é digitado à mão.
 */
export function caminhoCanonicoEmpresa(caminho: string): string | null {
  const partes = caminho.split("/").filter(Boolean);
  if (partes.length !== 1) return null;
  const [segmento] = partes;
  if (SLUGS_PAGINAS_EMPRESARIAIS.includes(segmento)) return null;
  const normalizado = normalizarSegmento(segmento);
  if (!normalizado) return null;
  if (normalizado === "claropiracanjuba") return "/claro";
  const slug = SLUGS_PAGINAS_EMPRESARIAIS.find((s) => s.replace(/-/g, "") === normalizado);
  return slug ? `/${slug}` : null;
}

/** true quando o caminho é exatamente a página de uma empresa, como "/apareca" ou "/apareca/". */
export function ehPaginaDeEmpresa(caminho: string | null | undefined): boolean {
  if (!caminho) return false;
  const limpo = caminho.split(/[?#]/)[0].replace(/\/+$/, "");
  const partes = limpo.split("/").filter(Boolean);
  return partes.length === 1 && SLUGS_PAGINAS_EMPRESARIAIS.includes(partes[0]);
}
