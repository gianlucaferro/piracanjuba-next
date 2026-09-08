---
tipo: pesquisa
data: 2026-09-08
projeto: Piracanjuba.ai
tags: [codex, onibus, fontes]
status: implementado-em-branch
---

# Horários de ônibus: fontes e manutenção

A página `/horarios-onibus` contém 19 opções consultadas em 2026-09-08 para viagens em 2026-09-10. São dados pontuais de ofertas comerciais, sem periodicidade inferida ou garantia de inventário completo. O código não coleta dados externos automaticamente. Não houve reserva, compra, contratação de API ou mensagem a terceiros.

## Evidências de consulta

A consulta foi feita na interface pública dos canais, com origem Piracanjuba, destino específico e data preenchida. Não foram usados endpoints internos como API de integração.

| Consulta | Resultado registrado para 2026-09-10 |
| --- | --- |
| [ClickBus para Goiânia](https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-09-10) | Marly 08:00 a 09:30, 11:00 a 12:30, 13:30 a 15:00 e 19:30 a 21:00, convencional e leito no mesmo horário. União 13:15 a 15:00. Real 15:50 a 17:30. Dez ofertas agrupadas em seis opções por empresa e horários. |
| [Mobifácil / União para Goiânia](https://www.mobifacil.com.br/passagem-de-onibus/piracanjuba-go/goiania-go?date=10-09-2026&institutionSource=expresso-uniao) | União 13:15 a 15:00 também confirmada no canal indicado pela transportadora. Endereço exato não exibido nessa oferta. |
| [ClickBus para Caldas Novas](https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-09-10) | Marly convencional 08:15 a 09:40, 13:00 a 14:25, 16:00 a 17:25 e 19:00 a 20:25. Marly leito 08:20 a 09:40, 13:05 a 14:25, 16:05 a 17:25 e 19:05 a 20:25. União 09:15 a 10:30. Real 12:15 a 13:30. Preservados os cinco minutos de diferença entre classes. |
| [ClickBus para Uberlândia](https://www.clickbus.com.br/onibus/piracanjuba-go/uberlandia-mg?departureDate=2026-09-10) | RodeRotas 11:30 a 17:50, semi-leito, duração de 6h20. Endereço exato de embarque não confirmado no itinerário individual. |
| [ClickBus para Araguari, Churrascaria Menegon](https://www.clickbus.com.br/onibus/piracanjuba-go/araguari-menegon-mg?departureDate=2026-09-10) | RodeRotas 11:30 a 16:50, semi-leito. União 09:15 a 13:55 COM TROCA DE ÔNIBUS: chega a Caldas Novas às 10:30 e sai às 11:30 com União. Primeiro trecho convencional; categoria do segundo não confirmada. Desembarque na Churrascaria Menegon, BR-050, km 41, CEP 38446-392. |

O endereço de embarque na Rua Cônego Olinto foi conferido nos itinerários individuais Real para Goiânia, Real para Caldas Novas e União com conexão para Araguari. Os demais registros pedem confirmação à empresa. O itinerário Real para Goiânia informa Hidrolândia às 16:35 e Aparecida de Goiânia às 17:00. Não há inferência de ausência de paradas quando a lista não foi consultada.

O slug genérico Araguari retornou ao catálogo. O autocomplete ofereceu Garagem Rode Rotas e Churrascaria Menegon. A busca Garagem não mostrou ofertas para a data; isso não prova inexistência de serviço. A página usa o destino Menegon efetivamente consultado e destaca seu endereço. Não foram mantidos links Mobifácil de destinos ainda não validados.

## Fontes institucionais

- [Guanabara: horários e guichês](https://viajeguanabara.com.br/horarios-e-guiches/): filtro Piracanjuba, Agência 01, Rua Cônego Olinto, s/n. Funcionamento 08:00 a 18:00 diariamente, claramente separado da saída do ônibus.
- [Agências Expresso União](https://www.expressouniao.com.br/pontos-de-venda/): Piracanjuba, (64) 3405-1306 e (64) 3405-5803. São contatos da agência da empresa, não da administração do terminal.
- [Real Expresso](https://viajeguanabara.com.br/viacao/real-expresso/): atendimento 0800 728 1992.
- [RodeRotas](https://www.roderotas.com/) e [termos do canal oficial](https://roderotas.clickbus.com.br/institucional/termos-de-uso): atendimento 0800 940 8090.
- [ANTT](https://quadros-horarios.antt.gov.br/) e [AGR](https://goias.gov.br/agr/quadro-de-horarios/): conferência de linhas autorizadas. Não converter partida da origem da linha em hora local de Piracanjuba.
- [Quadro AGR Expresso Marly](https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/04/QH-Linha-no-03.284-00-Goiania-a-Caldas-Novas-via-BR-153-e-Piracanjuba-1.pdf): linha 03.284-00, autorização 2026-04-10 e assinatura 2026-04-13. Informa partidas diárias de Goiânia e Caldas Novas, mas nenhuma hora de saída de Piracanjuba. Não sustenta uma escala semanal local.

## Manutenção e validade

`src/data/horariosOnibus.ts` é a fonte versionada da página. Cada registro tem data da viagem, data de consulta, fonte, horários, empresa, categoria e grau de confirmação do embarque. Ao atualizar, consultar os destinos na data desejada e registrar novas evidências. Não substituir só a constante da data nem deslocar horários existentes para outra semana.

A seleção inicial usa a data da amostra enquanto ela não tiver passado no fuso America/Sao_Paulo. Após o fim de 2026-09-10, muda para a data atual e informa ausência de consulta registrada, mantendo links datados para os canais. O arquivo antigo continua acessível ao escolher a data passada, explicitamente identificado como histórico. O relógio atualiza ao abrir, a cada minuto e ao retornar à aba.

Não há cron novo. A atualização automática permanente depende de quadro local confiável ou integração suportada. A API de parceiros ClickBus exige credenciamento e condições comerciais; nenhuma credencial foi solicitada ou contratada. Documentação: https://developer.clickbus.com.br/docs/guia-r%C3%A1pido

## Validação e publicação

Os 13 testes passaram no Dell, cobrindo calendário, fuso, expiração, filtros, URLs, duração, conexões e integridade. Lint dos arquivos alterados e TypeScript da página, dados e testes aprovados. Comandos reproduzíveis: `npm run test:onibus` e `npm run typecheck:onibus`. Inspeção visual e build remoto serão registrados na nota de entrega.

Uma compilação completa no Dell passou a etapa de compilação Next, mas a pré-renderização das páginas existentes tentou buscar dados no banco fictício de validação. A execução foi interrompida; isso não valida o build integral. O preview da Vercel usa a configuração própria do projeto e deve ser conferido antes de produção.

Base de produção da implementação: `78bc1f6548ef69e20168d2d145d443718945afab`. Branch `codex/horarios-onibus-2026-09-08`. Nova funcionalidade sem migrations, banco, cron ou credenciais. Antes de publicar, conferir main e deployment atuais. Rollback: reverter o commit de integração desta funcionalidade e republicar pelo Git; não reverter correções anteriores. Não restaurar banco.


## Resultado da revisão

PR 24 com preview Vercel pronto. Filtros e conexão conferidos em desktop e celular. Card confirmado visualmente na coluna de Contratos e linha de Grupos Econômicos. Calendário passou a aplicar a data no evento de entrada, validado no navegador interno com estado vazio em 2026-09-11 e histórico em 2026-09-07. A API GitHub confirmou build Vercel concluído do commit inicial; o último ajuste do calendário recebe novo preview antes de produção. Nota canônica no Obsidian: `Sessões/2026-09-08 Codex - Piracanjuba.ai - pagina de horarios de onibus.md`.
