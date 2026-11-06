# Biblioteca original de armas y escudos. Cada objeto conserva el ID de items.json.
# "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/equipo.py
import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
with open(os.path.join(ROOT, 'data', 'rpg', 'items.json'), encoding='utf-8') as stream:
    ITEMS = json.load(stream)['items']

scene = fg.reset()
WOOD = fg.material('equipo_madera', (0.22, 0.095, 0.035), rough=0.86)
DARK_WOOD = fg.material('equipo_madera_oscura', (0.08, 0.035, 0.018), rough=0.9)
LEATHER = fg.material('equipo_cuero', (0.28, 0.08, 0.045), rough=0.82)
IRON = fg.material('equipo_hierro', (0.28, 0.31, 0.33), metallic=0.55, rough=0.48)
STEEL = fg.material('equipo_acero', (0.52, 0.58, 0.61), metallic=0.68, rough=0.34)
BRONZE = fg.material('equipo_bronce', (0.52, 0.25, 0.07), metallic=0.58, rough=0.42)
GOLD = fg.material('equipo_oro', (0.78, 0.49, 0.08), metallic=0.62, rough=0.34)
STORM = fg.material('equipo_tormenta', (0.03, 0.52, 0.58), rough=0.28, emit=(0.01, 0.35, 0.42), strength=0.75)
FROST = fg.material('equipo_escarcha', (0.36, 0.78, 0.86), rough=0.22, emit=(0.16, 0.55, 0.7), strength=0.5)
FIRE = fg.material('equipo_fuego', (0.68, 0.09, 0.025), rough=0.36, emit=(0.5, 0.035, 0.005), strength=0.65)
EARTH = fg.material('equipo_tierra', (0.34, 0.24, 0.09), rough=0.84)
LEAF = fg.material('equipo_hoja', (0.08, 0.3, 0.16), rough=0.72)
NACRE = fg.material('equipo_nacar', (0.78, 0.76, 0.66), metallic=0.08, rough=0.24)
BLACK = fg.material('equipo_negro', (0.025, 0.025, 0.03), metallic=0.25, rough=0.52)
WHITE = fg.material('equipo_blanco', (0.82, 0.80, 0.70), rough=0.72)
VIOLET = fg.material('equipo_violeta', (0.30, 0.08, 0.34), rough=0.65)


def theme(item_id, item):
    text = f"{item_id} {item.get('name', '')} {item.get('description', '')}".lower()
    if any(word in text for word in ('torment', 'rayo', 'vendaval', 'ancón', 'ancon', 'bus')):
        return STORM, GOLD
    if any(word in text for word in ('escarcha', 'neblina', 'perlero', 'nácar', 'nacar', 'quebrada')):
        return FROST, NACRE
    if any(word in text for word in ('volcán', 'volcan', 'diablo', 'machetero')):
        return FIRE, BLACK
    if any(word in text for word in ('mangle', 'guayacán', 'guayacan', 'cocobolo', 'chonta', 'caña')):
        return LEAF, BRONZE
    if any(word in text for word in ('esclusa', 'locks', 'olla', 'hierro', 'titán', 'titan')):
        return IRON, BRONZE
    if any(word in text for word in ('roble', 'leñador', 'lenador', 'herrero', 'beneficio')):
        return EARTH, IRON
    return STEEL, BRONZE


def grip(builder, length=0.30, radius=0.032, cap=BRONZE):
    builder.tube((0, 0, -length / 2), (0, 0, length / 2), radius, radius * 0.92, LEATHER, sides=8)
    builder.tube((0, 0, -length / 2 - 0.035), (0, 0, -length / 2), radius * 1.45, radius * 1.1, cap, sides=8)


