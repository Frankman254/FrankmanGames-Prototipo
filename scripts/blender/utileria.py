# Biblioteca original de utilería modular para poblar exteriores e interiores.
# Blender 5.2:
#   blender --background --python scripts/blender/utileria.py
# Salidas: assets/models/utileria.glb y assets/textures/surfaces/*.png
import importlib
import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
SURFACES = os.path.join(ROOT, 'assets', 'textures', 'surfaces')
scene = fg.fresh_scene('Utileria')
parts = []


def mat(name, rgb, **kwargs):
    return fg.material('util_' + name, rgb, **kwargs)


WOOD = mat('madera', (0.38, 0.22, 0.11), rough=0.86)
WOOD_LIGHT = mat('madera_clara', (0.61, 0.39, 0.19), rough=0.9)
WOOD_DARK = mat('madera_oscura', (0.19, 0.105, 0.055), rough=0.82)
CLAY = mat('barro', (0.61, 0.285, 0.13), rough=0.95)
CLAY_PALE = mat('barro_claro', (0.78, 0.55, 0.31), rough=0.98)
STONE = mat('piedra', (0.38, 0.39, 0.37), rough=0.9)
IRON = mat('hierro', (0.18, 0.19, 0.2), metallic=0.25, rough=0.48)
BRASS = mat('laton', (0.72, 0.46, 0.13), metallic=0.18, rough=0.42)
ROPE = mat('cuerda', (0.63, 0.47, 0.25), rough=1.0)
STRAW = mat('paja', (0.69, 0.54, 0.22), rough=1.0)
EMBER = mat('brasa', (0.78, 0.08, 0.025), rough=0.5, emit=(1.0, 0.08, 0.01), strength=3.0)
FLAME = mat('llama', (1.0, 0.42, 0.035), rough=0.35, emit=(1.0, 0.16, 0.01), strength=5.0)
GLASS = mat('vidrio_calido', (0.94, 0.61, 0.18), rough=0.28, emit=(1.0, 0.42, 0.08), strength=2.5)
GREEN = mat('musgo', (0.22, 0.34, 0.15), rough=1.0)
TURQUOISE = mat('turquesa', (0.05, 0.44, 0.46), rough=0.82)
WINE = mat('vino', (0.42, 0.055, 0.075), rough=0.9)
GOLD = mat('oro_mate', (0.86, 0.58, 0.12), metallic=0.12, rough=0.52)


def box(b, center, size, material, rot=None):
    b.box(center, size, material, rot=rot)


def tube(b, a, c, r0, r1, material, sides=8):
    b.tube(a, c, r0, r1, material, sides=sides)


def piece(name, build):
    b = fg.Builder('prop_' + name)
    build(b)
    obj = b.object(scene)
    parts.append(obj)
    return obj


def wheel(b, x, y, z, radius=0.62, width=0.11):
    # Rueda vertical en XZ, con ocho radios y buje; el carro mira a -Y.
    for i in range(16):
        a0 = 2 * math.pi * i / 16
        a1 = 2 * math.pi * (i + 1) / 16
        p0 = (x + radius * math.cos(a0), y, z + radius * math.sin(a0))
        p1 = (x + radius * math.cos(a1), y, z + radius * math.sin(a1))
        tube(b, p0, p1, width, width, WOOD_DARK, sides=5)
    for i in range(8):
        a = 2 * math.pi * i / 8
        tube(b, (x, y, z), (x + radius * 0.88 * math.cos(a), y, z + radius * 0.88 * math.sin(a)), 0.045, 0.035, WOOD_LIGHT, sides=5)
    tube(b, (x, y - 0.16, z), (x, y + 0.16, z), 0.15, 0.15, IRON, sides=10)


