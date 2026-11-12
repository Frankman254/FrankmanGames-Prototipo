# Piezas y texturas de la cripta: baldosa, muro, antorcha, escaleras y entrada.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/mazmorra.py
# También se ejecuta dentro de Blender por MCP: trabaja en la escena "Mazmorra" y no toca las demás.
# Escribe assets/models/mazmorra.glb y assets/textures/muro.png y baldosa.png.
# El juego tiñe las texturas con el color de cada tema, así que son casi blancas.
# Coordenadas como en el juego (x, altura, z); B() las pasa a Blender.
import importlib
import math
import os
import sys
import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)

TEXTURES = os.path.normpath(os.path.join(fg.MODELS, '..', 'textures'))
TILE, WALL_H = 1.5, 3.2


def B(x, y, z):
    # El exportador pasa y de Blender a -z de glTF, y el cargador vuelve a invertir z.
    return (x, z, y)


def periodic_noise(size, cells, rng):
    """Ruido suave que se repite sin costura."""
    grid = rng.random((cells, cells))
    t = np.arange(size) * cells / size
    i0 = t.astype(int) % cells
    i1 = (i0 + 1) % cells
    f = t - np.floor(t)
    f = f * f * (3 - 2 * f)
    a = grid[np.ix_(i0, i0)] * (1 - f)[:, None] + grid[np.ix_(i1, i0)] * f[:, None]
    b = grid[np.ix_(i0, i1)] * (1 - f)[:, None] + grid[np.ix_(i1, i1)] * f[:, None]
    return a * (1 - f)[None, :] + b * f[None, :]


def grain(size, rng):
    return (periodic_noise(size, 6, rng) * 0.5 + periodic_noise(size, 24, rng) * 0.3 + periodic_noise(size, 96, rng) * 0.2)


def save_gray(name, values):
    """Guarda un PNG gris opaco; `values` va de 0 a 1."""
    os.makedirs(TEXTURES, exist_ok=True)
    h, w = values.shape
    px = np.ones((h, w, 4), dtype=np.float32)
    px[..., 0] = values * 1.0
    px[..., 1] = values * 0.985
    px[..., 2] = values * 0.96
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = os.path.join(TEXTURES, name + '.png')
    img.file_format = 'PNG'
    img.save()
    return img


def edge_mask(dist, width):
    """0 en la junta, 1 dentro de la pieza, con un pequeño bisel."""
    return np.clip(dist / width, 0, 1)


def brick_texture(size=512, rows=4, columns=2):
    rng = np.random.default_rng(41)
    y, x = np.mgrid[0:size, 0:size]
    row_h = size / rows
    row = (y / row_h).astype(int)
    col_w = size / columns
    sx = (x + (row % 2) * col_w / 2) % size
    col = (sx / col_w).astype(int)
    dy = np.minimum(y % row_h, row_h - y % row_h)
    dx = np.minimum(sx % col_w, col_w - sx % col_w)
    mask = edge_mask(np.minimum(dx, dy) - 3, 7)
    tones = rng.random((rows, columns)) * 0.16 + 0.8
    body = tones[row, col] * (0.82 + 0.3 * grain(size, rng))
    return save_gray('muro', np.clip(0.3 + (body - 0.3) * mask, 0, 1))


def tile_texture(size=512):
    rng = np.random.default_rng(73)
    y, x = np.mgrid[0:size, 0:size]
    half = size // 2
    # Cuatro losas de tamaños distintos, con la junta algo torcida.
    wob = (periodic_noise(size, 5, rng) - 0.5) * 16
    cx, cy = (x + wob) % size, (y - wob) % size
    dv = np.minimum(np.abs(cx - half), np.minimum(cx, size - cx))
    dh = np.minimum(np.abs(cy - half), np.minimum(cy, size - cy))
    mask = edge_mask(np.minimum(dv, dh) - 2, 9)
    tones = rng.random((2, 2)) * 0.14 + 0.84
    tone = tones[(cy >= half).astype(int), (cx >= half).astype(int)]
    body = tone * (0.84 + 0.28 * grain(size, rng))
    return save_gray('baldosa', np.clip(0.26 + (body - 0.26) * mask, 0, 1))


