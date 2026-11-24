# Capa (salvo el carcaj del cazador) y pelo de los seis héroes anime con cadenas de huesos con retraso (fg_telas.py).
# Etapa de post-proceso, como cazador_anime_fix.py: carga el GLB publicado, añade las cadenas,
# reparte los pesos de `Capa` y de la parte de atrás de `Pelo_long`, hornea el retraso en cada
# clip y reexporta. Es idempotente: si el GLB ya tiene huesos `tela_*`, se quitan antes.
#
#   blender --background --factory-startup --python scripts/blender/telas_heroes.py -- \
#       assets/models/cazador_anime.glb assets/models/cazador_anime.glb [--lamina work/claude-telas]
#
# --lamina escribe fotos de perfil y espalda de Caminar y Correr (antes de exportar).
import math
import os
import sys

import bpy
from mathutils import Vector

try:
    _HERE = os.path.dirname(bpy.path.abspath(__file__))
except NameError:
    _HERE = os.path.join(os.getcwd(), 'scripts', 'blender')
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import fg_telas as T

# Bucles y la velocidad a la que avanzan en el juego (m/s): marca el aire.
BUCLES = {'Reposo': 0.0, 'Caminar': 1.2, 'Correr': 3.0}


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def puntos(obj, arm):
    m = arm.matrix_world.inverted() @ obj.matrix_world
    return [m @ v.co for v in obj.data.vertices]


def quitar_telas(arm):
    """Deja el armazón y las mallas como venían del generador (sin `tela_*`)."""
    viejos = [b.name for b in arm.data.bones if b.name.startswith(T.PREFIJO)]
    if not viejos:
        return
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        for g in [g for g in o.vertex_groups if g.name.startswith(T.PREFIJO)]:
            # Devuelve el peso al ancla (pecho o cabeza) antes de borrar el grupo.
            ancla = o.vertex_groups.get('chest' if 'capa' in g.name else 'head')
            for v in o.data.vertices:
                for e in v.groups:
                    if e.group == g.index and e.weight > 0 and ancla:
                        ancla.add([v.index], e.weight, 'ADD')
            o.vertex_groups.remove(g)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for n in viejos:
        arm.data.edit_bones.remove(arm.data.edit_bones[n])
    bpy.ops.object.mode_set(mode='OBJECT')


def cadena_capa(arm, capa):
    ps = puntos(capa, arm)
    ztop = max(p.z for p in ps)
    zbot = min(p.z for p in ps)
    alto = ztop - zbot
    banda = lambda a, b: [p for p in ps if a <= (ztop - p.z) / alto <= b]
    y_arriba = sum(p.y for p in banda(0.0, 0.15)) / max(1, len(banda(0.0, 0.15)))
    y_abajo = sum(p.y for p in banda(0.85, 1.0)) / max(1, len(banda(0.85, 1.0)))
    cab = Vector((0.0, y_arriba, ztop - alto * 0.12))
    pun = Vector((0.0, y_abajo, zbot))
    pecho_y = arm.data.bones['chest'].head_local.y
    c = T.Cadena('capa', 'chest', 3, cab, pun, colgar=0.35, aire_deg=(0.0, 8.0, 20.0), max_deg=40.0,
                 hacia_cuerpo_deg=1.0, vaiven=1.0)
    # Pegada a los hombros arriba; por delante del pecho (broches) no se mueve.
    peso = lambda p: smooth(0.10, 0.32, (ztop - p.z) / alto) * smooth(pecho_y + 0.02, pecho_y + 0.08, p.y)
    return c, peso


def cadena_pelo(arm, pelo):
    ps = puntos(pelo, arm)
    cabeza = arm.data.bones['head']
    hz, hy = cabeza.head_local.z, cabeza.head_local.y
    zmin = min(p.z for p in ps)
    z0 = hz + 0.13                         # por encima de la oreja el pelo va pegado al cráneo
    atras = [p for p in ps if p.y > hy + 0.06 and p.z < z0]
    if len(atras) < 20:
        return None, None
    y_cab = sum(p.y for p in atras if p.z > z0 - 0.04) / max(1, len([p for p in atras if p.z > z0 - 0.04]))
    y_pun = sum(p.y for p in atras if p.z < zmin + 0.04) / max(1, len([p for p in atras if p.z < zmin + 0.04]))
    c = T.Cadena('pelo', 'head', 2, Vector((0.0, y_cab, z0)), Vector((0.0, y_pun, zmin)), colgar=0.2,
                 aire_deg=(0.0, 5.0, 12.0), max_deg=22.0, hacia_cuerpo_deg=0.5, vaiven=0.7)
    peso = lambda p: smooth(z0, z0 - 0.07, p.z) * smooth(hy + 0.03, hy + 0.09, p.y)
    return c, peso


