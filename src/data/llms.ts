// Conteúdo curado de /llms.txt e /llms-full.txt (formato do llmstxt.org).
//
// As rotas src/app/llms.txt/route.ts e src/app/llms-full.txt/route.ts chamam o
// sitemap (src/app/sitemap.ts) e listam só os caminhos que ele publica, com o
// título, a descrição e a seção definidos aqui. Assim, uma seção nova entra no
// llms.txt no mesmo deploy em que entra no sitemap. Caminho do sitemap sem
// entrada aqui não some: vai para "Outras páginas", sem descrição, e o teste
// tests/llms.test.ts falha até a entrada ser escrita.
//
// Regras de texto (conferidas em tests/llms.test.ts):
// - sem travessão (U+2014) nem meia-risca (U+2013);
// - nada de "sem fins lucrativos": o projeto é mantido por uma empresa, que
//   vende as páginas de empresa;
// - não prometer o que o site não mostra (votações, presença em sessões,
//   metodologia);
// - número só com fonte e data conferidas. População e área conferidas em
//   2026-11-17 na API do IBGE: agregado 6579, variável 9324 (estimativa da
//   população residente de 2026 para o município 5217104: 25.436) e indicador
//   29167 (área territorial de 2025: 2.374,232 km²).
//
// Em tempo de execução, este arquivo só importa src/data/notaTransparencia.ts, que
// não importa nada, para que o teste rode direto no node --test (por isso o
// import leva a extensão .ts). Os dados das empresas chegam por parâmetro.

import { NOTA_PNTP } from "./notaTransparencia.ts";

export const SITE_URL = "https://piracanjuba.ai";

export type PaginaLlms = {
  caminho: string;
  titulo: string;
  /** Uma frase, usada no llms.txt. */
  descricao: string;
  /** Texto mais longo, usado só no llms-full.txt (na falta dele, vale a descrição). */
  detalhe?: string;
};

export type SecaoLlms = {
  titulo: string;
  /** Parágrafo que abre a seção, como o aviso das páginas pagas. */
  aviso?: string;
  paginas: PaginaLlms[];
};

/** Grupo de páginas dinâmicas do sitemap, resumido numa linha só. */
export type GrupoDinamicoLlms = {
  secao: string;
  prefixo: string;
  titulo: string;
  /** Página que reúne o grupo, usada como link do resumo. */
  caminhoIndice: string;
  resumo: (quantidade: number) => string;
  /** Se as páginas aparecem uma a uma no llms-full.txt. */
  listarNoCompleto: boolean;
};

/** Dados mínimos de uma página de empresa (estrutura compatível com src/data/empresas.ts). */
export type EmpresaFonte = {
  slug: string;
  nome: string;
  seo: { descricao: string };
  vinculo?: string;
};

export type EmpresaLlms = {
  caminho: string;
  nome: string;
  descricao: string;
  vinculo?: string;
};

export type EntradaLlms = {
  /** URLs absolutas devolvidas pelo sitemap. */
  urls: string[];
  empresas: EmpresaLlms[];
  /**
   * Momento em que o texto foi gerado (a rota se regenera a cada hora). Sai como
   * "Gerado em", e não "Atualizado em", porque não indica mudança de conteúdo.
   */
  geradoEm: Date;
};

const SECAO_TRANSPARENCIA = "Transparência";
const SECAO_SERVICOS = "Serviços da cidade";
const SECAO_DADOS = "Dados e indicadores";
const SECAO_SOBRE = "Sobre e imprensa";
const SECAO_EMPRESAS = "Páginas de empresas";
const SECAO_OUTRAS = "Outras páginas";

export const DESCRICAO_CURTA =
  "Portal independente de transparência municipal de Piracanjuba (GO). Reúne dados públicos oficiais da Prefeitura, da Câmara Municipal e de órgãos estaduais e federais, com resumos feitos por inteligência artificial e link para a fonte de cada informação.";

export const NATUREZA_DO_PROJETO =
  "O Piracanjuba.ai é um projeto independente mantido pela Ferro Labs Tecnologia LTDA (CNPJ 66.034.538/0001-25) e não tem vínculo com a Prefeitura nem com a Câmara Municipal de Piracanjuba. A consulta aos dados públicos é gratuita. As páginas de empresas são pagas e aparecem identificadas como página patrocinada.";

export const MUNICIPIO = {
  nome: "Piracanjuba",
  localizacao: "Goiás, região Centro-Oeste do Brasil",
  codigoIbge: "5217104",
  populacao: "cerca de 25,4 mil habitantes (IBGE, estimativa da população residente para 2026)",
  area: "2.374,232 km² (IBGE, área territorial oficial de 2025)",
};

