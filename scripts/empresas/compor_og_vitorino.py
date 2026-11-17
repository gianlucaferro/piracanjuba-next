"""Imagem de compartilhamento da Vitorino Perfumes (1200x630), só com material real.

- Logotipo raster original da marca, recortado do arquivo e nunca ampliado
  (desenho nativo de 328x113).
- Recorte real do decant de 10 ml (foto IMG_0539 da loja), só reduzido.
- Frase em Cormorant Garamond (arquivos da Google Fonts baixados pelo next/font),
  com o kerning do GPOS aplicado pelo HarfBuzz e o desenho feito pelo Pillow.

Gerou public/empresas/vitorinoperfumes/og.jpg em 2026-11-17. Os caminhos de LOGO e
DECANT são do computador do operador (acervo da marca); as fontes precisam estar na
pasta de trabalho. Uso: python3 compor_og_vitorino.py saida.jpg
"""

import sys

import uharfbuzz as hb
from PIL import Image, ImageDraw, ImageFilter, ImageFont

LOGO = "/Users/gianlucaferro/dev/codex/vitorino-carrosseis/assets/logo-completo-original.png"
DECANT = "/Users/gianlucaferro/dev/codex/vitorino-carrosseis/assets/decant/decant-10ml-recorte.png"
FONTE_REG = "cormorant-latin-regular.ttf"
FONTE_ITA = "cormorant-latin-italic.ttf"
SAIDA = sys.argv[1] if len(sys.argv) > 1 else "og.jpg"

L, A = 1200, 630
ESCALA = 2  # desenha em 2x e reduz no fim, para bordas limpas
W, H = L * ESCALA, A * ESCALA

TEXTO = (51, 40, 31)  # #33281f
DESTAQUE = (121, 84, 38)  # #795426
PRIMARIA = (103, 71, 29)  # #67471d


def radial(tamanho, centro, raio, cor_centro, cor_borda):
    """Gradiente radial elíptico simples (luz marfim para champanhe)."""
    larg, alt = tamanho
    camada = Image.new("RGBA", tamanho, cor_borda)
    mascara = Image.new("L", tamanho, 0)
    d = ImageDraw.Draw(mascara)
    passos = 120
    cx, cy = centro
    rx, ry = raio
    for i in range(passos, 0, -1):
        t = i / passos
        valor = int(255 * (1 - t) ** 1.4)
        d.ellipse((cx - rx * t, cy - ry * t, cx + rx * t, cy + ry * t), fill=valor)
    mascara = mascara.filter(ImageFilter.GaussianBlur(6 * ESCALA))
    frente = Image.new("RGBA", tamanho, cor_centro)
    camada.paste(frente, (0, 0), mascara)
    return camada


def texto_com_kerning(desenho, pos, frase, caminho, tamanho, peso, cor):
    """Escreve a frase letra a letra nas posições do HarfBuzz (kerning do GPOS)."""
    dados = open(caminho, "rb").read()
    face = hb.Face(dados)
    fonte_hb = hb.Font(face)
    fonte_hb.set_variations({"wght": peso})
    upem = face.upem
    buf = hb.Buffer()
    buf.add_str(frase)
    buf.guess_segment_properties()
    hb.shape(fonte_hb, buf, {"kern": True, "liga": False, "clig": False, "dlig": False})
    fonte = ImageFont.truetype(caminho, tamanho)
    fonte.set_variation_by_axes([peso])
    x, y = pos
    for info, posicao in zip(buf.glyph_infos, buf.glyph_positions):
        letra = frase[info.cluster]
        desenho.text(
            (x + posicao.x_offset * tamanho / upem, y - posicao.y_offset * tamanho / upem),
            letra,
            font=fonte,
            fill=cor,
            anchor="ls",
        )
        x += posicao.x_advance * tamanho / upem
    return x - pos[0]


def largura_frase(frase, caminho, tamanho, peso):
    dados = open(caminho, "rb").read()
    face = hb.Face(dados)
    fonte_hb = hb.Font(face)
    fonte_hb.set_variations({"wght": peso})
    buf = hb.Buffer()
    buf.add_str(frase)
    buf.guess_segment_properties()
    hb.shape(fonte_hb, buf, {"kern": True, "liga": False})
    return sum(p.x_advance for p in buf.glyph_positions) * tamanho / face.upem


