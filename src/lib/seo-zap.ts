import type { PreviaZap } from "@/data/previas-zap";
import { SITE_URL } from "@/lib/empresas-schema";
import { breadcrumbJsonLd, pageMetadata, SCHEMA_IDS } from "@/lib/seo";

export function metadadosFichaZap(ficha: PreviaZap) {
  const { nome, atividade, resumo, slug } = ficha;
  const incluiAtividade = nome.toLocaleLowerCase("pt-BR").includes(atividade.toLocaleLowerCase("pt-BR"));
  const identificacao = incluiAtividade ? nome : `${nome} | ${atividade}`;
  const local = ficha.atendimentoRemoto ? "com atendimento online" : "em Piracanjuba";
  const title = /\bPiracanjuba\b/i.test(identificacao) ? identificacao : `${identificacao} ${local}`;
  return pageMetadata({
    title,
    description: resumo,
    path: `/zap-pba/${slug}`,
    image: `/marcas-zap/compartilhar/${slug}.jpg`,
    imageAlt: `Cartão de contato de ${nome} no Zap PBA`,
  });
}

function enderecoPostal(endereco?: string) {
  if (!endereco) return;
  // Algumas fontes trazem só o setor, telefone junto à rua ou dois números conflitantes.
  const campos = endereco.match(/^((?:r\.|rua\b|av\.|avenida\b|rodovia\b|viela\b|praça\b|pça\.|alameda\b|go-\d).+?),\s*Piracanjuba\s*[-,/]\s*(?:GO|Goiás)(?:,\s*(\d{5}-\d{3}))?(?:,\s*Bra[sz]il)?$/i);
  if (!campos) return;
  return {
    "@type": "PostalAddress",
    streetAddress: campos[1],
    addressLocality: "Piracanjuba",
    addressRegion: "GO",
    addressCountry: "BR",
    ...(campos[2] && { postalCode: campos[2] }),
  };
}

export function jsonLdFichaZap(ficha: PreviaZap): string {
  const caminho = `/zap-pba/${ficha.slug}`;
  const url = SITE_URL + caminho;
  const idNegocio = `${url}#negocio`;
  const idNavegacao = `${url}#navegacao`;
  const endereco = enderecoPostal(ficha.endereco);
  const perfis = [!ficha.instagramRede && ficha.instagram, ficha.facebook].filter(Boolean);
  const pagina = {
    "@type": "WebPage",
    "@id": url,
    url,
    name: ficha.nome,
    description: ficha.resumo,
    inLanguage: "pt-BR",
    isPartOf: { "@id": SCHEMA_IDS.site },
    publisher: { "@id": SCHEMA_IDS.org },
    breadcrumb: { "@id": idNavegacao },
    ...(endereco && { mainEntity: { "@id": idNegocio } }),
  };
  const navegacao = {
    ...breadcrumbJsonLd([
      { name: "Início", path: "/" },
      { name: "Zap PBA", path: "/zap-pba" },
      { name: ficha.nome, path: caminho },
    ]),
    "@id": idNavegacao,
  };
  const negocio = endereco && {
    "@type": "LocalBusiness",
    "@id": idNegocio,
    name: ficha.nome,
    description: ficha.resumo,
    mainEntityOfPage: { "@id": url },
    address: endereco,
    ...(!ficha.contatoRede && ficha.telefones[0] && { telephone: `+${ficha.telefones[0]}` }),
    ...(ficha.mapa && { hasMap: ficha.mapa }),
    ...(ficha.site && !ficha.siteRede && !ficha.siteRotulo && { url: ficha.site }),
    ...(perfis.length && { sameAs: perfis }),
    ...(ficha.logo && { logo: SITE_URL + ficha.logo }),
    ...(ficha.foto?.startsWith("/marcas-zap/fotos/") && ficha.fotoAlt && { image: SITE_URL + ficha.foto }),
  };
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": negocio ? [pagina, navegacao, negocio] : [pagina, navegacao],
  }).replace(/</g, "\\u003c");
}
