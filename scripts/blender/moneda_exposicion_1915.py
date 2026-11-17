"""Moneda octagonal Panamá–Pacífico de 1915 como pieza histórica de exhibición.

Referencia visual aportada por el creador: fotografía de una moneda real. La
imagen no se carga ni se distribuye; todo el relieve se construye como
geometría original en Blender. Salidas: GLB productivo y .blend editable.
"""

from __future__ import annotations

import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

try:
    HERE = Path(bpy.path.abspath(__file__)).resolve().parent
except NameError:
    HERE = Path(r"C:\Users\frank\Desktop\2026\FrankmanGames-Prototipo\scripts\blender")
sys.path.insert(0, str(HERE))

import fg

ROOT = HERE.parent.parent
scene = fg.fresh_scene("MonedaExposicion1915")

GOLD = fg.material("moneda_oro_envejecido", (0.54, 0.255, 0.055), metallic=0.92, rough=0.30)
LIGHT = fg.material("moneda_relieve_luz", (0.83, 0.49, 0.13), metallic=0.88, rough=0.24)
DARK = fg.material("moneda_hendidura", (0.14, 0.045, 0.012), metallic=0.68, rough=0.42)

parts: list[bpy.types.Object] = []


def remember(obj: bpy.types.Object, mat=None, smooth=False) -> bpy.types.Object:
    if mat:
        obj.data.materials.append(mat)
    if smooth and obj.type == "MESH":
        for poly in obj.data.polygons:
            poly.use_smooth = True
    parts.append(obj)
    return obj


def sphere(name, xyz, scale, mat=LIGHT, segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=xyz)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return remember(obj, mat, True)


def cylinder_between(name, a, b, radius, mat=LIGHT, vertices=16):
    a, b = Vector(a), Vector(b)
    delta = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=delta.length,
                                       location=(a + b) * 0.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(delta.normalized())
    return remember(obj, mat, True)


def torus(name, xyz, major, minor, mat=LIGHT):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                    major_segments=48, minor_segments=8,
                                    location=xyz, rotation=(math.pi / 2, 0, 0))
    obj = bpy.context.object
    obj.name = name
    return remember(obj, mat, True)


def cone(name, xyz, radius, depth, rotation=(math.pi / 2, 0, 0), mat=LIGHT):
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=radius, radius2=0.015,
                                   depth=depth, location=xyz, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    return remember(obj, mat, True)


def label(text, xyz, size, extrude=0.010, align="CENTER", rot_z=0.0, mat=DARK):
    curve = bpy.data.curves.new(f"txt_{text}", "FONT")
    curve.body = text
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = extrude
    curve.bevel_depth = 0.0025
    curve.bevel_resolution = 2
    obj = bpy.data.objects.new(f"letra_{text}", curve)
    scene.collection.objects.link(obj)
    obj.matrix_world = (
        Matrix.Translation(xyz)
        @ Matrix.Rotation(math.pi / 2, 4, "X")
        @ Matrix.Rotation(rot_z, 4, "Z")
    )
    curve.materials.append(mat)
    parts.append(obj)
    return obj


def arc_text(text, radius, z_center, start_deg, end_deg, size):
    chars = list(text)
    for i, char in enumerate(chars):
        t = i / max(1, len(chars) - 1)
        angle = math.radians(start_deg + (end_deg - start_deg) * t)
        x = radius * math.sin(angle)
        z = z_center + radius * math.cos(angle)
        # Tangente legible desde el frente; los espacios conservan el ritmo.
        if char != " ":
            label(char, (x, -0.071, z), size, 0.008, rot_z=-angle)


# Disco octagonal vertical: frente hacia -Y y apoyo en Z=0.
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=1.0, depth=0.115,
                                   location=(0, 0, 1.0), rotation=(math.pi / 2, 0, 0))
base = remember(bpy.context.object, GOLD, False)
base.name = "moneda_base_octagonal"
bev = base.modifiers.new("canto_redondeado", "BEVEL")
bev.width = 0.025
bev.segments = 3
bpy.context.view_layer.objects.active = base
bpy.ops.object.modifier_apply(modifier=bev.name)

# Doble filete octagonal usando tubos entre vértices.
for radius, y, width in ((0.91, -0.070, 0.012), (0.84, -0.074, 0.009)):
    pts = [(radius * math.sin(math.pi / 8 + i * math.pi / 4), y,
            1.0 + radius * math.cos(math.pi / 8 + i * math.pi / 4)) for i in range(8)]
    for i in range(8):
        cylinder_between(f"filete_{radius}_{i}", pts[i], pts[(i + 1) % 8], width, LIGHT, 10)

# Círculo de cuentas del campo central.
for i in range(64):
    a = 2 * math.pi * i / 64
    sphere(f"cuenta_{i:02d}", (0.705 * math.cos(a), -0.083, 1.0 + 0.705 * math.sin(a)),
           (0.020, 0.012, 0.020), LIGHT, 12, 6)

