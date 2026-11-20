# Fauna de Chame (OMP-FA-02): caimán joven (`chame_caiman`) y garza zancuda
# (`chame_heron`). Dos esqueletos y dos GLB en un solo .blend, como ave.py.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/fauna_chame.py
# Escribe assets/models/caiman.glb y assets/models/garza.glb y salva
# arte/blender/fauna_chame.blend. NO se integra: nada toca data/ ni src/.
#
#   Caimán: hocico largo y estrecho con dientes a la vista, placas óseas (escudos)
#           en dos quillas por el lomo y en la cola, patas cortas abiertas hacia
#           fuera y cola de remo que ondea al andar. ~1,3 m de morro a cola.
#   Garza:  zancuda — patas larguísimas, cuello en S, pico de daga curvado arriba,
#           cuerpo negro con pechuga clara y alas plegadas a la espalda. ~1,3 m de
#           alto; envergadura plegada ~0,4 m, ~1,3 m con las alas abiertas.
#
# Convenciones de la casa: mira a -Y, +Z arriba, escala en metros, apoyo en z=0 en
# el fotograma 1 (Reposo). Cinco clips por bicho (Reposo, Caminar, Atacar, Golpeado,
# Morir) con los bucles sin salto. Materiales por región teñible: skin (cuero y
# pico), cloth (cuerpo), trim (claros), hair (oscuros), gear (uñas y dientes).
# ≤1500 triángulos por bicho. En el .blend las acciones se prefijan por bicho
# DESPUÉS de exportar cada GLB para que convivan sin colisión de nombres.
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import fg  # noqa: E402
import fg_rig  # noqa: E402

CLIPS = {'Reposo', 'Caminar', 'Atacar', 'Golpeado', 'Morir'}


def V(t):
    return Vector(t)


def mats():
    return dict(
        skin=fg.material('skin', (0.36, 0.30, 0.17)),      # cuero oliváceo / pico córneo
        cloth=fg.material('cloth', (0.16, 0.16, 0.15)),    # dorso / plumas negras
        trim=fg.material('trim', (0.82, 0.80, 0.74)),      # vientre / pechuga clara
        hair=fg.material('hair', (0.10, 0.09, 0.08)),      # escudos oscuros, plumas
        gear=fg.material('gear', (0.88, 0.86, 0.80), rough=0.45),  # dientes, uñas
        ojo=fg.material('ojo_caiman', (0.75, 0.55, 0.16), rough=0.3),
    )


# ============================================================
# Caimán joven
# ============================================================
CAIMAN_BONES = [
    ('hips', None, (0, 0.32, 0.17), (0, 0.06, 0.19)),
    ('chest', 'hips', (0, 0.06, 0.19), (0, -0.16, 0.20)),
    ('neck', 'chest', (0, -0.16, 0.20), (0, -0.24, 0.215)),
    ('head', 'neck', (0, -0.24, 0.215), (0, -0.46, 0.19)),
    ('jaw', 'head', (0, -0.26, 0.175), (0, -0.45, 0.155)),
    ('tail1', 'hips', (0, 0.32, 0.17), (0, 0.54, 0.175)),
    ('tail2', 'tail1', (0, 0.54, 0.175), (0, 0.74, 0.185)),
    ('tail3', 'tail2', (0, 0.74, 0.185), (0, 0.92, 0.21)),
]
for name, x, y, parent in (('FL', 0.135, -0.06, 'chest'), ('FR', -0.135, -0.06, 'chest'),
                           ('BL', 0.13, 0.30, 'hips'), ('BR', -0.13, 0.30, 'hips')):
    CAIMAN_BONES += [
        (f'leg{name}', parent, (x, y, 0.135), (x * 1.35, y, 0.075)),
        (f'shin{name}', f'leg{name}', (x * 1.35, y, 0.075), (x * 1.55, y - 0.03, 0.03)),
    ]


def quilla(b, m, hueso, tramos, alto, zbase, ancho=0.02):
    """Dos quillas de escudos óseos: prismas triangulares a lo largo del lomo."""
    for i, (y0, y1) in enumerate(tramos):
        yc = (y0 + y1) / 2
        z = zbase(i / max(1, len(tramos) - 1))
        b.poly([(-ancho, y0, z), (ancho, y0, z), (0, yc, z + alto)],
               [(-ancho * 0.8, y1, z), (ancho * 0.8, y1, z), (0, yc + (y1 - y0) * 0.35, z + alto * 0.85)],
               m['hair'], hueso)


