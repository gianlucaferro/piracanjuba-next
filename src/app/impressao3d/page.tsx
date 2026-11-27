import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { ArrowDown, ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { SITE_URL } from "@/lib/empresas-schema";
import { pageMetadata, SCHEMA_IDS } from "@/lib/seo";
import { linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

const display = localFont({
  src: "../agro-franca/fontes/barlow-condensed-bold.woff2",
  weight: "700",
  display: "swap",
  variable: "--lima-display",
});

const caminho = "/impressao3d";
const url = SITE_URL + caminho;
const fotoImpressora = "/marcas-zap/setores/impressao-3d.webp";
const instagram = "https://www.instagram.com/lima3dart/";
const titulo = "Impressão 3D em Piracanjuba | Lima 3D Art";
const descricao = "Conheça as peças multicoloridas de Paulo Henrique em Piracanjuba, Goiás. Veja os colecionáveis da Lima 3D Art e converse com o criador pelo Instagram.";
const social = { url: SITE_URL + "/empresas/impressao3d/compartilhar.jpg", width: 1200, height: 630, alt: "Impressora 3D depositando filamento laranja sobre a mesa de impressão" };
const base = pageMetadata({ title: titulo, description: descricao, path: caminho, image: social.url, imageAlt: social.alt });
export const metadata = {
  ...base,
  title: { absolute: titulo },
  other: { "geo.region": "BR-GO", "geo.placename": "Piracanjuba, Goiás" },
  openGraph: { ...base.openGraph, images: [social] },
  twitter: { ...base.twitter, images: [social] },
};

const projetos = [
  { nome: "O Máskara", detalhe: "O terno amarelo e o rosto verde vêm das cores do filamento neste colecionável de 40 cm em PLA.", post: "DgBj7egIPXy" },
  { nome: "Luigi", detalhe: "O boné verde e o bigode ganham volume na versão impressa do personagem dos games.", post: "Df-iKr1E62R" },
  { nome: "Walter White", detalhe: "Óculos, cavanhaque e respirador compõem a versão colecionável do personagem de Breaking Bad.", post: "DftvRFmFuqZ" },
  { nome: "Chuck Norris", detalhe: "Uma figura de 35 cm, impressa em PLA, com camisa azul e botas de caubói.", post: "DgFMQ80oNka" },
];

const dados = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "CollectionPage", "@id": url, url, name: titulo, description: descricao, inLanguage: "pt-BR",
      isPartOf: { "@id": SCHEMA_IDS.site }, publisher: { "@id": SCHEMA_IDS.org },
      about: { "@id": url + "#criador" }, primaryImageOfPage: SITE_URL + fotoImpressora },
    { "@type": "Person", "@id": url + "#criador", name: "Paulo Henrique", alternateName: "Lima 3D Art",
      sameAs: [instagram], workLocation: { "@type": "Place", name: "Piracanjuba, Goiás" } },
  ],
};

const correcao = linkWhatsapp(WHATSAPP_COMERCIAL, "Olá! Quero solicitar uma correção ou a retirada da página " + url);

export default function Lima3DArt() {
  return (
    <article className={`${display.variable} ${s.pagina}`} aria-labelledby="lima-titulo">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados) }} />
      <header className={s.cabecalho}>
        <div className={`${s.largura} ${s.barra}`}>
          <span className={s.marca}>Lima <span>3D</span> Art</span>
          <a href="#projetos" className={s.menu}>Projetos <ArrowDown size={15} /></a>
        </div>
        <div className={`${s.largura} ${s.hero}`}>
          <div className={s.intro}>
            <p className={s.local}><MapPin size={16} aria-hidden="true" /> Piracanjuba, Goiás</p>
            <h1 id="lima-titulo">Impressão 3D <span>em Piracanjuba</span></h1>
            <p className={s.resumo}>Paulo Henrique imprime em camadas os personagens que você conhece das telas. Explore os colecionáveis e veja de perto as cores e os detalhes de cada peça.</p>
            <a className={s.botao} href={instagram}><InstagramIcon width={20} height={20} /> Conhecer o Instagram <ArrowUpRight size={17} /></a>
          </div>
          <div className={s.quadro}>
            <Image src={fotoImpressora} alt="Cabeçote de impressora 3D e filamento laranja sobre a mesa de impressão" fill preload sizes="(max-width: 720px) 94vw, (max-width: 1200px) 42vw, 480px" />
          </div>
        </div>
      </header>
      <section id="projetos" aria-labelledby="lima-projetos" className={`${s.largura} ${s.portfolio}`}>
        <div className={s.cabecaSecao}>
          <h2 id="lima-projetos">Projetos em destaque</h2>
          <p>Escolha uma peça para ver a impressão de Paulo Henrique na publicação original.</p>
        </div>
        <div className={s.grade}>
          {projetos.map(({ nome, detalhe, post }) => (
            <a href={instagram + "p/" + post + "/"} key={post} className={s.projeto} aria-label={"Ver peça no Instagram: " + nome}>
              <h3>{nome}</h3>
              <p>{detalhe}</p>
              <span className={s.verProjeto}>Ver peça no Instagram <ArrowUpRight size={17} aria-hidden="true" /></span>
            </a>
          ))}
        </div>
      </section>
      <section className={s.contato} aria-labelledby="lima-contato">
        <div className={`${s.largura} ${s.contatoDentro}`}>
          <div><h2 id="lima-contato">Gostou de uma peça?</h2><p>Envie a publicação por mensagem para Paulo no Instagram e consulte a disponibilidade.</p></div>
          <a href={instagram} className={s.botaoEscuro}><InstagramIcon width={20} height={20} /> @lima3dart <ArrowUpRight size={17} /></a>
        </div>
      </section>
      <div className={`${s.largura} ${s.rodape}`}>
        <Link href="/zap-pba"><ArrowLeft size={16} aria-hidden="true" /> Guia de Piracanjuba</Link>
        <a href={correcao}>Solicitar correção ou retirada</a>
      </div>
    </article>
  );
}
