import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { Activity, ArrowDown, ArrowLeft, ArrowUpRight, CircleDot, Footprints, HandHeart, MapPin, Navigation, Plus } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import { CLINICA_ESSENCIA } from "@/data/clinica-essencia";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import s from "./pagina.module.css";

const editorial = localFont({
  src: "../pacifico-siqueira-advocacia/fontes/fraunces.woff2",
  weight: "400 600",
  display: "swap",
  variable: "--quiro-fonte",
});

const portal = "https://piracanjuba.ai";
const caminho = "/quiropraxia";
const url = portal + caminho;
const profissional = "Juan Carlos Mesquita de Souza";
const perfil = "https://www.instagram.com/juancmesquita/";
const publicacao = perfil + "reel/DeppXzdRuyV/";
const clinica = "Clínica Essência";
const { rua, bairro, cep, mapa, coordenadas, waze } = CLINICA_ESSENCIA;
const fonteQuiropraxia = "https://www.gov.br/saude/pt-br/composicao/saps/pics/recursos-teraupeticos/quiropraxia";
const midia = "/empresas/quiropraxia";
const descricaoArte = "Juan Carlos Mesquita. Quiropraxia - Liberação Miofascial - ventosas";
const titulo = "Quiropraxia em Piracanjuba (GO) | Juan Carlos Mesquita";
const descricao = "Juan Carlos Mesquita, quiropraxista em Piracanjuba, atende com liberação miofascial e ventosas na Clínica Essência. Conheça as técnicas e veja como agendar.";
const fonteEvidencia = "https://www.cochrane.org/pt/evidence/CD008112_what-are-benefits-and-risks-spinal-manipulative-therapy-chronic-low-back-pain";
const fonteSeguranca = "https://www.nccih.nih.gov/health/spinal-manipulation-what-you-need-to-know";
const fonteDiretriz = "https://www.nice.org.uk/guidance/ng59/chapter/recommendations#manual-therapies";

const estudoVentosas = "https://bmjopen.bmj.com/content/15/5/e087340";
const mapaEvidenciasVentosas = "https://docs.bvsalud.org/biblioref/2022/12/1410874/efetividade-da-ventosaterapia.pdf";
const fonteVentosas = "https://www.nccih.nih.gov/health/cupping";

const beneficios = [
  {
    titulo: "Alívio da dor lombar",
    texto: "Quando a dor na parte de baixo das costas persiste por mais de três meses, a manipulação da coluna pode trazer um pequeno alívio no curto prazo.",
    icone: Activity,
  },
  {
    titulo: "Movimento no dia a dia",
    texto: "Caminhar, ficar em pé ou fazer as tarefas de casa pode ficar um pouco mais fácil. Os estudos sobre dor lombar persistente mostram uma melhora pequena, em média.",
    icone: Footprints,
  },
  {
    titulo: "Uma opção de cuidado manual",
    texto: "A terapia manual é uma opção sem medicamentos. Para dor lombar, a diretriz britânica NICE orienta considerá-la como parte de um plano que inclua exercícios.",
    icone: HandHeart,
  },
];

const perguntas = [
  {
    pergunta: "Para que serve a quiropraxia?",
    resposta: "A quiropraxia se dedica a queixas do sistema musculoesquelético, que inclui articulações, músculos e coluna. A dor lombar é uma das queixas mais estudadas. A escolha da técnica depende dos sintomas e do histórico de saúde.",
  },
  {
    pergunta: "Qual a diferença entre quiropraxia e liberação miofascial?",
    resposta: "A quiropraxia pode incluir técnicas manuais nas articulações da coluna. A liberação miofascial concentra o trabalho nos tecidos que envolvem os músculos. Juan apresenta ambas as práticas em seu perfil.",
  },
  {
    pergunta: "Quais cuidados considerar antes da sessão?",
    fonte: fonteSeguranca,
    resposta: "Converse sobre seus sintomas, condições de saúde e medicamentos antes de qualquer técnica. A manipulação pode causar desconforto ou rigidez temporários. Se houver indicação de manipulação no pescoço, peça que o profissional explique também os riscos raros, porém graves, e as alternativas.",
  },
  {
    pergunta: "Quanto custa a sessão e como faço para agendar?",
    resposta: "Envie uma mensagem ao perfil @juancmesquita no Instagram para confirmar o valor, a duração e os horários disponíveis antes de ir à clínica.",
  },
];

export const metadata = {
  ...pageMetadata({ title: titulo, description: descricao, path: caminho, image: midia + "/juan-servicos-social.jpg",
    imageAlt: descricaoArte }),
  title: { absolute: titulo },
  other: {
    "geo.region": "BR-GO", "geo.placename": "Piracanjuba, Goiás",
    "geo.position": coordenadas.latitude + ";" + coordenadas.longitude,
    ICBM: coordenadas.latitude + ", " + coordenadas.longitude,
  },
};