export const FONTES_OFICIAIS: { titulo: string; url: string; descricao: string }[] = [
  {
    titulo: "Prefeitura de Piracanjuba",
    url: "https://piracanjuba.go.gov.br/",
    descricao: "Site oficial e portal de transparência do Executivo municipal.",
  },
  {
    titulo: "Câmara Municipal de Piracanjuba, acesso à informação",
    url: "https://acessoainformacao.piracanjuba.go.leg.br/",
    descricao: "Portal de transparência do Legislativo municipal.",
  },
  {
    titulo: "Tribunal de Contas dos Municípios de Goiás (TCM-GO)",
    url: "https://www.tcm.go.gov.br/",
    descricao: "Acórdãos, decisões e prestações de contas dos municípios goianos.",
  },
  {
    titulo: "IBGE Cidades",
    url: "https://cidades.ibge.gov.br/brasil/go/piracanjuba/panorama",
    descricao: "População, área e indicadores socioeconômicos do município.",
  },
  {
    titulo: "Portal da Transparência do Governo Federal",
    url: "https://portaldatransparencia.gov.br/",
    descricao: "Programas sociais, transferências e emendas parlamentares federais.",
  },
  {
    titulo: "SICONFI, Tesouro Nacional",
    url: "https://siconfi.tesouro.gov.br/",
    descricao: "Declarações contábeis e fiscais da Prefeitura e da Câmara.",
  },
  {
    titulo: "CNES, DATASUS",
    url: "https://cnes.datasus.gov.br/",
    descricao: "Cadastro nacional dos estabelecimentos e profissionais de saúde.",
  },
  {
    titulo: "IDEB, INEP",
    url: "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/ideb",
    descricao: "Índice de Desenvolvimento da Educação Básica das escolas.",
  },
  {
    titulo: "Agência Nacional do Petróleo (ANP)",
    url: "https://www.gov.br/anp/pt-br",
    descricao: "Cadastro e situação regulatória dos postos de combustível.",
  },
  {
    titulo: "Receita Federal, consulta de CNPJ",
    url: "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp",
    descricao: "Situação cadastral e quadro societário dos fornecedores.",
  },
];

export const CONTATO = {
  instagram: "https://www.instagram.com/piracanjuba.ai",
  email: "contato@ferrolabs.com.br",
};

const ABAS_PREFEITURA: PaginaLlms[] = [
  { caminho: "/prefeitura/chefia", titulo: "Prefeita e vice-prefeito", descricao: "Prefeita, vice-prefeito, remuneração e financiadores de campanha do Executivo." },
  { caminho: "/prefeitura/secretarias", titulo: "Secretarias da Prefeitura", descricao: "Secretarias municipais, secretários e remuneração." },
  { caminho: "/prefeitura/contratos", titulo: "Contratos da Prefeitura", descricao: "Contratos com fornecedor, valor, vigência, situação cadastral do CNPJ e resumo por IA." },
  { caminho: "/prefeitura/servidores", titulo: "Servidores da Prefeitura", descricao: "Folha de pagamento e remuneração dos servidores, por cargo e competência." },
  { caminho: "/prefeitura/funprepi", titulo: "FUNPREPI, previdência municipal", descricao: "Despesas, benefícios, contratos, cobertura dos dados e evidências atuariais do Fundo de Previdência Social de Piracanjuba." },
  { caminho: "/prefeitura/despesas", titulo: "Despesas da Prefeitura", descricao: "Despesas e pagamentos a fornecedores, com resumo por IA." },
  { caminho: "/prefeitura/prestacao-contas", titulo: "Prestação de contas da Prefeitura", descricao: "PPA, LDO, LOA, RREO, RGF, balancete e balanço anual, com links para as fontes oficiais." },
  { caminho: "/prefeitura/tcm-go", titulo: "Apontamentos do TCM-GO", descricao: "Acórdãos, decisões e apontamentos do Tribunal de Contas dos Municípios de Goiás sobre Piracanjuba, com resumo por IA." },
  { caminho: "/prefeitura/decretos", titulo: "Decretos municipais", descricao: "Decretos do Executivo municipal, com resumo por IA." },
  { caminho: "/prefeitura/portarias", titulo: "Portarias municipais", descricao: "Portarias do Executivo municipal." },
  { caminho: "/prefeitura/leis", titulo: "Leis municipais", descricao: "Leis municipais, com resumo por IA." },
  { caminho: "/prefeitura/lei-organica", titulo: "Lei Orgânica do município", descricao: "Texto e artigos da Lei Orgânica de Piracanjuba." },
  { caminho: "/prefeitura/diarias", titulo: "Diárias da Prefeitura", descricao: "Diárias pagas pela Prefeitura, com favorecido, destino e valor." },
  { caminho: "/prefeitura/licitacoes", titulo: "Licitações da Prefeitura", descricao: "Licitações, modalidades e editais." },
  { caminho: "/prefeitura/obras", titulo: "Obras públicas", descricao: "Obras municipais com situação, empresa responsável e valores." },
  { caminho: "/prefeitura/veiculos", titulo: "Frota de veículos da Prefeitura", descricao: "Veículos do Executivo (placa, tipo, marca, ano, combustível, órgão e situação), com dados do portal de transparência da Prefeitura (Centi)." },
];

