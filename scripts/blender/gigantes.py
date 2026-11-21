# Gigantes (OMP-FA-15): los tres humanoides enormes que hoy son el personaje
# genético a escala 1,25 — Abominable Turista del Barú (baru_yeti), Coloso del
# Embalse (fortuna_titan) y Ventarrón Andante (fortuna_gale).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/gigantes.py
# El yeti y el coloso van sobre el rig humano comun (fg_rig.biped_bones) con
# los seis clips comunes y `Atacar` de golpe de dos manos, como cripta_bruto,
# para no tocar los eventos de data/. El ventarron no tiene piernas: rig
# propio FG_Ventarron (hips, spine, chest, head, brazos y torbellino de tres
# tramos), y Caminar/Correr/Rodar se vuelven ondular y girar en el viento,
# como la sirena de FA-14. Cada silueta se distingue sin mirar el color: el
# yeti es una montania de piel con mochila de turista y sombrero; el coloso
# un bloque de hormigon con grietas que sangran agua y musgo en los hombros;
# el ventarron un embudo de nubes con brazos y hojas dando vueltas.
# Escribe assets/models/{yeti_baru,coloso_embalse,ventarron}.glb. Clean-room,
# desde cero. No toca data/ ni src/.
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


def biped_body(b, m, k, width=1.0, boots='hair', hands=None, head=1.0):
    """Cuerpo humanoide engrosado: mismo esqueleto, silueta de gigante."""
    def v(x, y, z):
        return (x * k, y * k, z * k)
    w = width * k
    hm = hands or m['skin']
    b.tube(v(0, 0, 0.8), v(0, 0, 0.98), 0.19 * w, 0.18 * w, m['cloth'], 'hips', sides=7, flat=0.72)
    b.tube(v(0, 0, 0.98), v(0, 0, 1.12), 0.18 * w, 0.21 * w, m['cloth'], 'spine', sides=7, flat=0.72)
    b.tube(v(0, 0, 1.12), v(0, 0, 1.32), 0.22 * w, 0.25 * w, m['cloth'], 'chest', sides=7, flat=0.7)
    b.box(v(0, 0, 0.95), (0.38 * w, 0.28 * w, 0.05 * k), m['trim'], 'hips')
    b.blob((0, 0, 1.44 * k), (0.15 * head * k, 0.15 * head * k, 0.16 * head * k), m['skin'], 'head')
    for s, x in (('L', 1), ('R', -1)):
        b.tube(v(0.21 * x, 0, 1.27), v(0.26 * x, 0, 1.03), 0.075 * w, 0.06 * w, m['cloth'], f'upperArm{s}', sides=5)
        b.tube(v(0.26 * x, 0, 1.05), v(0.27 * x, -0.03, 0.84), 0.06 * w, 0.05 * w, hm, f'foreArm{s}', sides=5)
        b.blob(v(0.27 * x, -0.04, 0.79), (0.06 * w, 0.06 * w, 0.07 * w), hm, f'hand{s}', subdiv=1)
        b.tube(v(0.095 * x, 0, 0.84), v(0.105 * x, 0, 0.46), 0.10 * w, 0.07 * w, m['cloth'], f'thigh{s}', sides=5)
        b.tube(v(0.105 * x, 0, 0.48), v(0.1 * x, 0, 0.1), 0.07 * w, 0.055 * w, m['cloth'], f'shin{s}', sides=5)
        b.box(v(0.1 * x, -0.05, 0.05), (0.11 * w, 0.26 * k, 0.1 * k), m[boots], f'foot{s}')


def cara_gigante(b, m, k, hz, ojos=None, s=1.0):
    ojos = ojos or m['glow']
    for x in (-1, 1):
        b.blob((x * 0.055 * s * k, -0.135 * s * k, hz + 0.02 * s * k), (0.024 * s * k, 0.012 * s * k, 0.024 * s * k), ojos, 'head', subdiv=1)
        b.box((x * 0.058 * s * k, -0.148 * s * k, hz + 0.06 * s * k), (0.03 * s * k, 0.008 * k, 0.011 * s * k), m['hair'], 'head')
    b.tube((0, -0.145 * s * k, hz), (0, -0.18 * s * k, hz - 0.025 * s * k), 0.032 * s * k, 0.018 * s * k, m['skin'], 'head', sides=4, flat=0.7)
    b.box((0, -0.152 * s * k, hz - 0.062 * s * k), (0.06 * s * k, 0.007 * k, 0.012 * s * k), m['hair'], 'head')


