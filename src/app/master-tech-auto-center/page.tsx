import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Zilla_Slab } from "next/font/google";
import { ArrowLeft, Clock, MapPin, Navigation } from "lucide-react";
import BarraWhatsappEmpresa from "@/components/empresas/BarraWhatsappEmpresa";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

// A faixa do logo usa uma serifada egípcia pesada; a Zilla Slab segue esse desenho nos títulos.
const tipografia = Zilla_Slab({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--mt-slab",
});

const portal = "https://piracanjuba.ai";
const caminho = "/master-tech-auto-center";
const url = portal + caminho;
const imagens = "/empresas/master-tech-auto-center";
const marca = "Master Tech Auto Center";
const telefone = "5564993450101";
const instagram = "https://www.instagram.com/mastertech.autocenter/";
const mapa = "https://www.google.com/maps?cid=3287953821947155830";
const rua = "Rua Lindolfo França, 490";
const cep = "75640-126";
const ID_BOTAO_TOPO = "whatsapp-topo";
const conversa = linkWhatsapp(telefone, "Olá, Master Tech! Vi a oficina no Piracanjuba.ai e gostaria de agendar um horário para o meu carro.");
const suporte = linkWhatsapp(WHATSAPP_COMERCIAL, "Olá! Sou responsável pela Master Tech Auto Center e gostaria de solicitar um ajuste ou a retirada da ficha " + url);

// Serviços, horário e equipe conferidos em 2026-11-25 no Instagram da oficina, no Perfil da
// Empresa no Google, no site da oficina e na faixa da fachada. Preços não entram: a única
// tabela pública (site de 2021) está desatualizada.
const servicos = [
  {
    nome: "Diagnóstico com scanner",
    resumo: "Antes de trocar peças, a equipe usa scanner e aparelhos de teste para achar a falha. Para o motor, faz também o teste de vazamento de compressão, que aponta problemas nas válvulas e na junta do cabeçote.",
    itens: ["Scanner automotivo", "Testes dos sistemas do veículo", "Teste de vazamento de compressão"],
    mensagem: "Olá, Master Tech! Gostaria de agendar um diagnóstico com scanner. Vou mandar o modelo do carro e o que ele está fazendo.",
  },
  {
    nome: "Motor e injeção eletrônica",
    resumo: "Reparos no motor, da regulagem à montagem completa do cabeçote, e manutenção da injeção eletrônica.",
    itens: ["Retífica de motores", "Montagem e desmontagem de cabeçote", "Regulagem eletrônica", "Troca de correia dentada", "Limpeza de velas"],
    mensagem: "Olá, Master Tech! Gostaria de consultar um serviço no motor do meu carro.",
  },
  {
    nome: "Câmbio e embreagem",
    resumo: "Atendimento em câmbio manual e automático. No automático, a oficina faz a troca do óleo do câmbio com equipamento de diálise.",
    itens: ["Câmbio manual", "Câmbio automático", "Troca de óleo do câmbio automático", "Embreagem"],
    mensagem: "Olá, Master Tech! Gostaria de consultar um serviço no câmbio do meu carro.",
  },
  {
    nome: "Suspensão, freios e alinhamento 3D",
    resumo: "Carro puxando para um lado ou com barulho na suspensão? O alinhamento 3D é feito pelo especialista em suspensão da equipe.",
    itens: ["Alinhamento 3D", "Suspensão", "Pastilhas de freio", "Juntas homocinéticas", "Terminais de direção"],
    mensagem: "Olá, Master Tech! Gostaria de agendar um alinhamento 3D ou uma revisão da suspensão.",
  },
  {
    nome: "Troca de óleo e revisão",
    resumo: "Óleo em diferentes graus de viscosidade e revisão preventiva antes de viagem, com checagem de freios, pneus, suspensão e fluidos.",
    itens: ["Troca de óleo", "Revisão preventiva", "Freios, pneus, suspensão e fluidos"],
    mensagem: "Olá, Master Tech! Gostaria de agendar uma troca de óleo ou uma revisão preventiva.",
  },
  {
    nome: "Escapamento e catalisador",
    resumo: "Reparo e troca do escapamento e troca do catalisador.",
    itens: ["Escapamento", "Catalisador"],
    mensagem: "Olá, Master Tech! Gostaria de consultar um serviço no escapamento ou no catalisador do meu carro.",
  },
  {
    nome: "Revitalização de faróis",
    resumo: "Faróis amarelados voltam a ficar transparentes com polimento e vapor de polímero. O teste de iluminação está incluso no serviço.",
    itens: ["Polimento de faróis", "Vapor de polímero", "Teste de iluminação"],
    mensagem: "Olá, Master Tech! Gostaria de consultar a revitalização dos faróis do meu carro.",
  },
];

