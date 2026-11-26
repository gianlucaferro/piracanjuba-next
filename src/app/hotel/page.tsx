import type { Metadata } from "next";
import Image from "next/image";
import { Ubuntu } from "next/font/google";
import Link from "next/link";
import {
  ArrowLeft, ArrowUpRight, Bus, Car, Clock, Coffee, CloudSun, Fuel, Landmark, Mail, MapPin,
  Navigation, Phone, Pill, Snowflake, Star, Wifi,
} from "lucide-react";
import BarraWhatsappEmpresa from "@/components/empresas/BarraWhatsappEmpresa";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { HOTEL_VIA_SUL as H } from "@/data/hotel-via-sul";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

// O logotipo "Via Sul Hotel" é desenhado em Ubuntu; os títulos usam a mesma família. O corpo
// fica na fonte do portal, que já está carregada.
const tipografia = Ubuntu({ subsets: ["latin"], weight: ["500", "700"], display: "swap", variable: "--hotel-titulo" });

const portal = "https://piracanjuba.ai";
const url = portal + H.path;
const imagens = "/empresas/hotel-via-sul";
const ID_BOTAO_TOPO = "whatsapp-topo";
const enderecoCompleto = `${H.endereco}, ${H.bairro}, Piracanjuba (GO)`;
const whatsapp = linkWhatsapp(H.whatsapp, "Olá, Hotel Via Sul! Vi a página do hotel no Piracanjuba.ai e quero consultar a disponibilidade. Datas de entrada e saída: ... Número de hóspedes: ...");
const waze = `https://waze.com/ul?ll=${H.latitude},${H.longitude}&navigate=yes`;

const comodidades = [
  { icone: Coffee, titulo: "Café da manhã", texto: "Servido no salão de café do hotel, que aparece nas fotos abaixo." },
  { icone: Wifi, titulo: "Wi-Fi gratuito", texto: "Internet sem custo para os hóspedes." },
  { icone: Car, titulo: "Estacionamento gratuito", texto: "Vagas no próprio hotel para quem chega de carro." },
  { icone: Clock, titulo: "Recepção 24 horas", texto: "Equipe na recepção de dia e de noite, inclusive para quem chega tarde." },
  { icone: Snowflake, titulo: "Ar-condicionado e TV", texto: "Quartos com ar-condicionado e televisão, segundo as avaliações dos hóspedes." },
];

const fotos = [
  { src: "/quarto.webp", largura: 610, altura: 500, legenda: "Quarto com mesa de trabalho, TV e banheiro", alt: "Quarto do Hotel Via Sul com cama arrumada e toalhas, mesa de trabalho preta, TV na parede, frigobar e a porta do banheiro" },
  { src: "/cama-toalhas.webp", largura: 600, altura: 470, legenda: "Cama arrumada com toalhas para a chegada", alt: "Cama de casal com cabeceira de madeira, travesseiros brancos e toalhas dobradas sobre a manta" },
  { src: "/salao-cafe.webp", largura: 1080, altura: 1350, legenda: "Salão do café da manhã", alt: "Salão do café da manhã com mesas de madeira, cadeiras pretas e parede de vidro" },
  { src: "/cafe-da-manha.webp", largura: 640, altura: 800, legenda: "Pão de queijo, pão com queijo e frios, bolo, melancia e suco", alt: "Dois pratos, um com pão de queijo, pão com queijo e frios e bolo, outro com fatias de melancia, e um copo de suco" },
  { src: "/sala-estar.webp", largura: 1080, altura: 640, legenda: "Sala de estar do hotel", alt: "Sofá marrom com manta xadrez azul-marinho, almofadas turquesa e cinza, criado-mudo de madeira e plantas" },
  { src: "/recepcao-janela.webp", largura: 1080, altura: 1080, legenda: "Recepção com vista para a rua", alt: "Recepção do hotel com poltrona, planta em vaso e parede de vidro voltada para a rua, com o letreiro do Via Sul Hotel do lado de fora" },
];