def caiman_mesh(b, m):
    # tronco: ancho y bajo, aplastado en Z
    b.tube((0, 0.34, 0.165), (0, 0.10, 0.185), 0.105, 0.125, m['cloth'], 'hips', sides=8, flat=0.62)
    b.tube((0, 0.10, 0.185), (0, -0.14, 0.20), 0.125, 0.105, m['cloth'], 'chest', sides=8, flat=0.62)
    b.blob((0, 0.22, 0.17), (0.12, 0.16, 0.085), m['cloth'], 'hips', subdiv=1)
    # panza clara
    b.blob((0, -0.02, 0.135), (0.10, 0.22, 0.05), m['trim'], 'chest', subdiv=1)
    # cuello corto y grueso
    b.tube((0, -0.14, 0.20), (0, -0.25, 0.215), 0.095, 0.072, m['skin'], 'neck', sides=7, flat=0.75)
    # cráneo: bloque bajo los ojos y hocico largo y estrecho que baja
    b.blob((0, -0.255, 0.225), (0.075, 0.075, 0.05), m['skin'], 'head', subdiv=1)
    b.tube((0, -0.27, 0.205), (0, -0.38, 0.185), 0.052, 0.034, m['skin'], 'head', sides=6, flat=0.72)
    b.tube((0, -0.38, 0.185), (0, -0.46, 0.175), 0.034, 0.018, m['skin'], 'head', sides=6, flat=0.8)
    # mandíbula: cuña que cierra contra el hocico
    b.tube((0, -0.275, 0.168), (0, -0.38, 0.162), 0.046, 0.028, m['skin'], 'jaw', sides=6, flat=0.72)
    b.tube((0, -0.38, 0.162), (0, -0.45, 0.160), 0.028, 0.012, m['skin'], 'jaw', sides=6, flat=0.8)
    # dientes: los de abajo asoman por fuera del hocico cerrado (señal de cocodrilo)
    for x in (-1, 1):
        for t in (0.25, 0.45, 0.65, 0.85):
            px = x * (0.040 - 0.020 * t)   # el hocico se estrecha hacia la punta
            py = -0.28 - 0.16 * t
            pz = 0.185 - 0.008 * t
            b.poly([(px - 0.006 * (1 if x > 0 else -1), py + 0.010, pz - 0.004),
                    (px + 0.006 * (1 if x > 0 else -1), py + 0.010, pz - 0.004),
                    (px, py + 0.004, pz - 0.004)],
                   [(px - 0.003, py + 0.006, pz - 0.026),
                    (px + 0.003, py + 0.006, pz - 0.026),
                    (px, py + 0.002, pz - 0.026)],
                   m['gear'], 'head')
            # colmillos de la mandibula que muerden por dentro del maxilar
            if t in (0.45, 0.85):
                b.poly([(px * 0.8 - 0.003, py + 0.002, pz - 0.018),
                        (px * 0.8 + 0.003, py + 0.002, pz - 0.018),
                        (px * 0.8, py - 0.002, pz - 0.018)],
                       [(px * 0.8 - 0.002, py + 0.002, pz + 0.008),
                        (px * 0.8 + 0.002, py + 0.002, pz + 0.008),
                        (px * 0.8, py - 0.002, pz + 0.010)],
                       m['gear'], 'jaw')
    # ojos saltones sobre el cráneo y orificios nasales
    for x in (-1, 1):
        b.blob((x * 0.048, -0.245, 0.268), (0.024, 0.026, 0.024), m['ojo'], 'head', subdiv=1)
        b.blob((x * 0.050, -0.243, 0.280), (0.011, 0.012, 0.009), m['hair'], 'head', subdiv=1)
        b.blob((x * 0.022, -0.435, 0.185), (0.012, 0.014, 0.009), m['hair'], 'head', subdiv=1)
    # dos quillas de escudos por el lomo y una por la cara superior de la cola
    quilla(b, m, 'hips', ((0.18, 0.28), (0.28, 0.38)), 0.030, lambda t: 0.235, 0.020)
    quilla(b, m, 'chest', ((-0.06, 0.04), (0.04, 0.14)), 0.032, lambda t: 0.248, 0.020)
    quilla(b, m, 'tail1', ((0.36, 0.48),), 0.028, lambda t: 0.235, 0.017)
    quilla(b, m, 'tail2', ((0.55, 0.67),), 0.020, lambda t: 0.230, 0.013)
    quilla(b, m, 'tail3', ((0.76, 0.86),), 0.013, lambda t: 0.235, 0.009)
    # cola de remo: prismas que se aplatan y una aleta colgante detrás de las patas
    b.tube((0, 0.32, 0.168), (0, 0.56, 0.175), 0.095, 0.062, m['cloth'], 'tail1', sides=7, flat=0.55)
    b.tube((0, 0.56, 0.175), (0, 0.74, 0.185), 0.062, 0.038, m['cloth'], 'tail2', sides=6, flat=0.5)
    b.tube((0, 0.74, 0.185), (0, 0.90, 0.205), 0.038, 0.012, m['cloth'], 'tail3', sides=6, flat=0.45)
    for hueso, (y0, y1), zb, zt in (('tail1', (0.34, 0.55), 0.135, 0.148), ('tail2', (0.55, 0.73), 0.150, 0.162)):
        b.poly([(-0.012, y0, zb), (0.012, y0, zb), (0, (y0 + y1) / 2, zb - 0.055)],
               [(-0.010, y1, zt), (0.010, y1, zt), (0, y1 + 0.02, zt - 0.040)], m['hair'], hueso)
    # patas cortas abiertas hacia fuera
    for name, x, y in (('FL', 0.135, -0.06), ('FR', -0.135, -0.06), ('BL', 0.13, 0.30), ('BR', -0.13, 0.30)):
        b.tube((x, y, 0.135), (x * 1.35, y, 0.075), 0.042, 0.034, m['skin'], f'leg{name}', sides=6)
        b.tube((x * 1.35, y, 0.075), (x * 1.55, y - 0.03, 0.030), 0.034, 0.026, m['skin'], f'shin{name}', sides=6)
        b.box((x * 1.62, y - 0.075, 0.022), (0.075, 0.11, 0.040), m['skin'], f'shin{name}')
        for d in (-0.022, 0.0, 0.022):
            b.tube((x * 1.62 + d * (1 if x > 0 else 1), y - 0.128, 0.020), (x * 1.62 + d * 1.25, y - 0.165, 0.014),
                   0.011, 0.004, m['gear'], f'shin{name}', sides=4)


