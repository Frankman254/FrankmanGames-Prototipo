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
PINTADAS = os.path.join(ROOT, 'assets', 'textures', 'pintadas')


def pint(name, textura, metallic=0.0, rough=0.82):
    """Material con una textura pintada de fg_pintura.py; la UV la pone fg.box_uv en cada objeto."""
    image = bpy.data.images.load(os.path.join(PINTADAS, f'{textura}.png'), check_existing=True)
    mat = fg.textured_material(name, image)
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = rough
    return mat


WOOD = pint('equipo_madera', 'madera_asta')
DARK_WOOD = pint('equipo_madera_oscura', 'madera_oscura')
LIGHT_WOOD = pint('equipo_madera_clara', 'madera_clara')
LEATHER = pint('equipo_cuero', 'cuero_castano')
DARK_LEATHER = pint('equipo_cuero_oscuro', 'cuero_oscuro')
IRON = pint('equipo_hierro', 'hierro_pintado', metallic=0.45, rough=0.5)
STEEL = pint('equipo_acero', 'hierro_pintado', metallic=0.62, rough=0.34)
BRONZE = pint('equipo_bronce', 'bronce_pintado', metallic=0.5, rough=0.42)
GOLD = pint('equipo_oro', 'oro_pintado', metallic=0.55, rough=0.36)
STORM = fg.material('equipo_tormenta', (0.03, 0.52, 0.58), rough=0.28, emit=(0.01, 0.35, 0.42), strength=0.75)
TURQUOISE = fg.material('equipo_turquesa', (0.025, 0.48, 0.44), metallic=0.08, rough=0.32)
AMBER = fg.material('equipo_ambar', (0.95, 0.30, 0.025), metallic=0.10, rough=0.26, emit=(0.72, 0.10, 0.005), strength=0.8)
FROST = fg.material('equipo_escarcha', (0.36, 0.78, 0.86), rough=0.22, emit=(0.16, 0.55, 0.7), strength=0.5)
FIRE = fg.material('equipo_fuego', (0.68, 0.09, 0.025), rough=0.36, emit=(0.5, 0.035, 0.005), strength=0.65)
EARTH = fg.material('equipo_tierra', (0.34, 0.24, 0.09), rough=0.84)
LEAF = pint('equipo_hoja', 'tela_musgo')
NACRE = fg.material('equipo_nacar', (0.78, 0.76, 0.66), metallic=0.08, rough=0.24)
BLACK = fg.material('equipo_negro', (0.025, 0.025, 0.03), metallic=0.25, rough=0.52)
WHITE = pint('equipo_blanco', 'tela_blanca')
VIOLET = pint('equipo_violeta', 'tela_violeta')
PALM = pint('equipo_palma', 'palma_tejida', rough=0.9)
CORAL = pint('equipo_coral', 'tela_coral')
MOLA = pint('equipo_mola', 'mola_coral_zigzag')
FEATHER = pint('equipo_pluma', 'plumas_guacamaya')


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
    if crossbow:
        builder.tube((0, 0, -0.16), (0, 0, 0.17), 0.04, 0.035, LEATHER, sides=8)
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
        long_bow(builder, item_id, accent)


BOWS = {
    # longitud de cada pala, flecha de la curva hacia -Y, grosor en el agarre, madera
    'reed_bow': (0.52, 0.11, 0.018, 'reed'),
    'cane_bow': (0.60, 0.13, 0.021, 'cane'),
    'mangrove_bow': (0.62, 0.12, 0.024, 'mangrove'),
    'darien_bow': (0.64, 0.14, 0.022, 'darien'),
}


