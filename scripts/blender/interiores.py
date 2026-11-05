# Interiores y fachada del banco: casa, taller, salón del castillo y Banco del Cruce.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/interiores.py
# También se ejecuta dentro de Blender por MCP: trabaja en la escena "Interiores" y no toca las demás.
# Escribe assets/models/interiores.glb y assets/textures/tablas.png, yeso.png y madera.png.
# Coordenadas como en el juego: cada sala va de (0, 0) a (ancho, fondo), con la salida en z = 0.
# Una pieza lleva un solo material; el juego le pone color y textura por su nombre.
# Las medidas de lo que bloquea el paso están en src/scenes/houseScene.ts y bankScene.ts.
import importlib
import math
import os
import shutil
import sys
import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)

TEXTURES = os.path.normpath(os.path.join(fg.MODELS, '..', 'textures'))


def B(x, y, z):
    # El exportador pasa y de Blender a -z de glTF, y el cargador vuelve a invertir z.
    return (x, z, y)


# --- Texturas ---


def periodic_noise(size, cells_x, cells_y, rng):
    """Ruido suave que se repite sin costura; más celdas en un eje lo estira en el otro."""
    grid = rng.random((cells_y, cells_x))

    def axis(n, cells):
        t = np.arange(n) * cells / n
        i0 = t.astype(int) % cells
        f = t - np.floor(t)
        return i0, (i0 + 1) % cells, f * f * (3 - 2 * f)

    y0, y1, fy = axis(size, cells_y)
    x0, x1, fx = axis(size, cells_x)
    top = grid[np.ix_(y0, x0)] * (1 - fx) + grid[np.ix_(y0, x1)] * fx
    bottom = grid[np.ix_(y1, x0)] * (1 - fx) + grid[np.ix_(y1, x1)] * fx
    return top * (1 - fy)[:, None] + bottom * fy[:, None]


def save_gray(name, values):
    os.makedirs(TEXTURES, exist_ok=True)
    h, w = values.shape
    px = np.ones((h, w, 4), dtype=np.float32)
    px[..., 0] = values
    px[..., 1] = values * 0.985
    px[..., 2] = values * 0.96
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = os.path.join(TEXTURES, name + '.png')
    img.file_format = 'PNG'
    img.save()
    return img


def wood_grain(size, rng):
    """Veta alargada en el eje X."""
    return periodic_noise(size, 3, 40, rng) * 0.55 + periodic_noise(size, 8, 110, rng) * 0.3 + periodic_noise(size, 4, 12, rng) * 0.15


def boards_texture(size=512, rows=6):
    rng = np.random.default_rng(11)
    y, x = np.mgrid[0:size, 0:size]
    row_h = size / rows
    row = (y / row_h).astype(int)
    shift = (rng.random(rows) * size)[row]
    length = size / 2
    sx = (x + shift) % size
    plank = (sx / length).astype(int)
    edge = np.minimum(np.minimum(y % row_h, row_h - y % row_h), np.minimum(sx % length, length - sx % length))
    mask = np.clip((edge - 1.5) / 3.5, 0, 1)
    tones = rng.random((rows, 2)) * 0.2 + 0.74
    body = tones[row, plank] * (0.78 + 0.42 * wood_grain(size, rng))
    return save_gray('tablas', np.clip(0.22 + (body - 0.22) * mask, 0, 1))


def plaster_texture(size=512):
    rng = np.random.default_rng(29)
    v = periodic_noise(size, 5, 5, rng) * 0.5 + periodic_noise(size, 22, 22, rng) * 0.3 + periodic_noise(size, 90, 90, rng) * 0.2
    return save_gray('yeso', np.clip(0.8 + (v - 0.5) * 0.3, 0, 1))


def wood_texture(size=256):
    rng = np.random.default_rng(37)
    return save_gray('madera', np.clip(0.62 + wood_grain(size, rng) * 0.42, 0, 1))


