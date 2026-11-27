import type { Metadata } from "next";
import Image from "next/image";
import { Montserrat } from "next/font/google";
import Link from "next/link";
import {
  ArrowDown, ArrowLeft, ArrowUpRight, BadgeCheck, BookOpen, Building2, Calculator, FileSearch,
  GraduationCap, Landmark, MapPin, Receipt, Scale, ShieldCheck,
} from "lucide-react";
import BarraWhatsappEmpresa from "@/components/empresas/BarraWhatsappEmpresa";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { LHS_ADVOCACIA } from "@/data/lhs-advocacia";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

// Montserrat é a fonte de títulos do site do escritório (lhs.adv.br); o corpo segue a do portal.
const titulos = Montserrat({ subsets: ["latin"], weight: ["600", "700"], display: "swap", variable: "--lhs-titulo" });

const portal = "https://piracanjuba.ai";
const { nome, advogado, registro, path: caminho, telefone, site } = LHS_ADVOCACIA;
const url = portal + caminho;
const imagens = "/empresas/lhs-advocacia";
const oab = "OAB/GO " + registro;
const cna = "https://cna.oab.org.br/";
const ID_BOTAO_TOPO = "whatsapp-topo";
const mensagem = (complemento = "") =>
  "Olá, Dr. Luiz. Encontrei sua página no Piracanjuba.ai" + complemento + " e gostaria de falar sobre uma questão tributária.";
const whatsapp = linkWhatsapp(telefone, mensagem());

const areas = [
  {
    titulo: "Planejamento tributário", Icone: Calculator,
    texto: "Escolha do regime (Simples Nacional, Lucro Presumido ou Lucro Real) e organização das operações da empresa e do produtor rural para pagar o tributo que a lei exige, sem excessos.",
  },
  {
    titulo: "Execução fiscal e dívida ativa", Icone: Scale,
    texto: "Defesa em cobranças da União, do Estado de Goiás e dos municípios: embargos, exceção de pré-executividade, parcelamento e transação, com atenção ao patrimônio da empresa e dos sócios.",
  },
  {
    titulo: "Recuperação de tributos", Icone: Receipt,
    texto: "Revisão das guias dos últimos 5 anos para identificar o que foi pago a mais ou sem fundamento e pedir a restituição ou a compensação.",
  },
  {
    titulo: "Simples Nacional", Icone: FileSearch,
    texto: "Termo de exclusão, débitos que impedem a permanência no regime, parcelamento e a comparação com o Lucro Presumido.",
  },
  {
    titulo: "Tributos estaduais de Goiás", Icone: Landmark,
    texto: "ICMS, IPVA, ITCD e taxas: autos de infração, defesa no processo administrativo da Secretaria da Economia e cobranças da Procuradoria-Geral do Estado.",
  },
  {
    titulo: "Reforma Tributária e prevenção", Icone: ShieldCheck,
    texto: "Leitura dos efeitos da CBS e do IBS sobre preços, contratos e créditos, e acompanhamento contínuo para evitar autuações e passivos.",
  },
];

