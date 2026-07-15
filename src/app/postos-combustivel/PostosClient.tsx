"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPostos, type Posto, type PostoProduto } from "@/data/postosApi";
import { Fuel, MapPin, ExternalLink, ShieldAlert, CircleCheck, Loader2, Gauge } from "lucide-react";

// Cor da nota na escala da ANP (vermelho = risco, verde = conforme).
function notaCor(nota: number): string {
  if (nota >= 5) return "#16a34a"; // verde
  if (nota >= 4) return "#65a30d"; // verde-limão
  if (nota >= 3) return "#d97706"; // âmbar
  if (nota >= 2) return "#ea580c"; // laranja
  if (nota >= 1) return "#dc2626"; // vermelho
  return "#b91c1c"; // vermelho escuro
}

// Medidor circular (0 a 5) com a nota oficial da ANP no centro.
function NotaGauge({ nota }: { nota: number | null }) {
  if (nota == null) {
    return (
      <div className="flex flex-col items-center shrink-0 w-12" title="Nota ainda não disponível">
        <div className="w-11 h-11 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
          <Gauge className="w-4 h-4 text-muted-foreground/50" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">s/ nota</span>
      </div>
    );
  }
  const cor = notaCor(nota);
  const r = 18;
  const circ = 2 * Math.PI * r;
  return (
    <div
      className="flex flex-col items-center shrink-0 w-12"
      title={`Nota ${nota} de 5 na ANP`}
      aria-label={`Nota ${nota} de 5 na ANP`}
    >
      <div className="relative w-11 h-11">
        <svg viewBox="0 0 44 44" className="w-11 h-11 -rotate-90">
          <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-muted-foreground/15" />
          <circle
            cx="22"
            cy="22"
            r={r}
            fill="none"
            stroke={cor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - nota / 5)}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-base font-bold"
          style={{ color: cor }}
        >
          {nota}
        </span>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Nota ANP</span>
    </div>
  );
}

// Encurta os nomes longos da ANP para rótulos legíveis, sem duplicar.
function rotuloProduto(nome: string | null): string | null {
  if (!nome) return null;
  const n = nome.toUpperCase();
  if (n.includes("GÁS NATURAL") || n.includes("GNV")) return "GNV";
  if (n.includes("DIESEL")) return "Diesel";
  if (n.includes("GASOLINA") && n.includes("ADITIVAD")) return "Gasolina aditivada";
  if (n.includes("GASOLINA")) return "Gasolina";
  if (n.includes("ETANOL")) return "Etanol";
  return nome.charAt(0) + nome.slice(1).toLowerCase();
}

function produtosUnicos(produtos: PostoProduto[]): string[] {
  const set = new Set<string>();
  for (const p of produtos) {
    const r = rotuloProduto(p.produto);
    if (r) set.add(r);
  }
  return Array.from(set);
}

function PostoCard({ posto }: { posto: Posto }) {
  const interditado = !!posto.status_sigaf;
  const pendenciaPmqc = Array.isArray(posto.inadimplencia_pmqc) && posto.inadimplencia_pmqc.length > 0;
  const produtos = produtosUnicos(posto.produtos || []);
  const endereco = [posto.endereco, posto.bairro].filter(Boolean).join(" · ");
  const mapsUrl =
    posto.latitude != null && posto.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${posto.latitude},${posto.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${posto.razao_social}, Piracanjuba GO`
        )}`;

  return (
    <div className="stat-card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
          <Fuel className="w-5 h-5 text-orange-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-snug">{posto.razao_social}</p>
          {endereco && <p className="text-sm text-muted-foreground mt-0.5">{endereco}</p>}
          <span className="inline-block text-xs font-medium mt-1.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {posto.distribuidora || "Bandeira branca"}
          </span>
        </div>
        <NotaGauge nota={posto.nota} />
      </div>

      {produtos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {produtos.map((p) => (
            <span
              key={p}
              className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
            >
              {p}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        {interditado ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
            <ShieldAlert className="w-4 h-4" /> Interditado (Sigaf)
          </span>
        ) : pendenciaPmqc ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <ShieldAlert className="w-4 h-4" /> Pendência de qualidade (PMQC)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CircleCheck className="w-4 h-4" /> Sem interdição registrada
          </span>
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <MapPin className="w-4 h-4" /> Ver no mapa
        </a>
      </div>
    </div>
  );
}

export default function PostosClient() {
  const { data: postos, isLoading, isError } = useQuery({
    queryKey: ["postos-combustivel"],
    queryFn: fetchPostos,
  });

  const atualizado = postos?.[0]?.atualizado_em
    ? new Date(postos[0].atualizado_em).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <header className="text-center space-y-3 pb-1">
        <div className="inline-flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800 rounded-full px-3 py-1 text-sm font-medium text-orange-800 dark:text-orange-300">
          <Fuel className="w-4 h-4" /> Dados oficiais da ANP
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Postos de Combustível em Piracanjuba
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
          Postos revendedores em operação no município, com bandeira, produtos e situação regulatória,
          direto da base da Agência Nacional do Petróleo.
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando postos...
        </div>
      )}

      {isError && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Não foi possível carregar os postos agora. Tente novamente em instantes.
        </p>
      )}

      {postos && postos.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {postos.length} postos cadastrados{atualizado ? ` · atualizado em ${atualizado}` : ""}
          </p>
          <div className="space-y-3">
            {postos.map((p) => (
              <PostoCard key={p.codigo_simp} posto={p} />
            ))}
          </div>
        </>
      )}

      <div className="stat-card bg-muted/40 text-sm text-muted-foreground space-y-2">
        <p>
          A <strong className="text-foreground">Nota ANP</strong> vai de 0 a 5 e resume o histórico de
          fiscalização de cada posto nos últimos 5 anos: qualidade do combustível (PMQC), precisão da bomba e
          preço abusivo. Infrações mais recentes pesam mais.
        </p>
        <p>
          Fonte: aplicativo oficial <strong className="text-foreground">&quot;ANP com Você&quot;</strong> (nota
          e situação) e API de Revendedores da ANP (dados cadastrais). Atualizamos mensalmente.{" "}
          <a
            href="https://anpcomvcpostos.anp.gov.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Ver no app da ANP <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </p>
      </div>
    </div>
  );
}
