# Escala atualizada de farmácias 2026-2027

Fonte recebida do operador em 2026-09-07: `PLANTÃO 2026-2027 (1).pdf`, preservada integralmente neste diretório como `escala-2026-2027-atualizada-2026-09-07.pdf`.

SHA-256: `7f37381f0e30fdeea757bbbf46e3f626d5271cfddd49216a95836830ffccdd43`.

## Transcrição

As 50 colunas semanais foram extraídas da tabela do PDF e conferidas visualmente. O início vai de 2026-03-14 a 2027-02-20. A última semana termina em 2027-02-26, conforme a duração semanal já utilizada pelo site.

A marca literal `24H` determina a farmácia destacada. As demais preservam sua ordem de cima para baixo na coluna. O cinza da célula apenas alterna colunas, sem indicar atendimento 24h.

- `D. VITAE`: Drogaria Vitae.
- `D. SAO MARCOS`: Drogaria São Marcos.
- `D. HIPERPOP`: Drogaria Hiper Pop.
- Os demais nomes preservam a grafia existente no site para manter correspondência com fotos e contatos cadastrados.
- O PDF não informa telefones. As três farmácias acrescentadas ficam sem contato até existir informação cadastrada, sem números presumidos ou links vazios.
- Em 2026-03-14 nenhuma linha tem `24H`. Essa semana histórica lista as cinco farmácias e informa a ausência da identificação 24h.
- O cabeçalho correspondente a 2026-04-04 imprime o ano 2016. Mantido 2026 no calendário, coerente com o título e a sequência de sábados entre 2026-03-28 e 2026-04-11. O arquivo original não foi alterado.

## Publicação e reversão

A mudança afeta a tabela compartilhada pela página inicial, calendário e compartilhamento no WhatsApp, além da apresentação de contatos e 24h não informados. Não exige escrita no banco nem alteração de cron.

Autorização: o operador pediu a correção no site e já autorizou a publicação das correções nesta sessão. Base de produção antes desta alteração: `ddcf9c6570b81237eb770b137e9bff0abce47428`.

Backup: histórico Git anterior e PDF original versionado. Rollback: reverter o commit desta correção por novo commit e merge via PR, preservando alterações posteriores; a Vercel publica automaticamente a reversão. Não restaurar o repositório inteiro nem alterar dados do Supabase.

Validação focal: `node --test tests/plantao-farmacias.test.ts`, comparação das 50 semanas com a extração do PDF, lint dos arquivos afetados e build de preview na Vercel antes do merge.
