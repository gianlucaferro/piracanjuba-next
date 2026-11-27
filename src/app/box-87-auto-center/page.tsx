import type { Metadata } from "next";
import Image from "next/image";
import { Saira } from "next/font/google";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Car, Clock, MapPin, Navigation, Tractor, Zap } from "lucide-react";
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
  // Só a face normal: o itálico dobrava o preload (cerca de 215 KB). O h1 usa o oblíquo sintetizado.
  style: ["normal"],
  display: "swap",
  variable: "--box-fonte",
});

// Serviços, endereço, horário e novas fotos fornecidos pela oficina em 2026-11-26.
// Serviços documentados também no Instagram @box87.autocenter e localização no Google Maps.
const portal = "https://piracanjuba.ai";
const caminho = "/box-87-auto-center";
const url = portal + caminho;
const imagens = "/empresas/box-87-auto-center";
const tamanhosFachada = "(max-width: 700px) 89.5vw, (max-width: 900px) 88vw, 470px";
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

const gruposServicos = [
  {
    id: "mecanica", titulo: "Mecânica de carros",
    icone: Car,
    foto: "/farois-led.webp", largura: 720, altura: 540,
    alt: "Carro de capô aberto com os faróis de LED acesos na oficina",
    servicos: [
      "Mecânica geral, revisões preventivas e manutenção corretiva",
      "Diagnóstico e reparo de falhas de funcionamento do motor",
      "Freios, suspensão e troca da correia dentada",
      "Troca de óleo e filtros",
      "Troca da junta de válvula e descarbonização da EGR",
      "Válvula termostática do sistema de arrefecimento",
      "Lavagem do motor",
    ],
    contato: whatsapp, chamada: "Agendar revisão do carro",
  },
  {
    id: "auto-eletrica", titulo: "Auto elétrica",
    icone: Zap,
    foto: "/scanner-automotivo.webp", largura: 1280, altura: 960,
    alt: "Scanner automotivo em frente ao volante, com os dados do diagnóstico na tela",
    servicos: [
      "revisão e manutenção total em elétrica linha leve e pesada",
      "Diagnóstico elétrico e eletrônico de carros e caminhões",
      "Teste de bateria e diagnóstico do alternador e do motor de partida",
      "Manutenção de vidros elétricos",
      "Instalação de kits de lâmpadas LED nos faróis",
      "Instalação de módulo para rebater retrovisores e fechar vidros pelo alarme",
      "Revisão elétrica de caminhão com plataforma de guincho",
    ],
    contato: whatsapp, chamada: "Consultar a auto elétrica",
  },
  {
    id: "maquinas-agricolas", titulo: "Máquinas agrícolas",
    icone: Tractor,
    foto: "/colheitadeira-no-campo.webp", largura: 1440, altura: 960,
    alt: "Colheitadeira verde ao lado do veículo do Box 87 na lavoura",
    servicos: [
      "Diagnóstico eletrônico de máquinas agrícolas",
      "Manutenção de máquinas agrícolas e revisão da parte elétrica de tratores e implementos",
      "Revisão e recuperação de chicotes, placas eletrônicas, módulos e sensores",
      "Instalação de kits de iluminação em tratores e graneleiros",
    ],
    contato: whatsappAgro, chamada: "Consultar sobre uma máquina",
  },
];

const fotos = [
  { src: "/bancada-eletronica.webp", largura: 960, altura: 1280, legenda: "Inspeção de placa eletrônica na bancada", alt: "Microscópio digital sobre uma placa eletrônica, com os circuitos ampliados na tela" },
  { src: "/caminhao-no-campo.webp", largura: 960, altura: 720, legenda: "Caminhão no campo", alt: "Caminhão com o capô aberto e carro do Box 87 em uma estrada de terra" },
  { src: "/pulverizador-no-campo.webp", largura: 1080, altura: 810, legenda: "Pulverizador agrícola", alt: "Pulverizador com as barras recolhidas ao lado do veículo da oficina" },
  { src: "/teste-bateria.webp", largura: 720, altura: 540, legenda: "Teste de densidade da bateria", alt: "Densímetro medindo a densidade do eletrólito de uma bateria automotiva" },
  { src: "/eletrica-trator.webp", largura: 504, altura: 378, legenda: "Revisão elétrica de trator", alt: "Chicote elétrico e motor de partida de um trator em manutenção" },
];

const perguntas = [
  {
    pergunta: "O Box 87 atende máquinas agrícolas?",
    resposta: "Sim. A oficina faz diagnóstico eletrônico e manutenção elétrica em máquinas agrícolas. Entre os serviços estão a recuperação de chicotes, placas, módulos e sensores e a instalação de iluminação em tratores e graneleiros.",
  },
  {
    pergunta: "O Box 87 faz alinhamento, balanceamento ou troca de pneus?",
    resposta: "A oficina não oferece alinhamento, balanceamento nem troca de pneus. Para problemas na suspensão ou nos freios, você pode agendar uma avaliação.",
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
    resposta: "Sim. A oficina instala kits de lâmpadas LED nos faróis e acessórios como o módulo que rebate os retrovisores e sobe os vidros pelo alarme.",
  },
];

