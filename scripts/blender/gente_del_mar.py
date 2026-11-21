# Gente del mar de Bocas del Toro (OMP-FA-13): pirata, capitán y marinero
# ahogado, todos sobre el rig humano comun (fg_rig.biped_bones / biped_clips),
# mismos huesos y mismos clips que los humanoides ya publicados (arquero.glb,
# chaman.glb): Reposo, Caminar, Correr, Rodar, Golpeado, Morir, mas el gesto
# propio: el pirata tira cuchillos (Disparar, como el arquero), el capitan
# mandoblea (Atacar) y el ahogado arana (Atacar).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/gente_del_mar.py
# Escribe assets/models/pirata_bocanas.glb, capitan_calipso.glb y
# marinero_ahogado.glb (nodo Cuerpo, partes por material de paleta: skin,
# cloth, trim, hair, gear, brillo_*). Clean-room: ropa del Caribe panameno
# escrita desde cero — pañuelo y camisa de manta, levita de capitan con
# galones, harapos de marino con algas. No toca data/ ni src/.
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg
import fg_rig
from fg_rig import p


def mats():
    return dict(
        skin=fg.material('skin', (0.55, 0.38, 0.27)),
        cloth=fg.material('cloth', (0.82, 0.76, 0.64)),
        trim=fg.material('trim', (0.75, 0.62, 0.30)),
        hair=fg.material('hair', (0.10, 0.08, 0.07)),
        gear=fg.material('gear', (0.45, 0.46, 0.48), rough=0.5),
        glow=fg.material('brillo_gear', (0.85, 0.72, 0.35), emit=(0.85, 0.72, 0.35), strength=0.9),
        wood=fg.material('madera', (0.35, 0.22, 0.13), rough=0.7),
    )


def biped_body(b, m, k, width=1.0, boots='hair', head_scale=1.0, shirt=None, legs=None):
    """Tronco, cabeza y miembros comunes (mismo esqueleto visual que los demas
    humanoides; `shirt`/`legs` cambian el material de camisa y pantorrilla)."""
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


def cara(b, m, k, hz, ojos=None):
    """Cejas, nariz y boca simples para que la cara no sea una pelota lisa."""
    ojos = ojos or m['gear']
    for x in (-1, 1):
        b.blob((x * 0.055 * k, -0.14 * k, hz + 0.03 * k), (0.022 * k, 0.012 * k, 0.022 * k), ojos, 'head', subdiv=1)
        b.box((x * 0.058 * k, -0.152 * k, hz + 0.055 * k), (0.026 * k, 0.006 * k, 0.008 * k), m['hair'], 'head')
    b.tube((0, -0.15 * k, hz + 0.005 * k), (0, -0.185 * k, hz - 0.02 * k), 0.03 * k, 0.016 * k, m['skin'], 'head', sides=4, flat=0.7)
    b.box((0, -0.158 * k, hz - 0.06 * k), (0.055 * k, 0.006 * k, 0.010 * k), m['hair'], 'head')


