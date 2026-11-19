import "server-only";
import { buscaNoServidorDesligada } from "@/lib/ssr-hidratacao";
import { unstable_cache } from "next/cache";
import { dehydrate, QueryClient, type DehydratedState } from "@tanstack/react-query";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import {
  consultarDespesasMensaisRecentes,
  consultarExecutivo,
  consultarLoteContratos,
  consultarLoteDespesas,
  consultarRemuneracaoExecutivo,
  consultarResumoFolhaPrefeitura,
  consultarSecretarias,
  consultarServidoresPagina,
  contarContratos,
} from "@/lib/prefeitura-consultas";
import { LOTE_CONTRATOS, LOTE_DESPESAS, MARCA_LOTE_INICIAL } from "@/lib/prefeitura-lote";
import type {
  ContratoDoLote,
  DespesaMensalResumo,
  PessoaExecutivo,
  SecretariaResumo,
  SubsidioExecutivo,
} from "@/lib/prefeitura-respostas";
import type { ResumoFolhaPrefeitura } from "@/lib/prefeitura-folha";

// Primeiro lote de dados das abas da Prefeitura, buscado no servidor e entregue ao react-query
// pelas MESMAS chaves que o PrefeituraClient usa. As páginas continuam force-dynamic (o cliente
// lê useSearchParams; prerenderizar mandaria a página inteira para o navegador), então cada
// leitura passa por unstable_cache com revalidação de 1 hora, como src/lib/data/prefeitura.ts.
// Supabase fora do ar ou sem variáveis: a leitura vira null e a aba carrega pelo navegador.

const REVALIDAR = 3600;
const opcoes = { revalidate: REVALIDAR, tags: ["prefeitura"] };

type Leitura<T> = T & { lidoEm: number };

export type DadosChefia = { executivo: PessoaExecutivo[]; subsidios: SubsidioExecutivo[] };
export type DadosContratos = { lote: (ContratoDoLote & Record<string, unknown>)[]; total: number | null };
export type DadosDespesas = { lote: Record<string, unknown>[]; mensais: DespesaMensalResumo[] };

const lerChefia = unstable_cache(async (): Promise<Leitura<DadosChefia>> => {
  const sb = createPublicSupabaseClient();
  const executivo = await consultarExecutivo<PessoaExecutivo>(sb);
  const subsidios = await consultarRemuneracaoExecutivo(sb, executivo);
  return { executivo, subsidios, lidoEm: Date.now() };
}, ["prefeitura-ssr-chefia-v1"], opcoes);

const lerResumoFolha = unstable_cache(async (): Promise<Leitura<{ resumo: ResumoFolhaPrefeitura | null }>> => {
  const resumo = await consultarResumoFolhaPrefeitura(createPublicSupabaseClient());
  return { resumo, lidoEm: Date.now() };
}, ["prefeitura-ssr-resumo-folha-v1"], opcoes);

const lerServidores = unstable_cache(async (): Promise<Leitura<{ pagina: { data: Record<string, unknown>[]; count: number } }>> => {
  const pagina = await consultarServidoresPagina(createPublicSupabaseClient(), 0);
  return { pagina, lidoEm: Date.now() };
}, ["prefeitura-ssr-servidores-v1"], opcoes);

const lerSecretarias = unstable_cache(async (): Promise<Leitura<{ secretarias: (SecretariaResumo & Record<string, unknown>)[] }>> => {
  const secretarias = await consultarSecretarias<SecretariaResumo & Record<string, unknown>>(createPublicSupabaseClient());
  return { secretarias, lidoEm: Date.now() };
}, ["prefeitura-ssr-secretarias-v1"], opcoes);

const lerContratos = unstable_cache(async (): Promise<Leitura<DadosContratos>> => {
  const sb = createPublicSupabaseClient();
  const [lote, total] = await Promise.all([
    consultarLoteContratos<ContratoDoLote & Record<string, unknown>>(sb, LOTE_CONTRATOS),
    contarContratos(sb),
  ]);
  return { lote, total, lidoEm: Date.now() };
}, ["prefeitura-ssr-contratos-v1"], opcoes);

