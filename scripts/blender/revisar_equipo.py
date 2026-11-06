# Catálogo frontal de todos los nodos de assets/models/equipo.glb.
# blender --background --python scripts/blender/revisar_equipo.py -- assets/models/equipo.glb work/revision/equipo_catalogo.png
import math
import os
import sys

import bpy
from mathutils import Vector


args = sys.argv[sys.argv.index('--') + 1:]
src, output = os.path.abspath(args[0]), os.path.abspath(args[1])
os.makedirs(os.path.dirname(output), exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=src)
objects = sorted((obj for obj in scene.objects if obj.type == 'MESH'), key=lambda obj: obj.name)

columns = 6
x_step, z_step = 1.65, 2.25
rows = math.ceil(len(objects) / columns)
for index, obj in enumerate(objects):
    col, row = index % columns, index // columns
    x = (col - (columns - 1) / 2) * x_step
    z = (rows - 1 - row) * z_step + 0.55
    obj.location = (x, 0, z)

    text_data = bpy.data.curves.new(f'etiqueta_{obj.name}', 'FONT')
    text_data.body = obj.name.removeprefix('obj_')
    text_data.align_x = 'CENTER'
    text_data.size = 0.115
    text_data.extrude = 0.002
    label = bpy.data.objects.new(f'etiqueta_{obj.name}', text_data)
    label.location = (x, -0.03, z - 0.90)
    label.rotation_euler.x = math.radians(90)
    scene.collection.objects.link(label)

world = bpy.data.worlds.new('revision_equipo')
world.use_nodes = True
background = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
background.inputs[0].default_value = (0.018, 0.024, 0.032, 1)
background.inputs[1].default_value = 0.55
scene.world = world

sun_data = bpy.data.lights.new('sol', 'SUN')
sun_data.energy = 3.3
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
center = Vector((0, 0, (rows - 1) * z_step / 2 + 0.20))
camera.location = center + Vector((0, -20, 0))
camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = rows * z_step + 0.5

scene.render.resolution_x = 1800
scene.render.resolution_y = 1800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = output
bpy.ops.render.render(write_still=True)
print('catalogo', len(objects), output)
