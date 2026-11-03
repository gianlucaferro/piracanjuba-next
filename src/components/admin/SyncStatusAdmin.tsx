"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Database, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PLANTAO_FARMACIAS } from "@/data/plantaoFarmacias";
import {
  assessCollector, assessFreshness, assessImport, assessScheduleCoverage, combineAssessments,
  type CollectorStatus, type FreshnessPolicy, type IntegrityStatus, type SyncObservation,
} from "@/lib/sync-integrity";

const supabase = createBrowserSupabaseClient();
type Status = IntegrityStatus;
type DashboardRow = {
  key: string;
  label: string;
  fonte: string;
  records: number | null;
  latestAt: string | null;
  period: string | null;
  status: Status;
  note: string;
  message: string;
  coverage?: string;
  checkedAt?: string | null;
};
type EqFilter = { column: string; value: string | number | boolean };
type DatasetConfig = {
  key: string; label: string; fonte: string; table: string; latestColumn: string;
  periodColumn?: string; periodLabel: string; filter?: EqFilter;
  policy: FreshnessPolicy; functionName?: string;
};
type MonitorSnapshot = {
  jobs: CollectorStatus[];
  logs: SyncObservation[];
  observations: Record<string, SyncObservation | null>;
};
const DATASETS: DatasetConfig[] = [
  { key: "saude", label: "Saúde", fonte: "saude_indicadores", table: "saude_indicadores", latestColumn: "updated_at", periodColumn: "ano", periodLabel: "Ano", policy: { cadence: "annual", maxPeriodAgeYears: 3, label: "Indicadores anuais, com defasagem de publicação por fonte." }, functionName: "sync-saude-indicadores" },
  { key: "educacao", label: "Educação", fonte: "educacao_indicadores", table: "educacao_indicadores", latestColumn: "updated_at", periodColumn: "ano_referencia", periodLabel: "Ano", policy: { cadence: "annual", maxPeriodAgeYears: 3, label: "Indicadores anuais. A data de importação não altera o ano de referência." }, functionName: "sync-educacao" },
  { key: "beneficios", label: "Benefícios Sociais", fonte: "beneficios_sociais_v2", table: "v_beneficios_sociais_canonicos", latestColumn: "updated_at", periodColumn: "competencia", periodLabel: "Competência", policy: { cadence: "monthly", maxPeriodAgeMonths: 3, label: "Base mensal. Conferir competências por programa." }, functionName: "sync-beneficios-sociais" },
  { key: "arrecadacao", label: "Arrecadação", fonte: "arrecadacao_municipal", table: "arrecadacao_municipal", latestColumn: "updated_at", periodColumn: "competencia", periodLabel: "Competência", policy: { cadence: "monthly", maxPeriodAgeMonths: 2, label: "Base mensal de arrecadação." }, functionName: "sync-arrecadacao" },
  { key: "agro", label: "Agro", fonte: "agro_indicadores", table: "agro_indicadores", latestColumn: "updated_at", periodColumn: "ano_referencia", periodLabel: "Ano", policy: { cadence: "annual", maxPeriodAgeYears: 3, label: "Indicadores anuais, sujeitos ao calendário de publicação do IBGE." }, functionName: "sync-agro" },
  { key: "seguranca", label: "Segurança", fonte: "seguranca_indicadores", table: "seguranca_indicadores", latestColumn: "updated_at", periodColumn: "ano", periodLabel: "Ano", policy: { cadence: "annual", maxPeriodAgeYears: 2, label: "Base de manutenção manual. Não há coletor automático ativo." } },
  { key: "zap", label: "Zap PBA", fonte: "zap_establishments", table: "zap_establishments", latestColumn: "created_at", periodLabel: "Último cadastro", policy: { cadence: "manual", label: "Cadastros sob demanda. Ausência de novos cadastros não significa atraso." } },
  { key: "classificados", label: "Compra e Venda PBA", fonte: "classificados", table: "classificados", latestColumn: "created_at", periodLabel: "Último cadastro", policy: { cadence: "manual", label: "Anúncios sob demanda, sem periodicidade obrigatória." } },
];