const ABAS_CAMARA: PaginaLlms[] = [
  { caminho: "/camara/servidores", titulo: "Servidores da Câmara", descricao: "Servidores e folha de pagamento da Câmara Municipal." },
  { caminho: "/camara/contratos", titulo: "Contratos da Câmara", descricao: "Contratos com fornecedor, valor e vigência, com resumo por IA." },
  { caminho: "/camara/projetos", titulo: "Projetos de lei", descricao: "Projetos de lei, resoluções e decretos legislativos, por autor e situação." },
  { caminho: "/camara/atuacao", titulo: "Atuação parlamentar na Câmara", descricao: "Requerimentos, moções e proposições dos vereadores, com resumo por IA." },
  { caminho: "/camara/indicacoes", titulo: "Indicações dos vereadores", descricao: "Indicações dos vereadores ao Executivo, com resumo por IA." },
  { caminho: "/camara/resolucoes", titulo: "Resoluções da Câmara", descricao: "Resoluções da Câmara Municipal, com resumo por IA." },
  { caminho: "/camara/decretos-leg", titulo: "Decretos legislativos", descricao: "Decretos legislativos da Câmara, com resumo por IA." },
  { caminho: "/camara/pautas", titulo: "Pautas das sessões", descricao: "Pautas e ordem do dia das sessões da Câmara." },
  { caminho: "/camara/atas", titulo: "Atas das sessões", descricao: "Atas das sessões da Câmara, com resumo por IA." },
  { caminho: "/camara/transmissao", titulo: "Transmissões das sessões", descricao: "Transmissões e vídeos das sessões da Câmara." },
  { caminho: "/camara/licitacoes", titulo: "Licitações da Câmara", descricao: "Licitações e editais da Câmara, com modalidade e valor." },
  { caminho: "/camara/despesas", titulo: "Despesas da Câmara", descricao: "Despesas e empenhos da Câmara, por credor." },
  { caminho: "/camara/receitas", titulo: "Orçamento da Câmara", descricao: "Orçamento da função Legislativa, orçado e executado, conforme o SICONFI do Tesouro Nacional." },
  { caminho: "/camara/prestacao-contas", titulo: "Prestação de contas da Câmara", descricao: "PPA, LDO, LOA, RREO, RGF, balancete, balanço anual e pareceres do TCM-GO sobre a Câmara." },
  { caminho: "/camara/diarias", titulo: "Diárias da Câmara", descricao: "Diárias pagas pela Câmara, com beneficiário, destino e valor." },
];

