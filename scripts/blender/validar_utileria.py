# Valida el contrato de assets/models/utileria.glb.
# blender --background --python scripts/blender/validar_utileria.py
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
EXPECTED = {
    'prop_amarradero',
    'prop_banco',
    'prop_barril',
    'prop_bebedero',
    'prop_cajon',
    'prop_carreta',
    'prop_cerca',
    'prop_chimenea',
    'prop_escalera',
    'prop_farol_poste',
    'prop_fogata',
    'prop_mesa_larga',
    'prop_mesa_redonda',
    'prop_poste_camino',
    'prop_rancho_paja',
    'prop_silla',
    'prop_tinaja_alta',
    'prop_tinaja_redonda',
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'utileria.glb'))
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
    assert hi[2] < 4.0, f'{name}: altura excesiva {hi[2]:.3f} m'
    assert max(size) > 0.45, f'{name}: pieza diminuta {size}'
    assert max(size) < 6.0, f'{name}: pieza excesiva {size}'
    triangles += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)

for base in ('tierra_seca', 'piedra_clara', 'cesped_tropical'):
    for suffix in ('', '_normal', '_roughness'):
        filename = base + suffix + '.png'
        path = os.path.join(ROOT, 'assets', 'textures', 'surfaces', filename)
        assert os.path.getsize(path) > 10_000, f'textura ausente o vacía: {filename}'

assert triangles < 20_000, f'presupuesto excedido: {triangles} triángulos'
print(f'utileria.glb válida: {len(objects)} nodos, {triangles} triángulos y 3 superficies PBR')
