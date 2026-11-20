# Valida el personaje modular, sus piezas y clips estables.
# blender --background --python scripts/blender/validar_personaje.py
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
PARTS = {
    'Cuerpo', 'Pelo_corto', 'Pelo_largo', 'Barba', 'Capucha', 'Yelmo', 'Banda',
    'Tunica', 'Mandil', 'Armadura', 'Capa', 'Arma_espada', 'Arma_baston',
    'Arma_arco', 'Escudo',
}
CLIPS = {
    'Reposo', 'Caminar', 'Correr', 'Rodar', 'Golpeado', 'Morir', 'Atacar', 'Lanzar',
    'Emote_wave', 'Emote_laugh', 'Emote_dance', 'Emote_cry', 'Emote_angry',
    'Emote_love', 'Emote_sleep', 'Emote_doubt',
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'personaje.glb'))
armatures = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.parent is not None]
assert len(armatures) == 1 and armatures[0].name.lower().startswith('fg_personaje'), 'rig FG_personaje ausente'
names = {obj.name for obj in meshes}
assert names == PARTS, f'faltan {sorted(PARTS - names)}; sobran {sorted(names - PARTS)}'
actions = {action.name for action in bpy.data.actions}
assert CLIPS <= actions, f'clips ausentes: {sorted(CLIPS - actions)}'

triangles = sum(len(poly.vertices) - 2 for obj in meshes for poly in obj.data.polygons)
# Presupuesto como los héroes anime (~22 000): el humanoide viste a la vez al jugador sin
# clase, a los PNJ del pueblo y a los enemigos humanoides de la cripta. El tope viejo de
# 3000 era del cuerpo de primitivas del Slice 03; P02 (2026-11-16) lo superó y el validador
# llevaba muerto desde entonces (el nombre del rig, además, es FG_personaje).
assert triangles <= 24000, f'demasiados triángulos: {triangles}'
body = next(obj for obj in meshes if obj.name == 'Cuerpo')
coords = [body.matrix_world @ vertex.co for vertex in body.data.vertices]
lo = tuple(min(point[i] for point in coords) for i in range(3))
hi = tuple(max(point[i] for point in coords) for i in range(3))
assert -0.03 <= lo[2] <= 0.03, f'no apoya en el suelo: {lo[2]:.3f}'
# El Cuerpo (piel) para en la coronilla; el pelo y los tocados son piezas aparte.
assert 1.6 <= hi[2] <= 1.8, f'altura inesperada: {hi[2]:.3f}'
print(f'personaje.glb válido: {len(meshes)} piezas, {triangles} triángulos, {len(actions)} clips, caja {lo}..{hi}')
