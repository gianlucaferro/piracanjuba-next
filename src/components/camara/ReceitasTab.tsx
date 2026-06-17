"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCamaraOrcamento, type CamaraOrcamento } from "@/data/camaraApi";
import { TrendingUp, Sparkles, Download, ExternalLink, BookOpen, ChevronDown } from "lucide-react";
import { AISummaryDialog, useAISummary } from "@/components/camara/AISummaryDialog";
import { formatCurrency } from "@/lib/formatters";
import { downloadCSV } from "@/lib/csvExport";

export default function ReceitasTab() {
  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ["camara-orcamento"],
    queryFn: fetchCamaraOrcamento,
  });
  const { selectedItem, resumo, loading, requestSummary, close } = useAISummary();

  const linhas = orcamentos || [];

  const maxVal = useMemo(() => {
    let max = 0;
    linhas.forEach((o) => { max = Math.max(max, o.dotacao || 0, o.liquidada || 0); });
    return max || 1;
  }, [linhas]);

  // Ano fechado mais recente (período 6) para destaque nos cards.
  const destaque = useMemo(
    () => linhas.find((o) => o.periodo_referencia === 6) || linhas[0],
    [linhas],
  );

  const pctExec = (o: CamaraOrcamento) =>
    o.dotacao ? (((o.liquidada || 0) / o.dotacao) * 100).toFixed(1) : "0";

  const handleClick = (o: CamaraOrcamento) => {
    const parcial = o.periodo_referencia && o.periodo_referencia < 6
      ? ` (parcial, até o ${o.periodo_referencia}º bimestre)` : "";
    const conteudo = `- Ano: ${o.ano}${parcial}\n- Orçamento da Câmara (dotação): ${o.dotacao != null ? formatCurrency(o.dotacao) : "não informado"}\n- Executado (despesa liquidada): ${o.liquidada != null ? formatCurrency(o.liquidada) : "não informado"}\n- Execução: ${pctExec(o)}%\n- A Câmara é mantida pelo duodécimo repassado pela Prefeitura; estes valores são o orçamento da função Legislativa declarado ao SICONFI/Tesouro Nacional.`;
    requestSummary(String(o.ano), "Orçamento da Câmara (duodécimo)", conteudo, `Orçamento da Câmara - ${o.ano}`);
  };

  const handleExportCSV = () => {
    downloadCSV(
      "orcamento-camara.csv",
      ["Ano", "Orçado (dotação)", "Executado (liquidada)", "Período ref."],
      linhas.map((o) => [o.ano, o.dotacao, o.liquidada, o.periodo_referencia]),
    );
  };

  return (
    <div className="container py-4 space-y-4">
      <details open className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
        <summary className="flex items-center gap-2 cursor-pointer select-none p-3 text-sm font-semibold text-foreground hover:bg-primary/10 transition-colors">
          <BookOpen className="w-4 h-4 text-primary shrink-0" />
          O que é o duodécimo? Como funciona?
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto transition-transform [[open]_&]:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-4 pb-4 pt-1 space-y-3 text-xs text-muted-foreground leading-relaxed border-t border-primary/10">
          <p>
            <strong className="text-foreground">Duodécimo</strong> quer dizer &quot;a duodécima parte&quot;, ou seja, 1/12.
            É a parcela mensal que a Prefeitura é obrigada a repassar à Câmara para custear o funcionamento do Legislativo.
            A Câmara não cobra impostos nem tem receita própria: vive desse repasse.
          </p>
          <div>
            <p className="font-semibold text-foreground mb-1">Como funciona</p>
            <ul className="space-y-1 list-disc pl-4">
              <li>Todo ano, o orçamento do município (a Lei Orçamentária) fixa quanto a Câmara vai receber no exercício. Esse total é, em regra, dividido em 12 parcelas mensais iguais (daí o nome).</li>
              <li>O repasse deve chegar até o <strong className="text-foreground">dia 20 de cada mês</strong> (art. 29-A da Constituição). Atrasar, reter ou repassar a menos é crime de responsabilidade do prefeito.</li>
              <li>Há um teto: a despesa total da Câmara não pode passar de <strong className="text-foreground">7% da receita</strong> tributária do município apurada no ano anterior (limite para municípios de até 100 mil habitantes, caso de Piracanjuba).</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">Como deve ser usado</p>
            <ul className="space-y-1 list-disc pl-4">
              <li>Só para manter o Legislativo: folha de pagamento de vereadores e servidores, diárias, contratos, materiais e estrutura da Câmara.</li>
              <li>No máximo <strong className="text-foreground">70% do duodécimo</strong> pode ir para a folha de pagamento (art. 29-A, §1º). Estourar esse limite é crime de responsabilidade do presidente da Câmara.</li>
              <li>O que sobra (não executado) ao fim do ano costuma voltar ao caixa da Prefeitura.</li>
            </ul>
          </div>
          <p className="pt-1 border-t border-primary/10 text-[11px]">
            Os valores abaixo são o orçamento da Câmara (função Legislativa) e sua execução, conforme declarado ao SICONFI / Tesouro Nacional.
          </p>
        </div>
      </details>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Orçamento da Câmara (duodécimo)</p>
        {linhas.length > 0 && (
          <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        )}
      </div>

      {isLoading && <div className="stat-card animate-pulse h-40" />}

      {!isLoading && !linhas.length && (
        <div className="stat-card text-center py-8">
          <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sem dados de orçamento</h3>
          <p className="text-sm text-muted-foreground mt-1">Os dados são sincronizados automaticamente do SICONFI.</p>
        </div>
      )}

      {!isLoading && linhas.length > 0 && (
        <>
          {destaque && (
            <div className="grid grid-cols-3 gap-3">
              <div className="stat-card text-center">
                <p className="text-xs text-muted-foreground">Orçado {destaque.ano}</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(destaque.dotacao || 0)}</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-xs text-muted-foreground">Executado</p>
                <p className="text-lg font-bold text-accent">{formatCurrency(destaque.liquidada || 0)}</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-xs text-muted-foreground">Execução</p>
                <p className="text-lg font-bold text-accent">{pctExec(destaque)}%</p>
              </div>
            </div>
          )}

          {/* Bar chart: orçado vs executado por ano */}
          <div className="stat-card">
            <p className="text-xs font-medium text-muted-foreground mb-3">Orçado vs Executado por ano</p>
            <div className="space-y-2">
              {linhas.map((o) => (
                <div key={o.ano} className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{o.ano}{o.periodo_referencia && o.periodo_referencia < 6 ? " (parcial)" : ""}</span>
                    <span>{formatCurrency(o.liquidada || 0)} / {formatCurrency(o.dotacao || 0)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden relative">
                    <div className="absolute h-full bg-primary/30 rounded-full" style={{ width: `${((o.dotacao || 0) / maxVal) * 100}%` }} />
                    <div className="absolute h-full bg-accent rounded-full" style={{ width: `${((o.liquidada || 0) / maxVal) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/30" /> Orçado</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Executado</span>
            </div>
          </div>

          {/* Lista por ano */}
          <div className="space-y-2">
            {linhas.map((o) => (
              <button key={o.ano} onClick={() => handleClick(o)} className="stat-card card-hover block w-full text-left flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {o.ano}{o.periodo_referencia && o.periodo_referencia < 6 && <span className="text-muted-foreground font-normal"> · parcial</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">Execução: {pctExec(o)}%</p>
                  <p className="text-[11px] text-primary/70 flex items-center gap-1 mt-1">
                    <Sparkles className="w-3 h-3" /> Clique para resumo IA
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Orçado: {formatCurrency(o.dotacao || 0)}</p>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(o.liquidada || 0)}</p>
                </div>
              </button>
            ))}
          </div>

          {destaque?.fonte_url && (
            <a href={destaque.fonte_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="w-3 h-3" /> Fonte: {destaque.fonte || "SICONFI / Tesouro Nacional"}
            </a>
          )}
        </>
      )}

      <AISummaryDialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && close()}
        title={selectedItem?.title || ""}
        resumo={resumo}
        loading={loading}
      />
    </div>
  );
}
