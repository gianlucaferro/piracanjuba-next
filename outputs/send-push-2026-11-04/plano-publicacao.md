# Publicação seletiva do send-push

Data: 2026-11-04. Projeto: Piracanjuba.ai, Supabase `oinweocqcptwxqsztlcl`.

Autorização: o operador solicitou recuperar o código e aplicar as correções de segurança, preservando notificações. A publicação das funções integra esse escopo. Não há migration, SQL de escrita, restart, alteração de agendamentos ou mudança de credenciais.

## Ordem e verificação

1. Recuperar o ESZIP e confirmar a fonte original. Concluído, fonte idêntica ao arquivo local anterior às correções.
2. Validar autenticação, importações, fanout, transporte e criptografia sintética no Dell. Conferir os resultados dos testes, não apenas o exit do wrapper de coleta.
3. Publicar `sync-prefeitura-diaria`, `sync-prefeitura-mensal`, `import-folha-manual` e `import-folha-xlsx` antes de `send-push`. Os novos chamadores já funcionam com o destinatário antigo durante a transição.
4. Preservar `verify_jwt` em cada função. As dependências legadas de identidade/persistência são incluídas com os mesmos bytes do backup remoto. `build-send-push-bundle.py` constrói somente os cinco pacotes permitidos.
5. Conferir readback integral de cada pacote. Executar somente requisições negativas, OPTIONS e POST autenticado com `dry_run:true`. No send-push, `check_config:true` valida os formatos VAPID sem banco, criptografar mensagem ou chamar provedor.
6. Comparar as demais funções, os 85 agendamentos e os hashes agregados das inscrições. Conferir rotas públicas sem login, escrita ou coleta.

## Backup e reversão

O código original, versões, flags JWT e hashes estão em `live-backup/` e `callers-backup/manifest.json`. O ESZIP original é preservado integralmente. As fontes originais dos cinco destinatários permitem reconstruir o estado anterior sem depender de downloads futuros.

O retorno à fonte antiga de send-push reabriria a ausência de autenticação. Por isso, diante de uma regressão, a primeira medida é corrigir a função mantendo a barreira de autenticação. Não realizar reversão automática para a implementação pública vulnerável. Se uma reversão de negócio for indispensável, preservar a autenticação nova e o uso de service_role nos chamadores, revisar o pacote concreto e validar o diagnóstico antes de substituir a versão ativa. Nenhum dado, inscrição ou chave VAPID precisa ser removido ou rotacionado nesta publicação.

## Limites da etapa

O máximo de 200 destinatários é admissão por chamada. Acima disso, a função recusa antes de qualquer envio, sem truncar silenciosamente a audiência. Existem limites de 5 segundos por transporte e concorrência de 20. Não há garantia de prazo global de 50 segundos, quota diária ou orçamento financeiro absoluto.

A deduplicação legada continua sendo consulta seguida de registro, sem atomicidade entre isolates. O cadastro público de inscrições ainda precisa de uma etapa própria de quota e proteção de escrita no banco. As novas barreiras limitam o consumo do envio, mas não substituem a proteção do cadastro. Não foram enviadas notificações reais para testar o serviço.