def cart(b):
    box(b, (0, 0.15, 0.92), (1.42, 1.65, 0.14), WOOD_LIGHT)
    for x in (-0.64, 0.64):
        box(b, (x, 0.15, 1.35), (0.12, 1.65, 0.86), WOOD)
    box(b, (0, 0.9, 1.35), (1.42, 0.12, 0.86), WOOD)
    for x in (-0.83, 0.83):
        wheel(b, x, 0.22, 0.68)
    for x in (-0.38, 0.38):
        tube(b, (x, -0.48, 0.78), (x, -2.2, 0.45), 0.06, 0.045, WOOD_DARK, sides=6)
    tube(b, (-0.83, 0.22, 0.68), (0.83, 0.22, 0.68), 0.055, 0.055, IRON, sides=8)
    # Bandas propias del mundo: color visible a distancia sin usar una textura ajena.
    for x in (-0.5, 0, 0.5):
        box(b, (x, -0.705, 1.38), (0.26, 0.035, 0.18), TURQUOISE if x else WINE)
    for y in (-0.38, 0.18, 0.73):
        tube(b, (-0.7, y, 1.82), (0.7, y, 1.82), 0.025, 0.025, ROPE, sides=5)


piece('carreta', cart)


def jar(b, tall=False):
    if tall:
        tube(b, (0, 0, 0), (0, 0, 0.18), 0.29, 0.38, CLAY, sides=14)
        tube(b, (0, 0, 0.18), (0, 0, 0.72), 0.38, 0.24, CLAY, sides=14)
        tube(b, (0, 0, 0.72), (0, 0, 0.92), 0.24, 0.15, CLAY_PALE, sides=14)
        tube(b, (0, 0, 0.92), (0, 0, 1.02), 0.18, 0.18, CLAY, sides=14)
        for z, color, radius in ((0.31, TURQUOISE, 0.38), (0.56, WINE, 0.33), (0.82, GOLD, 0.21)):
            tube(b, (0, 0, z), (0, 0, z + 0.055), radius, radius, color, sides=14)
    else:
        tube(b, (0, 0, 0), (0, 0, 0.18), 0.34, 0.48, CLAY_PALE, sides=14)
        tube(b, (0, 0, 0.18), (0, 0, 0.58), 0.48, 0.38, CLAY, sides=14)
        tube(b, (0, 0, 0.58), (0, 0, 0.76), 0.38, 0.16, CLAY, sides=14)
        for side in (-1, 1):
            tube(b, (side * 0.32, 0, 0.5), (side * 0.52, 0, 0.68), 0.055, 0.045, CLAY_PALE, sides=6)
            tube(b, (side * 0.52, 0, 0.68), (side * 0.18, 0, 0.72), 0.045, 0.04, CLAY_PALE, sides=6)
        for z, color, radius in ((0.28, WINE, 0.47), (0.52, TURQUOISE, 0.40)):
            tube(b, (0, 0, z), (0, 0, z + 0.06), radius, radius, color, sides=14)


piece('tinaja_alta', lambda b: jar(b, True))
piece('tinaja_redonda', lambda b: jar(b, False))


def chair(b):
    box(b, (0, 0, 0.48), (0.82, 0.82, 0.12), WOOD_LIGHT)
    for x in (-0.32, 0.32):
        for y in (-0.32, 0.32):
            tube(b, (x, y, 0), (x, y, 0.48), 0.055, 0.045, WOOD_DARK, sides=6)
    for x in (-0.34, 0.34):
        tube(b, (x, 0.34, 0.46), (x, 0.34, 1.46), 0.065, 0.05, WOOD_DARK, sides=6)
    for z in (0.78, 1.08, 1.38):
        box(b, (0, 0.34, z), (0.72, 0.08, 0.13), WOOD)
    box(b, (0, 0.34, 1.55), (0.9, 0.1, 0.14), WOOD_LIGHT)
    box(b, (0, 0.285, 1.08), (0.10, 0.055, 0.82), TURQUOISE, rot=(math.radians(42), 'Y'))
    box(b, (0, 0.28, 1.08), (0.10, 0.055, 0.82), WINE, rot=(math.radians(-42), 'Y'))


