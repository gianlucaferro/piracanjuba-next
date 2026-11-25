import type { Metadata } from "next";
import Image from "next/image";
import { Inter } from "next/font/google";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Building2, CalendarCheck, Camera, CircleCheck,
  FileText, Globe, Landmark, MapPin, Plane, Quote, RefreshCw, ShieldCheck, Star, Timer,
} from "lucide-react";
import BarraWhatsappEmpresa from "@/components/empresas/BarraWhatsappEmpresa";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

// Fonte do site da Viaggi Vistos (viaggivistos.com.br usa Inter).
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--vv-fonte" });

// Dados da Viaggi Vistos. As fontes únicas ficam no repositório viaggi-site:
// src/data/avaliacoes.ts (total de avaliações), src/data/entidade.ts (números e bio),
// src/data/servicos.ts (serviços e preços) e src/data/taxaConsular.ts (taxa em reais).
// Esta página não mostra a taxa em reais de propósito: ela muda com frequência e o valor
// vigente fica só no artigo 29952 do site da Viaggi. Conferido em 2026-11-25.
const portal = "https://piracanjuba.ai";
const caminho = "/viaggi-vistos";
const url = portal + caminho;
const imagens = "/empresas/viaggi-vistos";
const site = "https://www.viaggivistos.com.br";
const nome = "Viaggi Vistos";
const telefone = "5564992610775";
const instagram = "https://www.instagram.com/viaggivistos/";
const whatsapp = linkWhatsapp(telefone, "Olá, Viaggi! Vim pelo Piracanjuba.ai. Meu nome é:");
const avaliacoes = "mais de 5.000";
const ID_BOTAO_TOPO = "whatsapp-topo";
const artigo = (permalink: string) => `${site}/noticias/${permalink}`;
const servico = (slug: string) => `${site}/servicos/${slug}`;

const cidades = [
  "Piracanjuba", "Professor Jamil", "Morrinhos", "Caldas Novas", "Rio Quente",
  "Bela Vista de Goiás", "Cromínia", "Mairipotaba", "Pontalina", "Hidrolândia",
];

const numeros = [
  { valor: "+90 mil", texto: "clientes aprovados em todos os estados do Brasil" },
  { valor: "+5.000", texto: "avaliações 5 estrelas no Google" },
  { valor: "+15 anos", texto: "de experiência em processos consulares" },
  { valor: "Online", texto: "atendimento para Piracanjuba, região e todo o Brasil" },
];

// Itens do cartão de assessoria, iguais aos da home do site da Viaggi.
const itensAssessoria = [
  "Análise do seu perfil",
  "Preenchimento do DS-160",
  "Emissão da guia da taxa consular",
  "Agendamento do CASV e da entrevista",
  "Orientações para a entrevista",
  "Guia de devolução do passaporte, se optar pela entrega",
  "Manual do visto aprovado",
];

const outrosServicos = [
  { titulo: "Visto de negócios", slug: "visto-negocios" },
  { titulo: "Visto de trânsito (C1)", slug: "visto-transito" },
  { titulo: "ESTA", slug: "esta-estados-unidos" },
  { titulo: "eTA Canadá", slug: "eta-canada" },
  { titulo: "eTA Reino Unido", slug: "eta-reino-unido" },
  { titulo: "e-Visa México", slug: "e-visa-mexico" },
  { titulo: "Passaporte brasileiro", slug: "passaporte-brasileiro" },
  { titulo: "Entrega de documentos no CASV", slug: "entrega-de-documentos-no-casv" },
  { titulo: "Retirada de passaporte no CASV", slug: "retirada-de-passaporte-no-casv" },
];

