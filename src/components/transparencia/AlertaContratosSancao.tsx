import { AlertTriangle, AlertCircle, Info, ExternalLink } from "lucide-react";
import Link from "next/link";
import { fetchContratosComSancao } from "@/lib/data/empresa-sancionada";

function fmtMoeda(n: number | null) {
  if (n === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtData(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

const SEVERIDADE_CONFIG = {
  critico: {
    label: "Crítico",
    desc: "Contrato vigente sobreposto à sanção ativa.",
    bg: "from-red-500/10 to-amber-500/5",
    border: "border-red-500/40",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-700",
    badgeBg: "bg-red-500/20 text-red-700",
    icon: AlertTriangle,
  },
  atencao: {
    label: "Atenção",
    desc: "Sobreposição temporal incerta — verificar manualmente.",
    bg: "from-amber-500/10 to-transparent",
    border: "border-amber-500/40",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-700",
    badgeBg: "bg-amber-500/20 text-amber-700",
    icon: AlertCircle,
  },
  informativo: {
    label: "Informativo",
    desc: "Contrato encerrado ANTES do início da sanção — sem irregularidade.",
    bg: "from-blue-500/10 to-transparent",
    border: "border-blue-500/30",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-700",
    badgeBg: "bg-blue-500/20 text-blue-700",
    icon: Info,
  },
} as const;

/**
 * Cruzamento contratos da Camara × CEIS/CNEP, agrupado por severidade.
 * Fail-open silencioso (nada exibido se zero cruzamento).
 */
export default async function AlertaContratosSancao() {
  const cruzamento = await fetchContratosComSancao();
  if (cruzamento.length === 0) return null;

  // Agrupar por severidade — críticos primeiro
  const ordem: Array<"critico" | "atencao" | "informativo"> = [
    "critico",
    "atencao",
    "informativo",
  ];
  const grupos = ordem
    .map((sev) => ({
      sev,
      itens: cruzamento.filter((c) => c.severidade === sev),
    }))
    .filter((g) => g.itens.length > 0);

  return (
    <section
      aria-labelledby="contratos-sancao-heading"
      className="space-y-3"
    >
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-orange-700" />
        </div>
        <div>
          <h2
            id="contratos-sancao-heading"
            className="text-base font-bold text-foreground"
          >
            Cruzamento cívico: contratos × cadastros de sanção
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">
            Sistema automatizado que cruza{" "}
            <strong>contratos da Câmara de Piracanjuba</strong> com os cadastros
            federais de sanção: <strong>CEIS</strong> e <strong>CNEP</strong>{" "}
            (Portal da Transparência), <strong>CEPIM</strong> (entidades
            impedidas de convênio), a <strong>Lista Suja do Trabalho Escravo</strong>{" "}
            (MTE) e os <strong>inidôneos do TCU</strong> (barrados de licitar).
            Classificado por sobreposição temporal entre vigência do contrato e
            período da sanção.
          </p>
        </div>
      </header>

      {grupos.map(({ sev, itens }) => {
        const cfg = SEVERIDADE_CONFIG[sev];
        const Icon = cfg.icon;
        return (
          <div
            key={sev}
            className={`rounded-2xl border-2 ${cfg.border} bg-gradient-to-br ${cfg.bg} p-4 space-y-2`}
          >
            <div className="flex items-start gap-2">
              <div className={`w-8 h-8 rounded-lg ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${cfg.iconColor}`}>
                  {cfg.label} ({itens.length})
                </p>
                <p className="text-sm text-muted-foreground">{cfg.desc}</p>
              </div>
            </div>

            <div className="space-y-2">
              {itens.map((c) => (
                <div
                  key={c.contrato_id}
                  className={`p-3 rounded-lg border ${cfg.border} bg-background`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="font-semibold text-sm text-foreground">
                      {c.fornecedor_nome}
                    </p>
                    <span
                      className={`text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded ${cfg.badgeBg} shrink-0`}
                    >
                      {c.cadastro}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-mono">{c.fornecedor_cnpj_limpo}</span>
                    {c.numero && c.ano && (
                      <>
                        {" · "}Contrato nº {c.numero}/{c.ano}
                      </>
                    )}
                    {c.valor !== null && (
                      <>
                        {" · "}
                        <strong className="text-foreground">{fmtMoeda(c.valor)}</strong>
                      </>
                    )}
                    {c.situacao && (
                      <>
                        {" · "}
                        <span className="italic">{c.situacao}</span>
                      </>
                    )}
                  </p>
                  {c.objeto && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {c.objeto}
                    </p>
                  )}
                  <div className="mt-2 text-xs grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                    <p className="text-muted-foreground">
                      <strong>Contrato:</strong>{" "}
                      {c.inicio_vigencia ? fmtData(c.inicio_vigencia) : fmtData(c.data_firmatura)}
                      {c.fim_vigencia && ` → ${fmtData(c.fim_vigencia)}`}
                    </p>
                    <p className={cfg.iconColor}>
                      <strong>Sanção:</strong>{" "}
                      {fmtData(c.data_inicio_sancao)}
                      {c.data_fim_sancao && ` → ${fmtData(c.data_fim_sancao)}`}
                    </p>
                  </div>
                  {(c.tipo_sancao || c.orgao_sancionador) && (
                    <p className={`text-xs mt-1 ${cfg.iconColor}`}>
                      <strong>{c.tipo_sancao ?? "Sanção"}</strong>
                      {c.orgao_sancionador && ` · ${c.orgao_sancionador}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        Fontes:{" "}
        <Link
          href="https://portaldatransparencia.gov.br/sancoes/ceis"
          target="_blank"
          rel="noopener noreferrer"
          className="underline inline-flex items-center gap-0.5"
        >
          CEIS <ExternalLink className="w-3 h-3" />
        </Link>{" "}
        ·{" "}
        <Link
          href="https://portaldatransparencia.gov.br/sancoes/cnep"
          target="_blank"
          rel="noopener noreferrer"
          className="underline inline-flex items-center gap-0.5"
        >
          CNEP <ExternalLink className="w-3 h-3" />
        </Link>{" "}
        ·{" "}
        <Link
          href="https://portaldatransparencia.gov.br/sancoes/cepim"
          target="_blank"
          rel="noopener noreferrer"
          className="underline inline-flex items-center gap-0.5"
        >
          CEPIM <ExternalLink className="w-3 h-3" />
        </Link>{" "}
        (Portal da Transparência Federal) · <strong>Lista Suja do Trabalho
        Escravo</strong> (MTE) · <strong>inidôneos do TCU</strong>. CEIS, CNEP e
        CEPIM têm atualização automática; Lista Suja e TCU são fontes
        complementares. Existência da sanção <strong>não implica culpa</strong>{" "}
        automática do contrato municipal, é alerta para escrutínio público. A{" "}
        <strong>presunção de inocência é inviolável</strong> (CF art. 5º LVII).
      </p>
    </section>
  );
}
