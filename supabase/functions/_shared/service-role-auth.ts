/** Valida somente a chave privilegiada configurada no servidor, nunca claims. */
export function hasServiceRoleAuth(
  req: Request,
  serviceRoleKey: string | undefined,
): boolean {
  if (!serviceRoleKey || !serviceRoleKey.trim()) return false;
  const authorization = req.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(\S+)$/i)?.[1];
  const apikey = req.headers.get("apikey");
  return bearer === serviceRoleKey || apikey === serviceRoleKey;
}

export function hasCronOrServiceRoleAuth(
  req: Request,
  serviceRoleKey: string | undefined,
  cronSecret: string | undefined,
): boolean {
  return hasServiceRoleAuth(req, serviceRoleKey) ||
    (!!cronSecret?.trim() && req.headers.get("x-cron-secret") === cronSecret);
}
