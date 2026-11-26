import type { ComponentType, ReactNode } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Sofia_Sans_Condensed } from "next/font/google";
import {
  Accessibility, ArrowLeft, ArrowUpRight, CalendarCheck, Clock, CreditCard, MapPin, Phone, SquareParking,
} from "lucide-react";
import BarraWhatsappEmpresa from "@/components/empresas/BarraWhatsappEmpresa";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

// O "B10" do logo é um grotesco pesado e inclinado; a Sofia Sans Condensed em itálico
// faz os títulos com o mesmo peso e a mesma inclinação, sem copiar o desenho do logo.
const letreiro = Sofia_Sans_Condensed({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--b10-letreiro",
});

const portal = "https://piracanjuba.ai";
const caminho = "/b10-auto-center";
const url = portal + caminho;
const imagens = "/empresas/b10-auto-center";
const marca = "B10 Auto Center";
const instagram = "https://www.instagram.com/b10autocenter/";

// Telefones da bio do Instagram e do letreiro da fachada, conferidos em 2026-11-25.
// O link de WhatsApp da ficha do Google aponta para o número de agendamento.
const telefoneAgendamento = "5564999500087";
const telefonePecas = "5564999505740";
const telefoneFixo = "556434052595";

// Endereço, coordenadas e horário da ficha do Google Maps, conferidos em 2026-11-25.
const mapa = "https://www.google.com/maps?cid=15575707516300427181";
const rua = "Rua Prof. Percival Rebelo, Qd. C, Lt. 8";
const cep = "75640-092";
const geo = { latitude: -17.3003629, longitude: -49.0202994 };

const ID_BOTAO_TOPO = "whatsapp-topo";
const agendar = linkWhatsapp(telefoneAgendamento, "Olá, B10 Auto Center! Vi a oficina no Piracanjuba.ai e quero agendar um serviço.");
const pedirPeca = linkWhatsapp(telefonePecas, "Olá, B10 Auto Center! Vi a loja no Piracanjuba.ai e quero consultar uma peça. Meu carro é:");
const suporte = linkWhatsapp(WHATSAPP_COMERCIAL, "Olá! Sou responsável pelo B10 Auto Center e gostaria de solicitar um ajuste ou a retirada da página " + url);

type Servico = {
  nome: string;
  texto: string;
  mensagem: string;
  /** Serviço divulgado só em posts antigos: a página pede para confirmar antes. */
  confirmar?: boolean;
};

const servicos: Servico[] = [
  {
    nome: "Injeção eletrônica e diagnóstico",
    texto: "Diagnóstico e reparo do sistema de injeção eletrônica. Em abril de 2025 a equipe foi à Automec, feira de peças e ferramentas automotivas, em busca de parceiros e de novidades em diagnóstico.",
    mensagem: "Olá, B10 Auto Center! Quero agendar um diagnóstico da injeção eletrônica.",
  },
  {
    nome: "Suspensão",
    texto: "Revisão e troca de peças da suspensão. Conte pelo WhatsApp o barulho ou o sintoma do carro e agende a avaliação.",
    mensagem: "Olá, B10 Auto Center! Quero agendar uma avaliação da suspensão.",
  },
  {
    nome: "Troca de óleo",
    texto: "Troca do óleo do motor com óleos originais, que também ficam à venda no balcão de peças.",
    mensagem: "Olá, B10 Auto Center! Quero agendar uma troca de óleo.",
  },
  {
    nome: "Câmbio automático",
    texto: "Troca do óleo do câmbio automático com equipamento próprio para o serviço. O B10 é oficina associada da rede Câmbio Automático do Brasil (CAB).",
    mensagem: "Olá, B10 Auto Center! Quero agendar a troca de óleo do câmbio automático.",
  },
  {
    nome: "Engates para reboque",
    texto: "Venda e instalação de engates, em parceria com a Engates Fortaleza, anunciada em julho de 2026.",
    mensagem: "Olá, B10 Auto Center! Quero um orçamento de engate com instalação.",
  },
  {
    nome: "Airbag e turbinas",
    texto: "A oficina já divulgou o reparo de airbag, com módulos originais novos e limpeza de arquivo após colisão, e o serviço em turbinas de veículos leves e pesados. Confirme pelo WhatsApp antes de levar o carro.",
    mensagem: "Olá, B10 Auto Center! Vocês fazem serviço de airbag e de turbina?",
    confirmar: true,
  },
];

type Icone = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;

