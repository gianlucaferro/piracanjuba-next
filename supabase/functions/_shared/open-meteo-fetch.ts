export interface WeatherAttempt {
  attempt: number;
  outcome: "success" | "http_error" | "network_error" | "invalid_json" | "invalid_payload";
  http_status?: number;
}

export interface WeatherSnapshot {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    temperature_2m_mean: (number | null)[];
    precipitation_sum: (number | null)[];
    wind_speed_10m_max: (number | null)[];
    relative_humidity_2m_mean: (number | null)[];
  };
}

export class WeatherFetchError extends Error {
  readonly attempts: WeatherAttempt[];
  constructor(message: string, attempts: WeatherAttempt[]) {
    super(message);
    this.name = "WeatherFetchError";
    this.attempts = attempts;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateWeatherSnapshot(value: unknown): WeatherSnapshot {
  if (!record(value) || !record(value.current) || !record(value.daily)) throw new Error("Resposta Open-Meteo sem current/daily válidos");
  const { current, daily } = value;
  if (typeof current.time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(current.time)
    || !validDate(current.time.slice(0, 10)) || Number(current.time.slice(11, 13)) > 23 || Number(current.time.slice(14, 16)) > 59) {
    throw new Error("Resposta Open-Meteo com horário inválido");
  }
  const currentFields = ["temperature_2m", "relative_humidity_2m", "precipitation", "wind_speed_10m", "weather_code"];
  if (currentFields.some(field => typeof current[field] !== "number" || !Number.isFinite(current[field]))) throw new Error("Resposta Open-Meteo com valor atual ausente ou inválido");
  // O pedido fixo usa past_days=2 e forecast_days=7, portanto nove dias.
  const times = daily.time;
  if (!Array.isArray(times) || times.length !== 9 || !times.every(validDate)
    || new Set(times).size !== times.length || !times.includes(current.time.slice(0, 10))) {
    throw new Error("Resposta Open-Meteo com cobertura diária incompleta");
  }
  const dailyFields = ["temperature_2m_max", "temperature_2m_min", "temperature_2m_mean", "precipitation_sum", "wind_speed_10m_max", "relative_humidity_2m_mean"];
  if (dailyFields.some(field => {
    const values = daily[field];
    return !Array.isArray(values) || values.length !== times.length || values.some(item => item !== null && (typeof item !== "number" || !Number.isFinite(item)));
  })) throw new Error("Resposta Open-Meteo com série diária ausente ou inválida");
  // Todos os campos usados pelo coletor foram validados, sem trocar null por zero.
  return value as unknown as WeatherSnapshot;
}

export async function fetchWeatherSnapshot(
  url: string,
  options: { fetcher?: typeof fetch; wait?: (ms: number) => Promise<void>; timeoutMs?: number } = {},
): Promise<{ data: WeatherSnapshot; attempts: WeatherAttempt[] }> {
  const fetcher = options.fetcher ?? fetch;
  const wait = options.wait ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const attempts: WeatherAttempt[] = [];
  const delays = [250, 750];
  for (let attempt = 1; attempt <= 3; attempt++) {
    let result: Response;
    try {
      result = await fetcher(url, { signal: AbortSignal.timeout(options.timeoutMs ?? 10_000) });
    } catch {
      attempts.push({ attempt, outcome: "network_error" });
      if (attempt === 3) throw new WeatherFetchError("Open-Meteo falha de rede ou timeout", attempts);
      await wait(delays[attempt - 1]);
      continue;
    }
    if (!result.ok) {
      attempts.push({ attempt, outcome: "http_error", http_status: result.status });
      // Liberar o corpo do erro sem armazenar HTML, URLs ou dados do provedor.
      await result.body?.cancel().catch(() => {});
      if (result.status < 500 || result.status > 599 || attempt === 3) throw new WeatherFetchError(`Open-Meteo HTTP ${result.status}`, attempts);
      await wait(delays[attempt - 1]);
      continue;
    }
    let raw: unknown;
    try { raw = await result.json(); }
    catch {
      attempts.push({ attempt, outcome: "invalid_json", http_status: result.status });
      if (attempt === 3) throw new WeatherFetchError("Resposta Open-Meteo JSON inválido ou incompleto", attempts);
      await wait(delays[attempt - 1]);
      continue;
    }
    let data: WeatherSnapshot;
    try { data = validateWeatherSnapshot(raw); }
    catch (error) {
      attempts.push({ attempt, outcome: "invalid_payload", http_status: result.status });
      throw new WeatherFetchError(error instanceof Error ? error.message : "Resposta Open-Meteo inválida", attempts);
    }
    attempts.push({ attempt, outcome: "success", http_status: result.status });
    return { data, attempts };
  }
  throw new WeatherFetchError("Open-Meteo não confirmou a leitura", attempts);
}
