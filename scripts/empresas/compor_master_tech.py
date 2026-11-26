"""Imagens da página da Master Tech Auto Center (piracanjuba.ai/master-tech-auto-center).

- Fotos reais publicadas pela própria oficina no Perfil da Empresa no Google
  (capturas de setembro de 2025): fachada, oficina, sala de espera, recepção e
  sala de atendimento. Só recorte e redução, sem retoque.
- Logo vetorial enviado pelo operador em 2026-11-25, já otimizado em
  public/empresas/master-tech-auto-center/logo.svg (coordenadas com uma casa
  decimal e contorno creme fino que cobre o halo prata da vetorização).
- Cartão de compartilhamento 1200x630: fachada real à esquerda, logo e frase em
  Zilla Slab (arquivo da Google Fonts, licença OFL) no painel creme.

Gerou os arquivos de public/empresas/master-tech-auto-center/ em 2026-11-25.
Uso: uv run --with pillow --with resvg-py python compor_master_tech.py <fotos> <logo.svg> <fontes> <saida>
"""

import io
import os
import sys

import resvg_py
from PIL import Image, ImageDraw, ImageFont

FOTOS, LOGO_SVG, FONTES, SAIDA = sys.argv[1:5]
os.makedirs(SAIDA, exist_ok=True)

CREME = (255, 249, 233)  # #fff9e9, a faixa do logo
LARANJA = (250, 130, 6)  # #fa8206, o anel do logo
PRETO = (13, 13, 13)
TINTA_LARANJA = (166, 77, 0)  # laranja escurecido, legível sobre o creme


def abrir(nome):
    return Image.open(os.path.join(FOTOS, nome)).convert("RGB")


def recortar(img, proporcao, centro_y, centro_x=0.5):
    """Recorte na proporção largura/altura, centrado na fração indicada da foto."""
    larg, alt = img.size
    if larg / alt > proporcao:
        nova_l, nova_a = round(alt * proporcao), alt
    else:
        nova_l, nova_a = larg, round(larg / proporcao)
    x = min(max(round(larg * centro_x - nova_l / 2), 0), larg - nova_l)
    y = min(max(round(alt * centro_y - nova_a / 2), 0), alt - nova_a)
    return img.crop((x, y, x + nova_l, y + nova_a))


def salvar_webp(img, nome, largura):
    altura = round(img.height * largura / img.width)
    img.resize((largura, altura), Image.LANCZOS).save(
        os.path.join(SAIDA, nome), "WEBP", quality=80, method=6
    )
    print(nome, largura, altura)


# Fotos da página: a fachada em 4:3 e as internas em 4:5, para a grade da galeria.
salvar_webp(recortar(abrir("fachada2.jpg"), 4 / 3, 0.53), "fachada.webp", 1600)
salvar_webp(recortar(abrir("oficina.jpg"), 4 / 5, 0.60), "oficina.webp", 1080)
salvar_webp(recortar(abrir("espera.jpg"), 4 / 5, 0.58), "espera.webp", 1080)
salvar_webp(recortar(abrir("recepcao.jpg"), 4 / 5, 0.56), "recepcao.webp", 1080)
salvar_webp(recortar(abrir("sala.jpg"), 4 / 5, 0.55), "sala.webp", 1080)

# Logo em PNG para o schema (Google pede formato rasterizável) e para o cartão.
svg = open(LOGO_SVG, encoding="utf-8").read()


def logo_png(lado):
    return Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_string=svg, width=lado)))).convert("RGBA")


logo512 = logo_png(512)
assert logo512.getpixel((2, 2))[3] == 0, "o logo deveria ter fundo transparente"
logo512.save(os.path.join(SAIDA, "logo-512.png"), optimize=True)

# Cartão de compartilhamento, desenhado em 2x e reduzido no fim.
E = 2
L, A = 1200 * E, 630 * E
cartao = Image.new("RGB", (L, A), CREME)
foto = recortar(abrir("fachada2.jpg"), 600 / 630, 0.5, 0.5).resize((600 * E, A), Image.LANCZOS)
cartao.paste(foto, (0, 0))
d = ImageDraw.Draw(cartao)
d.rectangle((600 * E, 0, 600 * E + 10 * E, A), fill=LARANJA)

logo = logo_png(330 * E)
centro = 600 * E + 10 * E + (L - 610 * E) // 2
cartao.paste(logo, (centro - logo.width // 2, 48 * E), logo)

titulo = ImageFont.truetype(os.path.join(FONTES, "ZillaSlab-Bold.ttf"), 54 * E)
linha = ImageFont.truetype(os.path.join(FONTES, "ZillaSlab-SemiBold.ttf"), 33 * E)
for texto, fonte, cor, y in (
    ("Oficina mecânica", titulo, PRETO, 418 * E),
    ("Centro de Piracanjuba, GO", linha, TINTA_LARANJA, 486 * E),
):
    largura = d.textlength(texto, font=fonte)
    d.text((centro - largura / 2, y), texto, font=fonte, fill=cor)
d.rectangle((600 * E + 10 * E, A - 16 * E, L, A), fill=PRETO)

cartao.resize((1200, 630), Image.LANCZOS).save(
    os.path.join(SAIDA, "compartilhar.jpg"), "JPEG", quality=86, optimize=True, progressive=True
)
print("compartilhar.jpg 1200 630")
