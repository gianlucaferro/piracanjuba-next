/// <reference lib="deno.ns" />

import {
  CAMARA_LEIS_URL,
  collectMunicipalLaws,
  fetchCamaraLaws,
  fetchPrefeituraLaws,
  isRetiredWordPressUrl,
  lawDate,
  lawIdentity,
  lawNumber,
  normalizePrefeituraLaw,
  parseCamaraLawPage,
  selectMunicipalLaws,
} from "./municipal-laws.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}
async function rejects(run: () => Promise<unknown>, match: string) {
  try {
    await run();
  } catch (error) {
    if (error instanceof Error && error.message.includes(match)) return;
    throw error;
  }
  throw new Error("Esperava falha");
}

const prefeitura = {
  chave: "documento$publico",
  numero: "LEI 2.254/2025",
  data_publicacao: "2025-12-22",
  ementa: "AUTORIZA SUBVENÇÃO MUNICIPAL.",
  tipo_id: 5,
  url:
    "https://api.centi.com.br/portal/v2/documento/go/piracanjuba/download/documento/LEI_2.25425.PDF",
};
const page = (number: string, total = 1) =>
  `<table data-result="${total}"><tbody><tr><td>LEI ${number}</td><td>SA&#xDA;DE &amp; EDUCAÇÃO</td><td>21/08/2026</td><td><a href="/download/publico/lei.pdf">Documento</a></td></tr></tbody></table>`;

Deno.test("identidade une formatos sem alterar o número declarado nem aceitar data como lei", () => {
  equal(lawIdentity("Lei Municipal Nº 2.254/2025"), lawIdentity("2254 / 2025"));
  equal(lawIdentity("LEI 02/1977"), "2/1977");
  equal(lawNumber("LEI 2.160/2024\t"), "2.160/2024");
  equal(lawNumber("15/12/2021"), null);
  equal(lawNumber("LEI 2..254/2025"), null);
  equal(lawNumber("LEI 2.25/2025"), null);
  equal(lawNumber("DECRETO 2254/2025"), null);
  equal(lawNumber("LEI COMPLEMENTAR 2254/2025"), null);
});

Deno.test("datas inválidas da fonte não viram datas válidas no banco", () => {
  equal(lawDate("31/02/2026"), null);
  equal(lawDate("2026-02-29"), null);
  equal(lawDate("29/02/2024"), "2024-02-29");
});

Deno.test("prefeitura preserva link documental oficial e não interpreta categoria externa", () => {
  equal(normalizePrefeituraLaw(prefeitura), {
    numero: "2.254/2025",
    ementa: prefeitura.ementa,
    data_publicacao: "2025-12-22",
    fonte_url: prefeitura.url,
    orgao: "Prefeitura Municipal",
  });
  equal(normalizePrefeituraLaw({ ...prefeitura, tipo_id: 4 }), null);
  equal(normalizePrefeituraLaw({ ...prefeitura, numero: "15/12/2021" }), null);
});

Deno.test("fallback de rastreabilidade gera página oficial com a chave, ano, mês e tipo", () => {
  const normalized = normalizePrefeituraLaw({
    ...prefeitura,
    url:
      "https://api.centi.com.br/portal/v2/documento/go/outromunicipio/download/id/lei.pdf",
  });
  equal(
    normalized?.fonte_url,
    "https://acessoainformacao.piracanjuba.go.gov.br/legislacao/lei_cnt/id=documento%24publico__2025__12__5",
  );
});

Deno.test("Câmara lê tabela e documentos relativos, preservando a numeração oficial", () => {
  const parsed = parseCamaraLawPage(page("2.298/2026"), CAMARA_LEIS_URL);
  equal(parsed, {
    laws: [{
      numero: "2.298/2026",
      ementa: "SAÚDE & EDUCAÇÃO",
      data_publicacao: "2026-08-21",
      fonte_url:
        "https://camarapiracanjuba.centi.com.br/download/publico/lei.pdf",
      orgao: "Câmara Municipal",
    }],
    total: 1,
    fetched: 1,
    rejected: 0,
  });
});

Deno.test("Câmara não aceita HTML de erro ou tabela inválida como catálogo vazio bem sucedido", async () => {
  await rejects(
    () =>
      fetchCamaraLaws(async () =>
        new Response("<h1>Forbidden</h1>", { status: 403 })
      ),
    "HTTP 403",
  );
  await rejects(
    () =>
      fetchCamaraLaws(async () =>
        new Response("<html>portal em manutenção</html>")
      ),
    "sem tabela",
  );
});

Deno.test("Câmara completa paginação até total e não interrompe silenciosamente em 800 leis", async () => {
  const requests: string[] = [];
  const source = await fetchCamaraLaws(async (url) => {
    requests.push(String(url));
    return new Response(page(`${requests.length}/2026`, 3));
  });
  equal(source.fetched, 3);
  equal(source.pages, 3);
  equal(new URL(requests[1]).searchParams.get("pagina"), "2");
  equal(new URL(requests[1]).pathname, "/transparencia/atosadministrativos");
  equal(new URL(requests[1]).searchParams.get("id"), "5");
  equal(new URL(requests[0]).searchParams.get("itensporpagina"), "1000");
});

