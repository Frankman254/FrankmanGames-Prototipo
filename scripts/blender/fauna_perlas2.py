# Fauna del Archipielago de las Perlas, segunda tanda (OMP-FA-09): tiburon
# martillo (`perlas_shark`) y calamar gigante (`perlas_squid`).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/fauna_perlas2.py
# Escribe assets/models/tiburon.glb y assets/models/calamar.glb y salva
# arte/blender/fauna_perlas2.blend. NO se integra: nada toca data/ ni src/.
#
#   Tiburon Martillo Patron (elite, creador/Junie: hoy es un lobo tenido y es
#   un tiburon). Martillo de aguas calidas: cabeza en T con los ojos en las
#   puntas, boca debajo del martillo, aleta dorsal alta, dos lóbulos de cola
#   con el de arriba largo. Como el juego anda por el suelo (convencion de la
#   casa, igual que el caiman de FA-02), se apoya en las aletas pectorales y
#   pelvicas rigidas: camina ondulando el cuerpo de lado, aleteo torpe.
#   Calamar Gigante Madrugador: manto conico de pie, ocho brazos alrededor de
#   la boca (dos largos con maza y ventosas) y un pico asomando. Ondeo de
#   brazos al andar, embestida con las dos mazas por delante.
#
# Referencias (no hay lamina REF-01 para esta familia, anota OMP 2026-11-21):
# silueta de memoria de campo del tiburon martillo (cefalolobo en T, ojos en
# los extremos, boca ventral) y del calamar (manto con aletas en el extremo,
# corona de brazos, dos brazos alimentadores con maza). Clean-room.
#
# Convenciones de la casa: mira a -Y, +Z arriba, escala en metros, apoyo en z=0
# en el fotograma 1 (Reposo). Cinco clips (Reposo, Caminar, Atacar, Golpeado,
# Morir) con bucles sin salto, rodando/caminando en el sitio. Materiales por
# region tenible: skin, cloth, trim, hair, gear. <=1500 tri por bicho.
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


def mats(squid=False):
    if squid:
        return dict(
            skin=fg.material('skin', (0.80, 0.62, 0.55)),                      # cara y garganta
            cloth=fg.material('cloth', (0.45, 0.14, 0.18)),                    # mato rojo pardo
            trim=fg.material('trim', (0.85, 0.75, 0.68)),                      # ventosas y puntas
            hair=fg.material('hair', (0.24, 0.07, 0.10)),                      # aletas del manto
            gear=fg.material('gear', (0.08, 0.06, 0.05), rough=0.35),          # pico y pupilas
            ojo=fg.material('ojo_perlas2', (0.90, 0.82, 0.40), rough=0.3),     # iris dorado
        )
    return dict(
        skin=fg.material('skin', (0.62, 0.44, 0.44)),                          # interior de boca y branquias
        cloth=fg.material('cloth', (0.32, 0.38, 0.44)),                        # lomo gris azulado
        trim=fg.material('trim', (0.86, 0.85, 0.80)),                          # vientre blanco
        hair=fg.material('hair', (0.22, 0.26, 0.31)),                          # aletas y cicatrices
        gear=fg.material('gear', (0.92, 0.90, 0.84), rough=0.3),               # dientes
        ojo=fg.material('ojo_perlas2', (0.04, 0.04, 0.05), rough=0.25),
    )


TIBURON_BONES = [
    ('hips', None, (0, 0.38, 0.60), (0, 0.12, 0.60)),
    ('chest', 'hips', (0, 0.12, 0.60), (0, -0.20, 0.62)),
    ('head', 'chest', (0, -0.20, 0.62), (0, -0.46, 0.58)),
    ('jaw', 'head', (0, -0.38, 0.46), (0, -0.52, 0.40)),
    ('tail1', 'hips', (0, 0.38, 0.60), (0, 0.66, 0.60)),
    ('tail2', 'tail1', (0, 0.66, 0.60), (0, 0.94, 0.64)),
    ('tail3', 'tail2', (0, 0.94, 0.64), (0, 1.18, 0.72)),
    ('pecL', 'chest', (0.17, -0.02, 0.52), (0.44, -0.14, 0.12)),
    ('pecR', 'chest', (-0.17, -0.02, 0.52), (-0.44, -0.14, 0.12)),
    ('pelL', 'hips', (0.11, 0.30, 0.48), (0.16, 0.34, 0.10)),
    ('pelR', 'hips', (-0.11, 0.30, 0.48), (-0.16, 0.34, 0.10)),
]

