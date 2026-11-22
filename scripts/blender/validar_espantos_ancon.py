# Valida los espantos del Ancón de OMP-FA-17 (OMP): bus con rig propio de
# ruedas (diablo_rojo), chofer sobre el rig humano comun (chofer_sin_frenos) y
# titi cuadrupedo (mono_titi). Clips, triangulos, apoyo y tamano creible.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/validar_espantos_ancon.py
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
BIPED = {'hips', 'spine', 'chest', 'head'}
PADRES = {'hips': None, 'spine': 'hips', 'chest': 'spine', 'head': 'chest'}
for s in ('L', 'R'):
    BIPED |= {f'upperArm{s}', f'foreArm{s}', f'hand{s}', f'thigh{s}', f'shin{s}', f'foot{s}'}
    PADRES.update({f'upperArm{s}': 'chest', f'foreArm{s}': f'upperArm{s}', f'hand{s}': f'foreArm{s}',
                   f'thigh{s}': 'hips', f'shin{s}': f'thigh{s}', f'foot{s}': f'shin{s}'})
HUMANO = {'Reposo', 'Caminar', 'Correr', 'Rodar', 'Golpeado', 'Morir'}
BUS = {'hips': None, 'chest': 'hips', 'jaw': 'chest', 'horn': 'chest',
       'wheelFL': 'hips', 'wheelFR': 'hips', 'wheelBL': 'hips', 'wheelBR': 'hips'}
TITI = {'hips': None, 'chest': 'hips', 'neck': 'chest', 'head': 'neck', 'jaw': 'head',
        'tail1': 'hips', 'tail2': 'tail1'}
for s in ('FL', 'FR', 'BL', 'BR'):
    TITI[f'leg{s}'] = 'chest' if s[0] == 'F' else 'hips'
    TITI[f'shin{s}'] = f'leg{s}'
SPECS = {
    'diablo_rojo': ('FG_DiabloRojo', set(BUS), BUS, HUMANO, (1.45, 2.2), (1.5, 2.4)),
    'chofer_sin_frenos': ('FG_Chofer', BIPED, PADRES, HUMANO, (1.55, 1.95), (0, 0)),
    'mono_titi': ('FG_MonoTiti', set(TITI), TITI, HUMANO, (0.40, 0.65), (0.55, 0.95)),
}

for model, (rig_prefix, huesos_es, padres_es, clips, (hmin, hmax), (lmin, lmax)) in SPECS.items():
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
    if lmax:
        largo = hi[1] - lo[1]
        assert lmin <= largo <= lmax, f'{model}: largo {largo:.2f} fuera de [{lmin},{lmax}]'
    print(f'{model}.glb valido: {tri} tri, {len(acciones)} clips, {hi[2]:.2f} m alto')
