# Ranas de Cocla (OMP-FA-07): familia bipeda de tamano humano con la Rana Dorada
# como jefa el doble de grande. Un esqueleto con los mismos nombres de hueso para
# las cuatro variantes (cambian proporcion y piezas), cuatro GLB en un solo .blend.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/ranas_cocla.py
# Escribe assets/models/{rana_venenosa,rana_ojirroja,sapo_canaveral,rana_dorada}.glb
# y salva arte/blender/ranas_cocla.blend. NO se integra: nada toca data/ ni src/.
#
# Referencia: work/claude-ref01/ranas_cocla.md (decision Q24 del creador y Q30:
# venenosa verdinegra, ojirroja saltadora, sapo tanque del canaveral, y la jefa
# dorada esbelta que saluda con la mano = su ataque firma). Criaturas inventadas:
# toman silueta, color y un gesto, y exageran un rasgo. La jefa es querible y
# digna, nunca grotesca. Clean-room: nada copiado; la corona es un simbolo propio.
#
# Convenciones de la casa: mira a -Y, +Z arriba, escala en metros, apoyo en z=0
# en el fotograma 1 (Reposo). Cinco clips (Reposo, Caminar, Atacar = salto de
# emboscada para las variantes y saludo semaforico para la jefa, Golpeado,
# Morir) sin salto. Materiales tenibles: skin (piel), cloth (vientre y papada),
# trim (bandas y corona oscura), hair (manchas, verrugas y glandulas), gear
# (discos de los dedos y diadema de la jefa); ojo_* del iris no se tine.
# Variantes <=1500 tri; jefa <=2500. Acciones prefijadas en el .blend.
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


# ============================================================
# Variantes aprobadas (creador, Q30). Ids de trabajo hasta BES-02.
# ============================================================
VARIANTES = {
    # venenosa: compacta, verde y negra, lomo con verrugas, discos en los dedos
    'venenosa': dict(nombre='RanaVenenosa', archivo='rana_venenosa.glb', k=1.0, tope=1500,
                     ancho=1.00, pata=1.00, ojo=1.0, verrugas=7, glandulas=0, manchas=4,
                     bandas=0, diadema=0, hocico=0.0, gordo=1.0,
                     colores=dict(skin=(0.24, 0.52, 0.28), cloth=(0.72, 0.70, 0.52),
                                  trim=(0.45, 0.62, 0.40), hair=(0.03, 0.03, 0.035),
                                  gear=(0.06, 0.06, 0.07), ojo=(0.05, 0.05, 0.05))),
    # ojirroja: delgada, ojos enormes, patas largas, discos anaranjados
    'ojirroja': dict(nombre='RanaOjirroja', archivo='rana_ojirroja.glb', k=1.06, tope=1500,
                     ancho=0.84, pata=1.22, ojo=1.75, verrugas=0, glandulas=0, manchas=0,
                     bandas=3, diadema=0, hocico=0.05, gordo=0.8,
                     colores=dict(skin=(0.28, 0.58, 0.20), cloth=(0.86, 0.84, 0.62),
                                  trim=(0.80, 0.62, 0.10), hair=(0.10, 0.24, 0.62),
                                  gear=(0.82, 0.34, 0.07), ojo=(0.72, 0.07, 0.05))),
    # sapo: ancho, pesado, gris pardo, glandulas parotoides enormes
    'sapo': dict(nombre='SapoCanaveral', archivo='sapo_canaveral.glb', k=0.92, tope=1500,
                 ancho=1.30, pata=0.80, ojo=0.9, verrugas=9, glandulas=1, manchas=0,
                 bandas=0, diadema=0, hocico=-0.03, gordo=1.7,
                 colores=dict(skin=(0.235, 0.205, 0.125), cloth=(0.52, 0.47, 0.35),
                              trim=(0.44, 0.39, 0.26), hair=(0.13, 0.11, 0.075),
                              gear=(0.22, 0.19, 0.13), ojo=(0.55, 0.40, 0.10))),
    # jefa: esbelta, hocico puntiagudo, dorada con manchas negras, diadema propia
    'dorada': dict(nombre='RanaDorada', archivo='rana_dorada.glb', k=2.0, tope=2500,
                   ancho=0.90, pata=1.30, ojo=1.05, verrugas=0, glandulas=0, manchas=7,
                   bandas=0, diadema=1, hocico=0.12, gordo=0.9,
                   colores=dict(skin=(0.83, 0.63, 0.10), cloth=(0.90, 0.80, 0.45),
                                trim=(0.66, 0.47, 0.07), hair=(0.035, 0.03, 0.03),
                                gear=(0.78, 0.60, 0.14), ojo=(0.05, 0.04, 0.03))),
}


