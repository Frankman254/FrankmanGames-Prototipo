# Comprueba el contrato del Diostedé exportado: clips, anclajes, regiones de color, apoyo y coste.
# blender --background --python scripts/blender/validar_diostede.py
import json
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
CLIPS = {'idle_ground', 'walk', 'run', 'takeoff', 'fly_idle', 'fly_forward', 'land'}
PIECES = {'body', 'head', 'crest', 'wing_L', 'wing_R', 'tail', 'leg_L', 'leg_R', 'saddle', 'reins', 'accessories'}
palette = json.load(open(os.path.join(ROOT, 'data', 'art', 'diostede_variantes.json'), encoding='utf-8'))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'diostede.glb'))
objs = bpy.context.scene.objects
armature = next(o for o in objs if o.type == 'ARMATURE')
meshes = [o for o in objs if o.type == 'MESH' and o.name in PIECES]  # el importador añade formas de hueso
names = {o.name for o in objs}
actions = {a.name for a in bpy.data.actions}
assert CLIPS <= actions, f'clips ausentes: {sorted(CLIPS - actions)}'
assert PIECES <= names, f'piezas ausentes: {sorted(PIECES - names)}'
assert {'mount_seat', 'rider_root'} <= names, 'faltan los anclajes mount_seat / rider_root'
regions = {f'montura_{r}' for r in palette['regiones']}
mats = {m.name for m in bpy.data.materials}
assert regions <= mats, f'regiones sin material: {sorted(regions - mats)}'
for vid, v in palette['variantes'].items():
    missing = [r for r in palette['regiones'] if not str(v.get(r, '')).startswith('#')]
    assert not missing, f'{vid}: regiones sin color {missing}'
assert len(palette['variantes']) == 10, 'deben ser diez variantes'
# Una sola malla para todas: ningún material de variante entra en el GLB.
assert not [m for m in mats if '__' in m], 'el GLB no debe llevar materiales por variante'
triangles = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
assert triangles <= 18000, f'demasiados triángulos: {triangles}'

armature.animation_data_create()
for track in list(armature.animation_data.nla_tracks):
    armature.animation_data.nla_tracks.remove(track)
idle = next(a for a in bpy.data.actions if a.name.startswith('idle_ground'))
armature.animation_data.action = idle
if hasattr(armature.animation_data, 'action_slot') and idle.slots:
    armature.animation_data.action_slot = idle.slots[0]
scene = bpy.context.scene
scene.frame_set(1)
depsgraph = bpy.context.evaluated_depsgraph_get()
zs = []
for o in meshes:
    ev = o.evaluated_get(depsgraph)
    me = ev.to_mesh()
    zs += [(o.matrix_world @ v.co).z for v in me.vertices]
    ev.to_mesh_clear()
lo, hi = min(zs), max(zs)
assert -0.03 <= lo <= 0.04, f'no apoya en el suelo: {lo}'
assert 1.5 <= hi <= 2.2, f'altura inesperada: {hi}'
seat = next(o for o in objs if o.name == 'rider_root').matrix_world.translation
assert 1.25 <= seat.z <= 1.5 and abs(seat.x) < 0.02, f'rider_root fuera de la silla: {tuple(seat)}'
print(f'diostede.glb válida: {triangles} triángulos, {len(meshes)} piezas, clips {sorted(CLIPS)}, altura {hi:.2f}, silla {seat.z:.2f}')
