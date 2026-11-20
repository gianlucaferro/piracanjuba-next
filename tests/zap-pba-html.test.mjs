// Mede o HTML que /zap-pba manda ao navegador, renderizando o ZapPbaClient de verdade
// com react-dom/server e uma lista sintética maior que a de produção.
//
// O componente é .tsx, que o node:test não lê sozinho: os ganchos abaixo transpilam
// os arquivos de src/ com o TypeScript do projeto, carregam os catálogos JSON
// e simulam a consulta ao Supabase, o cliente do navegador e o next/link.
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const SRC = new URL("../src/", import.meta.url);
const STUB = "zap-pba-teste:";
const STUBS = new Map([
  ["@/lib/supabase/client", "export function createBrowserSupabaseClient() { return {}; }"],
  ["@/lib/data/listings", `export async function fetchZapEstabelecimentos() {
    return [{
      id: "438f49be-eddf-478e-9092-21f88c903de3", name: "Ellen Vieira Advocacia",
      whatsapp: "5564992817816", category: "Advogados", created_at: null, click_count: 0,
    }];
  }`],
  [
    "next/link",
    // Com prefetch={false}, o Link do Next renderiza só o <a href> com as demais props.
    "import { createElement } from 'react';\n" +
      "export default function Link({ href, prefetch, ...resto }) { void prefetch; return createElement('a', { href, ...resto }); }",
  ],
]);

function arquivo(base) {
  for (const sufixo of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    const url = new URL(base + sufixo);
    if (existsSync(url) && statSync(url).isFile()) return url.href;
  }
  return null;
}

const ganchos = registerHooks({
  resolve(especificador, contexto, proximo) {
    if (STUBS.has(especificador)) return { url: STUB + especificador, shortCircuit: true };
    if (contexto.parentURL?.startsWith(STUB)) {
      return proximo(especificador, { ...contexto, parentURL: import.meta.url });
    }
    const local = especificador.startsWith("@/")
      ? arquivo(new URL(especificador.slice(2), SRC).href)
      : especificador.startsWith(".") && contexto.parentURL?.startsWith(SRC.href)
        ? arquivo(new URL(especificador, contexto.parentURL).href)
        : null;
    if (local) return { url: local, shortCircuit: true };
    return proximo(especificador, contexto);
  },
  load(url, contexto, proximo) {
    if (url.startsWith(STUB)) {
      return { format: "module", source: STUBS.get(url.slice(STUB.length)), shortCircuit: true };
    }
    if (url.startsWith(SRC.href) && url.endsWith(".json")) {
      return { format: "module", source: "export default " + readFileSync(new URL(url), "utf8"), shortCircuit: true };
    }
    if (url.startsWith(SRC.href) && /\.tsx?$/.test(url)) {
      const { outputText } = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        fileName: fileURLToPath(url),
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      });
      return { format: "module", source: outputText, shortCircuit: true };
    }
    return proximo(url, contexto);
  },
});
const { default: ZapPbaClient } = await import("../src/app/zap-pba/ZapPbaClient.tsx");
const { default: ZapPbaPage } = await import("../src/app/zap-pba/page.tsx");
const { LOTE_ZAP, fichaParaNavegador } = await import("../src/app/zap-pba/lista.ts");
const { createElement } = await import("react");
const { renderToString } = await import("react-dom/server");
ganchos.deregister();

test("o índice renderizado no servidor liga o cadastro da Ellen à página própria", async () => {
  const guia = renderToString(await ZapPbaPage());
  assert.match(guia, /<li[^>]*><a[^>]*href="\/evadvocacia"[^>]*>Ellen Vieira Advocacia<\/a><\/li>/);
  assert.ok(!guia.includes("/zap-pba/ellen-vieira-advocacia"));
});

// Partes fixas da página fora do ZapPbaClient (head, cabeçalho, rodapé, scripts do
// Next e o restante do payload RSC). Medido em https://piracanjuba.ai/zap-pba em
// 2026-11-19: 2.468.730 bytes no total, menos 2.280.136 do <main> e 110.512 das
// fichas no payload = 78.082 bytes. Arredondado para cima.
const CASCA_FIXA = 80_000;
// Meta da auditoria (DOM-01): cerca de 500 KB por página, nunca acima de 2 MB.
const META = 500_000;
const TOTAL = 450; // 423 cadastros em produção em 2026-11-19, com folga

