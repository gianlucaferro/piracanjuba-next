import { ExternalLink, Fish, Landmark, Milk, Church, MapPin, Info, Sparkles, Flower2, CalendarHeart, Lightbulb, Star, Bug, Music, Flag, Clock } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import PiracanjubaNumeros from "@/components/home/PiracanjubaNumeros";
import HistoriaUpload from "@/components/historia/HistoriaUpload";
import PessoaFoto from "@/components/historia/PessoaFoto";
import FotoOpcional from "@/components/historia/FotoOpcional";

export const metadata = pageMetadata({
  title: "História de Piracanjuba GO: Capital das Orquídeas, festas e o leite",
  description:
    "A história de Piracanjuba, Goiás: a origem tupi do nome (peixe de cabeça amarela), a Festa de Agosto de Nossa Senhora d'Abadia, a Exposição Nacional de Orquídeas, o título de Capital das Orquídeas, a marca de leite que nasceu aqui e foi para Bela Vista de Goiás, e curiosidades do município.",
  path: "/historia-pba",
});

const SITE_URL = "https://piracanjuba.ai";

function Brand() {
  return (
    <>
      Piracanjuba<span className="text-[#25D366]">.ai</span>
    </>
  );
}

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "História de Piracanjuba (GO): Capital das Orquídeas, festas, fé e o leite",
  inLanguage: "pt-BR",
  url: `${SITE_URL}/historia-pba`,
  publisher: { "@type": "Organization", name: "Piracanjuba.ai", url: SITE_URL },
  about: {
    "@type": "City",
    name: "Piracanjuba",
    address: { "@type": "PostalAddress", addressLocality: "Piracanjuba", addressRegion: "GO", addressCountry: "BR" },
  },
  description:
    "Origem tupi do nome de Piracanjuba, a Festa de Agosto, a Exposição Nacional de Orquídeas e o título de Capital Goiana das Orquídeas, a marca de leite que nasceu na cidade e a religiosidade popular.",
};

// A exposição de orquídeas como Event (bom para busca e descoberta).
const eventoJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "43ª Exposição Nacional de Orquídeas de Piracanjuba",
  startDate: "2026-05-22",
  endDate: "2026-05-24",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  isAccessibleForFree: true,
  location: {
    "@type": "Place",
    name: "Palácio das Orquídeas",
    address: { "@type": "PostalAddress", addressLocality: "Piracanjuba", addressRegion: "GO", addressCountry: "BR" },
  },
  organizer: { "@type": "Organization", name: "Associação Piracanjubense de Orquidófilos (APO)" },
  description:
    "Exposição anual de orquídeas em Piracanjuba, a Capital Goiana das Orquídeas, organizada pela Associação Piracanjubense de Orquidófilos.",
};

const fontes = [
  { label: "Prefeitura de Piracanjuba: História", url: "https://piracanjuba.go.gov.br/historia/" },
  { label: "IBGE Cidades: Piracanjuba (GO)", url: "https://cidades.ibge.gov.br/brasil/go/piracanjuba" },
  { label: "Assembleia de Goiás: Piracanjuba, Capital (Goiana) das Orquídeas", url: "https://portal.al.go.leg.br/noticias/152918/agora-e-lei-piracanjuba-recebe-o-titulo-de-capital-das-orquideas-em-goias" },
  { label: "Wikipédia: Piracanjuba (peixe)", url: "https://pt.wikipedia.org/wiki/Piracanjuba_(peixe)" },
  { label: "Lei estadual nº 899/1953 (desmembramento de Mairipotaba)", url: "https://legisla.casacivil.go.gov.br/pesquisa_legislacao/90351/lei-899" },
  { label: "Laticínios Bela Vista (marca Piracanjuba)", url: "https://www.piracanjuba.com.br/sobre-nos" },
  { label: "UEG: nova espécie de pseudoescorpião (Cheiridium piracanjubae)", url: "https://www.ueg.br/noticia/62770_estudantes_da_ueg_descobrem_nova_especie_de_pseudoescorpiao" },
];

