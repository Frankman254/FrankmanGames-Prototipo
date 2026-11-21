# Brujas y sirena (OMP-FA-14): los cinco `summoner` regionales que hoy se ven
# como el chaman tenido — Brujo del Manglar (chame_witch), Bruja del Bajareque
# (boquete_witch), Brujo del Tapón (darien_witch), Bruja de las Perlas
# (perlas_witch) y Sirena Desafinada (bocas_siren).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/brujas_sirena.py
# Las cuatro brujas van sobre el rig humano comun (fg_rig.biped_bones) con los
# seis clips comunes y `Conjurar`, como chaman.glb, para no tocar los eventos
# de data/. La sirena no tiene piernas: rig propio FG_Sirena (hips, spine,
# chest, head, brazos y cola de tres tramos con aleta), y Caminar/Correr/Rodar
# se vuelven ondular y dar vueltas en el aire — flota, como los espiritus de
# FA-12. Cada silueta se distingue sin mirar el color: sombrero de palma
# ancho, joroba con moño y farol, corona de plumas con antifaz de hueso,
# pollera de perlas, y la cola de pez con caracola.
# Escribe assets/models/{bruja_manglar,bruja_bajareque,brujo_darien,
# bruja_perlas,sirena_desafinada}.glb. Clean-room, desde cero. No toca data/
# ni src/.
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
        wood=fg.material('madera', (0.33, 0.22, 0.14), rough=0.7),
    )
    for k, v in (base or {}).items():
        if k == 'halo':
            m['halo'] = fg.material('brillo_trim', v, emit=v, strength=1.1)
        elif k in m:
            m[k] = fg.material(k, v)
    return m


def biped_body(b, m, k, width=1.0, boots='hair', head_scale=1.0, shirt=None, legs=None):
    """Mismo cuerpo visual de los humanoides publicados."""
    def v(x, y, z):
        return (x * k, y * k, z * k)
    w = width * k
    cm = shirt or m['cloth']
    lm = legs or m['cloth']
    b.tube(v(0, 0, 0.8), v(0, 0, 0.98), 0.17 * w, 0.16 * w, cm, 'hips', sides=7, flat=0.72)
    b.tube(v(0, 0, 0.98), v(0, 0, 1.12), 0.16 * w, 0.18 * w, cm, 'spine', sides=7, flat=0.72)
    b.tube(v(0, 0, 1.12), v(0, 0, 1.32), 0.18 * w, 0.2 * w, cm, 'chest', sides=7, flat=0.7)
    b.box(v(0, 0, 0.95), (0.35 * w, 0.25 * w, 0.045 * k), m['trim'], 'hips')
    hk = k * head_scale
    b.blob(v(0, 0, 1.47) if head_scale == 1 else (0, 0, 1.33 * k + 0.17 * hk),
           (0.15 * hk, 0.15 * hk, 0.17 * hk), m['skin'], 'head')
    for s, x in (('L', 1), ('R', -1)):
        b.tube(v(0.2 * x, 0, 1.27), v(0.25 * x, 0, 1.03), 0.055 * w, 0.045 * w, cm, f'upperArm{s}', sides=5)
        b.tube(v(0.25 * x, 0, 1.05), v(0.27 * x, -0.03, 0.84), 0.045 * w, 0.036 * w, m['skin'], f'foreArm{s}', sides=5)
        b.blob(v(0.27 * x, -0.04, 0.79), (0.045 * w, 0.045 * w, 0.055 * k), m['skin'], f'hand{s}', subdiv=1)
        b.tube(v(0.09 * x, 0, 0.84), v(0.1 * x, 0, 0.46), 0.08 * w, 0.056 * w, lm, f'thigh{s}', sides=5)
        b.tube(v(0.1 * x, 0, 0.48), v(0.1 * x, 0, 0.1), 0.056 * w, 0.044 * w, lm, f'shin{s}', sides=5)
        b.box(v(0.1 * x, -0.05, 0.05), (0.1 * w, 0.25 * k, 0.1 * k), m[boots], f'foot{s}')


def cara(b, m, k, hz, ojos=None, cejas=True):
    ojos = ojos or m['gear']
    for x in (-1, 1):
        b.blob((x * 0.055 * k, -0.14 * k, hz + 0.03 * k), (0.022 * k, 0.012 * k, 0.022 * k), ojos, 'head', subdiv=1)
        if cejas:
            b.box((x * 0.058 * k, -0.152 * k, hz + 0.055 * k), (0.026 * k, 0.006 * k, 0.008 * k), m['hair'], 'head')
    b.tube((0, -0.15 * k, hz + 0.005 * k), (0, -0.185 * k, hz - 0.02 * k), 0.03 * k, 0.016 * k, m['skin'], 'head', sides=4, flat=0.7)
    b.box((0, -0.158 * k, hz - 0.06 * k), (0.055 * k, 0.006 * k, 0.010 * k), m['hair'], 'head')