def sword(builder, item_id, item, length, width):
    accent, trim = theme(item_id, item)
    grip(builder, 0.30 if length < 1 else 0.42, 0.032 if length < 1 else 0.04, trim)
    guard_z = 0.17 if length < 1 else 0.23
    builder.tube((-width * 1.4, 0, guard_z), (width * 1.4, 0, guard_z), 0.026, 0.026, trim, sides=6)
    z0, z1 = guard_z + 0.025, guard_z + length
    if item_id == 'buccaneer_sabre':
        last = (0, 0, z0)
        for i in range(1, 9):
            t = i / 8
            q = (0.18 * t * t, 0, z0 + length * t)
            builder.tube(last, q, width * (1 - 0.35 * t), width * (1 - 0.35 * t), accent, sides=5, flat=0.28)
            last = q
        builder.tube((-0.14, 0, guard_z), (0.14, 0, guard_z), 0.022, 0.022, GOLD, sides=6)
        builder.tube((0.12, 0, guard_z), (0.16, 0, -0.03), 0.015, 0.015, GOLD, sides=6)
        return
    if item_id in ('rozador_machete', 'machetero_blade'):
        points = [(-width * 0.58, -0.018, z0), (width, -0.018, z0), (width * 1.22, -0.018, z1 * 0.90), (width * 0.35, -0.018, z1 + width * 1.1), (-width * 0.72, -0.018, z1 * 0.96)]
    else:
        points = [(-width, -0.012, z0), (width, -0.012, z0), (width * 0.72, -0.012, z1), (0, -0.012, z1 + width * 1.8), (-width * 0.72, -0.012, z1)]
    builder.poly(points, [(x, 0.012, z) for x, _, z in points], accent)
    builder.tube((0, 0, z0 + length * 0.18), (0, 0, z1 - 0.03), 0.009, 0.004, trim, sides=5)
    if item_id == 'volcano_sword':
        for z, x in ((z0 + length * 0.35, -0.028), (z0 + length * 0.58, 0.025), (z0 + length * 0.78, -0.018)):
            builder.blob((x, -0.016, z), (0.018, 0.010, 0.075), FIRE, subdiv=1)
    elif item_id == 'last_bus_blade':
        builder.box((0, -0.018, z0 + length * 0.58), (width * 0.85, 0.012, 0.06), STORM, rot=(math.radians(18), 'Y'))
    elif item_id in ('peeling_knife', 'diablo_knife', 'chonta_spike'):
        builder.tube((0, 0, guard_z - 0.03), (width * 1.5, 0, guard_z + 0.06), 0.012, 0.008, trim, sides=5)


def axe(builder, item_id, item):
    accent, trim = theme(item_id, item)
    builder.tube((0, 0, -0.22), (0, 0, 0.78), 0.036, 0.029, WOOD, sides=8)
    builder.tube((0, 0, -0.08), (0, 0, 0.02), 0.044, 0.044, LEATHER, sides=8)
    z0, z1 = 0.62, 0.94
    points = [(0, -0.025, z0), (0.27, -0.025, z0 + 0.05), (0.34, -0.025, z1), (0.03, -0.025, z1 - 0.02)]
    builder.poly(points, [(x, 0.025, z) for x, _, z in points], accent)
    builder.box((-0.06, 0, 0.79), (0.16, 0.11, 0.20), trim)
    if item_id == 'red_mangrove_axe':
        builder.tube((0, 0, 0.48), (-0.12, 0.02, 0.62), 0.018, 0.010, LEAF, sides=6)
        builder.tube((0, 0, 0.40), (0.10, -0.01, 0.52), 0.016, 0.009, LEAF, sides=6)
    elif item_id == 'gale_axe':
        builder.blob((-0.07, -0.07, 0.80), (0.055, 0.035, 0.075), STORM, subdiv=1)
        builder.tube((0.27, 0, z0 + 0.06), (0.38, 0, z1 + 0.05), 0.016, 0.006, STORM, sides=5)


