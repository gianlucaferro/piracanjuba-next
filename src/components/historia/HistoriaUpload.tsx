"use client";

// Envio de fotos da história pelos moradores. Converte QUALQUER formato (inclusive
// HEIC do iPhone) para WebP no próprio navegador e manda para a edge function
// historia-fotos, que guarda como pendente para o operador moderar no admin.

import { useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ImagePlus, Loader2, Check, X, Send, Camera } from "lucide-react";

const supabase = createBrowserSupabaseClient();
const MAX_FOTOS = 8;

type Item = { id: string; name: string; previewUrl: string; base64: string };

async function fileToWebp(file: File): Promise<{ base64: string; previewUrl: string }> {
  const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  let source: Blob = file;
  if (isHeic) {
    const mod = await import("heic2any");
    const heic2any = mod.default as (o: { blob: Blob; toType?: string; quality?: number }) => Promise<Blob | Blob[]>;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    source = Array.isArray(out) ? out[0] : out;
  }
  const objUrl = URL.createObjectURL(source);
  let img: HTMLImageElement;
  try {
    img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new window.Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Não consegui ler a imagem."));
      i.src = objUrl;
    });
  } finally {
    URL.revokeObjectURL(objUrl);
  }
  const maxW = 1800;
  const ratio = Math.min(maxW / img.width, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao converter."))), "image/webp", 0.82),
  );
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return { base64: btoa(bin), previewUrl: URL.createObjectURL(blob) };
}

export default function HistoriaUpload() {
  const [items, setItems] = useState<Item[]>([]);
  const [descricao, setDescricao] = useState("");
  const [autor, setAutor] = useState("");
  const [converting, setConverting] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const onSelect = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setErro(null);
      setDone(false);
      setConverting(true);
      const slots = MAX_FOTOS - items.length;
      const lista = Array.from(files).slice(0, Math.max(0, slots));
      for (const file of lista) {
        try {
          const { base64, previewUrl } = await fileToWebp(file);
          setItems((prev) => [...prev, { id: `${file.name}-${prev.length}-${file.size}`, name: file.name, previewUrl, base64 }]);
        } catch {
          setErro(`Não consegui processar "${file.name}". Tente outra foto.`);
        }
      }
      setConverting(false);
    },
    [items.length],
  );

  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function enviar() {
    if (!items.length || sending) return;
    setSending(true);
    setErro(null);
    setProgress(0);
    try {
      let enviados = 0;
      for (const it of items) {
        const { data, error } = await supabase.functions.invoke("historia-fotos", {
          body: {
            action: "upload",
            webpBase64: it.base64,
            originalName: it.name,
            descricao: descricao.trim() || null,
            autorNome: autor.trim() || null,
          },
        });
        if (error || data?.error) throw new Error(data?.error || "Falha no envio.");
        enviados += 1;
        setProgress(enviados);
      }
      setItems([]);
      setDescricao("");
      setAutor("");
      setDone(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-card/60 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Envie fotos da história de Piracanjuba</p>
      </div>

      {done && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Obrigado! Suas fotos foram enviadas e vão passar por uma revisão antes de aparecerem no site.</span>
        </div>
      )}

      {/* Seletor */}
      <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer px-3 py-5 text-center">
        <input
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="hidden"
          disabled={converting || sending || items.length >= MAX_FOTOS}
          onChange={(e) => {
            onSelect(e.target.files);
            e.target.value = "";
          }}
        />
        {converting ? (
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        ) : (
          <ImagePlus className="w-6 h-6 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">
          {converting
            ? "Preparando as fotos..."
            : items.length >= MAX_FOTOS
              ? `Limite de ${MAX_FOTOS} fotos por envio`
              : "Toque para escolher fotos. Aceita qualquer formato, inclusive HEIC (iPhone)."}
        </span>
      </label>

      {/* Pré-visualização */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((it) => (
            <div key={it.id} className="relative aspect-square rounded-lg overflow-hidden border border-border">
              <img src={it.previewUrl} alt={it.name} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(it.id)}
                aria-label="Remover foto"
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Campos opcionais */}
      {items.length > 0 && (
        <div className="space-y-2">
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="O que é essa foto? (opcional: ano, local, quem aparece)"
            rows={2}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            placeholder="Seu nome (opcional)"
            maxLength={120}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {erro && <p className="text-xs text-destructive">{erro}</p>}

      {items.length > 0 && (
        <button
          onClick={enviar}
          disabled={sending}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1da851] disabled:opacity-60 transition-colors"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Enviando {progress} de {items.length}...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Enviar {items.length} foto{items.length > 1 ? "s" : ""}
            </>
          )}
        </button>
      )}

      <p className="text-[10px] text-muted-foreground">
        As fotos passam por revisão antes de irem ao ar. Envie apenas imagens que você pode compartilhar.
      </p>
    </div>
  );
}
