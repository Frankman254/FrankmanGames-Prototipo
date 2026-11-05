# Fortín colonial de geometría propia, de piedra coralina y garitas: la idea de los fuertes
# del Caribe panameño, sin reproducir ninguno.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/castillo.py
# Escribe assets/models/castillo.glb. Medidas en metros; huella de 26 x 26 m. Se puede
# ejecutar también dentro de Blender para retocarlo. No usa archivos externos.
import math
import os
import sys
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

OUT = os.path.join(os.path.dirname(bpy.path.abspath(__file__)) if '__file__' in globals() else os.getcwd(), '..', '..', 'assets', 'models', 'castillo.glb')
SIDE = 26.0

bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, rgb, emission=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    node = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value = (*rgb, 1)
    node.inputs['Roughness'].default_value = 0.9
    return m


STONE = material('piedra', (0.66, 0.6, 0.48))
STONE_DARK = material('piedra_oscura', (0.43, 0.38, 0.31))
ROOF = material('tejado', (0.72, 0.68, 0.58))
WOOD = material('madera', (0.2, 0.11, 0.05))
GOLD = material('oro', (0.72, 0.5, 0.12))
BANNER = material('estandarte', (0.1, 0.24, 0.36))


def box(name, x, y, z, w, d, h, mat):
    """Caja con la base en z; x e y son el centro."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + h / 2))
    o = bpy.context.object
    o.name = name
    o.scale = (w, d, h)
    o.data.materials.append(mat)
    return o


def cylinder(name, x, y, z, r, h, mat, r_top=None, sides=10):
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r, radius2=r if r_top is None else r_top, depth=h, location=(x, y, z + h / 2))
    o = bpy.context.object
    o.name = name
    o.data.materials.append(mat)
    return o


def merlons_line(x0, y0, x1, y1, z, size=0.8, gap=1.5):
    length = math.hypot(x1 - x0, y1 - y0)
    n = max(1, int(length // gap))
    for i in range(n + 1):
        k = i / n
        box('almena', x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z, size, size, 0.8, STONE)


def tower(name, x, y, r, h):
    # Baluarte en talud con garita de cúpula baja.
    cylinder(name, x, y, 0, r * 1.18, h, STONE, r_top=r, sides=12)
    cylinder(f'{name}_borde', x, y, h, r + 0.3, 0.42, STONE_DARK, sides=12)
    cylinder(f'{name}_garita', x, y, h + 0.42, r * 0.5, 1.5, STONE, sides=8)
    cylinder(f'{name}_tejado', x, y, h + 1.92, r * 0.62, r * 0.62, ROOF, r_top=0.03, sides=8)
    # Saeteras.
    for a in range(0, 360, 90):
        ax = math.radians(a + 45)
        box(f'{name}_saetera', x + math.cos(ax) * r, y + math.sin(ax) * r, h * 0.62, 0.3, 0.3, 1.3, STONE_DARK)


half = SIDE / 2
inset = half - 2.2
WALL_H = 6.5
wall_t = 1.5
# Muralla: la delantera (y negativa) se parte para dejar el portón.
box('muralla_n', 0, inset, 0, inset * 2, wall_t, WALL_H, STONE)
box('muralla_e', inset, 0, 0, wall_t, inset * 2, WALL_H, STONE)
box('muralla_o', -inset, 0, 0, wall_t, inset * 2, WALL_H, STONE)
GATE = 4.4
seg = inset - GATE / 2
box('muralla_s_i', -(GATE / 2 + seg / 2), -inset, 0, seg, wall_t, WALL_H, STONE)
box('muralla_s_d', GATE / 2 + seg / 2, -inset, 0, seg, wall_t, WALL_H, STONE)
for x0, y0, x1, y1 in [(-inset, inset, inset, inset), (inset, -inset, inset, inset), (-inset, -inset, -inset, inset), (-inset, -inset, -GATE / 2 - 0.4, -inset), (GATE / 2 + 0.4, -inset, inset, -inset)]:
    merlons_line(x0, y0, x1, y1, WALL_H)

for name, x, y in [('torre_no', -inset, inset), ('torre_ne', inset, inset), ('torre_so', -inset, -inset), ('torre_se', inset, -inset)]:
    tower(name, x, y, 2.2, 7.6)

# Portón.
box('porton_arco', 0, -inset, 4.6, GATE + 1.6, wall_t + 0.5, 3.4, STONE_DARK)
box('porton_puerta', 0, -inset - 0.1, 0, GATE, wall_t * 0.7, 4.6, WOOD)
for x in (-GATE / 4, 0, GATE / 4):
    box('porton_refuerzo', x, -inset - 0.72, 0.2, 0.14, 0.1, 4.2, GOLD)
tower('torre_porton_i', -(GATE / 2 + 1.1), -inset - 0.6, 1.3, 7.4)
tower('torre_porton_d', GATE / 2 + 1.1, -inset - 0.6, 1.3, 7.4)

# Torre del homenaje.
box('homenaje', 0, 3, 0, 11, 11, 12, STONE)
box('homenaje_cornisa', 0, 3, 12, 12, 12, 0.5, STONE_DARK)
merlons_line(-5.6, -2.6, 5.6, -2.6, 12.5)
merlons_line(-5.6, 8.6, 5.6, 8.6, 12.5)
merlons_line(-5.6, -2.6, -5.6, 8.6, 12.5)
merlons_line(5.6, -2.6, 5.6, 8.6, 12.5)
tower('homenaje_torreon', 0, 3, 3.2, 17)
for x in (-3, 0, 3):
    box('ventana', x, -2.56, 7.5, 0.9, 0.2, 2, STONE_DARK)
    box('ventana_alfeizar', x, -2.65, 7.35, 1.2, 0.3, 0.16, GOLD)
box('homenaje_puerta', 0, -2.55, 0, 2.2, 0.3, 3.2, WOOD)

# Estandartes y astas.
for x in (-6, 6):
    box('estandarte', x, -inset - 0.8, 2.6, 1.4, 0.08, 3.2, BANNER)
    box('estandarte_barra', x, -inset - 0.8, 5.8, 1.7, 0.14, 0.14, GOLD)
cylinder('asta', 0, 3, 23.7, 0.07, 3.2, WOOD, sides=6)
box('bandera', 0.85, 3, 25.8, 1.6, 0.05, 1, BANNER)

# Patio.
box('patio', 0, 0, -0.1, inset * 2, inset * 2, 0.16, STONE_DARK)

# Una sola malla para todo lo fijo: 170 piezas sueltas costaban en cada fotograma.
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
flag = bpy.data.objects['bandera']
flag.select_set(False)
body = next(o for o in bpy.context.selected_objects if o is not flag)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.name = 'FG_Castillo'

# La bandera ondea alrededor de su asta.
hinge = Vector((0, 3, 25.8))
flag.data.transform(Matrix.Translation(-hinge))
flag.location = hinge
flag.parent = body
flag.name = 'FG_Castillo_Bandera'
scene = bpy.context.scene
scene.render.fps = 30
act = fg.key_rotation(flag, 'Reposo', [(1, -12), (21, 14), (41, -6), (61, 18), (81, -12)], axis=2)
fg.to_tracks(flag, [act])
flag.rotation_euler = (0, 0, 0)
fg.export('castillo.glb', scene, [body, flag])