# Sin ventana, fresh_scene vacía el archivo: va antes de crear las imágenes.
scene = fg.fresh_scene('Interiores')
tablas = boards_texture()
yeso = plaster_texture()
madera = wood_texture()
muro_path = os.path.join(TEXTURES, 'muro.png')
baldosa_path = os.path.join(TEXTURES, 'baldosa.png')
muro = bpy.data.images.load(muro_path, check_existing=True)
baldosa = bpy.data.images.load(baldosa_path, check_existing=True)

# --- Materiales de revisión: en el juego los pone el código, según el nombre de la pieza ---

M = {
    'tablas': fg.textured_material('rev_tablas', tablas),
    'yeso': fg.textured_material('rev_yeso', yeso),
    'madera': fg.textured_material('rev_madera', madera),
    'muro': fg.textured_material('rev_muro', muro),
    'baldosa': fg.textured_material('rev_baldosa', baldosa),
    'tela': fg.material('rev_tela', (0.46, 0.17, 0.14), rough=1),
    'manta': fg.material('rev_manta', (0.2, 0.34, 0.4), rough=1),
    'sabana': fg.material('rev_sabana', (0.78, 0.71, 0.6), rough=1),
    'barro': fg.material('rev_barro', (0.62, 0.34, 0.2)),
    'hierro': fg.material('rev_hierro', (0.24, 0.25, 0.27), metallic=0.2, rough=0.5),
    'laton': fg.material('rev_laton', (0.76, 0.57, 0.18), metallic=0.2, rough=0.4),
    'dorado': fg.material('rev_dorado', (0.78, 0.6, 0.22), metallic=0.2, rough=0.4),
    'luz': fg.material('rev_luz', (1, 0.82, 0.5), emit=(1, 0.72, 0.35), strength=2),
    'techo': fg.material('rev_techo', (0.24, 0.37, 0.35)),
}
parts = []


# Alfombras y cenefas: casillas de la biblioteca (arte/patrones/), copiadas a assets/textures/.
PATTERNS = os.path.normpath(os.path.join(fg.MODELS, '..', '..', 'arte', 'patrones'))
for pattern in ('zigzag_tierra', 'escalones_tierra', 'rombos_dorado', 'rombos_tierra', 'anidados_dorado', 'estrella_dorado'):
    shutil.copyfile(os.path.join(PATTERNS, pattern + '.png'), os.path.join(TEXTURES, f'patron_{pattern}.png'))


def piece(name, mat, build, uv=None):
    b = fg.Builder(name)
    build(b, M[mat])
    o = b.object(scene)
    if uv:
        fg.box_uv(o, uv)
    parts.append(o)
    return o


def box(b, m, x, y, z, w, h, d):
    b.box(B(x, y, z), (w, d, h), m)


def cyl(b, m, x, y0, y1, z, r0, r1, sides=8):
    b.tube(B(x, y0, z), B(x, y1, z), r0, r1, m, sides=sides)


def floor_card(b, m, x0, z0, x1, z1, y=0.0):
    """Suelo visto desde arriba, con UV en metros (`box_uv` lo repite)."""
    b.card([B(x0, y, z0), B(x1, y, z0), B(x1, y, z1), B(x0, y, z1)], m)


def room_shell(b, m, W, D, H, gap, low=0.6, t=0.3):
    box(b, m, W / 2, H / 2, D - t / 2, W, H, t)
    box(b, m, t / 2, H / 2, D / 2, t, H, D)
    box(b, m, W - t / 2, H / 2, D / 2, t, H, D)
    side = W / 2 - gap
    box(b, m, side / 2, low / 2, t / 2, side, low, t)
    box(b, m, W - side / 2, low / 2, t / 2, side, low, t)


# --- Casa y taller: comparten suelo y paredes (14 x 12) ---

W, D, H = 14, 12, 4
piece('casa_suelo', 'tablas', lambda b, m: floor_card(b, m, 0, 0, W, D), uv=2.0)
piece('casa_paredes', 'yeso', lambda b, m: room_shell(b, m, W, D, H, 1.2), uv=3.0)


