"""Crestalba: ave montable original de FrankmanGames.

No reproduce la Falcolomba ni otra criatura de DOFUS: combina anatomía de ave
corredora tropical, penacho bifurcado, cola corta en abanico, alas redondeadas
y una silla suspendida sin rollo trasero. Una topología, un rig y siete clips;
las diez apariencias sólo cambian materiales por región.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

try:
    HERE = os.path.dirname(bpy.path.abspath(__file__))
except NameError:
    HERE = r"C:\Users\frank\Desktop\2026\FrankmanGames-Prototipo\scripts\blender"
sys.path.insert(0, HERE)
import fg
import fg_rig

ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
PALETTE = json.load(open(os.path.join(ROOT, "data", "art", "crestalba_variantes.json"), encoding="utf-8"))
BASE = PALETTE["base"]
REGIONS = PALETTE["regiones"]


def srgb(hexcode):
    h = hexcode.lstrip("#")
    values = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        values.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(values)


scene = fg.fresh_scene("Crestalba")
M = {}
for region in REGIONS:
    color = srgb(PALETTE["variantes"][BASE][region])
    M[region] = fg.material(f"montura_{region}", color, metallic=0.55 if region == "herrajes" else 0.0,
                            rough=0.38 if region == "herrajes" else 0.72)
P, S, MASK, CHEST, BEAK, LEATHER, METAL = (M[r] for r in REGIONS)
EYE = fg.material("crestalba_ojo_iris", srgb("#d7b65b"), rough=0.22)
PUPIL = fg.material("crestalba_ojo_pupila", srgb("#11151a"), rough=0.16)
GLINT = fg.material("crestalba_ojo_brillo", (1, 1, 1), rough=0.1, emit=(1, 1, 1), strength=0.35)

BONES = [
    ("hips", None, (0, 0.20, 0.78), (0, -0.05, 0.90)),
    ("chest", "hips", (0, -0.05, 0.90), (0, -0.35, 1.12)),
    ("neck", "chest", (0, -0.35, 1.12), (0, -0.50, 1.34)),
    ("head", "neck", (0, -0.50, 1.34), (0, -0.76, 1.50)),
    ("crest", "head", (0, -0.61, 1.70), (0, -0.48, 1.96)),
    ("tail", "hips", (0, 0.42, 0.92), (0, 0.82, 1.02)),
]
for side, sign in (("L", 1), ("R", -1)):
    BONES += [
        (f"wing_{side}", "chest", (0.34 * sign, -0.20, 1.12), (0.70 * sign, -0.02, 1.12)),
        (f"wingTip_{side}", f"wing_{side}", (0.70 * sign, -0.02, 1.12), (1.12 * sign, 0.12, 1.10)),
        (f"thigh_{side}", "hips", (0.21 * sign, 0.00, 0.60), (0.22 * sign, -0.02, 0.34)),
        (f"shin_{side}", f"thigh_{side}", (0.22 * sign, -0.02, 0.34), (0.22 * sign, -0.05, 0.10)),
        (f"foot_{side}", f"shin_{side}", (0.22 * sign, -0.05, 0.10), (0.22 * sign, -0.20, 0.03)),
    ]

rig = fg_rig.Rig(scene, "FG_Crestalba", BONES)


def smooth_uv(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.025)
    bpy.ops.object.mode_set(mode="OBJECT")


def finish(builder):
    obj = rig.part(builder)
    smooth_uv(obj)
    return obj


def feather(builder, base, direction, width, thickness, mat, bone):
    """Prisma de pluma redondeada y apuntada; no usa tarjetas transparentes."""
    a = Vector(base)
    d = Vector(direction)
    length = d.length
    d.normalize()
    n = Vector((0, 0, 1))
    if abs(d.dot(n)) > 0.9:
        n = Vector((0, 1, 0))
    side = d.cross(n).normalized()
    n = side.cross(d).normalized()
    shoulder = a + d * (length * 0.38)
    tip = a + d * length
    outline = [a - side * width * 0.35, shoulder - side * width, tip,
               shoulder + side * width, a + side * width * 0.35]
    builder.poly([p - n * thickness for p in outline], [p + n * thickness for p in outline], mat, bone)


# Cuerpo v2: volumen de montura, pecho profundo y plumaje en capas. La silueta
# sigue siendo alta y tropical, distinta del ave agazapada de la referencia.
b = fg.Builder("body")
b.blob((0, 0.05, 0.94), (0.55, 0.61, 0.59), P, "hips", subdiv=3)
b.blob((0, -0.34, 1.12), (0.43, 0.36, 0.43), CHEST, "chest", subdiv=3)
# Collar festoneado y escamas de pecho: dan lectura de pluma sin texturas.
for side in (-1, 1):
    for row in range(3):
        for col in range(3 - row):
            x = side * (0.10 + col * 0.105)
            feather(b, (x, -0.48 + row * 0.09, 1.25 - row * 0.10),
                    (side * 0.035, 0.08, -0.16), 0.075, 0.018,
                    CHEST if row < 2 else S, "chest")
for side in (-1, 1):
    for row in range(3):
        feather(b, (0.34 * side, -0.02 + row * 0.18, 1.17 - row * 0.09),
                (0.08 * side, 0.24, -0.13), 0.115, 0.025, S, "hips")
finish(b)

# Cabeza amable de ave tropical: grande, redonda y con pico profundo pero corto.
h = fg.Builder("head")
h.blob((0, -0.66, 1.56), (0.43, 0.40, 0.41), P, "head", subdiv=3)
h.blob((0, -0.91, 1.42), (0.31, 0.18, 0.23), CHEST, "head", subdiv=2)
for side in (-1, 1):
    h.blob((0.315 * side, -0.77, 1.59), (0.125, 0.140, 0.150), MASK, "head", subdiv=2)
    h.blob((0.315 * side, -0.925, 1.605), (0.066, 0.030, 0.076), EYE, "head", subdiv=2)
    h.blob((0.315 * side, -0.956, 1.605), (0.032, 0.018, 0.041), PUPIL, "head", subdiv=2)
    h.blob((0.300 * side, -0.978, 1.635), (0.012, 0.009, 0.014), GLINT, "head", subdiv=1)
    feather(h, (0.25 * side, -0.88, 1.69), (0.18 * side, -0.015, -0.02),
            0.060, 0.018, MASK, "head")
    # Pequeñas plumas de mejilla rompen el contorno esférico.
    feather(h, (0.29 * side, -0.89, 1.45), (0.16 * side, 0.02, -0.10),
            0.075, 0.020, CHEST, "head")
# Pico de dos piezas con punta descendente suave, no pico de halcón.
h.poly([(-0.17,-0.94,1.52),(0.17,-0.94,1.52),(0.10,-1.22,1.43),(-0.10,-1.22,1.43)],
       [(-0.11,-0.94,1.36),(0.11,-0.94,1.36),(0.055,-1.22,1.39),(-0.055,-1.22,1.39)], BEAK, "head")
h.poly([(-0.105,-0.96,1.39),(0.105,-0.96,1.39),(0.050,-1.17,1.36),(-0.050,-1.17,1.36)],
       [(-0.075,-0.95,1.34),(0.075,-0.95,1.34),(0.035,-1.15,1.34),(-0.035,-1.15,1.34)], MASK, "head")
finish(h)

# Cresta en abanico ascendente: cinco plumas desiguales, rasgo propio.
c = fg.Builder("crest")
for i, (x, dx, dz) in enumerate(((-0.15,-0.18,0.34),(-0.075,-0.09,0.43),
                                  (0,0,0.48),(0.075,0.09,0.43),(0.15,0.18,0.34))):
    feather(c, (x,-0.55,1.76), (dx,0.10,dz), 0.095 if i in (0,4) else 0.11,
            0.032, S if i % 2 else CHEST, "crest")
finish(c)

# Alas v2 compactas en reposo: cobertoras redondas y primarias cortas. Al volar
# los huesos abren el mismo abanico sin producir las tiras horizontales de v1.
for side, sign in (("L", 1), ("R", -1)):
    w = fg.Builder(f"wing_{side}")
    root = f"wing_{side}"
    tipbone = f"wingTip_{side}"
    w.blob((0.43 * sign, -0.06, 1.14), (0.19, 0.31, 0.15), S, root, subdiv=3)
    for row in range(3):
        for i in range(4):
            feather(w, ((0.40 + 0.045*i)*sign, -0.12 + 0.10*i + 0.08*row, 1.22 - 0.09*row),
                    ((0.05 + 0.010*i)*sign, 0.21 + 0.025*i, -0.10 - 0.020*row),
                    0.115, 0.026, S if row == 0 else P, root if row < 2 else tipbone)
    for i in range(5):
        feather(w, ((0.50 + 0.025*i)*sign, 0.18 + 0.06*i, 1.02 - 0.035*i),
                ((0.040 + 0.008*i)*sign, 0.22 + 0.025*i, -0.11), 0.12, 0.030, P, tipbone)
    finish(w)

# Cola corta que sube en abanico, evitando la cola de cuchillas horizontal.
t = fg.Builder("tail")
for i in range(9):
    x = (i - 4) * 0.065
    feather(t, (x * 0.45, 0.42, 1.00), (x * 1.05, 0.20 - abs(x)*0.10, 0.44 - abs(x)*0.18),
            0.12, 0.032, S if i in (0,1,7,8) else P, "tail")
finish(t)

# patas largas con tres dedos delanteros y uno trasero; apoyo exacto en z=0.
for side, sign in (("L", 1), ("R", -1)):
    leg = fg.Builder(f"leg_{side}")
    x = 0.22 * sign
    leg.blob((x, -0.01, 0.50), (0.17, 0.18, 0.21), P, f"thigh_{side}", subdiv=2)
    leg.tube((x,-0.03,0.39),(x,-0.05,0.11),0.076,0.060,BEAK,f"shin_{side}",sides=10)
    leg.blob((x,-0.10,0.080),(0.090,0.135,0.065),BEAK,f"foot_{side}",subdiv=2)
    for dx, dy, length in ((-0.085,-0.18,1),(0,-0.22,1),(0.085,-0.18,1),(0,0.13,0.75)):
        leg.tube((x,-0.10,0.065),(x+dx*sign,-0.10+dy,0.025),0.030,0.015,BEAK,f"foot_{side}",sides=7)
        leg.tube((x+dx*sign,-0.10+dy,0.025),(x+dx*1.14*sign,-0.10+dy*1.14,0.0),0.014,0.004,MASK,f"foot_{side}",sides=6)
    finish(leg)

# Silla v2: manta escalonada, asiento acolchado, pomo y estribos; sin rollo.
sa = fg.Builder("saddle")
sa.blob((0,0.10,1.37),(0.46,0.39,0.050),S,"hips",subdiv=2)
sa.blob((0,0.07,1.41),(0.34,0.30,0.070),LEATHER,"hips",subdiv=3)
for side in (-1, 1):
    feather(sa, (0.24*side,0.10,1.38),(0.18*side,0.05,-0.16),0.10,0.020,CHEST,"hips")
sa.box((0,-0.16,1.41),(0.08,0.08,0.15),LEATHER,"hips")
sa.tube((0,-0.16,1.48),(0,-0.13,1.56),0.05,0.04,METAL,"hips",sides=8)
for side in (-1, 1):
    sa.tube((0.36*side,0.10,1.30),(0.43*side,0.11,0.87),0.018,0.018,LEATHER,"hips",sides=6)
    sa.tube((0.43*side,0.11,0.87),(0.43*side,0.11,0.78),0.035,0.035,METAL,"hips",sides=7)
finish(sa)

re = fg.Builder("reins")
for side in (-1, 1):
    re.tube((0.13*side,-0.86,1.37),(0.24*side,-0.52,1.31),0.013,0.013,LEATHER,"head",sides=5)
    re.tube((0.24*side,-0.52,1.31),(0.05*side,-0.13,1.52),0.013,0.013,LEATHER,"chest",sides=5)
finish(re)

ac = fg.Builder("accessories")
for side in (-1, 1):
    ac.blob((0.42*side,0.25,1.15),(0.055,0.11,0.12),LEATHER,"hips",subdiv=2)
    ac.blob((0.47*side,0.25,1.16),(0.018,0.036,0.036),METAL,"hips",subdiv=1)
    ac.tube((0.45*side,0.25,1.05),(0.46*side,0.26,0.92),0.025,0.010,CHEST,"hips",sides=7)
finish(ac)


def anchor(name, location):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "ARROWS"
    empty.empty_display_size = 0.16
    scene.collection.objects.link(empty)
    empty.parent = rig.obj
    empty.parent_type = "BONE"
    empty.parent_bone = "hips"
    bone = rig.obj.data.bones["hips"]
    tail_matrix = Matrix.Translation(bone.tail_local) @ bone.matrix_local.to_3x3().to_4x4()
    empty.matrix_parent_inverse = tail_matrix.inverted()
    empty.location = location
    return empty


anchors = [anchor("mount_seat", (0,0.08,1.43)), anchor("rider_root", (0,0.08,1.43))]


def pose(**values):
    return values


def ground_wings(extra=0):
    return {"wing_L": (0,-18,-14-extra), "wing_R": (0,18,14+extra),
            "wingTip_L": (0,-8,-10), "wingTip_R": (0,8,10)}


def combine(*parts):
    out = {}
    for part in parts:
        out.update(part)
    return out


rig.clip("idle_ground", [
    (1, combine(ground_wings(), pose())),
    (31, combine(ground_wings(2), pose(chest=(-2,0,0), head=(2,3,0), crest=(0,2,0))), (0,0,-0.008)),
    (61, combine(ground_wings(), pose(head=(0,-3,0)))),
    (91, combine(ground_wings(2), pose(chest=(-2,0,0), head=(2,3,0))), (0,0,-0.008)),
    (121, combine(ground_wings(), pose())),
])


def step(sign, fast=False):
    swing = 34 if fast else 20
    bend = 52 if fast else 34
    return combine(ground_wings(4 if fast else 1), {
        "hips": (3,0,4*sign), "head": (-2,0,-3*sign), "tail": (0,0,-5*sign),
        "thigh_L": (-swing*sign,0,0), "shin_L": (bend if sign < 0 else 8,0,0),
        "foot_L": (8*sign,0,0), "thigh_R": (swing*sign,0,0),
        "shin_R": (bend if sign > 0 else 8,0,0), "foot_R": (-8*sign,0,0),
    })


rig.clip("walk", [(1,step(1)),(9,step(1), (0,0,0.025)),(17,step(-1)),(25,step(-1),(0,0,0.025)),(33,step(1))])
rig.clip("run", [(1,step(1,True),(0,0,-0.02)),(6,step(1,True),(0,0,0.07)),
                 (11,step(-1,True),(0,0,-0.02)),(16,step(-1,True),(0,0,0.07)),(21,step(1,True),(0,0,-0.02))])

flight_up = {"wing_L": (0,-72,-12), "wing_R": (0,72,12), "wingTip_L": (0,-28,-8), "wingTip_R": (0,28,8),
             "thigh_L": (38,0,0), "thigh_R": (38,0,0), "shin_L": (64,0,0), "shin_R": (64,0,0)}
flight_down = {"wing_L": (0,35,-8), "wing_R": (0,-35,8), "wingTip_L": (0,50,-5), "wingTip_R": (0,-50,5),
               "thigh_L": (38,0,0), "thigh_R": (38,0,0), "shin_L": (64,0,0), "shin_R": (64,0,0)}
rig.clip("takeoff", [(1,combine(ground_wings(),pose(hips=(-8,0,0)))),(8,step(1,True),(0,0,-0.08)),
                     (16,combine(flight_down,pose(hips=(14,0,0))),(0,0,0.18)),
                     (26,combine(flight_up,pose(hips=(-5,0,0))),(0,0,0.52)),
                     (36,combine(flight_down,pose(hips=(5,0,0))),(0,0,0.72))])
rig.clip("fly_idle", [(1,combine(flight_up,pose(head=(3,0,0))),(0,0,0.05)),
                      (10,combine(flight_down,pose(head=(-2,0,0))),(0,0,-0.04)),
                      (19,combine(flight_up,pose(head=(3,0,0))),(0,0,0.05))])
rig.clip("fly_forward", [(1,combine(flight_up,pose(hips=(10,0,0),head=(-5,0,0))),(0,0,0.04)),
                         (7,combine(flight_down,pose(hips=(15,0,0),head=(-8,0,0))),(0,0,-0.05)),
                         (13,combine(flight_up,pose(hips=(10,0,0),head=(-5,0,0))),(0,0,0.04))])
rig.clip("land", [(1,combine(flight_up,pose(hips=(4,0,0))),(0,0,0.70)),
                  (10,combine(flight_down,pose(hips=(-8,0,0))),(0,0,0.35)),
                  (20,combine(ground_wings(8),pose(hips=(-14,0,0))),(0,0,0.04)),
                  (30,combine(ground_wings(),pose()),(0,0,0))])

for action in rig.actions:
    action["loop"] = action.name in {"idle_ground", "walk", "run", "fly_idle", "fly_forward"}
fg.to_tracks(rig.obj, rig.actions)
for pb in rig.pose:
    pb.rotation_quaternion = (1,0,0,0)
    pb.location = (0,0,0)

blend = os.path.join(ROOT, "arte", "blender", "crestalba.blend")
os.makedirs(os.path.dirname(blend), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=blend, copy=True)
fg.export("crestalba.glb", scene, [rig.obj, *rig.parts, *anchors])

# Capturas de revisión: tres láminas versionadas y tomas individuales ignoradas.
if "--capturas" in sys.argv:
    sys.path.insert(0, HERE)
    import capturas_montura

    def show(variant):
        values = PALETTE["variantes"][variant]
        for region, mat in M.items():
            bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
            bsdf.inputs["Base Color"].default_value = (*srgb(values[region]), 1)
            if region in values.get("rugosidad", {}):
                bsdf.inputs["Roughness"].default_value = values["rugosidad"][region]

    def play(name, frame):
        rig.obj.animation_data.action = bpy.data.actions[name]
        scene.frame_set(frame)

    col = bpy.data.collections.new("CREST_capturas")
    scene.collection.children.link(col)
    out = os.path.join(ROOT, "docs", "capturas", "crestalba")
    capturas_montura.run(scene, rig.obj, rig.parts, show, play, col, out, list(PALETTE["variantes"]))
