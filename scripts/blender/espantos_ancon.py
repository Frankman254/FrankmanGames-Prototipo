# Espantos del Cerro Ancón (OMP-FA-17): el Diablo Rojo Desbocado como bus con
# patas (ancon_bus), El Chofer Sin Frenos (ancon_driver) y el Mono Tití
# Trasnochado (ancon_titi). Hoy los tres son el personaje y el lobo tenidos.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/espantos_ancon.py
# Clean-room, desde cero; no toca data/ ni src/. Leyenda propia: el bus rojo
# del Expreso Ancón que sube el cerro de noche sin frenos y echa humo por la
# parrilla; el chofer va pegado al timón, ya no se baja; el tití trasnochado es
# el bicho que hace de fiscal: repite en voz del bus lo que uno dijo.
#   diablo_rojo.glb   rig propio FG_DiabloRojo: chasis (hips), frente (chest),
#                     paragolpes (jaw), bocina (horn) y cuatro ruedas-pata.
#                     Embiste: se agazapa, suena la bocina y sale disparado.
#   chofer_sin_frenos.glb  rig humano comun (fg_rig) con los seis clips y
#                     `Atacar` de mandoble con el timón. Calavera de chofer:
#                     gorra de galón, camisa guayabera clara con corbata
#                     negra, tirantes, bigote de alambre y un puro al diente.
#   mono_titi.glb     rig cuadrupedo FG_MonoTiti (como el neque, con cola de
#                     dos tramos que se levanta): lomo gris azulado, pechera
#                     crema, gorro negro, orejas mofletes blancas y ojos
#                     enormes de trasnochado; Atacar de saltito chillón.
# Cinco/siete clips según plantilla; <= 1.500 tri por criatura.
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
from fg_rig import p  # noqa: E402

CLIP5 = ['Reposo', 'Caminar', 'Atacar', 'Golpeado', 'Morir']


def mats():
    return dict(
        skin=fg.material('skin', (0.62, 0.46, 0.34)),
        cloth=fg.material('cloth', (0.4, 0.35, 0.4)),
        trim=fg.material('trim', (0.8, 0.75, 0.6)),
        hair=fg.material('hair', (0.2, 0.17, 0.15)),
        gear=fg.material('gear', (0.45, 0.42, 0.38), rough=0.6),
        glow=fg.material('brillo_gear', (0.85, 0.8, 0.5), emit=(0.85, 0.8, 0.5), strength=1.1),
        wood=fg.material('madera', (0.33, 0.22, 0.14), rough=0.7),
    )


# ================================================================ diablo rojo
BUS_BONES = [
    ('hips', None, (0, 0.10, 0.62), (0, -0.10, 0.62)),          # chasis: grupa a frente
    ('chest', 'hips', (0, -0.10, 0.62), (0, -0.92, 0.66)),      # capó delantero
    ('jaw', 'chest', (0, -0.92, 0.50), (0, -0.95, 0.36)),       # paragolpes que mastica
    ('horn', 'chest', (0, -0.60, 1.30), (0, -0.60, 1.52)),      # bocina al techo
    ('wheelFL', 'hips', (0.36, -0.52, 0.30), (0.52, -0.52, 0.30)),
    ('wheelFR', 'hips', (-0.36, -0.52, 0.30), (-0.52, -0.52, 0.30)),
    ('wheelBL', 'hips', (0.36, 0.52, 0.30), (0.52, 0.52, 0.30)),
    ('wheelBR', 'hips', (-0.36, 0.52, 0.30), (-0.52, 0.52, 0.30)),
]


