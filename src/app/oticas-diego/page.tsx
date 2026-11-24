import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { ArrowLeft, ArrowRight, ArrowUpRight, Glasses, MapPin, Phone, Sun, Watch } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import InstagramIcon from "@/components/icons/InstagramIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

const fonte = localFont({
  src: "../zap-pba/[slug]/fontes/DMSerifText-Regular.ttf",
  variable: "--fonte-otica",
  display: "swap",
});

const caminho = "/oticas-diego";
const portal = "https://piracanjuba.ai";
const url = portal + caminho;
const marca = "Óticas Diego";
const logo = "/marcas-zap/logos/a43247c841f19764.webp";
const foto = "/empresas/oticas-diego/interior.webp";
const whatsapp = "5564992470659";
const fixo = "556434051198";
const instagram = "https://www.instagram.com/oticasdiego/";
const mapa = "https://www.google.com/maps?cid=7810940027426027358";
const rua = "Rua Dom Pedro II, 491";
const cep = "75640-116";
const conversa = linkWhatsapp(whatsapp, "Olá, Óticas Diego! Vi a loja no Piracanjuba.ai e gostaria de consultar os modelos disponíveis.");
const suporte = linkWhatsapp(WHATSAPP_COMERCIAL, "Olá! Sou responsável pela Óticas Diego e gostaria de solicitar um ajuste ou a retirada da ficha " + url);

const titulo = "Óticas Diego | Ótica em Piracanjuba, GO";
const descricao = "Óticas Diego, ótica em Piracanjuba com armações, lentes de grau, óculos de sol, relógios e acessórios. Veja o WhatsApp, os horários e como chegar à loja no Centro.";
const compartilhamento = {
  url: portal + "/empresas/oticas-diego/compartilhar.jpg", width: 1200, height: 630,
  alt: "Marca da Óticas Diego e interior da loja em Piracanjuba",
};
const meta = pageMetadata({ title: titulo, description: descricao, path: caminho, image: compartilhamento.url });
export const metadata: Metadata = {
  ...meta, title: { absolute: titulo },
  openGraph: { ...meta.openGraph, images: [compartilhamento] },
  twitter: { ...meta.twitter, card: "summary_large_image", images: [compartilhamento] },
};

const produtos = [
  {
    nome: "Armações e lentes de grau", Icone: Glasses,
    resumo: "Converse sobre formatos, cores e tamanhos de armação. Para os óculos de grau, a equipe também informa as opções de lentes para a sua receita.",
    link: "Consultar armações e lentes",
    mensagem: "Olá, Óticas Diego! Gostaria de consultar as armações e as lentes de grau disponíveis na loja.",
  },
  {
    nome: "Óculos de sol", Icone: Sun,
    resumo: "Tem um modelo em mente? Consulte a equipe sobre as cores, os formatos e os valores dos óculos solares antes de ir à loja.",
    link: "Consultar óculos de sol",
    mensagem: "Olá, Óticas Diego! Gostaria de consultar os modelos e as cores de óculos de sol da loja.",
  },
  {
    nome: "Relógios e acessórios", Icone: Watch,
    resumo: "Para escolher um presente ou uma peça para o dia a dia, consulte os estilos de relógios, os acessórios e os valores atuais.",
    link: "Consultar relógios e acessórios",
    mensagem: "Olá, Óticas Diego! Gostaria de saber quais relógios e acessórios vocês têm disponíveis.",
  },
];

const dados = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Optician", "@id": url + "#loja", name: marca, url, description: descricao,
      logo: portal + logo, image: portal + foto, telephone: "+" + whatsapp,
      contactPoint: { "@type": "ContactPoint", telephone: "+" + fixo, contactType: "Atendimento da loja" },
      sameAs: [instagram], hasMap: mapa,
      address: {
        "@type": "PostalAddress", streetAddress: rua + ", Centro", addressLocality: "Piracanjuba",
        addressRegion: "GO", postalCode: cep, addressCountry: "BR",
      },
      geo: { "@type": "GeoCoordinates", latitude: -17.3041683, longitude: -49.0211422 },
      openingHours: ["Mo-Fr 08:00-18:00", "Sa 08:00-12:00"],
    },
    breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: marca, path: caminho }]),
  ],
};