const passos = [
  { titulo: "Conte o que está acontecendo", texto: "Mande pelo WhatsApp o modelo e o ano do carro e descreva o problema: barulho, luz acesa no painel, carro puxando para um lado." },
  { titulo: "Combine o horário", texto: "A equipe combina com você o dia e a hora para levar o carro à oficina, no Centro de Piracanjuba." },
  { titulo: "Diagnóstico antes da troca", texto: "Com scanner e aparelhos de teste, a oficina identifica a falha antes de trocar qualquer peça." },
];

const fotos = [
  { src: "oficina.webp", legenda: "Área de serviço com os elevadores", alt: "Interior da Master Tech Auto Center, com paredes laranja e pretas, elevadores vermelhos e uma picape branca com o capô aberto" },
  { src: "espera.webp", legenda: "Espaço de espera dos clientes", alt: "Espaço de espera com sofás de couro preto, mesas de madeira, televisão e parede laranja dentro do galpão da oficina" },
  { src: "sala.webp", legenda: "Recepção, montada dentro do galpão", alt: "Sala da recepção com paredes laranja e pretas pintadas com linhas brancas e um sofá preto na entrada" },
  { src: "recepcao.webp", legenda: "Mesa de atendimento", alt: "Mesa de atendimento com notebook, cadeiras pretas e parede branca com desenhos" },
];

const equipe = [
  { nome: "Amanda Rezende", papel: "Proprietária e fundadora. Cuida da gestão da oficina e é especialista em revitalização de faróis." },
  { nome: "Igor Ferreira", papel: "Manutenção preventiva e corretiva, com mais de 12 anos de experiência no setor automotivo." },
  { nome: "Reginaldo Gomes", papel: "Especialista em suspensão e alinhamento 3D, há mais de 10 anos no setor automotivo." },
  { nome: "Marcos Paulo", papel: "Especialista em sistemas de lubrificação automotiva." },
];

const perguntas = [
  {
    pergunta: "Onde fica a Master Tech Auto Center?",
    resposta: `Na ${rua}, no Centro de Piracanjuba (GO), CEP ${cep}.`,
  },
  {
    pergunta: "Qual é o horário de funcionamento da oficina?",
    resposta: "De segunda a sexta, das 8h às 12h30 e das 14h às 18h. Aos sábados e domingos a oficina fica fechada, segundo o perfil dela no Google. Antes de ir, confirme pelo WhatsApp.",
  },
  {
    pergunta: "A Master Tech faz alinhamento 3D?",
    resposta: "Sim. O alinhamento 3D é feito pelo especialista em suspensão Reginaldo Gomes.",
  },
  {
    pergunta: "A oficina troca o óleo do câmbio automático?",
    resposta: "Sim. A troca do óleo do câmbio automático é feita com equipamento de diálise. A oficina também atende câmbio manual e embreagem.",
  },
  {
    pergunta: "Como pedir um orçamento?",
    resposta: `Pelo WhatsApp ${formatarTelefoneBr(telefone)}. Mande o modelo e o ano do carro e conte o que ele está fazendo.`,
  },
  {
    pergunta: "Quais cartões a oficina aceita?",
    resposta: "A faixa da fachada indica cartões Visa, Mastercard e Elo.",
  },
  {
    pergunta: "Há quanto tempo a oficina funciona?",
    resposta: "A Master Tech Auto Center completou 5 anos em abril de 2026.",
  },
];

const titulo = "Master Tech Auto Center | Oficina mecânica em Piracanjuba";
const descricao = "Oficina no Centro de Piracanjuba: diagnóstico com scanner, motor, câmbio automático, suspensão e alinhamento 3D. Fale com a Master Tech pelo WhatsApp.";
const compartilhamento = {
  url: portal + imagens + "/compartilhar.jpg", width: 1200, height: 630,
  alt: "Logo da Master Tech Auto Center e fachada da oficina no Centro de Piracanjuba",
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
      "@type": "AutoRepair", "@id": url + "#oficina", name: marca, url, description: descricao,
      mainEntityOfPage: { "@id": url + "#pagina" },
      logo: portal + imagens + "/logo-512.png",
      image: [portal + imagens + "/fachada.webp", ...fotos.map((f) => portal + imagens + "/" + f.src)],
      telephone: "+" + telefone, sameAs: [instagram], hasMap: mapa, foundingDate: "2021",
      founder: { "@type": "Person", name: "Amanda Rezende" },
      paymentAccepted: "Cartões Visa, Mastercard e Elo",
      address: {
        "@type": "PostalAddress", streetAddress: rua, addressLocality: "Piracanjuba",
        addressRegion: "GO", postalCode: cep, addressCountry: "BR",
      },
      geo: { "@type": "GeoCoordinates", latitude: -17.3058776, longitude: -49.0257318 },
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "12:30" },
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "14:00", closes: "18:00" },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog", name: "Serviços da oficina",
        itemListElement: servicos.map((servico) => ({
          "@type": "Offer", itemOffered: { "@type": "Service", name: servico.nome, description: servico.resumo },
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
      ...breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: marca, path: caminho }]),
      "@id": url + "#navegacao",
    },
  ],
};