def house_beams(b, m):
    # Vigas vistas sobre el yeso y zócalo de madera.
    for x in (3.5, 7, 10.5):
        box(b, m, x, H / 2, D - 0.34, 0.26, H, 0.14)
    for z in (3, 6, 9):
        box(b, m, 0.34, H / 2, z, 0.14, H, 0.26)
        box(b, m, W - 0.34, H / 2, z, 0.14, H, 0.26)
    box(b, m, W / 2, H - 0.12, D - 0.36, W - 0.6, 0.24, 0.16)
    box(b, m, 0.36, H - 0.12, D / 2, 0.16, 0.24, D - 0.6)
    box(b, m, W - 0.36, H - 0.12, D / 2, 0.16, 0.24, D - 0.6)
    box(b, m, W / 2, 0.14, D - 0.34, W - 0.6, 0.28, 0.1)
    box(b, m, 0.34, 0.14, D / 2, 0.1, 0.28, D - 0.6)
    box(b, m, W - 0.34, 0.14, D / 2, 0.1, 0.28, D - 0.6)
    # Marcos de las ventanas de atrás.
    for x in (5.25, 8.75):
        box(b, m, x, 2.3, D - 0.33, 1.3, 1.5, 0.08)


piece('casa_vigas', 'madera', house_beams, uv=1.5)


def windows(b, m):
    for x in (5.25, 8.75):
        box(b, m, x, 2.3, D - 0.38, 1.0, 1.2, 0.06)


piece('casa_ventanas', 'luz', windows)

# Muebles de la casa: ocupan los huecos que bloquean el paso en ROOMS.hogar.


def home_wood(b, m):
    # Cama (2,2; 9,6; 2,6 x 3).
    box(b, m, 2.2, 0.3, 9.6, 2.6, 0.32, 3)
    for x, z in ((1.0, 8.2), (3.4, 8.2)):
        box(b, m, x, 0.16, z, 0.18, 0.32, 0.18)
    box(b, m, 2.2, 0.75, 10.98, 2.6, 1.5, 0.2)
    box(b, m, 2.2, 0.42, 8.15, 2.6, 0.56, 0.12)
    # Estantería (11,5; 10,8; 3,4 x 0,9): tres baldas abiertas.
    for x in (9.85, 11.5, 13.15):
        box(b, m, x, 1.2, 10.8, 0.1, 2.4, 0.9)
    for y in (0.08, 0.72, 1.56, 2.36):
        box(b, m, 11.5, y, 10.8, 3.4, 0.08, 0.9)
    box(b, m, 11.5, 1.2, 11.2, 3.4, 2.4, 0.06)
    # Mesa (7; 6,6; 2,4 x 1,4).
    box(b, m, 7, 0.78, 6.6, 2.4, 0.1, 1.4)
    for x, z in ((6, 6.1), (8, 6.1), (6, 7.1), (8, 7.1)):
        box(b, m, x, 0.37, z, 0.12, 0.74, 0.12)
    box(b, m, 7, 0.3, 6.6, 2.0, 0.06, 0.08)
    # Taburetes.
    for x in (5, 9):
        cyl(b, m, x, 0.5, 0.58, 6.6, 0.28, 0.28, sides=10)
        for a in range(3):
            t = math.radians(a * 120 + 30)
            b.tube(B(x + 0.14 * math.cos(t), 0.5, 6.6 + 0.14 * math.sin(t)), B(x + 0.25 * math.cos(t), 0, 6.6 + 0.25 * math.sin(t)), 0.03, 0.03, m, sides=5)


piece('hogar_madera', 'madera', home_wood, uv=1.0)


def home_clay(b, m):
    for x in (10.67, 12.33):
        for y in (0.76, 1.6):
            cyl(b, m, x, y, y + 0.2, 10.55, 0.13, 0.22)
            cyl(b, m, x, y + 0.2, y + 0.42, 10.55, 0.22, 0.1)
            cyl(b, m, x, y + 0.42, y + 0.5, 10.55, 0.1, 0.14)


