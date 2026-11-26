"use client";

import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bike, Car, Loader2, Search, Truck } from "lucide-react";
import { consultarPlaca, ErroConsultaPlaca } from "@/data/placaFipeApi";
import {
  caminhoRotaFipe,
  escolherAnoDaPlaca,
  LISTA_TIPOS_FIPE,
  normalizarPlaca,
  parseRespostaOpcoesFipe,
  parseRespostaPrecoFipe,
  PLACA_VALIDA,
  TIPOS_FIPE,
  type ConsultaFipe as Consulta,
  type FipeDaPlaca,
  type OpcaoFipe,
  type TipoFipe,
} from "@/lib/fipe";

const SEIS_HORAS = 6 * 60 * 60 * 1000;
const ICONES: Record<TipoFipe, typeof Car> = { carros: Car, motos: Bike, caminhoes: Truck };
const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

class ErroConsulta extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function buscar(consulta: Consulta, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(caminhoRotaFipe(consulta), { signal });
  if (!response.ok) {
    let mensagem = "Tabela FIPE indisponível no momento.";
    try {
      const corpo = (await response.json()) as { error?: unknown };
      if (typeof corpo.error === "string" && corpo.error.length < 200) mensagem = corpo.error;
    } catch {
      // Mantém a mensagem padrão.
    }
    throw new ErroConsulta(mensagem, response.status);
  }
  return response.json();
}

