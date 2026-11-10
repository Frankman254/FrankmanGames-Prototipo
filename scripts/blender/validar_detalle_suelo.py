# Valida el catálogo atravesable de detalle de suelo.
# blender --background --python scripts/blender/validar_detalle_suelo.py
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
EXPECTED = {
    'rama_corta', 'rama_larga', 'rama_bifurcada', 'rama_con_hojas',
    'raices_bajas', 'raices_serpenteantes',
    'hojarasca_redonda', 'hojarasca_alargada', 'hojarasca_dispersa',
    'piedritas_claras', 'piedritas_oscuras', 'piedritas_mixtas',
    'madera_arrastre_corta', 'madera_arrastre_larga',
    'conchas_pequenas', 'conchas_grupo', 'semillas_caidas', 'hojas_grandes_caidas',
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'detalle_suelo.glb'))
objects = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == 'MESH'}
assert set(objects) == EXPECTED, f'faltan {sorted(EXPECTED - set(objects))}; sobran {sorted(set(objects) - EXPECTED)}'

total = 0
for name, obj in objects.items():
    points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    assert obj.location.length < 1e-5, f'{name}: origen trasladado'
    assert abs(min(p.z for p in points)) < 1e-4, f'{name}: no apoya en z=0'
    assert max(p.z for p in points) <= 0.20, f'{name}: no es detalle bajo ({max(p.z for p in points):.3f} m)'
    triangles = sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
    assert triangles <= 250, f'{name}: {triangles} triángulos'
    total += triangles

assert total <= 4_000, total
print(f'detalle_suelo.glb válido: {len(objects)} nodos, {total} triángulos, todo <=0,20 m')
