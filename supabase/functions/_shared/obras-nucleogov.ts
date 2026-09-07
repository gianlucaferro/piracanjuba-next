export const OBRAS_FONTE_URL =
  "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/informacao/cntobras";
export const OBRAS_ORIGEM_PREFIX = "prefeitura:nucleogov:obra:";
const BASE = "https://acessoainformacao.piracanjuba.go.gov.br";
type Registro = Record<string, unknown>;
export type ObraOficial = {
  origem_chave: string;
  nome: string;
  local: string | null;
  empresa: null;
  valor: number;
  status: string;
  fonte_url: string;
  raw_payload: Registro;
};
export type ObraExistente = {
  id: string;
  nome: string;
  origem_chave?: string | null;
  [key: string]: unknown;
};

export function parseObrasRequest(raw: string): { dryRun: boolean } {
  let value: unknown;
  try {
    value = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Corpo JSON inválido");
  }
  if (
    !value || typeof value !== "object" || Array.isArray(value) ||
    ("dryRun" in value && typeof value.dryRun !== "boolean")
  ) {
    throw new Error("Corpo inválido; dryRun deve ser booleano");
  }
  return { dryRun: "dryRun" in value && value.dryRun === true };
}

function registro(value: unknown): Registro {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Obras: resposta oficial inválida");
  }
  return value as Registro;
}
function texto(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}
function chaveNome(value: string): string {
  return texto(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}
function inteiro(value: unknown): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error("Obras: identificador inválido");
  }
  return number;
}
function estadoOficial(value: string): string {
  const key = chaveNome(value);
  if (key === "EM EXECUCAO" || key === "EM ANDAMENTO") return "em_andamento";
  if (key === "CONCLUIDA" || key === "CONCLUIDO") return "concluida";
  if (key === "PARALISADA" || key === "PARALISADO") return "paralisada";
  // Preservar outras situações declaradas; percentual financeiro não é avanço físico.
  return value;
}

export function normalizarObraOficial(
  value: unknown,
  orgaoId: number,
  orgaoNome: string,
): ObraOficial {
  const row = registro(value);
  const id = inteiro(row.Id);
  const nome = texto(row.Descricao);
  const situacao = texto(row.Situacao);
  if (
    !nome || !situacao || typeof row.ValorEmpenho !== "number" ||
    !Number.isFinite(row.ValorEmpenho)
  ) {
    throw new Error(
      `Obra ${orgaoId}:${id}: descrição, situação ou valor inválido`,
    );
  }
  return {
    origem_chave: `${OBRAS_ORIGEM_PREFIX}${orgaoId}:${id}`,
    nome,
    local: texto(row.Endereco) || null,
    // Fiscal e CPF/CNPJ do fiscal não identificam a empresa contratada.
    empresa: null,
    valor: row.ValorEmpenho,
    status: estadoOficial(situacao),
    fonte_url: OBRAS_FONTE_URL,
    raw_payload: { orgao_id: orgaoId, orgao_nome: orgaoNome, obra: row },
  };
}

async function post(
  path: string,
  params: Record<string, string>,
  fetcher: typeof fetch,
): Promise<unknown> {
  const response = await fetcher(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Origin": BASE,
      "Referer": OBRAS_FONTE_URL,
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`Obras: fonte HTTP ${response.status}`);
  const body = await response.text();
  if (body.length > 16_000_000) {
    throw new Error("Obras: resposta excedeu limite");
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Obras: fonte não retornou JSON");
  }
}

