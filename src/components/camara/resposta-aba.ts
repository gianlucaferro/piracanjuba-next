// Parágrafos-resposta e perguntas frequentes das abas da Câmara (GEO e AEO, Onda 2 de 2026-11-19).
//
// Usado só pelas abas da Câmara (blocos do servidor e aviso de pagamentos repetidos).
// Cada parágrafo responde a busca principal da aba com número, data do dado e fonte oficial
// nomeada, a partir dos dados lidos no servidor. Dado ausente não vira frase: a função devolve
// null e a aba segue sem o parágrafo. Sem imports com "@/": tests/camara-resposta-aba.test.ts
// importa este arquivo direto no Node.

export const FONTE_PORTAL_CAMARA = "portal de transparência da Câmara Municipal de Piracanjuba";
export const FONTE_SICONFI = "SICONFI, do Tesouro Nacional";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** R$ com centavos, no padrão brasileiro (o mesmo do formatCurrency do site). */
export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarInteiro(valor: number): string {
  return valor.toLocaleString("pt-BR");
}

/** "2026-10-28" ou "2026-10-28T12:00:00Z" -> "28 de outubro de 2026". Sem fuso: usa só a data. */
export function formatarData(iso: string | null | undefined): string | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return `${Number(m[3])} de ${MESES[mes - 1]} de ${m[1]}`;
}

/** Competência da folha "2026-10" -> "outubro de 2026". */
export function formatarCompetencia(competencia: string | null | undefined): string | null {
  const m = competencia?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return `${MESES[mes - 1]} de ${m[1]}`;
}

/** 93.42 -> "93,4%". */
export function formatarPercentual(parte: number, total: number): string | null {
  if (!total) return null;
  return `${((parte / total) * 100).toFixed(1).replace(".", ",")}%`;
}

function plural(n: number, singular: string, pluralForma: string): string {
  return `${formatarInteiro(n)} ${n === 1 ? singular : pluralForma}`;
}

// ---------------------------------------------------------------- Contratos

export type ResumoContratosCamara = {
  total: number;
  totalValor: number;
  emVigor: number;
  anoMin: number | null;
  anoMax: number | null;
  maiorFornecedor: { nome: string; qtde: number; soma: number } | null;
  /** data_publicacao do contrato mais recente */
  ultimaPublicacao: string | null;
};

export function paragrafoContratos(r: ResumoContratosCamara): string | null {
  if (!r.total) return null;
  const periodo = r.anoMin && r.anoMax
    ? r.anoMin === r.anoMax ? ` em ${r.anoMin}` : ` de ${r.anoMin} a ${r.anoMax}`
    : "";
  const partes = [
    `A Câmara Municipal de Piracanjuba tem ${plural(r.total, "contrato registrado", "contratos registrados")}${periodo}, que somam ${formatarReais(r.totalValor)}; ${plural(r.emVigor, "está em vigor", "estão em vigor")}.`,
  ];
  if (r.maiorFornecedor) {
    partes.push(`O maior fornecedor é ${r.maiorFornecedor.nome}, com ${plural(r.maiorFornecedor.qtde, "contrato", "contratos")} que somam ${formatarReais(r.maiorFornecedor.soma)}.`);
  }
  const data = formatarData(r.ultimaPublicacao);
  partes.push(`Dados do ${FONTE_PORTAL_CAMARA}${data ? `; o contrato mais recente foi publicado em ${data}` : ""}.`);
  return partes.join(" ");
}

