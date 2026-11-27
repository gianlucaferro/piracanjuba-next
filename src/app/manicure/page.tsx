import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { ArrowDown, ArrowLeft, ArrowUpRight, Clock3, MapPin } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

const outfit = localFont({ src: "./fontes/outfit.woff2", weight: "400 800", variable: "--manicure-outfit", display: "swap" });
const figtree = localFont({ src: "./fontes/figtree.woff2", weight: "400 800", variable: "--manicure-figtree", display: "swap" });
const assinatura = localFont({ src: "./fontes/great-vibes.woff2", weight: "400", variable: "--manicure-assinatura", display: "swap" });

const caminho = "/manicure";
const url = "https://piracanjuba.ai" + caminho;
const oficial = "https://manicureempiracanjuba.com.br/";
const negocio = oficial + "#negocio";
const nome = "Adriana Lima Manicure & Pedicure";
const ativos = "/empresas/manicure";
const titulo = "Manicure e pedicure em Piracanjuba | Adriana Lima";
const descricao = "Confira os valores de manicure e pedicure da Adriana Lima no bairro Orquídeas, em Piracanjuba. Veja horários, endereço e agende pelo WhatsApp.";
const fotoSocial = { url: "https://piracanjuba.ai" + ativos + "/compartilhar.jpg", width: 1200, height: 630, alt: "Adriana Lima Manicure & Pedicure em Piracanjuba" };
const meta = pageMetadata({ path: caminho, title: titulo, description: descricao, image: fotoSocial.url, imageAlt: fotoSocial.alt });
export const metadata: Metadata = {
  ...meta,
  title: { absolute: titulo },
  openGraph: { ...meta.openGraph, images: [fotoSocial] },
  twitter: { ...meta.twitter, card: "summary_large_image", images: [fotoSocial] },
};

const telefone = "5564992244654";
const agendar = linkWhatsapp(telefone, "Olá, Adriana! Vi seu atendimento no Piracanjuba.ai e gostaria de agendar um horário.");
const suporte = linkWhatsapp(WHATSAPP_COMERCIAL, "Olá! Sou responsável pela página da Adriana Lima no Piracanjuba.ai e gostaria de solicitar uma correção ou retirada: " + url);
const rua = "Rua Antônio Ferreira Cunha, Qd 03 Lt 13";
const bairro = "Orquídeas";
const mapa = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(rua + ", " + bairro + ", Piracanjuba, GO");
const servicos = [
  { nome: "Manicure", detalhe: "Lixamento, cuidado com as cutículas e esmaltação das mãos.", valor: 40 },
  { nome: "Pedicure", detalhe: "Cuidado com as unhas dos pés, da cutilagem ao esmalte.", valor: 40 },
  { nome: "Mão e pé", detalhe: "Manicure e pedicure juntas, em um só horário.", valor: 70 },
];
const cores = [
  { foto: "vinho", nome: "Vinho", alt: "Unhas arredondadas com esmalte vinho brilhante" },
  { foto: "perolado", nome: "Rosa perolado", alt: "Unhas em tom rosa claro com brilho perolado" },
  { foto: "floral", nome: "Floral", alt: "Detalhe de flores brancas sobre esmalte nude" },
];

const estruturados = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": url + "#pagina", url, name: titulo, description: descricao, inLanguage: "pt-BR", mainEntity: { "@id": negocio }, isPartOf: { "@id": "https://piracanjuba.ai/#website" } },
    {
      "@type": "NailSalon", "@id": negocio, name: nome, url: oficial, telephone: "+" + telefone,
      image: "https://piracanjuba.ai" + ativos + "/adriana.webp",
      address: { "@type": "PostalAddress", streetAddress: rua + ", " + bairro, addressLocality: "Piracanjuba", addressRegion: "GO", addressCountry: "BR" },
      priceRange: "R$ 40 a R$ 70",
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "19:00" },
        { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "08:00", closes: "17:00" },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog", name: "Manicure e pedicure tradicionais",
        itemListElement: servicos.map(({ nome, detalhe, valor }) => ({
          "@type": "Offer", price: valor, priceCurrency: "BRL", itemOffered: { "@type": "Service", name: nome, description: detalhe },
        })),
      },
    },
    breadcrumbJsonLd([{ name: "Piracanjuba.ai", path: "/" }, { name: "Guia Zap PBA", path: "/zap-pba" }, { name: nome, path: caminho }]),
  ],
};