const lerDespesas = unstable_cache(async (): Promise<Leitura<DadosDespesas>> => {
  const sb = createPublicSupabaseClient();
  const [lote, mensais] = await Promise.all([
    consultarLoteDespesas(sb, LOTE_DESPESAS),
    consultarDespesasMensaisRecentes(sb),
  ]);
  return { lote, mensais, lidoEm: Date.now() };
}, ["prefeitura-ssr-despesas-v2"], opcoes);

async function seguro<T>(nome: string, ler: () => Promise<T>): Promise<T | null> {
  try {
    return await ler();
  } catch (erro) {
    console.error(`[prefeitura-ssr] leitura "${nome}" falhou; a aba carrega pelo navegador.`, erro);
    return null;
  }
}

export type CargaPrefeitura = {
  estado: DehydratedState;
  chefia: DadosChefia | null;
  resumoFolha: ResumoFolhaPrefeitura | null;
  contratos: DadosContratos | null;
  despesas: DadosDespesas | null;
  secretarias: SecretariaResumo[] | null;
};

/**
 * Dados do servidor para a aba aberta pelo endereço. "visao-geral" é /prefeitura. Abas sem
 * leitura aqui (decretos, leis, obras...) seguem carregando só pelo navegador.
 */
export async function carregarAbaPrefeitura(aba: string): Promise<CargaPrefeitura> {
  const cliente = new QueryClient();
  const carga: Omit<CargaPrefeitura, "estado"> = { chefia: null, resumoFolha: null, contratos: null, despesas: null, secretarias: null };
  // Testes de navegador com o Supabase simulado no navegador: nada vem do servidor (ver ssr-hidratacao.ts).
  if (buscaNoServidorDesligada()) return { estado: dehydrate(cliente), ...carga };

  const querChefia = aba === "visao-geral" || aba === "chefia";
  const querFolha = aba === "visao-geral" || aba === "servidores";

  const [chefia, folha, servidores, secretarias, contratos, despesas] = await Promise.all([
    querChefia ? seguro("chefia", lerChefia) : null,
    querFolha ? seguro("resumo da folha", lerResumoFolha) : null,
    aba === "servidores" ? seguro("servidores", lerServidores) : null,
    aba === "secretarias" ? seguro("secretarias", lerSecretarias) : null,
    aba === "contratos" ? seguro("contratos", lerContratos) : null,
    aba === "despesas" ? seguro("despesas", lerDespesas) : null,
  ]);

  // Dados completos: o carimbo é a hora da leitura, então o react-query só busca de novo
  // quando a leitura em cache já passou do staleTime da aba.
  if (chefia) {
    cliente.setQueryData(["executivo"], chefia.executivo, { updatedAt: chefia.lidoEm });
    cliente.setQueryData(["executivo-remuneracao"], chefia.subsidios, { updatedAt: chefia.lidoEm });
    carga.chefia = { executivo: chefia.executivo, subsidios: chefia.subsidios };
  }
  if (folha) {
    cliente.setQueryData(["prefeitura-resumo-folha"], folha.resumo, { updatedAt: folha.lidoEm });
    carga.resumoFolha = folha.resumo;
  }
  if (servidores) {
    // Mesma chave da aba sem busca digitada, na primeira página.
    cliente.setQueryData(["servidores", "", 0], servidores.pagina, { updatedAt: servidores.lidoEm });
  }
  if (secretarias) {
    cliente.setQueryData(["secretarias"], secretarias.secretarias, { updatedAt: secretarias.lidoEm });
    carga.secretarias = secretarias.secretarias;
  }
  // Lotes parciais: carimbo antigo, para o navegador buscar a lista completa ao montar a aba.
  if (contratos?.lote.length) {
    cliente.setQueryData(["contratos"], contratos.lote, { updatedAt: MARCA_LOTE_INICIAL });
    carga.contratos = { lote: contratos.lote, total: contratos.total };
  }
  if (despesas) {
    if (despesas.lote.length) cliente.setQueryData(["despesas"], despesas.lote, { updatedAt: MARCA_LOTE_INICIAL });
    carga.despesas = { lote: despesas.lote, mensais: despesas.mensais };
  }

  return { estado: dehydrate(cliente), ...carga };
}