export function faqContratos(r: ResumoContratosCamara): ItemFaq[] {
  if (!r.total) return [];
  const periodo = r.anoMin && r.anoMax && r.anoMin !== r.anoMax ? ` de ${r.anoMin} a ${r.anoMax}` : "";
  const itens: ItemFaq[] = [{
    pergunta: "Quantos contratos a Câmara de Piracanjuba tem?",
    resposta: `${plural(r.total, "contrato registrado", "contratos registrados")}${periodo}, que somam ${formatarReais(r.totalValor)}. Destes, ${plural(r.emVigor, "está em vigor", "estão em vigor")}, segundo o ${FONTE_PORTAL_CAMARA}.`,
  }];
  if (r.maiorFornecedor) {
    itens.push({
      pergunta: "Qual empresa mais recebeu em contratos da Câmara de Piracanjuba?",
      resposta: `${r.maiorFornecedor.nome}, com ${plural(r.maiorFornecedor.qtde, "contrato", "contratos")} que somam ${formatarReais(r.maiorFornecedor.soma)} (soma dos contratos por CNPJ).`,
    });
  }
  return itens;
}

// ---------------------------------------------------------------- Licitações

export type ResumoLicitacoesCamara = {
  total: number;
  anoMin: number | null;
  anoMax: number | null;
  modalidadeMaisUsada: { modalidade: string; quantidade: number } | null;
  homologadas: number;
  /** soma de valor_homologado; 0 quando a fonte não informa nenhum (caso de 2026-11-19) */
  totalHomologado: number;
  /** soma de valor_estimado das licitações que o informam */
  totalEstimado: number;
  ultimaPublicacao: string | null;
};

/** Valor que a fonte de fato informa: o homologado, ou o estimado quando não há homologado. */
export function valorLicitacoes(r: Pick<ResumoLicitacoesCamara, "totalHomologado" | "totalEstimado">):
  { rotulo: "homologado" | "estimado"; valor: number } | null {
  if (r.totalHomologado > 0) return { rotulo: "homologado", valor: r.totalHomologado };
  if (r.totalEstimado > 0) return { rotulo: "estimado", valor: r.totalEstimado };
  return null;
}

export function paragrafoLicitacoes(r: ResumoLicitacoesCamara): string | null {
  if (!r.total) return null;
  const periodo = r.anoMin && r.anoMax
    ? r.anoMin === r.anoMax ? ` em ${r.anoMin}` : ` de ${r.anoMin} a ${r.anoMax}`
    : "";
  const partes = [`O ${FONTE_PORTAL_CAMARA} registra ${plural(r.total, "licitação", "licitações")}${periodo}.`];
  if (r.modalidadeMaisUsada) {
    partes.push(`A modalidade mais usada é ${r.modalidadeMaisUsada.modalidade}, com ${plural(r.modalidadeMaisUsada.quantidade, "processo", "processos")}.`);
  }
  if (r.homologadas) {
    partes.push(`${plural(r.homologadas, "licitação está homologada", "licitações estão homologadas")}.`);
  }
  const valor = valorLicitacoes(r);
  if (valor) {
    partes.push(valor.rotulo === "homologado"
      ? `O valor homologado somado é de ${formatarReais(valor.valor)}.`
      : `Os valores estimados informados somam ${formatarReais(valor.valor)}.`);
  }
  const data = formatarData(r.ultimaPublicacao);
  if (data) partes.push(`A licitação mais recente foi publicada em ${data}.`);
  return partes.join(" ");
}

export function faqLicitacoes(r: ResumoLicitacoesCamara): ItemFaq[] {
  if (!r.total) return [];
  const data = formatarData(r.ultimaPublicacao);
  const itens: ItemFaq[] = [{
    pergunta: "Quantas licitações a Câmara de Piracanjuba fez?",
    resposta: `O ${FONTE_PORTAL_CAMARA} registra ${plural(r.total, "licitação", "licitações")}${r.anoMin && r.anoMax && r.anoMin !== r.anoMax ? ` de ${r.anoMin} a ${r.anoMax}` : ""}${data ? `; a mais recente foi publicada em ${data}` : ""}.`,
  }];
  if (r.modalidadeMaisUsada) {
    itens.push({
      pergunta: "Qual a modalidade de licitação mais usada pela Câmara de Piracanjuba?",
      resposta: `${r.modalidadeMaisUsada.modalidade}, com ${plural(r.modalidadeMaisUsada.quantidade, "processo", "processos")} de ${formatarInteiro(r.total)}.`,
    });
  }
  return itens;
}

