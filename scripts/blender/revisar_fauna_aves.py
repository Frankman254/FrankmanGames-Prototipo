# Lamina de revision de OMP-FA-11 (buho chismoso, quetzal y pavo griton).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/revisar_fauna_aves.py
# Importa cada GLB (el producto real) y monta una cuadricula por ave:
# fila 1: frente / tres cuartos / perfil / detalle de cabeza / dorso.
# Fila 2: tira del paso de Caminar. Escribe work/omp-fa-11/vista_*.png y
# paso_*.png (el mosaico se pega aparte con PIL). El bbox de encuadre es solo
# la malla 'Cuerpo' (con padre): sin padre esta la forma de exhibicion icosfera.
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'work', 'omp-fa-11')
os.makedirs(OUT, exist_ok=True)

# (archivo, clip de paso, centro de cabeza para el detalle, altura del encuadre)
AVES = (
    ('buho_chismoso', 'Caminar', (0, -0.38, 1.08), 0.62),
    ('quetzal', 'Caminar', (0, -0.46, 0.70), 0.50),
    ('pavo_griton', 'Caminar', (0, -0.38, 1.24), 0.70),
)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for e in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try:
        sc.render.engine = e
        break
    except TypeError:
        pass
sc.render.resolution_x = 640
sc.render.resolution_y = 640
sc.render.fps = 30
try:
    sc.eevee.taa_render_samples = 16
except AttributeError:
    pass

world = bpy.data.worlds.new('revision')
world.use_nodes = True
wb = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
wb.inputs[0].default_value = (0.35, 0.36, 0.38, 1)
wb.inputs[1].default_value = 0.6
sc.world = world

for nm, en, rot in (('key', 3.4, (48, 0, -35)), ('rim', 1.7, (60, 0, 150))):
    l = bpy.data.objects.new(nm, bpy.data.lights.new(nm, 'SUN'))
    l.data.energy = en
    l.rotation_euler = tuple(math.radians(a) for a in rot)
    sc.collection.objects.link(l)

cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 60
cam = bpy.data.objects.new('cam', cam_data)
sc.collection.objects.link(cam)
sc.camera = cam


def limpiar():
    for o in list(sc.objects):
        if o.type in ('MESH', 'ARMATURE'):
            bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)


def clip(arm, nombre):
    act = bpy.data.actions.get(nombre)
    ad = arm.animation_data
    ad.action = act
    ad.action_slot = act.slots[0] if act.slots else ad.action_slot
    for t in ad.nla_tracks:
        t.mute = True
    return act.frame_range


for archivo, paso, cabeza, alto_cam in AVES:
    limpiar()
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', f'{archivo}.glb'))
    arm = next(o for o in sc.objects if o.type == 'ARMATURE')
    meshes = [o for o in sc.objects if o.type == 'MESH' and o.parent is not None]

    xs = [(o.matrix_world @ Vector(c)) for o in meshes for c in o.bound_box]
    tgt = Vector((0, 0, alto_cam))
    SIZE = alto_cam * 2

    def encuadre(yaw, dist, elev_deg, target=tgt, size=SIZE):
        d = dist * size
        c = Vector(target)
        cam.location = c + Vector((d * math.sin(yaw), -d * math.cos(yaw), d * math.sin(math.radians(elev_deg))))
        cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()

    sc.frame_set(1)
    vistas = [('frente', 0.0, 1.5, 6), ('tres-cuartos', math.radians(55), 1.5, 10),
              ('perfil', math.pi / 2, 1.5, 5), ('dorso', math.pi, 1.6, 40)]
    for nombre, yaw, dist, elev in vistas:
        encuadre(yaw, dist, elev)
        cam.data.lens = 60
        sc.render.filepath = os.path.join(OUT, f'vista_{nombre}_{archivo}.png')
        bpy.ops.render.render(write_still=True)
        print(f'Saved {nombre} {archivo}')
    # detalle de cabeza: tres cuartos alto
    cam.data.lens = 70
    encuadre(math.radians(35), 1.0, 12, target=Vector(cabeza), size=0.55)
    sc.render.filepath = os.path.join(OUT, f'vista_cara_{archivo}.png')
    bpy.ops.render.render(write_still=True)
    print(f'Saved cara {archivo}')

    f0, f1 = clip(arm, paso)
    span = int(f1 - f0)
    for i in range(5):
        sc.frame_set(int(f0) + round(i * (span - 1) / 4))
        encuadre(math.pi / 2, 1.6, 6)
        sc.render.filepath = os.path.join(OUT, f'paso_{i}_{archivo}.png')
        bpy.ops.render.render(write_still=True)
        print(f'Saved paso {i} {archivo}')

print('listo')