def baston(b, m, k, firma='nudo'):
    """Bastón en la derecha con remate distinto por bruja."""
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2 - 0.70 * k), (hx + 0.02 * k, hy + 0.02 * k, hz2 + 1.02 * k), 0.022 * k, 0.018 * k, m['wood'], 'handR', sides=5)
    if firma == 'nudo':      # rama de mangle torcida con cangrejito colgando
        b.blob((hx + 0.03 * k, hy, hz2 + 1.05 * k), (0.05 * k, 0.05 * k, 0.04 * k), m['wood'], 'handR', subdiv=1)
        b.tube((hx + 0.03 * k, hy - 0.02 * k, hz2 + 1.02 * k), (hx + 0.02 * k, hy - 0.12 * k, hz2 + 0.95 * k), 0.008 * k, 0.005 * k, m['gear'], 'handR', sides=3)
        b.blob((hx + 0.02 * k, hy - 0.15 * k, hz2 + 0.92 * k), (0.045 * k, 0.03 * k, 0.03 * k), m['trim'], 'handR', subdiv=1)
    elif firma == 'farol':   # farol de luz de bajareque
        b.tube((hx + 0.02 * k, hy, hz2 + 1.04 * k), (hx + 0.02 * k, hy - 0.14 * k, hz2 + 1.06 * k), 0.008 * k, 0.008 * k, m['gear'], 'handR', sides=3)
        b.blob((hx + 0.02 * k, hy - 0.17 * k, hz2 + 1.0 * k), (0.055 * k, 0.05 * k, 0.07 * k), m['glow'], 'handR', subdiv=1)
        b.tube((hx + 0.02 * k, hy - 0.17 * k, hz2 + 1.08 * k), (hx + 0.02 * k, hy - 0.17 * k, hz2 + 1.11 * k), 0.03 * k, 0.02 * k, m['gear'], 'handR', sides=5)
    elif firma == 'colmillo':  # colmillo y plumas del brujón del Tapón
        b.tube((hx + 0.02 * k, hy - 0.01 * k, hz2 + 1.04 * k), (hx + 0.03 * k, hy - 0.05 * k, hz2 + 1.30 * k), 0.02 * k, 0.005 * k, m['trim'], 'handR', sides=4)
        for dx in (-0.03, 0.0, 0.03):
            b.tube((hx + dx * k, hy + 0.01 * k, hz2 + 1.0 * k), (hx + (dx + 0.04) * k, hy + 0.06 * k, hz2 + 1.22 * k), 0.012 * k, 0.004 * k, m['hair'], 'handR', sides=3)
    elif firma == 'perla':   # aro de concha con perla luminosa
        prev = None
        for i in range(9):
            t = 2 * math.pi * i / 8
            q = (hx + 0.02 * k + 0.10 * k * math.cos(t), hy, hz2 + 1.12 * k + 0.10 * k * math.sin(t))
            if prev:
                b.tube(prev, q, 0.012 * k, 0.012 * k, m['trim'], 'handR', sides=3)
            prev = q
        b.blob((hx + 0.02 * k, hy, hz2 + 1.12 * k), (0.045 * k, 0.045 * k, 0.045 * k), m['glow'], 'handR', subdiv=1)


def conjurar(rig, extra=None):
    """Conjurar del chaman publicado con su firma de brazos."""
    def e(f, pose, off=None):
        pp = {**pose, **extra(f)} if extra else pose
        return (f, pp) + ((off,) if off else ())
    rig.clip('Conjurar', [
        e(1, p()),
        e(10, p(chest=(-14, 0, 0), head=(-12, 0, 0), upperArmR=(-132, -12, 0), foreArmR=(-12, 0, 0), upperArmL=(-46, 32, 0), foreArmL=(-52, 0, 0)), (0, 0.02, 0.03)),
        e(16, p(chest=(16, 0, 0), head=(8, 0, 0), upperArmR=(-64, -6, 0), foreArmR=(-6, 0, 0), upperArmL=(-76, 14, 0), foreArmL=(-16, 0, 0)), (0, -0.04, -0.03)),
        e(22, p(chest=(8, 0, 0), upperArmR=(-52, -10, 0), foreArmR=(-16, 0, 0), upperArmL=(-48, 14, 0), foreArmL=(-24, 0, 0))),
        e(30, p()),
    ])


