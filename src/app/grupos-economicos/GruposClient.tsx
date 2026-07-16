"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchGrupos, type GrupoEconomico, type GrupoMembro } from "@/data/gruposApi";
import { Network, Users, Building2, Loader2, Info, ArrowRight } from "lucide-react";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Acento por setor (hex que funciona em tema claro e escuro).
function corSetor(setor: string | null): string {
  switch (setor) {
    case "Saúde": return "#10b981";
    case "Autopeças e serviços": return "#f59e0b";
    case "Papelaria": return "#3b82f6";
    default: return "#8b5cf6";
  }
}

function razaoCurta(r: string | null): string {
  if (!r) return "Empresa";
  let s = r.replace(/\s+-\s+EM RECUPERACAO.*$/i, "");
  s = s.replace(/\s+(LTDA|EIRELI|S\/?\.?A\.?|ME|EPP)\b.*$/i, "").trim();
  s = titulo(s);
  return s.length > 26 ? s.slice(0, 25) + "…" : s;
}

function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return titulo(nome);
  return titulo(`${partes[0]} ${partes[partes.length - 1]}`);
}
function titulo(s: string): string {
  return s.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());
}

interface GrafoGrupoProps {
  grupo: GrupoEconomico;
}

// Grafo bipartite: empresas (esquerda) x sócios que as conectam (direita).
function GrafoGrupo({ grupo }: GrafoGrupoProps) {
  const [hover, setHover] = useState<string | null>(null);
  const acento = corSetor(grupo.setor);
  const empresas = grupo.membros;
  const socios = grupo.socios_conectores;
  const linkado = new Map<string, Set<string>>();
  socios.forEach((s, j) => {
    s.cnpjs.forEach((c) => {
      const k = c.replace(/\D/g, "");
      if (!linkado.has(k)) linkado.set(k, new Set());
      linkado.get(k)!.add(`s${j}`);
    });
  });

  const rowH = 56;
  const top = 18;
  const rows = Math.max(empresas.length, socios.length);
  const H = top * 2 + rows * rowH;
  const offE = (rows - empresas.length) / 2;
  const offS = (rows - socios.length) / 2;
  const yE = (i: number) => top + (offE + i) * rowH + rowH / 2;
  const yS = (j: number) => top + (offS + j) * rowH + rowH / 2;

  const arestaAtiva = (cnpj: string, j: number) =>
    hover === null || hover === `e${cnpj}` || hover === `s${j}`;
  const empAtiva = (cnpj: string) => {
    if (hover === null || hover === `e${cnpj}`) return true;
    if (hover?.startsWith("s")) return (linkado.get(cnpj) ?? new Set()).has(hover);
    return false;
  };
  const socAtivo = (j: number) => {
    if (hover === null || hover === `s${j}`) return true;
    if (hover?.startsWith("e")) return (linkado.get(hover.slice(1)) ?? new Set()).has(`s${j}`);
    return false;
  };

  return (
    <svg viewBox={`0 0 520 ${H}`} className="w-full text-foreground" style={{ maxHeight: H }} role="img"
      aria-label={`Grafo do grupo: ${empresas.length} empresas ligadas por ${socios.length} sócios`}>
      {empresas.map((e) => {
        const ck = e.cnpj.replace(/\D/g, "");
        const conj = linkado.get(ck) ?? new Set();
        return Array.from(conj).map((sk) => {
          const j = Number(sk.slice(1));
          const ativa = arestaAtiva(ck, j);
          return (
            <path key={`${ck}-${sk}`} d={`M 206 ${yE(empresas.indexOf(e))} C 268 ${yE(empresas.indexOf(e))} 268 ${yS(j)} 326 ${yS(j)}`}
              fill="none" stroke={ativa ? acento : "currentColor"} strokeOpacity={ativa ? 0.7 : 0.12} strokeWidth={ativa ? 1.6 : 1} />
          );
        });
      })}
      {empresas.map((e, i) => {
        const ck = e.cnpj.replace(/\D/g, "");
        const on = empAtiva(ck);
        return (
          <g key={ck} onMouseEnter={() => setHover(`e${ck}`)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }} opacity={on ? 1 : 0.35}>
            <rect x={8} y={yE(i) - 19} width={198} height={38} rx={8} fill="currentColor" fillOpacity={0.05} stroke={acento} strokeOpacity={0.55} />
            <text x={18} y={yE(i) - 3} fontSize={12.5} fontWeight={500} fill="currentColor">{razaoCurta(e.razao_social)}</text>
            <text x={18} y={yE(i) + 12} fontSize={11} fill="currentColor" fillOpacity={0.6}>{BRL.format(e.valor)} · {e.n_contratos} contr.</text>
          </g>
        );
      })}
      {socios.map((s, j) => {
        const on = socAtivo(j);
        return (
          <g key={j} onMouseEnter={() => setHover(`s${j}`)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }} opacity={on ? 1 : 0.35}>
            <rect x={326} y={yS(j) - 15} width={186} height={30} rx={15} fill="currentColor" fillOpacity={0.08} stroke="currentColor" strokeOpacity={0.2} />
            <text x={419} y={yS(j) + 4} fontSize={12} textAnchor="middle" fill="currentColor">{nomeCurto(s.nome)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PoderChip({ poder }: { poder: string }) {
  const label = poder === "camara" ? "Câmara" : "Prefeitura";
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{label}</span>
  );
}

function GrupoCard({ grupo }: { grupo: GrupoEconomico }) {
  const acento = corSetor(grupo.setor);
  const participacoes = (cnpj: string) => {
    const k = cnpj.replace(/\D/g, "");
    return grupo.socios_conectores.filter((s) => s.cnpjs.some((c) => c.replace(/\D/g, "") === k)).length;
  };
  const ancora = [...grupo.membros].sort(
    (a, b) => participacoes(b.cnpj) - participacoes(a.cnpj) || b.valor - a.valor
  )[0];
  return (
    <div className="stat-card space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full mb-1.5"
            style={{ color: acento, backgroundColor: `${acento}1a` }}>
            <Network className="w-3.5 h-3.5" /> {grupo.setor || "Grupo econômico"}
          </span>
          <h2 className="text-base font-semibold text-foreground leading-snug">Grupo {razaoCurta(ancora?.razao_social ?? grupo.rotulo)}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {grupo.n_empresas} empresas ligadas por {grupo.socios_conectores.length} {grupo.socios_conectores.length === 1 ? "sócio" : "sócios"} em comum
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-foreground">{BRL.format(grupo.valor_total)}</p>
          <p className="text-xs text-muted-foreground">em contratos públicos</p>
        </div>
      </div>

      <GrafoGrupo grupo={grupo} />

      <div className="space-y-1.5">
        {grupo.membros.map((m: GrupoMembro) => (
          <div key={m.cnpj} className="flex items-center justify-between gap-2 text-sm border-t border-border/60 pt-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground truncate">{razaoCurta(m.razao_social)}</span>
              {m.poderes.map((p) => <PoderChip key={p} poder={p} />)}
            </div>
            <span className="text-muted-foreground shrink-0">{BRL.format(m.valor)} · {m.n_contratos}c</span>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5 mt-px shrink-0" />
        <span>Sócios que conectam: {grupo.socios_conectores.map((s) => titulo(s.nome)).join(" · ")}</span>
      </div>
    </div>
  );
}

export default function GruposClient() {
  const { data: grupos, isLoading, isError } = useQuery({ queryKey: ["grupos-economicos"], queryFn: fetchGrupos });

  const totais = useMemo(() => {
    if (!grupos) return null;
    return {
      grupos: grupos.length,
      empresas: grupos.reduce((a, g) => a + g.n_empresas, 0),
      valor: grupos.reduce((a, g) => a + g.valor_total, 0),
    };
  }, [grupos]);

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <header className="text-center space-y-3 pb-1">
        <div className="inline-flex items-center gap-1.5 bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 rounded-full px-3 py-1 text-sm font-medium text-violet-800 dark:text-violet-300">
          <Network className="w-4 h-4" /> Rede de fornecedores
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Grupos econômicos entre fornecedores</h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
          Empresas que têm contrato com a prefeitura ou a câmara e que compartilham os mesmos sócios. Cruzamento feito a partir do quadro societário oficial da Receita Federal.
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando grupos...
        </div>
      )}
      {isError && (
        <p className="text-center text-sm text-muted-foreground py-8">Não foi possível carregar os grupos agora. Tente novamente em instantes.</p>
      )}

      {grupos && totais && (
        <>
          <p className="text-sm text-muted-foreground">
            {totais.grupos} grupos · {totais.empresas} empresas · {BRL.format(totais.valor)} em contratos
          </p>
          <div className="space-y-4">
            {grupos.map((g) => <GrupoCard key={g.id} grupo={g} />)}
          </div>
        </>
      )}

      <div className="stat-card bg-muted/40 text-sm text-muted-foreground space-y-2">
        <p className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Ter sócios em comum <strong className="text-foreground">não é ilegal nem indício de irregularidade</strong>. Empresas do mesmo grupo podem atuar em ramos diferentes. O objetivo aqui é dar visibilidade a vínculos que não aparecem olhando contrato por contrato. A relação só mereceria escrutínio se empresas do mesmo grupo disputassem a mesma licitação simulando concorrência.
          </span>
        </p>
        <p>
          Fonte: quadro de sócios e administradores (QSA) da Receita Federal, cruzado com os contratos publicados pela prefeitura e pela câmara. Passe o mouse sobre um sócio ou empresa no grafo para destacar as ligações.
        </p>
      </div>
    </div>
  );
}
