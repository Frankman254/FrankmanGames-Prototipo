# Prototipo aislado de los rompibles de la cripta (Prompt 3, 2026-11-12).
#   blender --background --python arte/omp-rompibles-cripta/rompibles.py
# Escribe SOLO en esta carpeta. Entrega visual y de presupuesto antes de tocar
# mazmorra.py: 4 jarras (comun, alta, ancha, agrietada), 3 barril/caja
# (barril + aros, barril bajo, caja de tablones) y dos fragmentos coherentes
# (cascotes de barro, astillas de madera). Texturas procedurales propias:
# barro con manchas de tierra y goteado, madera con duelas y nudos.
# Topes del encargo: <=500 tri por objeto entero, <=120 por fragmento.
import importlib
import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..', 'scripts', 'blender')))
import fg

importlib.reload(fg)

WORK = os.path.normpath(os.path.dirname(bpy.path.abspath(__file__)))
fg.MODELS = WORK
TEXTURES = os.path.join(WORK, 'texturas')


def B(x, y, z):
    return (x, z, y)  # y de juego -> z de Blender


scene = fg.fresh_scene('Rompibles')


# ---- texturas procedurales (las mismas helpers que mazmorra.py) ------------
def periodic_noise(size, cells, rng):
    grid = rng.random((cells, cells))
    t = np.arange(size) * cells / size
    i0 = t.astype(int) % cells
    i1 = (i0 + 1) % cells
    f = t - np.floor(t)
    f = f * f * (3 - 2 * f)
    a = grid[np.ix_(i0, i0)] * (1 - f)[:, None] + grid[np.ix_(i1, i0)] * f[:, None]
    bb = grid[np.ix_(i0, i1)] * (1 - f)[:, None] + grid[np.ix_(i1, i1)] * f[:, None]
    return a * (1 - f)[None, :] + bb * f[None, :]


def grain(size, rng):
    return periodic_noise(size, 6, rng) * 0.5 + periodic_noise(size, 24, rng) * 0.3 + periodic_noise(size, 96, rng) * 0.2


def save_rgb(name, values):
    """Guarda un PNG en RGB (values: (h,w,3) de 0 a 1)."""
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


def clay_texture(size=256):
    """Barro cocido: dos tonos proximos de base, tierra difusa y goteado."""
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


def wood_texture(size=256):
    """Madera de toneles y cajas: tono calido con veta suave y nudos. Sin
    duelas dibujadas: las tablas y los aros los aporta la geometria (duelas
    horizontales leidas en el barril como aros de hierro = error de lectura)."""
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
    return save_rgb('madera', np.clip(out, 0, 1))


BARRO = fg.textured_material('Barro_rompible', clay_texture())
MADERA = fg.textured_material('Madera_rompible', wood_texture())
HIERRO = fg.material('Hierro_aro', (0.2, 0.2, 0.22), metallic=0.6)
parts = []


def piece(name, mat, build, uv_scale=None):
    b = fg.Builder(name)
    build(b, mat)
    o = b.object(scene)
    if uv_scale:
        fg.box_uv(o, uv_scale)
    parts.append(o)
    return o


# ---- jarras ---------------------------------------------------------------
def lathe(b, m, profile, sides):
    for (y0, r0), (y1, r1) in zip(profile, profile[1:]):
        b.tube(B(0, y0, 0), B(0, y1, 0), r0, r1, m, sides=sides)


# Comun: la publicada, perfil intacto.
JAR_A = [(0, 0.14), (0.07, 0.21), (0.28, 0.27), (0.5, 0.22), (0.62, 0.11), (0.69, 0.095), (0.76, 0.135)]
piece('d_jarra', BARRO, lambda b, m: lathe(b, m, JAR_A, 11), uv_scale=0.5)

# Alta: silueta alargada y estilizada, boca más evasada.
JAR_B = [(0, 0.11), (0.1, 0.17), (0.42, 0.2), (0.7, 0.15), (0.84, 0.085), (0.9, 0.09), (0.98, 0.13)]
piece('d_jarra_alta', BARRO, lambda b, m: lathe(b, m, JAR_B, 11), uv_scale=0.5)

