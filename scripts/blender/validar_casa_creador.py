# Valida CLA-CASA1 (casa del creador) reimportando el GLB publicado.
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python scripts/blender/validar_casa_creador.py
# Comprueba: casa + puerta, clips Abrir y Cerrar sin sufijo, ≤ 6000 triángulos, medidas de los
# planos (6,30 m de frente y 12 m de fondo de muros; alero y losa aparte), cumbrera a ~3,75 m,
# puerta en la fachada que mira a -Y y texturas propias empaquetadas de ≤ 512 px.
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
TRI_MAX = 6000

ruta = os.path.join(ROOT, 'assets', 'models', 'casa_creador.glb')
assert os.path.exists(ruta), f'falta {ruta}: ejecuta casa_creador.py'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ruta)

meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
nombres = sorted(o.name for o in meshes)
assert nombres == ['FG_CasaCreador', 'FG_CasaCreador_Puerta'], f'mallas {nombres}'
casa = bpy.data.objects['FG_CasaCreador']
puerta = bpy.data.objects['FG_CasaCreador_Puerta']

actions = {a.name for a in bpy.data.actions}
assert {'Abrir', 'Cerrar'} <= actions, f'clips {sorted(actions)}'

tri = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
assert tri <= TRI_MAX, f'{tri} triángulos (límite {TRI_MAX})'


def coords(o):
    return [o.matrix_world @ Vector(v.co) for v in o.data.vertices]


# glTF importa con +Y arriba convertido de vuelta a +Z; la fachada queda en -Y.
cs = coords(casa)
zs = [c.z for c in cs]
assert -0.6 <= min(zs) <= -0.4, f'el cimiento debe bajar bajo tierra ({min(zs):.2f})'
cumbre = max(zs)
assert 3.7 <= cumbre <= 3.95, f'cumbrera a {cumbre:.2f} m'
# Muros: los vértices con repello entre 0,5 y 2,5 m de alto.
mat_idx = [i for i, m in enumerate(casa.data.materials) if m.name.startswith('Repello')]
muro = [casa.matrix_world @ Vector(casa.data.vertices[v].co) for p in casa.data.polygons if p.material_index in mat_idx for v in p.vertices]
muro = [c for c in muro if 0.5 < c.z < 2.5]
ancho = max(c.x for c in muro) - min(c.x for c in muro)
fondo = max(c.y for c in muro) - min(c.y for c in muro)
assert 6.2 <= ancho <= 6.7, f'frente de muros {ancho:.2f} m (planos: 6,30)'
assert 11.8 <= fondo <= 12.3, f'fondo de muros {fondo:.2f} m (planos: 12)'

pc = coords(puerta)
py = sum(c.y for c in pc) / len(pc)
assert py < -4.0, f'la puerta no está en la fachada (y={py:.2f})'
alto_p = max(c.z for c in pc) - min(c.z for c in pc)
assert 2.0 <= alto_p <= 2.25, f'puerta de {alto_p:.2f} m (planos: 2,15)'

for im in bpy.data.images:
    if im.size[0]:
        assert max(im.size) <= 512, f'textura {im.name} de {tuple(im.size)}'

print(f'casa_creador.glb OK: {tri} tri, clips {sorted(actions)}, muros {ancho:.2f} x {fondo:.2f} m, '
      f'cumbrera {cumbre:.2f} m, puerta {alto_p:.2f} m')
