# Valida la gente del mar de OMP-FA-13 (OMP): rig humano exacto, clips,
# triangulos, apoyo y caja.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/validar_gente_del_mar.py
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
BIPED = {'hips', 'spine', 'chest', 'head'}
for s in ('L', 'R'):
    BIPED |= {f'upperArm{s}', f'foreArm{s}', f'hand{s}', f'thigh{s}', f'shin{s}', f'foot{s}'}
PADRES = {'hips': None, 'spine': 'hips', 'chest': 'spine', 'head': 'chest'}
for s in ('L', 'R'):
    PADRES.update({f'upperArm{s}': 'chest', f'foreArm{s}': f'upperArm{s}', f'hand{s}': f'foreArm{s}',
                   f'thigh{s}': 'hips', f'shin{s}': f'thigh{s}', f'foot{s}': f'shin{s}'})
COMUN = {'Reposo', 'Caminar', 'Correr', 'Rodar', 'Golpeado', 'Morir'}
SPECS = {
    'pirata_bocanas': ('FG_Pirata', COMUN | {'Disparar'}, (1.40, 1.62)),
    'capitan_calipso': ('FG_Capitan', COMUN | {'Atacar'}, (1.65, 1.90)),
    'marinero_ahogado': ('FG_Ahogado', COMUN | {'Atacar'}, (1.55, 1.70)),
}

for model, (rig_prefix, clips, (hmin, hmax)) in SPECS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', f'{model}.glb'))
    arms = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is not None]
    assert len(arms) == 1, f'{model}: {len(arms)} esqueletos'
    assert len(meshes) == 1 and meshes[0].name == 'Cuerpo', f'{model}: falta el nodo Cuerpo'
    huesos = {pb.name: (pb.parent.name if pb.parent else None) for pb in arms[0].data.bones}
    assert set(huesos) == BIPED, f'{model}: huesos distintos del humano comun: {sorted(huesos)}'
    malos = {n: (pad, PADRES[n]) for n, pad in huesos.items() if pad != PADRES[n]}
    assert not malos, f'{model}: jerarquia distinta del humano comun: {malos}'
    acciones = {a.name for a in bpy.data.actions}
    faltan = clips - acciones
    assert not faltan, f'{model}: clips ausentes {sorted(faltan)}'
    tri = sum(len(o.data.polygons) and sum(len(pc.vertices) - 2 for pc in o.data.polygons) for o in meshes)
    assert tri <= 1500, f'{model}: {tri} triangulos'
    coords = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    lo = tuple(min(pt[i] for pt in coords) for i in range(3))
    hi = tuple(max(pt[i] for pt in coords) for i in range(3))
    assert -0.04 <= lo[2] <= 0.08, f'{model}: no apoya ({lo[2]:.3f})'
    assert hmin <= hi[2] <= hmax, f'{model}: altura {hi[2]:.2f} fuera de [{hmin},{hmax}]'
    print(f'{model}.glb valido: {tri} tri, {len(acciones)} clips, {hi[2]:.2f} m alto, caja x[{lo[0]:.2f},{hi[0]:.2f}]')
