# Fauna del Archipielago de las Perlas (OMP-FA-08): ostra (`perlas_oyster`) y
# perla rodante (`perlas_pearl`).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/fauna_perlas.py
# Escribe assets/models/ostra.glb y assets/models/perla.glb y salva
# arte/blender/fauna_perlas.blend. NO se integra: nada toca data/ ni src/.
#
#   Ostra Mordelona (creador/Junie NOMBRE_MODELO.md 2026-11-21: hoy es un lobo
#   tenido y es una ostra). Bivalvo gigante del manglar: dos valvas en abanico
#   rugoso que se baten como una quijada, cuerpo blando y lengua dentro, dos
#   ojos en pedunculo asomando al abrirse, y barba de byso arrastrando. La ostra
#   grande escupe perlas (perlas_pearl es su cria invocada).
#   Perla Rodante: esferas vivas de nacar del tamano de un barril pequeno, con
#   dos ojos grandes y un cordel con nudo encima; rueda de golpe y rebota.
#
# Referencias (no hay lamina REF-01 para esta familia, anota OMP 2026-11-21):
# silueta observada de memoria de campo de la ostra de manglar (valva inferior
# profunda y rugosa, superior plana en abanico, borde festoneado) y de la perla
# de nacar esférica irisada. Clean-room: nombres y proporciones propios.
#
# Convenciones de la casa: mira a -Y, +Z arriba, escala en metros, apoyo en z=0
# en el fotograma 1 (Reposo). Cinco clips (Reposo, Caminar, Atacar, Golpeado,
# Morir) con bucles sin salto. Materiales por region tenible: skin, cloth, trim,
# hair, gear. <=1500 tri por bicho.
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


def mats(perla=False):
    # cloth = concha/nacar principal; trim = interior irisado; skin = cuerpo blando
    base = ((0.88, 0.85, 0.80), (0.72, 0.80, 0.88), (0.62, 0.52, 0.44)) if perla \
        else ((0.42, 0.36, 0.30), (0.82, 0.76, 0.68), (0.62, 0.52, 0.44))
    return dict(
        skin=fg.material('skin', (0.75, 0.42, 0.40) if perla else (0.68, 0.38, 0.36)),
        cloth=fg.material('cloth', base[0]),
        trim=fg.material('trim', base[1]),
        hair=fg.material('hair', base[2]),
        gear=fg.material('gear', (0.55, 0.52, 0.50), metallic=0.35, rough=0.4),  # dientes y gozne
        ojo=fg.material('ojo_perlas', (0.05, 0.04, 0.04), rough=0.3),
    )


OSTRA_BONES = [
    ('hips', None, (0, 0.20, 0.16), (0, 0.02, 0.16)),        # valva inferior
    ('lid', 'hips', (0, 0.20, 0.30), (0, -0.10, 0.34)),      # valva superior (gozne atras)
    ('body', 'hips', (0, 0.06, 0.22), (0, -0.06, 0.23)),     # cuerpo blando
    ('eyeL', 'body', (0.09, -0.16, 0.22), (0.12, -0.27, 0.34)),
    ('eyeR', 'body', (-0.09, -0.16, 0.22), (-0.12, -0.27, 0.34)),
    ('byssus', 'hips', (0, 0.22, 0.10), (0, 0.32, 0.03)),    # barba de byso
]

PERLA_BONES = [
    ('hips', None, (0, 0, 0.30), (0, -0.22, 0.30)),          # la esfera rueda con hips
    ('eyeL', 'hips', (0.085, -0.26, 0.38), (0.10, -0.32, 0.42)),
    ('eyeR', 'hips', (-0.085, -0.26, 0.38), (-0.10, -0.32, 0.42)),
    ('cordel', 'hips', (0, 0.02, 0.60), (0, 0.06, 0.70)),    # nudo del cordel encima
]


