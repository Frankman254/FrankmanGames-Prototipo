# Fauna del Archipielago de Bocas y del Darien, tercera tanda (OMP-FA-10):
# medusa pegajosa (`bocas_jelly`) y zancudo tamano familiar (`darien_mosquito`).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/fauna_medusa_zancudo.py
# Escribe assets/models/medusa.glb y assets/models/zancudo.glb y salva
# arte/blender/fauna_medusa_zancudo.blend. NO se integra: nada toca data/ ni src/.
#
#   Aguamala Pegajosa (minion invocable): campana hemisferica con volante,
#   dos brazos orales gruesos en el centro y seis tentaculos que arrastran por
#   el suelo. Sin agua donde apoyarse, la campana late y los tentaculos se
#   esparcen como falda. Atacar = contraer la campana y estamparla hacia
#   delante estirando los tentaculos pegajosos.
#   Zancudo Tamano Familiar (minion invocable, "del tamano de una familia"):
#   mosquito grande. Torax giboso, abdomen estriado que arquea hacia arriba,
#   cabeza con ojos compuestos enormes y una trompa-aguja larga, dos alas
#   estrechas plegadas sobre el lomo y seis patas finas en trípode. Camina por
#   el suelo (convencion de la casa), trompea al atacar.
#
# Referencias (no hay lamina REF-01 para esta familia, anota OMP 2026-11-21):
# silueta de campo de la medusa de melon (campana ancha con motas, brazos
# orales rizados) y del zancudo (palpos y trompa, abdomen curvo, escala
# exagerada por el nombre del bestiario). Clean-room.
#
# Convenciones de la casa: mira a -Y, +Z arriba, escala en metros, apoyo en z=0
# en el fotograma 1 (Reposo). Cinco clips (Reposo, Caminar, Atacar, Golpeado,
# Morir) con bucles sin salto, caminando en el sitio. Materiales por region
# tenible: skin, cloth, trim, hair, gear. <=1500 tri por bicho.
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


def mats(medusa):
    if medusa:
        return dict(
            skin=fg.material('skin', (0.80, 0.42, 0.72)),                      # interior de campana
            cloth=fg.material('cloth', (0.55, 0.24, 0.52)),                    # campana ciruela
            trim=fg.material('trim', (0.92, 0.80, 0.92)),                      # motas y puntas
            hair=fg.material('hair', (0.68, 0.32, 0.62)),                      # tentaculos
            gear=fg.material('gear', (0.30, 0.10, 0.26), rough=0.4),           # boca y núcleos
            ojo=fg.material('ojo_f10', (0.05, 0.03, 0.05), rough=0.3),
        )
    return dict(
        skin=fg.material('skin', (0.62, 0.42, 0.24)),                          # patas y mouthparts
        cloth=fg.material('cloth', (0.20, 0.20, 0.22)),                        # torax gris
        trim=fg.material('trim', (0.52, 0.52, 0.55)),                          # anillos claros
        hair=fg.material('hair', (0.28, 0.16, 0.10)),                          # abdomen pardo
        gear=fg.material('gear', (0.05, 0.05, 0.06), rough=0.3),               # trompa y ojos
        ojo=fg.material('ojo_f10', (0.10, 0.07, 0.05), rough=0.3),
    )


MEDUSA_BONES = [('hips', None, (0, 0.02, 0.46), (0, 0.02, 0.20))]
for i in range(8):
    a = math.radians(i * 45)
    x, y = 0.26 * math.sin(a), 0.26 * math.cos(a)
    MEDUSA_BONES.append((f'tent{i + 1}', 'hips', (x * 0.78, y * 0.78 + 0.02, 0.15), (x, y, 0.055)))
    MEDUSA_BONES.append((f'tip{i + 1}', f'tent{i + 1}', (x, y, 0.055), (x * 1.62, y * 1.62, 0.008)))
MEDUSA_BONES += [
    ('oral1', 'hips', (0.04, 0.04, 0.18), (0.09, 0.09, 0.03)),
    ('oral2', 'hips', (-0.04, -0.02, 0.18), (-0.09, 0.02, 0.03)),
]

