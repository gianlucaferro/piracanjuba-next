import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import {
  AVISO_VALIDADE_COLETA,
  FONTE_COLETA,
  FONTE_COLETA_MEIO_DE_FRASE,
  HORARIO_COLETA,
  faqColetaJsonLd,
  perguntasColeta,
  respostaColeta,
  tabelaColeta,
} from "@/data/coletaLixo";
import { FONTES_TELEFONES } from "@/data/telefones";
import ColetaLixoClient from "./ColetaLixoClient";

export const metadata = pageMetadata({
  title: "Coleta de Lixo em Piracanjuba GO",
  description:
    "Dias e horários da coleta de lixo comum e seletiva por bairro em Piracanjuba, Goiás. Saiba quando colocar o lixo na rua e qual saco usar.",
  path: "/coleta-lixo",
});

const URL_PAGINA = "https://piracanjuba.ai/coleta-lixo";

// Tudo abaixo sai de src/data/coletaLixo.ts no servidor: a tabela, o parágrafo-resposta e o
// FAQ ficam no HTML inicial (o buscador por bairro continua no cliente). O JSON-LD usa o
// mesmo array de perguntas do texto visível.
const linhas = tabelaColeta();
const resposta = respostaColeta(linhas);
const perguntas = perguntasColeta(linhas);
const schemas = [
  faqColetaJsonLd(perguntas, URL_PAGINA),
  breadcrumbJsonLd([
    { name: "Início", path: "/" },
    { name: "Coleta de lixo", path: "/coleta-lixo" },
  ]),
];

export default function ColetaLixoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }}
      />
      <div className="container max-w-2xl py-6 space-y-6">
        <header className="text-center space-y-3 pb-2">
          <div className="inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800 rounded-full px-3 py-1 text-sm font-medium text-green-800 dark:text-green-300">
            🗑️ {FONTE_COLETA}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Coleta de lixo em Piracanjuba: quando colocar o lixo na rua?
          </h1>
          <p className="text-base text-foreground leading-relaxed text-left">{resposta}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Digite seu bairro abaixo para ver a próxima coleta, o saco certo e criar um lembrete no celular.
          </p>
        </header>

        <ColetaLixoClient />

        <section aria-labelledby="tabela-coleta" className="space-y-3">
          <h2 id="tabela-coleta" className="text-xl font-semibold text-foreground">
            Dias da coleta de lixo por bairro em Piracanjuba
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {FONTE_COLETA}. {AVISO_VALIDADE_COLETA} {HORARIO_COLETA}
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Dias da coleta de lixo comum e da coleta seletiva em cada bairro de Piracanjuba ({FONTE_COLETA_MEIO_DE_FRASE})
              </caption>
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold text-foreground">Bairro</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-foreground">Coleta comum (saco preto)</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-foreground">Coleta seletiva (saco branco, azul ou verde)</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <tr key={linha.bairro} className="border-t border-border/60 align-top">
                    <th scope="row" className="px-3 py-2 text-left font-medium text-foreground">{linha.bairro}</th>
                    <td className="px-3 py-2 text-foreground">{linha.comumTexto}</td>
                    <td className={`px-3 py-2 ${linha.seletiva.length ? "text-foreground" : "text-muted-foreground"}`}>
                      {linha.seletivaTexto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="perguntas-coleta" className="space-y-4">
          <h2 id="perguntas-coleta" className="text-xl font-semibold text-foreground">
            Perguntas frequentes sobre a coleta de lixo
          </h2>
          {perguntas.map((item) => (
            <div key={item.pergunta} className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">{item.pergunta}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.resposta}</p>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">
            Canais oficiais da Prefeitura:{" "}
            <a
              href={FONTES_TELEFONES.sitePrefeitura.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Fale conosco no site da Prefeitura de Piracanjuba
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}
