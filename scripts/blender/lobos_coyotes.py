# Lobos y coyotes propios (OMP-FA-18): el `wolf` procedural deja de valer para
# tres enemigos distintos. Los tres comparten el esqueleto FG_Bestia (hips/
# chest/head/jaw/tail + piernas y shinFL..BR + footL/R) con los clips de la
# plantilla bestia (Reposo, Caminar, Correr, Atacar, Aullar, Esquivar,
# Golpeado, Morir), pero cada uno con silueta y color propios:
#   sato_jefe.glb     Sato Jefe de la Jauria (alpha_wolf): perro grande y
#                     recio, cabeza ancha de mandibula cuadrada, pelo erizado
#                     en crestas, una oreja rajada, pechuga de parches y collar
#                     de clavos; gris pardo con pezuellas oscuras.
#   tigrillo_ceniza.glb Tigrillo de Ceniza (ash_alpha): felino pequeno y bajo,
#                     hocico corto, orejas redondas de lince, manchas de carbon
#                     sobre pelo ceniza y cola larga y espesa que ondea como
#                     pendulo; rugido bajo en vez de aullido.
#   coyote_helada.glb Coyote de la Helada (fortuna_coyote): flaco y patilargo,
#                     orejas enormes y puntiagudas, hocico fino, lomo arena con
#                     escarcha blanca en el cogote y la punta de la cola, y
#                     antiparras de nieve como antifaz.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/lobos_coyotes.py
# Clean-room, desde cero; no toca data/ ni src/. <= 1.500 tri por criatura.
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
from fg_rig import p  # noqa: E402

CLIP8 = ['Reposo', 'Caminar', 'Correr', 'Atacar', 'Aullar', 'Esquivar', 'Golpeado', 'Morir']


def bestia_bones(k):
    bones = [
        ('hips', None, (0, 0.34 * k, 0.55 * k), (0, 0.1 * k, 0.57 * k)),
        ('chest', 'hips', (0, 0.1 * k, 0.57 * k), (0, -0.25 * k, 0.6 * k)),
        ('head', 'chest', (0, -0.25 * k, 0.62 * k), (0, -0.48 * k, 0.74 * k)),
        ('jaw', 'head', (0, -0.5 * k, 0.67 * k), (0, -0.74 * k, 0.63 * k)),
        ('tail', 'hips', (0, 0.38 * k, 0.6 * k), (0, 0.76 * k, 0.74 * k)),
    ]
    for name, x, y, parent in (('FL', 0.13, -0.2, 'chest'), ('FR', -0.13, -0.2, 'chest'),
                               ('BL', 0.12, 0.3, 'hips'), ('BR', -0.12, 0.3, 'hips')):
        bones += [
            (f'leg{name}', parent, (x * k, y * k, 0.5 * k), (x * k, y * k, 0.27 * k)),
            (f'shin{name}', f'leg{name}', (x * k, y * k, 0.27 * k), (x * k, y * k, 0.05 * k)),
        ]
    bones += [('footL', 'shinBL', (0.12 * k, 0.3 * k, 0.05 * k), (0.12 * k, 0.2 * k, 0.02 * k)),
              ('footR', 'shinBR', (-0.12 * k, 0.3 * k, 0.05 * k), (-0.12 * k, 0.2 * k, 0.02 * k))]
    return bones


def gait(t, k=1.0, bob=1.0, leg_lift=38, tail_amp=16):
    pose = {}
    for leg, phase in (('FL', 0.0), ('FR', 0.1), ('BL', 0.5), ('BR', 0.6)):
        s = math.sin(2 * math.pi * (t + phase))
        pose[f'leg{leg}'] = (-leg_lift * s, 0, 0)
        c = math.cos(2 * math.pi * (t + phase))
        pose[f'shin{leg}'] = (-28 - 18 * c, 0, 0) if leg[0] == 'F' else (26 + 18 * c, 0, 0)
    b = math.sin(2 * math.pi * t)
    pose['chest'] = (-6 * b * bob, 0, 0)
    pose['hips'] = (5 * b * bob, 0, 0)
    pose['head'] = (5 * b * bob, 0, 0)
    pose['tail'] = (tail_amp * b - 6, 0, 0)
    return pose, (0, 0, (0.035 * abs(b) - 0.01) * k)


