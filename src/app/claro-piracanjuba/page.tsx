import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock3, MapPin, Phone, Smartphone, Tv, Wifi } from "lucide-react";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

const caminho = "/claro-piracanjuba";
const portal = "https://piracanjuba.ai";
const telefone = "5564992834030";
const rua = "Rua Dom Pedro II, 620";
const bairro = "Setor Central";
const mapa = "https://www.google.com/maps?cid=15981786211909156690";
const marca = "/empresas/claro-piracanjuba/claro.svg";
const imagem = "/empresas/claro-piracanjuba/compartilhar.jpg";
const mensagem = "Olá! Vi a página da Claro Piracanjuba no Piracanjuba.ai e gostaria de falar com a loja.";
const descricao = "Fale com a loja Claro em Piracanjuba pelo WhatsApp (64) 99283-4030. Consulte planos de celular, internet e TV. Veja o horário e como chegar à Rua Dom Pedro II, 620.";

export const metadata = pageMetadata({
  title: "Claro Piracanjuba: WhatsApp, planos e endereço",
  description: descricao,
  path: caminho,
  image: imagem,
  imageAlt: "Claro Piracanjuba, atendimento na Rua Dom Pedro II, 620",
});

const servicos = [
  { nome: "Celular", Icone: Smartphone, texto: "Compare a franquia de internet e os benefícios dos planos disponíveis para a sua linha.", assunto: "planos de celular" },
  { nome: "Internet para casa", Icone: Wifi, texto: "Informe seu endereço para consultar a cobertura de fibra e as velocidades disponíveis.", assunto: "cobertura de internet no meu endereço" },
  { nome: "TV", Icone: Tv, texto: "Converse sobre pacotes de canais, opções de TV e disponibilidade na sua região.", assunto: "opções de TV em Piracanjuba" },
];

const dados = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Store", "@id": portal + caminho + "#loja",
      name: "Claro Piracanjuba", url: portal + caminho, image: portal + imagem,
      telephone: "+" + telefone, hasMap: mapa, logo: portal + marca,
      address: { "@type": "PostalAddress", streetAddress: rua + ", " + bairro, addressLocality: "Piracanjuba", addressRegion: "GO", postalCode: "75640-000", addressCountry: "BR" },
      openingHours: ["Mo-Fr 08:00-18:00", "Sa 08:00-13:00"],
    },
    breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: "Claro Piracanjuba", path: caminho }]),
  ],
};

export default function ClaroPiracanjuba() {
  return (
    <article className={s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }} />
      <nav className={s.trilha} aria-label="Navegação do guia">
        <Link href="/zap-pba"><ArrowLeft size={15} />Guia Zap PBA</Link>
      </nav>

      <header className={s.capa}>
        <div className={s.intro}>
          <Image src={marca} alt="Claro" width={105} height={45} unoptimized />
          <h1><span className="sr-only">Claro </span>Piracanjuba</h1>
          <p>Planos de celular, internet e TV. Fale com a equipe da loja no Centro e consulte as opções para o seu endereço.</p>
          <a className={s.botaoClaro} href={linkWhatsapp(telefone, mensagem)}>
            <WhatsAppIcon fill="currentColor" />Falar com a loja
          </a>
        </div>
        <figure className={s.cidade}>
          <Image src="/historia/praca-do-relogio.jpg" alt="Torre do Relógio iluminada no Centro de Piracanjuba" fill sizes="(max-width: 640px) 100vw, 46vw" priority />
          <figcaption><MapPin size={14} />Torre do Relógio, Piracanjuba</figcaption>
        </figure>
      </header>

      <section className={s.servicos} aria-labelledby="servicos-claro">
        <h2 id="servicos-claro">O que você procura?</h2>
        <ul>
          {servicos.map(({ nome, Icone, texto, assunto }) => (
            <li key={nome}>
              <Icone className={s.iconeServico} size={28} aria-hidden="true" />
              <h3>{nome}</h3>
              <p>{texto}</p>
              <a href={linkWhatsapp(telefone, "Olá, Claro Piracanjuba! Gostaria de consultar " + assunto + ".")}
                aria-label={"Consultar " + assunto + " pelo WhatsApp da loja"}>
                Consultar no WhatsApp <ArrowUpRight size={16} />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.contato} aria-labelledby="atendimento-claro">
        <div>
          <h2 id="atendimento-claro">Atendimento na loja</h2>
          <a className={s.botaoMapa} href={mapa}><MapPin size={17} />Ver no Google Maps</a>
        </div>
        <dl>
          <div><dt><MapPin size={18} />Endereço</dt><dd><address>{rua}, {bairro}<br />Piracanjuba, GO</address></dd></div>
          <div><dt><Clock3 size={18} />Horários</dt><dd>Segunda a sexta, das 8h às 18h<br />Sábado, das 8h às 13h</dd></div>
          <div><dt><Phone size={18} />Telefone da loja</dt><dd><a href={"tel:+" + telefone}>{formatarTelefoneBr(telefone)}</a></dd></div>
        </dl>
      </section>
      <p className={s.gestao}><a href={linkWhatsapp(WHATSAPP_COMERCIAL, "Olá! Sou responsável pela Claro Piracanjuba e gostaria de solicitar um ajuste ou a retirada da ficha " + portal + caminho)}>Solicitar correção ou retirada da ficha ao Piracanjuba.ai</a></p>
    </article>
  );
}
