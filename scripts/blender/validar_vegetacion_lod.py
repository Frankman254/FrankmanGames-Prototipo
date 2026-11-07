# Valida la biblioteca distante y su correspondencia con vegetacion.glb.
# blender --background --python scripts/blender/validar_vegetacion_lod.py
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
FAMILIES = {'palma', 'guayacan', 'corotu', 'mangle', 'roble', 'cipres', 'panama', 'cuipo', 'indio'}
EXPECTED = {'v_roca'} | {
    f'v_{family}_{part}'
    for family in FAMILIES
    for part in (('raices', 'copa') if family == 'mangle' else ('tronco', 'copa'))
}


def load(name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', name))
    return {obj.name: obj for obj in bpy.context.scene.objects if obj.type == 'MESH'}


lod = load('vegetacion_lod.glb')
assert set(lod) == EXPECTED, f'LOD: faltan {sorted(EXPECTED - set(lod))}; sobran {sorted(set(lod) - EXPECTED)}'
lod_triangles = 0
for name, obj in lod.items():
    assert obj.location.length < 1e-5, f'{name}: origen trasladado'
    coords = [vertex.co for vertex in obj.data.vertices]
    lo_z = min(point.z for point in coords)
    hi_z = max(point.z for point in coords)
    assert lo_z >= -0.30, f'{name}: bajo suelo {lo_z:.3f}'
    assert hi_z > 0.2, f'{name}: altura insuficiente {hi_z:.3f}'
    lod_triangles += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
assert lod_triangles <= 1200, f'LOD excede presupuesto: {lod_triangles}'

near = load('vegetacion.glb')
missing_near = EXPECTED - set(near)
assert not missing_near, f'fuente cercana incompleta: {sorted(missing_near)}'
near_triangles = sum(
    len(poly.vertices) - 2
    for name, obj in near.items() if name in EXPECTED
    for poly in obj.data.polygons
)
assert lod_triangles < near_triangles * 0.35, f'reducción insuficiente: {lod_triangles}/{near_triangles}'
print(f'vegetacion_lod.glb válido: {len(lod)} nodos, {lod_triangles} triángulos frente a {near_triangles}')
