import Image from "next/image";
import localFont from "next/font/local";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MapPin, Phone } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { previaPorSlug } from "@/data/previas-zap";
import { SITE_URL } from "@/lib/empresas-schema";
import { breadcrumbJsonLd, pageMetadata, SCHEMA_IDS } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

const serifa = localFont({ src: "../[slug]/fontes/DMSerifText-Regular.ttf", variable: "--wennder-serifa", display: "swap" });

const slug = "wennder-trindade-advogado";
const caminho = "/zap-pba/" + slug;
const url = SITE_URL + caminho;
const ficha = previaPorSlug.get(slug)!;
const nomeCompleto = "Wennder Trindade e Silva";
const registro = "51.422";
const fixo = "556434055654";
const celular = ficha.telefones[0];
const whatsapp = linkWhatsapp(celular, ficha.mensagem);
const suporte = linkWhatsapp(WHATSAPP_COMERCIAL, "Olá! Gostaria de solicitar um ajuste ou a remoção da página " + url);
const cna = "https://cna.oab.org.br/";
const titulo = "Advogado em Piracanjuba (GO) | Wennder Trindade";
const descricao = "Wennder Trindade, advogado em Piracanjuba, GO, OAB/GO 51.422. Divórcio, pensão, herança, cobranças e defesa criminal. Consulte horários pelo WhatsApp.";

const areas = [
  {
    nome: "Direito de família",
    descricao: "Divórcio consensual, guarda, convivência com os filhos e pensão alimentícia. Se já houver um acordo ou decisão judicial, tenha uma cópia para a primeira conversa.",
  },
  {
    nome: "Sucessões e partilha",
    descricao: "Arrolamento de bens e partilha de herança. Uma relação dos bens deixados e dos documentos já disponíveis ajuda a preparar a consulta.",
  },
  {
    nome: "Direito do consumidor",
    descricao: "Cobranças bancárias, empréstimos consignados e problemas com serviços de telefonia. Separe as faturas, os extratos e os protocolos relacionados à cobrança.",
  },
  {
    nome: "Direito civil e cobranças",
    descricao: "Cobrança de dívidas e execução de títulos. Contratos, recibos e comprovantes ajudam a esclarecer o valor combinado, o vencimento e o que já foi pago.",
  },
  {
    nome: "Direito criminal",
    descricao: "Defesa em ações penais e pedidos de habeas corpus. Ao consultar o escritório, informe se recebeu uma intimação ou se há audiência marcada.",
  },
  {
    nome: "Direito administrativo",
    descricao: "Diferenças de remuneração de servidores públicos, incluindo o piso salarial do magistério. Tenha em mãos os contracheques do período sobre o qual deseja conversar.",
  },
];

export const metadata = pageMetadata({
  title: titulo, description: descricao, path: caminho,
  image: "/marcas-zap/compartilhar/" + slug + ".jpg?v=2",
  imageAlt: "Wennder Trindade, advogado em Piracanjuba, OAB/GO 51.422",
});

const esquema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage", "@id": url, url, name: titulo, description: descricao, inLanguage: "pt-BR",
      isPartOf: { "@id": SCHEMA_IDS.site }, publisher: { "@id": SCHEMA_IDS.org },
      mainEntity: { "@id": url + "#advogado" }, breadcrumb: { "@id": url + "#navegacao" },
    },
    {
      "@type": "Person", "@id": url + "#advogado", name: nomeCompleto, alternateName: ficha.nome,
      jobTitle: "Advogado", image: SITE_URL + ficha.foto,
      knowsAbout: areas.map((area) => area.nome),
      identifier: { "@type": "PropertyValue", propertyID: "OAB/GO", value: registro },
      birthPlace: { "@type": "City", name: "Piracanjuba" }, workLocation: { "@id": url + "#escritorio" },
    },
    {
      "@type": "LegalService", "@id": url + "#escritorio", name: ficha.nome, url,
      areaServed: { "@type": "City", name: "Piracanjuba", address: { "@type": "PostalAddress", addressRegion: "GO", addressCountry: "BR" } },
      telephone: "+" + fixo, hasMap: ficha.mapa, employee: { "@id": url + "#advogado" },
      address: { "@type": "PostalAddress", addressLocality: "Piracanjuba", addressRegion: "GO", addressCountry: "BR" },
      contactPoint: { "@type": "ContactPoint", contactType: "Agendamento", telephone: "+" + celular, url: linkWhatsapp(celular) },
    },
    {
      ...breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Guia Zap PBA", path: "/zap-pba" }, { name: ficha.nome, path: caminho }]),
      "@id": url + "#navegacao",
    },
  ],
};

