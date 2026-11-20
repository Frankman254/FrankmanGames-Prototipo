# Lamina de revision de OMP-FA-01 (cangrejo del manglar).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/revisar_cangrejo.py
# Importa assets/models/cangrejo.glb (el producto real) y monta una cuadrricula:
# fila 1: frente / tres cuartos / perfil / detalle de cara / dorso con abdomen.
# Fila 2: tira del paso de Caminar. Escribe work/omp-fa-01/revision.png.
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'work', 'omp-fa-01')
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
# sobras de la sesion del MCP cuando el revisor corre dentro de Blender vivo
for o in list(bpy.data.objects):
    if o.name.startswith(('Cube', 'Icosphere')) and o.type == 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
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

bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'cangrejo.glb'))
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
meshes = [o for o in sc.objects if o.type == 'MESH']

xs = [(o.matrix_world @ Vector(c)) for o in meshes for c in o.bound_box]
tgt = Vector((sum(p.x for p in xs) / len(xs), sum(p.y for p in xs) / len(xs),
              (max(p.z for p in xs) + min(p.z for p in xs)) / 2))
SIZE = max(max(p.x for p in xs) - min(p.x for p in xs),
           max(p.y for p in xs) - min(p.y for p in xs))


def encuadre(yaw, dist, elev_deg):
    d = dist * SIZE
    cam.location = tgt + Vector((d * math.sin(yaw), -d * math.cos(yaw), d * math.sin(math.radians(elev_deg))))
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()


def clip(nombre):
    act = bpy.data.actions.get(nombre)
    ad = arm.animation_data
    ad.action = act
    ad.action_slot = act.slots[0] if act.slots else ad.action_slot
    for t in ad.nla_tracks:
        t.mute = True


VISTAS = [
    ('frente', 0.0, 1.5, 12),
    ('tres-cuartos', math.radians(35), 1.6, 16),
    ('perfil', math.radians(90), 1.7, 8),
    ('cara', math.radians(20), 0.85, 22),
    ('dorso-abdomen', math.radians(160), 1.7, 38),
]

sc.render.use_border = True
sc.render.use_crop_to_border = False

tiles = []
clip('Reposo')
sc.frame_set(1)
for vn, yaw, dist, elev in VISTAS:
    encuadre(yaw, dist, elev)
    sc.render.filepath = os.path.join(OUT, f'vista_{vn}.png')
    bpy.ops.render.render(write_still=True)
    tiles.append(sc.render.filepath)
    print('render', vn, flush=True)

clip('Caminar')
for i, fr in enumerate((1, 5, 9, 13, 17)):
    sc.frame_set(fr)
    encuadre(math.radians(200), 1.7, 10)
    sc.render.filepath = os.path.join(OUT, f'paso_{i}.png')
    bpy.ops.render.render(write_still=True)
    tiles.append(sc.render.filepath)

# ---- mosaico con PIL si hay; si no, se entregan las piezas sueltas
try:
    from PIL import Image
    cols = 5
    rows = 2
    sheet = Image.new('RGB', (cols * 640, rows * 640), (24, 24, 26))
    for i, t in enumerate(tiles):
        im = Image.open(t).convert('RGB')
        sheet.paste(im, ((i % cols) * 640, (i // cols) * 640))
    sheet.save(os.path.join(OUT, 'revision.png'))
    print('revision.png listo')
except ImportError:
    print('sin PIL: entregar por piezas')
