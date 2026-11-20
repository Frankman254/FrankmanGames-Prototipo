# Valida OMP-FA-01 (cangrejo del manglar) reimportando el GLB publicado.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/validar_cangrejo.py
# Comprueba: un esqueleto FG_Cangrejo, los cinco clips sin sufijos de Blender,
# ≤1500 triángulos, apoyo en z≈0 en el fotograma 1 del Reposo, ancho de caparazón
# creíble (0,6–0,9 m) y largo total con pinzas (1,3–1,9 m) para que el `scale` de
# data/ (1,2 / 1,5) dé un machetero de ~1 m y un abuelo de ~1,4 m.
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
CLIPS = {'Reposo', 'Caminar', 'Atacar', 'Golpeado', 'Morir'}
TRI_MAX = 1500

ruta = os.path.join(ROOT, 'assets', 'models', 'cangrejo.glb')
assert os.path.exists(ruta), f'falta {ruta}: ejecuta cangrejo.py'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ruta)

arm = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is not None]
assert len(arm) == 1, f'{len(arm)} esqueletos'
assert arm[0].name.startswith('FG_Cangrejo'), f'rig {arm[0].name}'
assert len(meshes) == 2, f'{len(meshes)} mallas hijas del rig (esperadas Caparazon + Apendices): {sorted(m.name for m in meshes)}'

huesos = {b.name for b in arm[0].data.bones}
esperados = {'hips', 'tail', 'eyeL', 'eyeR', 'armL', 'foreL', 'handL', 'pinL',
             'armR', 'foreR', 'handR', 'pinR',
             'legL1', 'shinL1', 'legL2', 'shinL2', 'legL3', 'shinL3',
             'legR1', 'shinR1', 'legR2', 'shinR2', 'legR3', 'shinR3'}
faltan = esperados - huesos
assert not faltan, f'huesos ausentes {sorted(faltan)}'

actions = {a.name for a in bpy.data.actions}
assert CLIPS <= actions, f'clips ausentes {sorted(CLIPS - actions)}'
extra = actions - CLIPS
assert not extra, f'clips con sufijo o de más {sorted(extra)}'

tri = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
assert tri <= TRI_MAX, f'{tri} triángulos (límite {TRI_MAX})'

def bbox(objs):
    deps = bpy.context.evaluated_depsgraph_get()
    cs = []
    for o in objs:
        ev = o.evaluated_get(deps)
        me = bpy.data.meshes.new_from_object(ev)
        cs += [o.matrix_world @ Vector(v.co) for v in me.vertices]
        bpy.data.meshes.remove(me)
    return cs


bpy.context.scene.frame_set(1)
coords = bbox(meshes)
zmin = min(c.z for c in coords)
assert -0.02 <= zmin <= 0.05, f'no apoya en el suelo ({zmin:.3f})'

shell = next(o for o in meshes if o.name.startswith('Caparazon'))
cap = bbox([shell])
xs = [c.x for c in coords]
ys = [c.y for c in coords]
xc = [c.x for c in cap]
ancho_cap = max(xc) - min(xc)
ancho_total = max(xs) - min(xs)
largo = max(ys) - min(ys)
alto = max(c.z for c in coords) - max(zmin, 0)
assert 0.55 <= ancho_cap <= 0.78, f'ancho del caparazon {ancho_cap:.2f} m fuera de [0.55, 0.78]'
assert 1.30 <= ancho_total <= 1.85, f'envergadura con pinzas {ancho_total:.2f} m fuera de [1.30, 1.85]'
assert 0.60 <= largo <= 1.05, f'largo {largo:.2f} m fuera de [0.60, 1.05]'
assert 0.40 <= alto <= 0.60, f'alto {alto:.2f} m fuera de [0.40, 0.60]'

mats = {m.name for o in meshes for m in o.data.materials}
for region in ('skin', 'trim', 'hair', 'gear'):
    assert region in mats, f'falta material teñible {region}: {sorted(mats)}'

print(f'cangrejo.glb OK: {tri} tri, {len(actions)} clips, caparazon {ancho_cap:.2f} m, '
      f'envergadura {ancho_total:.2f} m, largo {largo:.2f} m, alto {alto:.2f} m, apoyo {zmin:.3f}')