def mats(v):
    c = v['colores']
    return dict(
        skin=fg.material('skin', c['skin']),
        cloth=fg.material('cloth', c['cloth']),
        trim=fg.material('trim', c['trim']),
        hair=fg.material('hair', c['hair']),
        gear=fg.material('gear', c['gear'], metallic=0.45 if v['diadema'] else 0.0, rough=0.35),
        ojo=fg.material(f"ojo_{v['nombre']}", c['ojo'], rough=0.25),
        # pupila y ventanas: negros fijos, no se tien (hair es color de manto)
        pupil=fg.material(f"pupil_{v['nombre']}", (0.02, 0.02, 0.022), rough=0.2),
    )


def rana_bones(v):
    """Esqueleto erguido compartido; `pata` atrasa el tarso y alarga el pie."""
    k, ll = v['k'], v['pata']

    def e(x, y, z):
        return (x * k, y * k, z * k)
    ty = 0.08 + 0.12 * (ll - 1.0)   # tarso: pata larga lo atrasa
    tz = 0.16
    toe = -0.36 - 0.14 * (ll - 1.0)  # y la punta del pie adelanta
    bones = [
        ('hips', None, e(0, 0.08, 0.78), e(0, 0.04, 0.98)),
        ('chest', 'hips', e(0, 0.04, 0.98), e(0, -0.04, 1.28)),
        ('head', 'chest', e(0, -0.06, 1.32), e(0, -0.12, 1.66)),
        ('jaw', 'head', e(0, -0.10, 1.34), e(0, -0.30, 1.26)),
    ]
    for s, x in (('L', 1), ('R', -1)):
        bones += [
            (f'upperArm{s}', 'chest', e(x * 0.17, -0.04, 1.22), e(x * 0.28, -0.13, 1.02)),
            (f'foreArm{s}', f'upperArm{s}', e(x * 0.28, -0.13, 1.02), e(x * 0.25, -0.30, 0.94)),
            (f'hand{s}', f'foreArm{s}', e(x * 0.25, -0.30, 0.94), e(x * 0.22, -0.38, 0.88)),
            # pata en Z: muslo hacia delante, rodilla adelante y baja, tarso
            # atras en el suelo y el pie largo hacia delante
            (f'thigh{s}', 'hips', e(x * 0.14, 0.08, 0.76), e(x * 0.27, -0.18, 0.70 - 0.10 * (v['gordo'] - 1.0))),
            (f'shin{s}', f'thigh{s}', e(x * 0.27, -0.18, 0.70 - 0.10 * (v['gordo'] - 1.0)), e(x * 0.27, ty, tz)),
            (f'foot{s}', f'shin{s}', e(x * 0.27, ty, tz), e(x * 0.28, toe, 0.031)),
        ]
    return bones


