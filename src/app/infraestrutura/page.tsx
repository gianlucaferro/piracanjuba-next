import { Building } from "lucide-react";
import { pageMetadata, datasetJsonLd } from "@/lib/seo";
import EmColetaSection from "@/components/EmColetaSection";
import { fetchIndicadores } from "@/lib/data/home";

export const metadata = pageMetadata({
  title: "Infraestrutura Urbana de Piracanjuba GO",
  description:
    "Saneamento básico, energia elétrica, conectividade, iluminação pública, pavimentação e demais indicadores de infraestrutura urbana de Piracanjuba.",
  path: "/infraestrutura",
});

export const revalidate = 3600;

const SITE_URL = "https://piracanjuba.ai";

const infraDataset = datasetJsonLd({
  name: "Infraestrutura Urbana de Piracanjuba",
  description:
    "Indicadores de saneamento básico, energia elétrica, conectividade móvel e infraestrutura urbana de Piracanjuba. Fontes IBGE, SNIS, ANEEL.",
  url: `${SITE_URL}/infraestrutura`,
  creator: {
    type: "GovernmentOrganization",
    name: "IBGE + SNIS + ANEEL",
  },
  dateModified: new Date().toISOString().slice(0, 10),
  keywords: ["infraestrutura", "Piracanjuba", "saneamento", "água", "esgoto", "energia"],
});

export default async function InfraestruturaPage() {
  const todos = await fetchIndicadores();
  const findVal = (chave: string) => todos.find((i) => i.chave === chave);

  const indicadores: Array<{ rotulo: string; valor?: string; fonte?: string; fonteUrl?: string }> = [];

  const sane = findVal("saneamento_cobertura");
  if (sane) {
    indicadores.push({
      rotulo: "Saneamento (cobertura)",
      valor: sane.valor_texto || "—",
      fonte: `IBGE ${sane.ano_referencia}`,
      fonteUrl: sane.fonte_url || undefined,
    });
  }

  const frota = findVal("frota_veiculos");
  if (frota) {
    indicadores.push({
      rotulo: "Frota de veículos",
      valor: frota.valor_texto || "—",
      fonte: `SENATRAN ${frota.ano_referencia}`,
      fonteUrl: frota.fonte_url || "https://www.gov.br/senatran/pt-br/assuntos/estatisticas/frota-de-veiculos-1",
    });
  }

  return (
    <div className="container py-6 max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(infraDataset) }}
      />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building className="w-6 h-6 text-slate-600" />
          Infraestrutura Urbana
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Saneamento, energia, conectividade e demais indicadores de infraestrutura urbana de Piracanjuba.
        </p>
      </header>

      <EmColetaSection
        titulo="Infraestrutura Urbana de Piracanjuba"
        descricao="Indicadores de saneamento básico (água, esgoto, lixo), energia elétrica, conectividade móvel, pavimentação e iluminação pública — base pra acompanhar qualidade de vida urbana."
        iconBg="bg-slate-500/10"
        indicadores={indicadores}
        exemplosCruzamentos={[
          "Cobertura de água tratada e esgoto sanitário (SNIS — Sistema Nacional Saneamento)",
          "Coleta de lixo: dias por semana, % atendimento (SNIS + Prefeitura)",
          "Tarifa de energia elétrica + interrupções (ANEEL)",
          "Cobertura 4G/5G por bairro + reclamações (ANATEL)",
          "Iluminação pública: pontos LED instalados, manutenção pendente",
          "Pavimentação: km asfaltados por bairro, ano de implantação",
          "Internet pública (Wi-Fi gratuito) em pontos da cidade",
          "Cruzamento saneamento × dengue × bairros mais afetados",
        ]}
        fontes={[
          {
            nome: "SNIS — Sistema Nacional de Informações sobre Saneamento",
            url: "http://www.snis.gov.br/painel-informacoes-saneamento-brasil/web/painel-municipal",
            descricao: "Cobertura água, esgoto, lixo, perdas, tarifas. Atualização anual. Painel municipal disponível.",
          },
          {
            nome: "ANEEL — Agência Nacional de Energia Elétrica",
            url: "https://www.gov.br/aneel/pt-br",
            descricao: "Tarifas, interrupções, qualidade do serviço de energia.",
          },
          {
            nome: "ANATEL — Cobertura móvel",
            url: "https://www.gov.br/anatel/pt-br/dados/cobertura/cobertura-de-rede-movel",
            descricao: "Cobertura 4G/5G por município, qualidade do sinal.",
          },
          {
            nome: "DNIT/Goinfra — rodovias",
            url: "https://www.gov.br/dnit/pt-br",
            descricao: "Estado das rodovias federais e estaduais que atendem Piracanjuba.",
          },
          {
            nome: "Saneago",
            url: "https://www.saneago.com.br/",
            descricao: "Concessionária estadual de água e esgoto em Piracanjuba.",
          },
          {
            nome: "Painel Ouvidoria — Procon-GO",
            url: "https://www.procon.go.gov.br/",
            descricao: "Reclamações ranking por categoria (energia, telefonia, internet).",
          },
        ]}
      />
    </div>
  );
}