// Atributos da ficha do Google Maps (aba Sobre), conferidos em 2026-11-25.
const praticos: { titulo: string; texto: ReactNode; Icone: Icone }[] = [
  { titulo: "Agendamento", texto: <>A loja recomenda marcar horário. O agendamento é pelo WhatsApp <span className={s.semQuebra}>{formatarTelefoneBr(telefoneAgendamento)}</span>.</>, Icone: CalendarCheck },
  { titulo: "Estacionamento", texto: "Há estacionamento no local, na frente da loja.", Icone: SquareParking },
  { titulo: "Pagamento", texto: "Cartão de crédito, cartão de débito e pagamento por aproximação.", Icone: CreditCard },
  { titulo: "Acessibilidade", texto: "Entrada, banheiro, assento e vaga de estacionamento acessíveis para cadeira de rodas.", Icone: Accessibility },
];

const fotos = [
  {
    src: imagens + "/oficina.webp", width: 1600, height: 900, classe: s.fotoOficina,
    sizes: "(max-width: 760px) 92vw, (max-width: 1320px) 60vw, 760px",
    legenda: "Área da oficina, com os elevadores automotivos",
    alt: "Interior da oficina do B10 Auto Center com piso cinza brilhante, carros e caminhonetes em atendimento e um carro erguido num elevador vermelho",
  },
  {
    src: imagens + "/sala-de-espera.webp", width: 960, height: 1280, classe: s.fotoSala,
    sizes: "(max-width: 760px) 92vw, (max-width: 1320px) 32vw, 400px",
    legenda: "Sala de espera para os clientes",
    alt: "Sala de espera do B10 Auto Center com sofás bege, mesa de centro, painel de madeira iluminado e ar-condicionado",
  },
  {
    src: imagens + "/certificado-cambio-automatico.webp", width: 900, height: 1125, classe: s.fotoCertificado,
    sizes: "(max-width: 760px) 92vw, (max-width: 1320px) 32vw, 400px",
    legenda: "Certificado de oficina associada da Câmbio Automático do Brasil",
    alt: "Certificado de reconhecimento da Câmbio Automático do Brasil em nome do B10 Auto Center como oficina associada CAB",
  },
  {
    src: imagens + "/vista-aerea.webp", width: 1600, height: 900, classe: s.fotoAerea,
    sizes: "(max-width: 760px) 92vw, (max-width: 1320px) 60vw, 760px",
    legenda: "A loja vista do alto, no Centro de Piracanjuba",
    alt: "Vista aérea do B10 Auto Center, com o galpão de telhado metálico, a fachada verde e os carros estacionados na frente",
  },
];

const perguntas = [
  {
    pergunta: "Onde fica o B10 Auto Center em Piracanjuba?",
    resposta: `Na ${rua}, no Centro de Piracanjuba (GO), CEP ${cep}.`,
  },
  {
    pergunta: "Qual é o horário de funcionamento?",
    resposta: "De segunda a sexta, das 7h às 18h. Aos sábados e domingos a loja fica fechada.",
  },
  {
    pergunta: "Como agendar um serviço na oficina?",
    resposta: `Pelo WhatsApp de agendamento, ${formatarTelefoneBr(telefoneAgendamento)}, ou pelo telefone fixo ${formatarTelefoneBr(telefoneFixo)}.`,
  },
  {
    pergunta: "O B10 vende peças?",
    resposta: `Sim. O balcão de auto peças fica no mesmo endereço da oficina e atende pelo WhatsApp ${formatarTelefoneBr(telefonePecas)}.`,
  },
  {
    pergunta: "O B10 troca o óleo de câmbio automático?",
    resposta: "Sim. A troca é feita com equipamento próprio para o serviço, e o B10 é oficina associada da rede Câmbio Automático do Brasil.",
  },
  {
    pergunta: "Quais formas de pagamento a loja aceita?",
    resposta: "Cartão de crédito, cartão de débito e pagamento por aproximação.",
  },
];