const curiosidades = [
  { t: "Como se chama quem nasce aqui?", d: "O gentílico é piracanjubense." },
  { t: "Pertinho da capital", d: "Fica a cerca de 86 km de Goiânia, perto de 1 hora de carro." },
  { t: "A padroeira", d: "Nossa Senhora d’Abadia, celebrada na tradicional Festa de Agosto." },
  { t: "O peixe que dá o nome", d: "A piracanjuba (Brycon orbignyanus) está criticamente ameaçada de extinção." },
  { t: "O leite famoso não é daqui", d: "A marca Piracanjuba leva o nome da cidade, mas a fábrica fica em Bela Vista de Goiás." },
  { t: "Capital das Orquídeas", d: "Goiás reconhece a cidade por lei como Capital Goiana das Orquídeas." },
  { t: 'A origem do "feito nas coxas"?', d: 'Conta-se que as telhas coloniais do antigo Pouso Alto, rústicas e irregulares, deram origem à expressão "feito nas coxas". É uma etimologia popular, contada na cidade.' },
  { t: "Uma espécie com o nome daqui", d: "Em 2023, a UEG batizou um pseudoescorpião novo de Cheiridium piracanjubae, achado no Parque das Orquídeas." },
  { t: "Anhanguera e a \"Meia Ponte\"", d: "Conta-se que, por volta de 1732, Anhanguera cruzou o rio da região sobre duas pranchas; na volta, achando só uma, batizou-o de Meia Ponte, nome até hoje." },
];