# ---------------------------------------------------------------- bruja del manglar
def bruja_manglar():
    """Brujo del Manglar de Chame: alto y seco, sombrero de palma de ala ancha
    que le tapa media cara, robe musgo con vuelta de lodo y bastón de rama
    torcida con cangrejito. (chame_witch, cast verde manglar.)"""
    scene = fg.reset()
    m = mats({'cloth': (0.30, 0.40, 0.26), 'trim': (0.72, 0.66, 0.42), 'hair': (0.15, 0.14, 0.10),
              'skin': (0.60, 0.44, 0.30), 'gear': (0.36, 0.30, 0.20), 'halo': (0.6, 0.85, 0.4)})
    k = 1.02
    rig = fg_rig.Rig(scene, 'FG_BrujaManglar', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=0.94, boots='gear')
    hz = 1.47 * k
    cara(b, m, k, hz, ojos=m['glow'])
    # Sombrero de palma: cono ancho y bajo con barboquejo.
    prev = None
    for i in range(11):
        t = 2 * math.pi * i / 10
        q = (0.30 * k * math.cos(t), 0.01 * k + 0.30 * k * math.sin(t), hz + 0.13 * k)
        if prev:
            b.tube(prev, q, 0.028 * k, 0.028 * k, m['trim'], 'head', sides=4)
        prev = q
    b.tube((0, 0.01 * k, hz + 0.14 * k), (0, 0.01 * k, hz + 0.24 * k), 0.17 * k, 0.10 * k, m['trim'], 'head', sides=8)
    b.tube((0, 0.01 * k, hz + 0.155 * k), (0, 0.01 * k, hz + 0.185 * k), 0.175 * k, 0.175 * k, m['cloth'], 'head', sides=8)
    # Robe hasta el tobillo con vuelta de lodo y hombrón caído.
    b.tube((0, 0, 0.96 * k), (0, 0.01 * k, 0.10 * k), 0.21 * k, 0.33 * k, m['cloth'], 'hips', sides=9, flat=0.82)
    b.tube((0, 0, 0.16 * k), (0, 0.01 * k, 0.10 * k), 0.315 * k, 0.335 * k, m['gear'], 'hips', sides=9, flat=0.84)
    b.tube((0.10 * k, 0.03 * k, 1.32 * k), (-0.16 * k, 0.02 * k, 1.10 * k), 0.14 * k, 0.10 * k, m['cloth'], 'chest', sides=5, flat=0.6)
    baston(b, m, k, 'nudo')
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    conjurar(rig)
    rig.export('bruja_manglar.glb')


# ---------------------------------------------------------------- bruja del bajareque
def bruja_bajareque():
    """Bruja del Bajareque de Boquete: viejita encorvada (joroba fija en todos
    los clips), moño gris enorme, rejão de bajareque a cuestas con tiras de
    humo y farol de niebla. (boquete_witch, cast niebla azulada.)"""
    scene = fg.reset()
    m = mats({'cloth': (0.62, 0.64, 0.70), 'trim': (0.86, 0.88, 0.92), 'hair': (0.80, 0.80, 0.78),
              'skin': (0.66, 0.52, 0.42), 'gear': (0.40, 0.34, 0.30), 'halo': (0.7, 0.78, 0.95)})
    k = 0.88
    rig = fg_rig.Rig(scene, 'FG_BrujaBajareque', fg_rig.biped_bones(k))

    def lomo(f):
        return dict(spine=(10, 0, 0), chest=(8, 0, 0), head=(-12, 0, 0))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=0.92, boots='gear')
    hz = 1.47 * k
    cara(b, m, k, hz, ojos=m['hair'])
    # Cranio cubierto de gris y moño alto con dos mechones sueltos.
    b.tube((0, -0.075 * k, hz + 0.10 * k), (0, -0.01 * k, hz + 0.175 * k), 0.145 * k, 0.16 * k, m['hair'], 'head', sides=7)
    b.tube((0, -0.01 * k, hz + 0.175 * k), (0, 0.09 * k, hz + 0.11 * k), 0.16 * k, 0.14 * k, m['hair'], 'head', sides=7)
    b.blob((0, 0.14 * k, hz + 0.13 * k), (0.10 * k, 0.09 * k, 0.10 * k), m['hair'], 'head', subdiv=1)
    b.blob((0, 0.11 * k, hz + 0.13 * k), (0.05 * k, 0.05 * k, 0.05 * k), m['trim'], 'head', subdiv=1)
    for x in (-1, 1):
        b.tube((x * 0.12 * k, 0.04 * k, hz + 0.02 * k), (x * 0.15 * k, 0.10 * k, hz - 0.14 * k), 0.016 * k, 0.006 * k, m['hair'], 'head', sides=3)
    # Rebozo azul de niebla cruzado y falda larga.
    b.tube((0, 0, 0.96 * k), (0, 0.02 * k, 0.12 * k), 0.20 * k, 0.30 * k, m['cloth'], 'hips', sides=9, flat=0.82)
    b.poly([(-0.16 * k, -0.13 * k, 1.26 * k), (0.16 * k, -0.05 * k, 1.16 * k), (0.14 * k, -0.02 * k, 1.05 * k), (-0.17 * k, -0.11 * k, 1.16 * k)],
           [(-0.13 * k, 0.05 * k, 1.26 * k), (0.17 * k, 0.10 * k, 1.16 * k), (0.15 * k, 0.13 * k, 1.05 * k), (-0.10 * k, 0.07 * k, 1.16 * k)], m['trim'], 'chest')
    # Canasto rejão a la espalda con humo saliendo.
    b.tube((0, 0.20 * k, 1.14 * k), (0, 0.24 * k, 0.86 * k), 0.13 * k, 0.10 * k, m['gear'], 'chest', sides=7, flat=0.7)
    b.tube((0, 0.20 * k, 1.15 * k), (0, 0.20 * k, 1.19 * k), 0.135 * k, 0.135 * k, m['wood'], 'chest', sides=7)
    for i in range(4):
        t = i / 3
        b.blob(((0.05 if i % 2 else -0.05) * k * t, (0.26 + 0.14 * t) * k, (1.22 + 0.30 * t) * k),
               ((0.03 + 0.05 * t) * k,) * 3, m['trim'], 'chest', subdiv=1)
    baston(b, m, k, 'farol')
    rig.part(b)
    fg_rig.biped_clips(rig, k, extra=lomo)
    conjurar(rig, extra=lomo)
    rig.export('bruja_bajareque.glb')