const dados = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage", "@id": url, url, name: titulo, description: descricao,
      inLanguage: "pt-BR", isPartOf: { "@id": portal + "/#website" },
      citation: [fonteEvidencia, fonteDiretriz, fonteSeguranca, fonteQuiropraxia, estudoVentosas, mapaEvidenciasVentosas, fonteVentosas],
      mainEntity: { "@id": url + "#servico" }, breadcrumb: { "@id": url + "#navegacao" },
    },
    {
      "@type": "Service", "@id": url + "#servico", name: "Quiropraxia em Piracanjuba",
      serviceType: ["Quiropraxia", "Liberação miofascial", "Ventosaterapia"], areaServed: { "@type": "City", name: "Piracanjuba" },
      provider: { "@id": url + "#juan" },
      availableChannel: { "@type": "ServiceChannel", serviceLocation: { "@id": url + "#clinica" } },
    },
    {
      "@type": "Person", "@id": url + "#juan", name: profissional,
      alternateName: "Juan Carlos Mesquita", jobTitle: "Quiropraxista", sameAs: [perfil],
      workLocation: { "@id": url + "#clinica" },
    },
    {
      "@type": "Place", "@id": url + "#clinica", name: clinica, hasMap: mapa, geo: { "@type": "GeoCoordinates", ...coordenadas },
      address: { "@type": "PostalAddress", streetAddress: rua + ", " + bairro, addressLocality: "Piracanjuba",
        addressRegion: "GO", postalCode: cep, addressCountry: "BR" },
    },
    {
      ...breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" },
        { name: "Quiropraxia em Piracanjuba", path: caminho }]), "@id": url + "#navegacao",
    },
  ],
};

