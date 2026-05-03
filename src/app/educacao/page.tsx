import { GraduationCap, MapPin, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchEducacaoData } from "@/lib/data/setores";

export const metadata = pageMetadata({
  title: "Educação em Piracanjuba GO",
  description:
    "Dados de educação de Piracanjuba: IDEB, escolas (INEP), matrículas, taxas de aprovação/reprovação/abandono e infraestrutura.",
  path: "/educacao",
});

export const revalidate = 3600;

export default async function EducacaoPage() {
  const { indicadores, escolas } = await fetchEducacaoData();
  const totalMatriculas = escolas.reduce((s, e) => s + (e.matriculas_total || 0), 0);
  const escolasComIDEB = escolas.filter((e) => e.ideb_ai != null);
  const idebMedia = escolasComIDEB.length
    ? escolasComIDEB.reduce((s, e) => s + Number(e.ideb_ai || 0), 0) / escolasComIDEB.length
    : 0;

  return (
    <>
      <section className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-500" />
            Educação em Piracanjuba
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Dados educacionais oficiais (INEP, QEdu) — IDEB, matrículas, taxas e
            infraestrutura escolar.
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Escolas" value={escolas.length.toLocaleString("pt-BR")} />
          <Stat label="Matrículas" value={totalMatriculas.toLocaleString("pt-BR")} />
          <Stat label="IDEB médio AI" value={idebMedia ? idebMedia.toFixed(1).replace(".", ",") : "—"} />
          <Stat label="Indicadores" value={indicadores.length.toString()} />
        </section>

        {escolas.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Escolas ({escolas.length})
            </h2>
            <div className="overflow-x-auto stat-card p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Nome</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Rede</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Matrículas</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">IDEB AI</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">IDEB AF</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">% Aprov.</th>
                  </tr>
                </thead>
                <tbody>
                  {escolas.map((e) => (
                    <tr key={e.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2 text-foreground">{e.nome}</td>
                      <td className="px-4 py-2 text-muted-foreground capitalize">{e.rede || "—"}</td>
                      <td className="px-4 py-2 text-right text-foreground">{e.matriculas_total?.toLocaleString("pt-BR") || "—"}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{e.ideb_ai?.toString().replace(".", ",") || "—"}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{e.ideb_af?.toString().replace(".", ",") || "—"}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{e.taxa_aprovacao ? `${Number(e.taxa_aprovacao).toFixed(1)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {indicadores.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Indicadores municipais</h2>
            <div className="overflow-x-auto stat-card p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Indicador</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Valor</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground text-right">Ano</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {indicadores.map((i) => (
                    <tr key={i.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2 text-foreground">{i.chave}</td>
                      <td className="px-4 py-2 text-right text-foreground">
                        {i.valor_texto || (i.valor != null ? Number(i.valor).toLocaleString("pt-BR") : "—")}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{i.ano_referencia}</td>
                      <td className="px-4 py-2 text-muted-foreground text-[11px]">
                        {i.fonte_url ? (
                          <a href={i.fonte_url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">
                            {i.fonte || "Fonte"} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          i.fonte || "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
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