# Búho en relieve: cabeza, disco facial, ojos, pico, torso y alas.
sphere("buho_torso", (0, -0.092, 1.03), (0.245, 0.035, 0.395), LIGHT, 40, 20)
sphere("buho_pecho", (0, -0.126, 1.00), (0.185, 0.025, 0.300), GOLD, 36, 18)
sphere("buho_cabeza", (0, -0.100, 1.41), (0.235, 0.038, 0.210), LIGHT, 40, 20)
cone("buho_oreja_L", (-0.155, -0.105, 1.61), 0.075, 0.23,
     rotation=(math.pi / 2, 0, math.radians(-22)), mat=LIGHT)
cone("buho_oreja_R", (0.155, -0.105, 1.61), 0.075, 0.23,
     rotation=(math.pi / 2, 0, math.radians(22)), mat=LIGHT)
for side in (-1, 1):
    torus(f"ojo_borde_{side}", (0.090 * side, -0.147, 1.445), 0.070, 0.012, DARK)
    sphere(f"ojo_iris_{side}", (0.090 * side, -0.157, 1.445), (0.045, 0.015, 0.045), GOLD, 20, 10)
    sphere(f"ojo_pupila_{side}", (0.090 * side, -0.169, 1.445), (0.020, 0.010, 0.020), DARK, 16, 8)
cone("buho_pico", (0, -0.175, 1.355), 0.050, 0.115, rotation=(0, 0, 0), mat=DARK)

# Alas y plumaje en escamas. El relieve es bajo para conservar lectura de moneda.
for side in (-1, 1):
    sphere(f"ala_{side}", (0.205 * side, -0.110, 1.02), (0.125, 0.028, 0.315), LIGHT, 28, 14)
    for row in range(5):
        count = 3 + row
        for col in range(count):
            x = side * (0.055 + col * 0.043)
            z = 1.25 - row * 0.105 - col * 0.012
            sphere(f"pluma_{side}_{row}_{col}", (x, -0.152, z),
                   (0.035, 0.010, 0.058), GOLD if row % 2 else LIGHT, 12, 6)
for row in range(4):
    for col in range(5 - row):
        x = (col - (4 - row) / 2) * 0.058
        z = 1.23 - row * 0.092
        sphere(f"pecho_{row}_{col}", (x, -0.158, z), (0.032, 0.010, 0.050), GOLD, 12, 6)

# Rama, garras y conjunto de piñas/hojas del campo inferior.
cylinder_between("rama", (-0.43, -0.145, 0.67), (0.42, -0.145, 0.71), 0.027, DARK, 14)
for side in (-1, 1):
    for toe in (-1, 0, 1):
        cylinder_between(f"garra_{side}_{toe}", (0.105 * side, -0.155, 0.72),
                         (0.105 * side + toe * 0.035, -0.170, 0.66), 0.012, LIGHT, 10)
for side in (-1, 1):
    cx = 0.43 * side
    sphere(f"pina_{side}", (cx, -0.115, 0.55), (0.145, 0.028, 0.205), LIGHT, 28, 14)
    for row in range(5):
        for col in range(3):
            x = cx + side * (col - 1) * 0.046
            z = 0.68 - row * 0.065 + (col % 2) * 0.014
            sphere(f"escama_pina_{side}_{row}_{col}", (x, -0.153, z),
                   (0.032, 0.010, 0.046), DARK, 12, 6)
    for leaf in range(6):
        ang = math.radians(-55 + leaf * 22) * side
        cylinder_between(f"aguja_{side}_{leaf}", (cx, -0.120, 0.66),
                         (cx + side * 0.25 * math.cos(ang), -0.125,
                          0.66 + 0.20 * math.sin(abs(ang))), 0.010, LIGHT, 8)

# Leyendas principales de la cara fotografiada.
arc_text("PANAMA PACIFIC EXPOSITION", 0.790, 1.0, -67, 67, 0.064)
label("SAN FRANCISCO", (0, -0.071, 0.285), 0.085, 0.008, mat=DARK)
label("E PLURIBUS", (0.40, -0.105, 1.16), 0.074, 0.006, mat=DARK)
label("UNUM", (0.40, -0.105, 1.08), 0.074, 0.006, mat=DARK)
label("1915", (0, 0.071, 1.0), 0.19, 0.010, mat=DARK)

# Convertir textos y unir todo en una sola malla con materiales conservados.
bpy.ops.object.select_all(action="DESELECT")
for obj in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = base
bpy.ops.object.convert(target="MESH")
bpy.ops.object.join()
coin = bpy.context.object
coin.name = "moneda_exposicion_1915"

# Origen en el centro inferior para colocación estable en vitrinas/altares.
bpy.context.scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")

blend = ROOT / "arte" / "blender" / "moneda_exposicion_1915.blend"
blend.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend), copy=True)
fg.export("moneda_exposicion_1915.glb", scene, [coin])
