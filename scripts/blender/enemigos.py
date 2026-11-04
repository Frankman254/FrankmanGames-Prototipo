# Enemigos de geometría propia, con esqueleto y clips.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/enemigos.py
# Escribe assets/models/bestia.glb, arquero.glb, chaman.glb y diablillo.glb. Miran a -Y (+Z en el juego).
# Los materiales se llaman como los canales de la paleta; brillo_* luce con el color de ese canal.
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
        skin=fg.material('skin', (0.5, 0.45, 0.4)),
        cloth=fg.material('cloth', (0.3, 0.27, 0.26)),
        trim=fg.material('trim', (0.8, 0.78, 0.7)),
        hair=fg.material('hair', (0.2, 0.18, 0.17)),
        gear=fg.material('gear', (0.5, 0.5, 0.5), rough=0.5),
        glow=fg.material('brillo_gear', (0.9, 0.3, 0.2), emit=(0.9, 0.3, 0.2), strength=1.0),
        halo=fg.material('brillo_trim', (0.8, 0.7, 0.3), emit=(0.8, 0.7, 0.3), strength=1.0),
    )


def bestia():
    scene = fg.reset()
    m = mats()
    bones = [
        ('hips', None, (0, 0.34, 0.55), (0, 0.1, 0.57)),
        ('chest', 'hips', (0, 0.1, 0.57), (0, -0.25, 0.6)),
        ('head', 'chest', (0, -0.25, 0.62), (0, -0.48, 0.74)),
        ('jaw', 'head', (0, -0.5, 0.67), (0, -0.74, 0.63)),
        ('tail', 'hips', (0, 0.38, 0.6), (0, 0.76, 0.74)),
    ]
    for name, x, y, parent in (('FL', 0.13, -0.2, 'chest'), ('FR', -0.13, -0.2, 'chest'), ('BL', 0.12, 0.3, 'hips'), ('BR', -0.12, 0.3, 'hips')):
        bones += [
            (f'leg{name}', parent, (x, y, 0.5), (x, y, 0.27)),
            (f'shin{name}', f'leg{name}', (x, y, 0.27), (x, y, 0.05)),
        ]
    bones += [('footL', 'shinBL', (0.12, 0.3, 0.05), (0.12, 0.2, 0.02)), ('footR', 'shinBR', (-0.12, 0.3, 0.05), (-0.12, 0.2, 0.02))]
    rig = fg_rig.Rig(scene, 'FG_Bestia', bones)
    b = fg.Builder('Cuerpo')
    b.tube((0, 0.42, 0.56), (0, 0.1, 0.57), 0.13, 0.17, m['skin'], 'hips', sides=8, flat=1.15)
    b.tube((0, 0.1, 0.57), (0, -0.26, 0.6), 0.17, 0.2, m['skin'], 'chest', sides=8, flat=1.15)
    b.blob((0, -0.24, 0.57), (0.2, 0.2, 0.22), m['cloth'], 'chest')
    b.tube((0, -0.24, 0.62), (0, -0.46, 0.72), 0.13, 0.11, m['skin'], 'head', sides=7)
    b.box((0, -0.5, 0.74), (0.24, 0.22, 0.2), m['skin'], 'head')
    b.box((0, -0.68, 0.71), (0.15, 0.2, 0.09), m['skin'], 'head')
    b.box((0, -0.79, 0.73), (0.06, 0.04, 0.05), m['hair'], 'head')
    for x in (-1, 1):
        b.tube((x * 0.08, -0.46, 0.83), (x * 0.1, -0.44, 0.97), 0.05, 0.008, m['hair'], 'head', sides=4)
        b.blob((x * 0.095, -0.6, 0.78), (0.024, 0.024, 0.024), m['glow'], 'head', subdiv=1)
    b.box((0, -0.65, 0.65), (0.13, 0.22, 0.035), m['trim'], 'jaw')
    b.tube((0, 0.4, 0.6), (0, 0.8, 0.76), 0.055, 0.02, m['hair'], 'tail', sides=5)
    for name, x, y, r in (('FL', 0.13, -0.2, 0.06), ('FR', -0.13, -0.2, 0.06), ('BL', 0.12, 0.3, 0.07), ('BR', -0.12, 0.3, 0.07)):
        b.tube((x, y, 0.56), (x, y, 0.26), r, r * 0.75, m['skin'], f'leg{name}', sides=5)
        b.tube((x, y, 0.28), (x, y, 0.05), r * 0.72, r * 0.6, m['hair'], f'shin{name}', sides=5)
        b.box((x, y - 0.04, 0.03), (0.09, 0.16, 0.06), m['hair'], f'shin{name}')
    rig.part(b)

    def gait(t):
        """Galope: delanteras y traseras a contrapié, con un poco de desfase por lado."""
        pose = {}
        for leg, phase, base in (('FL', 0.0, 0), ('FR', 0.1, 0), ('BL', 0.5, 0), ('BR', 0.6, 0)):
            s = math.sin(2 * math.pi * (t + phase))
            pose[f'leg{leg}'] = (-38 * s, 0, 0)
            pose[f'shin{leg}'] = (-28 - 18 * math.cos(2 * math.pi * (t + phase)), 0, 0) if leg[0] == 'F' else (26 + 18 * math.cos(2 * math.pi * (t + phase)), 0, 0)
        bob = math.sin(2 * math.pi * t)
        pose['chest'] = (-6 * bob, 0, 0)
        pose['hips'] = (5 * bob, 0, 0)
        pose['head'] = (5 * bob, 0, 0)
        pose['tail'] = (16 * bob - 6, 0, 0)
        return pose, (0, 0, 0.035 * abs(bob) - 0.01)

    rest = {'tail': (-8, 0, 0), 'head': (-3, 0, 0)}
    rig.clip('Reposo', [
        (1, rest),
        (16, {**rest, 'chest': (-1.5, 0, 0), 'tail': (-8, 16, 0), 'head': (-4, 3, 0)}, (0, 0, -0.006)),
        (31, {**rest, 'tail': (-8, 0, 0), 'jaw': (5, 0, 0)}, (0, 0, -0.01)),
        (46, {**rest, 'chest': (-1.5, 0, 0), 'tail': (-8, -16, 0), 'head': (-4, -3, 0)}, (0, 0, -0.006)),
        (61, rest),
    ])
    rig.clip('Correr', [(1 + i * 2, *gait(i / 8)) for i in range(9)])
    crouch = {'hips': (4, 0, 0), 'chest': (8, 0, 0), 'head': (-10, 0, 0), 'legFL': (-20, 0, 0), 'shinFL': (-30, 0, 0), 'legFR': (-20, 0, 0), 'shinFR': (-30, 0, 0), 'legBL': (-30, 0, 0), 'shinBL': (40, 0, 0), 'legBR': (-30, 0, 0), 'shinBR': (40, 0, 0), 'tail': (-20, 0, 0)}
    rig.clip('Atacar', [
        (1, rest),
        (6, {**crouch, 'jaw': (10, 0, 0)}, (0, 0.1, -0.1)),
        (10, {'chest': (-12, 0, 0), 'head': (6, 0, 0), 'jaw': (42, 0, 0), 'legFL': (-55, 0, 0), 'legFR': (-48, 0, 0), 'legBL': (45, 0, 0), 'legBR': (40, 0, 0), 'tail': (10, 0, 0)}, (0, -0.32, 0.1)),
        (13, {'chest': (6, 0, 0), 'head': (16, 0, 0), 'jaw': (4, 0, 0), 'legFL': (-20, 0, 0), 'legFR': (-16, 0, 0), 'legBL': (24, 0, 0), 'legBR': (20, 0, 0)}, (0, -0.28, -0.02)),
        (22, rest),
    ])
    rig.clip('Aullar', [
        (1, rest),
        (10, {'chest': (-20, 0, 0), 'hips': (-6, 0, 0), 'head': (-45, 0, 0), 'jaw': (30, 0, 0), 'legBL': (-10, 0, 0), 'legBR': (-10, 0, 0), 'tail': (22, 0, 0)}, (0, 0, -0.03)),
        (22, {'chest': (-20, 0, 0), 'hips': (-6, 0, 0), 'head': (-50, 0, 0), 'jaw': (34, 0, 0), 'legBL': (-10, 0, 0), 'legBR': (-10, 0, 0), 'tail': (22, 0, 0)}, (0, 0, -0.03)),
        (30, rest),
    ])
    rig.clip('Esquivar', [
        (1, rest),
        (5, crouch, (0.1, 0, -0.1)),
        (10, {'legFL': (20, 0, 0), 'legFR': (20, 0, 0), 'legBL': (-20, 0, 0), 'legBR': (-20, 0, 0), 'hips': (0, 0, 22), 'chest': (0, 0, 14)}, (0.45, 0, 0.18)),
        (17, rest, (0.7, 0, 0)),
    ])
    rig.clip('Golpeado', [
        (1, rest),
        (4, {'chest': (10, 0, 8), 'head': (-16, 8, 0), 'jaw': (18, 0, 0), 'tail': (22, 0, 0)}, (0, 0.08, -0.03)),
        (13, rest),
    ])
    rig.clip('Morir', [
        (1, rest),
        (6, {'chest': (10, 0, 0), 'head': (-28, 0, 0), 'jaw': (30, 0, 0)}, (0, 0.05, -0.04)),
        (18, {'hips': (0, 62, 0), 'chest': (0, 12, 0), 'head': (8, 10, 0), 'jaw': (22, 0, 0), 'legFL': (-30, 0, 0), 'legFR': (-12, 0, 0), 'legBL': (20, 0, 0), 'legBR': (10, 0, 0), 'tail': (0, 30, 0)}, (0.08, 0, -0.26)),
        (28, {'hips': (0, 88, 0), 'chest': (0, 4, 0), 'head': (12, 8, 0), 'jaw': (26, 0, 0), 'legFL': (-34, 0, 0), 'legFR': (-10, 0, 0), 'legBL': (26, 0, 0), 'legBR': (8, 0, 0), 'tail': (0, 12, 0)}, (0.1, 0, -0.38)),
    ])
    rig.export('bestia.glb')