Deno.test("Câmara detecta página repetida e falha intermediária", async () => {
  await rejects(
    () => fetchCamaraLaws(async () => new Response(page("1/2026", 2))),
    "repetida",
  );
  let count = 0;
  await rejects(
    () =>
      fetchCamaraLaws(async () =>
        ++count === 1
          ? new Response(page("1/2026", 2))
          : new Response("erro", { status: 500 })
      ),
    "página 2",
  );
});

Deno.test("Prefeitura pagina usando cardinalidade recebida e contabiliza registro inválido", async () => {
  const offsets: number[] = [];
  const result = await fetchPrefeituraLaws(async (offset) => {
    offsets.push(offset);
    return {
      rows: offset ? [{ ...prefeitura, numero: "15/12/2021" }] : [prefeitura],
      total: 2,
    };
  });
  equal(offsets, [0, 1]);
  equal([result.fetched, result.total, result.rejected, result.laws.length], [
    2,
    2,
    1,
    1,
  ]);
});

Deno.test("Prefeitura recusa total ausente, página repetida e fim incompleto", async () => {
  await rejects(
    () => fetchPrefeituraLaws(async () => ({ rows: [], total: null })),
    "total",
  );
  await rejects(
    () => fetchPrefeituraLaws(async () => ({ rows: [prefeitura], total: 2 })),
    "repetida",
  );
  await rejects(
    () =>
      fetchPrefeituraLaws(async (offset) => ({
        rows: offset ? [] : [prefeitura],
        total: 2,
      })),
    "vazia",
  );
});

Deno.test("falha da Prefeitura mantém coleta da Câmara e expõe erro parcial", async () => {
  const camara = await fetchCamaraLaws(async () =>
    new Response(page("2.292/2026"))
  );
  const result = await collectMunicipalLaws(async () => {
    throw new Error("fonte indisponível");
  }, async () => camara);
  equal(result.sources.map((source) => source.source), ["camara"]);
  equal(result.errors, ["Prefeitura: fonte indisponível"]);
});

Deno.test("reparo de rastreabilidade atinge apenas páginas WordPress retiradas", () => {
  equal(
    isRetiredWordPressUrl(
      "https://piracanjuba.go.gov.br/leis-municipais/lei-2254/",
    ),
    true,
  );
  equal(
    isRetiredWordPressUrl(
      "https://piracanjuba.go.gov.br.evil.test/leis-municipais/lei-2254/",
    ),
    false,
  );
  equal(
    isRetiredWordPressUrl(
      "https://camarapiracanjuba.centi.com.br/download/publico/lei.pdf",
    ),
    false,
  );
});

Deno.test("Câmara normaliza número e ementa invertidos no acervo histórico", () => {
  const html = page("1.290/2007").replace(
    "<td>LEI 1.290/2007</td><td>SA&#xDA;DE &amp; EDUCAÇÃO</td>",
    "<td>SA&#xDA;DE &amp; EDUCAÇÃO</td><td>LEI 1.290/2007</td>",
  );
  const parsed = parseCamaraLawPage(html, CAMARA_LEIS_URL);
  equal(parsed.laws[0].numero, "1.290/2007");
  equal(parsed.laws[0].ementa, "SAÚDE & EDUCAÇÃO");
});

Deno.test("não une leis distintas por numeração igual ou diferença de publicação", () => {
  const first = normalizePrefeituraLaw(prefeitura)!;
  const second = {
    ...first,
    numero: "2254/2025",
    ementa: "CRIA A SECRETARIA DE EDUCAÇÃO MUNICIPAL.",
  };
  const selection = selectMunicipalLaws([{ laws: [first] }, {
    laws: [second],
  }]);
  equal(selection.laws.size, 0);
  equal(selection.conflicts, ["2254/2025"]);
  equal(
    selectMunicipalLaws([{
      laws: [first, { ...first, data_publicacao: "2025-12-23" }],
    }]).conflicts,
    ["2254/2025"],
  );
});

Deno.test("deduplicação mantém fonte principal quando o texto só muda formato ou está truncado", () => {
  const first = {
    ...normalizePrefeituraLaw(prefeitura)!,
    ementa:
      "AUTORIZA O PODER EXECUTIVO MUNICIPAL SUBVENCIONAR A ASSOCIAÇÃO FAMILIAR DE PIRACANJUBA.",
  };
  const second = {
    ...first,
    numero: "2254/2025",
    ementa: first.ementa.slice(0, 75).toLowerCase(),
    fonte_url: "https://camarapiracanjuba.centi.com.br/download/arquivo.pdf",
  };
  const selection = selectMunicipalLaws([{ laws: [first] }, {
    laws: [second],
  }]);
  equal(selection.conflicts, []);
  equal(selection.laws.size, 1);
  equal(selection.laws.get("2254/2025")?.fonte_url, first.fonte_url);
});
