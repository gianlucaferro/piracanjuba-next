import { pageMetadata } from "@/lib/seo";
import PageInConstruction from "@/components/PageInConstruction";

export const metadata = pageMetadata({
  title: "Zap PBA — WhatsApp dos Comércios de Piracanjuba",
  description: "Lista de WhatsApps de estabelecimentos comerciais de Piracanjuba, GO.",
  path: "/zap-pba",
  
});

export const revalidate = 3600;

export default function Page() {
  return (
    <PageInConstruction
      title="Zap PBA — WhatsApp dos Comércios de Piracanjuba"
      description="Lista de WhatsApps de estabelecimentos comerciais de Piracanjuba, GO."
    />
  );
}
