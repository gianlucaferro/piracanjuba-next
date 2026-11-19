// Abas de /prefeitura e /camara: endereço de cada aba, aba da URL, H1, title e description
// de cada aba e regra do clique.
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

function temAba(mapa: Record<string, unknown>, aba: string): boolean {
  return Object.prototype.hasOwnProperty.call(mapa, aba);
}

export function tituloAbaPrefeitura(aba: string): string {
  return temAba(H1_PREFEITURA, aba) ? H1_PREFEITURA[aba] : "Prefeitura de Piracanjuba";
}

export function tituloAbaCamara(aba: string): string {
  return temAba(H1_CAMARA, aba) ? H1_CAMARA[aba] : "Câmara Municipal de Piracanjuba";
}

/** Título (sem o sufixo do layout) e description de uma aba com rota própria. */
export type MetaAba = { title: string; description: string };

/** Sufixo que o title.template de src/app/layout.tsx põe em toda página interna. */
export const SUFIXO_TITULO = " | Piracanjuba.ai";

// Title e description de cada aba (avisos do Bing Webmaster Tools lidos em 2026-11-19): o
// título renderizado, com SUFIXO_TITULO, tem até 60 caracteres e começa pela palavra-chave;
// a description tem de 120 a 160 caracteres e diz o que a aba mostra. Mesmas chaves de ABAS
// em src/app/prefeitura/[aba]/page.tsx e src/app/camara/[aba]/page.tsx (o teste confere).
const META_PREFEITURA: Record<string, MetaAba> = {
  chefia: {
    title: "Prefeita e vice-prefeito de Piracanjuba GO",
    description: "Prefeita e vice-prefeito de Piracanjuba, Goiás: partido, mandato, subsídio mensal, remuneração bruta, contatos oficiais e financiadores da campanha eleitoral.",
  },
  secretarias: {
    title: "Secretarias da Prefeitura de Piracanjuba GO",
    description: "Secretarias municipais de Piracanjuba com o secretário de cada pasta, subsídio, total de proventos do mês, e-mail, telefone e resumo por IA. Dados oficiais.",
  },
  contratos: {
    title: "Contratos da Prefeitura de Piracanjuba GO",
    description: "Contratos da Prefeitura de Piracanjuba: empresa, objeto, valor, vigência e aditivos, com situação do CNPJ, grupo econômico e resumo por IA. Dados oficiais.",
  },
  servidores: {
    title: "Salários da Prefeitura de Piracanjuba GO",
    description: "Servidores da Prefeitura de Piracanjuba por nome e cargo, com resumo da folha mensal, rescisões e 13º salário, busca e exportação em CSV. Dados oficiais.",
  },
  funprepi: {
    title: "FUNPREPI, previdência de Piracanjuba GO",
    description: "FUNPREPI, previdência dos servidores de Piracanjuba: pagamentos anuais e mensais, fornecedores, contratos e evidências documentais, com fontes oficiais.",
  },
  despesas: {
    title: "Despesas da Prefeitura de Piracanjuba GO",
    description: "Despesas da Prefeitura de Piracanjuba: favorecido, descrição, data e valor de cada pagamento, com link para a fonte oficial e resumo por IA de cada despesa.",
  },
  "prestacao-contas": {
    title: "Prestação de contas de Piracanjuba GO",
    description: "Prestação de contas da Prefeitura de Piracanjuba: PPA, LDO, LOA, RREO, RGF com despesa com pessoal e limite da LRF, balancete e balanço anual, com fontes.",
  },
  "tcm-go": {
    title: "Apontamentos do TCM-GO sobre Piracanjuba",
    description: "Apontamentos e decisões do Tribunal de Contas dos Municípios de Goiás (TCM-GO) sobre Piracanjuba, com resumo por IA e links para os canais oficiais do tribunal.",
  },
  decretos: {
    title: "Decretos da Prefeitura de Piracanjuba GO",
    description: "Decretos do Executivo de Piracanjuba, Goiás: número, data e ementa de cada decreto municipal, com busca e resumo por IA. Dados do portal da Prefeitura.",
  },
  portarias: {
    title: "Portarias da Prefeitura de Piracanjuba GO",
    description: "Portarias da Prefeitura de Piracanjuba: atos administrativos com número, data e ementa, busca por número ou assunto e resumo por IA de cada portaria.",
  },
  leis: {
    title: "Leis municipais de Piracanjuba GO",
    description: "Leis municipais de Piracanjuba, Goiás, com número, data e ementa, filtro por categoria, busca por número ou assunto e resumo por IA de cada lei.",
  },
  "lei-organica": {
    title: "Lei Orgânica de Piracanjuba GO",
    description: "Lei Orgânica de Piracanjuba, a constituição do município: artigos organizados por título, busca por termo, emendas e resumo por IA de cada artigo.",
  },
  diarias: {
    title: "Diárias da Prefeitura de Piracanjuba GO",
    description: "Diárias pagas pela Prefeitura de Piracanjuba: servidor, destino, motivo, data e valor de cada viagem, com total geral e soma por servidor. Dados oficiais.",
  },
  licitacoes: {
    title: "Licitações da Prefeitura de Piracanjuba GO",
    description: "Licitações da Prefeitura de Piracanjuba: número, modalidade explicada, objeto, situação e datas de publicação e resultado, com resumo por IA. Dados oficiais.",
  },
  obras: {
    title: "Obras públicas de Piracanjuba GO",
    description: "Obras públicas da Prefeitura de Piracanjuba: local, empresa responsável, situação e valor de cada obra, total em andamento e concluídas e resumo por IA.",
  },
  veiculos: {
    title: "Veículos da Prefeitura de Piracanjuba GO",
    description: "Frota de veículos da Prefeitura de Piracanjuba: placa, tipo, marca, ano, combustível, órgão e situação (ativo, manutenção ou sucata). Dados do portal oficial.",
  },
};

