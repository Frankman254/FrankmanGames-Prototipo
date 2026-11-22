# Chamanes propios (OMP-FA-19): los cuatro conjuradores que hoy comparten
# chaman.glb teñido — Curandero de Huesos (summoner), Chamán de la Neblina
# (cerropunta_shaman), Hechicero del Volcán (baru_sorcerer) y Brujo Escarchado
# de Fortuna (fortuna_shaman).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/chamanes.py
# Todos sobre el rig humano comun (fg_rig.biped_bones) con los seis clips
# comunes y `Conjurar` (attack y cast de la plantilla chaman), cada uno con
# silueta y ritual propios. Los materiales se llaman como los canales de la
# paleta (skin/cloth/trim/hair/gear, brillo_* luce), asi las palettes ya
# escritas en data/assets.json pintan a cada cual sin tocar data/:
#   curandero_huesos.glb  viejo flaco con manto de huesos colgando, collar de
#                         calaveritas y baston de craneo con ambar; melena
#                         larga cayendo por la espalda.
#   chamn_neblina.glb     poncho de capas, capucha-ancho de niebla con velo que
#                         tapa la cara (solo dos ojos luminosos), brasero colgado
#                         de una rama curva y flecos al viento.
#   hechicero_volcan.glb  bajo y ancho, media mascara de obsidiana, cresta de
#                         pavesas, hombreras de roca y grietas de lava que
#                         brillan; conjura estrellando el orbe contra el suelo.
#   brujo_escarchado.glb  corona de carámbanos, manto de piel de alto cuello,
#                         barba de hielo y cetro con cristal; congela señalando.
# Clean-room, desde cero; no toca data/ ni src/. <= 1.500 tri por criatura.
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg
import fg_rig
from fg_rig import p


def mats(base=None):
    m = dict(
        skin=fg.material('skin', (0.62, 0.46, 0.34)),
        cloth=fg.material('cloth', (0.4, 0.35, 0.4)),
        trim=fg.material('trim', (0.8, 0.75, 0.6)),
        hair=fg.material('hair', (0.2, 0.17, 0.15)),
        gear=fg.material('gear', (0.45, 0.42, 0.38), rough=0.6),
        glow=fg.material('brillo_gear', (0.85, 0.8, 0.5), emit=(0.85, 0.8, 0.5), strength=1.1),
        halo=fg.material('brillo_trim', (0.8, 0.75, 0.5), emit=(0.8, 0.75, 0.5), strength=1.1),
    )
    for k, v in (base or {}).items():
        if k in m:
            m[k] = fg.material(k, v)
    return m


def biped_body(b, m, k, width=1.0, head=1.0, shirt=None, legs=None):
    """Mismo cuerpo visual de los humanoides publicados."""
    def v(x, y, z):
        return (x * k, y * k, z * k)
    w = width * k
    cm = shirt or m['cloth']
    lm = legs or m['cloth']
    b.tube(v(0, 0, 0.8), v(0, 0, 0.98), 0.17 * w, 0.16 * w, cm, 'hips', sides=7, flat=0.72)
    b.tube(v(0, 0, 0.98), v(0, 0, 1.12), 0.16 * w, 0.18 * w, cm, 'spine', sides=7, flat=0.72)
    b.tube(v(0, 0, 1.12), v(0, 0, 1.32), 0.18 * w, 0.2 * w, cm, 'chest', sides=7, flat=0.7)
    b.blob((0, 0, 1.47 * k), (0.15 * head * k, 0.15 * head * k, 0.17 * head * k), m['skin'], 'head')
    for s, x in (('L', 1), ('R', -1)):
        b.tube(v(0.2 * x, 0, 1.27), v(0.25 * x, 0, 1.03), 0.055 * w, 0.045 * w, cm, f'upperArm{s}', sides=5)
        b.tube(v(0.25 * x, 0, 1.05), v(0.27 * x, -0.03, 0.84), 0.045 * w, 0.036 * w, m['skin'], f'foreArm{s}', sides=5)
        b.blob(v(0.27 * x, -0.04, 0.79), (0.045 * w, 0.045 * w, 0.055 * k), m['skin'], f'hand{s}', subdiv=1)
        b.tube(v(0.09 * x, 0, 0.84), v(0.1 * x, 0, 0.46), 0.08 * w, 0.056 * w, lm, f'thigh{s}', sides=5)
        b.tube(v(0.1 * x, 0, 0.48), v(0.1 * x, 0, 0.1), 0.056 * w, 0.044 * w, lm, f'shin{s}', sides=5)
        b.box(v(0.1 * x, -0.05, 0.05), (0.1 * w, 0.25 * k, 0.1 * k), m['hair'], f'foot{s}')