const pessoas = [
  {
    slug: "leo-lynce",
    nome: "Leo Lynce",
    papel: "Poeta",
    periodo: "1884 - 1954",
    bio: "Nascido em Pouso Alto (hoje Piracanjuba), Cyllenêo Marques de Araújo Valle adotou o nome literário Leo Lynce. Poeta, advogado, jornalista e juiz, é apontado como o iniciador do Modernismo na literatura goiana: seu livro Ontem (1928) é tido como marco inaugural do movimento em Goiás. Foi um dos fundadores da Academia Goiana de Letras, que presidiu em 1948 e 1949.",
  },
  {
    slug: "thelma-reston",
    nome: "Thelma Reston",
    papel: "Atriz",
    periodo: "1937 - 2012",
    bio: "Atriz de teatro, cinema e televisão, com mais de 40 filmes, 30 peças e dezenas de personagens na TV. Estreou na novela Gabriela (1975) e passou por TV Globo, Manchete e Bandeirantes. Seu tipo marcante a levou com frequência a papéis cômicos. O último trabalho foi em Aquele Beijo (2011), como a Dona Violante. Morreu em 20 de dezembro de 2012, aos 75 anos, vítima de um câncer que enfrentava desde 2009.",
  },
  {
    slug: "frankito-lopes",
    nome: "Frankito Lopes",
    papel: "Cantor",
    periodo: "1939 - 2008",
    bio: "Agílio Lopes da Silva, o Frankito Lopes, foi cantor e compositor de brega, bolero e guarânia, apelidado de Rei dos Bregueiros e Índio Apaixonado. Com sua persona indígena nos palcos, tornou-se um dos nomes mais marcantes da canção popular romântica do Centro-Oeste nos anos 1970 e 1980.",
  },
  {
    slug: "carlos-magno-de-melo",
    nome: "Carlos Magno de Melo",
    papel: "Escritor",
    periodo: "",
    bio: "Escritor, poeta e médico, com atuação literária em jornais e revistas. É autor do romance histórico Guaibimpará Caramuru, que recria a história de Diogo Álvares Correia, o Caramuru, e de Guaibimpará.",
  },
  {
    slug: "ney-teles-de-paula",
    nome: "Ney Teles de Paula",
    papel: "Desembargador",
    periodo: "n. 1949",
    bio: "Natural de Piracanjuba, ingressou na magistratura goiana em 1978 e tomou posse como desembargador do Tribunal de Justiça de Goiás em 2001. Chegou à presidência do TJGO e presidiu o Tribunal Regional Eleitoral de Goiás entre 2010 e 2011, em mais de quatro décadas de judicatura. Também é escritor e integra academias e institutos culturais, como a Academia Goiana de Letras e a Academia Piracanjubense de Letras e Artes.",
  },
  {
    slug: "sebastiao-melo",
    nome: "Sebastião Melo",
    papel: "Prefeito de Porto Alegre",
    periodo: "n. 1958",
    bio: "Advogado e político do MDB, nasceu em Piracanjuba e mudou-se para Porto Alegre em 1978, onde fez a carreira. Foi vereador da capital gaúcha por três mandatos (2001 a 2012), presidiu a Câmara Municipal duas vezes, foi vice-prefeito (2013 a 2016) e deputado estadual do Rio Grande do Sul. Elegeu-se prefeito de Porto Alegre em 2020 e foi reeleito em 2024 para um segundo mandato.",
  },
  {
    slug: "jacques-vanier",
    nome: "Jacques Vanier",
    papel: "Humorista",
    periodo: "",
    bio: "Engenheiro civil de formação, Jacques Vanier virou um dos maiores humoristas da internet brasileira com o personagem agroboy, de camiseta xadrez e chapéu. Morou nos Estados Unidos, onde começou a produzir vídeos misturando o jeitão goiano com o inglês, e estourou com o bordão 'I am bão, e ocê?', nascido de uma tentativa de pedir pamonha e pão de queijo num drive-thru. Reúne mais de 6 milhões de seguidores no Instagram e leva seu humor sobre a vida no interior também para o stand-up.",
  },
  {
    slug: "piquizinha",
    nome: "Piquizinha",
    papel: "Influenciadora",
    periodo: "",
    bio: "Luiza Cristina Rodrigues de Souza, a Piquizinha, é influenciadora digital natural de Piracanjuba e fisioterapeuta. Faz humor nas redes sociais e viralizou no país com vídeos emocionando o pai ao revelar sua aprovação e a formatura em Fisioterapia. No TikTok (@piquizinha) reúne mais de 3 milhões de seguidores.",
  },
  {
    slug: "carros-com-thiago",
    nome: "Tiago Martins",
    papel: "Criador do 'Carros com Tiago'",
    periodo: "",
    bio: "Natural de Piracanjuba, Tiago Martins é o rosto do 'Carros com Tiago' (@carroscomtiagoo), um dos maiores criadores de conteúdo automotivo do país. Publica todo dia apresentando carros, comparando preços e dando dicas para quem vai comprar. Reúne cerca de 2 milhões de seguidores no Instagram e passa de 5 milhões somando todas as redes, além de mais de 500 mil inscritos no YouTube.",
  },
];

const hino = {
  estrofes: [
    "Formosa e amada terra\nde beleza primaveril.\nExuberante vergel florido,\nsuave aurora de encantos mil.",
    "Piracanjuba cidade altaneira\nSoma progresso e altruísmo\nFlor mimosa que desabrochou\nNos campos férteis do civismo.",
    "Planalto goiano\nTerra querida\nAmor dileto\nPleno de vida.\nPiracanjuba\npara os filhos teus\nÉs mães sublime\nÉs um pedacinho\nDeste Brasil.",
    "Povo ordeiro, alegre e gentil\nFlorescente marco da história\nCidade centenária e querida\nSuntuoso monumento de glória.",
    "Canção sublime de harmonia\nQue no coração goiano encerra\nPinceladas de cores e melodias\nPoetizando as belezas desta terra.",
    "Planalto goiano\nTerra querida\nAmor dileto\nPleno de vida.\nPiracanjuba\npara os filhos teus\nÉs mães sublime\nÉs um pedacinho\nDeste Brasil.",
  ],
  letra: "Antônio Alves Magalhães",
  melodia: "Salim Miguel Tanus",
};