const cidades = [
  {
    cidade: "Piracanjuba",
    texto: "Em 2025 o município somou 168 mil cabeças de gado, 80 milhões de litros de leite e 381,8 mil toneladas de soja, segundo o IBGE. Por isso as dúvidas mais comuns vêm do campo: Funrural, ITR, ICMS na venda da produção e a escolha entre produzir como pessoa física ou por empresa. No comércio, Simples Nacional e cobranças municipais.",
    link: { href: site + "/advogado-em-piracanjuba/", rotulo: "Direito Tributário em Piracanjuba no site do escritório" },
    interno: { href: "/agro", rotulo: "Painel da agropecuária de Piracanjuba" },
  },
  {
    cidade: "Professor Jamil",
    texto: "Na mesma região de Piracanjuba, o município tem economia rural e as mesmas questões de quem cria gado, produz leite e grãos: Funrural, ITR e ICMS na saída da produção. O atendimento é feito a distância, com reunião presencial quando o caso pede.",
    link: { href: site + "/advogado-tributarista-goias/", rotulo: "Cidades atendidas em Goiás" },
  },
  {
    cidade: "Morrinhos",
    texto: "Polo agropecuário e agroindustrial do sul de Goiás, Morrinhos reúne produtores rurais, agroindústrias e comércio. Créditos de ICMS na cadeia produtiva, benefícios fiscais e o planejamento de patrimônio e sucessão de famílias do agro estão entre os temas frequentes.",
    link: { href: site + "/advogado-em-morrinhos/", rotulo: "Direito Tributário em Morrinhos no site do escritório" },
  },
  {
    cidade: "Caldas Novas",
    texto: "Turismo termal, hotelaria e imóveis de temporada movem a cidade. Para hotéis, pousadas, restaurantes e administradoras, entram em pauta o ISS, o IPTU e o ITBI, o enquadramento no Simples Nacional e o regime específico que a Reforma Tributária criou para hotelaria, bares e restaurantes.",
    link: { href: site + "/advogado-em-caldas-novas/", rotulo: "Direito Tributário em Caldas Novas no site do escritório" },
  },
  {
    cidade: "Goiânia",
    texto: "Base do escritório. Na capital ficam a Secretaria da Economia, a Procuradoria-Geral do Estado, a Receita Federal e a Justiça Federal em Goiás, onde corre boa parte dos processos tributários do estado. Reuniões presenciais são combinadas pelo WhatsApp.",
    link: { href: site + "/", rotulo: "Site do LHS Advocacia" },
  },
  {
    cidade: "Anápolis",
    texto: "O Distrito Agroindustrial (DAIA), o polo farmacêutico e o Porto Seco fazem de Anápolis um centro de indústria e logística. ICMS em operações interestaduais e de importação, incentivos fiscais estaduais como o ProGoiás e créditos de PIS e Cofins são os temas mais comuns.",
    link: { href: site + "/advogado-em-anapolis/", rotulo: "Direito Tributário em Anápolis no site do escritório" },
  },
];

const passos = [
  { titulo: "Conte o caso pelo WhatsApp", texto: "Envie um resumo da situação e, se tiver, a notificação, o auto de infração ou o número do processo." },
  { titulo: "Análise de prazos e caminhos", texto: "O advogado verifica os prazos e as alternativas, administrativas ou judiciais. Os honorários são combinados antes de qualquer providência." },
  { titulo: "Atuação em todas as fases", texto: "Do processo administrativo na Receita, na Secretaria da Economia ou na prefeitura até os recursos nos tribunais." },
];

const artigos = [
  { href: "/blog/execucao-fiscal-como-se-defender/", titulo: "Execução fiscal: como se defender e evitar bloqueio de bens" },
  { href: "/blog/excecao-de-pre-executividade/", titulo: "Exceção de pré-executividade: defesa sem garantir o juízo" },
  { href: "/blog/fui-excluido-do-simples-nacional/", titulo: "Fui excluído do Simples Nacional: o que fazer agora" },
  { href: "/blog/recuperacao-de-creditos-tributarios/", titulo: "Recuperação de créditos tributários: como reaver o que foi pago a mais" },
  { href: "/blog/responsabilidade-tributaria-dos-socios/", titulo: "Dívida tributária da empresa pode atingir os bens dos sócios?" },
  { href: "/blog/ibs-e-cbs-novos-impostos-reforma-tributaria/", titulo: "IBS e CBS: entenda os novos impostos da Reforma Tributária" },
];

