"use client";

// Aba "Prestação de Contas" compartilhada entre Prefeitura e Câmara.
// Traz dados fiscais REAIS pra dentro do portal (SICONFI / Tesouro Nacional):
//  - RGF: despesa com pessoal vs limites da Lei de Responsabilidade Fiscal.
//  - RREO: execução orçamentária (receita prevista vs realizada; despesa paga) - Prefeitura.
//  - Câmara: execução do orçamento (duodécimo).
// Abaixo, o acervo de documentos oficiais (PPA, LDO, LOA, balancete, balanço, pareceres)
// com explicação em linguagem simples e link direto à fonte.

import { useQuery } from "@tanstack/react-query";
import { fetchCamaraOrcamento, type CamaraOrcamento } from "@/data/camaraApi";
import { fetchPrestacaoContasFiscal } from "@/data/prestacaoContasApi";
import { formatCurrency } from "@/lib/formatters";
import {
  ExternalLink, BookOpen, ChevronDown, Scale, FileBarChart, Receipt,
  CalendarRange, FileText, TrendingUp, ScrollText, ClipboardCheck, Landmark, Wallet,
} from "lucide-react";

type Poder = "prefeitura" | "camara";

interface DocItem { nome: string; sigla?: string; desc: string; url: string; icon: React.ElementType; fonte?: string; }
interface DocGroup { titulo: string; desc: string; itens: DocItem[]; }

const CENTI_PREF = "https://piracanjuba.centi.com.br";
const CENTI_CAM = "https://camarapiracanjuba.centi.com.br";
const NUCLEO_CAM = "https://acessoainformacao.piracanjuba.go.leg.br";