def biped_body(b, m, k, width=1.0, boots='hair', head_scale=1.0):
    """Tronco, cabeza y miembros comunes."""
    def v(x, y, z):
        return (x * k, y * k, z * k)
    w = width * k
    b.tube(v(0, 0, 0.8), v(0, 0, 0.98), 0.17 * w, 0.16 * w, m['cloth'], 'hips', sides=7, flat=0.72)
    b.tube(v(0, 0, 0.98), v(0, 0, 1.12), 0.16 * w, 0.18 * w, m['cloth'], 'spine', sides=7, flat=0.72)
    b.tube(v(0, 0, 1.12), v(0, 0, 1.32), 0.18 * w, 0.2 * w, m['cloth'], 'chest', sides=7, flat=0.7)
    b.box(v(0, 0, 0.95), (0.35 * w, 0.25 * w, 0.045 * k), m['trim'], 'hips')
    hk = k * head_scale
    b.blob(v(0, 0, 1.47) if head_scale == 1 else (0, 0, 1.33 * k + 0.17 * hk), (0.15 * hk, 0.15 * hk, 0.17 * hk), m['skin'], 'head')
    for s, x in (('L', 1), ('R', -1)):
        b.tube(v(0.2 * x, 0, 1.27), v(0.25 * x, 0, 1.03), 0.055 * w, 0.045 * w, m['cloth'], f'upperArm{s}', sides=5)
        b.tube(v(0.25 * x, 0, 1.05), v(0.27 * x, -0.03, 0.84), 0.045 * w, 0.036 * w, m['skin'], f'foreArm{s}', sides=5)
        b.blob(v(0.27 * x, -0.04, 0.79), (0.045 * w, 0.045 * w, 0.055 * k), m['skin'], f'hand{s}', subdiv=1)
        b.tube(v(0.09 * x, 0, 0.84), v(0.1 * x, 0, 0.46), 0.08 * w, 0.056 * w, m['cloth'], f'thigh{s}', sides=5)
        b.tube(v(0.1 * x, 0, 0.48), v(0.1 * x, 0, 0.1), 0.056 * w, 0.044 * w, m['trim'], f'shin{s}', sides=5)
        b.box(v(0.1 * x, -0.05, 0.05), (0.1 * w, 0.25 * k, 0.1 * k), m[boots], f'foot{s}')