# ============================================================
# Garza zancuda (type jabirú)
# ============================================================
GARZA_BONES = [
    ('hips', None, (0, 0.10, 0.66), (0, 0.0, 0.70)),
    ('chest', 'hips', (0, 0.0, 0.70), (0, -0.10, 0.76)),
    ('neck1', 'chest', (0, -0.10, 0.76), (0, -0.16, 0.90)),
    ('neck2', 'neck1', (0, -0.16, 0.90), (0, -0.10, 1.02)),
    ('head', 'neck2', (0, -0.10, 1.02), (0, -0.20, 1.08)),
    ('jaw', 'head', (0, -0.16, 1.045), (0, -0.40, 1.075)),
    ('tail', 'hips', (0, 0.10, 0.70), (0, 0.26, 0.68)),
    ('wingL', 'chest', (0.08, -0.02, 0.76), (0.34, -0.02, 0.74)),
    ('wingTipL', 'wingL', (0.34, -0.02, 0.74), (0.66, 0.06, 0.72)),
    ('wingR', 'chest', (-0.08, -0.02, 0.76), (-0.34, -0.02, 0.74)),
    ('wingTipR', 'wingR', (-0.34, -0.02, 0.74), (-0.66, 0.06, 0.72)),
]
for s, x in (('L', 1), ('R', -1)):
    GARZA_BONES += [
        (f'thigh{s}', 'hips', (x * 0.055, 0.02, 0.60), (x * 0.06, -0.01, 0.42)),
        (f'shin{s}', f'thigh{s}', (x * 0.06, -0.01, 0.42), (x * 0.065, 0.03, 0.12)),
        (f'foot{s}', f'shin{s}', (x * 0.065, 0.03, 0.12), (x * 0.065, -0.06, 0.02)),
    ]


