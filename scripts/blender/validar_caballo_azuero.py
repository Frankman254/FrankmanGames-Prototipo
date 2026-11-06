# Valida geometría, rig y clips del caballo original.
# blender --background --python scripts/blender/validar_caballo_azuero.py
import os

import bpy
from mathutils import Vector


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
path = os.path.join(ROOT, 'assets', 'models', 'caballo_azuero.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
scene = bpy.context.scene
rig = next(obj for obj in scene.objects if obj.type == 'ARMATURE')
meshes = [obj for obj in scene.objects if obj.type == 'MESH' and obj.parent is not None]
assert rig.name == 'FG_CaballoAzuero', rig.name
assert len(meshes) == 1, f'se esperaba una malla, hay {len(meshes)}: {[obj.name for obj in meshes]}'

actions = {action.name: action for action in bpy.data.actions}
assert set(actions) == {'Reposo', 'Paso', 'Trotar'}, sorted(actions)
assert actions['Reposo'].frame_range[1] >= 60
assert actions['Paso'].frame_range[1] >= 25
assert actions['Trotar'].frame_range[1] >= 13

triangles = sum(len(poly.vertices) - 2 for obj in meshes for poly in obj.data.polygons)
assert triangles <= 6_000, triangles

rig.animation_data_create()
for track in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(track)
rig.animation_data.action = actions['Reposo']
if hasattr(rig.animation_data, 'action_slot') and actions['Reposo'].slots:
    rig.animation_data.action_slot = actions['Reposo'].slots[0]
scene.frame_set(1)
dg = bpy.context.evaluated_depsgraph_get()
points = []
for obj in meshes:
    evaluated = obj.evaluated_get(dg)
    mesh = evaluated.to_mesh()
    points.extend(obj.matrix_world @ vertex.co for vertex in mesh.vertices)
    evaluated.to_mesh_clear()
lo = Vector(tuple(min(point[i] for point in points) for i in range(3)))
hi = Vector(tuple(max(point[i] for point in points) for i in range(3)))
assert lo.z > -0.025, f'bajo suelo: {lo.z:.3f}'
assert 1.75 < hi.z < 2.0, f'altura inesperada: {hi.z:.3f}'
assert hi.y > 1.1 and lo.y < -1.3, f'largo inesperado: {lo.y:.3f}..{hi.y:.3f}'
print(f'caballo_azuero.glb válido: {triangles} triángulos, clips Reposo/Paso/Trotar, caja {tuple(round(v, 3) for v in lo)}..{tuple(round(v, 3) for v in hi)}')

# Ningún clip puede hundir los cascos de forma visible bajo el terreno.
min_z = 99.0
for action in actions.values():
    rig.animation_data.action = action
    if hasattr(rig.animation_data, 'action_slot') and action.slots:
        rig.animation_data.action_slot = action.slots[0]
    start, end = action.frame_range
    for index in range(7):
        scene.frame_set(round(start + (end - start) * index / 6))
        dg = bpy.context.evaluated_depsgraph_get()
        for obj in meshes:
            evaluated = obj.evaluated_get(dg)
            mesh = evaluated.to_mesh()
            min_z = min(min_z, min((obj.matrix_world @ vertex.co).z for vertex in mesh.vertices))
            evaluated.to_mesh_clear()
assert min_z > -0.12, f'animación bajo el terreno: {min_z:.3f} m'
print(f'apoyo animado mínimo: {min_z:.3f} m')
