# Fotos de revisión de un personaje con huesos: frente, tres cuartos, espalda y primer
# plano de la cara, en un fotograma de un clip (por defecto el primero de Reposo).
#   blender --background --python scripts/blender/revisar_personaje.py -- assets/models/centinela.glb work/revision/centinela [clip] [fotograma]
# Escribe <prefijo>_frente.png, _tres_cuartos.png, _espalda.png y _cara.png.
import math
import os
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
src, prefix = os.path.abspath(args[0]), os.path.abspath(args[1])
clip = args[2] if len(args) > 2 else 'Reposo'
frame = int(args[3]) if len(args) > 3 else 1
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
act = bpy.data.actions.get(clip) or next(a for a in bpy.data.actions if a.name.startswith(clip))
arm.animation_data_create()
for t in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(t)
arm.animation_data.action = act
if hasattr(arm.animation_data, 'action_slot') and act.slots:
    arm.animation_data.action_slot = act.slots[0]
scene.frame_set(frame)

objs = [o for o in scene.objects if o.type == 'MESH' and o.parent is not None]
dg = bpy.context.evaluated_depsgraph_get()
pts = []
for o in objs:
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    pts += [o.matrix_world @ v.co for v in me.vertices]
    ev.to_mesh_clear()
lo = Vector((min(q.x for q in pts), min(q.y for q in pts), min(q.z for q in pts)))
hi = Vector((max(q.x for q in pts), max(q.y for q in pts), max(q.z for q in pts)))
print('caja', tuple(round(v, 3) for v in lo), tuple(round(v, 3) for v in hi))

sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 3.5
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
scene.collection.objects.link(sun)
world = bpy.data.worlds.new('w')
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs[0].default_value = (0.55, 0.68, 0.82, 1)
bg.inputs[1].default_value = 0.9
scene.world = world
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try:
        scene.render.engine = eng
        break
    except TypeError:
        pass
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
center = Vector((0, 0, (lo.z + hi.z) / 2))
views = [('frente', 0, 3.6, center, 600, 900, 50), ('tres_cuartos', 40, 3.6, center, 600, 900, 50),
         ('espalda', 180, 3.6, center, 600, 900, 50), ('cara', 20, 0.55, Vector((0, 0, 1.53)), 600, 600, 50)]
for name, yaw, dist, target, w, h, lens in views:
    a = math.radians(yaw)
    cam.location = target + Vector((math.sin(a) * dist, -math.cos(a) * dist, 0.15 * dist))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = lens
    scene.render.resolution_x, scene.render.resolution_y = w, h
    scene.render.filepath = f'{prefix}_{name}.png'
    bpy.ops.render.render(write_still=True)
    print('foto', scene.render.filepath)