const titulo = "B10 Auto Center | Oficina mecânica e auto peças em Piracanjuba";
const descricao = "Oficina mecânica e auto peças no Centro de Piracanjuba (GO): injeção eletrônica, suspensão, troca de óleo e câmbio automático. Agende pelo WhatsApp.";
const compartilhamento = {
  url: portal + imagens + "/compartilhar.jpg", width: 1200, height: 630,
  alt: "Fachada do B10 Auto Center em Piracanjuba, com o logo da oficina",
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
      "@type": ["AutoRepair", "AutoPartsStore"], "@id": url + "#oficina", name: marca,
      alternateName: "B10 Auto Center e Auto Peças", url, description: descricao,
      mainEntityOfPage: { "@id": url + "#pagina" },
      logo: portal + imagens + "/logo.webp",
      image: [portal + imagens + "/fachada.webp", ...fotos.map((f) => portal + f.src)],
      telephone: "+" + telefoneFixo, sameAs: [instagram], hasMap: mapa,
      address: {
        "@type": "PostalAddress", streetAddress: rua + ", Centro", addressLocality: "Piracanjuba",
        addressRegion: "GO", postalCode: cep, addressCountry: "BR",
      },
      geo: { "@type": "GeoCoordinates", ...geo },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "07:00", closes: "18:00",
      },
      paymentAccepted: "Cartão de crédito, cartão de débito, pagamento por aproximação",
      amenityFeature: [
        { "@type": "LocationFeatureSpecification", name: "Estacionamento no local", value: true },
        { "@type": "LocationFeatureSpecification", name: "Entrada acessível para cadeira de rodas", value: true },
        { "@type": "LocationFeatureSpecification", name: "Banheiro acessível para cadeira de rodas", value: true },
      ],
      contactPoint: [
        { "@type": "ContactPoint", contactType: "Agendamento de serviços", telephone: "+" + telefoneAgendamento, availableLanguage: "pt-BR" },
        { "@type": "ContactPoint", contactType: "Venda de auto peças", telephone: "+" + telefonePecas, availableLanguage: "pt-BR" },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog", name: "Serviços da oficina",
        itemListElement: servicos.filter((sv) => !sv.confirmar).map((sv) => ({
          "@type": "Offer", itemOffered: { "@type": "Service", name: sv.nome, description: sv.texto },
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

export default function B10AutoCenter() {
  return (
    <article className={`${s.pagina} ${letreiro.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />

      <header className={s.capa}>
        <div className={s.largura}>
          <nav className={s.navegacao} aria-label="Navegação da página do B10 Auto Center">
            <a href="#servicos">Serviços</a>
            <a href="#pecas">Auto peças</a>
            <a className={s.linkFotos} href="#fotos">Fotos</a>
            <a href="#contato">Contato</a>
            <a href={instagram} aria-label="Instagram do B10 Auto Center"><InstagramIcon width={20} height={20} /></a>
          </nav>
          <div className={s.abertura}>
            <div className={s.chamada}>
              <div className={s.identidade}>
                <Image className={s.logo} src={imagens + "/logo.webp"} width={512} height={512} loading="eager"
                  sizes="(max-width: 760px) 84px, 148px" alt="Logo do B10 Auto Center" />
                <h1>{marca} <span>Oficina mecânica e auto peças em Piracanjuba</span></h1>
              </div>
              <p className={s.lide}>Injeção eletrônica, suspensão, troca de óleo e câmbio automático no Centro da cidade, com balcão de peças no mesmo endereço. Agende o serviço pelo WhatsApp.</p>
              <div className={s.acoes}>
                <a id={ID_BOTAO_TOPO} className={s.botao} href={agendar}><WhatsAppIcon fill="currentColor" /> Agendar pelo WhatsApp</a>
                <a className={s.botaoContorno} href={pedirPeca}>Pedir uma peça</a>
              </div>
              <p className={s.horarioCapa}><Clock size={16} aria-hidden="true" /> Segunda a sexta, das 7h às 18h</p>
            </div>
            <figure className={s.fachada}>
              <Image src={imagens + "/fachada.webp"} width={1600} height={900} loading="eager" fetchPriority="high"
                sizes="(max-width: 760px) 92vw, (max-width: 1320px) 52vw, 680px"
                alt="Fachada do B10 Auto Center vista de frente, com letreiro verde e amarelo, o logo B10, os telefones e carros estacionados sob a cobertura" />
              <figcaption><MapPin size={15} aria-hidden="true" /> {rua}, Centro</figcaption>
            </figure>
          </div>
        </div>
      </header>
      {/* A faixa zebrada repete a do meio-fio na frente da loja. */}
      <div className={s.meioFio} aria-hidden="true" />

      <section id="servicos" className={s.servicos} aria-labelledby="titulo-servicos">
        <div className={`${s.largura} ${s.servicosGrade}`}>
          <div className={s.servicosIntro}>
            <h2 id="titulo-servicos">Serviços da oficina</h2>
            <p>Escolha o serviço e mande a mensagem pronta para o WhatsApp de agendamento, <span className={s.semQuebra}>{formatarTelefoneBr(telefoneAgendamento)}</span>.</p>
          </div>
          <ul className={s.ordem}>
            {servicos.map(({ nome, texto, mensagem, confirmar }) => (
              <li key={nome} className={confirmar ? s.aConfirmar : undefined}>
                <span className={s.marcador} aria-hidden="true" />
                <div>
                  <h3>{nome}{confirmar && <span className={s.etiqueta}>Confirme antes</span>}</h3>
                  <p>{texto}</p>
                </div>
                <a className={s.agendarServico} href={linkWhatsapp(telefoneAgendamento, mensagem)}
                  aria-label={(confirmar ? "Perguntar sobre " : "Agendar ") + nome.toLowerCase() + " pelo WhatsApp"}>
                  <WhatsAppIcon fill="currentColor" /> {confirmar ? "Perguntar" : "Agendar"}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pecas" className={s.pecas} aria-labelledby="titulo-pecas">
        <div className={`${s.largura} ${s.pecasGrade}`}>
          <figure className={s.balcao}>
            <Image src={imagens + "/balcao-pecas.webp"} width={960} height={1280}
              sizes="(max-width: 760px) 92vw, (max-width: 1320px) 40vw, 480px"
              alt="Balcão de auto peças do B10 Auto Center, com prateleiras de óleos e produtos automotivos ao fundo e iluminação no teto" />
          </figure>
          <div className={s.pecasTexto}>
            <h2 id="titulo-pecas">Balcão de auto peças</h2>
            <p>A loja de peças funciona no mesmo endereço da oficina e tem WhatsApp próprio. Mande o modelo e o ano do carro e diga qual peça procura.</p>
            <a className={s.botao} href={pedirPeca}><WhatsAppIcon fill="currentColor" /> Pedir uma peça</a>
            <p className={s.numeroPecas}>Vendas: <a href={pedirPeca}>{formatarTelefoneBr(telefonePecas)}</a></p>
          </div>
        </div>
      </section>

      <section id="fotos" className={s.galeria} aria-labelledby="titulo-fotos">
        <div className={s.largura}>
          <h2 id="titulo-fotos">A loja por dentro</h2>
          <div className={s.fotos}>
            {fotos.map(({ src, width, height, classe, sizes, legenda, alt }) => (
              <figure key={src} className={classe}>
                <div className={s.recorte}><Image src={src} width={width} height={height} sizes={sizes} alt={alt} /></div>
                <figcaption>{legenda}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className={s.praticos} aria-labelledby="titulo-praticos">
        <div className={s.largura}>
          <h2 id="titulo-praticos">Antes de ir</h2>
          <dl className={s.listaPraticos}>
            {praticos.map(({ titulo: item, texto, Icone }) => (
              <div key={item}>
                <dt><Icone size={20} strokeWidth={1.8} aria-hidden={true} /> {item}</dt>
                <dd>{texto}</dd>
              </div>
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

      <section id="contato" className={s.contato} aria-labelledby="titulo-contato">
        <div className={s.largura}>
          <h2 id="titulo-contato">Como chegar e falar com o B10</h2>
          <div className={s.detalhes}>
            <div>
              <h3>Endereço</h3>
              <address>{rua}<br />Centro, Piracanjuba (GO)<br />CEP {cep}</address>
              <a className={s.rota} href={mapa}>Abrir no Google Maps <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
            <div>
              <h3>Horário</h3>
              <dl className={s.horario}>
                <div><dt>Segunda a sexta</dt><dd>7h às 18h</dd></div>
                <div><dt>Sábado</dt><dd>Fechado</dd></div>
                <div><dt>Domingo</dt><dd>Fechado</dd></div>
              </dl>
            </div>
            <div>
              <h3>Contato</h3>
              <ul className={s.contatos}>
                <li><span>Agendar serviço</span><a href={agendar}><WhatsAppIcon fill="currentColor" /> {formatarTelefoneBr(telefoneAgendamento)}</a></li>
                <li><span>Auto peças</span><a href={pedirPeca}><WhatsAppIcon fill="currentColor" /> {formatarTelefoneBr(telefonePecas)}</a></li>
                <li><span>Telefone fixo</span><a href={"tel:+" + telefoneFixo}><Phone size={17} aria-hidden="true" /> {formatarTelefoneBr(telefoneFixo)}</a></li>
                <li><span>Instagram</span><a href={instagram}><InstagramIcon width={17} height={17} /> @b10autocenter</a></li>
              </ul>
            </div>
          </div>
          <div className={s.guia}>
            <Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
            <a href={suporte}>Solicitar correção ou retirada da página</a>
          </div>
        </div>
      </section>

      <BarraWhatsappEmpresa alvoId={ID_BOTAO_TOPO}>
        <a href={agendar} className={s.botaoBarra}><WhatsAppIcon fill="currentColor" /> Agendar pelo WhatsApp</a>
      </BarraWhatsappEmpresa>
      {/* A barra nasce escondida (sem piscar na carga) e quem está sem JavaScript a recebe por esta regra. */}
      <noscript>
        <style>{"[data-barra-empresa]{translate:none;transform:none}"}</style>
      </noscript>
    </article>
  );
}
