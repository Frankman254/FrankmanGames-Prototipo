# Objetos sueltos del mundo: recursos, talleres, Piedras Pintadas, Alzador, botín y montura.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/objetos.py
# También se ejecuta dentro de Blender por MCP: usa las escenas "Objetos" y "Montura".
# Escribe assets/models/objetos.glb (piezas fijas, un material cada una) y montura.glb (clips).
# Coordenadas como en el juego (x, altura, z), con el origen en el suelo, salvo la montura.
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


def B(x, y, z):
    return (x, z, y)


scene = fg.fresh_scene('Objetos')
parts = []


def rev(name, rgb, **kw):
    return fg.material('rev_' + name, rgb, **kw)


WOOD = rev('madera', (0.4, 0.26, 0.15))
LEAF = rev('hoja', (0.25, 0.48, 0.23))
ROCK = rev('roca', (0.42, 0.41, 0.4))
ORE = rev('veta', (0.54, 0.5, 0.44), rough=0.4)
IRON = rev('hierro', (0.27, 0.28, 0.31), metallic=0.2, rough=0.5)
COPPER = rev('cobre', (0.72, 0.4, 0.2), metallic=0.2, rough=0.4)
CLOTH = rev('tela', (0.72, 0.28, 0.24), rough=1)
STONE = rev('piedra', (0.55, 0.53, 0.5))
GLOW = rev('luz', (0.3, 0.8, 0.9), emit=(0.25, 0.75, 0.85), strength=2)
GOLD = rev('oro', (1, 0.8, 0.25), metallic=0.2, rough=0.35)


def piece(name, mat, build):
    b = fg.Builder(name)
    build(b, mat)
    parts.append(b.object(scene))


def box(b, m, x, y, z, w, h, d):
    b.box(B(x, y, z), (w, d, h), m)


def cyl(b, m, x, y0, y1, z, r0, r1, sides=8):
    b.tube(B(x, y0, z), B(x, y1, z), r0, r1, m, sides=sides)


def ring(b, m, diameter, thickness, y, segments=24, sides=4):
    r = diameter / 2
    prev = None
    for i in range(segments + 1):
        t = 2 * math.pi * i / segments
        q = B(r * math.cos(t), y, r * math.sin(t))
        if prev:
            b.tube(prev, q, thickness / 2, thickness / 2, m, sides=sides)
        prev = q


# --- Recursos: distintos del decorado, con su aro en el suelo ---


def res_trunk(b, m):
    cyl(b, m, 0, 0, 0.3, 0, 0.36, 0.25, sides=8)
    cyl(b, m, 0, 0.3, 2.7, 0, 0.25, 0.14, sides=8)
    b.tube(B(0, 2.0, 0), B(0.55, 2.7, 0.15), 0.1, 0.05, m, sides=5)
    b.tube(B(0, 1.8, 0), B(-0.5, 2.5, -0.2), 0.09, 0.05, m, sides=5)
    for a in (0.4, 2.5, 4.4):
        b.tube(B(0.15 * math.cos(a), 0.2, 0.15 * math.sin(a)), B(0.6 * math.cos(a), 0, 0.6 * math.sin(a)), 0.12, 0.03, m, sides=5)


def res_crown(b, m):
    for x, y, z, r in ((0, 3.05, 0, 1.3), (0.55, 3.75, -0.25, 0.85), (-0.6, 3.5, 0.35, 0.8), (0.1, 2.6, 0.75, 0.7), (-0.2, 4.1, 0.1, 0.6)):
        b.blob(B(x, y, z), (r, r, r * 0.9), m, subdiv=1)


piece('r_arbol_tronco', WOOD, res_trunk)
piece('r_arbol_copa', LEAF, res_crown)


def res_rock(b, m):
    b.blob(B(0, 0.42, 0), (0.72, 0.72, 0.52), m, subdiv=1)
    b.blob(B(0.42, 0.22, 0.3), (0.34, 0.3, 0.26), m, subdiv=1)
    b.blob(B(-0.4, 0.2, -0.28), (0.3, 0.34, 0.22), m, subdiv=1)


def res_vein(b, m):
    for i in range(5):
        a = i * 2 * math.pi / 5 + 0.3
        y = 0.42 + (i % 3) * 0.2
        r = 0.6 - (i % 3) * 0.14
        b.tube(B(r * 0.8 * math.cos(a), y - 0.06, r * 0.8 * math.sin(a)), B(r * 1.35 * math.cos(a), y + 0.2, r * 1.35 * math.sin(a)), 0.2, 0.02, m, sides=5)


piece('r_roca', ROCK, res_rock)
piece('r_veta', ORE, res_vein)