def legs(b, m, k, musc, patas, pezu=0.012):
    """Pata con rodilla: la trasera echa el muslo atras y la caña adelante;
    el pie mira a -Y (delante), no es un taco."""
    for name, x, y, r in (('FL', 0.13, -0.2, 0.062), ('FR', -0.13, -0.2, 0.062),
                          ('BL', 0.12, 0.3, 0.072), ('BR', -0.12, 0.3, 0.072)):
        if name[0] == 'F':
            hip, knee, ankle, foot = (x, y - 0.01, 0.56), (x, y + 0.015, 0.31), (x, y - 0.035, 0.07), (x, y - 0.09, 0.033)
        else:
            hip, knee, ankle, foot = (x, y + 0.01, 0.56), (x, y + 0.10, 0.33), (x, y + 0.0, 0.07), (x, y - 0.05, 0.033)
        b.tube(tuple(c * k for c in hip), tuple(c * k for c in knee), r * k, r * 0.72 * k, musc, f'leg{name}', sides=5)
        b.tube(tuple(c * k for c in knee), tuple(c * k for c in ankle), r * 0.72 * k, r * 0.55 * k, patas, f'shin{name}', sides=5)
        b.box(tuple(c * k for c in foot), (0.085 * k, 0.17 * k, 0.06 * k), patas, f'shin{name}')
        if pezu:
            for toe in (-0.026, 0, 0.026):
                b.tube(((x + toe) * k, (foot[1] - 0.08) * k, 0.038 * k), ((x + toe) * k, (foot[1] - 0.125) * k, 0.022 * k),
                       pezu * k, pezu * 0.3 * k, patas, f'shin{name}', sides=4)


def ojos(b, m, k, x0=-0.09, y0=-0.625, z0=0.79, r=1.0):
    for x in (1, -1):
        b.blob((x * x0 * k, y0 * k, z0 * k), (0.036 * r * k, 0.023 * r * k, 0.038 * r * k), m['claro'], 'head', subdiv=1)
        b.blob((x * x0 * k, (y0 - 0.022) * k, z0 * k), (0.018 * r * k, 0.011 * r * k, 0.022 * r * k), m['pupila'], 'head', subdiv=1)


