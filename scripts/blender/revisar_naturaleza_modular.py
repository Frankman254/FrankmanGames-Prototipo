# Lámina de revisión de naturaleza_modular.glb.
# blender --background --python scripts/blender/revisar_naturaleza_modular.py -- assets/models/naturaleza_modular.glb work/revision/naturaleza_modular.png
import math
import os
import sys

import bpy
from mathutils import Vector


args = sys.argv[sys.argv.index('--') + 1:]
source, output = os.path.abspath(args[0]), os.path.abspath(args[1])
os.makedirs(os.path.dirname(output), exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
scene = bpy.context.scene
objects = sorted((obj for obj in scene.objects if obj.type == 'MESH'), key=lambda obj: obj.name)

columns = 4
for index, obj in enumerate(objects):
    world_matrix = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = world_matrix
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    lo = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
    hi = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
    size = hi - lo
    obj.scale *= min(1.0, 1.75 / max(size.x, size.y, size.z))
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    lo = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
    hi = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
    center = (lo + hi) * 0.5
    col, row = index % columns, index // columns
    x, base_z = (col - 1.5) * 2.7, 2.0 - row * 2.45
    obj.location += Vector((x - center.x, -center.y, base_z - lo.z))

    data = bpy.data.curves.new('etiqueta_' + obj.name, 'FONT')
    data.body = obj.name.removeprefix('natural_')
    data.align_x = 'CENTER'
    data.size = 0.15
    label = bpy.data.objects.new('etiqueta_' + obj.name, data)
    label.location = (x, -0.65, base_z - 0.24)
    label.rotation_euler.x = math.radians(90)
    scene.collection.objects.link(label)

world = bpy.data.worlds.new('revision_naturaleza')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.025, 0.035, 0.045, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.7
scene.world = world
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 3.5
sun.rotation_euler = (math.radians(43), 0, math.radians(-38))
scene.collection.objects.link(sun)
scene.render.engine = 'BLENDER_EEVEE'
camera = bpy.data.objects.new('camara', bpy.data.cameras.new('camara'))
scene.collection.objects.link(camera)
scene.camera = camera
center = Vector((0, -0.1, 0.25))
camera.location = center + Vector((0, -20, 0))
camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 11.5
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = output
bpy.ops.render.render(write_still=True)
print('catalogo', len(objects), output)
