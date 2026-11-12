# Piezas y texturas de la cripta: baldosa, muro, antorcha, escaleras y entrada.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/mazmorra.py
# También se ejecuta dentro de Blender por MCP: trabaja en la escena "Mazmorra" y no toca las demás.
# Escribe assets/models/mazmorra.glb y assets/textures/muro.png, baldosa.png,
# barro.png y duela.png (las dos últimas para los rompibles: no se llaman
# madera.png porque interiors.py ya pinta ahí una gris para teñir).
# El juego tiñe las texturas con el color de cada tema, así que son casi blancas;
# barro y duela son las excepciones: viajan en su color y el juego las pone sin tinte.
# Coordenadas como en el juego (x, altura, z); B() las pasa a Blender.
import importlib
import math
import os
import sys
import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)

TEXTURES = os.path.normpath(os.path.join(fg.MODELS, '..', 'textures'))
TILE, WALL_H = 1.5, 3.2


def B(x, y, z):
    # El exportador pasa y de Blender a -z de glTF, y el cargador vuelve a invertir z.
    return (x, z, y)


def periodic_noise(size, cells, rng):
    """Ruido suave que se repite sin costura."""
    grid = rng.random((cells, cells))
    t = np.arange(size) * cells / size
    i0 = t.astype(int) % cells
    i1 = (i0 + 1) % cells
    f = t - np.floor(t)
    f = f * f * (3 - 2 * f)
    a = grid[np.ix_(i0, i0)] * (1 - f)[:, None] + grid[np.ix_(i1, i0)] * f[:, None]
    b = grid[np.ix_(i0, i1)] * (1 - f)[:, None] + grid[np.ix_(i1, i1)] * f[:, None]
    return a * (1 - f)[None, :] + b * f[None, :]


def grain(size, rng):
    return (periodic_noise(size, 6, rng) * 0.5 + periodic_noise(size, 24, rng) * 0.3 + periodic_noise(size, 96, rng) * 0.2)


def save_gray(name, values):
    """Guarda un PNG gris opaco; `values` va de 0 a 1."""
    os.makedirs(TEXTURES, exist_ok=True)
    h, w = values.shape
    px = np.ones((h, w, 4), dtype=np.float32)
    px[..., 0] = values * 1.0
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


def save_rgb(name, values):
    """Guarda un PNG en color (values: (h,w,3) de 0 a 1). A diferencia de las
    grises de muro/baldosa, el juego NO tine estas: viajan en su color."""
    os.makedirs(TEXTURES, exist_ok=True)
    h, w, _ = values.shape
    px = np.ones((h, w, 4), dtype=np.float32)
    px[..., :3] = values
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = os.path.join(TEXTURES, name + '.png')
    img.file_format = 'PNG'
    img.save()
    return img


def edge_mask(dist, width):
    """0 en la junta, 1 dentro de la pieza, con un pequeño bisel."""
    return np.clip(dist / width, 0, 1)


def brick_texture(size=512, rows=4, columns=2):
    rng = np.random.default_rng(41)
    y, x = np.mgrid[0:size, 0:size]
    row_h = size / rows
    row = (y / row_h).astype(int)
    col_w = size / columns
    sx = (x + (row % 2) * col_w / 2) % size
    col = (sx / col_w).astype(int)
    dy = np.minimum(y % row_h, row_h - y % row_h)
    dx = np.minimum(sx % col_w, col_w - sx % col_w)
    mask = edge_mask(np.minimum(dx, dy) - 3, 7)
    tones = rng.random((rows, columns)) * 0.16 + 0.8
    body = tones[row, col] * (0.82 + 0.3 * grain(size, rng))
    return save_gray('muro', np.clip(0.3 + (body - 0.3) * mask, 0, 1))


