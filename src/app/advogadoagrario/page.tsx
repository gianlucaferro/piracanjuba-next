import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, FileCheck2, FileText, LandPlot, MapPin, Scale, Sprout } from "lucide-react";
import BarraWhatsappEmpresa from "@/components/empresas/BarraWhatsappEmpresa";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { PAULO_DE_TARSO } from "@/data/paulo-de-tarso";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import fotoPaulo from "./paulo.jpg";
import s from "./pagina.module.css";

const portal = "https://piracanjuba.ai";
const { nome, advogado, registro, path, telefone, site } = PAULO_DE_TARSO;
const oab = `OAB/GO ${registro}`;
const whatsapp = linkWhatsapp(telefone, "Olá, Dr. Paulo. Encontrei sua página no Piracanjuba.ai e gostaria de conversar sobre uma questão de Direito Agrário.");
const cidades = ["Piracanjuba", "Professor Jamil", "Goiânia", "Morrinhos", "Caldas Novas"];
const modalidades = ["Sede presencial", "A distância", "Presencial com agendamento", "A distância", "A distância"];
const servicos = [
  { titulo: "Contratos rurais", texto: "Elaboração e revisão de contratos de arrendamento e parceria agrícola ou pecuária, com atenção à área, ao prazo, às condições e às obrigações de cada parte.", Icone: FileText },
  { titulo: "Regularização de imóveis", texto: "Análise da documentação de imóveis rurais, matrículas, contratos e situações de posse para identificar os caminhos de regularização cabíveis.", Icone: FileCheck2 },
  { titulo: "Usucapião rural", texto: "Avaliação do histórico da posse e dos documentos para verificar os requisitos aplicáveis e as possibilidades de pedido judicial ou extrajudicial.", Icone: LandPlot },
  { titulo: "Posse e divisas", texto: "Orientação em conflitos sobre uso da terra, cercas, limites, passagem e outras questões possessórias no campo.", Icone: Scale },
];
const perguntas = [
  { pergunta: "O que faz um advogado agrário?", resposta: "Orienta e representa pessoas em questões jurídicas ligadas à terra rural, como contratos de arrendamento e parceria, regularização de imóveis, usucapião e conflitos de posse." },
  { pergunta: "O escritório atende em Professor Jamil, Morrinhos e Caldas Novas?", resposta: "Sim. O escritório atende clientes dessas cidades a distância, por telefone, WhatsApp, e-mail ou videochamada. Quando um ato exige presença, o deslocamento é combinado previamente. A sede fica em Piracanjuba." },
  { pergunta: "Há atendimento presencial em Goiânia?", resposta: "Sim, mediante combinação prévia de data, horário e local. O escritório não possui sede ou filial em Goiânia; o endereço fixo fica em Piracanjuba." },
  { pergunta: "O contrato de arrendamento rural verbal é válido?", resposta: "O contrato rural pode ser verbal, mas provar suas condições pode ser mais difícil. A documentação do acordo e a análise do caso ajudam a esclarecer direitos e obrigações." },
  { pergunta: "Quais documentos reunir para uma questão de terra?", resposta: "Se disponíveis, reúna matrícula, escritura ou contrato, CCIR, comprovantes de ITR e CAR, além de mapas, recibos e provas de posse. Mesmo sem todos os documentos, é possível explicar a situação ao advogado." },
  { pergunta: "Toda posse rural dá direito à usucapião?", resposta: "Não. Os requisitos variam conforme a modalidade e dependem do histórico da posse, da área e de outras circunstâncias. É necessária a análise individual da situação e dos documentos." },
];
const titulo = "Advogado Agrário em Piracanjuba e Região | Paulo de Tarso";
const descricao = "Direito Agrário com Paulo de Tarso, OAB/GO 44.630. Atendimento em Piracanjuba, Professor Jamil, Goiânia, Morrinhos, Caldas Novas e região.";
const base = pageMetadata({ title: titulo, description: descricao, path, image: `${portal}${path}/opengraph-image`, imageAlt: "Paulo de Tarso Advocacia, Direito Agrário em Piracanjuba e região" });
export const metadata: Metadata = { ...base, title: { absolute: titulo } };
const url = portal + path;
const esquema = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": `${url}#pagina`, url, name: titulo, description: descricao, inLanguage: "pt-BR", isPartOf: { "@id": `${portal}/#website` }, mainEntity: { "@id": `${url}#escritorio` }, breadcrumb: { "@id": `${url}#navegacao` } },
    { "@type": "LegalService", "@id": `${url}#escritorio`, name: nome, url, sameAs: [site], telephone: `+${telefone}`, email: "contato@pauloadvogado.com.br", address: { "@type": "PostalAddress", streetAddress: "Rua Dom Pedro II, 942, Centro", addressLocality: "Piracanjuba", addressRegion: "GO", postalCode: "75640-116", addressCountry: "BR" }, areaServed: cidades.map((cidade) => ({ "@type": "City", name: cidade, containedInPlace: { "@type": "State", name: "Goiás" } })), knowsAbout: ["Direito Agrário", "Contratos rurais", "Usucapião rural", "Regularização fundiária", "Conflitos possessórios"] },
    { "@type": "Person", "@id": `${url}#paulo`, name: advogado, jobTitle: "Advogado", worksFor: { "@id": `${url}#escritorio` }, sameAs: [`${site}/sobre`], identifier: { "@type": "PropertyValue", propertyID: "OAB-GO", value: registro } },
    { "@type": "FAQPage", "@id": `${url}#perguntas`, mainEntity: perguntas.map(({ pergunta, resposta }) => ({ "@type": "Question", name: pergunta, acceptedAnswer: { "@type": "Answer", text: resposta } })) },
    { ...breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Zap PBA", path: "/zap-pba" }, { name: nome, path }]), "@id": `${url}#navegacao` },
  ],
};

