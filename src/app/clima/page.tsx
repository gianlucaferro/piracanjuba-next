import { Cloud, CloudRain, Droplets, Sun, Wind } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import {
  fetchClimaPainel,
  fetchClimaResumoMes,
  fetchClimaSerieDias,
  type ClimaDia,
  type ClimaPainel,
  type ResumoMes,
} from "@/lib/data/clima";
import {
  FONTE_CLIMA,
  diaDaSemana,
  formatarChuva,
  formatarTemperatura,
  hojeEmBrasilia,
  periodoMesEncerrado,
  respostaClima,
  somarDias,
} from "@/lib/clima-painel";
import ClimaClient from "./ClimaClient";

export const metadata = pageMetadata({
  title: "Previsão do tempo em Piracanjuba GO hoje",
  description:
    "Previsão do tempo em Piracanjuba (GO) para hoje e os próximos dias: máxima, mínima e chuva prevista, temperatura agora e chuva do mês. Dados Open-Meteo.",
  path: "/clima",
});

// O cron sync-inmet-clima-15min (*/15 * * * *) grava a leitura atual e a previsão a cada
// 15 minutos; a página revalida no mesmo intervalo.
export const revalidate = 900;

function IconeChuva({ chuva, className }: { chuva: number | null; className: string }) {
  if (chuva === null) return <Cloud className={`${className} text-muted-foreground`} aria-hidden />;
  if (chuva > 1) return <CloudRain className={`${className} text-sky-500`} aria-hidden />;
  if (chuva > 0.1) return <Cloud className={`${className} text-sky-400`} aria-hidden />;
  return <Sun className={`${className} text-amber-500`} aria-hidden />;
}

function rotuloDia(data: string, hoje: string) {
  if (data === hoje) return "Hoje";
  if (data === somarDias(hoje, 1)) return "Amanhã";
  const semana = diaDaSemana(data);
  return semana.charAt(0).toUpperCase() + semana.slice(1);
}

export default async function ClimaPage() {
  let dias: ClimaDia[] = [];
  let resumo: ResumoMes | null = null;
  let painel: ClimaPainel = { hoje: hojeEmBrasilia(), agora: null, diaHoje: null, previsao: [] };
  // Falha do Supabase (ou variáveis ausentes no build) não derruba a página: ela mostra o aviso.
  try {
    [dias, resumo, painel] = await Promise.all([
      fetchClimaSerieDias(30),
      fetchClimaResumoMes(),
      fetchClimaPainel(),
    ]);
  } catch {
    // mantém os valores vazios acima
  }

  const { hoje, agora } = painel;
  const diasPrevistos = [...(painel.diaHoje ? [painel.diaHoje] : []), ...painel.previsao];
  const resposta = respostaClima(painel, resumo);
  const semDados = dias.length === 0 && diasPrevistos.length === 0 && !agora;

  return (
    <div className="container py-8 space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          Previsão do tempo em Piracanjuba
        </h1>
        <p className="text-base text-foreground mt-3 max-w-3xl leading-relaxed">{resposta}</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Os valores vêm da {FONTE_CLIMA}, um serviço de dados meteorológicos calculados por modelos para as
          coordenadas de Piracanjuba, GO (não é uma estação local). Útil para o produtor rural acompanhar a safra e
          para a saúde pública monitorar criadouros de mosquitos.
        </p>
      </header>

      {semDados ? (
        <div className="stat-card text-center py-12 text-muted-foreground">
          <p>Dados climáticos ainda não disponíveis. Aguarde a próxima sincronização.</p>
        </div>
      ) : (
        <>
          {agora && (
            <section
              aria-labelledby="tempo-agora"
              className="stat-card border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-transparent"
            >
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <IconeChuva chuva={agora.precipitacao} className="w-12 h-12" />
                  <div>
                    <h2 id="tempo-agora" className="text-sm uppercase tracking-wider text-muted-foreground">
                      Tempo agora em Piracanjuba
                    </h2>
                    <p className="text-4xl font-extrabold text-foreground">{formatarTemperatura(agora.temperatura)}</p>
                    {painel.diaHoje && (painel.diaHoje.temperatura_min !== null || painel.diaHoje.temperatura_max !== null) && (
                      <p className="text-sm text-muted-foreground">
                        Previsão para hoje: mín {formatarTemperatura(painel.diaHoje.temperatura_min) ?? "sem dado"} · máx{" "}
                        {formatarTemperatura(painel.diaHoje.temperatura_max) ?? "sem dado"}
                      </p>
                    )}
                  </div>
                </div>
                <dl className="flex flex-wrap gap-4 text-sm">
                  {agora.umidade !== null && (
                    <div className="inline-flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-sky-400" aria-hidden />
                      <dt className="text-muted-foreground">Umidade:</dt>
                      <dd className="font-semibold text-foreground">{Math.round(agora.umidade)}%</dd>
                    </div>
                  )}
                  {agora.precipitacao !== null && (
                    <div className="inline-flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-sky-500" aria-hidden />
                      <dt className="text-muted-foreground">Chuva no momento:</dt>
                      <dd className="font-semibold text-foreground">{formatarChuva(agora.precipitacao)}</dd>
                    </div>
                  )}
                  {agora.vento !== null && (
                    <div className="inline-flex items-center gap-2">
                      <Wind className="w-4 h-4 text-muted-foreground" aria-hidden />
                      <dt className="text-muted-foreground">Vento:</dt>
                      <dd className="font-semibold text-foreground">{Math.round(agora.vento)} km/h</dd>
                    </div>
                  )}
                </dl>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Leitura de {agora.data} às {agora.hora} (horário de Brasília). Fonte: {FONTE_CLIMA}.
              </p>
            </section>
          )}

          {diasPrevistos.length > 0 && (
            <section aria-labelledby="previsao-proximos-dias" className="space-y-3">
              <h2 id="previsao-proximos-dias" className="text-lg font-semibold text-foreground">
                Previsão do tempo para os próximos dias em Piracanjuba
              </h2>
              <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {diasPrevistos.map((dia) => (
                  <li key={dia.data} className="stat-card text-center space-y-1">
                    <p className="text-sm font-semibold text-foreground">{rotuloDia(dia.data, hoje)}</p>
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={dia.data}>{dia.data}</time>
                    </p>
                    <IconeChuva chuva={dia.precipitacao_mm} className="w-7 h-7 mx-auto" />
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">máx {formatarTemperatura(dia.temperatura_max) ?? "sem dado"}</span>
                      <br />
                      <span className="text-muted-foreground">mín {formatarTemperatura(dia.temperatura_min) ?? "sem dado"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Chuva prevista: {formatarChuva(dia.precipitacao_mm) ?? "sem dado"}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Previsão da {FONTE_CLIMA}
                {agora ? `, na atualização de ${agora.data} às ${agora.hora} (horário de Brasília)` : ""}. A chuva de
                hoje soma as horas já passadas e a previsão para o resto do dia.
              </p>
            </section>
          )}

          {dias.length > 0 && <ClimaClient dias={dias} resumo={resumo} periodoMes={periodoMesEncerrado(hoje)} />}
        </>
      )}
    </div>
  );
}
