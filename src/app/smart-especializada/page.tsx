import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, BatteryCharging, Cable, Clock3, MapPin, Smartphone } from "lucide-react";
import BarraWhatsappEmpresa from "@/components/empresas/BarraWhatsappEmpresa";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

const site = "https://piracanjuba.ai";
const marca = "Smart Especializada";
const caminho = "/smart-especializada";
const url = site + caminho;
const pasta = "/empresas/smart-especializada";
const telefone = "5564993421774";
const instagram = "https://www.instagram.com/smartespecializada/";
const mapa = "https://www.google.com/maps?cid=11080508567231164470";
const rua = "Rua Dr. Ruy Brasil Cavalcante, 240";
const cep = "75640-122";
const titulo = "Loja de celular e conserto em Piracanjuba | Smart Especializada";
const descricao = "Loja de celular em Piracanjuba com aparelhos novos e seminovos, acessórios e conserto de celular. Consulte modelos ou peça um orçamento à Smart Especializada.";
const compra = linkWhatsapp(telefone, "Olá, Smart! Vi a loja no Piracanjuba.ai. Quais celulares novos e seminovos vocês têm disponíveis?");
const orcamento = linkWhatsapp(telefone, "Olá, Smart! Gostaria de um orçamento para conserto de celular. Vou informar o modelo e o que aconteceu.");
const contato = linkWhatsapp(telefone, "Olá, Smart! Encontrei a loja no Piracanjuba.ai e gostaria de falar com a equipe.");
const correcao = linkWhatsapp(WHATSAPP_COMERCIAL, "Sou responsável pela Smart Especializada. Gostaria de solicitar um ajuste ou a retirada da ficha " + url);

const reparos = [
  { icone: Smartphone, nome: "Tela e vidro", texto: "Se a tela trincou, ficou com manchas ou perdeu o toque, envie o modelo e uma foto. A Smart informa as opções de troca e as condições da garantia por escrito." },
  { icone: BatteryCharging, nome: "Bateria", texto: "O celular descarrega rápido ou desliga sozinho? Descreva o que acontece para a assistência avaliar a bateria e consultar a peça compatível." },
  { icone: Cable, nome: "Conector de carga", texto: "Se o cabo só funciona em uma posição ou o celular parou de carregar, peça uma avaliação do conector antes de decidir pela troca." },
];

const social = { url: site + pasta + "/compartilhar.jpg", width: 1200, height: 630, alt: "Smart Especializada, celulares e assistência técnica em Piracanjuba" };
const base = pageMetadata({ title: titulo, description: descricao, path: caminho, image: social.url, imageAlt: social.alt });
export const metadata: Metadata = {
  ...base, title: { absolute: titulo },
  openGraph: { ...base.openGraph, images: [social] },
  twitter: { ...base.twitter, card: "summary_large_image", images: [social] },
};

const lojaId = url + "#loja";
const reparoId = url + "#conserto";
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": url + "#pagina", url, name: titulo, description: descricao, inLanguage: "pt-BR",
      isPartOf: { "@id": site + "/#website" }, mainEntity: { "@id": lojaId }, about: [{ "@id": lojaId }, { "@id": reparoId }],
      breadcrumb: { "@id": url + "#navegacao" } },
    { "@type": "MobilePhoneStore", "@id": lojaId, name: marca, url, telephone: "+" + telefone,
      mainEntityOfPage: { "@id": url + "#pagina" }, description: descricao,
      logo: site + pasta + "/smart-especializada.png", image: [site + pasta + "/fachada.webp", site + pasta + "/interior.webp"],
      address: { "@type": "PostalAddress", streetAddress: rua + ", Quadra 24, lote 11-A, Setor Central", addressLocality: "Piracanjuba", addressRegion: "GO", postalCode: cep, addressCountry: "BR" },
      geo: { "@type": "GeoCoordinates", latitude: -17.305013, longitude: -49.024598 }, hasMap: mapa, sameAs: [instagram],
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"], opens: "08:00", closes: "18:30" },
        { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "13:00" },
      ] },
    { "@type": "Service", "@id": reparoId, name: "Conserto de celular em Piracanjuba", serviceType: "Assistência técnica de celulares",
      areaServed: "Piracanjuba, GO", provider: { "@id": lojaId }, url: url + "#conserto" },
    { ...breadcrumbJsonLd([{ name: "Piracanjuba.ai", path: "/" }, { name: "Guia Zap PBA", path: "/zap-pba" }, { name: marca, path: caminho }]), "@id": url + "#navegacao" },
  ],
};

