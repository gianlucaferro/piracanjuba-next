import type { Metadata } from "next";
import Image from "next/image";
import localFont from "next/font/local";
import Link from "next/link";
import {
  ArrowDown, ArrowLeft, ArrowUpRight, FileText, House, Landmark, MapPin,
  Scale, Shield, ShoppingBag,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

const tipografia = localFont({
  src: "../pacifico-siqueira-advocacia/fontes/fraunces.woff2",
  weight: "400 600",
  display: "swap",
  variable: "--ev-serifa",
});

const portal = "https://piracanjuba.ai";
const caminho = "/evadvocacia";
const url = portal + caminho;
const imagens = "/empresas/evadvocacia";
const nome = "Ellen Vieira Advocacia";
const profissional = "Ellen Vieira de Freitas";
const registro = "OAB-GO 42.685";
const razaoSocial = "Vieira de Freitas Sociedade Individual de Advocacia";
const cnpj = "65.979.766/0001-05";
const telefone = "5564992817816";
const whatsapp = linkWhatsapp(telefone);
const rua = "Rua Moacir Teles";
const cep = "75640-000";
const mapa = "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(`${rua}, Piracanjuba, GO, ${cep}, Brasil`);

const areas = [
  {
    titulo: "Direito Civil", icone: FileText,
    resumo: "Contratos, cobranças e reparação de danos. Orientação sobre acordos e conflitos entre pessoas ou empresas.",
  },
  {
    titulo: "Direito Penal", icone: Shield,
    resumo: "Orientação sobre intimações, acompanhamento de investigações e defesa em processos criminais.",
  },
  {
    titulo: "Direito do Consumidor", icone: ShoppingBag,
    resumo: "Atendimento em casos de cobranças indevidas, produtos com defeito e problemas na contratação de serviços.",
  },
  {
    titulo: "Direito Imobiliário", icone: House,
    resumo: "Análise de contratos de compra, venda e locação de imóveis e orientação em questões de posse e propriedade.",
  },
  {
    titulo: "Direito Previdenciário", icone: Landmark,
    resumo: "Orientação sobre aposentadorias, pensões e benefícios por incapacidade, do pedido ao recurso junto ao INSS.",
  },
];

const titulo = "Advogada em Piracanjuba (GO) | Ellen Vieira Advocacia";
const descricao = "Ellen Vieira, advogada em Piracanjuba, GO (OAB-GO 42.685). Direito Civil, Penal, do Consumidor, Imobiliário e Previdenciário. Agende pelo WhatsApp.";
const compartilhamento = {
  url: portal + imagens + "/compartilhar.jpg", width: 1200, height: 630,
  alt: "Marca de Ellen Vieira Advocacia e retrato da advogada em Piracanjuba",
};
const base = pageMetadata({ title: titulo, description: descricao, path: caminho, image: compartilhamento.url });
export const metadata: Metadata = {
  ...base,
  title: { absolute: titulo },
  openGraph: { ...base.openGraph, images: [compartilhamento] },
  twitter: { ...base.twitter, card: "summary_large_image", images: [compartilhamento] },
};

const esquema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage", "@id": url + "#pagina", url, name: titulo, description: descricao,
      inLanguage: "pt-BR", isPartOf: { "@id": portal + "/#website" },
      mainEntity: { "@id": url + "#escritorio" }, breadcrumb: { "@id": url + "#navegacao" },
    },
    {
      "@type": "LegalService", "@id": url + "#escritorio", name: nome, legalName: razaoSocial,
      taxID: cnpj, url, mainEntityOfPage: { "@id": url + "#pagina" },
      image: portal + imagens + "/escritorio.webp", logo: portal + imagens + "/marca.webp",
      telephone: "+" + telefone, hasMap: mapa, employee: { "@id": url + "#ellen-vieira" },
      sameAs: "https://www.google.com/maps?cid=11737208517747835487",
      areaServed: { "@type": "City", name: "Piracanjuba", containedInPlace: { "@type": "State", name: "Goiás" } },
      address: {
        "@type": "PostalAddress", streetAddress: rua, addressLocality: "Piracanjuba",
        addressRegion: "GO", postalCode: cep, addressCountry: "BR",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog", name: "Áreas de atuação",
        itemListElement: areas.map((a) => ({
          "@type": "Offer", itemOffered: { "@type": "Service", name: a.titulo, description: a.resumo },
        })),
      },
    },
    {
      "@type": "Person", "@id": url + "#ellen-vieira", name: profissional, alternateName: "Ellen Vieira", jobTitle: "Advogada",
      image: portal + imagens + "/retrato.webp", worksFor: { "@id": url + "#escritorio" },
      identifier: { "@type": "PropertyValue", propertyID: "OAB-GO", value: "42.685" },
    },
    {
      ...breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: nome, path: caminho }]),
      "@id": url + "#navegacao",
    },
  ],
};

