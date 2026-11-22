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


def brick_texture(size=512):
    return save_gray('muro', _brick_base(size=size))


def _brick_base(size=512, rows=4, columns=2, seed=41, tone_spread=0.16, tone_low=0.8):
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:size, 0:size]
    row_h = size / rows
    row = (y / row_h).astype(int)
    col_w = size / columns
    sx = (x + (row % 2) * col_w / 2) % size
    col = (sx / col_w).astype(int)
    dy = np.minimum(y % row_h, row_h - y % row_h)
    dx = np.minimum(sx % col_w, col_w - sx % col_w)
    mask = edge_mask(np.minimum(dx, dy) - 3, 7)
    tones = rng.random((rows, columns)) * tone_spread + tone_low
    body = tones[row, col] * (0.82 + 0.3 * grain(size, rng))
    return np.clip(0.3 + (body - 0.3) * mask, 0, 1)


def tile_texture(size=512):
    return save_gray('baldosa', _tile_base(size=size))


def _tile_base(size=512, seed=73):
    rng = np.random.default_rng(seed)
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
    return np.clip(0.26 + (body - 0.26) * mask, 0, 1)


# POL-02: los tres tramos de profundidad (OMP-POL-02, contrato en
# work/omp-pol02/CONTRATO.md). Son variantes procedurales de muro y baldosa que
# el juego tiñe igual que las de arriba, así que van casi blancas y sin color:
# lo que cambia es el dibujo. Los nombres de PNG son el contrato con el
# programador (th.wallTex / th.floorTex); las dos originales no se tocan.


def _root_lines(size, rng, n, weight, dark):
    """Rasguños que atraviesan la textura de lado a lado, en torzo, y se
    repiten sin costura al bordarlos. `n` trazos, grosor `weight`, tono `dark`."""
    out = np.zeros((size, size))
    yy, xx = np.mgrid[0:size, 0:size]
    x1 = np.arange(size)
    for k in range(n):
        # curva lenta y periódica en x (frecuencias enteras): sin costura vertical
        f1 = rng.integers(1, 4)
        f2 = rng.integers(1, 3)
        ph1, ph2 = rng.random(2) * 2 * math.pi
        yline = (size * (k + 0.5) / n
                 + size * 0.16 * np.sin(x1 * 2 * math.pi * f1 / size + ph1)
                 + size * 0.07 * np.sin(x1 * 2 * math.pi * f2 / size + ph2))
        d = np.abs(yy - yline[None, :])
        d = np.minimum(d, size - d)  # el trazo se envuelve en y: sin costura horizontal
        stroke = np.clip(1 - d / (weight * (0.7 + 0.6 * rng.random())), 0, 1) ** 2
        out += stroke
    out = np.clip(out, 0, 1)
    # el grosor tiembla, pero el trazo no se corta: máscara con suelo alto
    out *= 0.35 + 0.65 * np.clip(periodic_noise(size, 12, rng) * 1.8, 0, 1)
    return out * dark


def _speckle(size, rng, n, radius, amount):
    """Motas suaves dibujadas sobre un toro (se envuelven en x e y): sin
    costura por construcción."""
    out = np.zeros((size, size))
    r = int(radius)
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    disc = np.clip(1 - np.hypot(xx, yy) / r, 0, 1)
    for _ in range(n):
        cx, cy = rng.integers(0, size, 2)
        k = disc * (0.5 + rng.random())
        h, w = k.shape
        ys = (cy + np.arange(-r, r + 1)) % size
        xs = (cx + np.arange(-r, r + 1)) % size
        np.maximum.at(out, np.ix_(ys, xs), k)
    return out * amount


def baldosa_raices_texture(size=512):
    """Tramo 1-30: losa agrietada con raices finas cruzando las juntas."""
    rng = np.random.default_rng(91)
    base = _tile_base(size=size, seed=91)
    lines = _root_lines(size, rng, 7, 7.5, 0.55) + _root_lines(size, rng, 3, 3.5, 0.3)
    v = base * (1 - np.clip(lines, 0, 1) * 0.72)
    # la losa se astilla cerca de las raices
    v -= np.clip(lines - 0.25, 0, 1) * 0.12 * (0.4 + 0.6 * periodic_noise(size, 32, rng))
    return save_gray('baldosa_raices', np.clip(v, 0, 1))


