# Lamina de revision de mazmorra_corregida.glb: sala de prueba con los
# materiales que aplica src/render/dungeonView.ts y cuatro camaras.
#   blender --background --python arte/omp-cripta-geometria/revisar_mazmorra.py -- \
#       arte/omp-cripta-geometria/mazmorra_corregida.glb arte/omp-cripta-geometria/vistas
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index('--') + 1:]
src = os.path.abspath(args[0]) if args else os.path.join(HERE, 'mazmorra_corregida.glb')
out_dir = os.path.abspath(args[1]) if len(args) > 1 else os.path.join(HERE, 'vistas')
os.makedirs(out_dir, exist_ok=True)
TEX = os.path.join(HERE, 'texturas')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
scene = bpy.context.scene
by = {o.name: o for o in scene.objects if o.type == 'MESH'}


def img(name):
    key = 'tex_' + name
    im = bpy.data.images.get(key)
    if not im:
        im = bpy.data.images.load(os.path.join(TEX, name + '.png'))
        im.name = key
    return im


def solid(name, rgb, emit=None, strength=0.0, metallic=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = 0.9
    bsdf.inputs['Metallic'].default_value = metallic
    if emit:
        bsdf.inputs['Emission Color'].default_value = (*emit, 1)
        bsdf.inputs['Emission Strength'].default_value = strength
    return m


def textured(name, image, tint):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = image
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.95
    bsdf.inputs['Base Color'].default_value = (*tint, 1)
    return m


MURO, BALDOSA = img('muro'), img('baldosa')
m_wall = textured('rev_wall', MURO, (0.55, 0.54, 0.56))
m_floor = textured('rev_floor', BALDOSA, (1, 1, 1))
m_dark = solid('rev_dark', (0.04, 0.04, 0.05))
m_void = solid('rev_void', (0.01, 0.01, 0.015))
m_flame = solid('rev_flame', (1, 0.6, 0.2), emit=(1, 0.55, 0.15), strength=4)
m_rune = solid('rev_rune', (0.4, 0.65, 1), emit=(0.35, 0.6, 1), strength=2.5)
m_iron = solid('rev_iron', (0.2, 0.15, 0.1), metallic=0.5)
m_wood = solid('rev_wood', (0.46, 0.3, 0.17))
m_clay = solid('rev_clay', (0.62, 0.36, 0.22))
m_mound = solid('rev_mound', (0.3, 0.33, 0.24))
assign = {'d_muro': m_wall, 'd_subida': m_wall, 'd_bajada': m_wall, 'd_entrada': m_wall,
          'd_puerta_poste': m_wall, 'd_puerta_dintel': m_wall, 'd_estanque_piedra': m_wall,
          'd_baldosa': m_floor, 'd_remate': m_dark, 'd_boca': m_void,
          'd_entrada_boca': m_void, 'd_llama': m_flame, 'd_anillo': m_rune,
          'd_entrada_runa': m_rune, 'd_antorcha': m_iron, 'd_barril': m_wood,
          'd_puerta_hoja': m_wood, 'd_jarra': m_clay, 'd_cascotes': m_clay,
          'd_barril_aros': m_iron, 'd_entrada_monticulo': m_mound}
for n, mat in assign.items():
    o = by.get(n.split('.')[0]) or by.get(n)
    if o:
        o.data.materials.clear()
        o.data.materials.append(mat)

# Reubica para la sala de prueba (el GLB tiene cada nodo en su origen).
T = 1.5
by['d_muro'].location = (T * 1.5, 0, 0)          # dos muros contiguos: junta
by['d_remate'].location = (T * 1.5, 0, 3.21)
muro2 = by['d_muro'].copy(); by['d_muro'].parent = None
scene.collection.objects.link(muro2)
muro2.location = (T * 2.5, 0, 0)
muro2.data = by['d_muro'].data
remate2 = by['d_remate'].copy(); scene.collection.objects.link(remate2)
remate2.location = (T * 2.5, 0, 3.21)
remate2.data = by['d_remate'].data
# esquina: dos muros perpendiculares
esq = muro2.copy(); scene.collection.objects.link(esq)
esq.location = (T * 3.5, T, 0)
esq.rotation_euler.z = math.radians(90)
esqr = remate2.copy(); scene.collection.objects.link(esqr)
esqr.location = (T * 3.5, T, 3.21)
esqr.rotation_euler.z = math.radians(90)

for k in range(6):
    t = by['d_baldosa'].copy()
    scene.collection.objects.link(t)
    t.location = (T * (k % 4) + 0.75, T * (k // 4) + 0.75, 0)
    if k >= 4:
        t.location.x = T * (2 + (k - 4)) + 0.75
        t.location.y = T * 1 + 0.75
bal0 = by['d_baldosa']; bal0.location = (0.75, 0.75, 0)

by['d_subida'].location = (T * 0.5, T * 2.5, 0)
by['d_bajada'].location = (T * 2.5, T * 2.5, 0)
by['d_boca'].location = (T * 2.5, T * 2.5, 0.02)
by['d_anillo'].location = (T * 0.5, T * 2.5, 0.04)
by['d_antorcha'].location = (T * 1.5, 0.87, 2.0)
by['d_llama'].location = (T * 1.5, 0.91, 2.36)
by['d_jarra'].location = (T * 0.5, T * 1.5, 0)
by['d_barril'].location = (T * 3.5, T * 2.5, 0)
by['d_barril_aros'].location = (T * 3.5, T * 2.5, 0)
by['d_cascotes'].location = (T * 1.5, T * 1.5, 0)
stan = by['d_estanque_piedra']
for a_deg in (20, 110, 200, 290):
    a = math.radians(a_deg)
    p = stan if a_deg == 200 else stan.copy()
    if a_deg != 200:
        scene.collection.objects.link(p)
    p.location = (T * 2.5 + 0.9 * math.cos(a), T * 1.5 + 0.9 * math.sin(a), 0.08)
    p.rotation_euler.z = a

# Entrada del mundo abierto, aparte (a +X del grupo).
E = Vector((12, -6, 0))
for n in ('d_entrada', 'd_entrada_boca', 'd_entrada_monticulo', 'd_entrada_runa'):
    o = by.get(n) or by.get(n + '.001')
    if o:
        o.location = (o.location.x + E.x, o.location.y + E.y, o.location.z)

world = bpy.data.worlds.get('World') or bpy.data.worlds.new('World')
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
bg.inputs[0].default_value = (0.05, 0.06, 0.07, 1)
bg.inputs[1].default_value = 0.6
scene.world = world
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(50), math.radians(-12), math.radians(30))
scene.collection.objects.link(sun)

try:
    scene.render.engine = 'BLENDER_EEVEE'
except TypeError:
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'


def cam(name, loc, target, lens=40, ortho=None):
    c = bpy.data.objects.new(name, bpy.data.cameras.new(name))
    scene.collection.objects.link(c)
    c.location = loc
    d = (Vector(target) - Vector(loc)).normalized()
    c.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        c.data.type = 'ORTHO'
        c.data.ortho_scale = ortho
    else:
        c.data.lens = lens
    return c


VIEWS = {
    'frontal': cam('vc1', (T * 2, -7.5, 1.8), (T * 2, 0.4, 1.7), lens=42),
    'cenital': cam('vc2', (T * 2.1, T * 1.8, 12), (T * 2.1, T * 1.8, 0), ortho=6.4),
    'rasante': cam('vc3', (T * 3.9, -3.4, 0.13), (T * 1.2, 0.1, 0.2), lens=30),
    'entrada': cam('vc4', (12 + 5.5, -6 - 6.5, 2.2), (12 - 0.5, -6, 1.6), lens=38),
}
scene.camera = VIEWS['frontal']
for name, c in VIEWS.items():
    scene.camera = c
    scene.render.filepath = os.path.join(out_dir, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('vista', name)
