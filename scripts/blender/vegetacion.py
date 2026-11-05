# Flora y suelos de Panamá para el mapa: palma, guayacán, corotú, mangle, roble, ciprés,
# plátano, cafeto, caña, arbusto, roca, hierba y flor.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/vegetacion.py
# Escribe assets/models/vegetacion.glb y assets/textures/suelo_*.png. Geometría propia.
# Cada pieza lleva un solo material: el juego pone el color, el tinte por zona y el viento,
# así que la «animación» de estas piezas es ese viento y no un clip dentro del archivo.
import importlib
import math
import os
import random
import sys
import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)

TEXTURES = os.path.normpath(os.path.join(fg.MODELS, '..', 'textures'))
scene = fg.fresh_scene('Vegetacion')
parts = []
MAT = fg.material('Flora', (1, 1, 1), rough=0.9)


def piece(name, build):
    b = fg.Builder(name)
    build(b)
    parts.append(b.object(scene))


def frond(b, base, azimuth, length, rise, droop, width, segments=4):
    """Hoja en cinta: sale de `base` hacia `azimuth`, sube y cae, y se afina en la punta."""
    ca, sa = math.cos(azimuth), math.sin(azimuth)
    verts = []
    for i in range(segments + 1):
        t = i / segments
        out = length * t
        z = base[2] + rise * t - droop * t * t
        half = width * math.sin(math.pi * min(0.97, 0.12 + t * 0.88)) * 0.5
        cx, cy = base[0] + ca * out, base[1] + sa * out
        verts.append((b.bm.verts.new((cx - sa * half, cy + ca * half, z)), b.bm.verts.new((cx + sa * half, cy - ca * half, z - half * 0.5))))
    faces = [b.bm.faces.new((verts[i][0], verts[i][1], verts[i + 1][1], verts[i + 1][0])) for i in range(segments)]
    b._finish([v for pair in verts for v in pair], faces, MAT, None)


def bent_trunk(b, height, base_r, top_r, lean, segments=5, sides=6):
    prev = (0, 0, -0.2)
    r = base_r
    for i in range(1, segments + 1):
        t = i / segments
        cur = (lean * t * t, 0, height * t)
        nr = base_r + (top_r - base_r) * t
        b.tube(prev, cur, r, nr, MAT, sides=sides)
        prev, r = cur, nr
    return prev


def crown_blobs(b, blobs, subdiv=2):
    for center, size in blobs:
        b.blob(center, size, MAT, subdiv=subdiv)


def branches(b, base, tips, r=0.12):
    for tip in tips:
        b.tube(base, tip, r, r * 0.45, MAT, sides=5)


# Palma de coco: tronco curvo y penacho de hojas caídas.
PALM_TOP = (0.9, 0, 7.2)
piece('v_palma_tronco', lambda b: bent_trunk(b, 7.2, 0.24, 0.13, 0.9))


def palm_crown(b):
    for k in range(9):
        a = k * math.tau / 9 + (0.2 if k % 2 else 0)
        frond(b, PALM_TOP, a, 3.1, 0.75 if k % 2 else 1.1, 2.3, 0.62, segments=5)
    for k in range(3):
        a = k * math.tau / 3 + 0.5
        b.blob((PALM_TOP[0] + math.cos(a) * 0.24, math.sin(a) * 0.24, PALM_TOP[2] - 0.22), (0.17, 0.17, 0.19), MAT, subdiv=1)


piece('v_palma_copa', palm_crown)


# Guayacán: copa redondeada y ramas abiertas; florece amarillo en la sabana.
def guayacan_trunk(b):
    bent_trunk(b, 2.9, 0.26, 0.16, 0.12, segments=2)
    branches(b, (0.12, 0, 2.7), [(1.2, 0.3, 4.1), (-1.1, 0.5, 4.2), (0.1, -1.1, 4.3), (-0.1, 0.9, 4.4)])


piece('v_guayacan_tronco', guayacan_trunk)
piece('v_guayacan_copa', lambda b: crown_blobs(b, [((0.1, 0, 4.7), (1.9, 1.9, 1.3)), ((1.3, 0.4, 4.3), (1.15, 1.05, 0.85)), ((-1.3, 0.5, 4.4), (1.1, 1.15, 0.85)), ((0.2, -1.3, 4.5), (1.15, 1.05, 0.8)), ((-0.1, 1.2, 4.8), (1.0, 1.0, 0.7))]))


# Corotú: tronco corto y copa muy ancha y plana, la sombra de los potreros.
def corotu_trunk(b):
    bent_trunk(b, 3.0, 0.42, 0.26, 0.0, segments=2, sides=7)
    branches(b, (0, 0, 2.9), [(2.5, 0.2, 4.6), (-2.4, 0.6, 4.6), (0.3, -2.4, 4.7), (-0.3, 2.5, 4.7), (1.7, 1.7, 4.6), (-1.8, -1.6, 4.6)], r=0.17)