# La escena primero: sin ventana, fresh_scene parte de cero y borraría las texturas.
scene = fg.fresh_scene('Mazmorra')
muro = brick_texture()
baldosa = tile_texture()
STONE = fg.textured_material('Piedra_muro', muro)
FLOOR = fg.textured_material('Piedra_baldosa', baldosa)
DARK = fg.material('Oscuro', (0.01, 0.01, 0.015))
WOOD = fg.material('Hierro_antorcha', (0.2, 0.15, 0.1))
FLAME = fg.material('Llama', (1, 0.6, 0.2), emit=(1, 0.55, 0.15), strength=3)
MOUND = fg.material('Monticulo', (0.3, 0.33, 0.24), rough=1)
RUNE = fg.material('Runa', (0.4, 0.65, 1), emit=(0.35, 0.6, 1), strength=2)
parts = []


def piece(name, mat, build, uv_metres=None):
    b = fg.Builder(name)
    build(b, mat)
    o = b.object(scene)
    if uv_metres:
        fg.box_uv(o, uv_metres)
    parts.append(o)
    return o


def box(b, mat, x, y, z, w, h, d):
    b.box(B(x, y, z), (w, d, h), mat)


# Baldosa: una losa con UV de 0 a 1 en cada celda.
piece('d_baldosa', FLOOR, lambda b, m: b.card(
    [B(-TILE / 2, 0, -TILE / 2), B(TILE / 2, 0, -TILE / 2), B(TILE / 2, 0, TILE / 2), B(-TILE / 2, 0, TILE / 2)], m))


# Auditoria 2026-11-11: piezas macizas que arrancaban EXACTAMENTE en z=0 eran
# coplanares con d_baldosa (z-fighting bajo cada instancia). Hundir 5 mm la
# base, el patron que ya usaban los pasos de d_entrada. d_barril_aros va sobre
# el barril y d_estanque_piedra semienterrada: no aplican.
def sink_base(o):
    for v in o.data.vertices:
        if abs(v.co.z) < 1e-6:
            v.co.z = -0.005


def build_wall(b, m):
    # Auditoria 2026-11-11: el zocalo y la cornisa salientes (TILE+0.1 / TILE+0.08)
    # desbordaban la huella del tile: paredes contiguas clavaban sus molduras y
    # el zocalo sobresalia sobre la baldosa vecina. Todo dentro de TILE ahora.
    box(b, m, 0, 0.14, 0, TILE - 0.10, 0.29, TILE - 0.10)
    box(b, m, 0, 1.645, 0, TILE, 2.73, TILE)
    box(b, m, 0, 3.1, 0, TILE - 0.06, 0.2, TILE - 0.06)


piece('d_muro', STONE, build_wall, uv_metres=TILE)
piece('d_remate', STONE, lambda b, m: b.card(
    [B(-TILE / 2, 0, -TILE / 2), B(TILE / 2, 0, -TILE / 2), B(TILE / 2, 0, TILE / 2), B(-TILE / 2, 0, TILE / 2)], m))


def build_torch(b, m):
    box(b, m, 0, 0, 0, 0.08, 0.5, 0.08)
    box(b, m, 0, -0.2, 0, 0.14, 0.08, 0.14)
    b.tube(B(0, 0.18, 0), B(0, 0.34, 0), 0.05, 0.1, m, sides=6)


piece('d_antorcha', WOOD, build_torch)


def build_flame(b, m):
    b.tube(B(0, -0.1, 0), B(0, 0.02, 0), 0.04, 0.11, m, sides=6)
    b.tube(B(0, 0.02, 0), B(0, 0.28, 0), 0.11, 0.008, m, sides=6)


