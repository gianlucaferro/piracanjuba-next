import Link from "next/link";
import type { Metadata } from "next";

// 404 de todo o site: endereços que não casam com nenhuma rota e notFound() das páginas.
// Robots próprio (noindex, follow) substitui o index, follow herdado do layout, e o layout não
// tem mais canonical, então a página não aponta para a home (auditoria SEO, IDX-11).
// Ver node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md.
export const metadata: Metadata = {
  title: "Página não encontrada",
  description: "O endereço procurado não existe no Piracanjuba.ai.",
  robots: { index: false, follow: true },
};

const ATALHOS = [
  { href: "/", label: "Início" },
  { href: "/prefeitura", label: "Prefeitura" },
  { href: "/camara", label: "Câmara Municipal" },
  { href: "/vereadores", label: "Vereadores" },
  { href: "/clima", label: "Clima" },
  { href: "/compra-e-venda", label: "Compra e venda" },
];

export default function NotFound() {
  return (
    <div className="container py-12 max-w-3xl">
      <p className="text-sm font-semibold text-muted-foreground mb-2">Erro 404</p>
      <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 leading-tight">
        Página não encontrada
      </h1>
      <p className="text-sm md:text-base text-muted-foreground mb-8">
        O endereço pode ter sido digitado errado ou a página saiu do ar. Estes atalhos levam às
        seções principais do portal:
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ATALHOS.map((atalho) => (
          <li key={atalho.href}>
            <Link
              href={atalho.href}
              className="block rounded-xl border border-border px-4 py-3 font-semibold text-foreground hover:bg-muted"
            >
              {atalho.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