def tile_texture(size=512):
    rng = np.random.default_rng(73)
    y, x = np.mgrid[0:size, 0:size]
    half = size // 2
    # Cuatro losas de tamaños distintos, con la junta algo torcida.
    wob = (periodic_noise(size, 5, rng) - 0.5) * 16
    cx, cy = (x + wob) % size, (y - wob) % size
    dv = np.minimum(np.abs(cx - half), np.minimum(cx, size - cx))
    dh = np.minimum(np.abs(cy - half), np.minimum(cy, size - cy))
    mask = edge_mask(np.minimum(dv, dh) - 2, 9)
    tones = rng.random((2, 2)) * 0.14 + 0.84
    tone = tones[(cy >= half).astype(int), (cx >= half).astype(int)]
    body = tone * (0.84 + 0.28 * grain(size, rng))
    return save_gray('baldosa', np.clip(0.26 + (body - 0.26) * mask, 0, 1))


def clay_texture(size=256):
    """Barro cocido (rompibles): dos tonos proximos de base, tierra difusa y
    goteado vertical. Verificado en arte/omp-rompibles-cripta/ (lamina)."""
    rng = np.random.default_rng(11)
    g = grain(size, rng)
    base = np.array([0.52, 0.33, 0.21])
    light = np.array([0.6, 0.42, 0.27])
    dirt = np.array([0.34, 0.24, 0.15])
    out = np.zeros((size, size, 3))
    tone = np.clip((g - 0.42) * 2.6, 0, 1)
    out += base * (1 - tone[..., None]) + light * tone[..., None]
    out *= (0.9 + 0.2 * g)[..., None]
    blotch = np.clip((periodic_noise(size, 3, rng) - 0.62) * 2.2, 0, 1)
    # goteado: la tierra se estira hacia abajo con deriva lenta
    streak = np.zeros((size, size))
    col = periodic_noise(size, 32, rng)
    for y in range(size):
        shift = int(6 * math.sin(y * 0.35) + 12 * col[y, :].mean())
        streak[y] = np.roll(blotch[max(0, y - 34)], shift) * 0.35 + blotch[y] * 0.65
    streak *= (0.6 + 0.4 * g)
    out = out * (1 - 0.5 * streak[..., None]) + dirt * (0.5 * streak[..., None])
    # surcos del torno: bandas claras finisimas horizontales
    rings = np.clip(np.sin(np.arange(size) * (math.pi * 2 * 7 / size) + periodic_noise(size, 16, rng) * 3) - 0.93, 0, 0.07) * 0.4
    out += rings[..., None] * np.array([0.05, 0.04, 0.03])
    return save_rgb('barro', np.clip(out, 0, 1))


def stave_texture(size=256):
    """Duela de toneles y cajas (rompibles): tono calido con veta suave y
    nudos. Sin duelas dibujadas: las tablas y los aros los aporta la
    geometria (bandas horizontales se leian como aros de hierro)."""
    rng = np.random.default_rng(19)
    g = grain(size, rng)
    fine = periodic_noise(size, 12, rng) * 0.5 + periodic_noise(size, 48, rng) * 0.5
    x = np.arange(size)
    base = np.array([0.37, 0.25, 0.14])
    dark = np.array([0.24, 0.16, 0.09])
    out = base[None, None, :] * (0.85 + 0.3 * g)[..., None]
    out -= dark[None, None, :] * (np.sin(x[None, :] * 0.55 + fine * 9) > 0.88)[..., None] * 0.35
    # nudos: dos ovalos oscuros con anillo claro
    for cx, cy, r in ((70, 40, 9), (185, 200, 7)):
        yy, xx = np.mgrid[0:size, 0:size]
        d = np.sqrt(((xx - cx) / 1.4) ** 2 + (yy - cy) ** 2)
        knot = np.clip(1 - d / r, 0, 1)
        out -= knot[..., None] * np.array([0.1, 0.07, 0.04])
    return save_rgb('duela', np.clip(out, 0, 1))


