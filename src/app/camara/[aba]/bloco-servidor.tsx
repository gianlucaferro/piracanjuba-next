import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import AlertaContratosSancao from "@/components/transparencia/AlertaContratosSancao";
import {
  BlocoAtuacaoCamara,
  BlocoContratosCamara,
  BlocoDespesasCamara,
  BlocoIndicacoesCamara,
  BlocoLicitacoesCamara,
  BlocoProjetosCamara,
  BlocoServidoresCamara,
} from "@/components/camara/BlocosServidorCamara";
import {
  CHAVE_CONTRATOS_CAMARA,
  CHAVE_RESUMO_FOLHA_CAMARA,
  PAGINA_SERVIDORES_CAMARA,
  chaveServidoresCamara,
} from "@/components/camara/chaves-consulta";
import {
  faqContratos,
  faqDespesas,
  faqLicitacoes,
  faqServidores,
  pagamentosConfiaveis,
  paragrafoAtuacao,
  paragrafoContratos,
  paragrafoDespesas,
  paragrafoIndicacoes,
  paragrafoLicitacoes,
  paragrafoProjetos,
  paragrafoServidores,
  type CadastroPessoalCamara,
  type OrcamentoCamaraAno,
  type ResumoFolhaParaTexto,
} from "@/components/camara/resposta-aba";
import {
  fetchCamaraContratosServidor,
  fetchIndicacoesResumoServidor,
  fetchOrcamentoCamaraServidor,
  fetchPagamentosCamaraAnos,
  fetchResumoFolhaCamaraServidor,
  fetchServidoresCamaraPrimeiroLote,
} from "@/lib/data/camara-abas";
import { fetchContratosCamara, fetchContratosStats } from "@/lib/data/contratos-camara";
import { fetchLicitacoesRecentes, fetchLicitacoesStats } from "@/lib/data/licitacoes-camara";
import { fetchFolhaStats, fetchFolhaUltimaCompetencia } from "@/lib/data/folha-camara";
import { fetchIndicacoesRecentes } from "@/lib/data/indicacoes-camara";
import { fetchAtividadesLegislativas, fetchAtividadesStats } from "@/lib/data/atividades-legislativas";
import { fetchAtosPorTipo, fetchAtosStats } from "@/lib/data/atos-camara";

// Leitura no servidor de cada aba da Câmara: monta a parte renderizada no servidor (parágrafo-
// resposta, resumo, primeiro lote, perguntas frequentes) e, nas abas de contratos e servidores,
// põe no react-query o mesmo dado que o cliente buscaria, com a mesma chave.
//
// Falha do Supabase (ou variável ausente) nunca derruba a página: a leitura que falha devolve
// undefined, a parte dela some e a aba carrega pelo cliente, como antes. Lista vazia vinda do
// servidor também não é hidratada, para o HTML não afirmar "0 contratos" sem o cliente conferir.

async function tentar<T>(rotulo: string, ler: () => Promise<T>): Promise<T | undefined> {
  try {
    return await ler();
  } catch (erro) {
    console.error(`[camara/${rotulo}] leitura no servidor falhou; a aba carrega pelo cliente`, erro);
    return undefined;
  }
}

function anoEmSaoPaulo(): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(new Date()));
}

async function blocoContratos(queryClient: QueryClient): Promise<ReactNode> {
  const [contratos, stats, maisRecente] = await Promise.all([
    tentar("contratos", () => fetchCamaraContratosServidor()),
    tentar("contratos-resumo", () => fetchContratosStats()),
    tentar("contratos-recente", () => fetchContratosCamara(1)),
  ]);
  if (contratos?.length) queryClient.setQueryData(CHAVE_CONTRATOS_CAMARA, contratos);
  if (!stats?.total) return null;

  const anos = stats.por_ano.map((a) => a.ano);
  const maior = stats.top_fornecedores[0];
  const resumo = {
    total: stats.total,
    totalValor: stats.total_valor,
    emVigor: stats.em_vigor,
    anoMin: anos.length ? Math.min(...anos) : null,
    anoMax: anos.length ? Math.max(...anos) : null,
    maiorFornecedor: maior ? { nome: maior.nome, qtde: maior.qtde, soma: maior.soma } : null,
    ultimaPublicacao: maisRecente?.[0]?.data_publicacao ?? null,
  };
  const paragrafo = paragrafoContratos(resumo);
  if (!paragrafo) return null;
  return (
    <BlocoContratosCamara
      paragrafo={paragrafo}
      stats={stats}
      faq={faqContratos(resumo)}
      alertaSancoes={<AlertaContratosSancao />}
    />
  );
}