CALAMAR_BONES = [
    ('hips', None, (0, 0.10, 0.98), (0, 0.44, 1.28)),           # manto inclinado
    ('head', 'hips', (0, 0.10, 0.98), (0, -0.06, 0.80)),
    ('jaw', 'head', (0, -0.06, 0.76), (0, -0.16, 0.66)),        # pico asomando
    ('eyeL', 'head', (0.12, -0.02, 0.92), (0.22, -0.04, 0.95)),
    ('eyeR', 'head', (-0.12, -0.02, 0.92), (-0.22, -0.04, 0.95)),
]
# corona de seis brazos cortos + dos brazos alimentadores largos con maza
for i in range(6):
    a = math.radians(-75 + i * 30)
    x, y = 0.13 * math.sin(a), 0.13 * math.cos(a) - 0.10
    CALAMAR_BONES.append((f'tent{i + 1}', 'head', (x * 0.7, y * 0.7 + 0.02, 0.72),
                          (x * 1.7, y * 1.7, 0.30)))
    CALAMAR_BONES.append((f'tip{i + 1}', f'tent{i + 1}', (x * 1.7, y * 1.7, 0.30),
                          (x * 2.1, y * 2.1 - 0.04, 0.01)))
for s, nombre in ((1, 'fang1'), (-1, 'fang2')):
    CALAMAR_BONES += [
        (nombre, 'head', (s * 0.05, -0.16, 0.62), (s * 0.10, -0.44, 0.30)),
        (f'{nombre}Tip', nombre, (s * 0.10, -0.44, 0.30), (s * 0.13, -0.62, 0.02)),
    ]


def aleta(b, m, hueso, points_a, points_b):
    b.poly(points_a, points_b, m['hair'], hueso)


