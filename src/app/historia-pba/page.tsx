import { ExternalLink, Fish, Landmark, Milk, Church, MapPin, Info, Sparkles, Flower2, CalendarHeart, Lightbulb, Star } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import PiracanjubaNumeros from "@/components/home/PiracanjubaNumeros";
import HistoriaUpload from "@/components/historia/HistoriaUpload";
import PessoaFoto from "@/components/historia/PessoaFoto";

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
];

const curiosidades = [
  { t: "Como se chama quem nasce aqui?", d: "O gentílico é piracanjubense." },
  { t: "Pertinho da capital", d: "Fica a cerca de 86 km de Goiânia, perto de 1 hora de carro." },
  { t: "A padroeira", d: "Nossa Senhora d’Abadia, celebrada na tradicional Festa de Agosto." },
  { t: "O peixe que dá o nome", d: "A piracanjuba (Brycon orbignyanus) está criticamente ameaçada de extinção." },
  { t: "O leite famoso não é daqui", d: "A marca Piracanjuba leva o nome da cidade, mas a fábrica fica em Bela Vista de Goiás." },
  { t: "Capital das Orquídeas", d: "Goiás reconhece a cidade por lei como Capital Goiana das Orquídeas." },
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
    slug: "jacques-vanier",
    nome: "Jacques Vanier",
    papel: "Humorista",
    periodo: "",
    bio: "Lembrado entre os filhos ilustres de Piracanjuba pela veia humorística. Estamos reunindo mais detalhes da sua trajetória: se você conhece a história dele ou tem fotos, ajude a completar pela seção de contribuição.",
  },
];

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
              O povoado nasceu com o nome de <strong>Pouso Alto</strong>. Em <strong>22 de novembro de 1855</strong>,
              a lei provincial nº 21 criou oficialmente o distrito, formado a partir de terras dos antigos
              distritos de <strong>Santa Cruz de Goiás</strong> e <strong>Bomfim</strong>. No mesmo período surgiu a
              freguesia católica de <strong>Nossa Senhora d&rsquo;Abadia de Pouso Alto</strong>, que organizou a vida
              religiosa e social da comunidade.
            </p>
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-3">
              Com o tempo, o arraial passou a se chamar <strong>Piracanjuba</strong>, em referência ao peixe da
              região. Em <strong>1953</strong>, já como município consolidado, Piracanjuba teve o distrito de
              <strong> Mairipotaba</strong> desmembrado de seu território (lei estadual nº 899), que se tornou
              município autônomo.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
              Nota de transparência: as datas exatas da troca de nome (Pouso Alto para Piracanjuba) e da
              elevação a município não foram localizadas em fontes oficiais consultadas. Mantemos aqui
              apenas o que é documentado e seguimos buscando os registros para completar essa parte.
            </p>
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