def heron_mesh(b, m):
    # cuerpo: mole negra con pechuga clara y popa de plumón
    b.blob((0, -0.01, 0.72), (0.115, 0.17, 0.13), m['cloth'], 'chest', subdiv=2)
    b.blob((0, 0.06, 0.68), (0.09, 0.10, 0.085), m['cloth'], 'hips', subdiv=1)
    b.blob((0, -0.07, 0.675), (0.08, 0.12, 0.065), m['trim'], 'chest', subdiv=1)
    # cola en abanico corto
    for d in (-0.05, 0.0, 0.05):
        b.poly([(d - 0.028, 0.14, 0.66), (d + 0.028, 0.14, 0.66), (d, 0.14, 0.66)],
               [(d - 0.022, 0.27, 0.63), (d + 0.022, 0.27, 0.63), (d, 0.275, 0.615)], m['hair'], 'tail')
    # cuello en S: dos tramos continuos, oscuro por delante hasta media nuez
    b.tube((0, -0.09, 0.775), (0, -0.155, 0.90), 0.040, 0.034, m['cloth'], 'neck1', sides=6)
    b.tube((0, -0.155, 0.90), (0, -0.115, 1.015), 0.034, 0.029, m['trim'], 'neck2', sides=6)
    # cabeza: casquete negro y cara desnuda
    b.blob((0, -0.145, 1.055), (0.052, 0.06, 0.05), m['cloth'], 'head', subdiv=1)
    for x in (-1, 1):
        b.blob((x * 0.028, -0.164, 1.068), (0.011, 0.010, 0.011), m['trim'], 'head', subdiv=1)
        b.blob((x * 0.031, -0.177, 1.071), (0.006, 0.006, 0.006), m['hair'], 'head', subdiv=1)
    # pico de daga: maxilar y mandibula pegados, misma linea, punta arriba
    b.tube((0, -0.17, 1.052), (0, -0.30, 1.048), 0.020, 0.012, m['skin'], 'head', sides=6)
    b.tube((0, -0.30, 1.048), (0, -0.44, 1.066), 0.012, 0.003, m['skin'], 'head', sides=5)
    b.tube((0, -0.175, 1.040), (0, -0.30, 1.036), 0.013, 0.008, m['skin'], 'jaw', sides=5)
    b.tube((0, -0.30, 1.036), (0, -0.42, 1.050), 0.008, 0.002, m['skin'], 'jaw', sides=5)
    # alas plegadas a la espalda (el reposo es la malla tal cual; aletear y atacar
    # las abren con Z y las elevan con X — rotaciones alrededor del hombro)
    for s, x in (('L', 1), ('R', -1)):
        b.tube((x * 0.06, -0.03, 0.765), (x * 0.115, 0.16, 0.745), 0.038, 0.030, m['cloth'], f'wing{s}', sides=6, flat=0.55)
        b.tube((x * 0.115, 0.14, 0.745), (x * 0.135, 0.38, 0.72), 0.030, 0.018, m['cloth'], f'wingTip{s}', sides=6, flat=0.5)
        for i, (dx, largo) in enumerate(((0.005, 0.22), (0.02, 0.175), (0.032, 0.13))):
            p0 = V((x * (0.118 + dx), 0.30 - i * 0.05, 0.715))
            tip = p0 + V((x * 0.012, largo, -0.028 - 0.008 * i))
            mid = p0.lerp(tip, 0.5) + V((x * 0.006, 0, 0.004))
            b.poly([tuple(p0 + V((-0.016, 0, 0.006))), tuple(p0 + V((0.016, 0, -0.006))), tuple(p0 + V((0, 0.02, 0)))],
                   [tuple(mid + V((-0.011, 0, 0.004))), tuple(mid + V((0.011, 0, -0.004))), tuple(mid)],
                   m['hair'], f'wingTip{s}')
            b.poly([tuple(mid + V((-0.009, 0, 0.003))), tuple(mid + V((0.009, 0, -0.003))), tuple(mid)],
                   [tuple(tip + V((-0.003, 0, 0.001))), tuple(tip + V((0.003, 0, -0.001))), tuple(tip)],
                   m['hair'], f'wingTip{s}')
    # patas zancudas: muslo corto oculto, caña larga y pie de tres dedos
    for s, x in (('L', 1), ('R', -1)):
        b.tube((x * 0.055, 0.02, 0.62), (x * 0.06, -0.01, 0.46), 0.020, 0.015, m['cloth'], f'thigh{s}', sides=5)
        b.tube((x * 0.06, -0.01, 0.46), (x * 0.065, 0.02, 0.14), 0.015, 0.011, m['skin'], f'shin{s}', sides=5)
        b.tube((x * 0.065, 0.025, 0.15), (x * 0.065, 0.0, 0.115), 0.014, 0.012, m['skin'], f'shin{s}', sides=5)
        b.tube((x * 0.065, 0.02, 0.028), (x * 0.065, -0.10, 0.015), 0.011, 0.004, m['skin'], f'foot{s}', sides=5)
        for d in (-0.055, 0.055):
            b.tube((x * 0.065, 0.015, 0.022), (x * 0.065 + d, -0.055, 0.012), 0.008, 0.003, m['skin'], f'foot{s}', sides=4)
            b.tube((x * 0.065 + d, -0.055, 0.012), (x * 0.065 + d * 1.2, -0.075, 0.006), 0.003, 0.001, m['gear'], f'foot{s}', sides=4)
        b.tube((x * 0.065, 0.02, 0.022), (x * 0.065, 0.075, 0.014), 0.007, 0.003, m['skin'], f'foot{s}', sides=4)
        b.tube((x * 0.065, 0.075, 0.014), (x * 0.065, 0.092, 0.008), 0.003, 0.001, m['gear'], f'foot{s}', sides=4)


