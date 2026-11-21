# Fauna de Cerro Punta (OMP-FA-04): saíno (`cerropunta_peccary`) y jabalí
# (`cerropunta_boar`). Dos esqueletos y dos GLB en un solo .blend, como fauna_chame.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/fauna_cerropunta.py
# Escribe assets/models/pecari.glb y assets/models/jabali.glb y salva
# arte/blender/fauna_cerropunta.blend. NO se integra: nada toca data/ ni src/.
#
#   Saino (pecari listado): suido bajo y esbelto, manto gris de pua rigida con
#   linea clara en el costado, collar de cerdanas oscuras en el cuello, cabeza
#   con discoidal en el hocico y colmillo corto asomando. ~0,90 m de morro a cola,
#   cruz ~0,55 m.
#   Jabali (elite, base alpha_wolf nivel 38): macizo, cruz ~0,70 m y ~1,30 m de
#   largo, capa de cerdanas erizadas con lamparona en el hombro, cabeza enorme
#   con dos colmillos largos curvados hacia arriba, papada y orejas tiesas.
#
# Referencias (no hay laminas REF-01 para esta familia, anota OMP 2026-11-21):
# fichas de campo del pecari listado (collar blanco, hocico discoidal, colmillo
# corto) y del jabali europeo (mamelones de grasa en el costado, colmillos de
# hoz, lamparona en la cruz). Clean-room: silueta y proporcion observadas de
# memoria de campo, nada copiado de terceros.
#
# Convenciones de la casa: mira a -Y, +Z arriba, escala en metros, apoyo en z=0
# en el fotograma 1 (Reposo). Cinco clips por bicho (Reposo, Caminar, Atacar,
# Golpeado, Morir) con los bucles sin salto. Materiales por region tenible:
# skin (hocico y orejas), cloth (manto), trim (claros: collar y linea de costado),
# hair (cerdanas y crin), gear (colmillos, pezuas, ojo). <=1500 tri por bicho.
# En el .blend las acciones se prefijan por bicho DESPUES de exportar cada GLB.
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


def mats(jabali=False):
    base = ((0.32, 0.30, 0.28), (0.20, 0.19, 0.18), (0.55, 0.53, 0.48)) if not jabali \
        else ((0.20, 0.185, 0.175), (0.115, 0.105, 0.10), (0.35, 0.32, 0.28))
    return dict(
        skin=fg.material('skin', (0.30, 0.22, 0.20)),                     # hocico rosado-gris
        cloth=fg.material('cloth', base[0]),                              # manto
        trim=fg.material('trim', base[2]),                                # claros
        hair=fg.material('hair', base[1]),                                # cerdanas oscuras
        gear=fg.material('gear', (0.85, 0.82, 0.72), rough=0.45),         # colmillos y pezuas
        ojo=fg.material('ojo_cerropunta', (0.06, 0.04, 0.03), rough=0.3),
    )


PECARI_BONES = [
    ('hips', None, (0, 0.26, 0.46), (0, 0.06, 0.50)),
    ('chest', 'hips', (0, 0.06, 0.50), (0, -0.16, 0.545)),
    ('neck', 'chest', (0, -0.16, 0.545), (0, -0.27, 0.52)),
    ('head', 'neck', (0, -0.27, 0.52), (0, -0.40, 0.475)),
    ('jaw', 'head', (0, -0.315, 0.455), (0, -0.415, 0.435)),
    ('tail', 'hips', (0, 0.26, 0.50), (0, 0.33, 0.535)),
]
for name, x, y, parent in (('FL', 0.085, -0.10, 'chest'), ('FR', -0.085, -0.10, 'chest'),
                           ('BL', 0.095, 0.22, 'hips'), ('BR', -0.095, 0.22, 'hips')):
    PECARI_BONES += [
        (f'leg{name}', parent, (x, y, 0.34), (x * 1.06, y - 0.02, 0.17)),
        (f'shin{name}', f'leg{name}', (x * 1.06, y - 0.02, 0.17), (x * 1.08, y - 0.015, 0.05)),
    ]

