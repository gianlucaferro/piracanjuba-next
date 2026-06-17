import { ExternalLink, Fish, Landmark, Milk, Church, MapPin, Info, Sparkles } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import PiracanjubaNumeros from "@/components/home/PiracanjubaNumeros";

export const metadata = pageMetadata({
  title: "História de Piracanjuba GO: origem do nome, cultura e tradições",
  description:
    "A história de Piracanjuba, Goiás: a origem tupi do nome (peixe de cabeça amarela), de Pouso Alto à cidade, a tradição leiteira que batiza uma marca nacional, a cultura, a fé e os pontos turísticos do município.",
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
  headline: "História de Piracanjuba (GO): origem do nome, cultura e tradições",
  inLanguage: "pt-BR",
  url: `${SITE_URL}/historia-pba`,
  publisher: {
    "@type": "Organization",
    name: "Piracanjuba.ai",
    url: SITE_URL,
  },
  about: {
    "@type": "City",
    name: "Piracanjuba",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Piracanjuba",
      addressRegion: "GO",
      addressCountry: "BR",
    },
  },
  description:
    "Origem tupi do nome de Piracanjuba (peixe de cabeça amarela), a passagem de Pouso Alto a município, a vocação leiteira, a cultura, a religiosidade e os pontos turísticos.",
};

const fontes = [
  { label: "Prefeitura de Piracanjuba: História", url: "https://piracanjuba.go.gov.br/historia/" },
  { label: "IBGE Cidades: Piracanjuba (GO)", url: "https://cidades.ibge.gov.br/brasil/go/piracanjuba" },
  { label: "Wikipédia: Piracanjuba (peixe)", url: "https://pt.wikipedia.org/wiki/Piracanjuba_(peixe)" },
  { label: "Lei estadual nº 899/1953 (desmembramento de Mairipotaba)", url: "https://legisla.casacivil.go.gov.br/pesquisa_legislacao/90351/lei-899" },
  { label: "Laticínios Bela Vista (marca Piracanjuba)", url: "https://www.piracanjuba.com.br/sobre-nos" },
];

export default function HistoriaPBAPage() {
  return (
    <div className="container py-8 max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">História PBA</p>
      <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 leading-tight">
        A história de Piracanjuba
      </h1>
      <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
        Do antigo arraial de <strong className="text-foreground">Pouso Alto</strong> ao nome de origem
        indígena que virou marca de leite conhecida no Brasil inteiro. Um retrato da cultura, da fé e da
        vocação de um município do coração de Goiás.
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
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed mb-3">
              <strong>Piracanjuba</strong> vem do tupi e significa, em tradução corrente,
              <strong> &ldquo;peixe de cabeça amarela&rdquo;</strong>: <em>pira</em> (peixe) + <em>cã</em> (cabeça)
              + <em>juba</em> (amarelo). O nome é o mesmo de um peixe nativo, a piracanjuba
              (<em>Brycon orbignyanus</em>), que chega a 80 cm e mais de 6 kg e é um grande migrador dos
              rios da bacia do Paraná.
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
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
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed mb-3">
              O povoado nasceu com o nome de <strong>Pouso Alto</strong>. Em <strong>22 de novembro de 1855</strong>,
              a lei provincial nº 21 criou oficialmente o distrito, formado a partir de terras dos antigos
              distritos de <strong>Santa Cruz de Goiás</strong> e <strong>Bomfim</strong>. No mesmo período surgiu a
              freguesia católica de <strong>Nossa Senhora d&rsquo;Abadia de Pouso Alto</strong>, que organizou a vida
              religiosa e social da comunidade.
            </p>
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed mb-3">
              Com o tempo, o arraial passou a se chamar <strong>Piracanjuba</strong>, em referência ao peixe da
              região. Em <strong>1953</strong>, já como município consolidado, Piracanjuba teve o distrito de
              <strong> Mairipotaba</strong> desmembrado de seu território (lei estadual nº 899), que se tornou
              município autônomo.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
              Nota de transparência: as datas exatas da troca de nome (Pouso Alto → Piracanjuba) e da
              elevação a município não foram localizadas em fontes oficiais consultadas. Mantemos aqui
              apenas o que é documentado e seguimos buscando os registros para completar essa parte.
            </p>
          </div>
        </div>
      </section>

      {/* Terra do leite */}
      <section aria-labelledby="economia" className="stat-card mb-6 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Milk className="w-5 h-5 text-emerald-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="economia" className="text-xl md:text-2xl font-bold text-foreground mb-2">Terra do leite e do agro</h2>
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed mb-3">
              Piracanjuba é uma das <strong>maiores bacias leiteiras de Goiás</strong>, ao lado de cidades como
              Orizona e Bela Vista de Goiás. Não à toa, o nome do município batiza uma das marcas de leite mais
              conhecidas do país: a <strong>Piracanjuba</strong>, da Laticínios Bela Vista, nascida em Goiás em
              <strong> 1955</strong>. Em 2025 a marca completou <strong>70 anos</strong>, com mais de 200 produtos
              derivados do leite.
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Além do leite, a economia se apoia no <strong>agronegócio</strong>: criação de gado e lavouras de
              grãos típicas do Cerrado goiano, como soja e milho, que também alimentam a pecuária.
            </p>
          </div>
        </div>
      </section>

      {/* Cultura e fé */}
      <section aria-labelledby="cultura" className="stat-card mb-6 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <Church className="w-5 h-5 text-purple-500" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="cultura" className="text-xl md:text-2xl font-bold text-foreground mb-2">Cultura, fé e tradição</h2>
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed mb-3">
              A identidade de Piracanjuba é marcada pela <strong>tradição católica</strong>, herança da antiga
              freguesia de Nossa Senhora d&rsquo;Abadia, e pela <strong>cultura sertaneja goiana</strong>: a viola, as
              cavalgadas e uma culinária de raiz, com milho, pequi, queijos e o doce de leite.
            </p>
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed mb-3">
              Um capítulo à parte é a religiosidade popular em torno do túmulo de <strong>Romilda, a &ldquo;Menina
              Milagreira&rdquo;</strong>, no cemitério da cidade: um ponto de fé que reúne devotos, ex-votos e
              relatos de graças alcançadas, a ponto de virar objeto de estudos de antropologia.
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Como em boa parte do interior de Goiás, o calendário social gira em torno de festas religiosas do
              padroeiro, cavalgadas e exposições agropecuárias, que reúnem a cidade e a zona rural.
            </p>
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
            <ul className="text-sm md:text-base text-foreground/90 leading-relaxed space-y-2 list-disc list-inside">
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
            <p className="text-sm text-foreground/85 leading-relaxed">
              Esta página vai crescer com a colaboração dos moradores. Tem fotos antigas, datas de festas
              tradicionais, causos ou registros históricos de Piracanjuba? Compartilhe pelo{" "}
              <Brand />, e ajude a preservar a memória da cidade.
            </p>
          </div>
        </div>
      </section>

      {/* Fontes */}
      <section aria-labelledby="fontes" className="mb-8">
        <h2 id="fontes" className="text-xl md:text-2xl font-bold text-foreground mb-3">Fontes</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Conteúdo baseado em fontes públicas. Datas e fatos não documentados estão sinalizados no texto.
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