def blunt(builder, item_id, item, hammer=False):
    accent, trim = theme(item_id, item)
    builder.tube((0, 0, -0.23), (0, 0, 0.73), 0.037, 0.031, DARK_WOOD, sides=8)
    builder.tube((0, 0, -0.09), (0, 0, 0.05), 0.046, 0.046, LEATHER, sides=8)
    if hammer and item_id == 'titan_maul':
        builder.blob((0, 0, 0.80), (0.38, 0.24, 0.25), EARTH, subdiv=1)
        for x in (-0.30, 0.30):
            builder.blob((x, 0, 0.80), (0.12, 0.18, 0.18), IRON, subdiv=1)
    elif hammer and item_id == 'coffee_mill_hammer':
        builder.tube((-0.30, 0, 0.78), (0.30, 0, 0.78), 0.12, 0.12, WOOD, sides=12)
        for x in (-0.24, 0.24):
            builder.tube((x - 0.025, 0, 0.78), (x + 0.025, 0, 0.78), 0.128, 0.128, GOLD, sides=12)
    elif hammer:
        builder.box((0, 0, 0.78), (0.52, 0.20, 0.22), accent)
        builder.tube((-0.31, 0, 0.78), (0.31, 0, 0.78), 0.105, 0.105, trim, sides=8)
    else:
        builder.blob((0, 0, 0.80), (0.16, 0.13, 0.20), accent, subdiv=1)
        for z in (0.69, 0.80, 0.91):
            builder.tube((-0.17, 0, z), (0.17, 0, z), 0.025, 0.025, trim, sides=6)


def pole(builder, item_id, item, spear=False, wand=False):
    accent, trim = theme(item_id, item)
    top = 0.62 if wand else 1.45
    builder.tube((0, 0, -0.22), (0, 0, top), 0.024 if wand else 0.032, 0.017 if wand else 0.022, WOOD, sides=8)
    builder.tube((0, 0, -0.10), (0, 0, 0.10), 0.037, 0.037, LEATHER, sides=8)
    if spear:
        points = [(-0.085, -0.018, top - 0.02), (0.085, -0.018, top - 0.02), (0, -0.018, top + 0.30)]
        builder.poly(points, [(x, 0.018, z) for x, _, z in points], accent)
        builder.tube((0, 0, top - 0.10), (0, 0, top + 0.02), 0.042, 0.032, trim, sides=8)
        if item_id == 'quetzal_spear':
            builder.poly([(-0.035, -0.02, top - 0.12), (-0.23, -0.02, top - 0.30), (-0.05, -0.02, top - 0.42)], [(-0.035, 0.02, top - 0.12), (-0.23, 0.02, top - 0.30), (-0.05, 0.02, top - 0.42)], LEAF)
            builder.poly([(0.035, -0.02, top - 0.14), (0.21, -0.02, top - 0.34), (0.05, -0.02, top - 0.44)], [(0.035, 0.02, top - 0.14), (0.21, 0.02, top - 0.34), (0.05, 0.02, top - 0.44)], STORM)
        elif item_id == 'pearl_diver_harpoon':
            builder.tube((0, 0, top + 0.12), (-0.11, 0, top + 0.02), 0.018, 0.007, NACRE, sides=5)
            builder.tube((0, 0, top + 0.12), (0.11, 0, top + 0.02), 0.018, 0.007, NACRE, sides=5)
        elif item_id == 'sentinel_spear':
            for z, material in ((top - 0.18, BRONZE), (top - 0.24, LEATHER), (top - 0.30, BRONZE)):
                builder.tube((0, 0, z - 0.02), (0, 0, z + 0.02), 0.038, 0.038, material, sides=8)
            builder.poly([(-0.035, -0.018, top - 0.28), (-0.20, -0.018, top - 0.43), (-0.04, -0.018, top - 0.47)], [(-0.035, 0.018, top - 0.28), (-0.20, 0.018, top - 0.43), (-0.04, 0.018, top - 0.47)], LEATHER)
    else:
        builder.blob((0, 0, top + 0.08), (0.10 if wand else 0.14, 0.08 if wand else 0.11, 0.13 if wand else 0.18), accent, subdiv=1)
        builder.tube((0, 0, top - 0.06), (0, 0, top + 0.06), 0.05, 0.035, trim, sides=8)
        if item_id == 'oak_staff':
            builder.tube((0, 0, top - 0.03), (-0.22, 0.01, top + 0.18), 0.035, 0.014, WOOD, sides=7)
            builder.blob((-0.24, 0.01, top + 0.20), (0.07, 0.025, 0.035), LEAF, subdiv=1)
        elif item_id == 'tulivieja_staff':
            builder.tube((0, 0, top - 0.04), (0.20, 0, top + 0.16), 0.032, 0.012, DARK_WOOD, sides=7)
            builder.tube((0.20, 0, top + 0.16), (0.10, 0, top + 0.31), 0.012, 0.006, DARK_WOOD, sides=6)
            builder.blob((0.10, -0.03, top + 0.33), (0.055, 0.035, 0.09), FROST, subdiv=1)