piece('silla', chair)


def round_table(b):
    tube(b, (0, 0, 0.72), (0, 0, 0.82), 0.76, 0.76, WOOD_LIGHT, sides=16)
    tube(b, (0, 0, 0.12), (0, 0, 0.72), 0.14, 0.12, WOOD_DARK, sides=8)
    for a in range(4):
        t = a * math.pi / 2 + math.pi / 4
        tube(b, (0, 0, 0.14), (0.52 * math.cos(t), 0.52 * math.sin(t), 0.02), 0.075, 0.045, WOOD_DARK, sides=6)
    tube(b, (0, 0, 0.825), (0, 0, 0.85), 0.35, 0.35, CLAY_PALE, sides=18)
    tube(b, (0, 0, 0.85), (0, 0, 0.88), 0.21, 0.21, TURQUOISE, sides=18)


piece('mesa_redonda', round_table)


def long_table(b):
    box(b, (0, 0, 0.78), (2.35, 1.05, 0.14), WOOD_LIGHT)
    for x in (-0.92, 0.92):
        for y in (-0.36, 0.36):
            box(b, (x, y, 0.37), (0.13, 0.13, 0.74), WOOD_DARK)
    box(b, (0, 0, 0.31), (1.9, 0.08, 0.1), WOOD)
    for x in (-0.72, 0, 0.72):
        box(b, (x, -0.535, 0.80), (0.30, 0.025, 0.035), TURQUOISE if x else WINE)


piece('mesa_larga', long_table)


def ladder(b):
    for x in (-0.43, 0.43):
        tube(b, (x, 0, 0), (x, 0, 2.7), 0.075, 0.06, WOOD_DARK, sides=7)
    for i in range(8):
        z = 0.28 + i * 0.32
        tube(b, (-0.39, 0, z), (0.39, 0, z), 0.05, 0.045, WOOD_LIGHT, sides=6)


piece('escalera', ladder)


def lantern_post(b):
    tube(b, (0, 0, 0), (0, 0, 2.45), 0.11, 0.075, IRON, sides=8)
    tube(b, (0, 0, 2.38), (0.48, 0, 2.38), 0.065, 0.045, IRON, sides=7)
    tube(b, (0.48, 0, 2.38), (0.48, 0, 2.12), 0.035, 0.035, BRASS, sides=6)
    box(b, (0.48, 0, 1.92), (0.36, 0.36, 0.5), IRON)
    box(b, (0.48, 0, 1.92), (0.24, 0.24, 0.38), GLASS)
    tube(b, (0, 0, 0), (0, 0, 0.12), 0.34, 0.25, STONE, sides=10)


piece('farol_poste', lantern_post)


def waypost(b):
    tube(b, (0, 0, 0), (0, 0, 2.15), 0.12, 0.08, WOOD_DARK, sides=7)
    # Dos tablillas con direcciones opuestas y puntas triangulares sugeridas.
    box(b, (0.35, 0, 1.75), (1.15, 0.12, 0.32), WOOD_LIGHT)
    box(b, (-0.3, 0, 1.28), (1.25, 0.12, 0.32), WOOD)
    box(b, (0.35, -0.068, 1.75), (0.36, 0.025, 0.07), TURQUOISE)
    box(b, (-0.3, -0.068, 1.28), (0.36, 0.025, 0.07), WINE)
    tube(b, (0, 0, 0), (0, 0, 0.08), 0.3, 0.22, STONE, sides=8)


piece('poste_camino', waypost)


def campfire(b):
    for i in range(10):
        a = 2 * math.pi * i / 10
        b.blob((0.52 * math.cos(a), 0.52 * math.sin(a), 0.16), (0.24, 0.2, 0.16), STONE, subdiv=1)
    for a in (math.pi / 4, -math.pi / 4):
        tube(b, (-0.48 * math.cos(a), -0.48 * math.sin(a), 0.25), (0.48 * math.cos(a), 0.48 * math.sin(a), 0.32), 0.11, 0.11, WOOD_DARK, sides=7)
    for z, s in ((0.44, 0.36), (0.64, 0.27), (0.86, 0.14)):
        b.blob((0, 0, z), (s, s * 0.72, s * 1.2), FLAME if z > 0.4 else EMBER, subdiv=1)


