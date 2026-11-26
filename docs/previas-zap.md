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

## Atendimento e personalização da prévia

O botão principal usa o primeiro telefone da empresa. Os campos opcionais `acao` e `mensagem` definem o nome do botão e a pergunta inicial. A página oferece ao proprietário um contato separado com a equipe do portal. A mensagem de personalização identifica a empresa e inclui o endereço exato da prévia. O rodapé dá acesso ao pedido de ajuste ou retirada.

Toda ficha `/zap-pba/<slug>` tem no topo, entre a barra "Guia Zap PBA" e o nome da empresa, a faixa do proprietário (decisão do operador em 2026-11-26): "É proprietário desta empresa e quer deixar esta página mais profissional e completa, com cara de site? Clique aqui". O link abre o WhatsApp comercial (`WHATSAPP_COMERCIAL`) com a mensagem "Olá, Gianluca. Vim pelo Piracanjuba.ai, minha empresa é <nome da ficha>.". A faixa leva `data-nosnippet`, para a frase de venda não virar a descrição da empresa no Google, e não aparece nas landings contratadas, que têm rota própria na raiz. A lista `/zap-pba` não tem a faixa.

A versão anterior à auditoria comercial está no commit `45c8c4238ba204fd2a819377f493495241798078`, deploy Vercel `dpl_8mFnwD89AsdWpUnJEh3MVUa1G1ns`. Para reverter apenas a auditoria, reverta o merge correspondente no Git. Confira o diretório, o sitemap, o cartão de compartilhamento e os destinos dos links de uma ficha após a reversão.

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
- [acai](https://www.pexels.com/pt-br/foto/deliciosa-tigela-de-acai-com-colher-em-fundo-branco-36457776/)
- [alimentos-naturais](https://www.pexels.com/photo/grains-and-seeds-in-glass-jars-and-on-bowls-7421448/)
- [ar-condicionado-automotivo](https://www.pexels.com/photo/air-conditioning-dashboard-in-car-6074540/)
- [ar-condicionado-de-parede](https://www.pexels.com/photo/wall-mounted-air-conditioner-in-modern-interior-38788452/)
- [avicultura](https://www.pexels.com/photo/hens-in-the-chicken-coop-19972937/)
- [banho-e-tosa](https://www.pexels.com/photo/close-up-photo-of-a-dog-being-groomed-6816850/)
- [bolos-e-doces](https://www.pexels.com/photo/brazilian-birthday-celebration-with-cake-and-brigadeiros-30464368/)
- [bordado-no-bastidor](https://www.pexels.com/photo/detailed-floral-embroidery-on-wooden-hoop-35617658/)
- [brinquedos-educativos](https://www.pexels.com/photo/colorful-wooden-toys-on-the-table-8923982/)
- [buque-de-flores](https://www.pexels.com/photo/elegant-floral-bouquet-with-pastel-wrapping-35587893/)
- [campo-goiano](https://www.pexels.com/photo/rural-landscape-at-sunrise-18473297/)
- [celular-em-exposicao](https://www.pexels.com/photo/modern-smartphone-display-in-retail-environment-41075739/)
- [chaves-de-imovel](https://www.pexels.com/photo/miniature-model-houses-with-keys-on-desk-33305177/)
- [comida-caseira](https://www.pexels.com/pt-br/foto/refeicao-deliciosa-com-frango-e-feijao-34110275/)
- [controle-de-videogame](https://www.pexels.com/photo/buttons-and-an-analog-stick-of-a-gamepad-4235364/)
- [copos-de-bar](https://www.pexels.com/photo/empty-glasses-on-table-25858429/)
- [cortinas](https://www.pexels.com/photo/see-through-curtains-on-a-window-12106036/)
- [costura-na-maquina](https://www.pexels.com/photo/closeup-photography-of-presser-foot-of-sewing-machine-821735/)
- [cuidado-auditivo](https://www.pexels.com/photo/a-patient-having-ear-examination-5206951/)
- [decoracao-de-festa](https://www.pexels.com/photo/decorated-room-for-birthday-14457438/)
- [design-de-sobrancelhas](https://www.pexels.com/photo/mascara-applicator-3762664/)
- [doce-caseiro](https://www.pexels.com/photo/close-up-of-homemade-fruit-jam-in-jar-6588481/)
- [donuts](https://www.pexels.com/photo/closeup-photo-of-doughnuts-1191639/)
- [drone-no-campo](https://www.pexels.com/photo/a-drone-above-a-field-21364323/)
- [ervas-e-chas](https://www.pexels.com/photo/dry-herbs-in-bowls-and-wooden-spoon-8329291/)
- [espetinhos-na-brasa](https://www.pexels.com/photo/delicious-brazilian-bbq-skewers-on-grill-37275110/)
- [exercicio-em-fisioterapia](https://www.pexels.com/photo/a-woman-doing-therapy-5793792/)
- [faixa-e-bola](https://www.pexels.com/photo/flat-lay-of-fitness-equipment-on-white-surface-36717697/)
- [filtro-automotivo](https://www.pexels.com/photo/air-filter-in-close-up-photography-11074558/)
- [frango-assado](https://www.pexels.com/photo/succulent-roasted-chicken-with-vegetables-31233881/)
- [frutas-e-legumes](https://www.pexels.com/photo/overhead-shot-of-various-fruits-and-vegetables-6462424/)
- [implemento-agricola](https://www.pexels.com/photo/tractor-on-a-agricultural-field-4093910/)
- [impressao-3d](https://www.pexels.com/photo/objects-manufactured-by-3d-printer-20688553/)
- [lanche-na-mesa](https://www.pexels.com/pt-br/foto/big-hamburguer-34235937/)
- [madeira-e-plaina](https://www.pexels.com/photo/vintage-hand-plane-on-carpentry-workbench-38853401/)
- [marcenaria-planejada](https://www.pexels.com/photo/interior-of-minimalist-kitchen-with-wooden-furniture-and-island-7147286/)
- [marmita-brasileira](https://www.pexels.com/photo/delicious-homemade-meal-with-grilled-chicken-30635706/)
- [massoterapia](https://www.pexels.com/photo/cozy-spa-massage-table-with-candle-and-decor-35884499/)
- [moda-country](https://www.pexels.com/photo/casual-denim-and-boots-outdoor-style-30360337/)
- [moda-praia](https://www.pexels.com/photo/women-wearing-same-swimwear-8733071/)
- [pao-sirio](https://www.pexels.com/photo/close-up-photo-of-pita-breads-6419753/)
- [pastagem-tropical](https://www.pexels.com/photo/cows-grazing-on-green-pasture-field-17291136/)
- [pastel-de-feira](https://www.pexels.com/photo/close-up-of-pastel-frying-in-a-pan-24962986/)
- [pedras-naturais](https://www.pexels.com/photo/detailed-stone-wall-texture-background-35629790/)
- [pintura-com-rolo](https://www.pexels.com/photo/person-painting-wall-with-paint-roller-6764289/)
- [pizza-na-mesa](https://www.pexels.com/photo/homemade-pizza-against-wooden-boards-24786266/)
- [pneus-e-rodas](https://www.pexels.com/photo/stack-of-car-tires-in-an-automotive-garage-34357287/)
- [polimento-de-pintura](https://www.pexels.com/photo/a-person-polishing-the-white-car-5233279/)
- [poltronas-para-conversa](https://www.pexels.com/photo/cozy-minimalist-interior-with-natural-light-36962663/)
- [quibes](https://www.pexels.com/photo/appetizing-kibbeh-and-croquettes-platter-on-table-34529935/)
- [quitandas-na-cesta](https://www.pexels.com/photo/delicious-brazilian-pao-de-queijo-in-basket-37778433/)
- [roupa-para-treino](https://www.pexels.com/photo/a-woman-wearing-sports-bra-and-pink-leggings-11121629/)
- [roupas-infantis](https://www.pexels.com/photo/children-s-fashion-clothing-on-unique-hangers-28907988/)
- [salgados](https://www.pexels.com/pt-br/foto/lanche-petisco-aperitivo-frito-17409458/)
- [sucos-e-frutas](https://www.pexels.com/photo/sliced-fruits-and-glasses-of-fruit-juice-4871113/)
- [sushi](https://www.pexels.com/photo/plate-with-sushi-rolls-near-chopsticks-7245465/)
- [tapioca](https://www.pexels.com/pt-br/foto/delicioso-crepe-de-tapioca-com-morangos-e-chocolate-37050195/)
- [textil-para-o-lar](https://www.pexels.com/photo/towels-in-a-store-20665616/)
- [torno-mecanico](https://www.pexels.com/photo/closeup-of-making-a-brass-part-on-a-lathe-8327959/)
- [trabalho-em-vidro](https://www.pexels.com/photo/a-person-glass-cutting-7219193/)
- [trator-azul](https://www.pexels.com/photo/aerial-photo-of-a-blue-new-holland-ford-8240-tractor-cutting-a-hedge-with-a-mcconnel-on-farm-in-uk-co-antrim-northern-ireland-30-10-22-14248085/)
- [xicara-e-doce](https://www.pexels.com/photo/a-coffee-and-a-slice-of-cake-on-the-table-17671395/)
