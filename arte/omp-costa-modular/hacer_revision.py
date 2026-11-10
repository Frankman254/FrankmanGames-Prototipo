# Lamina de revision del GLB exportado de costa_modular: tres vistas etiquetadas
# (3/4 con nombre, cenital y a ras del suelo).
# blender --background --python work/omp-costa-modular/hacer_revision.py -- \
#     work/omp-costa-modular/costa_modular.glb work/omp-costa-modular/revision.png
# Los objetos importados no se renderizan en esta escena de Blender en modo sin
# interfaz: la maquetacion usa copias (.copy(), misma malla) y oculta las fuentes.
import json
import math
import os
import sys
from mathutils import Vector

import bpy

args = sys.argv[sys.argv.index('--') + 1:]
source, output = os.path.abspath(args[0]), os.path.abspath(args[1])
os.makedirs(os.path.dirname(output), exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
scene = bpy.context.scene

ORDER = [
    'costa_roca_baja_pequena', 'costa_roca_baja_mediana', 'costa_roca_baja_grande',
    'costa_roca_erosionada', 'costa_roca_con_hendidura', 'costa_grupo_rocoso',
    'costa_madera_arrasta', 'costa_madera_arrastre_curva', 'costa_madera_arrastre_raices',
    'costa_raices_bajas', 'costa_raices_entrelazadas', 'costa_monticulo_arena',
    'costa_borde_poza', 'costa_huellas_olas', 'costa_mata_duna_pequena',
    'costa_mata_duna_grande', 'costa_conchas_grupo', 'costa_restos_ramas',
]
objects = []
for name in ORDER:
    obj = scene.objects.get(name)
    assert obj is not None and obj.type == 'MESH', f'falta {name} en el GLB'
    objects.append(obj)


# ---------------------------------------------------------------- medidas del GLB
def bbox(obj):
    cs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    xs, ys, zs = ([c[i] for c in cs] for i in range(3))
    return Vector((min(xs), min(ys), min(zs))), Vector((max(xs), max(ys), max(zs)))


dump = []
for o in objects:
    lo, hi = bbox(o)
    tri = sum(len(p.vertices) - 2 for p in o.data.polygons)
    mats = sorted({o.material_slots[p.material_index].material.name
                   for p in o.data.polygons if p.material_index >= 0})
    dump.append({'name': o.name, 'x': round(hi.x - lo.x, 2), 'y': round(hi.y - lo.y, 2),
                 'z': round(hi.z - lo.z, 2), 'tri': tri, 'mats': mats})
    print(o.name, 'dims', [round(hi[i] - lo[i], 2) for i in range(3)], 'tris', tri, 'mats', mats)

# ---------------------------------------------------------------- maquetacion
def place(obj, x, y):
    lo, hi = bbox(obj)
    obj.location = (x - (lo.x + hi.x) / 2, y - (lo.y + hi.y) / 2, -lo.z)
    bpy.context.view_layer.update()


BY_NAME = {o.name: o for o in objects}
for o in objects:
    o.hide_render = True


def etiqueta(body, tam):
    d = bpy.data.curves.new('etq', 'FONT')
    d.body = body.split('.')[0]
    d.size = tam
    d.align_x = 'CENTER'
    o = bpy.data.objects.new('etq', d)
    scene.collection.objects.link(o)
    return o


# Rejilla 3x6 con las piezas espaciadas; las planas (fila 3) van junto a una roca
# de referencia para leer su escala real a ras de suelo.
GRID, GRID_LABELS = [], []
for name in ORDER:
    o = BY_NAME[name].copy()
    scene.collection.objects.link(o)
    GRID.append(o)
ROWS = [GRID[0:6], GRID[6:12], GRID[12:18]]
CELL = 3.3
for r, row in enumerate(ROWS):
    for c, o in enumerate(row):
        place(o, (c - 2.5) * CELL, -r * CELL)
        lo, hi = bbox(o)
        lab = etiqueta(o.name, 0.24)
        lab.location = ((c - 2.5) * CELL, hi.y + 0.5, 0.02)
        GRID_LABELS.append(lab)

# Fila a ras del suelo: las cinco piezas no bloqueantes y el borde de poza,
# fotografiadas desde 0.35 m de altura para verificar que no estorban. Las
# etiquetas van de canto hacia la camara (rotadas 90 grados en X).
LOW, LOW_LABELS = [], []
x = -4.0
for name in ['costa_huellas_olas', 'costa_conchas_grupo', 'costa_mata_duna_pequena',
             'costa_restos_ramas', 'costa_mata_duna_grande', 'costa_borde_poza']:
    src = BY_NAME[name]
    o = src.copy()
    scene.collection.objects.link(o)
    lo, hi = bbox(o)
    place(o, x + (hi.x - lo.x) / 2 + 0.9, 0)
    lo, hi = bbox(o)
    x = hi.x + 0.9
    lab = etiqueta(name, 0.2)
    lab.rotation_euler = (math.radians(90), 0, 0)
    lab.location = ((lo.x + hi.x) / 2, -0.25, 0.4)
    LOW.append(o)
    LOW_LABELS.append(lab)

# ---------------------------------------------------------------- iluminacion
worldb = bpy.data.worlds.new('revision_costa')
worldb.use_nodes = True
worldb.node_tree.nodes['Background'].inputs[0].default_value = (0.36, 0.32, 0.26, 1)
worldb.node_tree.nodes['Background'].inputs[1].default_value = 0.9
scene.world = worldb
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 3.5
sun.rotation_euler = (math.radians(40), 0, math.radians(-35))
scene.collection.objects.link(sun)
fill = bpy.data.objects.new('sombra', bpy.data.lights.new('sombra', 'SUN'))
fill.data.energy = 1.2
fill.rotation_euler = (math.radians(60), math.radians(180), math.radians(150))
scene.collection.objects.link(fill)

# Suelo de arena media para leer las piezas planas contra el fondo.
import bmesh  # noqa: E402
me = bpy.data.meshes.new('suelo')
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30)
bm.to_mesh(me)
bm.free()
floor = bpy.data.objects.new('suelo', me)
scene.collection.objects.link(floor)
floor.location = (0, -2.6, -0.005)
fm = bpy.data.materials.new('suelo_arena_revision')
fm.use_nodes = True
fb = next(n for n in fm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
fb.inputs['Base Color'].default_value = (0.42, 0.36, 0.26, 1)
fb.inputs['Roughness'].default_value = 1.0
me.materials.append(fm)

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
    target = Vector(look_at)
    d = Vector(loc) - target
    cam.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    cam.location = loc
    scene.camera = cam


def show(group):
    for o in GRID + GRID_LABELS + LOW + LOW_LABELS:
        o.hide_render = o not in group


def disparar(filepath):
    scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)


