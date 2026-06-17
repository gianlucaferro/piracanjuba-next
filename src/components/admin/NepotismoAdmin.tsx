"use client";

// Painel PRIVADO de nepotismo (somente admin).
//
// Cruza SOBRENOMES distintivos entre agentes políticos (prefeita, vice, vereadores)
// e o quadro de pessoal (servidores + secretários) como SINAL para verificação manual.
// NÃO é prova: coincidência de sobrenome != parentesco != nepotismo.
//
// Segurança em camadas:
//  1. A tela só renderiza dentro do /admin autenticado.
//  2. A edge function nepotismo-analise exige uma 2ª senha (header x-nepo-senha),
//     guardada só no 1Password. Sem ela, retorna 401.
//
// Decisão do operador (2026-06-17): manter interno até decidir se publica.

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldAlert, Loader2, Scale, Lock, ArrowRight } from "lucide-react";

const supabase = createBrowserSupabaseClient();

type Vinculo = { nome: string; cargo: string; fonte: string; sobrenomes: string[] };
type Agente = { agente: string; cargo: string; sobrenomes: string[]; vinculos: Vinculo[] };
type Resposta = {
  gerado_em: string;
  total_agentes_com_indicio: number;
  aviso: string;
  resultado: Agente[];
};

function formatDateTimePT(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Chips({ items, tone }: { items: string[]; tone: "muted" | "match" }) {
  const cls =
    tone === "match"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className="inline-flex flex-wrap gap-1">
      {items.map((s) => (
        <span key={s} className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${cls}`}>
          {s}
        </span>
      ))}
    </span>
  );
}

export default function NepotismoAdmin() {
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Resposta | null>(null);

  async function analisar() {
    if (!senha.trim()) {
      toast.error("Informe a senha do painel de nepotismo.");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const { data: res, error } = await supabase.functions.invoke<Resposta>("nepotismo-analise", {
        headers: { "x-nepo-senha": senha.trim() },
      });
      if (error || !res?.resultado) {
        toast.error("Senha incorreta ou erro ao analisar.");
        return;
      }
      setData(res);
      toast.success(`${res.total_agentes_com_indicio} agente(s) com sobrenome em comum.`);
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer jurídico forte */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
        <div className="flex gap-2 items-start">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-700">Sinal para verificação, não é prova</p>
            <p className="text-muted-foreground">
              Coincidência de sobrenome <strong>não</strong> é prova de parentesco nem de nepotismo. A Súmula
              Vinculante 13 do STF veda nomear parente até o 3º grau para cargo em comissão ou função de confiança.
              Esta tela é de <strong>uso interno</strong> e não foi publicada. Sobrenomes muito comuns (Silva, Santos,
              Oliveira, etc.) foram filtrados para reduzir falso positivo, mas ainda há ruído: confira cada caso na fonte.
            </p>
          </div>
        </div>
      </div>

      {/* Senha + ação */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Análise de nepotismo</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="nepo-senha" className="text-xs flex items-center gap-1">
              <Lock className="w-3 h-3" /> Senha do painel
            </Label>
            <Input
              id="nepo-senha"
              type="password"
              placeholder="Senha exclusiva (1Password)"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && analisar()}
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <Button onClick={analisar} disabled={loading || !senha.trim()} className="w-full sm:w-auto">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Scale className="w-4 h-4 mr-2" />}
            {loading ? "Analisando..." : "Analisar"}
          </Button>
        </div>
      </div>

      {/* Resultado */}
      {data && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {data.total_agentes_com_indicio} agente(s) com indício
            </Badge>
            <span>Gerado em {formatDateTimePT(data.gerado_em)}</span>
          </div>

          {data.resultado.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum sobrenome distintivo em comum encontrado.
            </p>
          )}

          {data.resultado.map((a) => (
            <div key={a.agente + a.cargo} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{a.agente}</p>
                <Badge variant="secondary" className="text-[10px]">{a.cargo}</Badge>
                <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[10px]">
                  {a.vinculos.length} no quadro público
                </Badge>
                {a.sobrenomes.length > 0 && (
                  <span className="text-[10px] text-muted-foreground ml-auto inline-flex items-center gap-1">
                    Sobrenomes: <Chips items={a.sobrenomes} tone="muted" />
                  </span>
                )}
              </div>

              <ul className="space-y-1.5">
                {a.vinculos.map((v, i) => (
                  <li
                    key={`${v.nome}-${i}`}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs"
                  >
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground">{v.nome}</span>
                    <span className="text-muted-foreground">{v.cargo}</span>
                    <Badge variant="outline" className="text-[9px]">{v.fonte}</Badge>
                    <span className="ml-auto inline-flex items-center gap-1">
                      <Chips items={v.sobrenomes} tone="match" />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