def common_clips(rig, rest, crouch, bite, k=1.0, tail_wag=16, aullar=None):
    rig.clip('Reposo', [
        (1, rest),
        (16, {**rest, 'chest': (-1.5, 0, 0), 'tail': (rest['tail'][0], tail_wag, 0), 'head': (-4, 3, 0)}, (0, 0, -0.006 * k)),
        (31, {**rest, 'tail': rest['tail'], 'jaw': (5, 0, 0)}, (0, 0, -0.01 * k)),
        (46, {**rest, 'chest': (-1.5, 0, 0), 'tail': (rest['tail'][0], -tail_wag, 0), 'head': (-4, -3, 0)}, (0, 0, -0.006 * k)),
        (61, rest),
    ])
    rig.clip('Caminar', [(1 + i * 4, *gait(i / 8, k=k, bob=0.5, leg_lift=24, tail_amp=8)) for i in range(9)])
    rig.clip('Correr', [(1 + i * 2, *gait(i / 8, k=k)) for i in range(9)])
    rig.clip('Atacar', [
        (1, rest),
        (6, {**crouch, 'jaw': (10, 0, 0)}, (0, 0.1 * k, -0.1 * k)),
        (10, bite),
        (13, {'chest': (6, 0, 0), 'head': (16, 0, 0), 'jaw': (4, 0, 0), 'legFL': (-20, 0, 0), 'legFR': (-16, 0, 0),
              'legBL': (24, 0, 0), 'legBR': (20, 0, 0)}, (0, -0.28 * k, -0.02 * k)),
        (22, rest),
    ])
    rig.clip('Aullar', aullar or [
        (1, rest),
        (10, {'chest': (-20, 0, 0), 'hips': (-6, 0, 0), 'head': (-45, 0, 0), 'jaw': (30, 0, 0),
              'legBL': (-10, 0, 0), 'legBR': (-10, 0, 0), 'tail': (22, 0, 0)}, (0, 0, -0.03 * k)),
        (22, {'chest': (-20, 0, 0), 'hips': (-6, 0, 0), 'head': (-50, 0, 0), 'jaw': (34, 0, 0),
              'legBL': (-10, 0, 0), 'legBR': (-10, 0, 0), 'tail': (22, 0, 0)}, (0, 0, -0.03 * k)),
        (30, rest),
    ])
    rig.clip('Esquivar', [
        (1, rest),
        (5, crouch, (0.1 * k, 0, -0.1 * k)),
        (10, {'legFL': (20, 0, 0), 'legFR': (20, 0, 0), 'legBL': (-20, 0, 0), 'legBR': (-20, 0, 0),
              'hips': (0, 0, 22), 'chest': (0, 0, 14)}, (0.45 * k, 0, 0.18 * k)),
        (17, rest, (0.7 * k, 0, 0)),
    ])
    rig.clip('Golpeado', [
        (1, rest),
        (4, {'chest': (10, 0, 8), 'head': (-16, 8, 0), 'jaw': (18, 0, 0), 'tail': (22, 0, 0)}, (0, 0.08 * k, -0.03 * k)),
        (13, rest),
    ])
    rig.clip('Morir', [
        (1, rest),
        (6, {'chest': (10, 0, 0), 'head': (-28, 0, 0), 'jaw': (30, 0, 0)}, (0, 0.05 * k, -0.04 * k)),
        (18, {'hips': (0, 62, 0), 'chest': (0, 12, 0), 'head': (8, 10, 0), 'jaw': (22, 0, 0), 'legFL': (-30, 0, 0),
              'legFR': (-12, 0, 0), 'legBL': (20, 0, 0), 'legBR': (10, 0, 0), 'tail': (0, 30, 0)}, (0.08 * k, 0, -0.26 * k)),
        (28, {'hips': (0, 88, 0), 'chest': (0, 4, 0), 'head': (12, 8, 0), 'jaw': (26, 0, 0), 'legFL': (-34, 0, 0),
              'legFR': (-10, 0, 0), 'legBL': (26, 0, 0), 'legBR': (8, 0, 0), 'tail': (0, 12, 0)}, (0.1 * k, 0, -0.38 * k)),
    ])