def long_bow(builder, item_id, accent):
    """Arco sujeto por el centro: palas a lo largo de Z, curva y cuerda hacia -Y."""
    length, sag, thick, style = BOWS.get(item_id, (0.60, 0.13, 0.021, 'darien'))
    wood = {'reed': LIGHT_WOOD, 'cane': LIGHT_WOOD, 'mangrove': DARK_WOOD, 'darien': WOOD}[style]

    def at(t):
        y = -sag * t * t
        if style == 'mangrove' and abs(t) > 0.78:
            y += 0.42 * sag * ((abs(t) - 0.78) / 0.22) ** 2
        return (0.0, y, length * t)

    steps = 16
    prev = at(-1.0)
    for i in range(1, 2 * steps + 1):
        t = -1.0 + i / steps
        q = at(t)
        r0 = thick * (1 - 0.5 * abs(t - 1 / steps))
        r1 = thick * (1 - 0.5 * abs(t))
        builder.tube(prev, q, r0, r1, wood, sides=7, flat=0.75)
        prev = q
    tip_lo, tip_hi = at(-1.0), at(1.0)
    builder.tube(tip_lo, tip_hi, 0.0035, 0.0035, WHITE, sides=4)
    wrap = CORAL if style == 'mangrove' else LEATHER
    builder.tube((0, 0, -0.075), (0, 0, 0.075), thick * 1.45, thick * 1.45, wrap, sides=8)
    builder.tube((0, -0.012, 0.075), (0, -0.012, 0.095), thick * 1.25, thick * 0.9, BRONZE if style != 'reed' else WHITE, sides=7)
    for tip in (tip_lo, tip_hi):
        builder.blob(tip, (thick * 0.9, thick * 0.9, thick * 1.5), BLACK if style == 'mangrove' else BRONZE, subdiv=1)
    if style == 'reed':
        for t in (-0.55, 0.55):
            x, y, z = at(t)
            builder.tube((x, y, z - 0.02), (x, y, z + 0.02), thick * 1.25, thick * 1.25, WHITE, sides=6)
    elif style == 'cane':
        for t in (-0.75, -0.45, -0.2, 0.2, 0.45, 0.75):
            x, y, z = at(t)
            r = thick * (1 - 0.5 * abs(t)) * 1.3
            builder.tube((x, y, z - 0.012), (x, y, z + 0.012), r, r, BRONZE, sides=7)
    elif style == 'mangrove':
        for t, dx in ((-0.4, 0.018), (0.32, -0.016), (0.62, 0.012)):
            x, y, z = at(t)
            builder.blob((x + dx, y + 0.006, z), (0.016, 0.014, 0.024), DARK_WOOD, subdiv=1)
        builder.tube((0, 0.01, -0.08), (0.03, 0.03, -0.20), 0.004, 0.004, CORAL, sides=4)
        builder.blob((0.035, 0.035, -0.24), (0.012, 0.006, 0.05), FEATHER, subdiv=1)
    else:
        for t in (-0.6, 0.6):
            x, y, z = at(t)
            builder.tube((x, y, z - 0.025), (x, y, z + 0.025), thick * 1.3, thick * 1.3, accent, sides=6)