# ---------------------------------------------------------------- brujo del Tapón
def brujo_darien():
    """Brujo del Tapón del Darién: anchote, antifaz de hueso de jaguar sobre la
    cara, corona de plumas rojas y verdes, peto de colmillos y bastón con
    colmillo. (darien_witch, cast selva profunda.)"""
    scene = fg.reset()
    m = mats({'cloth': (0.18, 0.26, 0.14), 'trim': (0.86, 0.80, 0.62), 'hair': (0.12, 0.10, 0.08),
              'skin': (0.52, 0.36, 0.24), 'gear': (0.30, 0.24, 0.18), 'halo': (0.95, 0.4, 0.2)})
    k = 1.06
    rig = fg_rig.Rig(scene, 'FG_BrujoDarien', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=1.14, boots='gear')
    hz = 1.47 * k
    cara(b, m, k, hz, ojos=m['glow'], cejas=False)
    # Antifaz de hueso: frente y pómulos cubiertos, ojos y nariz al aire.
    b.tube((0, -0.02 * k, hz + 0.085 * k), (0, -0.055 * k, hz + 0.095 * k), 0.158 * k, 0.152 * k, m['trim'], 'head', sides=8)
    b.box((0, -0.135 * k, hz + 0.09 * k), (0.24 * k, 0.03 * k, 0.05 * k), m['trim'], 'head')
    for x in (-1, 1):
        b.box((x * 0.085 * k, -0.125 * k, hz + 0.02 * k), (0.05 * k, 0.02 * k, 0.045 * k), m['trim'], 'head')  # pómulos
    for x in (-1, 1):  # colmillos del antifaz bajando por las mejillas
        b.tube((x * 0.105 * k, -0.12 * k, hz - 0.02 * k), (x * 0.115 * k, -0.13 * k, hz - 0.10 * k), 0.014 * k, 0.004 * k, m['trim'], 'head', sides=3)
    # Corona de plumas: abanico rojo y verde.
    for i, dx in enumerate((-0.19, -0.10, 0, 0.10, 0.19)):
        mm = m['halo'] if i % 2 == 0 else m['cloth']
        b.poly([(dx * k - 0.030 * k, 0.04 * k, hz + 0.135 * k), (dx * k + 0.030 * k, 0.04 * k, hz + 0.135 * k), ((dx * 1.35) * k, 0.09 * k, hz + (0.24 + 0.05 * (2 - abs(2 - i))) * k)],
               [(dx * k - 0.014 * k, 0.07 * k, hz + 0.135 * k), (dx * k + 0.014 * k, 0.07 * k, hz + 0.135 * k), ((dx * 1.35) * k, 0.12 * k, hz + (0.24 + 0.05 * (2 - abs(2 - i))) * k)],
               mm, 'head')
    # Peto de colmillos y faldín de fibra.
    for x in (-0.12, -0.04, 0.04, 0.12):
        b.tube((x * k, -0.135 * k, 1.24 * k), (x * k, -0.145 * k, 1.13 * k), 0.012 * k, 0.004 * k, m['trim'], 'chest', sides=3)
    b.tube((0, 0, 0.92 * k), (0, 0.02 * k, 0.52 * k), 0.24 * k, 0.30 * k, m['cloth'], 'hips', sides=9, flat=0.85)
    for x in (-0.15, 0, 0.15):
        b.poly([(x * k - 0.06 * k, -0.13 * k, 0.60 * k), (x * k + 0.06 * k, -0.13 * k, 0.60 * k), (x * k, -0.15 * k, 0.36 * k)],
               [(x * k - 0.06 * k, -0.06 * k, 0.60 * k), (x * k + 0.06 * k, -0.06 * k, 0.60 * k), (x * k, -0.08 * k, 0.36 * k)], m['gear'], 'hips')
    baston(b, m, k, 'colmillo')
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    conjurar(rig)
    rig.export('brujo_darien.glb')


