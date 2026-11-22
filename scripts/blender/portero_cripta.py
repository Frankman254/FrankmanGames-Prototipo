# Portero de la cripta (OMP-DUN-03): Berto Candado, el anciano guardián de la
# boca de la cripta — farol en la diestra, poncho raído con el dobladillo
# deshilachado, sombrero pintado y manojo de llaves al cinto.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/portero_cripta.py
# En el estilo de los PNJ de MOD-08: rig humano comun (fg_rig.biped_bones) y
# los tres clips que pide la tarea — `idle` (respiracion en bucle), `talk`
# (asiente y abre la mano) y `point` (señala la reja con la siniestra). Malla
# `npc_portero_cripta`, ≤ 2.500 tri. Materiales por canal de paleta
# (skin/cloth/trim/hair/gear, brillo_gear = la ascua del farol).
# Clean-room, desde cero; no toca data/ ni src/.
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
        skin=fg.material('skin', (0.72, 0.55, 0.42)),
        cloth=fg.material('cloth', (0.42, 0.3, 0.24)),
        trim=fg.material('trim', (0.78, 0.62, 0.3)),
        hair=fg.material('hair', (0.82, 0.8, 0.76)),
        gear=fg.material('gear', (0.35, 0.32, 0.3), rough=0.6),
        ember=fg.material('brillo_gear', (1.0, 0.72, 0.3), emit=(1.0, 0.72, 0.3), strength=1.6),
    )


def cuerpo(b, m, k):
    """Anciano algo encorvado: camisa, pantalón y botas; pelo y barba canas."""
    def v(x, y, z):
        return (x * k, y * k, z * k)
    b.tube(v(0, 0, 0.8), v(0, 0, 0.98), 0.16 * k, 0.155 * k, m['cloth'], 'hips', sides=7, flat=0.75)
    b.tube(v(0, 0, 0.98), v(0, 0.015, 1.12), 0.155 * k, 0.17 * k, m['cloth'], 'spine', sides=7, flat=0.75)
    b.tube(v(0, 0.015, 1.12), v(0, 0.03, 1.31), 0.17 * k, 0.175 * k, m['cloth'], 'chest', sides=7, flat=0.72)
    b.blob(v(0, 0.02, 1.46), (0.145 * k, 0.15 * k, 0.16 * k), m['skin'], 'head')
    for s, x in (('L', 1), ('R', -1)):
        b.tube(v(0.195 * x, 0.01, 1.26), v(0.25 * x, 0, 1.03), 0.05 * k, 0.042 * k, m['cloth'], f'upperArm{s}', sides=5)
        b.tube(v(0.25 * x, 0, 1.04), v(0.27 * x, -0.03, 0.83), 0.042 * k, 0.034 * k, m['skin'], f'foreArm{s}', sides=5)
        b.blob(v(0.27 * x, -0.045, 0.78), (0.043 * k, 0.043 * k, 0.05 * k), m['skin'], f'hand{s}', subdiv=1)
        b.tube(v(0.09 * x, 0, 0.84), v(0.1 * x, 0, 0.46), 0.075 * k, 0.052 * k, m['cloth'], f'thigh{s}', sides=5)
        b.tube(v(0.1 * x, 0, 0.48), v(0.1 * x, 0, 0.12), 0.052 * k, 0.042 * k, m['gear'], f'shin{s}', sides=5)
        b.box(v(0.1 * x, -0.05, 0.05), (0.095 * k, 0.24 * k, 0.095 * k), m['gear'], f'foot{s}')
    hz = 1.46 * k
    b.tube((0, 0.01 * k, hz - 0.13 * k), (0, 0.02 * k, hz - 0.05 * k), 0.07 * k, 0.062 * k, m['skin'], 'head', sides=6)
    # cara de viejo: nariz aguileña, cejas pobladas, barba corta cana
    b.tube((0, -0.135 * k, hz + 0.01 * k), (0, -0.19 * k, hz - 0.045 * k), 0.03 * k, 0.014 * k, m['skin'], 'head', sides=5, flat=0.7)
    for x in (-1, 1):
        b.blob((x * 0.055 * k, -0.142 * k, hz + 0.035 * k), (0.02 * k, 0.01 * k, 0.018 * k), m['hair'], 'head', subdiv=1)
    b.tube((0, -0.06 * k, hz - 0.06 * k), (0, -0.13 * k, hz - 0.09 * k), 0.062 * k, 0.05 * k, m['hair'], 'head', sides=6, flat=0.55)
    b.tube((0, -0.1 * k, hz - 0.075 * k), (0, -0.125 * k, hz - 0.21 * k), 0.05 * k, 0.02 * k, m['hair'], 'head', sides=5, flat=0.6)
    # cintas de pelo cano pegadas al cráneo, despejando la cara (MOD-08)
    for x in (-1, 1):
        b.tube((x * 0.11 * k, 0.06 * k, hz + 0.06 * k), (x * 0.13 * k, -0.08 * k, hz - 0.02 * k), 0.028 * k, 0.012 * k, m['hair'], 'head', sides=4)


