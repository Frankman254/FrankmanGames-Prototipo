# Montura de desarrollo: gran ave terrestre inspirada en el águila harpía de Panamá.
# Geometría, rig y clips propios; mira a -Y, +Z arriba, patas en z=0.
# blender --background --python scripts/blender/montura_arpia.py
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg
import fg_rig


scene = fg.reset()
SLATE = fg.material('arpia_pizarra_suave', (0.30, 0.39, 0.52), rough=0.82)
DARK = fg.material('arpia_collar_petroleo', (0.07, 0.15, 0.20), rough=0.76)
WHITE = fg.material('arpia_plumon_calido', (0.90, 0.82, 0.68), rough=0.90)
GOLD = fg.material('arpia_pico_palido', (0.86, 0.68, 0.24), rough=0.62)
LEATHER = fg.material('arpia_silla', (0.30, 0.12, 0.07), rough=0.82)
BRONZE = fg.material('arpia_herrajes', (0.62, 0.37, 0.10), metallic=0.38, rough=0.48)
TURQUOISE = fg.material('arpia_manta_turquesa', (0.05, 0.52, 0.58), rough=0.82)
CORAL = fg.material('arpia_ribete_coral', (0.88, 0.24, 0.20), rough=0.80)
EYE = fg.material('arpia_ojos_cacao', (0.12, 0.055, 0.025), rough=0.22)
GLINT = fg.material('arpia_brillo_ojos', (0.95, 0.90, 0.72), rough=0.16, emit=(0.35, 0.30, 0.18), strength=0.20)

bones = [
    ('hips', None, (0, 0.35, 1.02), (0, 0.02, 1.02)),
    ('chest', 'hips', (0, 0.02, 1.02), (0, -0.48, 1.13)),
    ('neck', 'chest', (0, -0.48, 1.13), (0, -0.72, 1.38)),
    ('head', 'neck', (0, -0.72, 1.38), (0, -1.02, 1.42)),
    ('tail', 'hips', (0, 0.38, 1.02), (0, 0.98, 0.72)),
    ('wingL', 'chest', (0.20, -0.08, 1.17), (0.58, 0.18, 1.05)),
    ('wingTipL', 'wingL', (0.58, 0.18, 1.05), (0.82, 0.62, 0.72)),
    ('wingR', 'chest', (-0.20, -0.08, 1.17), (-0.58, 0.18, 1.05)),
    ('wingTipR', 'wingR', (-0.58, 0.18, 1.05), (-0.82, 0.62, 0.72)),
]
for side, x in (('L', 0.16), ('R', -0.16)):
    bones += [
        (f'leg{side}', 'hips', (x, 0.24, 0.90), (x, 0.08, 0.48)),
        (f'shin{side}', f'leg{side}', (x, 0.08, 0.48), (x, -0.02, 0.13)),
        (f'foot{side}', f'shin{side}', (x, -0.02, 0.13), (x, -0.22, 0.035)),
    ]

rig = fg_rig.Rig(scene, 'FG_MonturaArpia', bones)
b = fg.Builder('Arpia')

# Tronco redondo de pichón, pecho claro y collar de plumas.
b.tube((0, 0.48, 1.02), (0, -0.18, 1.08), 0.36, 0.42, SLATE, 'hips', sides=14, flat=0.88)
b.tube((0, -0.18, 1.08), (0, -0.55, 1.18), 0.42, 0.29, WHITE, 'chest', sides=14, flat=0.90)
b.tube((0, -0.48, 1.16), (0, -0.74, 1.42), 0.23, 0.17, WHITE, 'neck', sides=10, flat=0.88)
for x in (-0.18, -0.09, 0, 0.09, 0.18):
    b.poly([(x - 0.055, -0.59, 1.27), (x + 0.055, -0.59, 1.27), (x, -0.63, 1.08)],
           [(x - 0.055, -0.55, 1.27), (x + 0.055, -0.55, 1.27), (x, -0.59, 1.08)], WHITE, 'neck')

# Cabeza grande, máscara suave, pico corto y ojos redondos de pichón.
b.blob((0, -0.83, 1.46), (0.25, 0.23, 0.23), SLATE, 'head', subdiv=2)
b.poly([(-0.20, -1.00, 1.55), (0.20, -1.00, 1.55), (0.14, -1.04, 1.34), (-0.14, -1.04, 1.34)],
       [(-0.20, -0.94, 1.55), (0.20, -0.94, 1.55), (0.14, -0.98, 1.34), (-0.14, -0.98, 1.34)], DARK, 'head')
