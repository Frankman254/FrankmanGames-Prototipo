# Fauna de la Cumbre del Baru (OMP-FA-05): jaguar (`baru_jaguar`) y su anciano
# (`baru_elder`). Dos esqueletos y dos GLB en un solo .blend, como fauna_cerropunta.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/fauna_baru.py
# Escribe assets/models/jaguar.glb y assets/models/jaguar_anciano.glb y salva
# arte/blender/fauna_baru.blend. NO se integra: nada toca data/ ni src/.
#
#   Jaguar: felido bajo y ancho de pecho, cabeza grande y redonda, melena corta,
#   rosetas oscuras (placas hemiesfericas sobre el manto), cola larga que ondea,
#   orejas redondas y biguaries. ~1,35 m de morro a cola, cruz ~0,72 m.
#   Anciano (elite, base alpha_wolf nivel 48): el mismo cuerpo un 22 % mayor y
#   mas pálido (la paleta de data/ lo clarea), con manto de canas en cruz y
#   pescuezo, colmillos largos que desbordan el hocico cerrado, cicatriz de
#   colmillo en el morro y un collar de presas (colmillos de sainos) colgando
#   del cuello: el viejo cazador de la cumbre.
#
# Referencias (no hay laminas REF-01 para esta familia, anota OMP 2026-11-21):
# fichas de campo del jaguar panameño (cabeza ancha, rosetas con punto central,
# complexidad baja y fuerte) y del pardo viejo de páramo para el anciano.
# Clean-room: silueta y proporcion desde cero, nada copiado de terceros.
#
# Convenciones de la casa: mira a -Y, +Z arriba, escala en metros, apoyo en z=0
# en el fotograma 1 (Reposo). Cinco clips (Reposo, Caminar, Atacar = salto de
# emboscada, Golpeado, Morir) sin salto. Materiales teñibles: skin (nariz y
# almohadillas), cloth (manto), trim (ventral y canas), hair (rosetas, orejas,
# biguaries), gear (colmillos, uñas, ojo). <=1500 tri. Acciones prefijadas en
# el .blend tras exportar cada GLB.
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


def mats(anciano=False):
    base = ((0.62, 0.44, 0.19), (0.30, 0.21, 0.10), (0.86, 0.76, 0.52)) if not anciano \
        else ((0.72, 0.60, 0.38), (0.42, 0.36, 0.25), (0.92, 0.88, 0.70))
    return dict(
        skin=fg.material('skin', (0.45, 0.32, 0.28)),                 # nariz, almohadillas
        cloth=fg.material('cloth', base[0]),                          # manto
        trim=fg.material('trim', base[2]),                            # ventral y canas
        hair=fg.material('hair', base[1]),                            # rosetas y pelo oscuro
        gear=fg.material('gear', (0.90, 0.86, 0.74), rough=0.42),     # colmillos y uñas
        ojo=fg.material('ojo_baru', (0.62, 0.52, 0.16), rough=0.3),
    )


def jaguar_bones(k):
    def e(t):
        return tuple(c * k for c in t)
    bones = [
        ('hips', None, e((0, 0.34, 0.60)), e((0, 0.10, 0.625))),
        ('chest', 'hips', e((0, 0.10, 0.625)), e((0, -0.20, 0.65))),
        ('neck', 'chest', e((0, -0.20, 0.65)), e((0, -0.31, 0.615))),
        ('head', 'neck', e((0, -0.31, 0.615)), e((0, -0.455, 0.565))),
        ('jaw', 'head', e((0, -0.395, 0.540)), e((0, -0.520, 0.505))),
        ('tail1', 'hips', e((0, 0.34, 0.635)), e((0, 0.56, 0.685))),
        ('tail2', 'tail1', e((0, 0.56, 0.685)), e((0, 0.75, 0.775))),
        ('tail3', 'tail2', e((0, 0.75, 0.775)), e((0, 0.90, 0.895))),
    ]
    for name, x, y, parent in (('FL', 0.105, -0.150, 'chest'), ('FR', -0.105, -0.150, 'chest'),
                               ('BL', 0.115, 0.275, 'hips'), ('BR', -0.115, 0.275, 'hips')):
        bones += [
            (f'leg{name}', parent, e((x, y, 0.40)), e((x * 1.04, y - 0.02, 0.21))),
            (f'shin{name}', f'leg{name}', e((x * 1.04, y - 0.02, 0.21)), e((x * 1.05, y - 0.03, 0.075))),
        ]
    return bones
