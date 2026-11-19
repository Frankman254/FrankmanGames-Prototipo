# Casas de geometría propia con puerta articulada: clips "Abrir" y "Cerrar".
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/casa.py
# Escribe assets/models/casa.glb y casa_dorada.glb. La puerta mira hacia -Y (+Z en el juego).
# Huella de 7 x 6 m: el juego la adapta al ancho y al fondo de cada casa en data/vegetation.json.
import math
import os
import random
import sys
import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

W, D = 7.0, 6.0
WALL_H, ROOF_H = 2.8, 1.9
DOOR_W, DOOR_H = 1.1, 2.0
TEX = 256


# --- Texturas pintadas por código (ENV-01): cal, teja, tabla y piedra, con el color de cada casa ---
def _periodica(size, cells, rng):
    grid = rng.random((cells, cells))
    t = np.arange(size) * cells / size
    i0 = np.floor(t).astype(int) % cells
    i1 = (i0 + 1) % cells
    f = t - np.floor(t)
    f = f * f * (3 - 2 * f)
    a = grid[np.ix_(i0, i0)] * (1 - f)[:, None] + grid[np.ix_(i1, i0)] * f[:, None]
    b = grid[np.ix_(i0, i1)] * (1 - f)[:, None] + grid[np.ix_(i1, i1)] * f[:, None]
    return a * (1 - f)[None, :] + b * f[None, :]


def _fractal(rng, start=4, octavas=4):
    out, amp, total = np.zeros((TEX, TEX)), 1.0, 0.0
    for k in range(octavas):
        out += _periodica(TEX, start * 2 ** k, rng) * amp
        total += amp
        amp *= 0.55
    return out / total


def _imagen(nombre, luz, rgb):
    """`luz` (filas de abajo arriba, 0..~1.2) por el color base; sRGB para el exportador."""
    img = np.ones((TEX, TEX, 4))
    for c in range(3):
        img[:, :, c] = np.clip(luz * rgb[c], 0, 1) ** (1 / 2.2)
    im = bpy.data.images.new(nombre, TEX, TEX, alpha=False)
    im.pixels.foreach_set(img.astype(np.float32).ravel())
    im.pack()
    return im


def cal(rgb, seed):
    """Pared encalada: manchas suaves y salpicado de tierra al pie. Se repite cada 4 m."""
    rng = np.random.default_rng(seed)
    luz = 1 + (_fractal(rng) - 0.5) * 0.16
    v = (np.arange(TEX) / TEX)[:, None]
    pie = np.clip(v / 0.11, 0, 1) ** 0.6  # 0,44 m de suelo salpicado (la pared empieza a 0,15)
    luz *= 0.72 + 0.28 * (pie + (1 - pie) * _fractal(rng, 16, 2))
    return luz


def teja(rgb, seed):
    """Hiladas de teja curva: sombra bajo cada hilada, juntas alternas y tono por pieza."""
    rng = np.random.default_rng(seed)
    filas, piezas = 8, 10
    v = np.arange(TEX)[:, None] / TEX * filas
    u = np.arange(TEX)[None, :] / TEX * piezas
    fila = np.floor(v).astype(int)
    fv = v - fila
    uu = u + (fila % 2) * 0.5
    col = np.floor(uu).astype(int) % piezas
    fu = uu - np.floor(uu)
    tono = rng.random((filas, piezas))[fila % filas, col] * 0.22 + 0.86
    curva = 0.82 + 0.3 * np.sin(fu * math.pi)  # lomo de la teja
    hilada = 0.6 + 0.4 * np.clip(fv / 0.28, 0, 1)  # sombra de la hilada de arriba
    return tono * curva * hilada * (1 + (_fractal(rng, 8, 3) - 0.5) * 0.12)


