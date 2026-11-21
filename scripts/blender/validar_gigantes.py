# Valida los gigantes de OMP-FA-15 (OMP): yeti y coloso sobre el rig humano
# comun con Atacar de dos manos; ventarron con rig propio FG_Ventarron de
# torbellino sin piernas. Clips, triangulos, apoyo y altura de gigante.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/validar_gigantes.py
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
BIPED = {'hips', 'spine', 'chest', 'head'}
PADRES = {'hips': None, 'spine': 'hips', 'chest': 'spine', 'head': 'chest'}
for s in ('L', 'R'):
    BIPED |= {f'upperArm{s}', f'foreArm{s}', f'hand{s}', f'thigh{s}', f'shin{s}', f'foot{s}'}
    PADRES.update({f'upperArm{s}': 'chest', f'foreArm{s}': f'upperArm{s}', f'hand{s}': f'foreArm{s}',
                   f'thigh{s}': 'hips', f'shin{s}': f'thigh{s}', f'foot{s}': f'shin{s}'})
COMUN = {'Reposo', 'Caminar', 'Correr', 'Rodar', 'Golpeado', 'Morir', 'Atacar'}
VENT = {'hips': None, 'spine': 'hips', 'chest': 'spine', 'head': 'chest',
        'tail1': 'hips', 'tail2': 'tail1', 'tail3': 'tail2'}
for s in ('L', 'R'):
    VENT.update({f'upperArm{s}': 'chest', f'foreArm{s}': f'upperArm{s}', f'hand{s}': f'foreArm{s}'})
SPECS = {
    'yeti_baru': ('FG_YetiBaru', BIPED, PADRES, COMUN, (2.10, 2.85)),
    'coloso_embalse': ('FG_ColosoEmbalse', BIPED, PADRES, COMUN, (2.50, 3.20)),
    'ventarron': ('FG_Ventarron', set(VENT), VENT, COMUN, (2.50, 3.10)),
}

for model, (rig_prefix, huesos_es, padres_es, clips, (hmin, hmax)) in SPECS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', f'{model}.glb'))
    arms = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is not None]
    assert len(arms) == 1, f'{model}: {len(arms)} esqueletos'
    assert len(meshes) == 1 and meshes[0].name == 'Cuerpo', f'{model}: falta el nodo Cuerpo'
    huesos = {pb.name: (pb.parent.name if pb.parent else None) for pb in arms[0].data.bones}
    assert set(huesos) == huesos_es, f'{model}: huesos distintos: {sorted(set(huesos) ^ huesos_es)}'
    malos = {n: (pad, padres_es[n]) for n, pad in huesos.items() if padres_es.get(n, 'X') != pad}
    assert not malos, f'{model}: jerarquia distinta: {malos}'
    assert arms[0].name.startswith(rig_prefix), f'{model}: esqueleto {arms[0].name}'
    acciones = {a.name for a in bpy.data.actions}
    faltan = clips - acciones
    assert not faltan, f'{model}: clips ausentes {sorted(faltan)}'
    tri = sum(sum(len(pc.vertices) - 2 for pc in o.data.polygons) for o in meshes)
    assert tri <= 1500, f'{model}: {tri} triangulos'
    coords = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    lo = tuple(min(pt[i] for pt in coords) for i in range(3))
    hi = tuple(max(pt[i] for pt in coords) for i in range(3))
    assert -0.06 <= lo[2] <= 0.10, f'{model}: no apoya ({lo[2]:.3f})'
    assert hmin <= hi[2] <= hmax, f'{model}: altura {hi[2]:.2f} fuera de [{hmin},{hmax}]'
    if model == 'ventarron':
        assert not any(n.startswith('thigh') or n.startswith('foot') for n in huesos), 'ventarron con piernas'
    print(f'{model}.glb valido: {tri} tri, {len(acciones)} clips, {hi[2]:.2f} m alto')
