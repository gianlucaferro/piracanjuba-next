"use client";

// Aba "Prestação de Contas" compartilhada entre Prefeitura e Câmara.
// Reúne, num lugar só, os instrumentos oficiais de planejamento e prestação de
// contas (PPA, LDO, LOA, RREO, RGF, Balancete, Balanço, pareceres), com
// explicação em linguagem simples e link direto pra fonte oficial. Na Câmara,
// mostra também o orçamento (execução) que já temos do SICONFI.

import { useQuery } from "@tanstack/react-query";
import { fetchCamaraOrcamento, type CamaraOrcamento } from "@/data/camaraApi";
import { formatCurrency } from "@/lib/formatters";
import {
  ExternalLink, BookOpen, ChevronDown, Scale, FileBarChart, Receipt,
  CalendarRange, FileText, TrendingUp, ScrollText, ClipboardCheck, Landmark,
} from "lucide-react";

type Poder = "prefeitura" | "camara";

interface DocItem {
  nome: string;
  sigla?: string;
  desc: string;
  url: string;
  icon: React.ElementType;
  fonte?: string;
}
interface DocGroup {
  titulo: string;
  desc: string;
  itens: DocItem[];
}

const CENTI_PREF = "https://piracanjuba.centi.com.br";
const CENTI_CAM = "https://camarapiracanjuba.centi.com.br";
const NUCLEO_CAM = "https://acessoainformacao.piracanjuba.go.leg.br";

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

function OrcamentoCamaraResumo() {
  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ["camara-orcamento"],
    queryFn: fetchCamaraOrcamento,
  });
  const linhas = orcamentos || [];
  const destaque: CamaraOrcamento | undefined =
    linhas.find((o) => o.periodo_referencia === 6) || linhas[0];

  if (isLoading) return <div className="stat-card animate-pulse h-24" />;
  if (!destaque) return null;

  const pct = destaque.dotacao ? (((destaque.liquidada || 0) / destaque.dotacao) * 100).toFixed(1) : "0";

  return (
    <div className="stat-card border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary shrink-0" />
        <p className="text-sm font-semibold text-foreground">Execução orçamentária da Câmara · {destaque.ano}{destaque.periodo_referencia && destaque.periodo_referencia < 6 ? " (parcial)" : ""}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">Orçado</p>
          <p className="text-base font-bold text-foreground">{formatCurrency(destaque.dotacao || 0)}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">Executado</p>
          <p className="text-base font-bold text-accent">{formatCurrency(destaque.liquidada || 0)}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">Execução</p>
          <p className="text-base font-bold text-accent">{pct}%</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">
        Dados do SICONFI / Tesouro Nacional. Veja a série completa na aba <span className="font-medium text-foreground">Orçamento</span>.
      </p>
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
          Reunimos aqui os documentos oficiais de planejamento e prestação de contas {poder === "prefeitura" ? "da Prefeitura" : "da Câmara"} de Piracanjuba,
          organizados e explicados. Os arquivos abrem no portal de transparência oficial {poder === "prefeitura" ? "(Centi)" : "(Centi e NúcleoGov)"}, fonte primária dos dados.
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
            Prestar contas é o dever de todo gestor público de mostrar, de forma transparente, <strong className="text-foreground">de onde vem e para onde vai o dinheiro público</strong>.
            A sequência começa no <strong className="text-foreground">planejamento</strong> (PPA, LDO e LOA), passa pela <strong className="text-foreground">execução</strong> acompanhada em relatórios periódicos (RREO e RGF) e termina nas <strong className="text-foreground">contas anuais</strong>, que são julgadas pelo Tribunal de Contas dos Municípios (TCM-GO).
          </p>
          <p>
            A <strong className="text-foreground">Lei de Responsabilidade Fiscal (LRF)</strong> fixa limites, como o teto de gasto com pessoal. O RGF é o relatório que comprova, a cada quadrimestre, se {orgao === "Prefeitura" ? "o município" : "a Câmara"} está dentro desses limites.
          </p>
        </div>
      </details>

      {poder === "camara" && <OrcamentoCamaraResumo />}

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
                <a key={item.nome} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="stat-card card-hover flex items-start gap-3 group">
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
        Fontes oficiais: portal de transparência {poder === "prefeitura" ? "da Prefeitura" : "da Câmara"} de Piracanjuba.
        O Piracanjuba.ai organiza e explica os documentos, mas a versão oficial e mais atual está sempre no portal de origem.
      </p>
    </div>
  );
}