function brlCompact(v: number | null): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `R$ ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} bi`;
  if (abs >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (abs >= 1e3) return `R$ ${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return formatCurrency(v);
}

function buildGrupos(poder: Poder): DocGroup[] {
  const base = poder === "prefeitura" ? CENTI_PREF : CENTI_CAM;
  const ente = poder === "prefeitura" ? "do município" : "da Câmara";
  const grupos: DocGroup[] = [
    {
      titulo: "Planejamento orçamentário",
      desc: "Onde o dinheiro público é planejado antes de ser gasto: metas, prioridades e o orçamento do ano.",
      itens: [
        { nome: "Plano Plurianual", sigla: "PPA", icon: CalendarRange, url: `${base}/prestacaocontas/ppa`,
          desc: "Planejamento de 4 anos: diretrizes, objetivos e metas da administração para o período." },
        { nome: "Lei de Diretrizes Orçamentárias", sigla: "LDO", icon: ScrollText, url: `${base}/prestacaocontas/ldo`,
          desc: "Define prioridades e metas para o ano seguinte e orienta a elaboração do orçamento." },
        { nome: "Lei Orçamentária Anual", sigla: "LOA", icon: FileText, url: `${base}/prestacaocontas/loa`,
          desc: "O orçamento do ano: estima as receitas e fixa as despesas autorizadas para cada área." },
      ],
    },
    {
      titulo: "Execução e responsabilidade fiscal",
      desc: "Relatórios periódicos que mostram como o orçamento está sendo executado e se os limites da Lei de Responsabilidade Fiscal (LRF) são respeitados.",
      itens: [
        { nome: "Relatório Resumido da Execução Orçamentária", sigla: "RREO", icon: TrendingUp, url: `${base}/prestacaocontas/relatorioresumido`,
          desc: "Publicado a cada bimestre. Mostra quanto foi arrecadado e gasto frente ao previsto." },
        { nome: "Relatório de Gestão Fiscal", sigla: "RGF", icon: Scale, url: `${base}/prestacaocontas/relatoriogestaofiscal`,
          desc: "Publicado a cada quadrimestre. Acompanha os limites da LRF, com destaque para a despesa com pessoal." },
        { nome: "Balancete Mensal", icon: Receipt, url: `${base}/prestacaocontas/balancetemensal`,
          desc: "Resumo mensal das receitas e despesas contabilizadas." },
      ],
    },
    {
      titulo: "Contas anuais",
      desc: "O fechamento do exercício e o julgamento das contas pelos órgãos de controle.",
      itens: [
        { nome: "Balanço Anual", icon: FileBarChart, url: `${base}/prestacaocontas/balancoanual`,
          desc: `Demonstrações contábeis do ano fechado ${ente}: balanço orçamentário, financeiro e patrimonial.` },
      ],
    },
  ];
  if (poder === "camara") {
    grupos[2].itens.push(
      { nome: "Parecer do Tribunal de Contas", icon: ClipboardCheck, url: `${NUCLEO_CAM}/cidadao/resp_fiscal/tcpareceres`, fonte: "NúcleoGov",
        desc: "Parecer do TCM-GO sobre as contas anuais da Câmara." },
      { nome: "Apreciação de Contas", icon: ClipboardCheck, url: `${NUCLEO_CAM}/cidadao/legislacao/apreciacao_contas`, fonte: "NúcleoGov",
        desc: "Julgamento das contas anuais no âmbito do Legislativo." },
      { nome: "Relatório de Gestão / Atividades", icon: FileText, url: `${NUCLEO_CAM}/cidadao/resp_fiscal/relatorios_circunstanciados`, fonte: "NúcleoGov",
        desc: "Relatório circunstanciado das atividades e da gestão do Legislativo." },
    );
  } else {
    grupos.push({
      titulo: "Outras prestações de contas",
      desc: "Prestações de contas de recursos específicos.",
      itens: [
        { nome: "Prestação de Contas - Covid-19", icon: FileText, url: `${CENTI_PREF}/transparencia/prestacaocontas`,
          desc: "Recursos recebidos e aplicados no enfrentamento da pandemia de Covid-19." },
      ],
    });
  }
  return grupos;
}

// ===== Despesa com pessoal vs limite LRF (RGF) =====
function RGFPessoal({ poder }: { poder: Poder }) {
  const codPoder = poder === "prefeitura" ? "executivo" : "legislativo";
  const { data, isLoading } = useQuery({
    queryKey: ["prestacao-fiscal", codPoder],
    queryFn: () => fetchPrestacaoContasFiscal(codPoder),
  });
  const linhas = (data || []).filter((l) => l.dtp_pct != null);
  if (isLoading) return <div className="stat-card animate-pulse h-48" />;
  if (!linhas.length) return null;

  const atual = linhas[0];
  const maxPct = atual.limite_max_pct ?? (codPoder === "executivo" ? 54 : 6);
  const alertaPct = atual.limite_alerta_pct ?? maxPct * 0.9;
  const prudPct = atual.limite_prudencial_pct ?? maxPct * 0.95;
  const pct = atual.dtp_pct ?? 0;

  let zona = "Dentro do limite", cor = "text-accent", barColor = "bg-accent";
  if (pct > maxPct) { zona = "Acima do limite legal"; cor = "text-destructive"; barColor = "bg-destructive"; }
  else if (pct > prudPct) { zona = "Acima do limite prudencial"; cor = "text-orange-600"; barColor = "bg-orange-500"; }
  else if (pct > alertaPct) { zona = "No limite de alerta"; cor = "text-amber-600"; barColor = "bg-amber-500"; }

  const left = (v: number) => `${Math.min(100, (v / maxPct) * 100)}%`;
  const fmtPct = (v: number | null) => (v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);

  return (
    <div className="stat-card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary shrink-0" /> Despesa com pessoal (Lei de Responsabilidade Fiscal)
        </p>
        {atual.periodo_rgf && (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">RGF {atual.periodo_rgf}º quad. · {atual.ano}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Gasto com pessoal</p>
          <p className="text-base font-bold text-foreground">{brlCompact(atual.dtp)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">% da Receita (RCL)</p>
          <p className={`text-base font-bold ${cor}`}>{fmtPct(atual.dtp_pct)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Situação</p>
          <p className={`text-xs font-semibold ${cor} leading-tight pt-0.5`}>{zona}</p>
        </div>
      </div>

      {/* Barra: 0 até o limite máximo, com marcadores de alerta e prudencial */}
      <div className="pt-1">
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div className={`absolute inset-y-0 left-0 ${barColor} rounded-full`} style={{ width: left(pct) }} />
          <div className="absolute inset-y-0 w-0.5 bg-amber-500/70" style={{ left: left(alertaPct) }} title={`Alerta ${fmtPct(alertaPct)}`} />
          <div className="absolute inset-y-0 w-0.5 bg-orange-500/80" style={{ left: left(prudPct) }} title={`Prudencial ${fmtPct(prudPct)}`} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>0%</span>
          <span className="text-amber-600">Alerta {fmtPct(alertaPct)}</span>
          <span className="text-orange-600">Prudencial {fmtPct(prudPct)}</span>
          <span className="text-foreground font-medium">Máx. {fmtPct(maxPct)}</span>
        </div>
      </div>

      {/* Histórico por ano */}
      {linhas.length > 1 && (
        <div className="pt-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground mb-1.5">Histórico (% da RCL)</p>
          <div className="space-y-1">
            {linhas.map((l) => {
              const p = l.dtp_pct ?? 0;
              const over = p > maxPct, prud = p > prudPct, alerta = p > alertaPct;
              const c = over ? "bg-destructive" : prud ? "bg-orange-500" : alerta ? "bg-amber-500" : "bg-accent";
              return (
                <div key={l.ano} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-10 shrink-0">{l.ano}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${c} rounded-full`} style={{ width: left(p) }} />
                  </div>
                  <span className="text-[11px] text-foreground w-14 text-right shrink-0">{fmtPct(l.dtp_pct)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] text-muted-foreground">
          RCL: {brlCompact(atual.rcl)} · limite legal {fmtPct(maxPct)} ({codPoder === "executivo" ? "Executivo" : "Legislativo"})
        </p>
        {atual.fonte_rgf_url && (
          <a href={atual.fonte_rgf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline shrink-0">
            <ExternalLink className="w-3 h-3" /> SICONFI
          </a>
        )}
      </div>
    </div>
  );
}

