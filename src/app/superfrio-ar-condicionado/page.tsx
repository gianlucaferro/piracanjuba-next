import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { ArrowDown, ArrowLeft, ArrowUpRight, Check, ChevronDown, Droplets, MapPin, Phone, Wind, Wrench } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import InstagramIcon from "@/components/icons/InstagramIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

const corpo = localFont({
  src: [
    { path: "./fontes/barlow-400.woff2", weight: "400" },
    { path: "./fontes/barlow-700.woff2", weight: "700" },
  ],
  display: "swap",
  variable: "--sf-corpo",
});
const tituloMarca = localFont({
  src: "./fontes/barlow-condensed-800-italic.woff2",
  weight: "800",
  style: "italic",
  display: "swap",
  variable: "--sf-titulo",
});

const nome = "Superfrio Ar Condicionado";
const rota = "/superfrio-ar-condicionado";
const portal = "https://piracanjuba.ai";
const url = portal + rota;
const ativos = "/empresas/superfrio-ar-condicionado";
const oficial = "https://superfrioar.com.br/ar-condicionado-piracanjuba/";
const instagram = "https://www.instagram.com/superfrio_ar2/";
const telefone = "5564992666414";
const alternativo = "5564992125555";
const contato = linkWhatsapp(telefone, "Olá, Superfrio! Encontrei vocês no Piracanjuba.ai e gostaria de pedir um orçamento.");
const correcao = linkWhatsapp(WHATSAPP_COMERCIAL, `Gostaria de solicitar uma correção ou a retirada da ficha ${url}.`);
const titulo = "Superfrio | Instalação de ar-condicionado em Piracanjuba";
const descricao = "Instalação, limpeza e manutenção de ar-condicionado em Piracanjuba. Consulte a Superfrio para agendar uma visita à sua casa, comércio ou chácara pelo WhatsApp.";
const imagem = { url: portal + ativos + "/compartilhar.jpg", width: 1200, height: 630, alt: "Superfrio Ar Condicionado em Piracanjuba, Goiás" };
const meta = pageMetadata({ title: titulo, description: descricao, path: rota, image: imagem.url, imageAlt: imagem.alt });
export const metadata: Metadata = {
  ...meta, title: { absolute: titulo },
  openGraph: { ...meta.openGraph, images: [imagem] },
  twitter: { ...meta.twitter, card: "summary_large_image", images: [imagem] },
};

const servicos = [
  { id: "instalacao", nome: "Instalação de split", tipo: "Instalação de ar-condicionado", icone: Wind,
    texto: "Para um aparelho novo, a equipe avalia o ponto elétrico, a tubulação e o dreno. A instalação inclui vácuo na linha e teste de funcionamento.",
    acao: "Orçar instalação", mensagem: "Olá, Superfrio! Gostaria de orçar a instalação de um ar-condicionado em Piracanjuba." },
  { id: "limpeza", nome: "Limpeza e higienização", tipo: "Limpeza e higienização de ar-condicionado", icone: Droplets,
    texto: "Poeira no filtro, cheiro ruim e vento fraco são motivos para pedir uma avaliação. A higienização pode incluir a serpentina e a turbina da unidade interna.",
    acao: "Consultar limpeza", mensagem: "Olá, Superfrio! Quero consultar a limpeza e higienização de um ar-condicionado em Piracanjuba." },
  { id: "manutencao", nome: "Manutenção e conserto", tipo: "Manutenção preventiva e corretiva de ar-condicionado", icone: Wrench,
    texto: "Se o aparelho parou de gelar, pinga água ou desliga sozinho, descreva o sintoma. A equipe investiga a causa e apresenta o orçamento antes do reparo.",
    acao: "Pedir avaliação", mensagem: "Olá, Superfrio! Preciso de uma avaliação de manutenção para um ar-condicionado em Piracanjuba." },
];

const perguntas = [
  { pergunta: "Quanto custa instalar um ar-condicionado em Piracanjuba?", resposta: "A capacidade em BTUs, a distância entre as unidades e o acesso ao local influenciam o valor. Envie o modelo e fotos dos pontos de instalação para a Superfrio preparar o orçamento." },
  { pergunta: "Meu ar-condicionado liga, mas não gela. A Superfrio faz conserto?", resposta: "Sim. A empresa faz manutenção corretiva. Informe a marca, o modelo e se há gotejamento, ruído ou código de erro no visor. Esses detalhes ajudam a equipe a planejar a visita." },
  { pergunta: "Posso comprar o aparelho com a instalação?", resposta: "Sim. A Superfrio também vende aparelhos com instalação. Informe o tamanho do ambiente e como ele é usado para consultar capacidade, modelos disponíveis e condições." },
];

const regiao = { "@type": "City", name: "Piracanjuba", containedInPlace: { "@type": "State", name: "Goiás" } };
const empresaId = url + "#empresa";
const dados = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": url, url, name: titulo, description: descricao, inLanguage: "pt-BR", mainEntity: { "@id": empresaId } },
    { "@type": "HVACBusiness", "@id": empresaId, name: nome, url: oficial, telephone: "+" + telefone,
      logo: portal + ativos + "/logo.webp", image: imagem.url, sameAs: [instagram],
      address: { "@type": "PostalAddress", addressLocality: "Piracanjuba", addressRegion: "GO", addressCountry: "BR" },
      areaServed: regiao, contactPoint: { "@type": "ContactPoint", telephone: "+" + alternativo, contactType: "atendimento" } },
    ...servicos.map(item => ({ "@type": "Service", "@id": url + "#" + item.id, name: item.tipo, serviceType: item.tipo, description: item.texto, provider: { "@id": empresaId }, areaServed: regiao })),
    breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: nome, path: rota }]),
  ],
};