piece('fogata', campfire)


def chimney(b):
    box(b, (0, 0, 0.75), (1.2, 0.86, 1.5), STONE)
    box(b, (0, 0, 1.68), (0.82, 0.68, 0.38), STONE)
    box(b, (0, 0, 1.94), (1.0, 0.86, 0.14), CLAY)
    # Hogar oscuro al frente (-Y) y repisa.
    box(b, (0, -0.445, 0.52), (0.63, 0.04, 0.78), WOOD_DARK)
    box(b, (0, -0.55, 1.08), (1.3, 0.24, 0.16), WOOD_LIGHT)
    for x in (-0.19, 0.19):
        tube(b, (x, -0.48, 0.18), (-x, -0.48, 0.45), 0.055, 0.055, EMBER, sides=6)
    for x, color in ((-0.32, TURQUOISE), (0, GOLD), (0.32, WINE)):
        box(b, (x, -0.685, 1.08), (0.18, 0.035, 0.08), color, rot=(math.radians(45), 'Y'))


piece('chimenea', chimney)


def thatch_shelter(b):
    for x in (-1.45, 1.45):
        for y in (-1.05, 1.05):
            tube(b, (x, y, 0), (x, y, 2.1), 0.105, 0.075, WOOD_DARK, sides=7)
    tube(b, (-1.55, 0, 2.08), (1.55, 0, 2.08), 0.085, 0.07, WOOD, sides=7)
    tube(b, (0, -1.25, 2.62), (0, 1.25, 2.62), 0.1, 0.075, WOOD_DARK, sides=7)
    # Dos faldones gruesos de paja, con voladizo.
    b.poly(
        [(-1.8, -1.35, 1.9), (0, -1.35, 2.68), (0, 1.35, 2.68), (-1.8, 1.35, 1.9)],
        [(-1.8, -1.35, 1.78), (0, -1.35, 2.56), (0, 1.35, 2.56), (-1.8, 1.35, 1.78)],
        STRAW,
    )
    for y in (-1.15, -0.55, 0, 0.55, 1.15):
        tube(b, (-1.72, y, 1.88), (0, y, 2.62), 0.035, 0.025, ROPE, sides=5)
        tube(b, (0, y, 2.62), (1.72, y, 1.88), 0.025, 0.035, ROPE, sides=5)
    box(b, (0, -1.12, 1.62), (1.15, 0.035, 0.28), WINE)
    for x in (-0.42, 0, 0.42):
        box(b, (x, -1.145, 1.62), (0.14, 0.018, 0.20), TURQUOISE if x else GOLD, rot=(math.radians(45), 'Y'))
    b.poly(
        [(0, -1.35, 2.68), (1.8, -1.35, 1.9), (1.8, 1.35, 1.9), (0, 1.35, 2.68)],
        [(0, -1.35, 2.56), (1.8, -1.35, 1.78), (1.8, 1.35, 1.78), (0, 1.35, 2.56)],
        STRAW,
    )


piece('rancho_paja', thatch_shelter)


def barrel(b):
    tube(b, (0, 0, 0), (0, 0, 0.18), 0.42, 0.49, WOOD, sides=14)
    tube(b, (0, 0, 0.18), (0, 0, 0.92), 0.49, 0.42, WOOD_LIGHT, sides=14)
    for z in (0.13, 0.46, 0.86):
        tube(b, (0, 0, z), (0, 0, z + 0.045), 0.51, 0.51, IRON, sides=14)
    tube(b, (0, 0, 0.93), (0, 0, 0.965), 0.25, 0.25, WINE, sides=14)