const passos = [
  {
    titulo: "Preenchimento do DS-160", icone: FileText,
    texto: "O formulário oficial reúne seus dados pessoais, profissionais, familiares e de viagem. Ele precisa estar completo e correto antes do pagamento da taxa.",
  },
  {
    titulo: "Pagamento da taxa consular", icone: Landmark,
    texto: "Para o visto de turismo e negócios (B1/B2), são US$ 185 por pessoa, pagos em reais. A taxa não é reembolsável e não garante a aprovação.",
  },
  {
    titulo: "Agendamento do CASV e da entrevista", icone: CalendarCheck,
    texto: "No sistema oficial, você escolhe o consulado e a data da entrevista e, depois, a data do CASV.",
  },
  {
    titulo: "Foto e digitais no CASV", icone: Camera,
    texto: "Em Brasília, o CASV fica no Aeroporto JK. Ele pode ser no mesmo dia da entrevista, se houver vaga, no dia anterior ou até dez dias antes.",
  },
  {
    titulo: "Entrevista no consulado", icone: Building2,
    texto: "Sempre presencial. Responda de forma direta, verdadeira e coerente com o DS-160. A decisão é exclusiva do oficial consular.",
  },
  {
    titulo: "Passaporte com o visto", icone: Plane,
    texto: "Depois da entrevista, o caso segue para emissão, é recusado ou fica pendente de documentos ou de análise adicional. O passaporte volta pela opção escolhida.",
  },
];

const regiao = [
  {
    cidade: "Professor Jamil",
    texto: "Vizinha de Piracanjuba, segue o mesmo caminho: DS-160, taxa e agendamento a distância, e viagem só para o CASV e a entrevista, que podem cair no mesmo dia se houver vaga.",
  },
  {
    cidade: "Morrinhos",
    texto: "Quem mora em Morrinhos resolve a parte online sem sair de casa. O posto recomendado é Brasília, o mais próximo, mas é possível escolher qualquer consulado dos EUA no Brasil.",
  },
  {
    cidade: "Caldas Novas e Rio Quente",
    texto: "Quem mora em Caldas Novas ou Rio Quente faz todo o preparo a distância, com o atendimento online da Viaggi, e viaja apenas para o CASV e a entrevista, no posto que escolher.",
  },
];

const depoimentos = [
  {
    nome: "Thaíssa Hélida", foto: "thaissa-helida",
    texto: "Recomendo de olhos fechados! Já tive o visto negado em 2019 com a assessoria de uma outra empresa. Mas com a Viaggi eu senti diferença desde o primeiro contato. Sempre foram muito atenciosos e me passaram muita confiança. Todo o processo foi cuidadosamente explicado e recebemos orientações específicas pro nosso caso. O resultado é que conseguimos aprovação! Agradeço demais a toda a equipe!!!",
  },
  {
    nome: "Thiago Alves", foto: "thiago-alves",
    texto: "Depois de 2 vistos negados, estava para desistir, até que entrei em contato com algumas agências e a Viaggi foi a que mais me chamou atenção, desde o primeiro atendimento até o momento final após a aprovação do visto! O Carlos sempre à disposição pra tirar todas as dúvidas, aconselhar, etc. Muito obrigado por fazerem a diferença em nossas vidas!",
  },
  {
    nome: "Maria Helena Bessa", foto: "maria-helena-bessa",
    texto: "Merecem todo o reconhecimento e avaliação máxima! Me tranquilizaram demais e vi que no fundo só era ansiedade minha. A entrevista foi super tranquila e passei de primeira! Coloquei mil objeções antes e não me pediram nenhuma documentação. Muito obrigada a toda equipe, em especial ao Samuel, que sanou todas as minhas dúvidas, até mesmo fora do horário comercial!",
  },
];

const clientes = [18, 22, 26, 31, 39, 47, 55, 63];

