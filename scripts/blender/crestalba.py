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


# body: silueta alta y estable de ave corredora, distinta del cuerpo agazapado de la referencia.
b = fg.Builder("body")
b.blob((0, 0.05, 0.91), (0.48, 0.54, 0.53), P, "hips", subdiv=2)
b.blob((0, -0.31, 1.08), (0.37, 0.30, 0.36), CHEST, "chest", subdiv=2)
for side in (-1, 1):
    for row in range(3):
        feather(b, (0.29 * side, -0.04 + row * 0.20, 1.12 - row * 0.08),
                (0.07 * side, 0.28, -0.09), 0.105, 0.025, S, "hips")
finish(b)

# head: cara redonda, pico corto y recto, dos ojos circulares sin ceja rapaz.
h = fg.Builder("head")
h.blob((0, -0.63, 1.51), (0.37, 0.34, 0.34), P, "head", subdiv=2)
h.blob((0, -0.83, 1.40), (0.27, 0.16, 0.20), CHEST, "head", subdiv=2)
for side in (-1, 1):
    h.blob((0.285 * side, -0.73, 1.55), (0.075, 0.105, 0.105), MASK, "head", subdiv=2)
    h.blob((0.326 * side, -0.754, 1.565), (0.047, 0.055, 0.060), EYE, "head", subdiv=2)
    h.blob((0.351 * side, -0.772, 1.565), (0.022, 0.028, 0.032), PUPIL, "head", subdiv=2)
    h.blob((0.367 * side, -0.790, 1.590), (0.009, 0.010, 0.012), GLINT, "head", subdiv=1)
# pico bajo y romo: cuña compacta, no gancho de halcón.
h.poly([(-0.14,-0.84,1.49),(0.14,-0.84,1.49),(0.10,-1.09,1.43),(-0.10,-1.09,1.43)],
       [(-0.09,-0.84,1.34),(0.09,-0.84,1.34),(0.055,-1.09,1.40),(-0.055,-1.09,1.40)], BEAK, "head")
finish(h)

# cresta bifurcada: dos astas suaves y una pluma central pequeña.
c = fg.Builder("crest")
feather(c, (-0.07,-0.55,1.72), (-0.18,0.08,0.38), 0.115, 0.035, CHEST, "crest")
feather(c, (0.07,-0.55,1.72), (0.18,0.08,0.38), 0.115, 0.035, CHEST, "crest")
feather(c, (0,-0.58,1.70), (0,0.02,0.28), 0.09, 0.03, S, "crest")
finish(c)

# alas con borde redondeado, en capas como hojas; reposo pegado al cuerpo.
for side, sign in (("L", 1), ("R", -1)):
    w = fg.Builder(f"wing_{side}")
    root = f"wing_{side}"
    tipbone = f"wingTip_{side}"
    w.blob((0.40 * sign, -0.08, 1.10), (0.16, 0.26, 0.11), S, root, subdiv=2)
    for i in range(4):
        feather(w, ((0.41 + 0.035*i)*sign, -0.04 + 0.12*i, 1.13 - 0.04*i),
                (0.045*sign, 0.40 + 0.05*i, -0.11 - 0.025*i), 0.14, 0.028, S, root)
    for i in range(5):
        feather(w, ((0.48 + 0.035*i)*sign, 0.15 + 0.08*i, 1.04 - 0.04*i),
                ((0.05 + 0.012*i)*sign, 0.46 + 0.05*i, -0.13), 0.15, 0.03, P, tipbone)
    finish(w)

# cola corta, ancha y semicircular.
t = fg.Builder("tail")
for i in range(7):
    x = (i - 3) * 0.075
    feather(t, (x * 0.55, 0.44, 0.95), (x * 1.6, 0.50 - abs(x)*0.20, 0.08), 0.13, 0.03,
            S if i in (0, 6) else P, "tail")
finish(t)

# patas largas con tres dedos delanteros y uno trasero; apoyo exacto en z=0.
for side, sign in (("L", 1), ("R", -1)):
    leg = fg.Builder(f"leg_{side}")
    x = 0.22 * sign
    leg.blob((x, -0.01, 0.48), (0.15, 0.16, 0.18), P, f"thigh_{side}", subdiv=2)
    leg.tube((x,-0.03,0.37),(x,-0.05,0.10),0.064,0.052,BEAK,f"shin_{side}",sides=8)
    leg.blob((x,-0.10,0.075),(0.075,0.12,0.055),BEAK,f"foot_{side}",subdiv=2)
    for dx, dy, length in ((-0.085,-0.18,1),(0,-0.22,1),(0.085,-0.18,1),(0,0.13,0.75)):
        leg.tube((x,-0.10,0.065),(x+dx*sign,-0.10+dy,0.025),0.030,0.015,BEAK,f"foot_{side}",sides=7)
        leg.tube((x+dx*sign,-0.10+dy,0.025),(x+dx*1.14*sign,-0.10+dy*1.14,0.0),0.014,0.004,MASK,f"foot_{side}",sides=6)
    finish(leg)

# silla baja de hojas superpuestas, con asa frontal; sin manta enrollada.
sa = fg.Builder("saddle")
sa.blob((0,0.10,1.33),(0.40,0.34,0.045),S,"hips",subdiv=2)
sa.blob((0,0.08,1.36),(0.30,0.27,0.055),LEATHER,"hips",subdiv=2)
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
