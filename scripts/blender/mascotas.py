# Mascotas y fantasma del jugador, con esqueleto y clips.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/mascotas.py
# También se ejecuta dentro de Blender por MCP: usa una escena por modelo y no toca las demás.
# Escribe assets/models/zorro.glb, buho.glb, tortuga.glb y fantasma.glb. Miran a -Y (+Z en el juego).
# Los materiales se llaman como los canales de la paleta; brillo_* luce con el color de ese canal.
import importlib
import math
import os
import sys
import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg
import fg_rig

importlib.reload(fg)
importlib.reload(fg_rig)


def mats():
    return dict(
        skin=fg.material('skin', (0.55, 0.52, 0.5)),
        cloth=fg.material('cloth', (0.78, 0.74, 0.7)),
        trim=fg.material('trim', (0.9, 0.85, 0.72)),
        hair=fg.material('hair', (0.22, 0.2, 0.2)),
        glow=fg.material('brillo_gear', (1, 0.6, 0.2), emit=(1, 0.6, 0.2), strength=1.0),
        halo=fg.material('brillo_trim', (1, 0.55, 0.15), emit=(1, 0.55, 0.15), strength=1.0),
    )


def legs_of(spots, top, knee, foot):
    out = []
    for name, x, y, parent in spots:
        out += [(f'leg{name}', parent, (x, y, top), (x, y, knee)), (f'shin{name}', f'leg{name}', (x, y, knee), (x, y, foot))]
    return out


def gait(t, amp, knee, tail_amp=14):
    pose = {}
    for leg, phase in (('FL', 0.0), ('FR', 0.1), ('BL', 0.5), ('BR', 0.6)):
        a = 2 * math.pi * (t + phase)
        pose[f'leg{leg}'] = (-amp * math.sin(a), 0, 0)
        bend = knee + knee * 0.6 * math.cos(a)
        pose[f'shin{leg}'] = (-bend if leg[0] == 'F' else bend, 0, 0)
    bob = math.sin(2 * math.pi * t)
    pose['chest'] = (-5 * bob, 0, 0)
    pose['hips'] = (4 * bob, 0, 0)
    pose['head'] = (4 * bob, 0, 0)
    pose['tail'] = (tail_amp * bob, 0, 0)
    return pose


# --- Zorro de ceniza ---


