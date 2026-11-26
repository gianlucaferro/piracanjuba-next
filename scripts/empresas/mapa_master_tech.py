"""Mapa estático da Master Tech Auto Center para a página do portal.

Blocos do OpenStreetMap (© colaboradores do OpenStreetMap, ODbL) no zoom 17,
convertidos para tons de cinza quente, com o marcador laranja da marca nas
coordenadas da ficha do Google Maps (-17.3058776, -49.0257318, conferidas em
2026-11-25). A página credita o OpenStreetMap ao lado da imagem.

Gerou public/empresas/master-tech-auto-center/mapa.webp em 2026-11-25.
Uso: uv run --with pillow python mapa_master_tech.py <saida.webp>
"""

import io
import math
import sys
import time
import urllib.request

from PIL import Image, ImageDraw, ImageOps

LAT, LON = -17.3058776, -49.0257318
ZOOM = 17
LARG, ALT = 1000, 520
AGENTE = "static-map-generator/1.0"
LARANJA = (250, 130, 6)
PRETO = (9, 9, 9)


def para_pixel(lat, lon, zoom):
    n = 2**zoom * 256
    x = (lon + 180) / 360 * n
    lat_r = math.radians(lat)
    y = (1 - math.asinh(math.tan(lat_r)) / math.pi) / 2 * n
    return x, y


cx, cy = para_pixel(LAT, LON, ZOOM)
x0, y0 = cx - LARG / 2, cy - ALT / 2
t0x, t0y = int(x0 // 256), int(y0 // 256)
t1x, t1y = int((x0 + LARG) // 256), int((y0 + ALT) // 256)

mosaico = Image.new("RGB", ((t1x - t0x + 1) * 256, (t1y - t0y + 1) * 256))
for tx in range(t0x, t1x + 1):
    for ty in range(t0y, t1y + 1):
        url = f"https://tile.openstreetmap.org/{ZOOM}/{tx}/{ty}.png"
        pedido = urllib.request.Request(url, headers={"User-Agent": AGENTE})
        with urllib.request.urlopen(pedido, timeout=30) as resposta:
            bloco = Image.open(io.BytesIO(resposta.read())).convert("RGB")
        mosaico.paste(bloco, ((tx - t0x) * 256, (ty - t0y) * 256))
        time.sleep(0.2)

ox, oy = round(x0 - t0x * 256), round(y0 - t0y * 256)
mapa = mosaico.crop((ox, oy, ox + LARG, oy + ALT))

# Cinza quente: as ruas e os nomes continuam legíveis e o laranja da marca fica sozinho.
cinza = ImageOps.grayscale(mapa)
mapa = ImageOps.colorize(cinza, black=(40, 38, 34), white=(246, 244, 239), mid=(178, 175, 168))

# Marcador desenhado em 4x e reduzido, para a borda ficar limpa.
E = 4
camada = Image.new("RGBA", (LARG * E, ALT * E), (0, 0, 0, 0))
d = ImageDraw.Draw(camada)
px, py = LARG / 2 * E, ALT / 2 * E
raio = 17 * E
d.ellipse((px - raio * 1.9, py - raio * 1.9, px + raio * 1.9, py + raio * 1.9), fill=(250, 130, 6, 60))
d.polygon([(px - raio * 0.62, py - raio * 1.2), (px + raio * 0.62, py - raio * 1.2), (px, py)], fill=PRETO)
d.ellipse((px - raio, py - raio * 2.55, px + raio, py - raio * 0.55), fill=PRETO)
d.ellipse((px - raio * 0.78, py - raio * 2.33, px + raio * 0.78, py - raio * 0.77), fill=LARANJA)
d.ellipse((px - raio * 0.3, py - raio * 1.85, px + raio * 0.3, py - raio * 1.25), fill=PRETO)
mapa = mapa.convert("RGBA")
mapa.alpha_composite(camada.resize((LARG, ALT), Image.LANCZOS))
mapa.convert("RGB").save(sys.argv[1], "WEBP", quality=82, method=6)
print("mapa", LARG, ALT, "blocos", (t1x - t0x + 1) * (t1y - t0y + 1))
