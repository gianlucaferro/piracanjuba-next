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
// Dados conferidos em 2026-11-16 nos sites, nos arquivos de marca e nas notas
// do vault de cada empresa.
import type { SlugEmpresa } from "./empresas-slugs";

export type ImagemEmpresa = {
  src: string;
  largura: number;
  altura: number;
  alt: string;
};

export type BlocoTexto = { titulo: string; texto: string };

export type LinkExterno = { rotulo: string; url: string };

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
};

export type Empresa = {
  slug: SlugEmpresa;
  nome: string;
  /** Rótulo curto acima do título, como "Perfumaria · decants". */
  categoria: string;
  /** Frase de apresentação logo abaixo do nome. */
  chamada: string;
  logo: ImagemEmpresa;
  /** Foto principal; sem ela, o topo mostra o painel com a cor da marca. */
  foto?: ImagemEmpresa;
  /** Painel do topo para empresa sem foto: frase da marca e itens de destaque. */
  painelTopo?: { frase: string; itens: string[] };
  sobre: string[];
  tituloOferta: string;
  oferta: BlocoTexto[];
  diferenciais: BlocoTexto[];
  passos: BlocoTexto[];
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
  fontes: "vitorino" | "apareca";
  conferidoEm: string;
};

export const EMPRESAS: Record<SlugEmpresa, Empresa> = {
  vitorinoperfumes: {
    slug: "vitorinoperfumes",
    nome: "Vitorino Perfumes",
    categoria: "Perfumaria · decants",
    chamada:
      "Decants de perfumes importados, de nicho e árabes em Piracanjuba. Experimente a fragrância em 5 ml ou 10 ml antes de investir no frasco inteiro.",
    logo: {
      src: "/empresas/vitorinoperfumes/logo.png",
      largura: 340,
      altura: 125,
      alt: "Logo da Vitorino Perfumes",
    },
    foto: {
      src: "/empresas/vitorinoperfumes/foto.webp",
      largura: 720,
      altura: 720,
      alt: "Três frascos de perfume âmbar sobre uma pedra escura",
    },
    sobre: [
      "A Vitorino Perfumes é uma loja de Piracanjuba especializada em decants: pequenas porções de perfumes de grife, de nicho e árabes, em frascos de 5 ml e 10 ml preparados a partir de frascos originais.",
      "É um jeito de conhecer uma fragrância com calma, montar uma coleção variada gastando menos ou levar o perfume na bolsa e na viagem.",
      "Quem atende é a Isabella Vitorino, que ajuda a escolher pelo seu gosto e pela ocasião. Em Piracanjuba, dá para sentir os perfumes pessoalmente com hora marcada e retirar o pedido na cidade. Para o resto do Brasil, a loja envia.",
    ],
    tituloOferta: "O que você encontra",
    oferta: [
      {
        titulo: "Perfumes árabes",
        texto:
          "A maior parte do catálogo, com casas como Lattafa, Armaf e Al Wataniah, conhecidas por fragrâncias marcantes.",
      },
      {
        titulo: "Perfumes de grife",
        texto:
          "Clássicos e lançamentos de marcas como Chanel, Yves Saint Laurent, Dior e Giorgio Armani.",
      },
      {
        titulo: "Perfumes de nicho",
        texto: "Fragrâncias de perfumarias autorais, para quem procura algo fora do comum.",
      },
      {
        titulo: "Body splash e cremes",
        texto: "Além dos perfumes, body splash e cremes de marcas como Victoria's Secret.",
      },
    ],
    diferenciais: [
      {
        titulo: "Prove antes do frasco inteiro",
        texto:
          "Com 5 ml ou 10 ml você usa o perfume por vários dias e descobre se ele combina com você.",
      },
      {
        titulo: "Atendimento em Piracanjuba",
        texto:
          "Hora marcada para sentir as fragrâncias pessoalmente e retirada na cidade, sem esperar frete.",
      },
      {
        titulo: "Ajuda para escolher",
        texto:
          "Conte do que você gosta e para quando é o perfume. A Isabella sugere opções dentro do seu estilo.",
      },
      {
        titulo: "Envio para todo o Brasil",
        texto: "Quem está fora de Piracanjuba recebe em casa, com o frete combinado pelo WhatsApp.",
      },
    ],
    passos: [
      { titulo: "Chame no WhatsApp", texto: "Conte o perfume que procura ou o estilo de que gosta." },
      {
        titulo: "Receba as sugestões",
        texto: "Você recebe opções com os valores atualizados de 5 ml e 10 ml.",
      },
      {
        titulo: "Escolha como receber",
        texto: "Retire em Piracanjuba, marque um horário para provar ou peça o envio.",
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
        "Atendimento presencial com hora marcada, retirada na cidade e envio para todo o Brasil.",
    },
    avaliacao: { rotulo: "Nota 5,0 no Google", url: "https://share.google/kLy9hbsZOfuyezMWU" },
    chamadaFinal: {
      titulo: "Quer descobrir seu próximo perfume?",
      texto: "Mande uma mensagem e receba sugestões e valores atualizados.",
    },
    seo: {
      titulo: "Vitorino Perfumes: decants de perfumes em Piracanjuba",
      descricao:
        "Decants de perfumes importados, de nicho e árabes em 5 ml e 10 ml, em Piracanjuba (GO). Hora marcada, retirada na cidade e envio para todo o Brasil.",
      imagem: "/empresas/vitorinoperfumes/og.jpg",
      tipoSchema: "Store",
    },
    tema: {
      fundo: "#f7f2e9",
      superficie: "#fffdf8",
      texto: "#33281f",
      textoSuave: "#6b5a47",
      primaria: "#67471d",
      sobrePrimaria: "#fffdf8",
      primariaHover: "#4f3615",
      borda: "#e3d7c3",
    },
    fontes: "vitorino",
    conferidoEm: "2026-11-16",
  },

  apareca: {
    slug: "apareca",
    nome: "Apareça Ai",
    categoria: "Sites e presença no Google",
    chamada:
      "Sites profissionais e presença no Google e nas inteligências artificiais para negócios e profissionais de Piracanjuba e região.",
    logo: {
      src: "/empresas/apareca/icone.svg",
      largura: 72,
      altura: 72,
      alt: "Ícone da Apareça Ai",
    },
    painelTopo: {
      frase: "Apareça quando procurarem por você.",
      itens: ["Site completo ou página única", "Google Meu Negócio", "Organização para ChatGPT e Gemini"],
    },
    sobre: [
      "A Apareça Ai cria sites e organiza a presença de pequenos negócios e profissionais liberais no Google, no Google Meu Negócio e em ferramentas de inteligência artificial como ChatGPT e Gemini.",
      "O atendimento é humano e feito pelo WhatsApp, do primeiro diagnóstico à publicação. Você aprova tudo antes de o site entrar no ar.",
      "Ninguém pode garantir a primeira posição no Google nem citação em inteligência artificial, e a Apareça Ai não promete isso. O trabalho é deixar o seu negócio fácil de encontrar, de entender e de contatar.",
    ],
    tituloOferta: "Serviços",
    oferta: [
      {
        titulo: "Site completo",
        texto:
          "Páginas de serviços, blog e estrutura técnica pensada para o Google e para as inteligências artificiais.",
      },
      {
        titulo: "Página única",
        texto: "Uma página direta para apresentar o negócio e levar o cliente ao WhatsApp.",
      },
      {
        titulo: "Google Meu Negócio",
        texto: "Perfil organizado para quem procura o seu serviço na cidade e na região.",
      },
      {
        titulo: "Presença em inteligência artificial",
        texto:
          "Informações claras e organizadas para que ChatGPT, Gemini e outras ferramentas entendam o que você faz.",
      },
      {
        titulo: "Consultoria de SEO",
        texto: "Diagnóstico, prioridades e acompanhamento para quem já tem site.",
      },
    ],
    diferenciais: [
      {
        titulo: "Diagnóstico gratuito",
        texto:
          "Mande o nome do negócio e a cidade e receba uma avaliação inicial, sem compromisso.",
      },
      {
        titulo: "Prazo combinado",
        texto:
          "Projetos diretos podem entrar no ar em até 15 dias depois que as informações são enviadas e aprovadas. Projetos maiores têm cronograma próprio.",
      },
      { titulo: "Você aprova antes", texto: "Nada é publicado sem o seu OK." },
      {
        titulo: "Manutenção combinada",
        texto: "Hospedagem, domínio, certificado e pequenos ajustes, conforme a proposta.",
      },
    ],
    passos: [
      { titulo: "Diagnóstico pelo WhatsApp", texto: "Você conta o que faz e onde atende." },
      {
        titulo: "Proposta e conteúdo",
        texto: "A proposta define o formato, o prazo e as informações da página.",
      },
      { titulo: "Aprovação e publicação", texto: "Você revisa, aprova e o site entra no ar." },
    ],
    contato: {
      whatsapp: "5564992638815",
      mensagemWhatsapp:
        "Olá! Vi a Apareça Ai no Piracanjuba.ai e quero um diagnóstico do meu negócio.",
      site: { rotulo: "apareca.ai", url: "https://apareca.ai" },
      extras: [{ rotulo: "Pedir o diagnóstico gratuito", url: "https://apareca.ai/diagnostico" }],
    },
    endereco: {
      cidade: "Piracanjuba",
      uf: "GO",
      atendimento: "online",
      detalhe: "Atendimento online pelo WhatsApp para Piracanjuba, região e todo o Brasil.",
    },
    vinculo:
      "A Apareça Ai é uma marca da Ferro Labs Tecnologia em parceria com o Grupo V3. A Ferro Labs desenvolve e mantém o Piracanjuba.ai.",
    chamadaFinal: {
      titulo: "Seu negócio aparece quando procuram por ele?",
      texto: "Peça um diagnóstico gratuito e veja o que dá para melhorar.",
    },
    seo: {
      titulo: "Apareça Ai: sites e presença no Google em Piracanjuba",
      descricao:
        "Criação de sites, página única, Google Meu Negócio e presença em inteligência artificial para negócios de Piracanjuba (GO). Diagnóstico gratuito pelo WhatsApp.",
      imagem: "/empresas/apareca/og.png",
      logoSchema: "/empresas/apareca/logo.png",
      tipoSchema: "Organization",
    },
    tema: {
      fundo: "#faf5ec",
      superficie: "#fffdf8",
      texto: "#1b1a14",
      textoSuave: "#5c564a",
      primaria: "#cb3f0a",
      sobrePrimaria: "#ffffff",
      primariaHover: "#a93207",
      borda: "#d8ccb8",
    },
    fontes: "apareca",
    conferidoEm: "2026-11-16",
  },
};

export function getEmpresa(slug: SlugEmpresa): Empresa {
  return EMPRESAS[slug];
}
