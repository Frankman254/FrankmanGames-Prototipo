"""Valida el contrato de assets/models/crestalba.glb."""
import json
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), "..", ".."))
CLIPS = {"idle_ground", "walk", "run", "takeoff", "fly_idle", "fly_forward", "land"}
PIECES = {"body", "head", "crest", "wing_L", "wing_R", "tail", "leg_L", "leg_R", "saddle", "reins", "accessories"}
palette = json.load(open(os.path.join(ROOT, "data", "art", "crestalba_variantes.json"), encoding="utf-8"))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "assets", "models", "crestalba.glb"))
objects = bpy.context.scene.objects
names = {o.name for o in objects}
armature = next(o for o in objects if o.type == "ARMATURE")
meshes = [o for o in objects if o.type == "MESH" and o.name in PIECES]
actions = {a.name for a in bpy.data.actions}
assert CLIPS <= actions, f"clips ausentes: {sorted(CLIPS-actions)}"
assert PIECES <= names, f"piezas ausentes: {sorted(PIECES-names)}"
assert {"mount_seat", "rider_root"} <= names, "faltan anclajes de montura"
assert len(palette["variantes"]) == 10, "deben existir diez variantes"
regions = {f"montura_{r}" for r in palette["regiones"]}
assert regions <= {m.name for m in bpy.data.materials}, "faltan regiones de material"
assert not [m for m in bpy.data.materials if "__" in m.name], "no se permiten mallas/materiales duplicados por variante"
for variant, colors in palette["variantes"].items():
    assert all(str(colors.get(region, "")).startswith("#") for region in palette["regiones"]), variant

triangles = sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
assert triangles <= 18000, f"demasiados triángulos: {triangles}"
assert all(o.data.uv_layers for o in meshes), "todas las piezas deben tener UV"
assert {"head", "neck", "crest", "wing_L", "wing_R", "wingTip_L", "wingTip_R", "tail",
        "thigh_L", "thigh_R", "shin_L", "shin_R", "foot_L", "foot_R"} <= {b.name for b in armature.data.bones}

armature.animation_data_create()
for track in list(armature.animation_data.nla_tracks):
    armature.animation_data.nla_tracks.remove(track)
idle = bpy.data.actions["idle_ground"]
armature.animation_data.action = idle
if hasattr(armature.animation_data, "action_slot") and idle.slots:
    armature.animation_data.action_slot = idle.slots[0]
bpy.context.scene.frame_set(1)
depsgraph = bpy.context.evaluated_depsgraph_get()
zs = []
for obj in meshes:
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    zs += [(obj.matrix_world @ v.co).z for v in mesh.vertices]
    evaluated.to_mesh_clear()
lo, hi = min(zs), max(zs)
assert -0.025 <= lo <= 0.025, f"no apoya en z=0: {lo}"
assert 1.75 <= hi <= 2.25, f"altura inesperada: {hi}"
seat = objects["rider_root"].matrix_world.translation
assert 1.30 <= seat.z <= 1.55 and abs(seat.x) < 0.02, tuple(seat)
print(f"crestalba.glb válida: {triangles} triángulos, {len(meshes)} piezas, altura {hi:.2f} m, silla {seat.z:.2f} m")
