# Valida OMP-FA-06 (neque y tapir) reimportando los GLB publicados.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/validar_fauna_darien.py
# Comprueba por especie: un esqueleto FG_*, los cinco clips sin sufijos, <=1500
# triangulos, apoyo en z~0 en el fotograma 1 del Reposo y dimensiones creibles:
# neque (aguati, roedor) ~0,60 m de morro a grupa y ~0,33 m de alto; tapir
# (Macho de Monte Insomne, elite) ~1,6-1,9 m de trompa a grupa y ~0,85-1,05 m.
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
CLIPS = {'Reposo', 'Caminar', 'Atacar', 'Golpeado', 'Morir'}

ESPECIES = {
    'neque': dict(rig='FG_Neque', huesos={'hips', 'chest', 'neck', 'head', 'jaw', 'tail',
                                          'legFL', 'shinFL', 'legFR', 'shinFR',
                                          'legBL', 'shinBL', 'legBR', 'shinBR'},
                  largo=(0.45, 0.80), alto=(0.24, 0.45), ancho=(0.16, 0.35)),
    'tapir': dict(rig='FG_Tapir', huesos={'hips', 'chest', 'neck', 'head', 'jaw', 'tail',
                                          'trunk1', 'trunk2',
                                          'legFL', 'shinFL', 'legFR', 'shinFR',
                                          'legBL', 'shinBL', 'legBR', 'shinBR'},
                  largo=(1.45, 1.95), alto=(0.75, 1.10), ancho=(0.45, 0.75)),
}


def bbox(objs):
    deps = bpy.context.evaluated_depsgraph_get()
    cs = []
    for o in objs:
        ev = o.evaluated_get(deps)
        me = bpy.data.meshes.new_from_object(ev)
        cs += [o.matrix_world @ Vector(v.co) for v in me.vertices]
        bpy.data.meshes.remove(me)
    return cs


for archivo, cfg in ESPECIES.items():
    ruta = os.path.join(ROOT, 'assets', 'models', f'{archivo}.glb')
    assert os.path.exists(ruta), f'falta {ruta}: ejecuta fauna_darien.py'
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=ruta)

    arm = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is not None]
    assert len(arm) == 1, f'{archivo}: {len(arm)} esqueletos'
    assert arm[0].name.startswith(cfg['rig']), f"{archivo}: rig {arm[0].name}"
    assert len(meshes) == 1, f"{archivo}: {len(meshes)} mallas (esperada Cuerpo)"

    huesos = {b.name for b in arm[0].data.bones}
    faltan = cfg['huesos'] - huesos
    assert not faltan, f'{archivo}: huesos ausentes {sorted(faltan)}'

    actions = {a.name for a in bpy.data.actions}
    assert CLIPS <= actions, f'{archivo}: clips ausentes {sorted(CLIPS - actions)}'
    extra = actions - CLIPS
    assert not extra, f'{archivo}: clips con sufijo o de mas {sorted(extra)}'

    tri = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
    assert tri <= 1500, f'{archivo}: {tri} triangulos (limite 1500)'

    bpy.context.scene.frame_set(1)
    coords = bbox(meshes)
    zmin = min(c.z for c in coords)
    assert -0.02 <= zmin <= 0.05, f'{archivo}: no apoya en el suelo ({zmin:.3f})'

    xs = [c.x for c in coords]
    ys = [c.y for c in coords]
    zs = [c.z for c in coords]
    ancho = max(xs) - min(xs)
    largo = max(ys) - min(ys)
    alto = max(zs) - max(zmin, 0)
    lo, hi = cfg['largo']
    assert lo <= largo <= hi, f'{archivo}: largo {largo:.2f} m fuera de [{lo}, {hi}]'
    lo, hi = cfg['alto']
    assert lo <= alto <= hi, f'{archivo}: alto {alto:.2f} m fuera de [{lo}, {hi}]'
    lo, hi = cfg['ancho']
    assert lo <= ancho <= hi, f'{archivo}: ancho {ancho:.2f} m fuera de [{lo}, {hi}]'

    mats = {m.name for o in meshes for m in o.data.materials}
    for region in ('skin', 'cloth', 'trim', 'hair', 'gear'):
        assert region in mats, f'{archivo}: falta material tenable {region}: {sorted(mats)}'

    print(f'{archivo}.glb OK: {tri} tri, 5 clips, {largo:.2f} m largo x '
          f'{ancho:.2f} m ancho x {alto:.2f} m alto, apoyo {zmin:.3f}')
