# Fauna del Darien (OMP-FA-06): neque (`darien_neque`) y tapir (`darien_tapir`).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/fauna_darien.py
# Escribe assets/models/neque.glb y assets/models/tapir.glb y salva
# arte/blender/fauna_darien.blend. NO se integra: nada toca data/ ni src/.
#
#   Neque (aguati: roedor guerrero, creador y NOMBRE_MODELO.md 2026-11-21: es un
#   roedor, no un espiritu). Cuerpo compacto de roedor grande, cabeza ancha de
#   mandibula potente, oreja corta redondeada, lomo erizado al atacar, cola corta
#   oscura. Cruz ~0,28 m, morro a grupa ~0,60 m. Pelaje rojizo con vientre claro.
#   Tapir (Macho de Monte Insomne, elite): cuerpo macizo de barril, trompa corta
#   colgante, crin rigida en la nuca, manchas y listas claras en carrillo y cuello
#   (tapir centroamericano, no copia de especie real), calcetines claros y pezuas.
#   Cruz ~0,85 m, morro (punta de trompa) a grupa ~1,70 m.
#
# Referencias (no hay lamina REF-01 para esta familia, anota OMP 2026-11-21):
# silueta observada de memoria de campo del aguati (Dasyprocta: lomo lustroso,
# cabeza pesada, sin cola visible) y del tapir (trompa corta, crin nucal, manchas
# cream en la cara). Clean-room: nombres y proporciones propios, nada de
# reference_assets ni de terceros.
#
# Convenciones de la casa: mira a -Y, +Z arriba, escala en metros, apoyo en z=0
# en el fotograma 1 (Reposo). Cinco clips (Reposo, Caminar, Atacar, Golpeado,
# Morir) con bucles sin salto, mismos nombres de hueso entre especies salvo la
# trompa del tapir. Materiales por region tenible: skin, cloth, trim, hair, gear.
# <=1500 tri por bicho.
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


def mats(tapir=False):
    # segundo y tercer termino: oscuro del pelo / claro del trim
    base = ((0.235, 0.135, 0.075), (0.11, 0.065, 0.04), (0.72, 0.60, 0.38)) if tapir \
        else ((0.42, 0.20, 0.075), (0.24, 0.105, 0.04), (0.80, 0.66, 0.44))
    return dict(
        skin=fg.material('skin', (0.28, 0.17, 0.14) if tapir else (0.46, 0.28, 0.22)),
        cloth=fg.material('cloth', base[0]),
        trim=fg.material('trim', base[2]),
        hair=fg.material('hair', base[1]),
        gear=fg.material('gear', (0.16, 0.13, 0.11), rough=0.5),          # punas e incisivos
        ojo=fg.material('ojo_darien', (0.05, 0.03, 0.02), rough=0.3),
    )


NEQUE_BONES = [
    ('hips', None, (0, 0.16, 0.205), (0, 0.02, 0.225)),
    ('chest', 'hips', (0, 0.02, 0.225), (0, -0.12, 0.235)),
    ('neck', 'chest', (0, -0.12, 0.235), (0, -0.19, 0.245)),
    ('head', 'neck', (0, -0.19, 0.245), (0, -0.30, 0.225)),
    ('jaw', 'head', (0, -0.225, 0.205), (0, -0.305, 0.192)),
    ('tail', 'hips', (0, 0.16, 0.235), (0, 0.225, 0.25)),
]
for name, x, y, parent in (('FL', 0.055, -0.075, 'chest'), ('FR', -0.055, -0.075, 'chest'),
                           ('BL', 0.062, 0.115, 'hips'), ('BR', -0.062, 0.115, 'hips')):
    NEQUE_BONES += [
        (f'leg{name}', parent, (x, y, 0.16), (x * 1.08, y - 0.02, 0.08)),
        (f'shin{name}', f'leg{name}', (x * 1.08, y - 0.02, 0.08), (x * 1.10, y - 0.015, 0.025)),
    ]

