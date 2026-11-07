# Piezas decorativas originales del Istmo; propuestas pendientes de revisión cultural.
# No reproduce escudos, monedas, marcas ni patrones oficiales.
# blender --background --python scripts/blender/simbolos_istmo.py
import importlib
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)
scene = fg.fresh_scene('SimbolosIstmo')
parts = []


def mat(name, rgb, **kwargs):
    return fg.material('sim_' + name, rgb, **kwargs)


STONE = mat('piedra', (0.34, 0.36, 0.36), rough=0.88)
STONE_LIGHT = mat('piedra_luz', (0.52, 0.54, 0.52), rough=0.86)
GOLD = mat('oro', (0.78, 0.49, 0.09), metallic=0.48, rough=0.38)
GOLD_DARK = mat('oro_viejo', (0.42, 0.23, 0.055), metallic=0.36, rough=0.48)
WOOD = mat('madera', (0.30, 0.16, 0.075), rough=0.84)
STRAW = mat('fibra', (0.72, 0.57, 0.28), rough=0.96)
BLACK = mat('fibra_oscura', (0.055, 0.048, 0.04), rough=0.92)
CREAM = mat('tela_crema', (0.87, 0.81, 0.68), rough=0.98)
WINE = mat('tela_vino', (0.43, 0.035, 0.055), rough=0.96)
TURQUOISE = mat('tela_turquesa', (0.035, 0.40, 0.43), rough=0.94)
STEEL = mat('acero', (0.39, 0.42, 0.44), metallic=0.42, rough=0.36)
LEATHER = mat('cuero', (0.20, 0.065, 0.025), rough=0.76)


def piece(name, build):
    builder = fg.Builder('simbolo_' + name)
    build(builder)
    parts.append(builder.object(scene))


def ring(builder, radius, z, material, segments=20, thickness=0.025, center=(0, 0)):
    previous = None
    for index in range(segments + 1):
        angle = 2 * math.pi * index / segments
        point = (center[0] + radius * math.cos(angle), center[1] + radius * math.sin(angle), z)
        if previous:
            builder.tube(previous, point, thickness, thickness, material, sides=5)
        previous = point


def harpy_statue(b):
    b.tube((0, 0, 0), (0, 0, 0.20), 0.72, 0.62, STONE_LIGHT, sides=10)
    b.tube((0, 0, 0.20), (0, 0, 0.46), 0.52, 0.45, STONE, sides=10)
    b.box((0, -0.43, 0.29), (0.48, 0.035, 0.16), GOLD_DARK)
    # Ave erguida, distinta de la montura: alas abiertas como arco escultórico.
    b.blob((0, 0, 1.14), (0.30, 0.24, 0.52), STONE_LIGHT, subdiv=2)
    b.tube((0, -0.08, 1.50), (0, -0.16, 1.78), 0.18, 0.14, STONE_LIGHT, sides=9, flat=0.82)
    b.blob((0, -0.20, 1.88), (0.16, 0.15, 0.15), STONE_LIGHT, subdiv=2)
    b.tube((0, -0.32, 1.88), (0, -0.50, 1.82), 0.075, 0.018, GOLD_DARK, sides=6, flat=0.60)
    for side in (-1, 1):
        # Arco del ala y cinco plumas separadas.
        b.tube((0.16 * side, 0, 1.54), (0.72 * side, 0.02, 1.80), 0.15, 0.10, STONE, sides=7, flat=0.50)
        b.tube((0.72 * side, 0.02, 1.80), (1.03 * side, 0.10, 1.58), 0.10, 0.04, STONE, sides=7, flat=0.45)
        for index in range(5):
            x = (0.34 + index * 0.13) * side
            b.tube((x, 0.04, 1.68 - index * 0.015), ((0.60 + index * 0.14) * side, 0.15, 1.20 - index * 0.08), 0.055, 0.018, STONE_LIGHT, sides=6, flat=0.42)
        for index in range(3):
            x = (0.04 + index * 0.065) * side
            b.tube((x, -0.14, 1.97), (x * 1.55, -0.07, 2.17 - index * 0.025), 0.025, 0.006, STONE, sides=5)
        b.tube((0.13 * side, -0.03, 0.87), (0.18 * side, -0.18, 0.48), 0.055, 0.035, GOLD_DARK, sides=6)
        for spread in (-0.055, 0, 0.055):
            b.tube((0.18 * side, -0.17, 0.49), (0.18 * side + spread, -0.35, 0.45), 0.012, 0.004, GOLD_DARK, sides=5)


piece('estatua_arpia', harpy_statue)


def fictional_coins(b):
    stacks = ((-0.36, 0.05, 4), (0.0, 0.0, 7), (0.34, 0.12, 5))
    for x, y, count in stacks:
        for index in range(count):
            z = 0.025 + index * 0.045
            b.tube((x, y, z), (x, y, z + 0.035), 0.23, 0.23, GOLD, sides=18)
        ring(b, 0.115, 0.044 + (count - 1) * 0.045, GOLD_DARK, segments=14, thickness=0.014, center=(x, y))
    # Tres monedas caídas con símbolos abstractos de ola/estrella, nunca moneda real.
    for x, y in ((-0.18, -0.38), (0.29, -0.31), (0.56, 0.0)):
        b.tube((x, y, 0.018), (x, y, 0.052), 0.22, 0.22, GOLD, sides=18)
        ring(b, 0.105, 0.055, GOLD_DARK, segments=12, thickness=0.012, center=(x, y))