piece('hogar_barro', 'barro', home_clay)
piece('hogar_alfombra', 'tela', lambda b, m: box(b, m, 7, 0.015, 5.4, 4.8, 0.03, 3.6), uv=1.2)
piece('hogar_cenefa', 'tela', lambda b, m: box(b, m, 7, 3.3, 11.685, 13.4, 0.6, 0.03), uv=0.6)
piece('hogar_manta', 'manta', lambda b, m: box(b, m, 2.2, 0.56, 9.2, 2.45, 0.2, 2.1))
piece('hogar_almohada', 'sabana', lambda b, m: b.blob(B(2.2, 0.66, 10.45), (0.8, 0.3, 0.13), m, subdiv=2))


def table_lamp(b, m):
    cyl(b, m, 7, 0.83, 1.0, 6.6, 0.09, 0.13)
    cyl(b, m, 7, 1.0, 1.16, 6.6, 0.13, 0.04)


piece('hogar_lampara', 'luz', table_lamp)

# Taller.


def workshop_wood(b, m):
    # Banco de trabajo (7; 10,9; 7 x 1,1).
    box(b, m, 7, 0.94, 10.9, 7, 0.12, 1.1)
    for x in (3.8, 7, 10.2):
        for z in (10.45, 11.35):
            box(b, m, x, 0.44, z, 0.16, 0.88, 0.16)
    box(b, m, 7, 0.3, 11.35, 6.4, 0.08, 0.1)
    # Tablero de herramientas en la pared.
    box(b, m, 7, 2.3, 11.6, 4.6, 1.3, 0.08)
    # Tajo del yunque.
    cyl(b, m, 4.5, 0, 0.62, 5.8, 0.42, 0.38, sides=10)


piece('taller_madera', 'madera', workshop_wood, uv=1.0)


piece('taller_alfombra', 'tela', lambda b, m: box(b, m, 7.8, 0.015, 6.2, 3.6, 0.03, 4.8), uv=1.2)


def workshop_iron(b, m):
    for x in (4.5, 7, 9.5):
        box(b, m, x, 1.05, 10.9, 0.8, 0.1, 0.22)
    for x in (5.6, 6.6, 7.6, 8.4):
        box(b, m, x, 2.3, 11.54, 0.1, 0.9, 0.04)
        box(b, m, x, 2.68, 11.52, 0.3, 0.12, 0.05)
    # Yunque: base, cintura, cuerpo y bigornia.
    box(b, m, 4.5, 0.66, 5.8, 0.6, 0.08, 0.5)
    box(b, m, 4.5, 0.76, 5.8, 0.3, 0.14, 0.26)
    box(b, m, 4.5, 0.92, 5.8, 0.8, 0.18, 0.4)
    b.tube(B(4.9, 0.92, 5.8), B(5.2, 0.96, 5.8), 0.15, 0.02, m, sides=6)
    # Aros de los toneles.
    for z in (4.5, 6.5):
        for y in (0.28, 1.02):
            cyl(b, m, 11.8, y, y + 0.07, z, 0.57, 0.57, sides=12)


piece('taller_hierro', 'hierro', workshop_iron)


def barrels(b, m):
    for z in (4.5, 6.5):
        cyl(b, m, 11.8, 0, 0.65, z, 0.46, 0.56, sides=12)
        cyl(b, m, 11.8, 0.65, 1.3, z, 0.56, 0.46, sides=12)


piece('taller_toneles', 'madera', barrels, uv=0.7)


