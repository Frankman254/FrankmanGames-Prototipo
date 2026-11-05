# Estandartes con patrones de la biblioteca (arte/patrones/): clip "Reposo" en bucle.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/estandarte.py
# Escribe assets/models/estandarte.glb y estandarte_castillo.glb. Base en z=0, tela hacia -Y.
# La tela es una cadena de franjas, cada una hija de la anterior, para que ondee sin huesos.
import math
import os
import sys
import bpy
import bmesh

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

PATTERNS = os.path.normpath(os.path.join(fg.MODELS, '..', '..', 'arte', 'patrones'))
WIDTH = 1.1
LENGTH = 2.4
TOP = 3.6
STRIPS = 6
TILES_ACROSS = 2


def patterned(pattern):
    """Material con la casilla repetida y sin suavizar, por las dos caras."""
    m = fg.material(f'Tela_{pattern}', (1, 1, 1), rough=0.95)
    m.use_backface_culling = False
    tree = m.node_tree
    tex = tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(PATTERNS, f'{pattern}.png'))
    tex.interpolation = 'Closest'
    tex.extension = 'REPEAT'
    bsdf = next(n for n in tree.nodes if n.type == 'BSDF_PRINCIPLED')
    tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def strip(scene, name, top, height, v0, v1, mat, parent):
    """Franja colgada de su borde superior, que es su pivote."""
    bm = bmesh.new()
    a = [bm.verts.new(c) for c in ((-WIDTH / 2, 0, -height), (WIDTH / 2, 0, -height), (WIDTH / 2, 0, 0), (-WIDTH / 2, 0, 0))]
    f = bm.faces.new(a)
    uv = bm.loops.layers.uv.new()
    for loop, c in zip(f.loops, ((0, v0), (TILES_ACROSS, v0), (TILES_ACROSS, v1), (0, v1))):
        loop[uv].uv = c
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    o.parent = parent
    o.location = (0, 0, top)
    return o


def build(filename, pattern):
    scene = fg.reset()
    wood = fg.material('Madera', (0.25, 0.14, 0.07), rough=0.85)
    gold = fg.material('Remate', (0.75, 0.56, 0.2), rough=0.5)
    pole = fg.Builder('FG_Estandarte')
    pole.tube((0, 0.06, 0), (0, 0.06, TOP + 0.35), 0.06, 0.045, wood)
    pole.tube((-WIDTH / 2 - 0.12, 0.06, TOP), (WIDTH / 2 + 0.12, 0.06, TOP), 0.035, 0.035, wood)
    pole.blob((0, 0.06, TOP + 0.42), (0.11, 0.11, 0.11), gold)
    root = pole.object(scene)

    cloth = patterned(pattern)
    height = LENGTH / STRIPS
    repeats = LENGTH / (WIDTH / TILES_ACROSS)
    parent = root
    z = TOP
    objects = [root]
    frames = 60
    for i in range(STRIPS):
        v1 = repeats * (1 - i / STRIPS)
        v0 = repeats * (1 - (i + 1) / STRIPS)
        o = strip(scene, f'Tela_{i}', z, height, v0, v1, cloth, parent)
        # Cada franja se dobla más que la anterior y un poco después: la onda baja por la tela.
        amp = 2.5 + i * 1.6
        keys = [(f, amp * math.sin(2 * math.pi * (f - 1) / frames - i * 0.7)) for f in range(1, frames + 2, 5)]
        act = fg.key_rotation(o, f'Reposo_{i}', keys)
        ad = o.animation_data
        ad.action = None
        track = ad.nla_tracks.new()
        track.name = 'Reposo'
        track.strips.new(act.name, 1, act)
        objects.append(o)
        parent = o
        z = -height
    fg.export(filename, scene, objects)


build('estandarte.glb', 'escalones_tierra')
build('estandarte_castillo.glb', 'estrella_dorado')
