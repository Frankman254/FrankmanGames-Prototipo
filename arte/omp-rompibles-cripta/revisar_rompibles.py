# Lamina de revision de los rompibles (Prompt 3, 2026-11-12, publicada).
#   blender --background --python arte/omp-rompibles-cripta/revisar_rompibles.py
# Importa mazmorra.glb PUBLICADO (el GLB viaja SIN materiales, como el contrato
# del juego), tira lo que no es rompiente, les pone los materiales de textura
# desde assets/textures/ y monta dos filas: arriba las cuatro jarras, abajo
# barril, barril bajo, caja y los dos fragmentos; los aros, encima del barril.
# La pastilla de piedra de fondo da escala humana aproximada (jarra 0.76 m).
import math
import os

import bpy
from mathutils import Matrix, Vector

WORK = os.path.normpath(os.path.dirname(bpy.path.abspath(__file__)))
ROOT = os.path.normpath(os.path.join(WORK, '..', '..'))
SOURCE = os.path.join(ROOT, 'assets', 'models', 'mazmorra.glb')
TEXDIR = os.path.join(ROOT, 'assets', 'textures')
OUTPUT = os.path.join(WORK, 'revision.png')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE)
scene = bpy.context.scene

def tex_material(name, png, rough=0.85):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = rough
    tex = m.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(TEXDIR, png))
    m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return m

MAT = {
    'd_jarra': ('Barro', 'barro.png'), 'd_jarra_alta': ('Barro', 'barro.png'),
    'd_jarra_ancha': ('Barro', 'barro.png'), 'd_jarra_agrietada': ('Barro', 'barro.png'),
    'd_cascotes': ('Barro', 'barro.png'),
    'd_barril': ('Duela', 'duela.png'), 'd_barril_bajo': ('Duela', 'duela.png'),
    'd_caja': ('Duela', 'duela.png'), 'd_cascotes_madera': ('Duela', 'duela.png'),
    'd_barril_aros': ('Hierro', None),
}

order = ['d_jarra', 'd_jarra_alta', 'd_jarra_ancha', 'd_jarra_agrietada', 'd_barril',
         'd_barril_bajo', 'd_caja', 'd_cascotes', 'd_cascotes_madera', 'd_barril_aros']
objects = {o.name: o for o in scene.objects if o.type == 'MESH'}
assert all(name in objects for name in order), [n for n in order if n not in objects]
# El GLB publicado trae tambien muros, antorchas y escaleras: fuera todo lo
# que no sea rompiente (incluidos los vacios raiz del importador).
keep = set(order)
for o in list(scene.objects):
    base = o.name.rsplit('.', 1)[0] if o.name[-4] == '.' and o.name[-3:].isdigit() else o.name
    if base not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
objects = {o.name: o for o in scene.objects if o.type == 'MESH'}

# Fila 1: jarras. Fila 2: barriles/caja/fragmentos. En cuadrícula 5 x 2.
for index, name in enumerate(order):
    obj = objects[name]
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = world
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector(tuple(min(p[i] for p in corners) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in corners) for i in range(3)))
    col, row = index % 5, index // 5
    dz = -lo.z
    if name == 'd_barril_aros':
        # Los aros son el segundo material del barril: se muestran montados
        # sobre él (misma celda; su y de juego ya es relativa al suelo).
        col, row = order.index('d_barril') % 5, order.index('d_barril') // 5
        dz = 0.0
    x, y = (col - 2) * 1.15, -row * 2.3
    delta = Vector((x - (lo.x + hi.x) / 2, y - (lo.y + hi.y) / 2, dz))
    # traslacion en MUNDO: algunos nodos importan con rotacion y location
    # local moveria el offset a otro eje (aros "flotando" en la fila 2)
    obj.matrix_world = Matrix.Translation(delta) @ obj.matrix_world
    label = MAT[name]
    m = bpy.data.materials.get(label[0]) or (tex_material(*label) if label[1] else None)
    if m is None:
        m = bpy.data.materials.new('Hierro')
        m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Base Color'].default_value = (0.2, 0.2, 0.22, 1)
        b.inputs['Metallic'].default_value = 0.8
        b.inputs['Roughness'].default_value = 0.4
    obj.data.materials.clear()
    obj.data.materials.append(m)

# Plataforma: piedra clara para que el barro y la madera se lean.
try:
    bpy.ops.mesh.primitive_plane_add(size=14)
except AttributeError:
    bpy.ops.mesh.primitive_plane_generate(size=14)
plate = bpy.context.view_layer.objects.active or next(o for o in scene.objects if o.type == 'MESH' and o.name.startswith(('Plane', 'Cuadrado', 'plano')))
plate.name = 'suelo'
pm = bpy.data.materials.new('Suelo_revision')
pm.use_nodes = True
next(n for n in pm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = (0.42, 0.4, 0.37, 1)
plate.data.materials.append(pm)

world = bpy.data.worlds.new('revision_rompibles')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.52, 0.55, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.55
scene.world = world
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(52), 0, math.radians(-30))
scene.collection.objects.link(sun)

camera = bpy.data.objects.new('camara', bpy.data.cameras.new('camara'))
scene.collection.objects.link(camera)
scene.camera = camera
target = Vector((0, -0.9, 0.35))
camera.location = target + Vector((0, -7.8, 2.6))
camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.lens = 44

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1500
scene.render.resolution_y = 800
scene.render.filepath = OUTPUT
try:
    bpy.ops.render.render(write_still=True)
except Exception:
    engine = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engine else engine[0]
    bpy.ops.render.render(write_still=True)
print('revision escrita:', OUTPUT)