def forge(b, m):
    # Fragua (2; 10; 2,4 x 2,4) con campana hasta el techo.
    box(b, m, 2, 0.55, 10, 2.4, 1.1, 2.4)
    box(b, m, 2, 1.16, 9.3, 2.4, 0.12, 1.0)
    box(b, m, 0.86, 1.16, 10.4, 0.12, 0.12, 1.8)
    box(b, m, 3.14, 1.16, 10.4, 0.12, 0.12, 1.8)
    box(b, m, 2, 1.16, 11.14, 2.4, 0.12, 0.12)
    b.poly(
        [B(0.8, 2.4, 8.8), B(3.2, 2.4, 8.8), B(3.2, 2.4, 11.2), B(0.8, 2.4, 11.2)],
        [B(1.4, 3.3, 10), B(2.6, 3.3, 10), B(2.6, 3.3, 11), B(1.4, 3.3, 11)],
        m,
    )
    box(b, m, 2, 3.65, 10.5, 1.2, 0.7, 1)


piece('taller_fragua', 'muro', forge, uv=1.5)
piece('taller_brasas', 'luz', lambda b, m: [b.blob(B(1.4 + i * 0.4, 1.14, 9.4 + (i * 7 % 5) * 0.32), (0.22, 0.22, 0.1), m, subdiv=1) for i in range(5)])

# --- Salón del castillo (24 x 22) ---

SW, SD, SH = 24, 22, 7
piece('salon_suelo', 'baldosa', lambda b, m: floor_card(b, m, 0, 0, SW, SD), uv=3.0)
piece('salon_paredes', 'muro', lambda b, m: room_shell(b, m, SW, SD, SH, 2.4), uv=3.0)


def hall_stone(b, m):
    for x in (6, 18):
        for z in (6, 11, 16):
            cyl(b, m, x, 0, 0.28, z, 0.72, 0.66, sides=8)
            cyl(b, m, x, 0.28, 0.5, z, 0.66, 0.54, sides=8)
            cyl(b, m, x, 0.5, 6.4, z, 0.52, 0.46, sides=8)
            cyl(b, m, x, 6.4, 7, z, 0.46, 0.68, sides=8)
    for x in (3, 21):
        for z in (6, 11, 16):
            cyl(b, m, x, 0, 0.14, z, 0.26, 0.2)
            cyl(b, m, x, 0.14, 1, z, 0.09, 0.09)
    # Gradas del estrado: mismas medidas que ROOMS.salon.platforms en houseScene.ts.
    px, pz, pw, pd, height, run, steps = 12, 19.85, 6, 3.7, 0.72, 1.5, 3
    for i in range(steps):
        grow = (run * (steps - 1 - i)) / steps * 2
        top = height * (i + 1) / steps
        box(b, m, px, top / 2, pz, pw + grow, top, pd + grow)


piece('salon_piedra', 'muro', hall_stone, uv=2.0)


def hall_carpet(b, m):
    box(b, m, 12, 0.015, 9.25, 3.6, 0.03, 15.5)  # Llega hasta la primera grada.
    px, pz, pw, pd, height, run, steps = 12, 19.85, 6, 3.7, 0.72, 1.5, 3
    for i in range(steps):
        grow = (run * (steps - 1 - i)) / steps * 2
        top = height * (i + 1) / steps
        front = pz - (pd + grow) / 2
        box(b, m, 12, top + 0.01, front + 0.25, 3.6, 0.03, 0.5)
        box(b, m, 12, top - height / steps / 2, front - 0.01, 3.6, height / steps, 0.03)
    box(b, m, 12, height + 0.012, 19, 3.6, 0.03, 2)


piece('salon_alfombra', 'tela', hall_carpet, uv=1.8)
piece('salon_cenefa', 'tela', lambda b, m: box(b, m, 12, 5.5, 21.685, 23.4, 1, 0.03), uv=1.0)


def banners(b, m):
    for x in (7, 17):
        z = 21.65
        pts = [B(x - 0.9, 6.2, z), B(x + 0.9, 6.2, z), B(x + 0.9, 3.0, z), B(x, 2.5, z), B(x - 0.9, 3.0, z)]
        b.poly(pts, [(p[0], p[1] - 0.05, p[2]) for p in pts], m)


piece('salon_estandartes', 'tela', banners, uv=0.9)


