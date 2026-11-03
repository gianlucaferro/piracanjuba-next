# Ônibus: atualização pontual e manutenção

Data da verificação: 2026-11-03. Data das viagens consultadas: 2026-11-04.

## Resultado

- 14 opções atuais adicionadas: seis para Goiânia, seis para Caldas Novas e duas para Uberlândia, estas com conexão em Goiânia.
- Os 19 registros de 2026-09-10 foram preservados como histórico. Nenhuma frequência semanal ou diária foi inferida.
- O arquivo de dados foi separado em `src/data/horariosOnibus-registros.json`. O formato tem uma viagem por data, empresa, destino e horário; classes da mesma partida ficam agrupadas.
- A página abre na data atual de São Paulo, oferece a próxima data com partidas futuras conferidas e permite acessar consultas antigas explicitamente. Links compartilháveis preservam data, destino e empresa.
- `getUpcomingBusDepartures` exclui partidas passadas e conferências com mais de sete dias. `getBusCoverage` descreve a cobertura da data e do destino escolhidos, sem confundir ausência de consulta com inexistência de ônibus.
- `OnibusAdmin` permite abrir o arquivo publicado ou um JSON local, editar, validar e baixar para revisão. O painel informa claramente que baixar não publica.
- O importador valida antes de escrever e mostra quantos registros existentes seriam removidos. `--apply` substitui somente o arquivo local versionado. Não há escrita de banco nem cron novo.

## Fontes e observações

Consulta pública pelo navegador, sem login, compra, seleção de assento, contratação ou coleta automatizada recorrente:

| Destino | Evidência para 2026-11-04 |
|---|---|
| [Goiânia](https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-11-04) | Marly 08:00/11:00/13:30/19:30, União 13:15, Real Expresso 15:35. A Real chega 17:10 e passa por Bela Vista de Goiás 16:20. Itinerários da Real e da Marly 08:00 confirmaram embarque na Rua Cônego Olinto. Os demais registros não receberam essa confirmação por extrapolação. |
| [Caldas Novas](https://www.clickbus.com.br/onibus/piracanjuba-go/caldas-novas-go?departureDate=2026-11-04) | Marly 08:15/13:00/16:00/19:00, União 09:15, Real Expresso 12:10. Marly convencional e leito compartilham os mesmos horários nesta data. |
| [Uberlândia](https://www.clickbus.com.br/onibus/piracanjuba-go/uberlandia-mg?departureDate=2026-11-04) | Duas opções com Marly 08:00 ou 11:00 até Goiânia, chegada 09:30 ou 12:30, conexão União 17:00, chegada 23:00. São trajetos longos com espera, identificados como conexão. Seleção parcial entre as ofertas. |
| [Araguari Menegon](https://www.clickbus.com.br/onibus/piracanjuba-go/araguari-menegon-mg?departureDate=2026-11-04) | A fonte apresentou uma opção União 09:15 a 13:55, mas o detalhe repetiu esses dois horários em ambos os trechos de Caldas Novas. Os horários de conexão são inconsistentes. Não importada como viagem conferida, preservados o link de consulta e os registros históricos. |

Mudança importante observada: Real Expresso para Goiânia passou, nesta consulta, de 15:50 a 17:30 no registro de setembro para 15:35 a 17:10 na data 2026-11-04. Isso confirma que a amostra histórica não deve virar tabela recorrente.

Os telefones da [agência União](https://www.expressouniao.com.br/pontos-de-venda/) continuam publicados como (64) 3405-1306 e (64) 3405-5803. O SAC [Guanabara](https://viajeguanabara.com.br/horarios-e-guiches/) continua 0800 728 1992.

Limites: consulta comercial por data, sem garantia de inventário completo, disponibilidade de assentos ou repetição futura. Araguari depende de confirmação dos trechos. API de parceiros e quadro local contínuo continuam exigindo fornecimento autorizado pela fonte. Não foi criada uma integração recorrente com endpoints privados de venda.

## Manutenção

1. Conferir data, horário local, empresa, destino, embarque e conexões diretamente na fonte. ANTT/AGR podem informar partida de outra cidade, não o horário de passagem em Piracanjuba.
2. Abrir o arquivo publicado no painel de manutenção. Manter históricos e substituir os registros corrigidos ou cancelados. Não duplicar partidas pela classe de assento.
3. Usar `checkedAt` real e uma fonte que corresponda à data da viagem. A validação limita a conferência a sete dias antes da viagem; isso é uma regra editorial de revisão, não promessa da operadora.
4. Validar e baixar o arquivo. No repositório, executar `node scripts/import-bus-schedules.mjs caminho/do/arquivo.json` para conferir sem escrever.
5. Revisar fontes e remoções informadas. Executar o mesmo comando com `--apply`, conferir `git diff`, rodar os testes de ônibus e os checks do projeto e publicar pelo fluxo normal de revisão.
6. Rollback: restaurar o JSON anterior pelo Git e publicar uma reversão. O importador não altera banco, preferências dos visitantes ou histórico Git.

## Validação executada

- `node --test tests/bus-schedules.test.ts`: 19 testes aprovados.
- `node scripts/import-bus-schedules.mjs src/data/horariosOnibus-registros.json`: 33 viagens válidas, zero remoções, sem escrita.
- Cobertura: timezone, data estrita sem recorrência, partidas expiradas, filtros, links, integridade das fontes, validação de importação, duplicatas, duração e conexões.
- Tipos, lint, build e smoke de navegador ficam integrados à validação global da entrega pelo agente principal.