export default function MasterTechAutoCenter() {
  return (
    <article className={tipografia.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />

      {/* A abertura repete a parede da oficina: laranja em cima, faixa preta embaixo. */}
      <header className={s.capa}>
        <div className={s.parede}>
          <div className={s.largura}>
            <div className={s.barra}>
              <Link href="/zap-pba" className={s.voltar}><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
              <nav className={s.navegacao} aria-label="Navegação da oficina">
                <a href="#servicos">Serviços</a>
                <a className={s.linkFotos} href="#oficina">Fotos</a>
                <a href="#visita">Como chegar</a>
                <a href={instagram} aria-label="Instagram da Master Tech Auto Center"><InstagramIcon width={20} height={20} /></a>
              </nav>
            </div>
            <div className={s.abertura}>
              <div className={s.selo}>
                <Image src={imagens + "/logo.svg"} width={1254} height={1254} loading="eager"
                  sizes="(max-width: 760px) 190px, 330px" alt="Logo da Master Tech Auto Center" />
              </div>
              <div className={s.chamada}>
                <h1>{marca}</h1>
                <p className={s.subtitulo}>Oficina mecânica no Centro de Piracanjuba</p>
                <p className={s.lide}>Diagnóstico com scanner, motor, câmbio manual e automático, suspensão e alinhamento 3D. Conte pelo WhatsApp o que o carro está fazendo e combine o horário.</p>
                <div className={s.acoes}>
                  <a id={ID_BOTAO_TOPO} className={s.botao} href={conversa}><WhatsAppIcon fill="currentColor" /> Falar pelo WhatsApp</a>
                  <a className={s.rotaCapa} href={mapa}><Navigation size={16} aria-hidden="true" /> Como chegar</a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={s.faixaPreta}>
          <div className={s.largura + " " + s.faixaGrade}>
            <dl className={s.resumo}>
              <div><dt><MapPin size={16} aria-hidden="true" /> Endereço</dt><dd>{rua}, Centro</dd></div>
              <div><dt><Clock size={16} aria-hidden="true" /> Segunda a sexta</dt><dd>8h às 12h30 e 14h às 18h</dd></div>
              <div><dt><WhatsAppIcon fill="currentColor" /> WhatsApp</dt><dd><a href={conversa}>{formatarTelefoneBr(telefone)}</a></dd></div>
            </dl>
            <figure className={s.fachada}>
              <Image src={imagens + "/fachada.webp"} width={1600} height={1200} loading="eager" fetchPriority="high"
                sizes="(max-width: 760px) 92vw, (max-width: 1320px) 54vw, 690px"
                alt="Fachada da Master Tech Auto Center, com o letreiro laranja da oficina, o portão de entrada dos carros e um carro branco estacionado na rua de paralelepípedo" />
            </figure>
          </div>
        </div>
      </header>

      <section id="servicos" className={s.servicos} aria-labelledby="titulo-servicos">
        <div className={s.largura}>
          <div className={s.cabecalho}>
            <h2 id="titulo-servicos">Serviços da oficina</h2>
            <p>Consulte cada serviço pelo WhatsApp. A mensagem já vai com o assunto escrito.</p>
          </div>
          <ul className={s.lista}>
            {servicos.map(({ nome, resumo, itens, mensagem }) => (
              <li key={nome}>
                <h3>{nome}</h3>
                <div className={s.detalhe}>
                  <p>{resumo}</p>
                  <ul className={s.itens}>
                    {itens.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <a className={s.consulta} href={linkWhatsapp(telefone, mensagem)}>
                    <WhatsAppIcon fill="currentColor" /> Consultar {nome.toLowerCase().replace("3d", "3D")}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={s.atendimento} aria-labelledby="titulo-atendimento">
        <svg className={s.trincas} viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <path d="M0 64 L182 0 M182 0 L236 128 L0 212 M236 128 L410 96 L468 0 M410 96 L452 246 L236 128 M452 246 L640 172 L700 0 M640 172 L812 238 L868 52 L700 0 M868 52 L1046 0 M868 52 L1012 170 L1200 120 M1012 170 L812 238 M1012 170 L1094 330 L1200 286 M812 238 L878 420 M812 238 L604 356 L452 246 M604 356 L640 420 M452 246 L300 380 L0 330 M300 380 L340 420 M236 128 L118 300 L0 212 M118 300 L300 380 M1094 330 L1040 420 M1094 330 L878 420" />
        </svg>
        <div className={s.largura}>
          <h2 id="titulo-atendimento">Como pedir atendimento</h2>
          <ol className={s.passos}>
            {passos.map(({ titulo: passo, texto }) => (
              <li key={passo}><h3>{passo}</h3><p>{texto}</p></li>
            ))}
          </ol>
          <a className={s.botaoClaro} href={conversa}><WhatsAppIcon fill="currentColor" /> Mandar mensagem para a oficina</a>
        </div>
      </section>

      <section id="oficina" className={s.galeria} aria-labelledby="titulo-oficina">
        <div className={s.largura}>
          <div className={s.cabecalho}>
            <h2 id="titulo-oficina">A oficina por dentro</h2>
            <p>Fotos publicadas pela Master Tech no perfil da empresa no Google, em setembro de 2025.</p>
          </div>
          <div className={s.fotos}>
            {fotos.map(({ src, legenda, alt }) => (
              <figure key={src}>
                <Image src={imagens + "/" + src} width={1080} height={1350} alt={alt}
                  sizes="(max-width: 760px) 92vw, (max-width: 1100px) 46vw, 300px" />
                <figcaption>{legenda}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="equipe" className={s.equipe} aria-labelledby="titulo-equipe">
        <div className={s.largura}>
          <div className={s.cabecalho}>
            <h2 id="titulo-equipe">Quem atende</h2>
            <p>A equipe apresentada pela oficina no Instagram.</p>
          </div>
          <dl className={s.pessoas}>
            {equipe.map(({ nome, papel }) => (
              <div key={nome}><dt>{nome}</dt><dd>{papel}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section id="perguntas" className={s.perguntas} aria-labelledby="titulo-perguntas">
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

      <section id="visita" className={s.visita} aria-labelledby="titulo-visita">
        <div className={s.largura}>
          <h2 id="titulo-visita">Como chegar à Master Tech</h2>
          <div className={s.visitaGrade}>
            <div className={s.dados}>
              <div>
                <h3>Endereço</h3>
                <address>{rua}<br />Centro, Piracanjuba (GO)<br />CEP {cep}</address>
                <a className={s.rota} href={mapa}><Navigation size={16} aria-hidden="true" /> Abrir rota no Google Maps</a>
              </div>
              <div>
                <h3>Horário</h3>
                <dl className={s.horario}>
                  <div><dt>Segunda a sexta</dt><dd>8h às 12h30<br />14h às 18h</dd></div>
                  <div><dt>Sábado e domingo</dt><dd>Fechado</dd></div>
                </dl>
                <p className={s.nota}>Horário do perfil da oficina no Google. Confirme pelo WhatsApp antes de ir.</p>
              </div>
              <div>
                <h3>Contato</h3>
                <a className={s.contato} href={conversa} aria-label={`WhatsApp da oficina, ${formatarTelefoneBr(telefone)}`}><WhatsAppIcon fill="currentColor" /> {formatarTelefoneBr(telefone)}</a>
                <a className={s.contato} href={instagram} aria-label="Instagram da oficina, @mastertech.autocenter"><InstagramIcon width={17} height={17} /> @mastertech.autocenter</a>
              </div>
            </div>
            <figure className={s.mapa}>
              <a href={mapa} aria-label="Abrir a localização da Master Tech Auto Center no Google Maps">
                <Image src={imagens + "/mapa.webp"} width={1000} height={520} sizes="(max-width: 860px) 92vw, 560px"
                  alt="Mapa do Centro de Piracanjuba com o marcador da oficina na Rua Lindolfo França" />
              </a>
              <figcaption>
                <span>Marcador na {rua}.</span>
                <a href="https://www.openstreetmap.org/copyright">© colaboradores do OpenStreetMap</a>
              </figcaption>
            </figure>
          </div>
          <div className={s.guia}>
            <Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
            <a href={suporte}>Solicitar correção ou retirada da ficha</a>
          </div>
        </div>
      </section>

      <BarraWhatsappEmpresa alvoId={ID_BOTAO_TOPO}>
        <a href={conversa} className={s.botaoBarra}><WhatsAppIcon fill="currentColor" /> Falar pelo WhatsApp</a>
      </BarraWhatsappEmpresa>
      {/* A barra nasce escondida (sem piscar na carga) e quem está sem JavaScript a recebe por esta regra. */}
      <noscript>
        <style>{"[data-barra-empresa]{translate:none;transform:none}"}</style>
      </noscript>
    </article>
  );
}
