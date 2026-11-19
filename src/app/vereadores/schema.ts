// JSON-LD das páginas de vereadores: Person no perfil e ItemList em /vereadores.
// Só dado existente: partido, foto e sameAs entram apenas quando há valor, e o
// sameAs aponta só para a biografia oficial na Câmara.
// Sem imports de alias: os testes em tests/ importam este arquivo direto no Node.

import { outrosNomes } from "./identidade.ts";
import { tratamentoParlamentar, urlBiografiaCamara } from "./tratamento.ts";

const SITE_URL = "https://piracanjuba.ai";

// Mesmo @id e dados do nó da Câmara no @graph do layout (src/lib/seo.ts), inline
// porque referência entre scripts por @id não valida isoladamente.
const CAMARA = {
  "@type": "GovernmentOrganization",
  "@id": `${SITE_URL}/#camara`,
  name: "Câmara Municipal de Piracanjuba",
  url: "https://piracanjuba.go.leg.br/",
} as const;

export type DadosVereadorSchema = {
  nome: string;
  slug: string;
  partido?: string | null;
  cargo_mesa?: string | null;
  foto_url?: string | null;
};

export function urlPerfilVereador(slug: string): string {
  return `${SITE_URL}/vereadores/${slug}`;
}

function texto(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function descricaoVereador(v: DadosVereadorSchema): string {
  const tratamento = tratamentoParlamentar(v.slug);
  const partes = [`${tratamento} de Piracanjuba (GO)`];
  const partido = texto(v.partido);
  if (partido) partes.push(partido);
  const cargo = texto(v.cargo_mesa);
  if (cargo) partes.push(`${cargo} da Mesa Diretora`);
  return `${partes.join(", ")}, na Câmara Municipal de Piracanjuba.`;
}

/** Person do perfil /vereadores/[slug]. */
export function pessoaVereadorJsonLd(v: DadosVereadorSchema) {
  const url = urlPerfilVereador(v.slug);
  const alternateName = outrosNomes(v.nome, v.slug);
  const partido = texto(v.partido);
  const foto = texto(v.foto_url);
  const biografia = urlBiografiaCamara(v.slug);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#pessoa`,
    name: v.nome,
    ...(alternateName.length > 0 ? { alternateName } : {}),
    url,
    mainEntityOfPage: url,
    jobTitle: tratamentoParlamentar(v.slug),
    description: descricaoVereador(v),
    memberOf: CAMARA,
    ...(partido ? { affiliation: { "@type": "Organization", name: partido } } : {}),
    ...(foto && /^https:\/\//.test(foto) ? { image: foto } : {}),
    ...(biografia ? { sameAs: [biografia] } : {}),
  };
}

/** ItemList de /vereadores com uma Person por parlamentar, na ordem da página. */
export function listaVereadoresJsonLd(vereadores: Array<Omit<DadosVereadorSchema, "slug"> & { slug: string | null }>) {
  const comPerfil = vereadores.filter((v): v is DadosVereadorSchema => Boolean(v.slug));
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Vereadores de Piracanjuba",
    url: `${SITE_URL}/vereadores`,
    numberOfItems: comPerfil.length,
    itemListElement: comPerfil.map((v, i) => {
      const url = urlPerfilVereador(v.slug);
      const alternateName = outrosNomes(v.nome, v.slug);
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Person",
          "@id": `${url}#pessoa`,
          name: v.nome,
          ...(alternateName.length > 0 ? { alternateName } : {}),
          url,
          jobTitle: tratamentoParlamentar(v.slug),
          memberOf: { "@id": CAMARA["@id"] },
        },
      };
    }),
  };
}

/** JSON para <script type="application/ld+json">, sem permitir fechar a tag. */
export function serializarJsonLd(dado: unknown): string {
  return JSON.stringify(dado).replace(/</g, "\\u003c");
}