JABALI_BONES = [
    ('hips', None, (0, 0.32, 0.60), (0, 0.08, 0.655)),
    ('chest', 'hips', (0, 0.08, 0.655), (0, -0.18, 0.71)),
    ('neck', 'chest', (0, -0.18, 0.71), (0, -0.33, 0.66)),
    ('head', 'neck', (0, -0.33, 0.66), (0, -0.56, 0.585)),
    ('jaw', 'head', (0, -0.40, 0.545), (0, -0.575, 0.515)),
    ('tail', 'hips', (0, 0.32, 0.65), (0, 0.40, 0.685)),
]
for name, x, y, parent in (('FL', 0.125, -0.12, 'chest'), ('FR', -0.125, -0.12, 'chest'),
                           ('BL', 0.13, 0.27, 'hips'), ('BR', -0.13, 0.27, 'hips')):
    JABALI_BONES += [
        (f'leg{name}', parent, (x, y, 0.44), (x * 1.05, y - 0.02, 0.22)),
        (f'shin{name}', f'leg{name}', (x * 1.05, y - 0.02, 0.22), (x * 1.07, y - 0.02, 0.06)),
    ]
# ============================================================
# Mallas
# ============================================================
def pata(b, m, nombre, x, y, alto_cadera, r1=0.055, r2=0.045):
    """Muslo + caña + pezuña hendida de suido."""
    z1 = alto_cadera
    z2 = z1 * 0.50
    z3 = z1 * 0.16
    b.tube((x, y, z1), (x * 1.05, y - 0.02, z2), r1, r2, m['cloth'], f'leg{nombre}', sides=6)
    b.tube((x * 1.05, y - 0.02, z2), (x * 1.07, y - 0.02, z3), r2, r2 * 0.72, m['skin'], f'shin{nombre}', sides=6)
    b.box((x * 1.075, y - 0.035, z3 * 0.55), (r2 * 0.95, r2 * 1.5, z3 * 0.62), m['gear'], f'shin{nombre}')
    b.tube((x * 1.075, y - 0.070, z3 * 0.60), (x * 1.075, y - 0.072, z3 * 0.30),
           r2 * 0.16, r2 * 0.12, m['hair'], f'shin{nombre}', sides=4)  # hendidura


def cerda(b, m, hueso, y, z, alto, ancho=0.02):
    """Pua de cerdana erguida en el lomo (dos triangulos)."""
    b.poly([(-ancho, y + 0.02, z), (ancho, y + 0.02, z), (0, y + 0.02, z)],
           [(-ancho * 0.5, y - 0.012, z), (ancho * 0.5, y - 0.012, z), (0, y - 0.020, z + alto)],
           m['hair'], hueso)