def cara(b, m, k, hz, ojos=None):
    ojos = ojos or m['glow']
    for x in (-1, 1):
        b.blob((x * 0.055 * k, -0.14 * k, hz + 0.03 * k), (0.022 * k, 0.012 * k, 0.022 * k), ojos, 'head', subdiv=1)
    b.tube((0, -0.15 * k, hz + 0.005 * k), (0, -0.185 * k, hz - 0.02 * k), 0.03 * k, 0.016 * k, m['skin'], 'head', sides=4, flat=0.7)


def baston(b, m, k, punta):
    """Palo ritualeño a la diestra; `punta` dibuja remate sobre (hx, hy, hz)."""
    hx, hy, hz = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz - 0.72), (hx, hy, hz + 1.02), 0.022 * k, 0.026 * k, m['gear'], 'handR', sides=5)
    punta(hx, hy, hz + 1.06)


def conjurar(rig, k, apertura):
    """Base comun: se encoge, alza los brazos y descarga. `apertura` refina el gesto."""
    rig.clip('Conjurar', [
        (1, p()),
        (7, {**p(chest=(8, 0, 0), hips=(0, 0, 0), head=(8, 0, 0), upperArmR=(40, -20, 0), foreArmR=(-100, 0, 0),
                upperArmL=(40, 20, 0), foreArmL=(-100, 0, 0)), **apertura('carga')}, (0, 0, -0.02 * k)),
        (13, {**p(chest=(-16, 0, 0), head=(-12, 0, 0), upperArmR=(-150, -14, 0), foreArmR=(-6, 0, 0),
                upperArmL=(-60, 34, 0), foreArmL=(-40, 0, 0)), **apertura('alto')}, (0, 0.02, 0.03 * k)),
        (18, {**p(chest=(16, 0, 0), head=(10, 0, 0), upperArmR=(-78, -12, 0), foreArmR=(-6, 0, 0),
                upperArmL=(-70, 20, 0), foreArmL=(-16, 0, 0)), **apertura('baja')}, (0, -0.03, -0.02 * k)),
        (26, p()),
    ])