def hall_gold(b, m):
    top = 0.72
    # Trono (12; 20,5; 1,5 x 1): asiento, respaldo con remate y brazos.
    box(b, m, 12, top + 0.32, 20.45, 1.5, 0.64, 1)
    box(b, m, 12, top + 1.5, 20.9, 1.5, 2.1, 0.22)
    b.poly(
        [B(11.25, top + 2.55, 20.8), B(12.75, top + 2.55, 20.8), B(12, top + 3.2, 20.8)],
        [B(11.25, top + 2.55, 21.0), B(12.75, top + 2.55, 21.0), B(12, top + 3.2, 21.0)],
        m,
    )
    for x in (11.3, 12.7):
        box(b, m, x, top + 0.82, 20.45, 0.16, 0.36, 0.9)
    # Estandartes: barra.
    for x in (7, 17):
        box(b, m, x, 6.25, 21.62, 2.1, 0.1, 0.1)
    # Cuencos de los braseros.
    for x in (3, 21):
        for z in (6, 11, 16):
            cyl(b, m, x, 1.0, 1.26, z, 0.08, 0.3)


piece('salon_dorado', 'dorado', hall_gold)
piece('salon_brasas', 'luz', lambda b, m: [b.blob(B(x, 1.3, z), (0.22, 0.22, 0.16), m, subdiv=1) for x in (3, 21) for z in (6, 11, 16)])

# --- Salidas: se colocan en el juego; origen en el centro de la base ---


def exit_door(b, m, w, h):
    box(b, m, 0, h / 2, 0, w, h, 0.14)
    box(b, m, -w / 2 - 0.1, h / 2 + 0.05, 0, 0.2, h + 0.1, 0.26)
    box(b, m, w / 2 + 0.1, h / 2 + 0.05, 0, 0.2, h + 0.1, 0.26)
    box(b, m, 0, h + 0.14, 0, w + 0.4, 0.2, 0.26)


piece('salida', 'madera', lambda b, m: exit_door(b, m, 1.8, 2.4), uv=1.2)
piece('banco_salida', 'madera', lambda b, m: exit_door(b, m, 2.5, 2.6), uv=1.2)

# --- Banco: fachada, con el origen en el centro de la base (8 x 6) ---

BW, BD = 8.0, 6.0


def bank_walls(b, m):
    box(b, m, 0, -0.25, 0, BW + 0.5, 1.1, BD + 0.5)
    box(b, m, 0, 2, 0, BW, 4, BD)
    # Escalones de entrada.
    box(b, m, 0, 0.1, -BD / 2 - 0.55, 3.6, 0.2, 1.1)
    box(b, m, 0, 0.2, -BD / 2 - 0.3, 3.2, 0.4, 0.6)


piece('banco_muros', 'muro', bank_walls, uv=2.0)


def bank_roof(b, m):
    hw, hd = BW / 2 + 0.4, BD / 2 + 0.4
    box(b, m, 0, 4.12, 0, hw * 2, 0.24, hd * 2)
    b.poly(
        [B(-hw, 4.24, -hd), B(hw, 4.24, -hd), B(hw, 4.24, hd), B(-hw, 4.24, hd)],
        [B(-hw + 0.9, 5.1, -hd + 0.9), B(hw - 0.9, 5.1, -hd + 0.9), B(hw - 0.9, 5.1, hd - 0.9), B(-hw + 0.9, 5.1, hd - 0.9)],
        m,
    )


piece('banco_techo', 'techo', bank_roof)


def bank_brass(b, m):
    # Columnas de la fachada, letrero y moneda.
    for x in (-3, 3):
        cyl(b, m, x, 0, 0.22, -3.3, 0.36, 0.3, sides=10)
        cyl(b, m, x, 0.22, 3.6, -3.3, 0.22, 0.2, sides=10)
        cyl(b, m, x, 3.6, 3.85, -3.3, 0.2, 0.34, sides=10)
    box(b, m, 0, 3.3, -3.2, 3, 0.65, 0.16)
    b.tube(B(0, 3.3, -3.29), B(0, 3.3, -3.35), 0.24, 0.24, m, sides=14)


