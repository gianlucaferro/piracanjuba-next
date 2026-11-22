import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Globe,
  Link2,
  MapPin,
  Megaphone,
  MessageSquare,
  Newspaper,
  PenLine,
  Rocket,
  Scale,
  Search,
  Signpost,
  Smartphone,
  Wallet,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { EMPRESAS } from "@/data/empresas";
import { SLUGS_EMPRESAS } from "@/data/empresas-slugs";
import { MATERIAS_NA_MIDIA } from "@/data/naMidia";
import {
  DESCONTO_PAGINA_EMPRESA_TEXTO,
  LINK_STRIPE_PAGINA_EMPRESA,
  PERMANENCIA_PAGINA_EMPRESA_TEXTO,
  PRECO_CHEIO_PAGINA_EMPRESA_TEXTO,
  PRECO_PAGINA_EMPRESA,
  PRAZO_PAGINA_EMPRESA_TEXTO,
  PRECO_PAGINA_EMPRESA_TEXTO,
  WHATSAPP_COMERCIAL,
} from "@/data/paginaEmpresa";
import { SCHEMA_IDS, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { linkWhatsapp } from "@/lib/whatsapp";

// Página de vendas do "outdoor digital": a página de empresa em
// piracanjuba.ai/<slug>. Termos decididos pelo operador em 2026-11-16:
// preço público de R$ 600 em pagamento único, sem mensalidade, sem os antigos
// planos de banner e sem números de audiência (nunca foram conferidos).
// Também do operador, no mesmo dia: hipóteses específicas de retirada,
// correção de contato sem custo, e nenhuma regra publicada sobre propaganda
// política (cada caso é decidido na conversa). Em 2026-11-17: preço "de R$ 1.000
// (riscado) por R$ 600", termos "pagamento único" e "sem mensalidade" em destaque,
// e os botões "Cadastre-se agora" (checkout em /anuncie/cadastro) e "Entrar em contato".

const PRECO = PRECO_PAGINA_EMPRESA_TEXTO;
const MENSAGEM =
  "Olá! Vi no Piracanjuba.ai e quero uma página para a minha empresa. Pode me passar os detalhes?";

export const metadata = pageMetadata({
  title: `Página da sua empresa por ${PRECO}`,
  description: `Página própria da sua empresa em piracanjuba.ai/suaempresa, com logo, foto, serviços e botão de WhatsApp. Pagamento único de ${PRECO}, sem mensalidade.`,
  path: "/anuncie",
});

// Os dois termos que o operador pediu em destaque (2026-11-17).
const DESTAQUES = ["Pagamento único", "Sem mensalidade"];
const SELO_DESTAQUE =
  "inline-flex items-center gap-1.5 rounded-full bg-green-600/10 px-4 py-2 text-lg font-bold text-green-800 ring-1 ring-green-600/40 dark:text-green-300";

const INCLUI = [
  { icone: Globe, texto: "Endereço próprio: piracanjuba.ai/suaempresa" },
  { icone: BadgeCheck, texto: "Logo, foto, cores e fontes da sua marca" },
  { icone: PenLine, texto: "Apresentação, produtos ou serviços, diferenciais e como funciona o atendimento" },
  { icone: MessageSquare, texto: "Botão de WhatsApp com mensagem pronta, mais Instagram e site" },
  { icone: MapPin, texto: "Endereço, horário de atendimento e link do mapa" },
  { icone: Smartphone, texto: "Versão para celular com o botão de WhatsApp sempre à mão" },
  { icone: Rocket, texto: "Preparada para o Google: título, descrição, dados estruturados e sitemap" },
];

// Vantagens de ter a página, pedido do operador em 2026-11-17, incluindo a comparação
// entre a placa na rua e a página online. Sem números de audiência nem garantia de
// posição no Google (decisões de 2026-11-16).
const VANTAGENS = [
  {
    icone: Link2,
    titulo: "Um link só seu",
    texto: "piracanjuba.ai/suaempresa para a bio do Instagram, grupos de WhatsApp, cartão de visita e QR Code no balcão.",
  },
  {
    icone: Search,
    titulo: "Encontrada mesmo sem site",
    texto: "A página já sai pronta para o Google, com título, descrição e dados estruturados, num endereço que o Google já conhece.",
  },
  {
    icone: MapPin,
    titulo: "Combina com o Perfil da Empresa no Google",
    texto: "Use a página como o site do seu perfil gratuito do Google, para quem achar você no Maps saber o que você faz.",
  },
  {
    icone: Wallet,
    titulo: "Sem mensalidade e sem manutenção",
    texto: "Nada de hospedagem, renovação de domínio ou atualização de segurança: isso fica com o portal.",
  },
  {
    icone: Smartphone,
    titulo: "Pronta para o celular",
    texto: "Quem abre pelo celular encontra o botão de WhatsApp com mensagem pronta sempre à mão.",
  },
  {
    icone: PenLine,
    titulo: "Escrita pela equipe",
    texto: "Você conta o que a empresa faz; a equipe do portal escreve, monta e você aprova.",
  },
];

const PASSOS = [
  {
    titulo: "Faça o cadastro",
    texto: `Preencha os dados da empresa e pague por ${LINK_STRIPE_PAGINA_EMPRESA ? "PIX ou cartão" : "PIX"}.`,
  },
  {
    titulo: "Envie o material",
    texto: "Logo, fotos e o que mais você quer na página, pelo WhatsApp.",
  },
  {
    titulo: "Escrevemos e montamos",
    texto: "A equipe do portal escreve os textos e monta a página. Você revisa e aprova.",
  },
  {
    titulo: "Página no ar",
    texto: `Publicada em piracanjuba.ai/suaempresa ${PRAZO_PAGINA_EMPRESA_TEXTO}, pronta para compartilhar.`,
  },
];

const PERGUNTAS = [
  {
    pergunta: "É mensalidade?",
    resposta: `Não. São ${PRECO} em pagamento único, sem mensalidade.`,
  },
  {
    pergunta: "Em quanto tempo a página fica pronta?",
    resposta: `A página vai ao ar ${PRAZO_PAGINA_EMPRESA_TEXTO} (logo, fotos e informações da empresa). Antes de publicar, você revisa e aprova.`,
  },
  {
    pergunta: "Por quanto tempo a página fica no ar?",
    resposta: `${PERMANENCIA_PAGINA_EMPRESA_TEXTO}. Ela só é retirada a pedido da empresa, se a empresa encerrar as atividades, por ordem judicial ou se uma informação falsa não puder ser corrigida.`,
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
    resposta: LINK_STRIPE_PAGINA_EMPRESA
      ? "No cadastro da página: PIX para o CNPJ da Ferro Labs ou cartão de crédito em uma vez, pelo Stripe."
      : "No cadastro da página, por PIX para o CNPJ da Ferro Labs. Também dá para combinar pelo WhatsApp.",
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

function BotaoCadastro() {
  return (
    <Link
      href="/anuncie/cadastro"
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#15803d] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#166534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]"
    >
      Cadastre-se agora
      <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
    </Link>
  );
}

function BotaoContato() {
  return (
    <a
      href={linkWhatsapp(WHATSAPP_COMERCIAL, MENSAGEM)}
      target="_blank"
      rel="noopener"
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[#15803d] px-6 py-3 text-base font-semibold text-[#15803d] transition-colors hover:bg-[#15803d]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d] dark:border-green-400 dark:text-green-300"
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0" fill="currentColor" />
      Entrar em contato
      <span className="sr-only"> pelo WhatsApp (abre em nova aba)</span>
    </a>
  );
}

/** Quadro de preço no modelo pedido pelo operador: desconto, de/por e os dois botões. */
function QuadroPreco({ id }: { id: string }) {
  return (
    <div className="stat-card space-y-4 border-2 border-[#15803d]/40">
      <span className="inline-block rounded-full bg-[#15803d] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
        Desconto de {DESCONTO_PAGINA_EMPRESA_TEXTO}
      </span>
      <h2 id={id} className="text-sm font-semibold uppercase tracking-wide text-foreground/75">
        Página de empresa
      </h2>
      <p className="text-foreground/75">
        de <span className="sr-only">(valor riscado) </span>
        <span className="text-lg line-through">{PRECO_CHEIO_PAGINA_EMPRESA_TEXTO}</span> por
      </p>
      <p className="text-5xl font-extrabold text-foreground">{PRECO}</p>
      <div className="flex flex-wrap gap-2">
        {DESTAQUES.map((destaque) => (
          <span key={destaque} className={SELO_DESTAQUE}>
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            {destaque}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <BotaoCadastro />
        <BotaoContato />
      </div>
      <a
        href="#o-que-vem"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Ver o que está incluso
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
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

      <section
        aria-labelledby="anuncie-titulo"
        className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center"
      >
        <div className="space-y-5 text-center md:text-left">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 md:mx-0">
          <Megaphone className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/75">
          Para empresas de Piracanjuba
        </p>
        <h1 id="anuncie-titulo" className="text-3xl font-extrabold text-foreground md:text-5xl">
          Sua empresa com página própria no Piracanjuba<span className="text-[#25D366]">.ai</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-foreground/75 md:mx-0">
          Um outdoor digital: uma página só da sua empresa, no endereço piracanjuba.ai/suaempresa, com
          logo, foto, serviços, contato e botão de WhatsApp.
        </p>
        <a
          href="#exemplos"
          className="inline-flex min-h-11 items-center gap-2 text-base font-medium text-primary underline-offset-4 hover:underline"
        >
          Ver exemplos de páginas
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
        </div>
        <QuadroPreco id="anuncie-preco" />
      </section>

      <section aria-labelledby="anuncie-vantagens" className="space-y-6">
        <h2 id="anuncie-vantagens" className="text-2xl font-bold text-foreground">
          Vantagens de ter a página da sua empresa
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-2xl border bg-card p-5">
            <Signpost className="h-7 w-7 text-foreground/75" aria-hidden="true" />
            <h3 className="font-semibold text-foreground">Placa na rua</h3>
            <p className="text-foreground/75">Só vê quem passa por aquela rua, na hora em que passa.</p>
          </div>
          <div className="space-y-2 rounded-2xl border-2 border-[#15803d]/40 bg-green-600/5 p-5">
            <Globe className="h-7 w-7 text-[#15803d] dark:text-green-400" aria-hidden="true" />
            <h3 className="font-semibold text-foreground">Página no Piracanjuba.ai</h3>
            <p className="text-foreground">
              Fica no ar 24 horas e qualquer pessoa vê pelo celular, sem sair de casa. E pode aparecer para quem
              procura no Google pelo seu serviço ou produto em Piracanjuba.
            </p>
          </div>
        </div>
        <p className="text-foreground/75">
          Uma não substitui a outra: a placa mostra onde você está, e a página leva o cliente até ela.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VANTAGENS.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="stat-card space-y-2">
              <Icone className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="font-semibold text-foreground">{titulo}</h3>
              <p className="text-sm text-foreground/75">{texto}</p>
            </li>
          ))}
        </ul>
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
                  <span className="block text-sm text-foreground/75">{empresa.categoria}</span>
                  <span className="mt-1 block text-sm font-medium text-primary">
                    piracanjuba.ai/{empresa.slug}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-foreground/75" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="o-que-vem" aria-labelledby="anuncie-inclui" className="scroll-mt-20 space-y-5">
        <h2 id="anuncie-inclui" className="text-2xl font-bold text-foreground">
          O que vem na página
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {INCLUI.map(({ icone: Icone, texto }) => (
            <li key={texto} className="flex items-start gap-3 text-foreground">
              <Icone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>{texto}</span>
            </li>
          ))}
          {[PERMANENCIA_PAGINA_EMPRESA_TEXTO, "Textos e montagem pela equipe do portal"].map((texto) => (
            <li key={texto} className="flex items-start gap-3 text-foreground">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>{texto}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-foreground/75">
          Vendido pela Ferro Labs Tecnologia LTDA, CNPJ 66.034.538/0001-25, que mantém o Piracanjuba.ai.
        </p>
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
              <p className="text-sm text-foreground/75">{passo.texto}</p>
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
        <p className="flex items-start gap-2 text-sm text-foreground/75">
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
                    className="h-4 w-4 shrink-0 text-foreground/75 transition-transform group-open:rotate-90"
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
          De <span className="line-through">{PRECO_CHEIO_PAGINA_EMPRESA_TEXTO}</span> por {PRECO}, em pagamento
          único e sem mensalidade.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <BotaoCadastro />
          <BotaoContato />
        </div>
      </section>
    </div>
  );
}