# ---------------------------------------------------------------- pirata
def pirata():
    """Pirata de Isla Colón: flaco y agil, camisa de manta remangada, pantalon
    arrecifeado, pañuelo rojo anudado con la punta atras, cinturon de cuero con
    talega, un cuchillo de lanza en la derecha y otro entre los dientes del
    cinturon. Dispara (tira) cuchillos, no arco."""
    scene = fg.reset()
    m = mats()
    m['cloth'] = fg.material('cloth', (0.80, 0.74, 0.60))   # manta cruda
    m['trim'] = fg.material('trim', (0.62, 0.24, 0.18))     # panuelo y faja rojos
    m['gear'] = fg.material('gear', (0.34, 0.26, 0.20), rough=0.65)  # cuero
    k = 0.86
    rig = fg_rig.Rig(scene, 'FG_Pirata', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, boots='gear', shirt=m['cloth'], legs=m['wood'])
    hz = 1.47 * k
    cara(b, m, k, hz)
    # Pañuelo: cinta que envuelve la frente y cruza atras, con la punta suelta.
    b.tube((0, 0.01 * k, hz + 0.09 * k), (0, 0.02 * k, hz + 0.115 * k), 0.165 * k, 0.165 * k, m['trim'], 'head', sides=9)
    b.tube((0, 0.01 * k, hz + 0.075 * k), (0, 0.02 * k, hz + 0.10 * k), 0.172 * k, 0.17 * k, m['trim'], 'head', sides=9)
    b.tube((0, 0.13 * k, hz + 0.09 * k), (0.02 * k, 0.30 * k, hz - 0.02 * k), 0.045 * k, 0.012 * k, m['trim'], 'head', sides=4)
    # Camisa abierta: solapa en V que deja pecho.
    b.tube((0, -0.05 * k, 1.30 * k), (0, -0.13 * k, 1.12 * k), 0.10 * k, 0.06 * k, m['cloth'], 'chest', sides=5, flat=0.55)
    # Remangado: bocina de tela sobre el brazo y antebrazo desnudo ya puesto.
    for s, x in (('L', 1), ('R', -1)):
        b.tube((0.245 * x * k, 0, 1.12 * k), (0.255 * x * k, 0, 1.04 * k), 0.062 * k, 0.055 * k, m['cloth'], f'upperArm{s}', sides=5)
    # Faja roja anudada a la cadera con cabos colgando.
    b.tube((0.14 * k, -0.06 * k, 0.98 * k), (0.24 * k, -0.13 * k, 0.70 * k), 0.02 * k, 0.012 * k, m['trim'], 'hips', sides=4)
    b.tube((0.17 * k, -0.08 * k, 0.95 * k), (0.30 * k, -0.10 * k, 0.74 * k), 0.018 * k, 0.010 * k, m['trim'], 'hips', sides=4)
    # Talega al cinto.
    b.blob((0.16 * k, 0.10 * k, 0.90 * k), (0.055 * k, 0.04 * k, 0.07 * k), m['gear'], 'hips', subdiv=1)
    # Cuchillo de lanza en la derecha: mango corto, hoja recta hacia atras.
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2 + 0.03 * k), (hx, hy - 0.02 * k, hz2 + 0.15 * k), 0.016 * k, 0.014 * k, m['wood'], 'handR', sides=4)
    b.tube((hx, hy - 0.02 * k, hz2 + 0.16 * k), (hx, hy - 0.05 * k, hz2 + 0.40 * k), 0.014 * k, 0.003 * k, m['gear'], 'handR', sides=4)
    # Segundo cuchillon asomando del cinturon.
    b.tube((-0.10 * k, -0.10 * k, 0.99 * k), (-0.12 * k, -0.14 * k, 1.10 * k), 0.012 * k, 0.004 * k, m['gear'], 'hips', sides=4)
    # Calcetas dobladas sobre el pantalon arrecifeado.
    for s, x in (('L', 1), ('R', -1)):
        b.tube((0.1 * x * k, 0, 0.30 * k), (0.1 * x * k, 0, 0.20 * k), 0.058 * k, 0.05 * k, m['cloth'], f'shin{s}', sides=5)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    rig.clip('Disparar', [
        (1, p()),
        (7, p(chest=(0, 0, 14), head=(0, 0, 8), upperArmR=(30, -20, 0), foreArmR=(-95, 0, 0),
              upperArmL=(-40, 20, 0), foreArmL=(-40, 0, 0), thighL=(-8, 0, 0)), (0, 0.02, 0)),
        (12, p(chest=(0, 0, -26), head=(0, 0, -10), upperArmR=(-125, -8, 0), foreArmR=(-6, 0, 0),
               upperArmL=(-18, 30, 0), foreArmL=(-30, 0, 0), thighL=(-16, 0, 0), thighR=(10, 0, 0)), (0, -0.04, 0.01)),
        (14, p(chest=(2, 0, -30), head=(2, 0, -12), upperArmR=(-138, -6, 0), foreArmR=(0, 0, 0),
               upperArmL=(-14, 30, 0), foreArmL=(-28, 0, 0), thighL=(-18, 0, 0), thighR=(12, 0, 0)), (0, -0.07, 0)),
        (24, p()),
    ])
    rig.export('pirata_bocanas.glb')