# ---------------------------------------------------------------- bruja de las perlas
def bruja_perlas():
    """Bruja de las Perlas del Archipiélago: esbelta, pollera blanca de tres
    vuelos con cintas de nácar, tocado de concha abierta con la perla
    encendida y collares. (perlas_witch, cast blanco perla.)"""
    scene = fg.reset()
    m = mats({'cloth': (0.92, 0.90, 0.94), 'trim': (0.96, 0.94, 0.88), 'hair': (0.10, 0.09, 0.10),
              'skin': (0.68, 0.50, 0.38), 'gear': (0.55, 0.58, 0.62), 'halo': (0.85, 0.9, 1.0)})
    k = 0.96
    rig = fg_rig.Rig(scene, 'FG_BrujaPerlas', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=0.9, boots='trim')
    hz = 1.47 * k
    cara(b, m, k, hz, ojos=m['hair'])
    # Pelo recogido en dos rodetes con cinta de nácar.
    b.tube((0, 0.05 * k, hz + 0.06 * k), (0, 0.14 * k, hz - 0.12 * k), 0.14 * k, 0.07 * k, m['hair'], 'head', sides=6, flat=0.7)
    for x in (-1, 1):
        b.blob((x * 0.10 * k, 0.10 * k, hz + 0.07 * k), (0.05 * k, 0.05 * k, 0.05 * k), m['hair'], 'head', subdiv=1)
    # Tocado de concha: abanico de cinco lóbulos con la perla al centro.
    b.tube((0, 0.01 * k, hz + 0.115 * k), (0, 0.015 * k, hz + 0.14 * k), 0.168 * k, 0.165 * k, m['trim'], 'head', sides=9)
    for i, da in enumerate((-46, -23, 0, 23, 46)):
        a = math.radians(da)
        base = (0.15 * math.sin(a), -0.14 * math.cos(a), hz + 0.14 * k)
        tip = (0.27 * math.sin(a), -0.25 * math.cos(a), hz + 0.26 * k + 0.03 * k * math.cos(2 * a))
        perp = (math.cos(a), math.sin(a) * 0.4, 0)
        b.poly([(base[0] - 0.05 * perp[0] * k, base[1] - 0.05 * perp[1] * k, base[2]),
                (base[0] + 0.05 * perp[0] * k, base[1] + 0.05 * perp[1] * k, base[2]),
                (tip[0] + 0.028 * perp[0] * k, tip[1] + 0.028 * perp[1] * k, tip[2]),
                (tip[0] - 0.028 * perp[0] * k, tip[1] - 0.028 * perp[1] * k, tip[2])],
               [(base[0] - 0.05 * perp[0] * k + 0.018 * k, base[1] - 0.05 * perp[1] * k, base[2] + 0.018 * k),
                (base[0] + 0.05 * perp[0] * k + 0.018 * k, base[1] + 0.05 * perp[1] * k, base[2] + 0.018 * k),
                (tip[0] + 0.028 * perp[0] * k + 0.018 * k, tip[1] + 0.028 * perp[1] * k, tip[2] + 0.01 * k),
                (tip[0] - 0.028 * perp[0] * k + 0.018 * k, tip[1] - 0.028 * perp[1] * k, tip[2] + 0.01 * k)],
               m['trim'], 'head')
    b.blob((0, -0.16 * k, hz + 0.16 * k), (0.042 * k, 0.042 * k, 0.042 * k), m['glow'], 'head', subdiv=1)
    # Pollera de tres vuelos escalonados con cintas.
    for z0, z1, r in ((0.95, 0.72, 0.30), (0.76, 0.46, 0.40), (0.50, 0.14, 0.50)):
        b.tube((0, 0, z0 * k), (0, 0.02 * k, z1 * k), r * 0.75 * k, r * k, m['cloth'], 'hips', sides=10, flat=0.86)
        b.tube((0, 0.005 * k, (z1 + 0.04) * k), (0, 0.02 * k, z1 * k), r * 0.96 * k, r * k, m['trim'], 'hips', sides=10, flat=0.88)
    # Collar de perlas.
    for i in range(5):
        a = math.pi * (0.30 + 0.4 * i / 4)
        b.blob((0.11 * k * math.cos(a), -0.10 * k * math.sin(a), 1.315 * k), (0.017 * k,) * 3, m['trim'], 'chest', subdiv=1)
    baston(b, m, k, 'perla')
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    conjurar(rig)
    rig.export('bruja_perlas.glb')


