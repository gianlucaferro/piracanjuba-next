// Regras públicas dos anúncios do Compra e Venda: o que pode ir ao HTML, quando um
// anúncio é público, o schema Product e ItemList e o parágrafo-resposta da lista.
// Sem imports de alias: os testes em tests/ importam este arquivo direto no Node.

const SITE_URL = "https://piracanjuba.ai";

/**
 * Colunas lidas pela lista e pelo detalhe. Ficam de fora codigo_gestao (o código
 * que permite editar e apagar o anúncio sem login), notificado_expiracao e user_id:
 * a página não usa nenhum dos três, e o que é lido no servidor vai para o HTML.
 */
export const COLUNAS_ANUNCIO_PUBLICO =
  "id, nome, whatsapp, categoria, titulo, descricao, preco, preco_tipo, fotos, status, denuncias, visualizacoes, whatsapp_clicks, expira_em, created_at, updated_at, bairro, foto_perfil";

/** Status que a lista mostra e que o detalhe deixa indexar. */
export const STATUS_PUBLICOS = ["ativo", "vendido"] as const;

export type AnuncioPublico = {
  id: string;
  nome: string;
  whatsapp: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  preco: number | null;
  preco_tipo: string | null;
  fotos: string[] | null;
  status: string;
  denuncias: number | null;
  visualizacoes: number | null;
  whatsapp_clicks: number | null;
  expira_em: string | null;
  created_at: string | null;
  updated_at: string | null;
  bairro: string | null;
  foto_perfil: string | null;
};

type CamposSchema = Pick<
  AnuncioPublico,
  "id" | "titulo" | "descricao" | "categoria" | "preco" | "preco_tipo" | "fotos" | "status"
>;

export const ROTULO_CATEGORIA: Record<string, string> = {
  imoveis: "Imóveis",
  veiculos: "Veículos",
  agro: "Agro",
  eletronicos: "Eletrônicos",
  servicos: "Serviços",
  outros: "Outros",
};

/** Complemento usado na frase-resposta: "3 de veículos", "1 do agro". */
const CATEGORIA_NA_FRASE: Record<string, string> = {
  imoveis: "de imóveis",
  veiculos: "de veículos",
  agro: "do agro",
  eletronicos: "de eletrônicos",
  servicos: "de serviços",
  outros: "de outras categorias",
};

export function rotuloCategoria(categoria: string): string {
  return Object.prototype.hasOwnProperty.call(ROTULO_CATEGORIA, categoria)
    ? ROTULO_CATEGORIA[categoria]
    : ROTULO_CATEGORIA.outros;
}

export function urlAnuncio(id: string): string {
  return `${SITE_URL}/compra-e-venda/${id}`;
}

/**
 * Anúncio que pode ser exibido e indexado: status ativo ou vendido e prazo de
 * expiração (quando houver) ainda não vencido. Removido, em análise (denunciado),
 * expirado ou vencido não é público: o detalhe responde 404.
 */
export function anuncioPublico(
  anuncio: Pick<AnuncioPublico, "status" | "expira_em">,
  agora: Date,
): boolean {
  if (!(STATUS_PUBLICOS as readonly string[]).includes(anuncio.status)) return false;
  if (anuncio.expira_em) {
    const expira = Date.parse(anuncio.expira_em);
    if (Number.isFinite(expira) && expira <= agora.getTime()) return false;
  }
  return true;
}

/**
 * Preço da oferta: o valor informado (acima de zero), ou 0 quando o anúncio é
 * gratuito. null quando o anunciante não informou preço (a tela mostra "Consulte"):
 * nesse caso o schema não traz Offer, porque não há preço para declarar.
 */
export function precoDaOferta(anuncio: Pick<AnuncioPublico, "preco" | "preco_tipo">): number | null {
  if (anuncio.preco_tipo === "gratuito") return 0;
  if (anuncio.preco == null) return null;
  const valor = Number(anuncio.preco);
  return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : null;
}

function fotosValidas(fotos: string[] | null): string[] {
  return (fotos ?? []).filter((f) => typeof f === "string" && /^https:\/\//.test(f));
}

/**
 * Product do anúncio, só com o que existe no dado: sem nota, avaliação, marca ou
 * condição do item, que o anúncio não informa.
 */
export function produtoJsonLd(anuncio: CamposSchema) {
  const url = urlAnuncio(anuncio.id);
  const descricao = anuncio.descricao?.trim();
  const fotos = fotosValidas(anuncio.fotos);
  const preco = precoDaOferta(anuncio);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#produto`,
    name: anuncio.titulo,
    url,
    category: rotuloCategoria(anuncio.categoria),
    ...(descricao ? { description: descricao } : {}),
    ...(fotos.length > 0 ? { image: fotos } : {}),
    ...(preco !== null
      ? {
          offers: {
            "@type": "Offer",
            url,
            price: preco,
            priceCurrency: "BRL",
            availability:
              anuncio.status === "vendido"
                ? "https://schema.org/SoldOut"
                : "https://schema.org/InStock",
          },
        }
      : {}),
  };
}

