# Validação

- `npm run lint`: aplicação Next, configuração e testes Node, com zero avisos permitido.
- `npm run typecheck`: rotas geradas, aplicação Next e testes TypeScript.
- `npm test`: regressões Node com fixtures, sem gravar em produção.
- `npm run test:sync`: coletores compartilhados, com runtime e verificação de tipos Deno.
- `npm run build`: build completo, com a verificação TypeScript obrigatória.

O `tsconfig.json` representa o runtime Next. Os testes Node têm configuração própria em `tests/tsconfig.json`. As funções Supabase executam no Deno e são verificadas nesse runtime, sem misturar os globais e imports remotos com o TypeScript do Next. O lint da aplicação usa as regras do Next e React. Não desabilitamos essas regras nem a verificação de tipos do build.

O workflow Quality executa lint, tipos e ambas as suítes em PRs e main. O deploy Vercel executa o build completo com as variáveis do ambiente.

No Worker Dell, `desktop-run --worker dell --pull artifacts -- bash scripts/validation/quality.sh <rodada>` executa as suítes e a fase de compilação do Next sem credenciais. O script retorna zero para permitir transportar os relatórios inclusive em caso de falha. O gate real é `artifacts/<rodada>/quality.exit`, acompanhado dos arquivos `.exit` individuais. A fase de compilação usa um endpoint Supabase fictício. O build completo e os testes interativos de preview são necessários antes da produção.
