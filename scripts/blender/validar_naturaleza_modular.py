# Valida la biblioteca estática de formas naturales.
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
EXPECTED = {
    'natural_roca_baja', 'natural_roca_alta', 'natural_roca_musgosa',
    'natural_grupo_rocas', 'natural_tronco_caido', 'natural_arbusto_redondo',
    'natural_arbusto_seco', 'natural_helecho_ancho', 'natural_mata_flor',
    'natural_pasto_alto', 'natural_palma_joven', 'natural_arbol_sombra',
}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'naturaleza_modular.glb'))
objects = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == 'MESH'}
assert set(objects) == EXPECTED, f'faltan {sorted(EXPECTED - set(objects))}; sobran {sorted(set(objects) - EXPECTED)}'
triangles = 0
for name, obj in objects.items():
    assert obj.location.length < 1e-5, f'{name}: origen trasladado'
    coords = [vertex.co for vertex in obj.data.vertices]
    lo = tuple(min(point[i] for point in coords) for i in range(3))
    hi = tuple(max(point[i] for point in coords) for i in range(3))
    assert lo[2] > -0.03, f'{name}: bajo suelo {lo[2]:.3f}'
    assert 0.15 < hi[2] < 4.5, f'{name}: altura {hi[2]:.3f}'
    triangles += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
assert triangles < 16_000, triangles
print(f'naturaleza_modular.glb válido: {len(objects)} nodos, {triangles} triángulos')
