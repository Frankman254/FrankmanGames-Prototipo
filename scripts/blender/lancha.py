# Lancha de pescador panameña para cruzar de Iguanera a Pedasol, con clip "Reposo": se mece.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/lancha.py
# Escribe assets/models/lancha.glb. Proa hacia +X, base en z = 0.
# Casco de verdad, no cajas: secciones en U a lo largo de la eslora, con arrufo (la proa sube),
# casco con grosor, cuadernas, bancadas, regala, motor fuera de borda, cabo de proa, red y remo.
import math
import os
import sys
import bpy
import bmesh

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

LENGTH = 5.6
BEAM = 1.7
DEPTH = 0.78
SECTIONS = 14
RING = 9  # puntos de una sección: regala babor → quilla → regala estribor
THICK = 0.05
WATERLINE = 0.3

scene = fg.reset()
hull_top = fg.material('Casco', (0.05, 0.52, 0.6), rough=0.55)
hull_low = fg.material('Fondo', (0.55, 0.12, 0.08), rough=0.6)
stripe = fg.material('Franja', (0.95, 0.74, 0.14), rough=0.5)
inside = fg.material('Interior', (0.86, 0.84, 0.76), rough=0.8)
wood = fg.material('Tablas', (0.47, 0.3, 0.15), rough=0.85)
motor = fg.material('Motor', (0.14, 0.15, 0.17), metallic=0.4, rough=0.4)
cowl = fg.material('Tapa', (0.2, 0.27, 0.42), metallic=0.2, rough=0.35)
rope = fg.material('Cabo', (0.78, 0.68, 0.48), rough=0.95)
net = fg.material('Red', (0.2, 0.42, 0.3), rough=0.95)


def section(t):
    """Sección en x = t (0 popa, 1 proa): media manga, puntal y altura de la regala."""
    x = -LENGTH / 2 + t * LENGTH
    # Manga: llena en el centro, se cierra en la proa y algo menos en la popa (espejo).
    half = BEAM / 2 * (math.sin(math.pi * (0.18 + 0.82 * t)) ** 0.7) if t > 0.02 else BEAM / 2 * 0.72
    if t > 0.97:
        half = 0.02
    sheer = DEPTH + 0.35 * t ** 3 + 0.05 * (1 - t) ** 2  # la regala sube hacia la proa
    keel = 0.04 + 0.22 * t ** 4  # el fondo también sube en la proa
    return x, half, keel, sheer


def ring(t, shrink=0.0):
    x, half, keel, sheer = section(t)
    half = max(0.01, half - shrink)
    pts = []
    for i in range(RING):
        a = math.pi * i / (RING - 1)  # 0 babor … π estribor
        y = math.cos(a) * half
        # Fondo en V suave: más hondo en el centro de la sección.
        depth = math.sin(a) ** 1.4
        z = sheer - (sheer - keel - shrink * 0.6) * depth
        pts.append((x, y, z))
    return pts


def hull():
    b = fg.Builder('FG_Lancha_Casco')
    bm = b.bm
    outer = [[bm.verts.new(p) for p in ring(i / (SECTIONS - 1))] for i in range(SECTIONS)]
    # En la roda las dos caras se juntan: sin grosor, para que no asome el interior.
    inner = [[bm.verts.new(p) for p in ring(i / (SECTIONS - 1), THICK * min(1, (SECTIONS - 1 - i) / 2))] for i in range(SECTIONS)]
    faces_low, faces_top, faces_in = [], [], []
    for s in range(SECTIONS - 1):
        for i in range(RING - 1):
            f = bm.faces.new((outer[s][i], outer[s + 1][i], outer[s + 1][i + 1], outer[s][i + 1]))
            zc = sum(v.co.z for v in f.verts) / 4
            (faces_low if zc < WATERLINE else faces_top).append(f)
            if s < SECTIONS - 3:  # en la roda la cara de dentro sobra y asomaría
                faces_in.append(bm.faces.new((inner[s][i + 1], inner[s + 1][i + 1], inner[s + 1][i], inner[s][i])))
        # Canto de la regala, por las dos bandas.
        for i in (0, RING - 1):
            faces_top.append(bm.faces.new((outer[s][i], inner[s][i], inner[s + 1][i], outer[s + 1][i]) if i == 0 else (outer[s + 1][i], inner[s + 1][i], inner[s][i], outer[s][i])))
    # Espejo de popa, cerrado.
    stern = bm.faces.new([*outer[0][::-1]])
    faces_top.append(stern)
    bmesh.ops.recalc_face_normals(bm, faces=faces_low + faces_top + faces_in)
    verts = [v for r in outer + inner for v in r]
    b._finish(verts, faces_low, hull_low, None)
    b._finish([], faces_top, hull_top, None)
    b._finish([], faces_in, inside, None)
    return b


