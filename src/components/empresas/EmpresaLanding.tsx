import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  CircleCheck,
  Clock,
  Droplets,
  ExternalLink,
  Globe,
  MapPin,
  Megaphone,
  Navigation,
  Plus,
  ScanSearch,
  Star,
  Truck,
  type LucideIcon,
} from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import type { Empresa, IconeDestaque, ItemGaleria, MidiaTopo as DadosMidiaTopo } from "@/data/empresas";
import {
  colunasDestaques,
  colunasGaleria,
  colunasPassos,
  papelItemGaleria,
  type PapelItemGaleria,
} from "@/lib/empresas-layout";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import BarraWhatsappEmpresa from "./BarraWhatsappEmpresa";
import IlustracaoPresenca from "./IlustracaoPresenca";
import VitrineRolavel from "./VitrineRolavel";
import { CLASSES_FONTES } from "./fontes";
import s from "./EmpresaLanding.module.css";

// Página de empresa com a moldura enxuta: o cabeçalho e o rodapé vêm do
// SiteLayout; barra inferior, chat e "Anuncie" ficam ocultos (SomenteNoPortal).
// Cores, fontes, raios e o detalhe gráfico são da marca da empresa, fixos no
// claro e no escuro, como um outdoor. Toda seção nova é opcional: some quando
// a ficha não tem o dado.

// Sem noreferrer: o site da empresa precisa ver que a visita veio do
// Piracanjuba.ai (o navegador envia só a origem, sem o caminho).
const REL_EXTERNO = "sponsored noopener";
const ID_BOTAO_TOPO = "empresa-whatsapp-topo";

const CONTAINER = "mx-auto w-full max-w-[72rem] px-5 md:px-8";
// Seções seguidas no mesmo fundo só têm espaço embaixo; quem abre um bloco
// (depois do topo ou numa faixa de cor) leva também o espaço de cima, um
// pouco menor (compensação óptica).
const SECAO_TOPO = "pt-16 md:pt-24 lg:pt-28";
const SECAO_BASE = "pb-[4.5rem] md:pb-[6.5rem] lg:pb-[7.5rem]";
const SECAO = `${SECAO_TOPO} ${SECAO_BASE}`;
const H2 = `${s.titulo} text-[clamp(1.875rem,1.3rem+2.2vw,3rem)] leading-[1.1]`;
const H3 = `${s.titulo} text-2xl leading-tight`;
const CORPO = "text-[1.0625rem] leading-[1.7] text-pretty";
const ICONE = "size-5 shrink-0";

const ICONES_DESTAQUE: Record<IconeDestaque, LucideIcon | null> = {
  frasco: Droplets,
  agenda: CalendarClock,
  envio: Truck,
  estrela: Star,
  busca: ScanSearch,
  aprovacao: CircleCheck,
  whatsapp: null,
  local: MapPin,
  relogio: Clock,
};

function LinkExterno({
  href,
  children,
  className,
  id,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <a href={href} target="_blank" rel={REL_EXTERNO} className={className} id={id}>
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

function BotaoWhatsapp({
  empresa,
  rotulo,
  sobreEscuro = false,
  className = "",
  id,
}: {
  empresa: Empresa;
  rotulo: string;
  sobreEscuro?: boolean;
  className?: string;
  id?: string;
}) {
  const caixaAlta = empresa.tema.botaoCaixaAlta
    ? "text-sm uppercase tracking-[0.14em]"
    : "text-base";
  const cores = sobreEscuro
    ? "bg-[var(--marca-botao-escuro)] text-[var(--marca-botao-escuro-texto)] hover:bg-[var(--marca-botao-escuro-hover)]"
    : "bg-[var(--marca-primaria)] text-[var(--marca-sobre-primaria)] hover:bg-[var(--marca-primaria-hover)]";
  return (
    <LinkExterno
      id={id}
      href={linkWhatsapp(empresa.contato.whatsapp, empresa.contato.mensagemWhatsapp)}
      className={`${s.botao} inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[var(--marca-raio-botao)] px-6 py-3 font-semibold ${caixaAlta} ${cores} ${className}`}
    >
      <WhatsAppIcon className={ICONE} fill="currentColor" />
      {rotulo}
    </LinkExterno>
  );
}

function Rotulo({ children, escuro = false }: { children: ReactNode; escuro?: boolean }) {
  return (
    <p
      className={`text-[0.8125rem] font-semibold tracking-[0.16em] uppercase ${
        escuro ? "text-[var(--marca-rotulo-escuro)]" : "text-[var(--marca-rotulo)]"
      }`}
    >
      {children}
    </p>
  );
}

function CabecalhoSecao({
  id,
  rotulo,
  titulo,
  className = "",
}: {
  id: string;
  rotulo: string;
  titulo: string;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <Rotulo>{rotulo}</Rotulo>
      <h2 id={id} className={H2}>
        {titulo}
      </h2>
    </div>
  );
}

/** Marcador dos diferenciais conforme o detalhe gráfico da marca. */
function Marcador({ motivo }: { motivo: Empresa["motivo"] }) {
  if (motivo === "arco") {
    return (
      <span
        aria-hidden="true"
        className="mt-1 block h-6 w-[1.125rem] shrink-0 rounded-t-full rounded-b-[3px] border-[1.5px] border-[var(--marca-primaria)]"
      />
    );
  }
  if (motivo === "pino") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-6 shrink-0">
        <path
          d="M12 2C7.6 2 4 5.5 4 9.9c0 5.6 6.9 11.1 7.45 11.5.33.24.77.24 1.1 0C13.1 21 20 15.5 20 9.9 20 5.5 16.4 2 12 2z"
          fill="var(--marca-primaria)"
        />
        <circle cx="12" cy="9.6" r="2.6" fill="var(--marca-fundo-alt)" />
      </svg>
    );
  }
  return (
    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--marca-primaria)] text-[var(--marca-sobre-primaria)]">
      <Check className="size-4" aria-hidden="true" />
    </span>
  );
}