# ============================================================
# Malla comun: cuerpo agazapado de rana bipeda, parametrizada por
# ancho (sapo), pata (ojirroja), ojo, verrugas, glandulas, manchas,
# bandas, hocico puntiagudo y diadema (jefa).
# ============================================================
def rana_mesh(b, m, v):
    k, a = v['k'], v['ancho']

    # torso erguido y vientre claro; la cabeza fundida con el cuerpo, morro alto
    b.blob((0, 0.04 * k, 1.05 * k), (0.26 * a * k, 0.30 * k, 0.30 * k), m['skin'], 'chest', subdiv=2)
    b.blob((0, -0.08 * k, 0.94 * k), (0.20 * a * k, 0.22 * k, 0.22 * k), m['cloth'], 'chest', subdiv=1)
    b.blob((0, -0.10 * k, 0.72 * k), (0.24 * a * k, 0.26 * k, 0.22 * k), m['skin'], 'hips', subdiv=1)
    b.blob((0, -0.14 * k, 1.40 * k), (0.20 * a * k, 0.17 * k, 0.14 * k), m['skin'], 'head', subdiv=1)
    # hocico: puntiagudo en la jefa, chato y ancho en el sapo
    hx = 0.16 * a
    b.poly([(-hx * k, -0.24 * k, 1.44 * k), (hx * k, -0.24 * k, 1.44 * k), (0, -0.24 * k, 1.31 * k)],
           [(0, (-0.36 - v['hocico']) * k, (1.42 + v['hocico'] * 0.3) * k),
            (0, (-0.36 - v['hocico']) * k, (1.42 + v['hocico'] * 0.3) * k),
            (0, -0.34 * k, 1.33 * k)], m['skin'], 'head')
    # boca amplia: labio inferior que sube al croar (hueso jaw), medio hundido
    b.tube((-0.13 * a * k, -0.22 * k, 1.30 * k), (0.13 * a * k, -0.22 * k, 1.30 * k),
           0.026 * k, 0.018 * k, m['cloth'], 'jaw', sides=5)
    b.blob((0, -0.24 * k, 1.36 * k), (0.09 * a * k, 0.05 * k, 0.016 * k), m['trim'], 'head', subdiv=1)
    # ojos: globos encima del craneo, asentados (el parpado de piel envuelve
    # el iris, que solo asoma por delante), con pupila vertical
    for x in (-1, 1):
        r = 0.062 * v['ojo'] * k
        b.blob((x * 0.105 * a * k, -0.14 * k, (1.50 + 0.015 * v['ojo']) * k),
               (r, r * 0.95, r), m['skin'], 'head', subdiv=1)
        b.blob((x * 0.105 * a * k, (-0.14 - 0.036 * v['ojo']) * k, (1.505 + 0.015 * v['ojo']) * k),
               (r * 0.55, r * 0.42, r * 0.52), m['ojo'], 'head', subdiv=1)
        b.blob((x * 0.105 * a * k, (-0.14 - 0.052 * v['ojo']) * k, (1.505 + 0.015 * v['ojo']) * k),
               (r * 0.14, r * 0.40, r * 0.46), m['pupil'], 'head', subdiv=0)
    # ventanas pegadas a la punta del hocico
    for x in (-1, 1):
        b.blob((x * 0.040 * a * k, (-0.31 - v['hocico'] * 0.8) * k, 1.420 * k), (0.010 * k,) * 3, m['pupil'], 'head', subdiv=0)
    # muslos y pantorrillas en Z: rodilla hacia delante, tarso atras, pie largo
    # al suelo delante (como la pata del hueso)
    ty = 0.08 + 0.12 * (v['pata'] - 1.0)
    toe = -0.36 - 0.14 * (v['pata'] - 1.0)
    g = v['gordo']
    gk = min(g, 1.15)          # el grosor de la caña no escala igual que el muslo
    rod = 0.70 - 0.10 * (g - 1.0)  # el sapo dobla mas la rodilla: caña corta
    for s, x in (('L', 1), ('R', -1)):
        mr = 0.100 * a * g * (1.15 if v['glandulas'] else 1.0) * k
        b.blob((x * 0.19 * a * k, -0.03 * k, 0.74 * k), (mr, 0.21 * k * g, mr * 1.10), m['skin'], f'thigh{s}', subdiv=1)
        b.tube((x * 0.14 * a * k, 0.08 * k, 0.76 * k), (x * 0.27 * k, -0.18 * k, rod * k),
               0.070 * g * k, 0.052 * g * k, m['skin'], f'thigh{s}', sides=6)
        b.tube((x * 0.27 * k, -0.18 * k, rod * k), (x * 0.27 * k, ty * k, 0.16 * k),
               0.048 * gk * k, 0.028 * gk * k, m['skin'], f'shin{s}', sides=6)
        # pie palmado hacia delante con tres dedos de disco
        b.tube((x * 0.27 * k, ty * k, 0.14 * k), (x * 0.28 * k, (toe - 0.07) * k, 0.031 * k),
               0.036 * g * k, 0.024 * g * k, m['skin'], f'foot{s}', sides=6, flat=0.7)
        for d in (-0.05, 0.0, 0.05):
            b.blob((x * (0.28 + d) * k, (toe - 0.10) * k, 0.026 * k),
                   (0.019 * k, 0.025 * k, 0.011 * k), m['gear'], f'foot{s}', subdiv=0)
        # brazo delgado doblado con mano de tres dedos
        b.tube((x * 0.15 * a * k, -0.04 * k, 1.24 * k), (x * 0.28 * k, -0.13 * k, 1.02 * k),
               0.042 * k, 0.030 * k, m['skin'], f'upperArm{s}', sides=6)
        b.tube((x * 0.28 * k, -0.13 * k, 1.02 * k), (x * 0.25 * k, -0.30 * k, 0.94 * k),
               0.030 * k, 0.023 * k, m['skin'], f'foreArm{s}', sides=6)
        b.blob((x * 0.23 * k, -0.34 * k, 0.91 * k), (0.028 * k, 0.045 * k, 0.015 * k), m['skin'], f'hand{s}', subdiv=0)
        for d in (-0.04, 0.0, 0.04):
            b.blob((x * (0.23 + d) * k, -0.40 * k, 0.90 * k), (0.015 * k, 0.019 * k, 0.010 * k), m['gear'], f'hand{s}', subdiv=0)
    # verrugas del lomo (venenosa y sapo): sentadas sobre el elipsoide del
    # torso, hundidas un tercio
    n = v['verrugas']
    for i in range(n):
        sx = (-1) ** i
        th = math.radians(18 + 16 * (i % 3))   # desde la coronilla hacia el lomo
        ph = math.radians(24 + 26 * ((i // 3) % 3))
        cz, cy = 1.05, 0.04
        rr = (0.26 * a, 0.30, 0.30)
        p = (sx * rr[0] * math.sin(ph) * math.cos(th),
             cy + rr[1] * math.sin(th),
             cz + rr[2] * math.cos(th))
        hund = 0.80
        b.blob((p[0] * hund * k, (cy + (p[1] - cy) * hund) * k, (cz + (p[2] - cz) * hund) * k),
               (0.030 * k, 0.030 * k, 0.024 * k), m['hair'],
               'hips' if p[2] < 1.0 else 'chest', subdiv=0)
    # glandulas parotoides detras de los ojos (sapo)
    if v['glandulas']:
        for x in (-1, 1):
            b.blob((x * 0.135 * a * k, -0.04 * k, 1.445 * k), (0.075 * a * k, 0.115 * k, 0.050 * k), m['hair'], 'head', subdiv=1)
    # manchas irregulares (jefa y venenosa): placas asentadas en el flanco y el lomo
    n = v['manchas']
    for i in range(n):
        sx = 1 if i % 2 else -1
        th = math.radians(-14 + 30 * (i % 4))
        ph = math.radians(38 + 24 * ((i * 2) % 3))
        rr = (0.27 * a, 0.31, 0.31)
        p = (sx * rr[0] * math.sin(ph) * math.cos(th),
             0.04 + rr[1] * math.sin(th),
             1.05 + rr[2] * math.cos(th))
        hund = 0.84
        b.blob((p[0] * hund * k, (0.04 + (p[1] - 0.04) * hund) * k, (1.05 + (p[2] - 1.05) * hund) * k),
               (0.042 * k, 0.062 * k, 0.040 * k), m['hair'],
               'hips' if p[1] > 0.14 else 'chest', subdiv=1)
    # bandas laterales: franja azul con raya amarilla pegada al flanco, de la
    # grupa al sobaco (ojirroja), nunca por encima del hombro
    if v['bandas']:
        for x in (-1, 1):
            b.tube((x * 0.245 * a * k, 0.17 * k, 0.93 * k), (x * 0.255 * a * k, -0.08 * k, 1.06 * k),
                   0.036 * k, 0.030 * k, m['hair'], 'chest', sides=5, flat=0.85)
            b.tube((x * 0.265 * a * k, 0.16 * k, 0.94 * k), (x * 0.275 * a * k, -0.07 * k, 1.07 * k),
                   0.013 * k, 0.011 * k, m['trim'], 'chest', sides=4)
    # diadema de la jefa: cerco propio con tres puntas, simbolo del oro de Cocla
    if v['diadema']:
        b.tube((-0.15 * a * k, -0.07 * k, 1.58 * k), (0.15 * a * k, -0.07 * k, 1.58 * k),
               0.017 * k, 0.017 * k, m['gear'], 'head', sides=6)
        for dx, h in ((-0.09, 0.05), (0.0, 0.075), (0.09, 0.05)):
            b.tube((dx * a * k, -0.07 * k, 1.585 * k), (dx * a * k, -0.07 * k, (1.585 + h) * k),
                   0.019 * k, 0.004 * k, m['gear'], 'head', sides=4)


# ============================================================
# Clips (mismos huesos en las cuatro; la jefa saluda con la mano
# — su ataque firma segun la ficha — y las variantes saltan encima)
# ============================================================
def rana_clips(rig, v):
    ka = 1.0

    def r(**kw):
        return kw

    def hop(t):
        """Salto corto bipedo: despega, se estira, aterriza con las rodillas."""
        pose = {}
        s = math.sin(2 * math.pi * t)
        c = math.cos(2 * math.pi * t)
        pose['chest'] = (6 * ka * c, 0, 0)
        pose['head'] = (-4 * ka * c, 0, 0)
        for leg, fase in (('L', 0.0), ('R', 0.5)):
            e = math.sin(2 * math.pi * (t + fase))
            pose[f'thigh{leg}'] = (-16 * ka * e, 0, 0)
            pose[f'shin{leg}'] = (20 * ka * e + 6 * ka, 0, 0)
            pose[f'foot{leg}'] = (-10 * ka * e, 0, 0)
            pose[f'upperArm{leg}'] = (0, 14 * ka * e, 0)
            pose[f'foreArm{leg}'] = (-12 * ka * e, 0, 0)
        return pose, (0, 0, 0.035 * max(s, 0.0))

    rig.clip('Reposo', [
        (1, r()),
        # la garganta (jaw) infla el saco vocal ritmico; el cuerpo respira
        (16, r(jaw=(-6 * ka, 0, 0), chest=(-2.5 * ka, 0, 0), head=(2 * ka, 0, 0)), (0, 0, 0.010)),
        (34, r(), (0, 0, 0)),
    ])

    def walk(i):
        pose, off = hop(i / 8)
        return (1 + i * 4, pose, off)

    rig.clip('Caminar', [walk(i) for i in range(9)])

    if v['diadema']:
        # saludo semaforico: brazo derecho arriba y ondea (invoca al sequito)
        rig.clip('Atacar', [
            (1, r()),
            (5, r(upperArmR=(0, -70 * ka, 0), foreArmR=(0, 0, -30 * ka), chest=(4 * ka, -6 * ka, 0),
                  head=(-4 * ka, 6 * ka, 0), jaw=(8 * ka, 0, 0)), (0, 0, 0.02)),
            (9, r(upperArmR=(0, -108 * ka, 0), foreArmR=(0, 0, -46 * ka), chest=(6 * ka, -10 * ka, 0),
                  head=(-6 * ka, 10 * ka, 0), jaw=(12 * ka, 0, 0)), (0, 0, 0.04)),
            (13, r(upperArmR=(0, -84 * ka, 0), foreArmR=(0, 0, -18 * ka), chest=(4 * ka, -7 * ka, 0),
                   head=(-4 * ka, 7 * ka, 0), jaw=(9 * ka, 0, 0)), (0, 0, 0.02)),
            (17, r(upperArmR=(0, -110 * ka, 0), foreArmR=(0, 0, -50 * ka), chest=(6 * ka, -11 * ka, 0),
                   head=(-6 * ka, 11 * ka, 0), jaw=(13 * ka, 0, 0)), (0, 0, 0.04)),
            (26, r()),
        ])
    else:
        # emboscada: se acuclilla, salta con las cuatro patas extendidas y aterriza mordiendo
        rig.clip('Atacar', [
            (1, r()),
            (5, r(chest=(14 * ka, 0, 0), head=(10 * ka, 0, 0), jaw=(10 * ka, 0, 0),
                  thighL=(26 * ka, 0, 0), thighR=(26 * ka, 0, 0),
                  shinL=(-30 * ka, 0, 0), shinR=(-30 * ka, 0, 0),
                  upperArmL=(20 * ka, 0, 0), upperArmR=(20 * ka, 0, 0)), (0, 0.06, -0.16)),
            (9, r(chest=(-14 * ka, 0, 0), head=(-10 * ka, 0, 0), jaw=(30 * ka, 0, 0),
                  thighL=(-40 * ka, 0, 0), thighR=(-40 * ka, 0, 0),
                  shinL=(34 * ka, 0, 0), shinR=(34 * ka, 0, 0),
                  footL=(-18 * ka, 0, 0), footR=(-18 * ka, 0, 0),
                  upperArmL=(-40 * ka, 0, 0), upperArmR=(-40 * ka, 0, 0),
                  foreArmL=(18 * ka, 0, 0), foreArmR=(18 * ka, 0, 0)), (0, -0.14, 0.16)),
            (13, r(chest=(8 * ka, 0, 0), jaw=(14 * ka, 0, 0),
                   thighL=(16 * ka, 0, 0), thighR=(16 * ka, 0, 0),
                   shinL=(-20 * ka, 0, 0), shinR=(-20 * ka, 0, 0)), (0, -0.05, -0.06)),
            (22, r()),
        ])

    rig.clip('Golpeado', [
        (1, r()),
        (4, r(chest=(12 * ka, 0, 6 * ka), head=(14 * ka, 0, 0), jaw=(24 * ka, 0, 0),
              thighL=(-14 * ka, 0, 0), thighR=(-14 * ka, 0, 0)), (0, 0.06, -0.02)),
        (8, r(chest=(-6 * ka, 0, 0)), (0, 0, 0.03)),
        (14, r()),
    ])
    # morir: se derrumba hacia atras con la panza al cielo, las rodillas ceden
    # y los brazos caen a los lados
    rig.clip('Morir', [
        (1, r()),
        (5, r(jaw=(20 * ka, 0, 0), chest=(6 * ka, 0, 0), head=(8 * ka, 0, 0)), (0, 0.03, -0.03)),
        (14, r(chest=(-12 * ka, 4 * ka, 0), head=(-14 * ka, 0, 0), jaw=(26 * ka, 0, 0),
               thighL=(14 * ka, 0, 14 * ka), thighR=(14 * ka, 0, -14 * ka),
               upperArmL=(-14 * ka, 20 * ka, 0), upperArmR=(-14 * ka, -20 * ka, 0)), (0, 0.06, -0.30)),
        (24, r(chest=(-20 * ka, 7 * ka, 0), head=(-20 * ka, 0, 0), jaw=(32 * ka, 0, 0),
               thighL=(20 * ka, 0, 22 * ka), thighR=(20 * ka, 0, -22 * ka),
               shinL=(-10 * ka, 0, 0), shinR=(-10 * ka, 0, 0),
               upperArmL=(-24 * ka, 26 * ka, 0), upperArmR=(-24 * ka, -26 * ka, 0)), (0, 0.10, -0.52)),
    ])


# ============================================================
# Generacion
# ============================================================
def generar(escena, v):
    m = mats(v)
    rig = fg_rig.Rig(escena, f"FG_{v['nombre']}", rana_bones(v))
    b = fg.Builder('Cuerpo')
    rana_mesh(b, m, v)
    cuerpo = rig.part(b)
    rana_clips(rig, v)
    rig.export(v['archivo'])
    tris = sum(len(p.vertices) - 2 for p in cuerpo.data.polygons)
    print(f"{v['archivo']}: {tris} triangulos")
    assert tris <= v['tope'], f"{v['archivo']} fuera de presupuesto: {tris} triangulos"
    for act in rig.actions:  # prefijo para que convivan en el .blend sin colision
        act.name = f"{v['nombre']}_{act.name}"
    return rig, cuerpo


def main():
    escena_base = fg.reset()
    for clave in ('venenosa', 'ojirroja', 'sapo', 'dorada'):
        cuerpo = generar(escena_base, VARIANTES[clave])[1]
        cuerpo.name = f"Cuerpo_{clave}"
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'ranas_cocla.blend'), copy=True)
    print('ranas_cocla.blend salvo las cuatro ranas con clips prefijados')


if __name__ == '__main__':
    main()
