const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const app = process.env.ELLEN_APP;
const { chromium } = createRequire(path.join(app, "package.json"))("playwright");
const url = new URL("/evadvocacia", process.argv[2]);
const etapa = process.argv[3];
const raiz = "https://piracanjuba.ai";
const canonical = raiz + url.pathname;
const destino = path.join(__dirname, etapa);
fs.mkdirSync(destino, {recursive:true});

async function verificar(browser, largura, altura) {
  const pagina = await browser.newPage({viewport:{width:largura,height:altura}, deviceScaleFactor:1, isMobile:largura < 700});
  await pagina.route("**/*", route => {
    const req = new URL(route.request().url());
    if (req.origin === url.origin || ["data:","blob:"].includes(req.protocol)) return route.continue();
    return route.abort();
  });
  const res = await pagina.goto(url.href,{waitUntil:"domcontentloaded", timeout:120000});
  assert.equal(res.status(),200);
  await pagina.locator("h1").waitFor({state:"attached"});
  if (etapa === "local") await pagina.addStyleTag({content:"nextjs-portal{display:none!important}"});
  await pagina.evaluate(async () => {
    await document.fonts.ready;
    const imgs = [...document.images].filter(i => i.currentSrc.includes("evadvocacia") || i.src.includes("evadvocacia"));
    await Promise.all(imgs.map(async i => { i.loading="eager"; await i.decode(); }));
  });
  const ficha = await pagina.evaluate(() => {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
    const entidades = scripts.flatMap(s=> s["@graph"] || s);
    const escopo = document.querySelector("article") || document.querySelector("main") || document.body;
    const imagens=[...document.images].filter(i => i.currentSrc.includes("evadvocacia") || i.src.includes("evadvocacia")).map(i=>({src:i.getAttribute("src"),alt:i.alt,largura:i.naturalWidth}));
    const anchors=[...escopo.querySelectorAll("a[href]")].map(a=>({nome:a.textContent.trim()||a.ariaLabel,href:a.href,altura:Math.round(a.getBoundingClientRect().height)}));
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,h1:[...document.querySelectorAll("h1")].map(x=>x.textContent.trim()),title:document.title,desc:document.querySelector('meta[name="description"]')?.content,canon:[...document.querySelectorAll('link[rel="canonical"]')].map(x=>x.href),og:document.querySelector('meta[property="og:image"]')?.content,robots:document.querySelector('meta[name="robots"]')?.content,breadcrumb:entidades.find(s=>s["@type"]==="BreadcrumbList"),legal:entidades.find(s=>s["@type"]==="LegalService"),anchors,imagens,texto:escopo.innerText,credito:[...document.querySelectorAll("footer a")].filter(a=>a.textContent.trim()==="Site desenvolvido por Ferro Labs Tecnologia LTDA").map(a=>a.href)};
  });
  fs.writeFileSync(path.join(destino,"medidas-"+largura+".json"),JSON.stringify(ficha,null,2));
  assert.equal(ficha.scroll,largura,"overflow");
  assert.equal(ficha.h1.length,1);
  assert.deepEqual(ficha.canon,[canonical]);
  assert.match(ficha.og,/^https:\/\/piracanjuba\.ai\/empresas\/evadvocacia\/compartilhar\.jpg$/);
  assert.match(ficha.robots,/\bindex\b/);
  assert.match(ficha.title,/Ellen Vieira/i);
  assert.match(ficha.desc,/Piracanjuba/);
  assert.equal(ficha.breadcrumb.itemListElement.at(-1).item,canonical);
  assert.equal(ficha.legal.address.postalCode,"75640-000");
  assert.equal(ficha.legal.address.streetAddress,"Rua Moacir Teles");
  assert.equal(ficha.legal.telephone.replace(/\D/g,""),"5564992817816");
  assert.deepEqual(ficha.credito,["https://apareca.ai/"]);
  const fonte = ficha.texto.replace(/\s+/g," ");
  for(const campo of ["Direito Civil","Direito Penal","Direito do Consumidor","Direito Imobiliário","Direito Previdenciário","42.685","Moacir Teles","75640-000","99281-7816"]) assert.ok(fonte.toLowerCase().includes(campo.toLowerCase()),"Texto ausente: "+campo);
  const contatos=ficha.anchors.filter(a=>a.href.startsWith("https://wa.me/"));
  assert.ok(contatos.length>=2&&contatos.every(a=>new URL(a.href).pathname==="/5564992817816"));
  const mapa = ficha.anchors.find(a=>a.href.includes("google.com/maps"));
  assert.ok(mapa && decodeURIComponent(mapa.href.replace(/\+/g," ")).includes("Moacir Teles"),"URL do mapa");
  assert.ok(ficha.imagens.length>=3&&ficha.imagens.every(i=>i.largura>0),"carregamento das imagens");
  for (const parte of ["retrato","marca","escritorio"]) assert.ok(ficha.imagens.some(i=>i.src.includes(parte)),parte);
  await pagina.screenshot({path:path.join(destino,"tela-"+largura+".jpg"),type:"jpeg",quality:85,fullPage:true,animations:"disabled"});
  await pagina.screenshot({path:path.join(destino,"abertura-"+largura+".jpg"),type:"jpeg",quality:90,animations:"disabled"});
  await pagina.close();
  return {largura,altura,imagens:ficha.imagens.length,linksWhatsapp:contatos.length,titulo:ficha.title};
}
(async () => {
 const browser=await chromium.launch({headless:true});
 try {
   const checks=[];
   for (const tamanho of [[1440,900],[390,844],[320,740],[768,1024]]) checks.push(await verificar(browser,...tamanho));
   console.log(JSON.stringify(checks,null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
