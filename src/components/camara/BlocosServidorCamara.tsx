// Parte renderizada no servidor das abas da Câmara (Onda 2 de SEO, 2026-11-19): parágrafo-resposta
// com número, data e fonte, resumo, primeiro lote e perguntas frequentes. É o conteúdo que os robôs
// que não executam JavaScript (GPTBot, ClaudeBot, PerplexityBot) leem no HTML. Os dados chegam
// prontos de src/app/camara/[aba]/bloco-servidor.tsx; aqui só há marcação.
//
// O conteúdo das antigas páginas /transparencia/* da Câmara (308 para estas abas) mora aqui.

import type { ReactNode } from "react";
import { Building2, Calendar, FileText, Megaphone, MessageSquareWarning, Users } from "lucide-react";
import type { fetchContratosStats } from "@/lib/data/contratos-camara";
import type { LicitacaoCamara } from "@/lib/data/licitacoes-camara";
import type { FolhaServidor } from "@/lib/data/folha-camara";
import type { IndicacaoCamara } from "@/lib/data/indicacoes-camara";
import type { AtividadeLegislativa, AtividadesStats } from "@/lib/data/atividades-legislativas";
import type { AtoCamara } from "@/lib/data/atos-camara";
import IndicacoesPanel from "@/components/camara/IndicacoesPanel";
import AtividadesLegislativasPanel from "@/components/camara/AtividadesLegislativasPanel";
import { FONTES_CAMARA } from "@/lib/fontes-oficiais";
import {
  FONTE_PORTAL_CAMARA,
  FONTE_SICONFI,
  INDICACOES_NO_PAINEL,
  LICITACOES_EM_CARTAO,
  faqPageJsonLd,
  formatarInteiro,
  formatarPercentual,
  formatarReais,
  linhaIndicacao,
  linhaLicitacao,
  valorDaLicitacao,
  valorLicitacoes,
  type ItemFaq,
  type OrcamentoCamaraAno,
  type PagamentosCamaraAno,
} from "@/components/camara/resposta-aba";

const SITE_URL = "https://piracanjuba.ai";

export type ContratoStats = NonNullable<Awaited<ReturnType<typeof fetchContratosStats>>>;

/** "2026-10-09..." -> "09/10/2026", sem passar por Date (sem efeito de fuso). */
function dataCurta(iso: string | null | undefined): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "-";
}

function reaisOuTraco(valor: number | null | undefined): string {
  return valor === null || valor === undefined || !Number.isFinite(valor) ? "-" : formatarReais(valor);
}

/** Homologado positivo, senão estimado positivo (homologado zero não esconde o estimado). */
function valorDoCartao(l: LicitacaoCamara): string {
  const valor = valorDaLicitacao(l);
  return valor ? formatarReais(valor.valor) : "Valor não informado";
}

function cnpjFormatado(c: string | null): string | null {
  if (!c) return null;
  const limpo = c.replace(/\D/g, "");
  if (limpo.length !== 14) return c;
  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12)}`;
}

function cortar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max).trimEnd()}...` : texto;
}

