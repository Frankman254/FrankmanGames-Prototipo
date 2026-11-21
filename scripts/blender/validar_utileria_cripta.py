# Valida el contrato de assets/models/utileria_cripta.glb (OMP-M25).
# blender --background --python scripts/blender/validar_utileria_cripta.py
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
# Tramos de OMP-POL-02: 1-30 piedra y raices, 31-70 cueva humeda, 71-100 oro y huesos.
EXPECTED = {
    'crip_sarcofago',
    'crip_urnas',
    'crip_raices_muro',
    'crip_velas',
    'crip_pila_agua',
    'crip_estalagmitas',
    'crip_telarana_rincon',
    'crip_velon',
    'crip_sarcofago_oro',
    'crip_osario',
    'crip_ofrenda_oro',
    'crip_altar_huaca',
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'utileria_cripta.glb'))
objects = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == 'MESH'}
actual = set(objects)
assert actual == EXPECTED, f'nodos incorrectos; faltan {sorted(EXPECTED - actual)}, sobran {sorted(actual - EXPECTED)}'

triangles = 0
for name, obj in objects.items():
    assert obj.location.length < 1e-5, f'{name}: origen trasladado {tuple(obj.location)}'
    assert obj.data.polygons, f'{name}: malla vacía'
    coords = [vertex.co for vertex in obj.data.vertices]
    lo = tuple(min(point[i] for point in coords) for i in range(3))
    hi = tuple(max(point[i] for point in coords) for i in range(3))
    size = tuple(hi[i] - lo[i] for i in range(3))
    assert lo[2] > -0.05, f'{name}: bajo el suelo {lo[2]:.3f} m'
    assert hi[2] < 3.0, f'{name}: altura excesiva para un techo de cripta {hi[2]:.3f} m'
    assert max(size) > 0.45, f'{name}: pieza diminuta {size}'
    assert max(size) < 3.2, f'{name}: pieza excesiva {size}'
    assert not obj.vertex_groups, f'{name}: la utileria no lleva huesos'
    assert obj.animation_data is None, f'{name}: la utileria no lleva clips'
    triangles += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)

assert triangles < 6_000, f'presupuesto excedido: {triangles} triangulos'
print(f'utileria_cripta.glb valida: {len(objects)} piezas, {triangles} triangulos, sin rig ni clips')
