// Cronograma da coleta de lixo de Piracanjuba, por dia da semana e bairro.
//
// Fonte: cronograma divulgado pela Prefeitura Municipal de Piracanjuba em 2025
// (dados que o site já exibia desde 2026-05). O operador ainda não confirmou se a
// tabela continua valendo em 2026, então todo texto da página diz que ela é de
// 2025 e não afirma validade atual. Não acrescentar dia, turno ou bairro que não
// esteja nas listas abaixo.
//
// Módulo puro (sem React, sem Next): é lido pela página no servidor, pelo buscador
// no cliente e pelos testes em tests/coleta-lixo.test.ts.

export const DIAS_COLETA = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export type DiaColeta = (typeof DIAS_COLETA)[number];

export const COLETA_COMUM: Partial<Record<DiaColeta, readonly string[]>> = {
  "Segunda-feira": ["Aeroporto","Aeroporto Sul","BNH","Bueno","Cascalho","Centro","Country Club","Ely Rocha","Estiva","Filismina","Jardim dos Buritis","Jardim Europa","Jardim Goiás 1 e 2","Jardim Primavera","Piracanjuba","Pouso Alto","Primavera","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Vila União"],
  "Terça-feira": ["Aeroporto","Aeroporto Sul","BNH","Bueno","Cascalho","Centro","Conjunto Pouso Alto","Corredor do Homero","Country Club","Ely Rocha","Estiva","Filismina","Jardim dos Buritis","Jardim Europa","Jardim Primavera","Pecuária","Piracanjuba","Pouso Alto","Primavera","Recanto do Bosque","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Vila União"],
  "Quarta-feira": ["Aeroporto","Aeroporto Sul","BNH","Bueno","Cascalho","Centro","Country Club","Ely Rocha","Estiva","Filismina","Jardim dos Buritis","Jardim Europa","Jardim Goiás 1 e 2","Jardim Primavera","Piracanjuba","Pouso Alto","Primavera","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Vila União"],
  "Quinta-feira": ["Aeroporto","Aeroporto Sul","BNH","Bueno","Cascalho","Centro","Country Club","Ely Rocha","Estiva","Filismina","Jardim dos Buritis","Jardim Europa","Jardim Goiás 1 e 2","Jardim Primavera","Piracanjuba","Pouso Alto","Primavera","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Vila União"],
  "Sexta-feira": ["Aeroporto","Aeroporto Sul","BNH","Bueno","Cascalho","Centro","Conjunto Pouso Alto","Country Club","Ely Rocha","Estiva","Filismina","Jardim dos Buritis","Jardim Europa","Jardim Goiás 1 e 2","Jardim Primavera","Pecuária","Piracanjuba","Pouso Alto","Primavera","Recanto do Bosque","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Vila União"],
  "Sábado": ["Av. Expedicionário","Cachoeira","Cargil","Centro","Contêineres","Grão Dourado","Rochedo","Silo da COAPIL"],
};

export const COLETA_SELETIVA: Partial<Record<DiaColeta, readonly string[]>> = {
  "Segunda-feira": ["Centro"],
  "Terça-feira": ["Jardim Goiás 1 e 2","BNH","Estiva","Jardim Primavera","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Bueno","Setor Fernandes","Setor Magalhães","Setor Parque Machado","São Francisco de Assis"],
  "Quarta-feira": ["Aeroporto","Cascalho","Jardim dos Buritis","Jardim Europa","Setor Oeste","Pouso Alto","Aeroporto Sul","Setor das Orquídeas","Setor Roberto"],
  "Quinta-feira": ["Country Club","Ely Rocha","Filismina","Piracanjuba","Primavera","Recanto do Bosque","Setor Lima","Setor Norte","Setor Planalto","Vila União"],
  "Sexta-feira": ["Centro"],
};

/** Rótulo honesto da fonte, repetido na página, no painel do bairro e no FAQ. */
export const FONTE_COLETA = "Cronograma divulgado pela Prefeitura Municipal de Piracanjuba em 2025";
/** A mesma fonte no meio da frase ("segundo o cronograma divulgado..."). */
export const FONTE_COLETA_MEIO_DE_FRASE = `c${FONTE_COLETA.slice(1)}`;
export const AVISO_VALIDADE_COLETA =
  "O Piracanjuba.ai ainda não confirmou com a Prefeitura se este cronograma continua valendo em 2026.";
export const HORARIO_COLETA = "Coloque o lixo na calçada até as 18h do dia anterior à coleta, com os sacos bem fechados.";
export const SACO_COMUM = "saco preto";
export const SACOS_SELETIVA = "saco branco, azul ou verde (qualquer uma dessas cores serve)";

/** Todos os bairros e localidades das duas tabelas, em ordem alfabética. */
export const BAIRROS_COLETA: readonly string[] = [
  ...new Set([...Object.values(COLETA_COMUM), ...Object.values(COLETA_SELETIVA)].flat()),
].sort((a, b) => a.localeCompare(b, "pt-BR"));