piece('barril', barrel)


def crate(b):
    box(b, (0, 0, 0.45), (0.92, 0.92, 0.9), WOOD_LIGHT)
    for z in (0.08, 0.82):
        box(b, (0, -0.48, z), (1.02, 0.08, 0.12), WOOD_DARK)
    for x in (-0.42, 0.42):
        box(b, (x, -0.48, 0.45), (0.12, 0.08, 0.9), WOOD_DARK)
    box(b, (0, -0.53, 0.45), (0.11, 0.06, 0.95), WOOD_DARK, rot=(math.radians(39), 'Y'))
    box(b, (0, -0.575, 0.45), (0.22, 0.025, 0.22), TURQUOISE, rot=(math.radians(45), 'Y'))


piece('cajon', crate)


def bench(b):
    box(b, (0, 0, 0.52), (1.9, 0.52, 0.13), WOOD_LIGHT)
    for x in (-0.72, 0.72):
        box(b, (x, 0, 0.25), (0.14, 0.42, 0.5), WOOD_DARK)
    box(b, (0, 0.2, 1.05), (1.9, 0.12, 0.62), WOOD)
    for x in (-0.78, 0.78):
        box(b, (x, 0.2, 0.72), (0.11, 0.11, 0.52), WOOD_DARK)
    for x, color in ((-0.46, TURQUOISE), (0, GOLD), (0.46, WINE)):
        box(b, (x, 0.132, 1.05), (0.22, 0.025, 0.22), color, rot=(math.radians(45), 'Y'))


piece('banco', bench)


def fence(b):
    for x in (-1.4, 0, 1.4):
        tube(b, (x, 0, 0), (x, 0, 1.35), 0.11, 0.075, WOOD_DARK, sides=7)
    for z in (0.45, 1.02):
        tube(b, (-1.55, 0, z), (1.55, 0, z), 0.085, 0.065, WOOD_LIGHT, sides=7)
    for x in (-1.4, 0, 1.4):
        tube(b, (x, 0, 1.28), (x, 0, 1.36), 0.1, 0.02, TURQUOISE if x else WINE, sides=6)


piece('cerca', fence)


def hitching_post(b):
    for x in (-1.05, 1.05):
        tube(b, (x, 0, 0), (x, 0, 1.25), 0.13, 0.09, WOOD_DARK, sides=7)
        tube(b, (x, 0, 0), (x, 0, 0.1), 0.28, 0.22, STONE, sides=8)
    tube(b, (-1.18, 0, 1.05), (1.18, 0, 1.05), 0.11, 0.085, WOOD_LIGHT, sides=7)
    for x in (-0.48, 0.48):
        tube(b, (x, 0, 0.95), (x, 0, 0.73), 0.035, 0.035, ROPE, sides=6)


piece('amarradero', hitching_post)


def trough(b):
    # Artesa de madera abierta, con agua sugerida por una superficie luminosa tenue.
    b.poly(
        [(-1.25, -0.48, 0.18), (1.25, -0.48, 0.18), (1.05, -0.38, 0.78), (-1.05, -0.38, 0.78)],
        [(-1.25, 0.48, 0.18), (1.25, 0.48, 0.18), (1.05, 0.38, 0.78), (-1.05, 0.38, 0.78)],
        WOOD_DARK,
    )
    box(b, (0, 0, 0.71), (1.9, 0.62, 0.04), GLASS)
    for x in (-0.92, 0.92):
        box(b, (x, 0, 0.12), (0.14, 0.72, 0.24), WOOD_LIGHT)


piece('bebedero', trough)


def _save_surface(name, rgba):
    size = rgba.shape[0]
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    image = bpy.data.images.new(name, size, size, alpha=False)
    image.pixels.foreach_set(rgba.astype(np.float32).ravel())
    image.filepath_raw = os.path.join(SURFACES, name + '.png')
    image.file_format = 'PNG'
    image.save()


