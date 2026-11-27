// Cartão de compartilhamento genérico (sem logo) de uma ficha do Zap PBA, 1200x630, no padrão
// dos cartões do guia: painel na cor da categoria, "Piracanjuba.ai", nome em DM Serif Text,
// atividade em Plus Jakarta Sans e a foto de setor da ficha à direita (ou a Praça do Relógio).
// Calibrado em 2026-11-26 contra os cartões existentes (diferença de 1 a 3 px).
//
// Uso (pesado: rode na GianlucaGamer com desktop-run, a partir da raiz do repo):
//   node scripts/zap-pba/cartao-ficha.mjs <slug> [<slug> ...]
// Grava public/marcas-zap/compartilhar/<slug>.jpg. Precisa de rede para a Plus Jakarta Sans
// (Google Fonts). Usado ao rebaixar landings (docs/empresa-recusou-landing.md).
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const slugs = process.argv.slice(2);
if (!slugs.length) throw new Error("Informe ao menos um slug do guia.");
const catalogo = JSON.parse(readFileSync("src/data/previas-zap.json", "utf8"));
const categorias = readFileSync("src/app/zap-pba/[slug]/categorias.ts", "utf8");
function corDaCategoria(setor) {
  const nome = setor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const achou = categorias.match(new RegExp(`\\n\\s*"?${nome}"?: \\{ cor: "(#[0-9a-f]{6})"`));
  const padrao = categorias.match(/const padrao[^{]*\{ cor: "(#[0-9a-f]{6})"/);
  return (achou ?? padrao)[1];
}
const dataUrl = (path, tipo) => `data:${tipo};base64,${readFileSync(path).toString("base64")}`;
const specs = slugs.map((slug) => {
  const ficha = catalogo.find((item) => item.slug === slug);
  if (!ficha) throw new Error(`${slug} não está em src/data/previas-zap.json`);
  if (ficha.logo) throw new Error(`${slug} tem logo: este gerador é só para fichas sem logo`);
  const foto = ficha.foto ?? "/historia/praca-do-relogio.jpg";
  return { slug, nome: ficha.nome, atividade: ficha.atividade, cor: ficha.cor ?? corDaCategoria(ficha.setor), foto, pesoAtividade: 400 };
});
const dmSerif = dataUrl("src/app/zap-pba/[slug]/fontes/DMSerifText-Regular.ttf", "font/ttf");
const fotos = Object.fromEntries(specs.map((s) => [s.slug, dataUrl("public" + s.foto, s.foto.endsWith(".webp") ? "image/webp" : "image/jpeg")]));

const html = `<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500&display=block">
<style>@font-face{font-family:"DMS";src:url(${dmSerif})}</style></head><body><canvas id=c width=1200 height=630></canvas></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  await document.fonts.load('40px "DMS"');
  await document.fonts.load('400 24px "Plus Jakarta Sans"');
});
for (const spec of specs) {
  const png = await page.evaluate(async ({ spec, foto }) => {
    const c = document.getElementById("c"); const g = c.getContext("2d");
    const creme = "#fffef7";
    const ink = (texto, fonte) => { g.font = fonte; const m = g.measureText(texto); return { w: m.actualBoundingBoxRight + m.actualBoundingBoxLeft, asc: m.actualBoundingBoxAscent, left: m.actualBoundingBoxLeft }; };
    // Calibração pelo cartão de referência (Agro Diesel): larguras de tinta medidas no JPEG.
    const esc = (texto, fam, alvo) => { const w = ink(texto, `100px ${fam}`).w; return 100 * alvo / w; };
    const tamCab = esc("Piracanjuba.ai", '"DMS"', 247);
    const tamNome = esc("Agro Diesel", '"DMS"', 442);
    const tamAtiv = 0.955 * esc("Agropecuária", `${spec.pesoAtividade} "Plus Jakarta Sans"`, 193);
    g.fillStyle = spec.cor; g.fillRect(0, 0, 1200, 630);
    // Foto de setor à direita, em cover.
    const img = new Image(); img.src = foto; await img.decode();
    const W = 484, H = 630, X = 716; const r = Math.max(W / img.width, H / img.height);
    const sw = W / r, sh = H / r; g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, X, 0, W, H);
    g.fillStyle = spec.cor; g.fillRect(0, 0, X, 630);
    g.fillStyle = creme; g.textBaseline = "alphabetic";
    // Cabeçalho, filete, nome, traço curto e atividade.
    const cab = ink("Piracanjuba.ai", `${tamCab}px "DMS"`); g.fillText("Piracanjuba.ai", 56 + cab.left, 45 + cab.asc);
    g.globalAlpha = 0.6; g.fillRect(55, 105, 607, 1); g.globalAlpha = 1;
    const palavras = spec.nome.split(" "); const MAX = 520;
    let linhas = null, tam = tamNome;
    for (let n = 1; n <= 3 && !linhas; n++) {
      tam = n === 3 ? tamNome * 58 / 62 : tamNome;
      const fonte = `${tam}px "DMS"`; let melhor = null;
      const cortes = (ini, resto) => resto === 1 ? [[palavras.slice(ini).join(" ")]] : palavras.slice(ini, -1).flatMap((_, k) => cortes(ini + k + 1, resto - 1).map((t) => [palavras.slice(ini, ini + k + 1).join(" "), ...t]));
      for (const opc of (n <= palavras.length ? cortes(0, n) : [])) {
        const ws = opc.map((l) => ink(l, fonte).w); const max = Math.max(...ws);
        if (max > MAX) continue;
        if (!melhor || max < melhor.max || (max === melhor.max && ws[ws.length - 1] > melhor.ultimo)) melhor = { opc, max, ultimo: ws[ws.length - 1] };
      }
      if (melhor) linhas = melhor.opc;
    }
    if (!linhas) throw new Error("nome não coube: " + spec.nome);
    const fonteNome = `${tam}px "DMS"`; g.font = fonteNome;
    const cap = ink("H", fonteNome).asc; const passo = linhas.length === 3 ? 85 : 92;
    const altura = cap + passo * (linhas.length - 1); const topo = Math.round((linhas.length === 3 ? 329.5 : 331.5) - altura / 2);
    linhas.forEach((l, i) => { const m = ink(l, fonteNome); g.fillText(l, 55 + m.left, topo + cap + passo * i); });
    g.fillRect(55, 508, 60, 3);
    const at = ink(spec.atividade, `${spec.pesoAtividade} ${tamAtiv}px "Plus Jakarta Sans"`);
    g.font = `${spec.pesoAtividade} ${tamAtiv}px "Plus Jakarta Sans"`;
    const capAt = ink("H", g.font).asc; g.fillText(spec.atividade, 55 + at.left, 538 + capAt);
    return c.toDataURL("image/jpeg", 0.86);
  }, { spec, foto: fotos[spec.slug] });
  writeFileSync(`public/marcas-zap/compartilhar/${spec.slug}.jpg`, Buffer.from(png.split(",")[1], "base64"));
  console.log("cartão gravado:", spec.slug, spec.cor);
}
await browser.close();