def tabla(rgb, seed, tablas=4):
    """Tablas verticales con vetas y juntas oscuras. Se repite cada metro."""
    rng = np.random.default_rng(seed)
    u = np.arange(TEX)[None, :] / TEX * tablas
    v = np.arange(TEX)[:, None] / TEX
    i = np.floor(u).astype(int)
    fu = u - i
    off = rng.random(tablas)[i % tablas]
    vetas = np.sin((fu * 7 + _fractal(rng, 4, 3) * 3 + off * 9) * math.pi * 2 + v * 1.5)
    luz = 0.88 + 0.08 * vetas + rng.random(tablas)[i % tablas] * 0.14 - 0.07
    junta = np.minimum(fu, 1 - fu)
    luz *= np.where(junta < 0.035, 0.55, 1.0)
    return luz * (1 + (_fractal(rng, 16, 2) - 0.5) * 0.1)


def piedra(rgb, seed, celdas=5):
    """Mampostería: piedras irregulares (Voronoi) con juntas de mortero."""
    rng = np.random.default_rng(seed)
    pts = (np.stack(np.meshgrid(np.arange(celdas), np.arange(celdas)), -1).reshape(-1, 2) + 0.15 + rng.random((celdas * celdas, 2)) * 0.7) / celdas
    tonos = rng.random(len(pts)) * 0.3 + 0.82
    y, x = np.mgrid[0:TEX, 0:TEX] / TEX
    d1 = np.full((TEX, TEX), 9.0)
    d2 = np.full((TEX, TEX), 9.0)
    idx = np.zeros((TEX, TEX), int)
    for k, (px, py) in enumerate(pts):
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                d = np.hypot(x - px - ox, y - py - oy)
                nuevo = d < d1
                d2 = np.where(nuevo, d1, np.minimum(d2, d))
                idx = np.where(nuevo, k, idx)
                d1 = np.where(nuevo, d, d1)
    borde = np.clip((d2 - d1) / 0.035, 0, 1)
    luz = tonos[idx] * (0.62 + 0.38 * borde) * (1 + (_fractal(rng, 8, 3) - 0.5) * 0.2)
    return luz


def con_textura(nombre, rgb, patron, seed, rough):
    m = fg.textured_material(nombre, _imagen(nombre + '_tex', patron(rgb, seed), rgb))
    next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Roughness'].default_value = rough
    return m


def uv_por_material(obj, metros):
    """Proyección por caras como fg.box_uv, con su escala según el material de cada cara."""
    me = obj.data
    uv = me.uv_layers.active or me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        m = metros.get(me.materials[poly.material_index].name, 1.0)
        n = poly.normal
        axis = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co
            if axis == 2:
                uv.data[li].uv = (c.x / m, c.y / m)
            elif axis == 0:
                uv.data[li].uv = (c.y / m, c.z / m)
            else:
                uv.data[li].uv = (c.x / m, c.z / m)


