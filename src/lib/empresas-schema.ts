// Dados estruturados (JSON-LD) das páginas de empresa. Fica fora da página
// para que tests/empresas.test.ts confira o FAQPage contra o FAQ visível.
import type { Empresa } from "@/data/empresas";

export const SITE_URL = "https://piracanjuba.ai";

/**
 * Imagem da empresa nos dados estruturados: a primeira foto real da vitrine, a
 * foto do topo ou, sem foto, a imagem de compartilhamento (1200x630). Nunca um
 * recorte de produto: é estreito e tem fundo transparente, que some ou vira
 * mancha nos painéis e nas respostas que reaproveitam a imagem. Imagem gerada
 * por IA também fica de fora: os dados descrevem a empresa, e os painéis e as
 * respostas de IA mostram a imagem sem o aviso que a página exibe.
 */
export function imagemPrincipal(empresa: Empresa): string {
  const fotoVitrine = empresa.galeria?.itens.find((item) => item.tipo === "foto" && item.geradaPorIA !== true);
  if (fotoVitrine) return fotoVitrine.src;
  const midia = empresa.midiaTopo;
  if (midia?.tipo === "foto" && midia.imagem.geradaPorIA !== true) return midia.imagem.src;
  if (!midia && empresa.foto) return empresa.foto.src;
  return empresa.seo.imagem.src;
}

export function schemaEmpresa(empresa: Empresa) {
  const pagina = `${SITE_URL}/${empresa.slug}`;
  const { cidade, uf, atendimento } = empresa.endereco;
  const sameAs = [empresa.contato.site?.url, empresa.contato.instagram?.url].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": empresa.seo.tipoSchema,
    "@id": `${pagina}#empresa`,
    name: empresa.nome,
    description: empresa.seo.descricao,
    url: empresa.contato.site?.url ?? pagina,
    mainEntityOfPage: pagina,
    image: `${SITE_URL}${imagemPrincipal(empresa)}`,
    logo: `${SITE_URL}${empresa.seo.logoSchema ?? empresa.logo.src}`,
    telephone: `+${empresa.contato.whatsapp}`,
    ...(atendimento === "presencial"
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: cidade,
            addressRegion: uf,
            addressCountry: "BR",
          },
          areaServed: { "@type": "City", name: `${cidade}, ${uf}` },
          ...(empresa.endereco.mapaUrl ? { hasMap: empresa.endereco.mapaUrl } : {}),
        }
      : {
          areaServed: [
            { "@type": "City", name: `${cidade}, ${uf}` },
            { "@type": "Country", name: "Brasil" },
          ],
        }),
    ...(sameAs.length ? { sameAs } : {}),
    // Vínculo declarado no texto da página também nos dados (só com os dois campos).
    ...(empresa.vinculo && empresa.vinculoOrganizacao
      ? { parentOrganization: { "@id": empresa.vinculoOrganizacao } }
      : {}),
  };
}

/**
 * FAQPage com exatamente as perguntas e respostas visíveis na página. Não
 * promete resultado rico no Google: só descreve o conteúdo que já está ali.
 */
export function schemaFaq(empresa: Empresa) {
  if (!empresa.faq?.length) return null;
  const pagina = `${SITE_URL}/${empresa.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pagina}#perguntas`,
    url: pagina,
    mainEntity: empresa.faq.map((item) => ({
      "@type": "Question",
      name: item.pergunta,
      acceptedAnswer: { "@type": "Answer", text: item.resposta },
    })),
  };
}
