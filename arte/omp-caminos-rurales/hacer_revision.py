# Lamina de revision del GLB exportado de caminos_rurales: tres vistas etiquetadas.
# blender --background --python work/omp-caminos-rurales/hacer_revision.py -- \
#     work/omp-caminos-rurales/caminos_rurales.glb work/omp-caminos-rurales/revision.png
# Los objetos importados no se renderizan en esta escena de Blender en modo sin
# interfaz: la maquetacion usa copias (.copy(), misma malla) y oculta las fuentes.
import json
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
    'camino_cerca_2m', 'camino_cerca_4m', 'camino_cerca_esquina', 'camino_cerca_rota',
    'camino_porton_cerrado', 'camino_porton_abierto',
    'camino_poste_simple', 'camino_letrero_doble', 'camino_mojon_piedra',
    'camino_puente_tablas_2m', 'camino_puente_tablas_4m', 'camino_alcantarilla_piedra',
    'camino_escalones_tierra', 'camino_banco_rustico', 'camino_abrevadero',
    'camino_carretilla', 'camino_pila_madera', 'camino_barrera_caida',
]
objects = []
for name in ORDER:
    obj = scene.objects.get(name)
    assert obj is not None and obj.type == 'MESH', f'falta {name} en el GLB'
    objects.append(obj)

# ---------------------------------------------------------------- medidas del GLB
def bbox(obj):
    cs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    lo = Vector((min(p[i] for p in cs) for i in range(3)))
    hi = Vector((max(p[i] for p in cs) for i in range(3)))
    return lo, hi

dump = []
for o in objects:
    lo, hi = bbox(o)
    tri = sum(len(p.vertices) - 2 for p in o.data.polygons)
    mats = sorted({o.material_slots[p.material_index].name for p in o.data.polygons})
    dump.append({'n': o.name, 'd': [round(hi[i] - lo[i], 2) for i in range(3)],
                 'zmin': round(lo.z, 3), 'tri': tri, 'mats': mats})
    print(o.name, 'dims', [round(hi[i] - lo[i], 2) for i in range(3)], 'tris', tri, 'mats', mats)

# ---------------------------------------------------------------- maquetacion
def place(obj, x, y):
    lo, hi = bbox(obj)
    obj.location.x += x - (lo.x + hi.x) / 2
    obj.location.y += y - (lo.y + hi.y) / 2
    bpy.context.view_layer.update()

BY_NAME = {o.name: o for o in objects}
for o in objects:
    o.hide_render = True


def etiqueta(body, tam):
    d = bpy.data.curves.new('etq', 'FONT')
    d.body = body
    d.align_x = 'CENTER'
    d.size = tam
    o = bpy.data.objects.new('etq_' + body, d)
    scene.collection.objects.link(o)
    return o

# Rejilla 3x6: todas las piezas con su nombre, para las vistas 3/4 y cenital.
GRID, GRID_LABELS = [], []
for name in ORDER:
    o = BY_NAME[name].copy()
    o.hide_render = False
    scene.collection.objects.link(o)
    GRID.append(o)
ROWS = [GRID[0:6], GRID[6:12], GRID[12:18]]
for r, row in enumerate(ROWS):
    widths = [bbox(o)[1].x - bbox(o)[0].x for o in row]
    x = -(sum(widths) + 0.9 * len(widths)) / 2
    y = -r * 5.4
    for o, w in zip(row, widths):
        x += 0.45
        place(o, x + w / 2, y)
        x += w / 2 + 0.45
        lab = etiqueta(o.name.split('.')[0].replace('camino_', ''), 0.22)
        lo, hi = bbox(o)
        lab.location = ((lo.x + hi.x) / 2, lo.y - 0.55 - (0.45 if (len(GRID_LABELS) % 2) else 0), 0.02)
        GRID_LABELS.append(lab)

# Linea ensamblada (prueba de costuras): cerca 2m + 2m + 4m + esquina + 2m, y la
# rota suelta tras un hueco narrativo. Solo para la vista a altura de jinete.
LINE, LINE_LABELS = [], []
x = -6.0
for name in ['camino_cerca_2m', 'camino_cerca_2m', 'camino_cerca_4m',
             'camino_cerca_esquina', 'camino_cerca_2m', 'camino_cerca_rota']:
    src = BY_NAME[name]
    o = src.copy()
    o.hide_render = False
    scene.collection.objects.link(o)
    LINE.append(o)
    w = bbox(src)[1].x - bbox(src)[0].x
    if name == 'camino_cerca_esquina':
        place(o, x + 0.475, 8.0)                # vertice del modulo en el cursor
        x += 1.0
    elif name == 'camino_cerca_rota':
        place(o, x + 1.9, 8.0)                  # suelta: hueco narrativo
    else:
        place(o, x + w / 2, 8.0)
        x += w
    lo, hi = bbox(o)
    lab = etiqueta(name.replace('camino_', ''), 0.26)
    lab.location = ((lo.x + hi.x) / 2, lo.y - 0.6, 0.05)
    lab.rotation_euler = (math.radians(90), 0, 0)   # vertical, de frente al -Y
    LINE_LABELS.append(lab)

