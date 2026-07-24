import { HandCoins, Building2, User, ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import {
  fetchDoadoresPorVereadorSlug,
  fetchDoadoresDoExecutivo,
  type DoadoresResult,
} from "@/lib/data/tse-doadores";
import { getCargoAtualDoador } from "@/lib/funprepi";

function fmtMoeda(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function mascararCpf(s: string) {
  const limpo = s.replace(/\D/g, "");
  if (limpo.length === 11) return `***.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-**`;
  if (limpo.length === 14) {
    return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12, 14)}`;
  }
  return s;
}

// Apresentacional: recebe o resultado ja buscado/agregado e renderiza o card.
function FinanciadoresView({
  resumo,
  topDoadores,
  titulo,
  subtitulo,
}: DoadoresResult & { titulo?: string; subtitulo?: string }) {
  if (!resumo || topDoadores.length === 0) return null;

  return (
    <section
      id="financiadores"
      aria-labelledby="financiadores-heading"
      className="stat-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent space-y-4 scroll-mt-24"
    >
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <HandCoins className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h3 id="financiadores-heading" className="text-base font-semibold text-foreground">
            {titulo || `Financiadores de campanha ${resumo.ano_eleicao}`}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
            {resumo.total_doacoes} doaç{resumo.total_doacoes > 1 ? "ões" : "ão"} ·{" "}
            <strong className="text-emerald-700">{fmtMoeda(resumo.total_arrecadado)}</strong> arrecadado ·{" "}
            {resumo.doacoes_pj} PJ · {resumo.doacoes_pf} PF
          </p>
        </div>
      </header>

      {subtitulo && (
        <p className="text-xs text-muted-foreground leading-relaxed inline-flex items-start gap-1.5 rounded-lg border border-border bg-background/40 p-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          {subtitulo}
        </p>
      )}

      <div className="space-y-2">
        {topDoadores.map((d, i) => {
          const isPj = (d.tipo_doador ?? "").toLowerCase().includes("jurid") || d.cpf_cnpj_doador.replace(/\D/g, "").length === 14;
          const cargoAtual = getCargoAtualDoador(d.nome_doador);
          return (
            <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background/40">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  isPj ? "bg-blue-500/10 text-blue-700" : "bg-amber-500/10 text-amber-700"
                }`}
              >
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground leading-snug">
                  {d.nome_doador}
                  {cargoAtual && (
                    <span className="font-normal text-muted-foreground">
                      {" - "}{cargoAtual.cargo}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    {isPj ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {isPj ? "Pessoa Jurídica" : "Pessoa Física"}
                  </span>
                  <span className="font-mono">{mascararCpf(d.cpf_cnpj_doador)}</span>
                  {d.dt_receita && <span>{new Date(d.dt_receita).toLocaleDateString("pt-BR")}</span>}
                </div>
                {cargoAtual && (
                  <Link
                    href={cargoAtual.fonteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Cargo atual: Prefeitura de Piracanjuba
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <p className="text-sm font-bold text-emerald-700 shrink-0">{fmtMoeda(d.vr_receita)}</p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        Fonte:{" "}
        <Link
          href="https://dadosabertos.tse.jus.br/dataset/prestacao-de-contas-eleitorais-2024"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground inline-flex items-center gap-0.5"
        >
          TSE · Prestação de Contas Eleitorais <ExternalLink className="w-3 h-3" />
        </Link>{" "}
        · Dados oficiais públicos · CPFs de pessoas físicas são exibidos mascarados (LGPD).
      </p>
    </section>
  );
}

// Vereador (por slug) — usado na pagina /vereadores/[slug].
export default async function FinanciadoresCampanhaCard({ vereadorSlug }: { vereadorSlug: string }) {
  const { resumo, topDoadores } = await fetchDoadoresPorVereadorSlug(vereadorSlug);
  return <FinanciadoresView resumo={resumo} topDoadores={topDoadores} />;
}

// Executivo (chapa da prefeita) — usado na pagina /prefeitura.
export async function FinanciadoresExecutivoCard() {
  const { resumo, topDoadores, nome } = await fetchDoadoresDoExecutivo();
  return (
    <FinanciadoresView
      resumo={resumo}
      topDoadores={topDoadores}
      titulo={`Financiadores da campanha ${resumo?.ano_eleicao ?? ""}`.trim()}
      subtitulo={`Doações declaradas pela chapa de ${nome || "prefeito(a)"}. Prefeito e vice compartilham as finanças de campanha: a prestação de contas é feita pela titular.`}
    />
  );
}