ZANCUDO_BONES = [
    ('hips', None, (0, 0.10, 0.40), (0, -0.06, 0.44)),         # torax giboso
    ('abdomen1', 'hips', (0, 0.10, 0.40), (0, 0.30, 0.44)),
    ('abdomen2', 'abdomen1', (0, 0.30, 0.44), (0, 0.52, 0.40)),
    ('abdomen3', 'abdomen2', (0, 0.52, 0.40), (0, 0.70, 0.32)),
    ('head', 'hips', (0, -0.06, 0.44), (0, -0.19, 0.42)),
    ('trunk', 'head', (0, -0.17, 0.40), (0, -0.52, 0.30)),     # trompa-aguja
    ('wingL', 'hips', (0.04, 0.02, 0.50), (0.07, 0.42, 0.55)),
    ('wingR', 'hips', (-0.04, 0.02, 0.50), (-0.07, 0.42, 0.55)),
]
for nombre, s in (('FL', 1), ('FR', -1), ('ML', 1), ('MR', -1), ('BL', 1), ('BR', -1)):
    x, y0 = {'FL': (0.11, -0.02), 'ML': (0.12, 0.12), 'BL': (0.10, 0.26)}[nombre[0] + 'L']
    ZANCUDO_BONES += [
        (f'leg{nombre}', 'hips', (s * x, y0, 0.40), (s * (x + 0.16), y0 - 0.06, 0.22)),
        (f'shin{nombre}', f'leg{nombre}', (s * (x + 0.16), y0 - 0.06, 0.22),
         (s * (x + 0.10), y0 + 0.14, 0.015)),
    ]


def revolve(b, perfil, mat, group, sides=12):
    """Superficie de revolucion sobre un perfil (radio, z); radio 0 cierra el polo."""
    anillos = []
    for r, z in perfil:
        if r <= 1e-4:
            anillos.append([b.bm.verts.new((0, 0, z))])
        else:
            anillos.append([b.bm.verts.new((r * math.sin(2 * math.pi * i / sides),
                                            r * math.cos(2 * math.pi * i / sides), z))
                            for i in range(sides)])
    caras = []
    for a1, a2 in zip(anillos, anillos[1:]):
        n1, n2 = len(a1), len(a2)
        for i in range(max(n1, n2)):
            if n1 == n2:
                caras.append(b.bm.faces.new((a1[i], a1[(i + 1) % n1], a2[(i + 1) % n2], a2[i])))
            elif n1 == 1:
                caras.append(b.bm.faces.new((a1[0], a2[i], a2[(i + 1) % n2])))
            else:
                caras.append(b.bm.faces.new((a1[i], a1[(i + 1) % n1], a2[0])))
    vs = [v for an in anillos for v in an]
    b._finish(vs, caras, mat, group)