TAPIR_BONES = [
    ('hips', None, (0, 0.60, 0.72), (0, 0.28, 0.78)),
    ('chest', 'hips', (0, 0.28, 0.78), (0, -0.22, 0.83)),
    ('neck', 'chest', (0, -0.22, 0.83), (0, -0.46, 0.80)),
    ('head', 'neck', (0, -0.46, 0.80), (0, -0.66, 0.72)),
    ('jaw', 'head', (0, -0.53, 0.66), (0, -0.67, 0.62)),
    ('trunk1', 'head', (0, -0.66, 0.68), (0, -0.78, 0.60)),
    ('trunk2', 'trunk1', (0, -0.78, 0.60), (0, -0.86, 0.49)),
    ('tail', 'hips', (0, 0.60, 0.76), (0, 0.68, 0.78)),
]
for name, x, y, parent in (('FL', 0.095, -0.20, 'chest'), ('FR', -0.095, -0.20, 'chest'),
                           ('BL', 0.105, 0.44, 'hips'), ('BR', -0.105, 0.44, 'hips')):
    TAPIR_BONES += [
        (f'leg{name}', parent, (x, y, 0.50), (x * 1.04, y - 0.02, 0.26)),
        (f'shin{name}', f'leg{name}', (x * 1.04, y - 0.02, 0.26), (x * 1.05, y - 0.02, 0.07)),
    ]

# ============================================================
# Mallas
# ============================================================
def pata(b, m, nombre, x, y, alto_cadera, r1, r2, calcetin=False):
    """Muslo + cana + puna; el tapir lleva la cana clara (calcetin)."""
    z1 = alto_cadera
    z2 = z1 * 0.52
    z3 = z1 * 0.14
    b.tube((x, y, z1), (x * 1.05, y - 0.02, z2), r1, r2, m['cloth'], f'leg{nombre}', sides=6)
    b.tube((x * 1.05, y - 0.02, z2), (x * 1.07, y - 0.02, z3), r2, r2 * 0.8,
           m['trim'] if calcetin else m['skin'], f'shin{nombre}', sides=6)
    b.box((x * 1.075, y - 0.03, z3 * 0.62), (r2 * 1.15, r2 * 1.6, z3 * 0.75), m['gear'], f'shin{nombre}')


def cerda(b, m, hueso, y, z, alto, ancho=0.02):
    """Pua erguida (dos triangulos), la crin nucal del tapir y el lomo del neque."""
    b.poly([(-ancho, y + 0.02, z), (ancho, y + 0.02, z), (0, y + 0.02, z)],
           [(-ancho * 0.5, y - 0.012, z), (ancho * 0.5, y - 0.012, z), (0, y - 0.020, z + alto)],
           m['hair'], hueso)


