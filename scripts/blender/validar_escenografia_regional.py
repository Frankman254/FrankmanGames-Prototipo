# Valida los módulos estáticos de escenografía regional.
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
EXPECTED = {
    'escena_muelle_tramo', 'escena_muelle_esquina', 'escena_amarradero',
    'escena_puesto_mercado', 'escena_caseta_abierta', 'escena_almacen_costero',
    'escena_bote_pasajeros', 'escena_bote_carga', 'escena_bote_angosto',
    'escena_poste_direcciones', 'escena_estandarte_plaza', 'escena_baliza_costera',
}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'escenografia_regional.glb'))
objects = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == 'MESH'}
assert set(objects) == EXPECTED, f'faltan {sorted(EXPECTED - set(objects))}; sobran {sorted(set(objects) - EXPECTED)}'
triangles = 0
for name, obj in objects.items():
    assert obj.location.length < 1e-5, f'{name}: origen trasladado'
    coords = [vertex.co for vertex in obj.data.vertices]
    lo = tuple(min(point[i] for point in coords) for i in range(3))
    hi = tuple(max(point[i] for point in coords) for i in range(3))
    assert lo[2] > -0.04, f'{name}: bajo suelo {lo[2]:.3f}'
    assert 0.2 < hi[2] < 5.0, f'{name}: altura {hi[2]:.3f}'
    triangles += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
assert triangles < 14_000, triangles
print(f'escenografia_regional.glb válido: {len(objects)} nodos, {triangles} triángulos')
