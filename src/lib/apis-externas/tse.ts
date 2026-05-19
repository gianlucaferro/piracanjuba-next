// TSE — Tribunal Superior Eleitoral.
// Não há API REST oficial estável para doadores; usamos os CSVs do
// portal "dados abertos" do TSE como fonte de verdade.
// Docs: https://dadosabertos.tse.jus.br/
//
// Recomendado: ingerir o CSV de prestação de contas do município
// uma vez por eleição, persistir em tse_doador_campanha.
//
// Estratégia de download (~30MB por estado, descompactado):
//   1. Listar datasets em https://dadosabertos.tse.jus.br/dataset/prestacao-de-contas-eleitorais-2024
//   2. Baixar CSV doadores: receitas_candidatos_2024_GO.csv
//   3. Filtrar por NM_UE = "PIRACANJUBA" + ANO_ELEICAO = 2024 + DS_CARGO = "VEREADOR"

export const TSE_DATASET_2024 =
  "https://dadosabertos.tse.jus.br/dataset/prestacao-de-contas-eleitorais-2024";

export type DoadorCampanha = {
  ano_eleicao: number;
  cod_eleicao: number;
  ds_eleicao: string;
  uf: string;
  municipio: string;
  cod_municipio_tse: string;
  sq_candidato: string;
  nome_candidato: string;
  cpf_candidato: string;
  ds_cargo: string;
  ds_partido: string;
  /** CPF/CNPJ do doador (mascarado pra PF) */
  nr_cpf_cnpj_doador: string;
  nome_doador: string;
  tipo_doador: "Pessoa Física" | "Pessoa Jurídica" | string;
  ds_recurso: string;
  vr_receita: number;
  dt_receita: string;
};

/**
 * Parser de linha CSV TSE (separador ";", encoding ISO-8859-1 originalmente,
 * mas a versão JSON exposta às vezes já vem UTF-8). Não baixa, só converte.
 *
 * Pra ingestão real, a edge function sync-tse-doadores faz fetch + parse + insert.
 */
export function parseLinhaDoadorCsv(headers: string[], linha: string[]): Partial<DoadorCampanha> {
  const get = (col: string) => {
    const i = headers.indexOf(col);
    return i >= 0 ? linha[i] : "";
  };
  return {
    ano_eleicao: Number(get("ANO_ELEICAO")),
    uf: get("SG_UF"),
    municipio: get("NM_UE"),
    cod_municipio_tse: get("SG_UE"),
    sq_candidato: get("SQ_CANDIDATO"),
    nome_candidato: get("NM_CANDIDATO"),
    cpf_candidato: get("NR_CPF_CANDIDATO"),
    ds_cargo: get("DS_CARGO"),
    ds_partido: get("SG_PARTIDO"),
    nr_cpf_cnpj_doador: get("NR_CPF_CNPJ_DOADOR"),
    nome_doador: get("NM_DOADOR") || get("NM_DOADOR_ORIGINARIO"),
    tipo_doador:
      get("DS_TIPO_DOADOR") || (get("NR_CPF_CNPJ_DOADOR").length > 11 ? "Pessoa Jurídica" : "Pessoa Física"),
    ds_recurso: get("DS_ORIGEM_RECEITA") || get("DS_NATUREZA_RECEITA"),
    vr_receita: Number((get("VR_RECEITA") || "0").replace(",", ".")),
    dt_receita: get("DT_RECEITA"),
  };
}
