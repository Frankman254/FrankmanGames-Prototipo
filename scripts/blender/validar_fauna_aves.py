# Valida OMP-FA-11 (búho chismoso, quetzal y pavo gritón) reimportando los GLB.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/validar_fauna_aves.py
# Comprueba por ave: el esqueleto de ave.py (D-17) hueso por hueso, los cinco
# clips sin sufijos, <=1.500 triangulos, apoyo en z~0 del Reposo en f1 y
# dimensiones creibles (buho ~1,1-1,45 m de alto posado; quetzal con las
# rastreras 1,6-2,3 m de largo; pavo 1,2-1,6 m de alto). El ancho es el del
# posado con las alas plegadas, no la envergadura (que solo se ve en los clips).
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
CLIPS = {'Reposo', 'Caminar', 'Atacar', 'Golpeado', 'Morir'}
HUESOS = {'hips', 'chest', 'neck', 'head', 'tail', 'legL', 'shinL', 'footL',
          'legR', 'shinR', 'footR', 'wingL', 'wingTipL', 'wingR', 'wingTipR'}

AVES = {
    'buho_chismoso': dict(rig='FG_BuhoChismoso', alto=(1.05, 1.40), ancho=(0.50, 0.95)),
    'quetzal': dict(rig='FG_Quetzal', alto=(0.60, 1.05), largo=(1.50, 2.35), ancho=(0.42, 0.95)),
    'pavo_griton': dict(rig='FG_PavoGriton', alto=(1.05, 1.45), ancho=(0.55, 1.00)),
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


for archivo, cfg in AVES.items():
    ruta = os.path.join(ROOT, 'assets', 'models', f'{archivo}.glb')
    assert os.path.exists(ruta), f'falta {ruta}: ejecuta fauna_aves.py'
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=ruta)

    arm = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is not None]
    assert len(arm) == 1, f'{archivo}: {len(arm)} esqueletos'
    assert arm[0].name.startswith(cfg['rig']), f"{archivo}: rig {arm[0].name}"
    assert len(meshes) == 1, f"{archivo}: {len(meshes)} mallas (esperada Cuerpo)"

    huesos = {b.name for b in arm[0].data.bones}
    assert HUESOS <= huesos, f"{archivo}: huesos del rig D-17 ausentes {sorted(HUESOS - huesos)}"

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
    lo, hi = cfg['ancho']
    assert lo <= ancho <= hi, f'{archivo}: ancho {ancho:.2f} m fuera de [{lo}, {hi}]'
    if 'largo' in cfg:
        lo, hi = cfg['largo']
        assert lo <= largo <= hi, f'{archivo}: largo {largo:.2f} m fuera de [{lo}, {hi}]'

    mats = {mm.name for o in meshes for mm in o.data.materials}
    for region in ('skin', 'cloth', 'trim', 'hair', 'gear'):
        assert region in mats, f'{archivo}: falta material teñible {region}: {sorted(mats)}'

    print(f'{archivo}.glb OK: {tri} tri, 5 clips, {largo:.2f} m largo x '
          f'{ancho:.2f} m ancho x {alto:.2f} m alto, apoyo {zmin:.3f}')
