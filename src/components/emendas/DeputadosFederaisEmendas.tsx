"use client";

import { useMemo } from "react";
import Image from "next/image";
import { ExternalLink, Landmark, UserRound } from "lucide-react";
import {
  agruparEmendasPorDeputado,
  CAMARA_DADOS_ABERTOS_URL,
  CAMARA_TERMOS_USO_URL,
  type EmendaAutor,
  type GrupoDeputadoFederal,
  type ResultadoPerfisCamara,
} from "@/lib/camara-deputados";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function rotuloEmendas(quantidade: number) {
  return quantidade === 1 ? "1 emenda" : `${quantidade} emendas`;
}

/**
 * Deputados federais autores das emendas filtradas, com foto e dados oficiais da Câmara dos
 * Deputados ao lado do total destinado a Piracanjuba. Os perfis chegam prontos do servidor.
 */
export default function DeputadosFederaisEmendas({
  emendas,
  camara,
}: {
  emendas: EmendaAutor[];
  camara: ResultadoPerfisCamara;
}) {
  const { grupos, semPerfil } = useMemo(
    () => agruparEmendasPorDeputado(emendas, camara.perfis),
    [emendas, camara.perfis],
  );
  const temFederais = grupos.length > 0 || semPerfil.length > 0;

  return (
    <section aria-labelledby="deputados-federais-titulo" className="space-y-4">
      <div className="space-y-1">
        <h2 id="deputados-federais-titulo" className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Landmark className="w-5 h-5 text-primary" aria-hidden="true" />
          Deputados federais autores de emendas
        </h2>
        <p className="text-sm text-muted-foreground">
          Perfil oficial de cada deputado federal que destinou emendas a Piracanjuba, com o total nos
          filtros atuais. Partido e situação são os registrados hoje na Câmara dos Deputados e podem ser
          diferentes do partido indicado na emenda.
        </p>
        <p className="text-sm text-muted-foreground">
          A API de Dados Abertos da Câmara dos Deputados cobre somente deputados federais. Emendas de
          deputados estaduais (Assembleia Legislativa de Goiás), de senadores e de bancadas continuam
          listadas abaixo, sem perfil.
        </p>
      </div>

      {camara.status === "indisponivel" && (
        <p role="status" className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Não foi possível consultar a Câmara dos Deputados agora. As emendas continuam completas abaixo;
          os perfis voltam a aparecer quando a consulta responder.
        </p>
      )}
      {camara.status === "parcial" && (
        <p role="status" className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Parte das consultas à Câmara dos Deputados falhou agora, então alguns autores podem aparecer sem perfil.
        </p>
      )}

      {!temFederais && (
        <p className="text-sm text-muted-foreground">Nenhuma emenda de deputado federal nos filtros atuais.</p>
      )}

      {grupos.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {grupos.map((grupo) => (
            <CartaoDeputado key={grupo.perfil.id} grupo={grupo} />
          ))}
        </ul>
      )}

      {semPerfil.length > 0 && (
        <div className="stat-card space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Autores federais sem perfil associado</h3>
          <p className="text-sm text-muted-foreground">
            O nome destas emendas não foi encontrado com segurança na Câmara dos Deputados (ou a consulta
            falhou). Para não associar a pessoa errada, a página não mostra foto nem dados da Câmara.
          </p>
          <ul className="space-y-1 text-sm">
            {semPerfil.map((autor) => (
              <li key={autor.nome} className="flex flex-wrap justify-between gap-x-3">
                <span className="text-foreground">{autor.nome}</span>
                <span className="text-muted-foreground">
                  Pago: {fmtBRL(autor.totalPago)} · {rotuloEmendas(autor.quantidade)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Fotos e dados dos deputados federais: Câmara dos Deputados (
        <a href={CAMARA_DADOS_ABERTOS_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Dados Abertos da Câmara dos Deputados
        </a>
        ). Reprodução permitida com citação da fonte, conforme os{" "}
        <a href={CAMARA_TERMOS_USO_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          termos de uso do portal da Câmara
        </a>
        .{camara.consultadoEm && ` Dados consultados em ${dataBR(camara.consultadoEm)}.`}
      </p>
    </section>
  );
}

function CartaoDeputado({ grupo }: { grupo: GrupoDeputadoFederal }) {
  const { perfil } = grupo;
  const partidoUf = [perfil.partido, perfil.uf].filter(Boolean).join(" · ");
  const situacao = perfil.emExercicio
    ? "Em exercício"
    : perfil.situacao
      ? `Situação: ${perfil.situacao}`
      : "Situação não informada";
  const nomesDiferentes = grupo.nomesNaEmenda.filter((nome) => nome !== perfil.nome);

  return (
    <li className="stat-card flex gap-3" data-testid="deputado-federal">
      {perfil.urlFoto ? (
        <Image
          src={perfil.urlFoto}
          alt={`Foto oficial de ${perfil.nome}`}
          width={72}
          height={96}
          className="h-24 w-[72px] shrink-0 rounded-md bg-muted object-cover"
        />
      ) : (
        <div className="flex h-24 w-[72px] shrink-0 items-center justify-center rounded-md bg-muted" aria-hidden="true">
          <UserRound className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-semibold text-foreground leading-tight break-words">{perfil.nome}</h3>
        <p className="text-sm text-muted-foreground">
          {partidoUf ? `Partido atual: ${partidoUf}` : "Partido atual não informado"}
        </p>
        <p>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              perfil.emExercicio ? "bg-green-600/10 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"
            }`}
          >
            {situacao}
          </span>
        </p>
        {nomesDiferentes.length > 0 && (
          <p className="text-xs text-muted-foreground break-words">Na emenda: {nomesDiferentes.join("; ")}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Empenhado: <span className="text-foreground">{fmtBRL(grupo.totalEmpenhado)}</span>
          <br />
          Pago: <span className="text-foreground font-medium">{fmtBRL(grupo.totalPago)}</span>
          {" · "}
          {rotuloEmendas(grupo.quantidade)}
        </p>
        <a
          href={perfil.urlPerfil}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Perfil de {perfil.nome} na Câmara
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </div>
    </li>
  );
}