def arquero():
    scene = fg.reset()
    m = mats()
    k = 0.8
    rig = fg_rig.Rig(scene, 'FG_Arquero', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, head_scale=1.2)
    hz = 1.33 * k + 0.17 * k * 1.2
    for x in (-1, 1):
        # Orejas largas y ojos que brillan.
        b.tube((x * 0.13, 0, hz + 0.02), (x * 0.33, 0.04, hz + 0.1), 0.05, 0.006, m['skin'], 'head', sides=4)
        b.blob((x * 0.06, -0.14, hz + 0.03), (0.024, 0.016, 0.026), m['glow'], 'head', subdiv=1)
    b.tube((0, 0.03, hz + 0.08), (0, 0.06, hz + 0.3), 0.17, 0.02, m['hair'], 'head', sides=7)
    b.tube((0, 0.12, hz - 0.1), (0, 0.15, hz - 0.3), 0.13, 0.08, m['hair'], 'chest', sides=6, flat=0.5)
    # Carcaj a la espalda y arco en la izquierda.
    b.tube((0.1, 0.15, 0.75), (-0.1, 0.17, 1.15), 0.055, 0.065, m['trim'], 'chest', sides=6)
    for x in (-0.13, -0.1, -0.07):
        b.tube((x, 0.17, 1.14), (x - 0.03, 0.18, 1.26), 0.008, 0.008, m['gear'], 'chest', sides=3)
    hx, hy, hz2 = 0.27 * k, -0.05 * k, 0.79 * k
    prev = None
    for i in range(9):
        t = -1 + i / 4
        q = (hx, hy - 0.13 * (1 - t * t), hz2 + t * 0.5)
        if prev:
            b.tube(prev, q, 0.015, 0.015, m['gear'], 'handL', sides=4)
        prev = q
    b.tube((hx, hy, hz2 - 0.5), (hx, hy, hz2 + 0.5), 0.003, 0.003, m['trim'], 'handL', sides=3)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    rig.clip('Disparar', [
        (1, p()),
        (8, p(chest=(0, 0, -16), upperArmL=(-85, 18, 0), foreArmL=(-6, 0, 0), upperArmR=(-70, -20, 0), foreArmR=(-20, 0, 0), thighL=(-12, 0, 0), thighR=(12, 0, 0))),
        (15, p(chest=(0, 0, -30), head=(0, 0, 14), upperArmL=(-90, 26, 0), foreArmL=(0, 0, 0), upperArmR=(-90, -14, 0), foreArmR=(-110, 0, 0), thighL=(-14, 0, 0), thighR=(14, 0, 0))),
        (17, p(chest=(2, 0, -32), head=(0, 0, 14), upperArmL=(-90, 26, 0), foreArmL=(0, 0, 0), upperArmR=(-58, -36, 0), foreArmR=(-30, 0, 0), thighL=(-14, 0, 0), thighR=(14, 0, 0)), (0, 0.02, 0)),
        (26, p()),
    ])
    rig.export('arquero.glb')