def diablo_rojo():
    scene = fg.reset()
    m = dict(
        rojo=fg.material('rojo_diablo', (0.72, 0.10, 0.08), rough=0.45),
        claro=fg.material('crema_bus', (0.88, 0.84, 0.76), rough=0.6),
        vidrio=fg.material('vidrio_ojos', (0.85, 0.80, 0.45), emit=(0.85, 0.72, 0.30), strength=1.2),
        negro=fg.material('negro_hule', (0.08, 0.075, 0.07), rough=0.85),
        cromo=fg.material('cromo', (0.65, 0.66, 0.68), metallic=0.8, rough=0.3),
        humo=fg.material('humo', (0.25, 0.22, 0.22), rough=1.0),
    )
    rig = fg_rig.Rig(scene, 'FG_DiabloRojo', BUS_BONES)
    b = fg.Builder('Cuerpo')

    def V(t):
        return (t[0], t[1], t[2])
    # carrocería: caja larga de techo algo curvo, cintura crema
    b.tube((0, 0.95, 0.70), (0, -0.88, 0.70), 0.44, 0.42, m['rojo'], 'hips', sides=5, flat=1.0)
    b.box((0, 0.02, 0.96), (0.90, 1.90, 0.52), m['rojo'], 'hips')
    b.tube((0, 0.95, 1.24), (0, -0.85, 1.24), 0.20, 0.10, m['rojo'], 'hips', sides=4, flat=1.0)  # techo curvo
    b.box((0, 0.02, 0.76), (0.92, 1.86, 0.10), m['claro'], 'hips')                                # franja
    # ventanillas laterales claras con montantes
    for x in (1, -1):
        b.box((x * 0.455, -0.14, 1.05), (0.02, 1.48, 0.30), m['vidrio'], 'hips')
        for y in (-0.64, -0.18, 0.30):
            b.box((x * 0.465, y, 1.06), (0.015, 0.05, 0.31), m['negro'], 'hips')
    # puertas traseras abiertas echando humo (la parada de ultratumba)
    for x in (1, -1):
        b.poly([(x * 0.46, 0.86, 0.52), (x * 0.46, 0.86, 1.24), (x * 0.70, 0.92, 1.24), (x * 0.70, 0.92, 0.52)],
               [(x * 0.44, 0.84, 0.54), (x * 0.44, 0.84, 1.22), (x * 0.66, 0.90, 1.22), (x * 0.66, 0.90, 0.54)], m['negro'], 'hips')
    b.blob((0.42, 0.80, 0.80), (0.10, 0.08, 0.16), m['humo'], 'hips', subdiv=1)
    b.blob((-0.36, 0.74, 1.02), (0.07, 0.06, 0.10), m['humo'], 'hips', subdiv=1)
    # frente: parabrisas con los dos ojos enormes, parrilla dentada y faros
    b.box((0, -0.83, 1.06), (0.80, 0.10, 0.36), m['vidrio'], 'chest')
    for x in (1, -1):
        b.blob((x * 0.22, -0.90, 1.05), (0.13, 0.05, 0.15), m['claro'], 'chest', subdiv=1)
        b.blob((x * 0.22, -0.93, 1.05), (0.055, 0.05, 0.075), m['negro'], 'chest', subdiv=1)
        b.tube((x * 0.36, -0.86, 0.70), (x * 0.36, -0.94, 0.70), 0.10, 0.10, m['claro'], 'chest', sides=6)  # faros
    b.tube((0, -0.90, 1.24), (0, -0.70, 1.24), 0.16, 0.16, m['cromo'], 'chest', sides=6, flat=1.0)
    # letrero de ruta sobre el parabrisas
    b.box((0, -0.80, 1.30), (0.62, 0.05, 0.12), m['negro'], 'chest')
    # parrilla con dientes: barra de radiador que se abre en el ataque
    for i in range(5):
        x = -0.28 + i * 0.14
        b.tube((x, -0.90, 0.62), (x, -0.94, 0.46), 0.028, 0.018, m['cromo'], 'jaw', sides=4)
    b.box((0, -0.92, 0.40), (0.80, 0.12, 0.09), m['cromo'], 'jaw')
    # bocina de dos trompetas al techo
    for x in (1, -1):
        b.tube((x * 0.12, -0.60, 1.32), (x * 0.22, -0.72, 1.50), 0.045, 0.085, m['cromo'], 'horn', sides=5)
    # cuatro ruedas como patas: llanta gorda con rin de cruces
    for hueso, x, y in (('wheelFL', 1, -0.52), ('wheelFR', -1, -0.52), ('wheelBL', 1, 0.52), ('wheelBR', -1, 0.52)):
        b.tube((x * 0.34, y, 0.30), (x * 0.46, y, 0.30), 0.30, 0.30, m['negro'], hueso, sides=8, flat=1.0)
        b.tube((x * 0.465, y, 0.30), (x * 0.485, y, 0.30), 0.17, 0.17, m['cromo'], hueso, sides=6)
        for a in (0, math.pi / 2):
            b.box((x * 0.487, y + 0.11 * math.sin(a), 0.30 + 0.11 * math.cos(a)),
                  (0.012, 0.24 * abs(math.cos(a)) + 0.03, 0.24 * abs(math.sin(a)) + 0.03), m['cromo'], hueso)

    rig.part(b)
    R = math.radians
    # Reposo: el motor traquetea, la bocina suelta vapor, el paragolpes mastica.
    rig.clip('Reposo', [
        (1, p(hips=(0, 0, 0)), (0, 0, 0)),
        (8, p(hips=(R(1.6), 0, 0), jaw=(R(-6), 0, 0)), (0, 0, 0.012)),
        (16, p(hips=(-R(1.2), 0, R(0.8)), jaw=(R(-2), 0, 0)), (0, 0, -0.006)),
        (24, p(hips=(R(1.4), 0, -R(0.6)), jaw=(R(-8), 0, 0)), (0, 0, 0.010)),
        (32, p(hips=(0, 0, 0), jaw=(0, 0, 0)), (0, 0, 0)),
    ])
    # Caminar: ruedas girando y bamboleo de bus viejo.
    def vuelta(f):
        g = R((f % 16) * 22.5)
        return dict(wheelFL=(0, 0, g), wheelFR=(0, 0, -g), wheelBL=(0, 0, g), wheelBR=(0, 0, -g),
                    hips=(0, 0, R(1.2 * math.sin(f / 16 * 2 * math.pi))))
    rig.clip('Caminar', [(f, p(**vuelta(f)), (0, 0, abs(math.sin(f / 8 * math.pi)) * 0.02)) for f in (1, 5, 9, 13, 17)])
    # Correr: igual pero más hondo.
    rig.clip('Correr', [(f, p(**vuelta(f)), (0, 0, abs(math.sin(f / 5 * math.pi)) * 0.045)) for f in (1, 3, 5, 7, 9)])
    # Rodar (esquiva): saltito hacia adelante derrapando.
    rig.clip('Rodar', [
        (1, p()),
        (5, p(hips=(-R(10), 0, 0), chest=(R(6), 0, 0), jaw=(R(14), 0, 0), horn=(-R(16), 0, 0)), (0, -0.10, 0.06)),
        (11, p(hips=(R(6), 0, 0), chest=(-R(8), 0, 0), jaw=(R(-18), 0, 0)), (0, -0.42, -0.02)),
        (18, p(), (0, -0.55, 0)),
    ])
    # Golpeado: sacudida de chapa y bocina ahogada.
    rig.clip('Golpeado', [
        (1, p()),
        (4, p(hips=(R(4), 0, -R(5)), horn=(R(18), 0, 0), jaw=(R(10), 0, 0)), (0, 0.06, 0)),
        (9, p(hips=(R(-3), 0, R(4)), jaw=(R(-8), 0, 0)), (0, -0.03, 0)),
        (16, p()),
    ])
    # Morir: se deshincha, se le cae el paragolpes y el humo lo traga.
    rig.clip('Morir', [
        (1, p(hips=(-R(8), 0, R(6)), jaw=(R(-10), 0, 0))),
        (8, p(hips=(-R(20), 0, R(9)), chest=(R(8), 0, 0), jaw=(R(-38), 0, 0), horn=(-R(30), 0, 0),
              wheelFL=(0, 0, R(40)), wheelFR=(0, 0, -R(40))), (0, 0.08, -0.22)),
        (22, p(hips=(-R(26), 0, R(11)), chest=(R(14), 0, 0), jaw=(R(-52), 0, 0), horn=(-R(44), 0, 0),
               wheelFL=(0, 0, R(70)), wheelFR=(0, 0, -R(70)), wheelBL=(0, 0, R(70)), wheelBR=(0, 0, -R(70))), (0, 0.12, -0.34)),
    ])
    # Atacar: reza el motor — retrocede, bocinazo, y embiste con el tope.
    rig.clip('Atacar', [
        (1, p()),
        (6, p(hips=(-R(8), 0, 0), chest=(-R(6), 0, 0), jaw=(R(16), 0, 0), horn=(-R(10), 0, 0)), (0, 0.14, 0)),
        (10, p(hips=(-R(14), 0, 0), chest=(-R(10), 0, 0), jaw=(R(26), 0, 0), horn=(-R(70), 0, 0)), (0, 0.20, -0.05)),
        (14, p(hips=(R(14), 0, 0), chest=(R(10), 0, 0), jaw=(R(-30), 0, 0), horn=(R(20), 0, 0),
               wheelFL=(0, 0, R(90)), wheelFR=(0, 0, -R(90)), wheelBL=(0, 0, R(90)), wheelBR=(0, 0, -R(90))), (0, -0.30, 0.02)),
        (18, p(hips=(R(6), 0, 0), chest=(R(4), 0, 0), jaw=(R(-10), 0, 0),
               wheelFL=(0, 0, R(160)), wheelFR=(0, 0, -R(160)), wheelBL=(0, 0, R(160)), wheelBR=(0, 0, -R(160))), (0, -0.58, -0.02)),
        (26, p(wheelFL=(0, 0, R(220)), wheelFR=(0, 0, -R(220)), wheelBL=(0, 0, R(220)), wheelBR=(0, 0, -R(220))), (0, -0.70, 0)),
        (40, p(), (0, 0, 0)),
    ])
    rig.export('diablo_rojo.glb')


