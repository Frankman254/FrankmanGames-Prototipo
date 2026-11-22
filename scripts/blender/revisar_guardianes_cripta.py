# Lamina OMP-POL-03: los cuatro guardianes nuevos junto al base, para que el
# creador elija por tramo antes de promover ningun GLB a assets/models/.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup \
#       --python scripts/blender/revisar_guardianes_cripta.py
# Escribe guardianes_pol03.png en work/omp-pol03/: fila = guardián (base de
# hoy, raicero 5-20, anfibio 30-50, enmascarado 60-80, coloso 90-100),
# columna = vista (tres-cuartos, frente, perfil). Silueta y escala comparadas.
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'work', 'omp-pol03')
os.makedirs(OUT, exist_ok=True)

MODELOS = [
    ('Hoy: cripta_guardian (k 0,85)', os.path.join(ROOT, 'assets', 'models', 'cripta_guardian.glb')),
    ('Raicero 5-20 (k 0,95)', os.path.join(OUT, 'guardian_raicero.glb')),
    ('Anfibio 30-50 (k 1,05)', os.path.join(OUT, 'guardian_anfibio.glb')),
    ('Enmascarado 60-80 (k 1,12)', os.path.join(OUT, 'guardian_enmascarado.glb')),
    ('Coloso de la huaca 90-100 (k 1,25)', os.path.join(OUT, 'guardian_coloso.glb')),
]
VISTAS = ((math.radians(35), 'tres-cuartos'), (0.0, 'frente'), (math.radians(90), 'perfil'))

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'MATERIAL'
COLS, ROWS = len(VISTAS), len(MODELOS)
sc.render.resolution_x = sc.render.resolution_y = 460

sc.camera = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
sc.collection.objects.link(sc.camera)
cam = sc.camera


def encuadre(yaw, dist, target):
    c = Vector(target)
    cam.location = (c.x + dist * math.sin(yaw), c.y - dist * math.cos(yaw), c.z + dist * 0.28)
    dirv = c - cam.location
    cam.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 60


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
for row, (nombre, ruta) in enumerate(MODELOS):
    for col, (yaw, _vista) in enumerate(VISTAS):
        limpia()
        bpy.ops.import_scene.gltf(filepath=ruta)
        mallas = [o for o in bpy.data.objects if o.type == 'MESH']
        bb = [o.matrix_world @ Vector(corner) for o in mallas for corner in o.bound_box]
        zmin = min(v.z for v in bb)
        zmax = max(v.z for v in bb)
        centro = sum((o.location for o in mallas), Vector()) / max(len(mallas), 1)
        centro.z = (zmin + zmax) / 2
        encuadre(yaw, max(3.4, (zmax - zmin) * 2.1), centro)
        cell = os.path.join(OUT, f'cell_{row}_{col}.png')
        sc.render.filepath = cell
        bpy.ops.render.render(write_still=True)
        frames.append(cell)
        print(f'fila {row} ({nombre}) columna {col} ok')

# composite en una lamina (fuera de Blender hay PIL; dentro puede no haberlo:
# entonces lanza de nuevo esta ultima parte con `python3`)
try:
    from PIL import Image, ImageDraw

    W = H = 460
    lamina = Image.new('RGB', (W * COLS + 20, H * ROWS + 20), (24, 24, 28))
    d = ImageDraw.Draw(lamina)
    for row in range(ROWS):
        for col in range(COLS):
            im = Image.open(frames[row * COLS + col]).convert('RGB')
            if im.size != (W, H):
                im = im.resize((W, H))
            lamina.paste(im, (10 + col * W, 10 + row * H))
    for row, (nombre, _r) in enumerate(MODELOS):
        d.text((14, 12 + row * H), nombre, fill=(240, 220, 150))
    for col, (_y, vista) in enumerate(VISTAS):
        d.text((14 + col * W, 6), vista, fill=(180, 200, 240))
    lamina.save(os.path.join(OUT, 'guardianes_pol03.png'))
    print('lamina escrita work/omp-pol03/guardianes_pol03.png')
except ImportError:
    print('sin PIL en Blender: componer con python3 desde las celdas cell_<fila>_<col>.png')
