import { Trees } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import EmColetaSection from "@/components/EmColetaSection";

export const metadata = pageMetadata({
  title: "Meio Ambiente em Piracanjuba GO",
  description:
    "Uso e cobertura do solo (MapBiomas), desmatamento (DETER/PRODES), qualidade ambiental, áreas protegidas e licenciamentos em Piracanjuba.",
  path: "/meio-ambiente",
});

export default function MeioAmbientePage() {
  return (
    <div className="container py-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trees className="w-6 h-6 text-emerald-700" />
          Meio Ambiente
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uso do solo, desmatamento, áreas protegidas e qualidade ambiental em Piracanjuba.
        </p>
      </header>

      <EmColetaSection
        titulo="Meio Ambiente em Piracanjuba"
        descricao="Evolução do uso e cobertura do solo (1985-presente), alertas de desmatamento, áreas protegidas, Cadastro Ambiental Rural (CAR) e qualidade ambiental — incluindo cruzamento com dados climáticos e agropecuários do município."
        iconBg="bg-emerald-700/10"
        exemplosCruzamentos={[
          "Evolução anual de pasto, agricultura, mata nativa e área urbana (MapBiomas 1985-2026)",
          "Alertas de desmatamento em tempo real (DETER/INPE)",
          "Cadastro Ambiental Rural (CAR): % de imóveis com APP/RL regularizados",
          "Embargos ambientais ativos (IBAMA)",
          "Cruzamento desmatamento × expansão da soja × emissão CO2 estimada",
          "Cruzamento chuva × seca × incêndios florestais (queimadas)",
          "Áreas de Preservação Permanente: rios, encostas, nascentes",
          "Reservas Particulares do Patrimônio Natural (RPPN) no município",
        ]}
        fontes={[
          {
            nome: "MapBiomas — Plataforma de Mapeamento",
            url: "https://plataforma.brasil.mapbiomas.org/",
            descricao: "Uso e cobertura do solo de 1985 a presente, atualização anual.",
          },
          {
            nome: "DETER/INPE — Alertas de Desmatamento",
            url: "http://terrabrasilis.dpi.inpe.br/",
            descricao: "Alertas mensais de desmatamento e degradação florestal.",
          },
          {
            nome: "PRODES/INPE — Mapeamento Anual",
            url: "http://www.obt.inpe.br/OBT/assuntos/programas/amazonia/prodes",
            descricao: "Taxa anual de desmatamento bruto.",
          },
          {
            nome: "SICAR — Sistema Nacional do CAR",
            url: "https://www.car.gov.br/",
            descricao: "Cadastro Ambiental Rural — imóveis cadastrados, áreas RL/APP.",
          },
          {
            nome: "IBAMA — Embargos e Autuações",
            url: "https://www.gov.br/ibama/pt-br",
            descricao: "Embargos ambientais e autuações por infração.",
          },
          {
            nome: "BDQueimadas/INPE",
            url: "https://queimadas.dgi.inpe.br/queimadas/bdqueimadas",
            descricao: "Focos de queimadas detectados via satélite.",
          },
          {
            nome: "SEMARH-GO",
            url: "https://www.meioambiente.go.gov.br/",
            descricao: "Secretaria estadual: licenciamentos, recursos hídricos, fauna.",
          },
          {
            nome: "ANA — Recursos Hídricos",
            url: "https://www.gov.br/ana/pt-br",
            descricao: "Vazão de rios, qualidade da água, outorgas.",
          },
        ]}
      />
    </div>
  );
}
