import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import {
  CATEGORIA_SEM_NOME,
  LOTE_ZAP,
  agruparIndice,
  dataDeReferencia,
  ehNovo,
  embaralharPorDia,
  fichaParaNavegador,
  maisUmLote,
  paginacaoDaChave,
  registrarContato,
  sementeDoDia,
  textoIndice,
  textoResposta,
  type CadastroZap,
  type FichaZap,
  type PaginacaoZap,
} from "../src/app/zap-pba/lista.ts";

const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = Date.parse("2026-11-19T15:00:00Z");

function cadastro(parcial: Partial<CadastroZap> = {}): CadastroZap {
  return {
    id: "c1",
    name: "Padaria Exemplo",
    whatsapp: "64999990000",
    category: "Alimentação",
    click_count: 3,
    created_at: "2026-01-02T10:00:00.000000+00:00",
    ...parcial,
  };
}

function ficha(id: string, name: string, category: string | null, pagina?: string): FichaZap {
  return { id, name, whatsapp: "64999990000", category, click_count: 0, ...(pagina ? { pagina } : {}) };
}

// Cópia literal do embaralhamento que o ZapPbaClient usava até 2026-11-19, com a
// data lida do relógio local. A versão nova recebe a mesma data pronta.
function embaralhamentoAntigo<T>(items: T[], today: Date) {
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const mixed = Math.imul(seed + i, 2654435761) >>> 0;
    const j = mixed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

test("a ficha do navegador leva só o que o cartão usa e troca a data pelo selo Novo", () => {
  const antiga = fichaParaNavegador(cadastro(), AGORA);
  assert.deepEqual(antiga, {
    id: "c1",
    name: "Padaria Exemplo",
    whatsapp: "64999990000",
    category: "Alimentação",
    click_count: 3,
  });
  assert.equal("created_at" in antiga, false);
  assert.equal("pagina" in antiga, false, "página ausente não pode virar $undefined no payload");

  const recente = fichaParaNavegador(
    cadastro({ created_at: new Date(AGORA - 2 * DIA_MS).toISOString(), pagina: "/zap-pba/padaria-exemplo" }),
    AGORA,
  );
  assert.equal(recente.novo, true);
  assert.equal(recente.pagina, "/zap-pba/padaria-exemplo");

  const editorial = fichaParaNavegador(cadastro({ editorial: true, created_at: null }), AGORA);
  assert.equal(editorial.editorial, true);
  assert.equal("novo" in editorial, false);
});

test("o selo Novo segue a regra de 7 dias de antes", () => {
  assert.equal(ehNovo(new Date(AGORA - 6 * DIA_MS).toISOString(), AGORA), true);
  assert.equal(ehNovo(new Date(AGORA - 8 * DIA_MS).toISOString(), AGORA), false);
  assert.equal(ehNovo(null, AGORA), false);
  assert.equal(ehNovo("data inválida", AGORA), false);
});

test("a data de referência é o dia de Piracanjuba, não o do servidor em UTC", () => {
  assert.equal(dataDeReferencia(new Date("2026-11-20T01:30:00Z")), "2026-11-19");
  assert.equal(dataDeReferencia(new Date("2026-11-20T03:30:00Z")), "2026-11-20");
  assert.equal(dataDeReferencia(new Date("2027-01-01T02:59:00Z")), "2026-12-31");
});

test("o embaralhamento do dia é o mesmo algoritmo de antes, com a semente vinda do servidor", () => {
  const itens = Array.from({ length: 423 }, (_, i) => `item-${i}`);
  for (const [data, relogio] of [
    ["2026-11-19", new Date(2026, 10, 19, 12)],
    ["2026-01-01", new Date(2026, 0, 1, 8)],
    ["2027-12-31", new Date(2027, 11, 31, 23)],
  ] as const) {
    assert.equal(sementeDoDia(data), relogio.getFullYear() * 10000 + (relogio.getMonth() + 1) * 100 + relogio.getDate());
    assert.deepEqual(embaralharPorDia(itens, sementeDoDia(data)), embaralhamentoAntigo(itens, relogio));
  }
  assert.notDeepEqual(
    embaralharPorDia(itens, sementeDoDia("2026-11-19")),
    embaralharPorDia(itens, sementeDoDia("2026-11-20")),
  );
  assert.deepEqual([...embaralharPorDia(itens, sementeDoDia("2026-11-19"))].sort(), [...itens].sort());
});

test("o índice agrupa por categoria em ordem alfabética estável e põe os sem categoria em Outros", () => {
  const grupos = agruparIndice([
    ficha("1", "Zé Lanches", "Alimentação", "/zap-pba/ze-lanches"),
    ficha("2", "Ótica Central", "Saúde"),
    ficha("3", "açaí do Chefe", "Alimentação", "/zap-pba/acai-do-chefe"),
    ficha("4", "Oficina Boa", null),
    ficha("5", "Bar do Ari", "Alimentação"),
    ficha("6", "Estúdio Ana", "Beleza e Estética"),
    ficha("7", "Loja X", "Outros"),
  ]);
  assert.deepEqual(grupos.map((grupo) => grupo.categoria), [
    "Alimentação",
    "Beleza e Estética",
    CATEGORIA_SEM_NOME,
    "Saúde",
  ]);
  assert.deepEqual(grupos[0].itens.map((item) => item.name), ["açaí do Chefe", "Bar do Ari", "Zé Lanches"]);
  assert.deepEqual(grupos[2].itens.map((item) => item.id), ["7", "4"]);
  assert.equal(grupos.reduce((soma, grupo) => soma + grupo.itens.length, 0), 7);
});

test("o parágrafo-resposta traz o número, as categorias, a data e a origem dos dados", () => {
  const texto = textoResposta(423, 24, "2026-11-19");
  assert.equal(
    texto,
    "O Zap PBA reúne o WhatsApp de 423 estabelecimentos de Piracanjuba, GO, em 24 categorias, " +
      "com números cadastrados no portal e publicados após análise (lista atualizada em 2026-11-19).",
  );
  assert.match(textoResposta(1, 1, "2026-11-19") ?? "", /1 estabelecimento de Piracanjuba, GO, em 1 categoria, /);
  assert.equal(textoResposta(0, 0, "2026-11-19"), null, "sem fichas, o texto não afirma nada");
  assert.doesNotMatch(texto ?? "", /[\u2013\u2014]/);
  // O formulário aceita qualquer visitante e a ficha do escritório entra pelo portal:
  // o dado não sustenta que os números vieram dos próprios estabelecimentos.
  assert.doesNotMatch(texto ?? "", /próprios estabelecimentos/);
});

test("o índice só diz quantos são quando o total veio do banco, e trata o singular", () => {
  assert.equal(textoIndice(423), "Os 423 estabelecimentos do guia, em ordem alfabética.");
  assert.equal(textoIndice(1), "O único estabelecimento do guia.");
  // Supabase fora do ar: só a ficha editorial na lista, sem contagem afirmada.
  assert.equal(textoIndice(null), "Estabelecimentos do guia, em ordem alfabética.");
  assert.equal(textoIndice(0), "Estabelecimentos do guia, em ordem alfabética.");
  for (const total of [null, 0, 1, 2, 423]) {
    assert.doesNotMatch(textoIndice(total), /\bOs 1 /);
    assert.doesNotMatch(textoIndice(total), /[\u2013\u2014]/);
  }
});

test("o primeiro lote fecha as grades de 1, 2 e 3 colunas", () => {
  assert.equal(LOTE_ZAP % 6, 0);
  assert.ok(LOTE_ZAP >= 40 && LOTE_ZAP <= 60);
});

test("mudar busca, categoria ou ordem volta ao primeiro lote, inclusive ao desfazer o filtro", () => {
  const SEM_FILTRO = JSON.stringify(["", null, "recent"]);
  const UMA_CATEGORIA = JSON.stringify(["", "Agro", "recent"]);
  // Cada render grava no estado o que paginacaoDaChave devolve, como o ZapPbaClient faz.
  let estado: PaginacaoZap = { chave: SEM_FILTRO, limite: LOTE_ZAP };
  estado = maisUmLote(estado, SEM_FILTRO);
  estado = maisUmLote(estado, SEM_FILTRO);
  assert.equal(estado.limite, 3 * LOTE_ZAP);
  assert.equal(paginacaoDaChave(estado, SEM_FILTRO), estado, "filtro igual: o estado não muda e o render não se repete");

  // Caso relatado na revisão do PR 56: lista aberta até 144, categoria com um único
  // resultado (nenhum "Mostrar mais" acontece nela) e categoria limpa de novo.
  estado = paginacaoDaChave(estado, UMA_CATEGORIA);
  assert.deepEqual(estado, { chave: UMA_CATEGORIA, limite: LOTE_ZAP });
  estado = paginacaoDaChave(estado, SEM_FILTRO);
  assert.deepEqual(estado, { chave: SEM_FILTRO, limite: LOTE_ZAP });

  // "Mostrar mais" com o filtro recém-trocado soma ao primeiro lote da combinação nova.
  assert.deepEqual(maisUmLote({ chave: SEM_FILTRO, limite: 3 * LOTE_ZAP }, UMA_CATEGORIA), {
    chave: UMA_CATEGORIA,
    limite: 2 * LOTE_ZAP,
  });
});

function esperar(ms: number) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

test("o clique no WhatsApp envia o incremento ao Supabase, e a ficha editorial não", async () => {
  const corpos: unknown[] = [];
  let chegou: () => void = () => undefined;
  const primeiraChamada = new Promise<void>((resolver) => {
    chegou = resolver;
  });
  const cliente = createClient("http://supabase.teste", "chave-de-teste", {
    global: {
      fetch: async (entrada: RequestInfo | URL, init?: RequestInit) => {
        corpos.push({ url: String(entrada), corpo: JSON.parse(String(init?.body)) });
        chegou();
        return new Response(null, { status: 204 });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const incrementar = (id: string) => cliente.rpc("increment_click_count", { establishment_id: id });

  // O construtor do supabase-js só dispara a requisição no .then(): criado e
  // descartado com `void`, como o ZapPbaClient fazia, não envia nada.
  void incrementar("descartado");
  await esperar(50);
  assert.deepEqual(corpos, []);

  registrarContato({ id: "/escritorio-exemplo", editorial: true }, incrementar);
  registrarContato({ id: "c1" }, incrementar);
  await Promise.race([primeiraChamada, esperar(2000)]);
  await esperar(50);
  assert.deepEqual(corpos, [
    { url: "http://supabase.teste/rest/v1/rpc/increment_click_count", corpo: { establishment_id: "c1" } },
  ]);
});

test("a falha do incremento não vira erro solto no navegador", async () => {
  const soltas: unknown[] = [];
  const ouvir = (motivo: unknown) => soltas.push(motivo);
  process.on("unhandledRejection", ouvir);
  try {
    assert.doesNotThrow(() => registrarContato({ id: "c2" }, () => Promise.reject(new Error("rede fora do ar"))));
    await esperar(20);
  } finally {
    process.off("unhandledRejection", ouvir);
  }
  assert.deepEqual(soltas, []);
});