/**
 * Dias de coleta de um bairro, por nome exato e na ordem da semana.
 * Nome exato de propósito: a busca por trecho ("Primavera" dentro de "Jardim Primavera")
 * misturava os dias de bairros diferentes.
 */
export function diasDoBairro(bairro: string, tabela: Partial<Record<DiaColeta, readonly string[]>>): DiaColeta[] {
  return DIAS_COLETA.filter((dia) => tabela[dia]?.includes(bairro) ?? false);
}

const NOME_CURTO: Record<DiaColeta, string> = {
  "Segunda-feira": "segunda",
  "Terça-feira": "terça",
  "Quarta-feira": "quarta",
  "Quinta-feira": "quinta",
  "Sexta-feira": "sexta",
  "Sábado": "sábado",
};

function juntarLista(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

function primeiraMaiuscula(texto: string): string {
  return texto ? texto[0].toLocaleUpperCase("pt-BR") + texto.slice(1) : texto;
}

/**
 * "segunda a sexta" para três ou mais dias seguidos; senão a lista ("terça e sexta").
 * Devolve string vazia quando não há dia.
 */
export function descreverDias(dias: readonly DiaColeta[]): string {
  if (!dias.length) return "";
  const indices = dias.map((dia) => DIAS_COLETA.indexOf(dia));
  const seguidos = indices.every((indice, i) => i === 0 || indice === indices[i - 1] + 1);
  if (dias.length >= 3 && seguidos) {
    return `${NOME_CURTO[dias[0]]} a ${NOME_CURTO[dias[dias.length - 1]]}`;
  }
  return juntarLista(dias.map((dia) => NOME_CURTO[dia]));
}

export type LinhaColeta = {
  bairro: string;
  comum: DiaColeta[];
  seletiva: DiaColeta[];
  /** Texto da célula, já com inicial maiúscula. */
  comumTexto: string;
  seletivaTexto: string;
};

export const SEM_DIA_NA_TABELA = "Não consta na tabela";

export function tabelaColeta(): LinhaColeta[] {
  return BAIRROS_COLETA.map((bairro) => {
    const comum = diasDoBairro(bairro, COLETA_COMUM);
    const seletiva = diasDoBairro(bairro, COLETA_SELETIVA);
    return {
      bairro,
      comum,
      seletiva,
      comumTexto: comum.length ? primeiraMaiuscula(descreverDias(comum)) : SEM_DIA_NA_TABELA,
      seletivaTexto: seletiva.length ? primeiraMaiuscula(descreverDias(seletiva)) : SEM_DIA_NA_TABELA,
    };
  });
}

const DIAS_UTEIS: readonly DiaColeta[] = DIAS_COLETA.slice(0, 5);

function mesmosDias(a: readonly DiaColeta[], b: readonly DiaColeta[]) {
  return a.length === b.length && a.every((dia, i) => dia === b[i]);
}

/** Contagens que sustentam o parágrafo-resposta (calculadas, nunca escritas à mão). */
export function resumoColeta(linhas: LinhaColeta[] = tabelaColeta()) {
  const segundaASexta = linhas.filter((l) => mesmosDias(l.comum, DIAS_UTEIS));
  const segundaASabado = linhas.filter((l) => mesmosDias(l.comum, DIAS_COLETA));
  const soSabado = linhas.filter((l) => mesmosDias(l.comum, ["Sábado"]));
  const outrosComum = linhas.filter(
    (l) => !segundaASexta.includes(l) && !segundaASabado.includes(l) && !soSabado.includes(l),
  );
  const seletivaUmDia = linhas.filter((l) => l.seletiva.length === 1);
  const seletivaMaisDias = linhas.filter((l) => l.seletiva.length > 1);
  const semSeletiva = linhas.filter((l) => l.seletiva.length === 0);
  return {
    total: linhas.length,
    segundaASexta,
    segundaASabado,
    soSabado,
    outrosComum,
    seletivaUmDia,
    seletivaMaisDias,
    semSeletiva,
  };
}

const nomes = (linhas: readonly LinhaColeta[]) => juntarLista(linhas.map((l) => l.bairro));

/** "o Centro" no meio da frase; os demais nomes já funcionam sem artigo depois de dois-pontos. */
function comArtigo(bairro: string) {
  return bairro === "Centro" ? "o Centro" : bairro;
}

function descreverOutros(linhas: readonly LinhaColeta[]) {
  return juntarLista(linhas.map((l) => `${l.bairro} (${descreverDias(l.comum)})`));
}

/** "toda segunda e toda sexta", "todo sábado". */
function cadaDia(dias: readonly DiaColeta[]) {
  return juntarLista(dias.map((dia) => `${dia === "Sábado" ? "todo" : "toda"} ${NOME_CURTO[dia]}`));
}

const QUANTIDADE = ["", "um", "dois", "três", "quatro", "cinco", "seis"];

/** Parágrafo-resposta do topo da página, montado só a partir das tabelas. */
export function respostaColeta(linhas: LinhaColeta[] = tabelaColeta()): string {
  const r = resumoColeta(linhas);
  const partes: string[] = [];

  partes.push(
    `Pelo cronograma divulgado pela Prefeitura de Piracanjuba (GO) em 2025, a coleta de lixo comum passa de segunda a sexta-feira em ${r.segundaASexta.length} dos ${r.total} bairros e localidades da tabela.`,
  );

  const sabado = [
    ...r.segundaASabado.map((l) => `${l.bairro} (de segunda a sábado)`),
    ...(r.soSabado.length ? [`${r.soSabado.length} localidades com coleta só nesse dia (${nomes(r.soSabado)})`] : []),
  ];
  if (sabado.length) partes.push(`Coleta também no sábado: ${juntarLista(sabado)}.`);
  if (r.outrosComum.length) partes.push(`Têm dias próprios: ${descreverOutros(r.outrosComum)}.`);

  const seletiva = [`A coleta seletiva passa uma vez por semana em ${r.seletivaUmDia.length} bairros`];
  for (const l of r.seletivaMaisDias) {
    seletiva.push(`${comArtigo(l.bairro)} tem ${QUANTIDADE[l.seletiva.length] ?? l.seletiva.length} dias (${descreverDias(l.seletiva)})`);
  }
  if (r.semSeletiva.length) seletiva.push(`${r.semSeletiva.length} localidades não têm dia de coleta seletiva na tabela`);
  partes.push(`${seletiva.join("; ")}.`);

  partes.push(
    `Coloque o lixo na calçada até as 18h do dia anterior: ${SACO_COMUM} para o lixo comum e saco branco, azul ou verde para os recicláveis.`,
  );
  partes.push(`Fonte: ${FONTE_COLETA_MEIO_DE_FRASE}; a validade em 2026 ainda não foi confirmada com a Prefeitura.`);
  return partes.join(" ");
}

export type PerguntaColeta = { pergunta: string; resposta: string };

/** Perguntas frequentes: o mesmo array alimenta o texto visível e o JSON-LD FAQPage. */
export function perguntasColeta(linhas: LinhaColeta[] = tabelaColeta()): PerguntaColeta[] {
  const r = resumoColeta(linhas);
  const centro = linhas.find((l) => l.bairro === "Centro");
  const sabado = linhas.filter((l) => l.comum.includes("Sábado"));

  const seletivaPorDia = DIAS_COLETA.flatMap((dia) => {
    const bairros = linhas.filter((l) => l.seletiva.includes(dia)).map((l) => l.bairro);
    return bairros.length ? [`${dia.toLocaleLowerCase("pt-BR")}: ${juntarLista(bairros)}`] : [];
  });

  const perguntas: PerguntaColeta[] = [];

  if (centro) {
    perguntas.push({
      pergunta: "Que dia passa a coleta de lixo no Centro de Piracanjuba?",
      resposta:
        `No Centro, a coleta de lixo comum passa de ${descreverDias(centro.comum)}` +
        (centro.seletiva.length ? ` e a coleta seletiva passa ${cadaDia(centro.seletiva)}` : "") +
        `, segundo o ${FONTE_COLETA_MEIO_DE_FRASE}.`,
    });
  }

  perguntas.push({
    pergunta: "Quais bairros de Piracanjuba têm coleta de lixo no sábado?",
    resposta:
      `Na tabela de 2025, têm coleta comum no sábado: ${nomes(sabado)}.` +
      (r.soSabado.length ? ` Para ${nomes(r.soSabado)}, o sábado é o único dia de coleta na tabela.` : ""),
  });

  perguntas.push({
    pergunta: "Em que dia passa a coleta seletiva em Piracanjuba?",
    resposta:
      `Depende do bairro. Na tabela de 2025, ${seletivaPorDia.join("; ")}.` +
      (r.semSeletiva.length ? ` Não há dia de coleta seletiva na tabela para ${nomes(r.semSeletiva)}.` : ""),
  });

  perguntas.push({
    pergunta: "Até que horas devo colocar o lixo na rua?",
    resposta: HORARIO_COLETA,
  });

  perguntas.push({
    pergunta: "Qual a cor do saco de lixo para cada coleta?",
    resposta:
      `Lixo comum (restos de comida e resíduos úmidos) vai em ${SACO_COMUM}. ` +
      `Recicláveis da coleta seletiva (papelão, plástico, metal, vidro, papel e Tetra Pak), limpos e secos, vão em ${SACOS_SELETIVA}. ` +
      "Restos de comida, papel higiênico, fraldas e isopor não vão na coleta seletiva.",
  });

  perguntas.push({
    pergunta: "Este cronograma de coleta vale para 2026?",
    resposta: `A tabela é o ${FONTE_COLETA_MEIO_DE_FRASE}. ${AVISO_VALIDADE_COLETA} Em caso de dúvida, confirme pelos canais oficiais da Prefeitura.`,
  });

  return perguntas;
}

export function faqColetaJsonLd(perguntas: readonly PerguntaColeta[], url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url,
    mainEntity: perguntas.map((p) => ({
      "@type": "Question",
      name: p.pergunta,
      acceptedAnswer: { "@type": "Answer", text: p.resposta },
    })),
  };
}