export const SECOES_LLMS: SecaoLlms[] = [
  {
    titulo: SECAO_TRANSPARENCIA,
    paginas: [
      {
        caminho: "/",
        titulo: "Início",
        descricao: "Página inicial do portal, com destaques e atalhos para Prefeitura, Câmara, vereadores, contratos, serviços da cidade e classificados.",
      },
      {
        caminho: "/prefeitura",
        titulo: "Prefeitura de Piracanjuba",
        descricao: "Visão geral do Executivo: prefeita, secretarias, servidores, FUNPREPI, contratos, despesas, obras, licitações e atos oficiais.",
        detalhe:
          "Visão geral do Poder Executivo municipal. Cada tema tem uma página própria (listadas a seguir): chefia do Executivo, secretarias, contratos, folha dos servidores, FUNPREPI, despesas, prestação de contas, apontamentos do TCM-GO, decretos, portarias, leis, Lei Orgânica, diárias, licitações, obras e frota de veículos. Os dados vêm dos portais oficiais e trazem link para a fonte.",
      },
      ...ABAS_PREFEITURA,
      {
        caminho: "/camara",
        titulo: "Câmara Municipal de Piracanjuba",
        descricao: "Visão geral do Legislativo: vereadores, servidores, contratos, projetos, atuação parlamentar, atos, despesas, orçamento, diárias e licitações.",
        detalhe:
          "Visão geral do Poder Legislativo municipal. Cada tema tem uma página própria (listadas a seguir): servidores, contratos, projetos de lei, atuação parlamentar, indicações, resoluções, decretos legislativos, pautas, atas, transmissões, licitações, despesas, orçamento, prestação de contas e diárias.",
      },
      ...ABAS_CAMARA,
      {
        caminho: "/vereadores",
        titulo: "Vereadores de Piracanjuba",
        descricao: "Lista dos vereadores com partido, cargo na Mesa Diretora, votos na eleição e contato, com link para o perfil de cada um.",
      },
      {
        caminho: "/transparencia/cotas-parlamentares",
        titulo: "Cotas parlamentares na Câmara",
        descricao: "Declaração oficial da Câmara de que não há cota parlamentar nem verba indenizatória para os vereadores, com o que eles recebem: subsídio mensal e diárias.",
      },
      {
        caminho: "/atuacao-parlamentar",
        titulo: "Atuação parlamentar",
        descricao: "Requerimentos, indicações, moções e proposições dos vereadores.",
      },
      {
        caminho: "/emendas",
        titulo: "Emendas parlamentares",
        descricao: "Emendas federais e estaduais destinadas a Piracanjuba, com parlamentar autor, valor empenhado, valor pago e objeto.",
      },
      {
        caminho: "/investigacoes",
        titulo: "Investigações de contratos públicos",
        descricao: "Indícios gerados por cruzamento de licitações, contratos, aditivos, empenhos, pagamentos, quadro societário, sanções e doações eleitorais. Indício não é prova de corrupção.",
      },
      {
        caminho: "/nota-pba",
        titulo: "Nota de transparência",
        descricao: `Posição da Prefeitura e da Câmara no Ranking da Transparência ${NOTA_PNTP.ano} do TCM-GO (Programa Nacional de Transparência Pública, PNTP/ATRICON), com o ranking dos ${NOTA_PNTP.executivo.total} municípios de Goiás e link para os PDFs oficiais.`,
      },
      {
        caminho: "/grupos-economicos",
        titulo: "Grupos econômicos entre os fornecedores",
        descricao: "Empresas com contrato na Prefeitura ou na Câmara que compartilham sócios, pelo cruzamento do quadro societário da Receita Federal com os contratos públicos.",
      },
    ],
  },
  {
    titulo: SECAO_SERVICOS,
    paginas: [
      {
        caminho: "/plantao-farmacias",
        titulo: "Farmácias de plantão",
        descricao: "Escala de plantão das farmácias, com a farmácia aberta 24 horas na semana, telefones, WhatsApp e rota pelo Waze.",
      },
      {
        caminho: "/coleta-lixo",
        titulo: "Coleta de lixo",
        descricao: "Dias da coleta de lixo comum e da coleta seletiva em cada bairro (cronograma de 2025), cor do saco e horário para pôr o lixo na calçada.",
      },
      {
        caminho: "/horarios-onibus",
        titulo: "Horários de ônibus",
        descricao: "Horários de ônibus saindo de Piracanjuba por destino e data, com pontos de embarque, contatos das transportadoras e fonte da consulta.",
      },
      {
        caminho: "/postos-combustivel",
        titulo: "Postos de combustível",
        descricao: "Postos com bandeira, produtos, endereço e situação regulatória, com dados da ANP.",
      },
      {
        caminho: "/pba-fipe",
        titulo: "PBAFipe: tabela FIPE",
        descricao: "Consulta do preço médio de carros, motos e caminhões na tabela FIPE do mês, por marca, modelo e ano, com código FIPE e mês de referência.",
      },
      {
        caminho: "/contatos",
        titulo: "Contatos úteis",
        descricao: "Telefones e WhatsApp de serviços públicos essenciais: polícia, bombeiros, SAMU, Prefeitura e outros.",
      },
      {
        caminho: "/clima",
        titulo: "Previsão do tempo",
        descricao: "Previsão do tempo em Piracanjuba para hoje e os próximos dias, leitura atual com horário, chuva do mês e histórico mensal.",
      },
      {
        caminho: "/zap-pba",
        titulo: "Zap PBA",
        descricao: "Diretório de empresas e prestadores de serviços de Piracanjuba por categoria, com WhatsApp e páginas sobre a atividade de cada negócio. Endereços e perfis sociais aparecem quando disponíveis.",
      },
      {
        caminho: "/estetica",
        titulo: "Essência Estética em Piracanjuba",
        descricao: "Clínica de estética em Piracanjuba. Veja opções de limpeza de pele, massagem e Head Spa, localização e os contatos de cada profissional para agendamento.",
      },
      {
        caminho: "/quiropraxia",
        titulo: "Quiropraxia em Piracanjuba | Juan Carlos Mesquita de Souza",
        descricao: "Quiropraxia, liberação miofascial e ventosaterapia com Juan na Clínica Essência em Piracanjuba. Possíveis benefícios e limites das técnicas, dúvidas da primeira visita, contato e rotas para quem vem da região.",
      },
      {
        caminho: "/agro-franca",
        titulo: "Grupo Agro França",
        descricao: "Produção de milho e soja em Piracanjuba, dados da safra, Encontro Técnico Agro França e contato pelo Instagram do grupo.",
      },
      {
        caminho: "/oticas-diego",
        titulo: "Óticas Diego em Piracanjuba",
        descricao: "Ótica e perfumaria na Rua Dom Pedro II, 491, no Centro de Piracanjuba. Armações, lentes de grau, óculos de sol, perfumes árabes, importados e nacionais, relógios Seculus e Mondaine e semijoias com garantia. Consulte o horário, o WhatsApp e a rota até a loja.",
      },
      {
        caminho: "/claro",
        titulo: "Claro Piracanjuba",
        descricao: "Loja Claro na Rua Dom Pedro II, 620, no Centro. WhatsApp local, telefone e mapa para consultar telefonia móvel, internet e TV.",
      },
      {
        caminho: "/viaggi-vistos",
        titulo: "Visto americano em Piracanjuba e região | Viaggi Vistos",
        descricao: "Assessoria da Viaggi Vistos para visto americano em Piracanjuba, Professor Jamil, Morrinhos, Caldas Novas e cidades vizinhas: DS-160, taxa, agendamento, CASV e entrevista em Brasília, renovação e Antecipa 45, com atendimento online e contato por WhatsApp.",
      },
      {
        caminho: "/kamillamorranna",
        titulo: "Kamilla Morranna, advogada criminalista em Piracanjuba",
        descricao: "Kamilla Morranna Alves Cunha (OAB/GO 55.151), advogada criminalista em Piracanjuba. Defesa criminal, prisão em flagrante, audiência de custódia e Tribunal do Júri, com atendimento presencial e online e contato por WhatsApp.",
      },
      {
        caminho: "/box-87-auto-center",
        titulo: "Box 87 Auto Center em Piracanjuba",
        descricao: "Auto center e auto elétrica na Rua João Modesto, 12, Setor Norte. Elétrica e manutenção de carros, parte elétrica e iluminação de tratores e implementos, horário e WhatsApp para agendar.",
      },
      {
        caminho: "/naraienemarquesadv",
        titulo: "Naraiene Marques Advocacia",
        descricao: "Perfil da advogada Naraiene Cristina Marques (OAB/GO 51.371), com informações sobre sua atuação em Goiás e contato pelo Instagram profissional.",
      },
      {
        caminho: "/zap-pba/wennder-trindade-advogado",
        titulo: "Wennder Trindade, advogado em Piracanjuba",
        descricao: "Wennder Trindade e Silva, advogado em Piracanjuba (OAB/GO 51.422). Áreas de atuação em direito de família, sucessões e partilha, consumidor, direito civil e cobranças, criminal e administrativo. Inclui WhatsApp para agendamento e localização.",
      },
      {
        caminho: "/master-tech-auto-center",
        titulo: "Master Tech Auto Center, oficina mecânica em Piracanjuba",
        descricao: "Oficina mecânica na Rua Lindolfo França, 490, no Centro de Piracanjuba. Diagnóstico com scanner, motor e injeção eletrônica, câmbio manual e automático, embreagem, suspensão, freios, alinhamento 3D, troca de óleo, escapamento e revitalização de faróis. Horário, WhatsApp e rota até a oficina.",
      },
      {
        caminho: "/hotel",
        titulo: "Hotel Via Sul, hotel em Piracanjuba no Centro",
        descricao: "Hotel no Centro de Piracanjuba, na Rua Vereador Hugo Vargas Batista Machado, a cerca de 150 metros da Rodoviária, 250 metros da Prefeitura e 270 metros da Câmara. Check-in a partir das 14h, check-out até as 12h, recepção 24 horas, Wi-Fi e estacionamento gratuitos, café da manhã, fotos dos quartos e reserva pelo WhatsApp.",
      },
      {
        caminho: "/estacionamentoaeroporto",
        titulo: "DR Park, estacionamento no Aeroporto de Goiânia",
        descricao: "Estacionamento 24 horas com duas unidades na Alameda Aeroporto, em frente ao Aeroporto Internacional de Goiânia (Santa Genoveva, GYN). Traslado gratuito, vagas cobertas, seguro Porto Seguro, preços da diária e reserva por WhatsApp.",
      },
      {
        caminho: "/b10-auto-center",
        titulo: "B10 Auto Center, oficina mecânica e auto peças em Piracanjuba",
        descricao: "Oficina mecânica e balcão de auto peças na Rua Prof. Percival Rebelo, no Centro de Piracanjuba. Injeção eletrônica, suspensão, troca de óleo, troca de óleo do câmbio automático (oficina associada da rede Câmbio Automático do Brasil) e engates. Horário de segunda a sexta, das 7h às 18h, WhatsApp de agendamento e de peças e rota até a loja.",
      },
      {
        caminho: "/evadvocacia",
        titulo: "Ellen Vieira Advocacia e Consultoria Jurídica",
        descricao: "Escritório de Ellen Vieira (OAB-GO 42.685) em Piracanjuba. Atuação em Direito de Família e Sucessões, Penal, Civil, do Consumidor, Previdenciário e Imobiliário, com endereço e contato por WhatsApp.",
      },
      {
        caminho: "/pacifico-siqueira-advocacia",
        titulo: "Pacífico Siqueira Advocacia",
        descricao: "Escritório de advocacia no Centro de Piracanjuba. Áreas de atuação, advogados, horário de atendimento, localização e contato para agendar uma conversa.",
      },
      {
        caminho: "/compra-e-venda",
        titulo: "Compra e Venda PBA",
        descricao: "Classificados gratuitos de Piracanjuba: imóveis, veículos, agro, eletrônicos e serviços, com fotos e contato por WhatsApp.",
      },
    ],
  },
  {
    titulo: SECAO_DADOS,
    paginas: [
      {
        caminho: "/dados-pba",
        titulo: "Dados PBA",
        descricao: "Painel que reúne os dados públicos do município: saúde, educação, agro, área social, impostos, segurança, meio ambiente, economia, infraestrutura e indicadores.",
      },
      {
        caminho: "/indicadores",
        titulo: "Indicadores municipais",
        descricao: "Indicadores socioeconômicos: população, PIB per capita, IDEB, IDHM, frota, salário médio, saneamento e empregos formais.",
      },
      {
        caminho: "/comparador",
        titulo: "Comparador municipal",
        descricao: "Piracanjuba comparada a Pontalina, Hidrolândia, Bela Vista de Goiás, Cristianópolis e Cromínia em população, PIB per capita, IDHM, IDEB, salário médio e outros indicadores.",
      },
      {
        caminho: "/saude",
        titulo: "Saúde",
        descricao: "Dengue (InfoDengue), estabelecimentos do CNES, profissionais, leitos e dados da Secretaria de Saúde de Goiás.",
      },
      {
        caminho: "/educacao",
        titulo: "Educação",
        descricao: "Escolas, IDEB, matrículas, programas educacionais, ensino superior e Pé-de-Meia.",
      },
      {
        caminho: "/agro",
        titulo: "Agro",
        descricao: "Produção agropecuária, pecuária, lavouras, chuva acumulada comparada à média histórica e calendário de plantio (ZARC/MAPA e Embrapa).",
      },
      {
        caminho: "/economia",
        titulo: "Economia local",
        descricao: "PIB municipal, comparação com cidades vizinhas, CAGED mensal, salários da RAIS por setor, empresas ativas e MEIs.",
      },
      {
        caminho: "/arrecadacao",
        titulo: "Arrecadação municipal",
        descricao: "Receitas próprias, IPTU, ISS, IPVA, transferências, valores por habitante e comparativos.",
      },
      {
        caminho: "/beneficios-sociais",
        titulo: "Benefícios sociais",
        descricao: "Bolsa Família, BPC, Tarifa Social e outros programas no município, com calendário e orientações de cadastro.",
      },
      {
        caminho: "/seguranca",
        titulo: "Segurança pública",
        descricao: "Ocorrências registradas, série histórica por ano e telefones de emergência.",
      },
      {
        caminho: "/infraestrutura",
        titulo: "Infraestrutura urbana",
        descricao: "Saneamento básico, tarifa de energia, cobertura de telefonia 4G e 5G, pavimentação e relação entre saneamento e dengue.",
      },
      {
        caminho: "/meio-ambiente",
        titulo: "Meio ambiente",
        descricao: "Uso do solo pela série histórica do MapBiomas, risco de fogo, pressão agrícola, emissões de CO2 da frota e saúde hídrica.",
      },
    ],
  },
  {
    titulo: SECAO_SOBRE,
    paginas: [
      {
        caminho: "/sobre",
        titulo: "Sobre o Piracanjuba.ai",
        descricao: "O que o portal reúne, como a inteligência artificial é usada, perguntas frequentes, fontes oficiais e política de dados.",
      },
      {
        caminho: "/na-midia",
        titulo: "Na mídia",
        descricao: "Reportagens, entrevistas e citações sobre o Piracanjuba.ai na imprensa, com link para cada matéria.",
      },
      {
        caminho: "/historia-pba",
        titulo: "História de Piracanjuba",
        descricao: "Origem do nome, Festa de Agosto de Nossa Senhora d'Abadia, Exposição Nacional de Orquídeas, título de Capital das Orquídeas e curiosidades do município.",
      },
      {
        caminho: "/noticias",
        titulo: "Notícias",
        descricao: "Notícias sobre Piracanjuba e região, reunidas de fontes oficiais e veículos locais.",
      },
      // Página de venda do próprio portal, sem selo de patrocinada: fica aqui, e não
      // sob o aviso de "Páginas de empresas", que vale só para as páginas pagas.
      {
        caminho: "/anuncie",
        titulo: "Anuncie sua empresa",
        descricao: "Como contratar uma página própria de empresa no Piracanjuba.ai: o que inclui, preço e forma de pagamento.",
      },
      {
        caminho: "/privacidade",
        titulo: "Política de privacidade",
        descricao: "Tratamento de dados pessoais conforme a LGPD: dados coletados, finalidade, base legal, direitos do titular e contato.",
      },
    ],
  },
  {
    titulo: SECAO_EMPRESAS,
    aviso:
      "Páginas pagas por empresas, identificadas no próprio site como \"Página patrocinada\". O conteúdo é da empresa e não faz parte da cobertura de transparência do Piracanjuba.ai.",
    // Sob o aviso entram só as páginas de empresa (SLUGS_EMPRESAS), que chegam por
    // parâmetro; nenhuma página do próprio portal fica aqui.
    paginas: [],
  },
];

