import Image from "next/image";
import localFont from "next/font/local";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Globe, MapPin, Navigation, Phone } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { previas, previaPorSlug } from "@/data/previas-zap";
import { jsonLdFichaZap, metadadosFichaZap } from "@/lib/seo-zap";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
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
  return ficha ? metadadosFichaZap(ficha) : {};
}

function palavras(texto: string) {
  return " " + texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() + " ";
}

export default async function PreviaEmpresa({ params }: Props) {
  const { slug } = await params;
  const ficha = previaPorSlug.get(slug);
  if (!ficha) notFound();

  const { nome, atividade, resumo, detalhe, telefones, foto, fotoAlt, logo } = ficha;
  const { cor, Icone, composicao, pergunta } = estiloDaCategoria(ficha.setor);
  const contato = linkWhatsapp(telefones[0], ficha.mensagem ?? pergunta ?? "Olá! Encontrei seu contato no Piracanjuba.ai e gostaria de mais informações.");
  const urlPublica = "https://piracanjuba.ai/zap-pba/" + slug;
  const personalizar = linkWhatsapp(WHATSAPP_COMERCIAL, `Olá, equipe do Piracanjuba.ai! Sou responsável por ${nome} e gostaria de saber como personalizar esta página: ${urlPublica}`);
  const suporte = linkWhatsapp(WHATSAPP_COMERCIAL, "Olá! Sou responsável pela página em " + urlPublica);
  const estilo = { "--tinta": ficha.cor ?? cor } as CSSProperties;
  const redes = ficha.instagram || ficha.site || ficha.facebook;
  const local = ficha.endereco || ficha.mapa;
  const textoDaFicha = palavras([atividade, resumo, detalhe].filter(Boolean).join(". "));
  const ofertas = ficha.oferta?.filter((item) => !textoDaFicha.includes(palavras(item)));
  const temOfertas = Boolean(ofertas?.length);

  return (
    <article className={[css.pagina, titulo.variable].join(" ")} data-composicao={composicao} style={estilo}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdFichaZap(ficha) }} />
      <div className={css.miolo}>
        <div className={css.topo}>
          <Link href="/zap-pba" prefetch={false}><ArrowLeft size={16} aria-hidden="true" />Guia Zap PBA</Link>
          <span><MapPin size={15} aria-hidden="true" />{ficha.atendimentoRemoto ? "Atendimento online" : "Piracanjuba, GO"}</span>
        </div>

        <header className={css.capa}>
          <div className={css.texto}>
            {logo && foto && (
              <div className={css.assinatura}>
                <Image src={logo} alt={"Logo de " + nome} width={96} height={96} unoptimized />
              </div>
            )}
            <p className={css.atividade}><Icone size={17} aria-hidden="true" />{atividade}</p>
            <h1 className={nome.length > 34 ? css.nomeLongo : undefined}>{nome}</h1>
            <p className={css.resumo}>{resumo}</p>
            <div className={css.acoes}>
              <a className={css.botao} href={contato}>
                <WhatsAppIcon fill="currentColor" />{ficha.acao ?? (ficha.contatoRede ? "WhatsApp da rede" : "Falar no WhatsApp")}
              </a>
              {ficha.mapa ? (
                <a className={css.atalho} href={ficha.mapa}><Navigation size={16} aria-hidden="true" />Como chegar</a>
              ) : (redes || telefones.length > 1 || ficha.endereco) && (
                <a className={css.atalho} href="#contatos">Ver contatos<ArrowDown size={15} aria-hidden="true" /></a>
              )}
            </div>
          </div>

          {!foto && logo ? (
            <div className={css.painelMarca}>
              <div className={css.marcaAmpliada}>
                <Image src={logo} alt={"Logo de " + nome} width={240} height={240} loading="eager" unoptimized />
              </div>
            </div>
          ) : (
            <figure className={css.moldura} data-retrato={fotoAlt ? true : undefined} data-cidade={!foto || undefined}>
              <div className={css.quadro}>
                <Image
                  src={foto ?? "/historia/praca-do-relogio.jpg"}
                  alt={fotoAlt ?? (foto ? "" : "Torre do relógio iluminada à noite")}
                  fill
                  sizes="(max-width: 720px) calc(100vw - 40px), (max-width: 1200px) 41vw, 465px"
                  loading="eager"
                  className={css.foto}
                />
              </div>
              {!foto && <figcaption className={css.legenda}><MapPin size={14} aria-hidden="true" />Praça do Relógio, Piracanjuba</figcaption>}
            </figure>
          )}
        </header>

        {(detalhe || temOfertas) && (
          <section className={css.sobre} aria-labelledby="sobre">
            <h2 id="sobre">{temOfertas ? "Produtos e serviços" : "Sobre " + nome}</h2>
            <div>
              {detalhe && <p className={css.detalhe}>{detalhe}</p>}
              {temOfertas && <ul className={css.ofertas}>
                {ofertas?.map((item) => <li key={item}>{item}</li>)}
              </ul>}
            </div>
          </section>
        )}

        <section className={css.contatos} aria-labelledby="contatos">
          <h2 id="contatos">{local ? "Contato e localização" : "Contato"}</h2>
          <dl className={css.grade}>
            <div className={css.item}>
              <dt><Phone size={18} aria-hidden="true" />{ficha.contatoRede ? "WhatsApp da rede" : "WhatsApp"}</dt>
              <dd>{telefones.map((numero) => (
                <a key={numero} href={linkWhatsapp(numero)}>{formatarTelefoneBr(numero)}<ArrowUpRight size={15} aria-hidden="true" /></a>
              ))}</dd>
            </div>
            {local && <div className={css.item}>
              <dt><MapPin size={18} aria-hidden="true" />{ficha.endereco ? "Endereço" : "Localização"}</dt>
              <dd>
                {ficha.endereco && <p>{ficha.endereco}</p>}
                {ficha.mapa && <a href={ficha.mapa}>Abrir no mapa<ArrowUpRight size={15} aria-hidden="true" /></a>}
              </dd>
            </div>}
            {redes && <div className={css.item}>
              <dt>{ficha.instagram ? <InstagramIcon /> : <Globe size={18} aria-hidden="true" />}Canais digitais</dt>
              <dd>
                {ficha.instagram && <a href={ficha.instagram}>{ficha.instagramRede ? "Instagram da rede" : "Instagram"}<ArrowUpRight size={15} aria-hidden="true" /></a>}
                {ficha.site && <a href={ficha.site}>{ficha.siteRotulo ?? (ficha.siteRede ? "Site da rede" : "Site da empresa")}<ArrowUpRight size={15} aria-hidden="true" /></a>}
                {ficha.facebook && <a href={ficha.facebook}>Facebook<ArrowUpRight size={15} aria-hidden="true" /></a>}
              </dd>
            </div>}
          </dl>
        </section>

        <aside className={css.proprietario} aria-labelledby="titulo-proprietario">
          <div>
            <h2 id="titulo-proprietario">Esta empresa é sua?</h2>
            <p>O Piracanjuba.ai criou esta prévia. Converse com a equipe do portal para usar suas fotos, destacar o que você oferece e conhecer as condições.</p>
          </div>
          <a href={personalizar}>Quero personalizar a página<ArrowUpRight size={17} aria-hidden="true" /></a>
        </aside>
        <footer className={css.rodape}>
          <span>Página de apresentação no Piracanjuba.ai</span>
          <a href={suporte}>Solicitar ajuste ou remoção<ArrowRight size={15} aria-hidden="true" /></a>
        </footer>
      </div>
    </article>
  );
}
