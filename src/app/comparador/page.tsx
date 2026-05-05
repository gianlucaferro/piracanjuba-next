import Link from "next/link";
import { ArrowRight, BarChart3, ExternalLink, MapPin, TrendingUp, Trophy } from "lucide-react";
import { pageMetadata, datasetJsonLd } from "@/lib/seo";
import { fetchIndicadores } from "@/lib/data/home";

export const metadata = pageMetadata({
  title: "Comparador Municipal — Piracanjuba × cidades vizinhas (GO)",
  description:
    "Comparativo de Piracanjuba com Pontalina, Hidrolândia, Bela Vista de Goiás, Cristianópolis e Cromínia. População, PIB per capita, IDHM, IDEB, salário médio e mais.",
  path: "/comparador",
});

export const revalidate = 3600;

const SITE_URL = "https://piracanjuba.ai";

const dataset = datasetJsonLd({
  name: "Comparador Municipal Piracanjuba × vizinhas",
  description:
    "Comparativo socioeconômico de Piracanjuba com 5 municípios vizinhos do Sul de Goiás (Pontalina, Hidrolândia, Bela Vista de Goiás, Cristianópolis, Cromínia). Indicadores IBGE Cidades, PNUD/Atlas Brasil, INEP.",
  url: `${SITE_URL}/comparador`,
  creator: {
    type: "GovernmentOrganization",
    name: "IBGE + PNUD + INEP",
  },
  dateModified: new Date().toISOString().slice(0, 10),
  keywords: [
    "comparador municipal",
    "Piracanjuba",
    "Pontalina",
    "Hidrolândia",
    "Bela Vista de Goiás",
    "Cristianópolis",
    "Cromínia",
    "IDHM",
    "PIB",
    "IDEB",
  ],
});

// 6 municipios — Piracanjuba + 5 vizinhos diretos (raio ~50km)
const municipios = [
  {
    slug: "piracanjuba",
    nome: "Piracanjuba",
    ibge: 5217104,
    destaque: true,
    descricao: "Foco do portal — sul de Goiás, Cerrado, polo agropecuário.",
  },
  {
    slug: "pontalina",
    nome: "Pontalina",
    ibge: 5217708,
    descricao: "Vizinha leste, segue padrão agropecuário similar.",
  },
  {
    slug: "hidrolandia",
    nome: "Hidrolândia",
    ibge: 5209705,
    descricao: "Vizinha noroeste, próxima a Goiânia (60km).",
  },
  {
    slug: "bela-vista-de-goias",
    nome: "Bela Vista de Goiás",
    ibge: 5203302,
    descricao: "Vizinha oeste, área urbana relativamente maior.",
  },
  {
    slug: "cristianopolis",
    nome: "Cristianópolis",
    ibge: 5206305,
    descricao: "Vizinha pequena, ~3 mil habitantes.",
  },
  {
    slug: "crominia",
    nome: "Cromínia",
    ibge: 5206503,
    descricao: "Vizinha sul, vocação agrícola.",
  },
];

function ibgeUrl(slug: string) {
  return `https://cidades.ibge.gov.br/brasil/go/${slug}/panorama`;
}