def zorro():
    scene = fg.fresh_scene('Zorro')
    m = mats()
    bones = [
        ('hips', None, (0, 0.2, 0.3), (0, 0.04, 0.31)),
        ('chest', 'hips', (0, 0.04, 0.31), (0, -0.16, 0.33)),
        ('head', 'chest', (0, -0.16, 0.36), (0, -0.3, 0.44)),
        ('jaw', 'head', (0, -0.3, 0.38), (0, -0.44, 0.36)),
        ('tail', 'hips', (0, 0.24, 0.32), (0, 0.5, 0.42)),
    ]
    bones += legs_of((('FL', 0.07, -0.12, 'chest'), ('FR', -0.07, -0.12, 'chest'), ('BL', 0.07, 0.17, 'hips'), ('BR', -0.07, 0.17, 'hips')), 0.28, 0.15, 0.03)
    bones += [('footL', 'shinBL', (0.07, 0.17, 0.03), (0.07, 0.12, 0.01)), ('footR', 'shinBR', (-0.07, 0.17, 0.03), (-0.07, 0.12, 0.01))]
    rig = fg_rig.Rig(scene, 'FG_Zorro', bones)
    b = fg.Builder('Cuerpo')
    b.tube((0, 0.24, 0.3), (0, 0.04, 0.31), 0.075, 0.095, m['skin'], 'hips', sides=7, flat=1.1)
    b.tube((0, 0.04, 0.31), (0, -0.16, 0.33), 0.095, 0.1, m['skin'], 'chest', sides=7, flat=1.1)
    b.blob((0, -0.15, 0.31), (0.09, 0.09, 0.11), m['cloth'], 'chest', subdiv=1)
    b.blob((0, -0.26, 0.42), (0.09, 0.1, 0.08), m['skin'], 'head', subdiv=1)
    b.tube((0, -0.32, 0.41), (0, -0.46, 0.39), 0.05, 0.012, m['skin'], 'head', sides=5)
    b.blob((0, -0.465, 0.39), (0.016, 0.016, 0.016), m['hair'], 'head', subdiv=1)
    # Gorguera y mejillas separan la cabeza del cuerpo a distancia de juego.
    for x in (-0.075, 0, 0.075):
        b.poly([(x - 0.045, -0.205, 0.38), (x + 0.045, -0.205, 0.38), (x, -0.235, 0.25)],
               [(x - 0.045, -0.16, 0.38), (x + 0.045, -0.16, 0.38), (x, -0.19, 0.25)], m['cloth'], 'chest')
    for x in (-1, 1):
        b.poly([(x * 0.025, -0.245, 0.475), (x * 0.115, -0.23, 0.49), (x * 0.085, -0.215, 0.60)],
               [(x * 0.025, -0.205, 0.475), (x * 0.115, -0.19, 0.49), (x * 0.085, -0.175, 0.60)], m['hair'], 'head')
        b.poly([(x * 0.052, -0.251, 0.49), (x * 0.095, -0.244, 0.50), (x * 0.083, -0.235, 0.565)],
               [(x * 0.052, -0.235, 0.49), (x * 0.095, -0.228, 0.50), (x * 0.083, -0.219, 0.565)], m['trim'], 'head')
        b.blob((x * 0.052, -0.335, 0.445), (0.025, 0.016, 0.027), m['glow'], 'head', subdiv=1)
        b.blob((x * 0.052, -0.351, 0.445), (0.012, 0.007, 0.014), m['hair'], 'head', subdiv=1)
        b.box((x * 0.047, -0.358, 0.455), (0.005, 0.003, 0.005), m['trim'], 'head')
        b.poly([(x * 0.055, -0.30, 0.39), (x * 0.13, -0.27, 0.365), (x * 0.07, -0.31, 0.315)],
               [(x * 0.055, -0.265, 0.39), (x * 0.13, -0.235, 0.365), (x * 0.07, -0.275, 0.315)], m['cloth'], 'head')
    b.blob((0, -0.385, 0.36), (0.055, 0.085, 0.025), m['trim'], 'jaw', subdiv=1)
    # Cola tupida con punta de ascua.
    b.tube((0, 0.24, 0.32), (0, 0.38, 0.38), 0.03, 0.075, m['hair'], 'tail', sides=6)
    b.tube((0, 0.38, 0.38), (0, 0.5, 0.43), 0.075, 0.05, m['hair'], 'tail', sides=6)
    b.blob((0, 0.54, 0.45), (0.05, 0.06, 0.05), m['halo'], 'tail', subdiv=1)
    for n, x, y, r in (('FL', 0.07, -0.12, 0.028), ('FR', -0.07, -0.12, 0.028), ('BL', 0.07, 0.17, 0.034), ('BR', -0.07, 0.17, 0.034)):
        b.tube((x, y, 0.3), (x, y, 0.15), r, r * 0.75, m['skin'], f'leg{n}', sides=5)
        b.tube((x, y, 0.16), (x, y, 0.03), r * 0.7, r * 0.6, m['hair'], f'shin{n}', sides=5)
        b.blob((x, y - 0.025, 0.025), (0.042, 0.065, 0.022), m['hair'], f'shin{n}', subdiv=1)
        for toe in (-0.018, 0, 0.018):
            b.tube((x + toe, y - 0.065, 0.025), (x + toe, y - 0.09, 0.012), 0.006, 0.002, m['trim'], f'shin{n}', sides=4)
    rig.part(b)
    rest = {'tail': (-6, 0, 0), 'head': (-3, 0, 0)}
    rig.clip('Reposo', [
        (1, rest),
        (16, {**rest, 'tail': (-6, 18, 0), 'chest': (-1.5, 0, 0), 'head': (-5, 4, 0)}, (0, 0, -0.004)),
        (31, {**rest, 'jaw': (6, 0, 0)}, (0, 0, -0.006)),
        (46, {**rest, 'tail': (-6, -18, 0), 'chest': (-1.5, 0, 0), 'head': (-5, -4, 0)}, (0, 0, -0.004)),
        (61, rest),
    ])
    rig.clip('Correr', [(1 + i * 2, gait(i / 7, 38, 28), (0, 0, 0.018 * abs(math.sin(2 * math.pi * i / 7)))) for i in range(8)])
    rig.clip('Atacar', [
        (1, rest),
        (6, {**rest, 'chest': (8, 0, 0), 'head': (-10, 0, 0), 'legBL': (-26, 0, 0), 'legBR': (-26, 0, 0), 'shinBL': (34, 0, 0), 'shinBR': (34, 0, 0)}, (0, 0.05, -0.05)),
        (10, {'chest': (-10, 0, 0), 'head': (6, 0, 0), 'jaw': (40, 0, 0), 'legFL': (-50, 0, 0), 'legFR': (-44, 0, 0), 'legBL': (40, 0, 0), 'legBR': (36, 0, 0)}, (0, -0.16, 0.05)),
        (20, rest),
    ])
    rig.clip('Golpeado', [(1, rest), (4, {'chest': (10, 0, 8), 'head': (-16, 8, 0), 'jaw': (18, 0, 0)}, (0, 0.04, -0.015)), (13, rest)])
    rig.clip('Morir', [
        (1, rest),
        (18, {'hips': (0, 62, 0), 'head': (8, 8, 0), 'jaw': (20, 0, 0), 'legFL': (-30, 0, 0), 'legBL': (20, 0, 0)}, (0.04, 0, -0.14)),
        (28, {'hips': (0, 88, 0), 'head': (12, 6, 0), 'jaw': (24, 0, 0), 'legFL': (-34, 0, 0), 'legBL': (26, 0, 0)}, (0.05, 0, -0.2)),
    ])
    rig.export('zorro.glb')


