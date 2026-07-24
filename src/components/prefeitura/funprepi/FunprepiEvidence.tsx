import {
  AlertTriangle,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  FileWarning,
  Scale,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  FUNPREPI_PORTAL_HISTORICO_URL,
  FUNPREPI_PORTAL_URL,
  type FunprepiDashboard,
} from "@/lib/funprepi";
import {
  dataBr,
  documentoBr,
  FonteLink,
  GraficoVazio,
  moeda,
} from "./FunprepiUi";

export function FunprepiEvidence({ data }: { data: FunprepiDashboard }) {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-2">
        <article className="stat-card">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <FileWarning className="h-4 w-4 text-amber-600" aria-hidden />
              Trilhas que merecem verificação
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Regras automáticas priorizam documentos para leitura humana.
            </p>
          </div>
          {data.indicios.length > 0 ? (
            <div className="space-y-3">
              {data.indicios.map((indicio) => (
                <article
                  key={indicio.chave}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {indicio.titulo}
                    </h4>
                    <Badge
                      variant="outline"
                      className={
                        indicio.severidade === "alta"
                          ? "border-red-500/30 bg-red-500/10 text-red-700"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                      }
                    >
                      {indicio.severidade} · score {indicio.score}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {indicio.descricao}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {indicio.contrato_id && (
                      <span className="text-muted-foreground">
                        Contrato ID {indicio.contrato_id}
                      </span>
                    )}
                    {indicio.fonte_urls.map((url) => (
                      <FonteLink key={url} href={url}>
                        Fonte oficial
                      </FonteLink>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <GraficoVazio texto="Nenhum indício específico do órgão 44 está ativo na base." />
          )}
          <div className="mt-4 flex gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Indício não é prova. Uma regra pode refletir erro de preenchimento,
              agregação do portal ou documento ainda não vinculado.
            </p>
          </div>
        </article>

        <article className="stat-card">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <BookOpenCheck className="h-4 w-4 text-primary" aria-hidden />
              Evidências documentais
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O que está documentado e o que permanece como lacuna pública.
            </p>
          </div>
          <div className="space-y-3">
            {data.evidencias.map((evidencia) => (
              <article
                key={evidencia.chave}
                className="rounded-xl border border-border bg-muted/20 p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      evidencia.situacao === "nao_publicado"
                        ? "bg-amber-500/10 text-amber-700"
                        : "bg-emerald-500/10 text-emerald-700"
                    }`}
                  >
                    {evidencia.situacao === "nao_publicado" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {evidencia.titulo}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {evidencia.orgao_emissor} · referência{" "}
                      {dataBr(evidencia.data_referencia)}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {evidencia.descricao}
                    </p>
                    <p className="mt-3 text-xs">
                      <FonteLink href={evidencia.fonte_url}>
                        Abrir documento ou fonte
                      </FonteLink>
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="stat-card">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Building2 className="h-4 w-4 text-primary" aria-hidden />
          Contratos associados ao FUNPREPI
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Registros do portal novo, ordenados pelos exercícios mais recentes disponíveis.
        </p>
        {data.contratos.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {data.contratos.map((contrato) => (
              <article
                key={contrato.id}
                className="rounded-xl border border-border bg-muted/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {contrato.fornecedor_nome ?? "Fornecedor não informado"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Contrato {contrato.numero ?? "sem número"}/{contrato.ano ?? "s/ano"} ·{" "}
                      {documentoBr(contrato.documento)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {contrato.valor === null ? "Valor não informado" : moeda(contrato.valor)}
                  </span>
                </div>
                {contrato.objeto && (
                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                    {contrato.objeto}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {contrato.situacao && <Badge variant="outline">{contrato.situacao}</Badge>}
                  {contrato.situacao_cadastral && (
                    <Badge variant="outline">CNPJ {contrato.situacao_cadastral}</Badge>
                  )}
                  {contrato.fiscal_contrato && (
                    <span>Fiscal: {contrato.fiscal_contrato}</span>
                  )}
                  <FonteLink href={contrato.fonte_url}>Ver no portal</FonteLink>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <GraficoVazio texto="Não há contratos do órgão 44 na carga atual." />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden />
          <div>
            <h3 className="font-semibold text-foreground">
              Dados necessários para medir a saúde previdenciária
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Despesas não bastam para calcular solvência. Ainda são necessários número
              mensal de beneficiários, contribuições patronais e dos servidores,
              parcelamentos, aportes, compensação previdenciária, carteira de
              investimentos, rentabilidade e avaliação atuarial atualizada.
            </p>
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-3xl">
          Metodologia: o portal histórico funciona como fotografia de referência. A base
          nova é atualizada pelo pipeline NucleoGov. Diferenças são mostradas, não
          preenchidas artificialmente.
        </p>
        <div className="flex shrink-0 flex-wrap gap-3">
          <FonteLink href={FUNPREPI_PORTAL_HISTORICO_URL}>Portal histórico</FonteLink>
          <FonteLink href={FUNPREPI_PORTAL_URL}>Portal atual</FonteLink>
        </div>
      </footer>
    </>
  );
}
