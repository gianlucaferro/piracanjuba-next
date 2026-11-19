import { pageMetadata } from "@/lib/seo";
import { fetchZapEstabelecimentos } from "@/lib/data/listings";
import { SLUGS_EMPRESAS } from "@/data/empresas-slugs";
import { PACIFICO_SIQUEIRA } from "@/data/pacifico-siqueira";
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

  const escritorio = PACIFICO_SIQUEIRA;
  const digitos = escritorio.telefone.slice(-11);
  const fichas = estabelecimentos.map((item) => ({
    ...item,
    pagina: item.whatsapp.replace(/\D/g, "").slice(-11) === digitos
      ? escritorio.path
      : paginaPorCadastro.get(item.id),
  }));
  if (fichas.some((item) => item.pagina === escritorio.path)) {
    return <ZapPbaClient initialEstabelecimentos={fichas} />;
  }
  return <ZapPbaClient initialEstabelecimentos={[...fichas, {
    id: escritorio.path,
    editorial: true,
    name: escritorio.nome,
    whatsapp: escritorio.telefone,
    category: "Advogados",
    click_count: null,
    created_at: null,
    pagina: escritorio.path,
  }]} />;
}
