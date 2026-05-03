import { HandHeart, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchBeneficiosData } from "@/lib/data/setores";

export const metadata = pageMetadata({
  title: "Benefícios Sociais em Piracanjuba GO",
  description:
    "Benefícios sociais de Piracanjuba: Bolsa Família, BPC, Pé-de-Meia, beneficiários e valor pago por programa.",
  path: "/beneficios-sociais",
});

export const revalidate = 3600;

function fmtBRL(n: number | string | null) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function BeneficiosSociaisPage() {
  const beneficios = await fetchBeneficiosData();

  const byProgram = beneficios.reduce<
    Record<string, { ultimoPago: number; ultimoBeneficiarios: number; competencia: string; fonte_url: string | null; fonte_nome: string | null; total_pago: number }>
  >((acc, b) => {
    const k = b.programa || "Outros";
    if (!acc[k]) {
      acc[k] = {
        ultimoPago: 0,
        ultimoBeneficiarios: 0,
        competencia: "",
        fonte_url: null,
        fonte_nome: null,
        total_pago: 0,
      };
    }
    if (!acc[k].competencia || (b.competencia && b.competencia > acc[k].competencia)) {
      acc[k].competencia = b.competencia || "";
      acc[k].ultimoPago = Number(b.valor_pago || 0);
      acc[k].ultimoBeneficiarios = b.beneficiarios || 0;
      acc[k].fonte_url = b.fonte_url;
      acc[k].fonte_nome = b.fonte_nome;
    }
    acc[k].total_pago += Number(b.valor_pago || 0);
    return acc;
  }, {});

  const totalPago = beneficios.reduce((s, b) => s + Number(b.valor_pago || 0), 0);
  const totalBeneficiarios = Object.values(byProgram).reduce((s, p) => s + p.ultimoBeneficiarios, 0);

  return (
    <>
      <section className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <HandHeart className="w-8 h-8 text-purple-500" />
            Benefícios Sociais
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Programas sociais federais executados em Piracanjuba — Bolsa Família, BPC,
            Pé-de-Meia. Fonte: Portal da Transparência.
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Programas" value={Object.keys(byProgram).length.toString()} />
          <Stat label="Beneficiários (último mês)" value={totalBeneficiarios.toLocaleString("pt-BR")} />
          <Stat label="Total pago" value={fmtBRL(totalPago)} />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Programas ativos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(byProgram).map(([programa, dados]) => (
              <article key={programa} className="stat-card">
                <h3 className="font-semibold text-foreground">{programa}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Competência: {dados.competencia || "—"}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Beneficiários</p>
                    <p className="font-semibold text-foreground">{dados.ultimoBeneficiarios.toLocaleString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Valor pago</p>
                    <p className="font-semibold text-foreground">{fmtBRL(dados.ultimoPago)}</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Total acumulado: <span className="text-foreground">{fmtBRL(dados.total_pago)}</span>
                </p>
                {dados.fonte_url && (
                  <a href={dados.fonte_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-2">
                    {dados.fonte_nome || "Fonte"} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Histórico ({beneficios.length} registros)</h2>
          <div className="overflow-x-auto stat-card p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left">
                <tr>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Programa</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Competência</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">Beneficiários</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">Valor pago</th>
                </tr>
              </thead>
              <tbody>
                {beneficios.slice(0, 60).map((b) => (
                  <tr key={b.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 text-foreground">{b.programa}</td>
                    <td className="px-4 py-2 text-muted-foreground">{b.competencia}</td>
                    <td className="px-4 py-2 text-right text-foreground">{b.beneficiarios?.toLocaleString("pt-BR") ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-foreground">{fmtBRL(b.valor_pago)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}
