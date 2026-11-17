// Fichas das páginas de empresa (piracanjuba.ai/<slug>), o "outdoor digital":
// uma página por empresa, paga uma vez, sem edição pela empresa. Toda mudança
// passa por aqui, com commit e deploy.
//
// Regras de texto (conferidas em tests/empresas.test.ts):
// - sem travessão (U+2014) nem meia-risca (U+2013);
// - sem preço, porque os valores mudam no catálogo de cada empresa;
// - sem promessa que a empresa não pode sustentar (posição no Google, citação
//   em IA, "100% originais", economia percentual);
// - endereço só o que a empresa já publica.
//
// Modelo compartilhado: todo campo marcado como opcional tem comportamento
// padrão no EmpresaLanding, para que uma ficha nova funcione só com o básico.
//
// Textos de 2026-11-17 escritos a partir da pesquisa de palavras-chave no
// DataForSEO (Brasil, português) e dos fatos conferidos nos sites, nos arquivos
// de marca e nas notas do vault de cada empresa.
import type { SlugEmpresa } from "./empresas-slugs";

export type ImagemEmpresa = {
  src: string;
  largura: number;
  altura: number;
  alt: string;
  /** Procedência do arquivo. Interno: não aparece na página. */
  origem?: string;
  /** true quando a imagem foi gerada por IA; o teste barra esse tipo no topo e na vitrine. */
  geradaPorIA?: boolean;
};

export type BlocoTexto = { titulo: string; texto: string };

export type LinkExterno = { rotulo: string; url: string };

export type PerguntaFrequente = { pergunta: string; resposta: string };

export type IconeDestaque =
  | "frasco"
  | "agenda"
  | "envio"
  | "estrela"
  | "busca"
  | "aprovacao"
  | "whatsapp"
  | "local"
  | "relogio";

/** Fato curto e estável da faixa logo abaixo do topo. */
export type Destaque = {
  titulo: string;
  icone?: IconeDestaque;
  /** Link opcional (por exemplo, a nota no Google). */
  url?: string;
  /** Onde o fato foi conferido. Interno: não aparece na página. */
  fonte?: string;
};

export type ItemGaleria = ImagemEmpresa & {
  legenda: string;
  texto?: string;
  /** "recorte": produto com fundo transparente, exibido sobre a luz da marca. */
  tipo: "foto" | "recorte";
  /** Rosto ou pessoa reconhecível; exige autorização registrada. */
  pessoaIdentificavel: boolean;
  autorizacao?: string;
  url?: string;
};

/**
 * Peça visual do topo. Sem ela, vale a "foto" antiga ou o painel escuro da
 * marca (reserva para empresa sem imagem).
 */
export type MidiaTopo =
  | { tipo: "recorte" | "foto"; imagem: ImagemEmpresa; legenda?: string }
  /** Ilustração feita em código, sem imagem gerada nem marca de terceiros. */
  | { tipo: "ilustracao"; desenho: "presenca-digital" };

export type TemaEmpresa = {
  /** Fundo da página da empresa. */
  fundo: string;
  /** Fundo dos cartões. */
  superficie: string;
  texto: string;
  textoSuave: string;
  /** Cor dos botões e destaques. */
  primaria: string;
  /** Texto sobre a cor primária (contraste AA). */
  sobrePrimaria: string;
  primariaHover: string;
  borda: string;
  /** Faixa tonal do meio da página (diferenciais). Padrão: superfície. */
  fundoAlt?: string;
  /** Faixa escura do fechamento. Padrão: a cor do texto. */
  escuro?: string;
  /** Texto sobre a faixa escura. Padrão: o fundo. */
  sobreEscuro?: string;
  sobreEscuroSuave?: string;
  /** Acento legível sobre o escuro (ícones, filetes, foco). */
  acentoEscuro?: string;
  /** Botão sobre a faixa escura. Padrão: botão claro com texto escuro. */
  botaoEscuro?: { fundo: string; texto: string; hover: string };
  /** Cor dos rótulos acima dos títulos (contraste AA no fundo e no fundoAlt). Padrão: primária. */
  rotulo?: string;
  /** Rótulo sobre a faixa escura. Padrão: texto suave do escuro. */
  rotuloEscuro?: string;
  /** Cor do trecho em destaque do título principal. Padrão: primária. */
  corTituloDestaque?: string;
  /** Trecho em destaque em itálico (padrão do site da Vitorino). */
  tituloDestaqueItalico?: boolean;
  /** Luz de fundo do topo (CSS background-image). */
  luzTopo?: string;
  /** Luz atrás de produto recortado (topo e vitrine). */
  luzMidia?: string;
  /** Filete que liga os passos. Padrão: borda. */
  linha?: string;
  /** Raio dos blocos e cartões. Padrão: 1rem. */
  raio?: string;
  /** Raio dos botões. Padrão: pílula. */
  raioBotao?: string;
  botaoCaixaAlta?: boolean;
  /** Sombra da mídia do topo e da vitrine, tingida da marca. */
  sombra?: string;
  pesoTitulo?: number;
  espacamentoTitulo?: string;
};

