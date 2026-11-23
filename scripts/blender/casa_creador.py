# CLA-CASA1 (creador, 2026-11-23): «deje una nueva carpeta con los planos de mi casa si puedes
# modelarla en blender y meterla al juego». CLA-CASA2 (creador, 2026-11-23): «te di los planos
# exactos [...] la casa tiene 3 cuartos y 2 baños [...] debes hacer otra version aplicandole mirror
# [...] la puerta principal no veo el diseño de la reja tal cual la tenia en la imagen».
# Casa del creador, de geometría y texturas propias, levantada de data/casa_creador_planta.json.
#   /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/blender/casa_creador.py
# Escribe (PROPUESTA) en assets/models/:
#   casa_creador.glb y casa_creador_espejo.glb: exterior con la puerta principal articulada
#     (clips "Abrir" y "Cerrar"); la fachada mira a -Y.
#   casa_creador_interior.glb y casa_creador_espejo_interior.glb: la planta a escala real, sin
#     techo, con sus 3 recámaras, 2 baños, cocina, sala-comedor y portal, para caminarla.
# y arte/blender/casa_creador.blend.
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

HERE = os.path.dirname(bpy.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
TEX = 512


# --- Texturas pintadas por código, con acabado limpio de anime: manchas suaves, sin ruido ---
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
    img = np.ones((TEX, TEX, 4))
    for c in range(3):
        img[:, :, c] = np.clip(luz * rgb[c], 0, 1) ** (1 / 2.2)
    im = bpy.data.images.new(nombre, TEX, TEX, alpha=False)
    im.pixels.foreach_set(img.astype(np.float32).ravel())
    im.pack()
    return im


def repello(seed):
    """Repello fino: grano suave en dos escalas y un leve oscurecido al pie. Cada 3 m."""
    rng = np.random.default_rng(seed)
    luz = 1 + (_fractal(rng, 4, 3) - 0.5) * 0.10
    luz *= 1 + (_fractal(rng, 64, 2) - 0.5) * 0.10
    v = (np.arange(TEX) / TEX)[:, None]
    luz *= 0.86 + 0.14 * np.clip(v / 0.06, 0, 1) ** 0.5
    # Posterizado suave: tres escalones de luz, lectura de anime sin perder el grano.
    return np.round(luz * 14) / 14


def teja(seed):
    """Teja criolla: hiladas paralelas al alero, lomo claro, sombra fuerte bajo cada hilada.
    Filas en U (la pendiente de esta casa corre en X)."""
    rng = np.random.default_rng(seed)
    filas, piezas = 8, 12
    u = np.arange(TEX)[None, :] / TEX * filas
    v = np.arange(TEX)[:, None] / TEX * piezas
    fila = np.floor(u).astype(int)
    fu = u - fila
    vv = v + (fila % 2) * 0.5
    col = np.floor(vv).astype(int) % piezas
    fv = vv - np.floor(vv)
    tono = rng.random((filas, piezas))[fila % filas, col] * 0.14 + 0.9
    lomo = np.where(np.abs(fv - 0.5) < 0.22, 1.12, 0.86)  # dos tonos, como pintado a mano
    hilada = np.where(fu < 0.18, 0.62, 1.0)
    return tono * lomo * hilada


def tabla(seed, tablas=6):
    """Machimbre del cielo del alero: tablas con veta suave y junta marcada. Cada metro."""
    rng = np.random.default_rng(seed)
    u = np.arange(TEX)[None, :] / TEX * tablas
    v = np.arange(TEX)[:, None] / TEX
    i = np.floor(u).astype(int)
    fu = u - i
    vetas = np.sin((fu * 5 + _fractal(rng, 4, 2) * 2) * math.pi * 2 + v * 2)
    luz = 0.92 + 0.05 * vetas + rng.random(tablas)[i % tablas] * 0.1 - 0.05
    return luz * np.where(np.minimum(fu, 1 - fu) < 0.04, 0.6, 1.0)


def baldosa(seed, piezas=3):
    """Baldosa del portal: piezas de 33 cm con junta clara."""
    rng = np.random.default_rng(seed)
    u = np.arange(TEX)[None, :] / TEX * piezas
    v = np.arange(TEX)[:, None] / TEX * piezas
    tono = rng.random((piezas, piezas))[np.floor(v).astype(int) % piezas, np.floor(u).astype(int) % piezas] * 0.06 + 0.97
    junta = np.minimum(np.minimum(u % 1, 1 - u % 1), np.minimum(v % 1, 1 - v % 1)) < 0.025
    return np.where(junta, 1.12, tono) * (1 + (_fractal(rng, 8, 2) - 0.5) * 0.05)


def concreto(seed):
    """Losa de concreto escobillado con juntas cada 1,5 m."""
    rng = np.random.default_rng(seed)
    luz = 1 + (_fractal(rng, 8, 3) - 0.5) * 0.12
    u = np.arange(TEX)[None, :] / TEX * 2
    junta = np.minimum(u % 1, 1 - u % 1) < 0.008
    return np.where(junta, 0.7, luz)


def con_textura(nombre, rgb, luz, rough):
    m = fg.textured_material(nombre, _imagen(nombre + '_tex', luz, rgb))
    next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Roughness'].default_value = rough
    return m


def uv_por_material(obj, metros):
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




# --- Planta (data/casa_creador_planta.json): la misma que usa el juego para el interior ---
with open(os.path.join(ROOT, 'data', 'casa_creador_planta.json'), encoding='utf-8') as fh:
    PLANTA = json.load(fh)
W = PLANTA['ancho']
D = PLANTA['fondo']
HW = W / 2
ALTO = PLANTA['alto']
FLOOR = PLANTA['piso']    # piso terminado sobre el terreno (exterior)
MARGEN = 1.6              # interior: césped alrededor (igual que CASA_MARGIN en src/world/casaCreador.ts)
EAVE = 0.6
RIDGE = 3.75
EAVE_Z = 2.78
ROOF_T = 0.08
SLOPE = (RIDGE - EAVE_Z) / (HW + EAVE)
HUECOS = PLANTA['huecos']


def roof_under(x):
    return RIDGE - SLOPE * abs(x) - ROOF_T - 0.02


class Mapa:
    """De la planta (x, d) a Blender. Exterior: centro de la casa en el origen y fachada a -Y.
    Interior: esquina del césped en el origen; en el juego, x = X y z = Y (el visor gira 180°).
    `espejo`: x → ancho − x (la versión espejada de la casa)."""

    def __init__(self, espejo, interior):
        self.espejo, self.interior = espejo, interior
        self.z0 = 0.0 if interior else FLOOR

    def x(self, px):
        px = W - px if self.espejo else px
        return px + MARGEN if self.interior else px - HW

    def y(self, d):
        return (D - d) + MARGEN if self.interior else D / 2 - d

    def p(self, px, d, z):
        return Vector((self.x(px), self.y(d), z))


def caja(b, m, px0, px1, d0, d1, z0, z1, mat):
    if px1 - px0 <= 1e-4 or d1 - d0 <= 1e-4 or z1 - z0 <= 1e-4:
        return
    b.box((m.x((px0 + px1) / 2), m.y((d0 + d1) / 2), (z0 + z1) / 2), (px1 - px0, d1 - d0, z1 - z0), mat)


def segmento(b, A, B, ancho, grosor, normal, mat):
    """Barra de A a B (Blender), `ancho` en el plano y `grosor` a lo largo de `normal`."""
    A, B = Vector(A), Vector(B)
    d = B - A
    L = d.length
    if L < 1e-5:
        return
    ex = d / L
    ey = Vector(normal).normalized()
    ez = ex.cross(ey).normalized()
    ey = ez.cross(ex).normalized()
    mt = Matrix.Identity(4)
    for i in range(3):
        mt[i][0] = ex[i] * L
        mt[i][1] = ey[i] * grosor
        mt[i][2] = ez[i] * ancho
        mt[i][3] = (A[i] + B[i]) / 2
    r = bmesh.ops.create_cube(b.bm, size=1, matrix=mt)
    vs = r['verts']
    b._finish(vs, list({f for v in vs for f in v.link_faces}), mat, None)


class Cara:
    """Cara de un muro: u a lo largo del muro, n hacia fuera (0 = la cara), z arriba."""

    def __init__(self, b, m, muro, lado):
        self.b, self.m = b, m
        self.porD = (muro['d1'] - muro['d0']) > (muro['x1'] - muro['x0'])
        if lado == 'izq':
            self.plano, self.s = muro['x0'], -1
        elif lado == 'der':
            self.plano, self.s = muro['x1'], 1
        elif lado == 'fondo':
            self.plano, self.s = muro['d0'], -1
        else:
            self.plano, self.s = muro['d1'], 1

    def plan(self, u, n):
        o = self.plano + self.s * n
        return (o, u) if self.porD else (u, o)

    def p(self, u, n, z):
        px, d = self.plan(u, n)
        return self.m.p(px, d, z)

    def normal(self):
        return self.p(0, 1, 0) - self.p(0, 0, 0)

    def box(self, u, n, z, su, sn, sz, mat):
        px, d = self.plan(u, n)
        if self.porD:
            caja(self.b, self.m, px - sn / 2, px + sn / 2, d - su / 2, d + su / 2, z - sz / 2, z + sz / 2, mat)
        else:
            caja(self.b, self.m, px - su / 2, px + su / 2, d - sn / 2, d + sn / 2, z - sz / 2, z + sz / 2, mat)

    def seg(self, u0, z0, u1, z1, n, ancho, grosor, mat):
        segmento(self.b, self.p(u0, n, z0), self.p(u1, n, z1), ancho, grosor, self.normal(), mat)


def muro_con_huecos(b, m, muro, z0, z1, mat, desde=None, hasta=None, capa=None):
    """El muro de la planta con sus huecos. `capa` = (a0, a1): sólo esa franja del grueso."""
    porD = (muro['d1'] - muro['d0']) > (muro['x1'] - muro['x0'])
    u0 = muro['d0'] if porD else muro['x0']
    u1 = muro['d1'] if porD else muro['x1']
    if desde is not None:
        u0 = max(u0, desde)
    if hasta is not None:
        u1 = min(u1, hasta)
    a0, a1 = capa if capa else ((muro['x0'], muro['x1']) if porD else (muro['d0'], muro['d1']))

    def pieza(ua, ub, za, zb):
        if porD:
            caja(b, m, a0, a1, ua, ub, za, zb, mat)
        else:
            caja(b, m, ua, ub, a0, a1, za, zb, mat)

    cur = u0
    for h in sorted(muro['huecos'], key=lambda h: h['desde']):
        ha, hb = max(h['desde'], u0), min(h['hasta'], u1)
        if hb <= ha:
            continue
        t = HUECOS[h['tipo']]
        za = z0 + t['alfeizar']
        zb = za + t['alto']
        pieza(cur, ha, z0, z1)
        pieza(ha, hb, z0, za)
        pieza(ha, hb, zb, z1)
        cur = hb
    pieza(cur, u1, z0, z1)


def ventana(c: Cara, h, M, z0):
    """Ventana vista desde fuera: vidrio y cortina dentro, marco blanco y reja negra al ras."""
    t = HUECOS[h['tipo']]
    ancho = h['hasta'] - h['desde']
    uc = (h['desde'] + h['hasta']) / 2
    za = z0 + t['alfeizar']
    alto = t['alto']
    zb = za + alto
    zc = (za + zb) / 2
    c.box(uc, -0.055, zc, ancho, 0.02, alto, M['vidrio'])
    if t['reja'] == 'aspa':
        c.box(uc, -0.085, zc, ancho, 0.02, alto, M['cortina'])
    else:
        # Celosía de vidrio (planos: V-B y V-C): lamas horizontales claras.
        n = max(3, int(alto / 0.1))
        for i in range(n):
            c.box(uc, -0.04, za + alto * (i + 0.5) / n, ancho - 0.04, 0.012, 0.018, M['blanco'])
    mw = 0.1 if t['reja'] == 'aspa' else 0.07
    c.box(uc, 0.015, zb + mw / 2, ancho + 2 * mw, 0.05, mw, M['blanco'])
    for s in (-1, 1):
        c.box(uc + s * (ancho / 2 + mw / 2), 0.015, zc, mw, 0.05, alto, M['blanco'])
    if t['reja'] == 'aspa' and alto >= 1:
        # Alféizar blanco ancho, como en la fachada de la foto.
        c.box(uc, 0.05, za - 0.09, ancho + 2 * mw + 0.24, 0.11, 0.18, M['blanco'])
    else:
        c.box(uc, 0.02, za - mw / 2, ancho + 2 * mw, 0.06, mw, M['blanco'])
    # Reja: marco negro, barrotes verticales cada ~11 cm.
    bar = 0.035
    n = 0.045
    ra, rb = za + 0.02, zb - 0.02
    hh = rb - ra
    rc = (ra + rb) / 2
    c.box(uc, n, rb - bar, ancho - 0.03, bar, bar * 2, M['negro'])
    c.box(uc, n, ra + bar, ancho - 0.03, bar, bar * 2, M['negro'])
    for s in (-1, 1):
        c.box(uc + s * (ancho / 2 - 0.015 - bar), n, rc, bar * 2, bar, hh, M['negro'])
    barrotes = max(3, round(ancho / 0.11))
    for i in range(1, barrotes):
        c.box(uc - ancho / 2 + ancho * i / barrotes, n, rc, 0.022, 0.022, hh - 0.02, M['negro'])
    if t['reja'] == 'aspa':
        # Banda roja a media altura y aspa negra encima, como en la foto.
        c.box(uc, n + 0.012, rc, ancho - 0.1, 0.022, 0.045, M['rojo'])
        dx, dz = ancho * 0.3, hh * 0.36
        c.seg(uc - dx, rc - dz, uc + dx, rc + dz, n + 0.03, 0.06, 0.035, M['negro'])
        c.seg(uc - dx, rc + dz, uc + dx, rc - dz, n + 0.03, 0.06, 0.035, M['negro'])


# Dibujo de la reja de la puerta principal (foto del creador), en fracciones de la hoja:
# u de la bisagra (0) a la cerradura (1), v de abajo (0) arriba (1). Simétrico salvo la manija.
REJA_ARRIBA = [
    [(0.22, 0.935), (0.22, 0.765), (0.5, 0.635), (0.78, 0.765), (0.78, 0.935)],
    [(0.35, 0.935), (0.35, 0.805), (0.5, 0.725), (0.65, 0.805), (0.65, 0.935)],
]
REJA_LADO = [
    [(0.2, 0.69), (0.38, 0.605), (0.38, 0.395), (0.2, 0.31)],
    [(0.085, 0.6), (0.2, 0.55), (0.2, 0.45), (0.085, 0.4)],
]
ROJO_LADO = [(0.165, 0.645), (0.295, 0.585), (0.295, 0.415), (0.165, 0.355)]


def puerta_principal(scene, house, M, m: Mapa, h):
    """Puerta de reja P1, con su dibujo de la foto, articulada en la bisagra."""
    t = HUECOS['P1']
    ancho = h['hasta'] - h['desde'] - 0.02
    alto = t['alto']
    sg = -1 if m.espejo else 1
    d = fg.Builder('FG_CasaCreador_Puerta')
    z0 = m.z0

    def P(u, v, n):
        # n > 0 hacia la calle (−Y en Blender).
        return Vector((sg * u * ancho, -n, z0 + v * alto))

    normal = Vector((0, -1, 0))

    def linea(pts, n, grueso, mat, espejar_u=False, espejar_v=False):
        for (ua, va), (ub, vb) in zip(pts, pts[1:]):
            if espejar_u:
                ua, ub = 1 - ua, 1 - ub
            if espejar_v:
                va, vb = 1 - va, 1 - vb
            # Las juntas se alargan medio grueso para que los quiebres cierren.
            A, B = P(ua, va, n), P(ub, vb, n)
            e = (B - A).normalized() * (grueso / 2)
            segmento(d, A - e, B + e, grueso, 0.03, normal, mat)

    # Hoja negra lisa detrás del dibujo.
    segmento(d, P(0, 0.5, 0.0), P(1, 0.5, 0.0), alto, 0.035, normal, M['negro'])
    # Marco exterior y marco interior en relieve.
    for (ua, va), (ub, vb), g in (((0.0, 0.0), (0.0, 1.0), 0.05), ((1.0, 0.0), (1.0, 1.0), 0.05),
                                  ((0.0, 0.0), (1.0, 0.0), 0.05), ((0.0, 1.0), (1.0, 1.0), 0.05)):
        k = g / 2 / ancho
        kv = g / 2 / alto
        ua2 = min(max(ua, k), 1 - k)
        ub2 = min(max(ub, k), 1 - k)
        va2 = min(max(va, kv), 1 - kv)
        vb2 = min(max(vb, kv), 1 - kv)
        linea([(ua2, va2), (ub2, vb2)], 0.025, g, M['negro_brillo'])
    ki, kvi = 0.075, 0.035
    linea([(ki, kvi), (1 - ki, kvi), (1 - ki, 1 - kvi), (ki, 1 - kvi), (ki, kvi)], 0.025, 0.028, M['negro_brillo'])
    for ev in (False, True):
        for pts in REJA_ARRIBA:
            linea(pts, 0.03, 0.034, M['negro_brillo'], espejar_v=ev)
        # Veta roja central, arriba y abajo.
        linea([(0.5, 0.75), (0.5, 0.92)], 0.04, 0.05, M['rojo'], espejar_v=ev)
    # Espina central.
    linea([(0.5, 0.36), (0.5, 0.64)], 0.03, 0.045, M['negro_brillo'])
    for eu in (False, True):
        for pts in REJA_LADO:
            linea(pts, 0.03, 0.034, M['negro_brillo'], espejar_u=eu)
        linea(ROJO_LADO, 0.04, 0.045, M['rojo'], espejar_u=eu)
    # Manija de palanca y cerradura, junto al borde libre.
    d.box(tuple(P(0.91, 0.47, 0.05)), (0.05, 0.02, 0.2), M['metal'])
    segmento(d, P(0.91, 0.5, 0.09), P(0.8, 0.5, 0.09), 0.025, 0.025, normal, M['metal'])
    d.box(tuple(P(0.91, 0.5, 0.07)), (0.03, 0.06, 0.03), M['metal'])
    d.box(tuple(P(0.91, 0.42, 0.065)), (0.035, 0.02, 0.035), M['metal'])
    # Bisagra en la esquina del hueco, al ras de la cara exterior del muro.
    muro = next(w for w in PLANTA['muros'] if w['id'] == 'fachada_sala')
    hinge = m.p(h['desde'] + 0.01, muro['d1'] - 0.03, 0)
    door = d.object(scene, parent=house)
    door.location = hinge
    door.rotation_mode = 'XYZ'
    abrir = fg.key_rotation(door, 'Abrir', [(1, 0), (5, -8 * sg), (16, 112 * sg), (21, 100 * sg), (25, 104 * sg)], axis=2)
    cerrar = fg.key_rotation(door, 'Cerrar', [(1, 104 * sg), (14, -3 * sg), (17, 1.5 * sg), (20, 0)], axis=2)
    fg.to_tracks(door, [abrir, cerrar])
    door.rotation_euler = (0, 0, 0)
    return door


def materiales():
    return {
        'pared': con_textura('Repello', (0.86, 0.66, 0.43), repello(3), 0.93),
        'zocalo': con_textura('RepelloBajo', (0.74, 0.54, 0.32), repello(4), 0.95),
        'teja': con_textura('Teja', (0.68, 0.2, 0.12), teja(5), 0.7),
        'cielo': con_textura('Machimbre', (0.52, 0.3, 0.17), tabla(6), 0.8),
        'baldosa': con_textura('Baldosa', (0.86, 0.8, 0.72), baldosa(7), 0.55),
        'concreto': con_textura('Concreto', (0.66, 0.65, 0.62), concreto(8), 0.95),
        'blanco': fg.material('Remate', (0.93, 0.92, 0.88), rough=0.55),
        'negro': fg.material('Reja', (0.035, 0.035, 0.04), rough=0.45),
        'negro_brillo': fg.material('RejaRelieve', (0.075, 0.075, 0.085), rough=0.3),
        'rojo': fg.material('RejaRojo', (0.85, 0.05, 0.04), rough=0.4, emit=(0.5, 0.02, 0.01), strength=0.15),
        'vidrio': fg.material('Vidrio', (0.62, 0.72, 0.78), rough=0.15, emit=(1.0, 0.8, 0.5), strength=0.35),
        'cortina': fg.material('Cortina', (0.95, 0.95, 0.92), rough=0.9),
        'terracota': fg.material('Cumbrera', (0.7, 0.24, 0.12), rough=0.6),
        'metal': fg.material('Herraje', (0.55, 0.55, 0.52), metallic=0.6, rough=0.4),
        'oscuro': fg.material('Interior', (0.02, 0.018, 0.016), rough=1.0),
        'gas': fg.material('TanqueGas', (0.75, 0.62, 0.16), rough=0.5),
    }


def exterior(scene, M, espejo):
    m = Mapa(espejo, interior=False)
    b = fg.Builder('FG_CasaCreador')
    z0, z1 = FLOOR, FLOOR + ALTO
    # Cimiento: baja bajo tierra para tapar el terreno en cuesta.
    caja(b, m, -0.03, W + 0.03, -0.03, D + 0.03, -0.55, FLOOR - 0.005, M['concreto'])
    por = next(a for a in PLANTA['ambientes'] if a['id'] == 'portal')
    caja(b, m, por['x0'], por['x1'], por['d0'], por['d1'] + 0.02, FLOOR - 0.08, FLOOR + 0.004, M['baldosa'])
    caja(b, m, por['x0'], por['x1'] + 0.03, D, D + 0.3, -0.2, FLOOR * 0.5, M['baldosa'])
    lav = PLANTA['lavanderia']
    caja(b, m, lav['x0'], lav['x1'], lav['d0'], lav['d1'], -0.4, 0.08, M['concreto'])
    g = PLANTA['tanqueGas']
    b.tube(tuple(m.p(g['x'], g['d'], 0.06)), tuple(m.p(g['x'], g['d'], 0.86)), 0.16, 0.16, M['gas'], sides=10)
    b.blob(tuple(m.p(g['x'], g['d'], 0.86)), (0.16, 0.16, 0.1), M['gas'], subdiv=1)
    # Interior oscuro detrás de la puerta principal (se ve al abrirla).
    sala = next(a for a in PLANTA['ambientes'] if a['id'] == 'sala_comedor')
    caja(b, m, sala['x0'] + 0.02, sala['x1'] - 0.02, sala['d0'] + 0.5, sala['d1'] - 0.12, z0, z1 - 0.02, M['oscuro'])

    for muro in PLANTA['muros']:
        lado = muro.get('ext')
        if not lado:
            continue
        desde = muro.get('extDesde')
        muro_con_huecos(b, m, muro, z0, z1, M['pared'], desde=desde)
        c = Cara(b, m, muro, lado)
        porD = c.porD
        u0 = max(muro['d0'] if porD else muro['x0'], desde or -1)
        u1 = muro['d1'] if porD else muro['x1']
        # Zócalo más oscuro al pie.
        cur = u0
        puertas = sorted((h['desde'], h['hasta']) for h in muro['huecos'] if HUECOS[h['tipo']].get('puerta') and h['desde'] >= u0)
        for ha, hb in puertas + [(u1, u1)]:
            if ha > cur:
                c.box((cur + ha) / 2, 0.008, z0 + 0.22, ha - cur, 0.016, 0.44, M['zocalo'])
            cur = max(cur, hb)
        for h in muro['huecos']:
            if h['desde'] < u0:
                continue
            t = HUECOS[h['tipo']]
            if t.get('puerta'):
                ancho = h['hasta'] - h['desde']
                uc = (h['desde'] + h['hasta']) / 2
                for s in (-1, 1):
                    c.box(uc + s * (ancho / 2 + 0.04), 0.015, z0 + t['alto'] / 2, 0.08, 0.05, t['alto'], M['blanco'])
                c.box(uc, 0.015, z0 + t['alto'] + 0.04, ancho + 0.16, 0.05, 0.08, M['blanco'])
                if h['tipo'] == 'P4':
                    # Puerta de servicio a la lavandería: metálica, cerrada.
                    c.box(uc, -0.03, z0 + t['alto'] / 2, ancho - 0.02, 0.04, t['alto'] - 0.01, M['negro'])
                    for k in range(1, 6):
                        c.box(uc - ancho / 2 + ancho * k / 6, -0.005, z0 + t['alto'] / 2, 0.025, 0.02, t['alto'] - 0.12, M['negro_brillo'])
                    c.box(uc + ancho * 0.38, 0.0, z0 + 1.0, 0.03, 0.05, 0.14, M['metal'])
            else:
                ventana(c, h, M, z0)

    # Hastiales bajo el techo: fondo y fachada (bloque de la recámara y portal retranqueado).
    def hastial(px0, px1, d, grueso):
        xa, xb = sorted((m.x(px0), m.x(px1)))
        pts = [(xa, z1), (xb, z1), (xb, roof_under(xb))]
        if xa < 0 < xb:
            pts.append((0, roof_under(0)))
        pts.append((xa, roof_under(xa)))
        y = m.y(d)
        b.poly([(x, y, z) for x, z in pts], [(x, y + grueso, z) for x, z in pts], M['pared'])

    hastial(0, W, 0.1, 0.1)
    hastial(0, 3.0, D, 0.1)
    hastial(3.0, W, 10.5, 0.1)
    # El portal entre la casa y el alero: viga blanca al frente y columna redonda.
    col = PLANTA['columna']
    cx, cy = m.x(col['x']), m.y(col['d'])
    b.tube((cx, cy, FLOOR), (cx, cy, z1), col['r'], col['r'], M['pared'], sides=12)
    b.tube((cx, cy, FLOOR), (cx, cy, FLOOR + 0.3), col['r'] + 0.03, col['r'] + 0.03, M['zocalo'], sides=12)
    caja(b, m, 2.95, W + 0.02, col['d'] - 0.08, col['d'] + 0.08, z1 - 0.22, z1, M['blanco'])
    # Lámpara de pared junto a la puerta principal.
    p1 = next(h for w in PLANTA['muros'] if w['id'] == 'fachada_sala' for h in w['huecos'] if h['tipo'] == 'P1')
    lx = p1['hasta'] + 0.3
    caja(b, m, lx - 0.1, lx + 0.1, 10.5, 10.6, 2.38, 2.5, M['negro'])
    caja(b, m, lx - 0.07, lx + 0.07, 10.6, 10.63, 2.4, 2.47, M['vidrio'])

    # Techo a dos aguas: la cumbrera corre de la fachada al fondo, alero de 0,60 m.
    y0, y1 = m.y(D) - EAVE, m.y(0) + EAVE
    xe = HW + EAVE
    ang = math.atan(SLOPE)
    for sx in (-1, 1):
        top = [(0, RIDGE), (sx * xe, EAVE_Z), (sx * xe, EAVE_Z - ROOF_T), (0, RIDGE - ROOF_T)]
        b.poly([(x, y0, z) for x, z in top], [(x, y1, z) for x, z in top], M['teja'])
        sub = [(0, RIDGE - ROOF_T), (sx * xe, EAVE_Z - ROOF_T), (sx * xe, EAVE_Z - ROOF_T - 0.02), (0, RIDGE - ROOF_T - 0.02)]
        b.poly([(x, y0 + 0.02, z) for x, z in sub], [(x, y1 - 0.02, z) for x, z in sub], M['cielo'])
        for i in range(1, 9):
            t = i / 9
            x = sx * xe * (1 - t)
            z = EAVE_Z + (RIDGE - EAVE_Z) * t + 0.015
            b.box((x, (y0 + y1) / 2, z), (0.05, y1 - y0, 0.035), M['teja'], rot=(sx * ang, 'Y'))
        for k in range(15):
            y = y0 + 0.25 + k * (y1 - y0 - 0.5) / 14
            xa, xb = sx * 0.4, sx * (xe - 0.05)
            b.tube((xa, y, roof_under(xa) - 0.06), (xb, y, roof_under(xb) - 0.06), 0.06, 0.06, M['blanco'], sides=4)
        b.box((sx * (xe + 0.02), (y0 + y1) / 2, EAVE_Z - 0.06), (0.05, y1 - y0 + 0.04, 0.2), M['blanco'])
        largo = math.hypot(xe, RIDGE - EAVE_Z)
        for yy in (y0 - 0.02, y1 + 0.02):
            b.box((sx * xe / 2, yy, (RIDGE + EAVE_Z) / 2 - 0.05), (largo + 0.05, 0.05, 0.2), M['blanco'], rot=(sx * ang, 'Y'))
    b.tube((0, y0 - 0.05, RIDGE + 0.02), (0, y1 + 0.05, RIDGE + 0.02), 0.1, 0.1, M['terracota'], sides=8)
    b.blob((0, y0 - 0.05, RIDGE + 0.05), (0.13, 0.13, 0.13), M['terracota'], subdiv=2)

    house = b.object(scene)
    uv_por_material(house, {'Repello': 3.0, 'RepelloBajo': 3.0, 'Teja': 2.4, 'Machimbre': 1.0, 'Baldosa': 1.0, 'Concreto': 3.0})
    door = puerta_principal(scene, house, M, m, p1)
    uv_por_material(door, {})
    return house, door


# --- Interior caminable: la misma planta a escala real, sin techo ---
def mueble(b, m, f, M):
    x0, x1 = f['x'] - f['w'] / 2, f['x'] + f['w'] / 2
    d0, d1 = f['d'] - f['p'] / 2, f['d'] + f['p'] / 2
    h = f['alto']
    t = f['tipo']
    C = lambda a, bb, c, dd, z0, z1, mat: caja(b, m, a, bb, c, dd, z0, z1, mat)
    if t == 'cama':
        C(x0, x1, d0, d1, 0.0, 0.3, M['madera'])
        C(x0 + 0.02, x1 - 0.02, d0 + 0.02, d1 - 0.02, 0.3, h - 0.02, M['sabana'])
        C(x0 + 0.65, x1 + 0.01, d0 - 0.01, d1 + 0.01, h - 0.12, h + 0.02, M['manta'])
        C(x0 - 0.0, x0 + 0.06, d0, d1, 0.0, 0.95, M['madera'])
        n = 2 if f['p'] > 1.2 else 1
        for k in range(n):
            dc = d0 + f['p'] * (k + 0.5) / n
            b.blob(tuple(m.p(x0 + 0.3, dc, h + 0.06)), (0.16, f['p'] / n * 0.38, 0.07), M['sabana'], subdiv=1)
    elif t == 'mesita':
        C(x0, x1, d0, d1, 0, h, M['madera'])
        b.tube(tuple(m.p(f['x'], f['d'], h)), tuple(m.p(f['x'], f['d'], h + 0.22)), 0.02, 0.02, M['metal'], sides=5)
        b.blob(tuple(m.p(f['x'], f['d'], h + 0.3)), (0.12, 0.12, 0.1), M['lampara'], subdiv=1)
    elif t == 'ropero':
        C(x0, x1, d0, d1, 0, h, M['madera'])
        frente = x0 if f['x'] > 1.5 else x1
        s = -1 if f['x'] > 1.5 else 1
        C(min(frente, frente + s * 0.015), max(frente, frente + s * 0.015), d0 + 0.04, d1 - 0.04, 0.05, h - 0.05, M['madera_clara'])
        C(min(frente, frente + s * 0.02), max(frente, frente + s * 0.02), f['d'] - 0.006, f['d'] + 0.006, 0.05, h - 0.05, M['madera'])
    elif t == 'escritorio':
        C(x0, x1, d0, d1, h - 0.04, h, M['madera'])
        for a in (x0, x1 - 0.04):
            C(a, a + 0.04, d0, d1, 0, h - 0.04, M['madera'])
        C(x1 + 0.05, x1 + 0.45, f['d'] - 0.2, f['d'] + 0.2, 0.42, 0.47, M['tela'])
        C(x1 + 0.4, x1 + 0.45, f['d'] - 0.2, f['d'] + 0.2, 0.47, 0.9, M['tela'])
        b.box(tuple(m.p(x0 + 0.2, f['d'], h + 0.16)), (0.04, 0.45, 0.3), M['pantalla'])
    elif t == 'inodoro':
        C(f['x'] - 0.15, f['x'] + 0.15, d0 + 0.18, d1 - 0.02, 0, h, M['loza'])
        C(x0, x1, d0, d0 + 0.18, 0.3, 0.78, M['loza'])
        C(f['x'] - 0.18, f['x'] + 0.18, d0 + 0.15, d1, h, h + 0.03, M['loza'])
    elif t == 'lavamanos':
        b.tube(tuple(m.p(f['x'], f['d'], 0)), tuple(m.p(f['x'], f['d'], h - 0.15)), 0.08, 0.1, M['loza'], sides=8)
        C(x0, x1, d0, d1, h - 0.15, h, M['loza'])
        C(x0 - 0.02, x0, d0, d1, 1.2, 1.8, M['espejo'])
    elif t == 'ducha':
        C(x0, x1, d0, d1, 0, h, M['loza'])
        C(x0 - 0.01, x0 + 0.01, d0 + f['p'] * 0.45, d1, h, 1.95, M['vidrio_ducha'])
        b.tube(tuple(m.p(x1 - 0.05, f['d'], 1.95)), tuple(m.p(x1 - 0.25, f['d'], 1.95)), 0.02, 0.02, M['metal'], sides=5)
        b.blob(tuple(m.p(x1 - 0.27, f['d'], 1.93)), (0.07, 0.07, 0.03), M['metal'], subdiv=1)
    elif t == 'refrigeradora':
        C(x0, x1, d0, d1, 0, h, M['refri'])
        C(x0 + 0.03, x1 - 0.03, d1, d1 + 0.01, 1.1, 1.12, M['metal'])
        C(x0 + 0.08, x0 + 0.11, d1 + 0.01, d1 + 0.04, 0.6, 1.5, M['metal'])
    elif t == 'meson':
        C(x0, x1, d0, d1 - 0.05, 0, h - 0.04, M['madera'])
        C(x0, x1, d0, d1, h - 0.04, h, M['granito'])
        C(f['x'] - 0.3, f['x'] + 0.2, d0 + 0.1, d1 - 0.12, h - 0.03, h + 0.002, M['metal'])
        b.tube(tuple(m.p(f['x'] - 0.05, d0 + 0.06, h)), tuple(m.p(f['x'] - 0.05, d0 + 0.06, h + 0.3)), 0.015, 0.015, M['metal'], sides=5)
    elif t == 'estufa':
        C(x0, x1, d0, d1, 0, h - 0.02, M['refri'])
        C(x0, x1, d0, d1, h - 0.02, h, M['negro_mate'])
        for i in (0.3, 0.7):
            for k in (0.3, 0.7):
                b.tube(tuple(m.p(x0 + f['w'] * i, d0 + f['p'] * k, h)), tuple(m.p(x0 + f['w'] * i, d0 + f['p'] * k, h + 0.015)), 0.08, 0.08, M['metal'], sides=8)
    elif t == 'mesa':
        C(x0, x1, d0, d1, h - 0.04, h, M['madera'])
        for a in (x0 + 0.05, x1 - 0.09):
            for c in (d0 + 0.05, d1 - 0.09):
                C(a, a + 0.04, c, c + 0.04, 0, h - 0.04, M['madera'])
        for sx in (-0.3, 0.3):
            for sd, s in ((d0 - 0.25, -1), (d1 + 0.25, 1)):
                cx = f['x'] + sx
                C(cx - 0.2, cx + 0.2, sd - 0.2, sd + 0.2, 0.43, 0.47, M['madera_clara'])
                back = sd + s * 0.18
                C(cx - 0.2, cx + 0.2, min(back, back + s * 0.04), max(back, back + s * 0.04), 0.47, 0.92, M['madera_clara'])
                for a in (cx - 0.18, cx + 0.15):
                    for c in (sd - 0.18, sd + 0.15):
                        C(a, a + 0.03, c, c + 0.03, 0, 0.43, M['madera_clara'])
    elif t == 'sofa':
        C(x0, x1, d0, d1, 0.1, 0.42, M['tela'])
        C(x1 - 0.2, x1, d0, d1, 0.42, h, M['tela'])
        for c in (d0, d1 - 0.18):
            C(x0, x1, c, c + 0.18, 0.42, 0.62, M['tela'])
        for k in range(3):
            c = d0 + 0.18 + (f['p'] - 0.36) * (k + 0.5) / 3
            b.blob(tuple(m.p(f['x'] - 0.08, c, 0.48)), (0.3, 0.24, 0.07), M['cojin'], subdiv=1)
    elif t == 'mesa_centro':
        C(x0, x1, d0, d1, h - 0.05, h, M['madera'])
        C(x0 + 0.05, x1 - 0.05, d0 + 0.05, d1 - 0.05, 0, h - 0.05, M['madera_clara'])
    elif t == 'mueble_tv':
        C(x0, x1, d0, d1, 0, h, M['madera'])
        C(x0 + 0.12, x0 + 0.17, f['d'] - 0.6, f['d'] + 0.6, h + 0.05, h + 0.75, M['pantalla'])
        C(x0 + 0.1, x0 + 0.2, f['d'] - 0.1, f['d'] + 0.1, h, h + 0.06, M['negro_mate'])
    elif t == 'silla':
        C(x0, x1, d0, d1, 0.4, 0.45, M['madera'])
        C(x0, x1, d1 - 0.06, d1, 0.45, h, M['madera'])
        for a in (x0, x1 - 0.04):
            C(a, a + 0.04, d0, d1, 0, 0.4, M['madera'])


def interior(scene, M, espejo):
    m = Mapa(espejo, interior=True)
    b = fg.Builder('FG_CasaCreador_Interior')
    z0, z1 = 0.0, ALTO
    # Césped alrededor y acera hasta la puerta.
    b.box(((W + 2 * MARGEN) / 2, (D + 2 * MARGEN) / 2, -0.08), (W + 2 * MARGEN, D + 2 * MARGEN, 0.1), M['cesped'])
    p1 = next(h for w in PLANTA['muros'] if w['id'] == 'fachada_sala' for h in w['huecos'] if h['tipo'] == 'P1')
    caja(b, m, p1['desde'] - 0.05, p1['hasta'] + 0.15, D, D + MARGEN, -0.03, -0.006, M['concreto_int'])
    # Losa y piso de cada ambiente.
    caja(b, m, 0, W, 0, D, -0.3, -0.005, M['concreto_int'])
    for a in PLANTA['ambientes']:
        mat = {'ceramica': M['ceramica'], 'bano': M['azulejo'], 'portal': M['baldosa']}[a['suelo']]
        caja(b, m, a['x0'], a['x1'], a['d0'], a['d1'], -0.02, 0.0, mat)
    # Bajo las puertas, piso continuo.
    for muro in PLANTA['muros']:
        porD = (muro['d1'] - muro['d0']) > (muro['x1'] - muro['x0'])
        for h in muro['huecos']:
            if HUECOS[h['tipo']].get('puerta'):
                if porD:
                    caja(b, m, muro['x0'], muro['x1'], h['desde'], h['hasta'], -0.02, 0.0, M['ceramica'])
                else:
                    caja(b, m, h['desde'], h['hasta'], muro['d0'], muro['d1'], -0.02, 0.0, M['ceramica'])
    # Muros: los de fuera con repello por fuera y pintura por dentro; los de dentro, pintados.
    for muro in PLANTA['muros']:
        lado = muro.get('ext')
        porD = (muro['d1'] - muro['d0']) > (muro['x1'] - muro['x0'])
        a0, a1 = (muro['x0'], muro['x1']) if porD else (muro['d0'], muro['d1'])
        mid = (a0 + a1) / 2
        if lado and not muro.get('extDesde'):
            afuera_alto = lado in ('der', 'frente')
            fuera = (mid, a1) if afuera_alto else (a0, mid)
            dentro = (a0, mid) if afuera_alto else (mid, a1)
            muro_con_huecos(b, m, muro, z0, z1, M['pared'], capa=fuera)
            muro_con_huecos(b, m, muro, z0, z1, M['pintura'], capa=dentro)
        else:
            muro_con_huecos(b, m, muro, z0, z1, M['pintura'])
            if muro.get('extDesde'):
                c = Cara(b, m, muro, lado)
                c.box((muro['extDesde'] + muro['d1']) / 2, 0.006, z1 / 2, muro['d1'] - muro['extDesde'], 0.012, z1, M['pared'])
        # Remate superior oscuro: se lee el corte del muro desde arriba.
        if porD:
            caja(b, m, a0, a1, muro['d0'], muro['d1'], z1, z1 + 0.02, M['corte'])
        else:
            caja(b, m, muro['x0'], muro['x1'], a0, a1, z1, z1 + 0.02, M['corte'])
        for h in muro['huecos']:
            t = HUECOS[h['tipo']]
            if t.get('puerta'):
                # Marco de madera de la puerta.
                for u in (h['desde'], h['hasta']):
                    if porD:
                        caja(b, m, a0 - 0.02, a1 + 0.02, u - 0.03, u + 0.03, 0, t['alto'], M['madera'])
                    else:
                        caja(b, m, u - 0.03, u + 0.03, a0 - 0.02, a1 + 0.02, 0, t['alto'], M['madera'])
                if porD:
                    caja(b, m, a0 - 0.02, a1 + 0.02, h['desde'] - 0.03, h['hasta'] + 0.03, t['alto'], t['alto'] + 0.06, M['madera'])
                else:
                    caja(b, m, h['desde'] - 0.03, h['hasta'] + 0.03, a0 - 0.02, a1 + 0.02, t['alto'], t['alto'] + 0.06, M['madera'])
            else:
                za = t['alfeizar']
                zb = za + t['alto']
                if porD:
                    caja(b, m, mid - 0.01, mid + 0.01, h['desde'], h['hasta'], za, zb, M['cielo_vidrio'])
                    caja(b, m, a0 - 0.04, a1 + 0.04, h['desde'] - 0.04, h['hasta'] + 0.04, za - 0.04, za, M['blanco'])
                else:
                    caja(b, m, h['desde'], h['hasta'], mid - 0.01, mid + 0.01, za, zb, M['cielo_vidrio'])
                    caja(b, m, h['desde'] - 0.04, h['hasta'] + 0.04, a0 - 0.04, a1 + 0.04, za - 0.04, za, M['blanco'])
                if lado:
                    c = Cara(b, m, muro, lado)
                    ancho = h['hasta'] - h['desde']
                    uc = (h['desde'] + h['hasta']) / 2
                    n = max(3, round(ancho / 0.11))
                    for i in range(1, n):
                        c.box(uc - ancho / 2 + ancho * i / n, 0.03, (za + zb) / 2, 0.022, 0.022, zb - za, M['negro'])
                    if t['reja'] == 'aspa':
                        c.box(uc, 0.045, (za + zb) / 2, ancho - 0.1, 0.022, 0.045, M['rojo'])
    # Baños: azulejo hasta 1,20 m.
    for a in PLANTA['ambientes']:
        if a['suelo'] != 'bano':
            continue
        e = 0.012
        caja(b, m, a['x0'], a['x0'] + e, a['d0'], a['d1'], 0, 1.2, M['azulejo'])
        caja(b, m, a['x1'] - e, a['x1'], a['d0'], a['d1'], 0, 1.2, M['azulejo'])
        caja(b, m, a['x0'], a['x1'], a['d0'], a['d0'] + e, 0, 1.2, M['azulejo'])
        caja(b, m, a['x0'], a['x1'], a['d1'] - e, a['d1'], 0, 1.2, M['azulejo'])
    # Columna del portal y lámpara de techo de cada ambiente (un punto de luz cálido).
    col = PLANTA['columna']
    b.tube(tuple(m.p(col['x'], col['d'], 0)), tuple(m.p(col['x'], col['d'], z1)), col['r'], col['r'], M['pared'], sides=12)
    lav = PLANTA['lavanderia']
    caja(b, m, lav['x0'], lav['x1'], lav['d0'], lav['d1'], -0.03, -0.008, M['concreto_int'])
    for f in PLANTA['muebles']:
        mueble(b, m, f, M)
    # Alfombra de la sala, con trama propia.
    caja(b, m, 4.3, 5.6, 8.0, 9.5, 0.0, 0.012, M['alfombra'])
    obj = b.object(scene)
    uv_por_material(obj, {'Repello': 3.0, 'Ceramica': 1.2, 'Azulejo': 0.8, 'Baldosa': 1.0, 'ConcretoInt': 3.0, 'Cesped': 4.0, 'Alfombra': 1.3})
    return obj


def materiales_interior(M):
    return {
        **M,
        'pintura': fg.material('Pintura', (0.93, 0.9, 0.83), rough=0.9),
        'corte': fg.material('CorteMuro', (0.36, 0.3, 0.26), rough=1.0),
        'ceramica': con_textura('Ceramica', (0.88, 0.85, 0.8), baldosa(11, 2), 0.5),
        'azulejo': con_textura('Azulejo', (0.72, 0.84, 0.88), baldosa(12, 4), 0.35),
        'concreto_int': con_textura('ConcretoInt', (0.66, 0.65, 0.62), concreto(13), 0.95),
        'cesped': con_textura('Cesped', (0.3, 0.52, 0.2), repello(14), 1.0),
        'alfombra': con_textura('Alfombra', (0.7, 0.36, 0.22), tabla(15, 9), 1.0),
        'madera': fg.material('Madera', (0.42, 0.26, 0.15), rough=0.6),
        'madera_clara': fg.material('MaderaClara', (0.62, 0.45, 0.28), rough=0.6),
        'sabana': fg.material('Sabana', (0.94, 0.93, 0.9), rough=0.95),
        'manta': fg.material('Manta', (0.2, 0.42, 0.55), rough=0.95),
        'tela': fg.material('Tela', (0.32, 0.36, 0.42), rough=0.95),
        'cojin': fg.material('Cojin', (0.85, 0.58, 0.2), rough=0.95),
        'loza': fg.material('Loza', (0.96, 0.96, 0.95), rough=0.2),
        'espejo': fg.material('Espejo', (0.75, 0.82, 0.86), metallic=0.5, rough=0.1),
        'vidrio_ducha': fg.material('VidrioDucha', (0.72, 0.85, 0.9), rough=0.1),
        'refri': fg.material('Electro', (0.88, 0.88, 0.86), rough=0.35),
        'granito': fg.material('Granito', (0.25, 0.23, 0.22), rough=0.3),
        'negro_mate': fg.material('NegroMate', (0.05, 0.05, 0.05), rough=0.7),
        'pantalla': fg.material('Pantalla', (0.04, 0.05, 0.07), rough=0.15),
        'lampara': fg.material('LamparaMesa', (1.0, 0.86, 0.6), emit=(1.0, 0.8, 0.5), strength=0.6),
        'cielo_vidrio': fg.material('VidrioDia', (0.7, 0.82, 0.9), rough=0.1, emit=(0.75, 0.85, 0.95), strength=0.4),
    }


def build():
    out = []
    for espejo in (False, True):
        scene = fg.reset()
        M = materiales()
        house, door = exterior(scene, M, espejo)
        sufijo = '_espejo' if espejo else ''
        fg.export(f'casa_creador{sufijo}.glb', scene, [house, door], imagenes='JPEG')
        if not espejo:
            blend = os.path.join(ROOT, 'arte', 'blender', 'casa_creador.blend')
            bpy.ops.wm.save_as_mainfile(filepath=blend, copy=True)
            out.append(blend)
        scene = fg.reset()
        MI = materiales_interior(materiales())
        obj = interior(scene, MI, espejo)
        fg.export(f'casa_creador{sufijo}_interior.glb', scene, [obj], imagenes='JPEG')
    print('guardado', out)


build()