def orb(builder, item_id, item):
    accent, trim = theme(item_id, item)
    builder.tube((0, 0, -0.13), (0, 0, 0.06), 0.045, 0.035, LEATHER, sides=8)
    builder.blob((0, 0, 0.20), (0.18, 0.18, 0.18), accent, subdiv=2)
    for a in range(0, 360, 45):
        t = math.radians(a)
        builder.blob((0.19 * math.cos(t), 0, 0.20 + 0.19 * math.sin(t)), (0.025, 0.035, 0.025), trim, subdiv=1)
    if item_id == 'ancon_orb':
        builder.blob((0, -0.17, 0.20), (0.10, 0.025, 0.075), NACRE, subdiv=2)
        builder.blob((0, -0.195, 0.20), (0.035, 0.012, 0.047), BLACK, subdiv=2)
    elif item_id == 'mist_orb':
        for x, z, s in ((-0.14, 0.12, 0.08), (0.13, 0.15, 0.09), (-0.08, 0.31, 0.07), (0.08, 0.32, 0.08)):
            builder.blob((x, -0.10, z), (s, 0.06, s * 0.7), NACRE, subdiv=1)
    elif item_id == 'storm_orb':
        builder.tube((-0.25, 0, 0.20), (0.25, 0, 0.20), 0.016, 0.016, GOLD, sides=6)
        builder.tube((0, 0, -0.05), (0, 0, 0.45), 0.016, 0.016, GOLD, sides=6)


def bow(builder, item_id, item, crossbow=False):
    accent, trim = theme(item_id, item)
    builder.tube((0, 0, -0.16), (0, 0, 0.17), 0.04, 0.035, LEATHER, sides=8)
    if crossbow:
        builder.tube((0, 0, -0.20), (0, 0, 0.65), 0.05, 0.025, WOOD, sides=8)
        last = None
        for i in range(9):
            x = -0.55 + i * 0.1375
            q = (x, 0, 0.34 + 0.12 * (1 - (x / 0.55) ** 2))
            if last:
                builder.tube(last, q, 0.022, 0.022, accent, sides=6)
            last = q
        builder.tube((-0.55, 0, 0.34), (0, -0.08, 0.45), 0.005, 0.005, trim, sides=4)
        builder.tube((0, -0.08, 0.45), (0.55, 0, 0.34), 0.005, 0.005, trim, sides=4)
    else:
        last = None
        for i in range(13):
            z = -0.60 + i * 0.10
            x = 0.16 + 0.24 * abs(z / 0.60) ** 1.5
            q = (x, 0, z)
            if last:
                builder.tube(last, q, 0.018, 0.018, accent, sides=6)
            last = q
        builder.tube((0.40, 0, -0.60), (0.40, 0, 0.60), 0.004, 0.004, trim, sides=4)


