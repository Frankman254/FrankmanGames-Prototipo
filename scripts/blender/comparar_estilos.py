# Renderiza el mismo rincón del mundo con dos tratamientos visuales comparables.
# blender --background --python scripts/blender/comparar_estilos.py
import math
import os

import bpy
from mathutils import Vector


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
SOURCE = os.path.join(ROOT, 'assets', 'models', 'utileria.glb')
OUTPUT = os.path.join(ROOT, 'docs', 'capturas', 'estilo')
os.makedirs(OUTPUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE)
scene = bpy.context.scene

placements = {
    'prop_rancho_paja': ((0.3, 2.1, 0), 0),
    'prop_carreta': ((-2.35, -0.15, 0), math.radians(-24)),
    'prop_fogata': ((1.7, -1.15, 0), 0),
    'prop_banco': ((0.55, 0.25, 0), math.radians(12)),
    'prop_tinaja_alta': ((-0.8, 0.85, 0), 0),
    'prop_farol_poste': ((3.1, 0.6, 0), 0),
    'prop_poste_camino': ((-3.35, 2.25, 0), math.radians(-14)),
    'prop_cerca': ((2.75, 3.5, 0), math.radians(6)),
    'prop_cajon': ((-1.05, 1.95, 0), math.radians(18)),
}
for obj in list(scene.objects):
    if obj.type == 'MESH' and obj.name not in placements:
        bpy.data.objects.remove(obj, do_unlink=True)
for name, (location, rotation) in placements.items():
    obj = scene.objects[name]
    obj.location = location
    obj.rotation_euler.z = rotation

