# Valida el contrato de assets/models/huacas_cocle.glb (OMP-POL-06):
# seis mallas estaticas huaca_<animal>, ≤ 300 triangulos cada una, origen en el
# suelo, mirando a -Y (el morro/hocico por debajo del centroide), sin rig.
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scripts/blender/validar_huacas_cocle.py
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
EXPECTED = {'huaca_rana', 'huaca_jaguar', 'huaca_aguilucho',
            'huaca_caiman', 'huaca_tortuga', 'huaca_murcielago'}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'huacas_cocle.glb'))
meshes = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}
armas = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
fails = []
if set(meshes) != EXPECTED:
    fails.append(f'nodos incorrectos; faltan {sorted(EXPECTED - set(meshes))}, sobran {sorted(set(meshes) - EXPECTED)}')
if armas:
    fails.append('lleva armadura (debe ser estatico, como utileria_cripta.glb)')
total = 0
for name, obj in sorted(meshes.items()):
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    total += tris
    zs = [v.co.z for v in obj.data.vertices]
    if tris > 300:
        fails.append(f'{name}: {tris} triangulos > 300')
    if min(zs) < -0.01:
        fails.append(f'{name}: baja del suelo ({min(zs):.3f})')
    if max(zs) > 0.30:
        fails.append(f'{name}: mide {max(zs):.2f} m, fuera de escala de mano')
    if abs(obj.location.x) > 1e-4 or abs(obj.location.y) > 1e-4:
        fails.append(f'{name}: origen desplazado en x/y {tuple(obj.location)}')
    # mirando a -Y: el centroide x de las caras mas al frente esta alineado con el eje x
    ys = sorted((sum(obj.data.vertices[i].co.y for i in p.vertices) / len(p.vertices),
                 sum(obj.data.vertices[i].co.x for i in p.vertices) / len(p.vertices)) for p in obj.data.polygons)
    frente_x = sum(x for _y, x in ys[:max(1, len(ys) // 10)]) / max(1, len(ys) // 10)
    centro_x = sum(v.co.x for v in obj.data.vertices) / len(obj.data.vertices)
    if abs(frente_x - centro_x) > 0.05:
        fails.append(f'{name}: torcido en yaw (frente x {frente_x:.3f} vs centro {centro_x:.3f})')
print(f'huacas_cocle.glb: {len(meshes)} piezas, {total} triangulos en total')
if fails:
    raise SystemExit('FALLO: ' + ' | '.join(fails))
print('valida: seis huacas ≤300 tri, apoyadas, a mano, mirando a -Y, sin rig')