def medusa_mesh(b, m):
    # campana de campanero: domo exterior que cae hasta el borde y se repliega
    # hacia dentro en un faldon abierto (subumbrela), sin escalones ni motas
    revolve(b, [(0.0, 0.545), (0.12, 0.530), (0.235, 0.470), (0.315, 0.360), (0.345, 0.240),
                (0.350, 0.150), (0.335, 0.130), (0.260, 0.150), (0.170, 0.185), (0.100, 0.205),
                (0.045, 0.195), (0.0, 0.175)], m['cloth'], 'hips', sides=12)
    b.blob((0, 0.02, 0.30), (0.24, 0.24, 0.185), m['skin'], 'hips', subdiv=1)  # nucleo gelatinoso
    # manubrio central y boca en cruz
    b.tube((0, 0.01, 0.19), (0, 0.01, 0.075), 0.045, 0.030, m['skin'], 'hips', sides=6)
    for ang in range(0, 360, 90):
        a = math.radians(ang)
        b.card([(0.045 * math.sin(a), 0.045 * math.cos(a) + 0.01, 0.078),
                (0.095 * math.sin(a), 0.095 * math.cos(a) + 0.01, 0.062),
                (0.085 * math.sin(a + 0.6), 0.085 * math.cos(a + 0.6) + 0.01, 0.050),
                (0.038 * math.sin(a + 0.6), 0.038 * math.cos(a + 0.6) + 0.01, 0.066)], m['gear'],
               'hips')
    # ocho tentaculos finos: caen verticales del borde y se despliegan al arrastrar
    for i in range(8):
        a = math.radians(i * 45)
        x, y = 0.325 * math.sin(a), 0.325 * math.cos(a)
        b.tube((x, y + 0.02, 0.140), (x * 1.02, y * 1.02 + 0.02, 0.050), 0.019, 0.014, m['hair'],
               f'tent{i + 1}', sides=4)
        b.tube((x * 1.02, y * 1.02 + 0.02, 0.050), (x * 1.20, y * 1.20 + 0.02, 0.014), 0.014,
               0.010, m['hair'], f'tip{i + 1}', sides=4)
        b.tube((x * 1.20, y * 1.20 + 0.02, 0.014), (x * 1.55, y * 1.55 + 0.02, 0.006), 0.010,
               0.005, m['trim'], f'tip{i + 1}', sides=4)
    # volante: lenguetas del borde entre tentaculo y tentaculo
    for i in range(8):
        a = math.radians(i * 45 + 22.5)
        x, y = 0.345 * math.sin(a), 0.345 * math.cos(a)
        b.card([(x * 0.92, y * 0.92 + 0.02, 0.148), (x, y + 0.02, 0.135),
                (x * 1.06, y * 1.06 + 0.02, 0.075), (x * 0.93, y * 0.93 + 0.02, 0.095)],
               m['skin'], 'hips')
    # dos brazos orales rizados en el centro, mas gruesos que la falda
    for nombre, x0, y0 in (('oral1', 0.04, 0.04), ('oral2', -0.04, -0.02)):
        b.tube((x0, y0, 0.170), (x0 * 1.6, y0 * 1.6 + 0.02, 0.10), 0.044, 0.034, m['skin'], nombre,
               sides=5)
        b.tube((x0 * 1.6, y0 * 1.6 + 0.02, 0.10), (x0 * 2.4, y0 * 2.4 - 0.03, 0.038), 0.034,
               0.024, m['skin'], nombre, sides=5)
        b.tube((x0 * 2.4, y0 * 2.4 - 0.03, 0.038), (x0 * 2.9, y0 * 2.9 + 0.04, 0.013), 0.024,
               0.013, m['hair'], nombre, sides=4)