b = hull()
# Franja amarilla bajo la regala, por las dos bandas, siguiendo el arrufo.
for side in (-1, 1):
    prev = None
    for s in range(1, SECTIONS - 1):
        x, half, keel, sheer = section(s / (SECTIONS - 1))
        p = (x, side * (half + 0.012), sheer - 0.1)
        if prev:
            b.tube(prev, p, 0.035, 0.035, stripe, sides=5, flat=0.4)
        prev = p
# Regala de madera y cuadernas por dentro.
for side in (-1, 1):
    prev = None
    for s in range(SECTIONS - 1):
        x, half, keel, sheer = section(s / (SECTIONS - 1))
        p = (x, side * half, sheer + 0.02)
        if prev:
            b.tube(prev, p, 0.04, 0.04, wood, sides=5)
        prev = p
for s in range(2, SECTIONS - 2, 2):
    pts = ring(s / (SECTIONS - 1), THICK + 0.02)
    for i in range(RING - 1):
        b.tube(pts[i], pts[i + 1], 0.025, 0.025, wood, sides=4)
# Bancadas y fondo de tablas.
for t in (0.22, 0.48, 0.72):
    x, half, keel, sheer = section(t)
    b.box((x, 0, sheer - 0.22), (0.28, half * 2 - 0.16, 0.05), wood)
    b.box((x, 0, (sheer - 0.22 + keel) / 2), (0.08, 0.08, sheer - 0.22 - keel), wood)
for k in range(-2, 3):
    b.box((-0.25, k * 0.11, 0.13), (LENGTH * 0.42, 0.09, 0.025), wood)
# Motor fuera de borda: soporte, tapa redondeada, pierna y hélice.
mx = -LENGTH / 2 - 0.08
b.box((mx + 0.06, 0, DEPTH - 0.02), (0.16, 0.3, 0.12), motor)
b.blob((mx - 0.12, 0, DEPTH + 0.17), (0.22, 0.15, 0.15), cowl, subdiv=2)
b.box((mx - 0.12, 0, DEPTH + 0.3), (0.3, 0.2, 0.04), cowl)
b.blob((mx - 0.12, 0, DEPTH + 0.02), (0.2, 0.15, 0.09), motor, subdiv=2)
b.tube((mx - 0.12, 0, DEPTH - 0.05), (mx - 0.14, 0, -0.32), 0.05, 0.04, motor, sides=6)
b.blob((mx - 0.14, 0, -0.34), (0.11, 0.06, 0.06), motor, subdiv=1)
for k in range(3):
    a = k * math.tau / 3
    b.box((mx - 0.24, math.cos(a) * 0.09, -0.34 + math.sin(a) * 0.09), (0.02, 0.06, 0.14), motor)
b.tube((mx - 0.12, 0, DEPTH + 0.1), (mx + 0.55, 0, DEPTH + 0.16), 0.018, 0.018, motor, sides=4)  # caña del timón
# Cabo de proa, en curva hasta el agua, y un rollo de red sobre la bancada de popa.
x, half, keel, sheer = section(0.98)
prev = (x, 0, sheer)
for k in range(1, 7):
    t = k / 6
    p = (x + 0.6 * t, 0.1 * t, sheer - 1.0 * t + 0.55 * t * (1 - t) * 0)
    p = (x + 0.65 * t, 0.12 * t, sheer - 1.05 * math.sin(t * math.pi / 2))
    b.tube(prev, p, 0.016, 0.016, rope, sides=4)
    prev = p
x, half, keel, sheer = section(0.22)
b.blob((x - 0.05, 0.1, sheer - 0.1), (0.3, 0.38, 0.12), net, subdiv=2)
b.blob((x + 0.05, -0.15, sheer - 0.05), (0.18, 0.2, 0.1), net, subdiv=1)
# Remo apoyado de banda a banda.
x2, h2, _, s2 = section(0.6)
b.tube((x2 - 1.2, -h2 * 0.6, s2 - 0.05), (x2 + 0.9, h2 * 0.7, s2 + 0.02), 0.022, 0.022, wood, sides=5)
b.box((x2 + 1.05, h2 * 0.75, s2 + 0.03), (0.42, 0.13, 0.02), wood)
root = b.object(scene)
for poly in root.data.polygons:
    poly.use_smooth = True

frames = 72
keys = [(f, 2.6 * math.sin(2 * math.pi * (f - 1) / frames)) for f in range(1, frames + 2, 4)]
act = fg.key_rotation(root, 'Reposo', keys, axis=0)
ad = root.animation_data
ad.action = None
track = ad.nla_tracks.new()
track.name = 'Reposo'
track.strips.new(act.name, 1, act)
fg.export('lancha.glb', scene, [root])
print('lancha lista')