export default function Superfrio() {
  return (
    <article className={`${s.pagina} ${corpo.variable} ${tituloMarca.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }} />
      <div className={s.cabecalho}>
        <div className={`${s.largura} ${s.barra}`}>
          <div className={s.marca}>
            <Image src={ativos + "/simbolo.webp"} width={57} height={57} alt="" />
            <div><strong>Superfrio</strong><span>Ar Condicionado</span></div>
          </div>
          <nav aria-label="Navegação da Superfrio">
            <a href="#servicos">Serviços</a><a href="#atendimento">Atendimento</a>
            <a className={s.linkSite} href={oficial}>Site oficial <ArrowUpRight size={15} aria-hidden="true" /></a>
          </nav>
        </div>
      </div>

      <section className={s.capa} aria-labelledby="sf-titulo">
        <div className={`${s.largura} ${s.hero}`}>
          <div className={s.heroTexto}>
            <p className={s.local}><MapPin size={16} aria-hidden="true" /> Piracanjuba, Goiás</p>
            <h1 id="sf-titulo">Instalação de <em>ar-condicionado</em> em Piracanjuba</h1>
            <p className={s.lede}>A Superfrio instala, limpa e conserta aparelhos de ar-condicionado em casas e empresas. Fale com a equipe local para agendar uma visita.</p>
            <div className={s.acoes}>
              <a className={s.botao} href={contato}><WhatsAppIcon className={s.whatsapp} fill="currentColor" /> Orçar pelo WhatsApp</a>
              <a className={s.atalho} href="#servicos">Ver serviços <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <div className={s.fotoHero}>
            <Image src={ativos + "/manutencao-split.webp"} alt="Técnico com instrumento de medição diante da unidade interna de um ar-condicionado split" width={1200} height={900} sizes="(max-width: 760px) 100vw, (max-width: 1250px) 52vw, 620px" preload />
          </div>
        </div>
      </section>

      <section id="servicos" aria-labelledby="sf-servicos" className={`${s.largura} ${s.servicos}`}>
        <h2 id="sf-servicos">Serviços de ar-condicionado</h2>
        <div className={s.grade}>
          {servicos.map(({ id, nome: nomeServico, icone: Icone, texto, acao, mensagem }) => (
            <section key={id} id={id} className={s.servico}>
              <Icone aria-hidden="true" className={s.icone} size={31} strokeWidth={1.7} />
              <h3>{nomeServico}</h3><p>{texto}</p>
              <a href={linkWhatsapp(telefone, mensagem)}>{acao} <ArrowUpRight size={15} aria-hidden="true" /></a>
            </section>
          ))}
        </div>
      </section>

      <section aria-labelledby="sf-higienizacao" className={s.atendimento}>
        <div className={`${s.largura} ${s.areaGrade}`}>
          <div className={s.imagemLimpeza}><Image src={ativos + "/higienizacao.webp"} width={1200} height={675} sizes="(max-width: 760px) 100vw, 46vw" alt="Limpeza da serpentina do ar-condicionado com jato de água e luvas de proteção" /></div>
          <div className={s.regiao}>
            <h2 id="sf-higienizacao">Higienização de <em>ar-condicionado</em></h2>
            <p>O filtro retém poeira, mas a sujeira também pode se acumular na serpentina e na turbina. Se o vento sai fraco ou com mau cheiro, peça à Superfrio uma avaliação do conjunto.</p>
            <ul><li><Check aria-hidden="true" /> Split Hi Wall e Multi Split</li><li><Check aria-hidden="true" /> Piso Teto e Cassete</li></ul>
            <a className={s.linkArea} href={oficial}>Consultar serviços no site oficial <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <div className={`${s.largura} ${s.final}`}>
        <section className={s.perguntas} aria-labelledby="sf-perguntas">
          <h2 id="sf-perguntas">Antes de agendar</h2>
          {perguntas.map(({ pergunta, resposta }) => (
            <details key={pergunta}><summary>{pergunta}<ChevronDown size={17} aria-hidden="true" /></summary><p>{resposta}</p></details>
          ))}
        </section>
        <section id="atendimento" className={s.contato} aria-labelledby="sf-contato">
          <h2 id="sf-contato">Fale com a Superfrio</h2>
          <p>A equipe atende a cidade e a zona rural de Piracanjuba, incluindo Passa Quatro e Trevo Floresta. Para agendar, envie sua localização e o modelo do aparelho.</p>
          <a className={s.botao} href={contato}><WhatsAppIcon className={s.whatsapp} fill="currentColor" /> {formatarTelefoneBr(telefone)}<span className="sr-only">, WhatsApp da Superfrio</span></a>
          <a className={s.canal} href={"tel:+" + alternativo}><Phone size={16} aria-hidden="true" /> {formatarTelefoneBr(alternativo)}<span className="sr-only">, ligação para a Superfrio</span></a>
          <a className={s.canal} href={instagram}><InstagramIcon width={16} height={16} aria-hidden="true" /> @superfrio_ar2<span className="sr-only">, Instagram da Superfrio</span></a>
        </section>
      </div>
      <nav aria-label="Guia de empresas" className={`${s.largura} ${s.guia}`}><Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link><a href={correcao}>Solicitar correção ou retirada da ficha</a></nav>
    </article>
  );
}
