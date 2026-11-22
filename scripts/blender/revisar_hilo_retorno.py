# Lamina de revision del hilo de retorno (OMP-DUN-01) y del icono 2D del
# «Ovillo de regreso».
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/revisar_hilo_retorno.py
# Escribe en work/omp-dun01/: vista_frente/tres-cuartos/dorso, piso_oscuro.png
# (el hilo debe leerse en la negrura) e icono_ovillo.png con fondo transparente
# para la mochila (lo integra el coordinador).
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'work', 'omp-dun01')
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for e in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try:
        sc.render.engine = e
        break
    except TypeError:
        pass
sc.render.resolution_x = 640
sc.render.resolution_y = 640
try:
    sc.eevee.taa_render_samples = 24
except AttributeError:
    pass

bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'prop_hilo_retorno.glb'))
prop = next(o for o in sc.objects if o.type == 'MESH')

# suelo de piedra basta para las vistas de forma
suelo = bpy.data.meshes.new('suelo')
suelo.from_pydata([(-2, -2, 0), (2, -2, 0), (2, 2, 0), (-2, 2, 0)], [], [(0, 1, 2, 3)])
so = bpy.data.objects.new('suelo', suelo)
sc.collection.objects.link(so)
mat_piedra = bpy.data.materials.new('piedra')
mat_piedra.use_nodes = True
mat_piedra.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.16, 0.15, 0.14, 1)
so.data.materials.append(mat_piedra)

cam_data = bpy.data.cameras.new('cam')
cam = bpy.data.objects.new('cam', cam_data)
sc.collection.objects.link(cam)
sc.camera = cam
tgt = Vector((0.25, 0, 0.3))


def encuadre(yaw, dist, elev):
    d = dist
    cam.location = tgt + Vector((d * math.sin(yaw), -d * math.cos(yaw), d * math.sin(math.radians(elev))))
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()


# luz de dia para las vistas de forma
sun = bpy.data.objects.new('key', bpy.data.lights.new('key', 'SUN'))
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
sc.collection.objects.link(sun)

for nombre, yaw, dist, elev in (('frente', 0.0, 1.7, 8), ('tres-cuartos', math.radians(55), 1.6, 12),
                                ('dorso', math.pi, 1.7, 8)):
    encuadre(yaw, dist, elev)
    sc.render.filepath = os.path.join(OUT, f'vista_{nombre}.png')
    bpy.ops.render.render(write_still=True)
    print('Saved', nombre)

# piso oscuro: la prueba de que el brillo se ve en la cripta
sun.data.energy = 0.0
world = bpy.data.worlds.new('negrura')
sc.world = world
wbg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
wbg.inputs[0].default_value = (0.01, 0.011, 0.014, 1)
wbg.inputs[1].default_value = 1.0
encuadre(math.radians(35), 1.5, 10)
sc.render.filepath = os.path.join(OUT, 'piso_oscuro.png')
bpy.ops.render.render(write_still=True)
print('Saved piso oscuro')

# icono 2D del Ovillo: solo la madeja, render ortogonal con fondo transparente
sun.data.energy = 2.2
sc.render.film_transparent = True
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 0.3
so.hide_render = True
tgt = Vector((0.05, 0.03, 0.44))
encuadre(math.radians(30), 3.0, 18)
sc.render.filepath = os.path.join(OUT, 'icono_ovillo.png')
bpy.ops.render.render(write_still=True)
print('Saved icono ovillo')