def zancudo_mesh(b, m):
    # torax giboso y abdomen estriado que arquea
    b.blob((0, 0.02, 0.455), (0.115, 0.145, 0.105), m['cloth'], 'hips', subdiv=1)
    b.blob((0, 0.02, 0.40), (0.095, 0.125, 0.070), m['skin'], 'hips', subdiv=1)  # panza del torax
    b.tube((0, 0.10, 0.44), (0, 0.28, 0.45), 0.070, 0.062, m['hair'], 'abdomen1', sides=6, flat=0.92)
    b.tube((0, 0.28, 0.45), (0, 0.46, 0.41), 0.062, 0.048, m['hair'], 'abdomen2', sides=6, flat=0.92)
    b.tube((0, 0.46, 0.41), (0, 0.62, 0.345), 0.048, 0.028, m['hair'], 'abdomen3', sides=6)
    b.tube((0, 0.62, 0.345), (0, 0.71, 0.30), 0.028, 0.010, m['hair'], 'abdomen3', sides=5)
    for y, z, r in ((0.16, 0.45, 0.068), (0.31, 0.455, 0.060), (0.46, 0.41, 0.048),
                    (0.57, 0.37, 0.037)):  # anillos claros
        b.tube((0, y, z), (0, y + 0.035, z - 0.005), r, r * 0.95, m['trim'],
               'abdomen1' if y < 0.3 else ('abdomen2' if y < 0.5 else 'abdomen3'), sides=6)
    # cabeza con ojos compuestos y antenas plumosas
    b.blob((0, -0.145, 0.435), (0.072, 0.065, 0.068), m['cloth'], 'head', subdiv=1)
    for x in (-1, 1):
        b.blob((x * 0.052, -0.175, 0.455), (0.036, 0.045, 0.042), m['gear'], 'head', subdiv=1)
        b.blob((x * 0.070, -0.190, 0.468), (0.012, 0.014, 0.014), m['ojo'], 'head', subdiv=1)
        # antena: asta con banderita de pelos
        b.tube((x * 0.03, -0.18, 0.49), (x * 0.09, -0.26, 0.55), 0.008, 0.005, m['skin'], 'head',
               sides=4)
        b.card([(x * 0.055, -0.205, 0.505), (x * 0.065, -0.215, 0.555),
                (x * 0.085, -0.245, 0.560), (x * 0.075, -0.235, 0.512)], m['trim'], 'head')
        b.card([(x * 0.070, -0.225, 0.520), (x * 0.082, -0.240, 0.565),
                (x * 0.098, -0.268, 0.552), (x * 0.088, -0.252, 0.510)], m['trim'], 'head')
        # palpos cortos a los lados de la trompa
        b.tube((x * 0.02, -0.19, 0.41), (x * 0.035, -0.27, 0.38), 0.010, 0.005, m['skin'], 'head',
               sides=4)
    # trompa-aguja larga y fina
    b.tube((0, -0.185, 0.425), (0, -0.36, 0.36), 0.016, 0.010, m['gear'], 'trunk', sides=5)
    b.tube((0, -0.36, 0.36), (0, -0.52, 0.30), 0.010, 0.004, m['gear'], 'trunk', sides=4)
    # dos alas estrechas plegadas sobre el lomo (mirando atras +Y)
    for x, hueso in ((1, 'wingL'), (-1, 'wingR')):
        b.poly([(x * 0.035, 0.00, 0.525), (x * 0.045, 0.12, 0.540), (x * 0.030, 0.14, 0.520)],
               [(x * 0.085, 0.34, 0.560), (x * 0.130, 0.50, 0.545), (x * 0.100, 0.52, 0.520)],
               m['trim'], hueso)
        b.poly([(x * 0.040, 0.10, 0.532), (x * 0.055, 0.24, 0.548), (x * 0.040, 0.26, 0.528)],
               [(x * 0.120, 0.52, 0.538), (x * 0.100, 0.56, 0.528), (x * 0.075, 0.44, 0.520)],
               m['trim'], hueso)
        # nervio alar
        b.tube((x * 0.05, 0.06, 0.535), (x * 0.10, 0.48, 0.535), 0.005, 0.003, m['cloth'], hueso,
               sides=4)
    # seis patas finas en trípode, codo arriba y tarso al suelo
    for nombre, s in (('FL', 1), ('FR', -1), ('ML', 1), ('MR', -1), ('BL', 1), ('BR', -1)):
        x, y0 = {'FL': (0.11, -0.02), 'ML': (0.12, 0.12), 'BL': (0.10, 0.26)}[nombre[0] + 'L']
        b.tube((s * x, y0, 0.40), (s * (x + 0.16), y0 - 0.06, 0.22), 0.013, 0.010, m['skin'],
               f'leg{nombre}', sides=4)
        b.tube((s * (x + 0.16), y0 - 0.06, 0.22), (s * (x + 0.10), y0 + 0.14, 0.015), 0.010,
               0.006, m['skin'], f'shin{nombre}', sides=4)
        b.tube((s * (x + 0.10), y0 + 0.14, 0.015), (s * (x + 0.10), y0 + 0.21, 0.006), 0.006,
               0.004, m['trim'], f'shin{nombre}', sides=4)