def muro_raices_texture(size=512):
    rng = np.random.default_rng(93)
    base = _brick_base(size=size, seed=93)
    lines = _root_lines(size, rng, 5, 8.0, 0.5)
    v = base * (1 - np.clip(lines, 0, 1) * 0.66)
    v -= _speckle(size, rng, 26, 5, 0.09)
    return save_gray('muro_raices', np.clip(v, 0, 1))


def baldosa_humedo_texture(size=512):
    """Tramo 31-70: piedra mojada. Manchas oscuras de agua, anillo claro de
    charco y musgo punteado."""
    rng = np.random.default_rng(81)
    base = _tile_base(size=size, seed=81)
    wet = periodic_noise(size, 3, rng)
    wet = np.clip((wet - 0.52) * 2.8, 0, 1)
    v = base * (1 - wet * 0.62)
    # el charco brilla en el borde, que es donde el agua está más quieta
    edge = np.clip((wet - 0.42) * 5, 0, 1) - wet * 0.9
    v += np.clip(edge, 0, 1) * 0.16
    moss = np.clip((periodic_noise(size, 10, rng) - 0.66) * 4.5, 0, 1)
    moss *= np.clip(periodic_noise(size, 48, rng) * 1.6, 0, 1)
    v -= moss * 0.2
    # el musgo también aclara: esporas
    v += _speckle(size, rng, 40, 3, 0.07) * (moss > 0.2)
    return save_gray('baldosa_humedo', np.clip(v, 0, 1))


def muro_humedo_texture(size=512):
    rng = np.random.default_rng(83)
    base = _brick_base(size=size, seed=83)
    # regueros: ruido estirado en vertical (poca frecuencia en y, mucha en x)
    drift = periodic_noise(size, 6, rng)
    streak = np.clip((drift - 0.62) * 3.2, 0, 1)
    col = periodic_noise(size, 28, rng)
    reg = np.zeros((size, size))
    for y in range(size):
        reg[y] = np.roll(streak[(y - 90) % size], int(7 * math.sin(y * 0.11) + 9 * col[y, :].mean()))
    v = base * (1 - np.clip(reg, 0, 1) * 0.55)
    pool = np.clip((periodic_noise(size, 3, rng) - 0.7) * 3.4, 0, 1)
    v -= pool * 0.28
    v -= _speckle(size, rng, 34, 4, 0.12)
    return save_gray('muro_humedo', np.clip(v, 0, 1))


def baldosa_oro_texture(size=512):
    """Tramo 71-100: veta brillante en vez de raiz, mota clara de oro y losa
    de hueso mas palida entre las demas."""
    rng = np.random.default_rng(71)
    base = _tile_base(size=size, seed=71)
    lines = _root_lines(size, rng, 5, 6.5, 0.55)
    v = base.copy()
    # la veta clarea (el oro refleja); el surco debajo oscurece
    vein = np.clip(lines, 0, 1)
    v += vein * 0.45
    v -= np.clip(vein - 0.62, 0, 1) * 1.1
    v -= (vein > 0.02) * (vein < 0.3) * 0.45
    flecks = _speckle(size, rng, 90, 2, 0.5)
    v += np.clip(flecks - 0.15, 0, 1) * 0.42
    # una losa de hueso, mas clara: mancha suave centrada, periodica (sin costura)
    yy, xx = np.mgrid[0:size, 0:size]
    cx, cy = size * 0.25, size * 0.25
    dxm = np.minimum(np.abs(xx - cx), size - np.abs(xx - cx))
    dym = np.minimum(np.abs(yy - cy), size - np.abs(yy - cy))
    bone = np.clip(1 - np.hypot(dxm, dym) / (size * 0.3), 0, 1)
    v = v * (1 - bone * 0.14) + bone * 0.1
    return save_gray('baldosa_oro', np.clip(v, 0, 1))


def muro_oro_texture(size=512):
    rng = np.random.default_rng(73)
    base = _brick_base(size=size, seed=73, tone_spread=0.22, tone_low=0.76)
    lines = _root_lines(size, rng, 4, 5.5, 0.5)
    v = base + np.clip(lines, 0, 1) * 0.42
    v -= np.clip(lines - 0.62, 0, 1) * 1.0
    v += np.clip(_speckle(size, rng, 70, 2, 0.45) - 0.12, 0, 1) * 0.34
    v -= _speckle(size, rng, 18, 6, 0.1)
    return save_gray('muro_oro', np.clip(v, 0, 1))