def shield(builder, item_id, item, large=False):
    accent, trim = theme(item_id, item)
    w, h = (0.42, 0.55) if large else (0.32, 0.38)
    if item_id == 'pot_lid_shield':
        builder.tube((0, -0.075, 0), (0, 0.02, 0), w, w, IRON, sides=18)
        builder.blob((0, -0.12, 0), (0.11, 0.07, 0.11), BRONZE, subdiv=1)
        for a in range(0, 360, 45):
            t = math.radians(a)
            builder.blob((w * 0.78 * math.cos(t), -0.105, w * 0.78 * math.sin(t)), (0.025, 0.018, 0.025), BRONZE, subdiv=1)
        return
    if item_id in ('gourd_buckler', 'nacre_buckler', 'oak_buckler'):
        face = {'gourd_buckler': EARTH, 'nacre_buckler': NACRE, 'oak_buckler': WOOD}[item_id]
        builder.tube((0, -0.07, 0), (0, 0.02, 0), w, w, face, sides=14)
        builder.blob((0, -0.11, 0), (w * 0.30, 0.055, w * 0.30), trim, subdiv=1)
        if item_id == 'nacre_buckler':
            for a in range(0, 360, 60):
                t = math.radians(a)
                builder.blob((w * 0.72 * math.cos(t), -0.105, w * 0.72 * math.sin(t)), (0.032, 0.016, 0.032), FROST, subdiv=1)
        return
    if item_id == 'locks_shield':
        builder.box((0, -0.035, 0), (w * 1.75, 0.10, h * 1.8), IRON)
        for x in (-w * 0.55, 0, w * 0.55):
            builder.box((x, -0.095, 0), (0.045, 0.035, h * 1.65), BRONZE)
        for z in (-h * 0.50, h * 0.50):
            builder.box((0, -0.11, z), (w * 1.55, 0.04, 0.055), BRONZE)
        return
    if item_id == 'sentinel_shield':
        outline = [(-w, -0.07, h * 0.52), (-w * 0.82, -0.07, -h * 0.55), (0, -0.07, -h), (w * 0.82, -0.07, -h * 0.55), (w, -0.07, h * 0.52), (0, -0.07, h)]
        builder.poly(outline, [(x, 0.025, z) for x, _, z in outline], LEATHER)
        diamonds = [(-0.14, 0.24, BRONZE), (0.14, 0.24, STORM), (-0.14, -0.22, STORM), (0.14, -0.22, BRONZE)]
        for x, z, material in diamonds:
            pts = [(x, -0.11, z + 0.17), (x + 0.13, -0.11, z), (x, -0.11, z - 0.17), (x - 0.13, -0.11, z)]
            builder.poly(pts, [(px, -0.085, pz) for px, _, pz in pts], material)
        builder.blob((0, -0.14, 0), (0.085, 0.045, 0.085), GOLD, subdiv=1)
        return
    outline = [(-w, -0.07, h * 0.55), (-w * 0.82, -0.07, -h * 0.55), (0, -0.07, -h), (w * 0.82, -0.07, -h * 0.55), (w, -0.07, h * 0.55), (0, -0.07, h)]
    builder.poly(outline, [(x, 0.02, z) for x, _, z in outline], accent)
    builder.blob((0, -0.105, 0), (w * 0.34, 0.06, w * 0.34), trim, subdiv=1)
    for x in (-w * 0.72, w * 0.72):
        builder.tube((x, -0.105, -h * 0.35), (x, -0.105, h * 0.35), 0.022, 0.022, trim, sides=5)


