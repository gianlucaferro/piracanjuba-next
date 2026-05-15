// Helper de auth compartilhado pras edges Centi
export function checkCentiAuth(req: Request): boolean {
  const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
  const INGEST = Deno.env.get("CENTI_INGEST_SECRET") ?? "";

  const cron = req.headers.get("x-cron-secret") ?? "";
  const ingest = req.headers.get("x-centi-ingest-secret") ?? "";
  const auth = req.headers.get("authorization") ?? "";

  return (
    (CRON_SECRET !== "" && cron === CRON_SECRET) ||
    (INGEST !== "" && ingest === INGEST) ||
    (SR !== "" && auth.includes(SR))
  );
}

export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