export type Empresa = {
  slug: SlugEmpresa;
  nome: string;
  /** Rótulo curto acima do título, como "Perfumaria". */
  categoria: string;
  /**
   * Título principal (h1) com a proposta e a palavra-chave. Sem ele, o h1 é o
   * nome da empresa. Com ele, o nome vai para o rótulo acima ("Nome · categoria").
   */
  titulo?: string;
  /** Trecho do título exibido em destaque; precisa estar dentro de "titulo". */
  tituloDestaque?: string;
  /** Frase de apresentação logo abaixo do título. */
  chamada: string;
  /** Texto do botão principal de WhatsApp. Padrão: "Chamar no WhatsApp". */
  rotuloWhatsapp?: string;
  logo: ImagemEmpresa;
  midiaTopo?: MidiaTopo;
  /** Foto principal (formato antigo, ainda aceito); prefira midiaTopo. */
  foto?: ImagemEmpresa;
  /** Painel do topo para empresa sem foto: frase da marca e itens de destaque. */
  painelTopo?: { frase: string; itens: string[] };
  /** De 2 a 4 fatos curtos e estáveis, sem contagem que muda. */
  destaques?: Destaque[];
  /** Vitrine de imagens reais. Some quando a ficha não tem. */
  galeria?: { rotulo?: string; titulo: string; texto?: string; itens: ItemGaleria[] };
  /** Título da seção Sobre. Padrão: "Sobre". */
  tituloSobre?: string;
  /** Frase de assinatura em destaque na seção Sobre. */
  sobreDestaque?: string;
  sobre: string[];
  tituloOferta: string;
  /** Texto curto abaixo do título da oferta. */
  textoOferta?: string;
  /** Link ao lado da oferta (por exemplo, o catálogo completo). */
  linkOferta?: LinkExterno;
  oferta: BlocoTexto[];
  /** Comparação curta entre opções (por exemplo, tamanhos), sem números de rendimento. */
  guiaEscolha?: { titulo: string; texto?: string; itens: BlocoTexto[] };
  /** Título da seção de diferenciais. Padrão: "Por que escolher". */
  tituloDiferenciais?: string;
  diferenciais: BlocoTexto[];
  passos: BlocoTexto[];
  /** Perguntas frequentes (3 a 8). Vira também o FAQPage dos dados estruturados. */
  faq?: PerguntaFrequente[];
  contato: {
    /** Só dígitos, com DDI 55 e DDD. */
    whatsapp: string;
    mensagemWhatsapp: string;
    instagram?: { usuario: string; url: string };
    site?: LinkExterno;
    extras?: LinkExterno[];
  };
  endereco: {
    cidade: string;
    uf: string;
    /** "online" não declara endereço nos dados estruturados, só a área atendida. */
    atendimento: "presencial" | "online";
    /** O que a empresa publica sobre o atendimento no local. */
    detalhe: string;
    /** Horário de atendimento, como a empresa informou ("Segunda a sábado, das 8h às 18h"). */
    horario?: string;
    /** Link do Google Maps da empresa (https). */
    mapaUrl?: string;
  };
  /** Selo de avaliação com link para a fonte (sem número de avaliações). */
  avaliacao?: LinkExterno;
  /**
   * Declaração de vínculo com o Piracanjuba.ai. Opcional: só aparece quando o
   * operador decide publicá-la (decisão por empresa, registrada no vault).
   */
  vinculo?: string;
  chamadaFinal: { titulo: string; texto: string };
  seo: {
    titulo: string;
    descricao: string;
    /** Imagem de compartilhamento, 1200x630. */
    imagem: string;
    /** Logo para os dados estruturados (o Google pede ao menos 112x112), se diferente do logo da página. */
    logoSchema?: string;
    /**
     * "Store" para loja com atendimento no local. Empresa só online usa
     * "Organization": os tipos de negócio local exigem endereço físico.
     */
    tipoSchema: "Store" | "Organization";
  };
  tema: TemaEmpresa;
  /** Detalhe gráfico da marca: arco e rastro vertical (Vitorino) ou pino (Apareça). */
  motivo?: "arco" | "pino" | "nenhum";
  fontes: "vitorino" | "apareca";
  conferidoEm: string;
};