async function blocoLicitacoes(): Promise<ReactNode> {
  // A aba lista a tabela camara_licitacoes pelo cliente (743 linhas, a maioria sem data de
  // abertura); hidratá-la inteira passaria de 1 MB de HTML. O primeiro lote do servidor vem da
  // tabela licitacao_camara (antiga /transparencia/licitacoes-camara), toda com data de publicação.
  const [stats, recentes] = await Promise.all([
    tentar("licitacoes-resumo", () => fetchLicitacoesStats()),
    tentar("licitacoes-recentes", () => fetchLicitacoesRecentes(20)),
  ]);
  if (!stats?.total) return null;
  const anos = stats.por_ano.map((a) => a.ano);
  const resumo = {
    total: stats.total,
    anoMin: anos.length ? Math.min(...anos) : null,
    anoMax: anos.length ? Math.max(...anos) : null,
    modalidadeMaisUsada: stats.por_modalidade[0] ?? null,
    homologadas: stats.por_situacao.find((s) => s.situacao === "Homologada")?.quantidade ?? 0,
    totalHomologado: stats.total_homologado,
    totalEstimado: stats.total_estimado,
    ultimaPublicacao: recentes?.[0]?.data_publicacao ?? null,
  };
  const paragrafo = paragrafoLicitacoes(resumo);
  if (!paragrafo) return null;
  return (
    <BlocoLicitacoesCamara
      paragrafo={paragrafo}
      total={stats.total}
      totalHomologado={stats.total_homologado}
      totalEstimado={stats.total_estimado}
      porModalidade={stats.por_modalidade}
      porSituacao={stats.por_situacao}
      recentes={recentes ?? []}
      faq={faqLicitacoes(resumo)}
    />
  );
}

async function blocoDespesas(): Promise<ReactNode> {
  // Só anos fechados: o ano corrente de camara_despesas tem linhas repetidas na fonte
  // (2026-11-19: 25.694 linhas, só 588 distintas), e a soma não é confiável.
  const anoAtual = anoEmSaoPaulo();
  const [orcamento, resumoPagamentos] = await Promise.all([
    tentar("despesas-orcamento", () => fetchOrcamentoCamaraServidor()),
    tentar("despesas-pagamentos", () => fetchPagamentosCamaraAnos([anoAtual - 1, anoAtual - 2])),
  ]);
  const orcamentos: OrcamentoCamaraAno[] = (orcamento ?? []).map((o) => ({
    ano: Number(o.ano),
    dotacao: o.dotacao === null ? null : Number(o.dotacao),
    liquidada: o.liquidada === null ? null : Number(o.liquidada),
    periodo_referencia: o.periodo_referencia,
  }));
  const pagamentos = pagamentosConfiaveis(resumoPagamentos ?? []);
  const paragrafo = paragrafoDespesas(orcamentos, pagamentos);
  if (!paragrafo) return null;
  return (
    <BlocoDespesasCamara
      paragrafo={paragrafo}
      orcamentos={orcamentos}
      fonteOrcamento={orcamento?.[0]?.fonte_url ?? null}
      pagamentos={pagamentos}
      faq={faqDespesas(orcamentos, pagamentos)}
    />
  );
}

async function blocoServidores(queryClient: QueryClient): Promise<ReactNode> {
  const [lote, resumoFolha, cadastroStats, cadastro] = await Promise.all([
    tentar("servidores-lote", () => fetchServidoresCamaraPrimeiroLote(PAGINA_SERVIDORES_CAMARA)),
    tentar("servidores-folha", () => fetchResumoFolhaCamaraServidor()),
    tentar("servidores-cadastro-resumo", () => fetchFolhaStats()),
    tentar("servidores-cadastro", () => fetchFolhaUltimaCompetencia()),
  ]);
  if (lote?.data.length) queryClient.setQueryData(chaveServidoresCamara("", 0), lote);
  if (resumoFolha) queryClient.setQueryData(CHAVE_RESUMO_FOLHA_CAMARA, resumoFolha);

  const folha: ResumoFolhaParaTexto = resumoFolha?.mensal
    ? { competencia: resumoFolha.mensal.competencia, bruto: resumoFolha.mensal.bruto, pessoas: resumoFolha.mensal.servidores }
    : null;
  const resumoCadastro: CadastroPessoalCamara = cadastroStats
    ? { referencia: cadastroStats.ultima_referencia, pessoas: cadastroStats.total_servidores_ultima, cargos: cadastroStats.por_cargo.length }
    : null;
  const paragrafo = paragrafoServidores(folha, resumoCadastro);
  if (!paragrafo) return null;
  return (
    <BlocoServidoresCamara
      paragrafo={paragrafo}
      referenciaCadastro={cadastroStats?.ultima_referencia ?? null}
      porCargo={cadastroStats?.por_cargo ?? []}
      cadastro={cadastro ?? []}
      faq={faqServidores(folha, resumoCadastro)}
    />
  );
}