def surface_texture(name, base, accent, seed, normal_strength, roughness):
    os.makedirs(SURFACES, exist_ok=True)
    size = 512
    rng = np.random.default_rng(seed)
    coarse = rng.random((32, 32), dtype=np.float32)
    fine = rng.random((size, size), dtype=np.float32)
    # Repetición exacta: la cuadrícula baja se interpola periódicamente.
    low = np.pad(coarse, ((0, 1), (0, 1)), mode='wrap')
    yy, xx = np.mgrid[0:size, 0:size]
    fx = xx * 32 / size
    fy = yy * 32 / size
    x0 = fx.astype(int)
    y0 = fy.astype(int)
    tx = fx - x0
    ty = fy - y0
    smooth = (
        low[y0, x0] * (1 - tx) * (1 - ty)
        + low[y0, x0 + 1] * tx * (1 - ty)
        + low[y0 + 1, x0] * (1 - tx) * ty
        + low[y0 + 1, x0 + 1] * tx * ty
    )
    noise = np.clip((smooth - 0.5) * 0.60 + (fine - 0.5) * 0.14 + 0.5, 0, 1)
    if name == 'tierra_seca':
        # Contornos periódicos oscuros: grietas secas, no una foto ni un sample.
        cracks = np.exp(-((np.abs(smooth - 0.50) / 0.026) ** 2))
        height = noise * 0.72 - cracks * 0.16
        tint = np.clip(noise - cracks * 0.28, 0, 1)
    elif name == 'piedra_clara':
        # Vetillas y motas minerales suaves.
        veins = np.exp(-((np.abs(smooth - 0.57) / 0.045) ** 2))
        flecks = (fine > 0.955).astype(np.float32)
        height = noise * 0.55 + veins * 0.09 + flecks * 0.08
        tint = np.clip(noise + veins * 0.12 + flecks * 0.18, 0, 1)
    elif name == 'cesped_tropical':
        # Haces de hierba inclinados calculados en ambos bordes para teselar.
        yy, xx = np.mgrid[0:size, 0:size]
        blades = (np.sin((xx * 0.21 + yy * 0.47 + smooth * 13.0)) * 0.5 + 0.5) ** 9
        height = noise * 0.42 + blades * 0.13
        tint = np.clip(noise * 0.82 + blades * 0.20, 0, 1)
    elif name == 'madera_tropical':
        # Veta longitudinal y juntas de tablón; fantasía original, no especie real.
        grain = np.sin(xx * (2 * np.pi / 34) + smooth * 2.4 + np.sin(yy * 2 * np.pi / 171) * 1.2) * 0.5 + 0.5
        fine_grain = np.sin(xx * (2 * np.pi / 11) + smooth * 1.4) * 0.5 + 0.5
        seams = np.exp(-((np.minimum(yy % 128, 128 - yy % 128) / 2.2) ** 2))
        height = noise * 0.12 + grain * 0.19 + fine_grain * 0.035 - seams * 0.18
        tint = np.clip(noise * 0.18 + grain * 0.66 + fine_grain * 0.08 - seams * 0.20, 0, 1)
    elif name == 'arena_costera':
        # Ondas bajas de viento/agua y grano mineral fino.
        ripples = np.sin((xx + yy * 0.22) * (2 * np.pi / 54) + smooth * 5.0) * 0.5 + 0.5
        grains = (fine > 0.935).astype(np.float32)
        height = noise * 0.18 + ripples * 0.10 + grains * 0.025
        tint = np.clip(noise * 0.54 + ripples * 0.28 + grains * 0.10, 0, 1)
    elif name == 'corteza_fantastica':
        # Costillas verticales y fisuras; material genérico, no identifica árbol.
        ridges = np.sin(xx * (2 * np.pi / 32) + smooth * 2.2 + np.sin(yy * 2 * np.pi / 96) * 1.4) * 0.5 + 0.5
        fissures = np.exp(-((np.abs(ridges - 0.08) / 0.06) ** 2))
        height = noise * 0.12 + ridges * 0.28 - fissures * 0.14
        tint = np.clip(noise * 0.16 + ridges * 0.72 - fissures * 0.15, 0, 1)
    elif name == 'hoja_tropical':
        # Masas de follaje estilizadas y pequeñas nervaduras diagonales.
        clusters = (np.sin(xx * 0.115 + smooth * 9.0) * np.sin(yy * 0.137 - smooth * 7.0) * 0.5 + 0.5)
        veins = (np.sin((xx + yy * 0.65) * 0.43) * 0.5 + 0.5) ** 10
        height = noise * 0.32 + clusters * 0.18 + veins * 0.06
        tint = np.clip(noise * 0.42 + clusters * 0.50 + veins * 0.10, 0, 1)
    elif name == 'tela_tejida':
        # Urdimbre y trama visibles a escala de utilería, con irregularidad leve.
        warp = (np.cos(xx * 2 * np.pi / 8 + smooth * 1.2) * 0.5 + 0.5) ** 5
        weft = (np.cos(yy * 2 * np.pi / 8 - smooth * 1.2) * 0.5 + 0.5) ** 5
        weave = np.maximum(warp * 0.95, weft * 0.82)
        height = noise * 0.12 + weave * 0.12
        tint = np.clip(noise * 0.38 + weave * 0.40 + 0.12, 0, 1)
    else:
        raise ValueError(f'superficie sin lenguaje procedural: {name}')
    rgb = np.empty((size, size, 4), dtype=np.float32)
    a = np.array(base, dtype=np.float32)
    c = np.array(accent, dtype=np.float32)
    rgb[..., :3] = a + (c - a) * tint[..., None]
    rgb[..., 3] = 1
    _save_surface(name, rgb)

    dx = np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)
    dy = np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)
    nx, ny, nz = -dx * normal_strength, dy * normal_strength, np.ones_like(height)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.empty((size, size, 4), dtype=np.float32)
    normal[..., 0] = nx / length * 0.5 + 0.5
    normal[..., 1] = ny / length * 0.5 + 0.5
    normal[..., 2] = nz / length * 0.5 + 0.5
    normal[..., 3] = 1
    _save_surface(name + '_normal', normal)

    rough = np.clip(roughness + (fine - 0.5) * 0.16 - np.abs(height - 0.5) * 0.10, 0.36, 1.0)
    rough_map = np.ones((size, size, 4), dtype=np.float32)
    rough_map[..., :3] = rough[..., None]
    _save_surface(name + '_roughness', rough_map)