def tiburon_mesh(b, m):
    # cuerpo fusiforme: vientre claro debajo, lomo gris encima
    b.tube((0, 0.38, 0.60), (0, 0.12, 0.60), 0.235, 0.270, m['cloth'], 'hips', sides=8, flat=0.86)
    b.tube((0, 0.12, 0.60), (0, -0.20, 0.62), 0.270, 0.215, m['cloth'], 'chest', sides=8, flat=0.86)
    b.tube((0, -0.20, 0.62), (0, -0.40, 0.585), 0.215, 0.150, m['cloth'], 'head', sides=8, flat=0.86)
    b.tube((0, 0.12, 0.50), (0, -0.24, 0.52), 0.200, 0.150, m['trim'], 'chest', sides=6, flat=0.70)
    b.blob((0, 0.30, 0.52), (0.17, 0.24, 0.12), m['trim'], 'hips', subdiv=1)     # vientre de atras
    # cola: pedunculo fino y dos lobulos
    b.tube((0, 0.38, 0.60), (0, 0.70, 0.61), 0.235, 0.085, m['cloth'], 'tail1', sides=6, flat=0.88)
    b.tube((0, 0.70, 0.61), (0, 0.94, 0.64), 0.085, 0.055, m['cloth'], 'tail2', sides=5)
    b.tube((0, 0.94, 0.64), (0, 1.14, 0.70), 0.055, 0.035, m['cloth'], 'tail3', sides=5)
    aleta(b, m, 'tail3', [(0, 0.96, 0.66), (0, 1.06, 0.66), (0, 1.02, 0.64)],
          [(0, 1.34, 1.02), (0, 1.06, 0.50), (0, 0.90, 0.36)])
    aleta(b, m, 'tail3', [(0, 1.02, 0.62), (0, 1.10, 0.66), (0, 1.04, 0.68)],
          [(0, 1.02, 0.30), (0, 0.86, 0.28), (0, 0.80, 0.44)])
    # aleta dorsal alta y pectorales rigidizadas como brazos
    aleta(b, m, 'chest', [(0, 0.02, 0.84), (0, 0.12, 0.83), (0, 0.07, 0.80)],
          [(0, -0.16, 1.14), (0, 0.22, 0.88), (0, 0.12, 0.84)])
    aleta(b, m, 'chest', [(0, 0.46, 0.72), (0, 0.54, 0.71), (0, 0.50, 0.69)],
          [(0, 0.30, 0.92), (0, 0.52, 0.74), (0, 0.44, 0.72)])
    for x in (-1, 1):
        pec = 'pecL' if x == 1 else 'pecR'
        b.poly([(x * 0.14, -0.06, 0.55), (x * 0.16, 0.06, 0.50), (x * 0.13, 0.02, 0.44)],
               [(x * 0.46, -0.16, 0.18), (x * 0.42, -0.02, 0.16), (x * 0.38, 0.02, 0.10)],
               m['hair'], pec)
        b.blob((x * 0.43, -0.10, 0.068), (0.05, 0.14, 0.050), m['hair'], pec,
               subdiv=1)                                                        # punta que apoya
        b.poly([(x * 0.09, 0.26, 0.50), (x * 0.11, 0.36, 0.48), (x * 0.08, 0.33, 0.44)],
               [(x * 0.17, 0.30, 0.10), (x * 0.14, 0.40, 0.08), (x * 0.11, 0.38, 0.03)],
               m['hair'], 'pelL' if x == 1 else 'pelR')
    # martillo: puente cefalico con lobulos y ojos en las puntas
    b.tube((0.14, -0.48, 0.575), (-0.14, -0.48, 0.575), 0.075, 0.075, m['cloth'], 'head',
           sides=6, flat=0.78)
    for x in (-1, 1):
        b.blob((x * 0.30, -0.475, 0.575), (0.105, 0.085, 0.062), m['cloth'], 'head', subdiv=1)
        b.blob((x * 0.345, -0.495, 0.60), (0.030, 0.026, 0.030), m['ojo'], 'head', subdiv=1)
        b.blob((x * 0.362, -0.508, 0.608), (0.010, 0.008, 0.010), m['trim'], 'head', subdiv=1)
        b.blob((x * 0.28, -0.52, 0.545), (0.028, 0.020, 0.014), m['skin'], 'head', subdiv=1)  # ollar
    # boca ventral debajo del martillo, con dientes triangulares
    b.tube((0, -0.42, 0.475), (0, -0.53, 0.445), 0.075, 0.050, m['skin'], 'jaw', sides=6, flat=0.72)
    for i, x in enumerate((-0.06, -0.03, 0.0, 0.03, 0.06)):
        y = -0.44 - 0.018 * abs(x) * 40
        b.tube((x, y, 0.515), (x * 0.9, y - 0.012, 0.470), 0.013, 0.003, m['gear'], 'head', sides=4)
        b.tube((x, y, 0.440), (x * 0.9, y - 0.012, 0.482), 0.013, 0.003, m['gear'], 'jaw', sides=4)
    # branquias: cinco rendijas a cada lado
    for x in (-1, 1):
        for i, y in enumerate((-0.10, -0.02, 0.06, 0.14, 0.22)):
            b.card([(x * 0.262, y, 0.66), (x * 0.272, y + 0.018, 0.655),
                    (x * 0.268, y + 0.020, 0.575), (x * 0.258, y + 0.002, 0.580)], m['skin'],
                   'hips' if i > 1 else 'chest')
    # cicatrices de anzuelo y de otro tiburon en el flanco
    for x, y, l in ((1, -0.05, 0.16), (1, 0.28, 0.12), (-1, 0.10, 0.14)):
        b.card([(x * 0.274, y, 0.70), (x * 0.270, y + l, 0.66),
                (x * 0.276, y + l, 0.655), (x * 0.280, y, 0.695)], m['hair'],
               'chest' if y < 0.1 else 'hips')


