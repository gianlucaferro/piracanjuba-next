import { TrendingUp } from "lucide-react";
import { pageMetadata, datasetJsonLd } from "@/lib/seo";
import EmColetaSection from "@/components/EmColetaSection";
import { fetchIndicadores } from "@/lib/data/home";

export const metadata = pageMetadata({
  title: "Economia Local de Piracanjuba GO",
  description:
    "Empregos formais, empresas ativas, salários médios, PIB municipal e dinâmica do mercado de trabalho em Piracanjuba.",
  path: "/economia",
});

export const revalidate = 3600;

const SITE_URL = "https://piracanjuba.ai";

const economiaDataset = datasetJsonLd({
  name: "Economia Local de Piracanjuba",
  description:
    "Indicadores socioeconômicos consolidados de Piracanjuba: PIB per capita, empregos formais, salário médio, distribuição de renda. Fonte IBGE Cidades.",
  url: `${SITE_URL}/economia`,
  creator: {
    type: "GovernmentOrganization",
    name: "IBGE — Instituto Brasileiro de Geografia e Estatística",
    url: "https://www.ibge.gov.br/",
  },
  dateModified: new Date().toISOString().slice(0, 10),
  keywords: ["economia", "Piracanjuba", "PIB", "empregos formais", "RAIS", "IBGE"],
});

export default async function EconomiaPage() {
  const todos = await fetchIndicadores();

  // Mapeamento dos indicadores que pertencem a Economia
  const findVal = (chave: string) => todos.find((i) => i.chave === chave);
  const m = (chave: string, rotulo: string): { rotulo: string; valor?: string; fonte?: string; fonteUrl?: string } | null => {
    const ind = findVal(chave);
    if (!ind) return null;
    return {
      rotulo,
      valor: ind.valor_texto || "—",
      fonte: ind.fonte_url ? `IBGE ${ind.ano_referencia}` : undefined,
      fonteUrl: ind.fonte_url || undefined,
    };
  };

  const indicadores = [
    m("pib_per_capita", "PIB per capita"),
    m("pessoal_ocupado_formal", "Empregos formais"),
    m("salario_medio_formal", "Salário médio (SM)"),
    m("populacao_ate_meio_sm", "Pop. até ½ salário mín."),
    m("populacao", "População"),
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="container py-6 max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(economiaDataset) }}
      />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          Economia Local
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Empregos formais, salários, distribuição de renda e PIB de Piracanjuba — dados consolidados via IBGE.
        </p>
      </header>

      <EmColetaSection
        titulo="Economia Local de Piracanjuba"
        descricao="Acompanhamento da dinâmica econômica local — empregos formais admitidos e desligados, salários médios por setor, empresas ativas e novas, PIB municipal e indicadores de produtividade."
        iconBg="bg-emerald-500/10"
        indicadores={indicadores}
        exemplosCruzamentos={[
          "Empregos admitidos vs desligados por setor (CAGED mensal)",
          "Salário médio por CNAE — agropecuária, comércio, serviços, indústria (RAIS)",
          "Empresas ativas, novas e baixadas — dinâmica empresarial (Receita Federal)",
          "PIB total e per capita de Piracanjuba comparado com vizinhos (IBGE)",
          "MEIs ativos e crescimento (Receita Federal / Sebrae)",
          "Cruzamento empregos × safra (clima ruim → demissão na agropecuária)",
        ]}
        fontes={[
          {
            nome: "IBGE Cidades — Piracanjuba",
            url: "https://cidades.ibge.gov.br/brasil/go/piracanjuba/panorama",
            descricao: "PIB municipal, PIB per capita, empregos, salário médio, população.",
          },
          {
            nome: "Novo CAGED — Ministério do Trabalho",
            url: "https://app.powerbi.com/view?r=eyJrIjoiNWI5NWI0ODEtYmZiYy00Mjg3LWJhNjMtMzVkOTAyNTIzNzhmIiwidCI6ImNkZWUyNDA1LTk5ZmItNDQ4Mi05ZmFhLTVhMzVjOWE5NzA1NCJ9",
            descricao: "Empregos admitidos e desligados por mês, setor e ocupação.",
          },
          {
            nome: "RAIS — Relação Anual de Informações Sociais",
            url: "http://pdet.mte.gov.br/rais",
            descricao: "Estoque anual de empregos formais e remuneração por CNAE.",
          },
          {
            nome: "Receita Federal — Consulta CNPJ",
            url: "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp",
            descricao: "Empresas ativas, situação cadastral, atividade econômica.",
          },
          {
            nome: "Portal SEBRAE — MEI",
            url: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor",
            descricao: "Microempreendedores Individuais ativos e novos cadastros.",
          },
          {
            nome: "Portal da Transparência — ICMS distribuído",
            url: "https://portaldatransparencia.gov.br/",
            descricao: "Repasse do ICMS estadual ao município de Piracanjuba.",
          },
        ]}
      />
    </div>
  );
}