/** ItemList dos anúncios exibidos no HTML da lista, na mesma ordem. */
export function listaAnunciosJsonLd(anuncios: Pick<AnuncioPublico, "id" | "titulo">[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Anúncios do Compra e Venda PBA, classificados de Piracanjuba",
    url: `${SITE_URL}/compra-e-venda`,
    numberOfItems: anuncios.length,
    itemListElement: anuncios.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: urlAnuncio(a.id),
      name: a.titulo,
    })),
  };
}

export type ResumoAnuncios = {
  ativos: number;
  vendidos: number;
  /** Anúncios ativos por categoria, da maior para a menor contagem. */
  categorias: { categoria: string; total: number }[];
  /** Menor e maior preço informado entre os ativos (sem gratuitos e sem "Consulte"). */
  precoMin: number | null;
  precoMax: number | null;
};

export function resumirAnuncios(
  anuncios: Pick<AnuncioPublico, "status" | "expira_em" | "categoria" | "preco" | "preco_tipo">[],
  agora: Date,
): ResumoAnuncios {
  const publicos = anuncios.filter((a) => anuncioPublico(a, agora));
  const ativos = publicos.filter((a) => a.status === "ativo");
  const contagem = new Map<string, number>();
  for (const a of ativos) {
    const chave = Object.prototype.hasOwnProperty.call(CATEGORIA_NA_FRASE, a.categoria) ? a.categoria : "outros";
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  const categorias = Array.from(contagem, ([categoria, total]) => ({ categoria, total })).sort(
    (x, y) => y.total - x.total || x.categoria.localeCompare(y.categoria),
  );
  const precos = ativos
    .filter((a) => a.preco_tipo !== "gratuito")
    .map((a) => precoDaOferta(a))
    .filter((p): p is number => p !== null && p > 0);
  return {
    ativos: ativos.length,
    vendidos: publicos.length - ativos.length,
    categorias,
    precoMin: precos.length > 0 ? Math.min(...precos) : null,
    precoMax: precos.length > 0 ? Math.max(...precos) : null,
  };
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Data AAAA-MM-DD no fuso de Piracanjuba (o servidor roda em UTC). */
export function dataLocal(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

function juntar(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

/**
 * Parágrafo-resposta do topo de /compra-e-venda: quantos anúncios ativos há, de
 * quais categorias, a faixa de preço e a data do dado. A fonte são os anúncios
 * publicados pelos moradores no próprio site.
 */
export function fraseRespostaAnuncios(resumo: ResumoAnuncios, data: string): string {
  const base = `dados de ${data}, segundo os anúncios publicados pelos próprios moradores no Piracanjuba.ai`;
  if (resumo.ativos === 0) {
    return `O Compra e Venda PBA não tem anúncios ativos no momento (${base}). Anunciar é grátis, e o contato é direto com o anunciante pelo WhatsApp.`;
  }
  const total = resumo.ativos === 1 ? "1 anúncio ativo" : `${resumo.ativos} anúncios ativos`;
  const categorias = juntar(
    resumo.categorias.map((c) => `${c.total} ${CATEGORIA_NA_FRASE[c.categoria]}`),
  );
  let precos = "";
  if (resumo.precoMin !== null && resumo.precoMax !== null) {
    precos =
      resumo.precoMin === resumo.precoMax
        ? `, com preço de ${formatarReais(resumo.precoMin)}`
        : `, com preços de ${formatarReais(resumo.precoMin)} a ${formatarReais(resumo.precoMax)}`;
  }
  const vendidos =
    resumo.vendidos === 0
      ? ""
      : resumo.vendidos === 1
        ? " Outro anúncio já foi marcado como vendido."
        : ` Outros ${resumo.vendidos} já foram marcados como vendidos.`;
  return `O Compra e Venda PBA tem ${total} em Piracanjuba: ${categorias}${precos} (${base}).${vendidos} Anunciar é grátis, e o contato é direto com o anunciante pelo WhatsApp.`;
}

/** JSON para <script type="application/ld+json">, sem permitir fechar a tag. */
export function serializarJsonLd(dado: unknown): string {
  return JSON.stringify(dado).replace(/</g, "\\u003c");
}
