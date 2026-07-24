import { ExternalLink } from "lucide-react";
import type { FunprepiCoberturaStatus } from "@/lib/funprepi";

export const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export const CATEGORIAS: Record<string, { label: string; cor: string }> = {
  aposentadorias: { label: "Aposentadorias", cor: "#2563eb" },
  pensoes: { label: "Pensões", cor: "#7c3aed" },
  tarifas: { label: "Tarifas bancárias", cor: "#f59e0b" },
  fornecedores_externos: { label: "Fornecedores externos", cor: "#e11d48" },
  fornecedor_externo: { label: "Fornecedores externos", cor: "#e11d48" },
  outros: { label: "Outros lançamentos", cor: "#64748b" },
};

export const COBERTURA: Record<
  FunprepiCoberturaStatus,
  { label: string; classe: string; descricao: string }
> = {
  reconciliado: {
    label: "Reconciliado",
    classe: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    descricao: "Quantidade e valor pago conferem entre as duas fontes.",
  },
  parcial: {
    label: "Carga parcial",
    classe: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    descricao: "O portal novo ainda tem menos registros do que a referência histórica.",
  },
  divergente: {
    label: "Divergente",
    classe: "border-red-500/30 bg-red-500/10 text-red-700",
    descricao: "As fontes têm a mesma cobertura aparente, mas os totais não conferem.",
  },
  ausente: {
    label: "Ausente",
    classe: "border-slate-500/30 bg-slate-500/10 text-slate-600",
    descricao: "O exercício ainda não foi carregado na base nova.",
  },
  sem_referencia: {
    label: "Sem referência",
    classe: "border-blue-500/30 bg-blue-500/10 text-blue-700",
    descricao: "Há dados novos, mas ainda não existe fotografia histórica para comparar.",
  },
};

export function moeda(valor: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

export function moedaCompacta(valor: number | null | undefined) {
  const numero = Number(valor) || 0;
  if (Math.abs(numero) >= 1_000_000_000) {
    return `R$ ${(numero / 1_000_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} bi`;
  }
  if (Math.abs(numero) >= 1_000_000) {
    return `R$ ${(numero / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mi`;
  }
  if (Math.abs(numero) >= 1_000) {
    return `R$ ${(numero / 1_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    })} mil`;
  }
  return moeda(numero);
}

export function dataBr(data: string | null | undefined) {
  if (!data) return "não informada";
  return new Date(`${data.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

export function documentoBr(documento: string | null) {
  if (!documento) return "Documento não informado";
  const digitos = documento.replace(/\D/g, "");
  if (digitos.length === 14) {
    return digitos.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }
  return "Documento não informado";
}

export function tituloCategoria(categoria: string) {
  return CATEGORIAS[categoria]?.label ?? categoria;
}

export function Kpi({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  destaque,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  icon: React.ElementType;
  destaque?: "blue" | "amber" | "emerald" | "slate";
}) {
  const cores = {
    blue: "bg-blue-500/10 text-blue-700",
    amber: "bg-amber-500/10 text-amber-700",
    emerald: "bg-emerald-500/10 text-emerald-700",
    slate: "bg-slate-500/10 text-slate-700",
  };
  return (
    <article className="stat-card min-w-0">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${
          cores[destaque ?? "blue"]
        }`}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <p className="mt-1 break-words text-xl font-bold text-foreground">{valor}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detalhe}</p>
    </article>
  );
}

export function GraficoVazio({ texto }: { texto: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border">
      <p className="max-w-sm px-6 text-center text-sm text-muted-foreground">
        {texto}
      </p>
    </div>
  );
}

export function FonteLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
    </a>
  );
}