piece('monedas_ficticias', fictional_coins)


def woven_hat(b):
    b.tube((0, 0, 0.08), (0, 0, 0.15), 0.73, 0.73, STRAW, sides=24, flat=0.82)
    b.tube((0, 0, 0.15), (0, 0, 0.58), 0.38, 0.29, STRAW, sides=18, flat=0.88)
    b.tube((0, 0, 0.58), (0, 0, 0.66), 0.29, 0.25, STRAW, sides=18, flat=0.88)
    for radius, z in ((0.68, 0.155), (0.48, 0.158), (0.36, 0.31), (0.33, 0.49)):
        ring(b, radius, z, BLACK, segments=28, thickness=0.022)
    for angle in range(0, 360, 45):
        a = math.radians(angle)
        b.tube((0.39 * math.cos(a), 0.39 * math.sin(a), 0.16), (0.65 * math.cos(a), 0.65 * math.sin(a), 0.16), 0.018, 0.011, BLACK, sides=4)


piece('sombrero_trenzado', woven_hat)


def festive_dress(b):
    # Expositor, no traje etnográfico certificado: silueta festiva original.
    b.tube((0, 0, 0), (0, 0, 0.12), 0.46, 0.36, WOOD, sides=10)
    b.tube((0, 0, 0.12), (0, 0, 2.28), 0.045, 0.035, WOOD, sides=7)
    b.tube((0, 0, 1.84), (0, 0, 2.30), 0.19, 0.15, CREAM, sides=10, flat=0.74)
    # Falda ancha en tres volúmenes escalonados.
    b.tube((0, 0, 0.20), (0, 0, 0.72), 0.86, 0.69, CREAM, sides=20, flat=0.88)
    b.tube((0, 0, 0.72), (0, 0, 1.24), 0.69, 0.50, CREAM, sides=20, flat=0.88)
    b.tube((0, 0, 1.24), (0, 0, 1.84), 0.50, 0.22, CREAM, sides=18, flat=0.84)
    for z, radius, color in ((0.34, 0.82, WINE), (0.50, 0.76, TURQUOISE), (0.86, 0.63, WINE), (1.02, 0.57, GOLD)):
        b.tube((0, 0, z), (0, 0, z + 0.045), radius, radius, color, sides=20, flat=0.88)
    for side in (-1, 1):
        b.tube((0.13 * side, 0, 2.18), (0.46 * side, 0, 2.00), 0.11, 0.17, CREAM, sides=8, flat=0.65)
        b.tube((0.46 * side, 0, 2.00), (0.62 * side, 0, 2.08), 0.17, 0.04, CREAM, sides=8, flat=0.65)
        for index in range(3):
            x = (0.10 + index * 0.09) * side
            b.tube((x, 0, 2.31), (x * 1.10, 0, 2.58 - index * 0.03), 0.025, 0.007, GOLD, sides=5)


piece('vestido_festivo', festive_dress)


def gold_earrings(b):
    for side in (-1, 1):
        x = side * 0.34
        ring(b, 0.18, 0.72, GOLD, segments=18, thickness=0.035, center=(x, 0))
        b.tube((x, 0, 0.52), (x, 0, 0.38), 0.025, 0.018, GOLD_DARK, sides=6)
        b.poly(
            [(x - 0.13, -0.035, 0.38), (x + 0.13, -0.035, 0.38), (x, -0.035, 0.08)],
            [(x - 0.13, 0.035, 0.38), (x + 0.13, 0.035, 0.38), (x, 0.035, 0.08)],
            GOLD,
        )
        ring(b, 0.055, 0.27, TURQUOISE, segments=12, thickness=0.018, center=(x, 0))


piece('aretes_oro', gold_earrings)


def ceremonial_machete(b):
    b.poly(
        [(-0.08, -0.035, 0.56), (0.08, -0.035, 0.56), (0.13, -0.035, 1.82), (0.05, -0.035, 2.14), (-0.12, -0.035, 1.96)],
        [(-0.08, 0.035, 0.56), (0.08, 0.035, 0.56), (0.13, 0.035, 1.82), (0.05, 0.035, 2.14), (-0.12, 0.035, 1.96)],
        STEEL,
    )
    b.tube((0, 0, 0.08), (0, 0, 0.62), 0.09, 0.075, LEATHER, sides=9, flat=0.72)
    b.tube((0, 0, 0.52), (0, 0, 0.64), 0.16, 0.12, GOLD, sides=10, flat=0.70)
    for z in (0.16, 0.28, 0.40):
        b.tube((0, 0, z), (0, 0, z + 0.04), 0.095, 0.095, TURQUOISE if z == 0.28 else WINE, sides=9, flat=0.72)
    # Base expositora incluida en la pieza decorativa.
    b.tube((0, 0, 0), (0, 0, 0.08), 0.44, 0.34, WOOD, sides=10)


piece('machete_ceremonial', ceremonial_machete)

fg.export('simbolos_istmo.glb', scene, parts, materials=True)
print('simbolos_istmo:', len(parts), 'piezas originales')