# ---------------------------------------------------------------- sirena
def sirena():
    """Sirena Desafinada de Bocas: cola de tres tramos con aleta caída,
    escamas verde-agua, crin suelta flotando, coral rosa en el pelo y una
    caracola enorme que usa de corneta (desafinada: el estampido sale torcido
    hacia arriba). Sin piernas: flota; los clips comunes se hacen ondulando.
    (bocas_siren, cast turquesa.)"""
    scene = fg.reset()
    m = mats({'skin': (0.80, 0.62, 0.50), 'cloth': (0.20, 0.55, 0.60), 'trim': (0.90, 0.55, 0.62),
              'hair': (0.15, 0.42, 0.45), 'gear': (0.5, 0.55, 0.6), 'halo': (0.4, 0.85, 0.8)})
    k = 0.95
    bones = [
        ('hips', None, (0, 0, 0.92 * k), (0, 0, 1.05 * k)),
        ('spine', 'hips', (0, 0, 1.05 * k), (0, 0, 1.20 * k)),
        ('chest', 'spine', (0, 0, 1.20 * k), (0, 0, 1.38 * k)),
        ('head', 'chest', (0, 0, 1.38 * k), (0, 0, 1.72 * k)),
        ('tail1', 'hips', (0, 0, 0.92 * k), (0, 0.10 * k, 0.62 * k)),
        ('tail2', 'tail1', (0, 0.10 * k, 0.62 * k), (0, -0.04 * k, 0.36 * k)),
        ('tailfin', 'tail2', (0, -0.04 * k, 0.36 * k), (0, 0.17 * k, 0.12 * k)),
    ]
    for s, x in (('L', 1), ('R', -1)):
        bones += [
            (f'upperArm{s}', 'chest', (0.19 * x * k, 0, 1.34 * k), (0.25 * x * k, 0, 1.12 * k)),
            (f'foreArm{s}', f'upperArm{s}', (0.25 * x * k, 0, 1.12 * k), (0.27 * x * k, -0.03 * k, 0.92 * k)),
            (f'hand{s}', f'foreArm{s}', (0.27 * x * k, -0.03 * k, 0.92 * k), (0.27 * x * k, -0.05 * k, 0.84 * k)),
        ]
    rig = fg_rig.Rig(scene, 'FG_Sirena', bones)
    b = fg.Builder('Cuerpo')

    def v(x, y, z):
        return (x * k, y * k, z * k)
    # Torso y cabeza.
    b.tube(v(0, 0, 1.0), v(0, 0, 1.16), 0.15, 0.155, m['skin'], 'spine', sides=7, flat=0.72)
    b.tube(v(0, 0, 1.16), v(0, 0, 1.36), 0.17, 0.175, m['skin'], 'chest', sides=7, flat=0.7)
    b.tube(v(0, 0, 1.06), v(0, 0, 1.12), 0.16, 0.165, m['cloth'], 'spine', sides=7, flat=0.75)  # top de conchas
    b.blob(v(0, 0, 1.50), (0.15, 0.15, 0.17), m['skin'], 'head')
    cara(b, m, k, 1.50 * k, ojos=m['hair'])
    # Crin suelta flotando hacia atrás y a los lados.
    for dx, dz, l in ((-0.16, 0.05, 0.62), (-0.08, 0.12, 0.75), (0.0, 0.14, 0.80), (0.08, 0.12, 0.75), (0.16, 0.05, 0.60)):
        prev = None
        for i in range(5):
            t = i / 4
            q = ((dx - 0.05 * t * (1 if dx < 0 else -1)) * k, (0.10 + 0.42 * t) * k, (1.50 + dz - 0.30 * t) * k)
            if prev:
                b.tube(prev, q, (0.05 if i == 0 else 0.03) * k, 0.012 * k, m['hair'], 'head', sides=3)
            prev = q
    # Coral rosa a un lado del pelo.
    for (cx, cy, cz, hx, hy, hz) in ((-0.13, -0.06, 1.58, -0.10, -0.02, -0.03), (-0.12, -0.02, 1.62, -0.11, 0.01, -0.01), (-0.12, 0.02, 1.58, -0.09, 0.05, -0.05)):
        b.tube((cx * k, cy * k, cz * k), ((cx + hx) * k, (cy + hy) * k, (cz + hz) * k), 0.015 * k, 0.005 * k, m['trim'], 'head', sides=4)
    # Brazos.
    for s, x in (('L', 1), ('R', -1)):
        b.tube(v(0.19 * x, 0, 1.34), v(0.25 * x, 0, 1.12), 0.05, 0.042, m['skin'], f'upperArm{s}', sides=5)
        b.tube(v(0.25 * x, 0, 1.12), v(0.27 * x, -0.03, 0.92), 0.042, 0.034, m['skin'], f'foreArm{s}', sides=5)
        b.blob(v(0.27 * x, -0.04, 0.87), (0.045, 0.045, 0.055), m['skin'], f'hand{s}', subdiv=1)
    # Cola: tres tramos que ondean, escamas como anillos y aleta caída.
    b.tube(v(0, 0, 0.96), (0, 0.10 * k, 0.62 * k), 0.19 * k, 0.135 * k, m['cloth'], 'hips', sides=8, flat=0.75)
    b.tube((0, 0.10 * k, 0.62 * k), (0, -0.04 * k, 0.30 * k), 0.135 * k, 0.085 * k, m['cloth'], 'tail1', sides=8, flat=0.75)
    b.tube((0, -0.04 * k, 0.36 * k), (0, 0.06 * k, 0.18 * k), 0.085 * k, 0.05 * k, m['cloth'], 'tail2', sides=7, flat=0.75)
    for z, r in ((0.86, 0.16), (0.72, 0.145), (0.58, 0.128), (0.44, 0.108), (0.38, 0.09)):
        b.tube((0, 0.02 * k if z > 0.6 else -0.01 * k, z * k), (0, 0.025 * k if z > 0.6 else -0.005 * k, (z - 0.03) * k), r * k, r * 0.97 * k, m['trim'], 'hips' if z > 0.6 else 'tail1', sides=8, flat=0.9)
    # Aleta caudal caída, como un velo rasgado.
    for dz, dx in ((0.10, -0.12), (0.05, -0.05), (0.0, 0.0), (-0.05, 0.06), (-0.10, 0.13)):
        b.poly([(0, 0.06 * k, 0.18 * k), (dx * k, (0.18 + 0.05 * abs(dx)) * k, (0.14 + dz * 0.8) * k), ((dx * 0.4) * k, 0.15 * k, (0.16 + dz * 0.5) * k)],
               [(0.015 * k, 0.08 * k, 0.18 * k), ((dx + 0.02) * k, (0.20 + 0.05 * abs(dx)) * k, (0.14 + dz * 0.8) * k), ((dx * 0.4 + 0.015) * k, 0.17 * k, (0.16 + dz * 0.5) * k)],
               m['cloth'], 'tailfin')
    # Caracola-corneta en las dos manos.
    hx, hy, hz2 = -0.27 * k, -0.06 * k, 0.90 * k
    b.tube((hx, hy, hz2), (hx - 0.10 * k, hy - 0.10 * k, hz2 + 0.10 * k), 0.055 * k, 0.085 * k, m['trim'], 'handR', sides=7)
    b.tube((hx - 0.10 * k, hy - 0.10 * k, hz2 + 0.10 * k), (hx - 0.17 * k, hy - 0.16 * k, hz2 + 0.16 * k), 0.085 * k, 0.05 * k, m['trim'], 'handR', sides=7)
    b.tube((hx - 0.17 * k, hy - 0.16 * k, hz2 + 0.16 * k), (hx - 0.21 * k, hy - 0.20 * k, hz2 + 0.20 * k), 0.05 * k, 0.012 * k, m['gear'], 'handR', sides=5)
    rig.part(b)

    # --- clips: flota, no anda
    rig.clip('Reposo', [
        (1, p()),
        (16, p(chest=(-2, 0, 0), head=(3, 3, 0), tail1=(-6, 0, 0), tail2=(-9, 0, 4), tailfin=(-10, 0, -6)), (0, 0, 0.012)),
        (31, p(chest=(1, 0, 0), head=(-1, -3, 0), tail1=(5, 0, 3), tail2=(8, 0, -5), tailfin=(9, 0, 5)), (0, 0, -0.008)),
        (46, p(chest=(-2, 0, 0), head=(3, 3, 0), tail1=(-6, 0, 0), tail2=(-9, 0, 4), tailfin=(-10, 0, -6)), (0, 0, 0.012)),
        (61, p()),
    ])
    def onda(f, sgn):
        ph = sgn * math.sin(2 * math.pi * f / 16)
        return dict(tail1=(-14 * ph, 0, 6 * ph), tail2=(-20 * ph, 0, -10 * ph), tailfin=(-24 * ph, 0, 12 * ph),
                    chest=(3 * ph, 0, 0), head=(-3 * ph, 0, 0), upperArmL=(6 * ph, 0, 0), upperArmR=(-6 * ph, 0, 0))
    rig.clip('Caminar', [
        (1, p(), (0, 0, 0)),
        (9, onda(9, 1), (0, 0, 0.02)),
        (17, p(), (0, 0, 0)),
        (25, onda(25, -1), (0, 0, 0.02)),
        (33, p(), (0, 0, 0)),
    ])
    rig.clip('Correr', [
        (1, onda(1, 1), (0.02, 0, 0.01)),
        (5, onda(5, -1), (-0.02, 0, 0.045)),
        (9, onda(9, 1), (0.02, 0, 0.01)),
        (13, onda(13, -1), (-0.02, 0, 0.045)),
        (17, onda(17, 1), (0.02, 0, 0.01)),
    ])
    rig.clip('Rodar', [
        (1, p()),
        (6, p(hips=(-120, 0, 0), chest=(-30, 0, 0), head=(20, 0, 0), tail1=(-40, 0, 0), tail2=(-40, 0, 0)), (0, -0.3, -0.25)),
        (12, p(hips=(-260, 0, 0), chest=(-40, 0, 0), tail1=(-50, 0, 0), tail2=(-50, 0, 0)), (0, -0.75, -0.18)),
        (18, p(hips=(-360, 0, 0)), (0, -1.05, 0)),
    ])
    rig.clip('Golpeado', [
        (1, p()),
        (4, p(chest=(-18, 0, 6), head=(-10, 0, 0), upperArmR=(14, -30, 0), upperArmL=(14, 30, 0), tail1=(10, 0, 0), tail2=(14, 0, 0)), (0, 0.05, -0.02)),
        (13, p()),
    ])
    rig.clip('Morir', [
        (1, p()),
        (7, p(chest=(-18, 0, 0), head=(-14, 0, 0), upperArmR=(-40, -30, 0), upperArmL=(-40, 30, 0), tail1=(12, 0, 0), tail2=(16, 0, 0)), (0, 0.05, -0.10)),
        (17, p(hips=(20, 0, 0), chest=(6, 0, 0), head=(14, 0, 0), upperArmR=(10, -60, 0), upperArmL=(10, 60, 0), tail1=(30, 0, 0), tail2=(34, 0, 0), tailfin=(26, 0, 0)), (0, 0.2, -0.55)),
        (26, p(hips=(34, 0, 0), chest=(12, 0, 0), head=(16, 0, 0), upperArmR=(20, -66, 0), upperArmL=(20, 66, 0), tail1=(42, 0, 0), tail2=(50, 0, 0), tailfin=(40, 0, 0)), (0, 0.28, -0.78)),
        (31, p(hips=(36, 0, 0), chest=(14, 0, 0), head=(16, 0, 0), upperArmR=(22, -68, 0), upperArmL=(22, 68, 0), tail1=(44, 0, 0), tail2=(52, 0, 0), tailfin=(42, 0, 0)), (0, 0.29, -0.80)),
    ])
    rig.clip('Conjurar', [
        (1, p()),
        (9, p(chest=(-10, 0, 6), head=(-16, 0, 8), upperArmR=(-142, -10, 0), foreArmR=(-20, 0, 0), upperArmL=(-56, 20, 0), foreArmL=(-40, 0, 0), tail1=(-14, 0, 0), tail2=(-18, 0, 0)), (0, 0.03, 0.06)),
        (15, p(chest=(14, 0, -10), head=(24, 0, -14), upperArmR=(-96, -6, 0), foreArmR=(6, 0, 0), upperArmL=(-20, -20, 0), foreArmL=(-8, 0, 0), tail1=(14, 0, 0), tail2=(20, 0, 0), tailfin=(18, 0, 0)), (0, -0.05, -0.04)),
        (17, p(chest=(16, 0, -12), head=(26, 0, -16), upperArmR=(-92, -4, 0), foreArmR=(10, 0, 0), upperArmL=(-16, -22, 0), foreArmL=(-6, 0, 0), tail1=(16, 0, 0), tail2=(22, 0, 0), tailfin=(20, 0, 0)), (0, -0.07, -0.05)),
        (26, p()),
    ])
    rig.export('sirena_desafinada.glb')


bruja_manglar()
bruja_bajareque()
brujo_darien()
bruja_perlas()
sirena()

try:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'arte', 'blender', 'brujas_sirena.blend'))
except Exception as e:  # noqa: BLE001
    print(' blend no salvo:', e)
print(' brujas_sirena: cinco glbs')
