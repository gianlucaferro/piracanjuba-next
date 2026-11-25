import type { Metadata } from "next";
import Image from "next/image";
import { Cormorant_Garamond } from "next/font/google";
import Link from "next/link";
import {
  ArrowDown, ArrowLeft, ArrowUpRight, BadgeCheck, Clock, Gavel, HeartHandshake, MapPin,
  Quote, Scale, Shield, Siren,
} from "lucide-react";
import BarraWhatsappEmpresa from "@/components/empresas/BarraWhatsappEmpresa";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

// A marca da advogada usa caixa-alta serifada no nome; a Cormorant acompanha esse desenho.
const tipografia = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--km-serifa",
});

const portal = "https://piracanjuba.ai";
const caminho = "/kamillamorranna";
const url = portal + caminho;
const imagens = "/empresas/kamillamorranna";
const nome = "Kamilla Morranna Advocacia";
const profissional = "Kamilla Morranna Alves Cunha";
const registro = "OAB/GO 55.151";
const telefone = "5564992291703";
const instagram = "https://www.instagram.com/kamillamorranna.adv/";
const cna = "https://cna.oab.org.br/";
const ID_BOTAO_TOPO = "whatsapp-topo";
const whatsapp = linkWhatsapp(telefone, "Olá, Dra. Kamilla! Encontrei sua página no Piracanjuba.ai e gostaria de orientação jurídica.");
const whatsappUrgente = linkWhatsapp(telefone, "Olá, Dra. Kamilla! Preciso de orientação sobre uma prisão.");

const passos = [
  {
    titulo: "Mantenha a calma e descubra o destino",
    texto: "Procure saber para qual delegacia e para qual cidade a pessoa foi levada.",
  },
  {
    titulo: "Conheça os direitos da pessoa presa",
    texto: "Ela pode permanecer em silêncio, avisar um familiar e ter a assistência de um advogado.",
  },
  {
    titulo: "Audiência de custódia em até 24 horas",
    texto: "Depois da prisão em flagrante, a pessoa deve ser levada ao juiz em até 24 horas. Na audiência, ele decide se ela continua presa ou se vai responder em liberdade.",
  },
  {
    titulo: "Procure orientação desde o início",
    texto: "Evite decisões precipitadas. A defesa começa nos primeiros momentos da prisão.",
  },
];

const areas = [
  {
    titulo: "Defesa criminal", icone: Shield,
    resumo: "Defesa em investigações e processos criminais, com estudo dos autos, análise cuidadosa das provas, estratégia e respeito às garantias fundamentais.",
  },
  {
    titulo: "Prisão em flagrante e audiência de custódia", icone: Siren,
    resumo: "Orientação à família e à pessoa presa desde as primeiras horas, com atenção aos direitos garantidos por lei e à audiência de custódia.",
  },
  {
    titulo: "Tribunal do Júri", icone: Gavel,
    resumo: "Defesa nos crimes dolosos contra a vida, como homicídio e tentativa de homicídio, com estudo dos autos e preparação cuidadosa da atuação em plenário.",
  },
  {
    titulo: "Direito de Família e Sucessões", icone: HeartHandshake,
    resumo: "Atendimento também em questões de família e sucessões. Pergunte pelo WhatsApp como a advogada pode ajudar no seu caso.",
  },
];

const juri = [
  { termo: "Quais crimes vão a júri", texto: "Os crimes dolosos contra a vida, como o homicídio e a tentativa de homicídio." },
  { termo: "Quem são os jurados", texto: "Sete jurados sorteados formam o Conselho de Sentença. Eles ouvem a defesa e a acusação e analisam as provas." },
  { termo: "O que os jurados respondem", texto: "Os quesitos: se o fato existiu, se o acusado foi autor ou participou dele e se deve ser absolvido." },
  { termo: "O papel do juiz", texto: "O juiz preside a sessão, conduz os trabalhos e, ao final, profere a sentença de acordo com a decisão dos jurados." },
];