// Respostas conforme a Doutrina Viaggi Vistos (vault, Referências), regras 1, 2, 30, 31, 59, 77.1 e 92,
// e a frase fixa do operador de 2026-09-22 para "A Viaggi atende quem é de <cidade>?".
const perguntas = [
  {
    pergunta: "A Viaggi Vistos atende quem é de Piracanjuba, Professor Jamil, Morrinhos ou Caldas Novas?",
    resposta: "Sim. A Viaggi Vistos possui sede física em Goiânia (GO) e atende solicitantes de todas as partes do Brasil de forma online.",
  },
  {
    pergunta: "Onde faço a entrevista do visto americano morando em Piracanjuba?",
    resposta: "No posto que você escolher: o recomendado é Brasília, o mais próximo, mas pode ser qualquer consulado dos EUA no Brasil. Em Brasília, a foto e as digitais são no CASV do Aeroporto JK e a entrevista é na Embaixada dos EUA.",
  },
  {
    pergunta: "Quantas vezes preciso ir a Brasília?",
    resposta: "Pode ser uma viagem só. Em Brasília dá para marcar o CASV (foto e digitais) no mesmo dia da entrevista, se houver vaga no momento do agendamento, deixando no mínimo 2 horas entre um e outro para o deslocamento até a Embaixada. Se não houver vaga no mesmo dia, o CASV pode ficar no dia anterior ou até 10 dias antes da entrevista.",
  },
  {
    pergunta: "Quanto custa o visto americano?",
    resposta: "A taxa consular (MRV) é de US$ 185 por pessoa, paga em reais e igual em todo o Brasil. O valor em reais é atualizado no site da Viaggi Vistos sempre que muda. Os honorários da assessoria são cobrados à parte.",
  },
  {
    pergunta: "Crianças e bebês precisam ir à entrevista?",
    resposta: "Sim. Não existe mais isenção de entrevista por idade desde outubro de 2025: todo solicitante comparece à entrevista consular, inclusive bebês e crianças de colo, acompanhados de pelo menos um dos pais ou do responsável legal. Menores de 14 anos também comparecem ao CASV, mesmo dispensados da coleta de digitais.",
  },
  {
    pergunta: "Dá para renovar o visto americano sem entrevista?",
    resposta: "Em muitos casos, sim. Os critérios são cumulativos: visto anterior emitido no Brasil, com validade total, quando o solicitante tinha 18 anos ou mais, vencido há no máximo 12 meses, da mesma categoria e sem dano, e nenhuma negativa de visto americano não superada. Mesmo com a isenção, o passaporte e os documentos são entregues no CASV, pessoalmente ou por um representante. A Viaggi faz a triagem preliminar; quem decide a isenção é o consulado.",
  },
  {
    pergunta: "Uma assessoria garante a aprovação de visto americano?",
    resposta: "Não, nenhuma assessoria pode garantir a aprovação do seu visto americano. O que uma assessoria experiente e confiável pode fazer é aumentar suas chances de aprovação evitando erros no preenchimento do DS-160 e preparando o solicitante para se sair bem na entrevista consular.",
  },
  {
    pergunta: "O que é o Antecipa 45?",
    resposta: "É o serviço da Viaggi Vistos para antecipar a data da entrevista consular. Antecipamos sua entrevista em no máximo até 45 dias ou seu dinheiro integralmente de volta. Sem risco. O valor é de R$ 500 por grupo de agendamento, qualquer que seja o número de pessoas.",
  },
  {
    pergunta: "Qual a renda mínima para tirar o visto americano?",
    resposta: "Não existe renda mínima nem exigência de valor na conta. O que conta é a sua situação financeira fazer sentido com o seu perfil e com a viagem que você diz que vai fazer.",
  },
];

const titulo = "Visto Americano em Piracanjuba (GO) | Viaggi Vistos";
const descricao = "Assessoria para visto americano em Piracanjuba, Professor Jamil, Morrinhos, Caldas Novas e região: DS-160, agendamento e preparo para a entrevista.";
const compartilhamento = {
  url: portal + imagens + "/compartilhar.jpg", width: 1200, height: 630,
  alt: "Viaggi Vistos: assessoria para visto americano em Piracanjuba e região",
};
const base = pageMetadata({ title: titulo, description: descricao, path: caminho, image: compartilhamento.url });
export const metadata: Metadata = {
  ...base,
  title: { absolute: titulo },
  openGraph: { ...base.openGraph, images: [compartilhamento] },
  twitter: { ...base.twitter, card: "summary_large_image", images: [compartilhamento] },
};

