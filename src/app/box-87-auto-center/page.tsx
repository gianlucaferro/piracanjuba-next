import type { Metadata } from "next";
import Image from "next/image";
import { Saira } from "next/font/google";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Car, Clock, MapPin, Navigation, Tractor } from "lucide-react";
import BarraWhatsappEmpresa from "@/components/empresas/BarraWhatsappEmpresa";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

// O "87" do logo tem cantos quadrados e arredondados, de placa de corrida; a Saira segue esse
// desenho. O eixo de largura (wdth) dá os títulos estreitos sem carregar outra família.
const tipografia = Saira({
  subsets: ["latin"],
  axes: ["wdth"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--box-fonte",
});

// Fontes dos dados, conferidas em 2026-11-25: bio e posts do Instagram @box87.autocenter
// (endereço, serviços, fotos) e ficha do Google Maps (horário, coordenadas). O logo é a
// versão melhorada enviada pelo operador na mesma data, vetorizada em SVG.
const portal = "https://piracanjuba.ai";
const caminho = "/box-87-auto-center";
const url = portal + caminho;
const imagens = "/empresas/box-87-auto-center";
const nome = "Box 87 Auto Center";
const telefone = "5564992387080";
const instagram = "https://www.instagram.com/box87.autocenter/";
const mapa = "https://www.google.com/maps?cid=1025576862067934971";
const endereco = "Rua João Modesto, 12, Setor Norte";
const ID_BOTAO_TOPO = "whatsapp-topo";
const whatsapp = linkWhatsapp(telefone, "Olá, Box 87! Vi a página de vocês no Piracanjuba.ai e quero agendar um serviço. O veículo é:");
const whatsappAgro = linkWhatsapp(telefone, "Olá, Box 87! Vi a página de vocês no Piracanjuba.ai e preciso de serviço em máquina agrícola. A máquina é:");

const horarios = [
  { dias: "Segunda a sexta", horas: "7h às 18h" },
  { dias: "Sábado", horas: "7h às 12h" },
  { dias: "Domingo", horas: "Fechado" },
];

const servicosCarros = [
  "Elétrica automotiva: bateria, alternador e motor de partida",
  "Manutenção preventiva e corretiva",
  "Suspensão e troca da correia dentada",
  "Troca da junta de válvula e descarbonização da EGR",
  "Sistema de arrefecimento, como a válvula termostática",
  "Lavagem do motor",
  "Faróis e lâmpadas de LED",
  "Módulo para rebater os retrovisores e subir os vidros pelo alarme",
];

const servicosAgro = [
  "Parte elétrica de tratores e implementos",
  "Kits de iluminação para trator e graneleiro",
  "Manutenção de máquinas agrícolas",
  "Revisão elétrica em veículos de trabalho, como plataforma de guincho",
];

const fotos = [
  { src: "/teste-bateria.webp", largura: 720, altura: 540, legenda: "Teste de densidade da bateria", alt: "Densímetro medindo a carga de uma bateria automotiva na oficina" },
  { src: "/eletrica-trator.webp", largura: 504, altura: 378, legenda: "Revisão na parte elétrica de um trator", alt: "Chicote elétrico e motor de partida de um trator em manutenção" },
  { src: "/oficina-entrada.webp", largura: 680, altura: 470, legenda: "A entrada da oficina, na Rua João Modesto", alt: "Fachada de metal do Box 87 com o letreiro laranja e cinza e o galpão da oficina aberto" },
];

const perguntas = [
  {
    pergunta: "O Box 87 atende máquinas agrícolas?",
    resposta: "Sim. Além de carros e caminhonetes, a oficina cuida da parte elétrica e da manutenção de máquinas agrícolas, como tratores e implementos, e instala kits de iluminação. Para outra máquina, mande o modelo pelo WhatsApp e confirme o atendimento.",
  },
  {
    pergunta: "Qual é o horário de funcionamento?",
    resposta: "De segunda a sexta, das 7h às 18h, e aos sábados, das 7h às 12h. Aos domingos a oficina fica fechada.",
  },
  {
    pergunta: "Onde fica o Box 87 em Piracanjuba?",
    resposta: `Na ${endereco}, em Piracanjuba (GO), acima do Colégio Leo Lynce.`,
  },
  {
    pergunta: "Preciso marcar antes de levar o veículo?",
    resposta: "O mais prático é chamar no WhatsApp antes, informar o modelo, o ano e o serviço que você procura e combinar o melhor horário para levar o carro ou a máquina.",
  },
  {
    pergunta: "Vocês instalam iluminação de LED e acessórios?",
    resposta: "Sim. A oficina troca faróis e lâmpadas por LED e instala acessórios como o módulo que rebate os retrovisores e sobe os vidros pelo alarme.",
  },
];

const titulo = "Box 87 Auto Center em Piracanjuba | Elétrica e máquinas agrícolas";
const descricao = "Auto center na Rua João Modesto, 12, em Piracanjuba (GO). Elétrica e manutenção de carros, caminhonetes e máquinas agrícolas. Horário e WhatsApp.";
const compartilhamento = {
  url: portal + imagens + "/compartilhar.jpg", width: 1200, height: 630,
  alt: "Logo do Box 87 Auto Center e a fachada da oficina em Piracanjuba ao entardecer",
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
      mainEntity: { "@id": url + "#oficina" }, breadcrumb: { "@id": url + "#navegacao" },
    },
    {
      "@type": "AutoRepair", "@id": url + "#oficina", name: nome, alternateName: "BOX 87", url,
      mainEntityOfPage: { "@id": url + "#pagina" },
      description: "Auto center e auto elétrica com manutenção e parte elétrica de máquinas agrícolas em Piracanjuba (GO).",
      image: portal + imagens + "/fachada-entardecer.webp", logo: portal + imagens + "/box87-logo.svg",
      telephone: "+" + telefone, sameAs: [instagram], hasMap: mapa,
      address: {
        "@type": "PostalAddress", streetAddress: "Rua João Modesto, 12, Setor Norte",
        addressLocality: "Piracanjuba", addressRegion: "GO", postalCode: "75640-000", addressCountry: "BR",
      },
      geo: { "@type": "GeoCoordinates", latitude: -17.2960808, longitude: -49.0220483 },
      areaServed: { "@type": "City", name: "Piracanjuba", containedInPlace: { "@type": "State", name: "Goiás" } },
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "07:00", closes: "18:00" },
        { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "07:00", closes: "12:00" },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog", name: "Serviços",
        itemListElement: [...servicosCarros, ...servicosAgro].map((servico) => ({
          "@type": "Offer", itemOffered: { "@type": "Service", name: servico },
        })),
      },
    },
    {
      "@type": "FAQPage", "@id": url + "#perguntas", url,
      mainEntity: perguntas.map((p) => ({
        "@type": "Question", name: p.pergunta, acceptedAnswer: { "@type": "Answer", text: p.resposta },
      })),
    },
    {
      ...breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: nome, path: caminho }]),
      "@id": url + "#navegacao",
    },
  ],
};

