// Respostas diretas (GEO e AEO) das abas da Prefeitura, escolha do subsídio do Executivo na
// folha e schema Person da chefia. Funções puras, sem imports em tempo de execução, para rodar
// direto no node --test (tests/prefeitura-respostas.test.ts). Todo número e nome vem do dado
// recebido: sem dado, a função devolve null e a página não afirma nada.

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const FUSO = "America/Sao_Paulo";

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizar(texto: string | null | undefined): string {
  return semAcento(texto ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** "R$ 20.650,12", com espaço comum (o Intl usa espaço não separável). */
export function formatarReais(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(valor)
    .replace(/ /g, " ");
}

export function formatarInteiro(valor: number): string {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

/** "2026-10" vira "outubro de 2026". Competência fora do padrão volta como veio. */
export function competenciaPorExtenso(competencia: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(competencia);
  if (!m) return competencia;
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return competencia;
  return `${MESES[mes - 1]} de ${m[1]}`;
}

/**
 * Dia (AAAA-MM-DD) de uma data ou de um carimbo de tempo, no fuso de Brasília. Data pura
 * ("2026-11-17") volta igual, sem passar por Date, para não andar um dia por causa do fuso.
 */
export function diaEmBrasilia(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const texto = valor.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  // O Postgres às vezes escreve "2026-11-10 06:25:01+00"; o Date só entende "T" e "+00:00".
  const iso = texto.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(data);
}

/** Dia de hoje em Brasília (AAAA-MM-DD). Igual no servidor (UTC) e no navegador. */
export function hojeEmBrasilia(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

/** Competência (AAAA-MM) corrente em Brasília. */
export function competenciaEmBrasilia(agora: Date = new Date()): string {
  return hojeEmBrasilia(agora).slice(0, 7);
}

/** "2026-11-10" (ou carimbo de tempo) vira "10 de novembro de 2026". */
export function dataPorExtenso(valor: string | null | undefined): string | null {
  const dia = diaEmBrasilia(valor);
  if (!dia) return null;
  const [ano, mes, d] = dia.split("-").map(Number);
  if (mes < 1 || mes > 12) return null;
  return `${d === 1 ? "1º" : d} de ${MESES[mes - 1]} de ${ano}`;
}

/** "2026-11-17" (ou carimbo de tempo) vira "17/11/2026", sem depender do fuso de quem renderiza. */
export function dataCurta(valor: string | null | undefined): string | null {
  const dia = diaEmBrasilia(valor);
  if (!dia) return null;
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

/**
 * Dias até o fim da vigência, contando o dia de hoje (fim hoje = 1, igual ao cálculo antigo
 * feito no navegador com o fim às 23:59:59). Negativo quando o contrato já venceu. Calculado
 * por datas de calendário, para o HTML do servidor e o do navegador darem o mesmo número.
 */
export function diasAteVencimento(vigenciaFim: string | null | undefined, hoje: string): number | null {
  const fim = diaEmBrasilia(vigenciaFim);
  if (!fim || !/^\d{4}-\d{2}-\d{2}$/.test(hoje)) return null;
  const emUtc = (dia: string) => {
    const [a, m, d] = dia.split("-").map(Number);
    return Date.UTC(a, m - 1, d);
  };
  const diferenca = Math.round((emUtc(fim) - emUtc(hoje)) / 86_400_000);
  return diferenca < 0 ? diferenca : diferenca + 1;
}

// ===== Executivo: papel, servidor da folha e subsídio =====

export type PapelExecutivo = "prefeito" | "vice";

/** O cadastro do Executivo usa "prefeita" e "vice" no campo tipo. */
export function papelDoTipo(tipo: string | null | undefined): PapelExecutivo {
  return normalizar(tipo).includes("VICE") ? "vice" : "prefeito";
}

/** Cargo da folha que corresponde ao papel: "PREFEITO MUNICIPAL" ou "VICE PREFEITO". */
export function cargoCorrespondeAoPapel(cargo: string | null | undefined, papel: PapelExecutivo): boolean {
  const c = normalizar(cargo);
  if (papel === "vice") return /\bVICE\s*PREFEIT/.test(c);
  return /^PREFEIT/.test(c);
}

/** Nome do cadastro do Executivo bate com o nome da folha (sem acento e sem caixa). */
export function nomesCoincidem(nomeFolha: string | null | undefined, nomeExecutivo: string | null | undefined): boolean {
  const folha = normalizar(nomeFolha);
  const executivo = normalizar(nomeExecutivo);
  return executivo.length > 0 && folha.includes(executivo);
}

export type ServidorCandidato = { id: string; nome: string | null; cargo: string | null };

/**
 * Vínculos da folha que são do cargo eletivo. A mesma pessoa pode ter outro vínculo com a
 * Prefeitura (a prefeita também aparece como professora): só o vínculo do cargo entra no
 * subsídio. Sem vínculo do cargo, a lista sai vazia e o subsídio não é afirmado.
 */
export function vinculosDoCargo(candidatos: ServidorCandidato[], nomeExecutivo: string, papel: PapelExecutivo): string[] {
  return candidatos
    .filter((s) => nomesCoincidem(s.nome, nomeExecutivo) && cargoCorrespondeAoPapel(s.cargo, papel))
    .map((s) => s.id);
}

export type LinhaRemuneracao = {
  competencia: string;
  tipo_folha: string | null;
  bruto: number | string | null;
  fonte_url?: string | null;
};

export function ehFolhaMensal(tipo: string | null | undefined): boolean {
  return normalizar(tipo) === "MENSAL";
}

/**
 * Subsídio = bruto da folha MENSAL mais recente do vínculo do cargo. Adiantamento de 13º,
 * rescisão e outras folhas da mesma competência ficam fora. Duas linhas mensais na mesma
 * competência: vale o maior bruto.
 */
export function escolherSubsidio(linhas: LinhaRemuneracao[]): { valor: number; competencia: string; fonteUrl: string | null } | null {
  const mensais = linhas
    .map((l) => ({ ...l, valor: numero(l.bruto) }))
    .filter((l): l is typeof l & { valor: number } =>
      ehFolhaMensal(l.tipo_folha) && /^\d{4}-\d{2}$/.test(l.competencia) && l.valor !== null && l.valor > 0);
  if (!mensais.length) return null;
  const competencia = mensais.reduce((ultima, l) => (l.competencia > ultima ? l.competencia : ultima), "");
  const daCompetencia = mensais.filter((l) => l.competencia === competencia);
  const escolhida = daCompetencia.reduce((maior, l) => (l.valor > maior.valor ? l : maior));
  return { valor: escolhida.valor, competencia, fonteUrl: escolhida.fonte_url ?? null };
}

export type PessoaExecutivo = {
  id?: string;
  tipo: string;
  nome: string;
  partido: string | null;
  mandato_inicio: string | null;
  mandato_fim: string | null;
  foto_url?: string | null;
  fonte_url?: string | null;
  updated_at?: string | null;
};

export type SubsidioExecutivo = {
  nome: string;
  tipo: string;
  valor: number;
  competencia: string;
  fonteUrl: string | null;
};

/** "a prefeita", "o prefeito", "o vice-prefeito" ou "a vice-prefeita", conforme o cadastro. */
export function cargoComArtigo(tipo: string): string {
  const t = normalizar(tipo);
  if (t.includes("VICE")) return t.includes("PREFEITA") ? "a vice-prefeita" : "o vice-prefeito";
  return t.includes("PREFEITA") ? "a prefeita" : "o prefeito";
}

export function cargoSemArtigo(tipo: string): string {
  return cargoComArtigo(tipo).slice(2);
}

function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function ano(valor: string | null | undefined): string | null {
  const m = /^(\d{4})/.exec(valor ?? "");
  return m ? m[1] : null;
}

function mandato(p: PessoaExecutivo): string | null {
  const inicio = ano(p.mandato_inicio);
  const fim = ano(p.mandato_fim);
  return inicio && fim ? `no mandato de ${inicio} a ${fim}` : null;
}

function comPartido(p: PessoaExecutivo): string {
  return p.partido ? `${p.nome} (${p.partido})` : p.nome;
}

export function separarExecutivo(executivo: PessoaExecutivo[]): { titular: PessoaExecutivo | null; vice: PessoaExecutivo | null } {
  return {
    titular: executivo.find((p) => papelDoTipo(p.tipo) === "prefeito") ?? null,
    vice: executivo.find((p) => papelDoTipo(p.tipo) === "vice") ?? null,
  };
}

/**
 * Resposta a "quem é o prefeito de Piracanjuba": nomes, partidos e mandato do cadastro do
 * Executivo; subsídio bruto da folha mensal, com a competência. Sem titular, null.
 */
export function montarRespostaChefia(executivo: PessoaExecutivo[], subsidios: SubsidioExecutivo[]): string | null {
  const { titular, vice } = separarExecutivo(executivo);
  if (!titular) return null;
  const frases: string[] = [];
  const periodo = mandato(titular);
  let quem = `${maiuscula(cargoComArtigo(titular.tipo))} de Piracanjuba é ${comPartido(titular)}`;
  if (periodo) quem += `, ${periodo}`;
  if (vice) quem += `, e ${cargoComArtigo(vice.tipo)} é ${comPartido(vice)}`;
  frases.push(`${quem}.`);

  const subsidioDe = (p: PessoaExecutivo | null) =>
    p ? subsidios.find((s) => normalizar(s.nome) === normalizar(p.nome)) ?? null : null;
  const st = subsidioDe(titular);
  const sv = subsidioDe(vice);
  if (st && sv && vice && st.competencia === sv.competencia) {
    frases.push(
      `Na folha mensal de ${competenciaPorExtenso(st.competencia)}, o subsídio bruto d${cargoComArtigo(titular.tipo)} foi de ${formatarReais(st.valor)}` +
      ` e o d${cargoComArtigo(vice.tipo)}, de ${formatarReais(sv.valor)}.`,
    );
  } else {
    for (const [p, s] of [[titular, st], [vice, sv]] as const) {
      if (!p || !s) continue;
      frases.push(
        `Na folha mensal de ${competenciaPorExtenso(s.competencia)}, o subsídio bruto d${cargoComArtigo(p.tipo)} foi de ${formatarReais(s.valor)}.`,
      );
    }
  }
  if (frases.length === 1) {
    // Sem subsídio na folha, a data da resposta é a do cadastro do Executivo.
    const atualizado = [titular, vice].map((p) => diaEmBrasilia(p?.updated_at)).filter((d): d is string => d !== null).sort().pop();
    if (atualizado) frases.push(`Cadastro atualizado em ${dataPorExtenso(atualizado)}.`);
  }
  return frases.join(" ");
}

// ===== Servidores =====

export type TotaisFolhaMensal = { competencia: string; bruto: number | null; servidores: number };

export function montarRespostaServidores(resumo: { mensal: TotaisFolhaMensal | null; publicacaoParcial?: boolean } | null): string | null {
  const mensal = resumo?.mensal;
  if (!mensal || mensal.servidores <= 0) return null;
  const quando = competenciaPorExtenso(mensal.competencia);
  const servidores = `${formatarInteiro(mensal.servidores)} ${mensal.servidores === 1 ? "servidor" : "servidores"}`;
  let texto = mensal.bruto !== null
    ? `Na folha mensal de ${quando}, a Prefeitura de Piracanjuba pagou ${formatarReais(mensal.bruto)} em remuneração bruta a ${servidores}.`
    : `Na folha mensal de ${quando}, a Prefeitura de Piracanjuba registrou ${servidores}.`;
  if (resumo?.publicacaoParcial) texto += " A publicação mais recente ainda está parcial e pode receber complementações.";
  return texto;
}

// ===== Contratos =====

export type ContratoDoLote = { valor: number | string | null; vigencia_inicio: string | null; updated_at?: string | null };

export function montarRespostaContratos(lote: ContratoDoLote[], total: number | null): string | null {
  if (!lote.length) return null;
  const frases: string[] = [];
  if (total !== null && total >= lote.length) {
    frases.push(`Esta página reúne ${formatarInteiro(total)} contratos da Prefeitura de Piracanjuba, sincronizados do portal de transparência oficial.`);
  }
  const valores = lote.map((c) => numero(c.valor));
  const comValor = valores.filter((v): v is number => v !== null);
  const soma = comValor.reduce((s, v) => s + Math.round(v * 100), 0) / 100;
  const inicios = lote.map((c) => diaEmBrasilia(c.vigencia_inicio)).filter((d): d is string => d !== null).sort();
  const quantidade = lote.length === 1 ? "O contrato mais recente" : `Os ${formatarInteiro(lote.length)} contratos mais recentes`;
  let lotes = quantidade;
  if (inicios.length) {
    const primeiro = dataPorExtenso(inicios[0]);
    const ultimo = dataPorExtenso(inicios[inicios.length - 1]);
    lotes += primeiro === ultimo ? `, com início de vigência em ${primeiro},` : `, com início de vigência entre ${primeiro} e ${ultimo},`;
  }
  lotes += lote.length === 1 ? ` vale ${formatarReais(soma)}` : ` somam ${formatarReais(soma)}`;
  const semValor = lote.length - comValor.length;
  if (semValor > 0) lotes += ` (${formatarInteiro(semValor)} sem valor informado)`;
  frases.push(`${lotes}.`);
  const atualizado = lote.map((c) => diaEmBrasilia(c.updated_at)).filter((d): d is string => d !== null).sort().pop();
  if (atualizado) frases.push(`Dados atualizados em ${dataPorExtenso(atualizado)}.`);
  return frases.join(" ");
}

// ===== Despesas =====

export type DespesaMensalResumo = {
  competencia: string;
  valor_empenhado: number | string | null;
  valor_liquidado: number | string | null;
  valor_pago: number | string | null;
  fonte_nome?: string | null;
  fonte_url?: string | null;
  data_coleta?: string | null;
};

/** Mês mais recente já encerrado (competência anterior à corrente). */
export function escolherMesFechado<T extends { competencia: string }>(linhas: T[], competenciaAtual: string): T | null {
  const fechados = linhas.filter((l) => /^\d{4}-\d{2}$/.test(l.competencia) && l.competencia < competenciaAtual);
  if (!fechados.length) return null;
  return fechados.reduce((ultima, l) => (l.competencia > ultima.competencia ? l : ultima));
}

export function montarRespostaDespesas(mes: DespesaMensalResumo | null): string | null {
  if (!mes) return null;
  const empenhado = numero(mes.valor_empenhado);
  const liquidado = numero(mes.valor_liquidado);
  const pago = numero(mes.valor_pago);
  const partes: string[] = [];
  if (empenhado !== null) partes.push(`empenhou ${formatarReais(empenhado)}`);
  if (liquidado !== null) partes.push(`liquidou ${formatarReais(liquidado)}`);
  if (pago !== null) partes.push(`pagou ${formatarReais(pago)}`);
  if (!partes.length) return null;
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
  let texto = `Em ${competenciaPorExtenso(mes.competencia)}, a Prefeitura de Piracanjuba ${lista} em despesas.`;
  const coleta = dataPorExtenso(mes.data_coleta);
  if (coleta) texto += ` Dados coletados em ${coleta}.`;
  return texto;
}

// ===== Secretarias =====

export type SecretariaResumo = { nome: string; secretario_nome: string | null; updated_at?: string | null };

export function montarRespostaSecretarias(secretarias: SecretariaResumo[]): string | null {
  if (!secretarias.length) return null;
  const comTitular = secretarias.filter((s) => s.secretario_nome && s.secretario_nome.trim()).length;
  let texto = `A Prefeitura de Piracanjuba tem ${formatarInteiro(secretarias.length)} ${secretarias.length === 1 ? "secretaria municipal cadastrada" : "secretarias municipais cadastradas"}`;
  texto += comTitular === secretarias.length
    ? ", todas com secretário identificado."
    : `, ${formatarInteiro(comTitular)} com secretário identificado.`;
  const atualizado = secretarias.map((s) => diaEmBrasilia(s.updated_at)).filter((d): d is string => d !== null).sort().pop();
  if (atualizado) texto += ` Cadastro atualizado em ${dataPorExtenso(atualizado)}.`;
  return texto;
}

// ===== Schema Person da chefia =====

export type OrgaoSchema = { "@id": string; name: string; url: string };

/**
 * Person de schema.org para a prefeita e o vice, só com campos que têm fonte no cadastro do
 * Executivo: nome, cargo, órgão, mandato (na descrição) e foto. Liga ao GovernmentOrganization
 * da Prefeitura pelo mesmo @id do grafo do layout, com os dados repetidos para validar sozinho.
 */
export function pessoaExecutivoJsonLd(p: PessoaExecutivo, opts: { paginaUrl: string; orgao: OrgaoSchema }) {
  const cargo = maiuscula(cargoSemArtigo(p.tipo));
  const periodo = mandato(p);
  const fragmento = papelDoTipo(p.tipo) === "vice" ? "vice" : "titular";
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${opts.paginaUrl}#${fragmento}`,
    name: p.nome,
    jobTitle: `${cargo} de Piracanjuba`,
    ...(periodo ? { description: `${cargo} de Piracanjuba (GO), ${periodo}.` } : {}),
    worksFor: { "@type": "GovernmentOrganization", ...opts.orgao },
    ...(p.foto_url ? { image: p.foto_url } : {}),
    url: opts.paginaUrl,
    ...(p.fonte_url ? { subjectOf: { "@type": "WebPage", url: p.fonte_url } } : {}),
  };
}