def res_plant(b, m):
    for i in range(7):
        a = i * 2 * math.pi / 7
        ca, sa = math.cos(a), math.sin(a)
        # Hoja larga en lámina con doblez: tres secciones que se abren y caen.
        s0 = 0.05
        p0 = (0.06 * ca, 0.02, 0.06 * sa)
        p1 = (0.28 * ca, 0.5 + (i % 2) * 0.14, 0.28 * sa)
        p2 = (0.58 * ca, 0.66 + (i % 2) * 0.14, 0.58 * sa)
        p3 = (0.82 * ca, 0.42 + (i % 2) * 0.14, 0.82 * sa)
        for (q0, r0), (q1, r1) in (((p0, s0), (p1, 0.13)), ((p1, 0.13), (p2, 0.12)), ((p2, 0.12), (p3, 0.01))):
            b.tube(B(*q0), B(*q1), r0, r1, m, sides=4, flat=0.25)


piece('r_planta', LEAF, res_plant)
piece('r_aro', GOLD, lambda b, m: ring(b, m, 1.0, 0.026, 0, segments=28))

# --- Talleres ---


def anvil_wood(b, m):
    cyl(b, m, 0, 0, 0.55, 0, 0.46, 0.4, sides=10)
    for a in (0, 2.1, 4.2):
        b.tube(B(0.3 * math.cos(a), 0.04, 0.3 * math.sin(a)), B(0.55 * math.cos(a), 0, 0.55 * math.sin(a)), 0.08, 0.04, m, sides=5)


def anvil_iron(b, m):
    box(b, m, 0, 0.58, 0, 0.6, 0.08, 0.46)
    box(b, m, 0, 0.7, 0, 0.3, 0.18, 0.28)
    box(b, m, 0.04, 0.87, 0, 1.0, 0.18, 0.42)
    b.tube(B(0.52, 0.87, 0), B(0.92, 0.91, 0), 0.17, 0.02, m, sides=7)
    box(b, m, -0.32, 0.97, 0, 0.1, 0.03, 0.1)
    # Martillo apoyado.
    box(b, m, -0.12, 0.99, 0.08, 0.2, 0.08, 0.08)
    b.tube(B(-0.12, 0.99, 0.08), B(-0.12, 0.99, -0.34), 0.016, 0.016, m, sides=4)


piece('t_yunque_madera', WOOD, anvil_wood)
piece('t_yunque_hierro', IRON, anvil_iron)


def still_wood(b, m):
    box(b, m, 0, 0.1, 0, 1.1, 0.2, 1.1)
    for x in (-0.42, 0.42):
        for z in (-0.42, 0.42):
            box(b, m, x, 0.32, z, 0.12, 0.3, 0.12)
    box(b, m, 0.9, 0.3, 0, 0.5, 0.6, 0.5)


def still_copper(b, m):
    cyl(b, m, 0, 0.32, 0.5, 0, 0.26, 0.44, sides=12)
    cyl(b, m, 0, 0.5, 0.9, 0, 0.44, 0.34, sides=12)
    cyl(b, m, 0, 0.9, 1.3, 0, 0.34, 0.09, sides=12)
    cyl(b, m, 0, 1.3, 1.5, 0, 0.09, 0.08, sides=8)
    b.tube(B(0, 1.48, 0), B(0.82, 1.2, 0), 0.06, 0.05, m, sides=6)
    b.tube(B(0.82, 1.2, 0), B(0.9, 0.62, 0), 0.05, 0.05, m, sides=6)


piece('t_alambique_madera', WOOD, still_wood)
piece('t_alambique_cobre', COPPER, still_copper)


def loom_wood(b, m):
    for x in (-0.8, 0.8):
        box(b, m, x, 0.85, 0, 0.14, 1.7, 0.14)
        box(b, m, x, 0.05, 0, 0.14, 0.1, 0.8)
    box(b, m, 0, 1.66, 0, 1.9, 0.14, 0.14)
    box(b, m, 0, 0.45, 0, 1.8, 0.12, 0.12)
    box(b, m, 0, 1.0, -0.14, 1.6, 0.06, 0.06)
    for x in (-0.6, -0.3, 0, 0.3, 0.6):
        box(b, m, x, 1.56, 0, 0.05, 0.08, 0.2)


def loom_cloth(b, m):
    pts = [B(-0.7, 1.6, 0.02), B(0.7, 1.6, 0.02), B(0.7, 0.5, 0.02), B(-0.7, 0.5, 0.02)]
    b.poly(pts, [(p[0], p[1] + 0.03, p[2]) for p in pts], m)


piece('t_telar_madera', WOOD, loom_wood)
piece('t_telar_tela', CLOTH, loom_cloth)

# --- Piedra Pintada ---


