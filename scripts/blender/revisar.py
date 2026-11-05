# Foto de revisión de un modelo: lo importa, le pone luz y cámara y escribe un PNG.
#   blender --background --python scripts/blender/revisar.py -- assets/models/lancha.glb work/revision/lancha.png [distancia]
import math
import sys
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[0], args[1]
dist = float(args[2]) if len(args) > 2 else 0.0
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=src)
objs = [o for o in scene.objects if o.type == 'MESH']
lo = Vector((min(min((o.matrix_world @ Vector(c)).x for c in o.bound_box) for o in objs), min(min((o.matrix_world @ Vector(c)).y for c in o.bound_box) for o in objs), min(min((o.matrix_world @ Vector(c)).z for c in o.bound_box) for o in objs)))
hi = Vector((max(max((o.matrix_world @ Vector(c)).x for c in o.bound_box) for o in objs), max(max((o.matrix_world @ Vector(c)).y for c in o.bound_box) for o in objs), max(max((o.matrix_world @ Vector(c)).z for c in o.bound_box) for o in objs)))
center = (lo + hi) / 2
size = (hi - lo).length
d = dist or size * 1.4
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
cam.location = center + Vector((d * 0.75, -d * 0.85, d * 0.55))
cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 4
sun.rotation_euler = (math.radians(50), 0, math.radians(30))
scene.collection.objects.link(sun)
world = bpy.data.worlds.new('w')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.7, 0.85, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.8
scene.world = world
try:
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 900, 600
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print('foto', out, 'tamaño', tuple(round(v, 2) for v in (hi - lo)))
