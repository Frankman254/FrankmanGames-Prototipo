# Lamina OMP-POL-07 (evidencia): como se ven hoy los tres heroes masculinos
# (base YW) frente a las tres femeninas (base B-chan), y el humanoide comun.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup \
#       --python scripts/blender/revisar_pol07_hombre.py
# Escribe work/omp-pol07/antes.png (filas = pareja clase, columnas = vistas).
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'work', 'omp-pol07')
os.makedirs(OUT, exist_ok=True)
MD = os.path.join(ROOT, 'assets', 'models')

MODELOS = [
    ('Vanguardia H', 'centinela_anime.glb'),
    ('Vanguardia M', 'centinela_f_anime.glb'),
    ('Tejedora H', 'oraculo_anime.glb'),
    ('Tejedora M', 'oraculo_f_anime.glb'),
    ('Cazador H', 'cazador_anime.glb'),
    ('Cazador M', 'cazador_f_anime.glb'),
]
VISTAS = ((0.0, 'frente'), (math.radians(35), 'tres-cuartos'), (math.radians(90), 'perfil'))

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'MATERIAL'
sc.render.resolution_x = sc.render.resolution_y = 420

sc.camera = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
sc.collection.objects.link(sc.camera)
cam = sc.camera


def encuadre(yaw, dist, target):
    c = Vector(target)
    cam.location = (c.x + dist * math.sin(yaw), c.y - dist * math.cos(yaw), c.z + dist * 0.20)
    dirv = c - cam.location
    cam.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 70


def limpia():
    for o in list(bpy.data.objects):
        if o.name != 'Cam':
            me = o.data
            bpy.data.objects.remove(o)
            if me is not None and me.users == 0:
                if isinstance(me, bpy.types.Mesh):
                    bpy.data.meshes.remove(me)
                elif isinstance(me, bpy.types.Armature):
                    bpy.data.armatures.remove(me)
    for a in list(bpy.data.actions):
        if a.users == 0:
            bpy.data.actions.remove(a)


frames = []
for row, (nombre, archivo) in enumerate(MODELOS):
    for col, (yaw, _v) in enumerate(VISTAS):
        limpia()
        bpy.ops.import_scene.gltf(filepath=os.path.join(MD, archivo))
        # pose de reposo: primer frame de la accion si existe
        arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
        if arm and arm.animation_data and arm.animation_data.action:
            f0 = int(arm.animation_data.action.frame_range[0])
            sc.frame_start = sc.frame_end = sc.frame_current = f0
        mallas = [o for o in bpy.data.objects if o.type == 'MESH' and not o.hide_render]
        bb = [o.matrix_world @ Vector(c) for o in mallas for c in o.bound_box]
        zmin, zmax = min(v.z for v in bb), max(v.z for v in bb)
        centro = Vector(((min(v.x for v in bb) + max(v.x for v in bb)) / 2,
                         (min(v.y for v in bb) + max(v.y for v in bb)) / 2,
                         (zmin + zmax) / 2))
        encuadre(yaw, max(3.0, (zmax - zmin) * 2.0), centro)
        cell = os.path.join(OUT, f'antes_{row}_{col}.png')
        sc.render.filepath = cell
        bpy.ops.render.render(write_still=True)
        frames.append((cell, nombre))
        print(f'ok fila {row} ({nombre}) col {col}')

try:
    from PIL import Image, ImageDraw
except ImportError:
    print('sin PIL en Blender: componer fuera')
    raise SystemExit(0)

W = H = 420
lam = Image.new('RGB', (W * len(VISTAS) + 10, H * len(MODELOS) + 40), (240, 220, 150))
d = ImageDraw.Draw(lam)
for r, (nombre, _a) in enumerate(MODELOS):
    d.text((16, 20 + r * H), nombre, fill=(60, 40, 20))
for i, (cell, _n) in enumerate(frames):
    c, f = i % len(VISTAS), i // len(VISTAS)
    lam.paste(Image.open(cell), (10 + c * W, 40 + f * H))
lam.save(os.path.join(OUT, 'antes.png'))
print('lamina escrita work/omp-pol07/antes.png', lam.size)