# ---------------------------------------------------------------- capitan
def capitan():
    """Capitan Calipso: ancho, levita larga color calipso oscuro con galones
    dorados, hombreras, tricornio, barba entrecana y alfanje. Elite bruto:
    mandoble largo con la firma del acero."""
    scene = fg.reset()
    m = mats()
    m['cloth'] = fg.material('cloth', (0.22, 0.16, 0.30))   # levita azul-uva
    m['trim'] = fg.material('trim', (0.80, 0.66, 0.28))     # galones de oro
    m['hair'] = fg.material('hair', (0.24, 0.20, 0.18))     # barba entrecana
    m['gear'] = fg.material('gear', (0.52, 0.53, 0.56), rough=0.4)  # acero
    k = 1.0
    rig = fg_rig.Rig(scene, 'FG_Capitan', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=1.16, boots='gear')
    hz = 1.47 * k
    cara(b, m, k, hz, ojos=m['trim'])
    # Barba: manto hasta el pecho, bigote y entrada de pelo bajo el labio.
    b.tube((0, -0.06 * k, hz - 0.02 * k), (0, -0.11 * k, hz - 0.26 * k), 0.12 * k, 0.05 * k, m['hair'], 'head', sides=6, flat=0.75)
    b.box((0, -0.155 * k, hz - 0.045 * k), (0.10 * k, 0.012 * k, 0.016 * k), m['hair'], 'head')
    # Tricornio: copa baja y alas en tres picos sobre la barba.
    b.tube((0, 0.01 * k, hz + 0.13 * k), (0, 0.01 * k, hz + 0.22 * k), 0.185 * k, 0.15 * k, m['cloth'], 'head', sides=8)
    for a0 in (90, 210, 330):
        pts = []
        for i in range(7):
            a = math.radians(a0 - 42 + i * 14)
            rr = 0.14 + 0.15 * math.sin(math.pi * i / 6)
            pts.append((rr * math.cos(a), rr * math.sin(a)))
        prev = None
        for (px, py) in pts:
            q = (px * k, py * k + 0.01 * k, hz + (0.145 - 0.02 * (1 if py > 0 else 0.3)) * k)
            if prev:
                b.tube(prev, q, 0.032 * k, 0.032 * k, m['cloth'], 'head', sides=4)
            prev = q
    b.box((0, -0.145 * k, hz + 0.17 * k), (0.045 * k, 0.02 * k, 0.04 * k), m['trim'], 'head')  # escarapela
    # Solapas y pechera clara de la levita abierta.
    b.tube((0, -0.05 * k, 1.32 * k), (0, -0.145 * k, 1.10 * k), 0.11 * k, 0.075 * k, m['trim'], 'chest', sides=5, flat=0.5)
    for x in (-1, 1):
        b.tube((0.10 * x * k, -0.115 * k, 1.30 * k), (0.16 * x * k, -0.10 * k, 1.05 * k), 0.028 * k, 0.022 * k, m['trim'], 'chest', sides=4)
    # Faldones de la levita: trapecios hasta la rodilla, con abertura atras.
    b.tube((0, 0, 0.98 * k), (0, 0.02 * k, 0.40 * k), 0.24 * k, 0.36 * k, m['cloth'], 'hips', sides=9, flat=0.8)
    b.tube((0, 0.06 * k, 0.92 * k), (0, 0.12 * k, 0.42 * k), 0.20 * k, 0.32 * k, m['cloth'], 'hips', sides=7, flat=0.9)
    # Punteras doradas de los faldones.
    b.tube((0, 0.015 * k, 0.46 * k), (0, 0.025 * k, 0.40 * k), 0.355 * k, 0.365 * k, m['trim'], 'hips', sides=9, flat=0.82)
    # Hombreras con fleco.
    for s, x in (('L', 1), ('R', -1)):
        b.tube((0.215 * x * k, 0, 1.30 * k), (0.27 * x * k, 0, 1.255 * k), 0.085 * k, 0.075 * k, m['cloth'], f'upperArm{s}', sides=6, flat=0.6)
        b.box((0.252 * x * k, 0, 1.225 * k), (0.075 * k, 0.11 * k, 0.045 * k), m['trim'], f'upperArm{s}')
        for yy in (-0.04, 0.0, 0.04):
            b.tube((0.255 * x * k, yy * k, 1.21 * k), (0.258 * x * k, yy * k, 1.15 * k), 0.007 * k, 0.005 * k, m['trim'], f'upperArm{s}', sides=3)
    # Cinturon ancho con hebilla.
    b.tube((0, 0, 0.99 * k), (0, 0, 0.93 * k), 0.245 * k, 0.245 * k, m['gear'], 'hips', sides=9, flat=0.75)
    b.box((0, -0.21 * k, 0.96 * k), (0.06 * k, 0.02 * k, 0.055 * k), m['trim'], 'hips')
    # Alfanje en la derecha: guarda en D y hoja ancha curva.
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2 - 0.02 * k), (hx, hy, hz2 + 0.12 * k), 0.020 * k, 0.017 * k, m['wood'], 'handR', sides=4)
    b.tube((hx, hy + 0.02 * k, hz2 + 0.12 * k), (hx, hy - 0.06 * k, hz2 + 0.12 * k), 0.010 * k, 0.010 * k, m['trim'], 'handR', sides=4)
    hoja = [(hx, hy - 0.03 * k, hz2 + 0.14 * k), (hx + 0.01 * k, hy - 0.09 * k, hz2 + 0.40 * k),
            (hx + 0.015 * k, hy - 0.17 * k, hz2 + 0.60 * k), (hx + 0.01 * k, hy - 0.26 * k, hz2 + 0.72 * k)]
    prev = None
    for q in hoja:
        if prev:
            b.tube(prev, q, 0.026 * k, 0.010 * k, m['gear'], 'handR', sides=4, flat=0.35)
        prev = q
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    rig.clip('Atacar', [
        (1, p()),
        (8, p(chest=(4, 0, 26), head=(0, 0, 14), upperArmR=(48, -30, 0), foreArmR=(-110, 0, 0),
              upperArmL=(-30, 26, 0), foreArmL=(-50, 0, 0), thighR=(10, 0, 0)), (0, 0.03, 0)),
        (13, p(chest=(-8, 0, -34), head=(-4, 0, -14), upperArmR=(-96, -18, 0), foreArmR=(-14, 0, 0),
               upperArmL=(-8, -22, 0), foreArmL=(-16, 0, 0), thighL=(-20, 0, 0), thighR=(14, 0, 0)), (0, -0.06, -0.01)),
        (15, p(chest=(-10, 0, -40), head=(-6, 0, -16), upperArmR=(-118, -12, 0), foreArmR=(0, 0, 0),
               upperArmL=(-6, -24, 0), foreArmL=(-14, 0, 0), thighL=(-24, 0, 0), thighR=(16, 0, 0)), (0, -0.09, -0.02)),
        (26, p()),
    ])
    rig.export('capitan_calipso.glb')


