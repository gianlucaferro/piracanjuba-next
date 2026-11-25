import type { ReactNode } from "react";
import { Bird, ExternalLink, Leaf, ShieldAlert, Users } from "lucide-react";
import {
  CATEGORIAS_AMEACA,
  LINK_GBIF_REGISTROS,
  LINK_INATURALIST_ESPECIES,
  NOMES_CATEGORIAS,
  NOMES_GRUPOS,
  linkGbifConjunto,
  linkGbifEspecie,
  linkInaturalistTaxon,
  type Biodiversidade,
  type CategoriaAmeaca,
  type EspecieAmeacada,
  type GrupoId,
  type ResumoGbif,
  type ResumoInaturalist,
} from "@/lib/biodiversidade";
import BiodiversidadeGruposChart from "./BiodiversidadeGruposChart";

const numero = new Intl.NumberFormat("pt-BR");
const dataBrasilia = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function quantidade(valor: number, singular: string, plural: string): string {
  return `${numero.format(valor)} ${valor === 1 ? singular : plural}`;
}

function dataConsulta(iso: string): string {
  return dataBrasilia.format(new Date(iso));
}

const CATEGORIA_NO_PLURAL: Record<CategoriaAmeaca, [string, string]> = {
  CR: ["criticamente em perigo", "criticamente em perigo"],
  EN: ["em perigo", "em perigo"],
  VU: ["vulnerável", "vulneráveis"],
  NT: ["quase ameaçada", "quase ameaçadas"],
};

const COR_CATEGORIA: Record<CategoriaAmeaca, string> = {
  CR: "bg-red-600/15 text-red-700 dark:text-red-300",
  EN: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  VU: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  NT: "bg-muted text-foreground/80",
};

/** "1 vulnerável e 2 quase ameaçadas", na ordem de gravidade. */
function resumoCategorias(ameacadas: EspecieAmeacada[]): string {
  const partes = CATEGORIAS_AMEACA.flatMap((categoria) => {
    const total = ameacadas.filter((especie) => especie.categoria === categoria).length;
    if (!total) return [];
    const [singular, plural] = CATEGORIA_NO_PLURAL[categoria];
    return [quantidade(total, singular, plural)];
  });
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

function LinkExterno({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`underline-offset-4 hover:underline ${className}`}
    >
      {children}
    </a>
  );
}

function NomeEspecie({ nomePopular, nomeCientifico, href }: { nomePopular: string | null; nomeCientifico: string; href: string }) {
  return (
    <LinkExterno href={href} className="text-foreground">
      {nomePopular ? (
        <>
          <span className="font-medium">{nomePopular}</span>{" "}
          <span className="italic text-muted-foreground">({nomeCientifico})</span>
        </>
      ) : (
        <span className="font-medium italic">{nomeCientifico}</span>
      )}
    </LinkExterno>
  );
}

function Destaque({ valor, rotulo, detalhe }: { valor: number; rotulo: string; detalhe: string }) {
  return (
    <div className="stat-card">
      <p className="text-2xl font-bold tabular-nums text-foreground">{numero.format(valor)}</p>
      <p className="text-sm font-medium text-foreground">{rotulo}</p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">{detalhe}</p>
    </div>
  );
}