def golpedosmanos(rig, extra=None):
    """Atacar de brute: las dos manos arriba y martillazo al suelo."""
    def e(f, pose, off=None):
        pp = {**pose, **extra(f)} if extra else pose
        return (f, pp) + ((off,) if off else ())
    rig.clip('Atacar', [
        e(1, p()),
        e(8, p(chest=(14, 0, 0), head=(10, 0, 0), upperArmR=(-168, -14, 0), foreArmR=(-16, 0, 0),
               upperArmL=(-168, 14, 0), foreArmL=(-16, 0, 0)), (0, 0.02, 0.06)),
        e(12, p(chest=(-30, 0, 0), head=(-16, 0, 0), upperArmR=(-38, -8, 0), foreArmR=(-4, 0, 0),
               upperArmL=(-38, 8, 0), foreArmL=(-4, 0, 0), thighR=(14, 0, 0), thighL=(-16, 0, 0)), (0, -0.06, -0.10)),
        e(15, p(chest=(-34, 0, 0), head=(-18, 0, 0), upperArmR=(-30, -6, 0), foreArmR=(-2, 0, 0),
               upperArmL=(-30, 6, 0), foreArmL=(-2, 0, 0), thighR=(16, 0, 0), thighL=(-18, 0, 0)), (0, -0.06, -0.10)),
        e(28, p()),
    ])


