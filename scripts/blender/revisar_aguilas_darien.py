# Lamina de revision de OMP-FA-21 (aguilas de Dariena).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/revisar_aguilas_darien.py
# Importa cada GLB (el producto real) y monta una cuadricula:
# fila 1: frente / tres cuartos / perfil / detalle de cabeza / dorso.
# Fila 2: tira del ataque (salto con garras) y el morir al final.
# Escribe work/omp-fa-21/vista_*.png y ataque_*.png (el mosaico se pega aparte
# con PIL). El bbox se calcula solo sobre la malla con padre.
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'work', 'omp-fa-21')
os.makedirs(OUT, exist_ok=True)

# archivo, centro de la cabeza para el detalle, ataque a tirar, escala del rostro
AGUILAS = (('aguila_negra', (0, -0.28, 1.06), 'Atacar', 1.0),
           ('aguila_ornada', (0, -0.28, 1.10), 'Atacar', 1.0),
           ('aguila_crestada', (0, -0.58, 2.46), 'Atacar', 2.35))

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
    l.rotation_euler = [math.radians(x) for x in rot]
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


for archivo, cabeza, ataque, escala in AGUILAS:
    limpiar()
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', f'{archivo}.glb'))
    arm = next(o for o in sc.objects if o.type == 'ARMATURE')
    meshes = [o for o in sc.objects if o.type == 'MESH' and o.parent is not None]

    xs = [(o.matrix_world @ Vector(c)) for o in meshes for c in o.bound_box]
    tgt = Vector((sum(p.x for p in xs) / len(xs), sum(p.y for p in xs) / len(xs),
                  (max(p.z for p in xs) + min(p.z for p in xs)) / 2))
    SIZE = max(max(p.x for p in xs) - min(p.x for p in xs),
               max(p.z for p in xs) - min(p.z for p in xs))

    def encuadre(yaw, dist, elev_deg, target=tgt, size=SIZE, altura=None):
        d = dist * size
        z = target.z if altura is None else altura
        c = Vector((target.x, target.y, z))
        cam.location = c + Vector((d * math.sin(yaw), -d * math.cos(yaw), d * math.sin(math.radians(elev_deg))))
        cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()

    sc.frame_set(1)
    vistas = [('frente', 0.0, 1.7, 10), ('tres-cuartos', math.radians(55), 1.7, 14),
              ('perfil', math.pi / 2, 1.7, 10), ('dorso', math.pi, 1.8, 60)]
    for nombre, yaw, dist, elev in vistas:
        encuadre(yaw, dist, elev)
        cam.data.lens = 60
        sc.render.filepath = os.path.join(OUT, f'vista_{nombre}_{archivo}.png')
        bpy.ops.render.render(write_still=True)
        print(f'Saved {nombre} {archivo}')
    # detalle de cabeza: blanco en el craneo, distancia proporcional, tres cuartos
    cam.data.lens = 70
    hc = Vector(cabeza)
    encuadre(math.radians(40), 1.0, 12, target=hc, size=0.60 * escala)
    sc.render.filepath = os.path.join(OUT, f'vista_cara_{archivo}.png')
    bpy.ops.render.render(write_still=True)
    print(f'Saved cara {archivo}')

    f0, f1 = clip(arm, ataque)
    span = int(f1 - f0)
    for i in range(5):
        sc.frame_set(int(f0) + round(i * (span - 1) / 4))
        encuadre(math.radians(65), 1.9, 12)
        cam.data.lens = 60
        sc.render.filepath = os.path.join(OUT, f'ataque_{i}_{archivo}.png')
        bpy.ops.render.render(write_still=True)
        print(f'Saved ataque {i} {archivo}')
    f0, f1 = clip(arm, 'Morir')
    for i in range(3):
        sc.frame_set(int(f0) + round(i * (f1 - f0) / 2))
        encuadre(math.radians(65), 1.9, 12)
        sc.render.filepath = os.path.join(OUT, f'morir_{i}_{archivo}.png')
        bpy.ops.render.render(write_still=True)
        print(f'Saved morir {i} {archivo}')

print('lamina de aguilas lista')
