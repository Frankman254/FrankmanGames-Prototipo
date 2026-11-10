# Validador sin interfaz del catalogo costa_modular.
# blender --background --python scripts/blender/validar_costa_modular.py
import sys
import os

import bpy

root = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
source = os.path.join(root, 'assets', 'models', 'costa_modular.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)

NAMES = [
    'costa_roca_baja_pequena', 'costa_roca_baja_mediana', 'costa_roca_baja_grande',
    'costa_roca_erosionada', 'costa_roca_con_hendidura', 'costa_grupo_rocoso',
    'costa_madera_arrasta', 'costa_madera_arrastre_curva', 'costa_madera_arrastre_raices',
    'costa_raices_bajas', 'costa_raices_entrelazadas', 'costa_monticulo_arena',
    'costa_borde_poza', 'costa_huellas_olas', 'costa_mata_duna_pequena',
    'costa_mata_duna_grande', 'costa_conchas_grupo', 'costa_restos_ramas',
]
FLAT = {'costa_huellas_olas', 'costa_mata_duna_pequena', 'costa_mata_duna_grande',
        'costa_conchas_grupo', 'costa_restos_ramas'}  # piezas 14-18: decoracion no bloqueante

scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == 'MESH']
found = {o.name for o in meshes}
assert found == set(NAMES), f'nodos: de mas {sorted(found - set(NAMES))}, faltan {sorted(set(NAMES) - found)}'

total = 0
all_mats = set()
for name in NAMES:
    o = scene.objects[name]
    cs = [o.matrix_world @ v.co for v in o.data.vertices]
    xs, ys, zs = ([p[i] for p in cs] for i in range(3))
    tri = sum(len(p.vertices) - 2 for p in o.data.polygons)
    total += tri
    assert tri <= 450, f'{name}: {tri} triangulos (limite 450)'
    assert abs(min(zs)) < 1e-4, f'{name}: no apoya en z=0 (min_z={min(zs):.4f})'
    assert abs((min(xs) + max(xs)) / 2) < 1e-4, f'{name}: huella X no centrada'
    assert abs((min(ys) + max(ys)) / 2) < 1e-4, f'{name}: huella Y no centrada'
    assert tuple(round(v, 5) for v in o.location) == (0.0, 0.0, 0.0), f'{name}: objeto movido'
    if name in FLAT:
        assert max(zs) <= 0.40, f'{name}: decoracion no bloqueante supera 0.40 m (z={max(zs):.2f})'
    mats = {o.material_slots[p.material_index].material.name for p in o.data.polygons if p.material_index >= 0}
    all_mats |= {m.split('.')[0] for m in mats}
    print(f'{name}: {tri:>3} tris  {max(xs)-min(xs):.2f}x{max(ys)-min(ys):.2f}x{max(zs)-min(zs):.2f} m  '
          f'mat={sorted(mats)}')
assert total <= 6000, f'catalogo completo: {total} triangulos (limite 6000)'
assert len(all_mats) <= 6, f'materiales: {sorted(all_mats)} (limite 6)'
print(f'VALIDO: 18 nodos, {total} triangulos, {len(all_mats)} materiales, apoyo/centrado/limites OK')