# ---------------------------------------------------------------- yeti del Baru
def yeti_baru():
    """Abominable Turista del Baru: dos metros y medio de piel gris con el
    pelaje en mechones, cabeza hundida entre hombros, mochila roja de sendero
    con su rollo de sleeping y su cantimplora, gorro andino con orejeras y
    camara colgando al pecho. (baru_yeti, look gris 0.54.)"""
    scene = fg.reset()
    m = mats({'skin': (0.82, 0.84, 0.87), 'cloth': (0.74, 0.77, 0.82), 'trim': (0.95, 0.96, 0.98),
              'hair': (0.62, 0.66, 0.72), 'gear': (0.72, 0.30, 0.22), 'halo': (0.95, 0.75, 0.35)})
    k = 1.5
    rig = fg_rig.Rig(scene, 'FG_YetiBaru', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=1.42, boots='hair', hands=m['skin'], head=1.22)
    hz = 1.44 * k
    cara_gigante(b, m, k, hz, ojos=m['hair'], s=1.22)
    # Pelaje: mechones en V por todo el lomo, brazos y muslos (tarjetas baratas).
    for i, z in enumerate((1.30, 1.18, 1.06)):
        w = (0.26 + 0.03 * i) * k
        b.poly([(-w, 0.16 * k, z * k), (0, 0.20 * k, (z - 0.06) * k), (w, 0.16 * k, z * k)],
               [(-w, 0.10 * k, z * k), (0, 0.12 * k, (z - 0.07) * k), (w, 0.10 * k, z * k)], m['hair'], 'spine')
    # Mechones de brazo como tubos cortos (3 por brazo, sides=3).
    for s, x in (('L', 1), ('R', -1)):
        for z in (1.24, 1.14, 1.04):
            b.tube((0.24 * x * k, 0.05 * k, z * k), (0.31 * x * k, 0.09 * k, (z - 0.05) * k), 0.02 * k, 0.007 * k, m['hair'], f'upperArm{s}', sides=3)
        b.tube((0.10 * x * k, 0.08 * k, 0.72 * k), (0.14 * x * k, 0.13 * k, 0.60 * k), 0.024 * k, 0.008 * k, m['hair'], f'thigh{s}', sides=3)
    # Cabeza hundida: sin cuello, cresta de pelo sobre el craneo y barba.
    b.tube((0, -0.02 * k, hz + 0.10 * k), (0, 0.12 * k, hz + 0.14 * k), 0.185 * k, 0.17 * k, m['hair'], 'head', sides=6)
    b.blob((0, -0.11 * k, hz - 0.09 * k), (0.10 * k, 0.06 * k, 0.08 * k), m['trim'], 'head', subdiv=1)
    # Gorro andino con orejeras y pompón.
    b.tube((0, 0.01 * k, hz + 0.16 * k), (0, 0.02 * k, hz + 0.30 * k), 0.19 * k, 0.115 * k, m['gear'], 'head', sides=7)
    b.tube((0, 0.01 * k, hz + 0.195 * k), (0, 0.01 * k, hz + 0.25 * k), 0.212 * k, 0.212 * k, m['trim'], 'head', sides=7)
    for x in (-1, 1):
        b.tube((x * 0.165 * k, -0.02 * k, hz + 0.11 * k), (x * 0.195 * k, 0.0 * k, hz - 0.05 * k), 0.05 * k, 0.032 * k, m['gear'], 'head', sides=4)
    b.blob((0, 0.02 * k, hz + 0.34 * k), (0.055 * k,) * 3, m['trim'], 'head', subdiv=1)
    # Mochila de turista: bulto, tirantes al pecho, rollo arriba y cantimplora.
    b.tube((0, 0.25 * k, 1.26 * k), (0, 0.31 * k, 0.98 * k), 0.17 * k, 0.15 * k, m['gear'], 'chest', sides=7, flat=0.75)
    b.tube((0, 0.255 * k, 1.29 * k), (0, 0.255 * k, 1.345 * k), 0.145 * k, 0.10 * k, m['cloth'], 'chest', sides=6)
    b.tube((-0.10 * k, 0.31 * k, 1.24 * k), (0.10 * k, 0.31 * k, 1.24 * k), 0.03 * k, 0.03 * k, m['trim'], 'chest', sides=4)
    for x in (-1, 1):
        b.tube((x * 0.13 * k, -0.17 * k, 1.30 * k), (x * 0.10 * k, -0.19 * k, 1.08 * k), 0.028 * k, 0.028 * k, m['hair'], 'chest', sides=4)
    b.tube((0.26 * k, 0.20 * k, 1.18 * k), (0.30 * k, 0.20 * k, 1.00 * k), 0.05 * k, 0.05 * k, m['trim'], 'chest', sides=5)
    # Camara colgada al pecho con correa.
    b.tube((-0.10 * k, -0.19 * k, 1.28 * k), (0.02 * k, -0.225 * k, 1.10 * k), 0.014 * k, 0.014 * k, m['hair'], 'chest', sides=3)
    b.tube((0.04 * k, -0.20 * k, 1.28 * k), (0.02 * k, -0.235 * k, 1.10 * k), 0.014 * k, 0.014 * k, m['hair'], 'chest', sides=3)
    b.box((0.02 * k, -0.25 * k, 1.06 * k), (0.09 * k, 0.06 * k, 0.06 * k), m['hair'], 'chest')
    b.blob((0.02 * k, -0.29 * k, 1.055 * k), (0.025 * k, 0.02 * k, 0.025 * k), m['halo'], 'chest', subdiv=1)
    # Pies enormes de palmilla nevada.
    for x in (-1, 1):
        b.blob((x * 0.11 * k, -0.07 * k, 0.09 * k), (0.10 * k, 0.16 * k, 0.07 * k), m['trim'], f'foot{ "L" if x > 0 else "R"}', subdiv=1)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    golpedosmanos(rig)
    rig.export('yeti_baru.glb')


