import Image from "next/image";
import localFont from "next/font/local";
import { ArrowDown, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import { pageMetadata } from "@/lib/seo";
import s from "./pagina.module.css";

const titulo = localFont({
  src: [
    { path: "./fontes/barlow-condensed-bold.woff2", weight: "700", style: "normal" },
    { path: "./fontes/barlow-condensed-bold-italic.woff2", weight: "700", style: "italic" },
  ],
  display: "swap",
  variable: "--agro-titulo",
});

const midia = "/empresas/agro-franca";
const instagram = "https://www.instagram.com/grupoagrofranca/";
const safra = instagram + "reel/DeHg2qfp9z4/";
const encontro = instagram + "p/DeznOIhpi9a/";
const palestrantes = instagram + "p/Dfp94isJJhs/";
const origemPrevia = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

export const metadata = pageMetadata({
  title: "Grupo Agro França em Piracanjuba, Goiás",
  description: "Conheça a produção de soja do Grupo Agro França em Piracanjuba, a safra 2026/2027 e o 5º Encontro Técnico Agro França.",
  path: "/agro-franca",
  image: origemPrevia + midia + "/campo.webp",
  imageAlt: "Colheita de milho no Pivô 1 da Fazenda Agro França em Piracanjuba",
});

export default function AgroFranca() {
  return (
    <article className={`${s.pagina} ${titulo.variable}`}>
      <div className={s.marcaBarra}>
        <div className={`${s.miolo} ${s.marcaMiolo}`}>
          <Image className={s.marca} src={midia + "/logo.webp"} width={268} height={112} alt="Grupo Agro França" />
          <nav className={s.nav} aria-label="Agro França">
            <a className={s.linkSecao} href="#producao">A produção</a>
            <a className={s.linkSecao} href="#encontro">Encontro técnico</a>
            <a className={s.perfil} href={instagram}><InstagramIcon width={17} height={17} aria-hidden="true" /> Instagram <ArrowUpRight size={15} aria-hidden="true" /></a>
          </nav>
        </div>
      </div>

      <header className={s.capa}>
        <Image className={s.fotoCapa} src={midia + "/campo.webp"} alt="Colheitadeira e trator lado a lado na colheita de milho do Pivô 1 da Fazenda Agro França" fill sizes="100vw" preload />
        <div className={s.sombra} />
        <div className={`${s.miolo} ${s.capaMiolo}`}>
          <p className={s.local}><MapPin size={16} aria-hidden="true" /> Piracanjuba, Goiás</p>
          <h1><span className="sr-only">Grupo Agro França. </span>Produzindo<br />alimentos<br /><em>desde 1977.</em></h1>
          <a className={s.acaoCapa} href="#producao">Conheça a produção <ArrowDown size={17} aria-hidden="true" /></a>
        </div>
      </header>

      <section className={`${s.miolo} ${s.producao}`} id="producao" aria-labelledby="titulo-producao">
        <div className={s.textoSafra}>
          <p className={s.sobretitulo}>Safra 2026/2027</p>
          <h2 id="titulo-producao">O cultivo da soja.</h2>
          <p>Além do milho, o grupo cultiva soja em Piracanjuba. Na safra 2026/2027, a fazenda combina áreas irrigadas e lavouras de sequeiro, que dependem das chuvas.</p>
          <dl className={s.numeros}>
            <div><dt>Área plantada</dt><dd><small>Mais de</small><strong>1.000 <abbr title="hectares">ha</abbr></strong></dd></div>
            <div><dt>Área irrigada</dt><dd><small>Cerca de</small><strong>400 <abbr title="hectares">ha</abbr></strong></dd></div>
          </dl>
          <a className={s.linkTexto} href={safra}>Assista ao relato de Virgínio França <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
        <figure className={s.figura}>
          <div className={s.moldura}><Image src={midia + "/producao.webp"} fill sizes="(max-width: 760px) 90vw, 44vw" alt="Tratores na lavoura e reservatório ao fundo durante o plantio na Fazenda Agro França" /></div>
          <figcaption>Plantio da vitrine tecnológica <span>Piracanjuba, GO</span></figcaption>
        </figure>
      </section>

      <section className={s.evento} id="encontro" aria-labelledby="titulo-encontro">
        <div className={`${s.miolo} ${s.eventoMiolo}`}>
          <div className={s.textoEvento}>
            <p className={s.sobretitulo}><CalendarDays size={17} aria-hidden="true" /><time dateTime="2027-01-28">28 de janeiro de 2027</time></p>
            <h2 id="titulo-encontro">5º Encontro Técnico<br /><em>Agro França.</em></h2>
            <p>Piracanjuba recebe Ronaty Makuko, Matheus Pereira e Cristiano Palavro, da Pátria Agronegócios, como palestrantes da quinta edição.</p>
            <a className={s.acaoEvento} href={palestrantes}>Conheça os palestrantes <ArrowUpRight size={18} aria-hidden="true" /></a>
          </div>
          <a className={s.cartaz} href={encontro} aria-label="Abrir o cartaz oficial do 5º Encontro Técnico Agro França no Instagram">
            <Image src={midia + "/encontro.webp"} width={640} height={800} sizes="(max-width: 760px) 75vw, 320px" alt="Cartaz do 5º Encontro Técnico Agro França em Piracanjuba" />
          </a>
        </div>
      </section>

      <section className={`${s.miolo} ${s.contato}`} aria-labelledby="titulo-contato">
        <div><p className={s.sobretitulo}>Contato</p><h2 id="titulo-contato">Fale com o grupo.</h2></div>
        <a className={s.contatoPerfil} href={instagram}><InstagramIcon width={23} height={23} aria-hidden="true" /><span>@grupoagrofranca</span><ArrowUpRight size={20} aria-hidden="true" /></a>
      </section>
    </article>
  );
}
