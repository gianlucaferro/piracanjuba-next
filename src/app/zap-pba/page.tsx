import { pageMetadata } from "@/lib/seo";
import { fetchZapEstabelecimentos } from "@/lib/data/listings";
import { SLUGS_EMPRESAS } from "@/data/empresas-slugs";
import { previas } from "@/data/previas-zap";
import vinculos from "@/data/zap-pba-paginas.json";
import ZapPbaClient from "./ZapPbaClient";

export const metadata = pageMetadata({
  title: "Zap PBA | WhatsApp de empresas e serviços em Piracanjuba",
  description:
    "Encontre empresas e prestadores de serviço de Piracanjuba, GO. Busque por nome ou categoria, conheça a atividade de cada negócio e fale pelo WhatsApp.",
  path: "/zap-pba",
});

export const revalidate = 600;

const paginasAtivas = new Set([
  ...previas.map(({ slug }) => `/zap-pba/${slug}`),
  ...SLUGS_EMPRESAS.map((slug) => `/${slug}`),
]);
// Um negócio pode ter dois cadastros aprovados com nomes diferentes.
const paginaPorCadastro = new Map(Object.entries(vinculos).filter(([, pagina]) => paginasAtivas.has(pagina)));

export default async function ZapPbaPage() {
  const estabelecimentos = await fetchZapEstabelecimentos();

  return <ZapPbaClient initialEstabelecimentos={estabelecimentos.map((item) => ({
    ...item,
    pagina: paginaPorCadastro.get(item.id),
  }))} />;
}