# La escena primero: sin ventana, fresh_scene parte de cero y borraría las texturas.
scene = fg.fresh_scene('Mazmorra')
muro = brick_texture()
baldosa = tile_texture()
STONE = fg.textured_material('Piedra_muro', muro)
FLOOR = fg.textured_material('Piedra_baldosa', baldosa)
DARK = fg.material('Oscuro', (0.01, 0.01, 0.015))
WOOD = fg.material('Hierro_antorcha', (0.2, 0.15, 0.1))
FLAME = fg.material('Llama', (1, 0.6, 0.2), emit=(1, 0.55, 0.15), strength=3)
HALO = fg.material('Halo', (1, 0.45, 0.1), emit=(1, 0.4, 0.08), strength=2)
SMOKE = fg.material('Humo', (0.25, 0.24, 0.24))
MOUND = fg.material('Monticulo', (0.3, 0.33, 0.24), rough=1)
RUNE = fg.material('Runa', (0.4, 0.65, 1), emit=(0.35, 0.6, 1), strength=2)
parts = []


def piece(name, mat, build, uv_metres=None):
    b = fg.Builder(name)
    build(b, mat)
    o = b.object(scene)
    if uv_metres:
        fg.box_uv(o, uv_metres)
    parts.append(o)
    return o


def box(b, mat, x, y, z, w, h, d):
    b.box(B(x, y, z), (w, d, h), mat)


# Baldosa: una losa con UV de 0 a 1 en cada celda.
piece('d_baldosa', FLOOR, lambda b, m: b.card(
    [B(-TILE / 2, 0, -TILE / 2), B(TILE / 2, 0, -TILE / 2), B(TILE / 2, 0, TILE / 2), B(-TILE / 2, 0, TILE / 2)], m))


# Auditoria 2026-11-11: piezas macizas que arrancaban EXACTAMENTE en z=0 eran
# coplanares con d_baldosa (z-fighting bajo cada instancia). Hundir 5 mm la
# base, el patron que ya usaban los pasos de d_entrada. d_barril_aros va sobre
# el barril y d_estanque_piedra semienterrada: no aplican.
def sink_base(o):
    for v in o.data.vertices:
        if abs(v.co.z) < 1e-6:
            v.co.z = -0.005


def build_wall(b, m):
    # Auditoria 2026-11-11: el zocalo y la cornisa salientes (TILE+0.1 / TILE+0.08)
    # desbordaban la huella del tile: paredes contiguas clavaban sus molduras y
    # el zocalo sobresalia sobre la baldosa vecina. Todo dentro de TILE ahora.
    box(b, m, 0, 0.14, 0, TILE - 0.10, 0.29, TILE - 0.10)
    box(b, m, 0, 1.645, 0, TILE, 2.73, TILE)
    box(b, m, 0, 3.1, 0, TILE - 0.06, 0.2, TILE - 0.06)


piece('d_muro', STONE, build_wall, uv_metres=TILE)
piece('d_remate', STONE, lambda b, m: b.card(
    [B(-TILE / 2, 0, -TILE / 2), B(TILE / 2, 0, -TILE / 2), B(TILE / 2, 0, TILE / 2), B(-TILE / 2, 0, TILE / 2)], m))


def build_torch(b, m):
    box(b, m, 0, 0, 0, 0.08, 0.5, 0.08)
    box(b, m, 0, -0.2, 0, 0.14, 0.08, 0.14)
    b.tube(B(0, 0.18, 0), B(0, 0.34, 0), 0.05, 0.1, m, sides=6)


piece('d_antorcha', WOOD, build_torch)


# Fuego estilizado en cuatro piezas, verificadas en arte/omp-fuego-antorchas/
# (llama.py) antes de tocar el publicado. El parche de src/render/torchFlame.ts
# las anima thin-instanced con fase por antorcha; el modelo es quieto por si
# solo, asi que la silueta y el presupuesto viajan aqui.
#   d_llama        nucleo: lagrima torcida de 4 tramos (~60 tri), nombre publico
#                  que ya conocia el juego
#   d_llama_halo   la misma lagrima un 45 % mas gorda; aditivo, borde suave
#                  sin texturas (~48 tri)
#   d_llama_humo   dos tarjetas cruzadas sobre la punta; el parche las sube,
#                  agranda y desvanece (alfa por instancia) (~4 tri)
#   d_llama_chispa octaedro minimo que sube y se apaga (~8 tri)
def build_core(b, m):
    b.tube(B(0, -0.08, 0), B(0.012, 0.04, -0.008), 0.05, 0.115, m, sides=5)
    b.tube(B(0.012, 0.04, -0.008), B(0.04, 0.15, 0.012), 0.115, 0.052, m, sides=5)
    b.tube(B(0.04, 0.15, 0.012), B(0.028, 0.26, -0.006), 0.052, 0.016, m, sides=5)
    b.tube(B(0.028, 0.26, -0.006), B(0.045, 0.36, 0.004), 0.016, 0.001, m, sides=4)