b.tube((0, -1.04, 1.43), (0, -1.20, 1.39), 0.085, 0.04, GOLD, 'head', sides=8, flat=0.70)
b.tube((0, -1.19, 1.39), (0, -1.14, 1.34), 0.04, 0.015, DARK, 'head', sides=6, flat=0.65)
for x in (-0.075, 0.075):
    b.blob((x * 1.35, -1.045, 1.49), (0.054, 0.022, 0.060), WHITE, 'head', subdiv=2)
    b.blob((x * 1.35, -1.067, 1.485), (0.035, 0.012, 0.041), EYE, 'head', subdiv=2)
    b.blob((x * 1.35 - 0.011, -1.078, 1.505), (0.010, 0.005, 0.012), GLINT, 'head', subdiv=1)
for side in (-1, 1):
    for index, x in enumerate((0.045, 0.115, 0.19)):
        b.tube((side * x * 0.55, -0.72, 1.59), (side * x, -0.59 + index * 0.018, 1.88 - index * 0.018), 0.035, 0.009, DARK if index != 1 else CORAL, 'head', sides=6)

# Alas plegadas por capas: silueta ancha en hombros, plumas hacia la cola.
for side, bone, tip_bone in ((1, 'wingL', 'wingTipL'), (-1, 'wingR', 'wingTipR')):
    shoulder = 0.20 * side
    b.poly([(shoulder, -0.12, 1.26), (0.52 * side, -0.02, 1.20), (0.64 * side, 0.45, 0.76), (0.28 * side, 0.40, 0.82)],
           [(shoulder, -0.03, 1.26), (0.52 * side, 0.05, 1.20), (0.64 * side, 0.52, 0.76), (0.28 * side, 0.47, 0.82)], SLATE, bone)
    for i in range(5):
        x = (0.34 + i * 0.07) * side
        b.tube((x, 0.18, 1.04 - i * 0.018), ((0.52 + i * 0.065) * side, 0.70 + i * 0.06, 0.92 + i * 0.045), 0.060, 0.020, DARK if i % 2 else SLATE, tip_bone, sides=6, flat=0.45)
    for i in range(4):
        x = (0.28 + i * 0.07) * side
        b.poly([(x, -0.04, 1.20), (x + 0.08 * side, -0.01, 1.17), (x + 0.11 * side, 0.28, 0.88)],
               [(x, 0.01, 1.20), (x + 0.08 * side, 0.04, 1.17), (x + 0.11 * side, 0.33, 0.88)], WHITE, bone)

# Cola en abanico: las seis timoneras se curvan hacia arriba.
for i, x in enumerate((-0.24, -0.14, -0.05, 0.05, 0.14, 0.24)):
    mat = WHITE if i % 2 else SLATE
    rise = 1.12 + 0.16 * (1 - abs(x) / 0.25)
    b.poly([(x - 0.06, 0.34, 1.00), (x + 0.06, 0.34, 1.00), (x + 0.085, 1.02, rise - 0.05), (x, 1.16, rise), (x - 0.085, 1.02, rise - 0.05)],
           [(x - 0.06, 0.40, 1.00), (x + 0.06, 0.40, 1.00), (x + 0.085, 1.08, rise - 0.05), (x, 1.22, rise), (x - 0.085, 1.08, rise - 0.05)], mat, 'tail')

# Patas robustas y garras abiertas.
for side, x in (('L', 0.16), ('R', -0.16)):
    b.tube((x, 0.20, 0.90), (x, 0.08, 0.48), 0.095, 0.065, WHITE, f'leg{side}', sides=8)
    b.tube((x, 0.08, 0.48), (x, -0.02, 0.13), 0.058, 0.038, GOLD, f'shin{side}', sides=8)
    b.tube((x, -0.02, 0.13), (x, -0.22, 0.055), 0.04, 0.027, GOLD, f'foot{side}', sides=7)
    for spread in (-0.085, 0, 0.085):
        b.tube((x, -0.18, 0.07), (x + spread, -0.34, 0.025), 0.018, 0.008, GOLD, f'foot{side}', sides=6)
        b.tube((x + spread, -0.34, 0.025), (x + spread, -0.37, 0.055), 0.008, 0.003, DARK, f'foot{side}', sides=5)

# Manta turquesa con ribete coral, silla, cinchas y asa; deja el centro libre.
b.box((0, 0.22, 1.285), (0.60, 0.48, 0.045), CORAL, 'hips')
b.box((0, 0.22, 1.305), (0.54, 0.42, 0.045), TURQUOISE, 'hips')
b.tube((0, 0.08, 1.34), (0, 0.38, 1.34), 0.27, 0.24, LEATHER, 'hips', sides=10, flat=0.25)
b.box((0, 0.22, 1.35), (0.44, 0.34, 0.07), LEATHER, 'hips')
b.tube((-0.25, 0.18, 1.31), (-0.25, 0.18, 0.92), 0.018, 0.018, BRONZE, 'hips', sides=6)
b.tube((0.25, 0.18, 1.31), (0.25, 0.18, 0.92), 0.018, 0.018, BRONZE, 'hips', sides=6)
b.tube((-0.13, 0.36, 1.39), (0.13, 0.36, 1.39), 0.025, 0.025, BRONZE, 'hips', sides=7)
rig.part(b)


