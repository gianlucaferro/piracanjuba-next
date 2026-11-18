# Prévias comerciais do Zap PBA

O catálogo editorial de `src/data/previas-zap.json` alimenta as páginas em `/zap-pba/<slug>`. Cada endereço abre sem login, traz os contatos do estabelecimento, inclui um cartão para WhatsApp e pode ser indexado pelos buscadores. O sitemap inclui os slugs ativos e o diretório oferece um link de detalhes em cada cadastro associado. Vitorino Perfumes mantém sua página em `/vitorinoperfumes` e Apareça.ai em `/apareca`. O portal mantém as páginas contratadas no catálogo de empresas da raiz do domínio.

## Atualização e retirada

Localize a ficha pelo slug. Use `atividade` para o ramo, `resumo` para a descrição factual e `detalhe` quando houver informação complementar. Em cadastros com pouca informação, um resumo curto basta. Edite somente informações conferidas e preserve o endereço já compartilhado. Cada ficha define a imagem, a marca quando disponível e os contatos que podem ser exibidos. As fotos de contexto ficam em `public/marcas-zap/setores`. Fotos da empresa ficam em `fotos` e têm descrição própria.

Quando o responsável pedir a retirada, retire a ficha do JSON e apague o JPEG correspondente em `public/marcas-zap/compartilhar`. Remova a imagem de marca ou a foto da empresa se nenhuma outra ficha a usar. Registre a decisão no controle privado antes de uma nova rodada de pesquisa. Desvincule os IDs do cadastro em `src/data/zap-pba-paginas.json`. Após o deploy, confira o HTTP 404 da página e do cartão, a ausência da URL no sitemap e a ausência do link de detalhes no diretório. Use o envio manual do workflow Production smoke para notificar o IndexNow da URL retirada. As plataformas de mensagens podem manter cópias de prévias já compartilhadas em seu próprio cache.

O link de ajuste e remoção abre uma conversa com o comercial do Piracanjuba.ai. A ação de atendimento da empresa abre o número da própria ficha. O botão de WhatsApp do diretório e o link para os detalhes da empresa têm destinos próprios.

## Publicação inicial

A versão de produção anterior à inclusão das prévias é o commit `983de0f78ff7612d13e24f1e20dcc8b7db11f0e0`, deploy Vercel `dpl_23547SPT8mkDDt4NoTdtEwRyYGQC`. O rollback isolado consiste em reverter o merge que introduz o catálogo. Para a reversão imediata do deploy, promover a versão anterior na Vercel após verificar se houve outra publicação. A implementação usa arquivos do repositório e dispensa escritas no Supabase.

## Rollback do refinamento

O estado anterior ao refinamento está no commit `8a876593d82f545ad8698c4708ea9b81b735ccf3`, deploy Vercel `dpl_5JP3a8Dc8QiZQUnzzRvMwjXd2ryd`. Em caso de regressão imediata, promova esse deploy após conferir que continua sendo o antecedente correto. Para manter publicações posteriores, reverta somente o merge do refinamento pelo Git. O deploy anterior volta a servir as prévias com a configuração original de indexação. Confira o sitemap, o diretório, o contato e o status de uma ficha na versão restaurada.

## Fotografias de contexto

