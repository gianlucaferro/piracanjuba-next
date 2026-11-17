import Link from "next/link";
import { LINK_STRIPE_PAGINA_EMPRESA, PRECO_PAGINA_EMPRESA_TEXTO } from "@/data/paginaEmpresa";
import { pageMetadata } from "@/lib/seo";
import CadastroEmpresa from "./CadastroEmpresa";

// Checkout da página de empresa, no modelo de pay.goias.cc/c/goias-cc/cadastro-empresa
// (pedido do operador em 2026-11-17): dados, pagamento por PIX (CNPJ da Ferro Labs)
// ou cartão em uma vez pelo Stripe, e confirmação. Fora do índice de busca.
export const metadata = pageMetadata({
  title: "Cadastro da página de empresa",
  description: `Cadastre sua empresa e pague ${PRECO_PAGINA_EMPRESA_TEXTO} por ${LINK_STRIPE_PAGINA_EMPRESA ? "PIX ou cartão" : "PIX"} para ter uma página própria no Piracanjuba.ai.`,
  path: "/anuncie/cadastro",
  noIndex: true,
});

export default function CadastroPage() {
  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-8 md:py-12">
      <nav aria-label="Trilha de navegação" className="text-sm text-foreground/75">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/anuncie" className="hover:text-primary hover:underline">
              Anuncie
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-foreground">
            Cadastro de empresa
          </li>
        </ol>
      </nav>
      <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">Cadastro da página de empresa</h1>
      <CadastroEmpresa />
    </div>
  );
}