# ============================================================
# Clips
# ============================================================
def caiman_clips(rig):
    rest = {'tail1': (-2, 0, 0), 'tail2': (-3, 0, 0), 'tail3': (-4, 0, 0), 'jaw': (2, 0, 0)}

    def gait(t):
        pose = {}
        for leg, phase in (('FL', 0.0), ('FR', 0.12), ('BL', 0.5), ('BR', 0.62)):
            s = math.sin(2 * math.pi * (t + phase))
            c = math.cos(2 * math.pi * (t + phase))
            pose[f'leg{leg}'] = (-14 * s, 0, 0)
            pose[f'shin{leg}'] = (10 * c - 6, 0, 0)
        sway = math.sin(2 * math.pi * t)
        pose['chest'] = (2 * sway, 5 * sway, 0)
        pose['hips'] = (-2 * sway, -5 * sway, 0)
        pose['neck'] = (2 * sway, 4 * sway, 0)
        pose['head'] = (-2 * sway, -2 * sway, 0)
        pose['tail1'] = (-2 - 4 * sway, 16 * sway, 0)
        pose['tail2'] = (-3, 22 * sway, 0)
        pose['tail3'] = (-4, 26 * sway, 0)
        return pose, (0, 0, 0.012 * abs(sway))

    rig.clip('Reposo', [
        (1, rest),
        (16, {**rest, 'chest': (-1.5, 0, 0), 'neck': (3, 0, 0), 'tail2': (-3, 9, 0)}, (0, 0, -0.004)),
        (31, {**rest, 'jaw': (6, 0, 0)}, (0, 0, -0.006)),
        (46, {**rest, 'chest': (-1.5, 0, 0), 'neck': (3, 0, 0), 'tail2': (-3, -9, 0)}, (0, 0, -0.004)),
        (61, rest),
    ])
    rig.clip('Caminar', [(1 + i * 3, *gait(i / 8)) for i in range(9)])
    rig.clip('Atacar', [
        (1, rest),
        (6, {**rest, 'chest': (6, 0, 0), 'neck': (10, 0, 0), 'head': (12, 0, 0), 'jaw': (16, 0, 0)}, (0, 0.06, -0.02)),
        (9, {'chest': (-8, 0, 0), 'neck': (-14, 0, 0), 'head': (-10, 0, 0), 'jaw': (26, 0, 0),
             'legFL': (-24, 0, 0), 'legFR': (-24, 0, 0), 'legBL': (16, 0, 0), 'legBR': (16, 0, 0), 'tail1': (10, 0, 0)},
            (0, -0.10, 0.05)),
        (12, {'chest': (4, 0, 0), 'neck': (6, 0, 0), 'head': (8, 0, 0), 'jaw': (3, 0, 0), 'legFL': (8, 0, 0), 'legFR': (8, 0, 0)},
             (0, -0.06, 0)),
        (22, rest),
    ])
    rig.clip('Golpeado', [
        (1, rest),
        (4, {'chest': (8, 0, 6), 'neck': (12, 0, 0), 'head': (14, 0, 0), 'jaw': (20, 0, 0),
             'tail1': (12, 0, 0), 'tail2': (10, 0, 0)}, (0, 0.06, -0.02)),
        (13, rest),
    ])
    rig.clip('Morir', [
        (1, rest),
        (5, {**rest, 'jaw': (24, 0, 0), 'neck': (12, 0, 0), 'head': (16, 0, 0)}, (0, 0.03, -0.03)),
        (14, {'hips': (0, 0, 10), 'chest': (8, 6, 0), 'neck': (14, 6, 0), 'head': (18, 0, 0), 'jaw': (30, 0, 0),
              'legFL': (-16, 0, 14), 'legFR': (-16, 0, -14), 'legBL': (12, 0, 10), 'legBR': (12, 0, -10),
              'tail1': (8, 10, 0), 'tail2': (6, 12, 0)}, (0, 0.02, -0.08)),
        (24, {'hips': (0, 0, 14), 'chest': (10, 10, 0), 'neck': (16, 10, 0), 'head': (22, 4, 0), 'jaw': (34, 0, 0),
              'legFL': (-20, 0, 22), 'legFR': (-20, 0, -22), 'legBL': (16, 0, 16), 'legBR': (16, 0, -16),
              'tail1': (10, 16, 0), 'tail2': (8, 18, 0), 'tail3': (6, 20, 0)}, (0, 0.02, -0.13)),
    ])