export default async function ComparadorPage() {
  const todos = await fetchIndicadores();
  const findVal = (chave: string) =>
    todos.find((i) => i.chave === chave);

  // Dados Piracanjuba consolidados do DB
  const pira = {
    populacao: findVal("populacao")?.valor_texto || "25.373 hab",
    populacaoAno: findVal("populacao")?.ano_referencia || 2025,
    pibPerCapita: findVal("pib_per_capita")?.valor_texto || "R$ 52.716,61",
    pibPerCapitaAno: findVal("pib_per_capita")?.ano_referencia || 2023,
    idhm: findVal("idhm")?.valor_texto || "0,721",
    idhmAno: findVal("idhm")?.ano_referencia || 2010,
    ideb: findVal("ideb_anos_iniciais")?.valor_texto || "5,9",
    idebAno: findVal("ideb_anos_iniciais")?.ano_referencia || 2023,
    salario: findVal("salario_medio_formal")?.valor_texto || "2,2 SM",
    salarioAno: findVal("salario_medio_formal")?.ano_referencia || 2023,
    saneamento: findVal("saneamento_cobertura")?.valor_texto || "69,1%",
    saneamentoAno: findVal("saneamento_cobertura")?.ano_referencia || 2022,
    frota: findVal("frota_veiculos")?.valor_texto || "20.424",
    frotaAno: findVal("frota_veiculos")?.ano_referencia || 2024,
  };

  return (
    <div className="container py-6 max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }}
      />

      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary" />
          Comparador Municipal
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed max-w-3xl">
          Como Piracanjuba se compara com seus vizinhos diretos no Sul de Goiás. Dados oficiais
          do IBGE, PNUD/Atlas Brasil e INEP. Os indicadores de Piracanjuba estão consolidados aqui;
          os dos vizinhos são acessíveis pelo IBGE Cidades — em fase próxima vamos integrar
          comparativo automático.
        </p>
      </header>

      {/* Indicadores de Piracanjuba consolidados */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />
          Piracanjuba — indicadores consolidados
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase">População</p>
            <p className="text-xl font-extrabold text-foreground mt-1">{pira.populacao}</p>
            <p className="text-[10px] text-muted-foreground">IBGE est. {pira.populacaoAno}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase">PIB per capita</p>
            <p className="text-xl font-extrabold text-foreground mt-1">{pira.pibPerCapita}</p>
            <p className="text-[10px] text-muted-foreground">IBGE {pira.pibPerCapitaAno}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase">IDHM</p>
            <p className="text-xl font-extrabold text-foreground mt-1">{pira.idhm}</p>
            <p className="text-[10px] text-muted-foreground">PNUD {pira.idhmAno}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase">IDEB Iniciais</p>
            <p className="text-xl font-extrabold text-foreground mt-1">{pira.ideb}</p>
            <p className="text-[10px] text-muted-foreground">INEP {pira.idebAno}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase">Salário médio</p>
            <p className="text-xl font-extrabold text-foreground mt-1">{pira.salario}</p>
            <p className="text-[10px] text-muted-foreground">IBGE {pira.salarioAno}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase">Saneamento</p>
            <p className="text-xl font-extrabold text-foreground mt-1">{pira.saneamento}</p>
            <p className="text-[10px] text-muted-foreground">IBGE {pira.saneamentoAno}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase">Frota</p>
            <p className="text-xl font-extrabold text-foreground mt-1">{pira.frota}</p>
            <p className="text-[10px] text-muted-foreground">SENATRAN {pira.frotaAno}</p>
          </div>
          <Link
            href="/indicadores"
            className="stat-card card-hover flex flex-col items-center justify-center text-center group"
          >
            <p className="text-xs text-primary font-medium">Ver todos os indicadores</p>
            <ArrowRight className="w-4 h-4 text-primary mt-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Cards municipios vizinhos */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-emerald-600" />
          Municípios vizinhos — comparar via IBGE Cidades
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Os vizinhos diretos de Piracanjuba no Sul de Goiás (raio ~50km). Clique pra ver
          dados oficiais de cada um direto na fonte:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {municipios.map((m) => (
            <a
              key={m.slug}
              href={ibgeUrl(m.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className={`stat-card card-hover group ${
                m.destaque ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground text-base">
                  {m.nome}
                  {m.destaque && (
                    <span className="ml-1.5 text-[10px] font-normal text-primary uppercase tracking-wider">
                      Foco
                    </span>
                  )}
                </h3>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                {m.descricao}
              </p>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                IBGE: {m.ibge} · {m.destaque ? "Dados completos no Piracanjuba.ai" : "Ver no IBGE Cidades"}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Roadmap — comparativo automático */}
      <section className="stat-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Em desenvolvimento — comparativo automático
        </h3>
        <p className="text-sm text-foreground/85 leading-relaxed mb-3">
          Vamos integrar dados das 6 cidades em uma tabela única comparável, com ranking
          automático por indicador (Piracanjuba × vizinhas) em:
        </p>
        <ul className="text-sm text-foreground/85 space-y-1.5 list-none pl-1">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span><strong>População e densidade</strong> via IBGE Estimativa anual</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span><strong>PIB total e per capita</strong> via IBGE Contas Regionais</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span><strong>IDHM (Educação, Renda, Longevidade)</strong> via Atlas Brasil PNUD</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span><strong>IDEB Anos Iniciais e Finais</strong> via INEP</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span><strong>Saneamento (água, esgoto, lixo)</strong> via SNIS Painel Municipal</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span><strong>Mortalidade infantil</strong> via DataSUS SIM/SINASC</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span><strong>Despesa de pessoal % RCL</strong> via TCM-GO/Tesouro Nacional</span>
          </li>
        </ul>
      </section>

      <p className="text-xs text-muted-foreground italic mt-6 text-center">
        Iniciativa cidadã independente. Cada dado linka para sua fonte oficial primária.
      </p>
    </div>
  );
}