# Terreno y camino: geometría idéntica en ambos renders.
ground_mat = bpy.data.materials.new('comparacion_suelo')
ground_mat.use_nodes = True
ground_bsdf = next(node for node in ground_mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
ground_bsdf.inputs['Base Color'].default_value = (0.13, 0.24, 0.075, 1)
ground_bsdf.inputs['Roughness'].default_value = 0.96
bpy.ops.mesh.primitive_plane_add(size=18, location=(0, 1.3, -0.015))
ground = bpy.context.object
ground.name = 'suelo_comparacion'
ground.data.materials.append(ground_mat)

path_mat = bpy.data.materials.new('comparacion_camino')
path_mat.use_nodes = True
path_bsdf = next(node for node in path_mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
path_bsdf.inputs['Base Color'].default_value = (0.43, 0.25, 0.105, 1)
path_bsdf.inputs['Roughness'].default_value = 0.98
bpy.ops.mesh.primitive_cube_add(location=(-0.6, -1.1, 0.015), scale=(4.8, 1.15, 0.025))
path = bpy.context.object
path.name = 'camino_comparacion'
path.rotation_euler.z = math.radians(-10)
path.data.materials.append(path_mat)

# Hierbas en siluetas simples; dan escala y rompen el borde del camino.
grass_mat = bpy.data.materials.new('comparacion_hierba')
grass_mat.use_nodes = True
grass_bsdf = next(node for node in grass_mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
grass_bsdf.inputs['Base Color'].default_value = (0.09, 0.30, 0.07, 1)
grass_bsdf.inputs['Roughness'].default_value = 1.0
for i in range(42):
    x = -4.3 + (i * 1.73) % 8.6
    y = -2.2 + (i * 2.37) % 7.2
    if abs(y + 1.1 + x * 0.18) < 1.05:
        continue
    height = 0.12 + (i % 5) * 0.035
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.07, radius2=0.0, depth=height, location=(x, y, height / 2))
    blade = bpy.context.object
    blade.data.materials.append(grass_mat)

world = bpy.data.worlds.new('mundo_comparacion')
world.use_nodes = True
scene.world = world
background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')

sun_data = bpy.data.lights.new('sol', 'SUN')
sun = bpy.data.objects.new('sol', sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(48), 0, math.radians(-38))

fill_data = bpy.data.lights.new('relleno', 'AREA')
fill = bpy.data.objects.new('relleno', fill_data)
scene.collection.objects.link(fill)
fill.location = (-4, -4, 6)
fill.rotation_euler = (math.radians(22), 0, math.radians(-25))
fill_data.shape = 'DISK'
fill_data.size = 5.5

camera = bpy.data.objects.new('camara', bpy.data.cameras.new('camara'))
scene.collection.objects.link(camera)
scene.camera = camera
camera.location = (8.4, -11.8, 7.1)
target = Vector((0, 0.85, 1.05))
camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.lens = 54

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False

originals = {}
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    bsdf = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        originals[material.name] = (
            tuple(bsdf.inputs['Base Color'].default_value),
            bsdf.inputs['Roughness'].default_value,
            bsdf.inputs['Metallic'].default_value,
        )


def set_color_management(transform, look):
    scene.view_settings.look = 'None'
    scene.view_settings.view_transform = transform
    if look in {item.name for item in bpy.types.ColorManagedViewSettings.bl_rna.properties['look'].enum_items}:
        scene.view_settings.look = look


def render_stylized():
    background.inputs[0].default_value = (0.20, 0.43, 0.66, 1)
    background.inputs[1].default_value = 0.72
    sun_data.energy = 4.0
    sun_data.angle = math.radians(4)
    fill_data.energy = 480
    fill_data.color = (0.48, 0.70, 1.0)
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        bsdf = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf or material.name not in originals:
            continue
        base = originals[material.name][0]
        peak = max(base[:3])
        saturated = tuple(min(1.0, 0.5 + (channel - 0.5) * 1.28 + peak * 0.08) for channel in base[:3])
        bsdf.inputs['Base Color'].default_value = (*saturated, base[3])
        bsdf.inputs['Roughness'].default_value = 0.88
        bsdf.inputs['Metallic'].default_value = 0.0
    scene.render.use_freestyle = True
    scene.render.line_thickness = 1.05
    set_color_management('Standard', 'Medium High Contrast')
    scene.view_settings.exposure = 0.15
    scene.view_settings.gamma = 1.0
    scene.render.filepath = os.path.join(OUTPUT, 'mismo_lugar_cel.png')
    bpy.ops.render.render(write_still=True)


def render_grounded():
    scene.render.use_freestyle = False
    background.inputs[0].default_value = (0.075, 0.13, 0.20, 1)
    background.inputs[1].default_value = 0.36
    sun_data.energy = 2.55
    sun_data.angle = math.radians(8)
    sun_data.color = (1.0, 0.63, 0.38)
    fill_data.energy = 900
    fill_data.color = (0.28, 0.48, 0.72)
    for material in bpy.data.materials:
        if not material.use_nodes or material.name not in originals:
            continue
        bsdf = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue
        base, rough, metallic = originals[material.name]
        muted = tuple(channel * 0.78 + 0.07 for channel in base[:3])
        bsdf.inputs['Base Color'].default_value = (*muted, base[3])
        bsdf.inputs['Roughness'].default_value = max(0.42, rough * 0.90)
        bsdf.inputs['Metallic'].default_value = metallic
    for obj in scene.objects:
        if obj.type != 'MESH' or obj.name.startswith(('suelo_', 'camino_', 'Cone')):
            continue
        bevel = obj.modifiers.new('bordes_naturalistas', 'BEVEL')
        bevel.width = 0.012
        bevel.segments = 2
        bevel.limit_method = 'ANGLE'
    set_color_management('AgX', 'Medium High Contrast')
    scene.view_settings.exposure = 0.35
    scene.view_settings.gamma = 0.96
    scene.render.filepath = os.path.join(OUTPUT, 'mismo_lugar_naturalista.png')
    bpy.ops.render.render(write_still=True)


render_stylized()
render_grounded()
print('comparacion escrita en', OUTPUT)