# ================================================================ chofer sin frenos
def chofer():
    """Calavera de chofer pegada al uniforme: guayabera crema con chupla,
    corbata negra floja, tirantes, gorra de galón dorado, bigote de alambre,
    puro entre los dientes y un timón de bus como hacha."""
    scene = fg.reset()
    m = mats()
    m.update(cloth=fg.material('cloth', (0.88, 0.84, 0.72)),
             trim=fg.material('trim', (0.14, 0.13, 0.13)),
             hair=fg.material('hair', (0.10, 0.09, 0.08)),
             gear=fg.material('gear', (0.20, 0.19, 0.20), rough=0.8),
             glow=fg.material('brillo_gear', (0.90, 0.78, 0.35), emit=(0.90, 0.78, 0.35), strength=1.1),
             skin=fg.material('skin', (0.42, 0.40, 0.36)))
    k = 1.02
    rig = fg_rig.Rig(scene, 'FG_Chofer', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')

    def v(x, y, z):
        return (x * k, y * k, z * k)
    w = 1.02 * k
    # cuerpo: guayabera clara (dril), pantalón negro
    b.tube(v(0, 0, 0.8), v(0, 0, 0.98), 0.17 * w, 0.16 * w, m['gear'], 'hips', sides=7, flat=0.72)
    b.tube(v(0, 0, 0.98), v(0, 0, 1.12), 0.16 * w, 0.18 * w, m['cloth'], 'spine', sides=7, flat=0.72)
    b.tube(v(0, 0, 1.12), v(0, 0, 1.32), 0.18 * w, 0.20 * w, m['cloth'], 'chest', sides=7, flat=0.7)
    b.box(v(0, 0, 0.95), (0.35 * w, 0.25 * w, 0.045 * k), m['trim'], 'hips')
    b.blob((0, 0, 1.47 * k), (0.145 * k, 0.145 * k, 0.165 * k), m['skin'], 'head')
    for s, x in (('L', 1), ('R', -1)):
        b.tube(v(0.2 * x, 0, 1.27), v(0.25 * x, 0, 1.03), 0.055 * w, 0.045 * w, m['cloth'], f'upperArm{s}', sides=5)
        b.tube(v(0.25 * x, 0, 1.05), v(0.27 * x, -0.03, 0.84), 0.045 * w, 0.036 * w, m['skin'], f'foreArm{s}', sides=5)
        b.blob(v(0.27 * x, -0.04, 0.79), (0.045 * w, 0.045 * w, 0.055 * k), m['skin'], f'hand{s}', subdiv=1)
        b.tube(v(0.09 * x, 0, 0.84), v(0.1 * x, 0, 0.46), 0.08 * w, 0.056 * w, m['gear'], f'thigh{s}', sides=5)
        b.tube(v(0.1 * x, 0, 0.48), v(0.1 * x, 0, 0.1), 0.056 * w, 0.044 * w, m['gear'], f'shin{s}', sides=5)
        b.box(v(0.1 * x, -0.05, 0.05), (0.1 * w, 0.25 * k, 0.1 * k), m['hair'], f'foot{s}')
    hz = 1.47 * k
    # cara de calavera sonriente: cuencas hundidas, dientes, bigote fino, puro
    for x in (-1, 1):
        b.blob((x * 0.055 * k, -0.142 * k, hz + 0.03 * k), (0.026 * k, 0.012 * k, 0.026 * k), m['trim'], 'head', subdiv=1)
        b.blob((x * 0.055 * k, -0.150 * k, hz + 0.03 * k), (0.014 * k, 0.010 * k, 0.014 * k), m['hair'], 'head', subdiv=1)
    b.box((0, -0.152 * k, hz - 0.055 * k), (0.085 * k, 0.008 * k, 0.022 * k), m['trim'], 'head')  # dientes
    b.box((0, -0.158 * k, hz - 0.028 * k), (0.10 * k, 0.008 * k, 0.010 * k), m['hair'], 'head')  # bigote
    b.tube((0.028 * k, -0.160 * k, hz - 0.05 * k), (0.062 * k, -0.192 * k, hz - 0.072 * k), 0.011 * k, 0.010 * k, m['wood'], 'head', sides=4)
    b.blob((0.066 * k, -0.196 * k, hz - 0.075 * k), (0.013 * k,) * 3, m['glow'], 'head', subdiv=0)  # brasa
    # gorra de chofer: visera, cuerpo negro y galón dorado
    b.tube((0, 0.01 * k, hz + 0.115 * k), (0, 0.02 * k, hz + 0.185 * k), 0.155 * k, 0.135 * k, m['trim'], 'head', sides=8)
    b.box((0, -0.118 * k, hz + 0.108 * k), (0.26 * k, 0.14 * k, 0.020 * k), m['hair'], 'head')  # visera
    b.tube((0, 0.005 * k, hz + 0.125 * k), (0, 0.005 * k, hz + 0.152 * k), 0.162 * k, 0.162 * k, m['glow'], 'head', sides=8)
    # guayabera: chupla y cuatro bolsillos bordados, corbata negra floja, tirantes
    b.tube((0, 0, 1.01 * k), (0, 0.01 * k, 0.93 * k), 0.175 * w, 0.19 * w, m['trim'], 'hips', sides=7, flat=0.75)
    for (bx, bz) in ((0.095, 1.24), (-0.095, 1.24), (0.095, 1.10), (-0.095, 1.10)):
        b.box((bx * k, -0.148 * k, bz * k), (0.055 * k, 0.008 * k, 0.038 * k), m['trim'], 'chest')
    b.poly([(-0.035 * k, -0.150 * k, 1.315 * k), (0.035 * k, -0.150 * k, 1.315 * k), (0, -0.150 * k, 1.28 * k)],
           [(-0.022 * k, -0.146 * k, 1.05 * k), (0.022 * k, -0.146 * k, 1.05 * k), (0.0 * k, -0.146 * k, 1.02 * k)], m['gear'], 'chest')
    for x in (1, -1):
        b.tube((x * 0.075 * k, -0.140 * k, 1.30 * k), (x * 0.145 * k, -0.05 * k, 0.97 * k), 0.016 * k, 0.016 * k, m['gear'], 'chest', sides=3)
    # timón de bus como arma: se sujeta a handR, con un rayo de motor asomando
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy - 0.02 * k, hz2 - 0.08 * k), (hx, hy - 0.02 * k, hz2 + 0.34 * k), 0.024 * k, 0.020 * k, m['wood'], 'handR', sides=4)  # columna
    prev = None
    for i in range(9):
        t = 2 * math.pi * i / 9
        q = (hx, hy - 0.02 * k + 0.13 * k * math.cos(t), hz2 + 0.44 * k + 0.13 * k * math.sin(t))
        if prev:
            b.tube(prev, q, 0.020 * k, 0.020 * k, m['hair'], 'handR', sides=3)
        prev = q
    for t in (0, 2 * math.pi / 3, 4 * math.pi / 3):
        b.tube((hx, hy - 0.02 * k, hz2 + 0.44 * k),
               (hx, hy - 0.02 * k + 0.12 * k * math.cos(t), hz2 + 0.44 * k + 0.12 * k * math.sin(t)),
               0.013 * k, 0.011 * k, m['hair'], 'handR', sides=3)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    rig.clip('Atacar', [
        (1, p()),
        (7, p(chest=(6, 0, 30), head=(0, 0, 14), upperArmR=(58, -36, 0), foreArmR=(-128, 0, 0),
              upperArmL=(-30, 24, 0), foreArmL=(-50, 0, 0), thighR=(8, 0, 0)), (0, 0.03, 0)),
        (12, p(chest=(-12, 0, -40), head=(-6, 0, -18), upperArmR=(-108, -12, 0), foreArmR=(-4, 0, 0),
               upperArmL=(-8, -26, 0), foreArmL=(-14, 0, 0), thighL=(-22, 0, 0), thighR=(12, 0, 0)), (0, -0.05, -0.01)),
        (15, p(chest=(-14, 0, -44), head=(-8, 0, -20), upperArmR=(-122, -8, 0), foreArmR=(2, 0, 0),
               upperArmL=(-6, -28, 0), foreArmL=(-12, 0, 0), thighL=(-26, 0, 0), thighR=(14, 0, 0)), (0, -0.08, -0.02)),
        (26, p()),
    ])
    rig.export('chofer_sin_frenos.glb')