def build_halo(b, m):
    b.tube(B(0, -0.1, 0), B(0.015, 0.06, -0.01), 0.07, 0.17, m, sides=5)
    b.tube(B(0.015, 0.06, -0.01), B(0.05, 0.18, 0.015), 0.17, 0.08, m, sides=5)
    b.tube(B(0.05, 0.18, 0.015), B(0.04, 0.34, 0), 0.08, 0.001, m, sides=5)


def build_smoke(b, m):
    for yaw in (0, math.pi / 2):
        c, s = math.cos(yaw), math.sin(yaw)
        pts = [B(w * c, h, w * s) for w, h in ((-0.13, 0.28), (0.13, 0.28), (0.2, 0.95), (-0.2, 0.95))]
        b.card(pts, m)


def build_spark(b, m):
    r = 0.018
    ring = [B(r, 0, 0), B(0, 0, r), B(-r, 0, 0), B(0, 0, -r)]
    vs = [b.bm.verts.new(p) for p in ring]
    top = b.bm.verts.new(B(0, r * 1.6, 0))
    bot = b.bm.verts.new(B(0, -r * 1.6, 0))
    faces = []
    for i in range(4):
        faces.append(b.bm.faces.new((vs[i], vs[(i + 1) % 4], top)))
        faces.append(b.bm.faces.new((vs[(i + 1) % 4], vs[i], bot)))
    b._finish(vs + [top, bot], faces, m, None)


piece('d_llama', FLAME, build_core)
piece('d_llama_halo', HALO, build_halo)
piece('d_llama_humo', SMOKE, build_smoke)
piece('d_llama_chispa', FLAME, build_spark)


def build_up(b, m):
    for k in range(4):
        box(b, m, -0.8 + k * 0.55, 0.125 * (k + 1), 0, 0.55, 0.25 * (k + 1), 2.2)
    for z in (-1.2, 1.2):
        box(b, m, 1.4, 1.3, z, 0.35, 2.6, 0.35)
        box(b, m, 1.4, 0.1, z, 0.5, 0.2, 0.5)
    box(b, m, 1.4, 2.75, 0, 0.45, 0.4, 2.8)
    box(b, m, 1.4, 3.02, 0, 0.6, 0.14, 3.0)


piece('d_subida', STONE, build_up, uv_metres=TILE)


def build_down_frame(b, m):
    for dx, dz, w, d in ((0, -1.25, 2.8, 0.3), (0, 1.25, 2.8, 0.3), (-1.25, 0, 0.3, 2.2), (1.25, 0, 0.3, 2.2)):
        box(b, m, dx, 0.15, dz, w, 0.3, d)
    # Auditoria: los peldanos iban a [0.005,0.065] y d_boca (plano y=0.02 del
    # juego) los atravesaba. Subidos a [0.04,0.10], por encima del plano.
    for k in range(2):
        box(b, m, -0.75 + k * 0.5, 0.07, 0, 0.5, 0.06, 2)


piece('d_bajada', STONE, build_down_frame, uv_metres=TILE)
piece('d_boca', DARK, lambda b, m: b.card([B(-1.1, 0, -1.1), B(1.1, 0, -1.1), B(1.1, 0, 1.1), B(-1.1, 0, 1.1)], m))


def ring(b, m, diameter, thickness, center=(0, 0, 0), axis_x=False, segments=32):
    r = diameter / 2
    prev = None
    for i in range(segments + 1):
        t = 2 * math.pi * i / segments
        if axis_x:
            q = B(center[0], center[1] + r * math.cos(t), center[2] + r * math.sin(t))
        else:
            q = B(center[0] + r * math.cos(t), center[1], center[2] + r * math.sin(t))
        if prev:
            b.tube(prev, q, thickness / 2, thickness / 2, m, sides=4)
        prev = q