def build(filename, wall_rgb, roof_rgb, wood_rgb, trim_rgb, seed=1):
    scene = fg.reset()
    wall = con_textura('Pared', wall_rgb, cal, seed, 0.92)
    roof = con_textura('Tejado', roof_rgb, teja, seed + 1, 0.8)
    wood = con_textura('Madera', wood_rgb, tabla, seed + 2, 0.75)
    trim = fg.material('Remate', trim_rgb, rough=0.6)
    stone = con_textura('Piedra', (0.4, 0.38, 0.35), piedra, seed + 3, 0.95)
    planta = fg.material('Planta', (0.12, 0.34, 0.1), rough=0.9)
    flores = [fg.material(f'Flor{i}', c, rough=0.7) for i, c in enumerate(((0.85, 0.12, 0.3), (0.95, 0.75, 0.1), (0.9, 0.4, 0.75)))]
    rng = random.Random(seed)
    glass = fg.material('Ventana', (0.95, 0.72, 0.32), emit=(1.0, 0.62, 0.22), strength=1.2)
    dark = fg.material('Interior', (0.015, 0.012, 0.01), rough=1.0)
    hw, hd = W / 2, D / 2

    b = fg.Builder('FG_Casa')
    # Zócalo de piedra: baja bajo tierra para cubrir terreno en cuesta.
    b.box((0, 0, -0.45), (W + 0.16, D + 0.16, 1.5), stone)
    # Paredes con el hueco de la puerta.
    b.box((-(hw + DOOR_W / 2) / 2, -hd + 0.1, WALL_H / 2 + 0.15), (hw - DOOR_W / 2, 0.2, WALL_H - 0.3), wall)
    b.box(((hw + DOOR_W / 2) / 2, -hd + 0.1, WALL_H / 2 + 0.15), (hw - DOOR_W / 2, 0.2, WALL_H - 0.3), wall)
    b.box((0, -hd + 0.1, (WALL_H + DOOR_H + 0.1) / 2), (DOOR_W + 0.02, 0.2, WALL_H - DOOR_H - 0.1), wall)
    b.box((0, hd - 0.1, WALL_H / 2 + 0.15), (W, 0.2, WALL_H - 0.3), wall)
    for x in (-1, 1):
        b.box((x * (hw - 0.1), 0, WALL_H / 2 + 0.15), (0.2, D - 0.4, WALL_H - 0.3), wall)
    # Hueco oscuro detrás de la puerta.
    b.box((0, -hd + 0.45, 1.2), (DOOR_W + 0.4, 0.5, 2.4), dark)
    # Vigas: esquinas, dintel y solera.
    for x in (-1, 1):
        for y in (-1, 1):
            b.box((x * (hw - 0.02), y * (hd - 0.02), WALL_H / 2), (0.24, 0.24, WALL_H), wood)
    b.box((0, -hd - 0.01, WALL_H - 0.08), (W + 0.04, 0.2, 0.2), wood)
    b.box((0, hd + 0.01, WALL_H - 0.08), (W + 0.04, 0.2, 0.2), wood)
    for x in (-1, 1):
        b.box((x * (hw + 0.01), 0, WALL_H - 0.08), (0.2, D + 0.04, 0.2), wood)
    for x in (-1, 1):
        b.box((x * (DOOR_W / 2 + 0.07), -hd - 0.02, DOOR_H / 2 + 0.05), (0.14, 0.2, DOOR_H + 0.1), wood)
    b.box((0, -hd - 0.02, DOOR_H + 0.13), (DOOR_W + 0.42, 0.22, 0.16), wood)
    b.box((0, -hd - 0.3, 0.06), (DOOR_W + 0.7, 0.75, 0.12), stone)
    # Ventanas con marco y cruceta, que brillan de noche.
    for sx in (-1, 1):
        cx = sx * (hw * 0.58)
        b.box((cx, -hd - 0.005, 1.65), (0.85, 0.1, 0.85), wood)
        b.box((cx, -hd - 0.035, 1.65), (0.66, 0.08, 0.66), glass)
        b.box((cx, -hd - 0.055, 1.65), (0.06, 0.06, 0.68), wood)
        b.box((cx, -hd - 0.055, 1.65), (0.68, 0.06, 0.06), wood)
        b.box((cx, -hd - 0.11, 1.17), (0.95, 0.22, 0.07), wood)
        # jardinera con matas y flores bajo la ventana
        b.box((cx, -hd - 0.2, 1.06), (0.9, 0.3, 0.2), wood)
        for k in range(5):
            x = cx - 0.34 + k * 0.17
            b.blob((x, -hd - 0.2, 1.2), (0.11, 0.1, 0.09), planta, subdiv=1)
            b.blob((x + 0.04, -hd - 0.26, 1.27 + rng.random() * 0.04), (0.05, 0.05, 0.04), flores[(k + (sx > 0)) % 3], subdiv=1)
        b.box((sx * (hw + 0.005), 0.3, 1.65), (0.1, 0.8, 0.8), wood)
        b.box((sx * (hw + 0.03), 0.3, 1.65), (0.08, 0.6, 0.6), glass)
    # canecillos: puntas de las vigas del techo asomando bajo el alero
    for x in range(-3, 4):
        for sy in (-1, 1):
            b.box((x * 1.0, sy * (hd + 0.2), WALL_H + 0.0), (0.12, 0.42, 0.12), wood)
    # Tejado a dos aguas con alero, y hastiales de pared.
    over_x, over_y = 0.4, 0.45
    front = (-W / 2 - over_x, -D / 2 - over_y, WALL_H - 0.1)
    b.poly(
        [(-hw - over_x, -hd - over_y, WALL_H - 0.1), (-hw - over_x, hd + over_y, WALL_H - 0.1), (-hw - over_x, 0, WALL_H + ROOF_H)],
        [(hw + over_x, -hd - over_y, WALL_H - 0.1), (hw + over_x, hd + over_y, WALL_H - 0.1), (hw + over_x, 0, WALL_H + ROOF_H)],
        roof,
    )
    b.box((0, 0, WALL_H + ROOF_H + 0.03), (W + over_x * 2 + 0.1, 0.22, 0.14), trim)
    # Tejas: hileras en relieve en las dos aguas.
    slope = math.atan2(ROOF_H + 0.1, hd + over_y)
    for sy in (-1, 1):
        for i in range(1, 5):
            t = i / 5
            y = sy * (hd + over_y) * (1 - t)
            z = WALL_H - 0.1 + (ROOF_H + 0.1) * t + 0.02
            b.box((0, y, z), (W + over_x * 2 + 0.02, 0.1, 0.06), roof, rot=(sy * slope, 'X'))
    # Chimenea.
    b.box((hw * 0.5, hd * 0.35, WALL_H + ROOF_H * 0.72), (0.65, 0.65, 1.7), stone)
    b.box((hw * 0.5, hd * 0.35, WALL_H + ROOF_H * 0.72 + 0.88), (0.78, 0.78, 0.12), trim)
    house = b.object(scene)
    uv_por_material(house, {'Pared': 4.0, 'Tejado': 1.6, 'Madera': 1.0, 'Piedra': 1.4})

    # Puerta: pieza aparte con el pivote en su bisagra izquierda.
    d = fg.Builder('FG_Casa_Puerta')
    hinge = (-DOOR_W / 2, -hd + 0.02, 0)
    y = -hd + 0.02
    for i in range(4):
        pw = DOOR_W / 4
        d.box((-DOOR_W / 2 + pw * (i + 0.5), y, DOOR_H / 2 + 0.05), (pw - 0.012, 0.07, DOOR_H - 0.02), wood)
    for z in (0.45, DOOR_H - 0.35):
        d.box((0, y - 0.04, z), (DOOR_W - 0.04, 0.03, 0.09), trim)
    d.blob((DOOR_W / 2 - 0.13, y - 0.07, 1.05), (0.05, 0.05, 0.05), trim, subdiv=1)
    door = d.object(scene, parent=house, location=hinge)
    uv_por_material(door, {'Madera': 1.0})
    door.rotation_mode = 'XYZ'
    abrir = fg.key_rotation(door, 'Abrir', [(1, 0), (5, -8), (16, 112), (21, 100), (25, 104)], axis=2)
    cerrar = fg.key_rotation(door, 'Cerrar', [(1, 104), (14, -3), (17, 1.5), (20, 0)], axis=2)
    fg.to_tracks(door, [abrir, cerrar])
    door.rotation_euler = (0, 0, 0)
    fg.export(filename, scene, [house, door], imagenes='JPEG')


# Casa de cal, teja y marcos azules, como las de los pueblos de Azuero.
build('casa.glb', (0.88, 0.84, 0.74), (0.54, 0.23, 0.13), (0.16, 0.3, 0.42), (0.86, 0.82, 0.72))
build('casa_dorada.glb', (0.68, 0.56, 0.32), (0.55, 0.36, 0.08), (0.2, 0.09, 0.05), (0.85, 0.66, 0.2), seed=7)