def valva(b, m, hueso, z0, alto, fondo):
    # valva en abanico: tres lomos aplastados, el central el mas largo
    for x, r, y in ((0.0, 0.30, -0.05), (0.24, 0.20, 0.02), (-0.24, 0.20, 0.02)):
        b.blob((x, y, z0 + alto * 0.35), (r * 1.05, r * 1.25, alto), m['cloth'], hueso, subdiv=1)
    # borde festoneado: crestas radiales como aletas finas
    for k in (-3, -2, -1, 0, 1, 2, 3):
        a = math.radians(k * 22)
        ex, ey = 0.40 * math.sin(a), 0.30 * math.cos(a) - 0.10
        b.poly([(ex * 0.55 - 0.03 * math.cos(a), ey * 0.55, z0 + alto * 0.8),
                (ex * 0.55 + 0.03 * math.cos(a), ey * 0.55, z0 + alto * 0.8),
                (ex * 0.55, ey * 0.55, z0 + alto * 0.9)],
               [(ex - 0.025 * math.cos(a), ey - 0.02 * math.sin(a), z0 + fondo),
                (ex + 0.025 * math.cos(a), ey + 0.02 * math.sin(a), z0 + fondo),
                (ex, ey, z0 + fondo)],
               m['cloth'], hueso)


def ostra_mesh(b, m):
    # valva inferior profunda (va a hips) y superior plana (va a lid)
    valva(b, m, 'hips', 0.0, 0.14, 0.07)                     # cuenco de abajo
    b.blob((0, 0.06, 0.115), (0.36, 0.34, 0.045), m['trim'], 'hips', subdiv=1)  # lecho nacarado
    valva(b, m, 'lid', 0.235, 0.085, 0.05)                   # tapa en abanico
    b.blob((0, 0.04, 0.245), (0.33, 0.32, 0.030), m['trim'], 'lid', subdiv=1)   # interior de la tapa
    # gozne atras
    b.tube((0.16, 0.245, 0.20), (-0.16, 0.245, 0.20), 0.045, 0.045, m['gear'], 'hips', sides=6)
    # dientecitos del borde delantero (por eso mordelona)
    for i, x in enumerate((-0.20, -0.13, -0.065, 0.0, 0.065, 0.13, 0.20)):
        y = -0.32 + 0.05 * abs(i - 3)
        b.tube((x, y + 0.01, 0.240), (x, y - 0.02, 0.185), 0.020, 0.005, m['gear'], 'lid', sides=4)
        b.tube((x, y + 0.01, 0.145), (x, y - 0.02, 0.200), 0.020, 0.005, m['gear'], 'hips', sides=4)
    # cuerpo blando y lengua dentro
    b.blob((0, 0.0, 0.165), (0.16, 0.20, 0.055), m['skin'], 'body', subdiv=1)
    b.tube((0, -0.02, 0.175), (0, -0.20, 0.185), 0.075, 0.055, m['skin'], 'body', sides=6, flat=0.75)
    # manto festoneado (fleco de la concha)
    for k in range(-4, 5):
        a = math.radians(k * 20)
        ex, ey = 0.30 * math.sin(a), 0.14 * math.cos(a) - 0.14
        b.card([(ex * 0.8, ey, 0.175), (ex, ey - 0.02, 0.165),
                (ex * 0.94, ey - 0.05, 0.150), (ex * 0.78, ey - 0.025, 0.158)], m['hair'], 'body')
    # dos ojos en pedunculo, asomando por el borde delantero entre los dientes
    for x in (-1, 1):
        ojo = 'eyeL' if x == 1 else 'eyeR'
        b.tube((x * 0.085, -0.145, 0.210), (x * 0.112, -0.255, 0.320), 0.020, 0.016, m['skin'],
               ojo, sides=5)
        b.blob((x * 0.116, -0.268, 0.335), (0.028, 0.028, 0.028), m['trim'], ojo, subdiv=1)
        b.blob((x * 0.122, -0.290, 0.338), (0.014, 0.011, 0.014), m['ojo'], ojo, subdiv=1)
    # barba de byso: mechon de hilos atras
    for dx in (-0.05, 0.0, 0.05):
        b.tube((dx, 0.24, 0.09), (dx * 1.6, 0.34, 0.02), 0.016, 0.006, m['hair'], 'byssus', sides=4)
    # el fondo del cuenco clava 0,091 m bajo cero: todo el cuerpo sube hasta apoyar
    import bmesh
    bmesh.ops.translate(b.bm, verts=b.bm.verts, vec=(0, 0, 0.091))