def neque_mesh(b, m):
    # tronco compacto de roedor: grupa redonda y pecho cerradito
    b.tube((0, 0.16, 0.215), (0, 0.02, 0.235), 0.105, 0.095, m['cloth'], 'hips', sides=8, flat=0.80)
    b.tube((0, 0.02, 0.235), (0, -0.12, 0.245), 0.095, 0.082, m['cloth'], 'chest', sides=8, flat=0.80)
    b.blob((0, 0.11, 0.225), (0.100, 0.105, 0.090), m['cloth'], 'hips', subdiv=1)
    b.blob((0, -0.02, 0.205), (0.075, 0.13, 0.050), m['trim'], 'chest', subdiv=1)   # vientre claro
    # cuello corto y cabeza pesada de roedor
    b.tube((0, -0.12, 0.245), (0, -0.20, 0.240), 0.075, 0.078, m['cloth'], 'neck', sides=7, flat=0.85)
    b.blob((0, -0.245, 0.235), (0.060, 0.062, 0.052), m['cloth'], 'head', subdiv=1)
    b.tube((0, -0.285, 0.220), (0, -0.330, 0.208), 0.038, 0.030, m['skin'], 'head', sides=6, flat=0.85)
    b.blob((0, -0.338, 0.206), (0.024, 0.016, 0.020), m['skin'], 'head', subdiv=1)  # nariz
    for x in (-1, 1):
        b.blob((x * 0.014, -0.350, 0.212), (0.007, 0.006, 0.006), m['hair'], 'head', subdiv=1)  # ollares
        # bigotes: tarjeta fina hacia el lado, corta
        b.card([(x * 0.030, -0.322, 0.210), (x * 0.046, -0.344, 0.214),
                (x * 0.045, -0.346, 0.209), (x * 0.029, -0.324, 0.205)], m['hair'], 'head')
    # mandibula potente e incisivos que asoman (arma del neque)
    b.tube((0, -0.280, 0.196), (0, -0.326, 0.192), 0.030, 0.020, m['skin'], 'jaw', sides=6, flat=0.82)
    for x in (-1, 1):
        b.poly([(x * 0.012 - 0.006, -0.330, 0.196), (x * 0.012 + 0.006, -0.330, 0.196), (x * 0.012, -0.334, 0.196)],
               [(x * 0.010 - 0.004, -0.344, 0.182), (x * 0.010 + 0.004, -0.344, 0.182), (x * 0.010, -0.346, 0.166)],
               m['gear'], 'jaw')
        # oreja corta redondeada
        b.poly([(x * 0.040, -0.225, 0.272), (x * 0.058, -0.213, 0.268), (x * 0.049, -0.219, 0.276)],
               [(x * 0.070, -0.198, 0.302), (x * 0.082, -0.206, 0.294), (x * 0.076, -0.202, 0.308)],
               m['hair'], 'head')
        b.blob((x * 0.044, -0.268, 0.238), (0.010, 0.010, 0.010), m['ojo'], 'head', subdiv=1)
    # lomo erizado: crin desde el pescuezo a la grupa
    for y, z, h in ((-0.14, 0.300, 0.035), (-0.02, 0.318, 0.042), (0.08, 0.312, 0.040),
                    (0.17, 0.295, 0.030)):
        cerda(b, m, 'hips' if y > 0.04 else 'chest', y, z, h, 0.016)
    # cola corta oscura
    b.tube((0, 0.165, 0.255), (0, 0.225, 0.272), 0.016, 0.008, m['hair'], 'tail', sides=5)
    # patas finas de roedor
    for nombre, x, y in (('FL', 0.055, -0.075), ('FR', -0.055, -0.075), ('BL', 0.062, 0.115), ('BR', -0.062, 0.115)):
        pata(b, m, nombre, x, y, 0.16, 0.030, 0.022)


