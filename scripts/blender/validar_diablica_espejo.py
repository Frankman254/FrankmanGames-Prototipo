"""Contrato del GLB productivo de La Espeja."""
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
GLB = os.path.join(ROOT, 'assets', 'models', 'diablica_espejo.glb')
PIECES = {'Cuerpo', 'Falda', 'Tocado', 'Pelo', 'Mascara', 'Baston'}
CLIPS = {
    'Reposo', 'Caminar', 'Correr', 'Atacar', 'Lanzar', 'Golpeado', 'Morir',
    'Rodar', 'Baston', 'Reaccion', 'MascaraOn', 'MascaraOff', 'Danza_Reflejo', 'Danza_Brinco', 'Danza_Giro',
}
# Huesos de vaivén horneados en los clips (falda, coleta, cola de pompones y cintas).
VAIVEN = {'falda', 'coleta', 'cola1', 'cola2', 'cola3', 'cintas_cola', 'cintas_oreja'}
MATS = {
    f'heroe_diablica_espejo_{piece}'
    for piece in ('cuerpo', 'falda', 'tocado', 'pelo', 'mascara', 'baston')
}
TRI_MAX = 18_000
ALT_MIN, ALT_MAX = 1.55, 1.85

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
objects = bpy.context.scene.objects
armature = next(obj for obj in objects if obj.type == 'ARMATURE')
meshes = [obj for obj in objects if obj.type == 'MESH' and obj.name in PIECES]
names = {obj.name for obj in objects}
actions = {action.name for action in bpy.data.actions}

assert PIECES <= names, f'piezas ausentes: {sorted(PIECES - names)}'
assert CLIPS <= actions, f'clips ausentes: {sorted(CLIPS - actions)}'
materials = {material.name for material in bpy.data.materials}
assert MATS <= materials, f'materiales ausentes: {sorted(MATS - materials)}'
loose = [obj.name for obj in meshes if obj.parent is None]
assert not loose, f'mallas sin armazón: {loose}'
triangles = sum(len(poly.vertices) - 2 for obj in meshes for poly in obj.data.polygons)
assert triangles <= TRI_MAX, f'demasiados triángulos: {triangles}'

armature.animation_data_create()
for track in list(armature.animation_data.nla_tracks):
    armature.animation_data.nla_tracks.remove(track)
idle = bpy.data.actions['Reposo']
armature.animation_data.action = idle
if hasattr(armature.animation_data, 'action_slot') and idle.slots:
    armature.animation_data.action_slot = idle.slots[0]
bpy.context.scene.frame_set(1)
depsgraph = bpy.context.evaluated_depsgraph_get()
z_values = []
for obj in meshes:
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    z_values.extend((obj.matrix_world @ vertex.co).z for vertex in mesh.vertices)
    evaluated.to_mesh_clear()
low, high = min(z_values), max(z_values)
assert -0.03 <= low <= 0.05, f'no apoya en el suelo: {low:.3f}'
assert ALT_MIN <= high <= ALT_MAX, f'altura fuera de rango humano: {high:.3f}'
hips = armature.pose.bones.get('hips') or armature.data.bones.get('hips')
assert hips is not None, 'sin hueso hips'
missing = VAIVEN - {bone.name for bone in armature.data.bones}
assert not missing, f'huesos de vaivén ausentes: {sorted(missing)}'
walk = bpy.data.actions['Caminar']
armature.animation_data.action = walk
if hasattr(armature.animation_data, 'action_slot') and walk.slots:
    armature.animation_data.action_slot = walk.slots[0]
sway = 0.0
for frame in range(int(walk.frame_range[0]), int(walk.frame_range[1]) + 1):
    bpy.context.scene.frame_set(frame)
    sway = max(sway, armature.pose.bones['cola3'].rotation_quaternion.angle)
assert sway > 0.02, f'la cola no se mueve al caminar ({sway:.3f} rad)'
assert 0.7 < hips.matrix.translation.z < 1.05, f'cadera fuera de sitio: {hips.matrix.translation.z:.3f}'

print(
    f'diablica_espejo.glb válida: {triangles} triángulos, {len(meshes)} piezas, '
    f'{len(CLIPS)} clips, altura {high:.2f}, apoyo {low:.2f}'
)
