import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, MapPin, Navigation } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { CLINICA_ESSENCIA as clinica } from "@/data/clinica-essencia";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./estetica.module.css";

const portal = "https://piracanjuba.ai";
const url = portal + clinica.path;
const midia = "/empresas/estetica";
const titulo = "Esteticista, massagem e spa em Piracanjuba | Essência Estética";
const descricao = "Esteticista em Piracanjuba para limpeza de pele com LED, massagem corporal e Head Spa. Veja o catálogo da Clínica Essência e agende com a profissional pelo WhatsApp.";

export const metadata = {
  ...pageMetadata({
    title: titulo, description: descricao, path: clinica.path,
    image: midia + "/essencia-piracanjuba.jpg",
    imageAlt: "Marca e equipe da Essência Clínica de Estética em Piracanjuba",
  }),
  title: { absolute: titulo },
};

const servicos = [
  {
    nome: "Estética facial", foto: "estetica-facial.webp", alt: "Detalhe de um cuidado facial com luvas",
    texto: "A limpeza de pele com LED é um dos cuidados faciais de Laurieni Costa. Converse com a esteticista sobre a sua pele e como é a sessão.",
  },
  {
    nome: "Massagem corporal", foto: "massagem.webp", alt: "Detalhe das mãos durante uma massagem corporal",
    texto: "A clínica oferece drenagem linfática e massagem modeladora. Laurieni pode explicar as diferenças entre as técnicas e a duração de cada sessão.",
  },
  {
    nome: "Head Spa", foto: "head-spa.webp", alt: "Arco de água sobre a cabeça durante uma sessão de Head Spa",
    texto: "O ritual começa com um escalda-pés e inclui massagem no couro cabeludo e lavagem dos fios. Escolha uma das quatro experiências abaixo.",
  },
];

const experiencias = [
  { nome: "Zen", minutos: 40, detalhes: "Massagem capilar e no pescoço, com secagem suave dos fios ao final." },
  { nome: "Essence", minutos: 50, detalhes: "Acrescenta massagem facial e no pescoço, hidratação capilar e máscara para o rosto." },
  { nome: "Glow", minutos: 60, detalhes: "Massagem capilar e facial, hidratação dos fios e do rosto e finalização com secagem." },
  { nome: "Luxo", minutos: 80, detalhes: "Inclui massagem corporal, capilar e facial, hidratação dos fios e máscara para o rosto." },
];

const profissionais = [
  { nome: "Laurieni Costa", area: "Estética e spa", numero: clinica.telefoneEsteticaSpa },
  { nome: "Neuzirene Oliveira", area: "Cabeleireira e estética", numero: "5564992554074" },
  { nome: "Adryellen Costa", area: "Adryellen Costa Beauty", numero: "5564992888444" },
];

function contato(nome: string, numero: string) {
  return linkWhatsapp(numero, "Olá, " + nome.split(" ")[0] + "! Vi a página da Essência Estética no Piracanjuba.ai e gostaria de consultar os horários.");
}

const dados = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BeautySalon", "@id": url + "#clinica", name: clinica.nome,
      alternateName: "Essência Clínica de Estética", url, description: descricao,
      logo: portal + midia + "/marca.webp", image: portal + midia + "/essencia-piracanjuba.jpg",
      sameAs: [clinica.instagram, "https://bio.site/clinicaessenciaestetica"],
      hasMap: clinica.mapa,
      address: { "@type": "PostalAddress", streetAddress: clinica.rua + ", " + clinica.bairro,
        addressLocality: "Piracanjuba", addressRegion: "GO", addressCountry: "BR", postalCode: clinica.cep },
      contactPoint: profissionais.map(({ nome, area, numero }) => ({
        "@type": "ContactPoint", name: nome, contactType: area, telephone: "+" + numero,
      })),
      hasOfferCatalog: {
        "@type": "OfferCatalog", name: "Catálogo de procedimentos da Essência", url: clinica.catalogo,
        itemListElement: servicos.map(({ nome }) => ({
          "@type": "Offer", itemOffered: { "@type": "Service", name: nome },
        })),
      },
    },
    breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: clinica.nome, path: clinica.path }]),
  ],
};

