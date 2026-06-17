import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import PrefeituraClient from "@/components/prefeitura/PrefeituraClient";
import { FinanciadoresExecutivoCard } from "@/components/vereadores/FinanciadoresCampanhaCard";

export const dynamic = "force-dynamic";

// Cada aba da Prefeitura vira uma rota indexável com title/description/canonical próprios
// (ex: /prefeitura/contratos). "visao-geral" e "admin" ficam fora: a primeira mora em
// /prefeitura, a segunda não deve ser indexada.
const ABAS: Record<string, { title: string; description: string }> = {
  chefia: { title: "Prefeita e Vice de Piracanjuba GO", description: "Prefeita, vice-prefeito, remuneração e financiadores de campanha do Executivo de Piracanjuba, Goiás. Dados oficiais." },
  secretarias: { title: "Secretarias da Prefeitura de Piracanjuba GO", description: "Secretarias municipais de Piracanjuba, secretários e remuneração. Transparência do Poder Executivo." },
  contratos: { title: "Contratos da Prefeitura de Piracanjuba GO", description: "Contratos, fornecedores, valores e vigência da Prefeitura de Piracanjuba. Dados oficiais com situação cadastral do CNPJ e resumo por IA." },
  servidores: { title: "Salários dos servidores da Prefeitura de Piracanjuba GO", description: "Folha de pagamento e remuneração dos servidores públicos da Prefeitura de Piracanjuba, por cargo e competência. Dados oficiais." },
  despesas: { title: "Despesas da Prefeitura de Piracanjuba GO", description: "Despesas e pagamentos da Prefeitura de Piracanjuba a fornecedores, com resumo por IA. Transparência municipal." },
  "tcm-go": { title: "Apontamentos do TCM-GO sobre Piracanjuba", description: "Acórdãos, decisões e apontamentos do Tribunal de Contas dos Municípios de Goiás sobre Piracanjuba, com resumo por IA." },
  decretos: { title: "Decretos da Prefeitura de Piracanjuba GO", description: "Decretos do Poder Executivo municipal de Piracanjuba, com resumo por IA. Transparência e legislação." },
  portarias: { title: "Portarias da Prefeitura de Piracanjuba GO", description: "Portarias do Poder Executivo municipal de Piracanjuba. Dados oficiais de transparência." },
  leis: { title: "Leis municipais de Piracanjuba GO", description: "Leis municipais de Piracanjuba, com resumo por IA. Legislação do município, dados oficiais." },
  "lei-organica": { title: "Lei Orgânica de Piracanjuba GO", description: "Lei Orgânica do município de Piracanjuba, Goiás. Texto, artigos e princípios da organização municipal." },
  diarias: { title: "Diárias da Prefeitura de Piracanjuba GO", description: "Diárias pagas pela Prefeitura de Piracanjuba, com favorecido, destino e valor. Transparência do Executivo." },
  licitacoes: { title: "Licitações da Prefeitura de Piracanjuba GO", description: "Licitações, modalidades e editais da Prefeitura de Piracanjuba. Dados oficiais de transparência." },
  obras: { title: "Obras públicas de Piracanjuba GO", description: "Obras municipais de Piracanjuba: status, empresa responsável e valores. Transparência do Poder Executivo." },
  veiculos: { title: "Frota de veículos da Prefeitura de Piracanjuba GO", description: "Veículos do poder executivo de Piracanjuba (placa, modelo, ano, secretaria). Dados DETRAN-GO e transparência." },
};

export async function generateMetadata({ params }: { params: Promise<{ aba: string }> }): Promise<Metadata> {
  const { aba } = await params;
  const info = ABAS[aba];
  if (!info) {
    return pageMetadata({ title: "Prefeitura de Piracanjuba GO", description: "Dados oficiais da Prefeitura de Piracanjuba, Goiás.", path: `/prefeitura/${aba}` });
  }
  return pageMetadata({ title: info.title, description: info.description, path: `/prefeitura/${aba}` });
}

export default async function PrefeituraAbaPage({ params }: { params: Promise<{ aba: string }> }) {
  const { aba } = await params;
  if (!ABAS[aba]) notFound();
  return <PrefeituraClient aba={aba} financiadoresExecutivo={<FinanciadoresExecutivoCard />} />;
}