piece('d_llama', FLAME, build_flame)


def build_up(b, m):
    for k in range(4):
        box(b, m, -0.8 + k * 0.55, 0.125 * (k + 1), 0, 0.55, 0.25 * (k + 1), 2.2)
    for z in (-1.2, 1.2):
        box(b, m, 1.4, 1.3, z, 0.35, 2.6, 0.35)
        box(b, m, 1.4, 0.1, z, 0.5, 0.2, 0.5)
    box(b, m, 1.4, 2.75, 0, 0.45, 0.4, 2.8)
    box(b, m, 1.4, 3.02, 0, 0.6, 0.14, 3.0)


piece('d_subida', STONE, build_up, uv_metres=TILE)


def build_down_frame(b, m):
    for dx, dz, w, d in ((0, -1.25, 2.8, 0.3), (0, 1.25, 2.8, 0.3), (-1.25, 0, 0.3, 2.2), (1.25, 0, 0.3, 2.2)):
        box(b, m, dx, 0.15, dz, w, 0.3, d)
    # Auditoria: los peldanos iban a [0.005,0.065] y d_boca (plano y=0.02 del
    # juego) los atravesaba. Subidos a [0.04,0.10], por encima del plano.
    for k in range(2):
        box(b, m, -0.75 + k * 0.5, 0.07, 0, 0.5, 0.06, 2)


piece('d_bajada', STONE, build_down_frame, uv_metres=TILE)
piece('d_boca', DARK, lambda b, m: b.card([B(-1.1, 0, -1.1), B(1.1, 0, -1.1), B(1.1, 0, 1.1), B(-1.1, 0, 1.1)], m))


def ring(b, m, diameter, thickness, center=(0, 0, 0), axis_x=False, segments=32):
    r = diameter / 2
    prev = None
    for i in range(segments + 1):
        t = 2 * math.pi * i / segments
        if axis_x:
            q = B(center[0], center[1] + r * math.cos(t), center[2] + r * math.sin(t))
        else:
            q = B(center[0] + r * math.cos(t), center[1], center[2] + r * math.sin(t))
        if prev:
            b.tube(prev, q, thickness / 2, thickness / 2, m, sides=4)
        prev = q


piece('d_anillo', RUNE, lambda b, m: ring(b, m, 3.2, 0.06))


# Entrada en el mundo abierto: +X es hacia donde mira.
def build_gate(b, m):
    for z in (-1.5, 1.5):
        box(b, m, 0, 1.5, z, 0.6, 3, 0.6)
        box(b, m, 0, 0.12, z, 0.85, 0.24, 0.85)
    box(b, m, 0, 3.2, 0, 0.8, 0.55, 4)
    box(b, m, 0, 3.62, 0, 0.5, 0.3, 2.6)
    for z in (-1.45, 1.45):
        box(b, m, -1.2, 0.17, z, 2.4, 0.35, 0.3)
    for k in range(3):
        box(b, m, -0.3 - k * 0.5, 0.1 - k * 0.03, 0, 0.45, 0.08, 2.4)


piece('d_entrada', STONE, build_gate, uv_metres=TILE)
# Auditoria: la boca llegaba a x=-2.3 (40 cm fuera del monticulo y entre
# monticulo y umbral: lama negra flotando). Recortada a x∈[-1.525,-0.1],
# justo bajo los tres peldanos del umbral de d_entrada.
piece('d_entrada_boca', DARK, lambda b, m: box(b, m, -0.8125, 0.03, 0, 1.425, 0.04, 2.16))
piece('d_entrada_monticulo', MOUND, lambda b, m: b.blob(B(-4.3, 0, 0), (2.4, 3.45, 1.65), m, subdiv=3))
piece('d_entrada_runa', RUNE, lambda b, m: ring(b, m, 1.0, 0.08, center=(0.42, 3.2, 0), axis_x=True, segments=20))

