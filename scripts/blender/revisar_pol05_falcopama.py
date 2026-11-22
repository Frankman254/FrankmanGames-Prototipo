# Lamina OMP-POL-05: las siete falcopamas de la tienda en la oscuridad de la
# cripta, hoy (tinte puro, sin emisivo) y con la propuesta (mascara y plumas
# del lomo con brillo emisivo y suelo del color aclarado).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup \
#       --python scripts/blender/revisar_pol05_falcopama.py
# NO toca assets/models/falcopama.glb (es del coordinador) ni data/ ni src/:
# importa, tinta y emisiviza en memoria para pintar la propuesta. La decision
# de implementarla en src/render/mountView.ts es del programador (contrato en
# work/omp-pol05/PROPUESTA.md). Escribe celdas cell_<v>_<c>.png y la lamina.
import json
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'work', 'omp-pol05')
os.makedirs(OUT, exist_ok=True)

PAL = json.load(open(os.path.join(ROOT, 'data', 'art', 'falcopama_variantes.json'), encoding='utf-8'))
# las siete en venta en la tienda de desarrollo (data/rpg/items.json)
VARIANTES = ['oceano_profundo', 'azul_celeste', 'verde_esmeralda', 'rojo_carmesi',
             'violeta_arcano', 'pardo_tierra', 'dorado_solar']
COLUMNAS = ['oscuro HOY', 'oscuro PROP', 'dia HOY', 'dia PROP']
# regiones que reciben brillo en la propuesta y su fuerza (PROPUESTA)
EMISIVO = {'montura_mascara_facial': 0.55, 'montura_plumaje_secundario': 0.30}
ACLARAR = 0.18  # suelo de brillo: ningun tinte baja de aqui (borde mas claro)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
# Cycles con pocas muestras: Workbench ignora el brillo emisivo y la comparacion
# de POL-05 es justo eso.
sc.render.engine = 'CYCLES'
sc.cycles.samples = 24
sc.cycles.use_denoising = True
try:
    sc.cycles.device = 'GPU'
except TypeError:
    pass
sc.render.resolution_x = sc.render.resolution_y = 460
sc.camera = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
sc.collection.objects.link(sc.camera)
cam = sc.camera


def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def tintar(variante, prop):
    paleta = PAL['variantes'][variante]
    for m in bpy.data.materials:
        if not m.name.startswith('montura_'):
            continue
        reg = m.name.split('.')[0]
        hexcol = paleta.get(reg.replace('montura_', ''))
        if not hexcol:
            continue
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        col = hex2rgb(hexcol)
        # el tinte multiplica la textura; aproximamos con la base gris 0,8 del GLB
        col = tuple(c * 0.92 for c in col)
        if prop:
            col = tuple(max(c, ACLARAR) for c in col)  # borde/suelo mas claro
        b.inputs['Base Color'].default_value = col + (1,)
        if prop and reg in EMISIVO:
            e = EMISIVO[reg]
            b.inputs['Emission Color'].default_value = tuple(max(c, 0.5) for c in col) + (1,)
            b.inputs['Emission Strength'].default_value = e
        else:
            b.inputs['Emission Strength'].default_value = 0.0


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


frames = []
for row, v in enumerate(VARIANTES):
    for col, vista in enumerate(COLUMNAS):
        prop = 'PROP' in vista
        noche = 'oscuro' in vista
        limpia()
        bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'falcopama.glb'))
        tintar(v, prop)
        malla = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('falcopama'))
        centro = Vector((0, 0, 1.1))
        dist = 5.2
        yaw = math.radians(35)
        cam.location = (centro.x + dist * math.sin(yaw), centro.y - dist * math.cos(yaw), centro.z + 1.1)
        dirv = centro - cam.location
        cam.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
        cam.data.lens = 55
        # fondo: negro de cripta o gris de plaza
        sc.world = bpy.data.worlds.new('W') if not sc.world else sc.world
        sc.world.use_nodes = True
        bg = sc.world.node_tree.nodes['Background']
        bg.inputs[0].default_value = ((0.012, 0.014, 0.016, 1) if noche else (0.55, 0.55, 0.55, 1))
        # en la noche, una llama debil junto al pie (antorcha lejana)
        for o in list(bpy.data.objects):
            if o.name == 'Luz':
                bpy.data.objects.remove(o)
        ld = bpy.data.lights.new('Luz', 'POINT')
        lo = bpy.data.objects.new('Luz', ld)
        sc.collection.objects.link(lo)
        lo.location = (1.6, -1.6, 1.6)
        ld.energy = 8 if noche else 120
        ld.color = (1.0, 0.75, 0.45)
        cell = os.path.join(OUT, f'cell_{row}_{col}.png')
        sc.render.filepath = cell
        bpy.ops.render.render(write_still=True)
        frames.append(cell)
        print(f'{v} / {vista} ok')

try:
    from PIL import Image, ImageDraw
    W = H = 460
    lamina = Image.new('RGB', (W * 4 + 20, H * len(VARIANTES) + 20), (24, 24, 28))
    d = ImageDraw.Draw(lamina)
    for r in range(len(VARIANTES)):
        for c in range(4):
            im = Image.open(frames[r * 4 + c]).convert('RGB')
            if im.size != (W, H):
                im = im.resize((W, H))
            lamina.paste(im, (10 + c * W, 10 + r * H))
    for r, v in enumerate(VARIANTES):
        d.text((14, 12 + r * H), v, fill=(240, 220, 150))
    for c, n in enumerate(COLUMNAS):
        d.text((14 + c * W, 4), n, fill=(180, 200, 240))
    lamina.save(os.path.join(OUT, 'falcopamas_pol05.png'))
    print('lamina escrita work/omp-pol05/falcopamas_pol05.png')
except ImportError:
    print('sin PIL en Blender: componer con python3 desde cell_<fila>_<col>.png')