def locomotion(t):
    step = math.sin(2 * math.pi * t)
    lift = abs(math.sin(2 * math.pi * t))
    return {
        'hips': (4 + 2 * lift, 0, 3 * step),
        'chest': (-3, 0, -4 * step),
        'neck': (6 * lift, 0, 2 * step),
        'head': (-5 * lift, 0, -2 * step),
        'tail': (-5 * lift, 0, -8 * step),
        'wingL': (-7 * lift, 3, -4 * step), 'wingTipL': (9 * lift, 0, 0),
        'wingR': (-7 * lift, -3, -4 * step), 'wingTipR': (9 * lift, 0, 0),
        'legL': (-28 * step, 0, 0), 'shinL': (36 * max(0, -step), 0, 0),
        'footL': (-12 * max(0, step), 0, 0),
        'legR': (28 * step, 0, 0), 'shinR': (36 * max(0, step), 0, 0),
        'footR': (-12 * max(0, -step), 0, 0),
    }, (0, 0, 0.16 * lift)


rig.clip('Reposo', [
    (1, {}),
    (24, {'chest': (-2, 0, 0), 'neck': (4, 0, -5), 'head': (-3, 0, 8), 'wingL': (-3, 2, 0), 'wingR': (-3, -2, 0)}, (0, 0, -0.01)),
    (48, {'neck': (2, 0, 7), 'head': (-2, 0, -12), 'tail': (0, 0, 6)}),
    (72, {'chest': (-2, 0, 0), 'neck': (4, 0, -5), 'head': (-3, 0, 8), 'wingL': (-3, 2, 0), 'wingR': (-3, -2, 0)}, (0, 0, -0.01)),
    (96, {}),
])
rig.clip('Trotar', [(1 + i * 2, *locomotion(i / 12)) for i in range(13)])
rig.clip('Volar', [
    (1, {'chest': (-6, 0, 0), 'wingL': (8, 0, -12), 'wingTipL': (20, 0, -8), 'wingR': (8, 0, 12), 'wingTipR': (20, 0, 8), 'tail': (-8, 0, 0)}, (0, 0, 0.02)),
    (7, {'chest': (5, 0, 0), 'wingL': (-58, 0, -25), 'wingTipL': (-35, 0, -12), 'wingR': (-58, 0, 25), 'wingTipR': (-35, 0, 12), 'tail': (10, 0, 0)}, (0, 0, 0.10)),
    (13, {'chest': (-8, 0, 0), 'wingL': (18, 0, -8), 'wingTipL': (34, 0, 10), 'wingR': (18, 0, 8), 'wingTipR': (34, 0, -10), 'tail': (-12, 0, 0)}, (0, 0, -0.02)),
    (19, {'chest': (5, 0, 0), 'wingL': (-58, 0, -25), 'wingTipL': (-35, 0, -12), 'wingR': (-58, 0, 25), 'wingTipR': (-35, 0, 12), 'tail': (10, 0, 0)}, (0, 0, 0.10)),
    (25, {'chest': (-6, 0, 0), 'wingL': (8, 0, -12), 'wingTipL': (20, 0, -8), 'wingR': (8, 0, 12), 'wingTipR': (20, 0, 8), 'tail': (-8, 0, 0)}, (0, 0, 0.02)),
])
rig.clip('Planear', [
    (1, {'chest': (-7, 0, 0), 'neck': (5, 0, 0), 'wingL': (-18, 0, -58), 'wingTipL': (-8, 0, -24), 'wingR': (-18, 0, 58), 'wingTipR': (-8, 0, 24), 'tail': (-14, 0, 0)}),
    (24, {'chest': (-5, 0, 2), 'neck': (3, 0, -3), 'wingL': (-16, 0, -55), 'wingTipL': (-6, 0, -20), 'wingR': (-16, 0, 55), 'wingTipR': (-6, 0, 20), 'tail': (-10, 0, 5)}, (0, 0, 0.025)),
    (48, {'chest': (-7, 0, 0), 'neck': (5, 0, 0), 'wingL': (-18, 0, -58), 'wingTipL': (-8, 0, -24), 'wingR': (-18, 0, 58), 'wingTipR': (-8, 0, 24), 'tail': (-14, 0, 0)}),
])
rig.export('montura_arpia.glb')