# ---------------------------------------------------------------- coloso del embalse
def coloso_embalse():
    """Coloso del Embalse: tres metros de hormigon de presa. Hombros de losa
    plana con musgo, grietas horizontales que rezuman agua azul, torso macizo
    de bloques encajados, cabeza un dado tallado con ojos de aliviadero.
    Los puños martillan como compuertas que caen. (fortuna_titan, look azul
    pizarra 0.35/0.4/0.5.)"""
    scene = fg.reset()
    m = mats({'skin': (0.42, 0.47, 0.56), 'cloth': (0.35, 0.40, 0.50), 'trim': (0.58, 0.63, 0.70),
              'hair': (0.22, 0.27, 0.24), 'gear': (0.30, 0.34, 0.42), 'halo': (0.35, 0.75, 0.95)})
    k = 1.72
    rig = fg_rig.Rig(scene, 'FG_ColosoEmbalse', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    # Torso de bloques: caja en vez de cilindros, canto vivo.
    b.box((0, 0, 0.90 * k), (0.44 * k, 0.30 * k, 0.22 * k), m['cloth'], 'hips')
    b.box((0, 0, 1.05 * k), (0.42 * k, 0.29 * k, 0.14 * k), m['trim'], 'spine')
    b.box((0, 0, 1.22 * k), (0.52 * k, 0.32 * k, 0.26 * k), m['cloth'], 'chest')
    # Juntas vistas entre bloques.
    b.box((0, -0.155 * k, 0.98 * k), (0.44 * k, 0.02 * k, 0.022 * k), m['hair'], 'spine')
    b.box((0, -0.155 * k, 1.10 * k), (0.50 * k, 0.02 * k, 0.022 * k), m['hair'], 'chest')
    # Grietas que rezuman: vetas en zigzag medio hundidas en la piedra.
    for (xa, za, x1, z1, x2, z2) in ((-0.20, 1.32, -0.08, 1.21, -0.16, 1.10), (0.06, 1.30, 0.17, 1.17, 0.08, 1.04)):
        b.tube((xa * k, -0.150 * k, za * k), (x1 * k, -0.152 * k, z1 * k), 0.018 * k, 0.012 * k, m['halo'], 'chest', sides=3)
        b.tube((x1 * k, -0.152 * k, z1 * k), (x2 * k, -0.150 * k, z2 * k), 0.012 * k, 0.007 * k, m['halo'], 'chest', sides=3)
    # Hombros de losa plana con caperuza de musgo.
    for s, x in (('L', 1), ('R', -1)):
        b.box((x * 0.30 * k, 0, 1.33 * k), (0.20 * k, 0.30 * k, 0.09 * k), m['trim'], f'upperArm{s}')
        b.box((x * 0.30 * k, 0.02 * k, 1.40 * k), (0.17 * k, 0.24 * k, 0.05 * k), m['hair'], f'upperArm{s}')
        b.tube((x * 0.25 * k, 0, 1.27 * k), (x * 0.26 * k, 0, 1.03 * k), 0.09 * k, 0.075 * k, m['cloth'], f'upperArm{s}', sides=5, flat=0.8)
        b.tube((x * 0.26 * k, 0, 1.05 * k), (x * 0.27 * k, -0.03, 0.84 * k), 0.075 * k, 0.07 * k, m['cloth'], f'foreArm{s}', sides=5, flat=0.8)
        b.box((x * 0.27 * k, -0.04 * k, 0.78 * k), (0.15 * k, 0.15 * k, 0.16 * k), m['trim'], f'hand{s}')
        b.tube((x * 0.095 * k, 0, 0.84 * k), (x * 0.105 * k, 0, 0.46 * k), 0.115 * k, 0.085 * k, m['cloth'], f'thigh{s}', sides=5, flat=0.8)
        b.box((x * 0.105 * k, 0, 0.65 * k), (0.14 * k, 0.19 * k, 0.024 * k), m['hair'], f'thigh{s}')
        b.tube((x * 0.1 * k, 0, 0.48 * k), (x * 0.1 * k, 0, 0.1 * k), 0.085 * k, 0.075 * k, m['cloth'], f'shin{s}', sides=5, flat=0.8)
        b.box((x * 0.1 * k, -0.05 * k, 0.05 * k), (0.15 * k, 0.27 * k, 0.11 * k), m['gear'], f'foot{s}')
    # Cabeza-dado con cejo saliente y ojos de aliviadero.
    hz = 1.44 * k
    b.box((0, 0, hz), (0.24 * k, 0.24 * k, 0.23 * k), m['trim'], 'head')
    b.box((0, -0.10 * k, hz + 0.08 * k), (0.26 * k, 0.07 * k, 0.05 * k), m['cloth'], 'head')
    for x in (-1, 1):
        b.box((x * 0.07 * k, -0.128 * k, hz + 0.01 * k), (0.055 * k, 0.02 * k, 0.035 * k), m['halo'], 'head')
    b.box((0, -0.126 * k, hz - 0.07 * k), (0.14 * k, 0.02 * k, 0.022 * k), m['gear'], 'head')
    # Musgo y juncos en la coronilla y en la junta del cinturon.
    for (cx, cy) in ((-0.06, 0.02), (0.05, -0.03), (0.0, 0.07)):
        b.tube((cx * k, cy * k, hz + 0.115 * k), ((cx + 0.03) * k, (cy - 0.02) * k, hz + 0.185 * k), 0.02 * k, 0.006 * k, m['hair'], 'head', sides=3)
    b.box((0, 0, 0.985 * k), (0.46 * k, 0.31 * k, 0.028 * k), m['hair'], 'hips')
    # Sedal colgando de las grietas del pecho (dos hilos de agua).
    for x in (-0.11, 0.09):
        b.tube((x * k, -0.17 * k, 1.06 * k), (x * k, -0.17 * k, 0.92 * k), 0.012 * k, 0.005 * k, m['halo'], 'hips', sides=3)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    golpedosmanos(rig)
    rig.export('coloso_embalse.glb')


# ---------------------------------------------------------------- ventarron andante
def ventarron():
    """Ventarron Andante: un embudo de nubes que camina girando. Sin piernas:
    torso de cumulo con brazos rematados en rafaga, cabeza redonda de nube con
    ojos de remolino, y tres tramos de torbellino que se estrecha hasta el
    suelo levantando hojas. Al atacar ensancha el embudo y lo estrella.
    (fortuna_gale, look azul claro 0.7/0.8/0.9.)"""
    scene = fg.reset()
    m = mats({'skin': (0.80, 0.87, 0.95), 'cloth': (0.66, 0.77, 0.90), 'trim': (0.92, 0.96, 1.0),
              'hair': (0.48, 0.60, 0.78), 'gear': (0.40, 0.55, 0.45), 'halo': (0.85, 0.97, 1.0)})
    k = 1.5

    def v(x, y, z):
        return (x * k, y * k, z * k)
    # Rig propio: mitad de arriba humana, torbellino de tres tramos abajo.
    bones = [
        ('hips', None, v(0, 0, 1.06), v(0, 0, 1.22)),
        ('spine', 'hips', v(0, 0, 1.22), v(0, 0, 1.38)),
        ('chest', 'spine', v(0, 0, 1.38), v(0, 0, 1.60)),
        ('head', 'chest', v(0, 0, 1.60), v(0, 0, 1.95)),
    ]
    for s, x in (('L', 1), ('R', -1)):
        bones += [
            (f'upperArm{s}', 'chest', v(0.2 * x, 0, 1.56), v(0.26 * x, 0, 1.30)),
            (f'foreArm{s}', f'upperArm{s}', v(0.26 * x, 0, 1.30), v(0.30 * x, -0.04, 1.06)),
            (f'hand{s}', f'foreArm{s}', v(0.30 * x, -0.04, 1.06), v(0.31 * x, -0.06, 0.96)),
        ]
    prev = 'hips'
    for i, (z0, z1) in enumerate(((1.06, 0.78), (0.78, 0.44), (0.44, 0.02))):
        bones.append((f'tail{i + 1}', prev, v(0, 0, z0), v(0, 0, z1)))
        prev = f'tail{i + 1}'
    rig = fg_rig.Rig(scene, 'FG_Ventarron', bones)
    b = fg.Builder('Cuerpo')
    hz = 1.62 * k
    # Torso de cumulo: blobs apilados, mas ancho arriba.
    b.tube(v(0, 0, 1.10), v(0, 0, 1.32), 0.20 * k, 0.23 * k, m['cloth'], 'hips', sides=7, flat=0.85)
    b.tube(v(0, 0, 1.32), v(0, 0, 1.58), 0.23 * k, 0.27 * k, m['skin'], 'chest', sides=7, flat=0.85)
    b.blob(v(-0.12, 0.05, 1.50), (0.12 * k, 0.12 * k, 0.10 * k), m['skin'], 'chest', subdiv=1)
    b.blob(v(0.13, 0.03, 1.44), (0.10 * k, 0.10 * k, 0.09 * k), m['cloth'], 'chest', subdiv=1)
    # Cabeza redonda de nube con flequillo arremolinado y ojos de remolino.
    b.blob((0, 0, hz + 0.10 * k), (0.16 * k, 0.16 * k, 0.17 * k), m['trim'], 'head')
    # Copete de nube peinado hacia atras como cresta.
    b.tube((0, -0.10 * k, hz + 0.24 * k), (0.06 * k, 0.12 * k, hz + 0.30 * k), 0.085 * k, 0.045 * k, m['cloth'], 'head', sides=5)
    b.tube((0.04 * k, 0.06 * k, hz + 0.27 * k), (0.14 * k, 0.16 * k, hz + 0.16 * k), 0.045 * k, 0.02 * k, m['cloth'], 'head', sides=4)
    for x in (-1, 1):
        b.blob((x * 0.062 * k, -0.135 * k, hz + 0.11 * k), (0.034 * k, 0.02 * k, 0.040 * k), m['hair'], 'head', subdiv=1)
        b.box((x * 0.065 * k, -0.145 * k, hz + 0.165 * k), (0.036 * k, 0.008 * k, 0.013 * k), m['hair'], 'head')
    # Boca de silbido: ovalo oscuro hundido.
    b.blob((0, -0.145 * k, hz + 0.02 * k), (0.045 * k, 0.02 * k, 0.055 * k), m['hair'], 'head', subdiv=1)
    # Brazos de rafaga: conicos, sin codo marcado, mano abierta de tres dedos de viento.
    for s, x in (('L', 1), ('R', -1)):
        b.tube(v(0.2 * x, 0, 1.56), v(0.27 * x, -0.02, 1.10), 0.075 * k, 0.05 * k, m['cloth'], f'upperArm{s}', sides=5)
        b.blob(v(0.30 * x, -0.05, 1.0), (0.06 * k, 0.06 * k, 0.08 * k), m['trim'], f'hand{s}', subdiv=1)
        for d in (-1, 0, 1):
            b.tube((0.30 * x * k, (-0.05 + 0.03 * d) * k, 0.98 * k), (0.31 * x * k, (-0.07 + 0.05 * d) * k, 0.86 * k),
                   0.014 * k, 0.005 * k, m['trim'], f'hand{s}', sides=3)
    # Torbellino: tres tramos con faldones arremolinados (anillos de tarjetas).
    for i, (z0, z1, r0, r1) in enumerate(((1.10, 0.82, 0.24, 0.30), (0.82, 0.48, 0.30, 0.23), (0.48, 0.06, 0.23, 0.07))):
        b.tube(v(0, 0, z0), v(0, 0, z1), r0 * k, r1 * k, m['cloth'], f'tail{i + 1}', sides=8, flat=0.9)
        # Falda de dientes que alternan alto y bajo: remolino, no aro de hula.
        a_ = []
        b_ = []
        for j in range(8):
            t = 2 * math.pi * j / 8 + i * 0.4
            rj = r1 * (1.5 if j % 2 else 1.1)
            zj = (z1 + (0.07 if j % 2 else -0.04))
            a_.append((rj * k * math.cos(t), rj * k * math.sin(t), zj * k))
            b_.append((rj * 0.75 * k * math.cos(t), rj * 0.75 * k * math.sin(t), (zj - 0.05) * k))
        b.poly(a_, b_, m['skin'], f'tail{i + 1}')
    # Punta tocando el suelo con polvareda.
    b.blob((0, 0, 0.045 * k), (0.09 * k, 0.09 * k, 0.05 * k), m['trim'], 'tail3', subdiv=1)
    # Hojas dando vueltas al embudo (cuatro palas verdes pegadas al torbellino).
    for i in range(4):
        t = 2 * math.pi * i / 4 + 0.4
        rr = 0.34 if i % 2 else 0.28
        zz = 0.35 + 0.25 * (i % 2)
        b.poly([(rr * k * math.cos(t), rr * k * math.sin(t), zz * k),
                ((rr + 0.16) * k * math.cos(t + 0.35), (rr + 0.16) * k * math.sin(t + 0.35), (zz + 0.18) * k),
                ((rr + 0.05) * k * math.cos(t - 0.5), (rr + 0.05) * k * math.sin(t - 0.5), (zz + 0.10) * k)],
               [(rr * k * math.cos(t) + 0.025 * k, rr * k * math.sin(t), zz * k + 0.025 * k),
                ((rr + 0.16) * k * math.cos(t + 0.35) + 0.025 * k, (rr + 0.16) * k * math.sin(t + 0.35), (zz + 0.18) * k + 0.025 * k),
                ((rr + 0.05) * k * math.cos(t - 0.5) + 0.025 * k, (rr + 0.05) * k * math.sin(t - 0.5), (zz + 0.10) * k + 0.025 * k)],
               m['gear'], f'tail{1 + i % 3}')
    # Nubes sueltas orbitando los hombros (guantes de niebla).
    b.blob((-0.33 * k, 0.02 * k, 1.42 * k), (0.07 * k, 0.07 * k, 0.05 * k), m['trim'], 'upperArmR', subdiv=1)
    b.blob((0.33 * k, 0.0 * k, 1.36 * k), (0.06 * k, 0.06 * k, 0.05 * k), m['trim'], 'upperArmL', subdiv=1)
    rig.part(b)

    # Clips: flotar y girar, sin piernas.
    def ond(f):
        ph = math.sin(f / 30 * 2 * math.pi)
        return dict(hips=(0, 3 * ph, 8 * ph), spine=(2 * ph, 0, -6 * ph), chest=(3 * ph, 0, -6 * ph),
                    head=(-4 * ph, 0, 4 * ph), tail1=(-4 * ph, 2 * ph, 0), tail2=(-6 * ph, -3 * ph, 0),
                    tail3=(-8 * ph, 4 * ph, 0))
    off = lambda x, y, z: (x * k, y * k, z * k)
    rig.clip('Reposo', [
        (1, ond(1)),
        (16, ond(16), off(0, 0, 0.012)),
        (31, ond(31), off(0, 0, 0.024)),
        (46, ond(46), off(0, 0, 0.012)),
        (61, ond(1)),
    ])
    def paso(f, sign):
        ph = math.sin(f / 12 * 2 * math.pi)
        d = ond(f)
        return {**d, 'hips': (0, 6 * ph * sign, 14 * ph), 'tail1': (-8 * ph, 5 * ph, 10 * ph),
                'tail2': (-12 * ph, -6 * ph, 14 * ph), 'tail3': (-16 * ph, 8 * ph, 18 * ph),
                'upperArmL': (0, 22 + 14 * ph, 0), 'upperArmR': (0, -22 - 14 * ph, 0)}
    rig.clip('Caminar', [
        (1, paso(1, 1)),
        (7, paso(7, 1), off(0.02, 0, 0.02)),
        (13, paso(13, -1)),
        (19, paso(19, -1), off(-0.02, 0, 0.02)),
        (25, paso(25, 1)),
    ])
    rig.clip('Correr', [
        (1, paso(1, 1), off(0, 0, 0.02)),
        (4, paso(4, 1), off(0.04, 0, 0.06)),
        (7, paso(7, -1), off(0.02, 0, 0.02)),
        (10, paso(10, -1), off(-0.04, 0, 0.06)),
        (13, paso(13, 1), off(0, 0, 0.02)),
    ])
    rig.clip('Rodar', [
        (1, ond(1)),
        (6, p(hips=(0, 0, 220), upperArmL=(0, 40, 0), upperArmR=(0, -40, 0)), off(0, -0.25, 0.10)),
        (12, p(hips=(0, 0, 430), upperArmL=(0, 40, 0), upperArmR=(0, -40, 0)), off(0, -0.55, 0.06)),
        (18, p(hips=(0, 0, 620)), off(0, -0.85, 0.0)),
        (25, ond(25)),
    ])
    rig.clip('Golpeado', [
        (1, ond(1)),
        (4, {**ond(4), 'chest': (-16, 0, 0), 'head': (-12, 0, 0), 'spine': (-8, 0, 0),
             'upperArmL': (0, 52, 0), 'upperArmR': (0, -52, 0)}, off(0, 0.06, 0)),
        (13, ond(13)),
    ])
    rig.clip('Morir', [
        (1, ond(1)),
        (6, {**ond(6), 'spine': (-18, 0, 0), 'chest': (-14, 0, 0), 'head': (-16, 0, 0),
             'upperArmL': (-40, 30, 0), 'upperArmR': (-40, -30, 0)}, off(0, 0.1, -0.05)),
        (14, {**ond(14), 'hips': (-40, 0, 0), 'spine': (-34, 0, 0), 'chest': (-26, 0, 0), 'head': (-30, 0, 0),
              'tail1': (-20, 0, 0), 'tail2': (-16, 0, 0), 'tail3': (-10, 0, 0),
              'upperArmL': (-70, 20, 0), 'upperArmR': (-70, -20, 0)}, off(0, 0.35, -0.25)),
        (22, {**ond(22), 'hips': (-70, 0, 10), 'spine': (-50, 0, 0), 'chest': (-40, 0, 0), 'head': (-52, 0, 0),
              'tail1': (-40, 0, 0), 'tail2': (-52, 0, 0), 'tail3': (-64, 0, 0),
              'upperArmL': (-90, 24, 0), 'upperArmR': (-90, -24, 0)}, off(0, 0.5, -0.36)),
        (34, {**ond(34), 'hips': (-70, 0, 10), 'spine': (-50, 0, 0), 'chest': (-40, 0, 0), 'head': (-52, 0, 0),
              'tail1': (-40, 0, 0), 'tail2': (-52, 0, 0), 'tail3': (-64, 0, 0),
              'upperArmL': (-90, 24, 0), 'upperArmR': (-90, -24, 0)}, off(0, 0.5, -0.36)),
    ])
    rig.clip('Atacar', [
        (1, ond(1)),
        (7, {**ond(7), 'chest': (16, 0, 0), 'head': (12, 0, 0), 'upperArmL': (-150, 30, 0), 'upperArmR': (-150, -30, 0),
             'tail1': (8, 0, 0), 'tail2': (12, 0, 0), 'tail3': (16, 0, 0)}, off(0, 0.03, 0.10)),
        (11, {**ond(11), 'chest': (-30, 0, 0), 'head': (-18, 0, 0), 'upperArmL': (-16, 18, 0), 'upperArmR': (-16, -18, 0),
              'tail1': (-14, 0, 0), 'tail2': (-20, 0, 0), 'tail3': (-26, 0, 0)}, off(0, -0.08, -0.14)),
        (14, {**ond(14), 'chest': (-34, 0, 0), 'head': (-20, 0, 0), 'upperArmL': (-10, 16, 0), 'upperArmR': (-10, -16, 0),
              'tail1': (-16, 0, 0), 'tail2': (-22, 0, 0), 'tail3': (-30, 0, 0)}, off(0, -0.09, -0.16)),
        (26, ond(26)),
    ])
    rig.export('ventarron.glb')


yeti_baru()
coloso_embalse()
ventarron()

try:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'arte', 'blender', 'gigantes.blend'))
except Exception as e:  # noqa: BLE001
    print(' blend no salvo:', e)
print(' gigantes: tres glbs')
