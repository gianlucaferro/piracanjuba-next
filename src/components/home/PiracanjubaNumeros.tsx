import { Users, TrendingUp, MapPin, Wallet } from "lucide-react";
import { fetchPiracanjubaNumeros } from "@/lib/data/piracanjuba-numeros";

function fmtNumero(n: number | undefined | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
}

function fmtMoeda(n: number | undefined | null) {
  if (!n) return "—";
  // PIB do IBGE vem em R$ 1.000 (mil reais). Convertemos pra real cheio.
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n * 1000);
}

function fmtMoedaSimples(n: number | undefined | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Server component — busca dados do IBGE com cache de 24h e renderiza
 * o card "Piracanjuba em números" com população, PIB e localização regional.
 */
export default async function PiracanjubaNumeros() {
  const dados = await fetchPiracanjubaNumeros();

  // Se nada veio, não renderiza (fail-open silencioso).
  if (!dados.populacao && !dados.pibPerCapita) return null;

  return (
    <section
      aria-labelledby="piracanjuba-numeros-heading"
      className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm"
    >
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2
            id="piracanjuba-numeros-heading"
            className="text-base md:text-lg font-bold text-foreground"
          >
            Piracanjuba em números
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dados oficiais do IBGE — atualizados anualmente
          </p>
        </div>
        <span className="hidden md:inline-flex text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Fonte: IBGE
        </span>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {dados.populacao && (
          <CardNumero
            icon={<Users className="w-4 h-4 text-blue-600" />}
            label="População estimada"
            valor={fmtNumero(dados.populacao.valor)}
            sub={`Estimativa ${dados.populacao.ano}`}
          />
        )}

        {dados.pibPerCapita && (
          <CardNumero
            icon={<Wallet className="w-4 h-4 text-emerald-600" />}
            label="PIB per capita"
            valor={fmtMoedaSimples(dados.pibPerCapita.valor)}
            sub={`Referência ${dados.pibPerCapita.ano}`}
          />
        )}

        {dados.pibTotal && (
          <CardNumero
            icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
            label="PIB total"
            valor={fmtMoeda(dados.pibTotal.valor)}
            sub={`Contas Regionais ${dados.pibTotal.ano}`}
          />
        )}

        {(dados.microrregiao || dados.mesorregiao) && (
          <CardNumero
            icon={<MapPin className="w-4 h-4 text-rose-600" />}
            label="Região"
            valor={dados.microrregiao ?? "—"}
            sub={dados.mesorregiao ?? "Mesorregião IBGE"}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        {dados.fonte}.
      </p>
    </section>
  );
}

function CardNumero({
  icon,
  label,
  valor,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/60 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
      </div>
      <p className="text-base md:text-lg font-extrabold text-foreground leading-tight">
        {valor}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
