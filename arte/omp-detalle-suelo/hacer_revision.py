# Lamina de revision del GLB exportado de detalle_suelo.
# blender --background --python work/omp-detalle-suelo/hacer_revision.py -- \
#     work/omp-detalle-suelo/detalle_suelo.glb work/omp-detalle-suelo/revision.png
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
    'rama_corta', 'rama_larga', 'rama_bifurcada', 'rama_con_hojas',
    'raices_bajas', 'raices_serpenteantes',
    'hojarasca_redonda', 'hojarasca_alargada', 'hojarasca_dispersa',
    'piedritas_claras', 'piedritas_oscuras', 'piedritas_mixtas',
    'madera_arrastre_corta', 'madera_arrastre_larga',
    'conchas_pequenas', 'conchas_grupo',
    'semillas_caidas', 'hojas_grandes_caidas',
]
objects = []
for name in ORDER:
    obj = scene.objects.get(name)
    assert obj is not None and obj.type == 'MESH', f'falta {name} en el GLB'
    objects.append(obj)

# El detalle es plano: la lamina lo eleva x1.9 para que las siluetas se lean
# en la ortogonal sin fingir volumen que la pieza no tiene.
columns = 6
ELEV = 1.9
tris_total = 0
for index, obj in enumerate(objects):
    world_matrix = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = world_matrix
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    lo = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
    hi = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
    size = hi - lo
    obj.scale *= min(1.0, 1.25 / max(size.x, size.y))
    obj.scale.z *= ELEV
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    lo = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
    hi = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
    center = (lo + hi) * 0.5
    col, row = index % columns, index // columns
    x, base_z = (col - (columns - 1) / 2) * 1.7, 1.6 - row * 1.35
    obj.location += Vector((x - center.x, -center.y, base_z - lo.z))
    tris_total += sum(len(p.vertices) - 2 for p in obj.data.polygons)

    data = bpy.data.curves.new('etiqueta_' + obj.name, 'FONT')
    data.body = obj.name
    data.align_x = 'CENTER'
    data.size = 0.13
    label = bpy.data.objects.new('etiqueta_' + obj.name, data)
    label.location = (x, -0.45, base_z - 0.18)
    label.rotation_euler.x = math.radians(90)
    scene.collection.objects.link(label)

world = bpy.data.worlds.new('revision_detalle')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.12, 0.13, 0.11, 1)  # tierra media: las piezas oscuras se leen
world.node_tree.nodes['Background'].inputs[1].default_value = 0.6
scene.world = world
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 3.5
sun.rotation_euler = (math.radians(43), 0, math.radians(-38))
scene.collection.objects.link(sun)
scene.render.engine = 'BLENDER_EEVEE'
camera = bpy.data.objects.new('camara', bpy.data.cameras.new('camara'))
scene.collection.objects.link(camera)
scene.camera = camera
center = Vector((0, -0.05, 0.35))
camera.location = center + Vector((0, -12, 7))
camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 10.9
scene.render.resolution_x = 1560
scene.render.resolution_y = 1010
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = output
bpy.ops.render.render(write_still=True)
print('catalogo', len(objects), 'nodos,', tris_total, 'triangulos ->', output)
