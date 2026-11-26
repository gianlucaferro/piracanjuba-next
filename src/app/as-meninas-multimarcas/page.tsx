import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock3, MapPin } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

const editorial = localFont({
  src: "../zap-pba/[slug]/fontes/DMSerifText-Regular.ttf",
  variable: "--meninas-serif",
  display: "swap",
});

const nome = "As Meninas Multimarcas";
const caminho = "/as-meninas-multimarcas";
const site = "https://piracanjuba.ai";
const url = site + caminho;
const ativos = "/empresas/as-meninas-multimarcas";
const instagram = "https://www.instagram.com/asmeninasmultimarcasloja/";
const mapa = "https://www.google.com/maps?cid=6877083417799502373";
const coordenadas = { latitude: -17.3051383, longitude: -49.0239433 };
const rota = `https://www.google.com/maps/dir/?api=1&destination=${coordenadas.latitude},${coordenadas.longitude}`;
const telefone = "5564992176440";
const rua = "Rua Dr. Ruy Brasil Cavalcante, 135";
const conversa = linkWhatsapp(telefone, "Olá, As Meninas! Vi a loja no Piracanjuba.ai e gostaria de consultar os modelos e as numerações disponíveis.");
const correcao = linkWhatsapp(WHATSAPP_COMERCIAL, `Olá! Sou responsável pela As Meninas Multimarcas e gostaria de solicitar uma correção ou a retirada da ficha ${url}`);

const titulo = "Loja de calçados em Piracanjuba | As Meninas Multimarcas";
const descricao = "Calçados e acessórios femininos em Piracanjuba, na As Meninas Multimarcas. Consulte tênis, bolsas, carteiras e numeração pelo WhatsApp ou visite a loja no Centro.";
const fotoSocial = { url: `${site}${ativos}/compartilhar.jpg`, width: 1200, height: 630, alt: "As Meninas Multimarcas, calçados e acessórios em Piracanjuba" };
const meta = pageMetadata({ title: titulo, description: descricao, path: caminho, image: fotoSocial.url, imageAlt: fotoSocial.alt });
export const metadata: Metadata = {
  ...meta,
  title: { absolute: titulo },
  openGraph: { ...meta.openGraph, images: [fotoSocial] },
  twitter: { ...meta.twitter, card: "summary_large_image", images: [fotoSocial] },
};

const categorias = [
  {
    nome: "Tênis casuais",
    foto: "modelos-tenis.webp",
    alt: "Par de tênis creme com cadarço",
    detalhe: "Consulte as numerações e as cores disponíveis.",
    acao: "Consultar tênis",
    mensagem: "Olá, As Meninas! Vi a loja no Piracanjuba.ai. Quais tênis casuais vocês têm na minha numeração?",
  },
  {
    nome: "Bolsas",
    foto: "modelos-bolsas.webp",
    alt: "Bolsa marrom de ombro com duas alças",
    detalhe: "Pergunte sobre tamanhos, cores e tipos de alça.",
    acao: "Consultar bolsas",
    mensagem: "Olá, As Meninas! Vi a loja no Piracanjuba.ai. Gostaria de conhecer os modelos de bolsas disponíveis.",
  },
  {
    nome: "Carteiras",
    foto: "modelos-carteiras.webp",
    alt: "Carteira rosada com fecho de zíper",
    detalhe: "Compare as opções de tamanho, fecho e divisórias.",
    acao: "Consultar carteiras",
    mensagem: "Olá, As Meninas! Vi a loja no Piracanjuba.ai. Quais modelos de carteiras estão disponíveis?",
  },
];

const dados = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ShoeStore", "@id": url + "#loja", name: nome, alternateName: "As Meninas Outlet", url,
      description: descricao, telephone: "+" + telefone, sameAs: [instagram], hasMap: mapa,
      logo: `${site}${ativos}/logo.webp`, image: `${site}${ativos}/proprietaria.webp`,
      address: { "@type": "PostalAddress", streetAddress: rua, addressLocality: "Piracanjuba", addressRegion: "GO", postalCode: "75640-122", addressCountry: "BR" },
      geo: { "@type": "GeoCoordinates", ...coordenadas },
      openingHours: ["Mo-Fr 09:00-18:00", "Sa 09:00-13:00"],
    },
    breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: nome, path: caminho }]),
  ],
};