def tapir_mesh(b, m):
    # cuerpo de barril con la grupa tan alta como la cruz
    b.tube((0, 0.60, 0.74), (0, 0.28, 0.79), 0.265, 0.275, m['cloth'], 'hips', sides=8, flat=0.80)
    b.tube((0, 0.28, 0.79), (0, -0.22, 0.84), 0.275, 0.250, m['cloth'], 'chest', sides=8, flat=0.80)
    b.blob((0, 0.44, 0.76), (0.245, 0.24, 0.215), m['cloth'], 'hips', subdiv=1)
    b.blob((0, 0.05, 0.66), (0.185, 0.38, 0.10), m['trim'], 'chest', subdiv=1)      # vientre claro
    # cuello grueso que baja a la cabeza
    b.tube((0, -0.22, 0.84), (0, -0.48, 0.79), 0.215, 0.165, m['cloth'], 'neck', sides=8, flat=0.86)
    # crin rigida en la nuca
    for y, z, h in ((-0.24, 1.015, 0.075), (-0.35, 0.995, 0.085), (-0.46, 0.945, 0.072),
                    (-0.55, 0.885, 0.055)):
        cerda(b, m, 'neck', y, z, h, 0.026)
    # cabeza maciza con trompa corta colgante
    b.blob((0, -0.560, 0.745), (0.115, 0.110, 0.100), m['cloth'], 'head', subdiv=1)
    b.tube((0, -0.665, 0.70), (0, -0.775, 0.615), 0.058, 0.042, m['skin'], 'trunk1', sides=6, flat=0.90)
    b.tube((0, -0.775, 0.615), (0, -0.850, 0.505), 0.042, 0.024, m['skin'], 'trunk2', sides=6, flat=0.92)
    b.blob((0, -0.856, 0.492), (0.024, 0.020, 0.018), m['skin'], 'trunk2', subdiv=1)
    # listas y manchas claras del tapir: carrillo, garganta y frontal
    for x in (-1, 1):
        b.tube((x * 0.098, -0.585, 0.760), (x * 0.100, -0.515, 0.700), 0.020, 0.016, m['trim'],
               'head', sides=4, flat=0.5)
        b.blob((x * 0.062, -0.615, 0.688), (0.020, 0.026, 0.016), m['trim'], 'head', subdiv=1)
        # oreja ovalada con canto claro
        b.poly([(x * 0.052, -0.507, 0.842), (x * 0.086, -0.493, 0.838), (x * 0.069, -0.500, 0.850)],
               [(x * 0.078, -0.461, 0.930), (x * 0.108, -0.471, 0.918), (x * 0.093, -0.466, 0.940)],
               m['hair'], 'head')
        b.poly([(x * 0.080, -0.464, 0.926), (x * 0.104, -0.472, 0.916), (x * 0.092, -0.468, 0.934)],
               [(x * 0.086, -0.460, 0.942), (x * 0.110, -0.468, 0.930), (x * 0.098, -0.464, 0.948)],
               m['trim'], 'head')
        b.blob((x * 0.070, -0.597, 0.758), (0.014, 0.013, 0.013), m['ojo'], 'head', subdiv=1)
    # mandibula corta
    b.tube((0, -0.585, 0.665), (0, -0.672, 0.640), 0.050, 0.030, m['skin'], 'jaw', sides=6, flat=0.84)
    # cola de boton
    b.blob((0, 0.635, 0.775), (0.035, 0.040, 0.030), m['hair'], 'tail', subdiv=1)
    # patas cortas y recias con calcetin claro
    for nombre, x, y in (('FL', 0.095, -0.20), ('FR', -0.095, -0.20), ('BL', 0.105, 0.44), ('BR', -0.105, 0.44)):
        pata(b, m, nombre, x, y, 0.50, 0.075, 0.055, calcetin=True)