function Faixa() {
  return <div className={s.faixa} aria-hidden="true" />;
}

export default function Box87AutoCenter() {
  return (
    <article className={tipografia.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />

      <header className={s.capa}>
        <div className={s.largura}>
          <div className={s.linhaGuia}>
            <Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
            <span><MapPin size={14} aria-hidden="true" /> Piracanjuba, Goiás</span>
          </div>
          <div className={s.capaGrade}>
            <div className={s.apresentacao}>
              {/* SVG vetorizado a partir do logo melhorado: nítido em qualquer tela, sem fundo. */}
              <Image src={imagens + "/box87-logo.svg"} width={1459} height={510} alt="BOX 87 Auto Center e Manutenção em Máquinas Agrícolas"
                className={s.logo} loading="eager" unoptimized />
              <h1>Auto center e elétrica de máquinas agrícolas em Piracanjuba</h1>
              <p className={s.lide}>O Box 87 cuida da parte elétrica e da manutenção de carros, caminhonetes, tratores e implementos, na {endereco}. Conte pelo WhatsApp o modelo e o que está acontecendo e combine o melhor horário para levar.</p>
              <div className={s.acoes}>
                <a id={ID_BOTAO_TOPO} href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Agendar pelo WhatsApp</a>
                <a href={mapa} className={s.atalho}><Navigation size={16} aria-hidden="true" /> Como chegar</a>
              </div>
              <p className={s.expediente}><Clock size={16} aria-hidden="true" /> Segunda a sexta, das 7h às 18h. Sábado, das 7h às 12h.</p>
            </div>
            <figure className={s.fachada}>
              <Image src={imagens + "/fachada-entardecer.webp"} width={1080} height={1080}
                alt="Galpão de metal do Box 87 com o letreiro BOX 87 e um carro estacionado na frente, ao entardecer"
                loading="eager" fetchPriority="high" sizes="(max-width: 900px) 89vw, 470px" />
              <figcaption><MapPin size={14} aria-hidden="true" /> {endereco}</figcaption>
            </figure>
          </div>
        </div>
      </header>

      <Faixa />

      <section id="servicos" aria-labelledby="titulo-servicos" className={s.servicos}>
        <div className={s.largura}>
          <div className={s.cabecalho}>
            <h2 id="titulo-servicos">Do carro da cidade ao trator da lavoura</h2>
            <p>Uma oficina só para a elétrica e a mecânica do dia a dia e para as máquinas que não podem parar na safra.</p>
          </div>
          <div className={s.frentes}>
            <section aria-labelledby="titulo-carros" className={s.frente}>
              <div className={s.frenteFoto}>
                <Image src={imagens + "/farois-led.webp"} width={720} height={540}
                  alt="Carro de capô aberto com faróis de LED acesos e a placa decorativa do Box 87"
                  sizes="(max-width: 900px) 89vw, 540px" />
              </div>
              <h3 id="titulo-carros"><Car size={26} strokeWidth={1.8} aria-hidden="true" /> Carros e caminhonetes</h3>
              <ul className={s.lista}>
                {servicosCarros.map((servico) => <li key={servico}>{servico}</li>)}
              </ul>
              <a href={whatsapp} className={s.linkFrente}>Pedir orçamento para o meu carro <ArrowUpRight size={16} aria-hidden="true" /></a>
            </section>
            <section aria-labelledby="titulo-agro" className={s.frente}>
              <div className={s.frenteFoto}>
                <Image src={imagens + "/trator-graneleiro.webp"} width={922} height={600}
                  alt="Trator verde e graneleiro estacionados em frente ao galpão do Box 87"
                  sizes="(max-width: 900px) 89vw, 540px" />
              </div>
              <h3 id="titulo-agro"><Tractor size={26} strokeWidth={1.8} aria-hidden="true" /> Máquinas agrícolas</h3>
              <ul className={s.lista}>
                {servicosAgro.map((servico) => <li key={servico}>{servico}</li>)}
              </ul>
              <a href={whatsappAgro} className={s.linkFrente}>Falar sobre uma máquina agrícola <ArrowUpRight size={16} aria-hidden="true" /></a>
            </section>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-oficina" className={s.oficina}>
        <div className={s.largura}>
          <h2 id="titulo-oficina">Na oficina</h2>
          <ul className={s.galeria}>
            {fotos.map((foto) => (
              <li key={foto.src}>
                <figure>
                  <Image src={imagens + foto.src} width={foto.largura} height={foto.altura} alt={foto.alt}
                    sizes="(max-width: 700px) 89vw, (max-width: 1150px) 30vw, 360px" />
                  <figcaption>{foto.legenda}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <p className={s.credito}>Fotos publicadas pelo Box 87 no Instagram.</p>
        </div>
      </section>

      <section id="perguntas" aria-labelledby="titulo-perguntas" className={s.perguntas}>
        <div className={s.largura}>
          <h2 id="titulo-perguntas">Perguntas frequentes</h2>
          <div className={s.listaPerguntas}>
            {perguntas.map(({ pergunta, resposta }) => (
              <details key={pergunta}>
                <summary>{pergunta}</summary>
                <p>{resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Faixa />

      <section id="contato" aria-labelledby="titulo-contato" className={s.contato}>
        <div className={s.largura}>
          <div className={s.contatoGrade}>
            <div className={s.convite}>
              <Image src={imagens + "/box87-marca.svg"} width={1459} height={315} alt="" className={s.marcaContato} unoptimized />
              <h2 id="titulo-contato">Como falar com o Box 87</h2>
              <p>Mande pelo WhatsApp o modelo, o ano e o serviço. A oficina responde e combina o dia para você levar o carro ou a máquina.</p>
              <a href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Agendar pelo WhatsApp</a>
            </div>
            <dl className={s.dados}>
              <div>
                <dt><WhatsAppIcon fill="currentColor" /> WhatsApp</dt>
                <dd><a className={s.telefone} href={whatsapp}>{formatarTelefoneBr(telefone)} <ArrowUpRight size={19} aria-hidden="true" /></a></dd>
              </div>
              <div>
                <dt><MapPin size={17} aria-hidden="true" /> Endereço</dt>
                <dd>
                  <p>{endereco}, Piracanjuba (GO), acima do Colégio Leo Lynce</p>
                  <a className={s.rede} href={mapa}>Abrir no mapa <ArrowUpRight size={15} aria-hidden="true" /></a>
                </dd>
              </div>
              <div>
                <dt><Clock size={17} aria-hidden="true" /> Horário</dt>
                <dd>
                  <table className={s.horarios}>
                    <caption className={s.somenteLeitor}>Horário de funcionamento</caption>
                    <tbody>
                      {horarios.map(({ dias, horas }) => <tr key={dias}><th scope="row">{dias}</th><td>{horas}</td></tr>)}
                    </tbody>
                  </table>
                </dd>
              </div>
              <div>
                <dt><InstagramIcon /> Instagram</dt>
                <dd><a className={s.rede} href={instagram}>@box87.autocenter <ArrowUpRight size={15} aria-hidden="true" /></a></dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <BarraWhatsappEmpresa alvoId={ID_BOTAO_TOPO}>
        <a href={whatsapp} className={s.botaoBarra}><WhatsAppIcon fill="currentColor" /> Agendar pelo WhatsApp</a>
      </BarraWhatsappEmpresa>
      {/* A barra nasce escondida (sem piscar na carga) e quem está sem JavaScript a recebe por esta regra. */}
      <noscript>
        <style>{"[data-barra-empresa]{translate:none;transform:none}"}</style>
      </noscript>
    </article>
  );
}
