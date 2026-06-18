"use client";

// Moderação das fotos da história enviadas pelos moradores.
// Lê via edge function historia-fotos (signed URLs), filtra por status,
// aprova/rejeita/baixa/exclui. Gated pelo admin_token (já dentro da função).

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Trash2, Download, ImageOff, RotateCcw } from "lucide-react";

const supabase = createBrowserSupabaseClient();
const SESSION_KEY = "pba_admin_token";

type Status = "pendente" | "aprovada" | "rejeitada";
type Foto = {
  id: string;
  url: string | null;
  original_name: string | null;
  descricao: string | null;
  autor_nome: string | null;
  status: Status;
  created_at: string;
};
type Filtro = Status | "todas";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const statusLabel: Record<Filtro, string> = {
  pendente: "Pendentes",
  aprovada: "Aprovadas",
  rejeitada: "Rejeitadas",
  todas: "Todas",
};

export default function HistoriaFotosAdmin() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("pendente");
  const [busy, setBusy] = useState<string | null>(null);

  const token = () => localStorage.getItem(SESSION_KEY) ?? "";

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("historia-fotos", { body: { action: "list", admin_token: token() } });
      if (error || data?.error) throw new Error(data?.error || "Erro ao carregar.");
      setFotos((data?.fotos as Foto[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function acao(id: string, action: "set_status" | "delete", status?: Status) {
    setBusy(id);
    try {
      const { data, error } = await supabase.functions.invoke("historia-fotos", { body: { action, id, status, admin_token: token() } });
      if (error || data?.error) throw new Error(data?.error || "Erro.");
      if (action === "delete") setFotos((prev) => prev.filter((f) => f.id !== id));
      else if (status) setFotos((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
      toast.success("Pronto.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(null);
    }
  }

  const visiveis = filtro === "todas" ? fotos : fotos.filter((f) => f.status === filtro);
  const cont = (s: Filtro) => (s === "todas" ? fotos.length : fotos.filter((f) => f.status === s).length);

  if (loading) return <div className="animate-pulse h-40 rounded-xl bg-muted" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {(["pendente", "aprovada", "rejeitada", "todas"] as Filtro[]).map((s) => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              filtro === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {statusLabel[s]} ({cont(s)})
          </button>
        ))}
        <button onClick={() => carregar()} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RotateCcw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {visiveis.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma foto nesta categoria.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visiveis.map((f) => (
          <div key={f.id} className="stat-card space-y-2">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {f.url ? (
                <img src={f.url} alt={f.descricao || "Foto da história"} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <ImageOff className="w-6 h-6 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={f.status === "aprovada" ? "bg-emerald-600 text-white" : f.status === "rejeitada" ? "bg-red-600 text-white" : "bg-amber-500 text-white"}>
                {f.status}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{fmt(f.created_at)}</span>
            </div>
            {f.descricao && <p className="text-xs text-foreground/90">{f.descricao}</p>}
            {f.autor_nome && <p className="text-[10px] text-muted-foreground">Enviado por: {f.autor_nome}</p>}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {f.status !== "aprovada" && (
                <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy === f.id} onClick={() => acao(f.id, "set_status", "aprovada")}>
                  <Check className="w-3.5 h-3.5 mr-1" /> Aprovar
                </Button>
              )}
              {f.status !== "rejeitada" && (
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy === f.id} onClick={() => acao(f.id, "set_status", "rejeitada")}>
                  <X className="w-3.5 h-3.5 mr-1" /> Rejeitar
                </Button>
              )}
              {f.url && (
                <a href={f.url} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-7 px-2 text-xs rounded-md border border-border hover:bg-secondary">
                  <Download className="w-3.5 h-3.5 mr-1" /> Baixar
                </a>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive ml-auto" disabled={busy === f.id} onClick={() => acao(f.id, "delete")}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