# Ancha: tinaja baja panzuda; la boca ancha la distingue de lejos.
JAR_C = [(0, 0.16), (0.06, 0.26), (0.22, 0.34), (0.38, 0.3), (0.46, 0.2), (0.5, 0.23)]
piece('d_jarra_ancha', BARRO, lambda b, m: lathe(b, m, JAR_C, 11), uv_scale=0.5)


# Agrietada: perfil común con la boca mellada (dos trozos caídos), un golpe
# en la panza y dos grietas finas en relieve hundido; lectura a 3 pasos.
def jagged_ring(bm, uv_layer, y_fn, r_fn, angle0=0.0):
    vs = []
    for i in range(11):
        t = angle0 + 2 * math.pi * i / 11
        r = r_fn(t)
        vs.append(bm.verts.new((r * math.cos(t), r * math.sin(t), y_fn(t))))
    return vs


def build_cracked(b, m):
    bm = b.bm
    rings = []
    prof = [(y0, r0) for (y0, r0) in JAR_A[:6]]
    # cuerpo igual hasta el cuello; los dos anillos del borde, mellados
    for k, (y0, r0) in enumerate(prof):
        rs = []
        for i in range(11):
            t = 2 * math.pi * i / 11
            wobble = 0
            if k >= 4:  # cuello y base del borde: abolladuras verticales (grietas)
                wobble = -0.012 * max(0.0, math.cos(3 * (t - 0.7))) ** 8 - 0.010 * max(0.0, math.cos(5 * (t + 1.2))) ** 10
            if k == 2:  # golpe en la panza: hundimiento plano
                wobble += -0.02 * max(0.0, math.cos(t - 2.4)) ** 4 * (1 if y0 == 0.28 else 0)
            rs.append(bm.verts.new(( (r0 + wobble) * math.cos(t), (r0 + wobble) * math.sin(t), y0)))
        rings.append(rs)
    for ra, rb in zip(rings, rings[1:]):
        for i in range(11):
            bm.faces.new((ra[i], ra[(i + 1) % 11], rb[(i + 1) % 11], rb[i]))
    bm.faces.new(rings[0][::-1])
    # borde mellado: alturas irregulares en el anillo superior, luego cara.
    # Envolvente senoidal: el trozo caido deja un borde curvo, no cuernos.
    def top_y(t):
        if 0.8 < t < 2.2:
            return 0.76 - 0.17 * math.sin(math.pi * (t - 0.8) / 1.4)
        if 3.5 < t < 4.3:
            return 0.76 - 0.09 * math.sin(math.pi * (t - 3.5) / 0.8)
        return 0.76
    top = jagged_ring(bm, b.uv, top_y, lambda t: JAR_A[-1][1] + 0.004)
    neck = rings[-1]
    for i in range(11):
        bm.faces.new((neck[i], neck[(i + 1) % 11], top[(i + 1) % 11], top[i]))
    bm.faces.new(top)
    b._finish([v for r in rings + [top] for v in r], list(bm.faces), m, None)


piece('d_jarra_agrietada', BARRO, build_cracked, uv_scale=0.5)

# ---- barril / caja --------------------------------------------------------
BAR_C = [(0, 0.27), (0.22, 0.33), (0.45, 0.355), (0.68, 0.33), (0.9, 0.27)]


def box(b, mat, x, y, z, w, h, d):
    b.box(B(x, y, z), (w, d, h), mat)


piece('d_barril', MADERA, lambda b, m: lathe(b, m, BAR_C, 12), uv_scale=0.5)


def build_hoops(b, m):
    for y, r in ((0.07, 0.29), (0.28, 0.345), (0.62, 0.345), (0.83, 0.29)):
        b.tube(B(0, y - 0.03, 0), B(0, y + 0.03, 0), r + 0.012, r + 0.012, m, sides=12)


piece('d_barril_aros', HIERRO, build_hoops)