def pecari_mesh(b, m):
    # tronco esbelto con la grupa algo mas alta que el pecho
    b.tube((0, 0.30, 0.475), (0, 0.06, 0.50), 0.130, 0.128, m['cloth'], 'hips', sides=8, flat=0.74)
    b.tube((0, 0.06, 0.50), (0, -0.16, 0.525), 0.128, 0.108, m['cloth'], 'chest', sides=8, flat=0.74)
    b.blob((0, 0.20, 0.475), (0.125, 0.13, 0.105), m['cloth'], 'hips', subdiv=1)
    # vientre claro
    b.blob((0, 0.02, 0.425), (0.095, 0.20, 0.05), m['trim'], 'chest', subdiv=1)
    # linea clara del costado y collar del cuello (senal del pecari listado)
    for x in (-1, 1):
        b.tube((x * 0.120, 0.10, 0.505), (x * 0.118, -0.16, 0.535), 0.016, 0.014, m['trim'],
               'chest', sides=4, flat=0.4)
    b.tube((0, -0.135, 0.545), (0, -0.235, 0.528), 0.110, 0.096, m['trim'], 'neck', sides=7, flat=0.80)
    # cuello grueso que baja hacia la cabeza
    b.tube((0, -0.16, 0.535), (0, -0.28, 0.51), 0.098, 0.080, m['cloth'], 'neck', sides=7, flat=0.82)
    # crano alto y hocico alargado con disco nasal
    b.blob((0, -0.305, 0.505), (0.072, 0.075, 0.062), m['cloth'], 'head', subdiv=1)
    b.tube((0, -0.355, 0.478), (0, -0.430, 0.458), 0.052, 0.044, m['skin'], 'head', sides=6, flat=0.80)
    b.blob((0, -0.446, 0.455), (0.040, 0.026, 0.036), m['skin'], 'head', subdiv=1)  # disco
    for x in (-1, 1):
        b.blob((x * 0.020, -0.464, 0.462), (0.009, 0.008, 0.007), m['hair'], 'head', subdiv=1)  # ollares
    # mandibula y colmillo corto que asoma con la boca cerrada
    b.tube((0, -0.350, 0.442), (0, -0.428, 0.437), 0.040, 0.026, m['skin'], 'jaw', sides=6, flat=0.78)
    for x in (-1, 1):
        b.poly([(x * 0.040 - 0.006, -0.400, 0.448), (x * 0.040 + 0.006, -0.400, 0.448), (x * 0.040, -0.404, 0.448)],
               [(x * 0.048 - 0.003, -0.428, 0.452), (x * 0.048 + 0.003, -0.428, 0.452), (x * 0.050, -0.432, 0.492)],
               m['gear'], 'jaw')
        # oreja grande y puntiaguda hacia atras
        b.poly([(x * 0.042, -0.262, 0.552), (x * 0.062, -0.248, 0.548), (x * 0.052, -0.255, 0.560)],
               [(x * 0.078, -0.216, 0.588), (x * 0.094, -0.226, 0.578), (x * 0.086, -0.221, 0.592)],
               m['hair'], 'head')
        b.blob((x * 0.052, -0.322, 0.515), (0.011, 0.011, 0.011), m['ojo'], 'head', subdiv=1)
    # crin rigida a lo largo del lomo
    for y, z, h in ((0.24, 0.585, 0.055), (0.12, 0.612, 0.062), (0.0, 0.622, 0.066),
                    (-0.12, 0.622, 0.058), (-0.22, 0.590, 0.048)):
        cerda(b, m, 'hips' if y > 0.08 else 'chest', y, z, h, 0.020)
    # cola corta rematada en mechon
    b.tube((0, 0.285, 0.520), (0, 0.345, 0.552), 0.016, 0.008, m['hair'], 'tail', sides=5)
    # patas
    for nombre, x, y in (('FL', 0.085, -0.10), ('FR', -0.085, -0.10), ('BL', 0.095, 0.22), ('BR', -0.095, 0.22)):
        pata(b, m, nombre, x, y, 0.36)


def jabali_mesh(b, m):
    # tronco macizo con la cruz cargada (lamparona osea)
    b.tube((0, 0.38, 0.615), (0, 0.08, 0.655), 0.180, 0.175, m['cloth'], 'hips', sides=8, flat=0.72)
    b.tube((0, 0.08, 0.655), (0, -0.18, 0.685), 0.175, 0.150, m['cloth'], 'chest', sides=8, flat=0.72)
    b.blob((0, 0.26, 0.615), (0.170, 0.16, 0.145), m['cloth'], 'hips', subdiv=1)
    b.blob((0, -0.06, 0.705), (0.145, 0.20, 0.110), m['hair'], 'chest', subdiv=1)  # lamparona
    # vientre y babero claros
    b.blob((0, 0.02, 0.555), (0.130, 0.26, 0.065), m['trim'], 'chest', subdiv=1)
    # mamelones del costado
    for x in (-1, 1):
        b.tube((x * 0.160, 0.14, 0.640), (x * 0.158, -0.16, 0.675), 0.022, 0.018, m['trim'],
               'chest', sides=4, flat=0.4)
    # cuello torcido hacia abajo, papada colgando
    b.tube((0, -0.18, 0.690), (0, -0.33, 0.640), 0.140, 0.115, m['cloth'], 'neck', sides=7, flat=0.84)
    b.blob((0, -0.40, 0.500), (0.075, 0.095, 0.060), m['skin'], 'head', subdiv=1)  # papada
    # cabeza enorme: macizo triangular y hocico plano
    b.blob((0, -0.385, 0.620), (0.100, 0.105, 0.085), m['cloth'], 'head', subdiv=1)
    b.tube((0, -0.465, 0.585), (0, -0.552, 0.556), 0.072, 0.060, m['skin'], 'head', sides=6, flat=0.78)
    b.blob((0, -0.570, 0.552), (0.055, 0.030, 0.048), m['skin'], 'head', subdiv=1)
    for x in (-1, 1):
        b.blob((x * 0.026, -0.592, 0.562), (0.012, 0.010, 0.009), m['hair'], 'head', subdiv=1)
    # mandibula pesada y colmillos de hoz hacia arriba
    b.tube((0, -0.455, 0.528), (0, -0.548, 0.522), 0.056, 0.034, m['skin'], 'jaw', sides=6, flat=0.78)
    for x in (-1, 1):
        b.poly([(x * 0.052 - 0.010, -0.500, 0.528), (x * 0.052 + 0.010, -0.500, 0.528), (x * 0.052, -0.506, 0.528)],
               [(x * 0.070 - 0.005, -0.560, 0.570), (x * 0.070 + 0.005, -0.560, 0.570), (x * 0.078, -0.570, 0.648)],
               m['gear'], 'jaw')
        # colmillo superior mas corto, bajando
        b.poly([(x * 0.066 - 0.007, -0.520, 0.566), (x * 0.066 + 0.007, -0.520, 0.566), (x * 0.066, -0.524, 0.566)],
               [(x * 0.076 - 0.004, -0.552, 0.540), (x * 0.076 + 0.004, -0.552, 0.540), (x * 0.080, -0.556, 0.512)],
               m['gear'], 'head')
        # oreja tiesa y peluda
        b.poly([(x * 0.058, -0.330, 0.690), (x * 0.088, -0.318, 0.684), (x * 0.073, -0.324, 0.694)],
               [(x * 0.088, -0.298, 0.772), (x * 0.112, -0.306, 0.760), (x * 0.100, -0.302, 0.782)],
               m['hair'], 'head')
        b.blob((x * 0.072, -0.418, 0.640), (0.013, 0.012, 0.012), m['ojo'], 'head', subdiv=1)
    # capa de cerdanas erizadas: hilera alta por la cruz y media por el lomo
    for y, z, h in ((0.30, 0.740, 0.070), (0.16, 0.800, 0.085), (0.0, 0.820, 0.090),
                    (-0.14, 0.810, 0.082), (-0.26, 0.760, 0.066)):
        cerda(b, m, 'hips' if y > 0.12 else 'chest', y, z, h, 0.028)
    # cola en cepillo
    b.tube((0, 0.345, 0.660), (0, 0.410, 0.695), 0.020, 0.011, m['hair'], 'tail', sides=5)
    # patas recias
    for nombre, x, y in (('FL', 0.125, -0.12), ('FR', -0.125, -0.12), ('BL', 0.13, 0.27), ('BR', -0.13, 0.27)):
        pata(b, m, nombre, x, y, 0.45, 0.075, 0.060)