const perguntas = [
  {
    pergunta: "O LHS Advocacia atende quem está em Piracanjuba?",
    resposta: `Sim. ${advogado} (${oab}) atende empresas, produtores rurais e pessoas físicas de Piracanjuba em Direito Tributário. A base do escritório é Goiânia; o atendimento é feito a distância, por WhatsApp e videochamada, e presencialmente quando o caso exige.`,
  },
  {
    pergunta: "O que faz um advogado tributarista?",
    resposta: "Cuida da relação entre o contribuinte e o Fisco. Orienta o planejamento tributário dentro da lei, faz a defesa em autos de infração e execuções fiscais, pede a devolução de tributos pagos a mais e ajuda a regularizar dívidas com a Receita Federal, a Secretaria da Economia de Goiás e as prefeituras.",
  },
  {
    pergunta: "Recebi a citação de uma execução fiscal. Qual é o prazo para me defender?",
    resposta: "Os embargos à execução podem ser apresentados em 30 dias, contados da garantia do juízo por depósito, fiança ou penhora (artigo 16 da Lei 6.830/1980). Questões que não dependem de prova, como a prescrição, podem ser levadas antes por exceção de pré-executividade. Procure orientação assim que receber a citação.",
  },
  {
    pergunta: "Minha empresa recebeu o termo de exclusão do Simples Nacional por dívida. Dá para continuar no regime?",
    resposta: "Em regra, sim, se os débitos apontados no termo forem pagos ou parcelados dentro do prazo indicado nele. Sem a regularização, a exclusão passa a valer a partir de 1º de janeiro do ano seguinte.",
  },
  {
    pergunta: "Dá para recuperar imposto pago a mais?",
    resposta: "Sim. O pedido de restituição ou de compensação alcança os pagamentos feitos nos últimos 5 anos (artigo 168 do Código Tributário Nacional). A análise começa pelas guias e pelas declarações da empresa.",
  },
  {
    pergunta: "Quem cobra dívida de IPVA, ICMS e ITCD em Goiás?",
    resposta: "Esses tributos são estaduais e administrados pela Secretaria de Estado da Economia de Goiás. Quando não são pagos, a dívida é inscrita em dívida ativa e a cobrança judicial fica com a Procuradoria-Geral do Estado (PGE-GO).",
  },
  {
    pergunta: "A Reforma Tributária já está valendo?",
    resposta: "Já começou. A Emenda Constitucional 132/2023 e a Lei Complementar 214/2025 criaram a CBS, federal, e o IBS, de estados e municípios. 2026 é um ano de teste, com alíquotas simbólicas; a CBS passa a ser cobrada em 2027, e a troca do ICMS e do ISS pelo IBS termina em 2033.",
  },
  {
    pergunta: "Como conferir a inscrição do advogado na OAB?",
    resposta: `No Cadastro Nacional dos Advogados (cna.oab.org.br), pelo nome ou pelo número. ${advogado} tem inscrição na seccional de Goiás sob o número ${registro}.`,
  },
  {
    pergunta: "Como é o primeiro contato?",
    resposta: `Pelo WhatsApp ${formatarTelefoneBr(telefone)}. Envie um resumo da situação e os documentos que tiver. O valor dos honorários depende do tipo de demanda e é informado depois da análise do caso.`,
  },
];

const titulo = "Advogado Tributarista em Piracanjuba e Goiânia | LHS";
const descricao = `${advogado} (${oab}), advogado tributarista para Piracanjuba, Goiânia, Morrinhos, Professor Jamil, Caldas Novas e Anápolis. Fale pelo WhatsApp.`;
const compartilhamento = {
  url: portal + imagens + "/compartilhar.jpg", width: 1200, height: 630,
  alt: "Luiz Henrique Souza, advogado tributarista, OAB/GO 77.247, atendimento em Piracanjuba, Goiânia e região",
};
const base = pageMetadata({ title: titulo, description: descricao, path: caminho, image: compartilhamento.url, imageAlt: compartilhamento.alt });
export const metadata: Metadata = {
  ...base,
  title: { absolute: titulo },
  openGraph: { ...base.openGraph, images: [compartilhamento] },
  twitter: { ...base.twitter, card: "summary_large_image", images: [compartilhamento] },
};