# ================================================================ sato jefe
def sato_jefe():
    scene = fg.reset()
    k = 1.14  # perro grande: ~1,08 m a la cruz
    m = dict(
        piel=fg.material('skin', (0.42, 0.36, 0.30)),
        claro=fg.material('trim', (0.72, 0.66, 0.56)),
        pelo=fg.material('hair', (0.24, 0.20, 0.17)),
        oscuro=fg.material('cloth', (0.16, 0.14, 0.13)),
        hierro=fg.material('gear', (0.55, 0.55, 0.58), metallic=0.7, rough=0.4),
        rojo=fg.material('brillo_cloth', (0.75, 0.20, 0.14), emit=(0.75, 0.20, 0.14), strength=0.6),
        claro_ojo=fg.material('brillo_trim', (0.85, 0.62, 0.22), emit=(0.85, 0.62, 0.22), strength=1.0),
        pupila=fg.material('negro_ojo', (0.05, 0.05, 0.05)),
    )
    rig = fg_rig.Rig(scene, 'FG_Bestia', bestia_bones(k))
    b = fg.Builder('Cuerpo')
    # cuerpo recio, lomo con cresta erizada
    b.tube((0, 0.42 * k, 0.56 * k), (0, 0.1 * k, 0.57 * k), 0.15 * k, 0.18 * k, m['piel'], 'hips', sides=8, flat=1.15)
    b.tube((0, 0.1 * k, 0.57 * k), (0, -0.26 * k, 0.6 * k), 0.19 * k, 0.22 * k, m['piel'], 'chest', sides=8, flat=1.15)
    b.blob((0, 0.28 * k, 0.48 * k), (0.17 * k, 0.22 * k, 0.14 * k), m['claro'], 'hips', subdiv=1)  # panza clara
    for y, z, h in ((-0.06, 0.79, 0.13), (0.10, 0.80, 0.15), (0.28, 0.76, 0.12)):  # crestas del lomo
        b.poly([(-0.04 * k, y * k, z * k), (0.04 * k, y * k, z * k), (0, (y + 0.02) * k, (z + h) * k)],
               [(-0.03 * k, y * k, (z - 0.02) * k), (0.03 * k, y * k, (z - 0.02) * k), (0, (y + 0.02) * k, (z + h) * k)],
               m['pelo'], 'hips')
    # cabeza ancha, mordida de frente plana
    b.tube((0, -0.24 * k, 0.62 * k), (0, -0.42 * k, 0.72 * k), 0.14 * k, 0.15 * k, m['piel'], 'head', sides=7)
    b.blob((0, -0.48 * k, 0.75 * k), (0.185 * k, 0.16 * k, 0.155 * k), m['piel'], 'head', subdiv=2)
    b.blob((0, -0.66 * k, 0.71 * k), (0.13 * k, 0.13 * k, 0.085 * k), m['piel'], 'head', subdiv=1)  # stop hondo
    b.blob((0, -0.775 * k, 0.735 * k), (0.05 * k, 0.04 * k, 0.038 * k), m['oscuro'], 'head', subdiv=1)  # trufa
    # orejas: una entera, otra rajada (cicatriz de peleas)
    b.poly([(0.07 * k, -0.44 * k, 0.84 * k), (0.20 * k, -0.42 * k, 0.92 * k), (0.13 * k, -0.43 * k, 1.02 * k)],
           [(0.07 * k, -0.40 * k, 0.84 * k), (0.20 * k, -0.38 * k, 0.92 * k), (0.13 * k, -0.39 * k, 1.02 * k)], m['pelo'], 'head')
    b.poly([(-0.07 * k, -0.44 * k, 0.84 * k), (-0.19 * k, -0.42 * k, 0.90 * k), (-0.10 * k, -0.43 * k, 0.90 * k)],
           [(-0.07 * k, -0.40 * k, 0.84 * k), (-0.19 * k, -0.38 * k, 0.90 * k), (-0.10 * k, -0.39 * k, 0.90 * k)], m['pelo'], 'head')
    b.blob((-0.155 * k, -0.42 * k, 0.915 * k), (0.03 * k, 0.02 * k, 0.035 * k), m['rojo'], 'head', subdiv=1)  # herida
    ojos(b, m, k, x0=-0.095, y0=-0.62, z0=0.80, r=1.05)
    # mandibula maciza con colmillos y collar de clavos al chest
    b.blob((0, -0.64 * k, 0.645 * k), (0.115 * k, 0.135 * k, 0.04 * k), m['oscuro'], 'jaw', subdiv=1)
    for x, y, z in ((-0.06, -0.72, 0.68), (0.06, -0.72, 0.68), (-0.03, -0.775, 0.665), (0.03, -0.775, 0.665)):
        b.tube((x * k, y * k, z * k), (x * 1.05 * k, (y - 0.03) * k, (z - 0.055) * k), 0.014 * k, 0.003 * k, m['claro'], 'jaw', sides=4)
    b.tube((0, -0.30 * k, 0.60 * k), (0, -0.26 * k, 0.66 * k), 0.175 * k, 0.16 * k, m['oscuro'], 'chest', sides=8, flat=0.55)
    for a in range(6):
        t = 2 * math.pi * a / 6 + 0.3
        b.blob((0.17 * k * math.cos(t), (-0.28 + 0.055 * math.sin(t)) * k, (0.63 - 0.005 * math.cos(t)) * k),
               (0.018 * k, 0.018 * k, 0.022 * k), m['hierro'], 'chest', subdiv=1)
    # parches de pelo claro en la piel (sato, sin patron)
    for x, y, z in ((0.13, 0.0, 0.66), (-0.14, 0.2, 0.63), (0.10, 0.34, 0.60), (-0.08, -0.15, 0.68)):
        b.blob((x * k, y * k, z * k), (0.065 * k, 0.09 * k, 0.05 * k), m['claro'], 'hips', subdiv=1)
    # cola gruesa baja con punta clara
    b.tube((0, 0.4 * k, 0.6 * k), (0, 0.72 * k, 0.55 * k), 0.06 * k, 0.045 * k, m['pelo'], 'tail', sides=6)
    b.blob((0, 0.80 * k, 0.545 * k), (0.055 * k, 0.10 * k, 0.05 * k), m['claro'], 'tail', subdiv=1)
    legs(b, m, k, m['piel'], m['oscuro'], pezu=0.014)
    rig.part(b)
    R = math.radians
    rest = {'tail': (-14, 0, 0), 'head': (-2, 0, 0)}
    crouch = {'hips': (4, 0, 0), 'chest': (8, 0, 0), 'head': (-10, 0, 0), 'jaw': (8, 0, 0),
              'legFL': (-20, 0, 0), 'shinFL': (-30, 0, 0), 'legFR': (-20, 0, 0), 'shinFR': (-30, 0, 0),
              'legBL': (-30, 0, 0), 'shinBL': (40, 0, 0), 'legBR': (-30, 0, 0), 'shinBR': (40, 0, 0), 'tail': (-24, 0, 0)}
    bite = {'chest': (-12, 0, 0), 'head': (6, 0, 0), 'jaw': (44, 0, 0), 'legFL': (-55, 0, 0), 'legFR': (-48, 0, 0),
            'legBL': (45, 0, 0), 'legBR': (40, 0, 0), 'tail': (10, 0, 0)}
    common_clips(rig, rest, crouch, bite, k=k, tail_wag=14)
    rig.export('sato_jefe.glb')