def clay_texture(size=256):
    """Barro cocido (rompibles): dos tonos proximos de base, tierra difusa y
    goteado vertical. Verificado en work/omp-rompibles-cripta/ (lamina)."""
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
# POL-02: las seis del contrato de tramos (se regeneran con el catalogo)
for f in (baldosa_raices_texture, muro_raices_texture, baldosa_humedo_texture,
          muro_humedo_texture, baldosa_oro_texture, muro_oro_texture):
    f()
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


# O9 (2026-11-17) CONTRATO DE MONTAJE contra pared (work/omp-cripta-antorchas-montaje/):
#   * Las cinco piezas (soporte, nucleo, halo, humo, chispa) comparten UN marco
#     local: origen = punto de contacto con la pared (plano de cara del muro),
#     a la altura del anclaje; +X = eje frontal hacia la sala; Z arriba.
#   * Ningun vertice queda en x < 0: montada con la misma matriz (traslacion al
#     plano de pared + yaw segun la normal), ninguna capa penetra el muro.
#   * El soporte arranca a 2 mm del plano para no ser coplanar con la cara del
#     muro (evita z-fighting sin perforarlo).
#   * El runtime coloca el ancla en el plano de pared EXACTO (offset frontal 0)
#     y gira el yaw por la normal: ver REPORTE.md.
def build_torch(b, m):
    # Placa de montaje: apoyo en la pared (x de 0,002 a 0,042).
    box(b, m, 0.022, 0.0, 0, 0.04, 0.3, 0.18)
    # Brazio forjado que sale de la placa y sube hacia la copa.
    b.tube(B(0.03, -0.1, 0), B(0.16, 0.06, 0), 0.028, 0.024, m, sides=5)
    # Copa pentagonal (misma faceta que la llama) en el eje frontal +X.
    b.tube(B(0.13, 0.08, 0), B(0.21, 0.24, 0), 0.045, 0.075, m, sides=5)


piece('d_antorcha', WOOD, build_torch)


# Fuego estilizado en cuatro piezas, verificadas en work/omp-fuego-antorchas/
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


torch_core = piece('d_llama', FLAME, build_core)
torch_halo = piece('d_llama_halo', HALO, build_halo)
torch_smoke = piece('d_llama_humo', SMOKE, build_smoke)
torch_spark = piece('d_llama_chispa', FLAME, build_spark)

# O9: las cuatro capas viajaban centradas en su propio pivote (la cola del
# nucleo y el halo metian hasta 12 cm por detras del plano de pared al recibir
# la misma matriz). Se trasladan solo en X al marco de contacto del soporte,
# centradas en la copa (x 0,13..0,28). Con la animacion de torchFlame.ts
# (nucleo yaw ±0,28/roll ±0,22/esc 0,94; halo roll ±0,18/esc 1,02) el peor x
# queda en +10 cm delante del plano. Humo y chispa: margen estatico +16 y +20
# cm; el runtime los hace girar en yaw completo alrededor de su ancla, ver
# REPORTE.md. El validador work/omp-cripta-antorchas-montaje/validar_antorchas.py
# mide capa por capa.
from mathutils import Matrix as _M  # noqa: E402
from mathutils import Vector as _V  # noqa: E402

for o, dx in ((torch_core, 0.235),
              (torch_halo, 0.24),
              (torch_smoke, 0.36),
              (torch_spark, 0.22)):
    # B(x, y, z) = (x, z, y): la altura de juego vive en el eje z de Blender.
    o.data.transform(_M.Translation(_V((dx, 0.0, 0.0))))


