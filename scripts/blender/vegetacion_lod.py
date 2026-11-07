# Biblioteca distante de árboles y roca: conserva los nombres de vegetacion.glb.
# blender --background --python scripts/blender/vegetacion_lod.py
import importlib
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)

scene = fg.fresh_scene('VegetacionLOD')
parts = []
MAT = fg.material('FloraLOD', (1, 1, 1), rough=1)


def piece(name, build):
    builder = fg.Builder(name)
    build(builder)
    parts.append(builder.object(scene))


def trunk(builder, points, radii, sides=5):
    previous = (0, 0, -0.15)
    previous_radius = radii[0]
    for point, radius in zip(points, radii[1:]):
        builder.tube(previous, point, previous_radius, radius, MAT, sides=sides)
        previous, previous_radius = point, radius


def crown(builder, blobs):
    for center, size in blobs:
        builder.blob(center, size, MAT, subdiv=1)


def palm_leaves(builder):
    top = (0.75, 0, 7.1)
    for index in range(8):
        angle = index * math.tau / 8
        ca, sa = math.cos(angle), math.sin(angle)
        tip = (top[0] + ca * 2.7, sa * 2.7, top[2] - 0.85)
        side = (-sa * 0.22, ca * 0.22, 0)
        builder.poly([(top[0] + side[0], side[1], top[2]), (top[0] - side[0], -side[1], top[2]), tip],
                     [(top[0] + side[0], side[1] + 0.03, top[2]), (top[0] - side[0], -side[1] + 0.03, top[2]),
                      (tip[0], tip[1] + 0.03, tip[2])], MAT)


piece('v_palma_tronco', lambda b: trunk(b, [(0.12, 0, 2.4), (0.38, 0, 4.8), (0.75, 0, 7.1)], [0.24, 0.20, 0.16, 0.12]))
piece('v_palma_copa', palm_leaves)

piece('v_guayacan_tronco', lambda b: trunk(b, [(0, 0, 2.9), (0.1, 0, 4.0)], [0.26, 0.17, 0.10]))
piece('v_guayacan_copa', lambda b: crown(b, [((0.1, 0, 4.7), (1.9, 1.75, 1.0)), ((1.2, 0.2, 4.4), (0.9, 0.8, 0.65)), ((-1.1, 0.2, 4.4), (0.9, 0.8, 0.65))]))

piece('v_corotu_tronco', lambda b: trunk(b, [(0, 0, 2.8), (0, 0, 4.2)], [0.42, 0.27, 0.16], sides=6))
piece('v_corotu_copa', lambda b: crown(b, [((0, 0, 5.1), (3.8, 3.5, 0.75)), ((2.4, 0.3, 5.0), (1.5, 1.25, 0.5)), ((-2.4, 0.3, 5.0), (1.5, 1.25, 0.5))]))


def mangrove_roots(builder):
    trunk(builder, [(0, 0, 2.4)], [0.18, 0.12])
    for index in range(5):
        angle = index * math.tau / 5
        foot = (math.cos(angle) * 1.1, math.sin(angle) * 1.1, -0.12)
        builder.tube((0, 0, 1.15), foot, 0.065, 0.035, MAT, sides=4)


piece('v_mangle_raices', mangrove_roots)
piece('v_mangle_copa', lambda b: crown(b, [((0, 0, 3.1), (1.65, 1.55, 0.85)), ((0.9, 0, 2.9), (0.8, 0.75, 0.55))]))

piece('v_roble_tronco', lambda b: trunk(b, [(0.05, 0, 3.0), (0.12, 0, 5.2)], [0.34, 0.25, 0.14], sides=6))
piece('v_roble_copa', lambda b: crown(b, [((0.1, 0, 6.2), (1.85, 1.75, 1.55)), ((0.9, 0.2, 5.8), (0.95, 0.9, 0.8))]))

piece('v_cipres_tronco', lambda b: trunk(b, [(0, 0, 1.4)], [0.18, 0.12]))
piece('v_cipres_copa', lambda b: b.tube((0, 0, 0.8), (0, 0, 6.6), 0.95, 0.04, MAT, sides=6))


def panama_trunk(builder):
    trunk(builder, [(0, 0, 5.0), (0.1, 0, 10.0), (0.25, 0, 15.0), (0.25, 0, 18.0)], [0.95, 0.78, 0.62, 0.48, 0.25], sides=7)
    for index in range(5):
        angle = index * math.tau / 5
        ca, sa = math.cos(angle), math.sin(angle)
        builder.poly([(ca * 0.25, sa * 0.25, -0.15), (ca * 2.4, sa * 2.4, -0.15), (ca * 0.45, sa * 0.45, 2.5)],
                     [(ca * 0.25 - sa * 0.12, sa * 0.25 + ca * 0.12, -0.15),
                      (ca * 2.4 - sa * 0.12, sa * 2.4 + ca * 0.12, -0.15),
                      (ca * 0.45 - sa * 0.12, sa * 0.45 + ca * 0.12, 2.5)], MAT)


piece('v_panama_tronco', panama_trunk)
piece('v_panama_copa', lambda b: crown(b, [((0.2, 0, 19.5), (6.2, 5.8, 1.45)), ((3.8, 0.4, 19.1), (2.7, 2.3, 0.9)), ((-3.8, 0.3, 19.1), (2.7, 2.3, 0.9))]))

piece('v_cuipo_tronco', lambda b: trunk(b, [(0, 0, 3.0), (0, 0, 8.0), (0, 0, 14.0), (0, 0, 19.5)], [1.0, 1.4, 1.2, 0.75, 0.38], sides=7))
piece('v_cuipo_copa', lambda b: crown(b, [((0, 0, 21.0), (3.7, 3.5, 0.85)), ((2.1, 0.2, 20.8), (1.6, 1.4, 0.55))]))

piece('v_indio_tronco', lambda b: trunk(b, [(0.2, 0.05, 1.6), (0.02, 0.18, 3.2), (0.4, 0.1, 5.2)], [0.34, 0.29, 0.23, 0.13], sides=5))
piece('v_indio_copa', lambda b: crown(b, [((0.4, 0.1, 6.1), (1.8, 1.7, 0.9)), ((1.3, 0.3, 5.9), (0.8, 0.75, 0.55)), ((-0.5, 0.1, 5.8), (0.8, 0.75, 0.55))]))

piece('v_roca', lambda b: b.blob((0, 0, 0.24), (0.8, 0.72, 0.5), MAT, subdiv=1))

fg.export('vegetacion_lod.glb', scene, parts, materials=False)
print(f'vegetacion LOD: {len(parts)} nodos')