export default function WennderTrindade() {
  return (
    <article className={serifa.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />
      <header className={s.capa}>
        <div className={s.largura}>
          <nav className={s.navegacao} aria-label="Navegação do perfil">
            <Link href="/zap-pba" prefetch={false}><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
            <div><a href="#areas">Áreas</a><a href="#perfil">Perfil</a><a href="#contato">Contato</a></div>
          </nav>
          <div className={s.apresentacao}>
            <div className={s.identidade}>
              <p className={s.registro}>OAB/GO {registro}</p>
              <h1>Wennder <em>Trindade</em></h1>
              <p className={s.tituloProfissional}>Advogado em Piracanjuba, Goiás.</p>
              <div className={s.acoes}>
                <a className={s.botao} href={whatsapp}><WhatsAppIcon fill="currentColor" /> Consultar horários</a>
                <a className={s.linkCapa} href="#contato"><MapPin size={16} aria-hidden="true" /> Localização</a>
              </div>
            </div>
            <div className={s.retrato}>
              <Image src={ficha.foto!} alt={ficha.fotoAlt!} width={888} height={1280}
                sizes="(max-width: 680px) calc(100vw - 52px), (max-width: 1100px) 40vw, 418px" preload />
            </div>
          </div>
        </div>
      </header>

      <section className={s.areas} id="areas" aria-labelledby="titulo-areas">
        <div className={s.largura}>
          <h2 id="titulo-areas">Áreas de atuação</h2>
          <ul className={s.listaAreas}>
            {areas.map((area) => (
              <li key={area.nome}>
                <h3>{area.nome}</h3>
                <p>{area.descricao}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className={s.largura + " " + s.informacoes}>
        <section className={s.perfil} id="perfil" aria-labelledby="titulo-perfil">
          <h2 id="titulo-perfil">Trajetória profissional</h2>
          <p><strong>{nomeCompleto}</strong> nasceu em Piracanjuba, onde exerce a advocacia. Em 2017, foi aprovado no <a className={s.fonte} href="https://s.oab.org.br/arquivos/2017/10/resultado-definitivo-2-fase-geral.pdf#page=16">XXIII Exame de Ordem Unificado</a>.</p>
          <p>Inscrito na OAB Goiás sob o número {registro}, integra a Subseção de Piracanjuba. Para consultar seu cadastro, pesquise pelo nome completo ou pelo número da inscrição e selecione Goiás.</p>
          <a className={s.linkTexto} href={cna}>Consultar inscrição na OAB <ArrowUpRight size={16} aria-hidden="true" /></a>
        </section>

        <section className={s.contato} id="contato" aria-labelledby="titulo-contato">
          <h2 id="titulo-contato">Contato e localização</h2>
          <dl>
            <div>
              <dt><WhatsAppIcon fill="currentColor" /> WhatsApp</dt>
              <dd><a href={whatsapp}>{formatarTelefoneBr(celular)} <ArrowUpRight size={15} aria-hidden="true" /></a></dd>
            </div>
            <div>
              <dt><Phone size={16} aria-hidden="true" /> Telefone fixo</dt>
              <dd><a href={"tel:+" + fixo}>{formatarTelefoneBr(fixo)}</a></dd>
            </div>
            <div className={s.endereco}>
              <dt><MapPin size={17} aria-hidden="true" /> Escritório</dt>
              <dd>{ficha.endereco}
                <p>Confirme o horário e o número do imóvel pelo WhatsApp antes da visita.</p>
                <a className={s.linkTexto} href={ficha.mapa}>Ver no Google Maps <ArrowUpRight size={14} aria-hidden="true" /></a>
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <div className={s.rodape}>
        <div className={s.largura}>
          <span>Guia de profissionais de Piracanjuba</span>
          <a href={suporte}>Solicitar ajuste ou remoção <ArrowUpRight size={13} aria-hidden="true" /></a>
        </div>
      </div>
    </article>
  );
}