export const GRUPOS_DINAMICOS: GrupoDinamicoLlms[] = [
  {
    secao: SECAO_SERVICOS,
    prefixo: "/zap-pba/",
    titulo: "Negócios do Zap PBA",
    caminhoIndice: "/zap-pba",
    resumo: (n) =>
      `${n} ${n === 1 ? "página de negócio local" : "páginas de negócios locais"} em /zap-pba/<nome>, com atividade e contato. O diretório organiza as fichas por categoria.`,
    listarNoCompleto: false,
  },
  {
    secao: SECAO_TRANSPARENCIA,
    prefixo: "/vereadores/",
    titulo: "Perfis dos vereadores",
    caminhoIndice: "/vereadores",
    resumo: (n) =>
      `${n} ${n === 1 ? "perfil individual" : "perfis individuais"} em /vereadores/<nome>, com projetos de lei, atuação parlamentar, moções e requerimentos, declaração oficial da Câmara de que não há cota parlamentar, remuneração mensal e financiadores de campanha.`,
    listarNoCompleto: true,
  },
  {
    secao: SECAO_SERVICOS,
    prefixo: "/compra-e-venda/",
    titulo: "Anúncios do Compra e Venda",
    caminhoIndice: "/compra-e-venda",
    resumo: (n) =>
      `${n} ${n === 1 ? "anúncio ativo" : "anúncios ativos"} em /compra-e-venda/<id>, publicados pelos próprios anunciantes. A lista completa está no sitemap.xml.`,
    listarNoCompleto: false,
  },
];

