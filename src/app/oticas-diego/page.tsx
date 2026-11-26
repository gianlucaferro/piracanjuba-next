import type { ComponentType } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock, Glasses, MapPin, Sun, Watch } from "lucide-react";
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
const logo = "/empresas/oticas-diego/logo.webp";
const fachada = "/empresas/oticas-diego/fachada.webp";
const whatsapp = "5564992470659";
const instagram = "https://www.instagram.com/oticasdiego/";
const mapa = "https://www.google.com/maps?cid=7810940027426027358";
const rua = "Rua Dom Pedro II, 491";
const cep = "75640-116";
const conversa = linkWhatsapp(whatsapp, "Olá, Óticas Diego! Vi a loja no Piracanjuba.ai e gostaria de consultar os modelos disponíveis.");
const suporte = linkWhatsapp(WHATSAPP_COMERCIAL, "Olá! Sou responsável pela Óticas Diego e gostaria de solicitar um ajuste ou a retirada da ficha " + url);

const titulo = "Óticas Diego | Ótica e perfumaria em Piracanjuba, GO";
const descricao = "Ótica e perfumaria no Centro de Piracanjuba: óculos de grau e de sol, perfumes árabes, importados e nacionais, relógios Seculus e Mondaine e semijoias.";
const compartilhamento = {
  // A versão na URL força as redes a buscar o cartão novo, que passou a mostrar a fachada.
  url: portal + "/empresas/oticas-diego/compartilhar-logo.jpg?v=2026-11-25", width: 1200, height: 630,
  alt: "Marca da Óticas Diego e fachada da loja em Piracanjuba",
};
const meta = pageMetadata({ title: titulo, description: descricao, path: caminho, image: compartilhamento.url });
export const metadata: Metadata = {
  ...meta, title: { absolute: titulo },
  openGraph: { ...meta.openGraph, images: [compartilhamento] },
  twitter: { ...meta.twitter, card: "summary_large_image", images: [compartilhamento] },
};

type Icone = ComponentType<{ size?: number; strokeWidth?: number }>;

function IconePerfume({ size = 24, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9.5" y="2" width="5" height="3.5" rx="1" />
      <path d="M10.75 5.5v2.25M13.25 5.5v2.25" />
      <rect x="5" y="7.75" width="14" height="14.25" rx="3.5" />
      <rect x="8.5" y="12.5" width="7" height="5" rx="1" />
    </svg>
  );
}

type Item = { texto: string; detalhe?: string; etiquetas?: string[] };
type Produto = { nome: string; Icone: Icone; resumo: string; itens?: Item[]; link: string; mensagem: string };

const produtos: Produto[] = [
  {
    nome: "Armações e lentes de grau", Icone: Glasses,
    resumo: "Formatos, cores e tamanhos de armação para experimentar na loja. A equipe também informa as opções de lentes para a sua receita.",
    link: "Consultar armações e lentes",
    mensagem: "Olá, Óticas Diego! Gostaria de consultar as armações e as lentes de grau disponíveis na loja.",
  },
  {
    nome: "Óculos de sol", Icone: Sun,
    resumo: "Tem um modelo em mente? Consulte a equipe sobre as cores, os formatos e os valores dos óculos solares.",
    link: "Consultar óculos de sol",
    mensagem: "Olá, Óticas Diego! Gostaria de consultar os modelos e as cores de óculos de sol da loja.",
  },
  {
    nome: "Perfumaria", Icone: IconePerfume,
    resumo: "A equipe informa as fragrâncias disponíveis e os valores.",
    itens: [{ texto: "Perfumes árabes" }, { texto: "Perfumes importados" }, { texto: "Perfumes nacionais" }],
    link: "Consultar perfumes",
    mensagem: "Olá, Óticas Diego! Gostaria de consultar os perfumes árabes, importados e nacionais disponíveis na loja.",
  },
  {
    nome: "Relógios e acessórios", Icone: Watch,
    resumo: "Para presentear ou usar no dia a dia, consulte os modelos e os valores atuais.",
    itens: [
      { texto: "Relógios masculinos e femininos", etiquetas: ["Seculus", "Mondaine"] },
      { texto: "Semijoias com garantia", detalhe: "Brincos, pulseiras, correntes e outras peças" },
    ],
    link: "Consultar relógios e semijoias",
    mensagem: "Olá, Óticas Diego! Gostaria de consultar os relógios Seculus e Mondaine e as semijoias disponíveis na loja.",
  },
];

const fotosLoja = [
  {
    src: "/empresas/oticas-diego/loja-balcao.jpg", width: 1280, height: 960, classe: s.fotoLarga,
    sizes: "(max-width: 760px) 92vw, (max-width: 1320px) 46vw, 620px",
    legenda: "Balcão de atendimento e vitrine de relógios",
    alt: "Interior da Óticas Diego com balcão branco de atendimento, cadeiras, prateleiras de óculos, vitrine de relógios e painel verde com a marca da loja",
  },
  {
    src: "/empresas/oticas-diego/loja-perfumaria.jpg", width: 960, height: 1280, classe: s.fotoPerfumaria,
    sizes: "(max-width: 760px) 92vw, (max-width: 1320px) 46vw, 620px",
    legenda: "Perfumaria e óculos de sol",
    alt: "Armário iluminado com perfumes, espelho oval e prateleiras de óculos de sol na Óticas Diego",
  },
];

