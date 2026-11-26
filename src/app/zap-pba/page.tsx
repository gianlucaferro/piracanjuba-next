import { pageMetadata } from "@/lib/seo";
import { fetchZapEstabelecimentos } from "@/lib/data/listings";
import { SLUGS_PAGINAS_EMPRESARIAIS } from "@/data/empresas-slugs";
import { CLINICA_ESSENCIA } from "@/data/clinica-essencia";
import { HOTEL_VIA_SUL } from "@/data/hotel-via-sul";
import { NARAIENE_MARQUES } from "@/data/naraiene-marques";
import { PACIFICO_SIQUEIRA } from "@/data/pacifico-siqueira";
import { previas } from "@/data/previas-zap";
import vinculos from "@/data/zap-pba-paginas.json";
import ZapPbaClient from "./ZapPbaClient";
import { dataDeReferencia, fichaParaNavegador } from "./lista";

// Com o sufixo " | Piracanjuba.ai" do layout, o título renderizado tem 60 caracteres.
export const metadata = pageMetadata({
  title: "Zap PBA: WhatsApp de empresas em Piracanjuba",
  description:
    "Encontre empresas e prestadores de serviço de Piracanjuba, GO. Busque por nome ou categoria, conheça a atividade de cada negócio e fale pelo WhatsApp.",
  path: "/zap-pba",
});

export const revalidate = 600;

const paginasAtivas = new Set([
  ...previas.map(({ slug }) => `/zap-pba/${slug}`),
  ...SLUGS_PAGINAS_EMPRESARIAIS.map((slug) => `/${slug}`),
]);
// Um negócio pode ter dois cadastros aprovados com nomes diferentes.
const paginaPorCadastro = new Map(Object.entries(vinculos).filter(([, pagina]) => paginasAtivas.has(pagina)));
const fichasEditoriais = [
  { nome: HOTEL_VIA_SUL.nome, telefone: HOTEL_VIA_SUL.whatsapp, path: HOTEL_VIA_SUL.path, categoria: "Hospedagem e Turismo" },
  { nome: NARAIENE_MARQUES.nome, telefone: NARAIENE_MARQUES.telefone, path: NARAIENE_MARQUES.path, categoria: "Advogados" },
  { nome: PACIFICO_SIQUEIRA.nome, telefone: PACIFICO_SIQUEIRA.telefone, path: PACIFICO_SIQUEIRA.path, categoria: "Advogados" },
  { nome: "Essência Estética e Spa | Laurieni Costa", telefone: CLINICA_ESSENCIA.telefoneEsteticaSpa, path: CLINICA_ESSENCIA.path, categoria: "Beleza e Estética" },
];
const paginaPorTelefone = new Map(fichasEditoriais.map((item) => [item.telefone.slice(-11), item.path]));

export default async function ZapPbaPage() {
  const estabelecimentos = await fetchZapEstabelecimentos();
  const agora = new Date();
  const dataReferencia = dataDeReferencia(agora);

  const fichas = estabelecimentos.map((item) => fichaParaNavegador({
    ...item,
    pagina: paginaPorTelefone.get(item.whatsapp.replace(/\D/g, "").slice(-11)) ?? paginaPorCadastro.get(item.id),
  }, agora.getTime()));
  for (const item of fichasEditoriais) {
    if (fichas.some((ficha) => ficha.pagina === item.path)) continue;
    fichas.push(fichaParaNavegador({
      id: item.path,
      editorial: true,
      name: item.nome,
      whatsapp: item.telefone,
      category: item.categoria,
      click_count: null,
      created_at: null,
      pagina: item.path,
    }, agora.getTime()));
  }
  const listaCarregada = estabelecimentos.length > 0;
  return <ZapPbaClient initialEstabelecimentos={fichas} dataReferencia={dataReferencia} listaCarregada={listaCarregada} />;
}