# ============================================================
# Mallas
# ============================================================
def garra(b, m, hueso, x, y, z):
    for d in (-0.026, 0.0, 0.026):
        b.tube((x + d, y - 0.045, z), (x + d * 1.2, y - 0.085, z - 0.020),
               0.011, 0.004, m['gear'], hueso, sides=4)


def jaguar_mesh(b, m, anciano=False):
    k = 1.22 if anciano else 1.0   # el anciano es un 22 % mayor
    # tronco bajo y de pecho ancho: caja toracica fuerte, grupa esbelta
    b.tube((0, 0.34 * k, 0.605 * k), (0, 0.10 * k, 0.625 * k), 0.145 * k, 0.155 * k, m['cloth'], 'hips', sides=8, flat=0.78)
    b.tube((0, 0.10 * k, 0.625 * k), (0, -0.20 * k, 0.645 * k), 0.155 * k, 0.135 * k, m['cloth'], 'chest', sides=8, flat=0.78)
    b.blob((0, 0.24 * k, 0.60 * k), (0.140 * k, 0.15 * k, 0.115 * k), m['cloth'], 'hips', subdiv=1)
    # pechuga y vientre claros
    b.blob((0, -0.05 * k, 0.545 * k), (0.115 * k, 0.20 * k, 0.075 * k), m['trim'], 'chest', subdiv=1)
    # cuello grueso que baja a la cabeza grande
    b.tube((0, -0.20 * k, 0.640 * k), (0, -0.31 * k, 0.605 * k), 0.110 * k, 0.095 * k, m['cloth'], 'neck', sides=7, flat=0.85)
    # craneo redondo y ancho, frente plana, morro corto
    b.blob((0, -0.375 * k, 0.600 * k), (0.098 * k, 0.088 * k, 0.082 * k), m['cloth'], 'head', subdiv=2)
    b.tube((0, -0.435 * k, 0.565 * k), (0, -0.505 * k, 0.545 * k), 0.055 * k, 0.042 * k, m['cloth'], 'head', sides=6, flat=0.85)
    b.blob((0, -0.512 * k, 0.556 * k), (0.030 * k, 0.020 * k, 0.024 * k), m['skin'], 'head', subdiv=1)  # nariz
    # mandibula y barbilla
    b.tube((0, -0.430 * k, 0.528 * k), (0, -0.502 * k, 0.520 * k), 0.042 * k, 0.024 * k, m['cloth'], 'jaw', sides=6, flat=0.85)
    # colmillos: en el anciano desbordan el hocico cerrado; la base nace dentro
    # de la mandibula y suben pegados al lateral de la nariz
    lg = 0.070 if anciano else 0.042
    for x in (-1, 1):
        b.poly([(x * 0.030 * k - 0.008, -0.448 * k, 0.518 * k), (x * 0.030 * k + 0.008, -0.448 * k, 0.518 * k), (x * 0.030 * k, -0.452 * k, 0.516 * k)],
               [(x * 0.042 * k - 0.005, -0.478 * k, 0.540 * k + lg * 0.35 * k), (x * 0.042 * k + 0.005, -0.478 * k, 0.540 * k + lg * 0.35 * k), (x * 0.045 * k, -0.484 * k, 0.536 * k + lg * k)],
               m['gear'], 'jaw')
        # oreja redonda y ojos rasgados, hundidos en el craneo
        b.blob((x * 0.080 * k, -0.350 * k, 0.662 * k), (0.030 * k, 0.026 * k, 0.024 * k), m['hair'], 'head', subdiv=1)
        b.blob((x * 0.050 * k, -0.432 * k, 0.606 * k), (0.017 * k, 0.013 * k, 0.013 * k), m['ojo'], 'head', subdiv=1)
        # biguaries: cerdanas rigidas que nacen del bigual, no flotan
        for d in (0.0, 0.018 * k):
            b.tube((x * 0.046 * k, -0.484 * k - d, 0.546 * k), (x * 0.092 * k, -0.506 * k - d, 0.528 * k - d * 0.8),
                   0.0035, 0.0012, m['trim'], 'head', sides=4)
    # rosetas: placas oscuras hemiesfericas en dos filas alternas por el flanco
    for (sx, y, z) in ((1, 0.30, 0.685), (1, 0.16, 0.735), (1, 0.02, 0.700), (1, -0.12, 0.730),
                       (-1, 0.23, 0.730), (-1, 0.09, 0.695), (-1, -0.05, 0.735), (-1, -0.16, 0.690),
                       (0, 0.22, 0.745), (0, -0.02, 0.760)):
        r = (0.034 if anciano else 0.026) * k
        b.blob((sx * 0.125 * k, y * k, z * k), (r, r * 1.2, r * 0.55), m['hair'],
               'hips' if y > 0.12 else 'chest', subdiv=1)
    # canas del anciano: cruz en los omoplatos y pescuezo blanco, hundidas en
    # el manto (solo asoma el casco claro), y cicatriz pegada al morro
    if anciano:
        b.blob((0, -0.02 * k, 0.735 * k), (0.10 * k, 0.16 * k, 0.055 * k), m['trim'], 'chest', subdiv=1)
        b.blob((0, -0.27 * k, 0.630 * k), (0.085 * k, 0.09 * k, 0.055 * k), m['trim'], 'neck', subdiv=1)
        b.tube((0.012 * k, -0.450 * k, 0.600 * k), (0.042 * k, -0.498 * k, 0.556 * k), 0.009 * k, 0.005 * k, m['skin'], 'head', sides=4)
        # collar de presas: colmillos usados colgando del cuello
        for ang in (-0.55, -0.20, 0.20, 0.55):
            cx = math.sin(ang) * 0.105 * k
            cy = (-0.245 + math.cos(ang) * 0.045) * k
            b.tube((cx, cy, 0.560 * k), (cx * 1.12, cy - 0.012 * k, 0.492 * k), 0.014 * k, 0.005 * k, m['gear'], 'neck', sides=5)
    # cola larga y gruesa que ondea, punta clara
    b.tube((0, 0.34 * k, 0.635 * k), (0, 0.56 * k, 0.685 * k), 0.045 * k, 0.034 * k, m['cloth'], 'tail1', sides=6)
    b.tube((0, 0.56 * k, 0.685 * k), (0, 0.75 * k, 0.775 * k), 0.034 * k, 0.024 * k, m['cloth'], 'tail2', sides=6)
    b.tube((0, 0.75 * k, 0.775 * k), (0, 0.90 * k, 0.895 * k), 0.024 * k, 0.012 * k, m['trim'], 'tail3', sides=6)
    # patas cortas y recias con almohadilla ancha (sigiloso)
    for nombre, x, y in (('FL', 0.105, -0.150), ('FR', -0.105, -0.150), ('BL', 0.115, 0.275), ('BR', -0.115, 0.275)):
        b.tube((x * k, y * k, 0.40 * k), (x * 1.04 * k, (y - 0.02) * k, 0.21 * k), 0.062 * k, 0.048 * k, m['cloth'], f'leg{nombre}', sides=6)
        b.tube((x * 1.04 * k, (y - 0.02) * k, 0.21 * k), (x * 1.05 * k, (y - 0.03) * k, 0.075 * k), 0.048 * k, 0.038 * k, m['cloth'], f'shin{nombre}', sides=6)
        b.blob((x * 1.06 * k, (y - 0.055) * k, 0.030 * k), (0.052 * k, 0.075 * k, 0.030 * k), m['skin'], f'shin{nombre}', subdiv=1)
        garra(b, m, f'shin{nombre}', x * 1.07 * k, (y - 0.06) * k, 0.030 * k)


