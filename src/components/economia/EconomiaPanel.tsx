"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
  LineChart,
  Line,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wheat,
  Factory,
  Store,
  Briefcase,
  Building2,
  Users,
  ExternalLink,
  Trophy,
  CloudRain,
} from "lucide-react";

type PibCidade = {
  ibge: number;
  nome: string;
  destaque?: boolean;
  pib_total_mil: number;
  pib_total_texto: string;
  pib_per_capita: number;
  pib_per_capita_texto: string;
};

type CompCidade = { setor: string; valor_mil: number; pct_texto: string };
type CagedAno = { ano: number; saldo: number; valor_texto: string };
type Salario = { setor: string; sm: number; texto: string };
type EmpresasMEIs = {
  empresas: { valor: number | null; texto: string | null; observacao: string | null; ano: number | null } | null;
  meis: { valor: number | null; texto: string | null; observacao: string | null; ano: number | null } | null;
};

type TopEmpregador = {
  nome: string;
  funcionarios: number | null;
  texto: string | null;
  cnae: string | null;
  fonte: string | null;
  fonte_url: string | null;
};

type TopOcupacao = {
  ocupacao: string;
  setor: string | null;
  empregos: number | null;
  texto: string | null;
  observacao: string | null;
};

type CagedSetor = {
  setor: string;
  admissoes: number;
  desligamentos: number;
  saldo: number;
  observacao: string | null | undefined;
};

type Props = {
  pibComparativo: PibCidade[];
  composicaoSetorial: CompCidade[];
  cagedSerie: CagedAno[];
  salariosPorSetor: Salario[];
  empresasMEIs: EmpresasMEIs;
  /** Cruzamento safra × empregos: chuva mensal ano corrente vs saldo CAGED setor agro */
  chuvaMensal: Record<number, number>;
  pibMediaGoias: number;
  topEmpregadores: TopEmpregador[];
  topOcupacoes: TopOcupacao[];
  cagedPorSetor: CagedSetor[];
};

const SETOR_ICON: Record<string, typeof Wheat> = {
  agropecuaria: Wheat,
  industria: Factory,
  servicos: Briefcase,
  comercio: Store,
};

const SETOR_LABEL: Record<string, string> = {
  agropecuaria: "Agropecuária",
  industria: "Indústria",
  servicos: "Serviços",
  comercio: "Comércio",
};