export default function OticasDiego() {
  return (
    <article className={`${s.pagina} ${fonte.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }} />
      <header className={s.capa}>
        <div className={s.largura}>
          <div className={s.barra}>
            <div className={s.marca}>
              <Image src={logo} width={54} height={54} alt="" />
            </div>
            <nav className={s.navegacao} aria-label="Navegação da ótica">
              <a href="#produtos">Produtos</a>
              <a href="#visita">Visite a loja</a>
              <a href={instagram} aria-label="Instagram da Óticas Diego"><InstagramIcon width={20} height={20} /></a>
            </nav>
          </div>
          <div className={s.abertura}>
            <div className={s.chamada}>
              <h1>{marca} <span>Ótica em Piracanjuba</span></h1>
              <p>Converse com a equipe sobre armações, lentes de grau e óculos de sol. Consulte a cor ou o formato que procura antes de visitar a loja no Centro.</p>
              <div className={s.acoes}>
                <a className={s.botao} href={conversa}><WhatsAppIcon fill="currentColor" /> Falar pelo WhatsApp</a>
                <a className={s.rotaCapa} href={mapa}>Como chegar <ArrowUpRight size={17} aria-hidden="true" /></a>
              </div>
            </div>
            <figure className={s.imagem}>
              <Image src={foto} width={680} height={510} loading="eager" fetchPriority="high" sizes="(max-width: 760px) 92vw, (max-width: 1320px) 50vw, 630px"
                alt="Interior da Óticas Diego, com expositor de óculos, balcão de madeira e painel verde com a marca da loja" />
              <figcaption><MapPin size={16} aria-hidden="true" />{rua}, Centro</figcaption>
            </figure>
          </div>
        </div>
      </header>

      <section id="produtos" className={s.catalogo} aria-labelledby="titulo-produtos">
        <div className={s.largura}>
          <div className={s.cabecalho}>
            <h2 id="titulo-produtos">Óculos e acessórios</h2>
            <a className={s.rede} href={instagram}><InstagramIcon width={17} height={17} /> @oticasdiego <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
          <ul className={s.produtos}>
            {produtos.map(({ nome, Icone, resumo, link, mensagem }) => (
              <li key={nome}>
                <Icone className={s.iconeProduto} size={32} strokeWidth={1.45} aria-hidden="true" />
                <h3>{nome}</h3>
                <p>{resumo}</p>
                <a className={s.consulta} href={linkWhatsapp(whatsapp, mensagem)}>{link}<ArrowRight size={16} aria-hidden="true" /></a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="visita" className={s.visita} aria-labelledby="titulo-visita">
        <div className={s.largura}>
          <h2 id="titulo-visita">Visite a Óticas Diego</h2>
          <div className={s.detalhes}>
            <div>
              <h3>Endereço</h3>
              <address>{rua}<br />Centro, Piracanjuba, GO<br />CEP {cep}</address>
              <a className={s.rota} href={mapa}>Como chegar <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
            <div>
              <h3>Horário da loja</h3>
              <dl><div><dt>Segunda a sexta</dt><dd>8h às 18h</dd></div><div><dt>Sábado</dt><dd>8h às 12h</dd></div><div><dt>Domingo</dt><dd>Fechado</dd></div></dl>
            </div>
            <div>
              <h3>Contato</h3>
              <a className={s.contato} href={conversa} aria-label={`WhatsApp da loja, ${formatarTelefoneBr(whatsapp)}`}><WhatsAppIcon fill="currentColor" /> {formatarTelefoneBr(whatsapp)}</a>
              <a className={s.contato} href={`tel:+${fixo}`} aria-label={`Telefone fixo da loja, ${formatarTelefoneBr(fixo)}`}><Phone size={16} aria-hidden="true" /> {formatarTelefoneBr(fixo)}</a>
            </div>
          </div>
          <div className={s.guia}>
            <Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
            <a href={suporte}>Solicitar correção ou retirada da ficha</a>
          </div>
        </div>
      </section>
    </article>
  );
}