export async function fetchObrasOficiais(fetcher: typeof fetch = fetch) {
  const response = registro(
    await post("/api", {
      multi_request: "true",
      params: JSON.stringify({ orgaos: { acao: "diarias_cnt/listarOrgaos" } }),
    }, fetcher),
  );
  const list = Object.values(response)[0];
  if (!Array.isArray(list) || list.length === 0 || list.length > 100) {
    throw new Error("Obras: catálogo de órgãos vazio ou inválido");
  }
  const orgaoIds = new Set<number>();
  const orgaos = list.map((value) => {
    const row = registro(value);
    const id = inteiro(row.id);
    const nome = texto(row.valor);
    if (!nome || orgaoIds.has(id)) {
      throw new Error("Obras: órgão inválido ou repetido");
    }
    orgaoIds.add(id);
    return { id, nome };
  });
  const obras: ObraOficial[] = [];
  const byOrgao: { orgao_id: number; orgao_nome: string; fetched: number }[] =
    [];
  const sourceIds = new Set<number>();
  for (let offset = 0; offset < orgaos.length; offset += 2) {
    const batch = await Promise.all(
      orgaos.slice(offset, offset + 2).map(async (orgao) => {
        const data = registro(
          await post("/api/centi", {
            acao: "obras",
            id_orgao: String(orgao.id),
          }, fetcher),
        );
        if (!Array.isArray(data.dados) || !("orgao_principal" in data)) {
          throw new Error(`Obras órgão ${orgao.id}: envelope inválido`);
        }
        if (
          data.orgao_principal !== null &&
          Number(data.orgao_principal) !== orgao.id
        ) {
          throw new Error(
            `Obras órgão ${orgao.id}: filtro ignorado pela fonte`,
          );
        }
        return {
          orgao,
          rows: data.dados.map((row) =>
            normalizarObraOficial(row, orgao.id, orgao.nome)
          ),
        };
      }),
    );
    for (const { orgao, rows } of batch) {
      for (const obra of rows) {
        const id = inteiro(registro(obra.raw_payload.obra).Id);
        // O catálogo observado usa IDs globais. Repetição pode indicar filtro ignorado.
        if (sourceIds.has(id)) {
          throw new Error("Obras: ID repetido dentro ou entre órgãos");
        }
        sourceIds.add(id);
        obras.push(obra);
      }
      byOrgao.push({
        orgao_id: orgao.id,
        orgao_nome: orgao.nome,
        fetched: rows.length,
      });
    }
  }
  if (!obras.length) {
    throw new Error("Obras: catálogo oficial integralmente vazio");
  }
  return { obras, by_orgao: byOrgao };
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Registro;
  return `{${
    Object.keys(row).sort().map((key) =>
      `${JSON.stringify(key)}:${stable(row[key])}`
    ).join(",")
  }}`;
}

export function planejarObras(
  existentes: ObraExistente[],
  oficiais: ObraOficial[],
) {
  const byOrigem = new Map<string, ObraExistente>();
  for (const obra of existentes) {
    if (!obra.origem_chave?.startsWith(OBRAS_ORIGEM_PREFIX)) continue;
    if (byOrigem.has(obra.origem_chave)) {
      throw new Error("Obras: identidade duplicada no banco");
    }
    byOrigem.set(obra.origem_chave, obra);
  }
  const current = new Set(oficiais.map((obra) => obra.origem_chave));
  if (current.size !== oficiais.length || current.size === 0) {
    throw new Error("Obras: plano vazio ou com identidades repetidas");
  }
  const missing = [...byOrigem.keys()].filter((key) => !current.has(key));
  if (missing.length) {
    throw new Error(
      `Obras: ${missing.length} registros oficiais anteriores ausentes na fonte; revisão necessária`,
    );
  }
  const legadas = existentes.filter((obra) =>
    !obra.origem_chave?.startsWith(OBRAS_ORIGEM_PREFIX)
  );
  const conflitos = oficiais.flatMap((obra) => {
    const ids = legadas.filter((old) =>
      chaveNome(old.nome) === chaveNome(obra.nome)
    ).map((old) => old.id);
    return ids.length
      ? [{ origem_chave: obra.origem_chave, ids_legados: ids }]
      : [];
  });
  const inserts = oficiais.filter((obra) => !byOrigem.has(obra.origem_chave));
  const updates = oficiais.filter((obra) => {
    const old = byOrigem.get(obra.origem_chave);
    return old &&
      Object.entries(obra).some(([key, value]) =>
        stable(old[key]) !== stable(value)
      );
  });
  return {
    upserts: [...inserts, ...updates],
    inserts: inserts.length,
    updates: updates.length,
    unchanged: oficiais.length - inserts.length - updates.length,
    legacy_preserved: legadas.length,
    conflicts: conflitos,
  };
}