# --- Tortuga de musgo ---


def tortuga():
    scene = fg.fresh_scene('Tortuga')
    m = mats()
    bones = [
        ('hips', None, (0, 0.2, 0.22), (0, -0.2, 0.22)),
        ('head', 'hips', (0, -0.3, 0.18), (0, -0.52, 0.22)),
        ('tail', 'hips', (0, 0.32, 0.14), (0, 0.46, 0.1)),
    ]
    bones += legs_of((('FL', 0.27, -0.22, 'hips'), ('FR', -0.27, -0.22, 'hips'), ('BL', 0.27, 0.22, 'hips'), ('BR', -0.27, 0.22, 'hips')), 0.17, 0.09, 0.02)
    bones += [('footL', 'shinBL', (0.27, 0.22, 0.02), (0.27, 0.16, 0.01)), ('footR', 'shinBR', (-0.27, 0.22, 0.02), (-0.27, 0.16, 0.01))]
    rig = fg_rig.Rig(scene, 'FG_Tortuga', bones)
    b = fg.Builder('Cuerpo')
    # Caparazón con placas, borde y musgo con una seta que luce.
    b.blob((0, 0, 0.26), (0.38, 0.44, 0.22), m['cloth'], 'hips', subdiv=2)
    b.tube((0, 0, 0.13), (0, 0, 0.18), 0.4, 0.4, m['trim'], 'hips', sides=12, flat=1.15)
    b.tube((0, 0, 0.1), (0, 0, 0.13), 0.33, 0.38, m['skin'], 'hips', sides=12, flat=1.15)
    # Placas centrales del caparazón y manchas de musgo elevadas.
    for x, y, r in ((0, -0.02, 0.14), (0.17, -0.10, 0.10), (-0.17, -0.08, 0.10), (0.14, 0.15, 0.09), (-0.14, 0.15, 0.09)):
        b.blob((x, y, 0.435), (r, r * 1.08, 0.025), m['skin'], 'hips', subdiv=1)
    for x, y, r in ((0.12, -0.12, 0.13), (-0.14, 0.1, 0.11), (0.1, 0.17, 0.09), (-0.05, -0.2, 0.08)):
        b.blob((x, y, 0.45), (r, r, r * 0.42), m['hair'], 'hips', subdiv=1)
    b.tube((0.02, 0.02, 0.45), (0.02, 0.02, 0.53), 0.018, 0.012, m['trim'], 'hips', sides=5)
    b.blob((0.02, 0.02, 0.55), (0.065, 0.065, 0.025), m['glow'], 'hips', subdiv=1)
    b.blob((0.02, -0.015, 0.565), (0.025, 0.022, 0.010), m['trim'], 'hips', subdiv=1)
    # Cabeza y cuello.
    b.tube((0, -0.3, 0.18), (0, -0.44, 0.22), 0.06, 0.05, m['skin'], 'head', sides=6)
    b.blob((0, -0.5, 0.24), (0.095, 0.105, 0.085), m['skin'], 'head', subdiv=1)
    for x in (-1, 1):
        b.blob((x * 0.052, -0.585, 0.27), (0.022, 0.014, 0.024), m['trim'], 'head', subdiv=1)
        b.blob((x * 0.052, -0.598, 0.27), (0.010, 0.006, 0.012), m['hair'], 'head', subdiv=1)
        b.box((x * 0.048, -0.604, 0.279), (0.004, 0.003, 0.004), m['glow'], 'head')
    b.blob((0, -0.60, 0.215), (0.055, 0.025, 0.020), m['trim'], 'head', subdiv=1)
    b.tube((0, 0.34, 0.14), (0, 0.46, 0.1), 0.035, 0.005, m['skin'], 'tail', sides=5)
    for n, x, y in (('FL', 0.27, -0.22), ('FR', -0.27, -0.22), ('BL', 0.27, 0.22), ('BR', -0.27, 0.22)):
        b.tube((x * 0.85, y * 0.9, 0.17), (x, y, 0.09), 0.07, 0.06, m['skin'], f'leg{n}', sides=6)
        b.tube((x, y, 0.1), (x, y, 0.01), 0.06, 0.07, m['skin'], f'shin{n}', sides=6)
        b.blob((x, y - 0.025, 0.035), (0.085, 0.10, 0.035), m['skin'], f'shin{n}', subdiv=1)
        for toe in (-0.035, 0, 0.035):
            b.tube((x + toe, y - 0.09, 0.035), (x + toe, y - 0.13, 0.018), 0.009, 0.003, m['trim'], f'shin{n}', sides=4)
    rig.part(b)
    rest = {}
    rig.clip('Reposo', [
        (1, rest),
        (31, {'head': (-8, 6, 0), 'tail': (0, 10, 0)}, (0, 0, -0.006)),
        (61, {'head': (-3, -8, 0), 'tail': (0, -10, 0)}),
        (91, rest),
    ])

    def walk(t):
        a = 2 * math.pi * t
        return {
            'legFL': (-20 * math.sin(a), 0, 0), 'legBR': (-20 * math.sin(a), 0, 0),
            'legFR': (20 * math.sin(a), 0, 0), 'legBL': (20 * math.sin(a), 0, 0),
            'hips': (0, 3 * math.sin(a), 0), 'head': (3 * math.sin(2 * a), 0, 6 * math.sin(a)), 'tail': (0, 12 * math.sin(a), 0),
        }

    rig.clip('Correr', [(1 + i * 4, walk(i / 8)) for i in range(9)])
    rig.clip('Atacar', [
        (1, rest),
        (9, {'head': (-22, 0, 0)}, (0, 0.05, 0)),
        (13, {'head': (22, 0, 0), 'hips': (6, 0, 0)}, (0, -0.1, 0)),
        (24, rest),
    ])
    rig.clip('Golpeado', [(1, rest), (4, {'head': (-20, 0, 0), 'hips': (-6, 0, 4)}, (0, 0.03, 0.01)), (13, rest)])
    rig.clip('Morir', [
        (1, rest),
        (14, {'head': (30, 0, 0), 'legFL': (30, 0, 0), 'legFR': (30, 0, 0), 'legBL': (-30, 0, 0), 'legBR': (-30, 0, 0)}, (0, 0, -0.06)),
        (24, {'head': (42, 0, 0), 'tail': (20, 0, 0), 'legFL': (40, 0, 0), 'legFR': (40, 0, 0), 'legBL': (-40, 0, 0), 'legBR': (-40, 0, 0)}, (0, 0, -0.09)),
    ])
    rig.export('tortuga.glb')