def perla_mesh(b, m):
    # esfera de nacar: cuerpo con la franja irisada del terminador ecuatoriano
    b.blob((0, 0, 0.30), (0.305, 0.305, 0.300), m['cloth'], 'hips', subdiv=2)
    b.blob((0, 0, 0.30), (0.300, 0.300, 0.055), m['trim'], 'hips', subdiv=1)
    # dos ojos grandes de caricatura
    for x in (-1, 1):
        b.blob((x * 0.105, -0.255, 0.40), (0.075, 0.055, 0.085), m['trim'],
               'eyeL' if x == 1 else 'eyeR', subdiv=1)
        b.blob((x * 0.105, -0.298, 0.395), (0.036, 0.026, 0.042), m['ojo'],
               'eyeL' if x == 1 else 'eyeR', subdiv=1)
        b.blob((x * 0.118, -0.310, 0.420), (0.012, 0.008, 0.014), m['cloth'],
               'eyeL' if x == 1 else 'eyeR', subdiv=1)                       # brillo
        # ceja de cordel
        b.tube((x * 0.03, -0.285, 0.495), (x * 0.18, -0.270, 0.475), 0.013, 0.010, m['hair'],
               'eyeL' if x == 1 else 'eyeR', sides=4)
    # bocita
    b.tube((0.05, -0.298, 0.245), (-0.05, -0.298, 0.245), 0.020, 0.020, m['skin'], 'hips', sides=4)
    # nudo del cordel encima
    b.tube((0, 0.02, 0.595), (0, 0.05, 0.66), 0.014, 0.010, m['hair'], 'cordel', sides=4)
    b.blob((0, 0.055, 0.675), (0.035, 0.035, 0.032), m['hair'], 'cordel', subdiv=1)
    b.blob((0, 0.055, 0.62), (0.020, 0.020, 0.018), m['gear'], 'cordel', subdiv=1)


