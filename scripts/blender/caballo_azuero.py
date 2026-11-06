# Caballo original de Azuero: montura terrestre con silla y tres clips propios.
# Mira a -Y, +Z arriba, cascos en z=0.
# blender --background --python scripts/blender/caballo_azuero.py
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg
import fg_rig


scene = fg.reset()
CHESTNUT = fg.material('caballo_alazan', (0.43, 0.19, 0.075), rough=0.82)
CHESTNUT_LIGHT = fg.material('caballo_alazan_luz', (0.64, 0.31, 0.12), rough=0.86)
DARK = fg.material('caballo_crin', (0.075, 0.043, 0.028), rough=0.78)
CREAM = fg.material('caballo_lucero', (0.77, 0.70, 0.56), rough=0.92)
HOOF = fg.material('caballo_casco', (0.115, 0.10, 0.085), rough=0.58)
LEATHER = fg.material('caballo_silla', (0.24, 0.055, 0.028), rough=0.76)
BRASS = fg.material('caballo_herrajes', (0.67, 0.39, 0.08), metallic=0.42, rough=0.40)
TURQUOISE = fg.material('caballo_manta_turquesa', (0.035, 0.40, 0.43), rough=0.94)
WINE = fg.material('caballo_manta_vino', (0.39, 0.035, 0.055), rough=0.94)
EYE = fg.material('caballo_ojo', (0.025, 0.018, 0.012), rough=0.18, emit=(0.08, 0.04, 0.01), strength=0.12)

bones = [
    ('hips', None, (0, 0.42, 1.05), (0, 0.08, 1.05)),
    ('chest', 'hips', (0, 0.08, 1.05), (0, -0.50, 1.14)),
    ('neck', 'chest', (0, -0.48, 1.16), (0, -0.78, 1.53)),
    ('head', 'neck', (0, -0.78, 1.53), (0, -1.16, 1.56)),
    ('tail', 'hips', (0, 0.48, 1.10), (0, 0.98, 0.78)),
    ('tailTip', 'tail', (0, 0.98, 0.78), (0, 1.20, 0.36)),
]
for side, x in (('L', 0.235), ('R', -0.235)):
    for end, y, parent in (('F', -0.42, 'chest'), ('B', 0.43, 'hips')):
        bones += [
            (f'upper{end}{side}', parent, (x, y, 0.96), (x, y, 0.56)),
            (f'lower{end}{side}', f'upper{end}{side}', (x, y, 0.56), (x, y, 0.14)),
            (f'hoof{end}{side}', f'lower{end}{side}', (x, y, 0.14), (x, y - 0.10, 0.035)),
        ]

rig = fg_rig.Rig(scene, 'FG_CaballoAzuero', bones)
b = fg.Builder('CaballoAzuero')

# Tronco atlético en dos masas para que pecho y grupa contrapesen de verdad.
b.tube((0, 0.56, 1.04), (0, 0.02, 1.06), 0.34, 0.38, CHESTNUT, 'hips', sides=14, flat=0.82)
b.tube((0, 0.02, 1.06), (0, -0.54, 1.14), 0.38, 0.31, CHESTNUT_LIGHT, 'chest', sides=14, flat=0.84)
b.blob((0, -0.43, 1.15), (0.33, 0.29, 0.36), CHESTNUT_LIGHT, 'chest', subdiv=2)

# Cuello arqueado, cabeza afinada, hocico, orejas y lucero frontal.
b.tube((0, -0.47, 1.18), (0, -0.76, 1.55), 0.24, 0.16, CHESTNUT, 'neck', sides=11, flat=0.78)
b.tube((0, -0.76, 1.55), (0, -1.12, 1.54), 0.18, 0.145, CHESTNUT_LIGHT, 'head', sides=10, flat=0.72)
b.tube((0, -1.10, 1.53), (0, -1.34, 1.43), 0.145, 0.105, DARK, 'head', sides=9, flat=0.70)
b.poly(
    [(-0.055, -0.96, 1.65), (0.055, -0.96, 1.65), (0.04, -1.18, 1.50), (-0.04, -1.18, 1.50)],
    [(-0.055, -0.93, 1.65), (0.055, -0.93, 1.65), (0.04, -1.15, 1.50), (-0.04, -1.15, 1.50)],
    CREAM, 'head',
)
for side in (-1, 1):
    x = 0.095 * side
    b.tube((x, -0.79, 1.64), (x * 1.18, -0.75, 1.86), 0.055, 0.012, CHESTNUT, 'head', sides=6, flat=0.55)
    b.blob((x, -1.02, 1.60), (0.027, 0.018, 0.026), EYE, 'head', subdiv=2)
    b.blob((x * 0.62, -1.35, 1.44), (0.018, 0.014, 0.012), EYE, 'head', subdiv=1)

# Crin segmentada y cola de dos tramos, oscuras para una silueta clara.
for i in range(8):
    t = i / 7
    y = -0.48 - t * 0.31
    z = 1.37 + t * 0.28
    b.poly(
        [(-0.02, y, z), (0.02, y, z), (0.035, y + 0.08, z + 0.03), (-0.035, y + 0.08, z + 0.03)],
        [(-0.02, y + 0.025, z), (0.02, y + 0.025, z), (0.035, y + 0.105, z + 0.03), (-0.035, y + 0.105, z + 0.03)],
        DARK, 'neck',
    )
b.tube((0, 0.48, 1.10), (0, 0.96, 0.78), 0.075, 0.10, DARK, 'tail', sides=8, flat=0.68)
b.tube((0, 0.96, 0.78), (0, 1.18, 0.34), 0.105, 0.045, DARK, 'tailTip', sides=9, flat=0.72)

