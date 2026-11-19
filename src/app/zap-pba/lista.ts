// Regras puras da listagem do Zap PBA, sem React e sem importações, para que os
// testes em node:test as leiam direto.
//
// O HTML de /zap-pba chegou a 2,47 MB em 2026-11-19 (423 cartões completos), acima
// dos 2 MB que o Googlebot lê. Desde então o servidor manda só o primeiro lote de
// cartões; o resto aparece no navegador conforme a rolagem, e um índice leve com o
// nome e o link de cada estabelecimento garante que todos continuem no HTML.

export type FichaZap = {
  id: string;
  name: string;
  whatsapp: string;
  category: string | null;
  click_count: number | null;
  pagina?: string;
  editorial?: true;
  novo?: true;
};

export type CadastroZap = {
  id: string;
  name: string;
  whatsapp: string;
  category: string | null;
  click_count: number | null;
  created_at: string | null;
  pagina?: string;
  editorial?: boolean;
};

export type GrupoIndiceZap = { categoria: string; itens: FichaZap[] };

// Cartões renderizados no servidor e acrescentados a cada rolagem. 48 fecha as
// grades de 1, 2 e 3 colunas sem sobra.
export const LOTE_ZAP = 48;

// Categoria usada no índice para cadastros sem categoria.
export const CATEGORIA_SEM_NOME = "Outros";

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

export function ehNovo(createdAt: string | null, agoraMs: number): boolean {
  if (!createdAt) return false;
  const criado = new Date(createdAt).getTime();
  if (Number.isNaN(criado)) return false;
  return agoraMs - criado < SETE_DIAS_MS;
}

// O navegador recebe só o que o cartão usa. A data de cadastro vira o selo "Novo"
// já calculado, o que tira cerca de 50 bytes por ficha do payload e evita que o
// servidor e o navegador discordem sobre o selo na hidratação.
export function fichaParaNavegador(cadastro: CadastroZap, agoraMs: number): FichaZap {
  const ficha: FichaZap = {
    id: cadastro.id,
    name: cadastro.name,
    whatsapp: cadastro.whatsapp,
    category: cadastro.category,
    click_count: cadastro.click_count,
  };
  if (cadastro.pagina) ficha.pagina = cadastro.pagina;
  if (cadastro.editorial) ficha.editorial = true;
  if (ehNovo(cadastro.created_at, agoraMs)) ficha.novo = true;
  return ficha;
}

// Dia do calendário de Piracanjuba (AAAA-MM-DD) em que a lista foi montada.
export function dataDeReferencia(agora: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const parte = (tipo: string) => partes.find((item) => item.type === tipo)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

// Mesma semente de antes (ano * 10000 + mês * 100 + dia), agora tirada da data que
// o servidor usou, para que o navegador reproduza a ordem do HTML.
export function sementeDoDia(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return ano * 10000 + mes * 100 + dia;
}

export function embaralharPorDia<T>(itens: readonly T[], semente: number): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const misturado = Math.imul(semente + i, 2654435761) >>> 0;
    const j = misturado % (i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Chave de ordenação sem depender do ICU do ambiente: o servidor e o navegador
// precisam chegar à mesma ordem, senão a hidratação do índice diverge.
function chaveDeOrdem(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function comparar(a: string, b: string): number {
  const x = chaveDeOrdem(a);
  const y = chaveDeOrdem(b);
  if (x < y) return -1;
  if (x > y) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function agruparIndice(itens: readonly FichaZap[]): GrupoIndiceZap[] {
  const grupos = new Map<string, FichaZap[]>();
  for (const item of itens) {
    const categoria = item.category?.trim() || CATEGORIA_SEM_NOME;
    const lista = grupos.get(categoria);
    if (lista) lista.push(item);
    else grupos.set(categoria, [item]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => comparar(a, b))
    .map(([categoria, lista]) => ({
      categoria,
      itens: [...lista].sort((a, b) => comparar(a.name, b.name) || comparar(a.id, b.id)),
    }));
}

// Parágrafo-resposta do topo: quantos estabelecimentos, em quantas categorias, de
// quando é a lista e de onde vêm os números. Sem fichas, não afirma nada. Quem chama
// só passa o total quando os cadastros vieram do banco: com o Supabase fora do ar, a
// lista tem apenas a ficha editorial do escritório, e o topo volta ao subtítulo antigo.
//
// A origem descreve o que o dado sustenta: só entram cadastros com status "approved"
// (o formulário grava "pending" e aceita qualquer visitante, sem provar que é o dono),
// mais a ficha editorial que o próprio portal acrescenta.
export function textoResposta(total: number, categorias: number, data: string): string | null {
  if (total <= 0) return null;
  const estabelecimentos = total === 1 ? "estabelecimento" : "estabelecimentos";
  const emCategorias =
    categorias > 0 ? `, em ${categorias} ${categorias === 1 ? "categoria" : "categorias"}` : "";
  return (
    `O Zap PBA reúne o WhatsApp de ${total} ${estabelecimentos} de Piracanjuba, GO${emCategorias}, ` +
    `com números cadastrados no portal e publicados após análise (lista atualizada em ${data}).`
  );
}

// Frase de abertura do índice. Sem o total confirmado pelo banco, não diz quantos são.
export function textoIndice(total: number | null): string {
  if (total === null || total <= 0) return "Estabelecimentos do guia, em ordem alfabética.";
  if (total === 1) return "O único estabelecimento do guia.";
  return `Os ${total} estabelecimentos do guia, em ordem alfabética.`;
}