function Indisponivel({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function rotuloGrupo(grupo: GrupoId): string {
  return NOMES_GRUPOS[grupo];
}

function GruposGbif({ gbif }: { gbif: ResumoGbif }) {
  return (
    <div className="stat-card">
      <h3 className="text-base font-semibold text-foreground">Espécies por grande grupo</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Quantas espécies diferentes de cada grupo já foram registradas no município, segundo o GBIF.
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] md:items-start">
        <BiodiversidadeGruposChart grupos={gbif.grupos.map(({ nome, especies }) => ({ nome, especies }))} />
        <table className="w-full text-sm">
          <caption className="sr-only">Espécies e registros por grande grupo, segundo o GBIF</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="py-1.5 pr-2 font-medium">Grupo</th>
              <th scope="col" className="py-1.5 px-2 text-right font-medium">Espécies</th>
              <th scope="col" className="py-1.5 pl-2 text-right font-medium">Registros</th>
            </tr>
          </thead>
          <tbody>
            {gbif.grupos.map((grupo) => (
              <tr key={grupo.id} className="border-t border-border/60">
                <th scope="row" className="py-1.5 pr-2 text-left font-normal text-foreground">{grupo.nome}</th>
                <td className="py-1.5 px-2 text-right tabular-nums text-foreground">{numero.format(grupo.especies)}</td>
                <td className="py-1.5 pl-2 text-right tabular-nums text-muted-foreground">{numero.format(grupo.registros)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border font-medium">
              <th scope="row" className="py-1.5 pr-2 text-left text-foreground">Total</th>
              <td className="py-1.5 px-2 text-right tabular-nums text-foreground">{numero.format(gbif.especies)}</td>
              <td className="py-1.5 pl-2 text-right tabular-nums text-foreground">{numero.format(gbif.registros)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Peixes são os cordados que não são aves, anfíbios, répteis nem mamíferos, porque a taxonomia do GBIF
        não traz uma classe própria para eles. Outros grupos reúne o que não se encaixa nos anteriores, como
        moluscos, outros invertebrados e algas. Na coluna de registros entram também os identificados só até
        gênero ou família.
      </p>
    </div>
  );
}

function MaisRegistradas({ gbif }: { gbif: ResumoGbif }) {
  if (!gbif.maisRegistradas.length) return null;
  return (
    <div className="stat-card">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
        <Leaf className="h-4 w-4 text-emerald-600" aria-hidden />
        Espécies com mais registros
      </h3>
      <ol className="mt-2 space-y-2">
        {gbif.maisRegistradas.map((especie) => (
          <li key={especie.chave} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <NomeEspecie
                nomePopular={especie.nomePopular}
                nomeCientifico={especie.nomeCientifico}
                href={linkGbifEspecie(especie.chave)}
              />
              <p className="text-xs text-muted-foreground">{rotuloGrupo(especie.grupo)}</p>
            </div>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {quantidade(especie.registros, "registro", "registros")}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Ameacadas({ gbif }: { gbif: ResumoGbif }) {
  return (
    <div className="stat-card">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
        <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden />
        Espécies ameaçadas ou quase ameaçadas
      </h3>
      {gbif.ameacadas.length ? (
        <ul className="mt-2 space-y-2">
          {gbif.ameacadas.map((especie) => (
            <li key={especie.chave} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className={`mb-0.5 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${COR_CATEGORIA[especie.categoria]}`}>
                  {NOMES_CATEGORIAS[especie.categoria]}
                </span>
                <div>
                  <NomeEspecie
                    nomePopular={especie.nomePopular}
                    nomeCientifico={especie.nomeCientifico}
                    href={linkGbifEspecie(especie.chave)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{rotuloGrupo(especie.grupo)}</p>
              </div>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {quantidade(especie.registros, "registro", "registros")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum registro do município é de espécie ameaçada ou quase ameaçada na Lista Vermelha da IUCN.
        </p>
      )}
      {gbif.ameacadasParcial && (
        <p className="mt-2 text-xs text-muted-foreground">Lista parcial: há mais registros do que a consulta traz.</p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Categorias da Lista Vermelha global da IUCN, informadas pelo GBIF para cada espécie. Não equivalem à lista
        oficial brasileira de espécies ameaçadas, do Ministério do Meio Ambiente.
      </p>
    </div>
  );
}

function CartaoInaturalist({ inaturalist }: { inaturalist: ResumoInaturalist }) {
  return (
    <div className="stat-card">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
        <Users className="h-4 w-4 text-sky-600" aria-hidden />
        Mais observadas no iNaturalist
      </h3>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {quantidade(inaturalist.observacoes, "observação verificável", "observações verificáveis")} de{" "}
        {quantidade(inaturalist.especies, "espécie", "espécies")}, feitas por{" "}
        {quantidade(inaturalist.observadores, "pessoa", "pessoas")}.
      </p>
      {inaturalist.maisObservadas.length > 0 && (
        <ol className="mt-2 space-y-2">
          {inaturalist.maisObservadas.map((especie) => (
            <li key={especie.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <NomeEspecie
                  nomePopular={especie.nomePopular}
                  nomeCientifico={especie.nomeCientifico}
                  href={linkInaturalistTaxon(especie.id)}
                />
                <p className="text-xs text-muted-foreground">{rotuloGrupo(especie.grupo)}</p>
              </div>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {quantidade(especie.observacoes, "observação", "observações")}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Quem fotografa uma planta ou um animal no município pode publicar a observação no iNaturalist e ajudar a
        completar este retrato.
      </p>
    </div>
  );
}

function Creditos({ gbif, inaturalist }: Biodiversidade) {
  return (
    <div className="space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
      {gbif && (
        <div>
          <p>
            Fonte:{" "}
            <LinkExterno href="https://www.gbif.org" className="text-foreground/80 underline">
              GBIF.org
            </LinkExterno>
            , consulta em {dataConsulta(gbif.consultadoEm)} aos registros com coordenadas dentro do município
            (região GADM BRA.9.183_2), somente os publicados com licença CC0 ou CC BY 4.0. Os dados vêm de{" "}
            {quantidade(gbif.conjuntosDeDados, "conjunto de dados", "conjuntos de dados")}
            {gbif.principaisConjuntos.length ? "; os que mais contribuem são:" : "."}
          </p>
          {gbif.principaisConjuntos.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {gbif.principaisConjuntos.map((conjunto) => (
                <li key={conjunto.chave}>
                  <LinkExterno href={linkGbifConjunto(conjunto.chave)} className="text-foreground/80 underline">
                    {conjunto.titulo}
                  </LinkExterno>{" "}
                  ({quantidade(conjunto.registros, "registro", "registros")})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {inaturalist && (
        <p>
          Fonte:{" "}
          <LinkExterno href="https://www.inaturalist.org" className="text-foreground/80 underline">
            iNaturalist
          </LinkExterno>
          , consulta em {dataConsulta(inaturalist.consultadoEm)} às observações verificáveis do lugar
          {" "}Piracanjuba, GO, BR, que segue o limite do município.
        </p>
      )}
      <p>
        Nomes populares em português vêm do iNaturalist e, no GBIF, do Catálogo Taxonômico da Fauna do Brasil e de
        outras listas reunidas pelo GBIF; sem nome popular, aparece só o nome científico. As observações do
        iNaturalist com grau de pesquisa também entram no GBIF, por isso os números das duas fontes não se somam.
        Os dados são atualizados uma vez por dia.
      </p>
    </div>
  );
}

/**
 * Seção de biodiversidade da página /meio-ambiente: espécies já registradas em Piracanjuba
 * no GBIF e no iNaturalist. Só fatos agregados (contagens e nomes), sem fotos. Se uma fonte
 * estiver fora do ar, mostra a outra; sem nenhuma, fica só o aviso.
 */
export default function BiodiversidadePanel({ dados }: { dados: Biodiversidade }) {
  const { gbif, inaturalist } = dados;
  return (
    <section id="biodiversidade" aria-labelledby="biodiversidade-titulo" className="scroll-mt-24 space-y-4">
      <header>
        <h2 id="biodiversidade-titulo" className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Bird className="h-5 w-5 text-emerald-700" aria-hidden />
          Biodiversidade registrada em Piracanjuba
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Espécies já documentadas dentro do limite do município por duas bases científicas abertas: o GBIF, que
          reúne museus, herbários, órgãos ambientais e programas de observação de aves, e o iNaturalist, onde
          moradores e visitantes publicam fotos das plantas e dos animais que encontram.
        </p>
      </header>

      {!gbif && !inaturalist ? (
        <Indisponivel>
          Os dados de biodiversidade do GBIF e do iNaturalist estão indisponíveis no momento. A seção volta assim que
          as fontes responderem.
        </Indisponivel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {gbif && (
              <>
                <Destaque
                  valor={gbif.especies}
                  rotulo={gbif.especies === 1 ? "espécie identificada" : "espécies identificadas"}
                  detalhe={
                    gbif.anoInicial !== null && gbif.anoFinal !== null
                      ? `No GBIF, em registros de ${gbif.anoInicial} a ${gbif.anoFinal}`
                      : "No GBIF"
                  }
                />
                <Destaque
                  valor={gbif.registros}
                  rotulo={gbif.registros === 1 ? "registro de ocorrência" : "registros de ocorrência"}
                  detalhe={`${quantidade(gbif.observacoesCampo, "observação em campo", "observações em campo")} e ${quantidade(
                    gbif.exemplaresColecao,
                    "exemplar de museu ou herbário",
                    "exemplares de museus e herbários",
                  )}`}
                />
                <Destaque
                  valor={gbif.ameacadas.length}
                  rotulo={gbif.ameacadas.length === 1 ? "espécie ameaçada ou quase ameaçada" : "espécies ameaçadas ou quase ameaçadas"}
                  detalhe={
                    gbif.ameacadas.length
                      ? `Lista Vermelha da IUCN: ${resumoCategorias(gbif.ameacadas)}`
                      : "Nenhuma na Lista Vermelha da IUCN"
                  }
                />
              </>
            )}
            {inaturalist && (
              <Destaque
                valor={inaturalist.observacoes}
                rotulo={inaturalist.observacoes === 1 ? "observação no iNaturalist" : "observações no iNaturalist"}
                detalhe={`${quantidade(inaturalist.especies, "espécie", "espécies")}, por ${quantidade(
                  inaturalist.observadores,
                  "pessoa",
                  "pessoas",
                )}`}
              />
            )}
          </div>

          {!gbif && <Indisponivel>Os números do GBIF estão indisponíveis no momento.</Indisponivel>}
          {gbif && <GruposGbif gbif={gbif} />}

          <div className="grid gap-3 md:grid-cols-2">
            {gbif && <MaisRegistradas gbif={gbif} />}
            {gbif && <Ameacadas gbif={gbif} />}
            {inaturalist && <CartaoInaturalist inaturalist={inaturalist} />}
            {!inaturalist && <Indisponivel>Os dados do iNaturalist estão indisponíveis no momento.</Indisponivel>}
          </div>

          <div className="flex flex-wrap gap-2">
            {gbif && (
              <LinkExterno
                href={LINK_GBIF_REGISTROS}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Ver todos os registros no GBIF
              </LinkExterno>
            )}
            {inaturalist && (
              <LinkExterno
                href={LINK_INATURALIST_ESPECIES}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Ver as espécies no iNaturalist
              </LinkExterno>
            )}
          </div>

          <Creditos gbif={gbif} inaturalist={inaturalist} />
        </>
      )}
    </section>
  );
}
