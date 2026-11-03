# Validação

- `npm run lint`: aplicação Next, configuração e testes Node, com zero avisos permitido.
- `npm run typecheck`: rotas geradas, aplicação Next e testes TypeScript.
- `npm test`: regressões Node com fixtures, sem gravar em produção.
- `npm run test:sync`: coletores compartilhados, com runtime e verificação de tipos Deno.
- `npm run build`: build completo, com a verificação TypeScript obrigatória.

O `tsconfig.json` representa o runtime Next. Os testes Node têm configuração própria em `tests/tsconfig.json`. As funções Supabase executam no Deno e são verificadas nesse runtime, sem misturar os globais e imports remotos com o TypeScript do Next. O lint da aplicação usa as regras do Next e React. Não desabilitamos essas regras nem a verificação de tipos do build.

O workflow Quality executa lint, tipos e ambas as suítes em PRs e main. O deploy Vercel executa o build completo com as variáveis do ambiente.

No Worker Dell, `desktop-run --worker dell --pull artifacts -- bash scripts/validation/quality.sh <rodada>` executa as suítes e a fase de compilação do Next sem credenciais. O script retorna zero para permitir transportar os relatórios inclusive em caso de falha. O gate real é `artifacts/<rodada>/quality.exit`, acompanhado dos arquivos `.exit` individuais. A fase de compilação usa um endpoint Supabase fictício. O build completo e os testes interativos de preview são necessários antes da produção.

## Jornadas e pós-deploy

`npm run test:e2e` usa Chromium desktop e Pixel 7 com API local somente leitura. As fixtures têm 1.002 servidores da Prefeitura e 32 da Câmara para detectar truncamento e mistura, além de anúncio e série climática isolada. Não acessa IA ou banco de produção. `scripts/validation/e2e.sh` guarda relatórios; conferir `e2e.exit`, pois o wrapper retorna zero para transportar artefatos de falhas.

O workflow Quality também executa as jornadas. O workflow Production smoke verifica 18 rotas públicas depois de um deployment Production bem-sucedido. `npm run test:smoke -- https://piracanjuba.ai` faz somente leituras HTTP.

`desktop-run --worker dell -- bash scripts/validation/monitor-pgcron.sh` valida migrations e rollback em PostgreSQL 17 descartável, sem rede e sem dados de produção.
