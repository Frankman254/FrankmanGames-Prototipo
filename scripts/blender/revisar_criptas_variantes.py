# Lamina de revision OMP-FA-03: para rata, guardian y bruto, la base publicada
# junto a sus dos variantes de tramo (cueva humeda, huaca de oro), en 5 vistas.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/revisar_criptas_variantes.py
# Escribe cripta_<especie>.png en work/omp-fa-03/: cada fila una variante, cada
# columna una vista (frente, tres-cuartos, perfil, cabeza, dorso).
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'work', 'omp-fa-03')
os.makedirs(OUT, exist_ok=True)

ESPECIES = ('rata', 'guardian', 'bruto')
VARIANTES = ('', '_cueva', '_huaca')
NOMBRES = {'': 'base (pisos 1-30)', '_cueva': 'cueva (31-70)', '_huaca': 'huaca (71-100)'}
# blanco de la vista de cabeza: cráneo segun la malla (y mira a -Y)
CABEZA = {'rata': (0, -0.32, 0.52), 'guardian': (0, -0.10, 1.22), 'bruto': (0, -0.12, 1.85)}

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'MATERIAL'
sc.render.resolution_x = sc.render.resolution_y = 640

sc.camera = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
sc.collection.objects.link(sc.camera)
cam = sc.camera


def encuadre(yaw, dist, elev, target, size):
    c = Vector(target)
    d = dist * size
    cam.location = (c.x + d * math.sin(yaw), c.y - d * math.cos(yaw), c.z + d * math.sin(elev))
    dirv = c - cam.location
    cam.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 60


for sp in ESPECIES:
    for v in VARIANTES:
        bpy.ops.object.select_all(action='DESELECT')
        for o in list(bpy.data.objects):
            if o.name != 'Cam':
                bpy.data.objects.remove(o)
        bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models',
                                                        f'cripta_{sp}{v}.glb'))
        cuerpo = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name == 'Cuerpo'][0]
        deps = bpy.context.evaluated_depsgraph_get()
        me = bpy.data.meshes.new_from_object(cuerpo.evaluated_get(deps))
        pts = [cuerpo.matrix_world @ Vector(p.co) for p in me.vertices]
        bpy.data.meshes.remove(me)
        zmin = min(p.z for p in pts)
        zmax = max(p.z for p in pts)
        SIZE = max(max(p.x for p in pts) - min(p.x for p in pts),
                   max(p.y for p in pts) - min(p.y for p in pts), zmax - zmin)
        centro = (0, 0, (zmax + max(zmin, 0)) / 2)
        sc.frame_set(1)
        vistas = [('frente', 0.0, 1.7, 8), ('tres-cuartos', math.radians(50), 1.7, 12),
                  ('perfil', math.pi / 2, 1.7, 6), ('dorso', math.pi, 1.7, 8),
                  ('cabeza', math.radians(35), 1.05, 8)]
        for nombre, yaw, dist, elev in vistas:
            objetivo = CABEZA[sp] if nombre == 'cabeza' else centro
            talla = SIZE * (0.22 if nombre == 'cabeza' else 1.0)
            encuadre(yaw, dist, elev, objetivo, talla)
            archivo = os.path.join(OUT, f'cripta_{sp}{v or "_base"}_{nombre}.png')
            sc.render.filepath = archivo
            bpy.ops.render.render(write_still=True)
            print(f'renderizada {NOMBRES[v]} de {sp}: {nombre}')
