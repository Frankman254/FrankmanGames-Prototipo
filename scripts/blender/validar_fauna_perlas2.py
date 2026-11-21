# Valida OMP-FA-09 (tiburon martillo y calamar) reimportando los GLB publicados.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/validar_fauna_perlas2.py
# Comprueba por especie: un esqueleto FG_*, los cinco clips sin sufijos, <=1500
# triangulos, apoyo en z~0 en el fotograma 1 del Reposo y dimensiones creibles:
# tiburon (perlas_shark, elite) ~1,7-2,1 m de punta de martillo a lobulo de cola
# y ~1,0-1,3 m de alto; calamar (perlas_squid, melee nocturno) ~1,1-1,5 m de los
# brazos al ápice del manto y ~1,2-1,6 m de alto.
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
CLIPS = {'Reposo', 'Caminar', 'Atacar', 'Golpeado', 'Morir'}

ESPECIES = {
    'tiburon': dict(rig='FG_Tiburon',
                    huesos={'hips', 'chest', 'head', 'jaw', 'tail1', 'tail2', 'tail3',
                            'pecL', 'pecR', 'pelL', 'pelR'},
                    largo=(1.60, 2.20), alto=(0.90, 1.35), ancho=(0.80, 1.15)),
    'calamar': dict(rig='FG_Calamar',
                    huesos={'hips', 'head', 'jaw', 'eyeL', 'eyeR', 'tent1', 'tip1',
                            'fang1', 'fang1Tip', 'fang2', 'fang2Tip'},
                    largo=(1.05, 1.60), alto=(1.10, 1.65), ancho=(0.45, 0.75)),
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
    assert os.path.exists(ruta), f'falta {ruta}: ejecuta fauna_perlas2.py'
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
    assert -0.02 <= zmin <= 0.06, f'{archivo}: no apoya en el suelo ({zmin:.3f})'

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
        assert region in mats, f'{archivo}: falta material tenible {region}: {sorted(mats)}'

    print(f'{archivo}.glb OK: {tri} tri, 5 clips, {largo:.2f} m largo x '
          f'{ancho:.2f} m ancho x {alto:.2f} m alto, apoyo {zmin:.3f}')
