# Cotações de câmbio na home

Pesquisa e preparação em 2026-11-23. Escopo autorizado pelo operador: verificar permissão da AwesomeAPI e, havendo permissão, implementar dólar/euro com atualização a cada minuto, testar e publicar.

## Permissão de uso confirmada

Fonte primária: https://awesomeapi.com.br/terms, versão vigente desde 2026-11-11, consultada pelo navegador. A cláusula 3 permite dados em produtos pessoais e comerciais, inclusive sites pagos, com exibição, cache e histórico internos, em qualquer plano. Atribuição é opcional. A cláusula 4 proíbe revenda como serviço equivalente, contorno de limites, compartilhamento de chave e requisições abusivas.

O painel da home é exibição dentro do produto Piracanjuba.ai, autorizada pelos termos. A integração fica restrita aos dois pares usados no painel, sem API genérica de moedas, URLs arbitrárias ou exposição de credenciais. A fonte será identificada por transparência editorial.

## Franquia e dados

Cláusulas 5 a 8: conta gratuita com chave, 100.000 consultas mensais, sem cache do fornecedor; acesso sem chave, 10.000 por IP, com cache e possíveis restrições em nuvem. Cada chamada HTTP conta uma consulta mesmo com vários pares. Gratuito bloqueia ao exceder a franquia, sem cobrança. Não será contratado plano pago.

Uma consulta compartilhada por minuto representa 43.200 requisições em 30 dias, ou 44.640 em 31 dias, antes de concorrência e novas tentativas. O cache e a revalidação são sob demanda; o site não consultará o fornecedor por visitante nem em segundo plano sem tráfego. A franquia deve ser acompanhada no painel, pois a quantidade real depende de revalidações e falhas.

Compra, venda e variação de compra vêm do endpoint fixo USD-BRL,EUR-BRL. Horários pertencem a cada par e não à consulta. O painel não promete dados novos a cada segundo, cotação de turismo, fechamento de mercado ou disponibilidade ininterrupta.

## Implantação e rollback preparados

Base Git: `d73fe6b10070ec642d01c2139e828fd743b2629f`. Worktree próprio: `/Users/gianlucaferro/dev/codex/piracanjuba-next-tipos-lint`, branch `codex/cambio-home-2026-11-23`. Alterações alheias e prévia do banner não integram esta entrega.

Produção anterior confirmada: Vercel `dpl_87pwgDw4tvPqnYW6gTkdyP6nXKxE`, READY, mesma base Git. Metadados em `work/cambio-home-2026-11-23/vercel-before.json`.

A chave deve ficar no 1Password e na variável sensível `AWESOMEAPI_KEY` da Vercel, somente no servidor. Não haverá migration, SQL de escrita, cron ou novo serviço pago. Sem chave configurada, o endpoint fica indisponível, sem recorrer ao acesso anônimo sujeito a bloqueio.

Antes da publicação: conferir tipos, lint, build, testes do projeto, cenários novos de erro/atraso e repetição após um minuto. Conferir preview autenticado com chave real antes da integração. Depois: conferir domínio público, valor e horário de ambos os pares, cache compartilhado, atualização e rotas públicas.

Rollback: promover a produção anterior pela Vercel e conferir os aliases; reverter a mudança pelo Git com novo commit/PR, sem reescrever histórico. A variável isolada poderá permanecer sem uso ou ser removida após conferir sua dependência. Não há dados de banco para restaurar. Evidências finais e decisão ficam na nota canônica do Obsidian.

## Validação da implementação

Executada no Worker Dell, com fontes e Git preservados no M5 Max. Passaram 631 testes Node (um teste adicional ignorado), 216 testes Deno, lint, tipos e compilação. A primeira checagem de tipos encontrou referências antigas em arquivos gerados do espelho; a regeneração e nova checagem passaram sem alteração de fontes.

Os 112 testes de navegador já existentes passaram. Os 16 cenários novos, oito em desktop e oito em celular, passaram na execução final. Cobrem valores e horários por moeda, atraso, consulta após 60 segundos, erro inicial, repetição manual, erro posterior preservando dados e retomada depois de ocultar a aba. Fixtures foram corrigidas para suportar a montagem dupla em desenvolvimento e manter compra menor que venda. A atualização por visibilidade foi confirmada no trace; o relógio controlado também executa as notificações após a resposta.

Evidências locais ignoradas pelo Git: `artifacts/cambio-quality-1/`, `artifacts/cambio-e2e-1/`, `artifacts/cambio-e2e-3/`, `work/cambio-home-2026-11-23/types-recheck.log`, `artifacts/cambio-desktop.png` e `artifacts/cambio-mobile.png`. A CI da PR deve conferir novamente o conjunto completo no commit publicado.

Situação em 2026-11-23: implementação preparada, sem publicação. Não foi encontrada credencial AwesomeAPI no vault Dev nem configuração correspondente na Vercel. Solicitado ao operador salvar a chave em `op://Dev/AwesomeAPI/credential`, sem enviá-la no chat. A autorização para publicar já existe; a pendência é técnica, para validar a fonte real no preview e configurar a variável sensível antes do deploy.