def sombrero_pintao(b, m, k, hz):
    """Sombrero pintado desde cero: calota cónica, ala plana ancha y cintillo
    de cuadros en dos colores (el `trim` que tiñe la paleta)."""
    b.tube((0, 0.01 * k, hz + 0.09 * k), (0, 0.012 * k, hz + 0.27 * k), 0.155 * k, 0.08 * k, m['gear'], 'head', sides=8)
    prev = None
    for i in range(13):
        t = 2 * math.pi * i / 12
        q = (0.25 * k * math.cos(t), 0.012 * k + 0.25 * k * math.sin(t), hz + 0.105 * k)
        if prev:
            b.tube(prev, q, 0.016 * k, 0.016 * k, m['gear'], 'head', sides=3)
        prev = q
    # cintillo pintado: franja clara con rombos oscuros alternando
    b.tube((0, 0.01 * k, hz + 0.108 * k), (0, 0.011 * k, hz + 0.142 * k), 0.163 * k, 0.156 * k, m['trim'], 'head', sides=8)


def farol(b, m, k):
    """Farol colgado de la diestra: marco de alambre, pico de ascua y aro
    arriba; la luz es `brillo_gear`."""
    hx, hy, hz = -0.27 * k, -0.05 * k, 0.7 * k
    b.tube((hx, hy, hz + 0.08 * k), (hx, hy, hz - 0.02 * k), 0.008 * k, 0.008 * k, m['gear'], 'handR', sides=3)
    prev = None
    for i in range(7):
        t = 2 * math.pi * i / 6
        q = (hx + 0.03 * k * math.cos(t), hy + 0.03 * k * math.sin(t), hz + 0.075 * k)
        if prev:
            b.tube(prev, q, 0.007 * k, 0.007 * k, m['gear'], 'handR', sides=3)
        prev = q
    b.tube((hx, hy, hz - 0.02 * k), (hx, hy, hz - 0.13 * k), 0.048 * k, 0.036 * k, m['gear'], 'handR', sides=6)
    b.tube((hx, hy, hz - 0.06 * k), (hx, hy, hz - 0.1 * k), 0.052 * k, 0.052 * k, m['ember'], 'handR', sides=6)
    b.tube((hx, hy, hz - 0.16 * k), (hx, hy, hz - 0.135 * k), 0.04 * k, 0.05 * k, m['gear'], 'handR', sides=6)


def llaves(b, m, k):
    """Manujo de llaves al cinto: anilla con tres llaves colgando (su apodo)."""
    bx, by, bz = 0.16 * k, -0.08 * k, 0.9 * k
    prev = None
    for i in range(7):
        t = 2 * math.pi * i / 6
        q = (bx + 0.035 * k * math.cos(t), by + 0.035 * k * math.sin(t), bz)
        if prev:
            b.tube(prev, q, 0.007 * k, 0.007 * k, m['trim'], 'hips', sides=3)
        prev = q
    for i, o in enumerate((-0.025, 0.0, 0.025)):
        b.tube((bx + o * k, by, bz - 0.02 * k), (bx + o * k * 1.3, by, bz - 0.12 * k), 0.007 * k, 0.006 * k, m['trim'], 'hips', sides=4)
        b.box((bx + o * k * 1.5, by, bz - 0.145 * k), (0.028 * k, 0.008 * k, 0.02 * k), m['trim'], 'hips')