rejilla = GRID + GRID_LABELS
add_cam('cam_tres', (0.0, -22.0, 12.0), (0.0, -3.0, 0.4), 19.0)
show(rejilla)
disparar(output.replace('.png', '_trescuartos.png'))

add_cam('cam_cenital', (0.0, -3.0, 20.0), (0.0, -3.0, 0.0), 19.0)
show(rejilla)
disparar(output.replace('.png', '_cenital.png'))

add_cam('cam_baja', (4.3, -9.0, 1.35), (4.3, 0.6, 0.0), 17.5)
show(LOW + LOW_LABELS)
disparar(output.replace('.png', '_baja.png'))

# ---------------------------------------------------------------- union en revision.png
bpy.ops.wm.read_factory_settings(use_empty=True)
scene2 = bpy.context.scene
tiles = [(os.path.basename(output).replace('.png', '_trescuartos.png'), 16.0, 9.2, (0, 4.6)),
         (os.path.basename(output).replace('.png', '_cenital.png'), 7.8, 4.5, (-4.1, -2.3)),
         (os.path.basename(output).replace('.png', '_baja.png'), 7.8, 4.5, (4.1, -2.3))]
for fname, w, h, (px, py) in tiles:
    img = bpy.data.images.load(os.path.join(os.path.dirname(output), fname))
    ratio = img.size[0] / max(1, img.size[1])  # las tomas salen 2000x1150
    h = w / ratio
    me = bpy.data.meshes.new(fname)
    import bmesh as _bm
    bm = _bm.new()
    _bm.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    uv_l = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for lp in f.loops:
            lp[uv_l].uv = (lp.vert.co.x + 0.5, lp.vert.co.y + 0.5)
    bm.to_mesh(me)
    bm.free()
    mt = bpy.data.materials.new(fname + '_m')
    mt.use_nodes = True
    nt = mt.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    nt.links.new(tex.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    me.materials.append(mt)
    o = bpy.data.objects.new(fname, me)
    o.scale = (w, h, 1)
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