def weapon_signature(builder, item_id):
    """Rasgos que enlazan cada malla con su icono, sin hornear el marco de inventario."""
    # Un lenguaje artesanal compartido: cobre envejecido, fibra, turquesa y coral.
    if item_id in ('short_sword', 'rozador_machete', 'machetero_blade', 'sentinel_spear'):
        for z, material in ((-0.11, TURQUOISE), (-0.045, CORAL), (0.02, TURQUOISE)):
            builder.tube((0, 0, z - 0.010), (0, 0, z + 0.010), 0.043, 0.043, material, sides=8)
    elif item_id in ('woodcutter_axe', 'red_mangrove_axe'):
        builder.tube((0, 0, 0.12), (0, 0, 0.19), 0.043, 0.043, TURQUOISE if item_id == 'woodcutter_axe' else LEAF, sides=8)
        builder.blob((0.055, 0, 0.08), (0.025, 0.018, 0.040), CORAL, subdiv=1)
    elif item_id == 'smith_mace':
        # Cabeza estrellada oscura, como la lectura frontal del icono.
        for a in range(0, 360, 60):
            t = math.radians(a)
            builder.tube((0.13 * math.cos(t), 0, 0.80 + 0.13 * math.sin(t)),
                         (0.25 * math.cos(t), 0, 0.80 + 0.25 * math.sin(t)),
                         0.050, 0.010, BLACK, sides=5)
        builder.tube((0, 0, 0.52), (0, 0, 0.60), 0.045, 0.045, TURQUOISE, sides=8)
    elif item_id in ('oak_staff', 'mangrove_root_wand'):
        builder.blob((-0.09, -0.015, 1.58 if item_id == 'oak_staff' else 0.70), (0.055, 0.025, 0.028), LEAF, subdiv=1)
        builder.blob((0.07, -0.02, 1.62 if item_id == 'oak_staff' else 0.76), (0.042, 0.022, 0.024), LEAF, subdiv=1)
    elif item_id == 'copper_wand':
        builder.blob((0, 0, 0.78), (0.070, 0.050, 0.105), TURQUOISE, subdiv=2)
        for a in range(0, 360, 120):
            t = math.radians(a)
            builder.tube((0.055 * math.cos(t), 0, 0.70 + 0.025 * math.sin(t)),
                         (0.075 * math.cos(t), 0, 0.79 + 0.035 * math.sin(t)),
                         0.014, 0.008, GOLD, sides=5)
    elif item_id in ('storm_orb', 'mist_orb', 'ancon_orb'):
        glow = GOLD if item_id == 'storm_orb' else (WHITE if item_id == 'mist_orb' else LEAF)
        builder.tube((-0.10, -0.185, 0.12), (0.03, -0.195, 0.23), 0.012, 0.006, glow, sides=5)
        builder.tube((0.03, -0.195, 0.23), (-0.02, -0.195, 0.31), 0.010, 0.005, glow, sides=5)
    elif item_id in ('guayacan_club', 'chonta_spike'):
        for z in (0.16, 0.23, 0.30):
            builder.tube((0, 0, z - 0.010), (0, 0, z + 0.010), 0.043, 0.043, TURQUOISE, sides=8)
    elif item_id in ('cane_crossbow', 'lookout_crossbow'):
        builder.box((0, -0.055, 0.27), (0.075, 0.035, 0.12), BRONZE)
        builder.blob((0, -0.10, 0.42), (0.035, 0.025, 0.035), TURQUOISE, subdiv=1)
    elif item_id == 'diablo_knife':
        builder.poly([(-0.11, -0.030, 0.18), (0.11, -0.030, 0.18), (0.07, -0.030, 0.31), (-0.07, -0.030, 0.31)],
                     [(-0.11, 0.030, 0.18), (0.11, 0.030, 0.18), (0.07, 0.030, 0.31), (-0.07, 0.030, 0.31)], CORAL)
        builder.blob((0, -0.045, 0.25), (0.040, 0.018, 0.040), GOLD, subdiv=1)
    elif item_id == 'coffee_mill_hammer':
        builder.tube((0.05, -0.12, 0.93), (0.18, -0.12, 1.06), 0.018, 0.015, GOLD, sides=6)
        builder.blob((0.20, -0.12, 1.08), (0.040, 0.035, 0.040), DARK_WOOD, subdiv=1)
    elif item_id == 'quetzal_spear':
        for side, material in ((-1, STORM), (1, LEAF)):
            builder.poly([(0.02 * side, -0.03, 1.35), (0.22 * side, -0.03, 1.16), (0.05 * side, -0.03, 1.08)],
                         [(0.02 * side, 0.01, 1.35), (0.22 * side, 0.01, 1.16), (0.05 * side, 0.01, 1.08)], material)
    elif item_id == 'volcano_sword':
        builder.tube((-0.025, -0.030, 0.43), (0.025, -0.030, 0.70), 0.014, 0.010, FIRE, sides=5)
        builder.tube((0.025, -0.030, 0.70), (-0.018, -0.030, 0.94), 0.011, 0.007, FIRE, sides=5)
    elif item_id == 'buccaneer_sabre':
        builder.blob((0.12, -0.03, 0.18), (0.035, 0.022, 0.035), BLACK, subdiv=2)
    elif item_id == 'pearl_diver_harpoon':
        builder.tube((0, 0.045, 0.30), (0, 0.045, 0.65), 0.012, 0.012, WHITE, sides=5)
    elif item_id == 'gale_axe':
        for x, z in ((0.12, 0.78), (0.22, 0.86), (0.15, 0.94)):
            builder.blob((x, -0.04, z), (0.060, 0.018, 0.025), TURQUOISE, subdiv=1)
    elif item_id == 'titan_maul':
        for x in (-0.27, 0.27):
            builder.tube((x, 0, 0.61), (x, 0, 0.99), 0.025, 0.025, BRONZE, sides=6)
    elif item_id == 'tulivieja_staff':
        builder.blob((0.10, -0.04, 1.80), (0.050, 0.030, 0.085), TURQUOISE, subdiv=2)
    elif item_id == 'last_bus_blade':
        builder.tube((0, -0.030, 0.37), (0, -0.030, 1.26), 0.012, 0.006, AMBER, sides=5)
    elif item_id in ('reed_bow', 'cane_bow', 'mangrove_bow', 'darien_bow'):
        bead = WHITE if item_id == 'reed_bow' else (BRONZE if item_id == 'cane_bow' else TURQUOISE)
        builder.blob((0.03, 0.015, -0.12), (0.018, 0.012, 0.030), bead, subdiv=1)


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


