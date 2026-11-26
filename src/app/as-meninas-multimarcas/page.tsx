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

const acessorios = [
  { nome: "Bolsa listrada", detalhe: "Listras em rosa e cru, alças longas e formato de sacola.", foto: "bolsa-listrada.webp", alt: "Bolsa de listras rosa e cru com a inscrição Sole Gelato Bacio", largura: 1056, altura: 1030 },
  { nome: "Bolsa de corrente", detalhe: "Acabamento dourado, costura em losangos e alça de corrente.", foto: "bolsa-dourada.webp", alt: "Bolsa dourada com costura em losangos e alça de corrente", largura: 960, altura: 968 },
  { nome: "Carteira com zíper", detalhe: "Modelo metalizado da Orcade com textura em matelassê.", foto: "carteira-dourada.webp", alt: "Detalhe da carteira dourada Orcade com fecho de zíper e textura em matelassê", largura: 1168, altura: 589 },
];

const dados = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ShoeStore", "@id": url + "#loja", name: nome, alternateName: "As Meninas Outlet", url,
      description: descricao, telephone: "+" + telefone, sameAs: [instagram], hasMap: mapa,
      logo: `${site}${ativos}/logo.webp`, image: [`${site}${ativos}/tenis-arezzo.webp`, `${site}${ativos}/bolsa-listrada.webp`],
      address: { "@type": "PostalAddress", streetAddress: rua, addressLocality: "Piracanjuba", addressRegion: "GO", postalCode: "75640-122", addressCountry: "BR" },
      geo: { "@type": "GeoCoordinates", latitude: -17.3051383, longitude: -49.0239433 },
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
            <a href="#acessorios">Bolsas e acessórios</a>
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
              <a className={s.textoLink} href="#visite">Como chegar <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <figure className={s.destaque}>
            <div className={s.vitrine}><Image src={`${ativos}/tenis-arezzo.webp`} alt="Tênis Arezzo em tom creme, com cadarço e detalhe preto no solado, visto de lado e de cima" width={1080} height={900} sizes="(max-width: 760px) 92vw, (max-width: 1240px) 46vw, 555px" preload /></div>
            <figcaption><span>Tênis Arezzo</span><a href="https://www.instagram.com/p/Df4sXU9RlGi/">Ver no Instagram <ArrowUpRight size={14} aria-hidden="true" /></a></figcaption>
          </figure>
        </div>
      </section>

      <section id="acessorios" aria-labelledby="meninas-acessorios" className={`${s.largura} ${s.colecao}`}>
        <div className={s.colecaoTopo}>
          <h2 id="meninas-acessorios">Bolsas e <em>acessórios.</em></h2>
          <p>Conheça algumas peças apresentadas pela loja. Consulte a disponibilidade do modelo que você gostou.</p>
        </div>
        <div className={s.grade}>
          {acessorios.map((item) => (
            <article key={item.foto} className={s.item}>
              <div className={s.itemFoto}><Image src={`${ativos}/${item.foto}`} alt={item.alt} width={item.largura} height={item.altura} sizes="(max-width: 650px) 92vw, (max-width: 1240px) 30vw, 365px" /></div>
              <h3>{item.nome}</h3><p>{item.detalhe}</p>
              <a className={s.itemLink} aria-label={`Consultar peça pelo WhatsApp, ${item.nome.toLowerCase()}`} href={linkWhatsapp(telefone, `Olá, As Meninas! Vi a ${item.nome.toLowerCase()} no Piracanjuba.ai. Ela está disponível?`)}>Consultar peça <ArrowUpRight size={15} aria-hidden="true" /></a>
            </article>
          ))}
        </div>
      </section>

      <section id="visite" aria-labelledby="meninas-visita" className={s.visita}>
        <div className={`${s.largura} ${s.visitaGrid}`}>
          <div className={s.visitaTitulo}>
            <h2 id="meninas-visita">Visite a <em>As Meninas.</em></h2>
            <p>Experimente os calçados e veja os acessórios na loja do Centro de Piracanjuba.</p>
            <a className={s.botaoClaro} href={mapa}><MapPin size={18} aria-hidden="true" /> Abrir rota no mapa</a>
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
