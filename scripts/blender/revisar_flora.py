# Foto de revisión de la flora: pone en fila las especies pedidas, con sus colores del juego.
#   blender --background --python scripts/blender/revisar_flora.py -- <vegetacion.glb> <salida.png> especie:color_tronco:color_copa ...
import math
import sys
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
src, out, specs = args[0], args[1], args[2:]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=src)


def mat(rgb):
    m = bpy.data.materials.new('m')
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = 0.9
    return m


keep = []
x = 0.0
for spec in specs:
    parts = spec.split(':')
    name, colors = parts[0], [tuple(float(c) for c in p.split(',')) for p in parts[1:]]
    objs = sorted([o for o in scene.objects if o.type == 'MESH' and o.name.startswith(f'v_{name}_')], key=lambda o: o.name)
    width = max((max(abs(v.co.x) for v in o.data.vertices) for o in objs), default=1)
    x += width + 1.5
    for o, c in zip(objs, colors):
        o.location.x += x
        o.data.materials.clear()
        o.data.materials.append(mat(c))
        keep.append(o)
    x += width + 1.5
for o in list(scene.objects):
    if o.type == 'MESH' and o not in keep:
        bpy.data.objects.remove(o)
ground = bpy.data.objects.new('suelo', bpy.data.meshes.new('suelo'))
ground.data.from_pydata([(-5, -20, 0), (x + 5, -20, 0), (x + 5, 20, 0), (-5, 20, 0)], [], [(0, 1, 2, 3)])
ground.data.materials.append(mat((0.55, 0.52, 0.3)))
scene.collection.objects.link(ground)
center = Vector((x / 2, 0, 9))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
cam.location = center + Vector((0, -x * 1.25, 10))
cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 4
sun.rotation_euler = (math.radians(45), 0, math.radians(35))
scene.collection.objects.link(sun)
world = bpy.data.worlds.new('w')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.6, 0.75, 0.9, 1)
scene.world = world
try:
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 1200, 600
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print('foto', out)