# ============================================================ curandero huesos
def curandero_huesos():
    """Curandero de Huesos: viejo flaco, manto de ossos colgando del hombro,
    collar de calaveritas, melena y barba blancas, baston de craneo con ambar."""
    scene = fg.reset()
    m = mats()
    k = 0.95
    rig = fg_rig.Rig(scene, 'FG_Humanoide', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=0.9, head=0.96)
    hz = 1.47 * k
    cara(b, m, k, hz)
    # melena larga por la espalda y barba rala
    b.tube((0, 0.06 * k, hz + 0.12 * k), (0, 0.15 * k, hz - 0.42 * k), 0.115 * k, 0.05 * k, m['hair'], 'head', sides=6, flat=0.55)
    b.tube((0, -0.09 * k, hz - 0.06 * k), (0, -0.115 * k, hz - 0.26 * k), 0.05 * k, 0.018 * k, m['hair'], 'head', sides=5, flat=0.6)
    # collar de calaveritas: tres crinejas con cuencas oscuras
    for i, x in enumerate((-0.09, 0, 0.09)):
        zz = hz - 0.20 * k - 0.012 * k * (1 - abs(i - 1))
        b.blob((x * k, -0.155 * k, zz), (0.028 * k, 0.026 * k, 0.03 * k), m['trim'], 'chest', subdiv=1)
        for o in (-0.011, 0.011):
            b.blob(((x + o) * k, -0.178 * k, zz + 0.006 * k), (0.007 * k, 0.005 * k, 0.008 * k), m['hair'], 'chest', subdiv=1)
    # manto de huesos: tiras colgando del hombro izquierdo
    for i in range(4):
        y = -0.08 + i * 0.055
        b.poly([(-0.185 * k, y * k, 1.28 * k), (-0.145 * k, y * k, 1.28 * k), (-0.175 * k, (y + 0.02) * k, 0.98 * k)],
               [(-0.155 * k, y * k, 1.28 * k), (-0.115 * k, y * k, 1.28 * k), (-0.145 * k, (y + 0.02) * k, 0.98 * k)],
               m['hair'] if i % 2 else m['trim'], 'chest')
    # faja con colmillos
    b.tube((0, 0, 0.95 * k), (0, 0, 0.93 * k), 0.185 * k, 0.19 * k, m['trim'], 'hips', sides=8, flat=0.75)
    for x in (-0.09, -0.03, 0.03, 0.09):
        b.tube((x * k, -0.135 * k, 0.93 * k), (x * k, -0.165 * k, 0.85 * k), 0.011 * k, 0.004 * k, m['trim'], 'hips', sides=4)
    # baston: craneo grande con cuencas encendidas y colmillos colgando
    def punta(hx, hy, hz2):
        b.blob((hx, hy, hz2 + 0.06 * k), (0.075 * k, 0.075 * k, 0.08 * k), m['trim'], 'handR', subdiv=1)
        for o in (-0.028, 0.028):
            b.blob((hx + o * k, hy - 0.055 * k, hz2 + 0.07 * k), (0.016 * k, 0.012 * k, 0.02 * k), m['glow'], 'handR', subdiv=1)
        for o in (-0.03, 0, 0.03):
            b.tube((hx + o * k, hy - 0.02 * k, hz2 - 0.01 * k), (hx + o * k, hy - 0.03 * k, hz2 - 0.075 * k),
                   0.009 * k, 0.003 * k, m['trim'], 'handR', sides=4)
    baston(b, m, k, punta)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    conjurar(rig, k, lambda f: {'head': (-14, 0, 6)} if f == 'alto' else {})
    rig.export('curandero_huesos.glb')


