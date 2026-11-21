# Gente del cafetal y la fresera (OMP-FA-16): los tres humanoides de los
# cerros que hoy son el personaje y el arquero tenidos — Recolector de Café
# Rabioso (boquete_picker), Capataz del Cafetal (boquete_foreman) y Fresero
# Francotirador (cerropunta_farmer).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/gente_del_cafe.py
# Los dos brutos van sobre el rig humano comun (fg_rig.biped_bones) con los
# seis clips comunes y `Atacar` de machetazo; el fresero es ranged: mismos
# seis clips y `Disparar` con su escopeta de fresa. Ropa campesana escrita
# desde cero: el recolector con costal de café al hombro y zurriago; el
# capataz ancho de sombrero de ala chata, reloj de cadena al vientre y
# garrote; el francotirador de Cerro Punta con cachucha de lana, bufanda
# larga y una escopeta de palo apoyada en la cadera, coldre de fresas al
# pecho como cartuchera.
# Escribe assets/models/{recolector_cafe,capataz_cafetal,fresero_tirador}.glb.
# Clean-room, desde cero. No toca data/ ni src/.
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


def biped_body(b, m, k, width=1.0, boots='hair', head=1.0, shirt=None, legs=None):
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
    b.blob((0, 0, 1.47 * k), (0.15 * head * k, 0.15 * head * k, 0.17 * head * k), m['skin'], 'head')
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
            b.box((x * 0.058 * k, -0.140 * k, hz + 0.052 * k), (0.026 * k, 0.012 * k, 0.008 * k), m['hair'], 'head')
    b.tube((0, -0.15 * k, hz + 0.005 * k), (0, -0.185 * k, hz - 0.02 * k), 0.03 * k, 0.016 * k, m['skin'], 'head', sides=4, flat=0.7)
    b.box((0, -0.146 * k, hz - 0.062 * k), (0.055 * k, 0.012 * k, 0.009 * k), m['hair'], 'head')


def machetazo(rig, extra=None):
    """Atacar de brute del cafetal: machete atrás y tajada de lado."""
    def e(f, pose, off=None):
        pp = {**pose, **extra(f)} if extra else pose
        return (f, pp) + ((off,) if off else ())
    rig.clip('Atacar', [
        e(1, p()),
        e(7, p(chest=(6, 0, 26), head=(0, 0, 12), upperArmR=(52, -34, 0), foreArmR=(-120, 0, 0),
              upperArmL=(-26, 22, 0), foreArmL=(-46, 0, 0), thighR=(8, 0, 0)), (0, 0.03, 0)),
        e(12, p(chest=(-10, 0, -38), head=(-4, 0, -16), upperArmR=(-104, -14, 0), foreArmR=(-8, 0, 0),
               upperArmL=(-6, -24, 0), foreArmL=(-12, 0, 0), thighL=(-22, 0, 0), thighR=(12, 0, 0)), (0, -0.05, -0.01)),
        e(15, p(chest=(-12, 0, -42), head=(-6, 0, -18), upperArmR=(-118, -10, 0), foreArmR=(2, 0, 0),
               upperArmL=(-4, -26, 0), foreArmL=(-10, 0, 0), thighL=(-26, 0, 0), thighR=(14, 0, 0)), (0, -0.08, -0.02)),
        e(26, p()),
    ])