// ===== Execução orçamentária do município (RREO) =====
function RREOExecucao() {
  const { data, isLoading } = useQuery({
    queryKey: ["prestacao-fiscal", "executivo"],
    queryFn: () => fetchPrestacaoContasFiscal("executivo"),
  });
  if (isLoading) return <div className="stat-card animate-pulse h-28" />;
  const atual = (data || []).find((l) => l.receita_realizada != null);
  if (!atual) return null;
  const recPct = atual.receita_prevista ? (atual.receita_realizada! / atual.receita_prevista) * 100 : null;
  const fmtPct = (v: number | null) => (v == null ? "" : ` (${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)`);

  return (
    <div className="stat-card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary shrink-0" /> Execução orçamentária do município
        </p>
        {atual.periodo_rreo && (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">RREO {atual.periodo_rreo}º bim. · {atual.ano}</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Receita prevista</p>
          <p className="text-base font-bold text-foreground">{brlCompact(atual.receita_prevista)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Receita arrecadada</p>
          <p className="text-base font-bold text-accent">{brlCompact(atual.receita_realizada)}<span className="text-[11px] font-normal text-muted-foreground">{fmtPct(recPct)}</span></p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Despesa paga</p>
          <p className="text-base font-bold text-foreground">{brlCompact(atual.despesa_paga)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">Empenhada: {brlCompact(atual.despesa_empenhada)} · Liquidada: {brlCompact(atual.despesa_liquidada)}</p>
        {atual.fonte_rreo_url && (
          <a href={atual.fonte_rreo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline shrink-0">
            <ExternalLink className="w-3 h-3" /> SICONFI
          </a>
        )}
      </div>
    </div>
  );
}

// ===== Execução do orçamento da Câmara (duodécimo) =====
function OrcamentoCamaraResumo() {
  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ["camara-orcamento"],
    queryFn: fetchCamaraOrcamento,
  });
  const linhas = orcamentos || [];
  const destaque: CamaraOrcamento | undefined = linhas.find((o) => o.periodo_referencia === 6) || linhas[0];
  if (isLoading) return <div className="stat-card animate-pulse h-24" />;
  if (!destaque) return null;
  const pct = destaque.dotacao ? (((destaque.liquidada || 0) / destaque.dotacao) * 100).toFixed(1) : "0";
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary shrink-0" />
        <p className="text-sm font-semibold text-foreground">Execução do orçamento da Câmara · {destaque.ano}{destaque.periodo_referencia && destaque.periodo_referencia < 6 ? " (parcial)" : ""}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">Orçado</p>
          <p className="text-base font-bold text-foreground">{brlCompact(destaque.dotacao)}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">Executado</p>
          <p className="text-base font-bold text-accent">{brlCompact(destaque.liquidada)}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">Execução</p>
          <p className="text-base font-bold text-accent">{pct}%</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">Veja a série completa na aba <span className="font-medium text-foreground">Orçamento</span>.</p>
    </div>
  );
}

export default function PrestacaoContasTab({ poder }: { poder: Poder }) {
  const grupos = buildGrupos(poder);
  const orgao = poder === "prefeitura" ? "Prefeitura" : "Câmara";

  return (
    <div className="container py-4 space-y-5">
      <div className="flex items-start gap-2">
        <Landmark className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          Indicadores fiscais e documentos oficiais de planejamento e prestação de contas {poder === "prefeitura" ? "da Prefeitura" : "da Câmara"} de Piracanjuba.
          Os números vêm do <strong className="text-foreground">SICONFI / Tesouro Nacional</strong>; os documentos, do portal de transparência oficial.
        </p>
      </div>

      <details className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
        <summary className="flex items-center gap-2 cursor-pointer select-none p-3 text-sm font-semibold text-foreground hover:bg-primary/10 transition-colors">
          <BookOpen className="w-4 h-4 text-primary shrink-0" />
          O que é prestação de contas?
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto transition-transform [[open]_&]:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-4 pb-4 pt-1 space-y-2 text-xs text-muted-foreground leading-relaxed border-t border-primary/10">
          <p>
            Prestar contas é o dever do gestor público de mostrar <strong className="text-foreground">de onde vem e para onde vai o dinheiro público</strong>.
            Começa no <strong className="text-foreground">planejamento</strong> (PPA, LDO e LOA), passa pela <strong className="text-foreground">execução</strong> acompanhada em relatórios (RREO e RGF) e termina nas <strong className="text-foreground">contas anuais</strong>, julgadas pelo Tribunal de Contas dos Municípios (TCM-GO).
          </p>
          <p>
            A <strong className="text-foreground">Lei de Responsabilidade Fiscal (LRF)</strong> fixa limites. O principal é o teto de gasto com pessoal: <strong className="text-foreground">{poder === "prefeitura" ? "54% da Receita Corrente Líquida para o Executivo" : "6% da Receita Corrente Líquida para o Legislativo"}</strong>. Acima de 90% do teto entra em alerta; acima de 95%, no limite prudencial.
          </p>
        </div>
      </details>

      <RGFPessoal poder={poder} />
      {poder === "prefeitura" ? <RREOExecucao /> : <OrcamentoCamaraResumo />}

      {grupos.map((g) => (
        <section key={g.titulo} className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{g.titulo}</h3>
            <p className="text-xs text-muted-foreground">{g.desc}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {g.itens.map((item) => {
              const Icon = item.icon;
              return (
                <a key={item.nome} href={item.url} target="_blank" rel="noopener noreferrer" className="stat-card card-hover flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-tight">
                      {item.nome}{item.sigla ? <span className="text-muted-foreground font-normal"> ({item.sigla})</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-primary mt-1.5 group-hover:underline">
                      <ExternalLink className="w-3 h-3" /> Ver no portal oficial{item.fonte ? ` · ${item.fonte}` : ""}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
        Indicadores fiscais: SICONFI / Tesouro Nacional (declarações oficiais {orgao === "Prefeitura" ? "do município" : "da Câmara"}).
        Documentos: portal de transparência {poder === "prefeitura" ? "da Prefeitura" : "da Câmara"} de Piracanjuba. A versão oficial e mais atual está sempre na fonte de origem.
      </p>
    </div>
  );
}
