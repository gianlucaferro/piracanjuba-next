# Prévias comerciais do Zap PBA

O catálogo editorial de `src/data/previas-zap.json` alimenta as páginas em `/zap-pba/<slug>`. Cada endereço abre sem login, traz os contatos do estabelecimento, inclui um cartão para WhatsApp e declara `noindex, nofollow`. O portal mantém as páginas contratadas no catálogo de empresas da raiz do domínio.

## Atualização e retirada

Localize a ficha pelo slug. Edite somente informações conferidas e preserve o endereço já compartilhado. Cada ficha define a imagem, a marca quando disponível e os contatos que podem ser exibidos. As fotos de contexto ficam em `public/marcas-zap/setores`. Fotos da empresa ficam em `fotos` e têm descrição própria.

Quando o responsável pedir a retirada, retire a ficha do JSON e apague o JPEG correspondente em `public/marcas-zap/compartilhar`. Remova a imagem de marca ou a foto da empresa se nenhuma outra ficha a usar. Registre a decisão no controle privado antes de uma nova rodada de pesquisa. Após o deploy, confira o HTTP 404 da página e do cartão. As plataformas de mensagens podem manter cópias de prévias já compartilhadas em seu próprio cache.

O link de ajuste e remoção abre uma conversa com o comercial do Piracanjuba.ai. A ação de atendimento da empresa abre o número da própria ficha. O diretório existente continua com os respectivos links originais.

## Publicação inicial

A versão de produção anterior à inclusão das prévias é o commit `983de0f78ff7612d13e24f1e20dcc8b7db11f0e0`, deploy Vercel `dpl_23547SPT8mkDDt4NoTdtEwRyYGQC`. O rollback isolado consiste em reverter o merge que introduz o catálogo. Para a reversão imediata do deploy, promover a versão anterior na Vercel após verificar se houve outra publicação. A implementação usa arquivos do repositório e dispensa escritas no Supabase.

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