def hood(builder, item_id):
    cloth = {
        'explorer_hood': EARTH,
        'apprentice_cowl': STORM,
        'darien_hood': LEAF,
        'fortuna_hood': VIOLET,
        'tulivieja_veil': FROST,
    }.get(item_id, LEATHER)
    builder.blob((0, 0.075, 0.035), (0.215, 0.135, 0.235), cloth, subdiv=2)
    builder.tube((-0.17, -0.035, -0.08), (-0.13, -0.085, 0.14), 0.026, 0.024, BRONZE, sides=6)
    builder.tube((0.17, -0.035, -0.08), (0.13, -0.085, 0.14), 0.026, 0.024, BRONZE, sides=6)
    builder.tube((-0.13, -0.085, 0.14), (0.13, -0.085, 0.14), 0.024, 0.024, BRONZE, sides=6)
    if item_id == 'explorer_hood':
        builder.box((0, -0.16, 0.17), (0.25, 0.08, 0.035), LEATHER, rot=(math.radians(-8), 'X'))
    elif item_id == 'apprentice_cowl':
        builder.blob((0, 0.03, 0.25), (0.045, 0.035, 0.07), STORM, subdiv=1)
        builder.tube((0, 0.03, 0.19), (0.11, 0.03, 0.29), 0.012, 0.005, GOLD, sides=5)
    elif item_id == 'darien_hood':
        for x in (-0.14, 0.14):
            builder.poly([(x, -0.11, 0.10), (x + 0.10 * (-1 if x < 0 else 1), -0.08, 0.02), (x, -0.08, -0.06)], [(px, -0.07, pz) for px, _, pz in [(x, 0, 0.10), (x + 0.10 * (-1 if x < 0 else 1), 0, 0.02), (x, 0, -0.06)]], LEAF)
    elif item_id == 'fortuna_hood':
        builder.tube((-0.18, -0.07, -0.05), (0.18, -0.07, -0.05), 0.028, 0.028, GOLD, sides=6)
    elif item_id == 'tulivieja_veil':
        builder.poly([(-0.18, 0.10, 0.10), (0.18, 0.10, 0.10), (0.24, 0.13, -0.48), (-0.24, 0.13, -0.48)], [(-0.18, 0.14, 0.10), (0.18, 0.14, 0.10), (0.24, 0.18, -0.48), (-0.24, 0.18, -0.48)], VIOLET)


def helmet(builder, item_id):
    shell = {'iron_helm': IRON, 'basalt_helm': BLACK, 'locks_helm': LEAF}.get(item_id, IRON)
    trim = BRONZE if item_id != 'basalt_helm' else FIRE
    builder.blob((0, 0.035, 0.055), (0.205, 0.17, 0.20), shell, subdiv=2)
    builder.tube((-0.22, 0, -0.03), (0.22, 0, -0.03), 0.025, 0.025, trim, sides=6)
    builder.box((0, -0.165, 0.025), (0.045, 0.035, 0.22), trim)
    if item_id == 'basalt_helm':
        builder.tube((0, 0.05, 0.20), (0, 0.06, 0.38), 0.055, 0.012, FIRE, sides=6)
    elif item_id == 'locks_helm':
        for x in (-0.13, 0.13):
            builder.box((x, -0.16, 0.03), (0.035, 0.035, 0.22), BRONZE)
        builder.box((0, -0.17, 0.15), (0.30, 0.035, 0.04), BRONZE)


def hat(builder, item_id):
    if item_id == 'diablo_mask':
        points = [(-0.17, -0.18, -0.18), (0.17, -0.18, -0.18), (0.20, -0.18, 0.14), (0, -0.18, 0.24), (-0.20, -0.18, 0.14)]
        builder.poly(points, [(x, -0.14, z) for x, _, z in points], FIRE)
        for x in (-0.12, 0.12):
            builder.tube((x, -0.16, 0.16), (x * 1.75, -0.10, 0.42), 0.035, 0.012, BLACK, sides=7)
        builder.blob((-0.07, -0.21, 0.04), (0.035, 0.018, 0.025), GOLD, subdiv=1)
        builder.blob((0.07, -0.21, 0.04), (0.035, 0.018, 0.025), GOLD, subdiv=1)
        return
    if item_id == 'pollera_tembleques':
        builder.tube((0, 0, -0.02), (0, 0, 0.02), 0.18, 0.18, GOLD, sides=14)
        for a in (-70, -35, 0, 35, 70):
            x = a / 360
            builder.tube((x, 0.02, 0.02), (x * 1.65, 0.04, 0.32 - abs(x) * 0.35), 0.007, 0.004, GOLD, sides=5)
            builder.blob((x * 1.65, 0.04, 0.32 - abs(x) * 0.35), (0.045, 0.020, 0.045), WHITE, subdiv=1)
        return
    crown = WHITE if item_id == 'machetero_hat' else EARTH
    builder.tube((0, 0, -0.035), (0, 0, 0.01), 0.34, 0.34, crown, sides=18)
    builder.tube((0, 0, 0.0), (0, 0, 0.18), 0.17, 0.14, crown, sides=14)
    builder.tube((0, 0, 0.08), (0, 0, 0.12), 0.178, 0.178, BLACK if item_id == 'machetero_hat' else LEATHER, sides=14)
    if item_id == 'machetero_hat':
        builder.tube((0, 0, -0.015), (0, 0, 0.005), 0.29, 0.29, BLACK, sides=18)


