# Valida los cuatro tiradores de OMP-FA-20: rig humano comun (huesos y padres
# de fg_rig.biped_bones), los seis clips de la plantilla chaman (Conjurar como
# attack/cast), apoyo, altura y triangulos.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/validar_tiradores.py
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
MODELS = os.path.join(ROOT, 'assets', 'models')

HUESOS = ['hips', 'spine', 'chest', 'head', 'upperArmL', 'foreArmL', 'handL',
          'upperArmR', 'foreArmR', 'handR', 'thighL', 'shinL', 'footL',
          'thighR', 'shinR', 'footR']
PADRES = {'hips': None, 'spine': 'hips', 'chest': 'spine', 'head': 'chest',
          'upperArmL': 'chest', 'foreArmL': 'upperArmL', 'handL': 'foreArmL',
          'upperArmR': 'chest', 'foreArmR': 'upperArmR', 'handR': 'foreArmR',
          'thighL': 'hips', 'shinL': 'thighL', 'footL': 'shinL',
          'thighR': 'hips', 'shinR': 'thighR', 'footR': 'shinR'}
CLIPS = ['Reposo', 'Caminar', 'Correr', 'Rodar', 'Golpeado', 'Morir', 'Disparar']

SPECS = {
    'duende_tirapiedras': (1.05, 1.35),
    'trampero_matorral': (1.4, 1.8),
    'cerbatanero_tapon': (1.4, 1.8),
    'arquero_ventisca': (1.5, 1.95),
    'vigia_crater': (1.4, 1.9),
    'pescador_fantasma': (1.45, 1.95),
}

for model, (hmin, hmax) in SPECS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, f'{model}.glb'))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    nombres = {b.name for b in arm.data.bones}
    assert set(HUESOS) <= nombres, f'{model}: faltan huesos {set(HUESOS) - nombres}'
    for bn in arm.data.bones:
        if bn.name in PADRES:
            real = bn.parent.name if bn.parent else None
            assert real == PADRES[bn.name], f'{model}: {bn.name} cuelga de {real}, no de {PADRES[bn.name]}'
    acciones = [a.name for a in bpy.data.actions]
    for c in CLIPS:
        assert c in acciones, f'{model}: sin clip {c}'

    def del_modelo(o):
        return o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)
    tri = sum(len(o.data.loop_triangles) for o in bpy.data.objects if del_modelo(o))
    assert tri <= 1500, f'{model}: {tri} tri > 1.500'
    xs, ys, zs = [], [], []
    for o in bpy.data.objects:
        if del_modelo(o):
            for corner in o.data.vertices:
                w = o.matrix_world @ corner.co
                xs.append(w.x)
                ys.append(w.y)
                zs.append(w.z)
    lo, hi = (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))
    assert -0.06 <= lo[2] <= 0.10, f'{model}: no apoya ({lo[2]:.3f})'
    assert hmin <= hi[2] <= hmax, f'{model}: altura {hi[2]:.2f} fuera de [{hmin},{hmax}]'
    print(f'{model}.glb valido: {tri} tri, {len(acciones)} clips, {hi[2]:.2f} m alto')
