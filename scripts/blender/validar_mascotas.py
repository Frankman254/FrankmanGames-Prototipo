# Valida las tres mascotas originales y su contrato actual con el juego.
# blender --background --python scripts/blender/validar_mascotas.py
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
CLIPS = {'Reposo', 'Correr', 'Atacar', 'Golpeado', 'Morir'}
SPECS = {
    'zorro': ('FG_Zorro', 0.0, 0.8),
    'buho': ('FG_Buho', 0.8, 1.8),
    'tortuga': ('FG_Tortuga', 0.0, 0.8),
}


for model, (rig_prefix, min_z, max_z) in SPECS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', f'{model}.glb'))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.parent is not None]
    assert len(armatures) == 1, f'{model}: se esperaba un esqueleto, hay {len(armatures)}'
    assert len(meshes) == 1 and meshes[0].name == 'Cuerpo', f'{model}: nodo Cuerpo ausente'
    assert armatures[0].name.startswith(rig_prefix), f'{model}: esqueleto inesperado {armatures[0].name}'
    actions = {action.name for action in bpy.data.actions}
    missing = CLIPS - actions
    assert not missing, f'{model}: clips ausentes {sorted(missing)}'

    triangles = sum(len(poly.vertices) - 2 for obj in meshes for poly in obj.data.polygons)
    assert triangles <= 1500, f'{model}: demasiados triángulos ({triangles})'
    coords = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    lo = tuple(min(point[i] for point in coords) for i in range(3))
    hi = tuple(max(point[i] for point in coords) for i in range(3))
    assert min_z - 0.04 <= lo[2] <= min_z + 0.15, f'{model}: altura mínima inesperada ({lo[2]:.3f})'
    assert hi[2] <= max_z, f'{model}: altura máxima inesperada ({hi[2]:.3f})'
    print(f'{model}.glb válido: {triangles} triángulos, {len(actions)} clips, caja {lo}..{hi}')