const dados = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Optician", "@id": url + "#loja", name: marca, url, description: descricao,
      logo: portal + logo, image: fotosLoja.map((f) => portal + f.src), telephone: "+" + whatsapp,
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
              <Image src={logo} width={68} height={68} sizes="(max-width: 760px) 56px, 68px" alt="" />
            </div>
            <nav className={s.navegacao} aria-label="Navegação da ótica">
              <a href="#produtos">Produtos</a>
              <a className={s.linkLoja} href="#loja">Fotos</a>
              <a href="#visita">Visite a loja</a>
              <a href={instagram} aria-label="Instagram da Óticas Diego"><InstagramIcon width={20} height={20} /></a>
            </nav>
          </div>
          <div className={s.abertura}>
            <div className={s.chamada}>
              <h1>{marca} <span>Ótica e perfumaria em Piracanjuba</span></h1>
              <p>Óculos de grau e de sol, perfumes árabes, importados e nacionais, relógios e semijoias. Consulte os modelos pelo WhatsApp antes de visitar a loja no Centro.</p>
              <div className={s.acoes}>
                <a className={s.botao} href={conversa}><WhatsAppIcon fill="currentColor" /> Falar pelo WhatsApp</a>
                <a className={s.rotaCapa} href={mapa}>Como chegar <ArrowUpRight size={17} aria-hidden="true" /></a>
              </div>
              <p className={s.horarioCapa}><Clock size={16} aria-hidden="true" /> <span>Segunda a sexta, <span className={s.semQuebra}>das 8h às 18h.</span> Sábado, <span className={s.semQuebra}>das 8h às 12h.</span></span></p>
            </div>
            <figure className={s.imagem}>
              <div className={s.moldura}>
                <Image src={fachada} width={1448} height={1086} loading="eager" fetchPriority="high" sizes="(max-width: 760px) 92vw, (max-width: 1320px) 50vw, 630px"
                  alt="Fachada da Óticas Diego, com letreiro verde-água, logo da loja, Instagram, WhatsApp, uma vitrine e a porta de entrada de vidro, iluminadas" />
              </div>
              <figcaption><MapPin size={16} aria-hidden="true" />{rua}, Centro</figcaption>
            </figure>
          </div>
        </div>
      </header>

      <section id="produtos" className={s.catalogo} aria-labelledby="titulo-produtos">
        <div className={s.largura}>
          <div className={s.cabecalho}>
            <h2 id="titulo-produtos">Óculos, perfumes e acessórios</h2>
            <a className={s.rede} href={instagram}><InstagramIcon width={17} height={17} /> @oticasdiego <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
          <ul className={s.produtos}>
            {produtos.map(({ nome, Icone, resumo, itens, link, mensagem }) => (
              <li key={nome}>
                <div className={s.nomeProduto}>
                  <span className={s.selo} aria-hidden="true"><Icone size={26} strokeWidth={1.5} /></span>
                  <h3>{nome}</h3>
                </div>
                <div className={s.detalheProduto}>
                  <p>{resumo}</p>
                  {itens && (
                    <ul className={s.itens}>
                      {itens.map(({ texto, detalhe, etiquetas }) => (
                        <li key={texto}>
                          <strong>{texto}</strong>
                          {detalhe && <span className={s.detalheItem}>{detalhe}</span>}
                          {etiquetas && (
                            <span className={s.etiquetas}>
                              {etiquetas.map((etiqueta) => <span key={etiqueta} className={s.etiqueta}>{etiqueta}</span>)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <a className={s.consulta} href={linkWhatsapp(whatsapp, mensagem)}>{link}<ArrowRight size={16} aria-hidden="true" /></a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="loja" className={s.galeria} aria-labelledby="titulo-loja">
        <div className={s.largura}>
          <div className={s.cabecalhoGaleria}>
            <h2 id="titulo-loja">A loja por dentro</h2>
            <p>Vitrines de óculos, relógios e perfumes na {rua}, no Centro de Piracanjuba.</p>
          </div>
          <div className={s.fotos}>
            {fotosLoja.map(({ src, width, height, classe, sizes, legenda, alt }) => (
              <figure key={src} className={classe}>
                <div className={s.recorte}>
                  <Image src={src} width={width} height={height} sizes={sizes} alt={alt} />
                </div>
                <figcaption>{legenda}</figcaption>
              </figure>
            ))}
          </div>
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
              <a className={`${s.botao} ${s.botaoEscuro}`} href={conversa}><WhatsAppIcon fill="currentColor" /> Falar pelo WhatsApp</a>
              <a className={s.contato} href={conversa} aria-label={`WhatsApp da loja, ${formatarTelefoneBr(whatsapp)}`}><WhatsAppIcon fill="currentColor" /> {formatarTelefoneBr(whatsapp)}</a>
              <a className={s.contato} href={instagram} aria-label="Instagram da loja, @oticasdiego"><InstagramIcon width={17} height={17} /> @oticasdiego</a>
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