const perfis = [
  {
    titulo: "Viagem a trabalho",
    texto: "Para técnicos, vendedores e quem atende o agronegócio da região: Wi-Fi gratuito, café da manhã e a Prefeitura e a Câmara a poucos minutos a pé.",
  },
  {
    titulo: "Família, festas e eventos",
    texto: "Para quem vem a casamentos, formaturas, visitas à família ou às festas da cidade, como a Festa de Agosto. Nessas datas, vale reservar com antecedência.",
  },
  {
    titulo: "Parada na viagem",
    texto: "Para quem chega de ônibus ou de carro e quer dormir no centro: a Rodoviária fica a cerca de 150 metros, e há estacionamento gratuito no hotel.",
  },
];

const avaliacoes = [
  { autor: "Luan H.", texto: "Ótimo hotel, muito bem organizado, limpo, cafe da manha nota 10 e os recepcionistas sempre muito receptivos e atenciosos." },
  { autor: "Rogerio S.", contexto: "Viagem a negócios", texto: "Minha estadia foi excelente, atendimento fantástico, equipe de profissionais que estão de parabéns, pessoas educadas que deixam a gente bem à vontade (...)" },
  { autor: "Wesley G.", contexto: "Férias em casal", texto: "Foi ótimo passar uma diária neste hotel, quarto e banheiro tudo limpinho e higienizado, atendimento excelente (...)" },
];

const guia = [
  { href: "/horarios-onibus", icone: Bus, titulo: "Horários de ônibus", texto: "Linhas que saem da Rodoviária de Piracanjuba." },
  { href: "/clima", icone: CloudSun, titulo: "Clima em Piracanjuba", texto: "Previsão para planejar a chegada e a volta." },
  { href: "/plantao-farmacias", icone: Pill, titulo: "Farmácia de plantão", texto: "Qual farmácia está aberta hoje à noite." },
  { href: "/postos-combustivel", icone: Fuel, titulo: "Postos de combustível", texto: "Endereços, bandeiras e produtos de cada posto, com dados da ANP." },
  { href: "/historia-pba", icone: Landmark, titulo: "História de Piracanjuba", texto: "Origem do nome, fé, festas e o que visitar." },
];

const perguntas = [
  {
    pergunta: "O Hotel Via Sul fica no centro de Piracanjuba?",
    resposta: `Sim. O Hotel Via Sul fica no Centro de Piracanjuba, na ${H.endereco}. A Rodoviária está a cerca de 150 metros a pé; a Prefeitura, a cerca de 250 metros, e a Câmara Municipal, a cerca de 270 metros, as duas na Praça Wilson Eloy Pimenta.`,
  },
  {
    pergunta: "Quais são os horários de check-in e check-out?",
    resposta: "O check-in é a partir das 14h e o check-out até as 12h. A recepção funciona 24 horas; se for chegar fora do horário, avise pelo WhatsApp.",
  },
  {
    pergunta: "O hotel tem café da manhã, Wi-Fi e estacionamento?",
    resposta: "Sim. O hotel divulga o café da manhã, o estacionamento e o Wi-Fi como cortesias para os hóspedes, e o Wi-Fi e o estacionamento são gratuitos. Na reserva, confirme pelo WhatsApp o que entra na sua diária.",
  },
  {
    pergunta: "Como reservar o Hotel Via Sul?",
    resposta: `Mande pelo WhatsApp ${formatarTelefoneBr(H.whatsapp)} as datas de entrada e saída e o número de hóspedes. A recepção confirma a disponibilidade, os valores e as condições. Também dá para escrever para ${H.email}.`,
  },
  {
    pergunta: "Qual é a nota do Hotel Via Sul no Google?",
    resposta: `A nota é ${H.avaliacoesGoogle.nota} de 5, com ${H.avaliacoesGoogle.total} avaliações no perfil do hotel no Google, consultado em ${H.avaliacoesGoogle.conferidoEm}.`,
  },
];