const PAGINAS_POR_CAMINHO = new Map<string, { secao: string; pagina: PaginaLlms }>();
for (const secao of SECOES_LLMS) {
  for (const pagina of secao.paginas) {
    PAGINAS_POR_CAMINHO.set(pagina.caminho, { secao: secao.titulo, pagina });
  }
}

/** Página curada de um caminho, se houver. */
export function paginaCurada(caminho: string): PaginaLlms | undefined {
  return PAGINAS_POR_CAMINHO.get(caminho)?.pagina;
}

/** Converte as fichas de src/data/empresas.ts no formato do llms. */
export function empresasParaLlms(empresas: EmpresaFonte[]): EmpresaLlms[] {
  return empresas.map((e) => ({
    caminho: `/${e.slug}`,
    nome: e.nome,
    descricao: e.seo.descricao,
    vinculo: e.vinculo,
  }));
}

/** Data no fuso de Brasília, no formato YYYY-MM-DD. */
export function dataIso(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

/** Caminho de uma URL do próprio site, sem barra final. Devolve null para outro domínio. */
export function caminhoDaUrl(url: string): string | null {
  let alvo: URL;
  try {
    alvo = new URL(url);
  } catch {
    return null;
  }
  if (alvo.origin !== SITE_URL) return null;
  const caminho = alvo.pathname.replace(/\/+$/, "");
  return caminho === "" ? "/" : caminho;
}

function urlAbsoluta(caminho: string): string {
  return caminho === "/" ? `${SITE_URL}/` : `${SITE_URL}${caminho}`;
}

function limpar(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

function linha(titulo: string, caminho: string, descricao?: string): string {
  const d = limpar(descricao ?? "");
  return `- [${titulo}](${urlAbsoluta(caminho)})${d ? `: ${d}` : ""}`;
}

type SecaoMontada = {
  titulo: string;
  aviso?: string;
  paginas: PaginaLlms[];
  grupos: { grupo: GrupoDinamicoLlms; caminhos: string[] }[];
  empresas: EmpresaLlms[];
  outras: string[];
};

/**
 * Distribui os caminhos do sitemap pelas seções. Nenhum caminho é descartado:
 * o que não é curado, dinâmico nem empresa cai em "Outras páginas".
 */
export function classificarCaminhos(urls: string[], empresas: EmpresaLlms[]): SecaoMontada[] {
  const caminhos: string[] = [];
  const vistos = new Set<string>();
  for (const url of urls) {
    const caminho = caminhoDaUrl(url);
    if (caminho && !vistos.has(caminho)) {
      vistos.add(caminho);
      caminhos.push(caminho);
    }
  }

  const empresasPorCaminho = new Map(empresas.map((e) => [e.caminho, e]));
  const porGrupo = new Map<GrupoDinamicoLlms, string[]>();
  const empresasPresentes: EmpresaLlms[] = [];
  const outras: string[] = [];

  for (const caminho of caminhos) {
    if (PAGINAS_POR_CAMINHO.has(caminho)) continue;
    const empresa = empresasPorCaminho.get(caminho);
    if (empresa) {
      empresasPresentes.push(empresa);
      continue;
    }
    const grupo = GRUPOS_DINAMICOS.find(
      (g) => caminho.startsWith(g.prefixo) && !caminho.slice(g.prefixo.length).includes("/"),
    );
    if (grupo) {
      porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), caminho]);
      continue;
    }
    outras.push(caminho);
  }

  const secoes: SecaoMontada[] = SECOES_LLMS.map((secao) => ({
    titulo: secao.titulo,
    aviso: secao.aviso,
    paginas: secao.paginas.filter((p) => vistos.has(p.caminho)),
    grupos: GRUPOS_DINAMICOS.filter((g) => g.secao === secao.titulo && porGrupo.has(g)).map((grupo) => ({
      grupo,
      caminhos: porGrupo.get(grupo) ?? [],
    })),
    empresas: secao.titulo === SECAO_EMPRESAS ? empresasPresentes : [],
    outras: [],
  }));
  if (outras.length > 0) {
    secoes.push({ titulo: SECAO_OUTRAS, paginas: [], grupos: [], empresas: [], outras });
  }
  return secoes.filter(
    (s) => s.paginas.length + s.grupos.length + s.empresas.length + s.outras.length > 0,
  );
}