# ============================================================
# Clips (comunes: ambos esqueletos comparten nombres de hueso)
# ============================================================
def cerropunta_clips(rig, k):
    """k escala las amplitudes: 1.0 saino, 0.85 jabali (mas pesado)."""
    rest = {'jaw': (2 * k, 0, 0), 'tail': (-6 * k, 0, 0)}

    def gait(t):
        pose = {}
        for leg, phase in (('FL', 0.0), ('FR', 0.12), ('BL', 0.5), ('BR', 0.62)):
            s = math.sin(2 * math.pi * (t + phase))
            c = math.cos(2 * math.pi * (t + phase))
            pose[f'leg{leg}'] = (-16 * k * s, 0, 0)
            pose[f'shin{leg}'] = (12 * k * c - 6 * k, 0, 0)
        sway = math.sin(2 * math.pi * t)
        pose['chest'] = (2.5 * k * sway, 4 * k * sway, 0)
        pose['hips'] = (-2.5 * k * sway, -4 * k * sway, 0)
        pose['neck'] = (3 * k * sway, 3 * k * sway, 0)
        pose['head'] = (-2 * k * sway, -1.5 * k * sway, 0)
        pose['tail'] = (-6 * k, 14 * k * sway, 0)
        pose.update({kk: vv for kk, vv in rest.items() if kk not in pose})
        return pose, (0, 0, 0.014 * abs(sway))

    def r(**kw):
        return {**rest, **kw}

    rig.clip('Reposo', [
        (1, rest),
        (16, r(chest=(-1.5 * k, 0, 0), neck=(3 * k, 0, 0), tail=(-6 - 8 * k, 0, 0)), (0, 0, -0.005)),
        (31, r(jaw=(7 * k, 0, 0), head=(-3 * k, 0, 0)), (0, 0, -0.007)),
        (46, r(chest=(-1.5 * k, 0, 0), neck=(3 * k, 0, 0), tail=(-6 - 8 * k, 0, 0)), (0, 0, -0.005)),
        (61, rest),
    ])
    rig.clip('Caminar', [(1 + i * 3, *gait(i / 8)) for i in range(9)])
    # embestida: agacha el cuello, carga hacia adelante y levanta la cabeza al arremeter
    rig.clip('Atacar', [
        (1, rest),
        (6, r(chest=(-5 * k, 0, 0), neck=(12 * k, 0, 0), head=(10 * k, 0, 0), jaw=(15 * k, 0, 0)), (0, 0.07, -0.03)),
        (9, {'chest': (8 * k, 0, 0), 'neck': (-14 * k, 0, 0), 'head': (-12 * k, 0, 0), 'jaw': (26 * k, 0, 0),
             'legFL': (-26 * k, 0, 0), 'legFR': (-26 * k, 0, 0), 'legBL': (18 * k, 0, 0), 'legBR': (18 * k, 0, 0),
             'hips': (4 * k, 0, 0), 'tail': (10 * k, 0, 0)}, (0, -0.12 * k, 0.04)),
        (13, {'chest': (2 * k, 0, 0), 'neck': (4 * k, 0, 0), 'head': (2 * k, 0, 0), 'jaw': (6 * k, 0, 0),
              'legFL': (10 * k, 0, 0), 'legFR': (10 * k, 0, 0)}, (0, -0.05, 0)),
        (22, rest),
    ])
    rig.clip('Golpeado', [
        (1, rest),
        (4, r(chest=(9 * k, 0, 5 * k), neck=(13 * k, 0, 0), head=(15 * k, 0, 0), jaw=(20 * k, 0, 0),
              tail=(14 * k, 0, 0)), (0, 0.07, -0.03)),
        (13, rest),
    ])
    rig.clip('Morir', [
        (1, rest),
        (5, r(jaw=(24 * k, 0, 0), neck=(12 * k, 0, 0), head=(16 * k, 0, 0)), (0, 0.04, -0.04)),
        (14, {'hips': (0, 0, 12 * k), 'chest': (10 * k, 6 * k, 0), 'neck': (16 * k, 6 * k, 0),
              'head': (20 * k, 0, 0), 'jaw': (30 * k, 0, 0),
              'legFL': (-18 * k, 0, 16 * k), 'legFR': (-18 * k, 0, -16 * k),
              'legBL': (14 * k, 0, 12 * k), 'legBR': (14 * k, 0, -12 * k),
              'tail': (10 * k, 12 * k, 0)}, (0, 0.03, -0.10 * k)),
        (24, {'hips': (0, 0, 16 * k), 'chest': (12 * k, 10 * k, 0), 'neck': (20 * k, 10 * k, 0),
              'head': (24 * k, 4 * k, 0), 'jaw': (34 * k, 0, 0),
              'legFL': (-24 * k, 0, 24 * k), 'legFR': (-24 * k, 0, -24 * k),
              'legBL': (18 * k, 0, 18 * k), 'legBR': (18 * k, 0, -18 * k),
              'tail': (12 * k, 18 * k, 0)}, (0, 0.03, -0.17 * k)),
    ])