# ============================================================
# Clips (comunes: ambos esqueletos comparten nombres de hueso; el anciano
# usa la misma pose con amplitudes 0.85 por peso)
# ============================================================
def baru_clips(rig, k_amp):
    rest = {'jaw': (2 * k_amp, 0, 0), 'tail1': (4 * k_amp, 0, 0), 'tail2': (5 * k_amp, 0, 0)}

    def gait(t):
        pose = {}
        for leg, phase in (('FL', 0.0), ('FR', 0.15), ('BL', 0.5), ('BR', 0.65)):
            s = math.sin(2 * math.pi * (t + phase))
            c = math.cos(2 * math.pi * (t + phase))
            pose[f'leg{leg}'] = (-18 * k_amp * s, 0, 0)
            pose[f'shin{leg}'] = (14 * k_amp * c - 7 * k_amp, 0, 0)
        sway = math.sin(2 * math.pi * t)
        pose['chest'] = (2 * k_amp * sway, 4.5 * k_amp * sway, 0)
        pose['hips'] = (-2 * k_amp * sway, -4.5 * k_amp * sway, 0)
        pose['neck'] = (-3 * k_amp, 3 * k_amp * sway, 0)   # cabeza fija mientras el cuerpo serpentea
        pose['head'] = (2 * k_amp, -2 * k_amp * sway, 0)
        pose['tail1'] = (4 * k_amp, 18 * k_amp * sway, 0)
        pose['tail2'] = (5 * k_amp, 24 * k_amp * sway, 0)
        pose['tail3'] = (0, 28 * k_amp * sway, 0)
        pose.update({kk: vv for kk, vv in rest.items() if kk not in pose})
        return pose, (0, 0, 0.012 * k_amp * abs(sway))

    def r(**kw):
        return {**rest, **kw}

    rig.clip('Reposo', [
        (1, rest),
        (18, r(chest=(-1.5 * k_amp, 0, 0), neck=(2 * k_amp, 0, 0), tail2=(5, 10 * k_amp, 0)), (0, 0, -0.005)),
        (34, r(jaw=(8 * k_amp, 0, 0), head=(-2 * k_amp, 0, 0)), (0, 0, -0.007)),
        (50, r(chest=(-1.5 * k_amp, 0, 0), neck=(2 * k_amp, 0, 0), tail2=(5, -10 * k_amp, 0)), (0, 0, -0.005)),
        (68, rest),
    ])
    rig.clip('Caminar', [(1 + i * 3, *gait(i / 8)) for i in range(9)])
    # emboscada: agacha y acumula, salta con las delanteras extendidas, aterriza mordiendo
    rig.clip('Atacar', [
        (1, rest),
        (5, r(chest=(10 * k_amp, 0, 0), neck=(16 * k_amp, 0, 0), head=(14 * k_amp, 0, 0), jaw=(18 * k_amp, 0, 0),
              legFL=(18 * k_amp, 0, 0), legFR=(18 * k_amp, 0, 0), legBL=(22 * k_amp, 0, 0), legBR=(22 * k_amp, 0, 0),
              shinFL=(-16 * k_amp, 0, 0), shinFR=(-16 * k_amp, 0, 0)), (0, 0.10, -0.06)),
        (9, {'chest': (-16 * k_amp, 0, 0), 'neck': (-12 * k_amp, 0, 0), 'head': (-8 * k_amp, 0, 0),
             'jaw': (30 * k_amp, 0, 0),
             'legFL': (-46 * k_amp, 0, 0), 'legFR': (-46 * k_amp, 0, 0), 'shinFL': (30 * k_amp, 0, 0), 'shinFR': (30 * k_amp, 0, 0),
             'legBL': (30 * k_amp, 0, 0), 'legBR': (30 * k_amp, 0, 0), 'shinBL': (-26 * k_amp, 0, 0), 'shinBR': (-26 * k_amp, 0, 0),
             'hips': (-8 * k_amp, 0, 0), 'tail1': (-14 * k_amp, 0, 0), 'tail2': (-16 * k_amp, 0, 0)}, (0, -0.16, 0.10)),
        (13, {'chest': (6 * k_amp, 0, 0), 'neck': (10 * k_amp, 0, 0), 'head': (6 * k_amp, 0, 0), 'jaw': (10 * k_amp, 0, 0),
              'legFL': (6 * k_amp, 0, 0), 'legFR': (6 * k_amp, 0, 0),
              'legBL': (-10 * k_amp, 0, 0), 'legBR': (-10 * k_amp, 0, 0)}, (0, -0.06, -0.02)),
        (22, rest),
    ])
    rig.clip('Golpeado', [
        (1, rest),
        (4, r(chest=(10 * k_amp, 0, 7 * k_amp), neck=(14 * k_amp, 0, 0), head=(16 * k_amp, 0, 0), jaw=(22 * k_amp, 0, 0),
              tail1=(14 * k_amp, 0, 0), tail2=(12 * k_amp, 0, 0)), (0, 0.08, -0.03)),
        (13, rest),
    ])
    rig.clip('Morir', [
        (1, rest),
        (5, r(jaw=(24 * k_amp, 0, 0), neck=(12 * k_amp, 0, 0), head=(16 * k_amp, 0, 0)), (0, 0.04, -0.04)),
        (14, {'hips': (0, 0, 14 * k_amp), 'chest': (12 * k_amp, 8 * k_amp, 0), 'neck': (18 * k_amp, 8 * k_amp, 0),
              'head': (22 * k_amp, 0, 0), 'jaw': (30 * k_amp, 0, 0),
              'legFL': (-20 * k_amp, 0, 18 * k_amp), 'legFR': (-20 * k_amp, 0, -18 * k_amp),
              'legBL': (16 * k_amp, 0, 14 * k_amp), 'legBR': (16 * k_amp, 0, -14 * k_amp),
              'tail1': (12 * k_amp, 12 * k_amp, 0), 'tail2': (10 * k_amp, 14 * k_amp, 0)}, (0, 0.04, -0.14)),
        (24, {'hips': (0, 0, 18 * k_amp), 'chest': (14 * k_amp, 12 * k_amp, 0), 'neck': (22 * k_amp, 12 * k_amp, 0),
              'head': (26 * k_amp, 6 * k_amp, 0), 'jaw': (34 * k_amp, 0, 0),
              'legFL': (-26 * k_amp, 0, 26 * k_amp), 'legFR': (-26 * k_amp, 0, -26 * k_amp),
              'legBL': (20 * k_amp, 0, 20 * k_amp), 'legBR': (20 * k_amp, 0, -20 * k_amp),
              'tail1': (14 * k_amp, 18 * k_amp, 0), 'tail2': (12 * k_amp, 20 * k_amp, 0),
              'tail3': (10 * k_amp, 22 * k_amp, 0)}, (0, 0.04, -0.24)),
    ])


