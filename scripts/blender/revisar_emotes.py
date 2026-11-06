# Hoja de revisión reproducible para los ocho emotes del rig humanoide.
# blender --background --python scripts/blender/revisar_emotes.py -- assets/models/personaje.glb work/revision/emotes
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

world = bpy.data.worlds.new('revision_emotes')
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs[0].default_value = (0.035, 0.045, 0.055, 1)
bg.inputs[1].default_value = 0.65
scene.world = world

sun_data = bpy.data.lights.new('sol', 'SUN')
sun_data.energy = 3.2
sun = bpy.data.objects.new('sol', sun_data)
sun.rotation_euler = (math.radians(48), 0, math.radians(-32))
scene.collection.objects.link(sun)

fill_data = bpy.data.lights.new('relleno', 'AREA')
fill_data.energy = 260
fill_data.shape = 'DISK'
fill_data.size = 2.5
fill = bpy.data.objects.new('relleno', fill_data)
fill.location = (-2.2, -2.4, 2.8)
scene.collection.objects.link(fill)

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

scene.render.resolution_x = 360
scene.render.resolution_y = 480
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'

frames = {
    'wave': 20,
    'laugh': 14,
    'dance': 16,
    'cry': 22,
    'angry': 13,
    'love': 26,
    'sleep': 34,
    'doubt': 22,
}
for name, frame in frames.items():
    action_name = f'Emote_{name}'
    action = bpy.data.actions.get(action_name) or next(
        action for action in bpy.data.actions if action.name.startswith(action_name)
    )
    arm.animation_data.action = action
    if hasattr(arm.animation_data, 'action_slot') and action.slots:
        arm.animation_data.action_slot = action.slots[0]
    scene.frame_set(frame)
    scene.render.filepath = f'{prefix}_{name}.png'
    bpy.ops.render.render(write_still=True)
    print('emote', name, 'frame', frame, scene.render.filepath)
