"use client";

import { Landmark, ExternalLink, Info } from "lucide-react";
import { FUNDO_ELEITORAL_2024 as F } from "@/lib/data/fundo-eleitoral-2024";

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

export default function FundoEleitoralCard() {
  const vereadores = F.vereadores;
  const comFefc = vereadores.filter((v) => v.fefc > 0);
  const totalFefcVereadores = vereadores.reduce((s, v) => s + v.fefc, 0);
  const totalFefcEleitos = F.chapa.fefc + totalFefcVereadores;

  return (
    <section className="stat-card border-l-4 border-l-amber-500">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Landmark className="w-4 h-4 text-amber-600" />
          </div>
          Fundo eleitoral (FEFC) na campanha de 2024
        </h2>
        <p className="text-sm text-muted-foreground mt-1 ml-10">
          Quanto de dinheiro público de campanha cada eleito recebeu do Fundo Especial de Financiamento de Campanha.
        </p>
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed inline-flex items-start gap-1.5 mb-4">
        <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
        <span>
          O FEFC é dinheiro público (do Orçamento da União) distribuído pelos partidos aos candidatos. Diferente das
          doações e dos recursos próprios, ele vem do contribuinte, então é o financiamento que mais importa acompanhar.
        </span>
      </p>

      {/* Chapa da prefeita */}
      <div className="rounded-lg bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-4 mb-4">
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">Chapa eleita (prefeita e vice)</p>
        <p className="text-sm text-foreground mt-1">
          {F.chapa.prefeita} ({F.chapa.prefeitaPartido}) e {F.chapa.vice} ({F.chapa.vicePartido})
        </p>
        <p className="text-3xl font-bold text-amber-700 dark:text-amber-400 mt-2">{brl(F.chapa.fefc)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          de fundo eleitoral, de um total de {brl(F.chapa.totalReceita)} arrecadados na campanha. O FEFC entra na conta do
          candidato a prefeito (o vice não presta contas em separado).
        </p>
      </div>

      {/* Vereadores */}
      <h3 className="text-sm font-semibold text-foreground mb-2">Os 11 vereadores eleitos</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-xs">
              <th className="text-left py-2 pr-3 font-medium">Vereador</th>
              <th className="text-right py-2 px-2 font-medium">Fundo eleitoral</th>
              <th className="text-right py-2 pl-2 font-medium">Total arrecadado</th>
            </tr>
          </thead>
          <tbody>
            {vereadores.map((v) => (
              <tr key={v.nome} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-3">
                  <span className="text-foreground font-medium">{v.nome}</span>{" "}
                  <span className="text-xs text-muted-foreground">({v.partido})</span>
                </td>
                <td className={`text-right py-2 px-2 tabular-nums ${v.fefc > 0 ? "text-amber-700 dark:text-amber-400 font-semibold" : "text-muted-foreground"}`}>
                  {v.fefc > 0 ? brl(v.fefc) : "R$ 0"}
                </td>
                <td className="text-right py-2 pl-2 tabular-nums text-muted-foreground">{brl(v.totalReceita)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-foreground/80 mt-3 leading-relaxed">
        Entre os 11 vereadores eleitos, <strong>{vereadores.length - comFefc.length} não receberam nada</strong> do fundo
        eleitoral. {comFefc.length === 1
          ? <>Só <strong>{comFefc[0].nome} ({comFefc[0].partido})</strong> recebeu ({brl(comFefc[0].fefc)}); a campanha dos demais foi bancada por doações e recursos próprios.</>
          : <>Apenas {comFefc.length} receberam algum valor. O restante bancou a campanha com doações e recursos próprios.</>}
        {" "}Somando a chapa da prefeita e os vereadores, os eleitos de Piracanjuba receberam <strong>{brl(totalFefcEleitos)}</strong> de dinheiro público de campanha.
      </p>

      <p className="text-xs text-muted-foreground mt-3">
        Fonte: TSE — Prestação de Contas Eleitorais 2024 (receitas de candidatos, GO), fonte &quot;Fundo Especial de Financiamento de Campanha&quot;.{" "}
        <a href={F.fonteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          Dados abertos do TSE <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </section>
  );
}