piece('v_corotu_tronco', corotu_trunk)
piece('v_corotu_copa', lambda b: crown_blobs(b, [((0, 0, 5.2), (3.6, 3.6, 0.8)), ((2.5, 0.5, 5.0), (1.8, 1.7, 0.55)), ((-2.5, 0.8, 5.0), (1.8, 1.7, 0.55)), ((0.4, -2.6, 5.05), (1.7, 1.7, 0.5)), ((-0.5, 2.6, 5.05), (1.7, 1.8, 0.5))]))


# Mangle rojo: se sostiene en raíces en arco sobre el barro.
def mangle_roots(b):
    bent_trunk(b, 2.3, 0.15, 0.12, 0.0, segments=2)
    for k in range(7):
        a = k * math.tau / 7
        mid = (math.cos(a) * 0.68, math.sin(a) * 0.68, 0.62)
        foot = (math.cos(a) * 1.25, math.sin(a) * 1.25, -0.2)
        b.tube((0, 0, 1.2), mid, 0.07, 0.06, MAT, sides=5)
        b.tube(mid, foot, 0.06, 0.045, MAT, sides=5)


piece('v_mangle_raices', mangle_roots)
piece('v_mangle_copa', lambda b: crown_blobs(b, [((0, 0, 3.1), (1.7, 1.7, 1.0)), ((1.05, 0.4, 2.8), (1.0, 0.9, 0.7)), ((-1.0, 0.4, 2.8), (0.95, 1.0, 0.72)), ((0.1, -1.05, 2.85), (0.95, 0.9, 0.65))]))


# Roble de altura: tronco fuerte y copa alta, para Boquete y Cerro Punta.
def roble_trunk(b):
    bent_trunk(b, 4.4, 0.34, 0.2, 0.15, segments=3)
    branches(b, (0.1, 0, 4.0), [(1.2, 0.4, 5.6), (-1.1, 0.4, 5.6), (0, -1.1, 5.8)], r=0.13)


piece('v_roble_tronco', roble_trunk)
piece('v_roble_copa', lambda b: crown_blobs(b, [((0.1, 0, 6.4), (1.85, 1.85, 1.75)), ((1.2, 0.4, 5.8), (1.1, 1.1, 1.0)), ((-1.2, 0.4, 5.8), (1.15, 1.05, 1.0)), ((0.1, -1.2, 5.9), (1.05, 1.1, 0.95))]))


# Ciprés: los cortavientos de las fincas de Cerro Punta.
piece('v_cipres_tronco', lambda b: bent_trunk(b, 1.3, 0.18, 0.13, 0.0, segments=1))
piece('v_cipres_copa', lambda b: b.tube((0, 0, 0.9), (0, 0, 6.6), 0.95, 0.05, MAT, sides=8))


# Plátano: tallo tierno y hojas enormes.
piece('v_platano_tallo', lambda b: bent_trunk(b, 2.1, 0.15, 0.1, 0.0, segments=2))


def platano_leaves(b):
    for k in range(7):
        a = k * math.tau / 7 + 0.3
        frond(b, (0, 0, 2.05), a, 1.9, 0.9, 1.3, 0.78, segments=4)


piece('v_platano_hojas', platano_leaves)


# Cafeto: mata alta en hileras, para los cafetales. Las bayas rojas van aparte.
piece('v_cafeto_mata', lambda b: crown_blobs(b, [((0, 0, 0.5), (0.5, 0.5, 0.48)), ((0, 0, 1.05), (0.42, 0.42, 0.45)), ((0, 0, 1.5), (0.26, 0.26, 0.3))], subdiv=1))


def coffee_berries(b):
    rng = random.Random(4)
    for _ in range(12):
        a, h = rng.random() * math.tau, 0.35 + rng.random() * 1.0
        r = 0.46 - (h - 0.35) * 0.22
        b.blob((math.cos(a) * r, math.sin(a) * r, h), (0.045, 0.045, 0.045), MAT, subdiv=1)


piece('v_cafeto_bayas', coffee_berries)


# Caña de azúcar: de aquí sale la raspadura.
def cane(b):
    rng = random.Random(9)
    for _ in range(7):
        x, y = (rng.random() - 0.5) * 0.7, (rng.random() - 0.5) * 0.7
        h = 2.0 + rng.random() * 0.8
        b.tube((x, y, -0.1), (x * 1.3, y * 1.3, h), 0.035, 0.022, MAT, sides=4)
        for k in range(2):
            frond(b, (x * 1.3, y * 1.3, h - 0.25), rng.random() * math.tau, 0.95, 0.4, 0.75, 0.1, segments=2)