# Las alas van modeladas plegadas hacia atras (+Y): el reposo es la pose neutra.
# Rotar Z- lleva la direccion +Y hacia +X (abrir el ala izquierda); Z+ la derecha.
ABIERTAS = {'wingL': (0, 14, -62), 'wingTipL': (0, 6, -28), 'wingR': (0, -14, 62), 'wingTipR': (0, -6, 28)}
MEDIA = {'wingL': (0, 6, -26), 'wingTipL': (0, 3, -12), 'wingR': (0, -6, 26), 'wingTipR': (0, -3, 12)}


def heron_clips(rig):
    rest = {'neck1': (2, 0, 0), 'neck2': (-8, 0, 0), 'head': (-2, 0, 0), 'jaw': (1, 0, 0)}

    def gait(t):
        pose = {}
        for leg, phase in (('L', 0.0), ('R', 0.5)):
            s = math.sin(2 * math.pi * (t + phase))
            c = math.cos(2 * math.pi * (t + phase))
            pose[f'thigh{leg}'] = (-26 * s, 0, 0)
            pose[f'shin{leg}'] = (18 * max(0.0, c) - 4, 0, 0)
            pose[f'foot{leg}'] = (10 * min(0.0, s), 0, 0)
        bob = math.sin(4 * math.pi * t)
        pose.update(rest)
        pose['chest'] = (-3 - 3 * bob, 0, 2 * math.sin(2 * math.pi * t))
        pose['hips'] = (2 + 2 * bob, 0, 0)
        return pose, (0, 0, 0.015 * abs(bob) - 0.008)

    rig.clip('Reposo', [
        (1, rest),
        (14, {**rest, 'neck2': (-13, 3, 0), 'head': (-4, 3, 0)}, (0, 0, -0.006)),
        (28, {**rest, 'jaw': (10, 0, 0), 'head': (-6, 0, 0), 'neck2': (-14, 0, 0)}, (0, 0, -0.010)),
        (44, {**rest, 'neck2': (-13, -3, 0), 'head': (-4, -3, 0)}, (0, 0, -0.006)),
        (61, rest),
    ])
    rig.clip('Caminar', [(1 + i * 3, *gait(i / 8)) for i in range(9)])
    rig.clip('Atacar', [
        # enviste: retrocede el cuello y lanza el pico hacia abajo-adelante
        (1, rest),
        (5, {**rest, 'chest': (8, 0, 0), 'neck1': (14, 0, 0), 'neck2': (10, 0, 0), 'head': (12, 0, 0),
             'jaw': (12, 0, 0), 'thighL': (-10, 0, 0)}, (0, 0.05, -0.02)),
        (8, {**MEDIA, 'wingL': (0, 8, -46), 'wingR': (0, -8, 46),
             'chest': (-12, 0, 0), 'neck1': (-22, 0, 0), 'neck2': (-16, 0, 0), 'head': (-8, 0, 0), 'jaw': (18, 0, 0)},
            (0, -0.06, 0.03)),
        (11, {**rest, 'chest': (6, 0, 0), 'neck1': (16, 0, 0), 'neck2': (14, 0, 0), 'head': (10, 0, 0), 'jaw': (3, 0, 0)}),
        (22, rest),
    ])
    rig.clip('Golpeado', [
        (1, rest),
        (4, {'chest': (12, 0, -8), 'neck1': (16, 0, 0), 'neck2': (10, 0, 0), 'head': (14, 0, 0),
             'jaw': (14, 0, 0), 'tail': (14, 0, 0), 'thighL': (-18, 0, 0), 'shinL': (22, 0, 0),
             'wingL': (12, 0, -18), 'wingR': (12, 0, 18)}, (0, 0.05, -0.02)),
        (13, rest),
    ])
    rig.clip('Morir', [
        (1, rest),
        (6, {**rest, 'jaw': (22, 0, 0), 'neck1': (14, 0, 0), 'head': (16, 0, 0)}, (0, 0.02, -0.04)),
        (15, {'wingL': (14, 6, -40), 'wingR': (-14, -6, 40), 'wingTipL': (8, 4, -18), 'wingTipR': (-8, -4, 18),
              'chest': (26, 0, 6), 'neck1': (26, 0, 0), 'neck2': (24, 0, 0), 'head': (22, 0, 0), 'jaw': (26, 0, 0),
              'thighL': (-60, 0, 10), 'shinL': (50, 0, 0), 'thighR': (-60, 0, -10), 'shinR': (50, 0, 0)},
             (0, 0.02, -0.32)),
        (26, {'wingL': (20, 8, -30), 'wingR': (-20, -8, 30), 'wingTipL': (12, 6, -14), 'wingTipR': (-12, -6, 14),
              'chest': (40, 0, 10), 'neck1': (34, 0, 0), 'neck2': (34, 0, 0), 'head': (26, 0, 0), 'jaw': (30, 0, 0),
              'thighL': (-70, 0, 16), 'shinL': (62, 0, 0), 'thighR': (-70, 0, -16), 'shinR': (62, 0, 0),
              'footL': (20, 0, 0), 'footR': (20, 0, 0)}, (0, 0.02, -0.50)),
    ])