# ============================================================
# Generacion
# ============================================================
def generar2(escena, nombre, bones, mesh_fn, archivo, jabali=False):
    m = mats(jabali)
    rig = fg_rig.Rig(escena, f'FG_{nombre}', bones)
    b = fg.Builder('Cuerpo')
    mesh_fn(b, m)
    cuerpo = rig.part(b)
    cerropunta_clips(rig, 0.85 if jabali else 1.0)
    rig.export(archivo)
    tris = sum(len(p.vertices) - 2 for p in cuerpo.data.polygons)
    print(f'{archivo}: {tris} triangulos')
    assert tris <= 1500, f'{archivo} fuera de presupuesto: {tris} triangulos'
    for act in rig.actions:  # prefijo para que convivan en el .blend sin colision
        act.name = f'{nombre}_{act.name}'
    return rig, cuerpo


def main():
    escena_base = fg.reset()
    rig1, cuerpo = generar2(escena_base, 'Pecari', PECARI_BONES, pecari_mesh, 'pecari.glb')
    cuerpo.name = 'Cuerpo_pecari'
    rig2, jab = generar2(escena_base, 'Jabali', JABALI_BONES, jabali_mesh, 'jabali.glb', jabali=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'fauna_cerropunta.blend'), copy=True)
    print('fauna_cerropunta.blend salvo las dos especies con clips prefijados')


if __name__ == '__main__':
    main()