# =============================================================== chamn neblina
def chamn_neblina():
    """Chamn de la Neblina: poncho de capas anchas, capucha que esconde la cara
    detrs del velo — solo dos ojos—, brasero colgado de una rama curva."""
    scene = fg.reset()
    m = mats()
    k = 1.02
    rig = fg_rig.Rig(scene, 'FG_Humanoide', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=1.0, head=1.0)
    hz = 1.47 * k
    # poncho de dos capas: trapecios anchos que tapan el pecho y los brazos
    b.tube((0, 0, 1.3 * k), (0, 0, 1.02 * k), 0.215 * k, 0.235 * k, m['cloth'], 'chest', sides=8, flat=0.7)
    for r, z0, z1 in ((0.30, 1.30, 1.04), (0.24, 1.06, 0.86)):
        for a in range(6):
            t0, t1 = 2 * math.pi * a / 6 + 0.26, 2 * math.pi * (a + 1) / 6 + 0.26
            b.poly([(r * 0.98 * k * math.cos(t0), r * 0.8 * k * math.sin(t0), z0 * k),
                    (r * 0.98 * k * math.cos(t1), r * 0.8 * k * math.sin(t1), z0 * k),
                    (r * 0.72 * k * math.cos(t1), r * 0.62 * k * math.sin(t1), z1 * k),
                    (r * 0.72 * k * math.cos(t0), r * 0.62 * k * math.sin(t0), z1 * k)],
                   [(r * 0.98 * k * math.cos(t0), r * 0.8 * k * math.sin(t0), z0 * k),
                    (r * 0.98 * k * math.cos(t1), r * 0.8 * k * math.sin(t1), z0 * k),
                    (r * 0.72 * k * math.cos(t1), r * 0.62 * k * math.sin(t1), z1 * k),
                    (r * 0.72 * k * math.cos(t0), r * 0.62 * k * math.sin(t0), z1 * k)],
                   m['cloth'], 'chest')
    # capucha ancha de niebla + velo: la cara desaparece bajo un cono claro
    b.tube((0, 0.01 * k, hz + 0.07 * k), (0, 0.04 * k, hz + 0.40 * k), 0.185 * k, 0.11 * k, m['trim'], 'head', sides=8)
    b.tube((0, 0.01 * k, hz + 0.07 * k), (0, 0.01 * k, hz + 0.095 * k), 0.225 * k, 0.225 * k, m['trim'], 'head', sides=9)
    b.tube((0, -0.13 * k, hz + 0.10 * k), (0, -0.16 * k, hz - 0.22 * k), 0.165 * k, 0.115 * k, m['trim'], 'head', sides=7, flat=0.45)
    for x in (-1, 1):
        b.blob((x * 0.052 * k, -0.168 * k, hz + 0.02 * k), (0.02 * k, 0.01 * k, 0.024 * k), m['halo'], 'head', subdiv=1)
    # flecos del poncho al viento
    for i in range(5):
        x = -0.16 + i * 0.08
        b.tube((x * k, 0.145 * k, 0.92 * k), ((x + 0.02) * k, 0.2 * k, 0.76 * k), 0.012 * k, 0.005 * k, m['hair'], 'chest', sides=4)
    # brasero colgado de una rama que asoma del hombro derecho
    hx, hy = 0.26 * k, -0.1 * k
    b.tube((hx, hy, 1.3 * k), (hx + 0.1 * k, hy - 0.05 * k, 1.52 * k), 0.016 * k, 0.01 * k, m['gear'], 'chest', sides=4)
    b.tube((hx + 0.1 * k, hy - 0.05 * k, 1.5 * k), (hx + 0.1 * k, hy - 0.05 * k, 1.2 * k), 0.006 * k, 0.006 * k, m['gear'], 'chest', sides=3)
    b.tube((hx + 0.1 * k, hy - 0.05 * k, 1.2 * k), (hx + 0.1 * k, hy - 0.05 * k, 1.1 * k), 0.06 * k, 0.045 * k, m['gear'], 'chest', sides=6)
    b.blob((hx + 0.1 * k, hy - 0.05 * k, 1.17 * k), (0.045 * k, 0.045 * k, 0.035 * k), m['halo'], 'chest', subdiv=1)
    # culete de humo subiendo del brasero
    b.blob((hx + 0.12 * k, hy - 0.06 * k, 1.3 * k), (0.03 * k, 0.03 * k, 0.05 * k), m['trim'], 'chest', subdiv=1)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    conjurar(rig, k, lambda f: {'upperArmL': (-100, 26, 0), 'foreArmL': (-30, 0, 0)} if f == 'carga' else {})
    rig.export('chamn_neblina.glb')