# ---------------------------------------------------------------- iluminacion
worldb = bpy.data.worlds.new('revision_caminos')
worldb.use_nodes = True
worldb.node_tree.nodes['Background'].inputs[0].default_value = (0.30, 0.28, 0.24, 1)
worldb.node_tree.nodes['Background'].inputs[1].default_value = 0.8
scene.world = worldb
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 3.5
sun.rotation_euler = (math.radians(40), 0, math.radians(-35))
scene.collection.objects.link(sun)
fill = bpy.data.objects.new('sombra', bpy.data.lights.new('sombra', 'SUN'))
fill.data.energy = 1.2
fill.rotation_euler = (math.radians(60), math.radians(180), math.radians(150))
scene.collection.objects.link(fill)

# ---------------------------------------------------------------- camaras y tomas
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 2000
scene.render.resolution_y = 1150
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'


def add_cam(name, loc, look_at, ortho):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = ortho
    scene.collection.objects.link(cam)
    cam.location = loc
    d = Vector(look_at) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam


def show(group):
    for o in GRID + GRID_LABELS + LINE + LINE_LABELS:
        o.hide_render = o not in group


def disparar(filepath):
    scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)


rejilla = GRID + GRID_LABELS
add_cam('cam_tres', (0.0, -25.0, 15.0), (0.0, -5.4, 0.8), 21.5)
show(rejilla)
disparar(output.replace('.png', '_trescuartos.png'))

add_cam('cam_cenital', (0.0, -5.4, 20.0), (0.0, -5.4, 0.0), 24.0)
show(rejilla)
disparar(output.replace('.png', '_cenital.png'))

add_cam('cam_baja', (0.6, -1.5, 1.9), (0.6, 8.0, 0.7), 16.5)
show(LINE + LINE_LABELS)
disparar(output.replace('.png', '_baja.png'))

# ---------------------------------------------------------------- union en revision.png
bpy.ops.wm.read_factory_settings(use_empty=True)
scene2 = bpy.context.scene
tiles = [(os.path.basename(output).replace('.png', '_trescuartos.png'), 16.0, 9.2, (0, 4.6)),
         (os.path.basename(output).replace('.png', '_cenital.png'), 7.8, 4.5, (-4.1, -2.3)),
         (os.path.basename(output).replace('.png', '_baja.png'), 7.8, 4.5, (4.1, -2.3))]
for fname, w, h, (px, py) in tiles:
    img = bpy.data.images.load(os.path.join(os.path.dirname(output), fname))
    m = bpy.data.materials.new('placa_' + fname)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    emi = nt.nodes.new('ShaderNodeEmission')
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    nt.links.new(tex.outputs['Color'], emi.inputs['Color'])
    nt.links.new(emi.outputs['Emission'], out.inputs['Surface'])
    mesh = bpy.data.meshes.new('placa_' + fname)
    mesh.from_pydata([(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)], [], [(0, 1, 2, 3)])
    uv = mesh.uv_layers.new(name='UVMap')
    for li, co in zip((0, 1, 2, 3), ((0, 0), (1, 0), (1, 1), (0, 1))):
        for loop in mesh.polygons[0].loop_indices:
            if mesh.loops[loop].vertex_index == li:
                uv.data[loop].uv = co
    mesh.materials.append(m)
    o = bpy.data.objects.new('placa_' + fname, mesh)
    o.location = (px, py, 0)
    scene2.collection.objects.link(o)
SPAN_Y = (4.6 + 9.2 / 2) - (-2.3 - 4.5 / 2)
cam = bpy.data.objects.new('union', bpy.data.cameras.new('union'))
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 16.15
scene2.collection.objects.link(cam)
cam.location = (0, (4.6 + 9.2 / 2 + -2.3 - 4.5 / 2) / 2, 8)
scene2.camera = cam
scene2.render.engine = 'BLENDER_EEVEE'
scene2.render.resolution_x = 1620
scene2.render.resolution_y = round(1620 * SPAN_Y / cam.data.ortho_scale)
scene2.render.resolution_percentage = 100
scene2.render.image_settings.file_format = 'PNG'
scene2.render.filepath = output
bpy.ops.render.render(write_still=True)
with open(os.path.join(os.path.dirname(output), 'dimensiones.json'), 'w') as fh:
    json.dump(dump, fh, ensure_ascii=False)
print('union ->', output)
print('total triangulos:', sum(d['tri'] for d in dump))