export default function AdvogadoAgrario() {
  return (
    <article className={s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />
      <header className={s.hero}>
        <div className={s.largura}>
          <div className={s.barraSuperior}>
            <nav aria-label="Navegação estrutural"><Link href="/">Início</Link> / <Link href="/zap-pba">Guia Zap PBA</Link> / <span aria-current="page">Paulo de Tarso Advocacia</span></nav>
            <span>{oab}</span>
          </div>
          <div className={s.heroGrid}>
            <div className={s.heroTexto}>
              <p className={s.marca}>Paulo de Tarso <span>Advocacia</span></p>
              <p className={s.etiqueta}><Sprout size={16} aria-hidden="true" /> Direito Agrário em Goiás</p>
              <h1>Advogado agrário em Piracanjuba e região</h1>
              <p className={s.lide}>Orientação jurídica para quem vive e trabalha no campo. Contratos rurais, regularização de terras, usucapião e conflitos de posse, com atendimento em Piracanjuba, Professor Jamil, Goiânia, Morrinhos, Caldas Novas e região.</p>
              <div className={s.acoes}>
                <a id="whatsapp-topo" href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Falar com o escritório</a>
                <a href="#atuacao" className={s.linkClaro}>Conheça a atuação <ArrowDown size={16} aria-hidden="true" /></a>
              </div>
              <p className={s.credencial}>{advogado} <span>·</span> {oab}</p>
            </div>
            <div className={s.heroLateral}>
              <div className={s.molduraImagem}><Image src={fotoPaulo} alt="Paulo de Tarso Giolo Filho" priority sizes="(max-width: 800px) 80vw, 420px" /></div>
              <div className={s.cartaoFoto}><span>Advogado</span><strong>{advogado}</strong><span>{oab}</span></div>
            </div>
          </div>
        </div>
      </header>

      <section className={s.resumo} aria-labelledby="resumo-titulo">
        <div className={s.largura}>
          <h2 id="resumo-titulo">Em resumo</h2>
          <dl>
            <div><dt>Área de atuação</dt><dd>Direito Agrário e questões ligadas à terra rural</dd></div>
            <div><dt>Sede</dt><dd>Rua Dom Pedro II, 942, Centro, Piracanjuba, GO</dd></div>
            <div><dt>Atendimento</dt><dd>Presencial na sede, em Goiânia com agendamento e a distância para a região</dd></div>
            <div><dt>Contato</dt><dd><a href={whatsapp}>WhatsApp {formatarTelefoneBr(telefone)}</a></dd></div>
          </dl>
        </div>
      </section>

      <section id="atuacao" className={s.secao} aria-labelledby="atuacao-titulo">
        <div className={s.largura}>
          <p className={s.sobretitulo}>No campo e na documentação</p>
          <h2 id="atuacao-titulo">Questões rurais que o escritório atende</h2>
          <p className={s.intro}>Cada propriedade e cada relação de trabalho com a terra têm uma história. A análise começa pela situação concreta e pelos documentos disponíveis.</p>
          <ul className={s.servicos}>{servicos.map(({ titulo: servico, texto, Icone }, i) => <li key={servico}><div className={s.servicoTopo}><Icone size={25} strokeWidth={1.5} aria-hidden="true" /><span>{String(i + 1).padStart(2, "0")}</span></div><h3>{servico}</h3><p>{texto}</p></li>)}</ul>
        </div>
      </section>

      <section id="cidades" className={s.regiao} aria-labelledby="cidades-titulo">
        <div className={s.largura}>
          <div className={s.regiaoTopo}><div><p className={s.sobretitulo}><MapPin size={15} aria-hidden="true" /> Atendimento em Goiás</p><h2 id="cidades-titulo">Advocacia agrária para Piracanjuba e cidades da região</h2></div><p>O escritório fica em Piracanjuba. O acompanhamento pode ser feito a distância; em Goiânia, encontros presenciais são combinados previamente. Para atos que exijam presença em outras cidades, o deslocamento é combinado.</p></div>
          <ul className={s.cidades}>
            {cidades.map((cidade, i) => <li key={cidade}><MapPin size={17} aria-hidden="true" /><span><strong>{cidade}</strong>{" "}{modalidades[i]}</span></li>)}
          </ul>
          <p className={s.regiaoNota}>O atendimento também alcança outras cidades de Goiás. Informe sua cidade e a localização do imóvel no primeiro contato.</p>
        </div>
      </section>

      <section className={s.secao} aria-labelledby="preparo-titulo">
        <div className={`${s.largura} ${s.preparo}`}>
          <div><p className={s.sobretitulo}>Antes da conversa</p><h2 id="preparo-titulo">O que pode ajudar na análise</h2><p>Reúna o que estiver disponível. A ausência de algum documento não impede que você apresente a situação ao escritório.</p></div>
          <ul><li>Matrícula, escritura ou contrato de compra da área</li><li>CCIR, comprovantes de ITR e inscrição no CAR</li><li>Contratos rurais, recibos e comprovantes</li><li>Mapas, croquis, fotos e outras provas de posse</li></ul>
        </div>
      </section>

      <section className={s.sobre} aria-labelledby="sobre-titulo"><div className={s.largura}><div><p className={s.sobretitulo}>Quem atende</p><h2 id="sobre-titulo">{advogado}</h2><p>Advogado inscrito na {oab}, atua em Direito Agrário e acompanha questões de contratos, propriedade e posse rural. O escritório atende a partir de Piracanjuba, com acompanhamento direto do advogado.</p><a href={`${site}/servicos/direito-agrario`}>Conheça a atuação no site do escritório <ArrowUpRight size={16} aria-hidden="true" /></a></div><div className={s.sobreDado}><Scale size={28} strokeWidth={1.3} aria-hidden="true" /><span>Inscrição profissional</span><strong>{oab}</strong><a href="https://cna.oab.org.br/">Consultar no Cadastro Nacional dos Advogados <ArrowUpRight size={14} aria-hidden="true" /></a></div></div></section>

      <section className={s.secao} aria-labelledby="artigos-titulo"><div className={s.largura}><p className={s.sobretitulo}>Conteúdo do escritório</p><h2 id="artigos-titulo">Para entender melhor</h2><div className={s.artigos}><a href={`${site}/blog/contrato-de-arrendamento-rural-o-que-observar`}><span>Contratos rurais</span><strong>O que observar em um contrato de arrendamento rural</strong><ArrowUpRight size={19} aria-hidden="true" /></a><a href={`${site}/blog/usucapiao-rural-requisitos-e-prazos`}><span>Regularização</span><strong>Usucapião rural: requisitos, prazos e limite de área</strong><ArrowUpRight size={19} aria-hidden="true" /></a></div></div></section>

      <section id="perguntas" className={s.faq} aria-labelledby="faq-titulo"><div className={s.largura}><p className={s.sobretitulo}>Dúvidas frequentes</p><h2 id="faq-titulo">Perguntas sobre Direito Agrário</h2><div className={s.listaFaq}>{perguntas.map(({ pergunta, resposta }) => <details key={pergunta}><summary>{pergunta}</summary><p>{resposta}</p></details>)}</div><p className={s.aviso}>Conteúdo informativo. Cada caso depende da análise das suas circunstâncias e documentos.</p></div></section>

      <section className={s.contato} aria-labelledby="contato-titulo"><div className={s.largura}><div><p className={s.sobretitulo}>Contato</p><h2 id="contato-titulo">Converse sobre sua questão rural</h2><p>Conte sua situação e informe a cidade e a localização da propriedade. O primeiro contato ajuda a entender o caso e combinar o atendimento.</p><a href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Falar com o escritório</a></div><address><strong>{nome}</strong><span>{advogado} · {oab}</span><span>Rua Dom Pedro II, 942, Centro<br />Piracanjuba, GO · CEP 75640-116</span><a href={`tel:+${telefone}`}>{formatarTelefoneBr(telefone)}</a><a href="mailto:contato@pauloadvogado.com.br">contato@pauloadvogado.com.br</a><a href={site}>paulodetarso.adv.br <ArrowUpRight size={15} aria-hidden="true" /></a></address></div></section>
      <BarraWhatsappEmpresa alvoId="whatsapp-topo"><a href={whatsapp} className={s.botaoBarra}><WhatsAppIcon fill="currentColor" /> Falar com o escritório</a></BarraWhatsappEmpresa>
      <noscript><style>{"[data-barra-empresa]{translate:none;transform:none}"}</style></noscript>
    </article>
  );
}
