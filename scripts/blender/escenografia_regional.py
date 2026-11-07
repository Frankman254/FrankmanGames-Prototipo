# Módulos originales de arquitectura ligera, muelle, navegación y señalización.
import importlib
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)

scene = fg.fresh_scene('EscenografiaRegional')
parts = []


def mat(name, rgb, rough=0.85, metallic=0.0, emit=None, strength=0.0):
    return fg.material('escena_' + name, rgb, rough=rough, metallic=metallic, emit=emit, strength=strength)


WOOD = mat('madera', (0.36, 0.20, 0.085), 0.96)
WOOD_LIGHT = mat('madera_clara', (0.60, 0.40, 0.18), 0.94)
WOOD_DARK = mat('madera_oscura', (0.18, 0.085, 0.035), 0.92)
WALL = mat('cal', (0.83, 0.79, 0.68), 0.98)
ROOF = mat('teja', (0.52, 0.18, 0.09), 0.90)
STRAW = mat('paja', (0.66, 0.51, 0.19), 1.0)
STONE = mat('piedra', (0.39, 0.39, 0.35), 0.96)
IRON = mat('hierro', (0.16, 0.17, 0.18), 0.50, 0.25)
ROPE = mat('cuerda', (0.65, 0.49, 0.25), 1.0)
TURQUOISE = mat('turquesa', (0.045, 0.44, 0.47), 0.82)
WINE = mat('vino', (0.43, 0.045, 0.075), 0.86)
GOLD = mat('oro', (0.88, 0.59, 0.11), 0.58, 0.12)
LAMP = mat('luz', (1.0, 0.52, 0.08), 0.35, emit=(1.0, 0.23, 0.02), strength=4.0)


def piece(name, build):
    builder = fg.Builder('escena_' + name)
    build(builder)
    parts.append(builder.object(scene))


def dock_segment(b):
    for x in (-1.35, -0.45, 0.45, 1.35):
        b.box((x, 0, 0.82), (0.82, 2.7, 0.14), WOOD_LIGHT)
    for x in (-1.48, 1.48):
        for y in (-1.1, 1.1):
            b.tube((x, y, 0), (x, y, 1.22), 0.10, 0.08, WOOD_DARK, sides=7)
    for y in (-1.34, 1.34):
        b.box((0, y, 0.67), (3.2, 0.12, 0.18), WOOD)


piece('muelle_tramo', dock_segment)


def dock_corner(b):
    dock_segment(b)
    for y in (-0.95, -0.15, 0.65, 1.45):
        b.box((1.85, y, 0.82), (1.35, 0.72, 0.14), WOOD_LIGHT)
    for y in (-1.25, 1.75):
        b.tube((2.45, y, 0), (2.45, y, 1.2), 0.10, 0.08, WOOD_DARK, sides=7)


piece('muelle_esquina', dock_corner)


def mooring(b):
    b.tube((0, 0, 0), (0, 0, 1.25), 0.16, 0.12, WOOD_DARK, sides=8)
    b.tube((-0.34, 0, 0.86), (0.34, 0, 0.86), 0.09, 0.075, WOOD, sides=7)
    for side in (-1, 1):
        b.tube((side * 0.28, 0, 0.86), (side * 0.42, 0, 0.65), 0.055, 0.035, ROPE, sides=6)


piece('amarradero', mooring)


def market_stall(b):
    for x in (-1.25, 1.25):
        for y in (-0.75, 0.75):
            b.tube((x, y, 0), (x, y, 2.45), 0.075, 0.06, WOOD_DARK, sides=7)
    b.box((0, 0, 0.92), (2.7, 1.45, 0.16), WOOD_LIGHT)
    b.box((0, 0.76, 1.35), (2.55, 0.10, 0.72), WOOD)
    b.poly([(-1.48, -0.92, 2.35), (-1.48, 0.92, 2.35), (-1.48, 0, 2.88)], [(1.48, -0.92, 2.35), (1.48, 0.92, 2.35), (1.48, 0, 2.88)], STRAW)
    for x in (-0.85, 0, 0.85):
        b.box((x, -0.925, 2.28), (0.42, 0.04, 0.18), TURQUOISE if x else WINE)


piece('puesto_mercado', market_stall)


def shelter(b):
    for x in (-1.75, 1.75):
        for y in (-1.15, 1.15):
            b.tube((x, y, 0), (x, y, 2.25), 0.10, 0.07, WOOD_DARK, sides=7)
    b.box((0, 1.12, 1.05), (3.5, 0.14, 2.05), WALL)
    for x in (-1.72, 1.72):
        b.box((x, 0, 1.05), (0.14, 2.2, 2.05), WALL)
    b.poly([(-2.0, -1.42, 2.0), (-2.0, 1.42, 2.0), (-2.0, 0, 3.05)], [(2.0, -1.42, 2.0), (2.0, 1.42, 2.0), (2.0, 0, 3.05)], ROOF)
    b.box((0, -1.0, 0.12), (3.45, 0.22, 0.24), STONE)


piece('caseta_abierta', shelter)