function formatDate(value: string | null) {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}`;
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "ok") return <Badge className="bg-emerald-500 text-white"><CheckCircle2 className="w-3 h-3" /> OK</Badge>;
  if (status === "empty") return <Badge variant="outline" className="border-amber-300 text-amber-700"><Clock className="w-3 h-3" /> Vazio</Badge>;
  if (status === "error") return <Badge variant="destructive"><XCircle className="w-3 h-3" /> Erro</Badge>;
  return <Badge variant="outline" className="border-amber-300 text-amber-700"><AlertTriangle className="w-3 h-3" /> Atenção</Badge>;
}

function applyFilter<T>(query: T, filter?: EqFilter): T {
  if (!filter) return query;
  return (query as { eq: (column: string, value: EqFilter["value"]) => T }).eq(filter.column, filter.value);
}
async function countRows(table: string, filter?: EqFilter) {
  const { count, error } = await applyFilter(supabase.from(table).select("*", { count: "exact", head: true }), filter);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}
async function latestValue(table: string, column: string, filter?: EqFilter) {
  const { data, error } = await applyFilter(supabase.from(table).select(column).order(column, { ascending: false, nullsFirst: false }).limit(1), filter).maybeSingle();
  if (error) throw new Error(`${table}: ${error.message}`);
  const value = data ? (data as unknown as Record<string, unknown>)[column] : null;
  return value == null ? null : String(value);
}
function observationFor(functionName: string | undefined, monitor: MonitorSnapshot) {
  return functionName ? monitor.observations[functionName] : null;
}
function withEvidence(row: DashboardRow, functionName: string | undefined, monitor: MonitorSnapshot): DashboardRow {
  if (!functionName) return row;
  const observation = observationFor(functionName, monitor);
  const collector = assessCollector(monitor.jobs.find((job) => job.function_name === functionName));
  const coverage = assessImport(observation);
  const combined = combineAssessments({ status: row.status, message: row.message }, collector, coverage);
  return { ...row, ...combined, coverage: coverage?.message, checkedAt: observation?.finished_at ?? null };
}
async function datasetSummary(config: DatasetConfig, monitor: MonitorSnapshot): Promise<DashboardRow> {
  const [records, latestAt, period] = await Promise.all([
    countRows(config.table, config.filter), latestValue(config.table, config.latestColumn, config.filter),
    latestValue(config.table, config.periodColumn ?? config.latestColumn, config.filter),
  ]);
  const assessment = assessFreshness(records, period, config.policy);
  return withEvidence({ key: config.key, label: config.label, fonte: config.fonte, records, latestAt, period,
    ...assessment, note: config.periodLabel }, config.functionName, monitor);
}
async function payrollSummary(orgaoTipo: "camara" | "prefeitura", monitor: MonitorSnapshot): Promise<DashboardRow> {
  const label = orgaoTipo === "camara" ? "Folha Câmara" : "Folha Prefeitura";
  // O filtro usa o relacionamento no banco, sem transportar ou truncar IDs no navegador.
  const remuneration = (columns: string, head = false) => supabase.from("remuneracao_servidores")
    .select(`${columns},servidores!inner(orgao_tipo)`, head ? { count: "exact", head: true } : undefined)
    .eq("servidores.orgao_tipo", orgaoTipo);
  const [servers, latestPeriod, latestUpdate, allPays] = await Promise.all([
    countRows("servidores", { column: "orgao_tipo", value: orgaoTipo }),
    remuneration("competencia").order("competencia", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    remuneration("updated_at").order("updated_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    remuneration("id", true),
  ]);
  if (latestPeriod.error || latestUpdate.error || allPays.error) throw new Error(`${label}: falha ao consultar remunerações.`);
  const periodData = latestPeriod.data as unknown as { competencia?: string } | null;
  const updateData = latestUpdate.data as unknown as { updated_at?: string } | null;
  const period = periodData?.competencia ?? null;
  const current = period ? await remuneration("id", true).eq("competencia", period) : { count: 0, error: null };
  if (current.error) throw new Error(`${label}: falha ao contar a última competência.`);
  const records = current.count ?? 0;
  const assessment = assessFreshness(records, period, { cadence: "monthly", maxPeriodAgeMonths: 1, label: "Competência mensal dentro do intervalo de revisão." });
  const row = withEvidence({ key: `folha-${orgaoTipo}`, label, fonte: "servidores + remuneracao_servidores", records,
    latestAt: updateData?.updated_at ?? null, period, ...assessment, note: "Última competência" },
    orgaoTipo === "camara" ? "sync-camara-servidores" : "sync-folha-prefeitura-nucleogov", monitor);
  return { ...row, coverage: `${row.coverage ? `${row.coverage} ` : ""}${servers.toLocaleString("pt-BR")} vínculos cadastrados; ${(allPays.count ?? 0).toLocaleString("pt-BR")} holerites no histórico. O total acima corresponde à última competência.` };
}
function pharmacySummary(): DashboardRow {
  const starts = PLANTAO_FARMACIAS.map((week) => week.inicio);
  const last = starts.at(-1);
  const until = last ? new Date(Date.parse(`${last}T00:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10) : null;
  return { key: "farmacias", label: "Farmácias de Plantão", fonte: "Escala documental 2026-2027", records: starts.length,
    latestAt: "2026-09-07", period: until, note: "Escala até", ...assessScheduleCoverage(starts),
    coverage: "Semanas cadastradas no documento. Fotos dos estabelecimentos não comprovam atualização da escala." };
}
async function fetchDashboard() {
  let monitor: MonitorSnapshot = { jobs: [], logs: [], observations: {} };
  let monitorError: string | null = null;
  try {
    const token = localStorage.getItem("pba_admin_token");
    if (!token) throw new Error("Sessão administrativa ausente.");
    const { data, error } = await supabase.functions.invoke("admin-sync-status", { body: { admin_token: token } });
    if (error || data?.error || !Array.isArray(data?.jobs) || !Array.isArray(data?.logs) || !data?.observations) throw new Error("Monitoramento indisponível.");
    monitor = data as MonitorSnapshot;
  } catch {
    monitorError = "Não foi possível consultar os logs e os coletores pela sessão administrativa. Os registros abaixo não comprovam a execução ou a completude das importações.";
  }
  const tasks = [
    { key: "folha-camara", label: "Folha Câmara", run: () => payrollSummary("camara", monitor) },
    { key: "folha-prefeitura", label: "Folha Prefeitura", run: () => payrollSummary("prefeitura", monitor) },
    ...DATASETS.map((config) => ({ key: config.key, label: config.label, run: () => datasetSummary(config, monitor) })),
  ];
  const rows = await Promise.all(tasks.map(async ({ key, label, run }): Promise<DashboardRow> => {
    try { return await run(); }
    catch { return { key, label, fonte: "Consulta indisponível", records: null, latestAt: null, period: null, status: "error", note: "Período", message: "Falha ao consultar esta base. As demais consultas foram preservadas." }; }
  }));
  return { rows: [...rows, pharmacySummary()], logs: monitor.logs, jobs: monitor.jobs, monitorError };
}