// ---------------------------------------------------------------- Despesas

export type OrcamentoCamaraAno = {
  ano: number;
  dotacao: number | null;
  liquidada: number | null;
  /** bimestre do RREO (6 = ano fechado) */
  periodo_referencia: number | null;
};

export type RegistroPagamentoCamara = {
  ano: number;
  credor: string | null;
  descricao: string | null;
  elemento: string | null;
  valor: number | null;
  data_pagamento: string | null;
};

export type PagamentosCamaraAno = {
  ano: number;
  pagamentos: number;
  total: number;
  /** linhas idênticas a outra do mesmo ano (mesmo credor, descrição, elemento, valor e data) */
  repetidos: number;
};

function chavePagamento(r: Omit<RegistroPagamentoCamara, "ano">): string {
  return JSON.stringify([r.credor, r.descricao, r.elemento, r.valor, r.data_pagamento]);
}

/** Quantas linhas repetem outra de forma idêntica (a cópia excedente, não a original). */
export function contarPagamentosRepetidos(registros: Array<Omit<RegistroPagamentoCamara, "ano">>): number {
  const vistos = new Set<string>();
  let repetidos = 0;
  for (const r of registros) {
    const chave = chavePagamento(r);
    if (vistos.has(chave)) repetidos++;
    else vistos.add(chave);
  }
  return repetidos;
}

/** Agrupa os pagamentos por ano, do mais recente ao mais antigo, somando em centavos. */
export function resumirPagamentosPorAno(registros: RegistroPagamentoCamara[]): PagamentosCamaraAno[] {
  const porAno = new Map<number, RegistroPagamentoCamara[]>();
  for (const r of registros) {
    const lista = porAno.get(r.ano) ?? [];
    lista.push(r);
    porAno.set(r.ano, lista);
  }
  return [...porAno.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([ano, lista]) => ({
      ano,
      pagamentos: lista.length,
      total: lista.reduce((s, r) => s + Math.round((Number(r.valor) || 0) * 100), 0) / 100,
      repetidos: contarPagamentosRepetidos(lista),
    }));
}

/** Só anos sem linhas repetidas entram no texto: com repetição, a soma da fonte não é confiável. */
export function pagamentosConfiaveis(anos: PagamentosCamaraAno[]): PagamentosCamaraAno[] {
  return anos.filter((a) => a.pagamentos > 0 && a.repetidos === 0);
}

function frasePeriodoOrcamento(o: OrcamentoCamaraAno): string {
  const p = o.periodo_referencia ?? 6;
  if (p >= 6) return `de ${o.ano}`;
  return `de ${o.ano} até ${MESES[Math.min(12, p * 2) - 1]} (${p}º bimestre)`;
}

export function paragrafoDespesas(
  orcamentos: OrcamentoCamaraAno[],
  pagamentos: PagamentosCamaraAno[],
): string | null {
  const validos = [...orcamentos]
    .filter((o) => o.liquidada !== null && Number.isFinite(o.liquidada))
    .sort((a, b) => b.ano - a.ano);
  const partes: string[] = [];
  const atual = validos[0];
  if (atual) {
    const orcado = atual.dotacao ? `, de ${formatarReais(atual.dotacao)} orçados` : "";
    partes.push(`Pelo ${FONTE_SICONFI}, a Câmara Municipal de Piracanjuba liquidou ${formatarReais(atual.liquidada!)} em despesas ${frasePeriodoOrcamento(atual)}${orcado}.`);
    const fechado = validos.find((o) => o !== atual && (o.periodo_referencia ?? 6) >= 6);
    if (fechado) {
      const pct = fechado.dotacao ? formatarPercentual(fechado.liquidada!, fechado.dotacao) : null;
      partes.push(`Em ${fechado.ano}, a despesa liquidada foi de ${formatarReais(fechado.liquidada!)}${pct ? `, ${pct} do orçamento de ${formatarReais(fechado.dotacao!)}` : ""}.`);
    }
  }
  const pag = pagamentosConfiaveis(pagamentos)[0];
  if (pag) {
    partes.push(`O ${FONTE_PORTAL_CAMARA} lista ${plural(pag.pagamentos, "pagamento", "pagamentos")} em ${pag.ano}, que somam ${formatarReais(pag.total)}.`);
    if (atual) {
      partes.push("São fontes diferentes: o SICONFI informa a despesa liquidada do orçamento, e o portal lista cada pagamento registrado.");
    }
  }
  return partes.length ? partes.join(" ") : null;
}

