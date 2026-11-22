# Valida el hilo de retorno (OMP-DUN-01): malla unica `prop_hilo_retorno`,
# ≤ 400 tri, apoyo en el suelo, altura de estaca razonable y brillo emisivo.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/validar_hilo_retorno.py
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
GLB = os.path.join(ROOT, 'assets', 'models', 'prop_hilo_retorno.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
mallas = [o for o in bpy.data.objects if o.type == 'MESH']
assert len(mallas) == 1 and mallas[0].name == 'prop_hilo_retorno', f'mallas: {[o.name for o in mallas]}'
o = mallas[0]
o.data.calc_loop_triangles()
tri = len(o.data.loop_triangles)
assert tri <= 400, f'{tri} tri > 400'
zs = [(o.matrix_world @ v.co).z for v in o.data.vertices]
assert -0.02 <= min(zs) <= 0.06, f'no apoya ({min(zs):.3f})'
assert 0.5 <= max(zs) <= 1.1, f'altura de estaca {max(zs):.2f} fuera de banda'
emis = [ms.material for ms in o.material_slots if ms.material and ms.material.use_nodes
        and any(n.type == 'BSDF_PRINCIPLED' and n.inputs['Emission Strength'].default_value > 0
                for n in ms.material.node_tree.nodes)]
assert emis, 'sin material emisivo: el hilo no se veria en la oscuridad'
assert any('brillo' in (ms.material.name or '') for ms in o.material_slots), 'el brillo no usa el canal brillo_'
print(f'prop_hilo_retorno.glb valido: {tri} tri, {max(zs):.2f} m, emisivo {emis[0].name}')