def stone_base(b, m):
    cyl(b, m, 0, 0, 0.2, 0, 1.55, 1.42, sides=10)
    cyl(b, m, 0, 0.2, 0.38, 0, 1.3, 1.2, sides=10)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        x, z = 1.0 * math.cos(a), 1.0 * math.sin(a)
        b.tube(B(x, 0.3, z), B(x * 0.95, 1.2, z * 0.95), 0.17, 0.08, m, sides=5)


piece('p_base', STONE, stone_base)
piece('p_aro', GLOW, lambda b, m: ring(b, m, 2.0, 0.1, 0.42, segments=32, sides=5))


def crystal(b, m):
    # Centrado en su origen: el juego lo hace flotar y girar.
    cyl(b, m, 0, -0.62, 0, 0, 0.01, 0.34, sides=6)
    cyl(b, m, 0, 0, 0.3, 0, 0.34, 0.26, sides=6)
    cyl(b, m, 0, 0.3, 0.82, 0, 0.26, 0.01, sides=6)


piece('p_cristal', GLOW, crystal)


# --- Alzador: estela tallada con su aro ---


def raiser(b, m):
    cyl(b, m, 0, 0, 0.16, 0, 0.5, 0.4, sides=8)
    cyl(b, m, 0, 0.16, 2.2, 0, 0.24, 0.16, sides=6)
    cyl(b, m, 0, 2.2, 2.75, 0, 0.16, 0.01, sides=6)
    for a in (0, 2.09, 4.19):
        x, z = 0.34 * math.cos(a), 0.34 * math.sin(a)
        b.tube(B(x, 0.5, z), B(x * 0.85, 1.7, z * 0.85), 0.05, 0.01, m, sides=4)
    ring(b, m, 2.0, 0.1, 0.12, segments=24)


piece('a_alzador', GLOW, raiser)

# --- Botín ---


def coins(b, m):
    for x, y, z in ((-0.05, 0.03, 0), (0.05, 0.03, 0.04), (0, 0.075, -0.03), (0.02, 0.12, 0.01)):
        cyl(b, m, x, y - 0.02, y + 0.02, z, 0.11, 0.11, sides=12)


def bag(b, m):
    b.blob(B(0, 0.15, 0), (0.18, 0.18, 0.15), m, subdiv=2)
    cyl(b, m, 0, 0.27, 0.32, 0, 0.05, 0.05, sides=8)
    cyl(b, m, 0, 0.32, 0.4, 0, 0.05, 0.085, sides=8)


def small_chest(b, m):
    box(b, m, 0, 0.11, 0, 0.42, 0.22, 0.28)
    w, r = 0.21, 0.14
    prof = [(r * math.cos(math.pi * i / 6), r * 0.8 * math.sin(math.pi * i / 6)) for i in range(7)]
    b.poly([B(-w, 0.22 + y, z) for z, y in prof], [B(w, 0.22 + y, z) for z, y in prof], m)


def chest_trim(b, m):
    r = 0.15
    for x in (-0.14, 0.14):
        box(b, m, x, 0.11, 0, 0.04, 0.23, 0.3)
        prev = None
        for i in range(7):
            t = math.pi * i / 6
            q = B(x, 0.22 + r * 0.8 * math.sin(t), r * math.cos(t))
            if prev:
                b.tube(prev, q, 0.02, 0.02, m, sides=4)
            prev = q
    box(b, m, 0, 0.21, -0.155, 0.07, 0.09, 0.03)


piece('b_monedas', GOLD, coins)
piece('b_bolsa', CLOTH, bag)
piece('b_cinta', GOLD, lambda b, m: cyl(b, m, 0, 0.29, 0.32, 0, 0.06, 0.06, sides=10))
piece('b_cofre', WOOD, small_chest)
piece('b_herraje', GOLD, chest_trim)

# --- Corcho de pesca: centrado en su origen ---


def bobber(b, m):
    cyl(b, m, 0, -0.11, -0.03, 0, 0.03, 0.11, sides=10)
    cyl(b, m, 0, -0.03, 0.04, 0, 0.11, 0.09, sides=10)
    cyl(b, m, 0, 0.04, 0.1, 0, 0.09, 0.02, sides=10)
    cyl(b, m, 0, 0.1, 0.22, 0, 0.018, 0.012, sides=6)


piece('c_corcho', rev('corcho', (0.9, 0.2, 0.15)), bobber)

fg.export('objetos.glb', scene, parts, materials=False)

# --- Montura: esqueleto y clips; mira a -Y (+Z en el juego), patas en z = 0 ---