function textoEmpresa(empresa: EmpresaLlms): string {
  return empresa.vinculo ? `${empresa.descricao} Vínculo: ${empresa.vinculo}` : empresa.descricao;
}

/** Texto de /llms.txt. */
export function montarLlmsTxt({ urls, empresas, geradoEm }: EntradaLlms): string {
  const blocos: string[] = [
    "# Piracanjuba.ai",
    `> ${DESCRICAO_CURTA}`,
    NATUREZA_DO_PROJETO,
    `Gerado em: ${dataIso(geradoEm)}. Versão ampliada, com o município, as fontes e o detalhe de cada página: [llms-full.txt](${SITE_URL}/llms-full.txt). Lista completa de endereços: [sitemap.xml](${SITE_URL}/sitemap.xml).`,
  ];

  for (const secao of classificarCaminhos(urls, empresas)) {
    const linhas: string[] = [
      ...secao.paginas.map((p) => linha(p.titulo, p.caminho, p.descricao)),
      ...secao.grupos.map(({ grupo, caminhos }) =>
        linha(grupo.titulo, grupo.caminhoIndice, grupo.resumo(caminhos.length)),
      ),
      ...secao.empresas.map((e) => linha(e.nome, e.caminho, textoEmpresa(e))),
      ...secao.outras.map((c) => linha(c, c)),
    ];
    blocos.push(`## ${secao.titulo}`);
    if (secao.aviso) blocos.push(secao.aviso);
    blocos.push(linhas.join("\n"));
  }

  blocos.push(
    "## Fontes oficiais",
    FONTES_OFICIAIS.map((f) => `- [${f.titulo}](${f.url}): ${f.descricao}`).join("\n"),
  );

  return `${blocos.join("\n\n")}\n`;
}

