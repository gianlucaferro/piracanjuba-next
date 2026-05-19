import { AlertTriangle, ExternalLink } from "lucide-react";
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

/**
 * Cruzamento contratos da Camara × CEIS/CNEP.
 * Aparece SOMENTE se houver alerta — fail-open silencioso.
 */
export default async function AlertaContratosSancao() {
  const cruzamento = await fetchContratosComSancao();
  if (cruzamento.length === 0) return null;

  return (
    <section className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-500/10 to-amber-500/5 p-5 space-y-3">
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-700" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">
            Alerta cívico: contrato com empresa sancionada
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Cruzamento entre <strong>contratos da Câmara de Piracanjuba</strong>{" "}
            e <strong>CEIS/CNEP do Portal da Transparência Federal</strong>.
            Cada linha abaixo indica empresa atualmente em cadastro nacional
            de inidoneidade ou punição que tem contrato municipal ativo ou
            firmado em Piracanjuba.
          </p>
        </div>
      </header>

      <div className="space-y-2">
        {cruzamento.map((c) => (
          <div
            key={c.contrato_id}
            className="p-3 rounded-lg border border-red-500/30 bg-background"
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="font-semibold text-sm text-foreground">
                {c.fornecedor_nome}
              </p>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-700 shrink-0">
                {c.cadastro}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{c.fornecedor_cnpj_limpo}</span>
              {c.numero && c.ano && (
                <>
                  {" · "}Contrato nº {c.numero}/{c.ano}
                </>
              )}
              {c.valor && (
                <>
                  {" · "}
                  <strong className="text-foreground">{fmtMoeda(c.valor)}</strong>
                </>
              )}
            </p>
            {c.objeto && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {c.objeto}
              </p>
            )}
            <p className="text-[11px] text-red-700 mt-2">
              <strong>{c.tipo_sancao ?? "Sanção ativa"}</strong>
              {c.orgao_sancionador && ` · ${c.orgao_sancionador}`}
              {c.data_inicio_sancao &&
                ` · Início ${new Date(c.data_inicio_sancao).toLocaleDateString("pt-BR")}`}
              {c.data_fim_sancao &&
                ` · Fim ${new Date(c.data_fim_sancao).toLocaleDateString("pt-BR")}`}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground border-t border-red-500/20 pt-3">
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
        — Portal da Transparência Federal. Existência da sanção não implica
        culpa do contrato municipal; é apenas alerta para escrutínio público.
      </p>
    </section>
  );
}
