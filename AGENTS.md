<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## IndexNow no Piracanjuba.ai

Sempre que adicionar ou atualizar uma página no Piracanjuba.ai, envie a URL canônica ao IndexNow logo após a publicação em produção. Acompanhe o job `indexnow` do workflow `Production smoke` e confira no log a URL e a resposta HTTP 200 ou 202. Se o envio falhar, recupere a execução da implantação conforme [o procedimento do IndexNow](scripts/indexnow/README.md). Se alguma URL ficar pendente, use o disparo manual apenas para as URLs ainda sem aceite.

## Empresa recusou landing page

Quando o operador escrever "Empresa X recusou landing page", ou disser que a empresa não pagou a landing, rebaixe a página de marca para a ficha neutra do guia em `/zap-pba/<slug>`, só com dados públicos do negócio, sem logo, cor ou fotos da empresa. Na ficha rebaixada, o WhatsApp aparece só como número, sem link: o atalho de um toque é exclusivo de quem contratou a página. A lista do guia `/zap-pba` continua com o WhatsApp clicável. Faça isso sem perguntar de novo, seguindo [o procedimento](docs/empresa-recusou-landing.md). Se a empresa pagar depois, o operador avisa e a landing volta. Nunca ponha anúncio de concorrente na ficha nem redirecione o tráfego da marca para outra empresa. Se a empresa pedir remoção, retire a ficha conforme [as prévias do Zap PBA](docs/previas-zap.md).