piece('d_anillo', RUNE, lambda b, m: ring(b, m, 3.2, 0.06))


# Entrada en el mundo abierto: +X es hacia donde mira.
def build_gate(b, m):
    for z in (-1.5, 1.5):
        box(b, m, 0, 1.5, z, 0.6, 3, 0.6)
        box(b, m, 0, 0.12, z, 0.85, 0.24, 0.85)
    box(b, m, 0, 3.2, 0, 0.8, 0.55, 4)
    box(b, m, 0, 3.62, 0, 0.5, 0.3, 2.6)
    for z in (-1.45, 1.45):
        box(b, m, -1.2, 0.17, z, 2.4, 0.35, 0.3)
    for k in range(3):
        box(b, m, -0.3 - k * 0.5, 0.1 - k * 0.03, 0, 0.45, 0.08, 2.4)


piece('d_entrada', STONE, build_gate, uv_metres=TILE)
# Auditoria: la boca llegaba a x=-2.3 (40 cm fuera del monticulo y entre
# monticulo y umbral: lama negra flotando). Recortada a x∈[-1.525,-0.1],
# justo bajo los tres peldanos del umbral de d_entrada.
piece('d_entrada_boca', DARK, lambda b, m: box(b, m, -0.8125, 0.03, 0, 1.425, 0.04, 2.16))
piece('d_entrada_monticulo', MOUND, lambda b, m: b.blob(B(-4.3, 0, 0), (2.4, 3.45, 1.65), m, subdiv=3))
piece('d_entrada_runa', RUNE, lambda b, m: ring(b, m, 1.0, 0.08, center=(0.42, 3.2, 0), axis_x=True, segments=20))

# Pisos profundos (F25): jarras, barriles, puertas y estanques. Los rompibles
# llevan textura propia en color (barro/duela); el resto lo tine el juego.
# Catalogo verificado pieza a pieza en arte/omp-rompibles-cripta/ (lamina de
# revision) antes de tocar el publicado; los perfiles y topes (<=500 tri objeto,
# <=120 tri fragmento) salen de alli.
CLAY = fg.textured_material('Barro_jarra', clay_texture())
OAK = fg.textured_material('Madera_barril', stave_texture())
IRON = fg.material('Hierro_aro', (0.2, 0.2, 0.22), metallic=0.6)


def lathe(b, m, profile, sides):
    """Torno facetado: `profile` = [(altura, radio), ...] de abajo arriba."""
    for (y0, r0), (y1, r1) in zip(profile, profile[1:]):
        b.tube(B(0, y0, 0), B(0, y1, 0), r0, r1, m, sides=sides)


# Tinaja de barro panzuda con cuello estrecho y boca vuelta (la publica).
JAR_A = [(0, 0.14), (0.07, 0.21), (0.28, 0.27), (0.5, 0.22), (0.62, 0.11), (0.69, 0.095), (0.76, 0.135)]
piece('d_jarra', CLAY, lambda b, m: lathe(b, m, JAR_A, 11), uv_metres=0.5)

# Alta: silueta alargada y estilizada, boca mas evasada. 240 tri.
JAR_B = [(0, 0.11), (0.1, 0.17), (0.42, 0.2), (0.7, 0.15), (0.84, 0.085), (0.9, 0.09), (0.98, 0.13)]
piece('d_jarra_alta', CLAY, lambda b, m: lathe(b, m, JAR_B, 11), uv_metres=0.5)

# Ancha: tinaja baja panzuda; la boca ancha la distingue de lejos. 200 tri.
JAR_C = [(0, 0.16), (0.06, 0.26), (0.22, 0.34), (0.38, 0.3), (0.46, 0.2), (0.5, 0.23)]
piece('d_jarra_ancha', CLAY, lambda b, m: lathe(b, m, JAR_C, 11), uv_metres=0.5)