async function blocoIndicacoes(): Promise<ReactNode> {
  // A contagem do ano é do ano corrente em São Paulo. Se qualquer consulta falhar, a leitura lança
  // erro e o bloco some, em vez de afirmar "0 delas no ano".
  const ano = anoEmSaoPaulo();
  const [stats, recentes] = await Promise.all([
    tentar("indicacoes-resumo", () => fetchIndicacoesResumoServidor(ano)),
    tentar("indicacoes-recentes", () => fetchIndicacoesRecentes(50)),
  ]);
  if (!stats?.total) return null;
  const paragrafo = paragrafoIndicacoes({ total: stats.total, ano, doAno: stats.doAno, ultima: stats.ultima });
  if (!paragrafo) return null;
  return <BlocoIndicacoesCamara paragrafo={paragrafo} indicacoes={recentes ?? []} total={stats.total} />;
}

async function blocoProjetos(): Promise<ReactNode> {
  const [stats, atividades] = await Promise.all([
    tentar("projetos-resumo", () => fetchAtividadesStats()),
    tentar("projetos-recentes", () => fetchAtividadesLegislativas(50)),
  ]);
  if (!stats?.total) return null;
  const paragrafo = paragrafoProjetos({
    total: stats.total,
    tipoMaisComum: stats.por_tipo[0] ?? null,
    ultima: stats.ultima_publicacao,
  });
  if (!paragrafo) return null;
  return <BlocoProjetosCamara paragrafo={paragrafo} stats={stats} atividades={atividades ?? []} />;
}

async function blocoAtuacao(): Promise<ReactNode> {
  const [mocoes, requerimentos, stats] = await Promise.all([
    tentar("atuacao-mocoes", () => fetchAtosPorTipo("MOCAO", 20)),
    tentar("atuacao-requerimentos", () => fetchAtosPorTipo("REQUERIMENTO", 20)),
    tentar("atuacao-resumo", () => fetchAtosStats()),
  ]);
  if (!stats) return null;
  const totalMocoes = stats.por_tipo.find((t) => t.tipo === "MOCAO")?.quantidade ?? 0;
  const totalRequerimentos = stats.por_tipo.find((t) => t.tipo === "REQUERIMENTO")?.quantidade ?? 0;
  const datas = [...(mocoes ?? []), ...(requerimentos ?? [])]
    .map((a) => a.data_publicacao)
    .filter((d): d is string => Boolean(d))
    .sort();
  const paragrafo = paragrafoAtuacao({
    mocoes: totalMocoes,
    requerimentos: totalRequerimentos,
    ultima: datas[datas.length - 1] ?? null,
  });
  if (!paragrafo) return null;
  return (
    <BlocoAtuacaoCamara
      paragrafo={paragrafo}
      mocoes={mocoes ?? []}
      requerimentos={requerimentos ?? []}
      totalMocoes={totalMocoes}
      totalRequerimentos={totalRequerimentos}
    />
  );
}

/** Parte da aba lida no servidor. Abas sem bloco próprio devolvem null. */
export async function carregarBlocoServidor(aba: string, queryClient: QueryClient): Promise<ReactNode> {
  switch (aba) {
    case "contratos": return blocoContratos(queryClient);
    case "licitacoes": return blocoLicitacoes();
    case "despesas": return blocoDespesas();
    case "servidores": return blocoServidores(queryClient);
    case "indicacoes": return blocoIndicacoes();
    case "projetos": return blocoProjetos();
    case "atuacao": return blocoAtuacao();
    default: return null;
  }
}