/** Texto de /llms-full.txt. */
export function montarLlmsFullTxt({ urls, empresas, geradoEm }: EntradaLlms): string {
  const blocos: string[] = [
    "# Piracanjuba.ai: conteúdo ampliado para agentes",
    `> ${DESCRICAO_CURTA}`,
    `Versão ampliada do [llms.txt](${SITE_URL}/llms.txt). Gerado em: ${dataIso(geradoEm)}. As páginas listadas são as que o [sitemap.xml](${SITE_URL}/sitemap.xml) publica nesta data.`,
    "## Sobre o projeto",
    [
      NATUREZA_DO_PROJETO,
      "Os dados vêm de fontes oficiais públicas e cada página indica a fonte. A inteligência artificial é usada para resumir documentos (contratos, leis, decretos, atas, proposições) e organizar as informações. O resumo não substitui o documento oficial, e os números acompanham a atualização das fontes.",
    ].join("\n\n"),
    "## O município",
    [
      `- Nome: ${MUNICIPIO.nome}`,
      `- Localização: ${MUNICIPIO.localizacao}`,
      `- Código IBGE: ${MUNICIPIO.codigoIbge}`,
      `- População: ${MUNICIPIO.populacao}`,
      `- Área: ${MUNICIPIO.area}`,
    ].join("\n"),
  ];

  for (const secao of classificarCaminhos(urls, empresas)) {
    blocos.push(`## ${secao.titulo}`);
    if (secao.aviso) blocos.push(secao.aviso);
    for (const pagina of secao.paginas) {
      blocos.push(`### ${pagina.titulo}\n\n${urlAbsoluta(pagina.caminho)}\n\n${limpar(pagina.detalhe ?? pagina.descricao)}`);
    }
    for (const { grupo, caminhos } of secao.grupos) {
      const corpo = [`${urlAbsoluta(grupo.caminhoIndice)}`, limpar(grupo.resumo(caminhos.length))];
      if (grupo.listarNoCompleto) corpo.push(caminhos.map((c) => `- ${urlAbsoluta(c)}`).join("\n"));
      blocos.push(`### ${grupo.titulo}\n\n${corpo.join("\n\n")}`);
    }
    for (const empresa of secao.empresas) {
      blocos.push(`### ${empresa.nome}\n\n${urlAbsoluta(empresa.caminho)}\n\n${limpar(textoEmpresa(empresa))}`);
    }
    if (secao.outras.length > 0) {
      blocos.push(secao.outras.map((c) => `- ${urlAbsoluta(c)}`).join("\n"));
    }
  }

  blocos.push(
    "## Fontes oficiais",
    FONTES_OFICIAIS.map((f) => `- [${f.titulo}](${f.url}): ${f.descricao}`).join("\n"),
    "## Contato",
    [`- Instagram: [@piracanjuba.ai](${CONTATO.instagram})`, `- E-mail: ${CONTATO.email}`, `- Site: [piracanjuba.ai](${SITE_URL}/)`].join("\n"),
  );

  return `${blocos.join("\n\n")}\n`;
}
