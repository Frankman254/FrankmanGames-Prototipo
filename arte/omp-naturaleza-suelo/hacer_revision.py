# Lamina de revision del GLB exportado de naturaleza_suelo.
# blender --background --python work/omp-naturaleza-suelo/hacer_revision.py -- \
#     work/omp-naturaleza-suelo/naturaleza_suelo.glb work/omp-naturaleza-suelo/revision.png
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
ORDER = [
    'roca_redonda_pequena', 'roca_redonda_mediana', 'roca_redonda_grande',
    'roca_puntiaguda_pequena', 'roca_puntiaguda_mediana', 'roca_puntiaguda_grande',
    'roca_plana_pequena', 'roca_plana_mediana', 'roca_plana_grande',
    'roca_partida', 'roca_musgosa', 'grupo_rocas_bajo',
    'tronco_recto', 'tronco_curvo', 'tronco_hueco', 'tronco_musgoso',
    'tocon_bajo', 'tocon_raices',
]
objects = []
for name in ORDER:
    obj = scene.objects.get(name)
    assert obj is not None and obj.type == 'MESH', f'falta {name} en el GLB'
    objects.append(obj)
assert len(scene.objects) >= len(ORDER)

columns = 6
tris_total = 0
for index, obj in enumerate(objects):
    world_matrix = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = world_matrix
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    lo = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
    hi = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
    size = hi - lo
    obj.scale *= min(1.0, 1.55 / max(size.x, size.y, size.z))
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    lo = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
    hi = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
    center = (lo + hi) * 0.5
    col, row = index % columns, index // columns
    x, base_z = (col - (columns - 1) / 2) * 3.0, 2.6 - row * 2.3
    obj.location += Vector((x - center.x, -center.y, base_z - lo.z))
    tris_total += sum(len(p.vertices) - 2 for p in obj.data.polygons)

    data = bpy.data.curves.new('etiqueta_' + obj.name, 'FONT')
    data.body = obj.name
    data.align_x = 'CENTER'
    data.size = 0.16
    label = bpy.data.objects.new('etiqueta_' + obj.name, data)
    label.location = (x, -0.62, base_z - 0.26)
    label.rotation_euler.x = math.radians(90)
    scene.collection.objects.link(label)

world = bpy.data.worlds.new('revision_suelo')
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
center = Vector((0, -0.1, 0.4))
camera.location = center + Vector((0, -19, 11))
camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 19.5
scene.render.resolution_x = 1560
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = output
bpy.ops.render.render(write_still=True)
print('catalogo', len(objects), 'nodos,', tris_total, 'triangulos ->', output)
