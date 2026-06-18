"use client";

// Assistente flutuante do Piracanjuba.ai.
// Chama a edge function `chatbot` (streaming SSE), que responde com base SOMENTE
// nos dados públicos do banco. Histórico em memória (não persiste, privacidade).

import { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, X, ArrowUp, Loader2, AlertTriangle } from "lucide-react";

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SUGESTOES = [
  "Quantos vereadores tem a Câmara?",
  "Qual o salário da prefeita?",
  "Quais os maiores contratos da Prefeitura?",
  "Como falo com um vereador?",
];

// Render markdown-leve (negrito, listas, parágrafos) sem dependência externa
// nem dangerouslySetInnerHTML.
function inlineBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
  );
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let bucket: string[] = [];
  const flush = (key: string) => {
    if (bucket.length) {
      out.push(
        <ul key={key} className="list-disc pl-4 space-y-0.5 my-1">
          {bucket.map((li, i) => <li key={i}>{inlineBold(li)}</li>)}
        </ul>,
      );
      bucket = [];
    }
  };
  lines.forEach((ln, i) => {
    const t = ln.trim();
    if (/^[-*]\s+/.test(t)) {
      bucket.push(t.replace(/^[-*]\s+/, ""));
    } else if (/^#{1,6}\s/.test(t)) {
      flush(`f${i}`);
      out.push(<p key={i} className="font-semibold mt-2">{inlineBold(t.replace(/^#+\s/, ""))}</p>);
    } else {
      flush(`f${i}`);
      if (t) out.push(<p key={i} className="my-1">{inlineBold(t)}</p>);
    }
  });
  flush("fend");
  return <>{out}</>;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [kbInset, setKbInset] = useState(0); // altura coberta pelo teclado virtual
  const [vvHeight, setVvHeight] = useState(0); // altura da viewport visível
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  // Detecta mobile (abaixo do breakpoint md).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // VisualViewport: mantém o painel acima do teclado virtual e dentro da área visível.
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setVvHeight(vv.height);
      setKbInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setKbInset(0);
      setVvHeight(0);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      scrollToEnd();
    }
  }, [open, messages, scrollToEnd]);

  // Esc fecha o painel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(
    async (pergunta: string) => {
      const q = pergunta.trim();
      if (!q || streaming) return;
      setError(null);
      setInput("");

      const history = messages.slice(-6);
      const next: Message[] = [...messages, { role: "user", content: q }, { role: "assistant", content: "" }];
      setMessages(next);
      setStreaming(true);

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/chatbot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON ?? "",
            Authorization: `Bearer ${ANON ?? ""}`,
          },
          body: JSON.stringify({ question: q, history }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Não consegui responder agora. Tente de novo em instantes.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let acc = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n");
          buf = parts.pop() || "";
          for (const line of parts) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload);
              const delta: string | undefined = j.choices?.[0]?.delta?.content;
              if (delta) {
                acc += delta;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: acc };
                  return copy;
                });
                scrollToEnd();
              }
            } catch {
              /* fragmento incompleto, ignora */
            }
          }
        }

        if (!acc.trim()) {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: "Não encontrei essa informação no portal." };
            return copy;
          });
        }
      } catch (e) {
        // Remove a bolha vazia do assistente e mostra erro inline.
        setMessages((prev) => prev.slice(0, -1));
        setError(e instanceof Error ? e.message : "Erro de conexão.");
      } finally {
        setStreaming(false);
        scrollToEnd();
      }
    },
    [messages, streaming, scrollToEnd],
  );

  // No mobile, ancora o painel acima do teclado e limita a altura à área visível.
  const mobileStyle: React.CSSProperties | undefined = isMobile
    ? { bottom: kbInset + 8, maxHeight: vvHeight ? vvHeight - 16 : undefined }
    : undefined;

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir assistente do Piracanjuba.ai"
          className="fixed right-4 bottom-20 md:right-6 md:bottom-6 z-[60] flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg shadow-[#25D366]/30 hover:bg-[#1da851] hover:shadow-xl transition-all active:scale-95"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">Pergunte ao portal</span>
        </button>
      )}

      {/* Painel */}
      {open && (
        <div
          role="dialog"
          aria-label="Assistente do Piracanjuba.ai"
          style={mobileStyle}
          className="fixed z-[60] inset-x-2 bottom-2 md:inset-x-auto md:right-6 md:bottom-6 md:w-[390px] max-w-[calc(100vw-1rem)] md:max-w-none flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden overscroll-contain max-h-[85dvh] md:max-h-[600px]"
        >
          {/* Cabeçalho */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#25D366] text-white shrink-0">
            <Sparkles className="w-5 h-5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">Assistente Piracanjuba.ai</p>
              <p className="text-[11px] text-white/80 leading-tight">Pergunte sobre os dados públicos</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="p-1 rounded-md hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3 space-y-3 bg-background">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-xl bg-muted/60 p-3 text-sm text-foreground">
                  Oi! Posso responder sobre vereadores, salários, contratos, obras, leis e mais, tudo a partir dos dados públicos do portal. O que você quer saber?
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:border-[#25D366] hover:text-[#1da851] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    "min-w-0 break-words [overflow-wrap:anywhere] " +
                    (m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[#25D366] px-3 py-2 text-sm text-white"
                      : "max-w-[90%] rounded-2xl rounded-bl-sm bg-muted/70 px-3 py-2 text-sm text-foreground")
                  }
                >
                  {m.role === "assistant" ? (
                    m.content ? (
                      <RichText text={m.content} />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Entrada */}
          <div className="shrink-0 border-t border-border bg-card px-2.5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            <div className="flex items-end gap-2 min-w-0">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Pergunte sobre Piracanjuba..."
                rows={1}
                maxLength={500}
                disabled={streaming}
                enterKeyHint="send"
                autoCapitalize="sentences"
                autoComplete="off"
                className="flex-1 min-w-0 resize-none rounded-xl border border-border bg-background px-3 py-2 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 max-h-28"
              />
              <button
                onClick={() => send(input)}
                disabled={streaming || !input.trim()}
                aria-label="Enviar pergunta"
                className="shrink-0 rounded-xl bg-[#25D366] p-2.5 text-white hover:bg-[#1da851] disabled:opacity-40 disabled:hover:bg-[#25D366] transition-colors"
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
              Respostas geradas por IA a partir de dados públicos. Podem conter erros, confira na fonte oficial.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
