import "server-only";
import { unstable_cache } from "next/cache";

const BCB_BASE = "https://api.bcb.gov.br/dados/serie";
const PTAX_BASE = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";

type BcbPonto = { data: string; valor: string };

async function fetchSerie(sgs: number, n = 6): Promise<BcbPonto[]> {
  const r = await fetch(`${BCB_BASE}/bcdata.sgs.${sgs}/dados/ultimos/${n}?formato=json`, {
    next: { revalidate: 21600 },
  });
  if (!r.ok) return [];
  return (await r.json()) as BcbPonto[];
}

export type IndicadoresBCB = {
  selic_diaria: { data: string; valor: number } | null;
  selic_acumulada_mes: { data: string; valor: number } | null;
  ipca_mensal: { data: string; valor: number } | null;
  ipca_acumulado_12m: number | null;
  usd_brl: { data: string; cotacao_venda: number } | null;
  // Histórico dos últimos 6 meses pra sparkline
  historico_selic: Array<{ data: string; valor: number }>;
  historico_ipca: Array<{ data: string; valor: number }>;
};

async function fetchIndicadoresBCBUncached(): Promise<IndicadoresBCB> {
  const out: IndicadoresBCB = {
    selic_diaria: null,
    selic_acumulada_mes: null,
    ipca_mensal: null,
    ipca_acumulado_12m: null,
    usd_brl: null,
    historico_selic: [],
    historico_ipca: [],
  };

  await Promise.allSettled([
    // SELIC diária (sgs.11) — taxa ao dia em %
    fetchSerie(11, 5).then((pts) => {
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        out.selic_diaria = { data: last.data, valor: parseFloat(last.valor) };
      }
    }),
    // SELIC acumulada no mês (sgs.4390) — percentual mensal
    fetchSerie(4390, 6).then((pts) => {
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        out.selic_acumulada_mes = { data: last.data, valor: parseFloat(last.valor) };
        out.historico_selic = pts.map((p) => ({ data: p.data, valor: parseFloat(p.valor) }));
      }
    }),
    // IPCA mensal (sgs.433)
    fetchSerie(433, 12).then((pts) => {
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        out.ipca_mensal = { data: last.data, valor: parseFloat(last.valor) };
        out.historico_ipca = pts.map((p) => ({ data: p.data, valor: parseFloat(p.valor) }));
        // IPCA acumulado 12 meses: soma simples dos últimos 12 meses
        const soma = pts.reduce((s, p) => s + parseFloat(p.valor), 0);
        out.ipca_acumulado_12m = soma;
      }
    }),
    // Câmbio USD/BRL via PTAX
    (async () => {
      try {
        // Busca últimos 5 dias úteis
        const hoje = new Date();
        const datas = [];
        for (let i = 0; datas.length < 3 && i < 10; i++) {
          const d = new Date(hoje);
          d.setDate(d.getDate() - i);
          const dow = d.getDay();
          if (dow !== 0 && dow !== 6) {
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            datas.push(`${mm}-${dd}-${d.getFullYear()}`);
          }
        }
        for (const data of datas) {
          const r = await fetch(
            `${PTAX_BASE}/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${data}'&$format=json&$top=1`,
            { next: { revalidate: 21600 } },
          );
          if (!r.ok) continue;
          const j = await r.json();
          const vals = j.value ?? [];
          if (vals.length > 0) {
            out.usd_brl = {
              data: data,
              cotacao_venda: vals[0].cotacaoVenda,
            };
            break;
          }
        }
      } catch { /* silencioso */ }
    })(),
  ]);

  return out;
}

export const fetchIndicadoresBCB = unstable_cache(
  fetchIndicadoresBCBUncached,
  ["indicadores-bcb"],
  { revalidate: 21600, tags: ["indicadores-bcb"] }, // 6h
);
