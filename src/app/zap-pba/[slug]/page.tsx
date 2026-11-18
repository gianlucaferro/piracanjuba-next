import Image from "next/image";
import localFont from "next/font/local";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, ChevronLeft, Globe, MapPin, Phone } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { previas, previaPorSlug } from "@/data/previas-zap";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import { pageMetadata } from "@/lib/seo";
import { estiloDaCategoria } from "./categorias";
import css from "./previa.module.css";

export const dynamicParams = false;

const titulo = localFont({ src: "./fontes/DMSerifText-Regular.ttf", variable: "--fonte-previa", display: "swap" });

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return previas.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ficha = previaPorSlug.get(slug);
  if (!ficha) return {};
  return pageMetadata({
    title: ficha.nome + " em Piracanjuba",
    description: ficha.apresentacao,
    path: "/zap-pba/" + slug,
    image: "/marcas-zap/compartilhar/" + slug + ".jpg",
    imageAlt: ficha.nome + " em Piracanjuba, GO",
    noIndex: true,
  });
}

export default async function PreviaEmpresa({ params }: Props) {
  const { slug } = await params;
  const ficha = previaPorSlug.get(slug);
  if (!ficha) notFound();
  const { nome, categoria, apresentacao, telefones } = ficha;
  const { cor, Icone, acao, pergunta } = estiloDaCategoria(ficha.setor);
  const contato = linkWhatsapp(telefones[0], pergunta);
  const suporte = linkWhatsapp(WHATSAPP_COMERCIAL, "Olá! Sou responsável pela página em https://piracanjuba.ai/zap-pba/" + slug);
  const estilo = { "--tinta": ficha.cor ?? cor } as CSSProperties;
  return (
    <article className={[css.pagina, titulo.variable].join(" ")} style={estilo}>
      <div className={css.miolo}>
        <div className={css.topo}>
          <Link href="/zap-pba"><ChevronLeft size={15} /> Zap PBA</Link>
          <span><MapPin size={14} /> Piracanjuba, GO</span>
        </div>
        <header className={css.capa}>
          <div className={css.texto}>
            <p className={css.categoria}><Icone size={17} />{categoria}</p>
            <h1>{nome}</h1>
            <p className={css.apresentacao}>{apresentacao}</p>
            <a className={css.botao} href={contato}>
              <WhatsAppIcon className={css.zap} fill="currentColor" />{acao}<ArrowUpRight size={17} />
            </a>
          </div>
          <div className={[css.cartaz, ficha.fotoAlt ? css.retrato : ""].join(" ")}>
            <Image src={ficha.foto ?? "/historia/praca-do-relogio.jpg"} alt={ficha.fotoAlt ?? ""} fill priority sizes="(max-width: 650px) 100vw, 35vw" className={css.foto} />
            {ficha.logo && (
              <div className={css.marca}>
                <Image src={ficha.logo} alt={"Logo de " + nome} width={240} height={240} priority unoptimized />
              </div>
            )}
            {!ficha.foto && <span className={css.local}><MapPin size={13} /> Praça do Relógio, Piracanjuba</span>}
          </div>
        </header>
        {ficha.oferta && <section className={css.oferta} aria-labelledby="oferta">
          <h2 id="oferta">Produtos e serviços</h2>
          <ul>{ficha.oferta.map((produto) => <li key={produto}>{produto}</li>)}</ul>
        </section>}
        <section className={css.contatos} aria-labelledby="contatos">
          <h2 id="contatos">Contato e localização</h2>
          <div className={css.grade}>
            <div className={css.item}>
              <Phone aria-hidden="true" /><div><h3>{ficha.contatoRede ? "WhatsApp da rede" : "WhatsApp"}</h3>
                {telefones.map((numero) => <a className={css.linha} key={numero} href={linkWhatsapp(numero)}>{formatarTelefoneBr(numero)}<ArrowUpRight size={14} /></a>)}
              </div>
            </div>
            <div className={css.item}>
              <MapPin aria-hidden="true" /><div><h3>{ficha.endereco ? "Endereço" : "Localidade"}</h3>
                <p>{ficha.endereco || "Piracanjuba, Goiás"}</p>
                {ficha.mapa && <a className={css.secundario} href={ficha.mapa}>Como chegar<ArrowUpRight size={14} /></a>}
              </div>
            </div>
            {(ficha.instagram || ficha.site || ficha.facebook) && <div className={css.item}>
              {ficha.instagram ? <InstagramIcon /> : <Globe aria-hidden="true" />}<div><h3>Na internet</h3>
                {ficha.instagram && <a className={css.linha} href={ficha.instagram}>{ficha.instagramRede ? "Instagram da rede" : "Instagram"}<ArrowUpRight size={14} /></a>}
                {ficha.site && <a className={css.linha} href={ficha.site}>{ficha.siteRotulo ?? (ficha.siteRede ? "Site da rede" : "Site da empresa")}<ArrowUpRight size={14} /></a>}
                {ficha.facebook && <a className={css.linha} href={ficha.facebook}>Facebook<ArrowUpRight size={14} /></a>}
              </div>
            </div>}
          </div>
        </section>
        <footer className={css.rodape}>
          <span>Prévia de página criada pelo Piracanjuba.ai.</span>
          <a href={suporte}>Solicitar ajuste ou remoção<ArrowRight size={15} /></a>
        </footer>
      </div>
    </article>
  );
}
