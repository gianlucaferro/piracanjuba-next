"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchContratosGrupo, type GrupoEconomico } from "@/data/gruposApi";
import { resumoContratosGrupo, fonteContratoSegura } from "@/lib/gruposMetricas";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function GrupoContratos({ grupo }: { grupo: GrupoEconomico }) {
  const [aberto, setAberto] = useState(false);
  const [orgao, setOrgao] = useState("todos");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["contratos-grupo", grupo.id, grupo.atualizado_em],
    queryFn: () => fetchContratosGrupo(grupo.membros.map((m) => m.cnpj)),
    enabled: aberto,
    staleTime: 5 * 60 * 1000,
  });
  const registros = useMemo(() => (data ?? []).filter((r) => orgao === "todos" || r.orgao === orgao), [data, orgao]);
  const resumo = useMemo(() => resumoContratosGrupo(registros), [registros]);
  const fontes = registros.filter((r) => fonteContratoSegura(r.fonteUrl)).sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));

  return <details className="border-t pt-3" onToggle={(event) => setAberto(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-medium text-primary">Comparar contratos, aditivos e fornecedores</summary>
    {aberto && <div className="space-y-4 pt-4">
      <label className="flex items-center gap-2 text-sm">Órgão
        <select className="rounded-md border bg-background px-2 py-1" value={orgao} onChange={(event) => setOrgao(event.target.value)}>
          <option value="todos">Prefeitura e Câmara</option>
          <option value="prefeitura">Prefeitura</option>
          <option value="camara">Câmara</option>
        </select>
      </label>
      {isLoading && <p role="status" className="text-sm text-muted-foreground">Consultando os registros do grupo...</p>}
      {isError && <p role="alert" className="text-sm text-muted-foreground">Não foi possível consultar todos os contratos. Tente novamente em instantes.</p>}
      {data && !isError && <>
        {registros.length === 0 ? <p className="text-sm text-muted-foreground">Não há contratos identificados por CNPJ neste recorte.</p> : <>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Valores originais</dt><dd className="font-semibold">{BRL.format(resumo.originais)}</dd></div>
            <div><dt className="text-muted-foreground">Termos aditivos</dt><dd className="font-semibold">{BRL.format(resumo.aditivos)}</dd></div>
            <div><dt className="text-muted-foreground">Originais + aditivos</dt><dd className="font-semibold">{BRL.format(resumo.total)}</dd></div>
          </dl>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <caption className="mb-2 text-left font-medium">Valores publicados por ano</caption>
              <thead><tr className="border-b"><th className="py-2 pr-3">Ano</th><th className="px-2">Originais</th><th className="px-2">Aditivos</th><th className="pl-2">Registros</th></tr></thead>
              <tbody>{resumo.periodos.map((p) => <tr className="border-b border-border/50" key={p.ano}>
                <th className="py-2 pr-3 font-normal">{p.ano}</th><td className="whitespace-nowrap px-2">{BRL.format(p.originais)}</td>
                <td className="whitespace-nowrap px-2">{BRL.format(p.aditivos)}</td><td className="pl-2">{p.contratos} contratos, {p.termos} termos</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="space-y-2 text-sm">
            <h3 className="font-medium">Participação de cada empresa neste grupo</h3>
            {resumo.fornecedores.map((f) => <div key={f.cnpj} className="flex flex-wrap justify-between gap-x-3 gap-y-1">
              <span className="min-w-0 break-words">{grupo.membros.find((m) => m.cnpj.replace(/\D/g, "") === f.cnpj)?.razao_social ?? f.cnpj}</span>
              <span className="shrink-0 text-muted-foreground">{BRL.format(f.total)}{f.participacao !== null && ` (${f.participacao.toFixed(1).replace(".", ",")}%)`}</span>
            </div>)}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">Recorte dos CNPJs deste grupo. Valores contratuais não são pagamentos efetuados. Originais usam o início da vigência ou a assinatura; aditivos usam a data do termo. O ano corrente é parcial e a ausência de registros não comprova ausência de contratações. {resumo.semValor > 0 && `${resumo.semValor} registros não informam valor.`}</p>
          {fontes.length > 0 && <details>
            <summary className="cursor-pointer text-sm text-primary">Consultar os documentos e fontes ({fontes.length})</summary>
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto text-sm">
              {fontes.map((r) => <li key={`${r.orgao}:${r.tipo}:${r.id}`}>
                <a className="underline underline-offset-2" target="_blank" rel="noopener noreferrer" href={fonteContratoSegura(r.fonteUrl)!}>
                  {r.orgao === "camara" ? "Câmara" : "Prefeitura"}: {r.tipo === "aditivo" ? "aditivo" : "contrato"} {r.numero || "sem número"}, {r.data ?? "data não informada"}
                </a>
              </li>)}
            </ul>
          </details>}
        </>}
      </>}
    </div>}
  </details>;
}