const org = site + "/#organization";
const esquema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage", "@id": url + "#pagina", url, name: titulo, description: descricao,
      inLanguage: "pt-BR", isPartOf: { "@id": portal + "/#website" },
      about: { "@id": org }, mainEntity: { "@id": url + "#servico" }, breadcrumb: { "@id": url + "#navegacao" },
    },
    {
      "@type": "Organization", "@id": org, name: nome, url: site + "/", logo: portal + imagens + "/logo-branco.webp",
      telephone: "+" + telefone, foundingDate: "2011", sameAs: [instagram],
      founder: { "@type": "Person", "@id": site + "/#gianlucaferro", name: "Gianluca Ferro", jobTitle: "Especialista em visto americano e fundador da Viaggi Vistos", url: site + "/sobre/gianluca-ferro" },
    },
    {
      "@type": "Service", "@id": url + "#servico", name: "Assessoria para visto americano em Piracanjuba e região",
      serviceType: "Assessoria para visto americano", provider: { "@id": org }, url,
      areaServed: cidades.map((c) => ({ "@type": "City", name: c, containedInPlace: { "@type": "State", name: "Goiás" } })),
      availableChannel: { "@type": "ServiceChannel", serviceUrl: url, servicePhone: "+" + telefone, availableLanguage: "pt-BR" },
    },
    {
      "@type": "FAQPage", "@id": url + "#perguntas", url,
      mainEntity: perguntas.map((p) => ({ "@type": "Question", name: p.pergunta, acceptedAnswer: { "@type": "Answer", text: p.resposta } })),
    },
    {
      ...breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: nome, path: caminho }]),
      "@id": url + "#navegacao",
    },
  ],
};