const titulo = "Hotel em Piracanjuba no Centro | Hotel Via Sul";
const descricao = "Hotel Via Sul, hotel em Piracanjuba no Centro, a cerca de 150 m da Rodoviária. Wi-Fi e estacionamento gratuitos, café da manhã, recepção 24h e WhatsApp.";
const compartilhamento = {
  url: portal + imagens + "/compartilhar.jpg", width: 1200, height: 630,
  alt: "Logotipo do Hotel Via Sul e a recepção do hotel em Piracanjuba",
};
const base = pageMetadata({ title: titulo, description: descricao, path: H.path, image: compartilhamento.url });
export const metadata: Metadata = {
  ...base,
  title: { absolute: titulo },
  openGraph: { ...base.openGraph, images: [compartilhamento] },
  twitter: { ...base.twitter, card: "summary_large_image", images: [compartilhamento] },
};

// Sem aggregateRating: a nota do Google aparece no texto, com data e link para a fonte.
const esquema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage", "@id": url + "#pagina", url, name: titulo, description: descricao,
      inLanguage: "pt-BR", isPartOf: { "@id": portal + "/#website" },
      about: { "@id": url + "#hotel" }, mainEntity: { "@id": url + "#hotel" }, breadcrumb: { "@id": url + "#navegacao" },
    },
    {
      "@type": "Hotel", "@id": url + "#hotel", name: H.nome, legalName: "HOTEL VIA SUL LTDA", url,
      mainEntityOfPage: { "@id": url + "#pagina" },
      description: "Hotel no Centro de Piracanjuba (GO), perto da Rodoviária, da Prefeitura e da Câmara Municipal.",
      image: [portal + imagens + "/recepcao.webp", portal + imagens + "/quarto.webp", portal + imagens + "/salao-cafe.webp"],
      logo: portal + imagens + "/via-sul-logo.svg",
      telephone: "+" + H.whatsapp, email: H.email,
      address: {
        "@type": "PostalAddress", streetAddress: H.endereco, addressLocality: "Piracanjuba",
        addressRegion: "GO", postalCode: H.cep, addressCountry: "BR",
      },
      geo: { "@type": "GeoCoordinates", latitude: H.latitude, longitude: H.longitude },
      hasMap: H.mapa, sameAs: [H.instagram, H.bioSite],
      checkinTime: H.checkin, checkoutTime: H.checkout,
      amenityFeature: [
        { "@type": "LocationFeatureSpecification", name: "Café da manhã", value: true },
        { "@type": "LocationFeatureSpecification", name: "Wi-Fi gratuito", value: true },
        { "@type": "LocationFeatureSpecification", name: "Estacionamento gratuito", value: true },
        { "@type": "LocationFeatureSpecification", name: "Recepção 24 horas", value: true },
      ],
      areaServed: { "@type": "City", name: "Piracanjuba", containedInPlace: { "@type": "State", name: "Goiás" } },
    },
    {
      "@type": "FAQPage", "@id": url + "#perguntas", url,
      mainEntity: perguntas.map((p) => ({
        "@type": "Question", name: p.pergunta, acceptedAnswer: { "@type": "Answer", text: p.resposta },
      })),
    },
    {
      ...breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: "Hotel em Piracanjuba", path: H.path }]),
      "@id": url + "#navegacao",
    },
  ],
};