export default function EllenVieira() {
  return (
    <article className={tipografia.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />
      <header className={s.capa}>
        <div className={s.largura}>
          <div className={s.linhaGuia}>
            <Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
            <span className={s.dadosCapa}><span className={s.cidade}><MapPin size={14} aria-hidden="true" /> Piracanjuba, Goiás</span>{registro}</span>
          </div>
          <div className={s.capaGrade}>
            <div className={s.apresentacao}>
              <div className={s.marca}>
                <Image src={imagens + "/marca.webp"} width={1040} height={636} alt="Ellen Vieira Advocacia e Consultoria Jurídica" loading="eager"
                  sizes="(max-width: 700px) 290px, (max-width: 1000px) 37vw, 420px" />
              </div>
              <h1>Advogada em Piracanjuba</h1>
              <p>{profissional} orienta sobre contratos, relações de consumo, imóveis e benefícios do INSS. Também atua na defesa criminal.</p>
              <div className={s.acoes}>
                <a href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Falar pelo WhatsApp</a>
                <a href="#atuacao" className={s.atalho}>Áreas de atuação <ArrowDown size={15} aria-hidden="true" /></a>
              </div>
            </div>
            <div className={s.retrato}>
              <Image src={imagens + "/retrato.webp"} width={1272} height={1260} alt="Retrato da advogada Ellen Vieira"
                loading="eager" fetchPriority="high" sizes="(max-width: 700px) 89vw, (max-width: 1150px) 41vw, 470px" />
            </div>
          </div>
        </div>
      </header>

      <section id="atuacao" aria-labelledby="titulo-atuacao" className={s.atuacao}>
        <div className={s.areasGrade + " " + s.largura}>
          <div className={s.introducao}>
            <Scale size={30} strokeWidth={1.25} aria-hidden="true" />
            <h2 id="titulo-atuacao">Áreas de atuação</h2>
          </div>
          <ul className={s.lista}>
            {areas.map(({ titulo: area, resumo, icone: Icone }) => (
              <li key={area}>
                <Icone size={23} strokeWidth={1.45} aria-hidden="true" />
                <div><h3>{area}</h3><p>{resumo}</p></div>
              </li>
            ))}
          </ul>
          <figure className={s.profissional}>
            <Image src={imagens + "/escritorio.webp"} width={1280} height={853}
              alt="Ellen Vieira à mesa de trabalho, com livros e computador"
              sizes="(max-width: 700px) 90vw, (max-width: 1200px) 36vw, 425px" />
            <figcaption><strong>Ellen Vieira</strong><span>Advogada · {registro}</span></figcaption>
          </figure>
        </div>
      </section>

      <section id="contato" aria-labelledby="titulo-contato" className={s.contato}>
        <div className={s.largura}>
          <div className={s.contatoGrade}>
            <div className={s.convite}>
              <h2 id="titulo-contato">Como falar com um advogado em Piracanjuba?</h2>
              <p>Pelo WhatsApp, você pode agendar uma consulta com Ellen Vieira e confirmar como chegar ao escritório na Rua Moacir Teles.</p>
            </div>
            <div className={s.dados}>
              <div>
                <h3><WhatsAppIcon fill="currentColor" /> WhatsApp</h3>
                <a className={s.telefone} href={whatsapp}>{formatarTelefoneBr(telefone)} <ArrowUpRight size={19} aria-hidden="true" /></a>
              </div>
              <div>
                <h3><MapPin size={17} aria-hidden="true" /> Endereço</h3>
                <address>{rua}<br />Piracanjuba, GO · CEP {cep} · Brasil</address>
                <a className={s.mapa} href={mapa}>Ver rua no Google Maps <ArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
            </div>
          </div>
          <p className={s.registro}>{razaoSocial} <span>CNPJ {cnpj}</span></p>
        </div>
      </section>
    </article>
  );
}
