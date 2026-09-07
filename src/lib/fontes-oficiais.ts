// Links de navegação conferidos nos portais oficiais em 2026-09-07.
// Preservar fonte_url dos registros e links de documentos históricos originais.
const PREFEITURA_PORTAL = "https://acessoainformacao.piracanjuba.go.gov.br";
const CAMARA_PORTAL = "https://acessoainformacao.piracanjuba.go.leg.br";

export const FONTES_PREFEITURA = {
  institucional: "https://piracanjuba.go.gov.br/",
  transparencia: `${PREFEITURA_PORTAL}/`,
  folhas: `${PREFEITURA_PORTAL}/cidadao/transparencia/folhas`,
  despesas: `${PREFEITURA_PORTAL}/cidadao/transparencia/despesas`,
  contratos: `${PREFEITURA_PORTAL}/cidadao/informacao/contratos`,
  licitacoes: `${PREFEITURA_PORTAL}/cidadao/informacao/licitacoes`,
  obras: `${PREFEITURA_PORTAL}/cidadao/informacao/cntobras`,
  diarias: `${PREFEITURA_PORTAL}/cidadao/transparencia/diarias`,
  leis: `${PREFEITURA_PORTAL}/cidadao/legislacao/leis`,
  decretos: `${PREFEITURA_PORTAL}/cidadao/legislacao/decretos_cnt`,
  portarias: `${PREFEITURA_PORTAL}/cidadao/legislacao/portarias_cnt`,
  planejamento: `${PREFEITURA_PORTAL}/cidadao/resp_fiscal/planejamentocnt`,
  rgf: `${PREFEITURA_PORTAL}/cidadao/resp_fiscal/rgfscnt`,
  rreo: `${PREFEITURA_PORTAL}/cidadao/resp_fiscal/rreoscnt`,
  balancoAnual: `${PREFEITURA_PORTAL}/cidadao/resp_fiscal/balancoscnt`,
} as const;

export const FONTES_CAMARA = {
  institucional: "https://piracanjuba.go.leg.br/",
  transparencia: `${CAMARA_PORTAL}/`,
  folhas: `${CAMARA_PORTAL}/cidadao/transparencia/folhas`,
  rgf: `${CAMARA_PORTAL}/cidadao/resp_fiscal/rgfscnt`,
  balancoAnual: `${CAMARA_PORTAL}/cidadao/resp_fiscal/balancos`,
  balanceteMensal: `${CAMARA_PORTAL}/cidadao/transparencia/balancetemensalcnt`,
} as const;