export default function HotelViaSul() {
  return (
    <article className={tipografia.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />

      <header className={s.capa}>
        <div className={s.largura}>
          <div className={s.linhaGuia}>
            <Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
            <span><MapPin size={14} aria-hidden="true" /> Centro de Piracanjuba, Goiás</span>
          </div>
          <div className={s.capaGrade}>
            <div className={s.apresentacao}>
              <Image src={imagens + "/via-sul-logo-branco.svg"} width={683} height={163} alt="Via Sul Hotel"
                className={s.logo} loading="eager" unoptimized />
              <h1>Hotel em Piracanjuba, no centro da cidade</h1>
              <p className={s.lide}>O Hotel Via Sul fica no Centro de Piracanjuba, a cerca de 150 metros da Rodoviária, 250 metros da Prefeitura e 270 metros da Câmara. Recepção 24 horas, Wi-Fi e estacionamento gratuitos, e reserva direto com o hotel pelo WhatsApp.</p>
              <div className={s.acoes}>
                <a id={ID_BOTAO_TOPO} href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Reservar pelo WhatsApp</a>
                <a href={H.mapa} className={s.atalho}><Navigation size={16} aria-hidden="true" /> Como chegar</a>
              </div>
              <a href={H.mapa} className={s.nota}>
                <Star size={16} aria-hidden="true" fill="currentColor" />
                <span><strong>{H.avaliacoesGoogle.nota} no Google</strong>, com {H.avaliacoesGoogle.total} avaliações</span>
              </a>
            </div>
            <figure className={s.foto}>
              <Image src={imagens + "/recepcao.webp"} width={1080} height={1350}
                alt="Recepção do Hotel Via Sul com sofá, poltrona, almofadas azuis e o logotipo do hotel na parede"
                loading="eager" fetchPriority="high" sizes="(max-width: 900px) 89vw, 440px" />
              <dl className={s.horarios}>
                <div><dt>Check-in</dt><dd>a partir das 14h</dd></div>
                <div><dt>Check-out</dt><dd>até as 12h</dd></div>
                <div><dt>Recepção</dt><dd>24 horas</dd></div>
              </dl>
            </figure>
          </div>
        </div>
      </header>

      <section aria-labelledby="titulo-resposta" className={s.resposta}>
        <div className={s.largura}>
          <div className={s.respostaGrade}>
            <div>
              <h2 id="titulo-resposta">Um hotel no centro de Piracanjuba</h2>
              <p>O Hotel Via Sul está na {H.endereco}, no Centro. Quem chega de ônibus desce na Rodoviária e caminha cerca de 150 metros até a recepção. A Prefeitura e a Câmara Municipal, na Praça Wilson Eloy Pimenta, ficam a cerca de 250 e 270 metros.</p>
            </div>
            <ul className={s.distancias} aria-label="Distâncias a pé a partir do hotel">
              <li><strong>150 m</strong>{" "}<span>Rodoviária de Piracanjuba</span></li>
              <li><strong>250 m</strong>{" "}<span>Prefeitura, na Praça Wilson Eloy Pimenta</span></li>
              <li><strong>270 m</strong>{" "}<span>Câmara Municipal, na mesma praça</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section id="comodidades" aria-labelledby="titulo-comodidades" className={s.comodidades}>
        <div className={s.largura}>
          <h2 id="titulo-comodidades">O que o hotel oferece</h2>
          <ul className={s.listaComodidades}>
            {comodidades.map(({ icone: Icone, titulo: item, texto }) => (
              <li key={item}>
                <Icone size={24} strokeWidth={1.6} aria-hidden="true" />
                <h3>{item}</h3>
                <p>{texto}</p>
              </li>
            ))}
          </ul>
          <p className={s.aviso}>O café da manhã, o estacionamento e o Wi-Fi aparecem como cortesias na divulgação do próprio hotel. Ao reservar, confirme pelo WhatsApp o que entra na sua diária.</p>
        </div>
      </section>

      <section id="fotos" aria-labelledby="titulo-fotos" className={s.fotos}>
        <div className={s.largura}>
          <h2 id="titulo-fotos">Quartos, café e recepção</h2>
          <ul className={s.galeria}>
            {fotos.map((foto) => (
              <li key={foto.src}>
                <figure>
                  <Image src={imagens + foto.src} width={foto.largura} height={foto.altura} alt={foto.alt}
                    sizes="(max-width: 600px) 89vw, (max-width: 1000px) 44vw, 360px" />
                  <figcaption>{foto.legenda}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <p className={s.credito}>Fotos publicadas pelo Hotel Via Sul no Instagram.</p>
        </div>
      </section>

      <section aria-labelledby="titulo-perfis" className={s.perfis}>
        <div className={s.largura}>
          <h2 id="titulo-perfis">Para quem o Via Sul é uma boa escolha</h2>
          <div className={s.listaPerfis}>
            {perfis.map(({ titulo: perfil, texto }) => (
              <div key={perfil}>
                <h3>{perfil}</h3>
                <p>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-avaliacoes" className={s.avaliacoes}>
        <div className={s.largura}>
          <div className={s.cabecalhoAvaliacoes}>
            <h2 id="titulo-avaliacoes">O que dizem os hóspedes</h2>
            <p><strong>{H.avaliacoesGoogle.nota} de 5</strong> no Google, com {H.avaliacoesGoogle.total} avaliações, em {H.avaliacoesGoogle.conferidoEm}. Abaixo, trechos selecionados de avaliações de 5 estrelas.</p>
          </div>
          <ul className={s.listaAvaliacoes}>
            {avaliacoes.map(({ autor, contexto, texto }) => (
              <li key={autor}>
                <figure>
                  <blockquote><p>{texto}</p></blockquote>
                  <figcaption>{autor}{" "}<span>{contexto ? contexto + ", " : ""}avaliação no Google</span></figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <a href={H.mapa} className={s.linkFonte}>Ler todas as avaliações no Google <ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>
      </section>

      <section aria-labelledby="titulo-guia" className={s.guia}>
        <div className={s.largura}>
          <h2 id="titulo-guia">Para a sua estadia em Piracanjuba</h2>
          <p className={s.guiaLide}>O Piracanjuba.ai reúne informações da cidade que ajudam quem está de passagem.</p>
          <ul className={s.listaGuia}>
            {guia.map(({ href, icone: Icone, titulo: item, texto }) => (
              <li key={href}>
                <Link href={href}>
                  <Icone size={20} strokeWidth={1.7} aria-hidden="true" />
                  <span><strong>{item}</strong>{" "}{texto}</span>
                </Link>
              </li>
            ))}
          </ul>
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

      <section id="contato" aria-labelledby="titulo-contato" className={s.contato}>
        <div className={s.largura}>
          <div className={s.contatoGrade}>
            <div className={s.convite}>
              <h2 id="titulo-contato">Reserve direto com o hotel</h2>
              <p>Mande as datas e o número de hóspedes pelo WhatsApp. A recepção confirma a disponibilidade e os valores.</p>
              <a href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Reservar pelo WhatsApp</a>
            </div>
            <dl className={s.dados}>
              <div>
                <dt><WhatsAppIcon fill="currentColor" /> WhatsApp</dt>
                <dd><a className={s.telefone} href={whatsapp}>{formatarTelefoneBr(H.whatsapp)} <ArrowUpRight size={18} aria-hidden="true" /></a></dd>
              </div>
              <div>
                <dt><Phone size={17} aria-hidden="true" /> Telefone e e-mail</dt>
                <dd>
                  <a className={s.rede} href={"tel:+" + H.telefoneFixo}>{formatarTelefoneBr(H.telefoneFixo)}</a>
                  <a className={s.rede} href={"mailto:" + H.email}><Mail size={15} aria-hidden="true" /> {H.email}</a>
                </dd>
              </div>
              <div>
                <dt><MapPin size={17} aria-hidden="true" /> Endereço</dt>
                <dd>
                  <p>{enderecoCompleto}, CEP {H.cep}</p>
                  <span className={s.rotas}>
                    <a className={s.rede} href={H.mapa}>Google Maps <ArrowUpRight size={15} aria-hidden="true" /></a>
                    <a className={s.rede} href={waze}>Waze <ArrowUpRight size={15} aria-hidden="true" /></a>
                  </span>
                </dd>
              </div>
              <div>
                <dt><InstagramIcon /> Instagram</dt>
                <dd><a className={s.rede} href={H.instagram}>@hotel.viasul <ArrowUpRight size={15} aria-hidden="true" /></a></dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <BarraWhatsappEmpresa alvoId={ID_BOTAO_TOPO}>
        <a href={whatsapp} className={s.botaoBarra}><WhatsAppIcon fill="currentColor" /> Reservar pelo WhatsApp</a>
      </BarraWhatsappEmpresa>
      {/* A barra nasce escondida (sem piscar na carga) e quem está sem JavaScript a recebe por esta regra. */}
      <noscript>
        <style>{"[data-barra-empresa]{translate:none;transform:none}"}</style>
      </noscript>
    </article>
  );
}