# Barril bajo y gordo: tapa visible (casquete claro del tablero) y aros de
# madera en relieve, sin hierro: otra familia silueta contra el alto.
def build_stub(b, m):
    prof = [(0, 0.24), (0.14, 0.3), (0.26, 0.315), (0.38, 0.3), (0.5, 0.24)]
    lathe(b, m, prof, 12)
    b.tube(B(0, 0.5, 0), B(0, 0.525, 0), 0.24, 0.225, m, sides=12)  # tapón
    for y, r in ((0.05, 0.282), (0.25, 0.342), (0.45, 0.282)):
        b.tube(B(0, y - 0.018, 0), B(0, y + 0.018, 0), r, r, m, sides=12)  # aros de madera en relieve


piece('d_barril_bajo', MADERA, build_stub, uv_scale=0.5)


# Caja de tablones: hueca por fuera (5 cajas: fondo + 4 paredes), travesaño
# y cantoneras: los listones salientes leen "caja" a un paso del suelo.
def build_crate(b, m):
    t = 0.028
    box(b, m, 0, t / 2, 0, 0.62, t, 0.5)                # fondo apoyado
    box(b, m, 0, 0.19, 0.25 - t / 2, 0.62, 0.34, t)     # pared +z
    box(b, m, 0, 0.19, -0.25 + t / 2, 0.62, 0.34, t)    # pared -z
    box(b, m, 0.31 - t / 2, 0.19, 0, t, 0.34, 0.5)      # pared +x
    box(b, m, -0.31 + t / 2, 0.19, 0, t, 0.34, 0.5)     # pared -x
    for zs in (-1, 1):
        box(b, m, 0, 0.19, zs * (0.25 - t), 0.66, 0.06, t)  # travesanos sobre la pared
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(b, m, sx * 0.31, 0.19, sz * 0.23, 0.05, 0.34, 0.05)  # cantoneras


piece('d_caja', MADERA, build_crate, uv_scale=0.5)

# ---- fragmentos coherentes (<=120 tri cada uno) ----------------------------


def build_pottery_shards(b, m):
    # Cascotes de barro: tiestos curvos (anillos de tubo achatado) + base.
    rng = np.random.default_rng(5)
    for k in range(6):
        a = 2 * math.pi * k / 6 + rng.random() * 0.7
        d = 0.12 + rng.random() * 0.3
        h = 0.035 + rng.random() * 0.04
        p0 = (math.cos(a) * d, math.sin(a) * d)
        b.tube(B(p0[0], h * 0.4, p0[1]), B(p0[0] * 1.5, h, p0[1] * 1.5), 0.05, 0.085, m, sides=4)
    b.tube(B(0, 0, 0), B(0, 0.1, 0), 0.19, 0.2, m, sides=8, flat=0.55)


piece('d_cascotes', BARRO, build_pottery_shards)


def build_wood_splinters(b, m):
    # Astillas de duela: tablas rotas tumbadas + dos cascos de aro.
    rng = np.random.default_rng(9)
    for k in range(5):
        a = 2 * math.pi * k / 5 + rng.random() * 0.9
        d = 0.14 + rng.random() * 0.26
        ln = 0.2 + rng.random() * 0.14
        b.box(B(math.cos(a) * d, 0.008, math.sin(a) * d), (0.055, ln, 0.012), m, rot=(a, 'Z'))
    for k, (a, dd) in enumerate(((0.5, 0.34), (2.6, 0.3))):
        # cascos de aro a medio enterrar: el eje esta a 1 cm del suelo
        b.tube(B(math.cos(a) * dd, 0.01, math.sin(a) * dd), B(math.cos(a + 0.8) * dd, 0.01, math.sin(a + 0.8) * dd), 0.014, 0.014, m, sides=5)


piece('d_cascotes_madera', MADERA, build_wood_splinters)


# ---- informe de presupuesto ------------------------------------------------
os.makedirs(WORK, exist_ok=True)
print('--- triangulos (limite 500 objeto / 120 fragmento) ---')
for o in parts:
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    zs = [(o.matrix_world @ v.co).z for v in o.data.vertices]
    print(f'{o.name:22s} {tris:4d} tri  zmin={min(zs):.3f}')
fg.export('rompibles.glb', scene, parts, materials=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'rompibles.blend'))
print('escrito:', os.path.join(WORK, 'rompibles.glb'))