const titulo = "Box 87 Auto Center | Oficina mecânica e auto elétrica em Piracanjuba";
const descricao = "Oficina mecânica em Piracanjuba com revisão de carros, auto elétrica de carros e caminhões e diagnóstico eletrônico de máquinas agrícolas. Agende pelo WhatsApp.";
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
      "@type": "AutoRepair", "@id": url + "#oficina", name: nome, alternateName: ["BOX 87", "Box 87 Auto Elétrica", "BOX 87 Auto Elétrica e Acessórios"], url,
      mainEntityOfPage: { "@id": url + "#pagina" },
      description: descricao,
      image: portal + imagens + "/fachada-box87.webp", logo: portal + imagens + "/box87-logo.svg",
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
        itemListElement: gruposServicos.map(({ titulo, servicos }) => ({
          "@type": "OfferCatalog", name: titulo,
          itemListElement: servicos.map((servico) => ({
            "@type": "Offer", itemOffered: { "@type": "Service", name: servico },
          })),
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
                className={s.logo} loading="eager" fetchPriority="high" unoptimized />
              <h1>Oficina mecânica e auto elétrica em Piracanjuba</h1>
              <p className={s.lide}>O Box 87 faz revisões e reparos mecânicos em carros, atende a parte elétrica de carros e caminhões e cuida da eletrônica de máquinas agrícolas.</p>
              <nav className={s.atalhosServicos} aria-label="Especialidades da oficina">
                {gruposServicos.map(({ id, titulo }) => <a key={id} href={`#${id}`}>{titulo}</a>)}
              </nav>
              <div className={s.acoes}>
                <a id={ID_BOTAO_TOPO} href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Agendar pelo WhatsApp</a>
                <a href={mapa} className={s.atalho}><Navigation size={16} aria-hidden="true" /> Como chegar</a>
              </div>
              <p className={s.expediente}><Clock size={16} aria-hidden="true" /> Segunda a sexta, das 7h às 18h. Sábado, das 7h às 12h.</p>
            </div>
            <figure className={s.fachada}>
              <picture>
                <source type="image/avif" sizes={tamanhosFachada}
                  srcSet={`${imagens}/fachada-box87-400.avif 400w, ${imagens}/fachada-box87.avif 560w`} />
                <Image src={imagens + "/fachada-box87.webp"} width={560} height={600}
                  alt="Fachada com o letreiro laranja e prata do Box 87 e uma caminhonete na entrada da oficina"
                  loading="eager" fetchPriority="high" sizes={tamanhosFachada} />
              </picture>
              <figcaption><MapPin size={14} aria-hidden="true" /> {endereco}</figcaption>
            </figure>
          </div>
        </div>
      </header>

      <Faixa />

      <section id="servicos" aria-labelledby="titulo-servicos" className={s.servicos}>
        <div className={s.largura}>
          <div className={s.cabecalho}>
            <h2 id="titulo-servicos">Serviços da oficina</h2>
            <p>A equipe explica o diagnóstico e o orçamento. Você pode acompanhar a avaliação e conferir as peças substituídas na retirada do veículo.</p>
          </div>
          <div className={s.frentes}>
            {gruposServicos.map(({ id, titulo, icone: Icone, foto, largura, altura, alt, servicos, contato, chamada }) => (
              <section key={id} aria-labelledby={id} className={s.frente}>
                <div className={s.frenteFoto}>
                  <Image src={imagens + foto} width={largura} height={altura} alt={alt}
                    sizes="(max-width: 900px) 89vw, (max-width: 1260px) 29vw, 340px" />
                </div>
                <h3 id={id} tabIndex={-1}><Icone size={26} strokeWidth={1.8} aria-hidden="true" /> {titulo}</h3>
                <ul className={s.lista}>
                  {servicos.map((servico) => <li key={servico}>{servico}</li>)}
                </ul>
                <a href={contato} className={s.linkFrente}>{chamada} <ArrowUpRight size={16} aria-hidden="true" /></a>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-oficina" className={s.oficina}>
        <div className={s.largura}>
          <h2 id="titulo-oficina">Na oficina e no campo</h2>
          <ul className={s.galeria}>
            {fotos.map((foto) => (
              <li key={foto.src}>
                <figure>
                  <Image src={imagens + foto.src} width={foto.largura} height={foto.altura} alt={foto.alt}
                    sizes="(max-width: 700px) 89vw, (max-width: 900px) 44vw, (max-width: 1260px) 29vw, 360px" />
                  <figcaption>{foto.legenda}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <p className={s.credito}>Fotos do Box 87 Auto Center.</p>
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