const CATEGORIAS = [
  "Alimentação", "Supermercados", "Saúde", "Beleza e Estética", "Farmácia e Drogaria", "Advogados",
  "Educação", "Esportes", "Automotivo", "Agro", "Moda e Vestuário", "Serviços Especializados",
  "Materiais de Construção", "Móveis e Decoração", "Pet Shop", "Veterinários", "Personal Trainer",
  "Imobiliário", "Hospedagem e Turismo", "Papelaria e Presentes", "Artesanato", "Serviços Gerais",
  "Tecnologia", "Outros",
];
const PALAVRAS = ["Padaria", "Ótica", "Mercearia", "Açaí", "Estúdio", "Oficina", "Clínica", "Distribuidora", "Ateliê"];
const SOBRENOMES = ["São João", "Boa Vista", "Central", "Piracanjuba", "Esperança", "Goiás", "Família Souza"];
const AGORA = Date.parse("2026-11-19T15:00:00Z");

function slug(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Perfil de produção em 2026-11-19: nome médio de 24 letras, 388 de 423 com página,
// 24 categorias e 9 cadastros sem categoria, 170 com contatos registrados.
const fichas = Array.from({ length: TOTAL }, (_, i) => {
  const name = `${PALAVRAS[i % PALAVRAS.length]} ${SOBRENOMES[i % SOBRENOMES.length]} ${i + 1}`;
  return fichaParaNavegador(
    {
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      name,
      whatsapp: `6499${String(1000000 + i * 7919).slice(-7)}`,
      category: i % 50 === 7 ? null : CATEGORIAS[i % CATEGORIAS.length],
      click_count: i % 5 < 2 ? (i % 37) + 1 : 0,
      created_at: new Date(AGORA - (i % 40) * 24 * 60 * 60 * 1000).toISOString(),
      ...(i % 12 === 0 ? {} : { pagina: `/zap-pba/${slug(name)}` }),
    },
    AGORA,
  );
});

const props = { initialEstabelecimentos: fichas, dataReferencia: "2026-11-19", listaCarregada: true };
const html = renderToString(createElement(ZapPbaClient, props));
const bytesHtml = Buffer.byteLength(html, "utf8");
// O Next envia as props do componente cliente dentro de uma string JS no HTML
// (self.__next_f.push). Conferido em produção: a fórmula dá 110.459 bytes para os
// 110.512 medidos.
const bytesPayload = Buffer.byteLength(JSON.stringify(JSON.stringify(props)), "utf8");

function contar(texto, trecho) {
  return texto.split(trecho).length - 1;
}

test(`com ${TOTAL} estabelecimentos, a página fica dentro da meta de 500 KB`, () => {
  const total = bytesHtml + bytesPayload + CASCA_FIXA;
  console.log(
    `HTML do ZapPbaClient: ${bytesHtml} bytes; fichas no payload: ${bytesPayload} bytes; ` +
      `casca fixa: ${CASCA_FIXA} bytes; estimativa da página: ${total} bytes`,
  );
  assert.ok(total <= META, `estimativa de ${total} bytes passa da meta de ${META}`);
  assert.ok(bytesHtml < 250_000, `o componente sozinho gerou ${bytesHtml} bytes`);
});

test("o servidor renderiza só o primeiro lote de cartões, com botão para o resto", () => {
  assert.equal(contar(html, 'aria-label="Falar com '), LOTE_ZAP);
  assert.match(html, new RegExp(`Mostrar mais estabelecimentos \\((<!-- -->)?${TOTAL - LOTE_ZAP}(<!-- -->)?\\)`));
});

test("todo estabelecimento continua no HTML, com link rastreável", () => {
  for (const ficha of fichas) {
    assert.ok(html.includes(`>${ficha.name}</`), `nome ausente do HTML: ${ficha.name}`);
    if (ficha.pagina) {
      assert.ok(html.includes(`href="${ficha.pagina}"`), `link ausente do HTML: ${ficha.pagina}`);
    }
  }
  const semPagina = fichas.filter((ficha) => !ficha.pagina);
  assert.ok(semPagina.length > 0);
  for (const ficha of semPagina) {
    assert.ok(html.includes(`href="https://wa.me/55${ficha.whatsapp}?`), `WhatsApp ausente: ${ficha.name}`);
  }
});

test("os ícones repetidos saem de um sprite declarado uma vez", () => {
  // Trecho do desenho do WhatsApp: antes aparecia uma vez por cartão (1,4 KB cada).
  assert.equal(contar(html, "M17.472 14.382"), 1);
  assert.equal(contar(html, "<symbol "), contar(html, "</symbol>"));
  for (const id of ["zap-i-wa", "zap-i-compartilhar", "zap-i-sugerir", "zap-i-contatos", "zap-i-detalhes"]) {
    assert.equal(contar(html, `id="${id}"`), 1, `símbolo ${id}`);
  }
  // Fora do sprite só ficam os poucos ícones inline do topo (busca, ordem, cadastro).
  const foraDoSprite = html.slice(html.indexOf("</svg>", html.lastIndexOf("</symbol>")) + "</svg>".length);
  assert.ok(contar(foraDoSprite, "<path") <= 15, `${contar(foraDoSprite, "<path")} desenhos fora do sprite`);
  // Cada cartão tem no máximo 6 ícones; fora deles, cabeçalho, busca e botões.
  assert.ok(contar(foraDoSprite, "<svg") <= LOTE_ZAP * 6 + 10);
  const usos = [...html.matchAll(/<use href="#([^"]+)"/g)].map((m) => m[1]);
  const declarados = new Set([...html.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]));
  assert.ok(usos.length > LOTE_ZAP);
  for (const id of usos) assert.ok(declarados.has(id), `<use> sem <symbol>: ${id}`);
});