def bandana(builder):
    """Pañuelo de algodón ceñido a la cabeza, con cenefa de mola y el nudo atrás (+Y)."""
    builder.blob((0, 0.025, 0.045), (0.214, 0.208, 0.172), CORAL, subdiv=3)
    builder.tube((0, 0.0, -0.035), (0, 0.0, 0.03), 0.224, 0.222, MOLA, sides=20)
    builder.blob((0, 0.225, -0.01), (0.05, 0.035, 0.042), CORAL, subdiv=2)
    for side in (-1, 1):
        top = [(side * 0.012, 0.235, -0.02), (side * 0.05, 0.24, -0.03), (side * 0.11, 0.30, -0.21), (side * 0.07, 0.29, -0.23)]
        builder.poly(top, [(x, y + 0.012, z) for x, y, z in top], CORAL)


def hood(builder, item_id):
    if item_id == 'cotton_bandana':
        bandana(builder)
        return
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
    if item_id == 'palm_cap':
        palm_cap(builder)
        return
    if item_id == 'leather_cap':
        leather_cap(builder)
        return
    crown = WHITE if item_id == 'machetero_hat' else PALM
    builder.tube((0, 0, -0.035), (0, 0, 0.01), 0.34, 0.34, crown, sides=18)
    builder.tube((0, 0, 0.0), (0, 0, 0.18), 0.17, 0.14, crown, sides=14)
    builder.tube((0, 0, 0.08), (0, 0, 0.12), 0.178, 0.178, BLACK if item_id == 'machetero_hat' else LEATHER, sides=14)
    if item_id == 'machetero_hat':
        builder.tube((0, 0, -0.015), (0, 0, 0.005), 0.29, 0.29, BLACK, sides=18)


def visor(builder, material, r0, r1, z, front=-1, span=150, steps=10, droop=0.03):
    """Visera en media luna hacia `front`·Y, hecha de cuñas convexas para que no se tuerza."""
    a0 = math.radians(-90 - span / 2) if front < 0 else math.radians(90 - span / 2)
    for k in range(steps):
        t0 = a0 + math.radians(span) * k / steps
        t1 = a0 + math.radians(span) * (k + 1) / steps
        quad = [(r0 * math.cos(t0), r0 * math.sin(t0), z), (r1 * math.cos(t0), r1 * math.sin(t0), z - droop),
                (r1 * math.cos(t1), r1 * math.sin(t1), z - droop), (r0 * math.cos(t1), r0 * math.sin(t1), z)]
        builder.poly(quad, [(x, y, zz + 0.014) for x, y, zz in quad], material)


