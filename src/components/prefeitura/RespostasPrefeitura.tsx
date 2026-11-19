import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { FONTES_PREFEITURA } from "@/lib/fontes-oficiais";
import { SCHEMA_IDS } from "@/lib/seo";
import { hrefAbaPrefeitura } from "@/lib/abas-orgaos";
import {
  cargoSemArtigo,
  competenciaEmBrasilia,
  escolherMesFechado,
  montarRespostaChefia,
  montarRespostaContratos,
  montarRespostaDespesas,
  montarRespostaSecretarias,
  montarRespostaServidores,
  pessoaExecutivoJsonLd,
  separarExecutivo,
  type PessoaExecutivo,
} from "@/lib/prefeitura-respostas";
import type { CargaPrefeitura } from "@/lib/prefeitura-ssr";

// Respostas diretas (GEO e AEO) renderizadas no servidor no topo de cada aba tratada: uma
// pergunta em H2 e um parágrafo com número, data do dado e fonte oficial nomeada. Entram no
// PrefeituraClient pela prop "respostas", dentro do TabsContent da aba, então somem quando o
// visitante troca de aba no navegador. Sem dado, a aba fica sem bloco (nada é afirmado).

const SITE_URL = "https://piracanjuba.ai";
const PAGINA_CHEFIA = `${SITE_URL}${hrefAbaPrefeitura("chefia")}`;

type Fonte = { nome: string; url: string };

function BlocoResposta({ id, titulo, texto, fontes, children }: {
  id: string;
  titulo: string;
  texto: string;
  fontes: Fonte[];
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="stat-card mb-4 space-y-2">
      <h2 id={id} className="text-lg font-semibold text-foreground">{titulo}</h2>
      <p className="text-sm leading-relaxed text-foreground">
        {texto} {fontes.length > 1 ? "Fontes" : "Fonte"}:{" "}
        {fontes.map((f, i) => (
          <Fragment key={f.url}>
            {i > 0 && (i === fontes.length - 1 ? " e " : ", ")}
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {f.nome}
            </a>
          </Fragment>
        ))}
        .
      </p>
      {children}
    </section>
  );
}

function RespostaChefia({ chefia, comLink }: { chefia: NonNullable<CargaPrefeitura["chefia"]>; comLink: boolean }) {
  const texto = montarRespostaChefia(chefia.executivo, chefia.subsidios);
  const { titular } = separarExecutivo(chefia.executivo);
  if (!texto || !titular) return null;
  const fontes: Fonte[] = [
    { nome: "página do secretariado no site oficial da Prefeitura", url: titular.fonte_url || FONTES_PREFEITURA.institucional },
  ];
  if (chefia.subsidios.length) {
    fontes.push({ nome: "folha de pagamento no Portal da Transparência", url: FONTES_PREFEITURA.folhas });
  }
  return (
    <BlocoResposta id="resposta-chefia" titulo="Quem é o prefeito de Piracanjuba?" texto={texto} fontes={fontes}>
      {comLink && (
        <p className="text-sm text-muted-foreground">
          Contatos, remuneração e financiadores de campanha na página da{" "}
          <Link href={hrefAbaPrefeitura("chefia")} className="text-primary hover:underline">
            {cargoSemArtigo(titular.tipo)} de Piracanjuba
          </Link>{" "}
          e do vice.
        </p>
      )}
    </BlocoResposta>
  );
}

/** Person da prefeita e do vice, ligados ao GovernmentOrganization da Prefeitura. */
export function PessoasExecutivoJsonLd({ executivo }: { executivo: PessoaExecutivo[] }) {
  const { titular, vice } = separarExecutivo(executivo);
  const pessoas = [titular, vice]
    .filter((p): p is PessoaExecutivo => p !== null)
    .map((p) => pessoaExecutivoJsonLd(p, {
      paginaUrl: PAGINA_CHEFIA,
      orgao: { "@id": SCHEMA_IDS.prefeitura, name: "Prefeitura Municipal de Piracanjuba", url: FONTES_PREFEITURA.institucional },
    }));
  if (!pessoas.length) return null;
  // "<" escapado: um nome vindo do banco não consegue fechar a tag <script>.
  const json = JSON.stringify(pessoas).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/** Blocos de resposta por aba, para a prop "respostas" do PrefeituraClient. */
export function respostasPrefeitura(aba: string, carga: CargaPrefeitura): Partial<Record<string, ReactNode>> {
  const respostas: Partial<Record<string, ReactNode>> = {};

  if ((aba === "visao-geral" || aba === "chefia") && carga.chefia) {
    respostas[aba] = <RespostaChefia chefia={carga.chefia} comLink={aba === "visao-geral"} />;
  }

  if (aba === "servidores") {
    const texto = montarRespostaServidores(carga.resumoFolha);
    if (texto) {
      respostas.servidores = (
        <BlocoResposta id="resposta-servidores" titulo="Quanto a Prefeitura de Piracanjuba paga aos servidores?" texto={texto}
          fontes={[{ nome: "folha de pagamento no Portal da Transparência da Prefeitura", url: FONTES_PREFEITURA.folhas }]} />
      );
    }
  }

  if (aba === "contratos" && carga.contratos) {
    const texto = montarRespostaContratos(carga.contratos.lote, carga.contratos.total);
    if (texto) {
      respostas.contratos = (
        <BlocoResposta id="resposta-contratos" titulo="Quantos contratos a Prefeitura de Piracanjuba tem?" texto={texto}
          fontes={[{ nome: "contratos no Portal da Transparência da Prefeitura", url: FONTES_PREFEITURA.contratos }]} />
      );
    }
  }

  if (aba === "despesas" && carga.despesas) {
    const mes = escolherMesFechado(carga.despesas.mensais, competenciaEmBrasilia());
    const texto = montarRespostaDespesas(mes);
    if (texto && mes) {
      respostas.despesas = (
        <BlocoResposta id="resposta-despesas" titulo="Quanto a Prefeitura de Piracanjuba gasta por mês?" texto={texto}
          fontes={[{ nome: mes.fonte_nome || "Portal da Transparência da Prefeitura", url: mes.fonte_url || FONTES_PREFEITURA.despesas }]} />
      );
    }
  }

  if (aba === "secretarias" && carga.secretarias) {
    const texto = montarRespostaSecretarias(carga.secretarias);
    if (texto) {
      respostas.secretarias = (
        <BlocoResposta id="resposta-secretarias" titulo="Quantas secretarias a Prefeitura de Piracanjuba tem?" texto={texto}
          fontes={[{ nome: "site oficial da Prefeitura", url: FONTES_PREFEITURA.institucional }]} />
      );
    }
  }

  return respostas;
}