# ============================================================ tigrillo ceniza
def tigrillo_ceniza():
    scene = fg.reset()
    k = 0.62  # felino pequeno: ~0,47 m
    m = dict(
        piel=fg.material('skin', (0.60, 0.58, 0.53)),
        claro=fg.material('trim', (0.82, 0.80, 0.74)),
        pelo=fg.material('hair', (0.45, 0.43, 0.40)),
        oscuro=fg.material('cloth', (0.12, 0.115, 0.11)),  # manchas de carbon
        claro_ojo=fg.material('brillo_trim', (0.55, 0.78, 0.35), emit=(0.55, 0.78, 0.35), strength=1.1),
        pupila=fg.material('negro_ojo', (0.05, 0.05, 0.05)),
    )
    rig = fg_rig.Rig(scene, 'FG_Bestia', bestia_bones(k))
    b = fg.Builder('Cuerpo')
    # cuerpo bajo y elastico, lomo arqueable
    b.tube((0, 0.42 * k, 0.54 * k), (0, 0.1 * k, 0.57 * k), 0.14 * k, 0.17 * k, m['piel'], 'hips', sides=8, flat=1.2)
    b.tube((0, 0.1 * k, 0.57 * k), (0, -0.26 * k, 0.60 * k), 0.17 * k, 0.19 * k, m['piel'], 'chest', sides=8, flat=1.2)
    b.blob((0, -0.10 * k, 0.47 * k), (0.14 * k, 0.20 * k, 0.10 * k), m['claro'], 'chest', subdiv=1)  # vientre claro
    # manchas de carbon: rosetas achatadas pegadas a cada costado
    for y, z, r in ((0.26, 0.62, 0.075), (0.04, 0.66, 0.085), (-0.16, 0.66, 0.075), (0.36, 0.57, 0.06), (-0.02, 0.70, 0.06)):
        for x in (0.152, -0.152):
            b.tube((x * k, y * k, z * k), (x * 1.06 * k, y * k, z * k),
                   r * k, r * 0.95 * k, m['oscuro'], 'hips', sides=6, flat=1.35)
    # cabeza redonda de gato: hocico corto, sin stop
    b.blob((0, -0.36 * k, 0.70 * k), (0.165 * k, 0.15 * k, 0.145 * k), m['piel'], 'head', subdiv=2)
    b.blob((0, -0.50 * k, 0.665 * k), (0.085 * k, 0.075 * k, 0.055 * k), m['piel'], 'head', subdiv=1)
    b.blob((0, -0.565 * k, 0.685 * k), (0.028 * k, 0.022 * k, 0.018 * k), m['oscuro'], 'head', subdiv=1)
    # bigotes y mejillas
    for x in (1, -1):
        for dy, dz in ((-0.015, 0.0), (0.0, 0.01)):
            b.tube((x * 0.075 * k, (-0.52 + dy) * k, (0.655 + dz) * k), (x * 0.135 * k, (-0.535 + dy) * k, (0.658 + dz) * k),
                   0.004 * k, 0.001 * k, m['claro'], 'head', sides=3)
    # orejas bajas y anchas de gato montes, con mechoncito
    for x in (1, -1):
        b.poly([(x * 0.09 * k, -0.36 * k, 0.79 * k), (x * 0.19 * k, -0.37 * k, 0.845 * k), (x * 0.07 * k, -0.33 * k, 0.865 * k)],
               [(x * 0.09 * k, -0.33 * k, 0.79 * k), (x * 0.19 * k, -0.34 * k, 0.845 * k), (x * 0.07 * k, -0.30 * k, 0.865 * k)],
               m['piel'], 'head')
        b.blob((x * 0.125 * k, -0.355 * k, 0.828 * k), (0.028 * k, 0.012 * k, 0.02 * k), m['claro'], 'head', subdiv=1)
    # ojos grandes oblicuos y antifaz de lagrimas
    ojos(b, m, k, x0=-0.075, y0=-0.485, z0=0.72, r=1.25)
    for x in (1, -1):
        b.blob((x * 0.078 * k, -0.44 * k, 0.76 * k), (0.028 * k, 0.05 * k, 0.02 * k), m['oscuro'], 'head', subdiv=1)
    # mandibula corta con colmillo asomando
    b.blob((0, -0.50 * k, 0.625 * k), (0.06 * k, 0.07 * k, 0.025 * k), m['oscuro'], 'jaw', subdiv=1)
    for x in (-0.03, 0.03):
        b.tube((x * k, -0.52 * k, 0.645 * k), (x * 1.1 * k, -0.545 * k, 0.60 * k), 0.008 * k, 0.002 * k, m['claro'], 'jaw', sides=4)
    # cola LARGA y espesa (mas alla del hueso), en arco que baja, con anillos y punta oscura
    b.tube((0, 0.4 * k, 0.6 * k), (0, 0.72 * k, 0.56 * k), 0.052 * k, 0.048 * k, m['piel'], 'tail', sides=6)
    b.tube((0, 0.72 * k, 0.56 * k), (0, 0.92 * k, 0.62 * k), 0.048 * k, 0.042 * k, m['piel'], 'tail', sides=6)
    for y0 in (0.55, 0.70, 0.84):
        z0 = 0.6 - 0.04 * y0 / 0.3 * 0.45
        b.tube((0, y0 * k, (0.598 - 0.028 * (y0 - 0.55) / 0.29) * k), (0, (y0 + 0.035) * k, (0.596 - 0.028 * (y0 - 0.55) / 0.29) * k),
               0.05 * k, 0.048 * k, m['oscuro'], 'tail', sides=6, flat=1.1)
    b.blob((0, 0.965 * k, 0.63 * k), (0.04 * k, 0.06 * k, 0.042 * k), m['oscuro'], 'tail', subdiv=1)
    # patas cortas de gato, sin pezuñas marcadas
    legs(b, m, k, m['piel'], m['piel'], pezu=0.0)
    rig.part(b)
    R = math.radians
    rest = {'tail': (-10, 0, 0), 'head': (-4, 0, 0)}
    crouch = {'hips': (8, 0, 0), 'chest': (12, 0, 0), 'head': (-14, 0, 0), 'jaw': (6, 0, 0),
              'legFL': (-26, 0, 0), 'shinFL': (-36, 0, 0), 'legFR': (-26, 0, 0), 'shinFR': (-36, 0, 0),
              'legBL': (-36, 0, 0), 'shinBL': (46, 0, 0), 'legBR': (-36, 0, 0), 'shinBR': (46, 0, 0), 'tail': (-30, 0, 0)}
    bite = {'chest': (-16, 0, 0), 'head': (8, 0, 0), 'jaw': (38, 0, 0), 'legFL': (-60, 0, 0), 'legFR': (-52, 0, 0),
            'legBL': (50, 0, 0), 'legBR': (44, 0, 0), 'tail': (16, 0, 0)}
    common_clips(rig, rest, crouch, bite, k=k, tail_wag=20, aullar=[
        # el aullido del tigrillo es un rugido bajo: cabeza menos alta, lomo erizado
        (1, rest),
        (8, {'chest': (-8, 0, 0), 'head': (-26, 0, 0), 'jaw': (26, 0, 0), 'tail': (30, 0, 0)}, (0, 0, -0.02 * k)),
        (16, {'chest': (-8, 0, 0), 'head': (-30, 0, 0), 'jaw': (30, 0, 0), 'tail': (34, 0, 0)}, (0, 0, -0.02 * k)),
        (24, rest),
    ])
    rig.export('tigrillo_ceniza.glb')


