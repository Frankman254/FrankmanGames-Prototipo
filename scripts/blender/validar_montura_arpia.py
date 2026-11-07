# Comprueba el contrato mínimo de la montura de desarrollo.
# blender --background --python scripts/blender/validar_montura_arpia.py
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'montura_arpia.glb'))
armature = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.parent is not None]
actions = {action.name for action in bpy.data.actions}
assert {'Reposo', 'Trotar', 'Volar', 'Planear'} <= actions, f'clips ausentes: {sorted(actions)}'
armature.animation_data_create()
for track in list(armature.animation_data.nla_tracks):
    armature.animation_data.nla_tracks.remove(track)
rest_action = bpy.data.actions.get('Reposo') or next(action for action in bpy.data.actions if action.name.startswith('Reposo'))
armature.animation_data.action = rest_action
if hasattr(armature.animation_data, 'action_slot') and rest_action.slots:
    armature.animation_data.action_slot = rest_action.slots[0]
triangles = sum(len(poly.vertices) - 2 for obj in meshes for poly in obj.data.polygons)
assert triangles <= 5000, f'demasiados triángulos: {triangles}'
scene = bpy.context.scene
scene.frame_set(1)
depsgraph = bpy.context.evaluated_depsgraph_get()
coords = []
for obj in meshes:
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    coords += [obj.matrix_world @ vertex.co for vertex in mesh.vertices]
    evaluated.to_mesh_clear()
lo = tuple(min(point[i] for point in coords) for i in range(3))
hi = tuple(max(point[i] for point in coords) for i in range(3))
assert -0.03 <= lo[2] <= 0.05, f'no apoya en el suelo: {lo[2]}'
assert 1.6 <= hi[2] <= 2.1, f'altura inesperada: {hi[2]}'
assert armature.name.startswith('FG_MonturaArpia')
print(f'montura_arpia.glb válida: {triangles} triángulos, clips Reposo/Trotar/Volar/Planear, caja {lo}..{hi}')
