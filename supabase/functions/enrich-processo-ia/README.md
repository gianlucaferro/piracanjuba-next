# enrich-processo-ia

Enriquece processos judiciais visiveis (filtrados pela view processo_publico) com:

1. **Movimentacoes** — pega top 50 da Escavador (`/processos/numero_cnj/{cnj}/movimentacoes`)
2. **Sentenca** — detecta percorrendo `classificacao_predita.hierarquia` das movimentacoes em busca de termos como `sentença`, `julgamento`, `trânsito em julgado`
3. **Status_predito** — extrai de `raw_payload.fontes[0].status_predito` (ATIVO/INATIVO)
4. **Resumo IA** — gera via Gemini 2.5 Flash Lite (~3-6 frases em PT-BR acessivel, com fallback compact se prompt grande falhar)

Salva tudo em `processo_judicial` (`resumo_ia`, `tem_sentenca`, `sentenca_resumo`, `movimentacao_recente`, `status_predito`, `quantidade_movimentacoes`, `resumo_ia_modelo`, `resumo_ia_gerado_em`).

## Invocacao

```bash
INGEST=$(op read 'op://Dev/Centi Ingest Secret - Piracanjuba.Ai/credential')

# Processar ate 20 visiveis sem resumo (default)
curl -X POST "https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/enrich-processo-ia" \
  -H "x-centi-ingest-secret: $INGEST" \
  -H "Content-Type: application/json" \
  -d '{"limit": 20}'

# Forcar re-processamento de um ID especifico
curl -X POST "https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/enrich-processo-ia" \
  -H "x-centi-ingest-secret: $INGEST" \
  -H "Content-Type: application/json" \
  -d '{"processo_id": "uuid", "force": true}'

# Re-processar TODOS visiveis (force=true ignora filtro de resumo_ia IS NULL)
curl -X POST "https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/enrich-processo-ia" \
  -H "x-centi-ingest-secret: $INGEST" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50, "force": true}'
```

## Quotas Gemini (free tier)

- `gemini-2.5-flash-lite`: 15 RPM / 1000 RPD ← **usado hoje**
- `gemini-2.5-flash`: 10 RPM / 250 RPD
- `gemini-2.5-pro`: 5 RPM / 100 RPD

A funcao respeita 15 RPM via `setTimeout(4500ms)` entre chamadas. Cada batch de 20 leva ~95s. O limite de wall-time da edge function Supabase e ~150s — nao passar de `limit: 25`.

Quota diaria reseta meia-noite UTC.

## Completar pendentes apos quota resetar

```bash
INGEST=$(op read 'op://Dev/Centi Ingest Secret - Piracanjuba.Ai/credential')

# Loop ate todos os pendentes serem processados
while true; do
  RESP=$(curl -sS -X POST "https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/enrich-processo-ia" \
    -H "x-centi-ingest-secret: $INGEST" \
    -H "Content-Type: application/json" \
    -d '{"limit": 20}' --max-time 200)
  OK=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(1 for x in d['detalhes'] if x.get('resumo_ok')))")
  TOTAL=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['total_consultados'])")
  echo "Batch: $OK/$TOTAL sucesso"
  [ "$TOTAL" = "0" ] && break
  sleep 5
done
```

## Schema Gemini API (notas)

- **thinkingConfig.thinkingBudget: 0** — DESLIGA o modo "thinking" do Gemini 2.5. Sem isso, ele consome `maxOutputTokens` em tokens de raciocinio interno e nao sobra pra texto visivel (resumos saiam com 30-60 chars truncados).
- **maxOutputTokens: 1024** — margem ampla pra resumos de 80-130 palavras.
- **temperature: 0.3** — factual, pouca variacao.
- **safetySettings: BLOCK_ONLY_HIGH** — permite descrever processos criminais sem bloqueio agressivo.
