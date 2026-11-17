// Rotas do sitemap e as páginas que ficam fora dele de propósito.
//
// Sem imports com "@/": o teste tests/sitemap-rotas.test.ts lê este arquivo direto no Node
// e compara com as page.tsx de src/app. Página pública nova precisa entrar em
// ROTAS_ESTATICAS ou, com o motivo, em ROTAS_FORA_DO_SITEMAP; senão o teste falha.
//
// lastModified não mora aqui: data de última alteração só entra no sitemap quando é
// confiável (ver src/app/sitemap.ts). Data de build não é data de alteração.

export type FrequenciaSitemap = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export type RotaSitemap = {
  path: string;
  changeFrequency: FrequenciaSitemap;
  priority: number;
};

export const ROTAS_ESTATICAS: readonly RotaSitemap[] = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/camara", changeFrequency: "weekly", priority: 0.9 },
  { path: "/vereadores", changeFrequency: "weekly", priority: 0.9 },
  { path: "/atuacao-parlamentar", changeFrequency: "weekly", priority: 0.8 },
  { path: "/prefeitura", changeFrequency: "weekly", priority: 0.9 },
  { path: "/saude", changeFrequency: "weekly", priority: 0.8 },
  { path: "/educacao", changeFrequency: "weekly", priority: 0.8 },
  { path: "/agro", changeFrequency: "monthly", priority: 0.7 },
  { path: "/seguranca", changeFrequency: "monthly", priority: 0.7 },
  { path: "/beneficios-sociais", changeFrequency: "monthly", priority: 0.7 },
  { path: "/arrecadacao", changeFrequency: "monthly", priority: 0.7 },
  { path: "/emendas", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contatos", changeFrequency: "monthly", priority: 0.6 },
  { path: "/coleta-lixo", changeFrequency: "monthly", priority: 0.6 },
  { path: "/postos-combustivel", changeFrequency: "monthly", priority: 0.7 },
  { path: "/grupos-economicos", changeFrequency: "monthly", priority: 0.7 },
  { path: "/investigacoes", changeFrequency: "daily", priority: 0.9 },
  { path: "/plantao-farmacias", changeFrequency: "weekly", priority: 0.7 },
  { path: "/horarios-onibus", changeFrequency: "daily", priority: 0.7 },
  { path: "/zap-pba", changeFrequency: "weekly", priority: 0.7 },
  { path: "/compra-e-venda", changeFrequency: "daily", priority: 0.9 },
  { path: "/anuncie", changeFrequency: "monthly", priority: 0.6 },
  { path: "/historia-pba", changeFrequency: "monthly", priority: 0.7 },
  { path: "/nota-pba", changeFrequency: "yearly", priority: 0.8 },
  { path: "/sobre", changeFrequency: "yearly", priority: 0.5 },
  { path: "/na-midia", changeFrequency: "monthly", priority: 0.6 },
  { path: "/noticias", changeFrequency: "daily", priority: 0.8 },
  // Incluídas em 2026-11-17 (auditoria SEO, IDX-04 e KW-08): respondiam 200, sem noindex e
  // com canonical próprio, mas faltavam no sitemap. /clima é a página de maior audiência.
  { path: "/clima", changeFrequency: "daily", priority: 0.8 },
  { path: "/indicadores", changeFrequency: "monthly", priority: 0.7 },
  { path: "/economia", changeFrequency: "monthly", priority: 0.7 },
  { path: "/infraestrutura", changeFrequency: "monthly", priority: 0.7 },
  { path: "/meio-ambiente", changeFrequency: "monthly", priority: 0.7 },
  { path: "/dados-pba", changeFrequency: "monthly", priority: 0.7 },
  { path: "/comparador", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacidade", changeFrequency: "yearly", priority: 0.3 },
];

// Abas indexáveis da Prefeitura e da Câmara (rotas próprias para SEO). Precisam bater com
// as chaves de ABAS em src/app/prefeitura/[aba]/page.tsx e src/app/camara/[aba]/page.tsx.
export const ABAS_PREFEITURA = [
  "chefia", "secretarias", "contratos", "servidores", "funprepi", "despesas", "prestacao-contas", "tcm-go",
  "decretos", "portarias", "leis", "lei-organica", "diarias", "licitacoes", "obras", "veiculos",
] as const;

export const ABAS_CAMARA = [
  "servidores", "contratos", "projetos", "atuacao", "indicacoes", "resolucoes", "decretos-leg", "pautas",
  "atas", "transmissao", "licitacoes", "despesas", "receitas", "prestacao-contas", "diarias",
] as const;

export type MotivoForaDoSitemap = {
  motivo: string;
  /** true quando a página declara noindex (pageMetadata com noIndex: true). */
  noindex: boolean;
};

// Páginas de src/app que não entram no sitemap, com o motivo. Rotas sem page.tsx
// (/api/*, /auth/callback) já não são páginas e não precisam constar aqui.
export const ROTAS_FORA_DO_SITEMAP: Readonly<Record<string, MotivoForaDoSitemap>> = {
  "/admin": { motivo: "painel interno da equipe", noindex: true },
  "/acompanhar": { motivo: "favoritos e avisos de quem está logado", noindex: true },
  "/anuncie/cadastro": { motivo: "formulário de cadastro de empresa", noindex: true },
  "/anuncie/cadastro/obrigado": { motivo: "confirmação de envio do cadastro", noindex: true },
  // As 8 páginas /transparencia/* repetem temas das abas da Câmara. A escolha da URL
  // canônica de cada tema fica para a Onda 2 (auditoria SEO de 2026-11-17, IDX-03).
  "/transparencia/atividades-legislativas": { motivo: "canonical pendente (IDX-03, Onda 2)", noindex: false },
  "/transparencia/atos-camara": { motivo: "canonical pendente (IDX-03, Onda 2)", noindex: false },
  "/transparencia/contratos-camara": { motivo: "canonical pendente (IDX-03, Onda 2)", noindex: false },
  "/transparencia/cotas-parlamentares": { motivo: "canonical pendente (IDX-03, Onda 2)", noindex: false },
  "/transparencia/folha-camara": { motivo: "canonical pendente (IDX-03, Onda 2)", noindex: false },
  "/transparencia/indicacoes": { motivo: "canonical pendente (IDX-03, Onda 2)", noindex: false },
  "/transparencia/licitacoes-camara": { motivo: "canonical pendente (IDX-03, Onda 2)", noindex: false },
  "/transparencia/processos-publicos": { motivo: "canonical pendente (IDX-03, Onda 2)", noindex: false },
};

// Rotas dinâmicas e de onde src/app/sitemap.ts tira as URLs de cada uma.
export const ROTAS_DINAMICAS_NO_SITEMAP: Readonly<Record<string, string>> = {
  "/[empresa]": "SLUGS_EMPRESAS (src/data/empresas-slugs.ts), com a data de conferência da ficha",
  "/compra-e-venda/[id]": "anúncios ativos da tabela classificados (Supabase)",
  "/vereadores/[slug]": "tabela vereadores (Supabase), linhas com slug",
  "/prefeitura/[aba]": "ABAS_PREFEITURA",
  "/camara/[aba]": "ABAS_CAMARA",
};
