# Valida la familia de rompibles de la cripta dentro de mazmorra.glb:
# nombres, tope de triángulos por pieza y del lote, apoyo hundido ~5 mm
# (d_barril_aros va SOBRE el barril y los montones entierran piedras: fuera),
# y altura máxima legible (una jarra no puede crecer a columna).
#   blender --background --python scripts/blender/validar_rompibles.py
import os

import bpy
from mathutils import Vector

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))

# nombre: (tope triángulos, altura máx m, tolerancia de apoyo m)
# El tope del lote sale de la lámina revisada 2026-11-12 + 2 tris de margen.
PIEZAS = {
    'd_jarra': (240, 0.80, 0.006),
    'd_jarra_alta': (240, 1.00, 0.006),
    'd_jarra_ancha': (200, 0.55, 0.006),
    'd_jarra_agrietada': (150, 0.80, 0.006),
    'd_barril': (176, 0.95, 0.006),
    'd_barril_bajo': (352, 0.60, 0.006),
    'd_caja': (132, 0.50, 0.006),
    'd_cascotes': (100, 0.25, 0.030),          # piedras semienterradas a propósito
    'd_cascotes_madera': (92, 0.15, 0.030),
    'd_barril_aros': (176, 0.95, None),        # accessory sobre el barril: sin apoyo
}
TRI_LOTE_MAX = 1860

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'mazmorra.glb'))
objects = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}
falta = set(PIEZAS) - set(objects)
assert not falta, f'faltan rompibles: {sorted(falta)}'

lote = 0
for name, (tri_max, alto_max, apoyo) in PIEZAS.items():
    o = objects[name]
    cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo_z = min(c.z for c in cs)
    hi_z = max(c.z for c in cs)
    tri = sum(len(p.vertices) - 2 for p in o.data.polygons)
    assert tri <= tri_max, f'{name}: {tri} triángulos (límite {tri_max})'
    assert hi_z - lo_z <= alto_max + 1e-3, f'{name}: alto {hi_z - lo_z:.3f} m (límite {alto_max})'
    if apoyo is None:
        assert lo_z > 0.02, f'{name}: los aros no deben tocar el suelo (zmin {lo_z:.3f})'
    else:
        assert -apoyo - 1e-4 <= lo_z <= 0.001, f'{name}: base a {lo_z:.3f}, sin hundido contractual'
    lote += tri

assert lote <= TRI_LOTE_MAX, f'lote de rompibles {lote} triángulos (tope {TRI_LOTE_MAX})'
print(f'rompibles válidos: {len(PIEZAS)} nodos, {lote} triángulos de lote')
