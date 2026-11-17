"use client";

import { useEffect, useState } from "react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_COMERCIAL } from "@/data/paginaEmpresa";
import { codigoValido } from "@/lib/pedidoPaginaEmpresa";
import { linkWhatsapp } from "@/lib/whatsapp";

/** Código guardado nesta aba pelo cadastro (sessionStorage), se houver. */
function useCodigoSalvo(): string | null {
  const [codigo, setCodigo] = useState<string | null>(null);
  useEffect(() => {
    let salvo: unknown = null;
    try {
      salvo = JSON.parse(window.sessionStorage.getItem("pba:cadastro-empresa:pedido") ?? "null")?.codigo;
    } catch {
      salvo = null;
    }
    if (codigoValido(salvo)) queueMicrotask(() => setCodigo(salvo));
  }, []);
  return codigo;
}

export default function CodigoDoPedido() {
  const codigo = useCodigoSalvo();
  if (!codigo) return null;
  return (
    <p className="text-foreground">
      Código do pedido: <strong className="font-mono tracking-wide">{codigo}</strong>
    </p>
  );
}

/** WhatsApp com o código do pedido na mensagem (só o código, nenhum dado pessoal). */
export function BotaoContatoPedido() {
  const codigo = useCodigoSalvo();
  const mensagem = codigo
    ? `Olá! Fiz o pedido ${codigo} da página de empresa no Piracanjuba.ai pelo cartão.`
    : "Olá! Fiz um pedido da página de empresa no Piracanjuba.ai pelo cartão.";
  return (
    <a
      href={linkWhatsapp(WHATSAPP_COMERCIAL, mensagem)}
      target="_blank"
      rel="noopener"
      className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#15803d] px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#166534]"
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0" fill="currentColor" />
      Falar no WhatsApp
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}