# ============================================================
# Clips (comunes: ambos esqueletos comparten nombres de hueso;
# la trompa solo existe en el tapir y el Rig ignora huesos ausentes)
# ============================================================
def darien_clips(rig, k, tapir=False):
    """k escala las amplitudes: 1.0 neque (ligero), 0.85 tapir (pesado)."""
    rest = {'jaw': (2 * k, 0, 0), 'tail': (-6 * k, 0, 0)}
    if tapir:
        rest['trunk1'] = (4 * k, 0, 0)
        rest['trunk2'] = (8 * k, 0, 0)

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
        if tapir:
            pose['trunk1'] = (4 * k - 6 * k * sway, 0, 0)
            pose['trunk2'] = (8 * k + 8 * k * sway, 0, 0)
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
    if tapir:
        # embestida con trompa erguida: carga y trompazo
        rig.clip('Atacar', [
            (1, rest),
            (6, r(chest=(-5 * k, 0, 0), neck=(12 * k, 0, 0), head=(10 * k, 0, 0), jaw=(15 * k, 0, 0),
                  trunk1=(16 * k, 0, 0), trunk2=(10 * k, 0, 0)), (0, 0.07, -0.03)),
            (9, {'chest': (8 * k, 0, 0), 'neck': (-14 * k, 0, 0), 'head': (-12 * k, 0, 0), 'jaw': (26 * k, 0, 0),
                 'trunk1': (-34 * k, 0, 0), 'trunk2': (-24 * k, 0, 0),
                 'legFL': (-26 * k, 0, 0), 'legFR': (-26 * k, 0, 0), 'legBL': (18 * k, 0, 0), 'legBR': (18 * k, 0, 0),
                 'hips': (4 * k, 0, 0), 'tail': (10 * k, 0, 0)}, (0, -0.14 * k, 0.04)),
            (13, r(trunk1=(4 * k, 0, 0), trunk2=(8 * k, 0, 0)), (0, -0.05, 0)),
            (22, rest),
        ])
    else:
        # el neque se levanta sobre las patas traseras y muerde
        rig.clip('Atacar', [
            (1, rest),
            (5, r(chest=(26 * k, 0, 0), neck=(-14 * k, 0, 0), head=(-8 * k, 0, 0), jaw=(10 * k, 0, 0),
                  legBL=(20 * k, 0, 0), legBR=(20 * k, 0, 0)), (0, 0.04, 0.02)),
            (8, {'hips': (-14 * k, 0, 0), 'chest': (10 * k, 0, 0), 'neck': (-4 * k, 0, 0),
                 'head': (-16 * k, 0, 0), 'jaw': (34 * k, 0, 0),
                 'legFL': (-30 * k, 0, 0), 'legFR': (-30 * k, 0, 0),
                 'shinFL': (24 * k, 0, 0), 'shinFR': (24 * k, 0, 0),
                 'legBL': (-34 * k, 0, 0), 'legBR': (-34 * k, 0, 0), 'tail': (18 * k, 0, 0)},
                (0, -0.10 * k, 0.05)),
            (12, r(jaw=(8 * k, 0, 0), chest=(20 * k, 0, 0), head=(-6 * k, 0, 0)), (0, -0.03, 0.01)),
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
              'tail': (10 * k, 12 * k, 0),
              **({'trunk1': (20 * k, 0, 0), 'trunk2': (24 * k, 0, 0)} if tapir else {})},
            (0, 0.03, -0.10 * k)),
        (24, {'hips': (0, 0, 16 * k), 'chest': (12 * k, 10 * k, 0), 'neck': (20 * k, 10 * k, 0),
              'head': (24 * k, 4 * k, 0), 'jaw': (34 * k, 0, 0),
              'legFL': (-24 * k, 0, 24 * k), 'legFR': (-24 * k, 0, -24 * k),
              'legBL': (18 * k, 0, 18 * k), 'legBR': (18 * k, 0, -18 * k),
              'tail': (12 * k, 18 * k, 0),
              **({'trunk1': (26 * k, 0, 0), 'trunk2': (30 * k, 0, 0)} if tapir else {})},
            (0, 0.03, -0.17 * k)),
    ])


# ============================================================
# Generacion
# ============================================================
def generar2(escena, nombre, bones, mesh_fn, archivo, tapir=False):
    m = mats(tapir)
    rig = fg_rig.Rig(escena, f'FG_{nombre}', bones)
    b = fg.Builder('Cuerpo')
    mesh_fn(b, m)
    cuerpo = rig.part(b)
    darien_clips(rig, 0.85 if tapir else 1.0, tapir=tapir)
    rig.export(archivo)
    tris = sum(len(p.vertices) - 2 for p in cuerpo.data.polygons)
    print(f'{archivo}: {tris} triangulos')
    assert tris <= 1500, f'{archivo} fuera de presupuesto: {tris} triangulos'
    for act in rig.actions:  # prefijo para que convivan en el .blend sin colision
        act.name = f'{nombre}_{act.name}'
    return rig, cuerpo


def main():
    escena_base = fg.reset()
    rig1, cuerpo = generar2(escena_base, 'Neque', NEQUE_BONES, neque_mesh, 'neque.glb')
    cuerpo.name = 'Cuerpo_neque'
    rig2, tp = generar2(escena_base, 'Tapir', TAPIR_BONES, tapir_mesh, 'tapir.glb', tapir=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'fauna_darien.blend'), copy=True)
    print('fauna_darien.blend salvo las dos especies con clips prefijados')


if __name__ == '__main__':
    main()
