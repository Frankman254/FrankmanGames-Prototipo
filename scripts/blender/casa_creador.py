# CLA-CASA1 (creador, 2026-11-23): «deje una nueva carpeta con los planos de mi casa si puedes
# modelarla en blender y meterla al juego». Casa del creador, de geometría y texturas propias.
#   /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/blender/casa_creador.py
# Escribe assets/models/casa_creador.glb (PROPUESTA) y arte/blender/casa_creador.blend.
#
# Medidas de los planos (planta y elevaciones del creador, sólo como referencia de trabajo):
#   casa de 6,30 m de frente por 12 m de fondo; paredes de 2,70 m; techo a dos aguas con la
#   cumbrera a lo largo y el hastial mirando al frente, alero de 0,60 m; puertas de 1,00 x 2,15 y
#   ventanas de 1,80 x 1,20. En la fachada: bloque derecho adelantado (recámara) y portal a la
#   izquierda con columna, puerta y ventana. Repello beige, teja roja, remates blancos, vigas
#   vistas y rejas negras con detalle rojo. Al lado, losa de estacionamiento abierto.
# La puerta mira hacia -Y (+Z en el juego). Clips "Abrir" y "Cerrar" como en casa.py.
import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

HERE = os.path.dirname(bpy.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
TEX = 512

# --- Medidas (m). X: frente, de izquierda a derecha; Y: fondo (-Y es la calle); Z: arriba. ---
HW = 3.15            # media anchura de la casa (6,30 m)
FRONT = -6.0         # fachada del bloque adelantado
PORCH = -4.5         # fachada retranqueada del portal
BACK = 6.0
SPLIT = 0.15         # junta entre portal (izquierda) y bloque adelantado (derecha)
FLOOR = 0.15         # piso terminado sobre el terreno
WALL_TOP = 2.85      # 2,70 m de pared
T = 0.15             # grueso de pared
EAVE = 0.6           # alero
RIDGE = 3.75         # cumbrera
EAVE_Z = 2.75        # canto del alero
SLOPE = (RIDGE - EAVE_Z) / (HW + EAVE)
ROOF_T = 0.08
DOOR = (-0.9, 0.1, 2.15)      # x0, x1, alto (puerta principal)
WIN_L = (-1.85, 1.8, 1.05, 1.20)   # centro x, ancho, z del alféizar, alto (portal)
WIN_R = (1.65, 1.8, 1.05, 1.20)    # bloque adelantado


def roof_under(x):
    return RIDGE - SLOPE * abs(x) - ROOF_T - 0.02


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


# --- Paredes con huecos, en un marco local: u a lo largo de la pared, n hacia fuera ---
class Pared:
    """`axis` 'x': la pared corre en X y mira a `sign`·Y; 'y': corre en Y y mira a `sign`·X."""

    def __init__(self, b, axis, plane, sign):
        self.b, self.axis, self.plane, self.sign = b, axis, plane, sign

    def p(self, u, n, z):
        off = self.plane + self.sign * n
        return (u, off, z) if self.axis == 'x' else (off, u, z)

    def s(self, su, sn, sz):
        return (su, sn, sz) if self.axis == 'x' else (sn, su, sz)

    def box(self, u, n, z, su, sn, sz, mat, ang=None):
        rot = None
        if ang is not None:
            rot = (ang, 'Y') if self.axis == 'x' else (-ang, 'X')
        self.b.box(self.p(u, n, z), self.s(su, sn, sz), mat, rot=rot)

    def muro(self, u0, u1, z0, z1, huecos, mat):
        """Paño de u0 a u1 con huecos [(ua, ub, za, zb)]; grueso T hacia dentro."""
        n = -T / 2
        cur = u0
        for ua, ub, za, zb in sorted(huecos):
            if ua > cur:
                self.box((cur + ua) / 2, n, (z0 + z1) / 2, ua - cur, T, z1 - z0, mat)
            if za > z0:
                self.box((ua + ub) / 2, n, (z0 + za) / 2, ub - ua, T, za - z0, mat)
            if zb < z1:
                self.box((ua + ub) / 2, n, (zb + z1) / 2, ub - ua, T, z1 - zb, mat)
            cur = ub
        if cur < u1:
            self.box((cur + u1) / 2, n, (z0 + z1) / 2, u1 - cur, T, z1 - z0, mat)


def ventana(w: Pared, uc, ancho, z0, alto, M, reja='x', marco_ancho=0.1, alfeizar=False):
    """Hueco con vidrio y cortina dentro, marco blanco y reja negra al ras."""
    z1 = z0 + alto
    # vidrio hundido y cortina clara detrás
    w.box(uc, -T * 0.55, (z0 + z1) / 2, ancho, 0.02, alto, M['vidrio'])
    w.box(uc, -T * 0.85, (z0 + z1) / 2, ancho, 0.02, alto, M['cortina'])
    # jambas del hueco (repello) para que el hueco tenga canto
    # marco blanco
    mw = marco_ancho
    w.box(uc, 0.015, z1 + mw / 2, ancho + 2 * mw, 0.05, mw, M['blanco'])
    w.box(uc - ancho / 2 - mw / 2, 0.015, (z0 + z1) / 2, mw, 0.05, alto, M['blanco'])
    w.box(uc + ancho / 2 + mw / 2, 0.015, (z0 + z1) / 2, mw, 0.05, alto, M['blanco'])
    if alfeizar:
        w.box(uc, 0.04, z0 - 0.1, ancho + 2 * mw + 0.24, 0.1, 0.2, M['blanco'])
    else:
        w.box(uc, 0.015, z0 - mw / 2, ancho + 2 * mw, 0.05, mw, M['blanco'])
    # reja: marco negro y barrotes
    bar = 0.04
    rz0, rz1 = z0 + 0.02, z1 - 0.02
    zc = (rz0 + rz1) / 2
    h = rz1 - rz0
    n = 0.06
    w.box(uc, n, rz1 - bar, ancho - 0.04, bar, bar * 2, M['negro'])
    w.box(uc, n, rz0 + bar, ancho - 0.04, bar, bar * 2, M['negro'])
    for s in (-1, 1):
        w.box(uc + s * (ancho / 2 - 0.02 - bar), n, zc, bar * 2, bar, h, M['negro'])
    barrotes = int(ancho / 0.16)
    for i in range(1, barrotes):
        w.box(uc - ancho / 2 + ancho * i / barrotes, n, zc, 0.025, 0.025, h - 0.02, M['negro'])
    if reja == 'x':
        # banda roja a media altura y aspa negra encima
        w.box(uc, n + 0.015, zc, ancho - 0.12, 0.03, 0.06, M['rojo'])
        diag = math.hypot(ancho * 0.62, h * 0.78)
        ang = math.atan2(h * 0.78, ancho * 0.62)
        for s in (-1, 1):
            w.box(uc, n + 0.035, zc, diag, 0.035, 0.07, M['negro'], ang=s * ang)


def puerta_reja(scene, house, M, hinge_u, y, ancho, alto):
    """Puerta de reja negra con molduras en relieve y vetas rojas, pivote en su bisagra."""
    d = fg.Builder('FG_CasaCreador_Puerta')
    x0 = hinge_u
    cx = x0 + ancho / 2
    yf = y - 0.03
    d.box((cx, yf + 0.02, FLOOR + alto / 2), (ancho - 0.02, 0.04, alto - 0.02), M['negro'])
    # marco en relieve
    for z in (FLOOR + 0.06, FLOOR + alto - 0.06):
        d.box((cx, yf - 0.01, z), (ancho - 0.06, 0.03, 0.08), M['negro_brillo'])
    for s in (-1, 1):
        d.box((cx + s * (ancho / 2 - 0.05), yf - 0.01, FLOOR + alto / 2), (0.08, 0.03, alto - 0.1), M['negro_brillo'])
    # costillas verticales y quiebres en diagonal (dibujo propio inspirado en la foto)
    for s in (-1, 1):
        for k in (0.16, 0.3):
            d.box((cx + s * k, yf - 0.015, FLOOR + 0.42), (0.03, 0.03, 0.62), M['negro_brillo'])
            d.box((cx + s * k, yf - 0.015, FLOOR + alto - 0.42), (0.03, 0.03, 0.62), M['negro_brillo'])
        d.box((cx + s * 0.2, yf - 0.02, FLOOR + alto / 2), (0.36, 0.03, 0.035), M['negro_brillo'], rot=(s * 0.55, 'Y'))
    # vetas rojas: centro arriba y abajo, y dos corchetes a los lados
    d.box((cx, yf - 0.03, FLOOR + alto - 0.42), (0.05, 0.02, 0.56), M['rojo'])
    d.box((cx, yf - 0.03, FLOOR + 0.36), (0.05, 0.02, 0.48), M['rojo'])
    for s in (-1, 1):
        d.box((cx + s * 0.24, yf - 0.03, FLOOR + alto / 2), (0.045, 0.02, 0.5), M['rojo'])
        for dz in (-1, 1):
            d.box((cx + s * 0.205, yf - 0.03, FLOOR + alto / 2 + dz * 0.27), (0.1, 0.02, 0.045), M['rojo'], rot=(-s * dz * 0.6, 'Y'))
    # manija
    d.box((x0 + ancho - 0.1, yf - 0.05, FLOOR + 1.0), (0.03, 0.05, 0.16), M['metal'])
    door = d.object(scene, parent=house, location=(x0, y, 0))
    door.rotation_mode = 'XYZ'
    abrir = fg.key_rotation(door, 'Abrir', [(1, 0), (5, -8), (16, 112), (21, 100), (25, 104)], axis=2)
    cerrar = fg.key_rotation(door, 'Cerrar', [(1, 104), (14, -3), (17, 1.5), (20, 0)], axis=2)
    fg.to_tracks(door, [abrir, cerrar])
    door.rotation_euler = (0, 0, 0)
    return door


def build():
    scene = fg.reset()
    M = {
        'pared': con_textura('Repello', (0.86, 0.66, 0.43), repello(3), 0.93),
        'zocalo': con_textura('RepelloBajo', (0.74, 0.54, 0.32), repello(4), 0.95),
        'teja': con_textura('Teja', (0.68, 0.2, 0.12), teja(5), 0.7),
        'cielo': con_textura('Machimbre', (0.52, 0.3, 0.17), tabla(6), 0.8),
        'baldosa': con_textura('Baldosa', (0.86, 0.8, 0.72), baldosa(7), 0.55),
        'concreto': con_textura('Concreto', (0.66, 0.65, 0.62), concreto(8), 0.95),
        'blanco': fg.material('Remate', (0.93, 0.92, 0.88), rough=0.55),
        'negro': fg.material('Reja', (0.035, 0.035, 0.04), metallic=0.0, rough=0.45),
        'negro_brillo': fg.material('RejaRelieve', (0.07, 0.07, 0.08), rough=0.35),
        'rojo': fg.material('RejaRojo', (0.85, 0.05, 0.04), rough=0.4, emit=(0.5, 0.02, 0.01), strength=0.15),
        'vidrio': fg.material('Vidrio', (0.62, 0.72, 0.78), rough=0.15, emit=(1.0, 0.8, 0.5), strength=0.35),
        'cortina': fg.material('Cortina', (0.95, 0.95, 0.92), rough=0.9),
        'terracota': fg.material('Cumbrera', (0.7, 0.24, 0.12), rough=0.6),
        'metal': fg.material('Herraje', (0.55, 0.55, 0.52), metallic=0.6, rough=0.4),
        'oscuro': fg.material('Interior', (0.02, 0.018, 0.016), rough=1.0),
    }
    b = fg.Builder('FG_CasaCreador')

    # Cimiento: baja bajo tierra para tapar terreno en cuesta; piso a FLOOR.
    b.box((0, (PORCH + BACK) / 2, -0.2), (2 * HW + 0.1, BACK - PORCH + 0.1, 0.7), M['concreto'])
    b.box(((SPLIT + HW) / 2, (FRONT + PORCH) / 2, -0.2), (HW - SPLIT + 0.1, PORCH - FRONT + 0.1, 0.7), M['concreto'])
    # Portal: losa de baldosa con su escalón.
    b.box(((-HW + SPLIT) / 2, (FRONT + PORCH) / 2, FLOOR - 0.04), (HW + SPLIT, PORCH - FRONT, 0.08 + 0.0), M['baldosa'])
    b.box(((-HW + SPLIT) / 2, FRONT - 0.12, 0.04), (HW + SPLIT + 0.1, 0.3, 0.08), M['baldosa'])

    # Interior oscuro (se ve al abrir la puerta) — dos cajas dentro de los muros.
    b.box((0, (PORCH + BACK) / 2, (FLOOR + WALL_TOP) / 2), (2 * HW - 2 * T - 0.02, BACK - PORCH - 2 * T - 0.02, WALL_TOP - FLOOR - 0.02), M['oscuro'])
    b.box(((SPLIT + HW) / 2, (FRONT + T + 0.02 + PORCH) / 2, (FLOOR + WALL_TOP) / 2), (HW - SPLIT - 2 * T - 0.02, PORCH - FRONT - T - 0.02, WALL_TOP - FLOOR - 0.02), M['oscuro'])

    z0, z1 = FLOOR, WALL_TOP
    # Fachada del bloque adelantado, con la ventana de la recámara y su alféizar ancho.
    f = Pared(b, 'x', FRONT, -1)
    cx, w, sill, h = WIN_R
    f.muro(SPLIT, HW, z0, z1, [(cx - w / 2, cx + w / 2, sill, sill + h)], M['pared'])
    ventana(f, cx, w, sill, h, M, alfeizar=True)
    f.box((SPLIT + HW) / 2, 0.012, (z0 + sill - 0.2) / 2, HW - SPLIT, 0.025, sill - 0.2 - z0, M['zocalo'])
    # Fachada del portal: puerta y ventana de la sala.
    p = Pared(b, 'x', PORCH, -1)
    cx, w, sill, h = WIN_L
    p.muro(-HW, SPLIT, z0, z1, [(cx - w / 2, cx + w / 2, sill, sill + h), (DOOR[0], DOOR[1], z0, z0 + DOOR[2])], M['pared'])
    ventana(p, cx, w, sill, h, M)
    # marco blanco de la puerta
    for u in (DOOR[0] - 0.05, DOOR[1] + 0.05):
        p.box(u, 0.015, z0 + DOOR[2] / 2, 0.1, 0.05, DOOR[2], M['blanco'])
    p.box((DOOR[0] + DOOR[1]) / 2, 0.015, z0 + DOOR[2] + 0.05, DOOR[1] - DOOR[0] + 0.2, 0.05, 0.1, M['blanco'])
    # Costado del bloque adelantado que da al portal.
    s = Pared(b, 'y', SPLIT, -1)
    s.muro(FRONT, PORCH, z0, z1, [], M['pared'])

    # Costados: tres recámaras a la izquierda; baño, cocina y lavandería a la derecha.
    izq = Pared(b, 'y', -HW, -1)
    izq.muro(PORCH, BACK, z0, z1, [(-2.6, -1.4, 1.35, 2.35), (0.4, 1.6, 1.35, 2.35), (3.4, 4.6, 1.35, 2.35)], M['pared'])
    for uc in (-2.0, 1.0, 4.0):
        ventana(izq, uc, 1.2, 1.35, 1.0, M, reja='v', marco_ancho=0.08)
    der = Pared(b, 'y', HW, 1)
    der.muro(FRONT, BACK, z0, z1, [(-3.6, -2.4, 1.35, 2.35), (0.1, 0.7, 1.75, 2.35), (2.4, 3.6, 1.35, 2.35)], M['pared'])
    for uc, w, sill, h in ((-3.0, 1.2, 1.35, 1.0), (0.4, 0.6, 1.75, 0.6), (3.0, 1.2, 1.35, 1.0)):
        ventana(der, uc, w, sill, h, M, reja='v', marco_ancho=0.08)
    # Fondo: puerta de servicio (cocina-lavandería) y ventana.
    fo = Pared(b, 'x', BACK, 1)
    fo.muro(-HW, HW, z0, z1, [(0.9, 1.8, z0, z0 + 2.15), (-2.2, -0.8, 1.35, 2.35)], M['pared'])
    ventana(fo, -1.5, 1.4, 1.35, 1.0, M, reja='v', marco_ancho=0.08)
    fo.box(1.35, 0.02, z0 + 1.075, 0.86, 0.04, 2.13, M['negro'])
    fo.box(1.35, 0.03, z0 + 1.075, 0.04, 0.03, 2.0, M['rojo'])

    # Hastiales (triángulos bajo el techo) en fachada, portal y fondo.
    def hastial(x0, x1, y, grueso):
        pts = [(x0, WALL_TOP), (x1, WALL_TOP), (x1, roof_under(x1))]
        if x0 < 0 < x1:
            pts.append((0, roof_under(0)))
        pts.append((x0, roof_under(x0)))
        b.poly([(x, y, z) for x, z in pts], [(x, y + grueso, z) for x, z in pts], M['pared'])

    hastial(SPLIT, HW, FRONT, T)
    hastial(-HW, SPLIT, PORCH, T)
    hastial(-HW, HW, BACK - T, T)

    # Columna del portal y viga que la une al bloque adelantado.
    b.tube((-HW + 0.2, FRONT + 0.2, FLOOR), (-HW + 0.2, FRONT + 0.2, WALL_TOP), 0.17, 0.17, M['pared'], sides=12)
    b.tube((-HW + 0.2, FRONT + 0.2, FLOOR), (-HW + 0.2, FRONT + 0.2, FLOOR + 0.3), 0.2, 0.2, M['zocalo'], sides=12)
    b.box(((-HW + SPLIT) / 2, FRONT + 0.2, WALL_TOP - 0.1), (HW + SPLIT, 0.16, 0.2), M['blanco'])
    # Lámpara junto a la puerta.
    b.box((-2.75, PORCH - 0.06, 2.45), (0.2, 0.1, 0.12), M['negro'])
    b.box((-2.75, PORCH - 0.12, 2.45), (0.14, 0.03, 0.07), M['vidrio'])

    # Techo a dos aguas: teja encima y machimbre debajo; cumbrera de terracota.
    y0, y1 = FRONT - EAVE, BACK + EAVE
    xe = HW + EAVE
    for sx in (-1, 1):
        top = [(0, RIDGE), (sx * xe, EAVE_Z), (sx * xe, EAVE_Z - ROOF_T), (0, RIDGE - ROOF_T)]
        b.poly([(x, y0, z) for x, z in top], [(x, y1, z) for x, z in top], M['teja'])
        sub = [(0, RIDGE - ROOF_T), (sx * xe, EAVE_Z - ROOF_T), (sx * xe, EAVE_Z - ROOF_T - 0.02), (0, RIDGE - ROOF_T - 0.02)]
        b.poly([(x, y0 + 0.02, z) for x, z in sub], [(x, y1 - 0.02, z) for x, z in sub], M['cielo'])
        # Hiladas en relieve: escalón de sombra cada 0,45 m de faldón.
        ang = math.atan(SLOPE)
        for i in range(1, 9):
            t = i / 9
            x = sx * xe * (1 - t)
            z = EAVE_Z + (RIDGE - EAVE_Z) * t + 0.015
            b.box((x, (y0 + y1) / 2, z), (0.05, y1 - y0, 0.035), M['teja'], rot=(sx * ang, 'Y'))
        # Vigas vistas blancas bajo el alero.
        for k in range(15):
            y = y0 + 0.25 + k * (y1 - y0 - 0.5) / 14
            xa, xb = sx * 0.4, sx * (xe - 0.05)
            za, zb = roof_under(xa) - 0.06, roof_under(xb) - 0.06
            b.tube((xa, y, za), (xb, y, zb), 0.06, 0.06, M['blanco'], sides=4)
        # Fascia blanca del alero lateral.
        b.box((sx * (xe + 0.02), (y0 + y1) / 2, EAVE_Z - 0.06), (0.05, y1 - y0 + 0.04, 0.2), M['blanco'])
        # Fascias de los hastiales (delante y detrás), siguiendo la pendiente.
        largo = math.hypot(xe, RIDGE - EAVE_Z)
        for yy in (y0 - 0.02, y1 + 0.02):
            b.box((sx * xe / 2, yy, (RIDGE + EAVE_Z) / 2 - 0.05), (largo + 0.05, 0.05, 0.2), M['blanco'], rot=(sx * ang, 'Y'))
    b.tube((0, y0 - 0.05, RIDGE + 0.02), (0, y1 + 0.05, RIDGE + 0.02), 0.1, 0.1, M['terracota'], sides=8)
    b.blob((0, y0 - 0.05, RIDGE + 0.05), (0.13, 0.13, 0.13), M["terracota"], subdiv=2)

    # Sendero al portal y losa del estacionamiento abierto, a la derecha.
    b.box(((DOOR[0] + DOOR[1]) / 2, FRONT - 2.4, 0.03), (1.0, 4.2, 0.06), M['concreto'])
    b.box((HW + 1.6, -4.0, 0.03), (2.9, 6.0, 0.06), M['concreto'])

    house = b.object(scene)
    uv_por_material(house, {'Repello': 3.0, 'RepelloBajo': 3.0, 'Teja': 2.4, 'Machimbre': 1.0, 'Baldosa': 1.0, 'Concreto': 3.0})
    door = puerta_reja(scene, house, M, DOOR[0], PORCH, DOOR[1] - DOOR[0], DOOR[2])
    uv_por_material(door, {})
    fg.export('casa_creador.glb', scene, [house, door], imagenes='JPEG')
    blend = os.path.join(ROOT, 'arte', 'blender', 'casa_creador.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend, copy=True)
    print('guardado', blend)


build()