# ---------------------------------------------------------------- recolector de cafe
def recolector_cafe():
    """Recolector de Café Rabioso de Boquete: flaco y nervioso, camisa arremangada
    color tierra, pantalón recogido con polainas, sombrero pelao de paja, costal
    de cerezas al hombro izquierdo con granos regados y un zurriago en la derecha.
    Ataca de fustazo. (boquete_picker, brute, look café 0.45/0.3/0.2.)"""
    scene = fg.reset()
    m = mats({'skin': (0.60, 0.44, 0.30), 'cloth': (0.48, 0.32, 0.20), 'trim': (0.82, 0.72, 0.48),
              'hair': (0.16, 0.12, 0.09), 'gear': (0.42, 0.30, 0.18), 'halo': (0.75, 0.20, 0.15)})
    k = 0.97
    rig = fg_rig.Rig(scene, 'FG_Recolector', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=0.94, boots='gear')
    hz = 1.47 * k
    cara(b, m, k, hz)
    # Ceño rabioso: cejas torcidas hacia el centro.
    for x in (-1, 1):
        b.box((x * 0.055 * k, -0.142 * k, hz + 0.058 * k), (0.028 * k, 0.012 * k, 0.009 * k), m['hair'], 'head',
              rot=(math.radians(-16 * x), 'Y'))
    # Sombrero pelao de paja: calota baja y ala chata.
    b.tube((0, 0.01 * k, hz + 0.14 * k), (0, 0.01 * k, hz + 0.21 * k), 0.145 * k, 0.10 * k, m['trim'], 'head', sides=8)
    prev = None
    for i in range(11):
        t = 2 * math.pi * i / 10
        q = (0.235 * k * math.cos(t), 0.01 * k + 0.235 * k * math.sin(t), hz + 0.145 * k)
        if prev:
            b.tube(prev, q, 0.018 * k, 0.018 * k, m['trim'], 'head', sides=3)
        prev = q
    b.tube((0, 0.01 * k, hz + 0.145 * k), (0, 0.01 * k, hz + 0.168 * k), 0.152 * k, 0.152 * k, m['cloth'], 'head', sides=8)
    # Camisa arremangada: manga hasta el codo ya en el cuerpo; faja ruana.
    b.tube((0, 0, 1.0 * k), (0, 0.01 * k, 0.93 * k), 0.175 * k, 0.19 * k, m['gear'], 'hips', sides=7, flat=0.75)
    # Polainas: vuelta clara de la pantorrilla al tobillo.
    for s, x in (('L', 1), ('R', -1)):
        b.tube((x * 0.1 * k, 0, 0.32 * k), (x * 0.1 * k, 0, 0.12 * k), 0.062 * k, 0.05 * k, m['trim'], f'shin{s}', sides=5)
    # Costal de cerezas al hombro izquierdo, cruzado por la espalda.
    b.blob((0.24 * k, 0.10 * k, 1.24 * k), (0.11 * k, 0.10 * k, 0.15 * k), m['trim'], 'chest', subdiv=1)
    b.tube((0.24 * k, 0.10 * k, 1.36 * k), (0.26 * k, 0.12 * k, 1.40 * k), 0.05 * k, 0.03 * k, m['gear'], 'chest', sides=4)
    b.tube((-0.14 * k, 0.10 * k, 1.32 * k), (0.16 * k, 0.13 * k, 1.20 * k), 0.018 * k, 0.018 * k, m['hair'], 'chest', sides=3)
    for (gx, gy, gz) in ((0.22, 0.05, 1.39), (0.26, 0.12, 1.40), (0.24, 0.08, 1.42)):
        b.blob((gx * k, gy * k, gz * k), (0.020 * k,) * 3, m['halo'], 'chest', subdiv=0)
    # Zurriago en la derecha: cabo y latigo curvo.
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2 + 0.12 * k), (hx, hy + 0.02 * k, hz2 - 0.06 * k), 0.016 * k, 0.013 * k, m['wood'], 'handR', sides=4)
    b.tube((hx, hy + 0.02 * k, hz2 - 0.06 * k), (hx - 0.02 * k, hy + 0.12 * k, hz2 - 0.22 * k), 0.011 * k, 0.005 * k, m['hair'], 'handR', sides=3)
    b.tube((hx - 0.02 * k, hy + 0.12 * k, hz2 - 0.22 * k), (hx, hy + 0.20 * k, hz2 - 0.30 * k), 0.005 * k, 0.003 * k, m['hair'], 'handR', sides=3)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    machetazo(rig)
    rig.export('recolector_cafe.glb')