export function faqDespesas(orcamentos: OrcamentoCamaraAno[], pagamentos: PagamentosCamaraAno[]): ItemFaq[] {
  const itens: ItemFaq[] = [];
  const fechado = [...orcamentos]
    .filter((o) => o.liquidada !== null && (o.periodo_referencia ?? 6) >= 6)
    .sort((a, b) => b.ano - a.ano)[0];
  if (fechado) {
    itens.push({
      pergunta: "Quanto a Câmara de Piracanjuba gasta por ano?",
      resposta: `Em ${fechado.ano}, a despesa liquidada da Câmara foi de ${formatarReais(fechado.liquidada!)}${fechado.dotacao ? `, para um orçamento de ${formatarReais(fechado.dotacao)}` : ""}, segundo o ${FONTE_SICONFI}.`,
    });
  }
  const pag = pagamentosConfiaveis(pagamentos)[0];
  if (pag) {
    itens.push({
      pergunta: `Quantos pagamentos a Câmara de Piracanjuba fez em ${pag.ano}?`,
      resposta: `${plural(pag.pagamentos, "pagamento", "pagamentos")}, que somam ${formatarReais(pag.total)}, segundo o ${FONTE_PORTAL_CAMARA}.`,
    });
  }
  return itens;
}

// ---------------------------------------------------------------- Servidores e folha

export type ResumoFolhaParaTexto = {
  /** competência da última folha mensal, "2026-10" */
  competencia: string;
  bruto: number | null;
  pessoas: number;
} | null;

export type CadastroPessoalCamara = {
  /** "10/2026" */
  referencia: string;
  pessoas: number;
  cargos: number;
} | null;

export function paragrafoServidores(folha: ResumoFolhaParaTexto, cadastro: CadastroPessoalCamara): string | null {
  const partes: string[] = [];
  const mes = folha ? formatarCompetencia(folha.competencia) : null;
  if (folha && mes && folha.pessoas > 0) {
    const valor = folha.bruto === null ? "valor bruto não informado na fonte" : `${formatarReais(folha.bruto)} brutos`;
    partes.push(`Na folha mensal de ${mes}, a Câmara Municipal de Piracanjuba pagou ${valor} a ${plural(folha.pessoas, "pessoa", "pessoas")}, segundo o ${FONTE_PORTAL_CAMARA}.`);
  }
  if (cadastro && cadastro.pessoas > 0) {
    partes.push(`O cadastro de pessoal de ${cadastro.referencia} tem ${plural(cadastro.pessoas, "pessoa", "pessoas")} em ${plural(cadastro.cargos, "cargo", "cargos")}.`);
  }
  return partes.length ? partes.join(" ") : null;
}

