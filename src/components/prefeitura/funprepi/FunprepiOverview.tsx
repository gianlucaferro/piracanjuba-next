import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  CircleDollarSign,
  Database,
  Landmark,
  Loader2,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  calcularVariacaoPercentual,
  FUNPREPI_PORTAL_URL,
  FUNPREPI_TCM_URL,
  type FunprepiDashboard,
} from "@/lib/funprepi";
import {
  dataBr,
  FonteLink,
  Kpi,
  moedaCompacta,
} from "./FunprepiUi";

export function FunprepiOverview({
  data,
  isFetching,
}: {
  data: FunprepiDashboard;
  isFetching: boolean;
}) {
  const totalReferencia = data.serie_anual.reduce(
    (soma, item) => soma + Number(item.pago_referencia || 0),
    0,
  );
  const reconciliados = data.serie_anual.filter(
    (item) => item.status === "reconciliado",
  ).length;
  const variacao = calcularVariacaoPercentual(
    data.resumo.pago_periodo_atual,
    data.resumo.pago_periodo_anterior,
  );
  const variacaoPositiva = variacao !== null && variacao >= 0;
  const VariacaoIcon = variacaoPositiva ? TrendingUp : TrendingDown;

  return (
    <>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-xl font-bold text-foreground">
              FUNPREPI, previdência dos servidores municipais
            </h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Painel do Fundo de Previdência Social de Piracanjuba. Separa benefícios
            pagos, despesas administrativas, déficit atuarial e a dívida da Prefeitura,
            porque esses valores possuem significados diferentes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Órgão 44</Badge>
          <Badge variant="outline">
            Atualizado em {dataBr(data.atualizado_em)}
          </Badge>
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.3fr_0.7fr] lg:p-6">
          <div>
            <div className="flex items-center gap-2 text-amber-700">
              <ShieldAlert className="h-5 w-5" aria-hidden />
              <p className="text-sm font-semibold uppercase tracking-wide">
                Dívida da Prefeitura com o FUNPREPI
              </p>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
              Saldo atual não publicado em fonte oficial
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              O TCM-GO confirmou que o Município discutia aportes periódicos,
              contribuição suplementar e plano de amortização para cobrir déficit
              atuarial. O acórdão não informa o saldo atual da dívida, por isso este
              painel não estima nem reproduz valores sem documento e data-base.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <FonteLink href={FUNPREPI_TCM_URL}>
                Ler o Acórdão Consulta 15/2019
              </FonteLink>
              <FonteLink href={FUNPREPI_PORTAL_URL}>
                Consultar o portal atual
              </FonteLink>
            </div>
          </div>
          <aside className="rounded-xl border border-amber-500/20 bg-background/70 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              O que já é possível afirmar
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                Existe confirmação documental de déficit atuarial.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                O Município consultou o TCM-GO sobre formas de amortização.
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                Falta avaliação recente com saldo, data-base e cronograma.
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <section
        aria-label="Indicadores principais do FUNPREPI"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Kpi
          titulo="Série histórica oficial"
          valor={moedaCompacta(totalReferencia)}
          detalhe="Valores pagos publicados no portal histórico, de 2011 a jun/2026."
          icon={CircleDollarSign}
          destaque="blue"
        />
        <Kpi
          titulo="Carga nova sincronizada"
          valor={moedaCompacta(data.resumo.pago)}
          detalhe={`${data.resumo.empenhos.toLocaleString("pt-BR")} empenhos do órgão 44 já carregados.`}
          icon={Database}
          destaque="slate"
        />
        <Kpi
          titulo={`Pago em ${data.ano_atual ?? "ano atual"}`}
          valor={moedaCompacta(data.resumo.pago_periodo_atual)}
          detalhe={
            variacao === null
              ? "Sem base suficiente para comparar o mesmo período."
              : `${variacao >= 0 ? "+" : ""}${variacao.toLocaleString("pt-BR", {
                  maximumFractionDigits: 2,
                })}% contra o mesmo período do ano anterior.`
          }
          icon={VariacaoIcon}
          destaque={variacaoPositiva ? "amber" : "emerald"}
        />
        <Kpi
          titulo="Exercícios reconciliados"
          valor={`${reconciliados} de ${data.serie_anual.length}`}
          detalhe="Quantidade de empenhos e valor pago conferem entre as duas fontes."
          icon={BookOpenCheck}
          destaque="emerald"
        />
      </section>
    </>
  );
}
