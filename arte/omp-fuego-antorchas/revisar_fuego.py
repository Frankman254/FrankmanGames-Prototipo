# Lamina de revision del fuego de antorchas integrado (Prompt 2, 2026-11-12).
#   blender --background --python arte/omp-fuego-antorchas/revisar_fuego.py
# Importa assets/models/mazmorra.glb (SOLO lectura: es la prueba de que las
# piezas d_llama* exportadas se ven bien), aplica materiales de juego y
# reproduce en Blender la formula de animacion de src/render/torchFlame.ts:
# fila 1 = 7 antorchas con fase propia (asincronia); fila 2 = una llama en 5
# instantes (0, 0.5, 1.1, 1.9, 2.6 s) como tira de pelicula.
import math
import os

import bpy
from mathutils import Vector

REPO = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
SOURCE = os.path.join(REPO, 'assets', 'models', 'mazmorra.glb')
OUTPUT = os.path.join(REPO, 'arte', 'omp-fuego-antorchas', 'revision.png')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE)
scene = bpy.context.scene

# Solo las piezas del contrato de antorcha; el resto del catalogo no interesa aqui.
KEEP = {'d_antorcha', 'd_llama', 'd_llama_halo', 'd_llama_humo', 'd_llama_chispa'}
pieces = {}
for obj in list(scene.objects):
    if obj.type == 'MESH' and obj.name in KEEP:
        pieces[obj.name] = obj
    else:
        scene.collection.objects.unlink(obj)
for name in KEEP:
    assert name in pieces, f'falta {name} en mazmorra.glb'