scene = fg.fresh_scene('Montura')
COAT = fg.material('coat', (0.49, 0.42, 0.33))
DARK = fg.material('dark', (0.25, 0.2, 0.16))
bones = [
    ('hips', None, (0, 0.62, 0.95), (0, 0.1, 0.95)),
    ('chest', 'hips', (0, 0.1, 0.95), (0, -0.55, 0.98)),
    ('neck', 'chest', (0, -0.6, 1.05), (0, -0.92, 1.5)),
    ('head', 'neck', (0, -0.92, 1.5), (0, -1.4, 1.42)),
    ('tail', 'hips', (0, 0.75, 1.1), (0, 0.95, 0.5)),
]
for name, x, y, parent in (('FL', 0.2, -0.5, 'chest'), ('FR', -0.2, -0.5, 'chest'), ('BL', 0.2, 0.55, 'hips'), ('BR', -0.2, 0.55, 'hips')):
    bones += [(f'leg{name}', parent, (x, y, 0.82), (x, y, 0.42)), (f'shin{name}', f'leg{name}', (x, y, 0.42), (x, y, 0.04))]
rig = fg_rig.Rig(scene, 'FG_Montura', bones)
b = fg.Builder('Cuerpo')
b.tube((0, 0.78, 0.95), (0, 0.1, 0.96), 0.27, 0.32, COAT, 'hips', sides=9)
b.tube((0, 0.1, 0.96), (0, -0.62, 1.0), 0.32, 0.3, COAT, 'chest', sides=9)
b.tube((0, -0.58, 1.05), (0, -0.92, 1.52), 0.2, 0.13, COAT, 'neck', sides=7)
b.box((0, -1.08, 1.5), (0.26, 0.46, 0.28), COAT, 'head')
b.box((0, -1.36, 1.42), (0.2, 0.2, 0.2), COAT, 'head')
b.box((0, -1.47, 1.42), (0.16, 0.03, 0.14), DARK, 'head')
for x in (-0.09, 0.09):
    b.tube((x, -0.92, 1.62), (x * 1.4, -0.86, 1.9), 0.05, 0.01, COAT, 'head', sides=4)
    b.blob((x * 1.5, -1.13, 1.55), (0.025, 0.03, 0.03), DARK, 'head', subdiv=1)
# Crin, cola, silla y cincha.
b.box((0, -0.8, 1.42), (0.06, 0.42, 0.48), DARK, 'neck')
b.tube((0, 0.76, 1.1), (0, 0.95, 0.5), 0.05, 0.08, DARK, 'tail', sides=5)
b.tube((0, -0.18, 1.3), (0, 0.32, 1.3), 0.3, 0.3, DARK, 'chest', sides=8, flat=0.28)
b.box((0, 0.05, 0.98), (0.68, 0.14, 0.66), DARK, 'chest')
for name, x, y, r in (('FL', 0.2, -0.5, 0.09), ('FR', -0.2, -0.5, 0.09), ('BL', 0.2, 0.55, 0.11), ('BR', -0.2, 0.55, 0.11)):
    b.tube((x, y, 0.92), (x, y, 0.42), r, r * 0.6, COAT, f'leg{name}', sides=6)
    b.tube((x, y, 0.44), (x, y, 0.08), r * 0.55, r * 0.45, COAT, f'shin{name}', sides=6)
    b.box((x, y - 0.02, 0.05), (0.13, 0.16, 0.1), DARK, f'shin{name}')
rig.part(b)


def walk(t):
    pose = {}
    for leg, phase in (('FL', 0.0), ('FR', 0.5), ('BL', 0.5), ('BR', 0.0)):
        s = math.sin(2 * math.pi * (t + phase))
        c = math.cos(2 * math.pi * (t + phase))
        pose[f'leg{leg}'] = (-30 * s, 0, 0)
        pose[f'shin{leg}'] = (max(0, c) * 42 * (1 if leg[0] == 'B' else -1), 0, 0)
    bob = math.sin(4 * math.pi * t)
    pose['neck'] = (5 * bob, 0, 0)
    pose['head'] = (-4 * bob, 0, 0)
    pose['tail'] = (10 * bob, 0, 0)
    return pose, (0, 0, 0.03 * abs(bob))


rest = {'tail': (0, 0, 0)}
rig.clip('Reposo', [
    (1, rest),
    (31, {'neck': (4, 0, 0), 'head': (-5, 6, 0), 'tail': (0, 14, 0), 'chest': (-1.2, 0, 0)}, (0, 0, -0.008)),
    (61, {'neck': (2, 0, 0), 'head': (-2, -6, 0), 'tail': (0, -14, 0)}),
    (91, rest),
])
rig.clip('Trotar', [(1 + i * 2, *walk(i / 12)) for i in range(13)])
rig.export('montura.glb')
print('objetos', len(parts))