export default function HistoriaPBAPage() {
  return (
    <div className="container py-8 max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventoJsonLd) }} />

      <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">História <span className="text-[#25D366]">PBA</span></p>
      <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 leading-tight">
        A história de Piracanjuba
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
        Do antigo arraial de <strong className="text-foreground">Pouso Alto</strong> à terra que deu nome a um dos
        leites mais conhecidos do Brasil e que Goiás reconhece como <strong className="text-foreground">Capital das
        Orquídeas</strong>. Um retrato da cultura, da fé, das festas e das curiosidades de um município do coração de Goiás.
      </p>

      {/* Números do IBGE em tempo real */}
      <div className="mb-10">
        <PiracanjubaNumeros />
      </div>

      {/* Origem do nome */}
      <section aria-labelledby="origem" className="stat-card mb-6 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Fish className="w-5 h-5 text-amber-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="origem" className="text-xl md:text-2xl font-bold text-foreground mb-2">A origem do nome</h2>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-3">
              <strong>Piracanjuba</strong> vem do tupi e significa, em tradução corrente,
              <strong> &ldquo;peixe de cabeça amarela&rdquo;</strong>: <em>pira</em> (peixe) + <em>cã</em> (cabeça)
              + <em>juba</em> (amarelo). O nome é o mesmo de um peixe nativo, a piracanjuba
              (<em>Brycon orbignyanus</em>), que chega a 80 cm e mais de 6 kg e é um grande migrador dos
              rios da bacia do Paraná.
            </p>
            <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
              Curiosamente, esse peixe que batiza a cidade está hoje <strong>criticamente ameaçado de
              extinção</strong>, vítima de barragens, perda de matas ciliares e pesca excessiva. O nome
              carrega, assim, um lembrete da relação entre o desenvolvimento e a natureza do Cerrado.
            </p>
            <FotoOpcional
              src="/historia/peixe-piracanjuba.jpg"
              alt="Peixe que dá nome à cidade de Piracanjuba"
              legenda="O peixe que dá nome à cidade."
              className="max-w-sm"
            />
          </div>
        </div>
      </section>

      {/* De Pouso Alto a Piracanjuba */}
      <section aria-labelledby="historia" className="stat-card mb-6 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-blue-500" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="historia" className="text-xl md:text-2xl font-bold text-foreground mb-2">De Pouso Alto a Piracanjuba</h2>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-3">
              O povoado nasceu à beira da estrada que ligava São Paulo ao interior de Goiás, na esteira da mineração
              de ouro de <strong>Santa Cruz de Goiás</strong>. O nome <strong>Pouso Alto</strong> não veio de ser um
              ponto de hospedagem, como muitos pensam: era o nome da <strong>fazenda de Francisco José Pinheiro</strong>,
              que em <strong>1831</strong> mandou erguer, às suas custas, a capela (orago) em devoção a Nossa Senhora da
              Abadia. Aos poucos, o lugarejo que se formava passou a ser chamado pelo nome da fazenda.
            </p>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-3">
              A formação do núcleo urbano juntou vários fatores: as terras já ocupadas, a capela como ponto de
              referência, o aumento do fluxo de viajantes (a ocupação de Campinas a partir de 1810 e a epidemia de
              varíola em Meia Ponte, hoje Pirenópolis, em 1811 desviaram as rotas) e o fim do ouro em Santa Cruz de
              Goiás. Em <strong>22 de novembro de 1855</strong>, a lei provincial nº 21 criou o distrito de Pouso Alto,
              a partir de terras de Santa Cruz de Goiás e de Bomfim (Silvânia); na mesma data nascia a paróquia de
              <strong> Nossa Senhora da Abadia</strong>.
            </p>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
              Em <strong>1869</strong>, o lugar foi elevado a vila com o nome de Nossa Senhora da Abadia (instalada em
              1874) e, em <strong>18 de novembro de 1886</strong> (lei provincial nº 786), à categoria de cidade já com
              o nome de <strong>Piracanjuba</strong>, em referência ao peixe da região. O nome ainda foi
              e voltou: em <strong>1907</strong> a cidade tornou a se chamar Pouso Alto (lei nº 312) e só em
              <strong> 31 de dezembro de 1943</strong> voltou em definitivo a Piracanjuba (decreto-lei nº 8.305).
              Antigos distritos seus se emanciparam: <strong>Cromínia</strong> e <strong>Mairipotaba</strong> em 1953,
              e Campo Limpo (hoje Professor Jamil Sáfady) em 1991.
            </p>
          </div>
        </div>
      </section>

      {/* A bandeira */}
      <section aria-labelledby="bandeira" className="stat-card mb-6 border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5 text-red-500" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="bandeira" className="text-xl md:text-2xl font-bold text-foreground mb-2">A bandeira e o brasão</h2>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
              A bandeira de Piracanjuba tem três faixas (vermelha, branca e azul) e, ao centro, o brasão do município
              cercado por ramos. No escudo aparecem símbolos da terra: o gado e a indústria, o milho, a banana e a
              cana, e o peixe <strong>piracanjuba</strong> em vermelho; abaixo, uma cornucópia, símbolo da fartura. No
              alto, a data <strong>22 de novembro de 1855</strong>, da criação do distrito de Pouso Alto.
            </p>
            <FotoOpcional
              src="/historia/bandeira-piracanjuba.jpg"
              alt="Bandeira de Piracanjuba"
              legenda="Bandeira oficial do município de Piracanjuba."
              className="max-w-xs"
            />
          </div>
        </div>
      </section>

      {/* Capital das Orquídeas */}
      <section aria-labelledby="orquideas" className="stat-card mb-6 border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/10 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 flex items-center justify-center shrink-0">
            <Flower2 className="w-5 h-5 text-fuchsia-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-fuchsia-700 dark:text-fuchsia-400 bg-fuchsia-500/10 rounded-full px-2 py-0.5 mb-2">
              Capital Goiana das Orquídeas
            </span>
            <h2 id="orquideas" className="text-xl md:text-2xl font-bold text-foreground mb-2">A Capital das Orquídeas</h2>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-3">
              Em Goiás, Piracanjuba é oficialmente a <strong>Capital Goiana das Orquídeas</strong>, título concedido
              por <strong>lei estadual (nº 23.281)</strong>. A cidade tem forte tradição no cultivo de orquídeas e uma
              comunidade organizada na <strong>Associação Piracanjubense de Orquidófilos (APO)</strong>.
            </p>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-3">
              O ponto alto é a <strong>Exposição Nacional de Orquídeas de Piracanjuba</strong>, realizada todo mês de
              <strong> maio</strong>, ao longo de três dias, no <strong>Palácio das Orquídeas</strong>. A 43ª edição
              acontece de <strong>22 a 24 de maio de 2026</strong>, com entrada gratuita, e reúne expositores e
              visitantes de várias partes do país.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
              Pela projeção do evento, a cidade também é divulgada como &ldquo;Capital Nacional das Orquídeas&rdquo;.
              É um título de divulgação do evento: o reconhecimento oficial, por lei, é o estadual (Capital Goiana das Orquídeas).
            </p>
            <FotoOpcional
              src="/historia/orquideas-expo.jpg"
              alt="Cartaz da 43ª Exposição Nacional de Orquídeas de Piracanjuba"
              legenda="Cartaz da 43ª Exposição Nacional de Orquídeas: 22 a 24 de maio de 2026, no Palácio das Orquídeas, com entrada gratuita."
              className="max-w-xs"
            />
          </div>
        </div>
      </section>

      {/* Espécie batizada com o nome da cidade */}
      <section aria-labelledby="especie" className="stat-card mb-6 border-lime-500/20 bg-gradient-to-br from-lime-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-500/10 flex items-center justify-center shrink-0">
            <Bug className="w-5 h-5 text-lime-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="especie" className="text-xl md:text-2xl font-bold text-foreground mb-2">Uma espécie com o nome da cidade</h2>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
              Em <strong>2023</strong>, pesquisadores da <strong>Universidade Estadual de Goiás (UEG)</strong>
              descreveram uma nova espécie de pseudoescorpião, um aracnídeo de poucos milímetros, encontrada no
              <strong> Parque Natural Municipal das Orquídeas José Pinheiro de Souza</strong>, em Piracanjuba. Ela foi
              batizada de <em>Cheiridium piracanjubae</em> em homenagem à cidade, que virou, assim, nome científico de
              uma espécie nova para a ciência.
            </p>
            <FotoOpcional
              src="/historia/cheiridium-piracanjubae.jpg"
              alt="Pseudoescorpião Cheiridium piracanjubae visto ao microscópio"
              legenda="Cheiridium piracanjubae, a nova espécie descrita em Piracanjuba (imagem ampliada ao microscópio)."
              className="max-w-sm"
            />
          </div>
        </div>
      </section>

      {/* Festas e tradições */}
      <section aria-labelledby="festas" className="stat-card mb-6 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <CalendarHeart className="w-5 h-5 text-orange-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="festas" className="text-xl md:text-2xl font-bold text-foreground mb-2">Festas e tradições</h2>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-3">
              A celebração mais tradicional é a <strong>Festa de Agosto</strong>, em louvor a
              <strong> Nossa Senhora d&rsquo;Abadia</strong>, padroeira da cidade. É uma das festas religiosas mais
              antigas da região: a divulgação recente já fala em <strong>194ª edição</strong>. Reúne novenas, missas e
              procissões, e tem como marca o <strong>tradicional leilão de 14 de agosto</strong>, realizado no adro, em
              frente à igreja, que mistura fé, cultura e o encontro da comunidade.
            </p>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-3">
              A cultura popular aparece também nas <strong>congadas</strong>, com grupos como a Congada Branca
              Marinheiros e a Verde Periquito, que se apresentam no Palácio das Orquídeas. Tudo isso convive com a
              cultura sertaneja goiana: a viola, as cavalgadas e a culinária de raiz, com milho, pequi, queijos e o doce de leite.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
              Datas e números de edições seguem a divulgação local; os registros oficiais da primeira festa não foram
              localizados. Tem fotos antigas ou lembranças das festas? Ajude a completar essa memória.
            </p>
          </div>
        </div>
      </section>

      {/* Terra do leite e a marca */}
      <section aria-labelledby="economia" className="stat-card mb-6 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Milk className="w-5 h-5 text-emerald-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="economia" className="text-xl md:text-2xl font-bold text-foreground mb-2">A terra do leite (e a marca que não fica aqui)</h2>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-3">
              Piracanjuba é uma das <strong>maiores bacias leiteiras de Goiás</strong>. E aqui mora uma das
              curiosidades mais comentadas do Brasil: o nome do município batiza uma das marcas de leite mais
              conhecidas do país, a <strong>Piracanjuba</strong>, da empresa Laticínios Bela Vista. Pela própria
              empresa, a história começou <strong>na cidade de Piracanjuba</strong>, o que deu origem ao nome da marca.
              Em 2025 a marca completou <strong>70 anos</strong>, com mais de 200 produtos derivados do leite.
            </p>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-3">
              A surpresa é que a <strong>fábrica e a sede não ficam em Piracanjuba</strong>. O parque industrial está,
              entre outras cidades, em <strong>Bela Vista de Goiás</strong>, município vizinho. Conta-se na cidade que a
              empresa, nascida aqui, acabou indo embora por <strong>falta de incentivos fiscais</strong>, e foi em Bela
              Vista que cresceu e se tornou uma das maiores empregadoras da região. Hoje a Laticínios Bela Vista é uma
              das maiores indústrias de laticínios do Brasil.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
              O que é registrado: o nome da marca veio da cidade de Piracanjuba e o coração industrial hoje fica em Bela
              Vista de Goiás. A versão de que a empresa &ldquo;foi embora por falta de incentivos&rdquo; é memória
              popular, contada de geração em geração na cidade. Resultado curioso: muita gente conhece &ldquo;Piracanjuba&rdquo;
              pelo leite antes de saber que é uma cidade.
            </p>
            <FotoOpcional
              src="/historia/leite-piracanjuba.jpg"
              alt="Linha de produtos da marca de leite Piracanjuba"
              legenda="A marca Piracanjuba, que leva o nome da cidade, hoje tem mais de 200 produtos derivados do leite."
              className="max-w-sm"
            />
          </div>
        </div>
      </section>

      {/* Fé e a Menina Milagreira */}
      <section aria-labelledby="cultura" className="stat-card mb-6 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <Church className="w-5 h-5 text-purple-500" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="cultura" className="text-xl md:text-2xl font-bold text-foreground mb-2">Fé e devoção popular</h2>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-3">
              A identidade de Piracanjuba é marcada pela <strong>tradição católica</strong>, herança da antiga
              freguesia de Nossa Senhora d&rsquo;Abadia, que ainda hoje organiza o calendário da cidade em torno da fé.
            </p>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
              Um capítulo à parte é a religiosidade popular em torno de <strong>Romilda, a &ldquo;Menina
              Milagreira&rdquo;</strong>. Segundo a memória da cidade, ela foi uma criança vítima de um crime que
              chocou a comunidade, e em torno dela cresceu uma devoção espontânea, com ex-votos e relatos de graças
              alcançadas no cemitério local. É um ponto de fé popular que atravessa gerações e chegou a virar tema de
              reportagens e estudos.
            </p>
          </div>
        </div>
      </section>

      {/* Filhos ilustres */}
      <section aria-labelledby="pessoas" className="stat-card mb-6 border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-rose-500" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="pessoas" className="text-xl md:text-2xl font-bold text-foreground mb-1">Filhos ilustres</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Gente nascida em Piracanjuba que deixou marca na cultura do Brasil.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {pessoas.map((p) => (
            <div key={p.slug} className="flex gap-3 sm:gap-4 rounded-xl border border-border bg-card/60 p-3">
              <PessoaFoto slug={p.slug} nome={p.nome} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h3 className="text-base md:text-lg font-bold text-foreground">{p.nome}</h3>
                  <span className="text-xs font-medium text-rose-600 dark:text-rose-400">{p.papel}</span>
                  {p.periodo && <span className="text-xs text-muted-foreground">· {p.periodo}</span>}
                </div>
                <p className="text-sm md:text-base text-foreground/85 leading-relaxed mt-1">{p.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Você sabia? */}
      <section aria-labelledby="curiosidades" className="stat-card mb-6 border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-transparent">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-indigo-500" aria-hidden />
          </div>
          <h2 id="curiosidades" className="text-xl md:text-2xl font-bold text-foreground self-center">Você sabia?</h2>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {curiosidades.map((c) => (
            <div key={c.t} className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-base font-semibold text-foreground">{c.t}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* A Praça do Relógio */}
      <section aria-labelledby="praca" className="stat-card mb-6 border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-rose-500" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="praca" className="text-xl md:text-2xl font-bold text-foreground mb-2">A Praça do Relógio</h2>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
              A <strong>Praça Guarda-Mor Francisco José Pinheiro</strong>, conhecida por todos como
              <strong> Praça do Relógio</strong>, é o principal cartão-postal de Piracanjuba: uma torre alta com relógio
              e sino, no coração da cidade, ponto de referência e de encontro dos moradores. Repare nos peixes
              desenhados no piso da praça, uma homenagem ao nome da cidade.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-3 mt-3">
              Conta-se na cidade que a torre teria sido um presente do governo e que o terreno, no passado, teria
              abrigado um antigo cemitério. São histórias da memória local: não encontramos documento oficial que as
              confirme, e seguimos buscando os registros.
            </p>
            <FotoOpcional
              src="/historia/praca-do-relogio.jpg"
              alt="Praça do Relógio de Piracanjuba à noite, com a torre iluminada"
              legenda="A Praça do Relógio (Praça Guarda-Mor Francisco José Pinheiro), vista do alto à noite."
              className="max-w-sm"
            />
          </div>
        </div>
      </section>

      {/* Para conhecer */}
      <section aria-labelledby="turismo" className="stat-card mb-6 border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-teal-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="turismo" className="text-xl md:text-2xl font-bold text-foreground mb-2">Para conhecer</h2>
            <ul className="text-base md:text-lg text-foreground/90 leading-relaxed space-y-2 list-disc list-inside">
              <li><strong>Palácio das Orquídeas</strong>: o centro de convenções que sedia a Exposição Nacional de Orquídeas, shows, festas e apresentações de congada.</li>
              <li><strong>Lago Afonso Dias Fernandes Sobrinho</strong>: cartão-postal de lazer, indicado por visitantes para caminhadas e passeios em família.</li>
              <li><strong>Viticultura Fonte Viva</strong>: fazenda de cultivo de uvas, com vocação para o turismo rural.</li>
              <li><strong>Turismo religioso</strong>: o túmulo da Menina Milagreira e as igrejas históricas da cidade.</li>
              <li><strong>Centro e vida sertaneja</strong>: praças, comércio local e a hospitalidade do interior goiano.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Hino Municipal */}
      <section aria-labelledby="hino" className="stat-card mb-6 border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-sky-600" aria-hidden />
          </div>
          <h2 id="hino" className="text-xl md:text-2xl font-bold text-foreground">Hino Municipal</h2>
        </div>
        <div className="space-y-3 text-base md:text-lg text-foreground/90 leading-relaxed italic">
          {hino.estrofes.map((e, i) => (
            <p key={i} className="whitespace-pre-line">{e}</p>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Letra de <strong className="text-foreground/80">{hino.letra}</strong>. Melodia de{" "}
          <strong className="text-foreground/80">{hino.melodia}</strong>.
        </p>
      </section>

      {/* Contribua */}
      <section aria-labelledby="contribua" className="stat-card mb-8 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <div>
            <h2 id="contribua" className="text-lg font-semibold text-foreground mb-1.5">Conhece mais da nossa história?</h2>
            <p className="text-base text-foreground/85 leading-relaxed">
              Esta página vai crescer com a colaboração dos moradores. Tem fotos antigas da cidade, das festas ou das
              orquídeas, datas de tradições, causos ou registros históricos de Piracanjuba? Envie suas fotos abaixo, ou
              fale pelo <Brand />, e ajude a preservar a memória da cidade.
            </p>
            <HistoriaUpload />
          </div>
        </div>
      </section>

      {/* Fontes */}
      <section aria-labelledby="fontes" className="mb-8">
        <h2 id="fontes" className="text-xl md:text-2xl font-bold text-foreground mb-3">Fontes</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Conteúdo baseado em fontes públicas. Datas e fatos não documentados, bem como tradições orais, estão
          sinalizados no texto.
        </p>
        <div className="space-y-2">
          {fontes.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer"
              className="stat-card card-hover flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{f.label}</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
            </a>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0" aria-hidden />
        Página informativa e cultural, sem vínculo com órgão público.
      </p>
    </div>
  );
}