function useOpcoes(consulta: Consulta | null, etapa: "marcas" | "modelos" | "anos") {
  return useQuery({
    queryKey: ["pba-fipe", consulta && caminhoRotaFipe(consulta)],
    queryFn: async ({ signal }) => parseRespostaOpcoesFipe(await buscar(consulta!, signal), etapa),
    enabled: consulta !== null,
    staleTime: SEIS_HORAS,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

function mensagemDeErro(error: unknown): string {
  return error instanceof ErroConsulta ? error.message : "Tabela FIPE indisponível no momento.";
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Campo({
  id,
  rotulo,
  children,
  carregando,
}: {
  id: string;
  rotulo: string;
  children: ReactNode;
  carregando?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {rotulo}
        {carregando && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />}
      </label>
      {children}
    </div>
  );
}

const classeSelect =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground "
  + "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function Opcoes({ opcoes }: { opcoes: OpcaoFipe[] }) {
  return (
    <>
      {opcoes.map((opcao) => (
        <option key={opcao.codigo} value={opcao.codigo}>
          {opcao.nome}
        </option>
      ))}
    </>
  );
}

export default function ConsultaFipe() {
  const ids = {
    placa: useId(),
    marca: useId(),
    filtro: useId(),
    modelo: useId(),
    ano: useId(),
  };
  const [tipo, setTipo] = useState<TipoFipe>("carros");
  const [marca, setMarca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [placa, setPlaca] = useState("");
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);
  const [avisoPlaca, setAvisoPlaca] = useState<{ texto: string; erro: boolean } | null>(null);
  // Ano-modelo vindo da placa, aplicado quando a lista de anos do modelo chegar.
  const [anoDaPlaca, setAnoDaPlaca] = useState<Pick<FipeDaPlaca, "anoModelo" | "combustivel"> | null>(null);

  const marcas = useOpcoes({ tipo, etapa: "marcas" }, "marcas");
  const modelos = useOpcoes(marca ? { tipo, etapa: "modelos", marca } : null, "modelos");
  const anos = useOpcoes(marca && modelo ? { tipo, etapa: "anos", marca, modelo } : null, "anos");
  const anoSugerido = anoDaPlaca && anos.data
    ? escolherAnoDaPlaca(anos.data, anoDaPlaca.anoModelo, anoDaPlaca.combustivel)
    : null;
  const anoEscolhido = ano || anoSugerido || "";
  const consultaPreco: Consulta | null =
    marca && modelo && anoEscolhido ? { tipo, etapa: "preco", marca, modelo, ano: anoEscolhido } : null;
  const preco = useQuery({
    queryKey: ["pba-fipe", consultaPreco && caminhoRotaFipe(consultaPreco)],
    queryFn: async ({ signal }) => parseRespostaPrecoFipe(await buscar(consultaPreco!, signal)),
    enabled: consultaPreco !== null,
    staleTime: SEIS_HORAS,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const modelosFiltrados = useMemo(() => {
    const lista = modelos.data ?? [];
    const termos = normalizar(filtro).split(/\s+/).filter(Boolean);
    if (termos.length === 0) return lista;
    return lista.filter((opcao) => {
      const nome = normalizar(opcao.nome);
      return termos.every((termo) => nome.includes(termo)) || opcao.codigo === modelo;
    });
  }, [modelos.data, filtro, modelo]);

  const escolherTipo = (novo: TipoFipe) => {
    setTipo(novo);
    setMarca("");
    setFiltro("");
    setModelo("");
    setAno("");
    setAnoDaPlaca(null);
  };

  const buscarPlaca = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!PLACA_VALIDA.test(placa) || buscandoPlaca) return;
    setBuscandoPlaca(true);
    setAvisoPlaca(null);
    try {
      const veiculo = await consultarPlaca(placa);
      const encontrado = veiculo.descricao ? `Encontramos: ${veiculo.descricao}.` : "Encontramos o veículo.";
      if (veiculo.fipe) {
        setTipo(veiculo.fipe.tipo);
        setMarca(veiculo.fipe.marca);
        setFiltro("");
        setModelo(veiculo.fipe.modelo);
        setAno("");
        setAnoDaPlaca({ anoModelo: veiculo.fipe.anoModelo, combustivel: veiculo.fipe.combustivel });
        setAvisoPlaca({ texto: `${encontrado} Confira se a versão abaixo é a do seu veículo.`, erro: false });
      } else {
        setAvisoPlaca({
          texto: `${encontrado} Não achamos a versão na tabela FIPE: escolha a marca, o modelo e o ano abaixo.`,
          erro: true,
        });
      }
    } catch (error) {
      setAvisoPlaca({
        texto: error instanceof ErroConsultaPlaca ? error.message : "A consulta por placa está indisponível agora. Escolha o veículo abaixo.",
        erro: true,
      });
    } finally {
      setBuscandoPlaca(false);
    }
  };

  const erro = marcas.error ?? modelos.error ?? anos.error ?? preco.error;
  const nomeModelo = modelos.data?.find((opcao) => opcao.codigo === modelo)?.nome;

  return (
    <div className="space-y-5">
      <form onSubmit={buscarPlaca} className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
        <label htmlFor={ids.placa} className="block text-sm font-medium text-foreground">
          Consultar pela placa
        </label>
        <div className="flex gap-2">
          <input
            id={ids.placa}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={8}
            placeholder="ABC1D23"
            aria-describedby={`${ids.placa}-ajuda`}
            className={`${classeSelect} flex-1 font-mono uppercase tracking-widest`}
            value={placa}
            onChange={(event) => setPlaca(normalizarPlaca(event.target.value))}
          />
          <button
            type="submit"
            disabled={!PLACA_VALIDA.test(placa) || buscandoPlaca}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buscandoPlaca ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
            Buscar
          </button>
        </div>
        <p id={`${ids.placa}-ajuda`} className="text-xs text-muted-foreground">
          Digite a placa (antiga ou Mercosul) para preencher a marca, o modelo e o ano.
        </p>
        <div aria-live="polite">
          {avisoPlaca && (
            <p
              role="status"
              className={`text-sm ${avisoPlaca.erro ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}
            >
              {avisoPlaca.texto}
            </p>
          )}
        </div>
      </form>

      <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">ou escolha o veículo</p>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground">Tipo de veículo</legend>
        <div className="grid grid-cols-3 gap-2">
          {LISTA_TIPOS_FIPE.map((opcao) => {
            const Icone = ICONES[opcao];
            const ativo = opcao === tipo;
            return (
              <button
                key={opcao}
                type="button"
                aria-pressed={ativo}
                onClick={() => escolherTipo(opcao)}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-sm font-medium transition-colors sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2.5 ${
                  ativo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                <Icone className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{TIPOS_FIPE[opcao].rotulo}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={ids.marca} rotulo="Marca" carregando={marcas.isFetching}>
          <select
            id={ids.marca}
            className={classeSelect}
            value={marca}
            disabled={!marcas.data}
            onChange={(event) => {
              setMarca(event.target.value);
              setFiltro("");
              setModelo("");
              setAno("");
              setAnoDaPlaca(null);
            }}
          >
            <option value="">{marcas.data ? "Escolha a marca" : "Carregando marcas..."}</option>
            {marcas.data && <Opcoes opcoes={marcas.data} />}
          </select>
        </Campo>

        <Campo id={ids.filtro} rotulo="Buscar modelo">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id={ids.filtro}
              type="search"
              inputMode="search"
              autoComplete="off"
              placeholder="Ex.: Gol 1.0, Hilux, CG 160"
              className={`${classeSelect} pl-9`}
              value={filtro}
              disabled={!modelos.data}
              onChange={(event) => setFiltro(event.target.value)}
            />
          </div>
        </Campo>

        <Campo id={ids.modelo} rotulo="Modelo" carregando={modelos.isFetching}>
          <select
            id={ids.modelo}
            className={classeSelect}
            value={modelo}
            disabled={!modelos.data}
            onChange={(event) => {
              setModelo(event.target.value);
              setAno("");
              setAnoDaPlaca(null);
            }}
          >
            <option value="">
              {!marca
                ? "Escolha a marca primeiro"
                : !modelos.data
                  ? "Carregando modelos..."
                  : `Escolha o modelo (${modelosFiltrados.length} de ${modelos.data.length})`}
            </option>
            <Opcoes opcoes={modelosFiltrados} />
          </select>
        </Campo>

        <Campo id={ids.ano} rotulo="Ano e combustível" carregando={anos.isFetching}>
          <select
            id={ids.ano}
            className={classeSelect}
            value={anoEscolhido}
            disabled={!anos.data}
            onChange={(event) => {
              setAno(event.target.value);
              setAnoDaPlaca(null);
            }}
          >
            <option value="">{!modelo ? "Escolha o modelo primeiro" : !anos.data ? "Carregando anos..." : "Escolha o ano"}</option>
            {anos.data && <Opcoes opcoes={anos.data} />}
          </select>
        </Campo>
      </div>

      {anoDaPlaca && anos.data && !anoSugerido && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
          O ano-modelo {anoDaPlaca.anoModelo === 32000 ? "zero km" : anoDaPlaca.anoModelo} da placa não aparece na lista deste
          modelo. Escolha o ano acima.
        </p>
      )}

      <div aria-live="polite">
        {erro ? (
          <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
            <p>{mensagemDeErro(erro)}</p>
            <button
              type="button"
              className="mt-1 font-medium text-primary underline underline-offset-4"
              onClick={() => {
                if (marcas.error) void marcas.refetch();
                if (modelos.error) void modelos.refetch();
                if (anos.error) void anos.refetch();
                if (preco.error) void preco.refetch();
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : preco.data ? (
          <section aria-label="Resultado da consulta FIPE" className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">Preço médio na tabela FIPE de {preco.data.mesReferencia}</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
              {reais.format(preco.data.valor)}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {preco.data.marca} {preco.data.modelo}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Ano-modelo</dt>
                <dd className="font-medium text-foreground">{preco.data.anoModelo === 32000 ? "Zero km" : preco.data.anoModelo}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Combustível</dt>
                <dd className="font-medium text-foreground">{preco.data.combustivel}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Código FIPE</dt>
                <dd className="font-medium tabular-nums text-foreground">{preco.data.codigoFipe}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Referência</dt>
                <dd className="font-medium text-foreground">{preco.data.mesReferencia}</dd>
              </div>
            </dl>
          </section>
        ) : preco.isFetching ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Consultando o preço de {nomeModelo ?? "o veículo"}...
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Digite a placa ou escolha o tipo, a marca, o modelo e o ano para ver o preço médio na tabela FIPE.
          </p>
        )}
      </div>
    </div>
  );
}
