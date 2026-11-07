# Capturas de revisión de una montura con variantes: diez variantes y vistas (frente, perfil, tres
# cuartos, trasera y vuelo). Las llama el script del modelo (p. ej. diostede.py) con `-- --capturas`.
# Salida (ignorada por Git): work/<modelo>/variantes.png, vistas.png, negro_blanco.png y una imagen por toma.
import math
import os

import bpy
import numpy as np
from mathutils import Vector

SIZE = 420


def _setup(scene, col):
    for o in list(col.objects):
        bpy.data.objects.remove(o)
    cam = bpy.data.objects.new('MONTURA_cam', bpy.data.cameras.new('MONTURA_cam'))
    cam.data.lens = 50
    col.objects.link(cam)
    scene.camera = cam
    for name, energy, rot in (('MONTURA_sol', 3.2, (50, 0, 35)), ('MONTURA_relleno', 1.1, (65, 0, -140))):
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN'))
        light.data.energy = energy
        light.rotation_euler = tuple(math.radians(a) for a in rot)
        col.objects.link(light)
    world = bpy.data.worlds.get('MONTURA_fondo') or bpy.data.worlds.new('MONTURA_fondo')
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (0.16, 0.18, 0.22, 1)
    bg.inputs[1].default_value = 0.9
    scene.world = world
    for engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x = scene.render.resolution_y = SIZE
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = 'PNG'
    return cam


def _aim(cam, direction, center=Vector((0, -0.2, 1.0)), dist=5.2):
    d = Vector(direction).normalized()
    cam.location = center + d * dist
    cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()


def _render(scene, path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path, check_existing=False)
    px = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)
    bpy.data.images.remove(img)
    return px


def _sheet(tiles, cols, path):
    rows = math.ceil(len(tiles) / cols)
    h, w = tiles[0].shape[:2]
    sheet = np.zeros((rows * h, cols * w, 4), dtype=np.float32)
    sheet[..., 3] = 1
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        # Las filas de píxeles de Blender empiezan abajo.
        sheet[(rows - 1 - r) * h:(rows - r) * h, c * w:(c + 1) * w] = t
    img = bpy.data.images.new('MONTURA_lamina', cols * w, rows * h, alpha=True)
    img.pixels[:] = sheet.ravel()
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def run(scene, rig, parts, show, play, col, out, variants):
    os.makedirs(out, exist_ok=True)
    cam = _setup(scene, col)
    three_quarter = (-0.75, -0.85, 0.35)
    tiles = []
    play('idle_ground', 1)
    _aim(cam, three_quarter)
    for v in variants:
        show(v)
        tiles.append(_render(scene, os.path.join(out, f'variante_{v}.png')))
    _sheet(tiles, 5, os.path.join(out, 'variantes.png'))
    show(variants[0])
    views = [('frente', (0, -1, 0.12), 'idle_ground', 1), ('perfil', (1, 0, 0.1), 'idle_ground', 1),
             ('tres_cuartos', three_quarter, 'idle_ground', 1), ('trasera', (0.3, 1, 0.35), 'idle_ground', 1),
             ('vuelo_avance', three_quarter, 'fly_forward', 5), ('vuelo_quieto', (0.2, -1, 0.25), 'fly_idle', 1)]
    tiles = []
    for name, direction, clip, frame in views:
        play(clip, frame)
        _aim(cam, direction, dist=6.0 if clip.startswith('fly') else 5.2)
        tiles.append(_render(scene, os.path.join(out, f'vista_{name}.png')))
    _sheet(tiles, 3, os.path.join(out, 'vistas.png'))
    # Negro y blanco de cerca: comprueba que no se ven planos.
    tiles = []
    play('idle_ground', 1)
    _aim(cam, three_quarter, dist=4.2)
    for v in ('negro_ebano', 'blanco_perla'):
        show(v)
        tiles.append(_render(scene, os.path.join(out, f'detalle_{v}.png')))
    _sheet(tiles, 2, os.path.join(out, 'negro_blanco.png'))
    print(f'capturas en {out}')
