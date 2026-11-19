# MOD-05: piezas rígidas de La Espeja como equipo para cualquier personaje.
#
#   Blender -b --factory-startup --python scripts/blender/equipo_espeja.py -- [--salida RUTA.glb]
#
# Añade a `assets/models/equipo.glb` los nodos de los objetos del set ya existente
# `bi_diablico_espejo` (data/rpg/sets.json) que se ven puestos: cabeza (tocado de pompones,
# espejitos y cintas) y espalda (lazo grande con espejo y cascada de cintas). Cifras y nombres
# del set no cambian. `equipo.py` no se toca: este script importa el GLB, quita los nodos que él
# mismo puso antes, crea los nuevos y exporta todo de nuevo.
#
# Convenios de equipo.py: Z arriba, delante = −Y; la cabeza tiene el origen en la base del
# sombrero (sitio `wear.head.kinds.hat`), la espalda en la nuca y cuelga hacia −Z por +Y.
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fg  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
EQUIPO = os.path.join(RAIZ, 'assets', 'models', 'equipo.glb')
SET = 'bi_diablico_espejo'


def lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mat(nombre, hx, rough=0.5, metal=0.0, brillo=0.0):
    return fg.material(f'espeja_{nombre}', lin(hx), metallic=metal, rough=rough,
                       emit=lin(hx) if brillo else None, strength=brillo)


ROSA = mat('rosa', '#f06aa8', 0.3)
ROSA_CLARO = mat('rosa_claro', '#f8b4d2', 0.35)
MENTA = mat('menta', '#a3e6d2', 0.3)
LAVANDA = mat('lavanda', '#c8a2ec', 0.3)
ORO = mat('oro', '#e8b64a', 0.25, 0.8)
ESPEJO = mat('espejo', '#eef4fb', 0.04, 1.0)
BLANCO = mat('blanco', '#fafafa', 0.6)
POMS = [mat(n, h, 0.85) for n, h in (('pom_fucsia', '#ef2f86'), ('pom_azul', '#2846cc'), ('pom_amarillo', '#f6d24a'),
                                     ('pom_rojo', '#d61f33'), ('pom_rosa', '#f77fb8'), ('pom_magenta', '#c02a8e'),
                                     ('pom_crema', '#f3e2a6'))]
CINTAS = [mat(n, h, 0.3) for n, h in (('cinta_amarilla', '#f6d23c'), ('cinta_rosa', '#f45aa5'),
                                      ('cinta_azul', '#4f8ff0'), ('cinta_lima', '#b8e04a'), ('cinta_lavanda', '#b78be6'))]


def cinta(b, pts, ancho, m):
    """Cinta plana en el plano XZ de quien mira (grosor en Y) siguiendo `pts`."""
    for p, q in zip(pts, pts[1:]):
        p, q = Vector(p), Vector(q)
        d = (q - p)
        s = Vector((d.z, 0, -d.x)).normalized() * ancho / 2 if d.length > 0 else Vector((ancho / 2, 0, 0))
        a = [p - s, p + s, q + s, q - s]
        b.poly(a, [v + Vector((0, 0.012, 0)) for v in a], m)


def cabeza(b):
    # aro de tela menta con ribete dorado, bajo para abrazar la frente
    b.tube((0, 0, -0.035), (0, 0, 0.025), 0.185, 0.18, MENTA, sides=18)
    b.tube((0, 0, -0.045), (0, 0, -0.03), 0.192, 0.192, ORO, sides=18)
    b.tube((0, 0, 0.02), (0, 0, 0.035), 0.185, 0.185, ORO, sides=18)
    # copete bajo de pompones sobre la coronilla
    k = 0
    for anillo, (r, z, n, s) in enumerate(((0.14, 0.06, 9, 0.058), (0.075, 0.12, 6, 0.06), (0.0, 0.17, 1, 0.065))):
        for i in range(n):
            a = 2 * math.pi * (i + 0.5 * anillo) / n
            b.blob((math.cos(a) * r, math.sin(a) * r, z), (s, s, s * 0.9), POMS[k % len(POMS)], subdiv=2)
            k += 1
    # racimo que cae sobre la oreja derecha (−X), como el tocado de la Espeja
    for i, (x, y, z, s) in enumerate(((-0.2, 0.02, -0.02, 0.05), (-0.22, 0.05, -0.1, 0.045), (-0.2, 0.08, -0.17, 0.04),
                                      (-0.17, 0.1, -0.23, 0.035))):
        b.blob((x, y, z), (s, s, s), POMS[(i * 3 + 1) % len(POMS)], subdiv=2)
    # espejitos en el frente
    for x, z, r in ((0, -0.005, 0.026), (-0.075, -0.005, 0.02), (0.075, -0.005, 0.02)):
        y = -math.sqrt(max(0.188 ** 2 - x * x, 0)) - 0.006
        b.tube((x, y + 0.006, z), (x, y - 0.006, z), r + 0.008, r + 0.008, ORO, sides=10)
        b.tube((x, y - 0.006, z), (x, y - 0.010, z), r, r, ESPEJO, sides=10)
    # cintas que caen por detrás
    for i, m in enumerate(CINTAS):
        x = (i - 2) * 0.05
        y = 0.19
        pts = [(x, y, -0.03), (x + 0.01 * math.sin(i), y + 0.04, -0.12), (x - 0.015, y + 0.06, -0.26),
               (x + 0.01, y + 0.07, -0.4 - 0.03 * (i % 2))]
        cinta(b, pts, 0.035, m)