piece('banco_laton', 'laton', bank_brass)


def bank_door(b, m):
    box(b, m, 0, 1.3, 0, 2.1, 2.6, 0.18)
    box(b, m, -1.17, 1.35, 0, 0.24, 2.7, 0.3)
    box(b, m, 1.17, 1.35, 0, 0.24, 2.7, 0.3)
    box(b, m, 0, 2.78, 0, 2.6, 0.26, 0.3)


piece('banco_puerta', 'madera', bank_door, uv=1.2)

# --- Banco: interior (20 x 16) ---

piece('banco_suelo', 'baldosa', lambda b, m: floor_card(b, m, 0, 0, 20, 16), uv=3.0)


def bank_shell(b, m):
    box(b, m, 10, 2.5, 15.8, 20, 5, 0.4)
    box(b, m, 0.2, 2.5, 8, 0.4, 5, 16)
    box(b, m, 19.8, 2.5, 8, 0.4, 5, 16)
    box(b, m, 4.25, 0.35, 0.2, 8.5, 0.7, 0.4)
    box(b, m, 15.75, 0.35, 0.2, 8.5, 0.7, 0.4)
    for x, z in ((4, 3.5), (16, 3.5), (3, 9)):
        box(b, m, x, 2.5, z, 0.8, 5, 0.8)


piece('banco_paredes', 'muro', bank_shell, uv=2.0)


def bank_interior_wood(b, m):
    for x in (0.9, 19.1):
        box(b, m, x, 1.1, 13, 0.9, 2.2, 4.4)


piece('banco_estantes', 'madera', bank_interior_wood, uv=1.2)


def bank_counter(b, m):
    box(b, m, 10, 0.65, 11, 10, 1.3, 1)
    box(b, m, 10, 1.34, 11, 10.3, 0.12, 1.2)
    box(b, m, 10, 0.08, 11, 10.2, 0.16, 1.1)
    for x in (6, 8, 10, 12, 14):
        box(b, m, x, 0.68, 10.47, 1.5, 0.9, 0.06)


piece('banco_mostrador', 'madera', bank_counter, uv=1.2)


def bank_interior_brass(b, m):
    for x, z in ((4, 3.5), (16, 3.5), (3, 9)):
        box(b, m, x, 0.15, z, 1.1, 0.3, 1.1)
        box(b, m, x, 4.85, z, 1.1, 0.3, 1.1)
    # Cajas fuertes.
    for x in (0.9, 19.1):
        for y in (0.6, 1.3, 2):
            for k in (-1.5, 0, 1.5):
                box(b, m, x, y, 13 + k, 0.96, 0.4, 0.8)
    # Reja de ventanilla.
    for i in range(10):
        x = 5.5 + i
        if abs(x - 10) > 1:
            box(b, m, x, 2.05, 10.8, 0.07, 1.3, 0.07)
    box(b, m, 10, 2.72, 10.8, 10, 0.1, 0.1)
    for x, z in ((1, 14.9), (19, 14.9), (7, 15.5), (13, 15.5)):
        box(b, m, x, 3.2, z, 0.1, 0.5, 0.1)


piece('banco_laton_int', 'laton', bank_interior_brass)
piece('banco_alfombra', 'tela', lambda b, m: box(b, m, 10, 0.025, 5.8, 3.4, 0.04, 8.8), uv=1.7)
piece('banco_alfombra_borde', 'laton', lambda b, m: box(b, m, 10, 0.012, 5.8, 3.9, 0.024, 9.3))
piece('banco_lamparas', 'luz', lambda b, m: [b.blob(B(x, 3.55, z), (0.2, 0.2, 0.2), m, subdiv=1) for x, z in ((1, 14.9), (19, 14.9), (7, 15.5), (13, 15.5))])

fg.export('interiores.glb', scene, parts, materials=False)
print('piezas', len(parts))