export default function ViaggiVistos() {
  return (
    <article className={inter.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />

      <p className={s.aviso}>A Viaggi Vistos é uma agência de vistos privada e não faz parte de nenhum governo.</p>

      <header className={s.capa}>
        <picture className={s.fundo}>
          <source media="(max-width: 700px) and (orientation: portrait)" srcSet={imagens + "/topo-celular.webp"} />
          <img src={imagens + "/topo-1920.webp"} alt="" width={1920} height={1080} fetchPriority="high" decoding="async" />
        </picture>
        <div className={s.largura}>
          <div className={s.linhaGuia}>
            <Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
            <span><MapPin size={14} aria-hidden="true" /> Piracanjuba e região, Goiás</span>
          </div>
          <div className={s.apresentacao}>
            <Image src={imagens + "/logo-branco.webp"} width={388} height={260} alt="Viaggi Vistos" className={s.logo} loading="eager" />
            <h1>
              <span className={s.sobretitulo}>Assessoria especializada em</span>
              <span className={s.titulo}>Visto americano</span>
              <span className={s.local}>em Piracanjuba e região</span>
            </h1>
            <p className={s.lide}>Mais de 90 mil clientes aprovados e {avaliacoes} avaliações 5 estrelas no Google. Atendimento online para Piracanjuba, Professor Jamil, Morrinhos, Caldas Novas e cidades vizinhas.</p>
            <div className={s.acoes}>
              <a id={ID_BOTAO_TOPO} href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Fale conosco no WhatsApp</a>
              <a href="#como-funciona" className={s.atalho}>Como funciona <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </header>

      <div className={s.faixaTaxa}>
        <div className={s.largura}>
          <p>Taxa consular do visto americano: <strong>US$ 185</strong> por pessoa, paga em reais.</p>
          <a href={artigo("29952-taxa-do-visto-americano-valor-da-mrv-como-pagar-e-quando-pagar")}>Veja o valor de hoje em reais <ArrowRight size={14} aria-hidden="true" /></a>
        </div>
      </div>

      <section aria-labelledby="titulo-numeros" className={s.numeros}>
        <div className={s.largura}>
          <h2 id="titulo-numeros" className={s.oculto}>A Viaggi Vistos em números</h2>
          <ul className={s.gradeNumeros}>
            {numeros.map(({ valor, texto }) => (
              <li key={valor}><strong>{valor}</strong><span>{texto}</span></li>
            ))}
          </ul>
          <div className={s.clientes}>
            {clientes.map((n) => (
              <Image key={n} src={`${imagens}/clientes/aprovado-${n}.webp`} width={360} height={450}
                alt="Cliente da Viaggi Vistos com o visto americano aprovado" sizes="(max-width: 700px) 24vw, 130px" />
            ))}
          </div>
        </div>
      </section>

      <section id="servicos" aria-labelledby="titulo-servicos" className={s.servicos}>
        <div className={s.largura}>
          <div className={s.cabecalho}>
            <h2 id="titulo-servicos">Como a Viaggi ajuda você a tirar o visto</h2>
            <p>Do formulário à entrevista, com orientação em cada etapa e atendimento pelo WhatsApp.</p>
          </div>
          <div className={s.cartoes}>
            <div className={s.cartaoPrincipal}>
              <h3>Assessoria para Visto Americano</h3>
              <ul>
                {itensAssessoria.map((item) => <li key={item}><CircleCheck size={19} aria-hidden="true" /> {item}</li>)}
              </ul>
              <a href={servico("assessoria-visto-americano")} className={s.botaoBranco}>Conhecer a assessoria <ArrowRight size={16} aria-hidden="true" /></a>
              <small>Taxa consular e entrega do passaporte são cobradas à parte.</small>
            </div>
            <div className={s.cartao}>
              <RefreshCw size={26} strokeWidth={1.7} aria-hidden="true" />
              <h3>Renovar Visto Americano</h3>
              <p>Renove seu visto americano com orientação em cada etapa.</p>
              <p>Nos casos de isenção de entrevista, você também pode contratar nossa representação para entregar os documentos, sem precisar ir pessoalmente ao posto.</p>
              <a href={servico("renovacao-visto-americano")} className={s.botaoAzul}>Conhecer a renovação <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
            <div className={s.cartao}>
              <Timer size={26} strokeWidth={1.7} aria-hidden="true" />
              <h3>Antecipa 45</h3>
              <p className={s.promessa}>Antecipamos sua entrevista em no máximo até 45 dias ou seu dinheiro integralmente de volta. Sem risco.</p>
              <p>R$ 500 por grupo de agendamento, qualquer que seja o número de pessoas.</p>
              <a href={servico("antecipar-entrevista-visto-americano")} className={s.botaoAzul}>Conhecer o Antecipa 45 <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <div className={s.outros}>
            <h3>Outros serviços da Viaggi</h3>
            <ul>
              {outrosServicos.map(({ titulo: t, slug }) => (
                <li key={slug}><a href={servico(slug)}>{t} <ArrowUpRight size={14} aria-hidden="true" /></a></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="como-funciona" aria-labelledby="titulo-passos" className={s.passosSecao}>
        <div className={s.largura}>
          <div className={s.cabecalho}>
            <h2 id="titulo-passos">Como tirar o visto americano saindo de Piracanjuba</h2>
            <p>A maior parte do processo é online e você faz daqui mesmo, com calma. Só a biometria e a entrevista são presenciais.</p>
          </div>
          <ol className={s.passos}>
            {passos.map(({ titulo: t, texto, icone: Icone }) => (
              <li key={t}>
                <Icone size={22} strokeWidth={1.7} aria-hidden="true" />
                <h3>{t}</h3>
                <p>{texto}</p>
              </li>
            ))}
          </ol>
          <p className={s.leiaMais}>Veja cada etapa em detalhe no <a href={artigo("32601-como-tirar-o-visto-americano-passo-a-passo")}>passo a passo para tirar o visto americano</a> e no guia de <a href={artigo("32602-agendamento-do-visto-americano-casv-e-entrevista")}>agendamento do CASV e da entrevista</a>.</p>
        </div>
      </section>

      <section id="brasilia" aria-labelledby="titulo-brasilia" className={s.brasilia}>
        <div className={s.largura}>
          <div className={s.brasiliaGrade}>
            <div>
              <p className={s.rotulo}><Landmark size={16} aria-hidden="true" /> Consulado mais próximo</p>
              <h2 id="titulo-brasilia">Onde fica o consulado americano mais perto de Piracanjuba?</h2>
              <p>Piracanjuba e as cidades vizinhas não têm consulado dos Estados Unidos nem CASV. O posto mais próximo é Brasília, e é ele que a Viaggi recomenda, mas você pode escolher qualquer consulado dos EUA no Brasil.</p>
              <p>Em Brasília, o CASV e a entrevista podem cair no mesmo dia, se houver vaga no agendamento, deixando no mínimo 2 horas entre um e outro.</p>
            </div>
            <ul className={s.enderecos}>
              <li>
                <Camera size={22} strokeWidth={1.7} aria-hidden="true" />
                <div><h3>Foto e digitais</h3><p>CASV, no mezanino do Aeroporto Internacional de Brasília (JK).</p></div>
              </li>
              <li>
                <Building2 size={22} strokeWidth={1.7} aria-hidden="true" />
                <div><h3>Entrevista com o cônsul</h3><p>Embaixada dos EUA, SES, Av. das Nações, Quadra 801, Lote 03.</p></div>
              </li>
              <li className={s.alerta}>
                <ShieldCheck size={22} strokeWidth={1.7} aria-hidden="true" />
                <div><h3>Um alerta útil</h3><p>Ao chegar, tenha <a href={artigo("25005-cuidado-com-abordagens-na-porta-do-consulado-americano-ou-casv-")}>cuidado com abordagens na porta do consulado e do CASV</a>: há golpistas oferecendo ajuda.</p></div>
              </li>
            </ul>
          </div>
          <p className={s.leiaMais}>Veja os <a href={artigo("27157-enderecos-dos-casvs-e-consulados-americanos-no-brasil")}>endereços de todos os CASVs e consulados no Brasil</a>.</p>
        </div>
      </section>

      <section id="regiao" aria-labelledby="titulo-regiao" className={s.regiao}>
        <div className={s.largura}>
          <div className={s.cabecalho}>
            <h2 id="titulo-regiao">Visto americano em Professor Jamil, Morrinhos, Caldas Novas e região</h2>
            <p>O atendimento é online e chega a toda a região de Piracanjuba. Quem mora nestas cidades resolve DS-160, taxa, agendamento e preparação sem sair de casa.</p>
          </div>
          <ul className={s.chips} aria-label="Cidades atendidas">
            {cidades.map((c) => <li key={c}><MapPin size={14} aria-hidden="true" /> {c}</li>)}
          </ul>
          <div className={s.cidades}>
            {regiao.map(({ cidade, texto }) => (
              <div key={cidade}><h3>{cidade}</h3><p>{texto}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="fundador" aria-labelledby="titulo-fundador" className={s.fundador}>
        <div className={s.largura}>
          <div className={s.fundadorGrade}>
            <figure>
              <Image src={imagens + "/gianluca-ferro.webp"} width={767} height={1024} alt="Gianluca Ferro, fundador da Viaggi Vistos"
                sizes="(max-width: 700px) 70vw, 340px" />
            </figure>
            <div>
              <p className={s.rotulo}><BadgeCheck size={16} aria-hidden="true" /> Quem conduz a Viaggi</p>
              <h2 id="titulo-fundador">Gianluca Ferro</h2>
              <p className={s.cargo}>Especialista em visto americano e fundador da Viaggi Vistos</p>
              <p>Bacharel em Direito pela PUC-GO, Gianluca ajuda brasileiros a tirar o visto americano há mais de 15 anos e já acompanhou mais de 90 mil aprovações em todos os estados do Brasil.</p>
              <p>É fonte frequente da imprensa sobre visto americano, com participações na TV Globo, no jornal O Globo, no R7, no Terra e na Zero Hora (GZH). Também é o criador do Piracanjuba.ai.</p>
              <a href={site + "/sobre/gianluca-ferro"} className={s.linkSeta}>Conheça a trajetória de Gianluca <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </section>

      <section id="depoimentos" aria-labelledby="titulo-depoimentos" className={s.depoimentos}>
        <div className={s.largura}>
          <div className={s.cabecalho}>
            <h2 id="titulo-depoimentos">Veja experiências de nossos clientes</h2>
            <p><Star size={16} fill="currentColor" aria-hidden="true" /> Nota 5,0 com {avaliacoes} avaliações no Google</p>
          </div>
          <ul className={s.listaDepoimentos}>
            {depoimentos.map(({ nome: n, foto, texto }) => (
              <li key={n}>
                <Quote size={22} strokeWidth={1.5} aria-hidden="true" />
                <blockquote><p>{texto}</p></blockquote>
                <div className={s.autor}>
                  <Image src={`${imagens}/${foto}.webp`} width={48} height={48} alt="" />
                  <div><strong>{n}</strong><span>Avaliação do Google</span></div>
                </div>
              </li>
            ))}
          </ul>
          <a href={site + "/depoimentos"} className={s.linkSeta}>Ver mais avaliações de clientes <ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>
      </section>

      <section aria-labelledby="titulo-cta" className={s.cta}>
        <div className={s.largura}>
          <h2 id="titulo-cta">Quer maximizar as chances de aprovação do seu visto americano?</h2>
          <p>Se você vai solicitar ou renovar o visto americano e quer maximizar suas chances de aprovação, evitando erros e inconsistências no seu DS-160 e na entrevista, entre em contato com a Viaggi Vistos pelo WhatsApp agora mesmo e faça uma análise gratuita do seu perfil!</p>
          <a href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Fale conosco no WhatsApp</a>
        </div>
      </section>

      <section id="perguntas" aria-labelledby="titulo-perguntas" className={s.perguntas}>
        <div className={s.largura}>
          <h2 id="titulo-perguntas">Perguntas frequentes sobre visto americano em Piracanjuba</h2>
          <div className={s.listaPerguntas}>
            {perguntas.map(({ pergunta, resposta }) => (
              <details key={pergunta}>
                <summary>{pergunta}</summary>
                <p>{resposta}</p>
              </details>
            ))}
          </div>
          <p className={s.leiaMais}>Leia também: <a href={artigo("32606-renovacao-do-visto-americano-sem-entrevista")}>renovação do visto americano sem entrevista</a> e <a href={artigo("29952-taxa-do-visto-americano-valor-da-mrv-como-pagar-e-quando-pagar")}>valor da taxa do visto americano e como pagar</a>.</p>
        </div>
      </section>

      <section id="contato" aria-labelledby="titulo-contato" className={s.contato}>
        <div className={s.largura}>
          <div className={s.contatoGrade}>
            <div>
              <h2 id="titulo-contato">Fale com a Viaggi Vistos</h2>
              <p>Atendimento online para Piracanjuba, Professor Jamil, Morrinhos, Caldas Novas e todo o Brasil.</p>
            </div>
            <div className={s.dados}>
              <div>
                <h3><WhatsAppIcon fill="currentColor" /> WhatsApp</h3>
                <a className={s.telefone} href={whatsapp}>{formatarTelefoneBr(telefone)} <ArrowUpRight size={19} aria-hidden="true" /></a>
              </div>
              <div>
                <h3><InstagramIcon /> Instagram</h3>
                <a className={s.rede} href={instagram}>@viaggivistos <ArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
              <div>
                <h3><Globe size={17} aria-hidden="true" /> Site</h3>
                <a className={s.rede} href={site + "/"}>viaggivistos.com.br <ArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
            </div>
          </div>
          <p className={s.rodape}>Viaggi Vistos <span>Assessoria para visto americano desde 2011</span></p>
        </div>
      </section>

      <BarraWhatsappEmpresa alvoId={ID_BOTAO_TOPO}>
        <a href={whatsapp} className={s.botaoBarra}><WhatsAppIcon fill="currentColor" /> Fale conosco no WhatsApp</a>
      </BarraWhatsappEmpresa>
      <noscript>
        <style>{"[data-barra-empresa]{translate:none;transform:none}"}</style>
      </noscript>
    </article>
  );
}
