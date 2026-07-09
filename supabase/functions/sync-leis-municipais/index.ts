import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WP_API = "https://piracanjuba.go.gov.br/wp-json/wp/v2";
const TIPO_LEI_MUNICIPAL_ID = 56;

// Fonte complementar (2026-07): o WP da Prefeitura parou de publicar leis em 2024.
// O portal da Câmara (Centi) tem as leis recentes: código 5 = LEIS MUNICIPAIS.
const CENTI_LEIS_URL = "https://camarapiracanjuba.centi.com.br/transparencia/atosadministrativos/5";
const UA_BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function decodeCenti(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

type LeiCenti = { numero: string; ementa: string; data_publicacao: string | null; fonte_url: string };

async function scrapeLeisCenti(): Promise<LeiCenti[]> {
  const out: LeiCenti[] = [];
  for (let pagina = 1; pagina <= 80; pagina++) {
    const r = await fetch(`${CENTI_LEIS_URL}?pagina=${pagina}`, { headers: { "User-Agent": UA_BROWSER } });
    if (!r.ok) break;
    const html = await r.text();
    const tb = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!tb) break;
    const trs = tb[1].split(/<tr[^>]*>/i).filter((x) => x.includes("<td"));
    if (trs.length === 0) break;
    for (const tr of trs) {
      const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => decodeCenti(m[1]));
      // D: "LEI 2.278/2026" | O: ementa | data
      const m = (cells[0] ?? "").match(/LEI\s+([\d.]+\/\d{4})/i);
      if (!m) continue;
      const dm = (cells.find((c) => /\d{2}\/\d{2}\/\d{4}/.test(c)) ?? "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const link = (tr.match(/href="([^"]+\/download\/[^"]+)"/i) ?? [])[1] ?? null;
      out.push({
        numero: m[1],
        ementa: (cells[1] ?? cells[0] ?? "").slice(0, 2000),
        data_publicacao: dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : null,
        fonte_url: link ? decodeCenti(link) : `${CENTI_LEIS_URL}?pagina=${pagina}`,
      });
    }
    if (trs.length < 10) break;
    await delay(350);
  }
  return out;
}