# --- Búho archivero: vuela a media altura, sin patas que anden ---


def buho():
    scene = fg.fresh_scene('Buho')
    m = mats()
    Z = 1.15
    bones = [
        ('hips', None, (0, 0, Z - 0.14), (0, 0, Z + 0.1)),
        ('head', 'hips', (0, 0, Z + 0.14), (0, 0, Z + 0.4)),
        ('wingL', 'hips', (0.13, 0, Z + 0.1), (0.55, 0.04, Z + 0.1)),
        ('wingR', 'hips', (-0.13, 0, Z + 0.1), (-0.55, 0.04, Z + 0.1)),
        ('tail', 'hips', (0, 0.1, Z - 0.1), (0, 0.28, Z - 0.16)),
        ('footL', 'hips', (0.05, -0.02, Z - 0.17), (0.05, -0.07, Z - 0.2)),
        ('footR', 'hips', (-0.05, -0.02, Z - 0.17), (-0.05, -0.07, Z - 0.2)),
    ]
    rig = fg_rig.Rig(scene, 'FG_Buho', bones)
    b = fg.Builder('Cuerpo')
    b.blob((0, 0, Z), (0.15, 0.15, 0.19), m['cloth'], 'hips', subdiv=2)
    b.blob((0, -0.06, Z - 0.02), (0.1, 0.1, 0.14), m['trim'], 'hips', subdiv=1)
    b.blob((0, 0, Z + 0.26), (0.13, 0.13, 0.12), m['cloth'], 'head', subdiv=2)
    b.tube((0, -0.095, Z + 0.26), (0, -0.12, Z + 0.26), 0.105, 0.1, m['trim'], 'head', sides=10)
    for x in (-1, 1):
        b.blob((x * 0.05, -0.118, Z + 0.28), (0.065, 0.018, 0.065), m['trim'], 'head', subdiv=1)
        b.blob((x * 0.045, -0.139, Z + 0.28), (0.033, 0.012, 0.033), m['glow'], 'head', subdiv=1)
        b.blob((x * 0.045, -0.150, Z + 0.28), (0.014, 0.006, 0.017), m['hair'], 'head', subdiv=1)
        b.box((x * 0.040, -0.154, Z + 0.292), (0.006, 0.003, 0.006), m['glow'], 'head')
        # Anteojos.
        prev = None
        for i in range(13):
            t = 2 * math.pi * i / 12
            q = (x * 0.045 + 0.042 * math.cos(t), -0.14, Z + 0.28 + 0.042 * math.sin(t))
            if prev:
                b.tube(prev, q, 0.005, 0.005, m['hair'], 'head', sides=3)
            prev = q
        b.tube((x * 0.07, 0, Z + 0.34), (x * 0.085, 0.01, Z + 0.43), 0.035, 0.004, m['cloth'], 'head', sides=4)
        b.tube((x * 0.06, -0.02, Z - 0.17), (x * 0.06, -0.06, Z - 0.21), 0.014, 0.006, m['skin'], 'foot' + ('L' if x > 0 else 'R'), sides=4)
        for toe in (-0.016, 0, 0.016):
            b.tube((x * 0.06 + toe, -0.06, Z - 0.21), (x * 0.06 + toe, -0.105, Z - 0.225), 0.005, 0.0015, m['hair'], 'foot' + ('L' if x > 0 else 'R'), sides=4)
    b.tube((0, -0.125, Z + 0.24), (0, -0.16, Z + 0.2), 0.02, 0.003, m['skin'], 'head', sides=4)
    # Pequeño libro frontal: refuerza la función de archivero sin texto.
    b.box((0, -0.145, Z - 0.015), (0.15, 0.035, 0.11), m['hair'], 'hips')
    b.box((0, -0.166, Z - 0.015), (0.12, 0.012, 0.085), m['trim'], 'hips')
    b.tube((-0.11, -0.16, Z + 0.11), (0.11, -0.16, Z - 0.13), 0.012, 0.012, m['skin'], 'hips', sides=4)
    for s, x in (('L', 1), ('R', -1)):
        a = [(x * 0.12, 0.05, Z + 0.14), (x * 0.36, 0.07, Z + 0.15), (x * 0.56, 0.1, Z + 0.1), (x * 0.5, 0.14, Z + 0.04), (x * 0.3, 0.14, Z + 0.02), (x * 0.12, 0.1, Z)]
        b.poly(a, [(c[0], c[1], c[2] + 0.015) for c in a], m['hair'], f'wing{s}')
        for i, q in enumerate(a[2:5]):
            start = (x * (0.14 + i * 0.015), 0.08 + i * 0.01, Z + 0.11 - i * 0.025)
            b.poly([start, q, (q[0] - x * 0.08, q[1] + 0.025, q[2] - 0.055)],
                   [(start[0], start[1] + 0.02, start[2]), (q[0], q[1] + 0.02, q[2]),
                    (q[0] - x * 0.08, q[1] + 0.045, q[2] - 0.055)], m['cloth'], f'wing{s}')
    tail = [(-0.07, 0.1, Z - 0.1), (0.07, 0.1, Z - 0.1), (0.09, 0.3, Z - 0.17), (-0.09, 0.3, Z - 0.17)]
    b.poly(tail, [(c[0], c[1], c[2] + 0.015) for c in tail], m['hair'], 'tail')
    rig.part(b)

    def flap(frame, speed=8, up=0.0):
        a = 34 * math.sin(frame * 2 * math.pi / speed)
        return {'wingL': (0, -a - 6, 0), 'wingR': (0, a + 6, 0)}

    def hover(frame, period=60):
        return (0, 0, 0.035 * math.sin(frame * 2 * math.pi / period))

    rig.clip('Reposo', [(f, {**flap(f, 24), 'head': (0, 12 * math.sin(f * 2 * math.pi / 96), 0)}, hover(f)) for f in range(1, 98, 4)])
    rig.clip('Correr', [(f, {**flap(f), 'hips': (14, 0, 0), 'head': (-12, 0, 0)}, hover(f, 16)) for f in range(1, 18, 2)])
    rig.clip('Atacar', [
        (1, {**flap(1), 'hips': (0, 0, 0)}),
        (7, {**flap(4), 'hips': (-24, 0, 0), 'head': (-14, 0, 0), 'footL': (-50, 0, 0), 'footR': (-50, 0, 0)}, (0, 0.05, 0.1)),
        (11, {**flap(6), 'hips': (32, 0, 0), 'head': (16, 0, 0), 'footL': (-70, 0, 0), 'footR': (-70, 0, 0)}, (0, -0.32, -0.2)),
        (22, flap(2)),
    ])
    rig.clip('Golpeado', [(1, flap(1)), (4, {**flap(2), 'hips': (-20, 0, 10), 'head': (-14, 8, 0)}, (0, 0.05, 0.03)), (13, flap(1))])
    rig.clip('Morir', [
        (1, flap(1)),
        (10, {'hips': (20, 0, 20), 'wingL': (0, 30, 0), 'wingR': (0, -30, 0)}, (0, 0, -0.45)),
        (24, {'hips': (86, 0, 30), 'head': (10, 20, 0), 'wingL': (0, 8, 0), 'wingR': (0, -8, 0)}, (0, 0, -1.0)),
    ])
    rig.export('buho.glb')


