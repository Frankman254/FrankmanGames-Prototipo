# Valida OMP-FA-12 (los seis espíritus de la familia `imp`) reimportando los GLB.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/validar_fauna_espiritus.py
# Comprueba: los cinco espíritus comparten LITERALMENTE el esqueleto
# FG_Espiritu (hips, chest, head, armL, armR, tail, tip) hueso por hueso, con
# su cola tocando el suelo; la chitra lleva su rig de insecto (trompa y seis
# patas). En todos: cinco clips sin sufijos, <=1.500 triangulos, apoyo en z~0
# del Reposo en f1, dimensiones creibles y las cinco regiones teñibles.
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
CLIPS = {'Reposo', 'Caminar', 'Atacar', 'Golpeado', 'Morir'}
ESPIRITU_HUESOS = {'hips', 'chest', 'head', 'armL', 'armR', 'tail', 'tip'}
CHITRA_HUESOS = {'hips', 'head', 'trunk', 'abdomen', 'proboscis', 'wingL', 'wingR'} | {
    f'{p}{n}' for p in ('leg', 'shin') for n in ('FL', 'FR', 'ML', 'MR', 'BL', 'BR')}

ESPIRITUS = {
    'gotita': dict(rig='FG_Espiritu', alto=(0.55, 0.85)),
    'jiron': dict(rig='FG_Espiritu', alto=(0.55, 0.85)),
    'brasita': dict(rig='FG_Espiritu', alto=(0.55, 0.90)),
    'copito': dict(rig='FG_Espiritu', alto=(0.55, 0.85)),
    'alma': dict(rig='FG_Espiritu', alto=(0.55, 0.85)),
    'chitra': dict(rig='FG_Chitra', alto=(0.15, 0.40)),
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


for archivo, cfg in ESPIRITUS.items():
    ruta = os.path.join(ROOT, 'assets', 'models', f'{archivo}.glb')
    assert os.path.exists(ruta), f'falta {ruta}: ejecuta fauna_espiritus.py'
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=ruta)

    arm = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is not None]
    assert len(arm) == 1, f'{archivo}: {len(arm)} esqueletos'
    assert arm[0].name.startswith(cfg['rig']), f"{archivo}: rig {arm[0].name}"
    assert len(meshes) == 1, f"{archivo}: {len(meshes)} mallas (esperada Cuerpo)"

    huesos = {b.name for b in arm[0].data.bones}
    esperado = ESPIRITU_HUESOS if cfg['rig'] == 'FG_Espiritu' else CHITRA_HUESOS
    assert esperado <= huesos, f"{archivo}: huesos ausentes {sorted(esperado - huesos)}"
    if cfg['rig'] == 'FG_Espiritu':
        assert huesos == ESPIRITU_HUESOS, f'{archivo}: el rig comun no puede tener huesos extra {sorted(huesos - ESPIRITU_HUESOS)}'

    actions = {a.name for a in bpy.data.actions}
    assert CLIPS <= actions, f'{archivo}: clips ausentes {sorted(CLIPS - actions)}'
    assert not actions - CLIPS, f'{archivo}: clips de mas {sorted(actions - CLIPS)}'

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
    lo, hi = cfg['alto']
    assert lo <= alto <= hi, f'{archivo}: alto {alto:.2f} m fuera de [{lo}, {hi}]'
    assert ancho <= 0.75, f'{archivo}: ancho {ancho:.2f} m fuera de [0, 0.75]'

    mats = {mm.name for o in meshes for mm in o.data.materials}
    for region in ('skin', 'cloth', 'trim', 'hair', 'gear'):
        assert region in mats, f'{archivo}: falta material teñible {region}: {sorted(mats)}'

    print(f'{archivo}.glb OK: {tri} tri, 5 clips, {largo:.2f} m largo x '
          f'{ancho:.2f} m ancho x {alto:.2f} m alto, apoyo {zmin:.3f}')