async function fetchLeiPage(url: string): Promise<{ ementa: string; data_pub: string | null }> {
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "piracanjuba.ai/1.0" } });
    if (!resp.ok) return { ementa: "", data_pub: null };
    const html = await resp.text();

    // Extract ementa from jet-listing-dynamic-field__content after "Ementa da Lei"
    let ementa = "";
    const ementaSection = html.match(/Ementa da Lei[\s\S]*?jet-listing-dynamic-field__content[^>]*>([\s\S]*?)<\/div>/i);
    if (ementaSection) {
      ementa = ementaSection[1].replace(/<[^>]+>/g, "").trim();
    }
    if (!ementa) {
      const altMatch = html.match(/jet-listing-dynamic-field__content[^>]*>([^<]{20,})<\/div>/i);
      if (altMatch) ementa = altMatch[1].trim();
    }
    // Remove leading "LEI MUNICIPAL Nº XXX/YYYY - " prefix
    ementa = ementa.replace(/^LEI\s+MUNICIPAL\s+N[ºo°]\s*\S+\s*[-–]\s*/i, "").trim();

    // Extract date
    const dateMatch = html.match(/Data da Promulga[çc]\w+[\s\S]*?jet-listing-dynamic-field__content[^>]*>(\d{2}\/\d{2}\/\d{4})/i);
    let data_pub: string | null = null;
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split("/");
      data_pub = `${y}-${m}-${d}`;
    }

    return { ementa, data_pub };
  } catch (e) {
    console.error(`Error fetching ${url}:`, e);
    return { ementa: "", data_pub: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    let allPosts: any[] = [];
    let wpErro: string | null = null;
    // Fase 1 — WP da Prefeitura (histórico até 2024). Falha aqui não bloqueia a fase 2.
    try {
      let page = 1;
      const perPage = 100;

      while (true) {
        const url = `${WP_API}/leis-municipais?tipo-de-lei=${TIPO_LEI_MUNICIPAL_ID}&per_page=${perPage}&page=${page}`;
        console.log(`Fetching page ${page}: ${url}`);
        const resp = await fetch(url, { headers: { "User-Agent": "piracanjuba.ai/1.0" } });

        if (!resp.ok) {
          if (resp.status === 400) break;
          throw new Error(`WP API error: ${resp.status}`);
        }

        const posts = await resp.json();
        if (!posts.length) break;
        allPosts = allPosts.concat(posts);

        const totalPages = parseInt(resp.headers.get("X-WP-TotalPages") || "1");
        if (page >= totalPages) break;
        page++;
      }
    } catch (e) {
      wpErro = (e as Error).message;
      console.error("Fase WP falhou (segue pra fase Câmara):", wpErro);
    }

    console.log(`Total leis municipais from WP: ${allPosts.length}`);

    const BATCH = 10;
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < allPosts.length; i += BATCH) {
      const batch = allPosts.slice(i, i + BATCH);

      const results = await Promise.all(batch.map(async (post: any) => {
        const title = post.title?.rendered || "";
        const link = post.link || "";
        const wpDate = post.date ? post.date.split("T")[0] : null;

        const { ementa, data_pub } = await fetchLeiPage(link);

        return {
          numero: title.replace(/^Lei Municipal n[ºo]\s*/i, "").trim(),
          data_publicacao: data_pub || wpDate,
          ementa: ementa || title,
          orgao: null as string | null,
          categoria: null as string | null,
          fonte_url: link,
        };
      }));

      for (const lei of results) {
        const { data: existing } = await supabase
          .from("leis_municipais")
          .select("id")
          .eq("numero", lei.numero)
          .maybeSingle();

        if (existing) {
          await supabase.from("leis_municipais").update({
            data_publicacao: lei.data_publicacao,
            ementa: lei.ementa,
            fonte_url: lei.fonte_url,
          }).eq("id", existing.id);
          updated++;
        } else {
          const { error } = await supabase.from("leis_municipais").insert(lei);
          if (error) console.error(`Insert error for ${lei.numero}:`, error.message);
          else inserted++;
        }
      }

      console.log(`Processed ${Math.min(i + BATCH, allPosts.length)}/${allPosts.length}`);
    }

    // Fase 2 — portal da Câmara (Centi cod 5): completa as leis que o WP não tem
    // (o WP parou em 2024; a Câmara publica as leis atuais). Insere só números novos.
    let camaraInseridas = 0;
    let camaraErro: string | null = null;
    try {
      const leisCenti = await scrapeLeisCenti();
      console.log(`Leis no portal da Câmara: ${leisCenti.length}`);
      // dedup interno por numero
      const vistos = new Set<string>();
      const unicas = leisCenti.filter((l) => {
        if (vistos.has(l.numero)) return false;
        vistos.add(l.numero);
        return true;
      });
      for (const lei of unicas) {
        const { data: existing } = await supabase
          .from("leis_municipais")
          .select("id")
          .eq("numero", lei.numero)
          .maybeSingle();
        if (existing) continue; // preserva a versão existente (WP tem mais detalhe)
        const { error } = await supabase.from("leis_municipais").insert({
          numero: lei.numero,
          data_publicacao: lei.data_publicacao,
          ementa: lei.ementa,
          orgao: "Câmara Municipal",
          categoria: null,
          fonte_url: lei.fonte_url,
        });
        if (error) console.error(`Insert Câmara ${lei.numero}:`, error.message);
        else camaraInseridas++;
      }
    } catch (e) {
      camaraErro = (e as Error).message;
      console.error("Fase Câmara falhou:", camaraErro);
    }

    console.log(`Done: WP ${inserted} inserted/${updated} updated · Câmara ${camaraInseridas} inseridas`);
    return new Response(
      JSON.stringify({
        success: true, total_wp: allPosts.length, inserted, updated,
        camara_inseridas: camaraInseridas, wp_erro: wpErro, camara_erro: camaraErro,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