const perguntas = [
  {
    pergunta: "Meu familiar foi preso em flagrante. O que fazer primeiro?",
    resposta: "Mantenha a calma, descubra para qual delegacia e cidade ele foi levado e procure uma advogada criminalista. A pessoa presa tem direito de permanecer em silêncio, de avisar um familiar e de ter a assistência de um advogado.",
  },
  {
    pergunta: "O que é a audiência de custódia?",
    resposta: "É a apresentação ao juiz da pessoa presa em flagrante, que deve acontecer em até 24 horas. Nela, o juiz decide se a prisão será mantida ou se a pessoa vai responder em liberdade.",
  },
  {
    pergunta: "Quem decide se o réu é condenado no Tribunal do Júri?",
    resposta: "Os sete jurados do Conselho de Sentença. O juiz preside a sessão e profere a sentença de acordo com a decisão deles.",
  },
  {
    pergunta: "A advogada atende quem mora fora de Piracanjuba?",
    resposta: "Sim. Kamilla Morranna atende presencialmente em Piracanjuba (GO) e online em todo o Brasil.",
  },
  {
    pergunta: "Como falar com a advogada Kamilla Morranna?",
    resposta: `Pelo WhatsApp ${formatarTelefoneBr(telefone)}. O atendimento criminal funciona 24 horas.`,
  },
];