# ---------------------------------------------------------------- ahogado
def ahogado():
    """Marinero Ahogado de la marea baja: cadaver verdoso jorobado, harapos de
    camisa y pantalon de marino, cabos y algas colgando, un anzuelo oxidado
    prendido al hombro. Arana con las dos manos; al morir se hunde como si
    volviera al agua."""
    scene = fg.reset()
    m = mats()
    m['skin'] = fg.material('skin', (0.42, 0.55, 0.48))     # verdoso de ahogado
    m['cloth'] = fg.material('cloth', (0.34, 0.36, 0.30))   # rayas desteuidas
    m['trim'] = fg.material('trim', (0.50, 0.44, 0.32))     # lino viejo
    m['hair'] = fg.material('hair', (0.16, 0.22, 0.18))     # pelo mojado
    m['gear'] = fg.material('gear', (0.36, 0.30, 0.24), rough=0.85)  # cabo y oxido
    k = 0.94
    rig = fg_rig.Rig(scene, 'FG_Ahogado', fg_rig.biped_bones(k))

    # Joroba permanente: extra inclina el tronco en todos los clips comunes.
    def chorrera(f):
        t = 1.0
        return dict(spine=(9 * t, 0, 0), chest=(7 * t, 0, 0), head=(-10 * t, 0, 0))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=0.96, boots='gear', shirt=m['cloth'], legs=m['cloth'])
    hz = 1.47 * k
    cara(b, m, k, hz, ojos=m['hair'])
    # Joroba de carne sobre la espalda y costillas marcadas.
    b.blob((0, 0.13 * k, 1.24 * k), (0.13 * k, 0.07 * k, 0.11 * k), m['cloth'], 'chest', subdiv=1)
    for z in (1.20, 1.12, 1.04):
        b.tube((-0.13 * k, -0.125 * k, z * k), (0.13 * k, -0.125 * k, (z - 0.02) * k), 0.012 * k, 0.012 * k, m['trim'], 'chest', sides=3)
    # Harapos: faldita de camisa deshilachada con tres picos y un cabito.
    b.tube((0, 0, 0.94 * k), (0, 0.01 * k, 0.62 * k), 0.21 * k, 0.27 * k, m['cloth'], 'hips', sides=8, flat=0.85)
    for x, z in ((-0.16, 0.44), (0.02, 0.36), (0.18, 0.50)):
        b.poly([(x * k - 0.05 * k, -0.16 * k, 0.62 * k), (x * k + 0.05 * k, -0.16 * k, 0.62 * k), (x * k, -0.17 * k, z * k)],
               [(x * k - 0.05 * k, -0.10 * k, 0.62 * k), (x * k + 0.05 * k, -0.10 * k, 0.62 * k), (x * k, -0.11 * k, z * k)],
               m['trim'], 'hips')
    b.tube((0.05 * k, 0.18 * k, 0.70 * k), (0.10 * k, 0.24 * k, 0.44 * k), 0.012 * k, 0.006 * k, m['gear'], 'hips', sides=3)
    # Algas y cabos colgando de hombro y cadera.
    for (x0, y0, z0, dx, l) in ((-0.20, -0.05, 1.22, -0.05, 0.30), (0.21, 0.05, 1.20, 0.06, 0.24),
                                (-0.12, 0.16, 0.92, -0.08, 0.26), (0.10, -0.14, 0.90, 0.05, 0.20)):
        prev = None
        for i in range(5):
            q = ((x0 + dx * (i / 4) + 0.02 * math.sin(i * 1.7)) * k,
                 (y0 + 0.03 * math.cos(i * 2.1)) * k,
                 (z0 - l * i / 4) * k)
            if prev:
                b.tube(prev, q, 0.010 * k, 0.005 * k, m['hair'], 'hips' if z0 < 1.0 else 'chest', sides=3)
            prev = q
    # Anzuelo oxidado prendido al hombron izquierdo.
    b.tube((0.17 * k, -0.03 * k, 1.28 * k), (0.25 * k, -0.05 * k, 1.20 * k), 0.011 * k, 0.009 * k, m['gear'], 'upperArmL', sides=4)
    b.tube((0.25 * k, -0.05 * k, 1.20 * k), (0.235 * k, -0.09 * k, 1.14 * k), 0.009 * k, 0.006 * k, m['gear'], 'upperArmL', sides=4)
    # Gorro de marino calado hacia un lado.
    b.tube((0, 0.02 * k, hz + 0.10 * k), (-0.05 * k, 0.02 * k, hz + 0.21 * k), 0.185 * k, 0.12 * k, m['trim'], 'head', sides=8)
    b.tube((0, 0.02 * k, hz + 0.095 * k), (-0.045 * k, 0.02 * k, hz + 0.115 * k), 0.195 * k, 0.19 * k, m['cloth'], 'head', sides=8)
    # Garras: dedos huesudos alargados.
    for s, x in (('L', 1), ('R', -1)):
        for d in (-1, 0, 1):
            b.tube(((0.27 + 0.012 * d) * x * k, -0.055 * k, 0.755 * k),
                   ((0.29 + 0.02 * d) * x * k, -0.105 * k, 0.675 * k), 0.010 * k, 0.003 * k, m['skin'], f'hand{s}', sides=3)
    rig.part(b)
    fg_rig.biped_clips(rig, k, extra=chorrera)
    rig.clip('Atacar', [
        (1, {**p(), **chorrera(1)}),
        (7, {**p(chest=(0, 0, 0), upperArmR=(20, -30, 0), upperArmL=(20, 30, 0), foreArmR=(-60, 0, 0), foreArmL=(-60, 0, 0), head=(-8, 0, 0)), **chorrera(7)}),
        (12, {**p(chest=(-16, 0, 0), upperArmR=(-108, 26, 0), upperArmL=(-108, -26, 0), foreArmR=(-24, 0, 0), foreArmL=(-24, 0, 0), head=(10, 0, 0), thighL=(-10, 0, 0)), **chorrera(12)}, (0, -0.05, 0.02)),
        (14, {**p(chest=(-20, 0, 0), upperArmR=(-58, 40, 0), upperArmL=(-58, -40, 0), foreArmR=(-70, 0, 0), foreArmL=(-70, 0, 0), head=(12, 0, 0), thighL=(-16, 0, 0)), **chorrera(14)}, (0, -0.08, 0)),
        (24, {**p(), **chorrera(1)}),
    ])
    rig.export('marinero_ahogado.glb')


pirata()
capitan()
ahogado()

try:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'arte', 'blender', 'gente_del_mar.blend'))
except Exception as e:  # noqa: BLE001
    print(' blend no salvo:', e)
print(' gente_del_mar: pirata_bocanas.glb, capitan_calipso.glb, marinero_ahogado.glb')
