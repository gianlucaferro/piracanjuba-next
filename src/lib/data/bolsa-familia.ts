import "server-only";
import { unstable_cache } from "next/cache";
import { bolsaFamiliaPorMunicipio, auxilioBrasilPorMunicipio } from "@/lib/apis-externas/portal-transparencia";

// Código IBGE de Piracanjuba-GO. (5217005 é Piranhas-GO, município errado.)
const COD_IBGE_PIRACANJUBA = "5217104";

export type BolsaFamiliaMes = {
  mes_ano: string;
  ano: number;
  mes: number;
  valor: number;
  beneficiados: number;
};

/**
 * Busca os últimos N meses de Bolsa Família + Auxílio Brasil em Piracanjuba.
 * Junta os dois (BF substituiu o AB em 2023 — pode haver overlap).
 */
async function fetchBolsaFamiliaUncached(meses = 12): Promise<BolsaFamiliaMes[]> {
  const token = process.env.PORTAL_TRANSPARENCIA_TOKEN ?? "";
  if (!token) {
    console.warn("PORTAL_TRANSPARENCIA_TOKEN ausente — Bolsa Família indisponível");
    return [];
  }

  const out: BolsaFamiliaMes[] = [];
  const hoje = new Date();

  // Portal Transparência tem ~2 meses de defasagem. Começamos -2.
  for (let i = 2; i < meses + 2; i++) {
    const dt = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const ano = dt.getFullYear();
    const mes = dt.getMonth() + 1;
    const mesAno = `${ano}${String(mes).padStart(2, "0")}`;
    try {
      // Tenta BF primeiro; se vazio, cai pro Auxílio Brasil (ativo 2021-2022)
      let resp = await bolsaFamiliaPorMunicipio(token, COD_IBGE_PIRACANJUBA, mesAno);
      if (!resp || resp.length === 0) {
        resp = await auxilioBrasilPorMunicipio(token, COD_IBGE_PIRACANJUBA, mesAno);
      }
      const item = resp?.[0];
      if (item && item.valor > 0) {
        out.push({
          mes_ano: mesAno,
          ano,
          mes,
          valor: item.valor,
          beneficiados: item.quantidadeBeneficiados,
        });
      }
    } catch (e) {
      console.warn(`BF ${mesAno} falhou:`, (e as Error).message);
    }
    // Rate limit ~30 req/min
    await new Promise((r) => setTimeout(r, 200));
  }
  return out.sort((a, b) => a.mes_ano.localeCompare(b.mes_ano));
}

export const fetchBolsaFamilia = unstable_cache(
  fetchBolsaFamiliaUncached,
  ["bolsa-familia-piracanjuba"],
  { revalidate: 60 * 60 * 24, tags: ["bolsa-familia"] },
);
