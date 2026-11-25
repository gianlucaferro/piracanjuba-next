import type { Metadata } from "next";
import Image from "next/image";
import { Archivo } from "next/font/google";
import {
  ArrowDown, ArrowUpRight, Car, Clock, Coffee, Droplets, KeyRound, MapPin, Navigation,
  ShieldCheck, Star, Van, Warehouse,
} from "lucide-react";
import BarraWhatsappEmpresa from "@/components/empresas/BarraWhatsappEmpresa";
import InstagramIcon from "@/components/icons/InstagramIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatarTelefoneBr, linkWhatsapp } from "@/lib/whatsapp";
import s from "./pagina.module.css";

// Letreiro do DR Park: caixa larga e pesada, como a placa da fachada. A Archivo
// tem eixo de largura, então os títulos ficam expandidos sem outra família.
const letreiro = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--dp-letreiro",
});

const portal = "https://piracanjuba.ai";
const caminho = "/estacionamentoaeroporto";
const url = portal + caminho;
const imagens = "/empresas/estacionamentoaeroporto";
const nome = "DR Park Estacionamento";
const siteOficial = "https://drpark.com.br/";
const instagram = "https://www.instagram.com/drparkgo/";
// WhatsApp de reserva do site oficial e da ficha do Google (conferidos em 2026-11-25).
// A bio do Instagram anuncia o fixo (62) 3622-8931 como "novo WhatsApp": os dois ficam no contato.
const telefone = "5562998163314";
const telefoneFixo = "556236228931";
const ID_BOTAO_TOPO = "whatsapp-topo";
const whatsapp = linkWhatsapp(telefone, "Olá! Encontrei o DR Park no Piracanjuba.ai e quero reservar uma vaga para a minha viagem.");
const whatsappPrecos = linkWhatsapp(telefone, "Olá! Encontrei o DR Park no Piracanjuba.ai. Pode me passar o valor para as datas da minha viagem?");
const whatsappLavajato = linkWhatsapp(telefone, "Olá! Quero saber a disponibilidade e a tabela do lavajato do DR Park.");