# O8 (2026-11-15): escalera ABIERTA y legible. Sin puerta, dintel, techo ni
# pasillo elevado (el portal anterior hacia leer una entrada, no un acceso).
# Direccion frontal = +X de juego; huella centrada <= 2,6 x 2,6; el primer
# peldano nace dentro de la huella (x = -1,00). Meseta a 1,00 m y muros en
# cuna a 1,34 maximo: hueco libre sobre toda la escalera >= 2,2 m.
def build_up(b, m):
    W = 2.0          # ancho de piso transitable (game z), dentro de +-1,0
    n, rise, tread = 5, 0.20, 0.40
    x_front = -1.0   # cara del primer peldano (dentro de la huella +-1,3)
    x_back = x_front + n * tread  # = +1,00 meseta
    top = n * rise                # = 1,00
    # peldanos en voladizo solido: cada uno arranca en su nariz y llega a la meseta
    for k in range(n):
        xs = x_front + k * tread
        h = (k + 1) * rise
        cx, dxb = (xs + x_back) / 2, (x_back - xs)
        box(b, m, cx, h / 2, 0, dxb, h, W)
    # muros laterales en cuna que siguen la rampa (barandilla baja de obra):
    # corona recta de 0,54 (arranque) a 1,34 (meseta) = peldano + 0,34.
    for zz in (-1, 1):
        prof_lo = [(x_front, 0.0), (x_front, top + 0.34),
                   (x_back, top + 0.34), (x_back, 0.0)]
        a = [b.bm.verts.new(B(px, py, zz * (W / 2))) for px, py in prof_lo]
        c = [b.bm.verts.new(B(px, py, zz * (W / 2 + 0.10))) for px, py in prof_lo]
        nf = len(a)
        faces = [b.bm.faces.new((a[i], a[(i + 1) % nf], c[(i + 1) % nf], c[i])) for i in range(nf)]
        faces.append(b.bm.faces.new(a[::-1]))
        faces.append(b.bm.faces.new(c))
        b._finish(a + c, faces, m, None)
    # zocalo de apoyo bajo el arranque para que el primer peldano no flote
    box(b, m, x_front + 0.05, 0.30, 0, 0.30, 0.60, W)


piece('d_subida', STONE, build_up, uv_metres=TILE)


# O8 (2026-11-15): abertura DESCENDENTE. Lee bajada hacia +X: se entra por -X
# sobre el broal de arranque (0,45), los peldanos escalonados (narices
# 0,36/0,26/0,17) bajan y caen al pozo que el runtime coloca con d_boca (card
# 0,02 en el centro de la celda; esta visible en el hueco x 0,70..1,03). El
# frente +X es el borde bajo de seguridad (0,14). Nada de puerta, arco ni
# volumen que parezca subida: maximo 0,45 m. Misma convencion de origen y
# direccion que d_subida (frontal +X, huella <= 2,6 x 2,6 centrada).
def build_down_frame(b, m):
    W = 2.0
    half = 1.10
    top, lip = 0.45, 0.14
    # broal de arranque (-X): del suelo de la sala hacia el hueco
    box(b, m, -half + 0.11, top / 2, 0, 0.22, top, 2 * half)
    # muros laterales continuos en cuna: corona 0,45 atras -> 0,16 delante
    for zz in (-1, 1):
        prof_lo = [(-half, 0.0), (-half, top), (half, 0.16), (half, 0.0)]
        a = [b.bm.verts.new(B(px, py, zz * (half - 0.10))) for px, py in prof_lo]
        c = [b.bm.verts.new(B(px, py, zz * half)) for px, py in prof_lo]
        nf = len(a)
        faces = [b.bm.faces.new((a[i], a[(i + 1) % nf], c[(i + 1) % nf], c[i])) for i in range(nf)]
        faces.append(b.bm.faces.new(a[::-1]))
        faces.append(b.bm.faces.new(c))
        b._finish(a + c, faces, m, None)
    # peldanos escalonados hacia el pozo: cajas contiguas sin ranuras
    for xs, dx, h in ((-0.60, 0.60, 0.36), (-0.05, 0.50, 0.26), (0.45, 0.50, 0.17)):
        box(b, m, xs, h / 2, 0, dx, h, W)
    # borde bajo de seguridad al frente del pozo (+X)
    box(b, m, half - 0.07, lip / 2, 0, 0.14, lip, 2 * half - 0.28)


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
    # POL-01: arco de piedra escalonado que se lee de lejos desde el camino.
    # El frente mira a +X local (world -X, facingDeg 180 — igual que la vieja
    # runa a x=0,42). Dos pilares con basa y capitel, dintel de tres gradas
    # hasta la campana (~4,6 m), repisas de antorcha de frente, peldanos al
    # hueco y letrero del portero junto al pilar del camino.
    for z in (-1.5, 1.5):
        box(b, m, 0, 0.14, z, 1.05, 0.28, 1.05)      # basa
        box(b, m, 0, 1.75, z, 0.62, 3.0, 0.62)       # fuste
        box(b, m, 0, 3.35, z, 0.84, 0.35, 0.84)      # capitel
        box(b, m, 0.48, 2.2, z, 0.3, 0.14, 0.4)      # repisa de antorcha
    for r, y in ((1.2, 3.72), (0.95, 4.06), (0.62, 4.34)):
        box(b, m, 0, y, 0, 0.9, 0.34, r * 2 + 1.8)   # gradas del remate
    box(b, m, 0, 4.6, 0, 0.7, 0.24, 1.0)             # campana
    # hueco: dintel grueso sobre los pilares (el paso tiene 2,4 m de luz)
    box(b, m, 0, 3.6, 0, 0.95, 0.5, 3.6)
    # las jambas internas estrechan el paso hasta 1,9 m de luz
    for z in (-1.05, 1.05):
        box(b, m, 0, 1.8, z, 0.9, 3.0, 0.3)
    # los peldanos suben del umbral hacia la loma
    for k in range(3):
        box(b, m, -0.3 - k * 0.5, 0.1 - k * 0.03, 0, 0.45, 0.08, 2.4)
    # letrero: poste y tabla de cara al camino, junto al pilar derecho
    box(b, m, 1.15, 0.6, 2.35, 0.14, 1.2, 0.14)
    box(b, m, 1.15, 1.25, 2.35, 0.1, 0.62, 1.2)
    # mangos de antorcha clavados en las repisas de frente
    for z in (-1.5, 1.5):
        b.tube(B(0.55, 2.35, z), B(0.75, 2.62, z), 0.045, 0.038, m, sides=4)