export function faqServidores(folha: ResumoFolhaParaTexto, cadastro: CadastroPessoalCamara): ItemFaq[] {
  const itens: ItemFaq[] = [];
  const mes = folha ? formatarCompetencia(folha.competencia) : null;
  if (folha && mes && folha.pessoas > 0 && folha.bruto !== null) {
    itens.push({
      pergunta: "Quanto a Câmara de Piracanjuba gasta com a folha de pagamento?",
      resposta: `Na folha mensal de ${mes}, ${formatarReais(folha.bruto)} brutos, pagos a ${plural(folha.pessoas, "pessoa", "pessoas")}, segundo o ${FONTE_PORTAL_CAMARA}.`,
    });
  }
  if (cadastro && cadastro.pessoas > 0) {
    itens.push({
      pergunta: "Quantas pessoas trabalham na Câmara de Piracanjuba?",
      resposta: `O cadastro de pessoal de ${cadastro.referencia} tem ${plural(cadastro.pessoas, "pessoa", "pessoas")} em ${plural(cadastro.cargos, "cargo", "cargos")}, entre servidores, comissionados e vereadores.`,
    });
  }
  return itens;
}

// ---------------------------------------------------------------- Indicações, projetos e atuação

export function paragrafoIndicacoes(r: {
  total: number;
  ano: number;
  doAno: number;
  ultima: string | null;
}): string | null {
  if (!r.total) return null;
  const data = formatarData(r.ultima);
  return [
    // Sem indicação no ano corrente (por exemplo, no começo de janeiro), a oração do ano sai: "0 delas
    // em 2027" leria como falha de leitura (revisão da Onda 2, 2026-11-19).
    `Os vereadores de Piracanjuba têm ${plural(r.total, "indicação registrada", "indicações registradas")} no ${FONTE_PORTAL_CAMARA}${r.doAno > 0 ? `, ${formatarInteiro(r.doAno)} delas em ${r.ano}` : ""}${data ? `; a mais recente foi publicada em ${data}` : ""}.`,
    "Indicação é um pedido formal ao Executivo (Prefeitura), sem força de lei, para obras, saúde, educação, segurança ou outras áreas.",
  ].join(" ");
}

export function paragrafoProjetos(r: {
  total: number;
  tipoMaisComum: { tipo: string; quantidade: number } | null;
  ultima: string | null;
}): string | null {
  if (!r.total) return null;
  const partes = [`O ${FONTE_PORTAL_CAMARA} registra ${plural(r.total, "ato legislativo", "atos legislativos")}, entre projetos de lei do Legislativo e do Executivo, projetos de decreto, de resolução e emendas à Lei Orgânica.`];
  if (r.tipoMaisComum) partes.push(`O tipo mais frequente é ${r.tipoMaisComum.tipo}, com ${formatarInteiro(r.tipoMaisComum.quantidade)}.`);
  const data = formatarData(r.ultima);
  if (data) partes.push(`O mais recente foi publicado em ${data}.`);
  return partes.join(" ");
}

export function paragrafoAtuacao(r: { mocoes: number; requerimentos: number; ultima: string | null }): string | null {
  if (!r.mocoes && !r.requerimentos) return null;
  const data = formatarData(r.ultima);
  return [
    `O ${FONTE_PORTAL_CAMARA} registra ${plural(r.mocoes, "moção", "moções")} e ${plural(r.requerimentos, "requerimento", "requerimentos")}${data ? `; o mais recente foi publicado em ${data}` : ""}.`,
    "Moção é uma manifestação formal da Câmara (aplauso, pesar ou repúdio); requerimento é um pedido formal de informações ou providências.",
  ].join(" ");
}

// ---------------------------------------------------------------- Perguntas frequentes

export type ItemFaq = { pergunta: string; resposta: string };

/** FAQPage com exatamente as perguntas e respostas visíveis na aba. */
export function faqPageJsonLd(url: string, itens: ItemFaq[]) {
  if (!itens.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#perguntas`,
    url,
    mainEntity: itens.map((item) => ({
      "@type": "Question",
      name: item.pergunta,
      acceptedAnswer: { "@type": "Answer", text: item.resposta },
    })),
  };
}