def chaman():
    scene = fg.reset()
    m = mats()
    k = 0.95
    rig = fg_rig.Rig(scene, 'FG_Chaman', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k)
    hz = 1.47 * k
    b.tube((0, 0, 0.95 * k), (0, 0, 0.08), 0.2, 0.4, m['cloth'], 'hips', sides=9, flat=0.82)
    b.tube((0, 0, 0.13), (0, 0, 0.06), 0.4, 0.42, m['trim'], 'hips', sides=9, flat=0.82)
    b.tube((0, -0.11, hz - 0.03), (0, -0.14, hz - 0.33), 0.09, 0.012, m['hair'], 'head', sides=6, flat=0.7)
    b.tube((0, 0.01, hz + 0.08), (0, 0.05, hz + 0.45), 0.17, 0.015, m['cloth'], 'head', sides=7)
    b.tube((0, 0.01, hz + 0.08), (0, 0.01, hz + 0.11), 0.25, 0.25, m['cloth'], 'head', sides=9)
    for x in (-1, 1):
        b.blob((x * 0.055, -0.135, hz + 0.03), (0.022, 0.014, 0.024), m['glow'], 'head', subdiv=1)
    # Báculo con orbe y aro luminosos.
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2 - 0.72), (hx, hy, hz2 + 1.05), 0.022, 0.028, m['gear'], 'handR', sides=5)
    b.blob((hx, hy, hz2 + 1.15), (0.085, 0.085, 0.085), m['halo'], 'handR', subdiv=1)
    prev = None
    for i in range(11):
        t = 2 * math.pi * i / 10
        q = (hx + 0.14 * math.cos(t), hy, hz2 + 1.15 + 0.14 * math.sin(t))
        if prev:
            b.tube(prev, q, 0.009, 0.009, m['gear'], 'handR', sides=3)
        prev = q
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    rig.clip('Conjurar', [
        (1, p()),
        (10, p(chest=(-12, 0, 0), head=(-10, 0, 0), upperArmR=(-120, -14, 0), foreArmR=(-14, 0, 0), upperArmL=(-40, 34, 0), foreArmL=(-50, 0, 0)), (0, 0.02, 0.02)),
        (16, p(chest=(14, 0, 0), head=(6, 0, 0), upperArmR=(-70, -8, 0), foreArmR=(-8, 0, 0), upperArmL=(-74, 16, 0), foreArmL=(-16, 0, 0)), (0, -0.04, -0.03)),
        (22, p(chest=(8, 0, 0), upperArmR=(-55, -10, 0), foreArmR=(-14, 0, 0), upperArmL=(-50, 16, 0), foreArmL=(-24, 0, 0))),
        (30, p()),
    ])
    rig.export('chaman.glb')


