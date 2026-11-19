import Image from "next/image";
import localFont from "next/font/local";
import { ArrowDown, ArrowUpRight, Clock3, MapPin, Phone } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { PACIFICO_SIQUEIRA as escritorio } from "@/data/pacifico-siqueira";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

const tipografia = localFont({ src: "./fontes/fraunces.woff2", display: "swap", weight: "400 600", variable: "--fonte-escritorio" });
const portal = "https://piracanjuba.ai";
const url = portal + escritorio.path;
const marca = "/empresas/pacifico-siqueira/marca.webp";
const resumo = "Conheça a Pacífico Siqueira Advocacia em Piracanjuba. Consulte as áreas de atuação, os advogados, o endereço do escritório e o WhatsApp para agendar.";
const whatsapp = linkWhatsapp(escritorio.telefone, "Olá! Encontrei a Pacífico Siqueira Advocacia pelo Piracanjuba.ai e gostaria de agendar uma conversa.");

const contatoPortal = linkWhatsapp(WHATSAPP_COMERCIAL, `Olá, equipe do Piracanjuba.ai! Sou responsável por ${escritorio.nome} e gostaria de tratar da personalização, do ajuste ou da remoção desta página: ${url}`);

export const metadata = pageMetadata({
  title: "Pacífico Siqueira Advocacia em Piracanjuba (GO)",
  description: resumo,
  path: escritorio.path,
  image: escritorio.imagem,
  imageAlt: "Identidade da Pacífico Siqueira Advocacia, em Piracanjuba",
});

const { rua, bairro, cidade, estado, cep } = escritorio.endereco;
const esquema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage", "@id": url + "#pagina", url, name: escritorio.nome,
      inLanguage: "pt-BR", isPartOf: { "@id": portal + "/#website" },
      mainEntity: { "@id": url + "#escritorio" }, breadcrumb: { "@id": url + "#navegacao" },
    },
    {
      "@type": "LegalService", "@id": url + "#escritorio", name: escritorio.nome,
      legalName: escritorio.razaoSocial, url: escritorio.site, mainEntityOfPage: { "@id": url + "#pagina" },
      identifier: { "@type": "PropertyValue", propertyID: "OAB/GO", value: escritorio.registro },
      logo: portal + marca, image: portal + escritorio.imagem,
      telephone: "+" + escritorio.telefone, hasMap: escritorio.mapa, sameAs: [escritorio.instagram],
      address: { "@type": "PostalAddress", streetAddress: rua + ", " + bairro, addressLocality: cidade,
        addressRegion: estado, postalCode: cep, addressCountry: "BR" },
      openingHoursSpecification: [{ "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00", closes: "17:00" }],
      employee: escritorio.equipe.map((p) => ({ "@type": "Person", name: p.nome, url: p.perfil,
        jobTitle: "Advogado", image: portal + p.foto,
        identifier: { "@type": "PropertyValue", propertyID: "OAB/GO", value: p.oab } })),
    },
    { ...breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" },
      { name: escritorio.nome, path: escritorio.path }]), "@id": url + "#navegacao" },
  ],
};

export default function PacificoSiqueira() {
  return (
    <article className={tipografia.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />
      <header className={s.capa}>
        <div className={s.capaInterna}>
          <div className={s.apresentacao}>
            <div className={s.identidade}>
              <Image src={marca} alt="Brasão da Pacífico Siqueira" width={54} height={54} />
              <span>Piracanjuba, Goiás</span>
            </div>
            <h1>Pacífico Siqueira <span>Advocacia</span></h1>
            <p>Orientação jurídica para famílias, produtores rurais e empresas. Os advogados recebem com hora marcada no Centro de Piracanjuba e também atendem por vídeo.</p>
            <div className={s.acoes}>
              <a className={s.botao} href={whatsapp}><WhatsAppIcon fill="currentColor" />Agendar pelo WhatsApp</a>
              <a className={s.atalho} href="#atendimento">Ver endereço <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <section className={s.socios} aria-label="Advogados do escritório">
            {escritorio.equipe.map((p, i) => (
              <a className={s.retrato} key={p.oab} href={p.perfil}>
                <Image src={p.foto} alt={"Retrato de " + p.nome} width={1200} height={1499}
                  loading="eager" fetchPriority={i === 0 ? "high" : undefined}
                  sizes="(max-width: 700px) 45vw, (max-width: 1200px) 23vw, 270px" />
                <div><strong>{p.nome}</strong><span>OAB/GO {p.oab} <ArrowUpRight size={15} aria-hidden="true" /></span></div>
              </a>
            ))}
          </section>
        </div>
      </header>

      <section className={s.atuacao} aria-labelledby="atuacao">
        <div className={s.intro}>
          <h2 id="atuacao">Áreas de atuação</h2>
          <p>O escritório orienta clientes antes da assinatura de documentos, em negociações e quando precisam ingressar com uma ação ou apresentar defesa.</p>
          <a className={s.institucional} href={escritorio.site}>Site do escritório <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
        <ul className={s.lista}>
          {escritorio.areas.map((a) => (
            <li key={a.slug}><a href={escritorio.site + "areas/" + a.slug}>
              <div><strong>{a.titulo}</strong><p>{a.resumo}</p></div><ArrowUpRight size={19} aria-hidden="true" />
            </a></li>
          ))}
        </ul>
      </section>

      <section id="atendimento" className={s.atendimento} aria-labelledby="contato">
        <div className={s.contatoInterno}>
          <div className={s.contatoTitulo}>
            <h2 id="contato">Atendimento no Centro de Piracanjuba</h2>
            <p>Para marcar a primeira conversa, informe o assunto pelo WhatsApp e combine o horário com a equipe.</p>
          </div>
          <dl className={s.informacoes}>
            <div><dt><MapPin size={19} aria-hidden="true" />Endereço</dt>
              <dd><address>{rua}, {bairro}<br />{cidade}, {estado} · CEP {cep}</address>
                <p>Recepção no térreo. Escritório no 1º andar.</p>
                <a href={escritorio.mapa}>Abrir no Google Maps <ArrowUpRight size={15} aria-hidden="true" /></a></dd></div>
            <div><dt><Clock3 size={19} aria-hidden="true" />Horário</dt><dd>{escritorio.horario}</dd></div>
            <div><dt><Phone size={19} aria-hidden="true" />WhatsApp</dt>
              <dd><a href={whatsapp}>{escritorio.telefoneFormatado} <ArrowUpRight size={15} aria-hidden="true" /></a></dd></div>
          </dl>
        </div>
        <p className={s.registro}>{escritorio.razaoSocial} <span>·</span> OAB/GO {escritorio.registro}</p>
      </section>
      <aside className={s.gestaoInterna} aria-label="Gestão da página pelo escritório">
        <span>Representa o escritório?</span>
        <a href={contatoPortal}>Solicitar personalização, ajuste ou remoção ao Piracanjuba.ai</a>
      </aside>
    </article>
  );
}