const titulo = "Advogada Criminalista em Piracanjuba (GO) | Kamilla Morranna";
const descricao = "Kamilla Morranna, advogada criminalista em Piracanjuba (GO), OAB/GO 55.151. Defesa criminal, prisão em flagrante e Tribunal do Júri. Fale pelo WhatsApp.";
const compartilhamento = {
  url: portal + imagens + "/compartilhar.jpg", width: 1200, height: 630,
  alt: "Marca de Kamilla Morranna Advocacia e retrato da advogada criminalista em Piracanjuba",
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
      mainEntity: { "@id": url + "#escritorio" }, breadcrumb: { "@id": url + "#navegacao" },
    },
    {
      "@type": "LegalService", "@id": url + "#escritorio", name: nome, url,
      mainEntityOfPage: { "@id": url + "#pagina" },
      image: portal + imagens + "/retrato.webp", logo: portal + imagens + "/marca.webp",
      telephone: "+" + telefone, sameAs: [instagram], employee: { "@id": url + "#kamilla-morranna" },
      areaServed: [
        { "@type": "City", name: "Piracanjuba", containedInPlace: { "@type": "State", name: "Goiás" } },
        { "@type": "Country", name: "Brasil" },
      ],
      address: { "@type": "PostalAddress", addressLocality: "Piracanjuba", addressRegion: "GO", addressCountry: "BR" },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00", closes: "23:59", description: "Atendimento criminal 24 horas pelo WhatsApp",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog", name: "Áreas de atuação",
        itemListElement: areas.map((a) => ({
          "@type": "Offer", itemOffered: { "@type": "Service", name: a.titulo, description: a.resumo },
        })),
      },
    },
    {
      "@type": "Person", "@id": url + "#kamilla-morranna", name: profissional, alternateName: "Kamilla Morranna",
      jobTitle: "Advogada criminalista", image: portal + imagens + "/retrato.webp",
      worksFor: { "@id": url + "#escritorio" }, sameAs: [instagram],
      knowsAbout: ["Direito Penal", "Processo Penal", "Tribunal do Júri", "Audiência de custódia", "Direito de Família"],
      identifier: { "@type": "PropertyValue", propertyID: "OAB-GO", value: "55.151" },
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

export default function KamillaMorranna() {
  return (
    <article className={tipografia.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />

      <header className={s.capa}>
        <div className={s.largura}>
          <div className={s.linhaGuia}>
            <Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
            <span className={s.dadosCapa}><span className={s.cidade}><MapPin size={14} aria-hidden="true" /> Piracanjuba, Goiás</span>{registro}</span>
          </div>
          <div className={s.capaGrade}>
            <div className={s.apresentacao}>
              <div className={s.marca}>
                <Image src={imagens + "/marca.webp"} width={992} height={678} alt="Kamilla Morranna Advocacia" loading="eager"
                  sizes="(max-width: 700px) 230px, 300px" />
              </div>
              <p className={s.sobretitulo}><span>Advocacia Criminal</span> <span aria-hidden="true">·</span> <span>Tribunal do Júri</span></p>
              <h1>Advogada criminalista em Piracanjuba</h1>
              <p className={s.lide}>Kamilla Morranna atua na defesa criminal e no Tribunal do Júri, com estudo dos autos, análise das provas e respeito às garantias de cada pessoa. Atendimento presencial em Piracanjuba e online em todo o Brasil.</p>
              <div className={s.acoes}>
                <a id={ID_BOTAO_TOPO} href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Falar com a advogada</a>
                <a href="#atuacao" className={s.atalho}>Áreas de atuação <ArrowDown size={15} aria-hidden="true" /></a>
              </div>
              <p className={s.selo}><Clock size={16} aria-hidden="true" /> Atendimento criminal 24 horas</p>
            </div>
            <figure className={s.retrato}>
              <Image src={imagens + "/retrato.webp"} width={720} height={1000} alt="Retrato da advogada Kamilla Morranna"
                loading="eager" fetchPriority="high" sizes="(max-width: 700px) 80vw, (max-width: 1150px) 38vw, 420px" />
              <figcaption><strong>Kamilla Morranna</strong><span>Advogada · {registro}</span></figcaption>
            </figure>
          </div>
        </div>
      </header>

      <section aria-labelledby="titulo-prisao" className={s.urgencia}>
        <div className={s.largura}>
          <div className={s.urgenciaGrade}>
            <div className={s.urgenciaTexto}>
              <p className={s.rotulo}><Siren size={16} aria-hidden="true" /> Prisão em flagrante</p>
              <h2 id="titulo-prisao">Um familiar foi preso. E agora?</h2>
              <p>O momento da prisão costuma trazer medo e muitas dúvidas para a família. Nas primeiras horas, a informação certa e a orientação de uma advogada criminalista fazem diferença.</p>
              <a href={whatsappUrgente} className={s.botaoClaro}><WhatsAppIcon fill="currentColor" /> Pedir orientação agora</a>
            </div>
            <ol className={s.passos}>
              {passos.map(({ titulo: passo, texto }) => (
                <li key={passo}><h3>{passo}</h3><p>{texto}</p></li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="atuacao" aria-labelledby="titulo-atuacao" className={s.atuacao}>
        <div className={s.largura}>
          <div className={s.cabecalhoSecao}>
            <Scale size={30} strokeWidth={1.25} aria-hidden="true" />
            <h2 id="titulo-atuacao">Áreas de atuação</h2>
            <p>Atuação em diversas áreas do Direito, com foco na advocacia criminal.</p>
          </div>
          <ul className={s.areas}>
            {areas.map(({ titulo: area, resumo, icone: Icone }) => (
              <li key={area}>
                <Icone size={24} strokeWidth={1.4} aria-hidden="true" />
                <h3>{area}</h3>
                <p>{resumo}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="juri" aria-labelledby="titulo-juri" className={s.juri}>
        <div className={s.largura}>
          <div className={s.juriGrade}>
            <div>
              <p className={s.rotuloEscuro}><Gavel size={16} aria-hidden="true" /> Tribunal do Júri</p>
              <h2 id="titulo-juri">Quem decide no Tribunal do Júri?</h2>
              <p className={s.juriLide}>A decisão de condenar ou absolver é dos jurados, e não do juiz. Por isso o trabalho da defesa em plenário pesa tanto.</p>
              <dl className={s.juriLista}>
                {juri.map(({ termo, texto }) => (
                  <div key={termo}><dt>{termo}</dt><dd>{texto}</dd></div>
                ))}
              </dl>
            </div>
            <figure className={s.plenario}>
              <Image src={imagens + "/plenario.webp"} width={1296} height={864}
                alt="Plenário do Júri vazio, com bancos de madeira, a mesa do juiz e as cadeiras dos jurados"
                sizes="(max-width: 850px) 90vw, 520px" />
              <figcaption>Imagem ilustrativa de um plenário do Júri.</figcaption>
              <blockquote className={s.citacaoCurta}>
                <p>No Júri, preparo faz diferença.</p>
                <cite>Kamilla Morranna</cite>
              </blockquote>
            </figure>
          </div>
        </div>
      </section>

      <section id="sobre" aria-labelledby="titulo-sobre" className={s.sobre}>
        <div className={s.largura}>
          <div className={s.sobreGrade}>
            <div className={s.monograma} aria-hidden="true">
              <Image src={imagens + "/marca.webp"} width={992} height={678} alt="" sizes="260px" />
            </div>
            <div>
              <h2 id="titulo-sobre">Sobre a advogada</h2>
              <blockquote className={s.citacao}>
                <Quote size={26} strokeWidth={1.3} aria-hidden="true" />
                <p>Acredito que a advocacia exige conhecimento, preparo, responsabilidade e respeito à história de cada pessoa.</p>
              </blockquote>
              <p className={s.sobreTexto}>{profissional} é advogada inscrita na OAB de Goiás sob o número 55.151 e atende em Piracanjuba. No Instagram, apresenta o quadro “A advogada Kamilla te conta”, com explicações sobre direitos, processo penal e o Tribunal do Júri, para aproximar as pessoas da realidade jurídica.</p>
              <dl className={s.fatos}>
                <div><dt><BadgeCheck size={16} aria-hidden="true" /> Inscrição</dt><dd>{registro} <a href={cna}>Conferir no Cadastro Nacional dos Advogados <ArrowUpRight size={14} aria-hidden="true" /></a></dd></div>
                <div><dt><MapPin size={16} aria-hidden="true" /> Atendimento</dt><dd>Presencial em Piracanjuba (GO) e online em todo o Brasil</dd></div>
                <div><dt><Clock size={16} aria-hidden="true" /> Criminal</dt><dd>Atendimento 24 horas pelo WhatsApp</dd></div>
              </dl>
            </div>
          </div>
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
              <h2 id="titulo-contato">Como falar com uma advogada criminalista em Piracanjuba?</h2>
              <p>Pelo WhatsApp, você fala diretamente com Kamilla Morranna para marcar uma consulta, presencial em Piracanjuba ou online.</p>
            </div>
            <div className={s.dados}>
              <div>
                <h3><WhatsAppIcon fill="currentColor" /> WhatsApp</h3>
                <a className={s.telefone} href={whatsapp}>{formatarTelefoneBr(telefone)} <ArrowUpRight size={19} aria-hidden="true" /></a>
              </div>
              <div>
                <h3><InstagramIcon /> Instagram</h3>
                <a className={s.rede} href={instagram}>@kamillamorranna.adv <ArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
              <div>
                <h3><MapPin size={17} aria-hidden="true" /> Atendimento</h3>
                <p>Presencial em Piracanjuba (GO) e online em todo o Brasil. Atendimento criminal 24 horas.</p>
              </div>
            </div>
          </div>
          <p className={s.registro}>{profissional} <span>Advogada · {registro}</span></p>
        </div>
      </section>

      <BarraWhatsappEmpresa alvoId={ID_BOTAO_TOPO}>
        <a href={whatsapp} className={s.botaoBarra}><WhatsAppIcon fill="currentColor" /> Falar com a advogada</a>
      </BarraWhatsappEmpresa>
      {/* A barra nasce escondida (sem piscar na carga) e quem está sem JavaScript a recebe por esta regra. */}
      <noscript>
        <style>{"[data-barra-empresa]{translate:none;transform:none}"}</style>
      </noscript>
    </article>
  );
}