def espalda(b):
    # lazo grande: dos lazadas, nudo con espejo y dos caídas
    for sx in (1, -1):
        b.blob((sx * 0.15, 0.12, -0.12), (0.15, 0.06, 0.1), ROSA, subdiv=2)
        b.blob((sx * 0.16, 0.10, -0.12), (0.10, 0.05, 0.06), ROSA_CLARO, subdiv=2)
        cinta(b, [(sx * 0.03, 0.14, -0.15), (sx * 0.09, 0.16, -0.32), (sx * 0.12, 0.18, -0.5)], 0.09, ROSA)
    b.tube((0, 0.07, -0.12), (0, 0.17, -0.12), 0.075, 0.075, ORO, sides=14)
    b.tube((0, 0.17, -0.12), (0, 0.185, -0.12), 0.06, 0.06, ESPEJO, sides=14)
    # cascada de cintas con pompón en la punta
    for i in range(8):
        x = (i - 3.5) * 0.045
        largo = 0.55 + 0.12 * math.sin(i * 1.7)
        pts = [(x * 0.6, 0.12, -0.16), (x, 0.15, -0.16 - largo * 0.4), (x * 1.2, 0.18, -0.16 - largo * 0.75),
               (x * 1.3, 0.2, -0.16 - largo)]
        m = CINTAS[i % len(CINTAS)]
        cinta(b, pts, 0.04, m)
        b.blob((x * 1.3, 0.21, -0.18 - largo), (0.035, 0.035, 0.035), POMS[i % len(POMS)], subdiv=1)
    # correas a los hombros
    for sx in (1, -1):
        b.tube((sx * 0.05, 0.08, -0.05), (sx * 0.2, 0.0, 0.06), 0.018, 0.018, LAVANDA, sides=6)
    # espejitos cosidos al lazo
    for sx in (1, -1):
        b.tube((sx * 0.2, 0.17, -0.1), (sx * 0.2, 0.185, -0.1), 0.028, 0.028, ESPEJO, sides=8)


PIEZAS = {f'{SET}_head': cabeza, f'{SET}_back': espalda}


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    salida = argv[argv.index('--salida') + 1] if '--salida' in argv else EQUIPO
    scene = bpy.context.scene
    for o in list(scene.objects):  # escena de fábrica: cubo, cámara y luz (los materiales de arriba se conservan)
        bpy.data.objects.remove(o)
    bpy.ops.import_scene.gltf(filepath=EQUIPO)
    for o in list(scene.objects):
        if o.name.split('.')[0] in {f'obj_{k}' for k in PIEZAS}:
            bpy.data.objects.remove(o)
    for item_id, hacer in PIEZAS.items():
        b = fg.Builder(f'obj_{item_id}')
        hacer(b)
        o = b.object(scene)
        o['itemId'] = item_id
        o['slot'] = 'head' if item_id.endswith('_head') else 'back'
        o['kind'] = 'hat' if item_id.endswith('_head') else 'cape'
        print('pieza', o.name, len(o.data.polygons), 'caras')
    raices = [o for o in scene.objects if o.parent is None]
    bpy.ops.object.select_all(action='DESELECT')
    for o in scene.objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = raices[0]
    bpy.ops.export_scene.gltf(filepath=salida, export_format='GLB', use_selection=True, export_animations=False,
                              export_apply=False, export_materials='EXPORT', export_image_format='AUTO',
                              export_extras=True)
    print('exportado', salida, os.path.getsize(salida))


main()