def calamar_mesh(b, m):
    # manto conico inclinado, con sus aletas en el extremo de atras
    b.tube((0, -0.02, 0.94), (0, 0.28, 1.16), 0.215, 0.170, m['cloth'], 'hips', sides=8, flat=0.90)
    b.tube((0, 0.28, 1.16), (0, 0.52, 1.34), 0.170, 0.070, m['cloth'], 'hips', sides=6, flat=0.92)
    b.blob((0, 0.56, 1.38), (0.06, 0.10, 0.06), m['cloth'], 'hips', subdiv=1)
    aleta(b, m, 'hips', [(0, 0.24, 1.24), (0, 0.44, 1.34), (0, 0.40, 1.22)],
          [(0, 0.42, 1.42), (0, 0.66, 1.34), (0, 0.50, 1.18)])
    for x in (-1, 1):
        b.poly([(x * 0.03, 0.24, 1.22), (x * 0.05, 0.44, 1.32), (x * 0.02, 0.42, 1.20)],
               [(x * 0.24, 0.34, 1.30), (x * 0.28, 0.56, 1.28), (x * 0.12, 0.50, 1.10)],
               m['hair'], 'hips')
    # manchas de cromatoforos
    for x, y, z, r in ((0.10, 0.08, 1.10, 0.045), (-0.12, 0.20, 1.20, 0.05),
                       (0.06, 0.34, 1.28, 0.038), (-0.08, 0.02, 1.02, 0.04)):
        b.blob((x, y, z), (r, r * 1.3, r * 0.5), m['trim'], 'hips', subdiv=1)
    # cabeza globosa con dos ojos enormes
    b.blob((0, -0.05, 0.86), (0.185, 0.20, 0.185), m['skin'], 'head', subdiv=1)
    for x in (-1, 1):
        ojo = 'eyeL' if x == 1 else 'eyeR'
        b.blob((x * 0.185, -0.09, 0.94), (0.085, 0.075, 0.095), m['ojo'], ojo, subdiv=1)
        b.blob((x * 0.225, -0.145, 0.945), (0.030, 0.024, 0.045), m['gear'], ojo, subdiv=1)
        b.blob((x * 0.248, -0.160, 0.99), (0.012, 0.010, 0.014), m['trim'], ojo, subdiv=1)
    # pico asomando entre los brazos
    b.tube((0, -0.10, 0.72), (0, -0.20, 0.64), 0.055, 0.020, m['gear'], 'jaw', sides=5, flat=0.85)
    # corona de seis brazos cortos ondulados
    for i in range(6):
        a = math.radians(-75 + i * 30)
        x, y = 0.13 * math.sin(a), 0.13 * math.cos(a) - 0.10
        b.tube((x * 0.7, y * 0.7 + 0.02, 0.72), (x * 1.25, y * 1.25, 0.48), 0.042, 0.030,
               m['cloth'], f'tent{i + 1}', sides=5)
        b.tube((x * 1.25, y * 1.25, 0.48), (x * 1.7, y * 1.7, 0.30), 0.030, 0.020, m['cloth'],
               f'tent{i + 1}', sides=5)
        b.tube((x * 1.7, y * 1.7, 0.30), (x * 2.0, y * 2.0 - 0.03, 0.02), 0.020, 0.010, m['trim'],
               f'tip{i + 1}', sides=4)
    # dos brazos alimentadores con maza de ventosas
    for s, nombre in ((1, 'fang1'), (-1, 'fang2')):
        b.tube((s * 0.05, -0.16, 0.62), (s * 0.08, -0.32, 0.46), 0.045, 0.032, m['cloth'],
               nombre, sides=5)
        b.tube((s * 0.08, -0.32, 0.46), (s * 0.10, -0.44, 0.30), 0.032, 0.024, m['cloth'],
               nombre, sides=5)
        b.tube((s * 0.10, -0.44, 0.30), (s * 0.115, -0.52, 0.14), 0.024, 0.030, m['cloth'],
               f'{nombre}Tip')                                              # manga hasta la maza
        b.blob((s * 0.118, -0.54, 0.10), (0.048, 0.10, 0.055), m['trim'], f'{nombre}Tip', subdiv=1)
        b.tube((s * 0.12, -0.60, 0.05), (s * 0.13, -0.63, -0.02), 0.030, 0.014, m['trim'],
               f'{nombre}Tip', sides=4)