test("o topo responde com número, categorias, data e origem dos dados", () => {
  assert.match(
    html,
    new RegExp(`O Zap PBA reúne o WhatsApp de ${TOTAL} estabelecimentos de Piracanjuba, GO, em 24 categorias, com números cadastrados no portal e publicados após análise \\(lista atualizada em 2026-11-19\\)`),
  );
  assert.ok(html.includes(`Os ${TOTAL} estabelecimentos do guia, em ordem alfabética.`));
});

test("nem o topo nem o rodapé atribuem os números aos próprios estabelecimentos", () => {
  // O formulário aceita qualquer visitante, sem provar que é o dono, e a ficha do
  // escritório entra pelo próprio portal.
  assert.doesNotMatch(html, /próprios estabelecimentos/);
  assert.ok(html.includes("Os números são cadastrados no portal e publicados após análise."));
});

// Ficha que page.tsx acrescenta quando nenhum cadastro aprovado é o do escritório.
const editorial = fichaParaNavegador(
  {
    id: "/escritorio-exemplo",
    editorial: true,
    name: "Escritório Exemplo",
    whatsapp: "5564999990000",
    category: "Advogados",
    click_count: null,
    created_at: null,
    pagina: "/escritorio-exemplo",
  },
  AGORA,
);

test("com o Supabase fora do ar, só a ficha editorial e nenhuma contagem afirmada", () => {
  // fetchZapEstabelecimentos devolve [] com erro do banco; page.tsx manda só a ficha
  // editorial e listaCarregada falso.
  const semBanco = renderToString(
    createElement(ZapPbaClient, {
      initialEstabelecimentos: [editorial],
      dataReferencia: "2026-11-19",
      listaCarregada: false,
    }),
  );
  assert.ok(semBanco.includes("WhatsApps de comércios e serviços locais de Piracanjuba."), "subtítulo antigo ausente");
  assert.doesNotMatch(semBanco, /reúne o WhatsApp de/);
  assert.doesNotMatch(semBanco, /Os 1 estabelecimentos/);
  assert.ok(semBanco.includes("Estabelecimentos do guia, em ordem alfabética."));
  assert.ok(semBanco.includes(`href="${editorial.pagina}"`), "a ficha editorial continua no HTML");
});

test("com um único cadastro vindo do banco, o topo e o índice usam o singular", () => {
  const umSo = renderToString(
    createElement(ZapPbaClient, {
      initialEstabelecimentos: [editorial],
      dataReferencia: "2026-11-19",
      listaCarregada: true,
    }),
  );
  assert.match(umSo, /O Zap PBA reúne o WhatsApp de 1 estabelecimento de Piracanjuba, GO, em 1 categoria, /);
  assert.ok(umSo.includes("O único estabelecimento do guia."));
  assert.doesNotMatch(umSo, /Os 1 estabelecimentos/);
});