# Pisos profundos (F25): jarras, barriles, puertas y estanques. El juego pone el color.
CLAY = fg.material('Barro_jarra', (0.55, 0.3, 0.18))
OAK = fg.material('Madera_barril', (0.36, 0.22, 0.12))
IRON = fg.material('Hierro_aro', (0.2, 0.2, 0.22), metallic=0.6)


def lathe(b, m, profile, sides):
    """Torno facetado: `profile` = [(altura, radio), ...] de abajo arriba."""
    for (y0, r0), (y1, r1) in zip(profile, profile[1:]):
        b.tube(B(0, y0, 0), B(0, y1, 0), r0, r1, m, sides=sides)


# Tinaja de barro panzuda con cuello estrecho y boca vuelta.
piece('d_jarra', CLAY, lambda b, m: lathe(b, m, [(0, 0.14), (0.07, 0.21), (0.28, 0.27), (0.5, 0.22), (0.62, 0.11), (0.69, 0.095), (0.76, 0.135)], 11))
# Barril de duelas con la panza marcada y aros de hierro aparte (otro material).
piece('d_barril', OAK, lambda b, m: lathe(b, m, [(0, 0.27), (0.22, 0.33), (0.45, 0.355), (0.68, 0.33), (0.9, 0.27)], 12))


def build_hoops(b, m):
    for y, r in ((0.07, 0.29), (0.28, 0.345), (0.62, 0.345), (0.83, 0.29)):
        b.tube(B(0, y - 0.03, 0), B(0, y + 0.03, 0), r + 0.012, r + 0.012, m, sides=12)


piece('d_barril_aros', IRON, build_hoops)


def build_shards(b, m):
    # Cascotes de una jarra o un barril roto, tirados por el suelo.
    rng = np.random.default_rng(5)
    for k in range(9):
        a = 2 * math.pi * k / 9 + rng.random() * 0.5
        d = 0.12 + rng.random() * 0.32
        s = 0.05 + rng.random() * 0.07
        b.box(B(math.cos(a) * d, s * 0.35, math.sin(a) * d), (s * 1.6, s, s * 0.6), m, rot=(a, 'Z'))
    b.tube(B(0, 0, 0), B(0, 0.12, 0), 0.2, 0.22, m, sides=11)


piece('d_cascotes', CLAY, build_shards)

# Puerta: dos postes de piedra, dintel de ancho 1 (el juego lo estira al hueco) y hojas de
# tablones con bisagra en x = 0 y ancho 1 (el juego pone media boca a cada una).
piece('d_puerta_poste', STONE, lambda b, m: (box(b, m, 0, 1.45, 0, 0.32, 2.9, 0.5), box(b, m, 0, 0.1, 0, 0.42, 0.2, 0.6)), uv_metres=TILE)
piece('d_puerta_dintel', STONE, lambda b, m: box(b, m, 0, 2.78, 0, 1, 0.36, 0.52), uv_metres=TILE)


def build_leaf(b, m):
    for k in range(4):
        box(b, m, 0.125 + k * 0.25, 1.27, 0, 0.235, 2.54 - (k % 2) * 0.06, 0.09)
    for y in (0.45, 2.0):
        box(b, m, 0.5, y, 0.06, 0.96, 0.14, 0.04)
    box(b, m, 0.5, 1.22, 0.06, 0.12, 1.5, 0.035)


piece('d_puerta_hoja', OAK, build_leaf)
# Piedra de la orilla de un estanque: el juego las pone en corro.
piece('d_estanque_piedra', STONE, lambda b, m: b.blob(B(0, 0.08, 0), (0.42, 0.22, 0.26), m, subdiv=1), uv_metres=TILE)

for o in parts:
    if o.name.split('.')[0] in ('d_bajada', 'd_subida', 'd_jarra', 'd_barril',
                                'd_cascotes', 'd_puerta_poste', 'd_puerta_hoja', 'd_entrada', 'd_muro'):
        sink_base(o)

fg.export('mazmorra.glb', scene, parts, materials=False)
