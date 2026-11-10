# Validador sin interfaz del catalogo caminos_rurales.
# blender --background --python scripts/blender/validar_caminos_rurales.py
import sys
import os
from mathutils import Vector

import bpy

root = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
source = os.path.join(root, 'assets', 'models', 'caminos_rurales.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)

NAMES = [
    'camino_cerca_2m', 'camino_cerca_4m', 'camino_cerca_esquina', 'camino_cerca_rota',
    'camino_porton_cerrado', 'camino_porton_abierto', 'camino_poste_simple',
    'camino_letrero_doble', 'camino_mojon_piedra',
    'camino_puente_tablas_2m', 'camino_puente_tablas_4m', 'camino_alcantarilla_piedra',
    'camino_escalones_tierra', 'camino_banco_rustico', 'camino_abrevadero',
    'camino_carretilla', 'camino_pila_madera', 'camino_barrera_caida',
]
scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == 'MESH']
found = {o.name for o in meshes}
assert found == set(NAMES), f'nodos: de mas {sorted(found - set(NAMES))}, faltan {sorted(set(NAMES) - found)}'

total = 0
for name in NAMES:
    o = scene.objects[name]
    cs = [o.matrix_world @ v.co for v in o.data.vertices]
    xs, ys, zs = ([p[i] for p in cs] for i in range(3))
    tri = sum(len(p.vertices) - 2 for p in o.data.polygons)
    total += tri
    assert tri <= 600, f'{name}: {tri} triangulos (limite 600)'
    assert abs(min(zs)) < 1e-4, f'{name}: no apoya en z=0 (min_z={min(zs):.4f})'
    assert abs((min(xs) + max(xs)) / 2) < 1e-4, f'{name}: huella X no centrada'
    assert abs((min(ys) + max(ys)) / 2) < 1e-4, f'{name}: huella Y no centrada'
    assert tuple(round(v, 5) for v in o.location) == (0.0, 0.0, 0.0), f'{name}: objeto movido'
    print(f'{name}: {tri:>3} tris  {max(xs)-min(xs):.2f}x{max(ys)-min(ys):.2f}x{max(zs)-min(zs):.2f} m  '
          f'mat={len({p.material_index for p in o.data.polygons})}')
assert total < 7000, f'catalogo completo: {total} triangulos (limite 7000)'
# Ensamblado de cercas: el modulo de 2 m debe cerrar exactamente en +-1.0 en X.
for name, half in (('camino_cerca_2m', 1.0), ('camino_cerca_4m', 2.0), ('camino_puente_tablas_2m', 1.0), ('camino_puente_tablas_4m', 2.0)):
    o = scene.objects[name]
    xs = [v.co.x for v in o.data.vertices]
    assert abs(max(xs) - half) < 1e-4 and abs(min(xs) + half) < 1e-4, f'{name}: bordes en X {min(xs):.3f}..{max(xs):.3f}, se esperan +-{half}'
print(f'VALIDO: 18 nodos, {total} triangulos, limites y ensamblado OK')