# Cuatro patas articuladas, calcetines claros, menudillos y cascos separados.
for side, x in (('L', 0.235), ('R', -0.235)):
    for end, y in (('F', -0.42), ('B', 0.43)):
        upper = f'upper{end}{side}'
        lower = f'lower{end}{side}'
        hoof = f'hoof{end}{side}'
        b.tube((x, y, 1.00), (x, y, 0.56), 0.105 if end == 'B' else 0.09, 0.065, CHESTNUT, upper, sides=9)
        b.tube((x, y, 0.56), (x, y, 0.17), 0.062, 0.047, CREAM if side == 'L' else CHESTNUT_LIGHT, lower, sides=8)
        b.blob((x, y - 0.015, 0.15), (0.075, 0.07, 0.07), CHESTNUT, lower, subdiv=1)
        b.tube((x, y, 0.13), (x, y - 0.10, 0.035), 0.07, 0.095, HOOF, hoof, sides=9, flat=0.78)

# Manta con identidad cromática, silla, cincha, estribos y brida.
b.box((0, 0.10, 1.31), (0.64, 0.60, 0.055), TURQUOISE, 'hips')
b.box((0, 0.13, 1.34), (0.49, 0.42, 0.11), LEATHER, 'hips')
b.tube((0, 0.29, 1.40), (0, 0.36, 1.48), 0.19, 0.13, LEATHER, 'hips', sides=8, flat=0.30)
for x in (-0.27, 0.27):
    b.tube((x, 0.08, 1.31), (x, 0.08, 0.92), 0.018, 0.018, BRASS, 'hips', sides=6)
    b.poly(
        [(x - 0.06, 0.04, 0.91), (x + 0.06, 0.04, 0.91), (x + 0.045, 0.04, 0.77), (x - 0.045, 0.04, 0.77)],
        [(x - 0.06, 0.08, 0.91), (x + 0.06, 0.08, 0.91), (x + 0.045, 0.08, 0.77), (x - 0.045, 0.08, 0.77)],
        BRASS, 'hips',
    )
for x in (-0.305, 0.305):
    b.box((x, 0.10, 1.30), (0.055, 0.58, 0.035), WINE, 'hips')
b.tube((-0.13, -1.05, 1.58), (0.13, -1.05, 1.58), 0.018, 0.018, LEATHER, 'head', sides=6)
b.tube((0.13, -1.05, 1.58), (0.13, -0.74, 1.47), 0.018, 0.018, LEATHER, 'head', sides=6)
b.tube((-0.13, -1.05, 1.58), (-0.13, -0.74, 1.47), 0.018, 0.018, LEATHER, 'head', sides=6)

rig.part(b)


def trot_pose(sign):
    # Diagonales: FL+BR frente, FR+BL atrás; la siguiente clave invierte.
    pose = {
        'hips': (2, 0, 3 * sign), 'chest': (-2, 0, -3 * sign),
        'neck': (4, 0, 2 * sign), 'head': (-3, 0, -2 * sign),
        'tail': (-6, 0, -8 * sign), 'tailTip': (8, 0, 12 * sign),
    }
    for side, side_sign in (('L', 1), ('R', -1)):
        for end, end_sign in (('F', 1), ('B', -1)):
            phase = sign * side_sign * end_sign
            pose[f'upper{end}{side}'] = (-27 * phase, 0, 0)
            pose[f'lower{end}{side}'] = (38 if phase < 0 else 10, 0, 0)
            pose[f'hoof{end}{side}'] = (-12 if phase > 0 else 14, 0, 0)
    return pose


rig.clip('Reposo', [
    (1, {}),
    (20, {'neck': (3, 0, -4), 'head': (-4, 0, 7), 'tail': (0, 0, 7), 'tailTip': (0, 0, -12)}, (0, 0, -0.006)),
    (40, {'neck': (8, 0, 4), 'head': (-7, 0, -9), 'tail': (0, 0, -7), 'tailTip': (0, 0, 12)}),
    (60, {'neck': (3, 0, -4), 'head': (-4, 0, 7), 'tail': (0, 0, 7), 'tailTip': (0, 0, -12)}, (0, 0, -0.006)),
    (80, {}),
])

# Paso de cuatro tiempos, suave para exploración.
walk_keys = []
order = [('upperFL', 'lowerFL', 'hoofFL'), ('upperBR', 'lowerBR', 'hoofBR'), ('upperFR', 'lowerFR', 'hoofFR'), ('upperBL', 'lowerBL', 'hoofBL')]
for i in range(9):
    active = i % 4
    pose = {'hips': (1, 0, 2 * math.sin(i * math.pi / 2)), 'neck': (2, 0, 0), 'head': (-2, 0, 0), 'tail': (-3, 0, 4 * math.sin(i * math.pi / 2))}
    for j, (upper, lower, hoof) in enumerate(order):
        phase = (j - active) % 4
        pose[upper] = (-17 if phase == 0 else (12 if phase == 2 else 0), 0, 0)
        pose[lower] = (30 if phase == 0 else 5, 0, 0)
        pose[hoof] = (-8 if phase == 0 else 3, 0, 0)
    walk_keys.append((1 + i * 4, pose, (0, 0, 0.018 if active in (1, 3) else 0)))
rig.clip('Paso', walk_keys)

rig.clip('Trotar', [
    (1, trot_pose(1), (0, 0, 0)),
    (5, trot_pose(0), (0, 0, 0.065)),
    (9, trot_pose(-1), (0, 0, 0)),
    (13, trot_pose(0), (0, 0, 0.065)),
    (17, trot_pose(1), (0, 0, 0)),
])

rig.export('caballo_azuero.glb')