# ============================================================
# Generacion
# ============================================================
def generar2(escena, nombre, k, mesh_fn, archivo, anciano=False):
    m = mats(anciano)
    rig = fg_rig.Rig(escena, f'FG_{nombre}', jaguar_bones(k))
    b = fg.Builder('Cuerpo')
    mesh_fn(b, m, anciano)
    cuerpo = rig.part(b)
    baru_clips(rig, 0.85 if anciano else 1.0)
    rig.export(archivo)
    tris = sum(len(p.vertices) - 2 for p in cuerpo.data.polygons)
    print(f'{archivo}: {tris} triangulos')
    assert tris <= 1500, f'{archivo} fuera de presupuesto: {tris} triangulos'
    for act in rig.actions:  # prefijo para que convivan en el .blend sin colision
        act.name = f'{nombre}_{act.name}'
    return rig, cuerpo


def main():
    escena_base = fg.reset()
    rig1, cuerpo = generar2(escena_base, 'Jaguar', 1.0, jaguar_mesh, 'jaguar.glb')
    cuerpo.name = 'Cuerpo_jaguar'
    rig2, viejo = generar2(escena_base, 'JaguarAnciano', 1.22, jaguar_mesh, 'jaguar_anciano.glb', anciano=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'fauna_baru.blend'), copy=True)
    print('fauna_baru.blend salvo los dos jaguares con clips prefijados')


if __name__ == '__main__':
    main()
