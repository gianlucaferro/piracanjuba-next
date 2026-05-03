import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Piracanjuba.ai — Transparência municipal de Piracanjuba GO com IA",
  description:
    "Portal de transparência municipal de Piracanjuba, Goiás com IA. Câmara, prefeitura, vereadores, contratos, classificados e mais.",
  path: "/",
});

export default function HomePage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-4">
        Piracanjuba<span className="text-[#25D366]">.ai</span>
      </h1>
      <p className="text-lg text-muted-foreground">
        Portal de transparência municipal de Piracanjuba, Goiás. Migração para Next.js em andamento.
      </p>
    </div>
  );
}
