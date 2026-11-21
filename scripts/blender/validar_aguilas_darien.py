# Valida OMP-FA-21 (aguilas de Dariena) reimportando los GLB publicados.
# "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/validar_aguilas_darien.py
# Comprueba por variante: un esqueleto FG_* con los dieciseis huesos comunes, los
# cinco clips sin sufijos, triangulos dentro de presupuesto, apoyo en z~0 en el
# fotograma 1, altura dentro de rango (1,0-1,5 m las variantes; 2,5-3,4 m la jefa)
# y que los materiales skin/cloth/trim/hair/gear existan para tenir las paletas.
import os

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))

ESPERADOS = {
    'aguila_negra': dict(tris=(600, 1500), z=(0.95, 1.60), jefe=False),
    'aguila_ornada': dict(tris=(600, 1500), z=(1.00, 1.70), jefe=False),
    'aguila_crestada': dict(tris=(700, 2500), z=(2.20, 3.40), jefe=True),
}
HUESOS = {'hips', 'chest', 'neck', 'head', 'jaw', 'tail',
          'wingL', 'wingTipL', 'wingR', 'wingTipR',
          'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'}
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
    bpy.context.scene.frame_set(1)
    dg = bpy.context.evaluated_depsgraph_get()
    ev = cuerpo.evaluated_get(dg)
    zs = [(ev.matrix_world @ ev.data.vertices[c.vertex_index].co).z for c in ev.data.loops]
    zmin = min(zs)
    assert abs(zmin) < 0.05, f'{archivo}: apoyo en z={zmin:.3f}'
    alto = max(zs) - min(zs)
    assert reglas['z'][0] <= alto <= reglas['z'][1], f'{archivo}: altura {alto:.2f} m fuera de rango'
    print(f'{archivo}.glb OK: {tri} tri, 16 huesos, 5 clips, {alto:.2f} m de alto, apoyo {zmin:.3f}')

print('aguilas de Dariena validadas')