def cape(builder, item_id):
    material = {'straw_cape': EARTH, 'baru_cloud_cape': FROST, 'darien_cape': LEAF}[item_id]
    top = [(-0.22, 0.08, 0.04), (0.22, 0.08, 0.04), (0.38, 0.15, -0.78), (0, 0.18, -0.92), (-0.38, 0.15, -0.78)]
    back = [(x, y + 0.035, z) for x, y, z in top]
    builder.poly(top, back, material)
    builder.tube((-0.22, 0.06, 0.04), (0.22, 0.06, 0.04), 0.025, 0.025, BRONZE, sides=7)
    if item_id == 'straw_cape':
        for x in (-0.24, -0.08, 0.08, 0.24):
            builder.tube((x * 0.65, 0.105, -0.05), (x, 0.17, -0.75), 0.012, 0.006, GOLD, sides=5)
    elif item_id == 'baru_cloud_cape':
        for x, z, s in ((-0.24, -0.25, 0.12), (0, -0.18, 0.14), (0.24, -0.30, 0.11), (-0.10, -0.58, 0.10), (0.15, -0.62, 0.12)):
            builder.blob((x, 0.12, z), (s, 0.045, s * 0.65), WHITE, subdiv=1)
    elif item_id == 'darien_cape':
        for x, z in ((-0.22, -0.25), (0.18, -0.32), (-0.08, -0.58), (0.24, -0.68)):
            builder.poly([(x, 0.10, z + 0.10), (x + 0.09, 0.10, z), (x, 0.10, z - 0.10), (x - 0.09, 0.10, z)], [(px, 0.135, pz) for px, _, pz in [(x, 0, z + 0.10), (x + 0.09, 0, z), (x, 0, z - 0.10), (x - 0.09, 0, z)]], EARTH)


def make_item(item_id, item):
    kind = item.get('kind')
    builder = fg.Builder(f'obj_{item_id}')
    if kind in ('sword', 'greatsword', 'dagger'):
        length = {'dagger': 0.42, 'sword': 0.78, 'greatsword': 1.20}[kind]
        width = {'dagger': 0.055, 'sword': 0.075, 'greatsword': 0.105}[kind]
        sword(builder, item_id, item, length, width)
    elif kind == 'axe':
        axe(builder, item_id, item)
    elif kind in ('mace', 'hammer'):
        blunt(builder, item_id, item, hammer=kind == 'hammer')
    elif kind in ('staff', 'wand', 'spear'):
        pole(builder, item_id, item, spear=kind == 'spear', wand=kind == 'wand')
    elif kind == 'orb':
        orb(builder, item_id, item)
    elif kind in ('bow', 'crossbow'):
        bow(builder, item_id, item, crossbow=kind == 'crossbow')
    elif kind in ('buckler', 'shield'):
        shield(builder, item_id, item, large=kind == 'shield')
    elif item.get('slot') == 'head' and kind == 'hood':
        hood(builder, item_id)
    elif item.get('slot') == 'head' and kind == 'helmet':
        helmet(builder, item_id)
    elif item.get('slot') == 'head' and kind == 'hat':
        hat(builder, item_id)
    elif item.get('slot') == 'back' and kind == 'cape':
        cape(builder, item_id)
    else:
        raise ValueError(f'{item_id}: tipo visual no soportado: {kind}/{item.get("slot")}')
    obj = builder.object(scene)
    obj['itemId'] = item_id
    obj['slot'] = item['slot']
    obj['kind'] = kind
    return obj


objects = [
    make_item(item_id, item)
    for item_id, item in ITEMS.items()
    if item.get('slot') in ('weapon', 'offhand', 'head', 'back')
]
fg.export('equipo.glb', scene, objects)
print('nodos', len(objects), ','.join(obj.name for obj in objects))