Licença de uso das fotografias em [Pexels](https://www.pexels.com/license/).

- [moda](https://www.pexels.com/photo/close-up-of-folded-clothes-10348923/)
- [artesanato](https://www.pexels.com/photo/knitting-needles-on-yarns-5660230/)
- [farmacia](https://www.pexels.com/photo/assorted-pharmaceutical-pills-and-blister-packs-29110700/)
- [barbearia](https://www.pexels.com/photo/scissors-and-hairbrushes-at-the-hairdressers-16660028/)
- [mercado](https://www.pexels.com/photo/a-person-holding-brown-basket-with-vegetables-7879858/)
- [construcao](https://www.pexels.com/photo/measuring-tape-on-wooden-table-5973892/)
- [maquiagem](https://www.pexels.com/photo/a-close-up-shot-of-an-eye-shadow-makeup-and-brushes-7712441/)
- [escola](https://www.pexels.com/photo/opened-book-and-black-pen-942873/)
- [escritorio](https://www.pexels.com/photo/notepad-and-a-laptop-on-wooden-table-5827830/)
- [pet](https://www.pexels.com/photo/a-portrait-of-a-little-cat-and-dog-16440218/)
- [tecnologia](https://www.pexels.com/photo/close-up-of-laptop-cooling-system-components-33792045/)
- [decoracao](https://www.pexels.com/photo/cozy-modern-armchair-in-minimalist-living-room-29508374/)
- [direito](https://www.pexels.com/photo/justice-scales-and-gavel-on-wooden-surface-5668882/)
- [saude](https://www.pexels.com/photo/stethoscope-and-notebook-on-desk-5407238/)
- [mesa](https://www.pexels.com/photo/close-up-of-cutlery-on-plate-on-table-15813614/)
- [cozinha](https://www.pexels.com/photo/photo-of-flour-near-rolling-pin-3363852/)
- [joias](https://www.pexels.com/photo/close-up-photo-of-a-necklace-4741611/)
- [academia](https://www.pexels.com/photo/close-up-shot-of-a-barbell-6389516/)
- [manicure](https://www.pexels.com/photo/containers-of-nail-polish-15850945/)
- [sementes](https://www.pexels.com/photo/dried-wheat-in-close-up-photography-6412636/)
- [plantas](https://www.pexels.com/photo/watering-can-beside-a-plant-6261869/)
- [viagem](https://www.pexels.com/photo/globe-beside-a-passport-7009465/)
- [piscina](https://www.pexels.com/photo/serene-pool-water-surface-with-sunlit-ripples-34346989/)
- [papelaria](https://www.pexels.com/photo/colored-pencils-beside-a-notebook-6193654/)
- [sorvete](https://www.pexels.com/photo/close-up-shot-of-an-ice-cream-7761737/)
- [celulares](https://www.pexels.com/photo/smartphone-repair-tools-on-a-workbench-31862953/)
- [otica](https://www.pexels.com/photo/photography-of-eyeglasses-on-top-of-book-831430/)
- [oficina](https://www.pexels.com/photo/assorted-hand-tools-on-the-table-14383512/)
- [encomendas](https://www.pexels.com/photo/brown-cardboard-boxes-inside-a-delivery-van-7843987/)
- [taxi](https://www.pexels.com/photo/taxi-sign-on-car-roof-11171626/)
- [lavagem-automotiva](https://www.pexels.com/photo/a-car-covered-with-soap-foam-in-a-garage-14677028/)
- [seguranca](https://www.pexels.com/photo/cctv-camera-on-a-wall-25384403/)
- [odontologia](https://www.pexels.com/photo/a-close-up-shot-of-dental-medical-instruments-on-a-silver-tray-6627669/)
- [calcados](https://www.pexels.com/photo/shoes-on-a-shoe-rack-in-a-store-17568001/)
- [chocolate](https://www.pexels.com/photo/close-up-of-a-box-of-chocolate-pralines-19863265/)
- [laboratorio](https://www.pexels.com/photo/test-tubes-with-samples-on-a-rack-9259981/)
- [agro](https://www.pexels.com/photo/close-up-of-brown-cow-in-lush-green-field-31898399/)
- [acessorios](https://www.pexels.com/photo/smartphone-charging-port-and-charger-usb-connector-4195332/)
- [ambiental](https://www.pexels.com/photo/close-up-of-green-fern-leaf-in-forest-34417868/)
- [areia](https://www.pexels.com/photo/tennis-ball-on-sandy-beach-with-distant-figures-33128448/)
- [bateria](https://www.pexels.com/photo/close-up-photo-of-car-s-battery-4374843/)
- [capina](https://www.pexels.com/photo/a-person-using-a-hoe-25190741/)
- [cilios](https://www.pexels.com/photo/professional-eyelash-extension-application-close-up-29877726/)
- [climatizacao](https://www.pexels.com/photo/close-up-shot-of-car-air-vents-4956901/)
- [depilacao](https://www.pexels.com/photo/pink-hard-wax-beads-for-hair-removal-15577126/)
- [eletrica](https://www.pexels.com/photo/electric-instrument-for-electrical-measurements-in-workshop-4398314/)
- [eletronica](https://www.pexels.com/photo/close-up-of-circuit-board-with-tools-35652379/)
- [embalagem](https://www.pexels.com/photo/corrugated-cardboard-boxes-28316095/)
- [entulho](https://www.pexels.com/photo/pile-of-brick-on-construction-site-15325569/)
- [escavacao](https://www.pexels.com/photo/industrial-excavator-digging-at-construction-site-34422183/)
- [estetica](https://www.pexels.com/photo/rolled-towels-on-the-wooden-table-6186752/)
- [eventos](https://www.pexels.com/photo/elegant-floral-table-setting-for-event-decor-29098325/)
- [fotografia](https://www.pexels.com/photo/close-up-of-a-dslr-camera-on-wooden-table-33154250/)
- [gas](https://www.pexels.com/photo/gas-stove-3722212/)
- [impressao](https://www.pexels.com/photo/industrial-printer-in-workshop-6620993/)
- [lavadora](https://www.pexels.com/photo/close-up-of-washing-machine-8774382/)
- [motocicleta](https://www.pexels.com/photo/close-up-photo-of-a-motorbike-tire-and-parts-12164177/)
- [motor](https://www.pexels.com/photo/a-car-engine-bay-10866842/)
- [persianas](https://www.pexels.com/photo/a-blinds-on-the-window-9892905/)
- [pintura](https://www.pexels.com/photo/roller-and-brush-placed-on-paint-tray-5691707/)
- [sobrancelhas](https://www.pexels.com/photo/close-up-of-a-person-in-a-rubber-glove-holding-a-set-of-tools-for-eyebrow-shaping-20379364/)
- [som](https://www.pexels.com/photo/black-twitter-speaker-128611/)
- [tenda](https://www.pexels.com/photo/steel-column-supporting-the-cover-10817713/)
