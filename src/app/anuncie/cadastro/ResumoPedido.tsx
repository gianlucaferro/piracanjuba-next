import { CheckCircle2 } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import {
  DESCONTO_PAGINA_EMPRESA_TEXTO,
  PIX_RECEBEDOR,
  PRAZO_PAGINA_EMPRESA_TEXTO,
  PRECO_CHEIO_PAGINA_EMPRESA_TEXTO,
  PRECO_PAGINA_EMPRESA_TEXTO,
  WHATSAPP_COMERCIAL,
} from "@/data/paginaEmpresa";
import { linkWhatsapp } from "@/lib/whatsapp";

const INCLUI = [
  "Endereço próprio: piracanjuba.ai/suaempresa",
  "Logo, foto, serviços e botão de WhatsApp",
  "Versão para celular e preparada para o Google",
  "Textos e montagem pela equipe do portal",
  "No ar enquanto o portal existir",
];

const DEPOIS = [
  "A equipe confere o pagamento e chama você no WhatsApp.",
  "Você envia o logo e as fotos da empresa.",
  `Escrevemos a página, você revisa e ela vai ao ar ${PRAZO_PAGINA_EMPRESA_TEXTO}.`,
];

export default function ResumoPedido() {
  return (
    <aside aria-labelledby="resumo-titulo" className="stat-card space-y-5 md:sticky md:top-24">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-foreground/75">Piracanjuba.ai</p>
        <h2 id="resumo-titulo" className="text-xl font-bold text-foreground">
          Página de empresa
        </h2>
        <p className="text-foreground/75">
          de <span className="sr-only">(valor riscado) </span>
          <span className="line-through">{PRECO_CHEIO_PAGINA_EMPRESA_TEXTO}</span> por
        </p>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-4xl font-extrabold text-foreground">{PRECO_PAGINA_EMPRESA_TEXTO}</span>
          <span className="rounded-full bg-green-600/10 px-3 py-1 text-sm font-bold text-green-800 ring-1 ring-green-600/40 dark:text-green-300">
            Desconto de {DESCONTO_PAGINA_EMPRESA_TEXTO}
          </span>
        </p>
        <p className="font-semibold text-foreground">Pagamento único, sem mensalidade</p>
      </div>

      <ul className="space-y-2 text-sm text-foreground">
        {INCLUI.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">Depois do pagamento</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground/80">
          {DEPOIS.map((passo) => (
            <li key={passo}>{passo}</li>
          ))}
        </ol>
      </div>

      <a
        href={linkWhatsapp(WHATSAPP_COMERCIAL, "Olá! Tenho uma dúvida sobre a página de empresa no Piracanjuba.ai.")}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        <WhatsAppIcon className="h-4 w-4 shrink-0" fill="currentColor" />
        Tirar dúvidas no WhatsApp
        <span className="sr-only"> (abre em nova aba)</span>
      </a>

      <p className="text-xs text-foreground/75">
        Vendido pela {PIX_RECEBEDOR.razaoSocial}, CNPJ {PIX_RECEBEDOR.cnpjFormatado}, que mantém o Piracanjuba.ai.
      </p>
    </aside>
  );
}
