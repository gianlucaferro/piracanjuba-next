import { useMemo } from "react";
import { BarChart3, Building2, CalendarRange, WalletCards } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import type { FunprepiDashboard } from "@/lib/funprepi";
import {
  CATEGORIAS,
  COBERTURA,
  dataBr,
  documentoBr,
  GraficoVazio,
  MESES,
  moeda,
  moedaCompacta,
  tituloCategoria,
} from "./FunprepiUi";

export function FunprepiCharts({ data }: { data: FunprepiDashboard }) {
  const isMobile = useIsMobile();
  const serieAnual = useMemo(
    () =>
      data.serie_anual.map((item) => ({
        ...item,
        anoLabel: item.ano === data.ano_atual ? `${item.ano}*` : String(item.ano),
        pago_novo_grafico: item.empenhos_novo > 0 ? item.pago_novo : null,
      })),
    [data],
  );

  const serieMensal = useMemo(
    () =>
      data.serie_mensal.map((item) => ({
        ...item,
        mesLabel: MESES[item.mes - 1] ?? String(item.mes),
      })),
    [data],
  );

  const composicao = useMemo(
    () =>
      data.composicao
        .filter((item) => Number(item.valor) > 0)
        .map((item) => ({
          ...item,
          nome: tituloCategoria(item.categoria),
          cor: CATEGORIAS[item.categoria]?.cor ?? "#64748b",
        })),
    [data],
  );

  const fornecedoresGrafico = useMemo(
    () =>
      data.fornecedores_externos.slice(0, 8).map((item) => ({
        ...item,
        nomeCurto:
          item.nome.length > (isMobile ? 15 : 31)
            ? `${item.nome.slice(0, isMobile ? 13 : 29)}…`
            : item.nome,
      })),
    [data, isMobile],
  );

  return (
    <>
      <section className="stat-card">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
              Pagamentos anuais e situação da sincronização
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Barras mostram o portal histórico. A linha mostra o que já chegou à
              base nova. O asterisco identifica exercício parcial.
            </p>
          </div>
          <Badge variant="outline">
            {dataBr(data.periodo_inicio)} a {dataBr(data.periodo_fim)}
          </Badge>
        </div>
        {serieAnual.length > 0 ? (
          <>
            <div
              className="h-80 min-w-0"
              role="img"
              aria-label="Gráfico de pagamentos anuais do FUNPREPI"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart
                  data={serieAnual}
                  margin={{ top: 8, right: 12, bottom: 4, left: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="anoLabel" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(valor) =>
                      moedaCompacta(Number(valor)).replace("R$ ", "")
                    }
                    width={54}
                  />
                  <Tooltip
                    formatter={(valor, nome) => [
                      moeda(Number(valor)),
                      nome === "pago_referencia"
                        ? "Portal histórico"
                        : "Portal novo",
                    ]}
                    labelFormatter={(label) => `Exercício ${label}`}
                  />
                  <Legend
                    formatter={(valor) =>
                      valor === "pago_referencia"
                        ? "Portal histórico"
                        : "Portal novo sincronizado"
                    }
                  />
                  <Bar
                    dataKey="pago_referencia"
                    fill="#93c5fd"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                  <Line
                    type="monotone"
                    dataKey="pago_novo_grafico"
                    stroke="#1d4ed8"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">
                  Reconciliação anual entre o portal histórico e o portal novo
                </caption>
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Ano</th>
                    <th className="px-2 py-2 font-medium">Situação</th>
                    <th className="px-2 py-2 text-right font-medium">Empenhos antigos</th>
                    <th className="px-2 py-2 text-right font-medium">Empenhos novos</th>
                    <th className="px-2 py-2 text-right font-medium">Pago histórico</th>
                    <th className="px-2 py-2 text-right font-medium">Pago novo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.serie_anual.map((item) => {
                    const status = COBERTURA[item.status];
                    return (
                      <tr key={item.ano} className="border-b border-border/60">
                        <td className="px-2 py-2.5 font-semibold text-foreground">
                          {item.ano}
                          {item.ano === data.ano_atual ? "*" : ""}
                        </td>
                        <td className="px-2 py-2.5">
                          <span
                            title={status.descricao}
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${status.classe}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right text-muted-foreground">
                          {item.empenhos_referencia.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-2.5 text-right text-muted-foreground">
                          {item.empenhos_novo.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium text-foreground">
                          {moeda(item.pago_referencia)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium text-foreground">
                          {item.empenhos_novo > 0 ? moeda(item.pago_novo) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <GraficoVazio texto="Não há série anual disponível." />
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <article className="stat-card xl:col-span-3">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <CalendarRange className="h-4 w-4 text-primary" aria-hidden />
            Pagamentos mensais em {data.ano_atual ?? "ano atual"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Composição dos registros já sincronizados no exercício corrente.
          </p>
          {serieMensal.length > 0 ? (
            <>
              <div
                className="mt-4 h-72 min-w-0"
                role="img"
                aria-label="Pagamentos mensais por categoria"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={serieMensal} margin={{ top: 8, right: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      width={52}
                      tickFormatter={(valor) =>
                        moedaCompacta(Number(valor)).replace("R$ ", "")
                      }
                    />
                    <Tooltip
                      formatter={(valor, nome) => [
                        moeda(Number(valor)),
                        tituloCategoria(String(nome)),
                      ]}
                    />
                    <Legend formatter={(valor) => tituloCategoria(valor)} />
                    {[
                      "aposentadorias",
                      "pensoes",
                      "tarifas",
                      "fornecedores_externos",
                      "outros",
                    ].map((categoria) => (
                      <Bar
                        key={categoria}
                        dataKey={categoria}
                        stackId="pagamentos"
                        fill={CATEGORIAS[categoria].cor}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {serieMensal.map((item) => (
                  <div key={item.mes} className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">
                      {MESES[item.mes - 1]}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {moedaCompacta(
                        item.aposentadorias +
                          item.pensoes +
                          item.tarifas +
                          item.fornecedores_externos +
                          item.outros,
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4">
              <GraficoVazio texto="Sem pagamentos mensais no exercício mais recente." />
            </div>
          )}
        </article>

        <article className="stat-card xl:col-span-2">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <WalletCards className="h-4 w-4 text-primary" aria-hidden />
            Composição da carga canônica
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            O próprio fundo representa folhas agregadas, não fornecedor concentrado.
          </p>
          {composicao.length > 0 ? (
            <>
              <div
                className="mt-4 h-60 min-w-0"
                role="img"
                aria-label="Composição dos pagamentos do FUNPREPI"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={composicao}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius={48}
                      outerRadius={82}
                      paddingAngle={2}
                    >
                      {composicao.map((item) => (
                        <Cell key={item.categoria} fill={item.cor} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(valor) => moeda(Number(valor))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {composicao.map((item) => (
                  <li
                    key={item.categoria}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.cor }}
                      />
                      <span className="truncate">{item.nome}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-foreground">
                      {moedaCompacta(item.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-4">
              <GraficoVazio texto="Sem composição disponível." />
            </div>
          )}
        </article>
      </section>

      <section className="stat-card">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
            Fornecedores externos
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranking exclui o próprio FUNPREPI e nunca publica CPF integral.
          </p>
        </div>
        {fornecedoresGrafico.length > 0 ? (
          <>
            <div
              className="min-w-0"
              style={{ height: Math.max(260, fornecedoresGrafico.length * 45) }}
              role="img"
              aria-label="Ranking de fornecedores externos do FUNPREPI"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={fornecedoresGrafico}
                  layout="vertical"
                  margin={{ top: 4, right: 28, bottom: 4, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(valor) =>
                      moedaCompacta(Number(valor)).replace("R$ ", "")
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="nomeCurto"
                    width={isMobile ? 112 : 210}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(valor) => moeda(Number(valor))}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.nome ?? "Fornecedor"
                    }
                  />
                  <Bar
                    dataKey="valor_pago"
                    name="Valor pago"
                    fill="#e11d48"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.fornecedores_externos.slice(0, 10).map((fornecedor, index) => (
                <article
                  key={fornecedor.chave}
                  className="rounded-xl border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {fornecedor.nome}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {documentoBr(fornecedor.documento)} · {fornecedor.empenhos} empenho
                        {fornecedor.empenhos === 1 ? "" : "s"} · {fornecedor.primeiro_ano} a{" "}
                        {fornecedor.ultimo_ano}
                      </p>
                      <p className="mt-1 text-sm font-bold text-rose-700">
                        {moeda(fornecedor.valor_pago)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <GraficoVazio texto="Nenhum fornecedor externo identificado na carga disponível." />
        )}
      </section>
    </>
  );
}
