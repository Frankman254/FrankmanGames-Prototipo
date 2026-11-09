# Valida el catálogo estático de rocas, troncos y tocones.
import os

import bpy
from mathutils import Vector


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
EXPECTED = {
    'roca_redonda_pequena', 'roca_redonda_mediana', 'roca_redonda_grande',
    'roca_puntiaguda_pequena', 'roca_puntiaguda_mediana', 'roca_puntiaguda_grande',
    'roca_plana_pequena', 'roca_plana_mediana', 'roca_plana_grande',
    'roca_partida', 'roca_musgosa', 'grupo_rocas_bajo',
    'tronco_recto', 'tronco_curvo', 'tronco_hueco', 'tronco_musgoso',
    'tocon_bajo', 'tocon_raices',
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'naturaleza_suelo.glb'))
objects = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == 'MESH'}
assert set(objects) == EXPECTED, f'faltan {sorted(EXPECTED - set(objects))}; sobran {sorted(set(objects) - EXPECTED)}'

triangles = 0
for name, obj in objects.items():
    assert obj.location.length < 1e-5, f'{name}: origen trasladado'
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    lo = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
    hi = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
    assert abs(lo.z) < 0.03, f'{name}: no apoya en el suelo ({lo.z:.3f})'
    assert hi.z < 1.6, f'{name}: altura fuera de contrato ({hi.z:.3f})'
    count = sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
    limit = 500 if name.startswith(('tronco_', 'tocon_')) else 350
    assert count <= limit, f'{name}: {count} triángulos (límite {limit})'
    triangles += count

assert triangles < 6_000, triangles
print(f'naturaleza_suelo.glb válido: {len(objects)} nodos, {triangles} triángulos')
