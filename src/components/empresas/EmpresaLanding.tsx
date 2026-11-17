import Image from "next/image";
import type { CSSProperties } from "react";
import { Check, Clock, ExternalLink, Globe, MapPin, Megaphone, Navigation, Star } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import type { Empresa } from "@/data/empresas";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import { CLASSES_FONTES } from "./fontes";

// Página de empresa com a moldura enxuta: o cabeçalho e o rodapé vêm do
// SiteLayout; barra inferior, chat e "Anuncie" ficam ocultos (SomenteNoPortal).
// Cores e fontes são da marca da empresa, fixas no claro e no escuro, como
// um outdoor.

const TITULO: CSSProperties = { fontFamily: "var(--fonte-marca-titulo), Georgia, serif" };
// Sem noreferrer: o site da empresa precisa ver que a visita veio do
// Piracanjuba.ai (o navegador envia só a origem, sem o caminho).
const REL_EXTERNO = "sponsored noopener";

function LinkExterno({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a href={href} target="_blank" rel={REL_EXTERNO} className={className}>
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

const BOTAO_PRIMARIO =
  "bg-[var(--marca-primaria)] text-[var(--marca-sobre-primaria)] hover:bg-[var(--marca-primaria-hover)] focus-visible:outline-[var(--marca-primaria)]";
// Botão claro, para usar sobre o painel na cor da marca.
const BOTAO_INVERTIDO =
  "bg-[var(--marca-sobre-primaria)] text-[var(--marca-primaria)] hover:bg-[var(--marca-fundo)] focus-visible:outline-[var(--marca-sobre-primaria)]";

function BotaoWhatsapp({
  empresa,
  rotulo,
  invertido = false,
  className = "",
}: {
  empresa: Empresa;
  rotulo: string;
  invertido?: boolean;
  className?: string;
}) {
  return (
    <LinkExterno
      href={linkWhatsapp(empresa.contato.whatsapp, empresa.contato.mensagemWhatsapp)}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${invertido ? BOTAO_INVERTIDO : BOTAO_PRIMARIO} ${className}`}
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0" fill="currentColor" />
      {rotulo}
    </LinkExterno>
  );
}

function TituloSecao({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-3xl font-semibold leading-tight md:text-4xl" style={TITULO}>
      {children}
    </h2>
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
    fontFamily: "var(--fonte-marca-texto), system-ui, sans-serif",
  } as CSSProperties;
  const logoLargo = empresa.logo.largura / empresa.logo.altura > 1.6;
  const telefone = formatarTelefoneBr(empresa.contato.whatsapp);
  const cartao = "rounded-2xl border border-[var(--marca-borda)] bg-[var(--marca-superficie)]";

  return (
    <div
      className={`${CLASSES_FONTES[empresa.fontes]} bg-[var(--marca-fundo)] text-[var(--marca-texto)]`}
      style={variaveis}
    >
      <div className="container max-w-5xl space-y-16 py-8 md:space-y-20 md:py-12">
        <section aria-labelledby="empresa-nome" className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--marca-borda)] bg-[var(--marca-superficie)] px-3 py-1 text-xs font-medium text-[var(--marca-texto-suave)]">
              <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
              Página patrocinada
            </p>

            <div className="space-y-4">
              {logoLargo ? (
                <Image
                  src={empresa.logo.src}
                  alt={empresa.logo.alt}
                  width={empresa.logo.largura}
                  height={empresa.logo.altura}
                  loading="eager"
                  className="h-16 w-auto md:h-20"
                />
              ) : (
                <Image
                  src={empresa.logo.src}
                  alt={empresa.logo.alt}
                  width={empresa.logo.largura}
                  height={empresa.logo.altura}
                  loading="eager"
                  unoptimized
                  className="h-16 w-16 rounded-2xl md:h-20 md:w-20"
                />
              )}
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--marca-texto-suave)]">
                {empresa.categoria}
              </p>
              <h1
                id="empresa-nome"
                className="text-5xl font-semibold leading-[1.05] md:text-6xl"
                style={TITULO}
              >
                {empresa.nome}
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-[var(--marca-texto-suave)]">
                {empresa.chamada}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <BotaoWhatsapp empresa={empresa} rotulo="Chamar no WhatsApp" />
              {empresa.contato.site && (
                <LinkExterno
                  href={empresa.contato.site.url}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--marca-borda)] bg-[var(--marca-superficie)] px-5 py-3 text-base font-medium transition-colors hover:border-[var(--marca-primaria)]"
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  {empresa.contato.site.rotulo}
                </LinkExterno>
              )}
            </div>

            {empresa.avaliacao && (
              <LinkExterno
                href={empresa.avaliacao.url}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--marca-texto-suave)] underline-offset-4 hover:underline"
              >
                <Star className="h-4 w-4 fill-[var(--marca-primaria)] text-[var(--marca-primaria)]" aria-hidden="true" />
                {empresa.avaliacao.rotulo}
              </LinkExterno>
            )}
          </div>

          {empresa.foto ? (
            <Image
              src={empresa.foto.src}
              alt={empresa.foto.alt}
              width={empresa.foto.largura}
              height={empresa.foto.altura}
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 768px) 420px, 100vw"
              className="aspect-square w-full rounded-3xl object-cover shadow-lg"
            />
          ) : (
            <div className="rounded-3xl bg-[var(--marca-texto)] p-8 text-[var(--marca-fundo)] shadow-lg md:p-10">
              <Image
                src={empresa.logo.src}
                alt=""
                width={empresa.logo.largura}
                height={empresa.logo.altura}
                unoptimized
                className="h-14 w-14 rounded-xl"
              />
              {empresa.painelTopo && (
                <p className="mt-6 text-2xl font-semibold leading-snug md:text-3xl" style={TITULO}>
                  {empresa.painelTopo.frase}
                </p>
              )}
              {empresa.painelTopo && (
                <ul className="mt-6 space-y-3">
                  {empresa.painelTopo.itens.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-base">
                      <Check className="h-5 w-5 shrink-0 text-[var(--marca-primaria)]" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby="empresa-sobre" className="max-w-3xl space-y-5">
          <TituloSecao id="empresa-sobre">Sobre</TituloSecao>
          {empresa.sobre.map((paragrafo) => (
            <p key={paragrafo} className="text-lg leading-relaxed">
              {paragrafo}
            </p>
          ))}
        </section>

        <section aria-labelledby="empresa-oferta" className="space-y-6">
          <TituloSecao id="empresa-oferta">{empresa.tituloOferta}</TituloSecao>
          <ul
            className={`grid gap-4 sm:grid-cols-2 ${empresa.oferta.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
          >
            {empresa.oferta.map((item) => (
              <li key={item.titulo} className={`${cartao} p-6`}>
                <h3 className="text-xl font-semibold" style={TITULO}>
                  {item.titulo}
                </h3>
                <p className="mt-2 leading-relaxed text-[var(--marca-texto-suave)]">{item.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="empresa-diferenciais" className="space-y-6">
          <TituloSecao id="empresa-diferenciais">Por que escolher</TituloSecao>
          <ul className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            {empresa.diferenciais.map((item) => (
              <li key={item.titulo} className="flex gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--marca-primaria)] text-[var(--marca-sobre-primaria)]">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{item.titulo}</h3>
                  <p className="mt-1 leading-relaxed text-[var(--marca-texto-suave)]">{item.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="empresa-passos" className="space-y-6">
          <TituloSecao id="empresa-passos">Como funciona</TituloSecao>
          <ol className="grid gap-4 md:grid-cols-3">
            {empresa.passos.map((passo, indice) => (
              <li key={passo.titulo} className={`${cartao} p-6`}>
                <span
                  className="text-4xl font-semibold text-[var(--marca-primaria)]"
                  style={TITULO}
                  aria-hidden="true"
                >
                  {indice + 1}
                </span>
                <h3 className="mt-2 text-lg font-semibold">
                  <span className="sr-only">Passo {indice + 1}: </span>
                  {passo.titulo}
                </h3>
                <p className="mt-1 leading-relaxed text-[var(--marca-texto-suave)]">{passo.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="empresa-contato" className="grid gap-6 md:grid-cols-2">
          <div className={`${cartao} space-y-5 p-6 md:p-8`}>
            <TituloSecao id="empresa-contato">Contato</TituloSecao>
            <ul className="space-y-4 text-base">
              <li>
                <LinkExterno
                  href={linkWhatsapp(empresa.contato.whatsapp, empresa.contato.mensagemWhatsapp)}
                  className="inline-flex items-center gap-3 font-medium underline-offset-4 hover:underline"
                >
                  <WhatsAppIcon className="h-5 w-5 shrink-0" fill="currentColor" />
                  WhatsApp {telefone}
                </LinkExterno>
              </li>
              {empresa.contato.instagram && (
                <li>
                  <LinkExterno
                    href={empresa.contato.instagram.url}
                    className="inline-flex items-center gap-3 font-medium underline-offset-4 hover:underline"
                  >
                    <InstagramIcon className="h-5 w-5 shrink-0" />
                    Instagram {empresa.contato.instagram.usuario}
                  </LinkExterno>
                </li>
              )}
              {empresa.contato.site && (
                <li>
                  <LinkExterno
                    href={empresa.contato.site.url}
                    className="inline-flex items-center gap-3 font-medium underline-offset-4 hover:underline"
                  >
                    <Globe className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {empresa.contato.site.rotulo}
                  </LinkExterno>
                </li>
              )}
              {empresa.contato.extras?.map((extra) => (
                <li key={extra.url}>
                  <LinkExterno
                    href={extra.url}
                    className="inline-flex items-center gap-3 font-medium underline-offset-4 hover:underline"
                  >
                    <ExternalLink className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {extra.rotulo}
                  </LinkExterno>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${cartao} space-y-4 p-6 md:p-8`}>
            <h2 className="text-3xl font-semibold leading-tight md:text-4xl" style={TITULO}>
              Onde atende
            </h2>
            <p className="flex items-start gap-3 text-lg font-medium">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-[var(--marca-primaria)]" aria-hidden="true" />
              {empresa.endereco.cidade}, {empresa.endereco.uf}
            </p>
            <p className="leading-relaxed text-[var(--marca-texto-suave)]">{empresa.endereco.detalhe}</p>
            {empresa.endereco.horario && (
              <p className="flex items-start gap-3 text-lg font-medium">
                <Clock className="mt-1 h-5 w-5 shrink-0 text-[var(--marca-primaria)]" aria-hidden="true" />
                <span>
                  <span className="sr-only">Horário de atendimento: </span>
                  {empresa.endereco.horario}
                </span>
              </p>
            )}
            {empresa.endereco.mapaUrl && (
              <LinkExterno
                href={empresa.endereco.mapaUrl}
                className="inline-flex items-center gap-3 font-medium underline-offset-4 hover:underline"
              >
                <Navigation className="h-5 w-5 shrink-0" aria-hidden="true" />
                Ver no mapa
              </LinkExterno>
            )}
            {empresa.vinculo && (
              <p className="border-t border-[var(--marca-borda)] pt-4 text-sm leading-relaxed text-[var(--marca-texto-suave)]">
                {empresa.vinculo}
              </p>
            )}
          </div>
        </section>

        <section
          aria-labelledby="empresa-chamada-final"
          className="rounded-3xl bg-[var(--marca-primaria)] px-6 py-10 text-center text-[var(--marca-sobre-primaria)] md:px-12 md:py-14"
        >
          <h2 id="empresa-chamada-final" className="text-3xl font-semibold md:text-4xl" style={TITULO}>
            {empresa.chamadaFinal.titulo}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg">{empresa.chamadaFinal.texto}</p>
          <BotaoWhatsapp empresa={empresa} rotulo="Falar no WhatsApp" invertido className="mt-6" />
        </section>

        <p className="border-t border-[var(--marca-borda)] pt-6 text-xs leading-relaxed text-[var(--marca-texto-suave)]">
          Página patrocinada. As informações são da empresa e foram conferidas em{" "}
          {empresa.conferidoEm}. Esta página não faz parte da cobertura de transparência do
          Piracanjuba.ai, que é independente e não tem vínculo com órgãos públicos.
        </p>
      </div>

      <div
        data-barra-empresa
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--marca-borda)] bg-[var(--marca-superficie)]/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <BotaoWhatsapp empresa={empresa} rotulo="Chamar no WhatsApp" className="w-full" />
      </div>
    </div>
  );
}
