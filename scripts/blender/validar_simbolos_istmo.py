# Valida el catálogo decorativo propuesto.
# blender --background --python scripts/blender/validar_simbolos_istmo.py
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
EXPECTED = {
    'simbolo_aretes_oro',
    'simbolo_estatua_arpia',
    'simbolo_machete_ceremonial',
    'simbolo_monedas_ficticias',
    'simbolo_sombrero_trenzado',
    'simbolo_vestido_festivo',
}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'simbolos_istmo.glb'))
objects = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == 'MESH'}
assert set(objects) == EXPECTED, f'faltan {sorted(EXPECTED - set(objects))}; sobran {sorted(set(objects) - EXPECTED)}'
triangles = 0
for name, obj in objects.items():
    assert obj.location.length < 1e-5, f'{name}: origen trasladado'
    coords = [vertex.co for vertex in obj.data.vertices]
    lo = tuple(min(point[i] for point in coords) for i in range(3))
    hi = tuple(max(point[i] for point in coords) for i in range(3))
    assert lo[2] > -0.025, f'{name}: bajo suelo {lo[2]:.3f}'
    assert 0.05 < hi[2] < 3.0, f'{name}: altura inesperada {hi[2]:.3f}'
    triangles += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
assert triangles < 12_000, triangles
print(f'simbolos_istmo.glb válido: {len(objects)} nodos, {triangles} triángulos')