const NOTA_GOOGLE_VITORINO = "https://share.google/kLy9hbsZOfuyezMWU";

export const EMPRESAS: Record<SlugEmpresa, Empresa> = {
  vitorinoperfumes: {
    slug: "vitorinoperfumes",
    nome: "Vitorino Perfumes",
    categoria: "Perfumaria",
    titulo: "Decants de perfume em Piracanjuba",
    tituloDestaque: "em Piracanjuba",
    chamada:
      "Decants de perfumes árabes, de grife e de nicho em 5 ml e 10 ml, preparados a partir de frascos originais. Conheça a fragrância com calma, na sua pele, antes de decidir pelo frasco inteiro.",
    rotuloWhatsapp: "Falar com a Isabella",
    logo: {
      src: "/empresas/vitorinoperfumes/logo.png",
      largura: 340,
      altura: 125,
      alt: "Vitorino Perfumes",
      origem: "Logotipo oficial completo (raster), recortado do arquivo da marca; sem redesenho.",
    },
    midiaTopo: {
      tipo: "recorte",
      imagem: {
        src: "/empresas/vitorinoperfumes/decant-10ml.webp",
        largura: 141,
        altura: 960,
        alt: "Decant de 10 ml da Vitorino Perfumes: frasco de vidro com perfume dourado claro, tampa dourada e etiqueta vitorinoperfumes",
        origem:
          "Foto real da loja recebida em 2026-08-26 (IMG_0539), recorte com alfa em vitorino-carrosseis/assets/decant/decant-10ml-recorte.png; derivado WebP de 2026-11-17.",
        geradaPorIA: false,
      },
      legenda: "Decant de 10 ml da loja, foto real",
    },
    destaques: [
      { titulo: "Decants de 5 ml e 10 ml", icone: "frasco", fonte: "faq-home.ts do site da loja" },
      { titulo: "Hora marcada em Piracanjuba", icone: "agenda", fonte: "faq-home.ts do site da loja" },
      { titulo: "Envio para todo o Brasil", icone: "envio", fonte: "faq-home.ts do site da loja" },
      {
        titulo: "Nota 5,0 no Google",
        icone: "estrela",
        url: NOTA_GOOGLE_VITORINO,
        fonte: "Perfil da loja no Google; contagem omitida por decisão do operador",
      },
    ],
    galeria: {
      rotulo: "Fotos reais",
      titulo: "O decant da Vitorino",
      texto:
        "Frascos de vidro com borrifador, tampa dourada e a etiqueta da loja, prontos para a bolsa, a nécessaire e a mala de viagem.",
      itens: [
        {
          src: "/empresas/vitorinoperfumes/decant-na-mao.webp",
          largura: 1080,
          altura: 1350,
          alt: "Mão segurando um decant da Vitorino Perfumes, frasco de vidro com tampa dourada, borrifador e etiqueta da loja, diante de uma parede cinza",
          legenda: "Cabe na palma da mão",
          texto: "Leve para o trabalho, para a viagem ou para o retoque do fim do dia.",
          tipo: "foto",
          pessoaIdentificavel: false,
          origem:
            "Foto da pasta da loja (Desktop/Vitorino Perfumes/decant vitorino perfumes.webp), só a mão, sem rosto; recorte 4:5 de 2026-11-17.",
          geradaPorIA: false,
        },
        {
          src: "/empresas/vitorinoperfumes/decant-5ml.webp",
          largura: 134,
          altura: 720,
          alt: "Decant de 5 ml da Vitorino Perfumes, frasco de vidro com perfume âmbar, tampa dourada e etiqueta vitorinoperfumes",
          legenda: "Decant de 5 ml",
          texto: "Para conhecer uma fragrância nova.",
          tipo: "recorte",
          pessoaIdentificavel: false,
          origem:
            "Foto real da loja recebida em 2026-08-26 (IMG_0550), recorte com alfa em vitorino-carrosseis/assets/decant/decant-05ml-recorte.png; derivado WebP de 2026-11-17.",
          geradaPorIA: false,
        },
        {
          src: "/empresas/vitorinoperfumes/decant-10ml.webp",
          largura: 141,
          altura: 960,
          alt: "Decant de 10 ml da Vitorino Perfumes, frasco de vidro com perfume dourado claro, tampa dourada e etiqueta vitorinoperfumes",
          legenda: "Decant de 10 ml",
          texto: "Para o perfume que já conquistou você.",
          tipo: "recorte",
          pessoaIdentificavel: false,
          origem:
            "Foto real da loja recebida em 2026-08-26 (IMG_0539), o mesmo recorte do topo.",
          geradaPorIA: false,
        },
      ],
    },
    tituloSobre: "Uma perfumaria de decants em Piracanjuba",
    sobreDestaque:
      "Quem atende é a Isabella Vitorino, que cuida da curadoria e ajuda você a escolher pelo seu gosto e pela ocasião.",
    sobre: [
      "A Vitorino Perfumes é uma perfumaria da cidade de Piracanjuba, em Goiás, especializada em decants: porções de perfume transferidas do frasco original para um frasco menor, de 5 ml ou 10 ml. O líquido é o mesmo do frasco grande; o que muda é a quantidade. Na Vitorino, os decants são preparados a partir de frascos originais das fragrâncias do catálogo.",
      "Com um decant você conhece uma fragrância com calma, por vários dias e em momentos diferentes, acompanha como ela evolui na sua pele e pode variar de perfume conforme a ocasião e o humor. O frasco pequeno também cabe na bolsa, na nécessaire e na mala de viagem.",
      "Conte do que você gosta e para quando é o perfume, e a Isabella sugere opções dentro do seu estilo. Em Piracanjuba, dá para sentir as fragrâncias pessoalmente com hora marcada e retirar o pedido na cidade. Para o resto do Brasil, a loja envia.",
    ],
    tituloOferta: "O que você encontra no catálogo",
    textoOferta:
      "O catálogo completo, com as notas olfativas dos perfumes, fica no site da loja. A disponibilidade e os valores atualizados são confirmados pelo WhatsApp.",
    linkOferta: { rotulo: "Ver o catálogo completo", url: "https://www.vitorinoperfumes.com/catalogo" },
    // Só casas presentes no catálogo publicado em 2026-11-17 (100 árabes em 198
    // itens); sem nomes de perfumes, porque o estoque muda.
    oferta: [
      {
        titulo: "Perfumes árabes",
        texto:
          "Cerca de metade do catálogo, com casas como Lattafa, Al Wataniah, Armaf, Maison Alhambra e Afnan, conhecidas por fragrâncias marcantes.",
      },
      {
        titulo: "Perfumes de grife",
        texto:
          "Clássicos e lançamentos de Chanel, Dior, Yves Saint Laurent, Giorgio Armani, Carolina Herrera e Lancôme.",
      },
      {
        titulo: "Perfumes de nicho",
        texto:
          "Criações de casas como Tom Ford, Creed, Xerjoff e Acqua di Parma, para quem gosta de descobrir algo fora do comum.",
      },
      {
        titulo: "Body splash e cremes",
        texto: "Além dos perfumes, body splash e cremes de marcas como Victoria's Secret.",
      },
    ],
    // Qualitativo de propósito: o rendimento do borrifador da loja não foi medido.
    guiaEscolha: {
      titulo: "5 ml ou 10 ml: qual escolher",
      texto: "Os dois tamanhos levam o mesmo perfume do frasco original. Muda a quantidade e o jeito de usar.",
      itens: [
        {
          titulo: "5 ml",
          texto:
            "Para conhecer uma fragrância nova: você usa por vários dias, em ocasiões diferentes, e descobre como ela fica na sua pele.",
        },
        {
          titulo: "10 ml",
          texto:
            "Para o perfume que já conquistou você e que você quer usar mais vezes, no dia a dia ou na mala de viagem.",
        },
      ],
    },
    tituloDiferenciais: "Por que escolher a Vitorino",
    diferenciais: [
      {
        titulo: "Conheça na sua pele",
        texto:
          "Com 5 ml ou 10 ml você usa o perfume por vários dias e acompanha como ele se comporta em você, da saída ao fundo.",
      },
      {
        titulo: "A partir de frascos originais",
        texto:
          "Os decants são preparados a partir de frascos originais das fragrâncias do catálogo e envasados em frascos de vidro com etiqueta.",
      },
      {
        titulo: "Curadoria da Isabella",
        texto:
          "Diga do que você gosta e para quando é o perfume. A Isabella sugere opções dentro do seu estilo.",
      },
      {
        titulo: "Em Piracanjuba ou na sua casa",
        texto:
          "Hora marcada para sentir as fragrâncias, retirada na cidade ou envio para todo o Brasil, com o frete combinado antes.",
      },
    ],
    passos: [
      {
        titulo: "Chame a Isabella no WhatsApp",
        texto: "Conte o perfume que procura, o estilo de que gosta ou a ocasião.",
      },
      {
        titulo: "Receba sugestões e valores",
        texto: "Opções de 5 ml e 10 ml dentro do seu gosto, com os valores atualizados.",
      },
      {
        titulo: "Escolha como receber",
        texto: "Marque um horário para sentir as fragrâncias, retire em Piracanjuba ou peça o envio.",
      },
    ],
    faq: [
      {
        pergunta: "O que é um decant de perfume?",
        resposta:
          "É uma porção do perfume transferida do frasco original para um frasco menor. O líquido é o mesmo do frasco grande; o que muda é a quantidade. Na Vitorino Perfumes, os decants são de 5 ml ou 10 ml.",
      },
      {
        pergunta: "Os decants são feitos a partir de perfumes originais?",
        resposta:
          "Sim. Na Vitorino Perfumes, os decants são preparados a partir de frascos originais das fragrâncias do catálogo. Se quiser saber mais sobre um perfume específico, a Isabella responde pelo WhatsApp.",
      },
      {
        pergunta: "Qual a diferença entre decant, amostra e miniatura?",
        resposta:
          "O decant é uma porção do frasco original, em tamanhos como 5 ml e 10 ml. A amostra costuma ser um frasquinho de 1 a 2 ml distribuído pela própria marca, e a miniatura é um frasco pequeno oficial, com a embalagem da marca.",
      },
      {
        pergunta: "Posso sentir os perfumes antes de escolher?",
        resposta:
          "Pode. Em Piracanjuba, o atendimento presencial é com hora marcada: combine pelo WhatsApp o horário e os perfumes que você quer conhecer.",
      },
      {
        pergunta: "A Vitorino Perfumes envia para outras cidades?",
        resposta:
          "Sim, para todo o Brasil. Quem está em Piracanjuba também pode retirar o pedido na cidade. O frete é combinado pelo WhatsApp antes de confirmar o pedido.",
      },
      {
        pergunta: "Como guardar o decant?",
        resposta:
          "Longe do calor, da luz e da umidade. Uma gaveta no quarto é melhor que o banheiro, onde o vapor do banho acelera a mudança do perfume.",
      },
    ],
    contato: {
      whatsapp: "5564992472510",
      mensagemWhatsapp:
        "Olá, Isabella! Vi a Vitorino Perfumes no Piracanjuba.ai e quero saber mais sobre os decants.",
      instagram: { usuario: "@vitorinoperfumes", url: "https://www.instagram.com/vitorinoperfumes" },
      site: { rotulo: "vitorinoperfumes.com", url: "https://www.vitorinoperfumes.com" },
      extras: [{ rotulo: "Ver o catálogo completo", url: "https://www.vitorinoperfumes.com/catalogo" }],
    },
    endereco: {
      cidade: "Piracanjuba",
      uf: "GO",
      atendimento: "presencial",
      detalhe:
        "Atendimento com hora marcada em Piracanjuba, retirada na cidade e envio para todo o Brasil, com o frete combinado pelo WhatsApp.",
    },
    avaliacao: { rotulo: "Nota 5,0 no Google", url: NOTA_GOOGLE_VITORINO },
    chamadaFinal: {
      titulo: "Quer descobrir seu próximo perfume?",
      texto:
        "Conte para a Isabella do que você gosta e receba sugestões com os valores atualizados de 5 ml e 10 ml.",
    },
    seo: {
      titulo: "Decants de perfume em Piracanjuba: Vitorino Perfumes",
      descricao:
        "Decants de perfumes árabes, de grife e de nicho em 5 ml e 10 ml. Hora marcada em Piracanjuba (GO), retirada na cidade e envio para todo o Brasil.",
      imagem: "/empresas/vitorinoperfumes/og.jpg",
      tipoSchema: "Store",
    },
    // Paleta do site da loja e do guia da marca: marfim, bronze e Noir; âmbar
    // seco (#c7924b) só como sinal sobre o escuro (2,46:1 no claro).
    tema: {
      fundo: "#f7f2e9",
      superficie: "#fffdf8",
      texto: "#33281f",
      textoSuave: "#6b5a47",
      primaria: "#67471d",
      sobrePrimaria: "#fffdf8",
      primariaHover: "#4f3615",
      borda: "#e3d7c3",
      fundoAlt: "#efe6d6",
      escuro: "#0b0b0c",
      sobreEscuro: "#f4efe6",
      sobreEscuroSuave: "#c9c3b8",
      acentoEscuro: "#c7924b",
      botaoEscuro: { fundo: "#f4efe6", texto: "#0b0b0c", hover: "#e8dfcf" },
      rotulo: "#67471d",
      corTituloDestaque: "#795426",
      tituloDestaqueItalico: true,
      luzTopo:
        "radial-gradient(60% 75% at 80% 12%, #fffaf1 0%, rgb(255 250 241 / 0) 70%), radial-gradient(45% 55% at 74% 46%, #efe3cd 0%, rgb(239 227 205 / 0) 70%)",
      luzMidia: "radial-gradient(85% 70% at 50% 42%, #fffaf2 0%, #f5ecdd 48%, #e6d6ba 100%)",
      linha: "#cfb894",
      raio: "0.5rem",
      raioBotao: "0.375rem",
      botaoCaixaAlta: true,
      sombra: "0 30px 60px -30px rgb(51 40 31 / 0.35)",
      pesoTitulo: 500,
      espacamentoTitulo: "-0.01em",
    },
    motivo: "arco",
    fontes: "vitorino",
    conferidoEm: "2026-11-17",
  },

  apareca: {
    slug: "apareca",
    nome: "Apareça Ai",
    categoria: "Sites e presença digital",
    titulo: "Criação de sites e presença no Google em Piracanjuba",
    tituloDestaque: "presença no Google",
    chamada:
      "Site profissional, landing page e Perfil da Empresa no Google para negócios e profissionais de Piracanjuba, da região e de todo o Brasil, com atendimento humano pelo WhatsApp.",
    rotuloWhatsapp: "Pedir diagnóstico gratuito",
    logo: {
      src: "/empresas/apareca/icone.svg",
      largura: 72,
      altura: 72,
      alt: "Ícone da Apareça Ai",
      origem: "Ícone do site da marca (pino laranja em quadrado escuro).",
    },
    midiaTopo: { tipo: "ilustracao", desenho: "presenca-digital" },
    destaques: [
      { titulo: "Diagnóstico gratuito", icone: "busca", fonte: "apareca.ai/diagnostico" },
      { titulo: "Você aprova antes de publicar", icone: "aprovacao", fonte: "FAQ da home do apareca.ai" },
      { titulo: "Prazo combinado na proposta", icone: "agenda", fonte: "FAQ e escopo da home do apareca.ai" },
      { titulo: "Atendimento humano pelo WhatsApp", icone: "whatsapp", fonte: "llms.txt do apareca.ai" },
    ],
    tituloSobre: "Sobre a Apareça Ai",
    sobreDestaque: "Atendimento humano, do diagnóstico à publicação.",
    sobre: [
      "A Apareça Ai cria sites profissionais e organiza a presença de pequenos negócios e profissionais liberais no Google e em assistentes de inteligência artificial, como ChatGPT e Gemini. É uma parceria entre a Ferro Labs Tecnologia, que cuida do desenvolvimento, do SEO e da estrutura técnica, e o Grupo V3, que cuida da estratégia de comunicação, do marketing e da produção.",
      "O atendimento é online e humano, pelo WhatsApp, para Piracanjuba, a região e qualquer cidade do Brasil. Você conta o que faz e onde atende, recebe uma proposta com escopo e prazo e aprova tudo antes de o site entrar no ar.",
      "Ninguém controla a posição no Google nem a resposta de uma inteligência artificial, e a Apareça Ai não promete isso. O trabalho é deixar o seu negócio fácil de encontrar, de entender e de contatar.",
    ],
    tituloOferta: "Serviços",
    textoOferta: "Do site novo ao ajuste de quem já está no ar, com o escopo definido na proposta.",
    oferta: [
      {
        titulo: "Site completo",
        texto:
          "Páginas para cada serviço, blog pronto para publicar e base técnica de SEO, com dados estruturados e medição desde o lançamento. Rápido no celular e com o caminho para o WhatsApp sempre à vista.",
      },
      {
        titulo: "Landing page (página única)",
        texto:
          "Uma página só, direta, para apresentar o negócio e levar o cliente ao WhatsApp. Serve para uma necessidade mais simples, sem blog nem trabalho contínuo de SEO. Você fornece o texto, e a proposta define organização e revisão.",
      },
      {
        titulo: "Perfil da Empresa no Google",
        texto:
          "O antigo Google Meu Negócio, com categoria, serviços, área atendida, horários e fotos verdadeiros e coerentes com o site. Sem endereço inventado e sem avaliação comprada.",
      },
      {
        titulo: "Presença em inteligência artificial",
        texto:
          "Informações claras, verificáveis e bem estruturadas para que o Google, o ChatGPT e o Gemini consigam entender o que você faz, onde atende e como falar com você.",
      },
      {
        titulo: "Consultoria de SEO",
        texto:
          "Para quem já tem site: diagnóstico técnico e de conteúdo, plano priorizado por impacto e acompanhamento por Search Console, analytics e contatos recebidos, não só por posição.",
      },
    ],
    tituloDiferenciais: "Por que escolher a Apareça Ai",
    diferenciais: [
      {
        titulo: "Diagnóstico gratuito",
        texto:
          "Mande o nome do negócio e a cidade. A equipe verifica como você aparece hoje e indica por onde começar, sem compromisso.",
      },
      {
        titulo: "Escopo claro antes de contratar",
        texto:
          "Páginas, integrações, responsabilidades, investimento e serviços recorrentes ficam definidos na proposta.",
      },
      {
        titulo: "Prazo combinado",
        texto:
          "Projetos diretos podem entrar no ar em até 15 dias depois que as informações são enviadas e aprovadas. Projetos maiores têm cronograma próprio.",
      },
      { titulo: "Você aprova antes", texto: "Nada é publicado sem o seu OK." },
      {
        titulo: "Manutenção combinada",
        texto:
          "Hospedagem, certificado, renovação do domínio, backup, monitoramento e pequenos ajustes, conforme a proposta. Páginas novas e artigos têm escopo separado.",
      },
      {
        titulo: "Sem promessa vazia",
        texto:
          "Nada de primeiro lugar garantido nem de recomendação certa por inteligência artificial: o que se entrega é uma base correta e um plano do que fazer depois.",
      },
    ],
    passos: [
      {
        titulo: "Diagnóstico pelo WhatsApp",
        texto: "Você informa o negócio e a cidade, e a equipe verifica a presença atual.",
      },
      {
        titulo: "Proposta com escopo",
        texto: "Você conhece entregas, investimento, responsabilidades e prazo antes de decidir.",
      },
      {
        titulo: "Criação e aprovação",
        texto:
          "Você envia as informações e os materiais combinados, e a equipe apresenta o trabalho para a sua aprovação.",
      },
      {
        titulo: "Publicação e continuidade",
        texto:
          "Depois do seu OK, o site entra no ar. Suporte, manutenção e acompanhamento seguem o que foi contratado.",
      },
    ],
    faq: [
      {
        pergunta: "Quanto custa criar um site com a Apareça Ai?",
        resposta:
          "Depende do número de páginas, das integrações, do conteúdo e da complexidade do projeto. O diagnóstico é gratuito, e a proposta traz escopo e investimento por escrito antes de qualquer contratação.",
      },
      {
        pergunta: "Em quanto tempo o site fica pronto?",
        resposta:
          "Projetos diretos podem entrar no ar em até 15 dias depois que as informações são enviadas e aprovadas. Projetos maiores recebem um cronograma próprio, definido na proposta.",
      },
      {
        pergunta: "Qual a diferença entre site completo e landing page?",
        resposta:
          "O site completo tem uma página para cada serviço, blog e base técnica de SEO para o Google e para a inteligência artificial. A landing page é uma página única, para uma necessidade mais simples, sem blog nem trabalho contínuo de SEO.",
      },
      {
        pergunta: "Como colocar minha empresa no Google?",
        resposta:
          "O primeiro passo é criar e verificar o Perfil da Empresa no Google, o antigo Google Meu Negócio, que não tem custo. Depois vêm categoria certa, serviços, área atendida, horários, fotos reais e avaliações de clientes de verdade. A Apareça Ai organiza esse perfil e deixa as informações iguais às do site.",
      },
      {
        pergunta: "Por que meu negócio não aparece no Google?",
        resposta:
          "As causas mais comuns são perfil não criado ou não verificado, dados diferentes entre o site e o perfil, categoria errada e falta de uma página que explique o serviço. Na busca local, o Google pesa relevância, distância e destaque, então nenhuma ação isolada resolve tudo. O diagnóstico gratuito mostra o que falta no seu caso.",
      },
      {
        pergunta: "Dá para fazer minha empresa aparecer no ChatGPT?",
        resposta:
          "Ninguém consegue garantir que o ChatGPT ou outra inteligência artificial recomende uma empresa, porque as respostas mudam e cada plataforma usa fontes diferentes. O que dá para fazer é deixar as informações do negócio claras, verificáveis e consistentes no site e nos perfis, para que essas ferramentas consigam entender o que você faz.",
      },
      {
        pergunta: "Preciso entregar os textos prontos?",
        resposta:
          "Depende do escopo. Na landing page, você fornece o texto. Organização, revisão e eventual redação ficam definidas na proposta.",
      },
      {
        pergunta: "A Apareça Ai atende fora de Piracanjuba?",
        resposta:
          "Sim. O atendimento é online, pelo WhatsApp, para Piracanjuba, a região e qualquer cidade do Brasil.",
      },
    ],
    contato: {
      whatsapp: "5564992638815",
      mensagemWhatsapp:
        "Olá! Vi a Apareça Ai no Piracanjuba.ai e quero um diagnóstico do meu negócio.",
      site: { rotulo: "apareca.ai", url: "https://apareca.ai" },
      extras: [{ rotulo: "Formulário de diagnóstico no site", url: "https://apareca.ai/diagnostico" }],
    },
    endereco: {
      cidade: "Piracanjuba",
      uf: "GO",
      atendimento: "online",
      detalhe:
        "Atendimento online pelo WhatsApp para Piracanjuba, cidades da região e todo o Brasil. Diagnóstico, proposta, aprovação e publicação acontecem pela conversa.",
    },
    vinculo:
      "A Apareça Ai é uma marca da Ferro Labs Tecnologia em parceria com o Grupo V3. A Ferro Labs desenvolve e mantém o Piracanjuba.ai.",
    chamadaFinal: {
      titulo: "Seu negócio aparece quando procuram por ele?",
      texto:
        "Peça um diagnóstico gratuito pelo WhatsApp e veja o que dá para melhorar no site, no Google e nas respostas de inteligência artificial.",
    },
    seo: {
      titulo: "Criação de sites em Piracanjuba e região: Apareça Ai",
      descricao:
        "Criação de sites, landing page e Perfil da Empresa no Google para negócios de Piracanjuba (GO) e de todo o Brasil. Diagnóstico grátis pelo WhatsApp.",
      imagem: "/empresas/apareca/og.png",
      logoSchema: "/empresas/apareca/logo.png",
      tipoSchema: "Organization",
    },
    // Tokens do apareca.ai: papel, tinta e laranja. Rótulo no laranja escuro
    // (#a93207) porque o #cb3f0a não passa AA em texto pequeno no bege.
    tema: {
      fundo: "#faf5ec",
      superficie: "#fffdf8",
      texto: "#1b1a14",
      textoSuave: "#5c564a",
      primaria: "#cb3f0a",
      sobrePrimaria: "#ffffff",
      primariaHover: "#a93207",
      borda: "#d8ccb8",
      fundoAlt: "#f3e9d8",
      escuro: "#1b1a14",
      sobreEscuro: "#faf5ec",
      sobreEscuroSuave: "#cfc6b6",
      acentoEscuro: "#e85d1c",
      botaoEscuro: { fundo: "#cb3f0a", texto: "#ffffff", hover: "#a93207" },
      rotulo: "#a93207",
      rotuloEscuro: "#e85d1c",
      corTituloDestaque: "#cb3f0a",
      luzTopo: "radial-gradient(55% 65% at 92% 0%, rgb(232 93 28 / 0.10) 0%, rgb(232 93 28 / 0) 70%)",
      raio: "1.125rem",
      raioBotao: "0.75rem",
      sombra: "0 20px 40px -26px rgb(22 20 14 / 0.5)",
      pesoTitulo: 700,
      espacamentoTitulo: "-0.035em",
    },
    motivo: "pino",
    fontes: "apareca",
    conferidoEm: "2026-11-17",
  },
};

export function getEmpresa(slug: SlugEmpresa): Empresa {
  return EMPRESAS[slug];
}