# ---------------------------------------------------------------- capataz del cafetal
def capataz_cafetal():
    """Capataz del Cafetal de Boquete: ancho y satisfecho, levita corta de
    caporal color vino, camisa clara, reloj de cadena colgando al vientre,
    sombrero pintado de ala chata, bigote negro y garrote de guayacán a la
    derecha. Elite: más triángulos y postura de manos en jarras en el Reposo.
    (boquete_foreman, eliteBrute, look vino 0.35/0.2.)"""
    scene = fg.reset()
    m = mats({'skin': (0.64, 0.48, 0.34), 'cloth': (0.42, 0.16, 0.18), 'trim': (0.86, 0.78, 0.55),
              'hair': (0.12, 0.10, 0.08), 'gear': (0.30, 0.22, 0.16), 'halo': (0.9, 0.78, 0.35)})
    k = 1.05
    rig = fg_rig.Rig(scene, 'FG_Capataz', fg_rig.biped_bones(k))

    def jarras(f):
        # codos fuera, manos a la cintura en Reposo (postura de mando fija)
        t = f % 61
        sw = math.sin(t / 61 * 2 * math.pi)
        return dict(upperArmL=(6, 46 + 3 * sw, 0), foreArmL=(38, 0, 18),
                    upperArmR=(6, -46 - 3 * sw, 0), foreArmR=(38, 0, -18))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=1.22, boots='gear', legs=m['hair'])
    hz = 1.47 * k
    cara(b, m, k, hz)
    # Bigote negro ancho sobre la boca.
    b.box((0, -0.162 * k, hz - 0.038 * k), (0.10 * k, 0.010 * k, 0.016 * k), m['hair'], 'head')
    # Levita de caporal: faldón corto hasta media rodilla con vuelta clara.
    b.tube((0, 0, 0.98 * k), (0, 0.01 * k, 0.52 * k), 0.21 * k, 0.30 * k, m['cloth'], 'hips', sides=9, flat=0.8)
    b.tube((0, 0, 0.58 * k), (0, 0.01 * k, 0.52 * k), 0.295 * k, 0.305 * k, m['trim'], 'hips', sides=9, flat=0.8)
    # Peto abierto con camisa clara y tres botones de oro.
    b.poly([(-0.19 * k, -0.135 * k, 1.30 * k), (-0.06 * k, -0.148 * k, 1.28 * k), (-0.06 * k, -0.148 * k, 1.0 * k), (-0.19 * k, -0.135 * k, 1.0 * k)],
           [(-0.15 * k, -0.128 * k, 1.30 * k), (-0.09 * k, -0.142 * k, 1.28 * k), (-0.09 * k, -0.142 * k, 1.0 * k), (-0.15 * k, -0.128 * k, 1.0 * k)], m['trim'], 'chest')
    b.poly([(0.19 * k, -0.135 * k, 1.30 * k), (0.06 * k, -0.148 * k, 1.28 * k), (0.06 * k, -0.148 * k, 1.0 * k), (0.19 * k, -0.135 * k, 1.0 * k)],
           [(0.15 * k, -0.128 * k, 1.30 * k), (0.09 * k, -0.142 * k, 1.28 * k), (0.09 * k, -0.142 * k, 1.0 * k), (0.15 * k, -0.128 * k, 1.0 * k)], m['trim'], 'chest')
    for z in (1.24, 1.14, 1.04):
        b.blob((0, -0.168 * k, z * k), (0.014 * k, 0.010 * k, 0.014 * k), m['halo'], 'chest', subdiv=0)
    # Reloj de cadena al vientre: arco de cordel y esfera.
    b.tube((-0.08 * k, -0.20 * k, 0.99 * k), (0.06 * k, -0.21 * k, 0.90 * k), 0.008 * k, 0.008 * k, m['halo'], 'hips', sides=3)
    b.blob((0.08 * k, -0.225 * k, 0.89 * k), (0.024 * k, 0.014 * k, 0.024 * k), m['halo'], 'hips', subdiv=1)
    # Hombreras doradas de caporal.
    for s, x in (('L', 1), ('R', -1)):
        b.tube((x * 0.185 * k, 0, 1.31 * k), (x * 0.245 * k, 0, 1.29 * k), 0.058 * k, 0.05 * k, m['trim'], f'upperArm{s}', sides=5)
    # Sombrero pintado de ala chata: copa alta con cintillo y dos vueltas.
    b.tube((0, 0.01 * k, hz + 0.15 * k), (0, 0.01 * k, hz + 0.27 * k), 0.155 * k, 0.125 * k, m['trim'], 'head', sides=8)
    b.tube((0, 0.01 * k, hz + 0.16 * k), (0, 0.01 * k, hz + 0.20 * k), 0.163 * k, 0.163 * k, m['cloth'], 'head', sides=8)
    prev = None
    for i in range(11):
        t = 2 * math.pi * i / 10
        q = (0.25 * k * math.cos(t), 0.01 * k + 0.245 * k * math.sin(t), hz + 0.152 * k)
        if prev:
            b.tube(prev, q, 0.02 * k, 0.02 * k, m['trim'], 'head', sides=4)
        prev = q
    # Garrote de guayacán a la derecha, engrosado al puño.
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2 - 0.10 * k), (hx - 0.01 * k, hy, hz2 + 0.62 * k), 0.022 * k, 0.032 * k, m['wood'], 'handR', sides=5)
    b.tube((hx - 0.01 * k, hy, hz2 + 0.48 * k), (hx - 0.01 * k, hy, hz2 + 0.60 * k), 0.036 * k, 0.03 * k, m['wood'], 'handR', sides=5)
    rig.part(b)
    fg_rig.biped_clips(rig, k, extra=jarras)
    machetazo(rig)
    rig.export('capataz_cafetal.glb')