export default function EssenciaEstetica() {
  return (
    <article className={s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }} />
      <header className={s.abertura}>
        <nav className={s.navegacao} aria-label="Essência Estética">
          <Image src={midia + "/marca.webp"} width={174} height={59} alt="Essência Clínica de Estética" />
          <div>
            <a href="#servicos">Procedimentos</a>
            <a href="#equipe">Agendamento</a>
            <a href={clinica.instagram} className={s.rede} aria-label="Instagram da Clínica Essência"><InstagramIcon width={19} height={19} /><span>Instagram</span></a>
          </div>
        </nav>
        <div className={s.capa}>
          <div className={s.capaTexto}>
            <p className={s.localidade}><MapPin size={15} aria-hidden="true" /> Setor Aeroporto · Piracanjuba, GO</p>
            <h1>Estética, massagem<br /> e <em>spa</em> em Piracanjuba.</h1>
            <p className={s.intro}>Na Clínica Essência, você pode reservar um Head Spa, escolher um cuidado para a pele ou agendar uma massagem corporal.</p>
            <div className={s.acoes}>
              <a href={contato("Laurieni Costa", clinica.telefoneEsteticaSpa)} className={s.botao}><WhatsAppIcon className="h-5 w-5" fill="currentColor" /> Agendar com Laurieni</a>
              <a href="#servicos" className={s.link}>Ver procedimentos <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <div className={s.fotoEquipe}>
            <Image src={midia + "/equipe.webp"} alt="As três profissionais da Clínica Essência reunidas" fill sizes="(max-width: 700px) 100vw, 46vw" priority />
            <Image src={midia + "/selo.webp"} width={58} height={77} alt="" className={s.selo} />
          </div>
        </div>
      </header>
      <section id="servicos" className={s.procedimentos} aria-labelledby="titulo-servicos">
        <div className={s.cabecalhoSecao}>
          <h2 id="titulo-servicos">Os procedimentos</h2>
          <a className={s.link} href={clinica.catalogo}>Catálogo completo <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
        <div className={s.cards}>
          {servicos.map(({ nome, foto, alt, texto }) => (
            <div className={s.card} key={nome}>
              <div className={s.fotoServico}><Image src={midia + "/" + foto} alt={alt} fill sizes="(max-width: 700px) 90vw, 30vw" /></div>
              <h3>{nome}</h3>
              <p>{texto}</p>
            </div>
          ))}
        </div>
        <div className={s.experiencias} aria-labelledby="titulo-experiencias">
          <div className={s.escolha}><h3 id="titulo-experiencias">Escolha o seu Head Spa</h3><p>Cada ritual tem seu tempo. Toque no nome para consultar a agenda com Laurieni.</p></div>
          <div className={s.rituais}>
            {experiencias.map(({ nome, minutos, detalhes }) => (
              <a key={nome} href={linkWhatsapp(clinica.telefoneEsteticaSpa, "Olá, Laurieni! Gostaria de consultar a agenda do Head Spa " + nome + " na Essência.")} aria-label={"Consultar Head Spa " + nome + " de " + minutos + " minutos com Laurieni no WhatsApp"}>
                <span className={s.ritualTopo}><strong>{nome}</strong><span>{minutos} min</span><ArrowUpRight size={16} aria-hidden="true" /></span>
                <p>{detalhes}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
      <section id="equipe" className={s.agenda} aria-labelledby="titulo-agenda">
        <div className={s.agendaTexto}>
          <h2 id="titulo-agenda">Agende com<br /> a sua profissional.</h2>
          <p>Escolha a área de atendimento para conversar sobre procedimentos, valores e horários pelo WhatsApp.</p>
          <a href={clinica.instagram} className={s.instagram}><InstagramIcon width={19} height={19} /> @essenciaclinicaestetica_</a>
        </div>
        <div className={s.contatos}>
          {profissionais.map(({ nome, area, numero }) => (
            <a key={numero} href={contato(nome, numero)} aria-label={"WhatsApp de " + nome + ", " + area + ", " + formatarTelefoneBr(numero)}>
              <span><small>{area}</small><strong>{nome}</strong></span>
              <span className={s.numero}><WhatsAppIcon className="h-4 w-4" fill="currentColor" /> {formatarTelefoneBr(numero)}</span>
              <ArrowUpRight size={20} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>
      <section className={s.visita} aria-labelledby="titulo-visita">
        <div className={s.mapa}>
          <a className={s.figuraMapa} href={clinica.waze} aria-label="Como chegar pelo Waze à Clínica Essência em Piracanjuba">
            <Image src={midia + "/mapa.webp"} alt="Mapa do Setor Aeroporto com marcador na localização da clínica" fill sizes="(max-width: 700px) 90vw, 45vw" />
            <span className={s.mapaFoto}><Navigation size={16} aria-hidden="true" /> Como chegar pelo Waze</span>
          </a>
          <a className={s.credito} href="https://www.openstreetmap.org/copyright">© colaboradores do OpenStreetMap</a>
        </div>
        <div className={s.endereco}>
          <h2 id="titulo-visita">Visite a Essência</h2>
          <address>{clinica.rua}<br />{clinica.bairro}, Piracanjuba, GO<br />CEP {clinica.cep}</address>
          <a className={s.link} href={clinica.mapa}>Ver no Google Maps <ArrowUpRight size={17} aria-hidden="true" /></a>
          <p>Para atendimento de <Link href="/quiropraxia">quiropraxia com Juan Carlos Mesquita</Link>, consulte a página do profissional.</p>
        </div>
      </section>
    </article>
  );
}