def perlas2_clips(rig, tiburon):
    if tiburon:
        rest = {'jaw': (2, 0, 0), 'tail1': (-2, 0, 0), 'pecL': (-8, 0, -14), 'pecR': (-8, 0, 14),
                'pelL': (-4, 0, -8), 'pelR': (-4, 0, 8)}

        def r(**kw):
            return {**rest, **kw}

        rig.clip('Reposo', [
            (1, rest),
            (16, r(chest=(0, 2.5, 0), tail1=(-2, -3, 0), jaw=(5, 0, 0)), (0, 0, 0.006)),
            (31, r(chest=(0, -2.5, 0), tail1=(-2, 3, 0), pelL=(-8, 0, -8), pelR=(-8, 0, 8)),
             (0, 0, -0.005)),
            (46, r(chest=(0, 2.5, 0), tail1=(-2, -3, 0), jaw=(5, 0, 0)), (0, 0, 0.006)),
            (61, rest),
        ])

        def gait(t):
            s = math.sin(2 * math.pi * t)
            # ondulacion que recorre el cuerpo de la cabeza a la cola
            return ({'hips': (0, -7 * s, 0), 'chest': (1.5 * s, 9 * s, 0),
                     'head': (0, -6 * s, 0), 'jaw': (4 + 3 * s, 0, 0),
                     'tail1': (-2 - 3 * s, -14 * s, 0), 'tail2': (-3, -20 * s, 0),
                     'tail3': (-4, -24 * s, 0),
                     'pecL': (-8 - 10 * s, 0, -14), 'pecR': (-8 + 10 * s, 0, 14),
                     'pelL': (-4 + 9 * s, 0, -8), 'pelR': (-4 - 9 * s, 0, 8)},
                    (0, 0, 0.010 * abs(s)))

        rig.clip('Caminar', [(1 + i * 3, *gait(i / 8)) for i in range(9)])
        # mandoble: se recuesta acumulando y muerde abajo con el martillo primero
        rig.clip('Atacar', [
            (1, rest),
            (5, r(hips=(0, 14, 0), chest=(0, -16, 0), tail1=(-2, 12, 0), tail2=(-3, 16, 0),
                  jaw=(8, 0, 0)), (0, 0.05, 0.01)),
            (8, {'hips': (0, -26, 0), 'chest': (2, 24, 0), 'head': (14, -12, 0), 'jaw': (30, 0, 0),
                 'tail1': (-6, 16, 0), 'tail2': (-8, 10, 0),
                 'pecL': (-24, 0, -34), 'pecR': (-24, 0, 34), 'pelL': (14, 0, -12),
                 'pelR': (14, 0, 12)}, (0, -0.16, 0.03)),
            (12, r(hips=(0, -6, 0), chest=(0, 6, 0), head=(4, -3, 0), jaw=(6, 0, 0)), (0, -0.05, 0)),
            (22, rest),
        ])
        rig.clip('Golpeado', [
            (1, rest),
            (4, r(hips=(0, -10, 0), chest=(0, 12, 0), head=(8, -8, 0), jaw=(18, 0, 0),
                  tail1=(-10, 14, 0), pecL=(-2, 0, -30), pecR=(-2, 0, 30)), (0, 0.06, -0.02)),
            (13, rest),
        ])
        rig.clip('Morir', [
            (1, rest),
            (6, r(chest=(0, -10, 0), head=(10, -6, 0), jaw=(22, 0, 0), tail1=(-8, 8, 0)),
             (0, 0.04, -0.03)),
            (16, {'hips': (8, 0, 0), 'chest': (14, -8, 0), 'head': (26, 0, 0), 'jaw': (30, 0, 0),
                  'tail1': (12, 12, 0), 'tail2': (10, 16, 0), 'tail3': (10, 18, 0),
                  'pecL': (16, 0, 10), 'pecR': (16, 0, -10), 'pelL': (12, 0, 6), 'pelR': (12, 0, -6)},
             (0, 0.04, -0.30)),
            (28, {'hips': (12, 0, 0), 'chest': (20, -10, 0), 'head': (34, 4, 0), 'jaw': (34, 0, 0),
                  'tail1': (16, 14, 0), 'tail2': (14, 18, 0), 'tail3': (14, 20, 0),
                  'pecL': (22, 0, 16), 'pecR': (22, 0, -16), 'pelL': (16, 0, 8), 'pelR': (16, 0, -8)},
             (0, 0.04, -0.42)),
        ])
    else:
        rest = {'jaw': (4, 0, 0)}
        rest.update({f'tent{i + 1}': (-6, 0, 0) for i in range(6)})
        rest.update({f'tip{i + 1}': (-8, 0, 0) for i in range(6)})
        rest['fang1'] = rest['fang2'] = (-4, 0, 0)
        rest['fang1Tip'] = rest['fang2Tip'] = (-6, 0, 0)

        def r(**kw):
            return {**rest, **kw}

        rig.clip('Reposo', [
            (1, rest),
            (16, r(hips=(-2, 0, 0), jaw=(7, 0, 0), **{f'tent{i + 1}': (-6 - 3 * ((i % 3) - 1), 0, 0)
                                                       for i in range(6)}), (0, 0, 0.010)),
            (31, r(hips=(1.5, 0, 0), tent3=(-10, 0, 3), tent5=(-10, 0, -3), fang1Tip=(-10, 0, 2),
                   fang2Tip=(-10, 0, -2)), (0, 0, -0.006)),
            (46, r(hips=(-2, 0, 0), jaw=(7, 0, 0), **{f'tent{i + 1}': (-6 + 3 * ((i % 3) - 1), 0, 0)
                                                       for i in range(6)}), (0, 0, 0.010)),
            (61, rest),
        ])

        def gait(t):
            s = math.sin(2 * math.pi * t)
            pose = {'hips': (2 * s, 3 * s, 0), 'head': (-2 * s, -3 * s, 0), 'jaw': (6, 0, 0)}
            for i in range(6):
                f = -4 * math.sin(2 * math.pi * (t + i / 6))
                pose[f'tent{i + 1}'] = (-6 + 12 * f / 4, 0, 8 * f / 4)
                pose[f'tip{i + 1}'] = (-8 - 10 * f / 4, 0, -10 * f / 4)
            pose['fang1'] = (-4 - 8 * s, 0, 4 * s)
            pose['fang1Tip'] = (-6 - 12 * s, 0, 6 * s)
            pose['fang2'] = (-4 + 8 * s, 0, -4 * s)
            pose['fang2Tip'] = (-6 + 12 * s, 0, -6 * s)
            return pose, (0, 0, 0.014 * abs(s))

        rig.clip('Caminar', [(1 + i * 3, *gait(i / 8)) for i in range(9)])
        # latigazo: se encoge de brazos y clava las dos mazas por delante
        rig.clip('Atacar', [
            (1, rest),
            (5, r(hips=(-8, 0, 0), head=(10, 0, 0), **{f'tent{i + 1}': (14, 0, 0) for i in range(6)},
                  fang1=(18, 0, 6), fang1Tip=(20, 0, 6), fang2=(18, 0, -6), fang2Tip=(20, 0, -6)),
             (0, 0.04, 0.03)),
            (8, {'hips': (6, 0, 0), 'head': (-14, 0, 0), 'jaw': (26, 0, 0),
                 **{f'tent{i + 1}': (-16, 0, 0) for i in range(6)},
                 'fang1': (-30, 0, 12), 'fang1Tip': (-26, 0, 10),
                 'fang2': (-30, 0, -12), 'fang2Tip': (-26, 0, -10)}, (0, -0.10, -0.02)),
            (11, r(jaw=(8, 0, 0), fang1=(-10, 0, 6), fang2=(-10, 0, -6)), (0, -0.03, 0)),
            (22, rest),
        ])
        rig.clip('Golpeado', [
            (1, rest),
            (4, r(hips=(12, 0, 4), head=(-14, 0, -4), jaw=(20, 0, 0),
                  **{f'tent{i + 1}': (16, 0, 0) for i in range(6)},
                  fang1=(22, 0, 8), fang2=(22, 0, -8)), (0, 0.05, 0.02)),
            (13, rest),
        ])
        rig.clip('Morir', [
            (1, rest),
            (6, r(hips=(-6, 0, 0), head=(6, 0, 0), jaw=(20, 0, 0),
                  **{f'tent{i + 1}': (10, 0, 0) for i in range(6)}), (0, 0.03, -0.05)),
            (16, {'hips': (26, 0, 8), 'head': (34, 0, -8), 'jaw': (26, 0, 0),
                  'eyeL': (10, 0, 0), 'eyeR': (10, 0, 0),
                  **{f'tent{i + 1}': (22, 0, (i % 2) * 10 - 5) for i in range(6)},
                  **{f'tip{i + 1}': (26, 0, 0) for i in range(6)},
                  'fang1': (30, 0, 14), 'fang1Tip': (30, 0, 10),
                  'fang2': (30, 0, -14), 'fang2Tip': (30, 0, -10)}, (0, 0.03, -0.42)),
            (28, {'hips': (30, 0, 10), 'head': (40, 0, -10), 'jaw': (30, 0, 0),
                  'eyeL': (14, 0, 0), 'eyeR': (14, 0, 0),
                  **{f'tent{i + 1}': (26, 0, (i % 2) * 12 - 6) for i in range(6)},
                  **{f'tip{i + 1}': (30, 0, 0) for i in range(6)},
                  'fang1': (36, 0, 18), 'fang1Tip': (34, 0, 12),
                  'fang2': (36, 0, -18), 'fang2Tip': (34, 0, -12)}, (0, 0.03, -0.58)),
        ])


