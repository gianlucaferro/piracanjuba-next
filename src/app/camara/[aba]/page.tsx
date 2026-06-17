import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import CamaraClient from "@/components/camara/CamaraClient";

export const dynamic = "force-dynamic";

// Cada aba da Câmara vira rota indexável com metadata própria (ex: /camara/projetos).
// "vereadores" (padrão) fica em /camara.
const ABAS: Record<string, { title: string; description: string }> = {
  servidores: { title: "Servidores da Câmara de Piracanjuba GO", description: "Servidores e folha de pagamento da Câmara Municipal de Piracanjuba. Transparência do Poder Legislativo." },
  contratos: { title: "Contratos da Câmara de Piracanjuba GO", description: "Contratos da Câmara Municipal de Piracanjuba: fornecedores, valores e vigência, com resumo por IA." },
  projetos: { title: "Projetos de lei da Câmara de Piracanjuba GO", description: "Projetos de lei, resoluções e decretos legislativos da Câmara de Piracanjuba, por autor e situação." },
  atuacao: { title: "Atuação parlamentar dos vereadores de Piracanjuba GO", description: "Requerimentos, moções e proposições dos vereadores da Câmara de Piracanjuba, com resumo por IA." },
  indicacoes: { title: "Indicações dos vereadores de Piracanjuba GO", description: "Indicações dos vereadores da Câmara de Piracanjuba ao Poder Executivo, com resumo por IA." },
  resolucoes: { title: "Resoluções da Câmara de Piracanjuba GO", description: "Resoluções da Câmara Municipal de Piracanjuba, com resumo por IA. Transparência do Legislativo." },
  "decretos-leg": { title: "Decretos legislativos da Câmara de Piracanjuba GO", description: "Decretos legislativos da Câmara Municipal de Piracanjuba, com resumo por IA." },
  pautas: { title: "Pautas das sessões da Câmara de Piracanjuba GO", description: "Pautas e ordem do dia das sessões da Câmara Municipal de Piracanjuba." },
  atas: { title: "Atas das sessões da Câmara de Piracanjuba GO", description: "Atas das sessões da Câmara Municipal de Piracanjuba, com pauta, votações e resumo por IA." },
  transmissao: { title: "Transmissões da Câmara de Piracanjuba GO", description: "Transmissões e vídeos das sessões da Câmara Municipal de Piracanjuba." },
  licitacoes: { title: "Licitações da Câmara de Piracanjuba GO", description: "Licitações e editais da Câmara Municipal de Piracanjuba, com modalidade e valor." },
  despesas: { title: "Despesas da Câmara de Piracanjuba GO", description: "Despesas e empenhos da Câmara Municipal de Piracanjuba, por credor. Transparência do Legislativo." },
  receitas: { title: "Orçamento e duodécimo da Câmara de Piracanjuba GO", description: "Orçamento da Câmara de Piracanjuba (função Legislativa), orçado vs executado, conforme SICONFI/Tesouro." },
  diarias: { title: "Diárias da Câmara de Piracanjuba GO", description: "Diárias pagas pela Câmara Municipal de Piracanjuba, com beneficiário, destino e valor." },
};

export async function generateMetadata({ params }: { params: Promise<{ aba: string }> }): Promise<Metadata> {
  const { aba } = await params;
  const info = ABAS[aba];
  if (!info) {
    return pageMetadata({ title: "Câmara Municipal de Piracanjuba GO", description: "Dados da Câmara Municipal de Piracanjuba, Goiás.", path: `/camara/${aba}` });
  }
  return pageMetadata({ title: info.title, description: info.description, path: `/camara/${aba}` });
}

export default async function CamaraAbaPage({ params }: { params: Promise<{ aba: string }> }) {
  const { aba } = await params;
  if (!ABAS[aba]) notFound();
  return <CamaraClient aba={aba} />;
}
