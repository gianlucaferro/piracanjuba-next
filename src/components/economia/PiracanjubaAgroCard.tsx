import { Beef, Droplet } from "lucide-react";
import { fetchDadosAgro } from "@/lib/data/agronegocio";

function fmtNumero(n: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
}

export default async function PiracanjubaAgroCard() {
  const dados = await fetchDadosAgro();
  if (!dados.bovinos && !dados.leite) return null;

  return (
    <section
      aria-labelledby="agro-heading"
      className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-5 md:p-6"
    >
      <header className="mb-4">
        <h3 id="agro-heading" className="text-base md:text-lg font-bold text-foreground">
          Piracanjuba na agricultura
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pesquisa Pecuária Municipal (IBGE/SIDRA) — última safra disponível
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {dados.bovinos && (
          <div className="rounded-xl bg-background border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Beef className="w-5 h-5 text-amber-700" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Rebanho bovino
              </p>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-foreground leading-none">
              {fmtNumero(dados.bovinos.cabecas)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              cabeças de gado · referência {dados.bovinos.ano}
            </p>
          </div>
        )}

        {dados.leite && (
          <div className="rounded-xl bg-background border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplet className="w-5 h-5 text-blue-600" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Produção de leite
              </p>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-foreground leading-none">
              {fmtNumero(dados.leite.milLitros * 1000)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              litros/ano · referência {dados.leite.ano}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Fonte: IBGE — Pesquisa Pecuária Municipal (PPM) via SIDRA. Atualização
        anual com defasagem de 1–2 anos.
      </p>
    </section>
  );
}
