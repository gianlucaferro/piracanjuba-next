import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Globe,
  Megaphone,
  MessageSquare,
  Newspaper,
  PenLine,
  Rocket,
  Scale,
  Smartphone,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { EMPRESAS } from "@/data/empresas";
import { SLUGS_EMPRESAS } from "@/data/empresas-slugs";
import { MATERIAS_NA_MIDIA } from "@/data/naMidia";
import { PRECO_PAGINA_EMPRESA, PRECO_PAGINA_EMPRESA_TEXTO } from "@/data/paginaEmpresa";
import { SCHEMA_IDS, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { linkWhatsapp } from "@/lib/whatsapp";

// Página de vendas do "outdoor digital": a página de empresa em
// piracanjuba.ai/<slug>. Termos decididos pelo operador em 2026-11-16:
// preço público de R$ 600 em pagamento único, sem mensalidade, página no ar
// sem prazo (enquanto o portal existir), sem os antigos planos de banner e
// sem números de audiência (nunca foram conferidos). Também do operador, no
// mesmo dia: exceções de saída com aviso de 30 dias se o portal encerrar,
// correção de contato sem custo, e nenhuma regra publicada sobre propaganda
// política (cada caso é decidido na conversa).

const PRECO = PRECO_PAGINA_EMPRESA_TEXTO;
const WHATSAPP_COMERCIAL = "5564992375458";
const MENSAGEM =
  "Olá! Vi no Piracanjuba.ai e quero uma página para a minha empresa. Pode me passar os detalhes?";

export const metadata = pageMetadata({
  title: `Página da sua empresa por ${PRECO}`,
  description: `Página própria da sua empresa em piracanjuba.ai/suaempresa, com logo, foto, serviços e botão de WhatsApp. Pagamento único de ${PRECO}, sem mensalidade.`,
  path: "/anuncie",
});

const INCLUI = [
  { icone: Globe, texto: "Endereço próprio: piracanjuba.ai/suaempresa" },
  { icone: BadgeCheck, texto: "Logo, foto, cores e fontes da sua marca" },
  { icone: PenLine, texto: "Apresentação, produtos ou serviços, diferenciais e como funciona o atendimento" },
  { icone: MessageSquare, texto: "Botão de WhatsApp com mensagem pronta, mais Instagram e site" },
  { icone: Smartphone, texto: "Versão para celular com o botão de WhatsApp sempre à mão" },
  { icone: Rocket, texto: "Preparada para o Google: título, descrição, dados estruturados e sitemap" },
];

const PASSOS = [
  { titulo: "Chame no WhatsApp", texto: "Conte o que a sua empresa faz e tire as dúvidas." },
  {
    titulo: "Envie o material",
    texto: "Logo, fotos, contatos e as informações que você quer na página.",
  },
  {
    titulo: "Escrevemos e montamos",
    texto: "A equipe do portal escreve os textos e monta a página. Você revisa e aprova.",
  },
  { titulo: "Página no ar", texto: "Publicada em piracanjuba.ai/suaempresa, pronta para compartilhar." },
];

const PERGUNTAS = [
  {
    pergunta: "É mensalidade?",
    resposta: `Não. São ${PRECO} em pagamento único, sem mensalidade.`,
  },
  {
    pergunta: "Por quanto tempo a página fica no ar?",
    resposta:
      "Sem prazo: a página fica no ar enquanto o Piracanjuba.ai existir. Ela só sai antes disso a pedido da empresa, se a empresa encerrar as atividades, por ordem judicial ou se a informação ficar falsa e não puder ser corrigida. Se o portal for encerrado, a empresa é avisada com 30 dias de antecedência.",
  },
  {
    pergunta: "Posso editar ou postar na página depois?",
    resposta:
      "A página funciona como um outdoor: o conteúdo é definido na criação e não tem área para a empresa editar ou postar. Correções de telefone, endereço e horário são feitas sem custo; outras mudanças de conteúdo são orçadas pelo WhatsApp.",
  },
  {
    pergunta: "Preciso ter site?",
    resposta:
      "Não. A página funciona sozinha e, se você tiver site ou Instagram, eles entram como links.",
  },
  {
    pergunta: "A página aparece no Google?",
    resposta:
      "Ela é preparada para o Google, com título, descrição, dados estruturados e sitemap. Ninguém pode garantir posição na busca, e o portal não promete isso.",
  },
  {
    pergunta: "Como a página é identificada?",
    resposta:
      "Com o selo \"Página patrocinada\". Anunciar não muda o que o portal publica sobre a Prefeitura, a Câmara ou qualquer órgão público.",
  },
  {
    pergunta: "Qualquer empresa pode anunciar?",
    resposta: "Empresas, comércios e profissionais de Piracanjuba e região.",
  },
  {
    pergunta: "Como é o pagamento?",
    resposta: "A forma de pagamento é combinada pelo WhatsApp.",
  },
];

function listaComE(itens: string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/** JSON-LD com "<" escapado, como recomenda o guia de JSON-LD do Next. */
function jsonLd(dados: unknown) {
  return { __html: JSON.stringify(dados).replace(/</g, "\\u003c") };
}

function BotaoWhatsapp({ rotulo }: { rotulo: string }) {
  return (
    <a
      href={linkWhatsapp(WHATSAPP_COMERCIAL, MENSAGEM)}
      target="_blank"
      rel="noopener"
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#15803d] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#166534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]"
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0" fill="currentColor" />
      {rotulo}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

export default function AnunciePage() {
  const exemplos = SLUGS_EMPRESAS.map((slug) => EMPRESAS[slug]);
  const veiculos = MATERIAS_NA_MIDIA.map((materia) => materia.veiculo);

  return (
    <div className="container mx-auto max-w-4xl space-y-14 py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Página de empresa no Piracanjuba.ai",
            serviceType: "Publicidade local",
            description: `Página própria da empresa em piracanjuba.ai/suaempresa, com pagamento único de ${PRECO}.`,
            provider: { "@id": SCHEMA_IDS.publisher },
            areaServed: { "@type": "City", name: "Piracanjuba, GO" },
            offers: {
              "@type": "Offer",
              price: PRECO_PAGINA_EMPRESA.toFixed(2),
              priceCurrency: "BRL",
              url: "https://piracanjuba.ai/anuncie",
            },
          },
          breadcrumbJsonLd([
            { name: "Início", path: "/" },
            { name: "Anuncie", path: "/anuncie" },
          ]),
        ])}
      />

      <section aria-labelledby="anuncie-titulo" className="space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Megaphone className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Para empresas de Piracanjuba
        </p>
        <h1 id="anuncie-titulo" className="text-3xl font-extrabold text-foreground md:text-5xl">
          Sua empresa com página própria no Piracanjuba<span className="text-[#25D366]">.ai</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Um outdoor digital: uma página só da sua empresa, no endereço piracanjuba.ai/suaempresa, com
          logo, foto, serviços, contato e botão de WhatsApp.
        </p>
        <p className="text-lg font-semibold text-foreground">
          {PRECO} em pagamento único, sem mensalidade.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <BotaoWhatsapp rotulo="Quero a página da minha empresa" />
          <a
            href="#exemplos"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border px-5 py-3 text-base font-medium text-foreground transition-colors hover:border-primary"
          >
            Ver exemplos
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section id="exemplos" aria-labelledby="anuncie-exemplos" className="scroll-mt-20 space-y-5">
        <h2 id="anuncie-exemplos" className="text-2xl font-bold text-foreground">
          Veja como fica
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {exemplos.map((empresa) => (
            <li key={empresa.slug}>
              <Link
                href={`/${empresa.slug}`}
                className="stat-card card-hover flex h-full items-center gap-4"
              >
                <span className="flex h-16 w-32 shrink-0 items-center justify-center rounded-xl border bg-white p-2">
                  <Image
                    src={empresa.logo.src}
                    alt=""
                    width={empresa.logo.largura}
                    height={empresa.logo.altura}
                    unoptimized={empresa.logo.src.endsWith(".svg")}
                    className="h-auto max-h-12 w-auto max-w-full object-contain"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">{empresa.nome}</span>
                  <span className="block text-sm text-muted-foreground">{empresa.categoria}</span>
                  <span className="mt-1 block text-sm font-medium text-primary">
                    piracanjuba.ai/{empresa.slug}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="anuncie-inclui" className="grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-start">
        <div className="space-y-5">
          <h2 id="anuncie-inclui" className="text-2xl font-bold text-foreground">
            O que vem na página
          </h2>
          <ul className="space-y-3">
            {INCLUI.map(({ icone: Icone, texto }) => (
              <li key={texto} className="flex items-start gap-3 text-foreground">
                <Icone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span>{texto}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="stat-card space-y-4 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground/75">Investimento</p>
          <p className="text-4xl font-extrabold text-foreground">{PRECO}</p>
          <ul className="space-y-2 text-sm text-foreground">
            {["Pagamento único", "Sem mensalidade", "No ar enquanto o portal existir", "Textos e montagem pela equipe do portal"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ),
            )}
          </ul>
          <BotaoWhatsapp rotulo="Falar no WhatsApp" />
          <p className="text-xs text-foreground/75">
            Vendido pela Ferro Labs Tecnologia LTDA, CNPJ 66.034.538/0001-25, que mantém o Piracanjuba.ai.
          </p>
        </div>
      </section>

      <section aria-labelledby="anuncie-passos" className="space-y-5">
        <h2 id="anuncie-passos" className="text-2xl font-bold text-foreground">
          Como funciona
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((passo, indice) => (
            <li key={passo.titulo} className="stat-card space-y-2">
              <span className="text-3xl font-extrabold text-primary" aria-hidden="true">
                {indice + 1}
              </span>
              <h3 className="font-semibold text-foreground">
                <span className="sr-only">Passo {indice + 1}: </span>
                {passo.titulo}
              </h3>
              <p className="text-sm text-muted-foreground">{passo.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="anuncie-portal" className="stat-card space-y-4">
        <h2 id="anuncie-portal" className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Newspaper className="h-6 w-6 text-primary" aria-hidden="true" />
          Por que no Piracanjuba.ai
        </h2>
        <p className="text-foreground">
          O Piracanjuba.ai reúne serviços do dia a dia da cidade, como farmácia de plantão, coleta de lixo,
          horários de ônibus, o Zap PBA e os classificados, além dos dados públicos da Prefeitura e da Câmara.
        </p>
        <p className="text-foreground">
          O portal já apareceu na imprensa, em reportagens, entrevistas e citações: {listaComE(veiculos)}.{" "}
          <Link href="/na-midia" className="font-medium text-primary underline-offset-4 hover:underline">
            Ver as matérias
          </Link>
          .
        </p>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Scale className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Os veículos falaram do portal, não das empresas anunciantes. As páginas de empresa levam o selo
          &quot;Página patrocinada&quot; e ficam separadas da cobertura de transparência.
        </p>
      </section>

      <section aria-labelledby="anuncie-perguntas" className="space-y-4">
        <h2 id="anuncie-perguntas" className="text-2xl font-bold text-foreground">
          Perguntas frequentes
        </h2>
        <div className="divide-y rounded-2xl border bg-card">
          {PERGUNTAS.map((item) => (
            <details key={item.pergunta} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-medium text-foreground [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.pergunta}
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  />
                </span>
              </summary>
              <p className="mt-2 text-foreground/75">{item.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="anuncie-final"
        className="space-y-4 rounded-3xl bg-primary/10 px-6 py-10 text-center"
      >
        <h2 id="anuncie-final" className="text-2xl font-bold text-foreground md:text-3xl">
          Quer a página da sua empresa?
        </h2>
        <p className="text-foreground/75">
          {PRECO} em pagamento único. Chame no WhatsApp e tire as dúvidas.
        </p>
        <BotaoWhatsapp rotulo="Quero a página da minha empresa" />
      </section>
    </div>
  );
}
