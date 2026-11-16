// Matérias, entrevistas e citações sobre o Piracanjuba.ai na imprensa.
//
// A lista está em ordem de relevância: alcance nacional antes de regional e,
// dentro de cada grupo, matéria dedicada ao projeto antes de citação, seguida
// do peso editorial do veículo.
// Links, títulos e datas conferidos nas páginas dos veículos em 2026-11-16.
// O resumo de cada item é texto nosso, não trecho da matéria.

export type MateriaNaMidia = {
  id: string;
  veiculo: string;
  titulo: string;
  url: string;
  /** Data de publicação no formato YYYY-MM-DD. */
  data: string;
  tipo: string;
  abrangencia: "Nacional" | "Goiás";
  autor?: string;
  resumo: string;
  /** Logo monocromático exibido na home e na página Na mídia. */
  logo?: { src: string; largura: number; altura: number };
  /** Aparece na faixa de logos da home. */
  destaqueHome?: boolean;
};

export type Republicacao = {
  veiculo: string;
  url: string;
  data: string;
  origem: string;
};

export const MATERIAS_NA_MIDIA: MateriaNaMidia[] = [
  {
    id: "piaui",
    veiculo: "revista piauí",
    titulo: "Piracanjuba, a cidade da transparênc.IA",
    url: "https://piaui.uol.com.br/web/piracanjuba-portal-transparencia-ia-gianluca-ferro/",
    data: "2026-07-15",
    tipo: "Reportagem de campo",
    abrangencia: "Nacional",
    autor: "Pedro Tavares",
    resumo:
      "O repórter visitou Piracanjuba, ouviu políticos locais e moradores e contou como o portal foi criado e o que mudou no debate sobre transparência na cidade.",
    logo: { src: "/midia/piaui.svg", largura: 1381, altura: 773 },
    destaqueHome: true,
  },
  {
    id: "cartacapital",
    veiculo: "CartaCapital",
    titulo: "Fiscal IA",
    url: "https://www.cartacapital.com.br/do-micro-ao-macro/fiscal-ia/",
    data: "2026-08-13",
    tipo: "Reportagem (site e edição impressa nº 1426)",
    abrangencia: "Nacional",
    autor: "Allan Ravagnani",
    resumo:
      "Reportagem sobre como o portal organiza com inteligência artificial os dados da Prefeitura e da Câmara, publicada no site e na edição impressa de 2026-08-19.",
    logo: { src: "/midia/cartacapital.svg", largura: 200, altura: 48 },
    destaqueHome: true,
  },
  {
    id: "times-brasil",
    veiculo: "Times Brasil | CNBC",
    titulo:
      "Transparência: goiano cria sistema gratuito com IA para facilitar fiscalização da gestão pública pela população e quer levar ideia para todo país",
    url: "https://timesbrasil.com.br/empresas-e-negocios/inteligencia-artificial/goiano-cria-ia-fiscalizacao-gestao-publica/",
    data: "2026-07-29",
    tipo: "Reportagem",
    abrangencia: "Nacional",
    autor: "Allan Ravagnani",
    resumo:
      "Reportagem sobre o portal gratuito, o uso combinado de vários modelos de inteligência artificial e os planos de levar o modelo a outras cidades de Goiás.",
    logo: { src: "/midia/timesbrasil.svg", largura: 100, altura: 39 },
    destaqueHome: true,
  },
  {
    id: "uol",
    veiculo: "UOL",
    titulo: "Sem marco legal, IA cidadã avança no Brasil",
    url: "https://economia.uol.com.br/colunas/aline-sordili/2026/06/03/sem-marco-legal-ia-cidada-avanca-no-brasil.htm",
    data: "2026-06-03",
    tipo: "Reportagem (no espaço da colunista)",
    abrangencia: "Nacional",
    autor: "Aline Sordili",
    resumo:
      "Reportagem sobre o avanço da inteligência artificial cidadã no Brasil, que cita o Piracanjuba.ai entre as iniciativas independentes de transparência pública.",
    logo: { src: "/midia/uol.svg", largura: 68, altura: 36 },
    destaqueHome: true,
  },
  {
    id: "o-popular",
    veiculo: "O Popular",
    titulo: "Empresário cria com IA site de transparência em Piracanjuba",
    url: "https://opopular.com.br/politica/empresario-cria-com-ia-site-de-transparencia-em-piracanjuba-1.3434452",
    data: "2026-07-17",
    tipo: "Reportagem",
    abrangencia: "Goiás",
    autor: "Gabriel Neves",
    resumo:
      "Reportagem da editoria de Política sobre como o portal foi feito e como cruza dados públicos, com a avaliação de pesquisadores de inteligência artificial da UFG.",
    logo: { src: "/midia/opopular.svg", largura: 282, altura: 45 },
    destaqueHome: true,
  },
  {
    id: "cbn-goiania",
    veiculo: "CBN Goiânia",
    titulo: "Site usa IA para ampliar transparência em Piracanjuba",
    url: "https://cbngoiania.com.br/tarde-cbn/na-trilha-da-politica/site-usa-ia-para-ampliar-transparencia-em-piracanjuba-1.3435078",
    data: "2026-07-20",
    tipo: "Entrevista em rádio",
    abrangencia: "Goiás",
    autor: "Cileide Alves (Na Trilha da Política)",
    resumo:
      "Entrevista ao programa Na Trilha da Política sobre como o portal reúne dados públicos para facilitar a fiscalização da administração municipal.",
    logo: { src: "/midia/cbn.svg", largura: 1024, altura: 333 },
    destaqueHome: true,
  },
  {
    id: "mais-goias",
    veiculo: "Mais Goiás",
    titulo: "Empresário cria plataforma com IA para fiscalizar dados públicos",
    url: "https://www.maisgoias.com.br/cidades/empresario-cria-plataforma-com-ia-para-facilitar-fiscalizacao-de-dados-publicos-em-piracanjuba/",
    data: "2026-07-20",
    tipo: "Reportagem",
    abrangencia: "Goiás",
    autor: "Inglid Martins",
    resumo:
      "Reportagem sobre como a plataforma cruza contratos, licitações e fornecedores e sobre a expansão do modelo para Goiânia e para o Estado.",
  },
];

/** Sites que reproduziram a reportagem do Mais Goiás. */
export const REPUBLICACOES_NA_MIDIA: Republicacao[] = [
  {
    veiculo: "Estado de Goiás",
    url: "https://estadodegoias.com.br/empresario-cria-plataforma-com-ia-para-fiscalizar-dados-publicos/",
    data: "2026-07-20",
    origem: "Mais Goiás",
  },
  {
    veiculo: "Rádio Verde Vale FM",
    url: "https://www.verdevale103.com.br/post/empres%C3%A1rio-cria-plataforma-com-ia-para-facilitar-fiscaliza%C3%A7%C3%A3o-de-dados-p%C3%BAblicos-em-piracanjuba",
    data: "2026-07-20",
    origem: "Mais Goiás",
  },
  {
    veiculo: "5 de Junho",
    url: "https://cincodejunho.com.br/news/empresario-cria-plataforma-com-ia-para-facilitar-fiscalizacao-de-dados-publicos-em-piracanjuba",
    data: "2026-07-21",
    origem: "Mais Goiás",
  },
];

export const MATERIAS_DESTAQUE_HOME = MATERIAS_NA_MIDIA.filter((m) => m.destaqueHome && m.logo);