def f10_clips(rig, medusa):
    if medusa:
        rest = {}
        rest.update({f'tent{i + 1}': (0, 0, 0) for i in range(8)})
        rest.update({f'tip{i + 1}': (0, 0, 0) for i in range(8)})
        rest['oral1'] = rest['oral2'] = (0, 0, 0)

        def r(**kw):
            return {**rest, **kw}

        # latido: la campana se aplana y se hincha (escala no: rotation X del hips + hips z)
        rig.clip('Reposo', [
            (1, rest),
            (10, r(hips=(6, 0, 0), **{f'tent{i + 1}': (5, 0, 0) for i in range(8)},
                   oral1=(6, 0, 0), oral2=(6, 0, 0)), (0, 0, -0.05)),
            (20, r(hips=(-4, 0, 0), **{f'tip{i + 1}': (-4, 0, 0) for i in range(8)}), (0, 0, 0.02)),
            (30, r(hips=(6, 0, 0), **{f'tent{i + 1}': (5, 0, 0) for i in range(8)},
                   oral1=(6, 0, 0), oral2=(6, 0, 0)), (0, 0, -0.05)),
            (40, r(hips=(-4, 0, 0), **{f'tip{i + 1}': (-4, 0, 0) for i in range(8)}), (0, 0, 0.02)),
            (50, r(hips=(4, 0, 2), tent3=(6, 6, 0), tip5=(-4, -6, 0)), (0, 0, -0.03)),
            (61, rest),
        ])

        def gait(t):
            s = math.sin(2 * math.pi * t)
            pose = {'hips': (9 * s, 0, 0)}
            for i in range(8):
                f = math.sin(2 * math.pi * (t + i / 8))
                pose[f'tent{i + 1}'] = (7 + 5 * f, 5 * f, 8 * f)
                pose[f'tip{i + 1}'] = (-3 - 9 * f, -4 * f, -10 * f)
            pose['oral1'] = (8 * s, 0, 6 * s)
            pose['oral2'] = (-8 * s, 0, -6 * s)
            return pose, (0, 0, -0.055 * abs(s) - 0.01)

        rig.clip('Caminar', [(1 + i * 3, *gait(i / 8)) for i in range(9)])
        # estampado: se contrae entera y se lanza hacia delante estirando los tentaculos
        rig.clip('Atacar', [
            (1, rest),
            (5, r(hips=(-10, 0, 0), **{f'tent{i + 1}': (-12, 0, 0) for i in range(8)},
                  **{f'tip{i + 1}': (-16, 0, 0) for i in range(8)}, oral1=(-12, 0, 0),
                  oral2=(-12, 0, 0)), (0, 0.05, 0.05)),
            (8, r(hips=(26, 0, 0), **{f'tent{i + 1}': (34, 0, 0) for i in range(8)},
                  **{f'tip{i + 1}': (26, 0, 0) for i in range(8)}, oral1=(30, 0, 10),
                  oral2=(30, 0, -10)), (0, -0.20, -0.05)),
            (12, r(hips=(8, 0, 0), **{f'tent{i + 1}': (10, 0, 0) for i in range(8)}), (0, -0.06, -0.02)),
            (22, rest),
        ])
        rig.clip('Golpeado', [
            (1, rest),
            (4, r(hips=(-16, 0, 0), **{f'tent{i + 1}': (-10, 0, (i % 2) * 18 - 9) for i in range(8)},
                  **{f'tip{i + 1}': (-8, 0, (i % 2) * 14 - 7) for i in range(8)}), (0, 0.05, 0.08)),
            (13, rest),
        ])
        rig.clip('Morir', [
            (1, rest),
            (6, r(hips=(10, 0, 0), **{f'tent{i + 1}': (-6, 0, 0) for i in range(8)}), (0, 0.02, 0.02)),
            (16, {'hips': (0, 0, 0), **{f'tent{i + 1}': (22, 0, (i % 2) * 16 - 8) for i in range(8)},
                  **{f'tip{i + 1}': (30, 0, (i % 2) * 20 - 10) for i in range(8)},
                  'oral1': (26, 0, 8), 'oral2': (26, 0, -8)}, (0, 0.02, -0.14)),
            (28, {'hips': (0, 0, 0), **{f'tent{i + 1}': (34, 0, (i % 2) * 22 - 11) for i in range(8)},
                  **{f'tip{i + 1}': (42, 0, (i % 2) * 26 - 13) for i in range(8)},
                  'oral1': (40, 0, 12), 'oral2': (40, 0, -12)}, (0, 0.02, -0.20)),
        ])
    else:
        patas = [f'{p}{s}' for p in ('FL', 'ML', 'BL') for s in ('L', 'R')]
        rest = {'abdomen1': (-2, 0, 0), 'abdomen2': (-2, 0, 0), 'abdomen3': (-2, 0, 0),
                'trunk': (2, 0, 0), 'wingL': (-4, 0, 4), 'wingR': (-4, 0, -4)}
        rest.update({f'leg{p}': (0, 0, 0) for p in patas})
        rest.update({f'shin{p}': (0, 0, 0) for p in patas})

        def r(**kw):
            return {**rest, **kw}

        # aleteo lento y bombeo del abdomen (el zumbido real no cabe en 24 fps)
        rig.clip('Reposo', [
            (1, rest),
            (8, r(wingL=(-30, 0, 10), wingR=(-30, 0, -10), abdomen1=(-6, 0, 0),
                  abdomen2=(-6, 0, 0)), (0, 0, 0.008)),
            (16, r(wingL=(-4, 0, 4), wingR=(-4, 0, -4), abdomen1=(0, 0, 0), trunk=(5, 0, 0)),
             (0, 0, -0.004)),
            (24, r(wingL=(-30, 0, 10), wingR=(-30, 0, -10), abdomen1=(-6, 0, 0),
                  abdomen2=(-6, 0, 0)), (0, 0, 0.008)),
            (32, r(abdomen2=(2, 0, 0), abdomen3=(3, 0, 0))),
            (40, r(wingL=(-30, 0, 10), wingR=(-30, 0, -10), legBL=(-6, 0, 0), shinBL=(6, 0, 0))),
            (48, r(wingL=(-8, 0, 2), wingR=(-8, 0, -2), legFL=(-6, 0, 0), shinFL=(6, 0, 0))),
            (61, rest),
        ])

        def gait(t):
            s = math.sin(2 * math.pi * t)
            pose = {'hips': (1.5 * s, 0, 0), 'head': (-1.5 * s, 0, 0), 'trunk': (4 * s, 0, 0)}
            pose['abdomen1'] = (-3 - 4 * s, 0, 0)
            pose['abdomen2'] = (-3 - 6 * s, 0, 0)
            pose['abdomen3'] = (-3 - 8 * s, 0, 0)
            pose['wingL'] = (-6 - 16 * s, 0, 4)
            pose['wingR'] = (-6 + 16 * s, 0, -4)
            for p, ph in (('FL', 0.0), ('BR', 0.0), ('ML', 0.33), ('FR', 0.33),
                          ('BL', 0.66), ('MR', 0.66)):
                f = math.sin(2 * math.pi * (t + ph))
                g = math.cos(2 * math.pi * (t + ph))
                pose[f'leg{p}'] = (-20 * f, 6 * f, 0)
                pose[f'shin{p}'] = (14 * g - 4, 0, 0)
            return pose, (0, 0, 0.012 * abs(s))

        rig.clip('Caminar', [(1 + i * 3, *gait(i / 8)) for i in range(9)])
        # trompazo: levanta abdomen y patas traseras y clava la trompa
        rig.clip('Atacar', [
            (1, rest),
            (5, r(abdomen1=(-16, 0, 0), abdomen2=(-14, 0, 0), abdomen3=(-12, 0, 0),
                  trunk=(-14, 0, 0), legBL=(-20, 0, 0), legBR=(-20, 0, 0), wingL=(-18, 0, 8),
                  wingR=(-18, 0, -8)), (0, 0.05, 0.03)),
            (8, {'abdomen1': (16, 0, 0), 'abdomen2': (18, 0, 0), 'abdomen3': (16, 0, 0),
                 'hips': (-10, 0, 0), 'head': (8, 0, 0), 'trunk': (26, 0, 0),
                 'legFL': (-30, 0, 0), 'legFR': (-30, 0, 0), 'shinFL': (20, 0, 0),
                 'shinFR': (20, 0, 0), 'legML': (12, 0, 0), 'legMR': (12, 0, 0),
                 'legBL': (24, 0, 0), 'legBR': (24, 0, 0), 'wingL': (-34, 0, 12),
                 'wingR': (-34, 0, -12)}, (0, -0.12, 0.02)),
            (12, r(hips=(-4, 0, 0), trunk=(8, 0, 0), abdomen1=(-8, 0, 0)), (0, -0.04, 0)),
            (22, rest),
        ])
        rig.clip('Golpeado', [
            (1, rest),
            (4, r(hips=(12, 0, 0), head=(16, 0, 0), trunk=(20, 0, 4), abdomen1=(-16, 0, 0),
                  abdomen2=(-14, 0, 0), wingL=(-26, 0, 18), wingR=(-26, 0, -18),
                  **{f'leg{p}': (14, 0, 0) for p in patas}), (0, 0.05, 0.05)),
            (13, rest),
        ])
        rig.clip('Morir', [
            (1, rest),
            (6, r(hips=(16, 0, 0), head=(22, 0, 0), trunk=(26, 0, 6), abdomen1=(-14, 0, 0),
                  abdomen2=(-10, 0, 0)), (0, 0.03, -0.04)),
            (16, {'hips': (0, 0, 26), 'head': (10, 0, 8), 'trunk': (30, 0, 12),
                  'abdomen1': (18, 0, -8), 'abdomen2': (14, 0, -6), 'abdomen3': (12, 0, -4),
                  'wingL': (10, 0, 26), 'wingR': (10, 0, -26),
                  **{f'leg{p}': (26, 0, (i % 2) * 14 - 7) for i, p in enumerate(patas)},
                  **{f'shin{p}': (22, 0, 0) for p in patas}}, (0, 0.02, -0.20)),
            (28, {'hips': (0, 0, 38), 'head': (12, 0, 12), 'trunk': (34, 0, 18),
                  'abdomen1': (24, 0, -12), 'abdomen2': (20, 0, -8), 'abdomen3': (16, 0, -6),
                  'wingL': (16, 0, 34), 'wingR': (16, 0, -34),
                  **{f'leg{p}': (34, 0, (i % 2) * 18 - 9) for i, p in enumerate(patas)},
                  **{f'shin{p}': (28, 0, 0) for p in patas}}, (0, 0.02, -0.31)),
        ])