# ============================================================ hechicero volcn
def hechicero_volcan():
    """Hechicero del Volcn: bajo y ancho, mascara de obsidiana que le tapa la
    boca, cresta de pavesas, hombreras de roca y grietas de lava; estrella el
    orbe contra el suelo."""
    scene = fg.reset()
    m = mats()
    k = 0.9
    rig = fg_rig.Rig(scene, 'FG_Humanoide', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=1.24, head=1.05)
    hz = 1.47 * k
    cara(b, m, k, hz, ojos=m['glow'])
    # mascara de obsidiana: placa angulosa de la nariz al cuello
    b.poly([(-0.11 * k, -0.13 * k, hz + 0.05 * k), (0.11 * k, -0.13 * k, hz + 0.05 * k),
            (0.09 * k, -0.155 * k, hz - 0.06 * k), (-0.09 * k, -0.155 * k, hz - 0.06 * k), (0, -0.185 * k, hz - 0.02 * k)],
           [(-0.11 * k, -0.09 * k, hz + 0.05 * k), (0.11 * k, -0.09 * k, hz + 0.05 * k),
            (0.09 * k, -0.115 * k, hz - 0.06 * k), (-0.09 * k, -0.115 * k, hz - 0.06 * k), (0, -0.145 * k, hz - 0.02 * k)],
           m['gear'], 'head')
    for x in (-0.055, 0.055):
        b.poly([(x * k - 0.02 * k, -0.15 * k, hz + 0.04 * k), (x * k + 0.02 * k, -0.15 * k, hz + 0.04 * k),
                (x * k, -0.16 * k, hz - 0.02 * k)],
               [(x * k - 0.02 * k, -0.12 * k, hz + 0.04 * k), (x * k + 0.02 * k, -0.12 * k, hz + 0.04 * k),
                (x * k, -0.13 * k, hz - 0.02 * k)], m['glow'], 'head')
    # cresta de pavesas: pua de pelo del centro de la frente a la nuca
    for i, y in enumerate((-0.12, -0.06, 0.01, 0.08)):
        zz = hz + (0.20 - i * 0.028) * k
        b.poly([(0, y * k, zz), (0.018 * k, (y + 0.03) * k, zz - 0.06 * k), (-0.018 * k, (y + 0.03) * k, zz - 0.06 * k)],
               [(0, y * k, zz + 0.1 * k), (0.018 * k, (y + 0.03) * k, zz + 0.03 * k), (-0.018 * k, (y + 0.03) * k, zz + 0.03 * k)],
               m['glow'] if i < 2 else m['hair'], 'head')
    # hombreras de roca volcnica
    for x in (1, -1):
        b.poly([(x * 0.17 * k, -0.05 * k, 1.33 * k), (x * 0.32 * k, -0.06 * k, 1.28 * k), (x * 0.3 * k, 0.04 * k, 1.3 * k), (x * 0.18 * k, 0.05 * k, 1.35 * k)],
               [(x * 0.17 * k, -0.05 * k, 1.41 * k), (x * 0.32 * k, -0.06 * k, 1.34 * k), (x * 0.3 * k, 0.04 * k, 1.36 * k), (x * 0.18 * k, 0.05 * k, 1.43 * k)],
               m['gear'], 'chest')
    # grietas de lava: franjas que cruzan el pecho y los brazos
    for x, y0, y1 in ((0.09, -0.12, 0.02), (-0.05, -0.13, 0.0), (0.02, 0.03, 0.14)):
        b.poly([(x * k, y0 * k, 1.02 * k), ((x + 0.05) * k, y1 * k, 1.02 * k), ((x + 0.02) * k, y0 * k, 1.24 * k)],
               [(x * k, (y0 - 0.012) * k, 1.02 * k), ((x + 0.05) * k, (y1 - 0.012) * k, 1.02 * k), ((x + 0.02) * k, (y0 - 0.012) * k, 1.24 * k)],
               m['glow'], 'chest')
    # faldn de tiras de cuero quemado
    b.tube((0, 0, 0.93 * k), (0, 0, 0.86 * k), 0.21 * k, 0.24 * k, m['cloth'], 'hips', sides=8, flat=0.8)
    for a in range(6):
        t = 2 * math.pi * a / 6 + 0.2
        x, y = 0.22 * k * math.cos(t), 0.18 * k * math.sin(t)
        b.poly([(x - 0.028 * k, y, 0.86 * k), (x + 0.028 * k, y, 0.86 * k), (x, y * 1.1, 0.62 * k)],
               [(x - 0.02 * k, y, 0.86 * k), (x + 0.02 * k, y, 0.86 * k), (x, y * 1.1, 0.62 * k)],
               m['hair'], 'hips')
    # baston con orbe de lava
    def punta(hx, hy, hz2):
        prev = None
        for i in range(7):
            t = 2 * math.pi * i / 6
            q = (hx + 0.075 * k * math.cos(t), hy + 0.075 * k * math.sin(t), hz2 + 0.02 * k)
            if prev:
                b.tube(prev, q, 0.014 * k, 0.014 * k, m['gear'], 'handR', sides=3)
            prev = q
        b.blob((hx, hy, hz2 + 0.075 * k), (0.062 * k, 0.062 * k, 0.062 * k), m['glow'], 'handR', subdiv=1)
    baston(b, m, k, punta)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    conjurar(rig, k, lambda f: {'chest': (20, 0, 0), 'head': (14, 0, 0)} if f == 'baja' else {})
    rig.export('hechicero_volcan.glb')