// Preços publicados no site oficial (conferidos em 2026-11-25). Mudou lá, muda aqui.
const DIARIA = 30;
const ADICIONAL_6H = 10;
const ADICIONAL_12H = 15;
const real = (valor: number) => `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const estimativas = [1, 3, 5, 7, 10];

// Notas da ficha do Google Maps de cada unidade, conferidas em 2026-11-25.
const unidades = [
  {
    id: "unidade-1",
    nome: "DR Park 1",
    nomeFicha: "Estacionamento DR Park 1 - Aeroporto",
    rua: "Alameda Aeroporto, 1951, Qd. 101, Ch. 16",
    bairro: "Jardim Guanabara, Goiânia (GO)",
    cep: "74675-020",
    nota: "4,6",
    avaliacoes: 90,
    mapa: "https://maps.google.com/?cid=352245400861786974",
    geo: { latitude: -16.6257315, longitude: -49.2122924 },
    foto: { src: imagens + "/traslado-unidade-1.webp", width: 760, height: 475, alt: "Carro e van do traslado gratuito estacionados na frente da Unidade 1 do DR Park, na Alameda Aeroporto" },
  },
  {
    id: "unidade-2",
    nome: "DR Park 2",
    nomeFicha: "Estacionamento DR Park 2 - Aeroporto",
    rua: "Alameda Aeroporto, Qd. 51, Lt. 1",
    bairro: "Jardim Guanabara, Goiânia (GO)",
    cep: "74675-020",
    nota: "5,0",
    avaliacoes: 32,
    mapa: "https://maps.google.com/?cid=1407538457735645509",
    geo: { latitude: -16.6245463, longitude: -49.216837 },
    foto: { src: imagens + "/fachada-unidade-2.webp", width: 1024, height: 746, alt: "Fachada da Unidade 2 do DR Park, com cobertura metálica e o letreiro de traslado gratuito para o aeroporto" },
  },
];

const fatos = [
  { icone: Clock, texto: "Aberto 24 horas, todos os dias" },
  { icone: Van, texto: "Traslado grátis até o embarque" },
  { icone: ShieldCheck, texto: "Seguro Porto Seguro" },
  { icone: Car, texto: "No mercado desde 2018" },
];

const passos = [
  { titulo: "Reserve pelo WhatsApp", texto: "Mande as datas e os horários da ida e da volta. A equipe responde com a reserva." },
  { titulo: "Chegue ao DR Park", texto: "As duas unidades ficam na Alameda Aeroporto, em frente ao Aeroporto de Goiânia. Estacione ou deixe o carro com o manobrista." },
  { titulo: "Siga de traslado", texto: "O traslado gratuito leva você e a bagagem até o aeroporto, a qualquer hora do dia ou da noite." },
  { titulo: "Na volta, o traslado busca você", texto: "Desembarcou? Fale com a equipe e o traslado leva você de volta até o seu carro." },
];

const servicos = [
  { icone: Van, titulo: "Traslado grátis 24h", texto: "São 3 veículos só para o traslado: 2 carros e 1 van para 16 passageiros, que levam e trazem do aeroporto sem espera longa." },
  { icone: Warehouse, titulo: "Vagas cobertas", texto: "Estruturas metálicas protegem o carro do sol e da chuva, conforme a disponibilidade." },
  { icone: ShieldCheck, titulo: "Seguro Porto Seguro", texto: "O carro fica coberto por apólice da Porto Seguro, ativa da entrada no estacionamento até o desembarque no aeroporto." },
  { icone: Coffee, titulo: "Sala VIP", texto: "Recepção climatizada, com café expresso e Wi-Fi para esperar o traslado com conforto." },
  { icone: KeyRound, titulo: "Self parking ou manobrista", texto: "Estacione e leve a chave com você, ou entregue o carro aos manobristas da equipe." },
  { icone: Droplets, titulo: "Lavajato", texto: "O carro pode ser lavado enquanto você viaja. Consulte a disponibilidade e a tabela pelo WhatsApp." },
];

const depoimentos = [
  { texto: "Super confiável e ainda te levam e buscam no aeroporto, sem contar o preço justo!", autor: "Aline S.", unidade: "DR Park 1" },
  { texto: "Uma equipe incrível, 3 veículos para transporte 24h e uma recepção limpinha e cheirosa", autor: "Max C.", unidade: "DR Park 1" },
  { texto: "Pessoal muito atencioso e seguro", autor: "Andrey B.", unidade: "DR Park 2" },
];

const perguntas = [
  {
    pergunta: "Onde deixar o carro perto do Aeroporto de Goiânia?",
    resposta: "No DR Park, que tem duas unidades na Alameda Aeroporto, no Jardim Guanabara, em frente ao Aeroporto Internacional de Goiânia. O estacionamento funciona 24 horas e o traslado gratuito leva você até o embarque.",
  },
  {
    pergunta: "Quanto custa o estacionamento no DR Park?",
    resposta: `A diária começa em ${real(DIARIA)}. Passou da diária, há adicional de ${real(ADICIONAL_6H)} até 6 horas e de ${real(ADICIONAL_12H)} até 12 horas. Confirme o valor das suas datas pelo WhatsApp antes da viagem.`,
  },
  {
    pergunta: "O traslado até o aeroporto é gratuito?",
    resposta: "Sim. O traslado funciona 24 horas, leva até o aeroporto na ida e busca na volta. A frota tem 2 carros e 1 van para 16 passageiros.",
  },
  {
    pergunta: "Como faço a reserva?",
    resposta: `Pelo WhatsApp ${formatarTelefoneBr(telefone)}. Informe as datas e os horários da ida e da volta da viagem.`,
  },
  {
    pergunta: "O carro fica no seguro?",
    resposta: "Sim. O DR Park tem seguro da Porto Seguro, com apólice ativa da entrada no estacionamento até o desembarque no aeroporto.",
  },
  {
    pergunta: "Posso ficar com a chave do carro?",
    resposta: "Pode. No self parking você estaciona e leva a chave. Se preferir, os manobristas da equipe cuidam do carro.",
  },
  {
    pergunta: "Dá para lavar o carro enquanto viajo?",
    resposta: "Sim, o DR Park tem lavajato. Consulte a disponibilidade e a tabela de preços pelo WhatsApp.",
  },
  {
    pergunta: "Qual é o aeroporto de Goiânia?",
    resposta: "É o Aeroporto Internacional de Goiânia, também chamado de Santa Genoveva, de código GYN. O DR Park fica em frente a ele, na Alameda Aeroporto.",
  },
];

const titulo = "Estacionamento no Aeroporto de Goiânia 24h | DR Park";
const descricao = `DR Park, estacionamento em frente ao Aeroporto de Goiânia: aberto 24h, traslado grátis, vagas cobertas e seguro Porto Seguro. Diária a partir de ${real(DIARIA).replace(",00", "")}.`;
const compartilhamento = {
  url: portal + imagens + "/compartilhar.jpg", width: 1200, height: 630,
  alt: "Logo do DR Park e fachada do estacionamento em frente ao Aeroporto de Goiânia, com a van do traslado",
};
const base = pageMetadata({ title: titulo, description: descricao, path: caminho, image: compartilhamento.url });
export const metadata: Metadata = {
  ...base,
  title: { absolute: titulo },
  openGraph: { ...base.openGraph, images: [compartilhamento] },
  twitter: { ...base.twitter, card: "summary_large_image", images: [compartilhamento] },
};

const horario24h = {
  "@type": "OpeningHoursSpecification",
  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  opens: "00:00",
  closes: "23:59",
};

const esquema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage", "@id": url + "#pagina", url, name: titulo, description: descricao,
      inLanguage: "pt-BR", isPartOf: { "@id": portal + "/#website" },
      about: { "@id": url + "#drpark" }, breadcrumb: { "@id": url + "#navegacao" },
      primaryImageOfPage: portal + imagens + "/fachada-unidade-1.webp",
    },
    {
      "@type": "Organization", "@id": url + "#drpark", name: nome, alternateName: "DR Park Aeroporto",
      url: siteOficial, logo: portal + imagens + "/marca-quadrada.jpg", foundingDate: "2018-11",
      telephone: "+" + telefone, sameAs: [siteOficial, instagram],
      subOrganization: unidades.map((u) => ({ "@id": url + "#" + u.id })),
      makesOffer: {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Estacionamento no Aeroporto de Goiânia com traslado gratuito" },
        priceSpecification: {
          "@type": "UnitPriceSpecification", minPrice: DIARIA, priceCurrency: "BRL",
          unitText: "diária", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "DAY" },
        },
        areaServed: { "@type": "City", name: "Goiânia" },
      },
    },
    ...unidades.map((u) => ({
      "@type": ["LocalBusiness", "ParkingFacility"], "@id": url + "#" + u.id, name: u.nomeFicha,
      image: portal + u.foto.src, url, telephone: "+" + telefone, priceRange: "A partir de " + real(DIARIA) + " a diária",
      parentOrganization: { "@id": url + "#drpark" }, hasMap: u.mapa,
      address: {
        "@type": "PostalAddress", streetAddress: u.rua, addressLocality: "Goiânia", addressRegion: "GO",
        postalCode: u.cep, addressCountry: "BR",
      },
      geo: { "@type": "GeoCoordinates", ...u.geo },
      openingHoursSpecification: horario24h,
      amenityFeature: servicos.map((item) => ({ "@type": "LocationFeatureSpecification", name: item.titulo, value: true })),
    })),
    {
      "@type": "FAQPage", "@id": url + "#perguntas", url,
      mainEntity: perguntas.map((p) => ({
        "@type": "Question", name: p.pergunta, acceptedAnswer: { "@type": "Answer", text: p.resposta },
      })),
    },
    {
      ...breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Estacionamento no Aeroporto de Goiânia", path: caminho }]),
      "@id": url + "#navegacao",
    },
  ],
};

export default function EstacionamentoAeroporto() {
  return (
    <article className={letreiro.variable + " " + s.pagina}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema).replace(/</g, "\\u003c") }} />

      <header className={s.capa}>
        <div className={s.largura}>
          <div className={s.linhaGuia}>
            <span><MapPin size={14} aria-hidden="true" /> Alameda Aeroporto, Goiânia (GO)</span>
            <span><Clock size={14} aria-hidden="true" /> Aberto 24 horas</span>
          </div>
          <div className={s.capaGrade}>
            <div className={s.apresentacao}>
              <Image className={s.logo} src={imagens + "/logo.webp"} width={720} height={368} alt="DR Park" loading="eager"
                sizes="(max-width: 700px) 150px, 190px" />
              <h1>Estacionamento no Aeroporto de Goiânia com traslado grátis</h1>
              <p className={s.lide}>O DR Park fica em frente ao Aeroporto Internacional de Goiânia. Você deixa o carro em segurança e o traslado gratuito leva você até o embarque, a qualquer hora.</p>
              <div className={s.acoes}>
                <a id={ID_BOTAO_TOPO} href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Reservar pelo WhatsApp</a>
                <a href="#precos" className={s.atalho}>Ver preços <ArrowDown size={15} aria-hidden="true" /></a>
              </div>
              <ul className={s.notas} aria-label="Notas no Google">
                {unidades.map((u) => (
                  <li key={u.id}>
                    <a href={u.mapa}>
                      <Star size={15} fill="currentColor" aria-hidden="true" />
                      <strong>{u.nota}</strong> {u.nome} · {u.avaliacoes} avaliações no Google
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <figure className={s.foto}>
              <Image src={imagens + "/fachada-unidade-1.webp"} width={1280} height={927}
                alt="Fachada da Unidade 1 do DR Park, com o letreiro Estacionamento, o carro e a van do traslado na frente"
                loading="eager" fetchPriority="high" sizes="(max-width: 900px) 92vw, 560px" />
              <figcaption className={s.placa}>
                <span>Diária a partir de</span>
                <strong>{real(DIARIA)}</strong>
              </figcaption>
            </figure>
          </div>
        </div>
      </header>

      <ul className={s.faixa} aria-label="Destaques do DR Park">
        {fatos.map(({ icone: Icone, texto }) => (
          <li key={texto}><Icone size={20} strokeWidth={1.8} aria-hidden="true" /> {texto}</li>
        ))}
      </ul>

      <section id="como-funciona" aria-labelledby="titulo-como" className={s.pista}>
        <div className={s.largura}>
          <h2 id="titulo-como">Como funciona o estacionamento com traslado</h2>
          <p className={s.pistaLide}>Do portão do DR Park ao portão de embarque, em quatro passos.</p>
          <ol className={s.passos}>
            {passos.map(({ titulo: passo, texto }) => (
              <li key={passo}><h3>{passo}</h3><p>{texto}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="precos" aria-labelledby="titulo-precos" className={s.precos}>
        <div className={s.largura}>
          <div className={s.precosGrade}>
            <div>
              <h2 id="titulo-precos">Quanto custa deixar o carro no Aeroporto de Goiânia</h2>
              <p className={s.texto}>No DR Park a diária começa em {real(DIARIA)}, com traslado gratuito incluído. Se a volta passar da diária, há um adicional pelas horas a mais.</p>
              <dl className={s.tabela}>
                <div><dt>Diária</dt><dd>a partir de <strong>{real(DIARIA)}</strong></dd></div>
                <div><dt>Adicional até 6 horas</dt><dd><strong>{real(ADICIONAL_6H)}</strong></dd></div>
                <div><dt>Adicional até 12 horas</dt><dd><strong>{real(ADICIONAL_12H)}</strong></dd></div>
              </dl>
              <a href={whatsappPrecos} className={s.botaoVerde}><WhatsAppIcon fill="currentColor" /> Pedir o valor das minhas datas</a>
            </div>
            <div className={s.estimativa}>
              <h3>Estimativa pela diária mínima</h3>
              <table>
                <caption className={s.somenteLeitor}>Estimativa do valor por número de diárias, a partir de {real(DIARIA)} por dia</caption>
                <thead><tr><th scope="col">Viagem</th><th scope="col">A partir de</th></tr></thead>
                <tbody>
                  {estimativas.map((dias) => (
                    <tr key={dias}><th scope="row">{dias === 1 ? "1 dia" : `${dias} dias`}</th><td>{real(DIARIA * dias)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p>Conta feita com a diária de {real(DIARIA)}, valor publicado pelo DR Park em novembro de 2026. O valor final depende da vaga e das datas: confirme pelo WhatsApp.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="estrutura" aria-labelledby="titulo-estrutura" className={s.estrutura}>
        <div className={s.largura}>
          <div className={s.estruturaGrade}>
            <figure className={s.fotoPatio}>
              <Image src={imagens + "/vagas-cobertas.webp"} width={1400} height={934}
                alt="Pátio do DR Park com fileiras de carros estacionados sob cobertura metálica e câmera de segurança em primeiro plano"
                sizes="(max-width: 900px) 92vw, 540px" />
              <figcaption>Vagas cobertas no pátio do DR Park.</figcaption>
            </figure>
            <div>
              <h2 id="titulo-estrutura">Tudo para viajar sem preocupação</h2>
              <ul className={s.servicos}>
                {servicos.map(({ icone: Icone, titulo: servico, texto }) => (
                  <li key={servico}>
                    <Icone size={24} strokeWidth={1.6} aria-hidden="true" />
                    <div><h3>{servico}</h3><p>{texto}</p></div>
                  </li>
                ))}
              </ul>
              <a href={whatsappLavajato} className={s.linkVerde}>Consultar o lavajato pelo WhatsApp <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </section>

      <section id="unidades" aria-labelledby="titulo-unidades" className={s.unidades}>
        <div className={s.largura}>
          <h2 id="titulo-unidades">Duas unidades em frente ao aeroporto</h2>
          <p className={s.texto}>As duas ficam na mesma rua, a Alameda Aeroporto, com funcionamento 24 horas e traslado gratuito.</p>
          <div className={s.unidadesGrade}>
            {unidades.map((u) => (
              <article key={u.id} id={u.id} className={s.unidade}>
                <Image src={u.foto.src} width={u.foto.width} height={u.foto.height} alt={u.foto.alt}
                  sizes="(max-width: 800px) 92vw, 540px" />
                <div className={s.unidadeTexto}>
                  <h3>{u.nome}</h3>
                  <address>{u.rua}<br />{u.bairro} · CEP {u.cep}</address>
                  <p className={s.nota}><Star size={15} fill="currentColor" aria-hidden="true" /> {u.nota} no Google, com {u.avaliacoes} avaliações</p>
                  <a href={u.mapa} className={s.linkVerde}><Navigation size={16} aria-hidden="true" /> Abrir rota no Google Maps</a>
                </div>
              </article>
            ))}
          </div>
          <p className={s.conferencia}>Notas das fichas do Google Maps conferidas em novembro de 2026.</p>
        </div>
      </section>

      <section id="aeroporto" aria-labelledby="titulo-aeroporto" className={s.aeroporto}>
        <div className={s.largura}>
          <div className={s.aeroportoGrade}>
            <div>
              <h2 id="titulo-aeroporto">Vai voar saindo de Piracanjuba ou do interior?</h2>
              <p className={s.texto}>Quem sai de Piracanjuba ou de outra cidade do interior para voar por Goiânia precisa de um lugar seguro para o carro. No DR Park você chega pela Alameda Aeroporto, deixa o veículo coberto pelo seguro e segue de traslado até o Aeroporto Internacional de Goiânia, o Santa Genoveva (GYN).</p>
              <p className={s.texto}>Na volta, o traslado busca você no aeroporto e o carro está esperando, pronto para a estrada.</p>
            </div>
            <figure className={s.fotoAeroporto}>
              <Image src={imagens + "/aeroporto-embarque.webp"} width={1400} height={934}
                alt="Área de embarque e desembarque de veículos em frente ao terminal do Aeroporto Internacional de Goiânia"
                sizes="(max-width: 900px) 92vw, 520px" />
              <figcaption>
                Área externa do Aeroporto de Goiânia. Foto:{" "}
                <a href="https://commons.wikimedia.org/wiki/File:%C3%81rea_externa_do_Aeroporto_Santa_Genoveva,_Goi%C3%A2nia,_abril_de_2026_(2).jpg">Fronteira</a>,{" "}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br">CC BY-SA 4.0</a>, via Wikimedia Commons (recortada).
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section id="avaliacoes" aria-labelledby="titulo-avaliacoes" className={s.avaliacoes}>
        <div className={s.largura}>
          <h2 id="titulo-avaliacoes">O que dizem os clientes</h2>
          <ul className={s.depoimentos}>
            {depoimentos.map((d) => (
              <li key={d.autor}>
                <blockquote><p>{d.texto}</p></blockquote>
                <p className={s.autor}>{d.autor} <span>avaliação no Google · {d.unidade}</span></p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="perguntas" aria-labelledby="titulo-perguntas" className={s.perguntas}>
        <div className={s.largura}>
          <h2 id="titulo-perguntas">Perguntas frequentes</h2>
          <div className={s.listaPerguntas}>
            {perguntas.map(({ pergunta, resposta }) => (
              <details key={pergunta}>
                <summary>{pergunta}</summary>
                <p>{resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" aria-labelledby="titulo-contato" className={s.contato}>
        <div className={s.largura}>
          <div className={s.contatoGrade}>
            <div className={s.convite}>
              <h2 id="titulo-contato">Reserve sua vaga no DR Park</h2>
              <p>Mande as datas da viagem pelo WhatsApp e deixe o carro perto do embarque, com traslado gratuito na ida e na volta.</p>
              <a href={whatsapp} className={s.botao}><WhatsAppIcon fill="currentColor" /> Reservar pelo WhatsApp</a>
            </div>
            <div className={s.dados}>
              <div>
                <h3><WhatsAppIcon fill="currentColor" /> WhatsApp</h3>
                <a className={s.telefone} href={whatsapp}>{formatarTelefoneBr(telefone)} <ArrowUpRight size={19} aria-hidden="true" /></a>
                <a className={s.rede} href={linkWhatsapp(telefoneFixo)}>{formatarTelefoneBr(telefoneFixo)}, telefone e WhatsApp <ArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
              <div>
                <h3><MapPin size={17} aria-hidden="true" /> Endereços</h3>
                {unidades.map((u) => (
                  <p key={u.id}><strong>{u.nome}:</strong> {u.rua}, {u.bairro}</p>
                ))}
              </div>
              <div className={s.redes}>
                <a className={s.rede} href={instagram}><InstagramIcon /> @drparkgo <ArrowUpRight size={15} aria-hidden="true" /></a>
                <a className={s.rede} href={siteOficial}>drpark.com.br <ArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
            </div>
          </div>
          <p className={s.rodape}>{nome} · Estacionamento 24 horas no Aeroporto de Goiânia desde novembro de 2018</p>
        </div>
      </section>

      <BarraWhatsappEmpresa alvoId={ID_BOTAO_TOPO}>
        <a href={whatsapp} className={s.botaoBarra}><WhatsAppIcon fill="currentColor" /> Reservar pelo WhatsApp</a>
      </BarraWhatsappEmpresa>
      {/* A barra nasce escondida (sem piscar na carga) e quem está sem JavaScript a recebe por esta regra. */}
      <noscript>
        <style>{"[data-barra-empresa]{translate:none;transform:none}"}</style>
      </noscript>
    </article>
  );
}
