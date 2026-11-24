# Comprueba el contrato de los seis héroes CC0: piezas, clips, shape keys, triángulos, escala y apoyo.
# blender --background --python scripts/blender/validar_heroes_cc0.py
import os
import struct
import json

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
SALIDA = os.path.join(ROOT, 'assets', 'models', 'heroes_cc0')

CLASES = [('centinela', 'h'), ('centinela', 'm'), ('cazador', 'h'), ('cazador', 'm'),
          ('oraculo', 'h'), ('oraculo', 'm')]
CLIPS = {'Reposo', 'Caminar', 'Correr', 'Golpeado', 'Morir', 'Rodar', 'Lanzar', 'Disparar',
         'Atacar', 'Montar', 'Emote_dance', 'Emote_doubt', 'Emote_love', 'Emote_wave',
         'Emote_laugh', 'Emote_cry', 'Emote_angry', 'Emote_sleep'}
PIEZAS_FIJAS = {'Piel', 'Ropa', 'Ojos', 'Cara_0', 'Cara_1', 'Cara_2', 'Cara_3',
                'Pelo_short', 'Pelo_long', 'Pelo_bun',
                'Ceja_natural', 'Ceja_thick', 'Ceja_thin', 'Ceja_arched'}
SHAPE_KEYS = {'cuerpo_robusto', 'cuerpo_delgado'}
ALTO = {'h': 1.75, 'm': 1.65}
TRI_MAX = 12000


def glb_json(path):
    d = open(path, 'rb').read()
    ln = struct.unpack('<I', d[12:16])[0]
    return json.loads(d[20:20 + ln])


fallos = []
for clase, sexo in CLASES:
    suf = '' if sexo == 'h' else '_f'
    nombre = f'{clase}{suf}'
    ruta = os.path.join(SALIDA, nombre + '.glb')
    if not os.path.exists(ruta):
        fallos.append(f'{nombre}: falta el GLB')
        continue
    j = glb_json(ruta)
    anims = {a['name'] for a in j.get('animations', [])}
    if not CLIPS <= anims:
        fallos.append(f'{nombre}: clips ausentes {sorted(CLIPS - anims)}')
    meshes = {m['name']: m for m in j.get('meshes', [])}
    nodos_malla = {n.get('name') for n in j['nodes'] if 'mesh' in n}
    faltan = PIEZAS_FIJAS - nodos_malla
    if faltan:
        fallos.append(f'{nombre}: piezas ausentes {sorted(faltan)}')
    huesos = {n.get('name') for n in j['nodes'] if 'mesh' not in n and 'skin' not in n}
    ancla = 'hips' if 'hips' in huesos else 'pelvis'
    if ancla not in huesos:
        fallos.append(f'{nombre}: sin hueso raíz de cadera ({ancla})')
    # shape keys en piel y ropa (targetNames del glTF)
    for malla in ('Piel', 'Ropa'):
        if malla in meshes:
            tn = meshes[malla].get('extras', {}).get('targetNames', [])
            if not SHAPE_KEYS <= set(tn):
                fallos.append(f'{nombre}: {malla} sin shape keys {sorted(SHAPE_KEYS - set(tn))}')
    materiales = {m['name'] for m in j.get('materials', [])}
    if not any(x.endswith(':eyes') for x in materiales):
        fallos.append(f'{nombre}: sin material de ojos')
    if not any(x.endswith(':skin') for x in materiales):
        fallos.append(f'{nombre}: sin material de piel')

    # presupuesto, altura y apoyo, sobre el glTF cargado.
    # Ojo: el importador de Blender 5.2 añade una `Icosphere` fantasma (no está
    # en el JSON del GLB); se excluye de las medidas.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=ruta)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH'
            and not o.name.startswith('Icosphere')]
    tri = sum(len(p.vertices) - 2 for o in objs for p in o.data.polygons)
    if tri > TRI_MAX:
        fallos.append(f'{nombre}: {tri} triángulos (máx {TRI_MAX})')
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    if arm.animation_data:
        for t in list(arm.animation_data.nla_tracks):
            arm.animation_data.nla_tracks.remove(t)
        arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    zs = []
    for o in objs:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        zs += [(ev.matrix_world @ v.co).z for v in me.vertices]
        ev.to_mesh_clear()
    alto = max(zs)
    base = min(zs)
    if abs(alto - ALTO[sexo]) > 0.05:
        fallos.append(f'{nombre}: altura {alto:.2f} m (esperada {ALTO[sexo]})')
    if base < -0.02:
        fallos.append(f'{nombre}: el origen no está en el suelo (mín z {base:.3f})')
    print(f'{nombre}: {tri} triángulos, alto {alto:.2f} m, base {base:.3f} m, '
          f'{len(anims)} clips, OK' if not any(f.startswith(nombre) for f in fallos)
          else f'{nombre}: FALLOS')

if fallos:
    print('\n'.join(['FALLOS:'] + fallos))
    raise SystemExit(1)
print('VALIDAR-HEROES-CC0: OK (6 héroes)')
