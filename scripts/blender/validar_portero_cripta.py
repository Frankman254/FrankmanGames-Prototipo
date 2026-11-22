# Valida el portero de la cripta (OMP-DUN-03): rig humano comun, los tres
# clips que pide la tarea (idle, talk, point), malla `npc_portero_cripta`,
# apoyo, altura y presupuesto de ≤ 2.500 tri.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/validar_portero_cripta.py
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
GLB = os.path.join(ROOT, 'assets', 'models', 'npc_portero_cripta.glb')

HUESOS = ['hips', 'spine', 'chest', 'head', 'upperArmL', 'foreArmL', 'handL',
          'upperArmR', 'foreArmR', 'handR', 'thighL', 'shinL', 'footL',
          'thighR', 'shinR', 'footR']
PADRES = {'hips': None, 'spine': 'hips', 'chest': 'spine', 'head': 'chest',
          'upperArmL': 'chest', 'foreArmL': 'upperArmL', 'handL': 'foreArmL',
          'upperArmR': 'chest', 'foreArmR': 'upperArmR', 'handR': 'foreArmR',
          'thighL': 'hips', 'shinL': 'thighL', 'footL': 'shinL',
          'thighR': 'hips', 'shinR': 'thighR', 'footR': 'shinR'}
CLIPS = ['idle', 'talk', 'point']

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
nombres = {b.name for b in arm.data.bones}
assert set(HUESOS) <= nombres, f'faltan huesos {set(HUESOS) - nombres}'
for bn in arm.data.bones:
    if bn.name in PADRES:
        real = bn.parent.name if bn.parent else None
        assert real == PADRES[bn.name], f'{bn.name} cuelga de {real}, no de {PADRES[bn.name]}'
acciones = sorted(a.name for a in bpy.data.actions)
for c in CLIPS:
    assert c in acciones, f'sin clip {c}'
assert len(acciones) == len(CLIPS), f'clips de mas: {acciones}'

mallas = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
assert len(mallas) == 1 and mallas[0].name == 'npc_portero_cripta', f'mallas: {[o.name for o in mallas]}'
o = mallas[0]
tri = len(o.data.loop_triangles)
assert tri <= 2500, f'{tri} tri > 2.500'
xs, ys, zs = [], [], []
for corner in o.data.vertices:
    w = o.matrix_world @ corner.co
    xs.append(w.x)
    ys.append(w.y)
    zs.append(w.z)
assert -0.06 <= min(zs) <= 0.10, f'no apoya ({min(zs):.3f})'
assert 1.5 <= max(zs) <= 1.95, f'altura {max(zs):.2f} fuera de banda de anciano con sombrero'
# el farol y su ascua existen (material emisivo brillo_gear)
mats = {ms.material.name for ms in o.material_slots if ms.material}
assert 'brillo_gear' in mats, f'sin ascua del farol: {mats}'
print(f'npc_portero_cripta.glb valido: {tri} tri, clips {acciones}, {max(zs):.2f} m alto')