def generar2(escena, nombre, bones, mesh_fn, archivo, tiburon=True):
    m = mats(not tiburon)
    rig = fg_rig.Rig(escena, f'FG_{nombre}', bones)
    b = fg.Builder('Cuerpo')
    mesh_fn(b, m)
    cuerpo = rig.part(b)
    perlas2_clips(rig, tiburon)
    rig.export(archivo)
    tris = sum(len(p.vertices) - 2 for p in cuerpo.data.polygons)
    print(f'{archivo}: {tris} triangulos')
    assert tris <= 1500, f'{archivo} fuera de presupuesto: {tris} triangulos'
    for act in rig.actions:  # prefijo para que convivan en el .blend sin colision
        act.name = f'{nombre}_{act.name}'
    return rig, cuerpo


def main():
    escena_base = fg.reset()
    rig1, cuerpo = generar2(escena_base, 'Tiburon', TIBURON_BONES, tiburon_mesh, 'tiburon.glb')
    cuerpo.name = 'Cuerpo_tiburon'
    rig2, cq = generar2(escena_base, 'Calamar', CALAMAR_BONES, calamar_mesh, 'calamar.glb',
                        tiburon=False)
    cq.name = 'Cuerpo_calamar'
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'fauna_perlas2.blend'), copy=True)
    print('fauna_perlas2.blend salvo las dos especies con clips prefijados')


if __name__ == '__main__':
    main()