# ================================================================ mono titi
TITI_BONES = [
    ('hips', None, (0, 0.13, 0.20), (0, 0.0, 0.21)),
    ('chest', 'hips', (0, 0.0, 0.21), (0, -0.12, 0.22)),
    ('neck', 'chest', (0, -0.12, 0.22), (0, -0.17, 0.26)),
    ('head', 'neck', (0, -0.17, 0.26), (0, -0.28, 0.27)),
    ('jaw', 'head', (0, -0.20, 0.225), (0, -0.27, 0.205)),
    ('tail1', 'hips', (0, 0.13, 0.23), (0, 0.26, 0.26)),
    ('tail2', 'tail1', (0, 0.26, 0.26), (0, 0.36, 0.40)),
    ('legFL', 'chest', (0.045, -0.07, 0.15), (0.05, -0.075, 0.075)),
    ('shinFL', 'legFL', (0.05, -0.075, 0.075), (0.05, -0.08, 0.01)),
    ('legFR', 'chest', (-0.045, -0.07, 0.15), (-0.05, -0.075, 0.075)),
    ('shinFR', 'legFR', (-0.05, -0.075, 0.075), (-0.05, -0.08, 0.01)),
    ('legBL', 'hips', (0.05, 0.09, 0.15), (0.055, 0.095, 0.075)),
    ('shinBL', 'legBL', (0.055, 0.095, 0.075), (0.055, 0.09, 0.01)),
    ('legBR', 'hips', (-0.05, 0.09, 0.15), (-0.055, 0.095, 0.075)),
    ('shinBR', 'legBR', (-0.055, 0.095, 0.075), (-0.055, 0.09, 0.01)),
]


