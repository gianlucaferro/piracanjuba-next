import Link from "next/link";
import { ShieldCheck, ExternalLink, Info } from "lucide-react";
import type { CamaraDeclaracao } from "@/lib/data/camara-declaracoes";

function fmtData(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

type Props = {
  declaracao: CamaraDeclaracao;
  /** Modo compacto (card pequeno no perfil do vereador) ou completo (página dedicada) */
  variant?: "compact" | "full";
};

export default function CotasParlamentaresCard({
  declaracao,
  variant = "compact",
}: Props) {
  if (variant === "compact") {
    return (
      <section className="stat-card border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground inline-flex items-center gap-2">
              Sem cotas parlamentares
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 font-bold uppercase tracking-wider">
                Declarado oficialmente
              </span>
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              A Câmara de Piracanjuba <strong>declarou formalmente</strong> que
              não há regulamentação nem valores de cota/verba indenizatória pra
              vereadores. Vereadores recebem <strong>apenas o subsídio mensal</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span>📅 Vigência: {fmtData(declaracao.data_inicio_vigencia)} →</span>
              <span>✍️ Assinada: {fmtData(declaracao.data_assinatura)}</span>
              <a
                href={declaracao.fonte_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                Fonte oficial <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Variant "full" — pra página /transparencia/cotas-parlamentares
  return (
    <section className="stat-card border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{declaracao.titulo}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Declaração formal da Câmara Municipal de Piracanjuba publicada no
            portal oficial de transparência (sistema Centi/LAI).
          </p>
        </div>
      </div>

      <blockquote className="border-l-4 border-emerald-500 pl-4 py-2 italic text-sm text-foreground/90 leading-relaxed">
        "{declaracao.texto}"
      </blockquote>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="stat-card">
          <p className="text-xs uppercase text-muted-foreground tracking-wider">
            Início vigência
          </p>
          <p className="text-base font-bold text-foreground mt-0.5">
            {fmtData(declaracao.data_inicio_vigencia)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs uppercase text-muted-foreground tracking-wider">
            Data assinatura
          </p>
          <p className="text-base font-bold text-foreground mt-0.5">
            {fmtData(declaracao.data_assinatura)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs uppercase text-muted-foreground tracking-wider">
            Status
          </p>
          <p className="text-base font-bold text-emerald-700 mt-0.5">Vigente</p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-foreground/85 leading-relaxed">
        <p className="font-semibold inline-flex items-center gap-1 mb-1">
          <Info className="w-3.5 h-3.5 text-blue-600" />O que isso significa
        </p>
        <p>
          Câmaras municipais como a de Goiânia, Brasília ou São Paulo possuem
          sistemas de <strong>cota parlamentar</strong> (verba indenizatória)
          que reembolsa vereadores por despesas com combustível, divulgação,
          alimentação ou telefonia. Em Piracanjuba, esse instrumento{" "}
          <strong>não existe</strong> — vereadores são remunerados exclusivamente
          pelo subsídio mensal estabelecido em lei municipal.
        </p>
        <p className="mt-2">
          Eventuais despesas administrativas (diárias, viagens a Brasília,
          materiais de escritório) são contabilizadas como{" "}
          <strong>gastos da própria Câmara</strong>, não como cota individual de
          cada vereador.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border text-sm text-muted-foreground">
        <span>
          Fonte: portal de transparência da Câmara (LAI / sistema Centi)
        </span>
        <a
          href={declaracao.fonte_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Ver declaração no portal oficial <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </section>
  );
}