export default function SmartEspecializada() {
  return <article className={s.pagina} aria-label={marca}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <div className={s.escuro}>
      <div className={s.largura}>
        <header className={s.cabecalho}>
          <Image src={pasta + "/logo.webp"} width={1030} height={508} sizes="132px" loading="eager" alt={marca} className={s.logo} />
          <nav aria-label="Navegação da Smart Especializada">
            <a href="#celulares">Celulares</a><a href="#conserto">Assistência técnica</a><a href="#loja">A loja</a>
          </nav>
          <a href={instagram} className={s.rede} aria-label="Instagram da Smart Especializada"><InstagramIcon width={18} height={18} /> <span>Instagram</span></a>
        </header>
        <section className={s.hero} aria-labelledby="smart-titulo">
          <Image src={pasta + "/celulares.webp"} width={1380} height={920} alt="" loading="eager" fetchPriority="high" sizes="(max-width: 680px) 100vw, (max-width: 1150px) 70vw, 790px" className={s.produto} />
          <div className={s.heroTexto}>
            <p className={s.local}><MapPin size={16} aria-hidden="true" /> Setor Central, Piracanjuba</p>
            <h1 id="smart-titulo">Loja de celular<br />em <em>Piracanjuba.</em></h1>
            <p className={s.chamada}>Na Smart Especializada você encontra smartphones novos e seminovos, acessórios e assistência técnica para o seu aparelho.</p>
            <div className={s.acoes}>
              <a className={s.primario} id="smart-whatsapp" href={compra}><WhatsAppIcon fill="currentColor" /> Consultar celulares</a>
              <a className={s.secundario} href="#conserto">Preciso de conserto <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      </div>
    </div>
    <section id="conserto" className={s.assistencia} aria-labelledby="smart-reparos">
      <div className={s.largura}>
        <div className={s.secaoTopo}>
          <div><p className={s.sobrelinha}>Assistência técnica</p><h2 id="smart-reparos">Conserto de celular<br />em Piracanjuba</h2></div>
          <p>Informe o modelo e o defeito pelo WhatsApp. A equipe orienta sobre a avaliação e confirma o orçamento para o seu aparelho.</p>
        </div>
        <div className={s.reparos}>
          {reparos.map(({ icone: Icone, nome, texto }) => <div key={nome}>
            <span className={s.icone}><Icone size={26} strokeWidth={1.6} aria-hidden="true" /></span>
            <h3>{nome}</h3><p>{texto}</p>
          </div>)}
        </div>
        <a className={s.linkEscuro} href={orcamento}>Pedir orçamento de conserto <ArrowUpRight size={17} aria-hidden="true" /></a>
      </div>
    </section>
    <section id="celulares" className={s.vitrine} aria-labelledby="smart-modelos">
      <div className={s.vitrineGrade}>
        <Image src={pasta + "/interior.webp"} width={1600} height={900} sizes="(max-width: 700px) 100vw, 48vw" alt="Balcão de atendimento da Smart Especializada com a marca na parede e exposição de capas para celular" />
        <div className={s.vitrineTexto}><p className={s.sobrelinha}>Celulares e acessórios</p><h2 id="smart-modelos">Novos e seminovos</h2>
          <p>Quer trocar de celular? Consulte os modelos disponíveis e compare as opções. Nos seminovos, a Smart divulga a checagem de IMEI e bateria, nota fiscal e garantia por escrito.</p>
          <p>Para o aparelho que você já tem, a loja também oferece capas, películas e carregadores. Envie o modelo para verificar a compatibilidade.</p>
          <a className={s.primario} href={compra}>Consultar disponibilidade <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
    <section id="loja" className={s.visita} aria-labelledby="smart-visita">
      <div className={s.largura}>
        <p className={s.sobrelinha}>Atendimento presencial</p><h2 id="smart-visita">Visite a Smart Especializada</h2>
        <div className={s.visitaGrade}>
          <div className={s.dados}>
            <div><MapPin aria-hidden="true" /><div><h3>Endereço</h3><p>{rua}, quadra 24, lote 11-A<br />Setor Central, Piracanjuba, GO · CEP {cep}</p>
              <a href={mapa}>Traçar rota no Google Maps <ArrowUpRight size={15} aria-hidden="true" /></a></div></div>
            <div><Clock3 aria-hidden="true" /><div><h3>Horário</h3><p>Segunda a sexta, das 8h às 18h30<br />Sábado, das 9h às 13h · Domingo fechado</p></div></div>
            <div><WhatsAppIcon fill="currentColor" /><div><h3>WhatsApp da loja</h3><a href={contato}>{formatarTelefoneBr(telefone)}</a></div></div>
          </div>
          <Image src={pasta + "/fachada.webp"} width={1280} height={962} sizes="(max-width: 700px) 100vw, 48vw" alt="Entrada da Smart Especializada em Piracanjuba com letreiro preto e amarelo na fachada" />
        </div>
        <div className={s.rodape}><Link href="/zap-pba"><ArrowLeft size={16} aria-hidden="true" /> Guia Zap PBA</Link><a href={correcao}>Solicitar correção ou retirada da ficha</a></div>
      </div>
    </section>
    <BarraWhatsappEmpresa alvoId="smart-whatsapp"><a className={s.barraBotao} href={contato}><WhatsAppIcon fill="currentColor" /> Falar com a Smart</a></BarraWhatsappEmpresa>
    <noscript><style>{"[data-barra-empresa]{translate:none;transform:none}"}</style></noscript>
  </article>;
}
