# Valida sato_jefe / tigrillo_ceniza / coyote_helada: esqueleto FG_Bestia exacto
# (huesos y padres), ocho clips, apoyo en el suelo, altura y triangulos.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/validar_lobos.py
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
MODELS = os.path.join(ROOT, 'assets', 'models')

BONES = ['hips', 'chest', 'head', 'jaw', 'tail'] + \
    [f'{q}{n}' for q in ('leg', 'shin') for n in ('FL', 'FR', 'BL', 'BR')] + ['footL', 'footR']
PADRES = {'hips': None, 'chest': 'hips', 'head': 'chest', 'jaw': 'head', 'tail': 'hips',
          'legFL': 'chest', 'shinFL': 'legFL', 'legFR': 'chest', 'shinFR': 'legFR',
          'legBL': 'hips', 'shinBL': 'legBL', 'legBR': 'hips', 'shinBR': 'legBR',
          'footL': 'shinBL', 'footR': 'shinBR'}
CLIPS = ['Reposo', 'Caminar', 'Correr', 'Atacar', 'Aullar', 'Esquivar', 'Golpeado', 'Morir']

# modelo: (banda de altura en m, tope de triangulos)
SPECS = {
    'sato_jefe': ((0.90, 1.20), 1500),
    'tigrillo_ceniza': ((0.36, 0.60), 1500),
    'coyote_helada': ((0.48, 0.90), 1500),
}

for model, ((hmin, hmax), trimax) in SPECS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, f'{model}.glb'))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    nombres = {b.name for b in arm.data.bones}
    assert set(BONES) <= nombres, f'{model}: faltan huesos {set(BONES) - nombres}'
    for b in arm.data.bones:
        if b.name in PADRES:
            real = b.parent.name if b.parent else None
            assert real == PADRES[b.name], f'{model}: {b.name} cuelga de {real}, no de {PADRES[b.name]}'
    acciones = [a.name for a in bpy.data.actions]
    for c in CLIPS:
        assert c in acciones, f'{model}: sin clip {c}'
    def del_modelo(o):
        return o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)
    tri = sum(len(o.data.loop_triangles) for o in bpy.data.objects if del_modelo(o))
    assert tri <= trimax, f'{model}: {tri} tri > {trimax}'
    zs, ys, xs = [], [], []
    for o in bpy.data.objects:
        if del_modelo(o):
            for corner in o.data.vertices:
                w = o.matrix_world @ corner.co
                xs.append(w.x)
                ys.append(w.y)
                zs.append(w.z)
    lo = (min(xs), min(ys), min(zs))
    hi = (max(xs), max(ys), max(zs))
    assert -0.06 <= lo[2] <= 0.10, f'{model}: no apoya ({lo[2]:.3f})'
    assert hmin <= hi[2] <= hmax, f'{model}: altura {hi[2]:.2f} fuera de [{hmin},{hmax}]'
    print(f'{model}.glb valido: {tri} tri, {len(acciones)} clips, {hi[2]:.2f} m alto, {hi[1] - lo[1]:.2f} m largo')