function TituloPrincipal({ empresa }: { empresa: Empresa }) {
  const titulo = empresa.titulo ?? empresa.nome;
  const destaque = empresa.titulo ? empresa.tituloDestaque : undefined;
  const indice = destaque ? titulo.indexOf(destaque) : -1;
  // Título longo (mais de 40 caracteres) usa uma escala um pouco menor, para
  // não passar de quatro linhas no computador.
  const tamanho =
    titulo.length > 40
      ? "text-[clamp(2.25rem,1.4rem+3.4vw,3.75rem)]"
      : "text-[clamp(2.5rem,1.5rem+4vw,4.5rem)]";
  return (
    <h1
      id="empresa-nome"
      className={`${s.titulo} ${tamanho} leading-[1.04]`}
    >
      {indice < 0 || !destaque ? (
        titulo
      ) : (
        <>
          {titulo.slice(0, indice)}
          <span
            className={`text-[var(--marca-titulo-destaque)] ${
              empresa.tema.tituloDestaqueItalico ? "italic" : ""
            }`}
          >
            {destaque}
          </span>
          {titulo.slice(indice + destaque.length)}
        </>
      )}
    </h1>
  );
}

function MidiaTopo({ empresa }: { empresa: Empresa }) {
  // Ficha antiga com "foto" continua funcionando como mídia do tipo foto.
  const midia: DadosMidiaTopo | undefined =
    empresa.midiaTopo ?? (empresa.foto ? { tipo: "foto", imagem: empresa.foto } : undefined);

  if (midia?.tipo === "ilustracao") return <IlustracaoPresenca />;

  if (midia?.tipo === "recorte") {
    const { imagem } = midia;
    return (
      <figure className="mx-auto w-[min(100%,calc(45svh*0.8))] md:w-full md:max-w-[26rem]">
        <div className={s.arco}>
          <span className={s.sombraContato} style={{ bottom: "8.5%" }} aria-hidden="true" />
          <Image
            src={imagem.src}
            alt={imagem.alt}
            width={imagem.largura}
            height={imagem.altura}
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 768px) 80px, 60px"
            className="absolute bottom-[10%] left-1/2 h-[76%] w-auto -translate-x-1/2"
          />
        </div>
        {midia.legenda && (
          <figcaption className="mt-4 text-center text-xs font-semibold tracking-[0.16em] text-[var(--marca-texto-suave)] uppercase">
            {midia.legenda}
          </figcaption>
        )}
      </figure>
    );
  }

  if (midia?.tipo === "foto") {
    const { imagem } = midia;
    return (
      <figure className="mx-auto w-full max-w-[28rem]">
        <Image
          src={imagem.src}
          alt={imagem.alt}
          width={imagem.largura}
          height={imagem.altura}
          loading="eager"
          fetchPriority="high"
          sizes="(min-width: 768px) 448px, 100vw"
          className={`${s.sombra} aspect-[4/3] max-h-[45svh] w-full rounded-[var(--marca-raio)] object-cover md:aspect-square md:max-h-none`}
        />
        {midia.legenda && (
          <figcaption className="mt-3 text-sm text-[var(--marca-texto-suave)]">{midia.legenda}</figcaption>
        )}
      </figure>
    );
  }

  // Reserva para empresa sem imagem: painel escuro da marca, sem repetir o logo.
  return (
    <div className={`${s.sombra} rounded-[var(--marca-raio)] bg-[var(--marca-escuro)] p-8 text-[var(--marca-sobre-escuro)] md:p-10`}>
      <p className={`${s.titulo} text-2xl leading-snug md:text-3xl`}>
        {empresa.painelTopo?.frase ?? empresa.chamadaFinal.titulo}
      </p>
      {empresa.painelTopo && (
        <ul className="mt-6 space-y-3">
          {empresa.painelTopo.itens.map((item) => (
            <li key={item} className="flex items-center gap-3 text-base">
              <Check className="size-5 shrink-0 text-[var(--marca-acento-escuro)]" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Caixa da imagem conforme o papel do item. No celular, todo item é um cartão
// 4:5 da rolagem. No computador: o destaque ocupa o cartão inteiro (legenda por
// cima, sobre o degradê); a lateral fica com 42% da largura, à esquerda da
// legenda; a grade usa 4:3, com a legenda embaixo. A imagem é sempre absoluta
// dentro da caixa, para nenhuma foto empurrar a legenda para fora do cartão.
const CAIXA_IMAGEM: Record<PapelItemGaleria, string> = {
  destaque: "relative aspect-[4/5] w-full md:absolute md:inset-0 md:aspect-auto",
  lateral: "relative aspect-[4/5] w-full md:aspect-auto md:w-[42%] md:shrink-0 md:self-stretch",
  grade: "relative aspect-[4/5] w-full md:aspect-[4/3]",
};

const SIZES_FOTO: Record<PapelItemGaleria, string> = {
  destaque: "(min-width: 768px) 640px, 82vw",
  lateral: "(min-width: 768px) 200px, 82vw",
  grade: "(min-width: 768px) 540px, 82vw",
};

function ImagemGaleria({ item, papel }: { item: ItemGaleria; papel: PapelItemGaleria }) {
  const caixa = `${CAIXA_IMAGEM[papel]} overflow-hidden`;
  if (item.tipo === "recorte") {
    return (
      <div className={`${s.palcoRecorte} ${caixa}`}>
        <span className={s.sombraContato} style={{ bottom: "7%", width: "50%" }} aria-hidden="true" />
        <Image
          src={item.src}
          alt={item.alt}
          width={item.largura}
          height={item.altura}
          sizes="120px"
          className="absolute bottom-[9%] left-1/2 h-[80%] w-auto -translate-x-1/2"
        />
      </div>
    );
  }
  return (
    <div className={caixa}>
      <Image
        src={item.src}
        alt={item.alt}
        width={item.largura}
        height={item.altura}
        sizes={SIZES_FOTO[papel]}
        className="absolute inset-0 size-full object-cover"
      />
    </div>
  );
}

function Galeria({ empresa }: { empresa: Empresa }) {
  const galeria = empresa.galeria;
  if (!galeria?.itens.length) return null;
  const total = galeria.itens.length;
  return (
    <section aria-labelledby="empresa-galeria" className={SECAO}>
      <div className={CONTAINER}>
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <CabecalhoSecao
            id="empresa-galeria"
            rotulo={galeria.rotulo ?? "Galeria"}
            titulo={galeria.titulo}
            className="md:col-span-7"
          />
          {galeria.texto && (
            <p className={`${CORPO} text-[var(--marca-texto-suave)] md:col-span-5`}>{galeria.texto}</p>
          )}
        </div>
        <VitrineRolavel idTitulo="empresa-galeria" className={`${s.vitrineRolagem} mt-10 md:mt-14`}>
          <ul className={`${s.vitrine} md:grid md:gap-6 ${colunasGaleria(total)}`}>
            {galeria.itens.map((item, indice) => {
              const papel = papelItemGaleria(indice, total);
              const conteudo = (
                <>
                  <ImagemGaleria item={item} papel={papel} />
                  <div
                    className={`space-y-1 p-5 md:p-6 ${
                      papel === "destaque"
                        ? "md:absolute md:inset-x-0 md:bottom-0 md:bg-[linear-gradient(to_top,rgb(11_11_12/0.72),rgb(11_11_12/0))] md:pt-16 md:text-white"
                        : papel === "lateral"
                          ? "md:flex md:min-w-0 md:flex-1 md:flex-col md:justify-center"
                          : ""
                    }`}
                  >
                    <p className={`${s.titulo} text-2xl leading-tight`}>{item.legenda}</p>
                    {item.texto && (
                      <p
                        className={`text-[0.9375rem] leading-relaxed ${
                          papel === "destaque"
                            ? "text-[var(--marca-texto-suave)] md:text-white/85"
                            : "text-[var(--marca-texto-suave)]"
                        }`}
                      >
                        {item.texto}
                      </p>
                    )}
                  </div>
                </>
              );
              return (
                <li
                  key={`${item.src}-${indice}`}
                  className={`overflow-hidden rounded-[var(--marca-raio)] border border-[var(--marca-borda)] bg-[var(--marca-superficie)] ${
                    papel === "destaque" ? "md:relative md:col-span-7 md:row-span-2 md:aspect-square" : ""
                  } ${papel === "lateral" ? "md:col-span-5 md:flex md:items-stretch" : ""}`}
                >
                  {item.url ? (
                    <LinkExterno
                      href={item.url}
                      className={`block h-full ${papel === "lateral" ? "md:flex md:w-full md:items-stretch" : ""}`}
                    >
                      {conteudo}
                    </LinkExterno>
                  ) : (
                    conteudo
                  )}
                </li>
              );
            })}
          </ul>
        </VitrineRolavel>
      </div>
    </section>
  );
}

function ListaContato({ empresa }: { empresa: Empresa }) {
  const telefone = formatarTelefoneBr(empresa.contato.whatsapp);
  const link = `${s.sublinhado} inline-flex min-h-11 items-center gap-3 font-medium`;
  const icone = `${ICONE} text-[var(--marca-acento-escuro)]`;
  return (
    <ul className="space-y-1 text-base">
      <li>
        <LinkExterno
          href={linkWhatsapp(empresa.contato.whatsapp, empresa.contato.mensagemWhatsapp)}
          className={link}
        >
          <WhatsAppIcon className={icone} fill="currentColor" />
          <span>
            WhatsApp <span className="tabular-nums">{telefone}</span>
          </span>
        </LinkExterno>
      </li>
      {empresa.contato.instagram && (
        <li>
          <LinkExterno href={empresa.contato.instagram.url} className={link}>
            <InstagramIcon className={icone} />
            Instagram {empresa.contato.instagram.usuario}
          </LinkExterno>
        </li>
      )}
      {empresa.contato.site && (
        <li>
          <LinkExterno href={empresa.contato.site.url} className={link}>
            <Globe className={icone} aria-hidden="true" />
            {empresa.contato.site.rotulo}
          </LinkExterno>
        </li>
      )}
      {empresa.contato.extras?.map((extra) => (
        <li key={extra.url}>
          <LinkExterno href={extra.url} className={link}>
            <ExternalLink className={icone} aria-hidden="true" />
            {extra.rotulo}
          </LinkExterno>
        </li>
      ))}
    </ul>
  );
}

export default function EmpresaLanding({ empresa }: { empresa: Empresa }) {
  const { tema } = empresa;
  const variaveis = {
    "--marca-fundo": tema.fundo,
    "--marca-superficie": tema.superficie,
    "--marca-texto": tema.texto,
    "--marca-texto-suave": tema.textoSuave,
    "--marca-primaria": tema.primaria,
    "--marca-sobre-primaria": tema.sobrePrimaria,
    "--marca-primaria-hover": tema.primariaHover,
    "--marca-borda": tema.borda,
    "--marca-fundo-alt": tema.fundoAlt ?? tema.superficie,
    "--marca-escuro": tema.escuro ?? tema.texto,
    "--marca-sobre-escuro": tema.sobreEscuro ?? tema.fundo,
    "--marca-sobre-escuro-suave": tema.sobreEscuroSuave ?? tema.sobreEscuro ?? tema.fundo,
    "--marca-acento-escuro": tema.acentoEscuro ?? tema.sobreEscuro ?? tema.fundo,
    "--marca-botao-escuro": tema.botaoEscuro?.fundo ?? tema.sobreEscuro ?? tema.fundo,
    "--marca-botao-escuro-texto": tema.botaoEscuro?.texto ?? tema.escuro ?? tema.texto,
    "--marca-botao-escuro-hover": tema.botaoEscuro?.hover ?? tema.superficie,
    "--marca-rotulo": tema.rotulo ?? tema.primaria,
    "--marca-rotulo-escuro": tema.rotuloEscuro ?? tema.sobreEscuroSuave ?? tema.sobreEscuro ?? tema.fundo,
    "--marca-titulo-destaque": tema.corTituloDestaque ?? tema.primaria,
    "--marca-foco": tema.primaria,
    "--marca-luz-topo": tema.luzTopo ?? "none",
    "--marca-luz-midia": tema.luzMidia ?? tema.fundoAlt ?? tema.superficie,
    "--marca-linha": tema.linha ?? tema.borda,
    "--marca-raio": tema.raio ?? "1rem",
    "--marca-raio-botao": tema.raioBotao ?? "9999px",
    "--marca-sombra": tema.sombra ?? "0 20px 40px -24px rgb(0 0 0 / 0.25)",
    "--marca-peso-titulo": tema.pesoTitulo ?? 600,
    "--marca-espacamento-titulo": tema.espacamentoTitulo ?? "-0.01em",
    fontFamily: "var(--fonte-marca-texto), system-ui, sans-serif",
  } as CSSProperties;

  const logoLargo = empresa.logo.largura / empresa.logo.altura > 1.6;
  const rotuloWhatsapp = empresa.rotuloWhatsapp ?? "Chamar no WhatsApp";
  const rotuloTopo = empresa.titulo ? `${empresa.nome} · ${empresa.categoria}` : empresa.categoria;
  const destaques = empresa.destaques ?? [];
  // A nota no Google aparece no topo só quando não está na faixa de destaques.
  const avaliacaoNoTopo =
    empresa.avaliacao && !destaques.some((item) => item.url === empresa.avaliacao?.url);
  // A galeria some quando não tem itens; o Sobre então abre o bloco com o espaço de cima.
  const temGaleria = Boolean(empresa.galeria?.itens.length);
  const colunasDiferenciais =
    empresa.diferenciais.length % 3 === 0 ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2";

  return (
    <div
      className={`${CLASSES_FONTES[empresa.fontes]} ${s.raiz} bg-[var(--marca-fundo)] text-[var(--marca-texto)]`}
      style={variaveis}
    >
      {/* Topo */}
      <section aria-labelledby="empresa-nome" className={s.topo}>
        <div className={`${CONTAINER} pt-5 pb-12 md:pt-10 md:pb-16`}>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--marca-borda)] bg-[var(--marca-superficie)]/80 px-3 py-1 text-xs font-medium text-[var(--marca-texto-suave)]">
            <Megaphone className="size-3.5" aria-hidden="true" />
            Página patrocinada
          </p>

          <div className="mt-6 grid items-center gap-10 md:mt-10 md:grid-cols-12 md:gap-12">
            <div className="space-y-5 md:col-span-7 md:space-y-6">
              {logoLargo ? (
                <Image
                  src={empresa.logo.src}
                  alt={empresa.logo.alt}
                  width={empresa.logo.largura}
                  height={empresa.logo.altura}
                  loading="eager"
                  className="h-10 w-auto md:h-14"
                />
              ) : (
                <Image
                  src={empresa.logo.src}
                  alt={empresa.logo.alt}
                  width={empresa.logo.largura}
                  height={empresa.logo.altura}
                  loading="eager"
                  unoptimized
                  className="size-12 rounded-[0.875rem] md:size-14"
                />
              )}
              <div className="space-y-4">
                <Rotulo>{rotuloTopo}</Rotulo>
                <TituloPrincipal empresa={empresa} />
                <p className="max-w-[58ch] text-[1.0625rem] leading-[1.6] text-pretty text-[var(--marca-texto-suave)] md:text-[1.1875rem] md:leading-[1.55]">
                  {empresa.chamada}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <BotaoWhatsapp empresa={empresa} rotulo={rotuloWhatsapp} id={ID_BOTAO_TOPO} />
                {empresa.contato.site && (
                  <LinkExterno
                    href={empresa.contato.site.url}
                    className={`${s.sublinhado} group inline-flex min-h-12 items-center gap-1.5 font-semibold`}
                  >
                    Visitar {empresa.contato.site.rotulo}
                    <ArrowUpRight
                      className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </LinkExterno>
                )}
              </div>

              {avaliacaoNoTopo && empresa.avaliacao && (
                <LinkExterno
                  href={empresa.avaliacao.url}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--marca-texto-suave)] underline-offset-4 hover:underline"
                >
                  <Star className="size-4 fill-[var(--marca-primaria)] text-[var(--marca-primaria)]" aria-hidden="true" />
                  {empresa.avaliacao.rotulo}
                </LinkExterno>
              )}
            </div>

            <div className="md:col-span-5">
              <MidiaTopo empresa={empresa} />
            </div>
          </div>

          {destaques.length > 0 && (
            <ul
              aria-label="Destaques"
              className={`mt-12 grid grid-cols-2 border-y border-[var(--marca-borda)] md:mt-16 ${colunasDestaques(destaques.length)}`}
            >
              {destaques.map((item) => {
                const Icone = item.icone ? ICONES_DESTAQUE[item.icone] : null;
                const icone =
                  item.icone === "whatsapp" ? (
                    <WhatsAppIcon className={`${ICONE} text-[var(--marca-primaria)]`} fill="currentColor" />
                  ) : Icone ? (
                    <Icone
                      className={`${ICONE} text-[var(--marca-primaria)] ${item.icone === "estrela" ? "fill-[var(--marca-primaria)]" : ""}`}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  ) : null;
                const conteudo = (
                  <>
                    {icone}
                    <span>{item.titulo}</span>
                  </>
                );
                return (
                  <li
                    key={item.titulo}
                    className="flex border-[var(--marca-borda)] even:border-l md:border-l md:first:border-l-0 [&:nth-child(n+3)]:border-t md:[&:nth-child(n+3)]:border-t-0"
                  >
                    {item.url ? (
                      <LinkExterno
                        href={item.url}
                        className={`${s.sublinhado} flex w-full items-start gap-3 px-3 py-5 text-[0.9375rem] leading-snug font-semibold md:items-center md:px-6 md:text-base`}
                      >
                        {conteudo}
                      </LinkExterno>
                    ) : (
                      <p className="flex w-full items-start gap-3 px-3 py-5 text-[0.9375rem] leading-snug font-semibold md:items-center md:px-6 md:text-base">
                        {conteudo}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <Galeria empresa={empresa} />

      {/* Sobre */}
      <section aria-labelledby="empresa-sobre" className={temGaleria ? SECAO_BASE : SECAO}>
        <div className={`${CONTAINER} grid gap-8 md:grid-cols-12 md:gap-12`}>
          <div className="space-y-6 md:col-span-5">
            <CabecalhoSecao
              id="empresa-sobre"
              rotulo={empresa.tituloSobre ? "Sobre" : empresa.nome}
              titulo={empresa.tituloSobre ?? "Sobre"}
            />
            {empresa.sobreDestaque && (
              <p
                className={`${s.titulo} border-l-2 border-[var(--marca-primaria)] pl-5 text-2xl leading-snug text-[var(--marca-titulo-destaque)] ${
                  empresa.tema.tituloDestaqueItalico ? "italic" : ""
                }`}
              >
                {empresa.sobreDestaque}
              </p>
            )}
          </div>
          <div className="space-y-5 md:col-span-7 md:pt-9">
            {empresa.sobre.map((paragrafo) => (
              <p key={paragrafo} className={`${CORPO} max-w-[65ch]`}>
                {paragrafo}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Oferta: lista numerada editorial, sem cartões */}
      <section aria-labelledby="empresa-oferta" className={SECAO_BASE}>
        <div className={`${CONTAINER} grid gap-10 md:grid-cols-12 md:gap-12`}>
          <div className="space-y-5 md:col-span-4">
            <div className="space-y-5">
              <CabecalhoSecao id="empresa-oferta" rotulo="O que oferece" titulo={empresa.tituloOferta} />
              {empresa.textoOferta && (
                <p className={`${CORPO} text-[var(--marca-texto-suave)]`}>{empresa.textoOferta}</p>
              )}
              {empresa.linkOferta && (
                <LinkExterno
                  href={empresa.linkOferta.url}
                  className="group inline-flex min-h-11 items-center gap-1.5 font-semibold text-[var(--marca-primaria)] underline decoration-1 underline-offset-[6px] hover:text-[var(--marca-primaria-hover)]"
                >
                  {empresa.linkOferta.rotulo}
                  <ArrowUpRight
                    className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </LinkExterno>
              )}
            </div>
          </div>
          <ol className="border-b border-[var(--marca-borda)] md:col-span-8">
            {empresa.oferta.map((item, indice) => (
              <li
                key={item.titulo}
                className="grid grid-cols-[3rem_1fr] gap-x-4 gap-y-2 border-t border-[var(--marca-borda)] py-6 md:grid-cols-[4.5rem_minmax(0,0.9fr)_minmax(0,1.3fr)] md:gap-x-6 md:py-8"
              >
                <span
                  aria-hidden="true"
                  className={`${s.titulo} text-[1.75rem] leading-none text-[var(--marca-primaria)] ${s.numeros} md:text-[2rem]`}
                >
                  {String(indice + 1).padStart(2, "0")}
                </span>
                <h3 className={H3}>{item.titulo}</h3>
                <p className={`${CORPO} col-start-2 text-[var(--marca-texto-suave)] md:col-start-auto`}>{item.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Guia de escolha (opcional) */}
      {empresa.guiaEscolha && (
        <section aria-labelledby="empresa-guia" className={SECAO_BASE}>
          <div className={CONTAINER}>
            <div className="grid gap-6 md:grid-cols-12 md:items-end">
              <CabecalhoSecao
                id="empresa-guia"
                rotulo="Como escolher"
                titulo={empresa.guiaEscolha.titulo}
                className="md:col-span-7"
              />
              {empresa.guiaEscolha.texto && (
                <p className={`${CORPO} text-[var(--marca-texto-suave)] md:col-span-5`}>
                  {empresa.guiaEscolha.texto}
                </p>
              )}
            </div>
            <ul className="mt-10 grid border-t border-[var(--marca-borda)] md:mt-12 md:grid-cols-2">
              {empresa.guiaEscolha.itens.map((item) => (
                <li
                  key={item.titulo}
                  className="space-y-3 border-b border-[var(--marca-borda)] py-8 md:border-b-0 md:py-10 md:odd:pr-12 md:even:border-l md:even:pl-12"
                >
                  <h3
                    className={`${s.titulo} text-[clamp(3rem,2.2rem+3vw,4.5rem)] leading-none text-[var(--marca-primaria)] ${s.numeros}`}
                  >
                    {item.titulo}
                  </h3>
                  <p className={`${CORPO} max-w-[44ch]`}>{item.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Diferenciais: a única faixa tonal do meio da página */}
      <section aria-labelledby="empresa-diferenciais" className={`${SECAO} bg-[var(--marca-fundo-alt)]`}>
        <div className={CONTAINER}>
          <CabecalhoSecao
            id="empresa-diferenciais"
            rotulo="Diferenciais"
            titulo={empresa.tituloDiferenciais ?? "Por que escolher"}
            className="max-w-2xl"
          />
          <ul className={`mt-10 grid gap-x-12 gap-y-8 md:mt-14 md:gap-y-10 ${colunasDiferenciais}`}>
            {empresa.diferenciais.map((item) => (
              <li key={item.titulo} className="flex gap-4">
                <Marcador motivo={empresa.motivo} />
                <div className="space-y-2">
                  <h3 className={H3}>{item.titulo}</h3>
                  <p className={`${CORPO} text-[var(--marca-texto-suave)]`}>{item.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Como funciona: linha do tempo */}
      <section aria-labelledby="empresa-passos" className={SECAO}>
        <div className={CONTAINER}>
          <CabecalhoSecao id="empresa-passos" rotulo="Passo a passo" titulo="Como funciona" />
          <ol className={`mt-10 grid gap-y-2 md:mt-14 md:gap-x-8 ${colunasPassos(empresa.passos.length)}`}>
            {empresa.passos.map((passo, indice) => (
              <li key={passo.titulo} className={`${s.passo} grid grid-cols-[3rem_1fr] gap-x-5 pb-8 md:block md:pb-0`}>
                <span
                  aria-hidden="true"
                  className={`${s.titulo} relative z-[1] flex size-12 items-center justify-center rounded-full border border-[var(--marca-primaria)] bg-[var(--marca-fundo)] text-[1.625rem] leading-none text-[var(--marca-primaria)] ${s.numeros}`}
                >
                  {indice + 1}
                </span>
                <div className="space-y-2 pt-2 md:pt-6">
                  <h3 className={H3}>
                    <span className="sr-only">Passo {indice + 1}: </span>
                    {passo.titulo}
                  </h3>
                  <p className={`${CORPO} max-w-[36ch] text-[var(--marca-texto-suave)]`}>{passo.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Perguntas frequentes (opcional) */}
      {empresa.faq && empresa.faq.length > 0 && (
        <section aria-labelledby="empresa-faq" className={SECAO_BASE}>
          <div className={`${CONTAINER} grid gap-10 md:grid-cols-12 md:gap-12`}>
            <div className="md:col-span-4">
              <div className="space-y-5">
                <CabecalhoSecao id="empresa-faq" rotulo="Dúvidas" titulo="Perguntas frequentes" />
                <p className={`${CORPO} text-[var(--marca-texto-suave)]`}>
                  Não encontrou o que procurava? Pergunte direto pelo WhatsApp.
                </p>
                <LinkExterno
                  href={linkWhatsapp(empresa.contato.whatsapp, empresa.contato.mensagemWhatsapp)}
                  className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--marca-primaria)] underline decoration-1 underline-offset-[6px] hover:text-[var(--marca-primaria-hover)]"
                >
                  <WhatsAppIcon className={ICONE} fill="currentColor" />
                  Perguntar pelo WhatsApp
                </LinkExterno>
              </div>
            </div>
            <div className="border-b border-[var(--marca-borda)] md:col-span-8">
              {empresa.faq.map((item) => (
                <details key={item.pergunta} className={`${s.pergunta} border-t border-[var(--marca-borda)]`}>
                  <summary className="flex min-h-12 items-start justify-between gap-6 py-5 text-[1.0625rem] leading-snug font-semibold md:text-lg">
                    <span>{item.pergunta}</span>
                    <Plus
                      className={`${s.iconeAbrir} mt-0.5 size-5 shrink-0 text-[var(--marca-primaria)]`}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </summary>
                  <p className={`${CORPO} max-w-[65ch] pb-6 text-[var(--marca-texto-suave)]`}>{item.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Fechamento: chamada final, contato e onde atende num bloco só */}
      <section
        aria-labelledby="empresa-chamada-final"
        className={`${s.escuro} bg-[var(--marca-escuro)] text-[var(--marca-sobre-escuro)]`}
      >
        <div className={`${CONTAINER} grid gap-12 pt-16 pb-[4.5rem] md:grid-cols-12 md:gap-12 md:pt-24 md:pb-28`}>
          <div className="space-y-6 md:col-span-7">
            <Rotulo escuro>Contato</Rotulo>
            <h2 id="empresa-chamada-final" className={`${H2} max-w-[18ch]`}>
              {empresa.chamadaFinal.titulo}
            </h2>
            <p className={`${CORPO} max-w-[52ch] text-[var(--marca-sobre-escuro-suave)]`}>
              {empresa.chamadaFinal.texto}
            </p>
            <BotaoWhatsapp empresa={empresa} rotulo={rotuloWhatsapp} sobreEscuro />
            <div className="pt-4">
              <h3 className="sr-only">Contato</h3>
              <ListaContato empresa={empresa} />
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="space-y-4 border-t border-[color-mix(in_srgb,var(--marca-sobre-escuro)_18%,transparent)] pt-8 md:mt-2">
              <span aria-hidden="true" className="-mt-[2.0625rem] block h-0.5 w-12 bg-[var(--marca-acento-escuro)]" />
              <h3 className="pt-3 text-[0.8125rem] font-semibold tracking-[0.16em] text-[var(--marca-sobre-escuro-suave)] uppercase">
                Onde atende
              </h3>
              <p className={`${s.titulo} flex items-center gap-3 text-[2rem] leading-tight`}>
                <MapPin className="size-6 shrink-0 text-[var(--marca-acento-escuro)]" strokeWidth={1.75} aria-hidden="true" />
                {empresa.endereco.cidade}, {empresa.endereco.uf}
              </p>
              <p className={`${CORPO} text-[var(--marca-sobre-escuro-suave)]`}>{empresa.endereco.detalhe}</p>
              {empresa.endereco.horario && (
                <p className="flex items-start gap-3 text-base font-medium">
                  <Clock className="mt-0.5 size-5 shrink-0 text-[var(--marca-acento-escuro)]" aria-hidden="true" />
                  <span>
                    <span className="sr-only">Horário de atendimento: </span>
                    {empresa.endereco.horario}
                  </span>
                </p>
              )}
              {empresa.endereco.mapaUrl && (
                <LinkExterno
                  href={empresa.endereco.mapaUrl}
                  className={`${s.sublinhado} inline-flex min-h-11 items-center gap-3 font-medium`}
                >
                  <Navigation className="size-5 shrink-0 text-[var(--marca-acento-escuro)]" aria-hidden="true" />
                  Ver no mapa
                </LinkExterno>
              )}
              {empresa.vinculo && (
                <p className="mt-4 border-t border-[color-mix(in_srgb,var(--marca-sobre-escuro)_18%,transparent)] pt-5 text-sm leading-relaxed text-[var(--marca-sobre-escuro-suave)]">
                  {empresa.vinculo}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className={`${CONTAINER} py-8`}>
        <p className="flex items-start gap-3 text-[0.8125rem] leading-relaxed text-[var(--marca-texto-suave)]">
          <Megaphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Página patrocinada. As informações são da empresa e foram conferidas em{" "}
            {empresa.conferidoEm}. Esta página não faz parte da cobertura de transparência do
            Piracanjuba.ai, que é independente e não tem vínculo com órgãos públicos.
          </span>
        </p>
      </div>

      <BarraWhatsappEmpresa alvoId={ID_BOTAO_TOPO}>
        <BotaoWhatsapp empresa={empresa} rotulo={rotuloWhatsapp} className="w-full" />
      </BarraWhatsappEmpresa>
      {/* A barra nasce escondida (sem piscar na carga) e quem está sem
          JavaScript a recebe de volta por esta regra. */}
      <noscript>
        <style>{"[data-barra-empresa]{translate:none;transform:none}"}</style>
      </noscript>
    </div>
  );
}
