# Lamina de revision del lote D-17 (ave familiar).
#   "…/Blender" --background --python scripts/blender/revisar_ave.py [gallote|tijereta]
# Importa los GLB de assets/models (prueba del producto real). Para cada
# variante: fila de vistas (reposo frente/tres cuartos/perfil, planeo, alas
# extendidas) y una tira de fotogramas por clip evaluando la accion NLA
# correspondiente. Escribe PNGs en work/omp-d17/.
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'work', 'omp-d17')
os.makedirs(OUT, exist_ok=True)

AVES = {'gallote': 'ave_gallote.glb', 'tijereta': 'ave_tijereta.glb'}
_extra = [a for a in sys.argv if a in AVES]
if _extra:
    AVES = {k: AVES[k] for k in _extra}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
sc = bpy.context.scene
for e in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try:
        sc.render.engine = e
        break
    except TypeError:
        pass
sc.render.resolution_x = 460
sc.render.resolution_y = 460
sc.render.fps = 30  # debe coincidir con el fps de exportacion (fg.fresh_scene);
                    # si no, el importador glTF reescala las claves y las tiras
                    # muestrean fuera del rango real del clip.
try:
    sc.eevee.taa_render_samples = 8
except AttributeError:
    pass

world = bpy.data.worlds.new('revision')
world.use_nodes = True
wb = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
wb.inputs[0].default_value = (0.32, 0.33, 0.35, 1)
wb.inputs[1].default_value = 0.55
sc.world = world

key = bpy.data.objects.new('key', bpy.data.lights.new('key', 'SUN'))
key.data.energy = 3.2
key.rotation_euler = (math.radians(48), 0, math.radians(-35))
rim = bpy.data.objects.new('rim', bpy.data.lights.new('rim', 'SUN'))
rim.data.energy = 1.6
rim.rotation_euler = (math.radians(60), 0, math.radians(150))
for l in (key, rim):
    sc.collection.objects.link(l)

cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 50
cam = bpy.data.objects.new('cam', cam_data)
sc.collection.objects.link(cam)
sc.camera = cam


def limpiar():
    for o in list(sc.objects):
        if o.type in {'MESH', 'ARMATURE'}:
            bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.materials):
        if not m.users:
            bpy.data.materials.remove(m)
    for a in list(bpy.data.actions):
        if not a.users:
            bpy.data.actions.remove(a)


def importar(ruta):
    antes = {o.name for o in sc.objects}
    bpy.ops.import_scene.gltf(filepath=ruta)
    nuevos = [o for o in sc.objects if o.name not in antes]
    return next(o for o in nuevos if o.type == 'ARMATURE')


def encuadrar(arm, yaw, elev=10, extra=0.0):
    zs = [(arm.matrix_world @ o.matrix_world @ Vector(c)).z for o in arm.children if o.type == 'MESH' for c in o.bound_box]
    h = max(zs) - min(zs)
    d = max(2.0, (h + extra) * 2.2)
    tgt = Vector((0, 0, (max(zs) + min(zs)) / 2))
    cam.location = tgt + Vector((d * math.sin(yaw), -d * math.cos(yaw), d * math.sin(math.radians(elev))))
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()


def still(path):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('render', os.path.basename(path), flush=True)


def set_clip(arm, nombre):
    # En Blender 5.x una strip NLA con slot=None no se evalua sola; para las
    # tiras ponemos la accion como activa del armature (el importador glTF crea
    # un action_slot por armadura y las Action de cada clip estan en bpy.data).
    ad = arm.animation_data
    act = bpy.data.actions.get(nombre)
    assert act is not None, f'accion {nombre} ausente'
    ad.action = act
    ad.action_slot = act.slots[0] if act.slots else arm.animation_data.action_slot
    for t in ad.nla_tracks:
        t.mute = True


BUCLES = {'Reposo': 60, 'Aleteo': 32, 'Planear': 48, 'Picada': 30, 'Golpeado': 16, 'Morir': 34}

for k, f in AVES.items():
    ruta = os.path.join(ROOT, 'assets', 'models', f)
    limpiar()
    arm = importar(ruta)
    # --- fila de vistas estaticas (f1 = reposo; luego alas extendidas en Planear) ---
    for vn, yaw in (('frente', 0.0), ('tres', math.radians(35)), ('perfil', math.radians(90))):
        set_clip(arm, 'Reposo')
        sc.frame_set(1)
        bpy.context.view_layer.update()
        encuadrar(arm, yaw)
        still(os.path.join(OUT, f'vista_{k}_{vn}.png'))
    set_clip(arm, 'Planear')
    sc.frame_set(1)
    bpy.context.view_layer.update()
    encuadrar(arm, math.radians(20), elev=38)
    still(os.path.join(OUT, f'vista_{k}_planeo.png'))
    # --- tira de fotogramas por clip (8 pasos del ciclo, camara fija) ---
    for clip, n in BUCLES.items():
        set_clip(arm, clip)
        # la picada cae 0,6 m y la muerte rueda al suelo: encuadre abierto
        extra = 0.7 if clip in ('Picada', 'Morir') else 0.0
        encuadrar(arm, math.radians(30), elev=12, extra=extra)
        sc.render.resolution_x = 240
        sc.render.resolution_y = 240
        for i in range(8):
            sc.frame_set(1 + round(i * n / 8))
            bpy.context.view_layer.update()
            still(os.path.join(OUT, f'tira_{k}_{clip}_{i}.png'))
        sc.render.resolution_x = 460
        sc.render.resolution_y = 460
print('FIN', flush=True)