def portero():
    scene = fg.reset()
    m = mats()
    k = 0.95
    rig = fg_rig.Rig(scene, 'FG_Portero', fg_rig.biped_bones(k))
    b = fg.Builder('npc_portero_cripta')
    cuerpo(b, m, k)
    hz = 1.46 * k
    sombrero_pintao(b, m, k, hz)
    # poncho raído de dos capas con el dobladillo deshilachado
    for r, z0, z1 in ((0.27, 1.22, 0.98), (0.225, 1.0, 0.82)):
        for a in range(7):
            t0 = 2 * math.pi * a / 7 + 0.45
            t1 = 2 * math.pi * (a + 1) / 7 + 0.45
            b.poly([(r * 0.96 * k * math.cos(t0), r * 0.8 * k * math.sin(t0) + 0.05 * k, z0 * k),
                    (r * 0.96 * k * math.cos(t1), r * 0.8 * k * math.sin(t1) + 0.05 * k, z0 * k),
                    (r * 0.72 * k * math.cos(t1), r * 0.6 * k * math.sin(t1) + 0.07 * k, z1 * k),
                    (r * 0.72 * k * math.cos(t0), r * 0.6 * k * math.sin(t0) + 0.07 * k, z1 * k)],
                   [(r * 0.96 * k * math.cos(t0), r * 0.8 * k * math.sin(t0) + 0.085 * k, z0 * k),
                    (r * 0.96 * k * math.cos(t1), r * 0.8 * k * math.sin(t1) + 0.085 * k, z0 * k),
                    (r * 0.72 * k * math.cos(t1), r * 0.6 * k * math.sin(t1) + 0.115 * k, z1 * k),
                    (r * 0.72 * k * math.cos(t0), r * 0.6 * k * math.sin(t0) + 0.115 * k, z1 * k)],
                   m['cloth'] if a % 2 else m['trim'], 'chest')
    for a in range(8):
        t = 2 * math.pi * a / 8 + 0.2
        x, y = 0.165 * k * math.cos(t), 0.135 * k * math.sin(t) + 0.02 * k
        b.tube((x, y, 0.85 * k), (x * 1.12, y * 1.12, (0.72 + 0.07 * (a % 3)) * k), 0.012 * k, 0.003 * k, m['cloth'], 'chest', sides=3)
    # faja y llaves
    b.tube((0, 0, 0.93 * k), (0, 0, 0.9 * k), 0.18 * k, 0.185 * k, m['trim'], 'hips', sides=8, flat=0.78)
    llaves(b, m, k)
    farol(b, m, k)
    # bastón corto apoyado en la diestra junto al farol
    hx, hy = -0.27 * k, -0.05 * k
    b.tube((hx, hy, 0.79 * k), (hx - 0.01 * k, hy + 0.02 * k, 0.03 * k), 0.02 * k, 0.024 * k, m['gear'], 'handR', sides=5)
    rig.part(b)

    # idle: respiracion lenta, el poncho asiente apenas
    rig.clip('idle', [
        (1, p()),
        (30, p(chest=(-2.2, 0, 0), head=(1.6, 1.5, 0), upperArmR=(2, 0, 0)), (0, 0, -0.006)),
        (61, p()),
    ])
    # talk: asiente y abre la mano izquierda al hablar (bucle)
    rig.clip('talk', [
        (1, p()),
        (7, p(chest=(-4, 0, 0), head=(-7, 0, 0), upperArmL=(-48, 26, 0), foreArmL=(-52, 0, 0))),
        (13, p(chest=(-2, 0, 0), head=(3, 0, 0), upperArmL=(-30, 30, 0), foreArmL=(-70, 0, 0))),
        (19, p(chest=(-5, 0, 0), head=(-8, 0, 0), upperArmL=(-52, 22, 0), foreArmL=(-40, 0, 0))),
        (26, p(chest=(-1, 0, 0), head=(1, 0, 0), upperArmL=(-24, 28, 0), foreArmL=(-60, 0, 0))),
        (32, p()),
    ])
    # point: levanta la siniestra y señala la reja (golpecito de llegada)
    rig.clip('point', [
        (1, p()),
        (8, p(chest=(-6, 0, 0), head=(-4, 0, 6), upperArmL=(-40, 30, 0), foreArmL=(-60, 0, 0))),
        (14, p(chest=(-8, 0, 4), head=(-4, 0, 10), upperArmL=(-95, 8, 0), foreArmL=(-6, 0, 0))),
        (20, p(chest=(-6, 0, 2), upperArmL=(-88, 10, 0), foreArmL=(-12, 0, 0))),
        (30, p()),
    ])
    rig.export('npc_portero_cripta.glb')


if __name__ == '__main__':
    portero()
    out = os.path.join(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')),
                       'arte', 'blender', 'portero_cripta.blend')
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print('blend guardado:', out)
