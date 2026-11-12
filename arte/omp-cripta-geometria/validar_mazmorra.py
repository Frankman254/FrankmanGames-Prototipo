# Validador del GLB de la cripta: nombres, huellas contractuales, apoyo,
# orignes, normales, triangulos y solapes coplanares (z-fighting).
#   blender --background --python arte/omp-cripta-geometria/validar_mazmorra.py -- \
#       arte/omp-cripta-geometria/mazmorra_corregida.glb
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(HERE, 'mazmorra_corregida.glb')
src = os.path.abspath(src)

# Contrato de scripts/blender/mazmorra.py y src/render/dungeonView.ts.
TILE, WALL_H = 1.5, 3.2
NAMES = ['d_baldosa', 'd_muro', 'd_remate', 'd_antorcha', 'd_llama', 'd_subida',
         'd_bajada', 'd_boca', 'd_anillo', 'd_entrada', 'd_entrada_boca',
         'd_entrada_monticulo', 'd_entrada_runa', 'd_jarra', 'd_barril',
         'd_barril_aros', 'd_cascotes', 'd_puerta_poste', 'd_puerta_dintel',
         'd_puerta_hoja', 'd_estanque_piedra']
TRI_MAX = 2286  # el lote corregido no puede crecer sobre el original

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
by = {o.name: o for o in objs}

def fail(msg):
    print('FALLO:', msg)
    sys.exit(1)

errs = []

# 1) nombres exactos (ni sobran ni faltan) y origenes en el centro
if sorted(by) != sorted(NAMES):
    errs.append(f'nombres: faltan {set(NAMES) - set(by)}, sobran {set(by) - set(NAMES)}')
for n, o in by.items():
    if max(abs(v) for v in o.location) > 1e-4:
        errs.append(f'{n}: origen en {tuple(o.location)}')

def ext(o):
    cs = [o.matrix_world @ v.co for v in o.data.vertices]
    lo = Vector((min(p[i] for p in cs) for i in range(3)))
    hi = Vector((max(p[i] for p in cs) for i in range(3)))
    return lo, hi

# 2) huellas contractuales (en coords de Blender: x, y = suelo; z = altura de juego)
CHECKS = {
    'd_baldosa': (0.75, 0.75, 0.0),      # huella +-TILE/2, plano apoyado z=0
    'd_remate':  (0.75, 0.75, 0.0),      # NO puede desbordar TILE: antes +-0.79
    'd_muro':    (0.75, 0.75, WALL_H),   # huella +-TILE/2 exacta; antes +-0.80
    'd_boca':    (1.1, 1.1, 0.0),
}
for n, (hx, hy, ztop) in CHECKS.items():
    if n not in by:
        continue
    lo, hi = ext(by[n])
    if abs(hi.x - lo.x) / 2 > hx + 1e-4 or abs(hi.y - lo.y) / 2 > hy + 1e-4:
        errs.append(f'{n}: huella {hi.x - lo.x:.3f}x{hi.y - lo.y:.3f} excede {2 * hx}x{2 * hy}')
    if ztop == 0 and abs(lo.z) > 1e-4:
        errs.append(f'{n}: plano no apoyado (zmin={lo.z})')
    if ztop and abs(hi.z - ztop) > 1e-3:
        errs.append(f'{n}: altura {hi.z:.3f} != {ztop}')

# las piezas apoyadas en el suelo hunden la base 5 mm (no coplanar con d_baldosa)
# d_barril_aros va sobre el barril; d_estanque_piedra va SEMI-enterrada: fuera.
for n in ('d_subida', 'd_bajada', 'd_entrada', 'd_jarra', 'd_barril',
          'd_cascotes', 'd_puerta_poste', 'd_puerta_hoja'):
    if n in by:
        z = ext(by[n])[0].z
        if not (-0.006 <= z <= 0.001):
            errs.append(f'{n}: base a {z:.3f}, debe hundir 5 mm bajo el plano del suelo')

# 3) triangulos
total = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
if total > TRI_MAX:
    errs.append(f'triangulos {total} > {TRI_MAX}')

# 4) normales y caras internas: todo triangulo con area > 0 tiene normal unitaria,
#    y cada malla cerrada tiene volumen con signo positivo (normales hacia fuera).
for n, o in by.items():
    me = o.data
    if not me.polygons:
        errs.append(f'{n}: malla vacia')
        continue
    for p in me.polygons:
        if p.area < 1e-7:
            errs.append(f'{n}: cara degenerada area {p.area:.2e}')
        elif abs(p.normal.length - 1.0) > 1e-3:
            errs.append(f'{n}: normal no unitaria {p.normal.length:.4f}')
    vol = 0.0
    for p in me.polygons:
        vs = [me.vertices[i].co for i in p.vertices]
        for i in range(1, len(p.vertices) - 1):
            a, b, c = vs[0], vs[i], vs[i + 1]
            vol += a.dot(b.cross(c)) / 6.0
    if abs(vol) > 1e-4 and vol < 0:
        errs.append(f'{n}: volumen negativo ({vol:.4f}): normales hacia dentro')

# 5) z-fighting con la losa: ninguna pieza maciza tiene cara horizontal EXACTA
#    en z=0 (coplanar con d_baldosa). Las placas contractuales son la excepcion.
PLACAS = {'d_baldosa', 'd_remate', 'd_boca'}
for n, o in by.items():
    if n in PLACAS:
        continue
    for p in o.data.polygons:
        if abs(abs(p.normal.z) - 1.0) < 0.02 and abs(p.center.z) < 1e-4:
            errs.append(f'{n}: cara en el plano del suelo (z-fighting con d_baldosa)')

# 6) huella de d_muro por lado: con paredes contiguas a paso TILE, la corona y
#    el zocalo anteriores (TILE+0.10 y TILE+0.08) se solapaban 5 y 4 cm.
if 'd_muro' in by:
    lo, hi = ext(by['d_muro'])
    if (hi.x - lo.x) > TILE + 1e-4 or (hi.y - lo.y) > TILE + 1e-4:
        errs.append('d_muro desborda la huella TILE')

print(f'nodos: {len(objs)}  triangulos: {total}  (presupuesto {TRI_MAX})')
lo, hi = ext(by['d_muro'])
print(f'd_muro huella {hi.x - lo.x:.3f} x {hi.y - lo.y:.3f} altura {hi.z:.3f}')
lo, hi = ext(by['d_remate'])
print(f'd_remate huella {hi.x - lo.x:.3f} x {hi.y - lo.y:.3f}')
lo, hi = ext(by['d_entrada_boca'])
print(f'd_entrada_boca game-x [{lo.x:.3f},{hi.x:.3f}] z [{lo.y:.3f},{hi.y:.3f}]')
if errs:
    for e in errs:
        print('FALLO:', e)
    sys.exit(1)
print('VALIDO: nombres, huellas, apoyo, origenes, normales y z-fighting OK')
