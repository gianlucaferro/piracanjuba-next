import Image from "next/image";
import localFont from "next/font/local";
import { ArrowDown, ArrowUpRight, BookOpen, Landmark, MapPin, Scale } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { NARAIENE_MARQUES } from "@/data/naraiene-marques";
import { SITE_URL } from "@/lib/empresas-schema";
import { breadcrumbJsonLd, pageMetadata, SCHEMA_IDS } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

const serifa = localFont({
  src: "../pacifico-siqueira-advocacia/fontes/fraunces.woff2",
  weight: "100 900", display: "swap", variable: "--nara-serifa",
});
const { nome, path, telefone, instagram } = NARAIENE_MARQUES;
const url = SITE_URL + path;
const imagens = "/empresas/naraienemarquesadv";
const registro = "51.371";
const nomeCompleto = "Naraiene Cristina Marques";
const cidades = ["Piracanjuba", "Professor Jamil", "Morrinhos", "Caldas Novas", "Goiânia"];
const whatsapp = linkWhatsapp(telefone, "Olá, Dra. Naraiene. Gostaria de consultar os horários de atendimento.");
const areas = [
  {
    titulo: "Direito eleitoral", Icone: Landmark,
    texto: "Questões que surgem em campanhas e eleições, como propaganda eleitoral, pedidos de direito de resposta e representação perante a Justiça Eleitoral.",
  },
  {
    titulo: "Direito administrativo", Icone: BookOpen,
    texto: "Análise de editais, licitações e contratos com o poder público. Também abrange dúvidas sobre atos administrativos e acesso à informação.",
  },
  {
    titulo: "Direito criminal", Icone: Scale,
    texto: "Defesa em investigações e ações penais. A consulta permite entender o conteúdo de uma intimação, a fase do procedimento e os próximos passos.",
  },
];

const titulo = "Naraiene Marques Advocacia | Piracanjuba e região";
const descricao = "Naraiene Marques, OAB/GO 51.371. Advocacia eleitoral, administrativa e criminal. Consulte atendimento para Piracanjuba, Professor Jamil, Morrinhos, Caldas Novas e Goiânia.";
const og = {
  url: SITE_URL + imagens + "/compartilhar.jpg", width: 1200, height: 630,
  alt: "Naraiene Marques Advocacia, OAB/GO 51.371, com retrato da advogada",
};
const base = pageMetadata({ title: titulo, description: descricao, path, image: og.url, imageAlt: og.alt });
export const metadata = {
  ...base,
  openGraph: { ...base.openGraph, images: [og] },
  twitter: { ...base.twitter, images: [og] },
};
const esquema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage", "@id": url, url, name: titulo, description: descricao, inLanguage: "pt-BR",
      mainEntity: { "@id": url + "#escritorio" }, isPartOf: { "@id": SCHEMA_IDS.site },
      publisher: { "@id": SCHEMA_IDS.org }, breadcrumb: { "@id": url + "#navegacao" },
    },
    {
      "@type": "LegalService", "@id": url + "#escritorio", name: nome, url,
      image: SITE_URL + imagens + "/retrato.webp", logo: SITE_URL + imagens + "/marca.webp",
      telephone: "+" + telefone, employee: { "@id": url + "#advogada" },
      areaServed: { "@type": "State", name: "Goiás" },
      contactPoint: { "@type": "ContactPoint", contactType: "Atendimento", telephone: "+" + telefone, url: whatsapp },
      hasOfferCatalog: { "@type": "OfferCatalog", name: "Áreas de atuação", itemListElement: areas.map(({ titulo, texto }) => ({
        "@type": "Offer", itemOffered: { "@type": "Service", name: titulo, description: texto },
      })) },
    },
    {
      "@type": "Person", "@id": url + "#advogada", name: nomeCompleto, alternateName: "Naraiene Marques",
      jobTitle: "Advogada", sameAs: [instagram], worksFor: { "@id": url + "#escritorio" },
      image: SITE_URL + imagens + "/retrato.webp",
      identifier: { "@type": "PropertyValue", propertyID: "OAB/GO", value: registro },
    },
    {
      ...breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: nome, path }]),
      "@id": url + "#navegacao",
    },
  ],
};

