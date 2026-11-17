import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clientIpHash } from "../_shared/ratelimit.ts";
import { criarHandlerPedido, emailDoPedido, type ResultadoReserva } from "../_shared/pedido-pagina-empresa.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ORIGENS = ["https://piracanjuba.ai", "https://www.piracanjuba.ai", "http://localhost:3000"];
const RESULTADOS: ResultadoReserva[] = ["ok", "limite_ip", "limite_dia"];

Deno.serve(
  criarHandlerPedido(
    {
      ipHash: clientIpHash,
      async reservarEInserir(registro, limites) {
        // Limites e gravação numa só transação com trava (migração 20261117120000).
        const { data, error } = await supabase.rpc("criar_pedido_pagina_empresa", {
          p_pedido: registro,
          p_limite_ip_hora: limites.porIpHora,
          p_limite_dia: limites.totalDia,
        });
        if (error) {
          // Só código e mensagem do banco; o registro tem dados pessoais e não vai ao log.
          console.error(`pedido-pagina-empresa: banco recusou (${error.code ?? "sem código"}: ${error.message})`);
          throw new Error("reserva indisponível");
        }
        if (!RESULTADOS.includes(data as ResultadoReserva)) throw new Error("resposta inesperada do banco");
        return data as ResultadoReserva;
      },
      async avisar(registro) {
        const chave = Deno.env.get("RESEND_API_KEY");
        const destino = Deno.env.get("ADMIN_EMAIL");
        if (!chave || !destino) throw new Error("e-mail sem configuração");
        const { assunto, html, texto } = emailDoPedido(registro);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
          body: JSON.stringify({
            from: Deno.env.get("EMAIL_FROM") ?? "Piracanjuba.AI <contato@piracanjuba.ai>",
            to: [destino],
            reply_to: registro.comprador_email,
            subject: assunto,
            html,
            text: texto,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`resend ${res.status}`);
      },
      aleatorio: () => crypto.getRandomValues(new Uint8Array(6)),
      agora: () => new Date(),
    },
    ORIGENS,
  ),
);