def lamina(arm, carpeta, nombre, etiqueta):
    """Perfil y espalda en tres momentos de Caminar y Correr (Workbench, rápido)."""
    sc = bpy.context.scene
    os.makedirs(carpeta, exist_ok=True)
    for o in sc.objects:
        if o.type == 'MESH':
            visible = o.parent == arm and o.name in ('Calzado', 'Capa', 'Cara_0', 'Ojos', 'Pelo_long', 'Piel',
                                                     'Ropa', 'Ropa2', 'Traje', 'Banda')
            o.hide_render = not visible
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'TEXTURE'
    sc.render.resolution_x, sc.render.resolution_y = 360, 480
    sc.render.film_transparent = False
    cam = bpy.data.objects.get('cam_lamina') or bpy.data.objects.new('cam_lamina', bpy.data.cameras.new('cam_lamina'))
    if cam.name not in sc.collection.objects:
        sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 2.0
    sc.camera = cam
    ad = arm.animation_data
    salidas = []
    for clip in ('Caminar', 'Correr'):
        act = bpy.data.actions.get(clip)
        if not act:
            continue
        for t in ad.nla_tracks:
            t.mute = True
        ad.action = act
        if hasattr(ad, 'action_slot') and act.slots:
            ad.action_slot = act.slots[0]
        f0, f1 = act.frame_range
        for k, frac in enumerate((0.0, 0.25, 0.5, 0.75)):
            sc.frame_set(int(round(f0 + (f1 - f0) * frac)))
            for vista, pos in (('perfil', Vector((4, 0, 1.0))), ('espalda', Vector((1.6, 3.6, 1.2)))):
                cam.location = pos
                cam.rotation_euler = (Vector((0, 0, 1.0)) - pos).to_track_quat('-Z', 'Y').to_euler()
                out = os.path.join(carpeta, f'{nombre}_{etiqueta}_{clip}_{vista}_{k}.png')
                sc.render.filepath = out
                bpy.ops.render.render(write_still=True)
                salidas.append(out)
    ad.action = None
    for t in ad.nla_tracks:
        t.mute = False
    return salidas


def procesar(src, dst, carpeta=None):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=src)
    arm = next(o for o in sc.objects if o.type == 'ARMATURE')
    nombre = os.path.basename(src).rsplit('.', 1)[0]
    vivos = [t.name for t in arm.animation_data.nla_tracks]
    if carpeta:
        lamina(arm, carpeta, nombre, 'antes')
    quitar_telas(arm)
    cadenas, pesos = [], []
    capa = bpy.data.objects.get('Capa')
    # En el cazador `Capa` es el carcaj: pieza rígida, va con el pecho.
    if capa and capa.parent == arm and not nombre.startswith('cazador'):
        c, w = cadena_capa(arm, capa)
        cadenas.append(c)
        pesos.append((capa, c, w))
    pelo = bpy.data.objects.get('Pelo_long')
    if pelo and pelo.parent == arm:
        c, w = cadena_pelo(arm, pelo)
        if c:
            cadenas.append(c)
            pesos.append((pelo, c, w))
    T.crear_huesos(arm, cadenas)
    for obj, c, w in pesos:
        T.pesar(obj, arm, c, w)
    acciones = [bpy.data.actions[n] for n in vivos if n in bpy.data.actions]
    informe = T.hornear(arm, cadenas, acciones, BUCLES)
    # Pistas NLA limpias: una por clip vivo, con su acción (como cazador_anime_fix.py).
    arm.animation_data_clear()
    ad = arm.animation_data_create()
    for n in vivos:
        act = bpy.data.actions[n]
        act.use_fake_user = True
        tr = ad.nla_tracks.new()
        tr.name = n
        tr.strips.new(n, int(round(act.frame_range[0])), act)
    if carpeta:
        lamina(arm, carpeta, nombre, 'despues')
    for o in list(sc.objects):
        if o.type not in ('ARMATURE', 'MESH') or (o.type == 'MESH' and o.parent != arm) \
                or any('not_exported' in c.name for c in o.users_collection):
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        o.hide_set(False)
        o.hide_render = False
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=True,
                              export_animations=True, export_animation_mode='NLA_TRACKS',
                              export_skins=True, export_yup=True, export_apply=False,
                              export_materials='EXPORT', use_active_scene=True)
    return {'cadenas': [c.huesos() for c in cadenas], 'giro_max_grados': informe}


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    carpeta = argv[argv.index('--lamina') + 1] if '--lamina' in argv else None
    print('TELAS', procesar(argv[0], argv[1], carpeta))
