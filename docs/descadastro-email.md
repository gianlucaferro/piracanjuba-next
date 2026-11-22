# Descadastro dos convites comerciais

O link individual em `/descadastro/<token>` usa 32 bytes aleatórios em base64url sem preenchimento. GET exibe a confirmação. HEAD retorna 200 com o cabeçalho `X-Subscription-Status` igual a `subscribed` ou `unsubscribed`. POST com o formulário `List-Unsubscribe=One-Click` registra a baixa. O aplicativo de e-mail usa a mesma URL HTTPS nos cabeçalhos da RFC 8058 e o visitante pode confirmar pelo botão do rodapé do e-mail.

## Antes de cada campanha

Conferir a lista de baixas também ao importar destinatários em Broadcasts ou em outro provedor. O registro no portal vale para todos os convites comerciais. O status do provedor deve ser consultado em conjunto. Quando qualquer uma das listas indicar baixa, excluir o endereço. Suspender a importação se a consulta estiver indisponível.

O Supabase do portal mantém o bucket privado `email-descadastros`. Para conferir um lote independente dos tokens, executar esta leitura autenticada no projeto e exportar apenas os hashes para o processamento interno.

```sql
select substring(name from '^baixas/([a-f0-9]{64})[.]json$') as email_sha256
from storage.objects
where bucket_id = 'email-descadastros'
  and name ~ '^baixas/[a-f0-9]{64}[.]json$';
```

Normalizar cada e-mail com `email.trim().toLowerCase()`, calcular SHA-256 em UTF-8 e converter em hexadecimal minúsculo antes de comparar. Conferir também as baixas de campanhas previamente agendadas antes de reutilizar seus públicos. A consulta via HEAD requer o token original e não enumera a lista.

## Registro e manutenção

A Edge Function `descadastro-email` usa a chave de serviço injetada pelo Supabase. O manifesto privado em `cadastro/v1.json` associa o hash do token ao hash do e-mail. Para um novo lote, um administrador acrescenta ao manifesto os pares novos preservando os anteriores. Manter cópia privada do manifesto anterior e confirmar o total de registros após a gravação. Tokens originais e endereços ficam nos materiais restritos da operação. Usar o painel ou a API autenticada do Storage para gerenciar os objetos. A data da primeira baixa consta em `created_at` do objeto.

O endpoint permanece disponível para links emitidos. Antes da liberação de uma alteração, testar o fluxo completo com um endereço fictício. Caso haja regressão, recuperar a última versão funcional da Edge Function ou da rota do site e preservar o bucket para respeitar todas as baixas já registradas.