export default function Quiropraxia() {
  return (
    <article className={editorial.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }} />
      <header className={s.capa}>
        <div className={s.miolo}>
          <div className={s.topo}>
            <Link href="/zap-pba"><ArrowLeft size={16} aria-hidden="true" /> Guia Zap PBA</Link>
            <nav aria-label="Quiropraxia"><a href="#beneficios">Benefícios</a><a href="#duvidas">Dúvidas</a><a href="#clinica">Como chegar</a></nav>
          </div>
          <div className={s.composicao}>
            <div className={s.abertura}>
              <div className={s.assinatura}>
                <p className={s.nome}>{profissional}<span>Quiropraxista · Clínica Essência</span></p>
              </div>
              <h1>Quiropraxia <span>em Piracanjuba</span></h1>
              <p className={s.resumo}>Juan atende na Clínica Essência com quiropraxia, liberação miofascial e <a className={s.linkVentosas} href="#ventosas">ventosas</a>. Conheça as técnicas e converse com ele para marcar sua visita.</p>
              <div className={s.acoes}>
                <a className={s.botao} href={perfil}><InstagramIcon width={18} height={18} /> Agendar pelo Instagram</a>
                <a className={s.ancora} href="#beneficios">Conhecer os benefícios <ArrowDown size={16} aria-hidden="true" /></a>
              </div>
            </div>
            <figure className={s.figura}>
              <Image
                src={midia + "/juan-servicos.webp"}
                width={1088}
                height={1344}
                sizes="(max-width: 424px) calc(100vw - 2.5rem), (max-width: 720px) 384px, (max-width: 1024px) 38vw, 384px"
                preload
                alt={descricaoArte}
              />
            </figure>
          </div>
        </div>
      </header>

      <section className={s.beneficios + " " + s.miolo} id="beneficios" aria-labelledby="titulo-beneficios">
        <div className={s.cabecalhoBeneficios}>
          <h2 id="titulo-beneficios">Quais os benefícios <em>da quiropraxia?</em></h2>
          <p>Boa parte das pesquisas estuda uma técnica usada na quiropraxia, a manipulação da coluna. Os resultados abaixo se referem principalmente a adultos com dor lombar persistente.</p>
        </div>
        <ul className={s.cards}>
          {beneficios.map(({ titulo: nome, texto, icone: Icone }) => (
            <li key={nome}>
              <span className={s.iconeCard}><Icone size={26} strokeWidth={1.6} aria-hidden="true" /></span>
              <h3>{nome}</h3>
              <p>{texto}</p>
            </li>
          ))}
        </ul>
        <div className={s.fontes}>
          <span>Fontes sobre os benefícios</span>
          <a className={s.link} href={fonteEvidencia}>Revisão Cochrane em português <ArrowUpRight size={14} aria-hidden="true" /></a>
          <a className={s.link} href={fonteDiretriz}>Diretriz para dor lombar, NICE <ArrowUpRight size={14} aria-hidden="true" /></a>
        </div>
      </section>

      <section className={s.faixaPraticas} id="praticas" aria-labelledby="titulo-praticas">
        <div className={s.praticas + " " + s.miolo}>
          <div className={s.indice}>
            <h2 id="titulo-praticas">Conheça o <em>atendimento.</em></h2>
            <p className={s.introPraticas}>Juan é quiropraxista em Piracanjuba. Na Clínica Essência, trabalha com técnicas manuais. Em seu perfil, você pode ver uma demonstração e falar com ele sobre o que motivou a sua visita.</p>
            <Image className={s.fotoClinica} src={midia + "/clinica-essencia.webp"} width={1200} height={698} sizes="(max-width: 720px) 90vw, 36vw" alt="Fachada da Clínica Essência, onde Juan atende em Piracanjuba" />
          </div>
          <div className={s.metodos}>
            <div>
              <h3>Quiropraxia</h3>
              <p>O trabalho manual pode envolver articulações da coluna e de outras partes do corpo. A escolha da abordagem leva em conta a queixa de cada pessoa.</p>
              <a className={s.link} href={fonteQuiropraxia}>Sobre a prática no Ministério da Saúde <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
            <div>
              <h3>Liberação miofascial</h3>
              <p>A fáscia é o tecido conjuntivo que envolve os músculos. Juan mostra em vídeo como a liberação miofascial faz parte do seu atendimento.</p>
              <a className={s.link} href={publicacao}>Ver a demonstração de Juan <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
            <section id="ventosas" className={s.ventosas} aria-labelledby="titulo-ventosas">
              <h3 id="titulo-ventosas"><CircleDot size={22} aria-hidden="true" /> Ventosas (ventosaterapia)</h3>
              <p>As ventosas são copos que criam sucção na pele. A técnica é usada como complemento no cuidado da dor muscular e pode deixar marcas circulares temporárias.</p>
              <p>Em pessoas com dor persistente nas costas ou no pescoço, alguns estudos observaram alívio logo após a sessão. Ainda há incerteza sobre quanto tempo esse alívio dura.</p>
              <div className={s.fontesVentosas}>
                <a className={s.link} href={mapaEvidenciasVentosas}>Pesquisas em português (PDF) <ArrowUpRight size={15} aria-hidden="true" /></a>
                <a className={s.link} href={fonteVentosas}>Efeitos na pele <ArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className={s.duvidas + " " + s.miolo} id="duvidas" aria-labelledby="titulo-duvidas">
        <div className={s.indice}>
          <h2 id="titulo-duvidas">Antes da <em>primeira visita.</em></h2>
          <p className={s.introPraticas}>Tire suas dúvidas sobre as práticas, os cuidados e o agendamento.</p>
        </div>
        <div className={s.perguntas}>
          {perguntas.map(({ pergunta, resposta, fonte }) => (
            <details key={pergunta}>
              <summary>{pergunta}<Plus size={19} aria-hidden="true" /></summary>
              <p>{resposta}</p>
              {fonte && <a className={s.link} href={fonte}>Informações de segurança, NIH <ArrowUpRight size={14} aria-hidden="true" /></a>}
            </details>
          ))}
        </div>
      </section>

      <section className={s.regiao} id="clinica" aria-labelledby="titulo-clinica">
        <div className={s.miolo + " " + s.localGrade}>
          <div className={s.local}>
            <p className={s.antetitulo}><MapPin size={16} aria-hidden="true" /> Local de atendimento</p>
            <h2 id="titulo-clinica">{clinica}</h2>
            <address>{rua}<br />{bairro}, Piracanjuba, GO<br />CEP {cep}</address>
            <div className={s.acoesLocal}>
              <a className={s.botao} href={waze}><Navigation size={17} aria-hidden="true" /> Abrir rota no Waze</a>
              <a className={s.link} href={mapa}>Ver no Google Maps <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
            <Link className={s.link} href={CLINICA_ESSENCIA.path}>Conheça a Clínica Essência <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className={s.mapa}>
            <a href={waze} aria-label="Ver a localização da Clínica Essência no Waze">
              <Image src="/empresas/estetica/mapa.webp" width={900} height={450} sizes="(max-width: 720px) 92vw, 44vw" alt="Localização da clínica na Avenida Santos Dumont, no Setor Aeroporto" />
            </a>
            <a className={s.credito} href="https://www.openstreetmap.org/copyright">© colaboradores do OpenStreetMap</a>
          </div>
        </div>
      </section>
      <section className={s.convite} aria-labelledby="titulo-agenda">
        <div className={s.miolo + " " + s.agendaGrade}>
          <div>
            <h2 id="titulo-agenda">Combine seu horário <em>com Juan.</em></h2>
            <p>Vem de Professor Jamil, Cristianópolis, Morrinhos ou Caldas Novas? O atendimento é em Piracanjuba. Confirme a disponibilidade com Juan antes de sair.</p>
          </div>
          <a className={s.botao} href={perfil}><InstagramIcon width={18} height={18} /> Falar com @juancmesquita <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </section>
    </article>
  );
}