# ---------------------------------------------------------------- fresero francotirador
def fresero_tirador():
    """Fresero Francotirador de Cerro Punta: flaco de neblina, cachucha de lana
    gris, bufanda larga ondeando, gabardina corta de campo y coldre de fresas
    rojas al pecho como cartuchera; escopeta de palo apoyada en el hombro con
    la que apunta a lo lejos. (cerropunta_farmer, ranged, look fresa
    0.8/0.2/0.25.)"""
    scene = fg.reset()
    m = mats({'skin': (0.66, 0.52, 0.42), 'cloth': (0.38, 0.40, 0.44), 'trim': (0.80, 0.83, 0.86),
              'hair': (0.22, 0.20, 0.18), 'gear': (0.30, 0.26, 0.22), 'halo': (0.80, 0.20, 0.25)})
    k = 0.99
    rig = fg_rig.Rig(scene, 'FG_Fresero', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=0.92, boots='gear')
    hz = 1.47 * k
    cara(b, m, k, hz, ojos=m['trim'])
    # Cachucha de lana con visera y pompón atrás.
    b.tube((0, 0.01 * k, hz + 0.12 * k), (0, 0.02 * k, hz + 0.22 * k), 0.16 * k, 0.10 * k, m['cloth'], 'head', sides=7)
    b.box((0, -0.13 * k, hz + 0.125 * k), (0.15 * k, 0.08 * k, 0.018 * k), m['cloth'], 'head')
    b.blob((0, 0.14 * k, hz + 0.14 * k), (0.045 * k,) * 3, m['trim'], 'head', subdiv=1)
    # Bufanda larga anudada al cuello, cola ondeando a la izquierda.
    b.tube((0, 0, hz - 0.17 * k), (0, 0.01 * k, hz - 0.24 * k), 0.115 * k, 0.11 * k, m['trim'], 'head', sides=6)
    b.tube((0.06 * k, 0.06 * k, hz - 0.20 * k), (0.16 * k, 0.16 * k, hz - 0.44 * k), 0.045 * k, 0.028 * k, m['trim'], 'chest', sides=4)
    b.tube((0.16 * k, 0.16 * k, hz - 0.44 * k), (0.20 * k, 0.24 * k, hz - 0.60 * k), 0.028 * k, 0.016 * k, m['trim'], 'chest', sides=3)
    # Gabardina de campo hasta medio muslo con cuello subido.
    b.tube((0, 0, 0.99 * k), (0, 0.01 * k, 0.62 * k), 0.20 * k, 0.27 * k, m['cloth'], 'hips', sides=9, flat=0.78)
    b.poly([(-0.17 * k, -0.12 * k, 1.34 * k), (0.17 * k, -0.12 * k, 1.34 * k), (0.19 * k, -0.10 * k, 1.24 * k), (-0.19 * k, -0.10 * k, 1.24 * k)],
           [(-0.15 * k, 0.02 * k, 1.37 * k), (0.15 * k, 0.02 * k, 1.37 * k), (0.16 * k, 0.04 * k, 1.26 * k), (-0.16 * k, 0.04 * k, 1.26 * k)], m['cloth'], 'chest')
    # Coldre de fresas al pecho: correa cruzada y seis fresas con corona.
    b.tube((-0.16 * k, -0.115 * k, 1.26 * k), (0.16 * k, -0.125 * k, 1.0 * k), 0.018 * k, 0.018 * k, m['gear'], 'chest', sides=3)
    for i, t in enumerate((0.22, 0.42, 0.62, 0.82)):
        fx = (-0.17 + 0.34 * t) * k
        fz = (1.26 - 0.26 * t) * k
        b.blob((fx, -0.132 * k, fz - 0.045 * k), (0.022 * k, 0.018 * k, 0.026 * k), m['halo'], 'chest', subdiv=1)
        b.blob((fx, -0.132 * k, fz - 0.014 * k), (0.020 * k, 0.016 * k, 0.010 * k), m['cloth'], 'chest', subdiv=0)
    # Escopeta de palo: caño, caja y mira, apoyada al hombro derecho apuntando lejos.
    rig.clip('Disparar', [
        (1, p()),
        (7, p(chest=(0, 0, 16), head=(0, 0, 10), upperArmR=(26, -24, 0), foreArmR=(-98, 0, 0),
              upperArmL=(-44, 24, 0), foreArmL=(-38, 0, 0)), (0, 0.02, 0)),
        (12, p(chest=(0, 0, -24), head=(0, 0, -8), upperArmR=(-104, -10, 0), foreArmR=(-6, 0, 0),
               upperArmL=(-24, 26, 0), foreArmL=(-34, 0, 0), thighL=(-10, 0, 0)), (0, -0.03, 0)),
        (15, p(chest=(2, 0, -28), head=(2, 0, -10), upperArmR=(-122, -6, 0), foreArmR=(0, 0, 0),
               upperArmL=(-16, 28, 0), foreArmL=(-30, 0, 0), thighL=(-12, 0, 0), thighR=(8, 0, 0)), (0, -0.05, 0)),
        (24, p()),
    ])

    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    # El arma se engancha a handR: caño al frente, culata al hombro.
    b.tube((hx + 0.01 * k, hy - 0.04 * k, hz2 + 0.16 * k), (hx + 0.01 * k, hy - 0.04 * k, hz2 + 0.56 * k), 0.013 * k, 0.011 * k, m['gear'], 'handR', sides=4)
    b.tube((hx + 0.01 * k, hy - 0.04 * k, hz2 - 0.10 * k), (hx + 0.01 * k, hy - 0.04 * k, hz2 + 0.18 * k), 0.023 * k, 0.017 * k, m['wood'], 'handR', sides=4)
    b.box((hx + 0.01 * k, hy - 0.055 * k, hz2 + 0.19 * k), (0.010 * k, 0.020 * k, 0.05 * k), m['wood'], 'handR')
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    rig.export('fresero_tirador.glb')


recolector_cafe()
capataz_cafetal()
fresero_tirador()

try:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'arte', 'blender', 'gente_del_cafe.blend'))
except Exception as e:  # noqa: BLE001
    print(' blend no salvo:', e)
print(' gente_del_cafe: tres glbs')