# Agrietada: perfil comun con la boca mellada (dos trozos caidos), un golpe
# en la panza y dos grietas finas en relieve hundido. 150 tri.
def build_cracked(b, m):
    bm = b.bm
    rings = []
    for k, (y0, r0) in enumerate(JAR_A[:6]):
        rs = []
        for i in range(11):
            t = 2 * math.pi * i / 11
            wobble = 0
            if k >= 4:  # cuello y base del borde: abolladuras verticales (grietas)
                wobble = -0.012 * max(0.0, math.cos(3 * (t - 0.7))) ** 8 - 0.010 * max(0.0, math.cos(5 * (t + 1.2))) ** 10
            if k == 2:  # golpe en la panza: hundimiento plano
                wobble += -0.02 * max(0.0, math.cos(t - 2.4)) ** 4
            rs.append(bm.verts.new(((r0 + wobble) * math.cos(t), (r0 + wobble) * math.sin(t), y0)))
        rings.append(rs)
    for ra, rb in zip(rings, rings[1:]):
        for i in range(11):
            bm.faces.new((ra[i], ra[(i + 1) % 11], rb[(i + 1) % 11], rb[i]))
    bm.faces.new(rings[0][::-1])
    # borde mellado: envolvente senoidal, el trozo caido deja un borde curvo
    # (un diente por ventana leia "cuernos"); lectura limpia a 3 pasos.
    def top_y(t):
        if 0.8 < t < 2.2:
            return 0.76 - 0.17 * math.sin(math.pi * (t - 0.8) / 1.4)
        if 3.5 < t < 4.3:
            return 0.76 - 0.09 * math.sin(math.pi * (t - 3.5) / 0.8)
        return 0.76

    top = []
    for i in range(11):
        t = 2 * math.pi * i / 11
        r = JAR_A[-1][1] + 0.004
        top.append(bm.verts.new((r * math.cos(t), r * math.sin(t), top_y(t))))
    neck = rings[-1]
    for i in range(11):
        bm.faces.new((neck[i], neck[(i + 1) % 11], top[(i + 1) % 11], top[i]))
    bm.faces.new(top)
    b._finish([v for r in rings + [top] for v in r], list(bm.faces), m, None)


piece('d_jarra_agrietada', CLAY, build_cracked, uv_metres=0.5)

# Barril de duelas con la panza marcada y aros de hierro aparte (otro material).
BAR_C = [(0, 0.27), (0.22, 0.33), (0.45, 0.355), (0.68, 0.33), (0.9, 0.27)]
piece('d_barril', OAK, lambda b, m: lathe(b, m, BAR_C, 12), uv_metres=0.5)


def build_hoops(b, m):
    for y, r in ((0.07, 0.29), (0.28, 0.345), (0.62, 0.345), (0.83, 0.29)):
        b.tube(B(0, y - 0.03, 0), B(0, y + 0.03, 0), r + 0.012, r + 0.012, m, sides=12)


piece('d_barril_aros', IRON, build_hoops)


# Barril bajo y gordo: tapa visible y aros de madera en relieve, sin hierro:
# otra familia de silueta contra el alto. 352 tri.
def build_stub(b, m):
    lathe(b, m, [(0, 0.24), (0.14, 0.3), (0.26, 0.315), (0.38, 0.3), (0.5, 0.24)], 12)
    b.tube(B(0, 0.5, 0), B(0, 0.525, 0), 0.24, 0.225, m, sides=12)  # tapon
    for y, r in ((0.05, 0.282), (0.25, 0.342), (0.45, 0.282)):
        b.tube(B(0, y - 0.018, 0), B(0, y + 0.018, 0), r, r, m, sides=12)  # aros en relieve


piece('d_barril_bajo', OAK, build_stub, uv_metres=0.5)


# Caja de tablones: hueca por fuera (fondo + 4 paredes), travesanos y
# cantoneras: los listones salientes leen "caja" a un paso del suelo. 132 tri.
def build_crate(b, m):
    t = 0.028
    box(b, m, 0, t / 2, 0, 0.62, t, 0.5)
    box(b, m, 0, 0.19, 0.25 - t / 2, 0.62, 0.34, t)
    box(b, m, 0, 0.19, -0.25 + t / 2, 0.62, 0.34, t)
    box(b, m, 0.31 - t / 2, 0.19, 0, t, 0.34, 0.5)
    box(b, m, -0.31 + t / 2, 0.19, 0, t, 0.34, 0.5)
    for zs in (-1, 1):
        box(b, m, 0, 0.19, zs * (0.25 - t), 0.66, 0.06, t)
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(b, m, sx * 0.31, 0.19, sz * 0.23, 0.05, 0.34, 0.05)