function detailText(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const data = details as Record<string, unknown>;
  const keys = ["competencia", "registros", "inserted", "updated", "deleted", "erro", "error", "message"];
  const parts = keys
    .filter((key) => data[key] !== undefined && data[key] !== null)
    .map((key) => `${key}: ${String(data[key])}`);
  return parts.length ? parts.join(" · ") : null;
}

export default function SyncStatusAdmin() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["admin-sync-dashboard"],
    queryFn: fetchDashboard,
    staleTime: 60_000,
  });

  const totals = useMemo(() => {
    const rows = data?.rows || [];
    return {
      ok: rows.filter((row) => row.status === "ok").length,
      warning: rows.filter((row) => row.status === "warning").length,
      empty: rows.filter((row) => row.status === "empty").length,
      error: rows.filter((row) => row.status === "error").length,
    };
  }, [data?.rows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
        Carregando sincronizações...
      </div>
    );
  }

  if (error) {
    return (
      <div className="stat-card border-destructive/30 bg-destructive/5">
        <p className="font-semibold text-destructive">Não foi possível carregar o painel de sincronizações.</p>
        <p className="text-sm text-muted-foreground mt-1">{error instanceof Error ? error.message : "Erro desconhecido"}</p>
      </div>
    );
  }

  const rows = data?.rows || [];
  const logs = data?.logs || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Sincronizações e integridade
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visão rápida das bases críticas, competência disponível e separação entre Câmara e Prefeitura.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-emerald-600">{totals.ok}</p>
          <p className="text-sm text-muted-foreground">OK</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-amber-600">{totals.warning}</p>
          <p className="text-sm text-muted-foreground">Atenção</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-muted-foreground">{totals.empty}</p>
          <p className="text-sm text-muted-foreground">Vazias</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-destructive">{totals.error}</p>
          <p className="text-sm text-muted-foreground">Falhas</p>
        </div>
      </div>

      {data?.monitorError && (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{data.monitorError}</p>
      )}
      <p className="text-sm text-muted-foreground">A competência mede a atualidade do conteúdo. A última coleta mede a execução do serviço. Limites de revisão variam por fonte e não representam prazos legais de publicação.</p>

      {!data?.monitorError && logs.length === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            sync_log ainda está vazio
          </p>
          <p className="text-sm mt-1">
            Os crons/funções precisam gravar início, término, status, competência e erro em `sync_log` para auditoria real de sincronização.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {rows.map((row) => (
          <article key={row.key} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{row.label}</p>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {row.fonte}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
              <div>
                <p className="text-sm text-muted-foreground">Registros</p>
                <p className="font-semibold text-foreground">{row.records?.toLocaleString("pt-BR") ?? "Não consultado"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{row.note || "Período"}</p>
                <p className="font-semibold text-foreground">{row.period || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última alteração</p>
                <p className="font-semibold text-foreground">{formatDate(row.latestAt)}</p>
              </div>
            </div>
            <p className="text-sm mt-3">{row.message}</p>
            {row.coverage && <p className="text-sm text-muted-foreground mt-2">{row.coverage}</p>}
            {row.checkedAt && <p className="text-xs text-muted-foreground mt-2">Última coleta concluída: {formatDate(row.checkedAt)}</p>}
          </article>
        ))}
      </div>

      {!!data?.jobs.length && (
        <details className="stat-card">
          <summary className="cursor-pointer font-semibold">Coletores: {data.jobs.length} monitorados, {data.jobs.filter((job) => assessCollector(job)?.status !== "ok").length} precisam de acompanhamento</summary>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm text-left">
              <thead><tr><th className="p-2">Coletor</th><th className="p-2">Situação</th><th className="p-2">Prazo de execução</th><th className="p-2">Última conclusão</th></tr></thead>
              <tbody>{data.jobs.map((job) => <tr key={job.function_name} className="border-t border-border"><td className="p-2">{job.function_name}</td><td className="p-2">{assessCollector(job)?.message}</td><td className="p-2">{job.max_stale_hours} horas</td><td className="p-2">{formatDate(job.last_finished_at)}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      )}

      <section className="stat-card">
        <h3 className="font-semibold text-foreground mb-3">Logs recentes</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum registro de sincronização encontrado.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{log.tipo}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(log.started_at)} até {formatDate(log.finished_at)}
                    </p>
                  </div>
                  <Badge variant={log.status === "success" || log.status === "ok" ? "default" : "outline"}>
                    {log.status}
                  </Badge>
                </div>
                {detailText(log.detalhes) && (
                  <p className="text-sm text-muted-foreground mt-2">{detailText(log.detalhes)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
