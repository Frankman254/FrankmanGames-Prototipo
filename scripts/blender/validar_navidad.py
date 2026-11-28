# Valida el contrato de assets/models/navidad.glb (NAV-02):
# piezas estaticas del mapa de Navidad, sin rig, origen en el suelo (salvo la
# guirnalda, que cuelga), cada una bajo su tope de triangulos y a escala.
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scripts/blender/validar_navidad.py
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
# nombre: (tope de triangulos, altura minima, altura maxima en metros)
EXPECTED = {
    'arbol_navidad': (4500, 6.0, 14.0),
    'regalo_a': (150, 0.2, 1.2),
    'regalo_b': (150, 0.2, 1.2),
    'regalo_c': (150, 0.2, 1.2),
    'nacimiento': (1200, 2.5, 6.0),
    'casita_nevada_a': (1200, 3.0, 7.0),
    'casita_nevada_b': (1200, 3.0, 7.0),
    'casita_nevada_c': (1200, 3.0, 7.0),
    'farol_navidad': (500, 2.0, 4.5),
    'guirnalda': (400, 0.1, 1.5),
    'muneco_nieve': (1200, 1.2, 2.6),
    'banca_nevada': (300, 0.5, 1.3),
}
TOTAL_MAX = 12000

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'navidad.glb'))
meshes = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}
fails = []
if set(meshes) != set(EXPECTED):
    fails.append(f'nodos incorrectos; faltan {sorted(set(EXPECTED) - set(meshes))}, sobran {sorted(set(meshes) - set(EXPECTED))}')
if any(o.type == 'ARMATURE' for o in bpy.context.scene.objects):
    fails.append('lleva armadura (debe ser estatico)')
total = 0
for name, obj in sorted(meshes.items()):
    if name not in EXPECTED:
        continue
    tope, hmin, hmax = EXPECTED[name]
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    total += tris
    zs = [v.co.z for v in obj.data.vertices]
    alto = max(zs) - min(zs)
    if tris > tope:
        fails.append(f'{name}: {tris} triangulos > {tope}')
    if not hmin <= alto <= hmax:
        fails.append(f'{name}: mide {alto:.2f} m, fuera de [{hmin}, {hmax}]')
    if name != 'guirnalda' and abs(min(zs)) > 0.02:
        fails.append(f'{name}: no apoya en el suelo (z min {min(zs):.3f})')
    if abs(obj.location.x) > 1e-4 or abs(obj.location.y) > 1e-4:
        fails.append(f'{name}: origen desplazado en x/y {tuple(obj.location)}')
if total > TOTAL_MAX:
    fails.append(f'total {total} > {TOTAL_MAX}')
print(f'navidad.glb: {len(meshes)} piezas, {total} triangulos en total')
if fails:
    raise SystemExit('FALLO: ' + ' | '.join(fails))
print('valida: piezas de Navidad estaticas, apoyadas, a escala y bajo su tope')