const META_CAMARA: Record<string, MetaAba> = {
  servidores: {
    title: "Servidores da Câmara de Piracanjuba GO",
    description: "Servidores da Câmara Municipal de Piracanjuba por nome e cargo, com resumo da folha mensal, rescisões e outros pagamentos, busca e exportação em CSV.",
  },
  contratos: {
    title: "Contratos da Câmara de Piracanjuba GO",
    description: "Contratos da Câmara Municipal de Piracanjuba: credor, objeto, número, valor, vigência, aditivos e situação do CNPJ do fornecedor, com resumo por IA.",
  },
  projetos: {
    title: "Projetos de lei da Câmara de Piracanjuba GO",
    description: "Projetos de lei da Câmara de Piracanjuba com número, autor, origem, ementa e situação (aprovado, recusado ou em tramitação), com resumo em linguagem simples.",
  },
  atuacao: {
    title: "Atuação dos vereadores de Piracanjuba GO",
    description: "Indicações, requerimentos, moções e projetos de lei de cada vereador de Piracanjuba, com filtro por vereador, tipo e ano, resumo por IA e exportação em CSV.",
  },
  indicacoes: {
    title: "Indicações dos vereadores de Piracanjuba GO",
    description: "Indicações dos vereadores de Piracanjuba ao Poder Executivo, com número, data, descrição, documento oficial e resumo por IA de cada indicação.",
  },
  resolucoes: {
    title: "Resoluções da Câmara de Piracanjuba GO",
    description: "Resoluções aprovadas pela Câmara Municipal de Piracanjuba, com número, ano, data de publicação, descrição e link para o documento oficial de cada resolução.",
  },
  "decretos-leg": {
    title: "Decretos legislativos de Piracanjuba GO",
    description: "Decretos legislativos aprovados pela Câmara Municipal de Piracanjuba, com número, data de publicação, descrição, documento oficial e resumo por IA.",
  },
  pautas: {
    title: "Pautas das sessões da Câmara de Piracanjuba",
    description: "Pautas das sessões ordinárias da Câmara Municipal de Piracanjuba: número, data de publicação, descrição, documento oficial e resumo por IA de cada pauta.",
  },
  atas: {
    title: "Atas das sessões da Câmara de Piracanjuba",
    description: "Atas das sessões ordinárias da Câmara Municipal de Piracanjuba: número, data de publicação, descrição, documento oficial e resumo por IA de cada ata.",
  },
  transmissao: {
    title: "Sessões da Câmara de Piracanjuba ao vivo",
    description: "Sessões da Câmara de Piracanjuba ao vivo no YouTube: as ordinárias são às segundas-feiras, a partir das 19h, e na última quinta-feira de cada mês.",
  },
  licitacoes: {
    title: "Licitações da Câmara de Piracanjuba GO",
    description: "Licitações da Câmara Municipal de Piracanjuba: número, modalidade, objeto, situação, valor estimado e data de abertura de cada processo. Dados oficiais.",
  },
  despesas: {
    title: "Despesas da Câmara de Piracanjuba GO",
    description: "Despesas pagas pela Câmara Municipal de Piracanjuba: credor, elemento de despesa, descrição, data de pagamento e valor, com gráfico por mês. Dados oficiais.",
  },
  receitas: {
    title: "Orçamento da Câmara de Piracanjuba GO",
    description: "Orçamento da Câmara de Piracanjuba: dotação e despesa executada por ano, o que é o duodécimo e o limite de 70% para a folha, conforme SICONFI e Tesouro.",
  },
  "prestacao-contas": {
    title: "Prestação de contas: Câmara de Piracanjuba",
    description: "Prestação de contas da Câmara de Piracanjuba: PPA, LDO, LOA, RREO, RGF com despesa com pessoal e limite da LRF, balancete, balanço e pareceres do TCM.",
  },
  diarias: {
    title: "Diárias da Câmara de Piracanjuba GO",
    description: "Diárias e passagens pagas pela Câmara Municipal de Piracanjuba: beneficiário, cargo, destino, motivo, data e valor, com soma por vereador.",
  },
};

export function metaAbaPrefeitura(aba: string): MetaAba | null {
  return temAba(META_PREFEITURA, aba) ? META_PREFEITURA[aba] : null;
}

export function metaAbaCamara(aba: string): MetaAba | null {
  return temAba(META_CAMARA, aba) ? META_CAMARA[aba] : null;
}

/** Abas com title e description próprios, na ordem do mapa. */
export function abasComMeta(orgao: Orgao): string[] {
  return Object.keys(orgao === "prefeitura" ? META_PREFEITURA : META_CAMARA);
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
