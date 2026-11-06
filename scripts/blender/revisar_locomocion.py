# Fotogramas de revisión de los ciclos Caminar y Correr del humanoide.
# blender --background --python scripts/blender/revisar_locomocion.py -- assets/models/personaje.glb work/revision/locomocion
import math
import os
import sys

import bpy
from mathutils import Vector


args = sys.argv[sys.argv.index('--') + 1:]
src, prefix = os.path.abspath(args[0]), os.path.abspath(args[1])
os.makedirs(os.path.dirname(prefix), exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
arm.animation_data_create()
for track in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(track)
for obj in scene.objects:
    if obj.name.startswith('Arma_') or obj.name == 'Escudo':
        obj.hide_render = True

world = bpy.data.worlds.new('revision_locomocion')
world.use_nodes = True
background = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
background.inputs[0].default_value = (0.035, 0.045, 0.055, 1)
background.inputs[1].default_value = 0.65
scene.world = world

sun_data = bpy.data.lights.new('sol', 'SUN')
sun_data.energy = 3.2
sun = bpy.data.objects.new('sol', sun_data)
sun.rotation_euler = (math.radians(48), 0, math.radians(-32))
scene.collection.objects.link(sun)

for engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        pass

camera_data = bpy.data.cameras.new('camara')
camera = bpy.data.objects.new('camara', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
target = Vector((0, 0, 0.86))
camera.location = Vector((0, -3.35, 1.12))
camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.lens = 58

scene.render.resolution_x = 320
scene.render.resolution_y = 420
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'

samples = {
    'Caminar': (1, 5, 9, 13, 17, 21, 25, 29),
    'Correr': (1, 3, 6, 8, 11, 13, 16, 18),
}
for clip, frames in samples.items():
    action = bpy.data.actions.get(clip) or next(a for a in bpy.data.actions if a.name.startswith(clip))
    arm.animation_data.action = action
    if hasattr(arm.animation_data, 'action_slot') and action.slots:
        arm.animation_data.action_slot = action.slots[0]
    for frame in frames:
        scene.frame_set(frame)
        scene.render.filepath = f'{prefix}_{clip.lower()}_{frame:02d}.png'
        bpy.ops.render.render(write_still=True)
        print('locomocion', clip, frame, scene.render.filepath)
