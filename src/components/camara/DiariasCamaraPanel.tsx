import { Plane, Calendar, MapPin, ExternalLink, CircleAlert } from "lucide-react";
import type { DiariaCamara } from "@/lib/data/diarias-camara";

function fmtBRL(n: number | null) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

type Props = {
  diarias: DiariaCamara[];
  nomePessoa: string;
};

export default function DiariasCamaraPanel({ diarias, nomePessoa }: Props) {
  const totalValor = diarias.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
  const totalDias = diarias.reduce((acc, d) => acc + (Number(d.quantidade) || 0), 0);

  if (diarias.length === 0) {
    return (
      <section className="stat-card border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
            <Plane className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Diárias e Passagens
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
              Nenhuma diária registrada pra {nomePessoa} no portal LAI Centi.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="stat-card border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
          <Plane className="w-5 h-5 text-sky-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">
            Diárias e Passagens
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
            Pagamentos por viagens a trabalho (capacitações, eventos UVB, audiências em Brasília/Goiânia).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="stat-card">
          <p className="text-xs uppercase text-muted-foreground">Total recebido</p>
          <p className="text-xl font-extrabold text-sky-700 mt-0.5">{fmtBRL(totalValor)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs uppercase text-muted-foreground">Viagens</p>
          <p className="text-xl font-extrabold text-foreground mt-0.5">{diarias.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs uppercase text-muted-foreground">Dias afastado</p>
          <p className="text-xl font-extrabold text-foreground mt-0.5">{totalDias}</p>
        </div>
      </div>

      <div className="space-y-2">
        {diarias.map((d) => (
          <div key={d.id} className="p-3 rounded-lg border border-border bg-background/40">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-foreground inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                {d.destino || d.cidade || "—"}
              </p>
              <p className="text-sm font-bold text-sky-700">{fmtBRL(d.valor)}</p>
            </div>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mb-1">
              <Calendar className="w-3 h-3" />
              {fmtDate(d.data_inicio)} → {fmtDate(d.data_fim)}
              {d.quantidade && ` · ${d.quantidade} diária${d.quantidade > 1 ? "s" : ""}`}
            </p>
            {d.descricao && (
              <p className="text-sm text-foreground/85 leading-relaxed mt-1">
                {d.descricao}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground inline-flex items-center gap-1 mb-1">
          <CircleAlert className="w-3.5 h-3.5 text-blue-600" />
          Sobre estes dados
        </p>
        <p>
          Diária = pagamento pra cobrir hospedagem, alimentação e locomoção em
          viagens oficiais. Coletadas semanal/mensalmente do portal LAI Centi
          (sistema NucleoGov) da Câmara via API direta.
        </p>
      </div>
    </section>
  );
}