def diablillo():
    scene = fg.reset()
    m = mats()
    k = 0.58
    bones = fg_rig.biped_bones(k)
    cz = 1.25 * k
    bones += [
        ('wingL', 'chest', (0.08, 0.08, cz), (0.4, 0.14, cz + 0.12)),
        ('wingR', 'chest', (-0.08, 0.08, cz), (-0.4, 0.14, cz + 0.12)),
        ('tail', 'hips', (0, 0.08, 0.84 * k), (0, 0.4, 0.74 * k)),
    ]
    rig = fg_rig.Rig(scene, 'FG_Diablillo', bones)
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=1.1, head_scale=1.55)
    hz = 1.33 * k + 0.17 * k * 1.55
    for x in (-1, 1):
        b.tube((x * 0.09, -0.01, hz + 0.11), (x * 0.15, 0.03, hz + 0.3), 0.04, 0.005, m['hair'], 'head', sides=4)
        b.blob((x * 0.055, -0.125, hz + 0.02), (0.03, 0.018, 0.034), m['glow'], 'head', subdiv=1)
        for t in ('L' if x > 0 else 'R',):
            hx, hy, hz2 = 0.27 * k * x, -0.04 * k, 0.76 * k
            b.tube((hx, hy, hz2), (hx, hy - 0.04, hz2 - 0.09), 0.03, 0.004, m['hair'], f'hand{t}', sides=4)
    # Alas de membrana: una lámina con dos dedos.
    for s, x in (('L', 1), ('R', -1)):
        a = [(x * 0.07, 0.08, cz + 0.05), (x * 0.42, 0.14, cz + 0.2), (x * 0.5, 0.15, cz - 0.08), (x * 0.26, 0.12, cz - 0.2), (x * 0.09, 0.09, cz - 0.1)]
        b.poly(a, [(c[0], c[1] + 0.012, c[2]) for c in a], m['hair'], f'wing{s}')
    b.tube((0, 0.07, 0.84 * k), (0, 0.42, 0.72 * k), 0.022, 0.012, m['skin'], 'tail', sides=4)
    b.tube((0, 0.42, 0.72 * k), (0, 0.5, 0.82 * k), 0.05, 0.004, m['hair'], 'tail', sides=4)
    rig.part(b)

    def flap(frame):
        a = 26 * math.sin(frame * 2 * math.pi / 10)
        return {'wingL': (0, 8 - a, 0), 'wingR': (0, -8 + a, 0), 'tail': (0, 0, 18 * math.sin(frame * 2 * math.pi / 30))}

    fg_rig.biped_clips(rig, k, extra=flap)
    claw = p(chest=(-10, 0, 20), spine=(0, 0, 8), upperArmR=(-130, -20, 0), foreArmR=(-40, 0, 0), upperArmL=(-20, 26, 0), **flap(5))
    rig.clip('Atacar', [
        (1, {**p(), **flap(1)}),
        (7, claw, (0, 0.03, 0.03)),
        (11, {**p(chest=(16, 0, -24), upperArmR=(-50, -6, 0), foreArmR=(-10, 0, 0), upperArmL=(-50, 16, 0)), **flap(8)}, (0, -0.12, -0.02)),
        (20, {**p(), **flap(3)}),
    ])
    rig.clip('Lanzar', [
        (1, {**p(), **flap(1)}),
        (9, {**p(chest=(-14, 0, 0), upperArmR=(-130, -14, 0), upperArmL=(-130, 14, 0)), **flap(5)}, (0, 0, 0.05)),
        (14, {**p(chest=(14, 0, 0), upperArmR=(-84, -6, 0), upperArmL=(-84, 6, 0), foreArmR=(-6, 0, 0), foreArmL=(-6, 0, 0)), **flap(8)}, (0, -0.03, 0)),
        (24, {**p(), **flap(3)}),
    ])
    rig.export('diablillo.glb')


bestia()
arquero()
chaman()
diablillo()
