"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ExternalLink } from "lucide-react";
import { fetchPrefeituraResumoFolha } from "@/data/prefeituraFolhaApi";
import { Button } from "@/components/ui/button";
import { FONTES_PREFEITURA } from "@/lib/fontes-oficiais";
import { formatCurrency } from "@/lib/formatters";
import type { TotaisFolha } from "@/lib/camara-folha";

function TotaisPublicados({ totais }: { totais: TotaisFolha }) {
  return (
    <>
      <p className="text-xl font-bold text-foreground mt-2">
        {totais.bruto === null ? "Valor não informado" : formatCurrency(totais.bruto)}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Valor bruto · {totais.servidores} {totais.servidores === 1 ? "vínculo" : "vínculos"} · {totais.registros} {totais.registros === 1 ? "registro" : "registros"}
      </p>
    </>
  );
}

export default function ResumoFolhaPrefeitura() {
  const { data: resumo, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["prefeitura-resumo-folha"],
    queryFn: fetchPrefeituraResumoFolha,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <section aria-label="Resumo da folha da Prefeitura" className="stat-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Resumo da folha da Prefeitura</h2>
        <a href={FONTES_PREFEITURA.folhas} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          Ver fonte oficial <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
        </a>
      </div>

      {isPending ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando resumo da folha...</p>
      ) : isError ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-muted-foreground">Não foi possível carregar o resumo da folha da Prefeitura.</p>
          <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
            {isFetching ? "Carregando..." : "Tentar novamente"}
          </Button>
        </div>
      ) : !resumo ? (
        <p className="text-sm text-muted-foreground">Ainda não há registros de remuneração da Prefeitura disponíveis.</p>
      ) : (
        <>
          {resumo.semRegistrosNaCompetenciaAtual && (
            <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Ainda não há registros disponíveis para {resumo.competenciaAtual}. Os valores abaixo se referem às competências indicadas.
            </p>
          )}
          {resumo.recente.mensal.registros === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
              <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
              <p>
                <strong>Publicação parcial em {resumo.ultimaCompetencia}.</strong>{" "}
                A folha mensal desta competência ainda não está disponível. Os registros publicados podem receber complementações.
              </p>
            </div>
          )}
          {resumo.mensal && resumo.coberturaMensal.orgaosAusentes.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
              <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
              <div className="min-w-0 space-y-2">
                <p>
                  <strong>Publicação parcial em {resumo.mensal.competencia}.</strong>{" "}
                  Os órgãos abaixo tinham registros mensais em {resumo.coberturaMensal.competenciaAnterior} e ainda não têm registros mensais disponíveis nesta competência:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {resumo.coberturaMensal.orgaosAusentes.map((orgao) => (
                    <li key={orgao.id}>{orgao.nome}</li>
                  ))}
                </ul>
                <p>A ausência de registros não indica falta de pagamento.</p>
              </div>
            </div>
          )}
          {resumo.mensal && !resumo.coberturaMensal.verificavel && (
            <p className="text-sm text-muted-foreground">
              Não foi possível confirmar a cobertura por órgão da folha mensal de {resumo.mensal.competencia}. Os totais refletem os registros disponíveis.
            </p>
          )}
          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${resumo.recente.outros.registros > 0 ? "xl:grid-cols-4" : "lg:grid-cols-3"}`}>
            <div role="group" aria-label="Última folha mensal" className="rounded-lg border border-border p-3">
              <h3 className="text-sm font-medium text-foreground">Última folha mensal</h3>
              {resumo.mensal ? (
                <>
                  <p className="text-xs text-muted-foreground mt-1">Competência {resumo.mensal.competencia}</p>
                  <TotaisPublicados totais={resumo.mensal} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Folha mensal ainda não disponível.</p>
              )}
            </div>
            <div role="group" aria-label="Rescisões" className="rounded-lg border border-border p-3">
              <h3 className="text-sm font-medium text-foreground">Rescisões</h3>
              <p className="text-xs text-muted-foreground mt-1">Competência {resumo.ultimaCompetencia}</p>
              {resumo.recente.rescisoes.registros > 0 ? (
                <TotaisPublicados totais={resumo.recente.rescisoes} />
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Sem registros de rescisão nesta competência.</p>
              )}
            </div>
            <div role="group" aria-label="13º salário" className="rounded-lg border border-border p-3">
              <h3 className="text-sm font-medium text-foreground">13º salário</h3>
              <p className="text-xs text-muted-foreground mt-1">Competência {resumo.ultimaCompetencia}</p>
              {resumo.recente.decimoTerceiro.registros > 0 ? (
                <TotaisPublicados totais={resumo.recente.decimoTerceiro} />
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Sem registros de 13º salário nesta competência.</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">Inclui adiantamentos e pagamentos do RPPS.</p>
            </div>
            {resumo.recente.outros.registros > 0 && (
              <div role="group" aria-label="Outros pagamentos" className="rounded-lg border border-border p-3">
                <h3 className="text-sm font-medium text-foreground">Outros pagamentos</h3>
                <p className="text-xs text-muted-foreground mt-1">Competência {resumo.ultimaCompetencia}</p>
                <TotaisPublicados totais={resumo.recente.outros} />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Valores disponíveis na fonte oficial, separados por tipo de folha. Rescisões, 13º salário e outros pagamentos são apresentados na última competência com registros ({resumo.ultimaCompetencia}). Um vínculo pode aparecer em mais de um grupo. A publicação pode receber complementações.
          </p>
        </>
      )}
      <Link href="/camara/servidores" className="inline-flex text-sm text-primary hover:underline">
        Consultar folha da Câmara
      </Link>
    </section>
  );
}
