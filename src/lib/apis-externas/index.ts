// Catálogo de clients HTTP para APIs públicas brasileiras + internacionais.
// Todos sem dependências externas — fetch nativo + tipos TypeScript.
//
// Referência: github.com/public-apis/public-apis
//
// Convenção: cada arquivo exporta funções puras async que retornam dados tipados.
// Cache/persistência fica nas camadas de cima (data layer / edge functions).

export * as BrasilAPI from "./brasilapi";
export * as ViaCEP from "./viacep";
export * as Nominatim from "./nominatim";
export * as IBGE from "./ibge";
export * as Sidra from "./sidra";
export * as TSE from "./tse";
export * as CNJ from "./cnj";
export * as PortalTransparencia from "./portal-transparencia";
export * as DataSUS from "./datasus";
export * as ANS from "./ans";
export * as ComprasGov from "./compras-gov";
export * as Wikidata from "./wikidata";
export * as Exchangerate from "./exchangerate";
export * as URLhaus from "./urlhaus";

/**
 * Resumo das APIs disponíveis e seus casos de uso no Piracanjuba.AI.
 * Útil pra docs e descoberta via IDE.
 */
export const CATALOGO_APIS = [
  {
    nome: "BrasilAPI",
    modulo: "BrasilAPI",
    auth: "nenhuma",
    docs: "https://brasilapi.com.br",
    usos: ["CEP", "CNPJ", "feriados", "bancos", "DDD", "IBGE municípios"],
  },
  {
    nome: "ViaCEP",
    modulo: "ViaCEP",
    auth: "nenhuma",
    docs: "https://viacep.com.br",
    usos: ["fallback de CEP"],
  },
  {
    nome: "Nominatim (OSM)",
    modulo: "Nominatim",
    auth: "User-Agent obrigatório, 1 req/s",
    docs: "https://nominatim.org",
    usos: ["geocoding endereço", "geocoding reverso lat/lon"],
  },
  {
    nome: "IBGE",
    modulo: "IBGE",
    auth: "nenhuma",
    docs: "https://servicodados.ibge.gov.br/api/docs",
    usos: ["dados do município", "população", "PIB"],
  },
  {
    nome: "SIDRA/IBGE",
    modulo: "Sidra",
    auth: "nenhuma",
    docs: "https://apisidra.ibge.gov.br",
    usos: ["rebanho bovino", "produção de leite", "PAM/PPM"],
  },
  {
    nome: "TSE",
    modulo: "TSE",
    auth: "nenhuma (CSV)",
    docs: "https://dadosabertos.tse.jus.br",
    usos: ["doadores de campanha", "histórico eleitoral"],
  },
  {
    nome: "CNJ",
    modulo: "CNJ",
    auth: "nenhuma",
    docs: "https://www.cnj.jus.br/dadosabertos",
    usos: ["justiça em números", "estatísticas processuais"],
  },
  {
    nome: "Portal da Transparência Federal",
    modulo: "PortalTransparencia",
    auth: "token (cadastro grátis)",
    docs: "https://api.portaldatransparencia.gov.br",
    usos: ["CEIS", "CNEP", "Bolsa Família", "Auxílio Brasil", "Servidores federais"],
  },
  {
    nome: "DataSUS",
    modulo: "DataSUS",
    auth: "nenhuma",
    docs: "https://opendatasus.saude.gov.br",
    usos: ["dengue", "SRAG", "vacinação"],
  },
  {
    nome: "ANS",
    modulo: "ANS",
    auth: "nenhuma",
    docs: "https://dados.gov.br",
    usos: ["beneficiários de planos privados"],
  },
  {
    nome: "Compras.gov.br",
    modulo: "ComprasGov",
    auth: "nenhuma",
    docs: "https://compras.dados.gov.br/docs",
    usos: ["licitações federais", "fornecedores"],
  },
  {
    nome: "Wikidata",
    modulo: "Wikidata",
    auth: "nenhuma",
    docs: "https://query.wikidata.org",
    usos: ["dados estruturados", "SEO/linked data"],
  },
  {
    nome: "Exchangerate.host",
    modulo: "Exchangerate",
    auth: "nenhuma",
    docs: "https://exchangerate.host",
    usos: ["cotação de moedas"],
  },
  {
    nome: "URLhaus",
    modulo: "URLhaus",
    auth: "nenhuma",
    docs: "https://urlhaus-api.abuse.ch",
    usos: ["validação anti-phishing"],
  },
] as const;