export default function ManicurePage() {
  return (
    <article className={[s.pagina, outfit.variable, figtree.variable, assinatura.variable].join(" ")}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(estruturados) }} />
      <header className={s.topo}>
        <div className={s.barra}>
          <div className={s.marca}>
            <Image src={ativos + "/logo.webp"} alt="" width={48} height={51} />
            <div><span>Adriana Lima</span><small>Manicure &amp; Pedicure</small></div>
          </div>
          <nav className={s.nav} aria-label="Nesta página">
            <a href="#servicos">Serviços e valores</a>
            <a href="#atendimento">Atendimento</a>
            <a href={agendar} className={s.navZap}><WhatsAppIcon fill="currentColor" /> Agendar</a>
          </nav>
        </div>
      </header>

      <section className={s.capa} aria-labelledby="manicure-titulo">
        <div className={s.hero}>
          <div className={s.intro}>
            <p className={s.local}><MapPin size={16} aria-hidden="true" /> Bairro Orquídeas · Piracanjuba, GO</p>
            <h1 id="manicure-titulo">Manicure e pedicure <em>em Piracanjuba</em></h1>
            <p className={s.resumo}>Adriana Lima cuida de mãos e pés há mais de 17 anos. Escolha seu serviço e combine um horário diretamente com ela pelo WhatsApp.</p>
            <div className={s.acoes}>
              <a href={agendar} className={s.botao}><WhatsAppIcon fill="currentColor" /> Agendar pelo WhatsApp</a>
              <a href="#servicos" className={s.secundario}>Ver valores <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <figure className={s.quadro}>
            <Image src={ativos + "/adriana.webp"} alt="Adriana Lima à mesa de atendimento em seu estúdio de manicure" width={1000} height={1500} sizes="(max-width: 720px) 85vw, (max-width: 1200px) 38vw, 440px" preload />
          </figure>
        </div>
      </section>

      <section id="servicos" className={s.servicos} aria-labelledby="manicure-servicos">
        <div>
          <h2 id="manicure-servicos">Serviços e valores</h2>
          <p className={s.subtitulo}>Escolha o cuidado para as mãos, os pés ou os dois.</p>
        </div>
        <dl className={s.tabela}>
          {servicos.map((item) => (
            <div key={item.nome} className={s.linha}>
              <dt><strong>{item.nome}</strong><span>{item.detalhe}</span></dt>
              <dd>R$ {item.valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={s.galeria} aria-labelledby="manicure-cores">
        <div className={s.miolo}>
          <h2 id="manicure-cores">Inspiração de esmaltação</h2>
          <div className={s.amostras}>
            {cores.map((cor) => (
              <figure key={cor.foto}>
                <Image src={ativos + "/" + cor.foto + ".webp"} alt={cor.alt} width={800} height={800} sizes={cor.foto === "vinho" ? "(max-width: 580px) 89vw, (max-width: 1200px) 29vw, 350px" : "(max-width: 580px) 44vw, (max-width: 1200px) 29vw, 350px"} />
                <figcaption>{cor.nome}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="atendimento" className={s.contato} aria-labelledby="manicure-endereco">
        <div className={s.mioloContato}>
          <div className={s.convite}>
            <h2 id="manicure-endereco">Atendimento no bairro Orquídeas</h2>
            <p>A Adriana atende com hora marcada, exclusivamente no espaço dela. Para reservar, envie o serviço e o dia que você prefere.</p>
            <a href={agendar} className={s.botaoClaro}><WhatsAppIcon fill="currentColor" /> {formatarTelefoneBr(telefone)}</a>
          </div>
          <div className={s.info}>
            <h3><MapPin size={19} aria-hidden="true" /> Endereço</h3>
            <address>{rua}<br />{bairro}, Piracanjuba, GO</address>
            <a href={mapa}>Ver endereço no mapa <ArrowUpRight size={15} aria-hidden="true" /></a>
            <h3><Clock3 size={19} aria-hidden="true" /> Horários</h3>
            <p>Segunda a sexta, das 8h às 19h.<br />Sábado, das 8h às 17h. Domingo, fechado.</p>
          </div>
        </div>
      </section>
      <footer className={s.rodape}>
        <Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
        <a href={oficial}>Site da Adriana Lima <ArrowUpRight size={15} aria-hidden="true" /></a>
        <a href={suporte}>Solicitar correção ou retirada da ficha</a>
      </footer>
    </article>
  );
}
