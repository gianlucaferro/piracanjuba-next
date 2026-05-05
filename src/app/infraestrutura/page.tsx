import { Building } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import EmColetaSection from "@/components/EmColetaSection";

export const metadata = pageMetadata({
  title: "Infraestrutura Urbana de Piracanjuba GO",
  description:
    "Saneamento básico, energia elétrica, conectividade, iluminação pública, pavimentação e demais indicadores de infraestrutura urbana de Piracanjuba.",
  path: "/infraestrutura",
});

export default function InfraestruturaPage() {
  return (
    <div className="container py-6 max-w-5xl">
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
            url: "http://www.snis.gov.br/",
            descricao: "Cobertura água, esgoto, lixo, perdas, tarifas. Atualização anual.",
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
            nome: "Sistema Saneatins/Saneago",
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
