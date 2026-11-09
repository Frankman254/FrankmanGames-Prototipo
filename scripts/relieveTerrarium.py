# `python -I scripts/relieveTerrarium.py <carpeta de teselas> data/relieve.json`
#
# Relieve real de Panamá para el atlas: lee las teselas «Terrarium» de Terrain Tiles on AWS
# (s3://elevation-tiles-prod/terrarium/9/x/y.png, guardadas como 9_x_y.png) y saca una rejilla
# de alturas en metros reales cada `STEP` grados sobre el rectángulo del atlas. El mar (≤ 0 m)
# queda en 0: la costa la decide Natural Earth, no esta rejilla. Las alturas se guardan en un
# byte con raíz cuadrada (más precisión en las tierras bajas) y en base64. Las teselas no se
# guardan en el repositorio. Datos: Mapzen/Tilezen Terrain Tiles (SRTM, GMTED, ETOPO1 y otros),
# con la atribución de PROCEDENCIA.md.
import base64
import json
import math
import os
import sys

import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
Z = 9
N = 2 ** Z
LON0, LON1, LAT0, LAT1 = -83.6, -76.6, 7.0, 9.8
STEP = 0.01
MAX_M = 3500.0

tiles = {}


def tile(x, y):
    key = (x, y)
    if key not in tiles:
        path = os.path.join(SRC, f"{Z}_{x}_{y}.png")
        a = np.asarray(Image.open(path).convert("RGB"), dtype=np.float64)
        tiles[key] = a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768
    return tiles[key]


def sample(lon, lat):
    fx = (lon + 180) / 360 * N
    r = math.radians(lat)
    fy = (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * N
    tx, ty = int(fx), int(fy)
    px = (fx - tx) * 256 - 0.5
    py = (fy - ty) * 256 - 0.5
    t = tile(tx, ty)
    x0 = min(255, max(0, int(math.floor(px))))
    y0 = min(255, max(0, int(math.floor(py))))
    x1, y1 = min(255, x0 + 1), min(255, y0 + 1)
    ax, ay = min(1, max(0, px - x0)), min(1, max(0, py - y0))
    top = t[y0, x0] * (1 - ax) + t[y0, x1] * ax
    bot = t[y1, x0] * (1 - ax) + t[y1, x1] * ax
    return top * (1 - ay) + bot * ay


cols = int(round((LON1 - LON0) / STEP)) + 1
rows = int(round((LAT1 - LAT0) / STEP)) + 1
out = bytearray(cols * rows)
peak = 0.0
for r in range(rows):
    lat = LAT0 + r * STEP
    for c in range(cols):
        h = max(0.0, min(MAX_M, sample(LON0 + c * STEP, lat)))
        peak = max(peak, h)
        out[r * cols + c] = int(round(math.sqrt(h / MAX_M) * 255))

doc = {
    "_estado": "DATOS",
    "_nota": "Relieve real (m sobre el mar) de Terrain Tiles on AWS (Mapzen/Tilezen: SRTM, GMTED, ETOPO1 y otros; atribución en PROCEDENCIA.md), generado con scripts/relieveTerrarium.py. Fila 0 = latMin, columna 0 = lonMin, paso `step` grados. Cada byte b es la altura MAX·(b/255)² en metros. data/panama.json → reliefScale la pasa a metros de juego.",
    "lonMin": LON0,
    "latMin": LAT0,
    "step": STEP,
    "cols": cols,
    "rows": rows,
    "maxMeters": MAX_M,
    "data": base64.b64encode(bytes(out)).decode("ascii"),
}
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    json.dump(doc, f, ensure_ascii=False)
print(cols, "x", rows, "pico", round(peak), "m", len(doc["data"]) // 1024, "KiB")