piece('d_entrada', STONE, build_gate, uv_metres=TILE)
# Auditoria: la boca llegaba a x=-2.3 (40 cm fuera del monticulo y entre
# monticulo y umbral: lama negra flotando). Recortada a x∈[-1.525,-0.1],
# justo bajo los tres peldanos del umbral de d_entrada.
# POL-01: ademas, tapamonos vertical negro al fondo del hueco (-X, loma): al
# mirar el arco de frente desde el camino solo se ve negrura, sin cielo.
piece('d_entrada_boca', DARK, lambda b, m: (
    box(b, m, -0.8125, 0.03, 0, 1.425, 0.04, 2.16),
    box(b, m, -0.55, 1.85, 0, 0.06, 3.6, 2.44),
))


# POL-01: el monticulo abraza la boca por detras y los flancos (-X y ±Z) y se
# hunde en la campana: el arco asoma como entrada de huaca en la loma, no
# como marco suelto en un llano. El frente (+X) queda expedito para el camino.
def build_mound(b, m):
    b.blob(B(-3.1, 0.1, 0), (2.4, 3.6, 2.6), m, subdiv=3)
    b.blob(B(-0.9, 0.1, -3.4), (1.8, 1.9, 1.7), m, subdiv=2)
    b.blob(B(-0.9, 0.1, 3.4), (1.8, 1.9, 1.7), m, subdiv=2)


piece('d_entrada_monticulo', MOUND, build_mound)


def build_rune(b, m):
    # POL-01: el glow azul hace la legibilidad de lejos, todo de frente (+X):
    # aro en la campana, arco de dovelas enmarcando el hueco y glifos en el
    # letrero.
    ring(b, m, 0.62, 0.09, center=(0.47, 4.6, 0), axis_x=True, segments=14)
    for i in range(6):
        t0 = math.pi * i / 6
        t1 = math.pi * (i + 1) / 6

        def dovela(t):
            return B(0.52, 2.3 + 1.3 * math.sin(t), 1.3 * math.cos(t))
        b.tube(dovela(t0), dovela(t1), 0.08, 0.08, m, sides=3)
    # dos glifos en la tabla del letrero (cara al camino, +X)
    for gz in (2.12, 2.58):
        ring(b, m, 0.3, 0.05, center=(1.22, 1.25, gz), axis_x=True, segments=8)


piece('d_entrada_runa', RUNE, build_rune)

# Pisos profundos (F25): jarras, barriles, puertas y estanques. Los rompibles
# llevan textura propia en color (barro/duela); el resto lo tine el juego.
# Catalogo verificado pieza a pieza en work/omp-rompibles-cripta/ (lamina de
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