piece('d_caja', OAK, build_crate, uv_metres=0.5)


# Cascotes de barro roto: tiestos curvos + base semienterrada. 100 tri.
def build_shards(b, m):
    rng = np.random.default_rng(5)
    for k in range(6):
        a = 2 * math.pi * k / 6 + rng.random() * 0.7
        d = 0.12 + rng.random() * 0.3
        h = 0.035 + rng.random() * 0.04
        p0 = (math.cos(a) * d, math.sin(a) * d)
        b.tube(B(p0[0], h * 0.4, p0[1]), B(p0[0] * 1.5, h, p0[1] * 1.5), 0.05, 0.085, m, sides=4)
    b.tube(B(0, 0, 0), B(0, 0.1, 0), 0.19, 0.2, m, sides=8, flat=0.55)


piece('d_cascotes', CLAY, build_shards)


# Astillas de duela: tablas rotas tumbadas + dos cascos de aro medio
# enterrados (el eje a 1 cm del suelo). 92 tri.
def build_splinters(b, m):
    rng = np.random.default_rng(9)
    for k in range(5):
        a = 2 * math.pi * k / 5 + rng.random() * 0.9
        d = 0.14 + rng.random() * 0.26
        ln = 0.2 + rng.random() * 0.14
        b.box(B(math.cos(a) * d, 0.008, math.sin(a) * d), (0.055, ln, 0.012), m, rot=(a, 'Z'))
    for k, (a, dd) in enumerate(((0.5, 0.34), (2.6, 0.3))):
        b.tube(B(math.cos(a) * dd, 0.01, math.sin(a) * dd), B(math.cos(a + 0.8) * dd, 0.01, math.sin(a + 0.8) * dd), 0.014, 0.014, m, sides=5)


piece('d_cascotes_madera', OAK, build_splinters)

# Puerta: dos postes de piedra, dintel de ancho 1 (el juego lo estira al hueco) y hojas de
# tablones con bisagra en x = 0 y ancho 1 (el juego pone media boca a cada una).
piece('d_puerta_poste', STONE, lambda b, m: (box(b, m, 0, 1.45, 0, 0.32, 2.9, 0.5), box(b, m, 0, 0.1, 0, 0.42, 0.2, 0.6)), uv_metres=TILE)
piece('d_puerta_dintel', STONE, lambda b, m: box(b, m, 0, 2.78, 0, 1, 0.36, 0.52), uv_metres=TILE)


def build_leaf(b, m):
    for k in range(4):
        box(b, m, 0.125 + k * 0.25, 1.27, 0, 0.235, 2.54 - (k % 2) * 0.06, 0.09)
    for y in (0.45, 2.0):
        box(b, m, 0.5, y, 0.06, 0.96, 0.14, 0.04)
    box(b, m, 0.5, 1.22, 0.06, 0.12, 1.5, 0.035)


piece('d_puerta_hoja', OAK, build_leaf)
# Piedra de la orilla de un estanque: el juego las pone en corro.
piece('d_estanque_piedra', STONE, lambda b, m: b.blob(B(0, 0.08, 0), (0.42, 0.22, 0.26), m, subdiv=1), uv_metres=TILE)

for o in parts:
    if o.name.split('.')[0] in ('d_bajada', 'd_subida', 'd_jarra', 'd_jarra_alta', 'd_jarra_ancha',
                                'd_jarra_agrietada', 'd_barril', 'd_barril_bajo', 'd_caja',
                                'd_cascotes', 'd_puerta_poste', 'd_puerta_hoja', 'd_entrada', 'd_muro'):
        sink_base(o)

fg.export('mazmorra.glb', scene, parts, materials=False)
