// Abas de /prefeitura e /camara: endereço de cada aba, aba da URL, H1 e regra do clique.
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

export type Orgao = "prefeitura" | "camara";

/**
 * Aba que o caminho da URL indica: a raiz do órgão é a aba padrão e /<órgão>/<aba> é a aba.
 * Devolve null para caminho de outra página, aba sem rota própria (como "admin" da Prefeitura)
 * e aba desconhecida. Aceita barra final, query e hash.
 */
export function abaDoCaminho(caminho: string | null | undefined, orgao: Orgao): string | null {
  if (!caminho) return null;
  const partes = caminho.split(/[?#]/, 1)[0].split("/").filter(Boolean);
  if (partes[0] !== orgao) return null;
  if (partes.length === 1) return orgao === "prefeitura" ? ABA_PADRAO_PREFEITURA : ABA_PADRAO_CAMARA;
  if (partes.length !== 2) return null;
  const mapa = orgao === "prefeitura" ? H1_PREFEITURA : H1_CAMARA;
  return temAba(mapa, partes[1]) ? partes[1] : null;
}

/**
 * Aba da Prefeitura pela URL. /prefeitura/<aba> manda; na raiz vale ?tab= (links antigos e
 * resultados de busca, como /prefeitura?tab=leis), senão a visão geral. Fora das abas, null.
 */
export function abaDaUrlPrefeitura(caminho: string | null | undefined, tabDaQuery?: string | null): string | null {
  const aba = abaDoCaminho(caminho, "prefeitura");
  if (aba === ABA_PADRAO_PREFEITURA && tabDaQuery) return tabDaQuery;
  return aba;
}

/** Aba escolhida no clique, presa à URL que o roteador tinha naquele momento. */
export type EscolhaAba = { aba: string; url: string };

/**
 * Aba exibida. O clique troca a aba na hora; o roteador só chega à URL nova depois, porque o
 * replaceState vira uma transição. Enquanto a URL do roteador for a do clique, vale a escolha
 * (também para a aba "admin", que não muda a URL). Mudou a URL (troca concluída, link do
 * rodapé, Voltar, Avançar), vale a aba da URL.
 */
export function abaExibida(escolha: EscolhaAba | null, urlAtual: string, abaDaUrl: string): string {
  return escolha !== null && escolha.url === urlAtual ? escolha.aba : abaDaUrl;
}

/**
 * Aba da Prefeitura que pode ficar ativa. A aba "admin" só vale para quem tem o token de /admin
 * no navegador; sem ele (/prefeitura?tab=admin, por exemplo) cai na visão geral, e o H1 e o
 * conteúdo seguem a aba devolvida aqui. O servidor nunca tem o token, então o HTML do servidor
 * e o da hidratação nunca trazem a aba admin.
 */
export function abaPermitidaPrefeitura(aba: string, temTokenAdmin: boolean): string {
  return aba === "admin" && !temTokenAdmin ? ABA_PADRAO_PREFEITURA : aba;
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