piece('v_cana_mata', cane)
piece('v_arbusto_mata', lambda b: crown_blobs(b, [((0, 0, 0.45), (0.65, 0.65, 0.5)), ((0.4, 0.15, 0.32), (0.38, 0.38, 0.33)), ((-0.32, 0.25, 0.32), (0.36, 0.38, 0.32))], subdiv=1))


def rock(b):
    rng = random.Random(5)
    start = len(b.bm.verts)
    b.blob((0, 0, 0.22), (0.8, 0.8, 0.55), MAT, subdiv=2)
    b.bm.verts.ensure_lookup_table()
    for v in b.bm.verts[start:]:
        k = 0.78 + rng.random() * 0.42
        v.co.x *= k
        v.co.y *= k
        v.co.z = 0.22 + (v.co.z - 0.22) * (0.8 + rng.random() * 0.4)


piece('v_roca', rock)


def grass(b):
    rng = random.Random(2)
    for k in range(5):
        a = rng.random() * math.tau
        x, y = math.cos(a) * rng.random() * 0.22, math.sin(a) * rng.random() * 0.22
        h = 0.3 + rng.random() * 0.26
        lean_a = rng.random() * math.tau
        tip = b.bm.verts.new((x + math.cos(lean_a) * 0.16, y + math.sin(lean_a) * 0.16, h))
        side = rng.random() * math.tau
        w = 0.035
        v0 = b.bm.verts.new((x - math.cos(side) * w, y - math.sin(side) * w, -0.03))
        v1 = b.bm.verts.new((x + math.cos(side) * w, y + math.sin(side) * w, -0.03))
        b._finish([v0, v1, tip], [b.bm.faces.new((v0, v1, tip))], MAT, None)


piece('v_hierba', grass)


def flower_stems(b):
    for x, y, h in ((0, 0, 0.42), (0.14, 0.08, 0.32), (-0.12, 0.1, 0.36)):
        b.tube((x, y, -0.02), (x, y, h), 0.012, 0.012, MAT, sides=3)
        frond(b, (x, y, h * 0.3), x * 20 + 1, 0.16, 0.08, 0.06, 0.05, segments=2)


def flower_heads(b):
    for x, y, h in ((0, 0, 0.42), (0.14, 0.08, 0.32), (-0.12, 0.1, 0.36)):
        b.blob((x, y, h + 0.02), (0.06, 0.06, 0.035), MAT, subdiv=1)


piece('v_flor_tallo', flower_stems)
piece('v_flor_petalos', flower_heads)
fg.export('vegetacion.glb', scene, parts, materials=False)


# Suelos que se repiten sin costura. Colores de la tierra de Azuero: el juego los tiñe por zona.
def periodic(size, cells, rng):
    grid = rng.random((cells, cells))
    t = np.arange(size) * cells / size
    i0 = np.floor(t).astype(int) % cells
    i1 = (i0 + 1) % cells
    f = t - np.floor(t)
    f = f * f * (3 - 2 * f)
    a = grid[np.ix_(i0, i0)] * (1 - f)[:, None] + grid[np.ix_(i1, i0)] * f[:, None]
    b = grid[np.ix_(i0, i1)] * (1 - f)[:, None] + grid[np.ix_(i1, i1)] * f[:, None]
    return a * (1 - f)[None, :] + b * f[None, :]


def fractal(size, rng, start=4, octaves=5):
    out = np.zeros((size, size))
    amp, total = 1.0, 0.0
    for k in range(octaves):
        out += periodic(size, start * 2 ** k, rng) * amp
        total += amp
        amp *= 0.55
    return out / total


def save_tile(name, base, spread, seed, speck=None):
    rng = np.random.default_rng(seed)
    size = 512
    v = fractal(size, rng)
    img = np.zeros((size, size, 4))
    for c in range(3):
        img[:, :, c] = base[c] * (1 + (v - 0.5) * 2 * spread)
    if speck:
        mask = fractal(size, rng, start=32, octaves=2) > speck[0]
        for c in range(3):
            img[:, :, c][mask] = img[:, :, c][mask] * speck[1][c]
    img[:, :, 3] = 1
    image = bpy.data.images.new(name, size, size, alpha=False)
    image.colorspace_settings.name = 'sRGB'
    image.pixels.foreach_set(np.clip(img, 0, 1).astype(np.float32).ravel())
    image.filepath_raw = os.path.join(TEXTURES, f'{name}.png')
    image.file_format = 'PNG'
    image.save()
    print(f'{name}.png')


os.makedirs(TEXTURES, exist_ok=True)
save_tile('suelo_pasto', (0.5, 0.52, 0.27), 0.22, 11)
save_tile('suelo_tierra', (0.47, 0.34, 0.24), 0.2, 12)
save_tile('suelo_camino', (0.6, 0.51, 0.39), 0.14, 13)