function JsonLd({ dados }: { dados: unknown }) {
  if (!dados) return null;
  // "<" escapado: texto vindo do banco não pode fechar o <script>.
  const html = JSON.stringify(dados).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Destaques({ itens }: { itens: Array<{ rotulo: string; valor: string }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {itens.map((item) => (
        <div key={item.rotulo} className="stat-card">
          <p className="text-xs uppercase text-muted-foreground tracking-wider">{item.rotulo}</p>
          <p className="text-lg font-extrabold text-foreground mt-0.5 break-words">{item.valor}</p>
        </div>
      ))}
    </div>
  );
}

function PerguntasFrequentes({ itens, url }: { itens: ItemFaq[]; url: string }) {
  if (!itens.length) return null;
  return (
    <section aria-labelledby="perguntas-aba-camara" className="stat-card space-y-3">
      <h2 id="perguntas-aba-camara" className="text-lg font-semibold text-foreground">Perguntas frequentes</h2>
      {itens.map((item) => (
        <div key={item.pergunta}>
          <h3 className="text-sm font-semibold text-foreground">{item.pergunta}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{item.resposta}</p>
        </div>
      ))}
      <JsonLd dados={faqPageJsonLd(url, itens)} />
    </section>
  );
}

/** Moldura comum: parágrafo-resposta no topo, com a fonte, depois o resto do bloco. */
function RespostaAba({
  titulo,
  paragrafo,
  fonte,
  children,
}: {
  titulo: string;
  paragrafo: string;
  fonte: { nome: string; url: string };
  children?: ReactNode;
}) {
  return (
    <div className="container pt-2 pb-2 space-y-4">
      <section aria-label={titulo} className="stat-card space-y-2 border-primary/30 bg-primary/5">
        <h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
        <p className="text-sm sm:text-base text-foreground leading-relaxed">{paragrafo}</p>
        <p className="text-xs text-muted-foreground">
          Fonte:{" "}
          <a href={fonte.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {fonte.nome}
          </a>
          .
        </p>
      </section>
      {children}
    </div>
  );
}

const FONTE_CAMARA = { nome: FONTE_PORTAL_CAMARA, url: FONTES_CAMARA.transparencia };

// ---------------------------------------------------------------- Contratos

export function BlocoContratosCamara({
  paragrafo,
  stats,
  faq,
  alertaSancoes,
}: {
  paragrafo: string;
  stats: ContratoStats;
  faq: ItemFaq[];
  alertaSancoes?: ReactNode;
}) {
  const maiorAno = Math.max(...stats.por_ano.map((a) => a.soma), 1);
  return (
    <RespostaAba titulo="Contratos da Câmara em números" paragrafo={paragrafo} fonte={FONTE_CAMARA}>
      <Destaques
        itens={[
          { rotulo: "Contratos", valor: formatarInteiro(stats.total) },
          { rotulo: "Em vigor", valor: formatarInteiro(stats.em_vigor) },
          { rotulo: "Valor total", valor: formatarReais(stats.total_valor) },
          { rotulo: "Anos com contrato", valor: formatarInteiro(stats.por_ano.length) },
        ]}
      />
      {alertaSancoes}
      {stats.por_ano.length > 0 && (
        <section className="stat-card space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Contratos por ano</h2>
          <div className="space-y-1.5">
            {stats.por_ano.map((a) => (
              <div key={a.ano} className="flex items-center gap-3 text-sm">
                <span className="font-bold text-foreground w-12">{a.ano}</span>
                <span className="text-muted-foreground w-24">{a.qtde} {a.qtde === 1 ? "contrato" : "contratos"}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden" aria-hidden="true">
                  <div className="h-full bg-primary" style={{ width: `${Math.max(5, (a.soma / maiorAno) * 100)}%` }} />
                </div>
                <span className="font-mono text-sm text-foreground w-32 text-right">{formatarReais(a.soma)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {stats.top_fornecedores.length > 0 && (
        <section className="stat-card space-y-3">
          <h2 className="text-lg font-semibold text-foreground inline-flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" aria-hidden="true" />
            Maiores fornecedores da Câmara
          </h2>
          <p className="text-sm text-muted-foreground">Soma dos contratos de cada fornecedor, agrupada por CNPJ.</p>
          <ol className="space-y-2">
            {stats.top_fornecedores.map((f, i) => (
              <li key={f.cnpj ?? f.nome} className="flex items-start gap-3 p-2 rounded-lg border border-border bg-background/40">
                <span className="text-lg font-bold text-primary w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{f.nome}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {cnpjFormatado(f.cnpj) ?? "CNPJ não informado"} · {f.qtde} {f.qtde === 1 ? "contrato" : "contratos"}
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground whitespace-nowrap">{formatarReais(f.soma)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      <PerguntasFrequentes itens={faq} url={`${SITE_URL}/camara/contratos`} />
      <h2 className="text-lg font-semibold text-foreground pt-2">Todos os contratos, com busca e resumo por IA</h2>
    </RespostaAba>
  );
}

// ---------------------------------------------------------------- Licitações

export function BlocoLicitacoesCamara({
  paragrafo,
  total,
  totalHomologado,
  totalEstimado,
  porModalidade,
  porSituacao,
  recentes,
  faq,
}: {
  paragrafo: string;
  total: number;
  totalHomologado: number;
  totalEstimado: number;
  porModalidade: Array<{ modalidade: string; quantidade: number }>;
  porSituacao: Array<{ situacao: string; quantidade: number }>;
  recentes: LicitacaoCamara[];
  faq: ItemFaq[];
}) {
  // Sem valor homologado na fonte (2026-11-19), o cartão mostra o estimado; sem nenhum, some.
  const valor = valorLicitacoes({ totalHomologado, totalEstimado });
  // As primeiras em cartão; as demais (até LICITACOES_NO_SERVIDOR) numa lista de uma linha cada.
  const cartoes = recentes.slice(0, LICITACOES_EM_CARTAO);
  const demais = recentes.slice(LICITACOES_EM_CARTAO);
  return (
    <RespostaAba titulo="Licitações da Câmara em números" paragrafo={paragrafo} fonte={FONTE_CAMARA}>
      <Destaques
        itens={[
          { rotulo: "Licitações", valor: formatarInteiro(total) },
          { rotulo: "Homologadas", valor: formatarInteiro(porSituacao.find((s) => s.situacao === "Homologada")?.quantidade ?? 0) },
          ...(valor ? [{ rotulo: `Valor ${valor.rotulo}`, valor: formatarReais(valor.valor) }] : []),
          { rotulo: "Modalidades", valor: formatarInteiro(porModalidade.length) },
        ]}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {porModalidade.length > 0 && (
          <section className="stat-card space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Modalidades mais usadas</h2>
            <ul className="space-y-1">
              {porModalidade.slice(0, 8).map((m) => (
                <li key={m.modalidade} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-foreground">{m.modalidade}</span>
                  <span className="font-bold text-foreground">{formatarInteiro(m.quantidade)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {porSituacao.length > 0 && (
          <section className="stat-card space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Por situação</h2>
            <ul className="space-y-1">
              {porSituacao.slice(0, 8).map((s) => (
                <li key={s.situacao} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-foreground">{s.situacao}</span>
                  <span className="font-bold text-foreground">{formatarInteiro(s.quantidade)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {cartoes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Licitações publicadas mais recentemente</h2>
          <p className="text-sm text-muted-foreground">
            As {cartoes.length} mais recentes de {formatarInteiro(total)}, pela data de publicação no portal.
          </p>
          {cartoes.map((l) => (
            <article key={l.id} className="stat-card">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">{l.centi_label}</span>
                  {l.modalidade && <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">{l.modalidade}</span>}
                  {l.situacao && <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{l.situacao}</span>}
                </div>
                <p className="text-sm font-bold text-foreground">
                  {/* Zero ou vazio na fonte é valor não informado, não licitação de R$ 0,00. */}
                  {valorDoCartao(l)}
                </p>
              </div>
              {l.descricao && <p className="text-sm text-foreground/85 leading-relaxed">{cortar(l.descricao, 220)}</p>}
              <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                Publicada em {dataCurta(l.data_publicacao)}
              </p>
            </article>
          ))}
        </section>
      )}
      {demais.length > 0 && (
        <details className="stat-card">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            {`Mais ${demais.length} licitações publicadas, da ${LICITACOES_EM_CARTAO + 1}ª à ${recentes.length}ª mais recente, com modalidade, situação, valor e objeto`}
          </summary>
          <ol className="mt-3 space-y-2 text-sm text-foreground/85 leading-relaxed">
            {demais.map((l) => (
              <li key={l.id}><strong>{l.centi_label}</strong>{linhaLicitacao(l)}</li>
            ))}
          </ol>
        </details>
      )}
      <PerguntasFrequentes itens={faq} url={`${SITE_URL}/camara/licitacoes`} />
      <h2 className="text-lg font-semibold text-foreground pt-2">Todas as licitações, com busca e resumo por IA</h2>
    </RespostaAba>
  );
}

// ---------------------------------------------------------------- Despesas

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function periodoOrcamento(o: OrcamentoCamaraAno): string {
  const p = o.periodo_referencia ?? 6;
  return p >= 6 ? "ano fechado" : `até ${MESES_CURTOS[Math.min(12, p * 2) - 1]} (${p}º bimestre)`;
}

export function BlocoDespesasCamara({
  paragrafo,
  orcamentos,
  fonteOrcamento,
  pagamentos,
  faq,
}: {
  paragrafo: string;
  orcamentos: OrcamentoCamaraAno[];
  fonteOrcamento: string | null;
  pagamentos: PagamentosCamaraAno[];
  faq: ItemFaq[];
}) {
  const fonte = orcamentos.length
    ? { nome: FONTE_SICONFI, url: fonteOrcamento ?? FONTES_CAMARA.transparencia }
    : FONTE_CAMARA;
  return (
    <RespostaAba titulo="Despesas da Câmara em números" paragrafo={paragrafo} fonte={fonte}>
      {orcamentos.length > 0 && (
        <section className="stat-card space-y-3 overflow-x-auto">
          <h2 className="text-lg font-semibold text-foreground">Orçamento e despesa liquidada por ano</h2>
          <p className="text-sm text-muted-foreground">Função Legislativa declarada ao {FONTE_SICONFI} (RREO).</p>
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="px-2 py-2 font-medium text-muted-foreground">Ano</th>
                <th className="px-2 py-2 font-medium text-muted-foreground">Orçado</th>
                <th className="px-2 py-2 font-medium text-muted-foreground">Liquidado</th>
                <th className="px-2 py-2 font-medium text-muted-foreground">Execução</th>
                <th className="px-2 py-2 font-medium text-muted-foreground">Período</th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.slice(0, 6).map((o) => (
                <tr key={o.ano} className="border-b border-border/50 last:border-0">
                  <td className="px-2 py-2 font-semibold text-foreground">{o.ano}</td>
                  <td className="px-2 py-2 text-foreground whitespace-nowrap">{reaisOuTraco(o.dotacao)}</td>
                  <td className="px-2 py-2 text-foreground whitespace-nowrap">{reaisOuTraco(o.liquidada)}</td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {o.dotacao && o.liquidada !== null ? formatarPercentual(o.liquidada, o.dotacao) ?? "-" : "-"}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{periodoOrcamento(o)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {pagamentos.length > 0 && (
        <section className="stat-card space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Pagamentos registrados no portal da Câmara</h2>
          <ul className="space-y-1">
            {pagamentos.map((p) => (
              <li key={p.ano} className="flex items-center gap-2 text-sm">
                <span className="font-bold text-foreground w-12">{p.ano}</span>
                <span className="flex-1 text-muted-foreground">{formatarInteiro(p.pagamentos)} pagamentos</span>
                <span className="font-semibold text-foreground">{formatarReais(p.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <PerguntasFrequentes itens={faq} url={`${SITE_URL}/camara/despesas`} />
      <h2 className="text-lg font-semibold text-foreground pt-2">Pagamentos do ano, com busca e resumo por IA</h2>
    </RespostaAba>
  );
}

// ---------------------------------------------------------------- Servidores e folha

export function BlocoServidoresCamara({
  paragrafo,
  referenciaCadastro,
  referenciaTabela,
  porCargo,
  cadastro,
  faq,
}: {
  paragrafo: string;
  /** competência do resumo por cargo (fetchFolhaStats) */
  referenciaCadastro: string | null;
  /** competência das linhas da tabela (fetchFolhaUltimaCompetencia), lida das próprias linhas */
  referenciaTabela: string | null;
  porCargo: Array<{ cargo: string; quantidade: number }>;
  cadastro: FolhaServidor[];
  faq: ItemFaq[];
}) {
  const totalCadastro = porCargo.reduce((s, c) => s + c.quantidade, 0) || 1;
  return (
    <RespostaAba
      titulo="Folha e pessoal da Câmara em números"
      paragrafo={paragrafo}
      fonte={{ nome: FONTE_PORTAL_CAMARA, url: FONTES_CAMARA.folhas }}
    >
      {porCargo.length > 0 && (
        <section className="stat-card space-y-3">
          <h2 className="text-lg font-semibold text-foreground inline-flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" aria-hidden="true" />
            Pessoal por cargo{referenciaCadastro ? ` (${referenciaCadastro})` : ""}
          </h2>
          <div className="space-y-1">
            {porCargo.map((c) => (
              <div key={c.cargo} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-foreground">{c.cargo}</span>
                <div className="w-24 sm:w-32 h-2 bg-muted rounded-full overflow-hidden" aria-hidden="true">
                  <div className="h-full bg-primary" style={{ width: `${(c.quantidade / totalCadastro) * 100}%` }} />
                </div>
                <span className="font-bold text-foreground w-8 text-right">{c.quantidade}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {cadastro.length > 0 && (
        <details className="stat-card">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Cadastro de pessoal{referenciaTabela ? ` de ${referenciaTabela}` : ""}: {cadastro.length} pessoas, com cargo, lotação e admissão
          </summary>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="px-2 py-2 font-medium text-muted-foreground">Nome</th>
                  <th className="px-2 py-2 font-medium text-muted-foreground">Cargo</th>
                  <th className="px-2 py-2 font-medium text-muted-foreground">Lotação</th>
                  <th className="px-2 py-2 font-medium text-muted-foreground">Admissão</th>
                  <th className="px-2 py-2 font-medium text-muted-foreground">Situação</th>
                </tr>
              </thead>
              <tbody>
                {cadastro.map((f) => (
                  <tr key={f.id} className="border-b border-border/50 last:border-0">
                    <td className="px-2 py-2 text-foreground">{f.nome}</td>
                    <td className="px-2 py-2 text-muted-foreground">{f.cargo}</td>
                    <td className="px-2 py-2 text-muted-foreground">{f.lotacao ?? "-"}</td>
                    <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{dataCurta(f.data_admissao)}</td>
                    <td className="px-2 py-2 text-muted-foreground">{f.situacao ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <PerguntasFrequentes itens={faq} url={`${SITE_URL}/camara/servidores`} />
    </RespostaAba>
  );
}

// ---------------------------------------------------------------- Indicações

export function BlocoIndicacoesCamara({
  paragrafo,
  indicacoes,
  total,
}: {
  paragrafo: string;
  indicacoes: IndicacaoCamara[];
  total: number;
}) {
  // As primeiras no painel; as demais (até INDICACOES_NO_SERVIDOR) numa lista de uma linha cada.
  const noPainel = indicacoes.slice(0, INDICACOES_NO_PAINEL);
  const demais = indicacoes.slice(INDICACOES_NO_PAINEL);
  return (
    <RespostaAba titulo="Indicações dos vereadores em números" paragrafo={paragrafo} fonte={FONTE_CAMARA}>
      {noPainel.length > 0 && <IndicacoesPanel indicacoes={noPainel} totalGeral={total} variant="full" />}
      {demais.length > 0 && (
        <details className="stat-card">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            {`Mais ${demais.length} indicações, da ${INDICACOES_NO_PAINEL + 1}ª à ${indicacoes.length}ª mais recente, com número, data e ementa`}
          </summary>
          <ol className="mt-3 space-y-2 text-sm text-foreground/85 leading-relaxed">
            {demais.map((i) => (
              <li key={i.id}><strong>{i.numero}</strong>{linhaIndicacao(i)}</li>
            ))}
          </ol>
        </details>
      )}
      <h2 className="text-lg font-semibold text-foreground pt-2">Todas as indicações, com busca e resumo por IA</h2>
    </RespostaAba>
  );
}

// ---------------------------------------------------------------- Projetos (atividades legislativas)

const TIPO_CURTO: Record<string, [string, string]> = {
  "Projeto de Lei do Legislativo": ["projeto de lei", "projetos de lei"],
  "Projeto de Decreto Legislativo": ["decreto", "decretos"],
  "Projeto de Resolução": ["resolução", "resoluções"],
  "Emenda à Lei Orgânica": ["emenda à LO", "emendas à LO"],
};

function rotuloTipos(tipos: Record<string, number>): string {
  return Object.entries(tipos)
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, n]) => {
      const [singular, plural] = TIPO_CURTO[tipo] ?? [tipo.toLowerCase(), tipo.toLowerCase()];
      return `${n} ${n === 1 ? singular : plural}`;
    })
    .join(" · ");
}

export function BlocoProjetosCamara({
  paragrafo,
  stats,
  atividades,
}: {
  paragrafo: string;
  stats: AtividadesStats;
  atividades: AtividadeLegislativa[];
}) {
  return (
    <RespostaAba titulo="Atividade legislativa da Câmara em números" paragrafo={paragrafo} fonte={FONTE_CAMARA}>
      {stats.por_tipo.length > 0 && (
        <section className="stat-card space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Por tipo de ato</h2>
          <ul className="space-y-1">
            {stats.por_tipo.map((t) => (
              <li key={t.tipo} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-foreground">{t.tipo}</span>
                <span className="text-muted-foreground">{formatarPercentual(t.quantidade, stats.total)}</span>
                <span className="font-bold text-foreground w-10 text-right">{t.quantidade}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {stats.por_autor.length > 0 && (
        <section className="stat-card space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Vereadores que mais propõem</h2>
          <p className="text-sm text-muted-foreground">
            Proposições de cada autor, sem os atos do Poder Executivo. Coautoria conta para todos os autores.
          </p>
          <ul className="space-y-1.5">
            {stats.por_autor.slice(0, 12).map((a) => (
              <li key={a.autor} className="flex items-center gap-2 text-sm">
                <span className="text-foreground shrink-0">{a.autor}</span>
                <span className="text-xs text-muted-foreground truncate flex-1">{rotuloTipos(a.tipos)}</span>
                <span className="font-bold text-foreground w-10 text-right shrink-0">{a.quantidade}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {atividades.length > 0 && <AtividadesLegislativasPanel atividades={atividades} totalGeral={stats.total} variant="full" />}
      <h2 className="text-lg font-semibold text-foreground pt-2">Projetos de lei, com filtros e resumo por IA</h2>
    </RespostaAba>
  );
}

// ---------------------------------------------------------------- Atuação (moções e requerimentos)

function ListaAtos({ titulo, atos, icone }: { titulo: string; atos: AtoCamara[]; icone: ReactNode }) {
  if (!atos.length) return null;
  return (
    <section className="stat-card space-y-3">
      <h2 className="text-lg font-semibold text-foreground inline-flex items-center gap-2">
        {icone}
        {titulo}
      </h2>
      <div className="space-y-2">
        {atos.map((a) => (
          <article key={a.id} className="p-3 rounded-lg border border-border bg-background/40">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <p className="font-semibold text-foreground text-sm">{a.numero}</p>
              <p className="text-xs text-muted-foreground">{dataCurta(a.data_publicacao)}</p>
            </div>
            {a.ementa && <p className="text-sm text-foreground/85 leading-relaxed">{a.ementa}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

export function BlocoAtuacaoCamara({
  paragrafo,
  mocoes,
  requerimentos,
  totalMocoes,
  totalRequerimentos,
}: {
  paragrafo: string;
  mocoes: AtoCamara[];
  requerimentos: AtoCamara[];
  totalMocoes: number;
  totalRequerimentos: number;
}) {
  return (
    <RespostaAba titulo="Moções e requerimentos da Câmara" paragrafo={paragrafo} fonte={FONTE_CAMARA}>
      <ListaAtos
        titulo={`Moções mais recentes (${mocoes.length} de ${formatarInteiro(totalMocoes)})`}
        atos={mocoes}
        icone={<Megaphone className="w-5 h-5 text-primary" aria-hidden="true" />}
      />
      <ListaAtos
        titulo={`Requerimentos mais recentes (${requerimentos.length} de ${formatarInteiro(totalRequerimentos)})`}
        atos={requerimentos}
        icone={<MessageSquareWarning className="w-5 h-5 text-primary" aria-hidden="true" />}
      />
      <h2 className="text-lg font-semibold text-foreground pt-2 inline-flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
        Toda a atuação parlamentar, com filtros por vereador e tipo
      </h2>
    </RespostaAba>
  );
}