# ============================================================ coyote helada
def coyote_helada():
    scene = fg.reset()
    k = 0.78  # canido flaco: ~0,60 m
    m = dict(
        piel=fg.material('skin', (0.66, 0.58, 0.44)),
        claro=fg.material('trim', (0.88, 0.88, 0.86)),  # escarcha
        pelo=fg.material('hair', (0.38, 0.32, 0.25)),
        oscuro=fg.material('cloth', (0.18, 0.16, 0.15)),
        claro_ojo=fg.material('brillo_trim', (0.85, 0.80, 0.55), emit=(0.85, 0.80, 0.55), strength=1.0),
        pupila=fg.material('negro_ojo', (0.05, 0.05, 0.05)),
    )
    rig = fg_rig.Rig(scene, 'FG_Bestia', bestia_bones(k))
    b = fg.Builder('Cuerpo')
    # cuerpo esmirriado, costillas apenas, cogote de escarcha
    b.tube((0, 0.42 * k, 0.56 * k), (0, 0.1 * k, 0.58 * k), 0.12 * k, 0.15 * k, m['piel'], 'hips', sides=8, flat=1.1)
    b.tube((0, 0.1 * k, 0.58 * k), (0, -0.26 * k, 0.62 * k), 0.14 * k, 0.155 * k, m['piel'], 'chest', sides=8, flat=1.1)
    b.blob((0, 0.24 * k, 0.48 * k), (0.12 * k, 0.20 * k, 0.10 * k), m['claro'], 'hips', subdiv=1)
    for x in (1, -1):
        for y in (-0.12, 0.0, 0.12):
            b.tube((x * 0.135 * k, y * k, 0.545 * k), (x * 0.135 * k, y * k, 0.63 * k), 0.012 * k, 0.012 * k, m['pelo'], 'chest', sides=4)
    b.tube((0, -0.16 * k, 0.70 * k), (0, -0.30 * k, 0.66 * k), 0.10 * k, 0.06 * k, m['claro'], 'chest', sides=6, flat=1.0)  # cuello escarchado
    # cabeza triangular: frente angosta, hocico fino y largo
    b.tube((0, -0.24 * k, 0.62 * k), (0, -0.44 * k, 0.74 * k), 0.115 * k, 0.10 * k, m['piel'], 'head', sides=7)
    b.blob((0, -0.48 * k, 0.76 * k), (0.13 * k, 0.12 * k, 0.11 * k), m['piel'], 'head', subdiv=2)
    b.tube((0, -0.52 * k, 0.72 * k), (0, -0.76 * k, 0.685 * k), 0.055 * k, 0.028 * k, m['piel'], 'head', sides=6)
    b.blob((0, -0.78 * k, 0.69 * k), (0.03 * k, 0.025 * k, 0.022 * k), m['oscuro'], 'head', subdiv=1)
    # orejas grandes triangulares, echadas un poco atras
    for x in (1, -1):
        b.poly([(x * 0.06 * k, -0.45 * k, 0.81 * k), (x * 0.165 * k, -0.36 * k, 0.88 * k), (x * 0.075 * k, -0.35 * k, 0.965 * k)],
               [(x * 0.06 * k, -0.42 * k, 0.81 * k), (x * 0.165 * k, -0.33 * k, 0.88 * k), (x * 0.075 * k, -0.32 * k, 0.965 * k)],
               m['piel'], 'head')
        b.poly([(x * 0.075 * k, -0.435 * k, 0.835 * k), (x * 0.14 * k, -0.365 * k, 0.875 * k), (x * 0.085 * k, -0.355 * k, 0.925 * k)],
               [(x * 0.075 * k, -0.415 * k, 0.835 * k), (x * 0.14 * k, -0.345 * k, 0.875 * k), (x * 0.085 * k, -0.335 * k, 0.925 * k)],
               m['oscuro'], 'head')
    ojos(b, m, k, x0=-0.078, y0=-0.60, z0=0.78, r=0.95)
    # antifaz de antiparras: banda oscura cruzando los ojos
    b.box((0, -0.52 * k, 0.795 * k), (0.125 * k, 0.022 * k, 0.032 * k), m['oscuro'], 'head')
    # mandibula fina, dentada, con boca oscura solo en el filo
    b.box((0, -0.62 * k, 0.655 * k), (0.06 * k, 0.13 * k, 0.012 * k), m['oscuro'], 'jaw')
    for i in range(4):
        x = -0.045 + i * 0.03
        b.tube((x * k, (-0.66 - 0.02 * abs(i - 1.5)) * k, 0.665 * k), (x * 1.05 * k, (-0.68 - 0.02 * abs(i - 1.5)) * k, 0.63 * k),
               0.008 * k, 0.002 * k, m['claro'], 'jaw', sides=4)
    # cola espesa de burelo con punta blanca
    b.tube((0, 0.4 * k, 0.6 * k), (0, 0.74 * k, 0.58 * k), 0.055 * k, 0.05 * k, m['pelo'], 'tail', sides=6)
    b.tube((0, 0.74 * k, 0.58 * k), (0, 0.88 * k, 0.61 * k), 0.05 * k, 0.045 * k, m['pelo'], 'tail', sides=6)
    b.blob((0, 0.93 * k, 0.62 * k), (0.045 * k, 0.08 * k, 0.045 * k), m['claro'], 'tail', subdiv=1)
    # patas largas y finas, dedos de escarcha
    legs(b, m, k * 1.06, m['piel'], m['pelo'], pezu=0.011)
    rig.part(b)
    rest = {'tail': (-6, 0, 0), 'head': (-3, 0, 0)}
    crouch = {'hips': (4, 0, 0), 'chest': (8, 0, 0), 'head': (-10, 0, 0), 'jaw': (6, 0, 0),
              'legFL': (-20, 0, 0), 'shinFL': (-30, 0, 0), 'legFR': (-20, 0, 0), 'shinFR': (-30, 0, 0),
              'legBL': (-30, 0, 0), 'shinBL': (40, 0, 0), 'legBR': (-30, 0, 0), 'shinBR': (40, 0, 0), 'tail': (-16, 0, 0)}
    bite = {'chest': (-12, 0, 0), 'head': (6, 0, 0), 'jaw': (40, 0, 0), 'legFL': (-55, 0, 0), 'legFR': (-48, 0, 0),
            'legBL': (45, 0, 0), 'legBR': (40, 0, 0), 'tail': (6, 0, 0)}
    common_clips(rig, rest, crouch, bite, k=k, tail_wag=12, aullar=[
        # el coyote aulla mirando a la helada
        (1, rest),
        (10, {'chest': (-16, 0, 0), 'hips': (-4, 0, 0), 'head': (-52, 0, 0), 'jaw': (36, 0, 0),
              'legBL': (-8, 0, 0), 'legBR': (-8, 0, 0), 'tail': (16, 0, 0)}, (0, 0, -0.02 * k)),
        (24, {'chest': (-16, 0, 0), 'hips': (-4, 0, 0), 'head': (-56, 0, 0), 'jaw': (40, 0, 0),
              'legBL': (-8, 0, 0), 'legBR': (-8, 0, 0), 'tail': (16, 0, 0)}, (0, 0, -0.02 * k)),
        (34, rest),
    ])
    rig.export('coyote_helada.glb')


if __name__ == '__main__':
    for f in (sato_jefe, tigrillo_ceniza, coyote_helada):
        f()
    out = os.path.join(ROOT, 'arte', 'blender', 'lobos_coyotes.blend')
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print('blend guardado:', out)
