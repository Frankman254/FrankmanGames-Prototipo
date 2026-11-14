# Valida el lote D-17 (ave familiar) reimportando los GLB publicados.
#   "…/Blender" --background --python scripts/blender/validar_ave.py
# Comprueba por variante: un esqueleto con el prefijo esperado, un nodo 'Cuerpo',
# los seis clips compartidos sin prefijo ni contaminación de la otra variante,
# presupuesto ~700 triángulos, apoyo en z≈0 y la medida firma (alto del gallote
# posado / envergadura de la tijereta).
import os

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
CLIPS = {'Reposo', 'Aleteo', 'Planear', 'Picada', 'Golpeado', 'Morir'}

# nombre: (prefijo rig, prefijo contaminación, tri máx, alto mín, alto máx,
#          enverg mín, enverg máx)
SPECS = {
    'ave_gallote.glb': ('FG_AveGallote', 'tijereta_', 760, 0.55, 1.05, 1.15, 1.60),
    'ave_tijereta.glb': ('FG_AveTijereta', 'gallote_', 700, 0.55, 0.95, 1.35, 1.85),
}

total = 0
for nombre, (prefijo, contaminacion, tri_max, hmin, hmax, wmin, wmax) in SPECS.items():
    ruta = os.path.join(ROOT, 'assets', 'models', nombre)
    assert os.path.exists(ruta), f'falta {ruta}: ejecuta ave.py'
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=ruta)
    arm = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is not None]
    assert len(arm) == 1, f'{nombre}: {len(arm)} esqueletos'
    assert len(meshes) == 1 and meshes[0].name == 'Cuerpo', f'{nombre}: falta nodo Cuerpo'
    assert arm[0].name.startswith(prefijo), f'{nombre}: rig {arm[0].name} != {prefijo}'

    huesos = {b.name for b in arm[0].data.bones}
    esperados = {'hips', 'chest', 'neck', 'head', 'tail', 'wingL', 'wingTipL',
                 'wingR', 'wingTipR', 'legL', 'shinL', 'footL', 'legR', 'shinR', 'footR'}
    faltan = esperados - huesos
    assert not faltan, f'{nombre}: huesos ausentes {sorted(faltan)}'

    actions = {a.name for a in bpy.data.actions}
    assert CLIPS <= actions, f'{nombre}: clips ausentes {sorted(CLIPS - actions)}'
    assert not any(a.startswith(contaminacion) for a in actions), \
        f'{nombre}: clips prefijados {sorted(a for a in actions if a.startswith(contaminacion))}'

    tri = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
    assert tri <= tri_max, f'{nombre}: {tri} triángulos (límite {tri_max})'
    coords = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    zmin = min(c.z for c in coords)
    zmax = max(c.z for c in coords)
    ancho = max(c.x for c in coords) - min(c.x for c in coords)
    assert -0.08 <= zmin <= 0.06, f'{nombre}: no apoya en el suelo ({zmin:.3f})'
    assert hmin <= zmax <= hmax, f'{nombre}: alto {zmax:.3f} fuera de [{hmin},{hmax}]'
    assert wmin <= ancho <= wmax, f'{nombre}: ancho {ancho:.3f} fuera de [{wmin},{wmax}]'
    total += tri
    print(f'{nombre} OK: {tri} tri, {len(actions)} clips, alto {zmax:.2f} m, ancho {ancho:.2f} m')

print(f'lote ave válido: {total} triángulos en total')
