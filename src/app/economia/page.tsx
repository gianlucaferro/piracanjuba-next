import { TrendingUp } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import EmColetaSection from "@/components/EmColetaSection";

export const metadata = pageMetadata({
  title: "Economia Local de Piracanjuba GO",
  description:
    "Empregos formais, empresas ativas, salários médios, PIB municipal e dinâmica do mercado de trabalho em Piracanjuba.",
  path: "/economia",
});

export default function EconomiaPage() {
  return (
    <div className="container py-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          Economia Local
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Empregos formais, empresas ativas, salários e dinâmica do mercado de trabalho de Piracanjuba.
        </p>
      </header>

      <EmColetaSection
        titulo="Economia Local de Piracanjuba"
        descricao="Acompanhamento da dinâmica econômica local — empregos formais admitidos e desligados, salários médios por setor, empresas ativas e novas, PIB municipal e indicadores de produtividade."
        iconBg="bg-emerald-500/10"
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
            nome: "IBGE Cidades — Piracanjuba",
            url: "https://cidades.ibge.gov.br/brasil/go/piracanjuba/panorama",
            descricao: "PIB municipal, PIB per capita, empregos, salário médio.",
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
