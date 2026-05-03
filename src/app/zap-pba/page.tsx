import { ShoppingBag, ArrowRight } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { pageMetadata } from "@/lib/seo";
import { fetchZapEstabelecimentos } from "@/lib/data/listings";

export const metadata = pageMetadata({
  title: "Zap PBA — WhatsApp dos Comércios de Piracanjuba",
  description:
    "Lista de WhatsApps verificados de estabelecimentos comerciais de Piracanjuba, GO, organizados por categoria.",
  path: "/zap-pba",
});

export const revalidate = 600;

export default async function ZapPbaPage() {
  const estabelecimentos = await fetchZapEstabelecimentos();

  // Group by category
  const byCategory = estabelecimentos.reduce<Record<string, typeof estabelecimentos>>(
    (acc, e) => {
      const cat = e.category || "Outros";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(e);
      return acc;
    },
    {}
  );
  const categories = Object.keys(byCategory).sort();

  return (
    <>
      <section className="bg-gradient-to-br from-[#25D366]/15 to-[#25D366]/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#25D366]" />
            Zap <span className="text-[#25D366]">PBA</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            {estabelecimentos.length} comércios e prestadores de serviço de Piracanjuba
            cadastrados com WhatsApp verificado, organizados por categoria.
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-8">
        {estabelecimentos.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            Nenhum estabelecimento cadastrado ainda.
          </p>
        ) : (
          categories.map((cat) => (
            <section key={cat}>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 sticky top-0 bg-background/80 backdrop-blur py-2">
                {cat} ({byCategory[cat].length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {byCategory[cat].map((e) => {
                  const phoneClean = (e.whatsapp || "").replace(/\D/g, "");
                  return (
                    <a
                      key={e.id}
                      href={`https://wa.me/55${phoneClean}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="stat-card card-hover flex items-center gap-3 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
                        <WhatsAppIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.whatsapp}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-[#25D366] transition-colors" />
                    </a>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
