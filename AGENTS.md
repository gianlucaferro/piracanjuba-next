<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## IndexNow no Piracanjuba.ai

Sempre que adicionar ou atualizar uma página no Piracanjuba.ai, envie a URL canônica ao IndexNow logo após a publicação em produção. Acompanhe o job `indexnow` do workflow `Production smoke` e confira no log a URL e a resposta HTTP 200 ou 202. Se o envio falhar, recupere a execução da implantação conforme [o procedimento do IndexNow](scripts/indexnow/README.md). Se alguma URL ficar pendente, use o disparo manual apenas para as URLs ainda sem aceite.