def mono_titi():
    """Mono Tití Trasnochado: el chismoso del cerro. Lomo gris azulado, gorro
    negro hasta las orejas, mofletes y pechera crema, cola larga peluda que
    lleva en alto y ojos redondísimos y hundidos de no dormir."""
    scene = fg.reset()
    m = dict(
        gris=fg.material('gris_titi', (0.42, 0.46, 0.52), rough=0.85),
        crema=fg.material('cresta_clara', (0.86, 0.80, 0.68), rough=0.85),
        negro=fg.material('gorro', (0.10, 0.095, 0.10), rough=0.9),
        ojo=fg.material('ojo_ambar', (0.90, 0.75, 0.35), emit=(0.90, 0.75, 0.35), strength=1.0),
        carne=fg.material('carita', (0.55, 0.44, 0.38), rough=0.8),
    )
    rig = fg_rig.Rig(scene, 'FG_MonoTiti', TITI_BONES)
    b = fg.Builder('Cuerpo')
    # cuerpo menudo de titi: pecho de mono delgado, grupa redonda
    b.tube((0, 0.115, 0.205), (0, 0.0, 0.215), 0.078, 0.066, m['gris'], 'hips', sides=7, flat=0.82)
    b.tube((0, 0.0, 0.215), (0, -0.115, 0.225), 0.066, 0.058, m['gris'], 'chest', sides=7, flat=0.82)
    b.blob((0, -0.05, 0.225), (0.060, 0.075, 0.055), m['gris'], 'chest', subdiv=1)   # hombrillos
    b.blob((0, -0.02, 0.195), (0.048, 0.10, 0.038), m['crema'], 'chest', subdiv=1)  # pechera
    b.tube((0, -0.115, 0.235), (0, -0.185, 0.262), 0.042, 0.046, m['gris'], 'neck', sides=6)  # cuello
    # cabeza redonda grande: gorro negro, mofletes blancos, carita de viejo
    b.blob((0, -0.215, 0.275), (0.062, 0.060, 0.062), m['gris'], 'head', subdiv=1)
    b.blob((0, -0.205, 0.315), (0.058, 0.058, 0.034), m['negro'], 'head', subdiv=1)  # gorro
    for x in (-1, 1):
        b.blob((x * 0.062, -0.205, 0.272), (0.022, 0.020, 0.030), m['crema'], 'head', subdiv=1)  # mofletes
        b.blob((x * 0.070, -0.195, 0.302), (0.016, 0.010, 0.020), m['negro'], 'head', subdiv=0)  # oreja
        b.blob((x * 0.026, -0.268, 0.284), (0.020, 0.010, 0.020), m['crema'], 'head', subdiv=1)  # cuenca
        b.blob((x * 0.026, -0.276, 0.284), (0.0125, 0.008, 0.0125), m['ojo'], 'head', subdiv=1)  # ojo inmenso
        b.blob((x * 0.026, -0.281, 0.284), (0.0055, 0.006, 0.0055), m['negro'], 'head', subdiv=0)  # pupila
    b.blob((0, -0.278, 0.252), (0.024, 0.020, 0.018), m['carne'], 'head', subdiv=1)  # hocico corto
    b.box((0, -0.294, 0.252), (0.012, 0.006, 0.005), m['negro'], 'head')  # ollares
    b.tube((0, -0.252, 0.230), (0, -0.278, 0.234), 0.020, 0.014, m['carne'], 'jaw', sides=5, flat=0.85)
    # dos dienticos de roedor cuando abre la boca para chillar
    for x in (-1, 1):
        b.box((x * 0.008, -0.276, 0.240), (0.006, 0.006, 0.010), m['crema'], 'jaw')
    # brazos largos de rama en rama (muslos adelante del mismo patron) y cola
    for nombre, x, y0, z0 in (('FL', 0.045, -0.07, 0.15), ('FR', -0.045, -0.07, 0.15),
                              ('BL', 0.05, 0.09, 0.15), ('BR', -0.05, 0.09, 0.15)):
        b.tube((x, y0, z0), (x * 1.06, y0 - 0.005, z0 * 0.52), 0.024, 0.017, m['gris'], f'leg{nombre}', sides=5)
        b.tube((x * 1.06, y0 - 0.01, z0 * 0.5), (x * 1.08, y0 - 0.014, 0.012), 0.017, 0.013, m['gris'], f'shin{nombre}', sides=5)
        b.blob((x * 1.08, y0 - 0.030, 0.012), (0.016, 0.028, 0.012), m['carne'], f'shin{nombre}', subdiv=0)  # mano/pie
    b.tube((0, 0.13, 0.245), (0, 0.24, 0.30), 0.020, 0.022, m['gris'], 'tail1', sides=5)
    b.tube((0, 0.24, 0.30), (0, 0.28, 0.41), 0.022, 0.018, m['negro'], 'tail2', sides=5)
    b.tube((0, 0.28, 0.41), (0, 0.24, 0.49), 0.018, 0.010, m['crema'], 'tail2', sides=5)  # punta clara
    rig.part(b)
    R = math.radians
    # Reposo: la cola ondea lenta, la cabeza gira de chismoso.
    rig.clip('Reposo', [
        (1, p(tail1=(R(6), 0, 0), tail2=(R(10), 0, 0))),
        (12, p(chest=(R(1.5), 0, R(2)), neck=(R(-2), 0, R(6)), head=(0, 0, R(8)), tail1=(R(2), 0, R(4)), tail2=(R(-4), 0, R(8)))),
        (24, p(tail1=(R(9), 0, 0), tail2=(R(14), 0, 0))),
        (36, p(chest=(R(1.5), 0, -R(2)), neck=(R(-2), 0, -R(6)), head=(0, 0, -R(8)), tail1=(R(2), 0, -R(4)), tail2=(R(-4), 0, -R(8)))),
        (48, p(tail1=(R(6), 0, 0), tail2=(R(10), 0, 0))),
    ])
    # Caminar: trote de cuatro apoyos con cola en alto.
    def trote(f):
        s = math.sin(f / 16 * 2 * math.pi)
        c = math.cos(f / 16 * 2 * math.pi)
        return dict(
            legFL=(R(20 * s), 0, 0), shinFL=(R(14 * max(0.0, -s)), 0, 0),
            legBR=(R(20 * s), 0, 0), shinBR=(R(14 * max(0.0, -s)), 0, 0),
            legFR=(R(-20 * s), 0, 0), shinFR=(R(14 * max(0.0, s)), 0, 0),
            legBL=(R(-20 * s), 0, 0), shinBL=(R(14 * max(0.0, s)), 0, 0),
            chest=(R(3 * c), 0, 0), hips=(R(-3 * c), 0, 0),
            tail1=(R(30 + 8 * c), 0, 0), tail2=(R(20 + 10 * s), 0, R(6 * s)))
    rig.clip('Caminar', [(f, p(**trote(f)), (0, 0, 0.012 * abs(c))) for f, c in ((1, 1), (5, 0), (9, -1), (13, 0), (17, 1))])
    rig.clip('Correr', [(f, p(**trote(f)), (0, -0.02, 0.02 * abs(math.sin(f / 8 * math.pi)))) for f in (1, 3, 5, 7, 9)])
    rig.clip('Rodar', [
        (1, p()),
        (5, p(hips=(-R(24), 0, 0), chest=(-R(16), 0, 0), tail1=(R(40), 0, 0), tail2=(R(30), 0, 0),
              legFL=(-R(30), 0, 0), legFR=(-R(30), 0, 0)), (0, -0.10, 0.08)),
        (11, p(hips=(R(20), 0, 0), chest=(R(12), 0, 0), tail1=(-R(18), 0, 0), tail2=(-R(14), 0, 0)), (0, -0.34, 0.0)),
        (18, p(), (0, -0.42, 0)),
    ])
    rig.clip('Golpeado', [
        (1, p()),
        (4, p(chest=(-R(14), 0, R(8)), neck=(-R(10), 0, R(6)), tail1=(-R(30), 0, 0), tail2=(-R(24), 0, 0)), (0, 0.05, 0)),
        (9, p(chest=(R(8), 0, -R(6)), tail1=(R(16), 0, -R(8))), (0, -0.02, 0)),
        (16, p()),
    ])
    rig.clip('Morir', [
        (1, p(hips=(-R(10), 0, R(8)), chest=(-R(8), 0, R(6)), neck=(-R(10), 0, 0), tail1=(R(10), 0, 0))),
        (8, p(hips=(-R(30), 0, R(14)), chest=(-R(24), 0, R(10)), neck=(-R(16), 0, 0), jaw=(R(20), 0, 0),
              legFL=(-R(40), 0, 0), legFR=(-R(36), 0, 0), tail1=(-R(10), 0, 0), tail2=(-R(16), 0, 0)), (0, 0.06, -0.12)),
        (22, p(hips=(-R(38), 0, R(20)), chest=(-R(30), 0, R(14)), neck=(-R(20), 0, 0), jaw=(R(26), 0, 0),
               legFL=(-R(52), 0, 0), legFR=(-R(48), 0, 0), legBL=(-R(30), 0, 0), legBR=(-R(30), 0, 0),
               tail1=(-R(24), 0, 0), tail2=(-R(30), 0, 0)), (0, 0.10, -0.16)),
    ])
    # Atacar: chillido de fiscal — se encabrita, abre la boca y cae de mordisco.
    rig.clip('Atacar', [
        (1, p()),
        (5, p(hips=(-R(18), 0, 0), chest=(-R(22), 0, 0), neck=(-R(14), 0, 0), head=(-R(10), 0, R(6)),
              jaw=(R(38), 0, 0), tail1=(R(52), 0, 0), tail2=(R(40), 0, R(10)),
              legFL=(-R(30), 0, 0), legFR=(-R(30), 0, 0)), (0, 0.03, 0.05)),
        (9, p(hips=(R(16), 0, 0), chest=(R(24), 0, 0), neck=(R(16), 0, 0), jaw=(R(6), 0, 0),
              legFL=(R(46), 0, 0), legFR=(R(46), 0, 0), legBL=(R(30), 0, 0), legBR=(R(30), 0, 0),
              tail1=(-R(30), 0, 0), tail2=(-R(26), 0, 0)), (0, -0.20, 0.07)),
        (13, p(hips=(R(8), 0, 0), chest=(R(10), 0, 0), jaw=(R(30), 0, 0),
               legFL=(-R(20), 0, 0), legFR=(-R(20), 0, 0)), (0, -0.40, -0.02)),
        (22, p(), (0, 0, 0)),
    ])
    rig.export('mono_titi.glb')


diablo_rojo()
chofer()
mono_titi()

try:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'espantos_ancon.blend'))
except Exception as e:  # noqa: BLE001
    print(' blend no salvo:', e)
print(' espantos_ancon: tres glbs')