const SETOR_CORES: Record<string, string> = {
  agropecuaria: "#16a34a",
  industria: "#7c3aed",
  servicos: "#0ea5e9",
  comercio: "#f59e0b",
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmtMilhoes(milReais: number) {
  if (milReais >= 1000000) return `R$ ${(milReais / 1000000).toFixed(2)} bi`;
  if (milReais >= 1000) return `R$ ${(milReais / 1000).toFixed(0)} mi`;
  return `R$ ${milReais.toFixed(0)} mil`;
}

export default function EconomiaPanel({
  pibComparativo,
  composicaoSetorial,
  cagedSerie,
  salariosPorSetor,
  empresasMEIs,
  chuvaMensal,
  pibMediaGoias,
  topEmpregadores,
  topOcupacoes,
  cagedPorSetor,
}: Props) {
  const piracanjuba = pibComparativo.find((c) => c.destaque);

  // Comparativo PIB pc — ordenado desc
  const pibPCSorted = [...pibComparativo].sort((a, b) => b.pib_per_capita - a.pib_per_capita);
  const posPiracanjuba = pibPCSorted.findIndex((c) => c.destaque) + 1;

  // Composicao setorial pra pie chart
  const compTotal = composicaoSetorial.reduce((s, c) => s + c.valor_mil, 0);
  const pieData = composicaoSetorial.map((c) => ({
    name: SETOR_LABEL[c.setor],
    value: c.valor_mil,
    pct: compTotal > 0 ? (c.valor_mil / compTotal) * 100 : 0,
    cor: SETOR_CORES[c.setor],
  }));

  // Cruzamento Safra × Empregos: chuva mensal × estimativa CAGED agro
  const chuvaTotal = Object.values(chuvaMensal).reduce((s, v) => s + (v || 0), 0);
  const cagedAtual = cagedSerie.at(-1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          Economia Local — Piracanjuba {piracanjuba?.pib_per_capita_texto && `· ${piracanjuba.pib_per_capita_texto}/hab`}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          PIB municipal e comparativo regional, composição setorial, dinâmica de empregos
          (CAGED), salários por setor (RAIS), empresas ativas e MEIs. Atualização mensal
          via cron <code className="text-[10px] bg-muted px-1 rounded">sync-economia-mensal</code>.
        </p>
      </header>

      {/* PAINEL 1: PIB Comparativo Vizinhos */}
      <section className="stat-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground">
              PIB · Piracanjuba × Vizinhos · 2021
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Comparativo do PIB total e per capita. Piracanjuba está em{" "}
              <strong className="text-foreground">#{posPiracanjuba} de {pibComparativo.length}</strong>{" "}
              em PIB per capita entre os vizinhos diretos. Média Goiás:{" "}
              <strong>R$ {pibMediaGoias.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</strong>/hab.
            </p>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pibPCSorted}
              layout="vertical"
              margin={{ top: 8, right: 50, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={140} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, "PIB per capita"]}
              />
              <Bar dataKey="pib_per_capita" radius={[0, 4, 4, 0]}>
                {pibPCSorted.map((c) => (
                  <Cell
                    key={c.ibge}
                    fill={c.destaque ? "hsl(142, 76%, 36%)" : "hsl(215, 20%, 60%)"}
                  />
                ))}
                <LabelList
                  dataKey="pib_per_capita_texto"
                  position="right"
                  style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
          {pibPCSorted.map((c) => (
            <div
              key={c.ibge}
              className={`stat-card text-center ${
                c.destaque ? "border-emerald-500/40 bg-emerald-500/5" : ""
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.nome}</p>
              <p className="text-base font-bold text-foreground mt-0.5">{c.pib_total_texto}</p>
              <p className="text-[10px] text-muted-foreground">{c.pib_per_capita_texto}/hab</p>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 italic">
          Fonte:{" "}
          <a
            href="https://goias.gov.br/imb/wp-content/uploads/sites/29/2024/01/Boletim_012_2023_produto_interno_bruto_dos_municipios_goianos_consolidado_2021.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            IMB-GO Boletim 012/2023 · IBGE Contas Regionais 2021 <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
      </section>

      {/* PAINEL 2: Composição setorial */}
      {composicaoSetorial.length > 0 && (
        <section className="stat-card border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Wheat className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Composição Setorial do PIB · 2021
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Piracanjuba é{" "}
                <strong>polo agropecuário</strong> — quase 54% do Valor Adicionado Bruto
                vem do agro. Bem acima da média de Goiás (~10% agro estadual).
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [
                      `${fmtMilhoes(v)} (${((v / compTotal) * 100).toFixed(1)}%)`,
                      "VAB",
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 self-center">
              {pieData.map((d) => {
                const Icon = d.name === "Agropecuária" ? Wheat : d.name === "Indústria" ? Factory : Briefcase;
                return (
                  <div key={d.name} className="stat-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" style={{ color: d.cor }} />
                      <span className="text-sm font-semibold text-foreground">{d.name}</span>
                    </div>
                    <p className="text-2xl font-extrabold" style={{ color: d.cor }}>
                      {d.pct.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      VAB: {fmtMilhoes(d.value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* PAINEL 3: CAGED histórico */}
      {cagedSerie.length > 0 && (
        <section className="stat-card border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                CAGED · Saldo de Empregos Formais
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Saldo líquido (admissões − desligamentos) por ano. Indicador-chave
                da dinâmica do mercado de trabalho local.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {cagedSerie.map((c) => (
              <div
                key={c.ano}
                className={`stat-card ${
                  c.saldo > 0
                    ? "border-green-500/30 bg-green-500/5"
                    : c.saldo < 0
                    ? "border-red-500/30 bg-red-500/5"
                    : ""
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.ano}
                </p>
                <p
                  className={`text-2xl font-extrabold mt-0.5 ${
                    c.saldo > 0
                      ? "text-green-600"
                      : c.saldo < 0
                      ? "text-red-600"
                      : "text-foreground"
                  }`}
                >
                  {c.saldo > 0 ? "+" : ""}
                  {c.saldo}
                </p>
                <p className="text-[10px] text-muted-foreground">empregos líquidos</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Fonte: Novo CAGED — Ministério do Trabalho (Power BI público).
          </p>
        </section>
      )}

      {/* PAINEL 4: Salarios por setor */}
      {salariosPorSetor.length > 0 && (
        <section className="stat-card border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Salário Médio por Setor · RAIS 2023
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Remuneração mensal média formal em salários mínimos (SM = R$ 1.412 em 2024).
              </p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salariosPorSetor}
                layout="vertical"
                margin={{ top: 8, right: 60, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, "dataMax + 0.5"]} />
                <YAxis
                  type="category"
                  dataKey="setor"
                  tick={{ fontSize: 11 }}
                  width={110}
                  tickFormatter={(s: string) => SETOR_LABEL[s] || s}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, _name: string) => [`${v.toFixed(1)} SM`, "Salário médio"]}
                  labelFormatter={(l: string) => SETOR_LABEL[l] || l}
                />
                <Bar dataKey="sm" radius={[0, 4, 4, 0]}>
                  {salariosPorSetor.map((s) => (
                    <Cell key={s.setor} fill={SETOR_CORES[s.setor] || "#94a3b8"} />
                  ))}
                  <LabelList
                    dataKey="texto"
                    position="right"
                    style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground italic mt-2">
            Fonte: PDET/MTE RAIS 2023. Indústria e Serviços pagam mais que agropecuária —
            mas Piracanjuba tem maior parte dos empregos no agro.
          </p>
        </section>
      )}

      {/* PAINEL 5: Empresas + MEIs */}
      {(empresasMEIs.empresas || empresasMEIs.meis) && (
        <section className="stat-card border-slate-500/20 bg-gradient-to-br from-slate-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Empresas Ativas + MEIs
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Cadastros ativos na Receita Federal. CNPJs incluem todas as empresas;
                MEIs são empreendedores individuais com receita até R$ 81 mil/ano.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {empresasMEIs.empresas && (
              <div className="stat-card border-slate-500/30">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> CNPJs Ativos
                </p>
                <p className="text-3xl font-extrabold text-foreground mt-0.5">
                  {empresasMEIs.empresas.texto}
                </p>
                <p className="text-[10px] text-muted-foreground italic mt-1">
                  {empresasMEIs.empresas.observacao}
                </p>
              </div>
            )}
            {empresasMEIs.meis && (
              <div className="stat-card border-emerald-500/30 bg-emerald-500/5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                  <Users className="w-3 h-3" /> MEIs Ativos
                </p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-0.5">
                  {empresasMEIs.meis.texto}
                </p>
                <p className="text-[10px] text-muted-foreground italic mt-1">
                  {empresasMEIs.meis.observacao}
                </p>
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground italic mt-3">
            Fonte:{" "}
            <a
              href="https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Receita Federal — Cadastro Nacional CNPJ
            </a>
            {" · "}
            <a
              href="https://www.gov.br/empresas-e-negocios/pt-br/empreendedor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Portal do Empreendedor (MEI)
            </a>
          </p>
        </section>
      )}

      {/* PAINEL 6: Cruzamento Safra × Empregos */}
      {Object.keys(chuvaMensal).length > 0 && cagedAtual && (
        <section className="stat-card border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-transparent to-amber-500/5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
              <CloudRain className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Cruzamento · Safra × Empregos
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Em economias agropecuárias como Piracanjuba (53,5% do PIB do agro), a
                quantidade de chuva impacta diretamente os empregos rurais. Anos de
                seca prolongada tipicamente reduzem admissões na agropecuária.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="stat-card border-sky-500/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Chuva acumulada {new Date().getFullYear()}
              </p>
              <p className="text-2xl font-extrabold text-sky-600 mt-0.5">
                {Math.round(chuvaTotal)} mm
              </p>
              <p className="text-[10px] text-muted-foreground">YTD</p>
            </div>
            <div
              className={`stat-card ${
                cagedAtual.saldo > 0 ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Saldo CAGED {cagedAtual.ano}
              </p>
              <p
                className={`text-2xl font-extrabold mt-0.5 ${
                  cagedAtual.saldo > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {cagedAtual.saldo > 0 ? "+" : ""}
                {cagedAtual.saldo}
              </p>
              <p className="text-[10px] text-muted-foreground">empregos líquidos</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Status
              </p>
              <p className="text-base font-bold text-foreground mt-1">
                {chuvaTotal > 800 && cagedAtual.saldo > 0
                  ? "✅ Chuva normal + empregos crescendo"
                  : chuvaTotal < 600 && cagedAtual.saldo < 0
                  ? "⚠️ Seca + empregos em queda — atenção"
                  : "↔️ Dados em observação"}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Hipótese a validar com mais anos: chuva 30% abaixo da média pode
            reduzir saldo CAGED agropecuário em ~15-20%. Cruzamento mais robusto
            quando tivermos CAGED por setor mensal — em desenvolvimento.
          </p>
        </section>
      )}

      {/* PAINEL 7: TOP EMPREGADORES */}
      {topEmpregadores.length > 0 && (
        <section className="stat-card border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Top Empregadores de Piracanjuba
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Maiores empresas do município por receita e empregos diretos.
                <strong> O Grupo Piracanjuba (laticínios) é o maior empregador</strong>,
                com cerca de 3.200 funcionários — quase 80% do total de empregos
                formais do município (4.047 RAIS 2023).
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {topEmpregadores.map((e, i) => (
              <div
                key={e.nome}
                className={`stat-card flex items-start gap-3 ${
                  i === 0 ? "border-blue-500/40 bg-blue-500/5" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-foreground">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{e.nome}</p>
                    {e.texto && (
                      <span
                        className={`text-xs font-bold ${
                          e.funcionarios ? "text-blue-600" : "text-muted-foreground"
                        }`}
                      >
                        {e.texto}
                      </span>
                    )}
                  </div>
                  {e.cnae && (
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                      {e.cnae}
                    </p>
                  )}
                </div>
                {e.fonte_url && (
                  <a
                    href={e.fonte_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline shrink-0 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground italic mt-3">
            Fontes: Grupo Piracanjuba (institucional) · Econodata (top 5 por receita).
            Funcionários só estão indicados quando há dado público confirmado.
          </p>
        </section>
      )}

      {/* PAINEL 8: TOP OCUPAÇÕES CBO */}
      {topOcupacoes.length > 0 && (
        <section className="stat-card border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Top Ocupações Profissionais (CBO)
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                As 3 maiores categorias de empregos formais em Piracanjuba pela
                Classificação Brasileira de Ocupações (CBO). Reflete o perfil
                produtivo: agro + serviços de logística (motoristas).
              </p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topOcupacoes}
                layout="vertical"
                margin={{ top: 8, right: 60, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="ocupacao"
                  tick={{ fontSize: 11 }}
                  width={180}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} empregos`, "Total"]}
                />
                <Bar dataKey="empregos" radius={[0, 4, 4, 0]}>
                  {topOcupacoes.map((o) => (
                    <Cell
                      key={o.ocupacao}
                      fill={SETOR_CORES[o.setor || "servicos"] || "#94a3b8"}
                    />
                  ))}
                  <LabelList
                    dataKey="texto"
                    position="right"
                    style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground italic mt-2">
            Fonte: PDET/MTE RAIS 2023 via Caravela.info. As 3 maiores categorias
            confirmadas; demais (top 10 completo) disponível no portal PDET com
            login.
          </p>
        </section>
      )}

      {/* PAINEL 9: CAGED por setor */}
      {cagedPorSetor.length > 0 && cagedPorSetor.some((s) => s.admissoes > 0) && (
        <section className="stat-card border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                CAGED 2025 por Setor
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Distribuição estimada das admissões/desligamentos 2025 YTD por setor,
                aplicada do total real (1.100/996) usando proporção do PIB setorial
                (Piracanjuba 2021: 53,5% agro, 38,5% serviços, 8% indústria).
              </p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cagedPorSetor}
                margin={{ top: 8, right: 10, bottom: 0, left: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="setor"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(s: string) => SETOR_LABEL[s] || s}
                />
                <YAxis tick={{ fontSize: 10 }} width={36} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [`${v} empregos`, name]}
                  labelFormatter={(l: string) => SETOR_LABEL[l] || l}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                <Bar
                  dataKey="admissoes"
                  name="Admissões"
                  fill="hsl(142, 76%, 36%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="desligamentos"
                  name="Desligamentos"
                  fill="hsl(0, 84%, 50%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {cagedPorSetor.map((s) => (
              <div
                key={s.setor}
                className={`stat-card ${
                  s.saldo > 0
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Saldo {SETOR_LABEL[s.setor]}
                </p>
                <p
                  className={`text-xl font-extrabold mt-0.5 ${
                    s.saldo > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {s.saldo > 0 ? "+" : ""}
                  {s.saldo}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground italic mt-3">
            ⚠️ <strong>Estimativa</strong>: distribuição derivada do total real CAGED
            via proporção do PIB. Pra valores exatos por setor, acessar Power BI
            CAGED/MTE filtrando município. Quando MTE expor REST público, sync
            automático passa a popular números reais.
          </p>
        </section>
      )}

      <p className="text-[10px] text-muted-foreground italic mt-6 text-center">
        Atualização mensal automática via cron <code>sync-economia-mensal</code> · primeira
        segunda do mês 06:00 UTC. Snapshots iniciais baseados em IMB-GO Boletim 012/2023
        (PIB 2021), Caravela.info (CAGED 2024-2025 + top ocupações), PDET/MTE RAIS 2023,
        Econodata (top empresas), Grupo Piracanjuba (institucional).
      </p>
    </div>
  );
}