export default function NaraieneMarques() {
  return (
    <article className={serifa.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />
      <header>
        <div className={s.barra}>
          <div className={s.miolo}>
            <Image src={imagens + "/marca.webp"} width={766} height={260} alt={nome} className={s.marca} />
            <nav aria-label="Nesta página"><a href="#atuacao">Atuação</a><a href="#perfil">Perfil</a><a href="#atendimento">Atendimento</a></nav>
          </div>
        </div>
        <div className={s.capa}>
          <div className={s.miolo + " " + s.gradeCapa}>
            <div className={s.abertura}>
              <p className={s.registro}>Advocacia <span aria-hidden="true">/</span> OAB/GO {registro}</p>
              <h1>Naraiene <em>Marques</em></h1>
              <p className={s.lide}>Advogada e professora de Direito em Piracanjuba, com atuação em direito eleitoral, administrativo e criminal.</p>
              <div className={s.acoes}>
                <a className={s.botao} href={whatsapp}><WhatsAppIcon fill="currentColor" /> Falar pelo WhatsApp</a>
                <a className={s.atalho} href="#atuacao">Áreas de atuação <ArrowDown size={15} aria-hidden="true" /></a>
              </div>
            </div>
            <div className={s.retrato}>
              <Image src={imagens + "/retrato.webp"} alt="Naraiene Marques ao telefone, com um computador à sua frente" width={1421} height={1895}
                preload sizes="(max-width: 720px) calc(100vw - 48px), (max-width: 1150px) 44vw, 470px" />
            </div>
          </div>
        </div>
      </header>
      <section id="atuacao" className={s.atuacao} aria-labelledby="titulo-atuacao">
        <div className={s.miolo}>
          <h2 id="titulo-atuacao">Áreas de atuação</h2>
          <div className={s.areas}>
            {areas.map(({ titulo, texto, Icone }) => (
              <div key={titulo} className={s.area}>
                <Icone size={26} strokeWidth={1.4} aria-hidden="true" />
                <h3>{titulo}</h3><p>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="perfil" className={s.perfil} aria-labelledby="titulo-perfil">
        <div className={s.miolo + " " + s.gradePerfil}>
          <figure>
            <Image src={imagens + "/docencia.webp"} alt="Naraiene Marques fala ao microfone na Semana Acadêmica da Faculdade de Piracanjuba"
              width={1280} height={852} sizes="(max-width: 720px) calc(100vw - 40px), (max-width: 1150px) 44vw, 520px" />
            <figcaption>Semana Acadêmica da Faculdade de Piracanjuba</figcaption>
          </figure>
          <div>
            <h2 id="titulo-perfil">Advocacia e docência</h2>
            <p><strong>{nomeCompleto}</strong> é advogada inscrita na OAB Goiás sob o número {registro} e professora do curso de Direito da Faculdade de Piracanjuba.</p>
            <p>Na Semana Acadêmica da faculdade, falou sobre a participação das mulheres na política e a violência política de gênero. São temas que aproximam a sala de aula de sua experiência no direito eleitoral.</p>
            <div className={s.links}>
              <a href="https://faculdadefap.edu.br/docentes">Corpo docente da FAP <ArrowUpRight size={15} aria-hidden="true" /></a>
              <a href={instagram}><InstagramIcon width={16} height={16} aria-hidden="true" /> Instagram de Naraiene</a>
            </div>
          </div>
        </div>
      </section>

      <section id="atendimento" className={s.atendimento} aria-labelledby="titulo-atendimento">
        <div className={s.miolo + " " + s.gradeContato}>
          <div>
            <p className={s.etiqueta}><MapPin size={15} aria-hidden="true" /> Goiás</p>
            <h2 id="titulo-atendimento">Consulte o atendimento na sua cidade</h2>
            <p>Escolha seu município para conversar com o escritório pelo WhatsApp e combinar a modalidade e o horário da consulta.</p>
            <a className={s.numero} href={whatsapp}><WhatsAppIcon fill="currentColor" /> {formatarTelefoneBr(telefone)}</a>
          </div>
          <ul aria-label="Consultar atendimento por município">
            {cidades.map((cidade) => (
              <li key={cidade}><a href={linkWhatsapp(telefone, "Olá, Dra. Naraiene. Estou em " + cidade + " e gostaria de saber como agendar uma consulta.")}
                aria-label={"Consultar atendimento em " + cidade + " pelo WhatsApp"}>
                <span>{cidade}</span><ArrowUpRight size={18} aria-hidden="true" />
              </a></li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}