# --- Fantasma del jugador ---


def fantasma():
    scene = fg.fresh_scene('Fantasma')
    sheet = fg.material('sabana', (0.78, 0.92, 1), rough=1)
    face = fg.material('cara', (0.03, 0.05, 0.1), rough=1)
    bones = [
        ('body', None, (0, 0, 0.35), (0, 0, 1.35)),
        ('head', 'body', (0, 0, 1.35), (0, 0, 1.85)),
        ('hem', 'body', (0, 0, 0.45), (0, 0, 0.02)),
        ('armL', 'body', (0.42, -0.08, 1.2), (0.5, -0.14, 0.82)),
        ('armR', 'body', (-0.42, -0.08, 1.2), (-0.5, -0.14, 0.82)),
    ]
    rig = fg_rig.Rig(scene, 'FG_Fantasma', bones)
    b = fg.Builder('Sabana')
    SIDES = 28

    def ring(z, r, wave=0.0, lift=0.0):
        pts = []
        for i in range(SIDES):
            a = 2 * math.pi * i / SIDES
            k = r * (1 + wave * math.sin(a * 7))
            pts.append((k * math.cos(a), k * math.sin(a), z + lift * math.cos(a * 7)))
        return pts

    def band(lower, upper, group):
        vs0 = [b.bm.verts.new(p) for p in lower]
        vs1 = [b.bm.verts.new(p) for p in upper]
        faces = [b.bm.faces.new((vs0[i], vs0[(i + 1) % SIDES], vs1[(i + 1) % SIDES], vs1[i])) for i in range(SIDES)]
        b._finish(vs0 + vs1, faces, sheet, group)
        return vs1

    # Borde ondulado: una pieza aparte que oscila bajo la sábana.
    band(ring(0.02, 0.56, wave=0.09, lift=0.08), ring(0.5, 0.49), 'hem')
    levels = [(0.46, 0.5), (0.8, 0.43), (1.2, 0.4), (1.45, 0.37), (1.66, 0.29), (1.8, 0.16), (1.85, 0.02)]
    for (z0, r0), (z1, r1) in zip(levels, levels[1:]):
        band(ring(z0, r0), ring(z1, r1), 'head' if z0 >= 1.4 else 'body')
    for s, x in (('L', 1), ('R', -1)):
        b.blob((x * 0.46, -0.12, 1.02), (0.13, 0.13, 0.22), sheet, f'arm{s}', subdiv=2)
    rig.part(b)
    f = fg.Builder('Cara')
    for x in (-1, 1):
        f.blob((x * 0.13, -0.34, 1.5), (0.07, 0.04, 0.1), face, 'head', subdiv=2)
    f.blob((0, -0.36, 1.26), (0.065, 0.04, 0.075), face, 'body', subdiv=2)
    rig.part(f)

    def float_pose(t, lean=0.0):
        a = 2 * math.pi * t
        return {
            'body': (lean + 2 * math.sin(a * 2), 0, 2 * math.sin(a)),
            'head': (-lean * 0.4, 3 * math.sin(a), 0),
            'hem': (5 * math.sin(a * 2), 0, 22 * math.sin(a)),
            'armL': (-12 + 10 * math.sin(a * 2), 12 + 6 * math.sin(a), 0),
            'armR': (-12 + 10 * math.sin(a * 2 + 1), -12 - 6 * math.sin(a), 0),
        }

    rig.clip('Reposo', [(1 + i * 8, float_pose(i / 12), (0, 0, 0.07 * math.sin(2 * math.pi * i / 6))) for i in range(13)])
    rig.clip('Avanzar', [(1 + i * 4, float_pose(i / 10, lean=16), (0, 0, 0.05 * math.sin(2 * math.pi * i / 5))) for i in range(11)])
    rig.export('fantasma.glb')


zorro()
tortuga()
buho()
fantasma()
print('listo')