const cidadeSchema = (cidade: string) => ({
  "@type": "City", name: cidade, containedInPlace: { "@type": "State", name: "Goiás" },
});
const esquema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage", "@id": url + "#pagina", url, name: titulo, description: descricao,
      inLanguage: "pt-BR", isPartOf: { "@id": portal + "/#website" },
      mainEntity: { "@id": url + "#escritorio" }, breadcrumb: { "@id": url + "#navegacao" },
      about: { "@id": url + "#luiz-henrique-souza" },
    },
    {
      "@type": "LegalService", "@id": url + "#escritorio", name: nome, alternateName: "LHS Advocacia", url,
      mainEntityOfPage: { "@id": url + "#pagina" }, sameAs: [site + "/"],
      image: portal + imagens + "/retrato.webp", telephone: "+" + telefone,
      founder: { "@id": url + "#luiz-henrique-souza" }, employee: { "@id": url + "#luiz-henrique-souza" },
      address: { "@type": "PostalAddress", addressLocality: "Goiânia", addressRegion: "GO", addressCountry: "BR" },
      areaServed: [...cidades.map(({ cidade }) => cidadeSchema(cidade)), { "@type": "State", name: "Goiás" }],
      knowsAbout: ["Direito Tributário", "Planejamento tributário", "Execução fiscal", "Simples Nacional", "ICMS", "ITCD", "IPVA", "Reforma Tributária"],
      contactPoint: { "@type": "ContactPoint", contactType: "Atendimento", telephone: "+" + telefone, url: whatsapp, availableLanguage: "pt-BR" },
      hasOfferCatalog: {
        "@type": "OfferCatalog", name: "Áreas de atuação em Direito Tributário",
        itemListElement: areas.map((a) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: a.titulo, description: a.texto } })),
      },
    },
    {
      "@type": "Person", "@id": url + "#luiz-henrique-souza", name: advogado,
      jobTitle: "Advogado tributarista", image: portal + imagens + "/retrato.webp",
      worksFor: { "@id": url + "#escritorio" }, sameAs: [site + "/"],
      alumniOf: { "@type": "CollegeOrUniversity", name: "Universidade Federal de Goiás", alternateName: "UFG" },
      knowsAbout: ["Direito Tributário", "Contencioso tributário", "Planejamento tributário", "Tributos estaduais de Goiás", "Reforma Tributária"],
      identifier: { "@type": "PropertyValue", propertyID: "OAB-GO", value: registro },
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

export default function AdvogadoTributarista() {
  return (
    <article className={titulos.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />

      <header className={s.capa}>
        <Image src={imagens + "/escritorio.webp"} alt="" fill sizes="100vw" className={s.fundoCapa} />
        <div className={s.largura}>
          <div className={s.linhaGuia}>
            <Link href="/zap-pba"><ArrowLeft size={15} aria-hidden="true" /> Guia Zap PBA</Link>
            <span className={s.dadosCapa}><span className={s.cidade}><MapPin size={14} aria-hidden="true" /> Goiânia, Goiás</span>{oab}</span>
          </div>
          <div className={s.capaGrade}>
            <div className={s.apresentacao}>
              <p className={s.marca}><span>LHS</span> Advocacia Tributária</p>
              <h1>Advogado tributarista em Piracanjuba, Goiânia e região</h1>
              <p className={s.lide}>{advogado} atende empresas, produtores rurais e pessoas físicas em Direito Tributário: planejamento, defesa em execução fiscal, recuperação de tributos e regularização de dívidas com o Fisco. Atendimento a distância e presencial em Piracanjuba, Professor Jamil, Morrinhos, Caldas Novas, Goiânia e Anápolis.</p>
              <div className={s.acoes}>
                <a id={ID_BOTAO_TOPO} href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Falar com o Dr. Luiz</a>
                <a href="#atuacao" className={s.atalho}>Áreas de atuação <ArrowDown size={15} aria-hidden="true" /></a>
              </div>
              <ul className={s.credenciais} aria-label="Credenciais">
                <li><BadgeCheck size={16} aria-hidden="true" /> {oab}</li>
                <li><GraduationCap size={16} aria-hidden="true" /> Formado pela UFG</li>
                <li><Landmark size={16} aria-hidden="true" /> Experiência na Procuradoria Tributária (PGE-GO)</li>
              </ul>
            </div>
            <figure className={s.retrato}>
              <Image src={imagens + "/retrato.webp"} width={900} height={1200} alt="Retrato do advogado Luiz Henrique Souza, de terno azul-marinho, em um escritório"
                loading="eager" fetchPriority="high" sizes="(max-width: 700px) 78vw, (max-width: 1150px) 36vw, 400px" />
              <figcaption><strong>{advogado}</strong><span>Advogado · {oab}</span></figcaption>
            </figure>
          </div>
        </div>
      </header>

      <section aria-labelledby="titulo-resumo" className={s.resumo}>
        <div className={s.largura}>
          <h2 id="titulo-resumo" className={s.rotuloResumo}>Em resumo</h2>
          <dl className={s.fichaResumo}>
            <div><dt>Advogado</dt><dd>{advogado}, {oab}</dd></div>
            <div><dt>Área</dt><dd>Direito Tributário para empresas, produtores rurais e pessoas físicas</dd></div>
            <div><dt>Base</dt><dd>Goiânia (GO), com atendimento em todo o estado de Goiás</dd></div>
            <div><dt>Contato</dt><dd><a href={whatsapp}>WhatsApp {formatarTelefoneBr(telefone)}</a> · <a href={site + "/"}>lhs.adv.br</a></dd></div>
          </dl>
        </div>
      </section>

      <section id="atuacao" aria-labelledby="titulo-atuacao" className={s.atuacao}>
        <div className={s.largura}>
          <div className={s.cabecalhoSecao}>
            <p className={s.sobretitulo}>Atuação</p>
            <h2 id="titulo-atuacao">Direito Tributário, da prevenção ao contencioso</h2>
            <p>Atuação focada em Direito Tributário, com tributos federais, estaduais e municipais.</p>
          </div>
          <ul className={s.areas}>
            {areas.map(({ titulo: area, texto, Icone }, i) => (
              <li key={area}>
                <span className={s.numero} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <Icone size={24} strokeWidth={1.4} aria-hidden="true" />
                <h3>{area}</h3>
                <p>{texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="cidades" aria-labelledby="titulo-cidades" className={s.cidades}>
        <div className={s.largura}>
          <div className={s.cabecalhoSecao}>
            <p className={s.sobretitulo}><MapPin size={14} aria-hidden="true" /> Atendimento em Goiás</p>
            <h2 id="titulo-cidades">Advogado em Piracanjuba, Goiânia e cidades vizinhas</h2>
            <p>Cada cidade tem uma economia própria, e isso muda as questões tributárias que chegam ao escritório.</p>
          </div>
          <ul className={s.listaCidades}>
            {cidades.map(({ cidade, texto, link, interno }) => (
              <li key={cidade}>
                <h3>Advogado tributarista em {cidade}</h3>
                <p>{texto}</p>
                <div className={s.linksCidade}>
                  <a href={linkWhatsapp(telefone, mensagem(", estou em " + cidade))} aria-label={"Falar pelo WhatsApp com o advogado sobre um caso em " + cidade}>
                    <WhatsAppIcon fill="currentColor" /> Falar sobre um caso em {cidade}
                  </a>
                  {interno && <Link href={interno.href}>{interno.rotulo} <ArrowUpRight size={14} aria-hidden="true" /></Link>}
                  <a href={link.href}>{link.rotulo} <ArrowUpRight size={14} aria-hidden="true" /></a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="titulo-como" className={s.como}>
        <div className={s.largura}>
          <div className={s.comoGrade}>
            <div>
              <p className={s.rotulo}><Building2 size={16} aria-hidden="true" /> Como funciona</p>
              <h2 id="titulo-como">Do primeiro contato à defesa</h2>
              <p className={s.comoLide}>Prazo é o que mais pesa em questão tributária. Quanto antes o caso chega, mais caminhos ficam abertos.</p>
              <a href={whatsapp} className={s.botaoClaro}><WhatsAppIcon fill="currentColor" /> Enviar o caso pelo WhatsApp</a>
            </div>
            <ol className={s.passos}>
              {passos.map(({ titulo: passo, texto }) => (
                <li key={passo}><h3>{passo}</h3><p>{texto}</p></li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="sobre" aria-labelledby="titulo-sobre" className={s.sobre}>
        <div className={s.largura}>
          <div className={s.sobreGrade}>
            <div>
              <p className={s.sobretitulo}>Quem atende</p>
              <h2 id="titulo-sobre">{advogado}</h2>
              <p className={s.sobreTexto}>{advogado} é advogado inscrito na OAB de Goiás sob o número {registro} e formado em Direito pela Universidade Federal de Goiás (UFG). Sua experiência inclui a Procuradoria Tributária da Procuradoria-Geral do Estado de Goiás (PGE-GO), no Núcleo de Tributos Residuais (NUTRE), com o contencioso de IPVA, ITCD e taxas e o contato frequente com o ICMS.</p>
              <p className={s.sobreTexto}>Conhecer como o Fisco estadual cobra e se defende ajuda a antecipar os argumentos do outro lado e a montar a defesa do contribuinte. Ele acompanha a Reforma Tributária e publica artigos sobre Direito Tributário no blog do escritório.</p>
              <dl className={s.fatos}>
                <div><dt><BadgeCheck size={16} aria-hidden="true" /> Inscrição</dt><dd>{oab} <a href={cna}>Conferir no Cadastro Nacional dos Advogados <ArrowUpRight size={14} aria-hidden="true" /></a></dd></div>
                <div><dt><GraduationCap size={16} aria-hidden="true" /> Formação</dt><dd>Direito, Universidade Federal de Goiás (UFG)</dd></div>
                <div><dt><MapPin size={16} aria-hidden="true" /> Base</dt><dd>Goiânia (GO), com atendimento a distância e nas comarcas da região</dd></div>
                <div><dt><Scale size={16} aria-hidden="true" /> Site</dt><dd><a href={site + "/"}>lhs.adv.br <ArrowUpRight size={14} aria-hidden="true" /></a></dd></div>
              </dl>
            </div>
            <figure className={s.fotoSobre}>
              <Image src={imagens + "/escritorio.webp"} width={1280} height={720} alt="Mesa de escritório de advocacia com livros jurídicos, documentos e luminária"
                sizes="(max-width: 900px) 90vw, 480px" />
              <figcaption>Imagem ilustrativa.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-artigos" className={s.artigos}>
        <div className={s.largura}>
          <div className={s.cabecalhoSecao}>
            <p className={s.sobretitulo}><BookOpen size={14} aria-hidden="true" /> Para ler antes da consulta</p>
            <h2 id="titulo-artigos">Artigos do blog do escritório</h2>
          </div>
          <ul className={s.listaArtigos}>
            {artigos.map(({ href, titulo: artigo }) => (
              <li key={href}><a href={site + href}>{artigo} <ArrowUpRight size={16} aria-hidden="true" /></a></li>
            ))}
          </ul>
        </div>
      </section>

      <section id="perguntas" aria-labelledby="titulo-perguntas" className={s.perguntas}>
        <div className={s.largura}>
          <h2 id="titulo-perguntas">Perguntas frequentes sobre advogado tributarista</h2>
          <div className={s.listaPerguntas}>
            {perguntas.map(({ pergunta, resposta }) => (
              <details key={pergunta}>
                <summary>{pergunta}</summary>
                <p>{resposta}</p>
              </details>
            ))}
          </div>
          <p className={s.aviso}>As respostas têm caráter informativo e não substituem a análise de um caso concreto.</p>
        </div>
      </section>

      <section id="contato" aria-labelledby="titulo-contato" className={s.contato}>
        <div className={s.largura}>
          <div className={s.contatoGrade}>
            <div className={s.convite}>
              <h2 id="titulo-contato">Como falar com um advogado tributarista em Piracanjuba?</h2>
              <p>Pelo WhatsApp, você fala diretamente com {advogado} para contar o caso e combinar a reunião, a distância ou presencial.</p>
            </div>
            <div className={s.dados}>
              <div>
                <h3><WhatsAppIcon fill="currentColor" /> WhatsApp</h3>
                <a className={s.telefone} href={whatsapp}>{formatarTelefoneBr(telefone)} <ArrowUpRight size={19} aria-hidden="true" /></a>
              </div>
              <div>
                <h3><Scale size={17} aria-hidden="true" /> Site</h3>
                <a className={s.rede} href={site + "/"}>lhs.adv.br <ArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
              <div>
                <h3><MapPin size={17} aria-hidden="true" /> Atendimento</h3>
                <p>Base em Goiânia. Piracanjuba, Professor Jamil, Morrinhos, Caldas Novas, Anápolis e todo o estado de Goiás.</p>
              </div>
            </div>
          </div>
          <p className={s.registro}>{nome} · {advogado} <span>Advogado · {oab}</span></p>
        </div>
      </section>

      <BarraWhatsappEmpresa alvoId={ID_BOTAO_TOPO}>
        <a href={whatsapp} className={s.botaoBarra}><WhatsAppIcon fill="currentColor" /> Falar com o Dr. Luiz</a>
      </BarraWhatsappEmpresa>
      {/* A barra nasce escondida (sem piscar na carga) e quem está sem JavaScript a recebe por esta regra. */}
      <noscript>
        <style>{"[data-barra-empresa]{translate:none;transform:none}"}</style>
      </noscript>
    </article>
  );
}
