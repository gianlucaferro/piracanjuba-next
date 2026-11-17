import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import EtapasCadastro from "../EtapasCadastro";
import CodigoDoPedido, { BotaoContatoPedido } from "./CodigoDoPedido";

// Volta do link de pagamento do Stripe (cartão). Qualquer pessoa pode abrir este
// endereço, então o texto não afirma que houve pagamento: a confirmação vale
// quando a equipe confere no Stripe.
export const metadata = pageMetadata({
  title: "Pedido recebido",
  description: "Recebemos o seu pedido da página de empresa no Piracanjuba.ai.",
  path: "/anuncie/cadastro/obrigado",
  noIndex: true,
});

export default function ObrigadoPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-6 py-8 md:py-12">
      <EtapasCadastro atual="confirmacao" />
      <section aria-labelledby="obrigado-titulo" className="stat-card space-y-4">
        <h1 id="obrigado-titulo" className="flex items-center gap-2 text-2xl font-extrabold text-foreground md:text-3xl">
          <CheckCircle2 className="h-7 w-7 shrink-0 text-green-700 dark:text-green-400" aria-hidden="true" />
          Obrigado pelo pedido
        </h1>
        <CodigoDoPedido />
        <p className="text-foreground">
          Quando o pagamento com cartão é concluído, o Stripe mostra a confirmação na tela. A equipe do
          Piracanjuba.ai confere o pagamento e chama você no WhatsApp para pegar o logo e as fotos e montar a página.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <BotaoContatoPedido />
          <Link href="/anuncie" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Voltar para a página de anúncio
          </Link>
        </div>
      </section>
    </div>
  );
}