# ============================================================ brujo escarchado
def brujo_escarchado():
    """Brujo Escarchado de Fortuna: corona de carmbanos, manto de piel de cuello
    alto, barba de hielo y cetro con cristal; congela sealando."""
    scene = fg.reset()
    m = mats()
    k = 1.0
    rig = fg_rig.Rig(scene, 'FG_Humanoide', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=1.02, head=1.0)
    hz = 1.47 * k
    cara(b, m, k, hz, ojos=m['halo'])
    # barba de hielo: tres icicles del mentn
    for x, l in ((-0.045, 0.2), (0, 0.26), (0.045, 0.18)):
        b.tube((x * k, -0.115 * k, hz - 0.1 * k), ((x + 0.01) * k, -0.13 * k, hz - (0.1 + l) * k),
               0.024 * k, 0.005 * k, m['trim'], 'head', sides=5)
    # corona de carmbanos: puas de la frente a la nuca
    for i, y in enumerate((-0.13, -0.075, -0.015, 0.045)):
        base_z = hz + (0.13 - abs(i - 1.5) * 0.02) * k
        b.tube(((0.02 if i % 2 else -0.02) * k, y * k, base_z), (0, (y - 0.01) * k, base_z + (0.16 - abs(i - 1.5) * 0.035) * k),
               0.026 * k, 0.004 * k, m['trim'], 'head', sides=5)
    # manto de piel: cuello alto detrs y faldn hasta la espinilla
    b.tube((0, 0.15 * k, 1.16 * k), (0, 0.21 * k, 1.36 * k), 0.14 * k, 0.15 * k, m['cloth'], 'chest', sides=7, flat=0.6)
    b.tube((0, 0, 0.95 * k), (0, 0, 0.34 * k), 0.2 * k, 0.3 * k, m['cloth'], 'hips', sides=9, flat=0.8)
    b.tube((0, 0, 0.36 * k), (0, 0, 0.3 * k), 0.305 * k, 0.31 * k, m['trim'], 'hips', sides=9, flat=0.8)  # dobladillo escarchado
    # carmbanos al hombro izquierdo
    for x, y, l in ((-0.24, -0.06, 0.2), (-0.27, 0.05, 0.14)):
        b.tube((x * k, y * k, 1.18 * k), ((x - 0.03) * k, (y + 0.02) * k, 1.18 * k + l * k), 0.03 * k, 0.005 * k, m['trim'], 'chest', sides=5)
    # cetro de cristal: asta de asta de venado con puntn helado
    def punta(hx, hy, hz2):
        b.tube((hx, hy, hz2), (hx, hy - 0.05 * k, hz2 + 0.14 * k), 0.02 * k, 0.008 * k, m['gear'], 'handR', sides=4)
        b.tube((hx, hy, hz2), (hx, hy + 0.05 * k, hz2 + 0.12 * k), 0.02 * k, 0.007 * k, m['gear'], 'handR', sides=4)
        b.tube((hx, hy, hz2 - 0.02 * k), (hx, hy, hz2 + 0.26 * k), 0.045 * k, 0.005 * k, m['halo'], 'handR', sides=6)
    baston(b, m, k, punta)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    # congela sealando: brazo izquierdo extendido al frente
    conjurar(rig, k, lambda f: {'upperArmL': (-95, 10, 0), 'foreArmL': (-5, 0, 0)} if f == 'alto' else {})
    rig.export('brujo_escarchado.glb')


if __name__ == '__main__':
    for f in (curandero_huesos, chamn_neblina, hechicero_volcan, brujo_escarchado):
        f()
    out = os.path.join(ROOT := os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')),
                       'arte', 'blender', 'chamanes.blend')
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print('blend guardado:', out)
