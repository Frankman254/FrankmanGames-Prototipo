# Biblioteca original de formas naturales genéricas para poblar biomas.
# No identifica especies reales ni decide su distribución geográfica.
import importlib
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)

scene = fg.fresh_scene('NaturalezaModular')
parts = []


def mat(name, rgb, rough=0.9):
    return fg.material('natural_' + name, rgb, rough=rough)


STONE = mat('piedra', (0.31, 0.32, 0.30), 0.96)
STONE_LIGHT = mat('piedra_clara', (0.49, 0.48, 0.43), 0.94)
MOSS = mat('musgo', (0.15, 0.28, 0.09), 1.0)
BARK = mat('corteza', (0.24, 0.125, 0.055), 1.0)
BARK_LIGHT = mat('corteza_clara', (0.43, 0.255, 0.105), 0.98)
LEAF = mat('hoja', (0.075, 0.31, 0.105), 0.98)
LEAF_LIGHT = mat('hoja_clara', (0.22, 0.46, 0.12), 0.98)
DRY = mat('seco', (0.48, 0.34, 0.13), 1.0)
FLOWER_WINE = mat('flor_vino', (0.58, 0.055, 0.11), 0.86)
FLOWER_GOLD = mat('flor_oro', (0.94, 0.56, 0.07), 0.82)


def piece(name, build):
    builder = fg.Builder('natural_' + name)
    build(builder)
    parts.append(builder.object(scene))


def rock(builder, size, offset=(0, 0, 0), material=STONE):
    x, y, z = offset
    sx, sy, sz = size
    builder.blob((x, y, z + sz), (sx, sy, sz), material, subdiv=1)


piece('roca_baja', lambda b: rock(b, (0.72, 0.54, 0.34)))
piece('roca_alta', lambda b: rock(b, (0.48, 0.42, 0.92), material=STONE_LIGHT))


def mossy_rock(b):
    rock(b, (0.78, 0.61, 0.55))
    for x, y, z, s in ((-0.25, -0.18, 0.50, 0.22), (0.12, 0.08, 0.62, 0.27), (0.32, -0.05, 0.42, 0.18)):
        b.blob((x, y, z), (s, s * 0.75, s * 0.22), MOSS, subdiv=1)


piece('roca_musgosa', mossy_rock)


def rock_group(b):
    rock(b, (0.58, 0.46, 0.45), (-0.48, 0.05, 0))
    rock(b, (0.42, 0.38, 0.72), (0.12, 0.08, 0), STONE_LIGHT)
    rock(b, (0.37, 0.31, 0.31), (0.55, -0.12, 0))


piece('grupo_rocas', rock_group)


def fallen_log(b):
    b.tube((-1.15, 0, 0.24), (1.15, 0.08, 0.32), 0.25, 0.20, BARK, sides=9)
    for x in (-0.95, -0.38, 0.26, 0.91):
        b.tube((x, -0.02, 0.14), (x, 0.02, 0.48), 0.265, 0.245, BARK_LIGHT, sides=9)
    for x, y, side in ((-0.55, 0.0, -1), (0.52, 0.02, 1)):
        b.tube((x, y, 0.32), (x + side * 0.27, y + 0.31, 0.78), 0.08, 0.025, BARK, sides=6)


piece('tronco_caido', fallen_log)


def shrub(b, dry=False):
    stem = DRY if dry else BARK
    foliage = DRY if dry else LEAF
    for index, angle in enumerate((0.15, 1.3, 2.55, 3.7, 4.9)):
        radius = 0.28 + (index % 2) * 0.08
        end = (math.cos(angle) * radius, math.sin(angle) * radius, 0.74 + 0.08 * (index % 3))
        b.tube((0, 0, 0.08), end, 0.055, 0.025, stem, sides=5)
        b.blob(end, (0.38, 0.31, 0.32), foliage, subdiv=1)


piece('arbusto_redondo', shrub)
piece('arbusto_seco', lambda b: shrub(b, True))


def fern(b):
    for index in range(10):
        angle = index * math.tau / 10
        reach = 0.78 + 0.12 * (index % 3)
        end = (math.cos(angle) * reach, math.sin(angle) * reach, 0.18)
        b.tube((0, 0, 0.08), end, 0.045, 0.018, LEAF, sides=5)
        for step in range(2, 7):
            t = step / 7
            x, y = end[0] * t, end[1] * t
            side = (-math.sin(angle) * 0.16 * (1 - t * 0.5), math.cos(angle) * 0.16 * (1 - t * 0.5))
            b.blob((x + side[0], y + side[1], 0.10 + 0.10 * (1 - t)), (0.20, 0.07, 0.035), LEAF_LIGHT, subdiv=1)
            b.blob((x - side[0], y - side[1], 0.10 + 0.10 * (1 - t)), (0.20, 0.07, 0.035), LEAF, subdiv=1)


piece('helecho_ancho', fern)


def flower_patch(b):
    for index in range(11):
        angle = index * 2.4
        radius = 0.12 + 0.052 * index
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        height = 0.30 + 0.045 * (index % 4)
        b.tube((x, y, 0), (x, y, height), 0.018, 0.012, LEAF, sides=5)
        b.blob((x, y, height), (0.09, 0.09, 0.055), FLOWER_WINE if index % 2 else FLOWER_GOLD, subdiv=1)


piece('mata_flor', flower_patch)


def tall_grass(b):
    for index in range(18):
        angle = index * 2.1
        radius = 0.04 + 0.023 * index
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        lean = 0.12 + 0.05 * (index % 3)
        b.tube((x, y, 0), (x + math.cos(angle) * lean, y + math.sin(angle) * lean, 0.65 + 0.05 * (index % 5)), 0.018, 0.006, LEAF_LIGHT if index % 3 else DRY, sides=4)


piece('pasto_alto', tall_grass)


def young_palm(b):
    b.tube((0, 0, 0), (0.04, 0, 1.65), 0.13, 0.085, BARK_LIGHT, sides=8)
    for index in range(9):
        angle = index * math.tau / 9
        tip = (math.cos(angle) * 1.05, math.sin(angle) * 1.05, 1.40 + 0.12 * (index % 2))
        b.tube((0.04, 0, 1.62), tip, 0.045, 0.012, LEAF, sides=5)
        b.blob(tip, (0.42, 0.16, 0.055), LEAF_LIGHT if index % 2 else LEAF, subdiv=1)


piece('palma_joven', young_palm)


def shade_tree(b):
    b.tube((0, 0, 0), (0.08, 0, 2.25), 0.28, 0.16, BARK, sides=9)
    for angle in (0.2, 1.55, 2.8, 4.05, 5.25):
        end = (math.cos(angle) * 0.85, math.sin(angle) * 0.85, 2.75)
        b.tube((0.05, 0, 1.75), end, 0.13, 0.055, BARK, sides=7)
        b.blob(end, (0.78, 0.68, 0.52), LEAF, subdiv=1)
    b.blob((0, 0, 2.85), (1.05, 0.92, 0.66), LEAF_LIGHT, subdiv=1)


piece('arbol_sombra', shade_tree)

fg.export('naturaleza_modular.glb', scene, parts, materials=True)
print(f'naturaleza modular: {len(parts)} nodos')