def storehouse(b):
    b.box((0, 0, 0.28), (4.6, 3.4, 0.55), STONE)
    b.box((0, 0, 1.55), (4.35, 3.2, 2.25), WALL)
    b.box((0, -1.62, 1.45), (1.35, 0.12, 2.0), WOOD_DARK)
    for x in (-1.55, 1.55):
        b.box((x, -1.64, 1.55), (0.72, 0.10, 0.72), TURQUOISE)
    b.poly([(-2.55, -2.02, 2.55), (-2.55, 2.02, 2.55), (-2.55, 0, 3.75)], [(2.55, -2.02, 2.55), (2.55, 2.02, 2.55), (2.55, 0, 3.75)], ROOF)
    for x in (-2.05, 2.05):
        for y in (-1.45, 1.45):
            b.box((x, y, 1.4), (0.16, 0.16, 2.35), WOOD)


piece('almacen_costero', storehouse)


def simple_boat(b, cargo=False):
    lower = [(-2.15, -0.72, 0.62), (1.55, -0.72, 0.62), (2.35, 0, 0.82), (1.55, 0.72, 0.62), (-2.15, 0.72, 0.62), (-2.42, 0, 0.72)]
    upper = [(-2.05, -0.52, 0.12), (1.42, -0.52, 0.12), (2.02, 0, 0.34), (1.42, 0.52, 0.12), (-2.05, 0.52, 0.12), (-2.25, 0, 0.22)]
    b.poly(lower, upper, TURQUOISE if not cargo else WINE)
    for x in (-1.35, -0.45, 0.45, 1.25):
        b.box((x, 0, 0.72), (0.22, 1.16, 0.08), WOOD_LIGHT)
    b.tube((-2.1, 0, 0.15), (-2.1, 0, 1.05), 0.08, 0.06, IRON, sides=7)
    if cargo:
        for x, y in ((-0.7, -0.27), (-0.7, 0.27), (0.25, -0.27), (0.25, 0.27)):
            b.box((x, y, 1.0), (0.72, 0.48, 0.52), WOOD)
            b.tube((x - 0.34, y, 1.0), (x + 0.34, y, 1.0), 0.025, 0.025, ROPE, sides=5)


piece('bote_pasajeros', simple_boat)
piece('bote_carga', lambda b: simple_boat(b, True))


def canoe(b):
    lower = [(-2.0, -0.42, 0.43), (1.65, -0.42, 0.43), (2.2, 0, 0.62), (1.65, 0.42, 0.43), (-2.0, 0.42, 0.43), (-2.25, 0, 0.55)]
    upper = [(-1.9, -0.18, 0.06), (1.55, -0.18, 0.06), (1.92, 0, 0.25), (1.55, 0.18, 0.06), (-1.9, 0.18, 0.06), (-2.0, 0, 0.17)]
    b.poly(lower, upper, WOOD_DARK)
    b.tube((-0.9, -0.38, 0.74), (1.4, 0.42, 0.92), 0.025, 0.025, WOOD_LIGHT, sides=5)
    b.box((1.58, 0.49, 0.96), (0.48, 0.16, 0.035), WOOD_LIGHT)


piece('bote_angosto', canoe)


def signpost(b):
    b.tube((0, 0, 0), (0, 0, 2.15), 0.10, 0.075, WOOD_DARK, sides=7)
    for z, direction, color in ((1.72, 1, TURQUOISE), (1.35, -1, WINE)):
        points_a = [(-0.65 * direction, -0.08, z - 0.16), (0.52 * direction, -0.08, z - 0.16), (0.82 * direction, -0.08, z), (0.52 * direction, -0.08, z + 0.16), (-0.65 * direction, -0.08, z + 0.16)]
        points_b = [(x, 0.08, zz) for x, _, zz in points_a]
        b.poly(points_a, points_b, color)


piece('poste_direcciones', signpost)


def plaza_banner(b):
    for x in (-0.72, 0.72):
        b.tube((x, 0, 0), (x, 0, 3.25), 0.075, 0.055, WOOD_DARK, sides=7)
    b.tube((-0.82, 0, 3.15), (0.82, 0, 3.15), 0.055, 0.055, WOOD, sides=7)
    b.box((0, 0, 2.35), (1.35, 0.055, 1.45), WINE)
    b.box((0, -0.04, 2.52), (1.10, 0.025, 0.16), GOLD)
    for x in (-0.38, 0, 0.38):
        b.box((x, -0.04, 1.95), (0.18, 0.025, 0.42), TURQUOISE if x else GOLD, rot=(math.radians(45), 'Y'))


piece('estandarte_plaza', plaza_banner)


def beacon(b):
    b.box((0, 0, 0.18), (1.1, 1.1, 0.36), STONE)
    b.tube((0, 0, 0.35), (0, 0, 2.7), 0.27, 0.17, WALL, sides=10)
    b.box((0, 0, 2.52), (0.82, 0.82, 0.16), IRON)
    b.blob((0, 0, 2.78), (0.24, 0.24, 0.30), LAMP, subdiv=1)
    b.box((0, 0, 3.08), (0.72, 0.72, 0.10), ROOF)


piece('baliza_costera', beacon)

fg.export('escenografia_regional.glb', scene, parts, materials=True)
print(f'escenografia regional: {len(parts)} nodos')
