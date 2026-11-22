# Lamina OMP-POL-06: las seis huacas de oro (rana, jaguar, aguilucho, caiman,
# tortuga, murcielago) en frente y tres-cuartos, sobre losa de altar.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup \
#       --python scripts/blender/revisar_huacas_cocle.py
# Escribe celdas cell_<fila>_<col>.png en work/omp-pol06/ (componer con
# python3 si Blender no trae PIL).
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'work', 'omp-pol06')
os.makedirs(OUT, exist_ok=True)

NOMBRES = ('huaca_rana', 'huaca_jaguar', 'huaca_aguilucho',
           'huaca_caiman', 'huaca_tortuga', 'huaca_murcielago')
VISTAS = ((0.0, 'frente'), (math.radians(35), 'tres-cuartos'), (math.radians(90), 'perfil'))

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.samples = 24
sc.render.resolution_x = sc.render.resolution_y = 420
sc.camera = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
sc.collection.objects.link(sc.camera)
cam = sc.camera

# losa de apoyo oscura para que el oro contraste
bpy.ops.mesh.primitive_cube_add(size=1)
losa = bpy.context.object
losa.scale = (0.18, 0.18, 0.02)
losa.location = (0, 0, -0.02)
ml = bpy.data.materials.new('losa')
ml.use_nodes = True
ml.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.06, 0.06, 0.07, 1)
losa.data.materials.append(ml)

# dos luces calidas de antorcha
for lx in (-1, 1):
    ld = bpy.data.lights.new('Luz', 'POINT')
    lo = bpy.data.objects.new('Luz', ld)
    sc.collection.objects.link(lo)
    lo.location = (lx * 0.35, -0.3, 0.4)
    ld.energy = 18
    ld.color = (1.0, 0.78, 0.5)

frames = []
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'huacas_cocle.glb'))
for row, nombre in enumerate(NOMBRES):
    for col, (yaw, _v) in enumerate(VISTAS):
        for o in bpy.data.objects:
            if o.type == 'MESH' and o.name.startswith('huaca_'):
                o.hide_render = (o.name != nombre)
        centro = Vector((0, 0, 0.06))
        dist = 0.42
        cam.location = (centro.x + dist * math.sin(yaw), centro.y - dist * math.cos(yaw), centro.z + 0.10)
        dirv = centro - cam.location
        cam.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
        cam.data.lens = 60
        cell = os.path.join(OUT, f'cell_{row}_{col}.png')
        sc.render.filepath = cell
        bpy.ops.render.render(write_still=True)
        frames.append(cell)
        print(f'{nombre} {VISTAS[col][1]} ok')

try:
    from PIL import Image, ImageDraw
    W = H = 420
    lamina = Image.new('RGB', (W * 3 + 20, H * len(NOMBRES) + 20), (24, 24, 28))
    d = ImageDraw.Draw(lamina)
    for r in range(len(NOMBRES)):
        for c in range(3):
            im = Image.open(frames[r * 3 + c]).convert('RGB')
            if im.size != (W, H):
                im = im.resize((W, H))
            lamina.paste(im, (10 + c * W, 10 + r * H))
    for r, n in enumerate(NOMBRES):
        d.text((14, 12 + r * H), n, fill=(240, 220, 150))
    for c, (_y, v) in enumerate(VISTAS):
        d.text((14 + c * W, 4), v, fill=(180, 200, 240))
    lamina.save(os.path.join(OUT, 'catalogo.png'))
    print('lamina escrita work/omp-pol06/catalogo.png')
except ImportError:
    print('sin PIL en Blender: componer con python3 desde cell_<fila>_<col>.png')
