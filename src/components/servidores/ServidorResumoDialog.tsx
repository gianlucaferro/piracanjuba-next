"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, UserCheck } from "lucide-react";
import { fetchServidorResumo, type GrupoFolhaIndividual } from "@/data/servidorResumoApi";
import { FONTES_CAMARA, FONTES_PREFEITURA } from "@/lib/fontes-oficiais";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ServidorSelecionado = { id: string; nome: string; cargo: string | null };
type OrgaoTipo = "prefeitura" | "camara";

function valorPublicado(valor: number | null) {
  return valor === null || !Number.isFinite(valor) ? "Não informado" : formatCurrency(valor);
}

function GrupoPagamento({ titulo, grupo }: { titulo: string; grupo: GrupoFolhaIndividual | null }) {
  return (
    <div role="group" aria-label={titulo} className="min-w-0 rounded-lg border border-border p-3 space-y-2">
      <h3 className="font-semibold text-foreground">{titulo}</h3>
      {grupo ? (
        <>
          <p className="text-xs text-muted-foreground">Competência {grupo.competencia}</p>
          <dl className="space-y-1">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Bruto</dt>
              <dd className="font-semibold text-foreground">{valorPublicado(grupo.bruto)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Líquido</dt>
              <dd className="font-semibold text-foreground">{valorPublicado(grupo.liquido)}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground break-words">
            Tipos publicados: {grupo.tipos.join(", ") || "Não informado"}
          </p>
          {grupo.registros > 1 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-primary">Ver {grupo.registros} lançamentos</summary>
              <ul className="mt-2 space-y-2">
                {grupo.lancamentos.map((lancamento) => (
                  <li key={lancamento.id} className="rounded bg-muted/50 p-2 space-y-1">
                    <p className="break-words font-medium">{lancamento.tipo_folha || "Tipo não informado"}</p>
                    <p>Bruto: {valorPublicado(lancamento.bruto)}</p>
                    <p>Líquido: {valorPublicado(lancamento.liquido)}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      ) : <p className="text-sm text-muted-foreground">Nenhum registro disponível nesta categoria.</p>}
    </div>
  );
}

function ResumoServidor({ servidor, orgaoTipo }: { servidor: ServidorSelecionado; orgaoTipo: OrgaoTipo }) {
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["servidor-resumo-oficial", orgaoTipo, servidor.id],
    queryFn: () => fetchServidorResumo(servidor.id, orgaoTipo),
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Uma reabertura consulta os valores atuais antes de apresentar o resultado.
  if (isPending || isFetching) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Carregando resumo do servidor...
      </p>
    );
  }
  if (isError || !data) {
    return (
      <div role="alert" className="space-y-3 py-2">
        <p className="text-sm text-muted-foreground">Não foi possível carregar o resumo deste servidor.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>Tentar novamente</Button>
      </div>
    );
  }

  const folha = data.resumo_folha;
  return (
    <div className="space-y-4">
      {data.servidor.cargo && <Badge variant="secondary" className="whitespace-normal text-left">{data.servidor.cargo}</Badge>}
      {folha.semRegistroAtual && (
        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          Não há registros disponíveis para este vínculo em {folha.competenciaAtual}.
        </p>
      )}
      {folha.semMensalNaUltimaCompetencia && folha.ultimaCompetencia && (
        <p className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-sm text-foreground dark:border-amber-800 dark:bg-amber-950/20">
          Não há registro mensal para este vínculo em {folha.ultimaCompetencia}. Os outros pagamentos desta competência estão separados abaixo.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GrupoPagamento titulo="Salário mensal" grupo={folha.mensal} />
        <GrupoPagamento titulo="Rescisões" grupo={folha.rescisoes} />
        <GrupoPagamento titulo="13º salário" grupo={folha.decimoTerceiro} />
        {folha.outros && <GrupoPagamento titulo="Outros pagamentos" grupo={folha.outros} />}
      </div>
      <p className="text-xs text-muted-foreground">
        Cada categoria mostra sua última competência disponível. Os valores refletem os registros publicados e podem receber complementações.
      </p>
      <section aria-label="Resumo do servidor" className="rounded-lg bg-muted/50 border p-3">
        <h3 className="font-semibold text-foreground mb-2">Resumo do servidor</h3>
        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{data.resumo}</p>
      </section>
    </div>
  );
}

export default function ServidorResumoDialog({
  servidor,
  orgaoTipo,
  onClose,
}: {
  servidor: ServidorSelecionado | null;
  orgaoTipo: OrgaoTipo;
  onClose: () => void;
}) {
  const fonte = orgaoTipo === "camara" ? FONTES_CAMARA.folhas : FONTES_PREFEITURA.folhas;
  return (
    <Dialog open={servidor !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 leading-snug">
            <UserCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
            {servidor?.nome}
          </DialogTitle>
          <DialogDescription>Resumo do servidor</DialogDescription>
        </DialogHeader>
        {servidor && <ResumoServidor key={`${orgaoTipo}:${servidor.id}`} servidor={servidor} orgaoTipo={orgaoTipo} />}
        <a href={fonte} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          Consultar fonte oficial <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </DialogContent>
    </Dialog>
  );
}
