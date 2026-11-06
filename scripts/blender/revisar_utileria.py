# Lámina de contacto para revisar todos los nodos de utileria.glb.
# blender --background --python scripts/blender/revisar_utileria.py -- assets/models/utileria.glb work/revision/utileria_catalogo.png
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
cell_x, cell_z = 2.7, 2.75
rows = math.ceil(len(objects) / columns)
for index, obj in enumerate(objects):
    col, row = index % columns, index // columns
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    lo = Vector(tuple(min(p[i] for p in corners) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in corners) for i in range(3)))
    size = hi - lo
    scale = min(1.0, 1.75 / max(size.x, size.y, size.z))
    obj.scale *= scale
    x = (col - (columns - 1) / 2) * cell_x
    z = (rows - 1 - row) * cell_z + 0.15
    obj.location = (x, 0, z - lo.z * scale)

    text_data = bpy.data.curves.new(f'etiqueta_{obj.name}', 'FONT')
    text_data.body = obj.name.removeprefix('prop_')
    text_data.align_x = 'CENTER'
    text_data.size = 0.16
    text_data.extrude = 0.002
    label = bpy.data.objects.new(f'etiqueta_{obj.name}', text_data)
    label.location = (x, -0.72, z - 0.18)
    label.rotation_euler.x = math.radians(90)
    scene.collection.objects.link(label)

world = bpy.data.worlds.new('revision_utileria')
world.use_nodes = True
background = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
background.inputs[0].default_value = (0.025, 0.035, 0.045, 1)
background.inputs[1].default_value = 0.65
scene.world = world

sun_data = bpy.data.lights.new('sol', 'SUN')
sun_data.energy = 3.4
sun = bpy.data.objects.new('sol', sun_data)
sun.rotation_euler = (math.radians(42), 0, math.radians(-38))
scene.collection.objects.link(sun)

for engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        pass
camera = bpy.data.objects.new('camara', bpy.data.cameras.new('camara'))
scene.collection.objects.link(camera)
scene.camera = camera
center = Vector((0, -0.1, (rows - 1) * cell_z / 2 + 0.85))
camera.location = center + Vector((0, -24, 0))
camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = max(rows * cell_z + 1.8, columns * cell_x / 1.5 + 1.4)

scene.render.resolution_x = 1800
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = output
bpy.ops.render.render(write_still=True)
print('catalogo', len(objects), output)
