// Bloco "Seções" do rodapé do portal (achado LINK-02 da auditoria de SEO de
// 2026-11-17). Esses links ficam no HTML de todas as páginas do portal, com
// âncora descritiva, para as seções que antes só eram alcançáveis pelo sitemap
// ou pelo menu "Mais" (que só entrava no DOM depois do clique).
// O teste tests/secoes-rodape.test.ts confere que cada rota existe em src/app.

export type LinkSecao = { href: string; rotulo: string };
export type GrupoSecoes = { titulo: string; links: LinkSecao[] };

export const SECOES_RODAPE: GrupoSecoes[] = [
  {
    titulo: "Câmara Municipal",
    links: [
      { href: "/vereadores", rotulo: "Vereadores de Piracanjuba" },
      { href: "/atuacao-parlamentar", rotulo: "Atuação parlamentar" },
      { href: "/camara/projetos", rotulo: "Projetos de lei da Câmara" },
      { href: "/camara/servidores", rotulo: "Servidores da Câmara" },
    ],
  },
  {
    titulo: "Prefeitura",
    links: [
      { href: "/prefeitura/contratos", rotulo: "Contratos da Prefeitura" },
      { href: "/prefeitura/servidores", rotulo: "Salários dos servidores municipais" },
      { href: "/prefeitura/licitacoes", rotulo: "Licitações da Prefeitura" },
      { href: "/prefeitura/leis", rotulo: "Leis municipais" },
    ],
  },
  {
    titulo: "Transparência",
    links: [
      { href: "/dados-pba", rotulo: "Painel Dados PBA" },
      { href: "/nota-pba", rotulo: "Nota de transparência da cidade" },
      { href: "/investigacoes", rotulo: "Investigações de contratos públicos" },
      { href: "/emendas", rotulo: "Emendas parlamentares" },
      { href: "/economia", rotulo: "Economia de Piracanjuba" },
    ],
  },
  {
    titulo: "Dia a dia",
    links: [
      { href: "/plantao-farmacias", rotulo: "Farmácias de plantão" },
      { href: "/coleta-lixo", rotulo: "Coleta de lixo" },
      { href: "/horarios-onibus", rotulo: "Horários de ônibus" },
      { href: "/clima", rotulo: "Clima em Piracanjuba" },
      { href: "/noticias", rotulo: "Notícias de Piracanjuba" },
      { href: "/historia-pba", rotulo: "História de Piracanjuba" },
    ],
  },
];