surface_texture('tierra_seca', (0.30, 0.16, 0.07), (0.66, 0.43, 0.22), 1201, 7.0, 0.88)
surface_texture('piedra_clara', (0.30, 0.31, 0.29), (0.67, 0.65, 0.58), 1202, 5.5, 0.74)
surface_texture('cesped_tropical', (0.08, 0.18, 0.055), (0.38, 0.48, 0.16), 1203, 8.0, 0.92)
surface_texture('madera_tropical', (0.16, 0.065, 0.025), (0.58, 0.30, 0.10), 1204, 6.5, 0.72)
surface_texture('arena_costera', (0.44, 0.34, 0.19), (0.82, 0.70, 0.44), 1205, 4.0, 0.84)
surface_texture('corteza_fantastica', (0.11, 0.055, 0.025), (0.43, 0.23, 0.09), 1206, 8.0, 0.90)
surface_texture('hoja_tropical', (0.025, 0.11, 0.045), (0.24, 0.48, 0.15), 1207, 7.0, 0.86)
surface_texture('tela_tejida', (0.31, 0.20, 0.12), (0.76, 0.58, 0.36), 1208, 5.0, 0.94)

fg.export('utileria.glb', scene, parts, materials=True)
print(f'utileria: {len(parts)} nodos y 8 superficies originales')