def perlas_clips(rig, ostra):
    if ostra:
        rest = {'lid': (-4, 0, 0), 'byssus': (8, 0, 0)}

        def r(**kw):
            return {**rest, **kw}

        rig.clip('Reposo', [
            (1, rest),
            (16, r(lid=(-9, 0, 0), body=(-2, 0, 0)), (0, 0, 0.008)),
            (31, r(lid=(-2, 0, 0), body=(2, 0, 0), eyeL=(-4, 0, 0), eyeR=(-4, 0, 0)), (0, 0, -0.004)),
            (46, r(lid=(-9, 0, 0), body=(-2, 0, 0)), (0, 0, 0.008)),
            (61, rest),
        ])

        def gait(t):
            s = math.sin(2 * math.pi * t)
            c = abs(math.sin(2 * math.pi * t))
            return ({'lid': (-4 - 16 * c, 3 * s, 0), 'byssus': (8 - 10 * c, 6 * s, 0),
                     'body': (-4 * c, 0, 0), 'eyeL': (-10 * c, 0, 4 * s), 'eyeR': (-10 * c, 0, -4 * s)},
                    (0, 0, 0.05 * c))

        rig.clip('Caminar', [(1 + i * 3, *gait(i / 8)) for i in range(9)])
        # ataque: abre en abanico y se cierra de golpe (batazo de concha)
        rig.clip('Atacar', [
            (1, rest),
            (5, r(lid=(-46, 0, 0), body=(8, 0, 0), eyeL=(-18, 0, 0), eyeR=(-18, 0, 0)), (0, 0.03, 0.03)),
            (8, r(lid=(-58, 0, 0), body=(12, 0, 0), byssus=(-6, 0, 0)), (0, 0.06, 0.06)),
            (11, {'lid': (3, 0, 0), 'byssus': (18, 0, 0), 'body': (-14, 0, 0)}, (0, -0.05, -0.01)),
            (14, r(lid=(-14, 0, 0)), (0, 0.01, 0.01)),
            (22, rest),
        ])
        rig.clip('Golpeado', [
            (1, rest),
            (4, r(lid=(6, 0, 3), body=(-10, 0, 0), byssus=(16, 0, -6), eyeL=(14, 0, 0),
                  eyeR=(14, 0, 0)), (0, 0.04, -0.02)),
            (8, r(lid=(-12, 0, -2)), (0, 0, 0.01)),
            (13, rest),
        ])
        rig.clip('Morir', [
            (1, rest),
            (5, r(lid=(-30, 0, 6), body=(10, 0, 0), eyeL=(20, 0, 6), eyeR=(20, 0, -6)), (0, 0.02, 0.02)),
            (16, {'hips': (0, 0, 14), 'lid': (-12, 0, 0), 'byssus': (20, 10, 0),
                  'body': (-16, 0, 0), 'eyeL': (30, 0, 10), 'eyeR': (30, 0, -10)},
             (0, 0.03, -0.05)),
            (30, {'hips': (0, 0, 22), 'lid': (-6, 0, 0), 'byssus': (24, 14, 0),
                  'body': (-22, 0, 0), 'eyeL': (38, 0, 14), 'eyeR': (38, 0, -14)},
             (0, 0.03, -0.075)),
        ])
    else:
        rest = {}

        def r(**kw):
            return {**rest, **kw}

        rig.clip('Reposo', [
            (1, rest),
            (16, r(cordel=(8, 0, 0)), (0, 0, 0.020)),
            (31, r(cordel=(-6, 4, 0)), (0, 0, -0.012)),
            (46, r(cordel=(8, 0, 6)), (0, 0, 0.020)),
            (61, rest),
        ])

        def gait(t):
            # rueda: hips da una vuelta completa y avanza un perimetro; los ojos
            # contra-giran para mirar siempre al frente
            a = 360.0 * t
            # rueda en el sitio, como los demas: el juego adelanta la entidad
            return ({'hips': (a, 0, 0), 'eyeL': (-a, 6 * math.sin(2 * math.pi * t), 0),
                     'eyeR': (-a, 6 * math.sin(2 * math.pi * t), 0),
                     'cordel': (10 * math.sin(2 * math.pi * t), 0, 0)},
                    (0, 0, 0.012 * abs(math.sin(2 * math.pi * 2 * t))))

        rig.clip('Caminar', [(1 + i * 3, *gait(i / 8)) for i in range(9)])
        # ataque: retrocede girando y se lanza de frente dando dos vueltas
        rig.clip('Atacar', [
            (1, rest),
            (6, r(hips=(-70, 0, 0)), (0, 0.10, 0.02)),
            (10, r(hips=(200, 0, 0), eyeL=(-200, 0, 0), eyeR=(-200, 0, 0)), (0, -0.28, 0.05)),
            (16, r(hips=(720, 0, 0), eyeL=(-720, 0, 0), eyeR=(-720, 0, 0)), (0, -0.62, 0.0)),
            (20, r(hips=(740, 0, 0), eyeL=(-740, 0, 0), eyeR=(-740, 0, 0)), (0, -0.55, 0.02)),
            (26, rest),
        ])
        rig.clip('Golpeado', [
            (1, rest),
            (4, r(hips=(-40, 0, 6)), (0, 0.08, 0.03)),
            (8, r(hips=(20, 0, -4)), (0, -0.02, 0.0)),
            (13, rest),
        ])
        rig.clip('Morir', [
            (1, rest),
            (6, r(hips=(160, 0, 10)), (0, -0.12, 0.04)),
            (16, r(hips=(320, 0, 26), eyeL=(-320, 0, 0), eyeR=(-320, 0, 0), cordel=(40, 20, 0)),
             (0, -0.24, -0.02)),
            (28, r(hips=(330, 0, 34), eyeL=(-330, 0, 0), eyeR=(-330, 0, 0), cordel=(52, 26, 0)),
             (0, -0.25, -0.02)),
        ])


def generar2(escena, nombre, bones, mesh_fn, archivo, ostra=True):
    m = mats(not ostra)
    rig = fg_rig.Rig(escena, f'FG_{nombre}', bones)
    b = fg.Builder('Cuerpo')
    mesh_fn(b, m)
    cuerpo = rig.part(b)
    perlas_clips(rig, ostra)
    rig.export(archivo)
    tris = sum(len(p.vertices) - 2 for p in cuerpo.data.polygons)
    print(f'{archivo}: {tris} triangulos')
    assert tris <= 1500, f'{archivo} fuera de presupuesto: {tris} triangulos'
    for act in rig.actions:  # prefijo para que convivan en el .blend sin colision
        act.name = f'{nombre}_{act.name}'
    return rig, cuerpo


def main():
    escena_base = fg.reset()
    rig1, cuerpo = generar2(escena_base, 'Ostra', OSTRA_BONES, ostra_mesh, 'ostra.glb')
    cuerpo.name = 'Cuerpo_ostra'
    rig2, pl = generar2(escena_base, 'Perla', PERLA_BONES, perla_mesh, 'perla.glb', ostra=False)
    pl.name = 'Cuerpo_perla'
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'fauna_perlas.blend'), copy=True)
    print('fauna_perlas.blend salvo las dos especies con clips prefijados')


if __name__ == '__main__':
    main()
