# Valida OMP-FA-07 (ranas de Cocla) reimportando los GLB publicados.
# "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/validar_ranas_cocla.py
# Comprueba por variante: un esqueleto FG_* con los doce huesos comunes, los cinco
# clips sin sufijos, triangulos dentro de presupuesto, apoyo en z~0 en el fotograma
# 1, altura dentro de rango (1,4-2,0 m las variantes; 2,8-3,9 m la jefa) y que los
# materiales skin/cloth/trim/hair/gear existan para teñir las paletas de data/.
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))

ESPERADOS = {
    'rana_venenosa': dict(tris=(600, 1500), z=(1.30, 2.00), jefe=False),
    'rana_ojirroja': dict(tris=(600, 1500), z=(1.30, 2.10), jefe=False),
    'sapo_canaveral': dict(tris=(600, 1500), z=(1.20, 1.90), jefe=False),
    'rana_dorada': dict(tris=(800, 2500), z=(2.70, 3.90), jefe=True),
}
HUESOS = {'hips', 'chest', 'head', 'jaw',
          'upperArmL', 'foreArmL', 'handL', 'thighL', 'shinL', 'footL',
          'upperArmR', 'foreArmR', 'handR', 'thighR', 'shinR', 'footR'}
MAT = {'skin', 'cloth', 'trim', 'hair', 'gear'}
CLIPS = {'Reposo', 'Caminar', 'Atacar', 'Golpeado', 'Morir'}

for archivo, reglas in ESPERADOS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', f'{archivo}.glb'))
    rigs = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    assert len(rigs) == 1, f'{archivo}: {len(rigs)} esqueletos'
    rig = rigs[0]
    assert rig.name.startswith('FG_'), f'{archivo}: el rig se llama {rig.name}'
    assert {b.name for b in rig.data.bones} == HUESOS, \
        f'{archivo}: huesos {sorted({b.name for b in rig.data.bones} ^ HUESOS)}'
    bodies = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is not None]
    assert len(bodies) == 1, f'{archivo}: {len(bodies)} mallas con padre (esperada Cuerpo)'
    cuerpo = bodies[0]
    tri = sum(len(p.vertices) - 2 for p in cuerpo.data.polygons)
    assert reglas['tris'][0] <= tri <= reglas['tris'][1], f'{archivo}: {tri} triangulos'
    names = {a.name for a in bpy.data.actions}
    assert CLIPS <= names, f'{archivo}: clips ausentes {sorted(CLIPS - names)}'
    extra = names - CLIPS
    assert not extra, f'{archivo}: clips con sufijo o de mas {sorted(extra)}'
    mats = {ms.material.name.split('.')[0] for ms in cuerpo.material_slots if ms.material}
    assert MAT <= mats, f'{archivo}: faltan materiales tenibles {sorted(MAT - mats)}'
    # apoyo z~0 en el reposo (fotograma 1) con la pose limpia
    bpy.context.scene.frame_set(1)
    zs = []
    for o in (cuerpo,):
        dg = bpy.context.evaluated_depsgraph_get()
        ev = o.evaluated_get(dg)
        for c in ev.data.loops:
            p = ev.matrix_world @ ev.data.vertices[c.vertex_index].co
            zs.append(p.z)
    zmin = min(zs)
    assert abs(zmin) < 0.05, f'{archivo}: apoyo en z={zmin:.3f}'
    alto = max(zs) - min(zs)
    assert reglas['z'][0] <= alto <= reglas['z'][1], f'{archivo}: altura {alto:.2f} m fuera de rango'
    print(f'{archivo}.glb OK: {tri} tri, 16 huesos, 5 clips, {alto:.2f} m de alto, apoyo {zmin:.3f}')

print('ranas de Cocla validadas')
