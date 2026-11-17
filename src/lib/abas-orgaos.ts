// Abas de /prefeitura e /camara: endereço de cada aba, H1 e regra do clique.
// Sem imports para rodar direto no node --test (tests/abas-orgaos.test.ts).

export const ABA_PADRAO_PREFEITURA = "visao-geral";
export const ABA_PADRAO_CAMARA = "vereadores";

/** Endereço público da aba. A aba padrão mora na raiz do órgão. */
export function hrefAbaPrefeitura(aba: string): string {
  return aba === ABA_PADRAO_PREFEITURA ? "/prefeitura" : `/prefeitura/${aba}`;
}

export function hrefAbaCamara(aba: string): string {
  return aba === ABA_PADRAO_CAMARA ? "/camara" : `/camara/${aba}`;
}

// H1 de cada aba. Segue os títulos de ABAS em src/app/prefeitura/[aba]/page.tsx e
// src/app/camara/[aba]/page.tsx, sem o "GO" do fim. Ao mudar uma aba lá, mudar aqui também.
const H1_PREFEITURA: Record<string, string> = {
  chefia: "Prefeita e vice-prefeito de Piracanjuba",
  secretarias: "Secretarias da Prefeitura de Piracanjuba",
  contratos: "Contratos da Prefeitura de Piracanjuba",
  servidores: "Salários dos servidores da Prefeitura de Piracanjuba",
  funprepi: "FUNPREPI e previdência municipal de Piracanjuba",
  despesas: "Despesas da Prefeitura de Piracanjuba",
  "prestacao-contas": "Prestação de contas da Prefeitura de Piracanjuba",
  "tcm-go": "Apontamentos do TCM-GO sobre Piracanjuba",
  decretos: "Decretos da Prefeitura de Piracanjuba",
  portarias: "Portarias da Prefeitura de Piracanjuba",
  leis: "Leis municipais de Piracanjuba",
  "lei-organica": "Lei Orgânica de Piracanjuba",
  diarias: "Diárias da Prefeitura de Piracanjuba",
  licitacoes: "Licitações da Prefeitura de Piracanjuba",
  obras: "Obras públicas de Piracanjuba",
  veiculos: "Frota de veículos da Prefeitura de Piracanjuba",
};

const H1_CAMARA: Record<string, string> = {
  servidores: "Servidores da Câmara Municipal de Piracanjuba",
  contratos: "Contratos da Câmara Municipal de Piracanjuba",
  projetos: "Projetos de lei da Câmara Municipal de Piracanjuba",
  atuacao: "Atuação parlamentar dos vereadores de Piracanjuba",
  indicacoes: "Indicações dos vereadores de Piracanjuba",
  resolucoes: "Resoluções da Câmara Municipal de Piracanjuba",
  "decretos-leg": "Decretos legislativos da Câmara Municipal de Piracanjuba",
  pautas: "Pautas das sessões da Câmara Municipal de Piracanjuba",
  atas: "Atas das sessões da Câmara Municipal de Piracanjuba",
  transmissao: "Transmissões da Câmara Municipal de Piracanjuba",
  licitacoes: "Licitações da Câmara Municipal de Piracanjuba",
  despesas: "Despesas da Câmara Municipal de Piracanjuba",
  receitas: "Orçamento e duodécimo da Câmara Municipal de Piracanjuba",
  "prestacao-contas": "Prestação de contas da Câmara Municipal de Piracanjuba",
  diarias: "Diárias da Câmara Municipal de Piracanjuba",
};

function temAba(mapa: Record<string, string>, aba: string): boolean {
  return Object.prototype.hasOwnProperty.call(mapa, aba);
}

export function tituloAbaPrefeitura(aba: string): string {
  return temAba(H1_PREFEITURA, aba) ? H1_PREFEITURA[aba] : "Prefeitura de Piracanjuba";
}

export function tituloAbaCamara(aba: string): string {
  return temAba(H1_CAMARA, aba) ? H1_CAMARA[aba] : "Câmara Municipal de Piracanjuba";
}

export type CliqueAba = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
};

/**
 * Clique simples (botão principal, sem tecla modificadora) troca a aba na hora, sem navegar.
 * Ctrl, Cmd, Shift, Alt, botão do meio e target de outra janela ficam com o navegador
 * (abrir em nova aba, nova janela, baixar).
 */
export function deveTrocarAbaNoCliente(clique: CliqueAba, target?: string | null): boolean {
  if (clique.defaultPrevented) return false;
  if (clique.button !== 0) return false;
  if (clique.metaKey || clique.ctrlKey || clique.shiftKey || clique.altKey) return false;
  if (target && target !== "_self") return false;
  return true;
}
