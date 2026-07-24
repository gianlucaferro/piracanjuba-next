import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type IndicioContratacao = {
  chave: string;
  regra: string;
  categoria: string;
  severidade: "informativa" | "baixa" | "media" | "alta" | "critica";
  score: number;
  titulo: string;
  descricao: string;
  sujeito_no: string | null;
  contrato_id: number | null;
  fornecedor_cnpj: string | null;
  orgao_id: number | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  evidencias: Record<string, unknown>;
  fonte_urls: string[];
  regra_versao: string;
  atualizado_em: string;
  ordem_severidade: number;
};

export type CoberturaRegra = {
  regra: string;
  status: "disponivel" | "parcial" | "indisponivel";
  motivo: string;
  metricas: Record<string, unknown>;
  fonte: string | null;
  atualizado_em: string;
};

export type ResumoIndicio = {
  regra: string;
  categoria: string;
  severidade: IndicioContratacao["severidade"];
  quantidade: number;
  score_medio: number;
  atualizado_em: string;
};

export const fetchPainelIndicios = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const [{ data: indicios, error: indiciosError }, {
      data: cobertura,
      error: coberturaError,
    }, {
      data: resumo,
      error: resumoError,
    }] = await Promise.all([
      supabase
        .from("v_indicios_contratacao")
        .select(
          "chave, regra, categoria, severidade, score, titulo, descricao, sujeito_no, contrato_id, fornecedor_cnpj, orgao_id, periodo_inicio, periodo_fim, evidencias, fonte_urls, regra_versao, atualizado_em, ordem_severidade",
        )
        .order("ordem_severidade", { ascending: true })
        .order("score", { ascending: false })
        .limit(200),
      supabase
        .from("cobertura_regra_investigativa")
        .select("regra, status, motivo, metricas, fonte, atualizado_em")
        .order("regra"),
      supabase
        .from("v_resumo_indicios_contratacao")
        .select(
          "regra, categoria, severidade, quantidade, score_medio, atualizado_em",
        ),
    ]);

    if (indiciosError) throw indiciosError;
    if (coberturaError) throw coberturaError;
    if (resumoError) throw resumoError;

    return {
      indicios: (indicios ?? []) as IndicioContratacao[],
      cobertura: (cobertura ?? []) as CoberturaRegra[],
      resumo: (resumo ?? []) as ResumoIndicio[],
    };
  },
  ["painel-indicios-contratacao-v1"],
  { revalidate: 3600, tags: ["indicios-contratacao"] },
);