def palm_cap(builder):
    """Gorro tejido de palma: cúpula baja, ala corta enrollada y cinta de mola."""
    builder.blob((0, 0.01, 0.02), (0.218, 0.212, 0.175), PALM, subdiv=3)
    builder.tube((0, 0.01, -0.045), (0, 0.01, -0.01), 0.252, 0.236, PALM, sides=22)
    builder.tube((0, 0.01, -0.012), (0, 0.01, 0.03), 0.226, 0.222, MOLA, sides=22)
    builder.blob((0, 0.01, 0.19), (0.04, 0.04, 0.025), PALM, subdiv=1)
    for side in (-1, 1):
        builder.tube((side * 0.17, 0.10, 0.0), (side * 0.215, 0.13, -0.10), 0.008, 0.004, CORAL, sides=5)


def leather_cap(builder):
    """Gorra de cuero curtido: seis gajos cosidos, botón arriba y visera hacia -Y."""
    builder.blob((0, 0.015, 0.01), (0.216, 0.21, 0.168), LEATHER, subdiv=3)
    for a in range(0, 360, 60):
        t = math.radians(a)
        last = None
        for i in range(7):
            phi = math.radians(90 * i / 6)
            q = (0.219 * math.cos(phi) * math.cos(t), 0.015 + 0.213 * math.cos(phi) * math.sin(t), 0.01 + 0.171 * math.sin(phi))
            if last:
                builder.tube(last, q, 0.0045, 0.0045, DARK_LEATHER, sides=4)
            last = q
    builder.tube((0, 0.015, -0.03), (0, 0.015, 0.012), 0.224, 0.222, DARK_LEATHER, sides=22)
    builder.blob((0, 0.015, 0.182), (0.03, 0.03, 0.018), BRONZE, subdiv=1)
    visor(builder, LEATHER, 0.19, 0.33, -0.02, front=-1, span=140, droop=0.04)
    for side in (-1, 1):
        builder.blob((side * 0.205, 0.03, -0.005), (0.012, 0.012, 0.012), BRONZE, subdiv=1)


def palm_cape(builder):
    """Capa de pencas de palma: cinco hileras de hojas secas que se solapan como un tejado."""
    builder.tube((-0.23, 0.07, 0.035), (0.23, 0.07, 0.035), 0.022, 0.022, LEATHER, sides=7)
    builder.blob((0, 0.045, 0.035), (0.035, 0.022, 0.03), CORAL, subdiv=1)
    rows = 5
    for row in range(rows):
        z_top = 0.03 - row * 0.17
        y = 0.085 + row * 0.022
        half = 0.22 + row * 0.04
        count = 6 + row
        length = 0.30 + row * 0.015
        for k in range(count):
            x = -half + 2 * half * (k + 0.5) / count + (0.012 if row % 2 else -0.012)
            lean = x * 0.18
            w = half / count * 1.25
            leaf = [(x - w, y, z_top), (x + w, y, z_top), (x + w * 0.8 + lean, y + 0.02, z_top - length * 0.6),
                    (x + lean * 1.4, y + 0.03, z_top - length), (x - w * 0.8 + lean, y + 0.02, z_top - length * 0.6)]
            builder.poly(leaf, [(px, py + 0.01, pz) for px, py, pz in leaf], LIGHT_WOOD if (k + row) % 3 else PALM)
            builder.tube((x, y - 0.002, z_top - 0.01), (x + lean * 1.3, y + 0.025, z_top - length * 0.92), 0.004, 0.002, WOOD, sides=4)
    builder.tube((-0.22, 0.095, -0.06), (0.22, 0.095, -0.06), 0.006, 0.006, CORAL, sides=5)


def cape(builder, item_id):
    if item_id == 'palm_cape':
        palm_cape(builder)
        return
    material = {'straw_cape': PALM, 'baru_cloud_cape': FROST, 'darien_cape': LEAF}[item_id]
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
    if item.get('slot') == 'weapon':
        weapon_signature(builder, item_id)
    obj = builder.object(scene)
    fg.box_uv(obj, 0.22)
    obj['itemId'] = item_id
    obj['slot'] = item['slot']
    obj['kind'] = kind
    return obj


objects = [
    make_item(item_id, item)
    for item_id, item in ITEMS.items()
    if item.get('slot') in ('weapon', 'offhand', 'head', 'back')
]
fg.export('equipo.glb', scene, objects, imagenes='JPEG')
print('nodos', len(objects), ','.join(obj.name for obj in objects))