# Materiales estilizados como los del juego (glow emmisivo; el GLB viaja sin
# materiales, el juego los pone: esta lamina usa equivalentes de Blender).
def emis(name, rgb, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Emission Color'].default_value = (*rgb, 1)
    bsdf.inputs['Emission Strength'].default_value = strength
    return m

def alpha_blend(m, method):
    if hasattr(m, 'blend_method'):
        m.blend_method = method
    else:  # Blender 5.x: la propiedad vive en la configuracion de superficie
        m.surface_render_method = 'BLENDED'

CORE = emis('Llama', (1.0, 0.42, 0.1), 2.2)
HALO = emis('Halo', (1.0, 0.34, 0.06), 0.9)
SMOKE = emis('Humo', (0.4, 0.37, 0.34), 0.25)  # emisivo tenue: sin luz de escena es negro
alpha_blend(SMOKE, 'BLEND')
SMOKE.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.12
SPARK = emis('Chispa', (1.0, 0.8, 0.35), 5)
for o in pieces.values():
    o.data.materials.clear()
for name, mat in (('d_llama', CORE), ('d_llama_halo', HALO), ('d_llama_humo', SMOKE), ('d_llama_chispa', SPARK), ('d_antorcha', emis('Hierro', (0.2, 0.15, 0.1), 0))):
    pieces[name].data.materials.append(mat)


def wiggle(t, ph):
    a = math.sin(t * 9.1 + ph)
    b = math.sin(t * 13.7 + ph * 1.3)
    return 0.5 + 0.5 * (a if abs(a) > abs(b) else b)


def bake_flames(bx, bz_height, depth, ph, t, tag):
    """Copia las 4 capas con la formula JS. Blender: +Z es la altura de juego;
    el humo y la chispa derivan en XY del plano de la pared (norte local)."""
    w = wiggle(t, ph)
    x, y, z = bx, depth, bz_height
    specs = {
        'd_llama': ((0.94 + 0.12 * w, 0.94 + 0.12 * w, 0.92 + 0.24 * w),
                    (math.sin(t * 1.9 + ph * 0.7) * 0.22, math.sin(t * 2.3 + ph) * 0.28, 0),
                    (x, y, z)),
        'd_llama_halo': ((1.02 + 0.14 * wiggle(t * 0.7, ph + 3),) * 3,
                         (math.sin(t * 1.6 + ph) * 0.18, 0, 0), (x, y, z)),
    }
    u = (t * 0.42 + ph * 0.11) % 1  # fase de humo (i=0 en la tira)
    specs['d_llama_humo'] = ((0.2 + 0.75 * u,) * 3,
                             (0, math.sin(u * 3 + ph) * 0.2, u * 1.4 + ph),
                             (x + math.sin(u * 5 + ph) * 0.06, y + math.cos(u * 5 + ph) * 0.06, z + 0.3 + 0.9 * u))
    v = (t * 0.9 + ph) % 1
    specs['d_llama_chispa'] = ((0.5 + 0.5 * (1 - v),) * 3,
                               (0, v * 2, v * 5 + ph),
                               (x + math.sin(v * 6 + ph) * 0.09, y + math.cos(v * 6 + ph) * 0.09, z + 0.42 + 0.9 * v))
    for name, (scale, rot, loc) in specs.items():
        src = pieces[name]
        dup = src.copy()
        dup.name = f'{tag}_{name}'
        dup.scale = scale
        dup.rotation_euler = rot
        dup.location = loc
        scene.collection.objects.link(dup)


# Fila 1: siete antorchas a la misma hora, fase por posicion (asincronia pura).
for k in range(7):
    x = (k - 3) * 0.9
    ph = x * 1.7 + k
    bpy.ops.object.select_all(action='DESELECT')
    pieces['d_antorcha'].select_set(True)
    bpy.context.view_layer.objects.active = pieces['d_antorcha']
    bpy.ops.object.duplicate()
    br = bpy.context.view_layer.objects.active
    br.name = f'torcha_{k}'
    br.location = (x, 0, 1.4)
    bake_flames(x, 1.4 + 0.36, 0, ph, 2.7, f'f1_{k}')

# Fila 2: tira de pelicula de una llama (mismas formulas, t creciente).
for k, t in enumerate((0.0, 0.5, 1.1, 1.9, 2.6)):
    x = (k - 2) * 1.15
    bpy.ops.object.select_all(action='DESELECT')
    pieces['d_antorcha'].select_set(True)
    bpy.context.view_layer.objects.active = pieces['d_antorcha']
    bpy.ops.object.duplicate()
    br = bpy.context.view_layer.objects.active
    br.name = f'tira_{k}'
    br.location = (x, -2.6, 1.4)
    bake_flames(x, 1.4 + 0.36, -2.6, 0.0, t, f'f2_{k}')

# Ocultar los originales (fuente de los duplicados).
for o in pieces.values():
    o.hide_render = True
    o.hide_viewport = True

world = bpy.data.worlds.new('revision_fuego')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.015, 0.02, 0.03, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.5
scene.world = world

# Una luz puntual calida por antorcha de la fila 1: el parpadeo de la ATMOSFERA
# del juego, aqui en versión fija.
for k in range(7):
    ld = bpy.data.lights.new(f'luz_{k}', 'POINT')
    ld.energy = 18
    ld.color = (1.0, 0.62, 0.3)
    lo = bpy.data.objects.new(f'luz_{k}', ld)
    lo.location = ((k - 3) * 0.9, -0.15, 1.9)
    scene.collection.objects.link(lo)

camera = bpy.data.objects.new('camara', bpy.data.cameras.new('camara'))
camera.data.lens = 38
scene.collection.objects.link(camera)
scene.camera = camera
target = Vector((0, -0.9, 1.9))
camera.location = target + Vector((0, -7.6, 1.9))
camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1400
scene.render.resolution_y = 760
scene.render.resolution_percentage = 100
scene.render.filepath = OUTPUT
try:
    bpy.ops.render.render(write_still=True)
except Exception as exc:  # Eevee clasico renombrado en 5.x
    engine = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engine else engine[0]
    bpy.ops.render.render(write_still=True)
print('revision escrita:', OUTPUT)
