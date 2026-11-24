import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { ArrowDown, ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
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
const { rua, bairro, cep, mapa } = CLINICA_ESSENCIA;
const fonteQuiropraxia = "https://www.gov.br/saude/pt-br/composicao/saps/pics/recursos-teraupeticos/quiropraxia";
const midia = "/empresas/quiropraxia";
const titulo = "Quiropraxia em Piracanjuba (GO) | Juan Carlos Mesquita";
const descricao = "Quiropraxia com Juan Carlos Mesquita na Clínica Essência, em Piracanjuba. Consulte a agenda se você vem de Morrinhos, Caldas Novas, Professor Jamil ou Cristianópolis.";

export const metadata = {
  ...pageMetadata({ title: titulo, description: descricao, path: caminho, image: midia + "/compartilhar.jpg",
    imageAlt: "Quiropraxia em Piracanjuba com Juan Carlos Mesquita" }),
  title: { absolute: titulo },
};

const dados = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage", "@id": url, url, name: titulo, description: descricao,
      inLanguage: "pt-BR", isPartOf: { "@id": portal + "/#website" },
      mainEntity: { "@id": url + "#servico" }, breadcrumb: { "@id": url + "#navegacao" },
    },
    {
      "@type": "Service", "@id": url + "#servico", name: "Quiropraxia em Piracanjuba",
      serviceType: "Quiropraxia", provider: { "@id": url + "#juan" },
      availableChannel: { "@type": "ServiceChannel", serviceLocation: { "@id": url + "#clinica" } },
    },
    {
      "@type": "Person", "@id": url + "#juan", name: profissional,
      alternateName: "Juan Carlos Mesquita", jobTitle: "Quiropraxista", sameAs: [perfil],
      workLocation: { "@id": url + "#clinica" },
    },
    {
      "@type": "Place", "@id": url + "#clinica", name: clinica, hasMap: mapa,
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
            <nav aria-label="Quiropraxia"><a href="#praticas">Práticas</a><a href="#clinica">Local de atendimento</a></nav>
          </div>
          <div className={s.composicao}>
            <div className={s.abertura}>
              <div className={s.assinatura}>
                <Image src={midia + "/juan.webp"} width={60} height={60} alt="" />
                <p className={s.nome}>{profissional}<span>Quiropraxista</span></p>
              </div>
              <h1>Quiropraxia <span>em Piracanjuba</span></h1>
              <p className={s.resumo}>Juan atende na Clínica Essência, onde também trabalha com liberação miofascial. Fale com ele para combinar seu atendimento presencial.</p>
              <div className={s.acoes}>
                <a className={s.botao} href={perfil}><InstagramIcon width={18} height={18} /> Consultar horários</a>
                <a className={s.ancora} href="#clinica">Como chegar <ArrowDown size={16} aria-hidden="true" /></a>
              </div>
            </div>
            <figure className={s.figura}>
              <div className={s.quadro}>
                <Image src={midia + "/clinica-essencia.webp"} fill sizes="(max-width: 720px) 92vw, 42vw" preload alt="Entrada da Clínica Essência na Avenida Santos Dumont" />
              </div>
              <figcaption><MapPin size={14} aria-hidden="true" /> Clínica Essência, Piracanjuba</figcaption>
            </figure>
          </div>
        </div>
      </header>

      <section className={s.praticas + " " + s.miolo} id="praticas" aria-labelledby="titulo-praticas">
        <div className={s.indice}>
          <p className={s.antetitulo}>Práticas</p>
          <h2 id="titulo-praticas">Conheça o <em>atendimento.</em></h2>
        </div>
        <div className={s.metodos}>
          <div>
            <h3>Quiropraxia</h3>
            <p>A quiropraxia utiliza técnicas manuais voltadas às articulações, à coluna e aos tecidos que as envolvem.</p>
            <a className={s.link} href={fonteQuiropraxia}>Leia no Ministério da Saúde <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
          <div>
            <h3>Liberação miofascial</h3>
            <p>A fáscia é o tecido conjuntivo que envolve os músculos. Juan mostra em seu perfil como a liberação miofascial faz parte do seu trabalho.</p>
            <a className={s.link} href={publicacao}>Ver a publicação de Juan <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section className={s.regiao} id="clinica" aria-labelledby="titulo-clinica">
        <div className={s.miolo + " " + s.localGrade}>
          <div className={s.local}>
            <p className={s.antetitulo}><MapPin size={16} aria-hidden="true" /> Onde encontrar</p>
            <h2 id="titulo-clinica">{clinica}</h2>
            <address>{rua}<br />{bairro}, Piracanjuba, GO<br />CEP {cep}</address>
            <div className={s.acoesLocal}>
              <a className={s.botao} href={mapa}>Ver no Google Maps <ArrowUpRight size={16} aria-hidden="true" /></a>
              <Link className={s.link} href={CLINICA_ESSENCIA.path}>Conheça a clínica <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
          <div className={s.viagem}>
            <h3>Vem de outra cidade?</h3>
            <p>Se você está em Professor Jamil, Cristianópolis, Morrinhos, Caldas Novas ou em outra cidade da região, consulte os horários em Piracanjuba antes de sair de casa.</p>
            <a className={s.link} href={perfil}><InstagramIcon width={17} height={17} /> @juancmesquita <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        </div>
      </section>
    </article>
  );
}
