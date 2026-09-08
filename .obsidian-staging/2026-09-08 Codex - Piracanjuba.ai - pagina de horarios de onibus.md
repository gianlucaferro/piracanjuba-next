---
tipo: sessao
data: 2026-09-08
projeto: Piracanjuba.ai
tags: [codex, piracanjuba, onibus, implementacao]
status: aguardando-autorizacao-producao
canal: obsidian-only
---

# Página de horários de ônibus

Implementação concluída em branch própria, com preview Vercel e revisão funcional. O card “Horários ônibus rodoviária” ocupa a terceira coluna da segunda linha de Mais serviços, ao lado de Grupos Econômicos e abaixo de Contratos da Prefeitura. A página `/horarios-onibus` foi adicionada também às navegações desktop e móvel e ao sitemap.

[PR 24](https://github.com/gianlucaferro/piracanjuba-next/pull/24), branch `codex/horarios-onibus-2026-09-08`. [Prévia autenticada](https://piracanjuba-next-git-codex-horar-d9ffe3-gianlucaferros-projects.vercel.app/horarios-onibus). Repositório canônico de implementação: `/Users/gianlucaferro/dev/codex/piracanjuba-next-rodoviaria`.

## Escopo e dados

19 opções consultadas em 2026-09-08 para viagens em 2026-09-10: Goiânia, Caldas Novas, Araguari e Uberlândia. Empresas: Expresso União, Real Expresso, Expresso Marly e RodeRotas. Exibe saída, chegada prevista, duração, categoria, data, destino, dados disponíveis de embarque/desembarque, paradas, fontes e contatos.

Araguari tem desembarque na Churrascaria Menegon, BR-050, km 41. A oferta União 09:15 a 13:55 exige troca de ônibus em Caldas Novas, chegada 10:30 e nova saída 11:30. A categoria do segundo trecho está como a confirmar. Não foi apresentada como viagem sem conexão. RodeRotas 11:30 a 16:50 foi conferida separadamente.

Goiânia tem seis grupos de empresa/horários, agrupando classes somente quando os horários coincidem. Caldas Novas tem dez opções, preservando diferenças de cinco minutos entre convencional e leito da Marly. Uberlândia tem RodeRotas 11:30 a 17:50. Esses registros não são garantia de todas as saídas nem escala diária.

A seleção por data é estrita. Depois do fim de 2026-09-10 em America/Sao_Paulo, a seleção inicial passa à data atual e informa que ainda não houve consulta registrada. O histórico exige seleção explícita e recebe identificação de arquivo. Horários transcorridos são sinalizados. Links de busca carregam origem, destino e data. O calendário usa o evento de entrada para refletir imediatamente a escolha nos filtros.

Não há novo cron ou coleta automática. O inventário completo recorrente ainda depende de quadro local confirmado ou integração suportada com condições de uso definidas. ANTT e AGR confirmam linhas; as partidas na origem da linha não foram usadas como horários locais. O quadro vigente da Marly foi conferido e também não traz hora de passagem por Piracanjuba.

## Validação

- 13 testes aprovados no M5 e no Dell. Incluem calendário, fuso, expiração, consulta sem repetição semanal, filtros, URLs, duração, conexões e integridade dos endereços.
- TypeScript da funcionalidade e lint dos arquivos alterados aprovados no Dell. Não houve mudança de dependências.
- Vercel informou Deployment has completed para o commit inicial `58f5cdbd222abd493c2dff15a1c698d0cc1a5587`. Preview abriu no Chrome autenticado. O build Next isolado no Dell passou a compilação, mas foi interrompido na pré-renderização de páginas antigas porque o ambiente usa banco fictício; não conta como build integral aprovado.
- Página verificada em desktop e viewport de 390 pixels, sem transbordamento horizontal observado. Filtros destino/empresa, conexão, fontes e estado sem registros conferidos. A posição do card foi confirmada visualmente e por geometria: mesma coluna de Contratos e mesma linha de Grupos Econômicos.
- Ajuste do calendário validado também em ambiente isolado no Dell e navegador interno: selecionar 2026-09-11 mostra zero registros e links dessa data; 2026-09-07 mostra Consulta arquivada. Console do ambiente isolado sem erros ou avisos no teste.
- Revisão independente identificou um P2 de anúncio acessível de estado vazio, corrigido mantendo a contagem zero na região viva. Sem achados bloqueantes restantes no escopo.

## Publicação e rollback

Nenhuma mudança foi integrada a main ou publicada em produção nesta entrega. As autorizações anteriores da sessão eram para correções das fontes, coletores e farmácias; a publicação desta funcionalidade nova será submetida ao operador com preview e PR prontos.

Base inicial de produção `78bc1f6548ef69e20168d2d145d443718945afab`. Antes do merge, verificar main e deployment atuais. Sem migration, SQL, restart, credencial ou despesa nova. Rollback: reverter o commit de integração do PR 24 e deixar a Vercel republicar pelo Git, preservando as correções anteriores. Não há banco a restaurar.

O envio inicial da branch foi bloqueado pela revisão automática por dúvida de propriedade do remoto. A API GitHub confirmou conta autenticada gianlucaferro, propriedade e permissão ADMIN no repositório canônico; o histórico e o PR 23 corroboraram o destino. A repetição do push após essa verificação foi autorizada e concluída. A API também mostrou que o repositório é público atualmente, divergindo do rótulo privado antigo no histórico. Nenhuma configuração de visibilidade foi alterada.

## Referências

- [[Historico consolidado Piracanjuba.Ai]]
- [[2026-09-08 Codex - Piracanjuba.ai - fontes confiaveis para horarios de onibus]]
- [[2026-09-08 Codex - Piracanjuba.ai - viabilidade de horarios de onibus]]
- Relatório e evidências: `/Users/gianlucaferro/dev/codex/piracanjuba-next-rodoviaria/outputs/horarios-onibus-fontes-2026-09-08.md`.
- Testes reproduzíveis: `npm run test:onibus` e `npm run typecheck:onibus`.