# ============================================================
# Generación
# ============================================================
def generar2(escena, nombre, bones, mesh_fn, clips_fn, archivo):
    m = mats()
    rig = fg_rig.Rig(escena, f'FG_{nombre}', bones)
    b = fg.Builder('Cuerpo')
    mesh_fn(b, m)
    cuerpo = rig.part(b)
    clips_fn(rig)
    rig.export(archivo)
    tris = sum(len(p.vertices) - 2 for p in cuerpo.data.polygons)
    print(f'{archivo}: {tris} triangulos')
    assert tris <= 1500, f'{archivo} fuera de presupuesto: {tris} triangulos'
    for act in rig.actions:  # prefijo para que convivan en el .blend sin colisión
        act.name = f'{nombre}_{act.name}'
    return rig, cuerpo


def main():
    # Una sola escena limpia: ambas especies conviven en fauna_chame.blend. Cada
    # GLB se exporta con su malla 'Cuerpo' intacta; el cuerpo del caimán se
    # renombra ANTES de crear la garza para que el segundo no salga 'Cuerpo.001'.
    escena_base = fg.reset()
    rig1, cuerpo = generar2(escena_base, 'Caiman', CAIMAN_BONES, caiman_mesh, caiman_clips, 'caiman.glb')
    cuerpo.name = 'Cuerpo_caiman'
    rig2, garza = generar2(escena_base, 'Garza', GARZA_BONES, heron_mesh, heron_clips, 'garza.glb')
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'fauna_chame.blend'), copy=True)
    print('fauna_chame.blend salvo las dos especies con clips prefijados')


if __name__ == '__main__':
    main()
