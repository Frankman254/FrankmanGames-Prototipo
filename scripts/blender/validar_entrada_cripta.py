# Valida la boca de la cripta (OMP-POL-01): el arco se lee como entrada desde
# lejos — más alto que un hombre con holgura, la llave emisiva corona el vano,
# el hueco llega al suelo cerrado arriba por el dintel, y el montículo abriga
# sin cubrir la boca. Presupuesto: mazmorra.glb ≤ 4.600 tri (antes 3.4xx).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/validar_entrada_cripta.py
import mathutils
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
GLB = os.path.join(ROOT, 'assets', 'models', 'mazmorra.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
objs = {o.name: o for o in bpy.data.objects if o.type == 'MESH'}
for n in ('d_entrada', 'd_entrada_boca', 'd_entrada_monticulo', 'd_entrada_runa', 'd_antorcha'):
    assert n in objs, f'falta la malla {n}'


def world_box(name):
    o = objs[name]
    return [o.matrix_world @ mathutils.Vector(c) for c in o.bound_box]


tri_total = 0
for o in objs.values():
    o.data.calc_loop_triangles()
    tri_total += len(o.data.loop_triangles)
assert tri_total <= 4600, f'{tri_total} tri en mazmorra.glb > 4.600 (presupuesto POL-01)'

gate = world_box('d_entrada')
h = max(c.z for c in gate)
assert 4.2 <= h <= 5.2, f'arco de {h:.2f} m: fuera de banda legible (4,2–5,2)'

boca = world_box('d_entrada_boca')
assert min(c.z for c in boca) <= 0.05, 'el hueco no llega al suelo'
assert max(c.z for c in boca) >= h - 1.2, 'el tapón no cierra el vano bajo el dintel'

# El GLB se exporta sin materiales (el juego tiñe por nombre de malla): la
# llave se valida por geometría — que corone el vano y enmarque el hueco.
runa = world_box('d_entrada_runa')
assert max(c.z for c in runa) >= h - 0.1, 'la llave no corona el arco'
assert min(c.z for c in runa) <= 2.0, 'la llave no baja a enmarcar el hueco'

mon = world_box('d_entrada_monticulo')
span_x = max(c.x for c in mon) - min(c.x for c in mon)
span_y = max(c.y for c in mon) - min(c.y for c in mon)
assert max(span_x, span_y) >= 5.0, 'el montículo no abriga la boca'
assert max(c.z for c in mon) <= h, 'el montículo supera la altura del arco'

ant = world_box('d_antorcha')
assert len(ant) == 8, 'falta la antorcha de referencia'

print(f'boca de la cripta valida: arco {h:.2f} m, llave corona a {max(c.z for c in runa):.2f} m, '
      f'montículo {max(span_x, span_y):.1f} m de abrigo, mazmorra.glb {tri_total} tri')
