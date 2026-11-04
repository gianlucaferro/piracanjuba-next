---
tipo: sessao
data: 2026-11-04
projeto: Piracanjuba.ai
tags: [codex, supabase, seguranca, notificacoes, producao]
status: funcoes-publicadas-integracao-em-andamento
canal: obsidian-only
---

# Recuperação e proteção do send-push

O código original publicado foi recuperado e as cinco funções corrigidas foram publicadas no Supabase `oinweocqcptwxqsztlcl`. Veredito: proteção do disparo concluída e conferida no escopo, sem regressão encontrada nos testes. Nenhuma notificação real, coleta, IA ou consulta paga foi executada para teste. A integração Git está na [PR 31](https://github.com/gianlucaferro/piracanjuba-next/pull/31).

Esta nota substitui a pendência de recuperação registrada em [[2026-11-04 Codex - Supabase - Publicacao das protecoes de consumo]], preservando aquele registro histórico. Relaciona-se à auditoria [[2026-11-03 Codex - Supabase - Auditoria de abuso e custos]] e ao [[Historico consolidado Piracanjuba.ai]].

## Recuperação comprovada

O download comum falhava porque a função legada retornava ESZIP2.3, enquanto o cliente esperava multipart. O corpo foi obtido pela Supabase Management API autenticada, com PAT do 1Password somente em memória. O parser oficial `@deno/eszip@0.106.0` extraiu a fonte original de `sourcesContent`, sem executar o bundle. A fonte TypeScript recuperada tem 4.960 bytes e SHA256 `5a560ca271b90f18e89695ac57ca66b142279eb64e52b364a837e232e4458c90`, idêntica ao arquivo local anterior às alterações.

O ESZIP completo tem 376.261 bytes e SHA256 `569c79466aa6526f9cff41b09ea31c25f7d80d9f8aa821b4f9fc015c686380af`. Foi preservado com manifesto, fonte e script reprodutível. As 60 entradas textuais são reproduzíveis a partir dele. O conteúdo binário especial do Supabase permaneceu integralmente no backup. A ausência de autenticação foi confirmada no código implantado, com `verify_jwt=false`, sem disparar mensagens para provar o risco.

## Correções publicadas

| Função | Versão anterior | Versão nova | JWT preservado |
|---|---:|---:|---|
| sync-prefeitura-diaria | 31 | 32 | true |
| sync-prefeitura-mensal | 29 | 30 | false |
| import-folha-manual | 26 | 27 | true |
| import-folha-xlsx | 26 | 27 | true |
| send-push | 23 | 24 | false |

Os quatro chamadores foram publicados antes do destinatário. Todos exigem credencial interna exata antes de ler corpo, criar cliente, acessar banco ou fontes externas. A rota Centi e a prévia mensal legada foram preservadas. As chamadas internas de push agora usam service_role; falhas de notificação não invalidam coletas já concluídas. O alerta de saúde já usava a credencial correta e permaneceu na mesma versão.

O send-push exige service_role ou CRON_SECRET, aceita POST/OPTIONS e tem diagnóstico autenticado sem efeitos. Aplica limites de 8 KiB ao corpo, 3.993 bytes ao payload Web Push e 1 MiB à resposta efetivamente recebida do banco. Valida URLs de clique para a origem canônica e restringe o transporte aos provedores Web Push admitidos, com HTTPS, sem credenciais na URL e sem redirects.

O lote admite até 200 inscrições, com concorrência de 20 e timeout cancelável de 5 segundos por transporte. Acima do teto, recusa antes do primeiro envio, sem descartar silenciosamente o restante. Preserva criptografia, VAPID, TTL de 86.400 segundos, tópico geral e broadcast do health. Remove somente inscrições confirmadas como expiradas por 404/410. Falha da consulta de deduplicação bloqueia antes do envio; falhas de limpeza ou registro depois de envio são informadas sem recomendar repetição automática.

Foram conferidos 26 arquivos publicados por igualdade exata com os pacotes revisados. As dependências legadas de identidade/persistência mantiveram os bytes remotos anteriores. As outras 136 funções permaneceram iguais. Não houve migration, SQL de escrita, restart, alteração de secret, dados ou cron.

## Validação

- Worker Dell: 258 testes Node, 184 Deno, lint e checagem de tipos das cinco funções aprovados. Teste criptográfico usa biblioteca real e chaves sintéticas, com transporte simulado. Não foram copiadas credenciais para o worker.
- GitHub Quality `41774177653`: checks e browser aprovados, incluindo tipos, lint, testes Node/Deno e jornadas Playwright.
- Produção: 31 verificações negativas, de método e diagnóstico aprovadas. Configuração VAPID passou por validação de formato em dry_run; isso não é prova de entrega ao dispositivo.
- Monitor `sync-health-check`: HTTP 200, dry_run, nenhuma tentativa de coleta ou notificação. Reportou 66 jobs, 38 saudáveis e 28 fora do estado saudável. Essas pendências de coleta não foram corrigidas nem atribuídas a esta publicação. Funcionamento do monitor não equivale a dados integralmente atualizados.
- Site: 18 rotas públicas HTTP 200, sem redirecionamento indevido ou assinatura de erro de aplicação.
- Antes/depois: 85 crons com checksum `5b9cc6fa938dc7c843d4141d7cab0927`; uma inscrição com checksum `5276c7c5711e563c9932840b9639aa36`; 23 registros push. Todos preservados.

## Revisão, rollback e limites

Duas revisões independentes avaliaram chamadores, handler e transporte. Um achado sobre respostas do banco sem teto foi corrigido antes da publicação. O review automatizado apontou dois ajustes nos scripts: exigir backup com hash válido e separar resultados por invocação. Ambos foram aplicados, com sintaxe conferida e igualdade dos cinco pacotes publicados reconfirmada. A sugestão de alterar código dentro do backup histórico foi descartada, pois adulteraria a evidência arquivada. Nenhuma dessas observações exigiu nova publicação das funções.

Backups, flags JWT, hashes e plano de reversão estão em `live-backup/`, `callers-backup/` e `plano-publicacao.md`. Não restaurar automaticamente a implementação antiga sem autenticação. Em incidente, corrigir mantendo a barreira privada e os chamadores compatíveis. Não foi necessário rollback.

Esta etapa não cria quota financeira absoluta. A deduplicação legada não é atômica entre chamadas concorrentes, e o cadastro público de inscrições ainda permite INSERT sem quota própria. Esse cadastro precisa de uma etapa específica de proteção no banco, com autorização SQL concreta antes de aplicação. As notificações existentes foram preservadas por compatibilidade e testes simulados; entrega real a um dispositivo não foi ensaiada nesta sessão.

Referências primárias: [API do corpo da função](https://supabase.com/docs/reference/api/v1-get-a-function-body), [parser ESZIP](https://github.com/denoland/eszip), [Web Push 3.6.7](https://github.com/web-push-libs/web-push/blob/v3.6.7/src/web-push-lib.js), [RFC 8291](https://www.rfc-editor.org/rfc/rfc8291).

Nota canônica: `/Users/gianlucaferro/dev/obsidian/GianlucaObsidian/Sessões/2026-11-04 Codex - Piracanjuba.ai - Recuperacao e seguranca do send-push.md`. Esta cópia no repositório espelha o registro do Obsidian.