export default function AsMeninasMultimarcas() {
  return (
    <article className={`${s.pagina} ${editorial.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }} />
      <header className={s.cabecalho}>
        <div className={`${s.largura} ${s.cabecalhoInterno}`}>
          <Image src={`${ativos}/logo.webp`} alt="As Meninas, calçados e acessórios" width={100} height={100} className={s.logo} />
          <nav aria-label="Navegação da loja" className={s.nav}>
            <a href="#acessorios">Vitrine</a>
            <a href="#visite">Visite a loja</a>
            <a href={instagram} className={s.rede}><InstagramIcon width={16} height={16} aria-hidden="true" /> Instagram</a>
          </nav>
        </div>
      </header>

      <section className={s.capa} aria-labelledby="meninas-titulo">
        <div className={`${s.largura} ${s.hero}`}>
          <div className={s.apresentacao}>
            <p className={s.local}><MapPin size={15} aria-hidden="true" /> Centro de Piracanjuba, GO</p>
            <h1 id="meninas-titulo">Calçados femininos <em>em Piracanjuba.</em></h1>
            <p className={s.abertura}>Na <strong>As Meninas Multimarcas</strong>, você encontra tênis, bolsas e carteiras. Fale com a loja para consultar modelos, cores e numerações.</p>
            <div className={s.acoes}>
              <a className={s.botao} href={conversa}><WhatsAppIcon className={s.iconeZap} fill="currentColor" /> Consultar pelo WhatsApp</a>
              <a className={s.textoLink} href={rota}>Como chegar <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <figure className={s.retrato}>
            <Image
              src={`${ativos}/proprietaria.webp`}
              alt="Sabrina Carvalho sorrindo, de blazer amarelo"
              width={1088}
              height={1446}
              sizes="(max-width: 355px) 90vw, (max-width: 760px) 320px, (max-width: 845px) 42vw, 360px"
              preload
            />
            <figcaption><strong>Sabrina Carvalho</strong> - Proprietária da As Meninas Multimarcas</figcaption>
          </figure>
        </div>
      </section>

      <section id="acessorios" aria-labelledby="meninas-acessorios" className={`${s.largura} ${s.colecao}`}>
        <div className={s.colecaoTopo}>
          <h2 id="meninas-acessorios">Calçados e <em>acessórios.</em></h2>
          <p>Escolha uma categoria para conversar com a loja pelo WhatsApp.</p>
        </div>
        <div className={s.grade}>
          {categorias.map((categoria) => (
            <article key={categoria.foto} className={s.item}>
              <div className={s.itemFoto}>
                <Image src={`${ativos}/${categoria.foto}`} alt={categoria.alt} width={724} height={724} sizes="(max-width: 650px) 90vw, (max-width: 1280px) 29vw, 365px" />
              </div>
              <h3>{categoria.nome}</h3>
              <p>{categoria.detalhe}</p>
              <a className={s.itemLink} href={linkWhatsapp(telefone, categoria.mensagem)} aria-label={`${categoria.acao} pelo WhatsApp`}>
                {categoria.acao} <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="visite" aria-labelledby="meninas-visita" className={s.visita}>
        <div className={`${s.largura} ${s.visitaGrid}`}>
          <div className={s.visitaTitulo}>
            <h2 id="meninas-visita">Visite a <em>As Meninas.</em></h2>
            <p>Experimente os calçados e veja os acessórios na loja do Centro de Piracanjuba.</p>
            <a className={s.botaoClaro} href={mapa}><MapPin size={18} aria-hidden="true" /> Ver loja no mapa</a>
          </div>
          <div className={s.dados}>
            <h3><MapPin size={17} aria-hidden="true" /> Endereço</h3>
            <address>{rua}<br />Centro, Piracanjuba, GO<br />CEP 75640-122</address>
            <h3><Clock3 size={17} aria-hidden="true" /> Horário da loja</h3>
            <dl><div><dt>Segunda a sexta</dt><dd>9h às 18h</dd></div><div><dt>Sábado</dt><dd>9h às 13h</dd></div><div><dt>Domingo</dt><dd>Fechado</dd></div></dl>
          </div>
          <div className={s.canais}>
            <h3>Fale com a loja</h3>
            <a href={conversa}><WhatsAppIcon className={s.iconeZap} fill="currentColor" /> {formatarTelefoneBr(telefone)}</a>
            <a href={instagram}><InstagramIcon width={17} height={17} aria-hidden="true" /> @asmeninasmultimarcasloja</a>
          </div>
        </div>
      </section>
      <div className={`${s.largura} ${s.guia}`}>
        <Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
        <a href={correcao}>Solicitar correção ou retirada da ficha</a>
      </div>
    </article>
  );
}
