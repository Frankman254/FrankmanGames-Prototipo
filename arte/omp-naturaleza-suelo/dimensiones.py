# Dimensiones por nodo del GLB (una sola vez, para el REPORTE).
import json
import os
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(args[0]))
rows = []
for obj in sorted((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: o.name):
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector(tuple(min(p[i] for p in corners) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in corners) for i in range(3)))
    rows.append({'n': obj.name, 'd': [round(hi[i] - lo[i], 2) for i in range(3)],
                 'zmin': round(lo.z, 3), 'zmax': round(hi.z, 2),
                 'tri': sum(len(p.vertices) - 2 for p in obj.data.polygons),
                 'origen': [round(v, 3) for v in obj.location]})
print(json.dumps(rows))
