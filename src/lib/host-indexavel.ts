// Hosts que servem o site mas não devem ser indexados: os domínios *.vercel.app
// (piracanjuba-next.vercel.app e as prévias de cada deploy). O host canônico é piracanjuba.ai;
// o www vai ganhar 308 para ele no painel da Vercel e por isso não entra aqui.
// Sem imports com "@/": o teste tests/host-indexavel.test.ts importa este arquivo direto no Node.

/** Normaliza o valor do header Host: minúsculas, sem porta e sem ponto final. */
export function normalizarHost(host: string | null | undefined): string {
  return (host ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

/** true quando a resposta deve sair com X-Robots-Tag: noindex. */
export function hostSemIndexacao(host: string | null | undefined): boolean {
  return normalizarHost(host).endsWith(".vercel.app");
}
