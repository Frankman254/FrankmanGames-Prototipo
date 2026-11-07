# Valida los cuatro modelos base de enemigos y su contrato con el juego.
# blender --background --python scripts/blender/validar_enemigos.py
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
COMMON_BIPED = {'Reposo', 'Caminar', 'Correr', 'Rodar', 'Golpeado', 'Morir'}
SPECS = {
    'bestia': ('FG_Bestia', {'Reposo', 'Correr', 'Atacar', 'Aullar', 'Esquivar', 'Golpeado', 'Morir'}),
    'arquero': ('FG_Arquero', COMMON_BIPED | {'Disparar'}),
    'chaman': ('FG_Chaman', COMMON_BIPED | {'Conjurar'}),
    'diablillo': ('FG_Diablillo', COMMON_BIPED | {'Atacar', 'Lanzar'}),
}


for model, (rig_prefix, expected_clips) in SPECS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path = os.path.join(ROOT, 'assets', 'models', f'{model}.glb')
    bpy.ops.import_scene.gltf(filepath=path)
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']
    # Blender conserva una forma auxiliar de hueso sin padre al importar; el
    # contrato publicable es la malla vinculada al esqueleto.
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.parent is not None]
    assert len(armatures) == 1, f'{model}: se esperaba un esqueleto, hay {len(armatures)}'
    assert len(meshes) == 1 and meshes[0].name == 'Cuerpo', f'{model}: nodo Cuerpo ausente'
    armature = armatures[0]
    assert armature.name.startswith(rig_prefix), f'{model}: esqueleto inesperado {armature.name}'
    actions = {action.name for action in bpy.data.actions}
    missing = expected_clips - actions
    assert not missing, f'{model}: clips ausentes {sorted(missing)}'

    triangles = sum(len(poly.vertices) - 2 for obj in meshes for poly in obj.data.polygons)
    assert triangles <= 1500, f'{model}: demasiados triángulos ({triangles})'
    coords = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    lo = tuple(min(point[i] for point in coords) for i in range(3))
    hi = tuple(max(point[i] for point in coords) for i in range(3))
    assert -0.04 <= lo[2] <= 0.08, f'{model}: no apoya en el suelo ({lo[2]:.3f})'
    assert 0.85 <= hi[2] <= 3.5, f'{model}: altura inesperada ({hi[2]:.3f})'
    print(f'{model}.glb válido: {triangles} triángulos, {len(actions)} clips, caja {lo}..{hi}')
