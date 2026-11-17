"""Valida la moneda histórica octagonal exportada."""

from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(bpy.path.abspath(__file__)).resolve().parents[2]
GLB = ROOT / "assets" / "models" / "moneda_exposicion_1915.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(GLB))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
assert len(meshes) == 1, f"se esperaba una malla, hay {len(meshes)}"
coin = meshes[0]
triangles = sum(len(poly.vertices) - 2 for poly in coin.data.polygons)
assert triangles <= 85000, f"demasiados triángulos: {triangles}"
assert {"moneda_oro_envejecido", "moneda_relieve_luz", "moneda_hendidura"} <= {
    mat.name for mat in coin.data.materials
}, "faltan materiales del relieve"
assert coin.name == "moneda_exposicion_1915", coin.name
assert 8_000 <= triangles, f"detalle insuficiente: {triangles} triángulos"

corners = [coin.matrix_world @ Vector(corner) for corner in coin.bound_box]
xs = [v.x for v in corners]
ys = [v.y for v in corners]
zs = [v.z for v in corners]
width, depth, height = max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)
assert 1.9 <= width <= 2.1 and 1.9 <= height <= 2.1, (width, height)
assert 0.10 <= depth <= 0.45, depth
assert -0.03 <= min(zs) <= 0.03, min(zs)
print(f"moneda válida: {triangles} triángulos, {width:.2f}×{height:.2f}×{depth:.2f} m, {len(coin.data.materials)} materiales")