def generar2(escena, nombre, bones, mesh_fn, archivo, medusa=True):
    m = mats(medusa)
    rig = fg_rig.Rig(escena, f'FG_{nombre}', bones)
    b = fg.Builder('Cuerpo')
    mesh_fn(b, m)
    cuerpo = rig.part(b)
    f10_clips(rig, medusa)
    rig.export(archivo)
    tris = sum(len(p.vertices) - 2 for p in cuerpo.data.polygons)
    print(f'{archivo}: {tris} triangulos')
    assert tris <= 1500, f'{archivo} fuera de presupuesto: {tris} triangulos'
    for act in rig.actions:  # prefijo para que convivan en el .blend sin colision
        act.name = f'{nombre}_{act.name}'
    return rig, cuerpo


def main():
    escena_base = fg.reset()
    rig1, cuerpo = generar2(escena_base, 'Medusa', MEDUSA_BONES, medusa_mesh, 'medusa.glb')
    cuerpo.name = 'Cuerpo_medusa'
    rig2, cq = generar2(escena_base, 'Zancudo', ZANCUDO_BONES, zancudo_mesh, 'zancudo.glb',
                        medusa=False)
    cq.name = 'Cuerpo_zancudo'
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'fauna_medusa_zancudo.blend'), copy=True)
    print('fauna_medusa_zancudo.blend salvo las dos especies con clips prefijados')


if __name__ == '__main__':
    main()