def main():
    tela = radial((W, H), (int(W * 0.78), int(H * 0.18)), (W * 0.75, H * 1.1), (255, 250, 241, 255), (239, 227, 205, 255))
    # Base marfim por baixo do brilho, para o lado esquerdo ficar no tom do site.
    base = Image.new("RGBA", (W, H), (247, 242, 233, 255))
    base = Image.blend(base, tela, 0.75)
    tela = base

    # Arco à direita, como a mídia do topo da página.
    ax0, ay0 = int(828 * ESCALA), int(64 * ESCALA)
    aw, ah = int(304 * ESCALA), int(502 * ESCALA)
    luz = radial((aw, ah), (aw // 2, int(ah * 0.42)), (aw * 0.95, ah * 0.75), (255, 250, 242, 255), (230, 214, 186, 255))
    mascara = Image.new("L", (aw, ah), 0)
    dm = ImageDraw.Draw(mascara)
    raio_topo = aw // 2
    raio_base = int(20 * ESCALA)
    dm.ellipse((0, 0, aw, aw), fill=255)
    dm.rounded_rectangle((0, raio_topo, aw, ah), radius=raio_base, fill=255)
    dm.rectangle((0, raio_topo, aw, ah - raio_base), fill=255)

    # Sombra suave do arco, tingida da marca.
    sombra = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    msombra = Image.new("L", (W, H), 0)
    msombra.paste(mascara, (ax0, ay0 + int(26 * ESCALA)))
    msombra = msombra.filter(ImageFilter.GaussianBlur(26 * ESCALA)).point(lambda v: int(v * 0.32))
    sombra.paste(Image.new("RGBA", (W, H), TEXTO + (255,)), (0, 0), msombra)
    tela.alpha_composite(sombra)

    arco = Image.new("RGBA", (aw, ah), (0, 0, 0, 0))
    arco.paste(luz, (0, 0), mascara)

    # Filete interno do arco.
    filete = Image.new("L", (aw, ah), 0)
    df = ImageDraw.Draw(filete)
    m = int(12 * ESCALA)
    iw = aw - 2 * m
    df.arc((m, m, m + iw, m + iw), 180, 360, fill=255, width=ESCALA)
    df.line((m, m + iw // 2, m, ah - m - int(12 * ESCALA)), fill=255, width=ESCALA)
    df.line((aw - m - ESCALA, m + iw // 2, aw - m - ESCALA, ah - m - int(12 * ESCALA)), fill=255, width=ESCALA)
    df.arc((m, ah - m - int(24 * ESCALA), m + int(24 * ESCALA), ah - m), 90, 180, fill=255, width=ESCALA)
    df.arc((aw - m - int(24 * ESCALA), ah - m - int(24 * ESCALA), aw - m, ah - m), 0, 90, fill=255, width=ESCALA)
    df.line((m + int(12 * ESCALA), ah - m - ESCALA, aw - m - int(12 * ESCALA), ah - m - ESCALA), fill=255, width=ESCALA)
    arco.paste(Image.new("RGBA", (aw, ah), PRIMARIA + (255,)), (0, 0), filete.point(lambda v: int(v * 0.30)))

    # Sombra elíptica de contato na base do frasco (nunca halo do alfa).
    decant = Image.open(DECANT).convert("RGBA")
    alt_decant = int(ah * 0.76)
    larg_decant = round(decant.width * alt_decant / decant.height)
    decant = decant.resize((larg_decant, alt_decant), Image.LANCZOS)
    base_y = ah - int(ah * 0.10)
    contato = Image.new("L", (aw, ah), 0)
    dc = ImageDraw.Draw(contato)
    cw, ch = int(aw * 0.30), int(ah * 0.03)
    dc.ellipse((aw // 2 - cw // 2, base_y - ch // 2, aw // 2 + cw // 2, base_y + ch // 2), fill=255)
    contato = contato.filter(ImageFilter.GaussianBlur(4 * ESCALA)).point(lambda v: int(v * 0.30))
    arco.paste(Image.new("RGBA", (aw, ah), TEXTO + (255,)), (0, 0), contato)
    arco.alpha_composite(decant, (aw // 2 - larg_decant // 2, base_y - alt_decant + int(4 * ESCALA)))
    # Recorta de novo pela máscara do arco.
    final_arco = Image.new("RGBA", (aw, ah), (0, 0, 0, 0))
    final_arco.paste(arco, (0, 0), mascara)
    tela.alpha_composite(final_arco, (ax0, ay0))

    # Logotipo raster, recortado do arquivo original, sem ampliar (escala 1 no tamanho final).
    logo = Image.open(LOGO).convert("RGBA")
    logo = logo.crop(logo.getbbox())
    assert logo.size == (328, 113), logo.size
    x0 = int(88 * ESCALA)
    y_logo = int(118 * ESCALA)
    # O logo entra depois da redução, em 1:1 (sem reamostrar o desenho).

    desenho = ImageDraw.Draw(tela)
    # Filete curto na cor da marca entre o logo e a frase.
    y_filete = y_logo + logo.height * ESCALA + int(44 * ESCALA)
    desenho.line((x0, y_filete, x0 + int(56 * ESCALA), y_filete), fill=PRIMARIA, width=2 * ESCALA)

    tamanho = 84 * ESCALA
    y1 = y_filete + int(98 * ESCALA)
    y2 = y1 + int(86 * ESCALA)
    l1 = texto_com_kerning(desenho, (x0, y1), "Decants de perfume", FONTE_REG, tamanho, 600, TEXTO)
    l2 = texto_com_kerning(desenho, (x0, y2), "em Piracanjuba", FONTE_ITA, tamanho, 600, DESTAQUE)
    print("larguras", l1 / ESCALA, l2 / ESCALA, "base da 2a linha", y2 / ESCALA)

    saida = tela.resize((L, A), Image.LANCZOS)
    saida.alpha_composite(logo, (x0 // ESCALA, y_logo // ESCALA))
    saida = saida.convert("RGB")
    saida.save(SAIDA, "JPEG", quality=86, optimize=True, progressive=True, subsampling="4:4:4")


if __name__ == "__main__":
    main()
