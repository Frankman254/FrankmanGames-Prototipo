# Diabólica Espejo — NPC folklórico panameño original.
# Referencia artística: assets/references/ (retrato y máscara). Interpretación
# respetuosa de la danza del Diablo de Espejo; sin estética demoníaca occidental.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/diablica_espejo.py
# Por MCP: exec(open(...).read()) con {'__name__': '__main__'}.
# Escribe assets/models/diablica_espejo.glb; texturas horneadas en
# assets/textures/personajes/heroes/. Piezas estables: Cuerpo, Pelo, Falda,
# Tocado, Baston, Mascara (la máscara se oculta/muestra desde el juego).
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector

try:
    sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
except NameError:
    pass
import fg_heroe as H
import fg_rig
from fg_heroe import mat, liso
from fg_rig import p


def side(s):
    return 1 if s == 'L' else -1


def extra_bones(h, specs):
    """Añade huesos de movimiento secundario (tocado, falda, flecos) al rig ya creado."""
    arm = h.rig.obj.data
    bpy.context.view_layer.objects.active = h.rig.obj
    bpy.ops.object.mode_set(mode='EDIT')
    for name, parent, head, tail in specs:
        b = arm.edit_bones.new(name)
        b.head, b.tail = Vector(head), Vector(tail)
        if parent:
            b.parent = arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in h.rig.pose:
        pb.rotation_mode = 'QUATERNION'
    h.bones += [tuple(s) for s in specs]
    h.segs.update({b[0]: (Vector(b[2]), Vector(b[3])) for b in specs})


POM = ['#e0314e', '#f27ea6', '#2e6fd8', '#f2c33c', '#e0552e', '#8e4fd0']  # pompones
def sway(fr):
    """Movimiento secundario por fotograma: desfase elástico tras el cuerpo."""
    a = fr / 30 * 2 * math.pi
    return {'tocado': (1.6 * math.sin(a - 0.7), 1.2 * math.sin(a * 0.5), 1.4 * math.sin(a - 1.1)),
            'falda': (0.8 * math.sin(a - 0.9), 0, 0.9 * math.sin(a - 1.6)),
            'flecoL': (1.2 * math.sin(a - 1.4), 0, 1.6 * math.sin(a - 0.8)),
            'flecoR': (1.2 * math.sin(a - 1.2), 0, -1.6 * math.sin(a - 0.6))}


# ---------------------------------------------------------------- rostro V2
# Identidad aprobada: 01_rostro_exacto/rostro_original_3_4_sin_redibujar.png.
# Ojos almendrados ámbar con párpado y pestañas, cejas castañas finas, nariz mínima,
# pecas, sonrisa cerrada ligeramente asimétrica, mentón redondeado. Pintado con numpy
# sobre la proyección frontal de la cara (u = x/0.26, v = (z-Cz)/0.3), tamaño 1024.
import numpy as np


def _rgb(hexc):
    h = hexc.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def _sm(e0, e1, x):
    t = np.clip((x - e0) / max(e1 - e0, 1e-6), 0, 1)
    return t * t * (3 - 2 * t)


def pintar_rostro_v2(nombre, size=1024):
    """Textura facial completa (piel + rasgos) en la UV de proyección frontal."""
    base = _rgb('#f8cdab')  # piel del paquete, subiendo saturación para el bake
    U, V = np.meshgrid((np.arange(size) + 0.5) / size, (np.arange(size) + 0.5) / size)
    img = np.ones((size, size, 3)) * base

    def pon(mask, col, a=1.0):
        nonlocal img
        m = np.clip(mask * a, 0, 1)[..., None]
        img = img * (1 - m) + _rgb(col) * m

    def trazo(pts, w, col, a=1.0):
        """Estampa círculos gaussianos a lo largo de una polilínea en UV."""
        canvas = np.zeros((size, size), np.float32)
        for (pu, pv), ww in zip(pts, w):
            r = max(int(np.ceil(ww * size)), 1)
            i0, j0 = int(pv * size), int(pu * size)
            di, dj = np.mgrid[-r:r + 1, -r:r + 1]
            d2 = (di / max(r, 1)) ** 2 + (dj / max(r, 1)) ** 2
            stamp = np.clip(1.25 - d2, 0, 1)
            sli = (slice(max(i0 - r, 0), min(i0 + r + 1, size)), slice(max(j0 - r, 0), min(j0 + r + 1, size)))
            canvas[sli] = np.maximum(canvas[sli], stamp)
        m = _sm(0.15, 0.55, canvas)
        nonlocal img
        mm = np.clip(m * a, 0, 1)[..., None]
        img = img * (1 - mm) + _rgb(col) * mm

    # Sombreado suave: flequillo arriba, laterales del cráneo, bajo el labio.
    img *= 1 - 0.14 * _sm(0.74, 0.96, V)[..., None]
    img *= 1 - 0.10 * _sm(0.36, 0.5, np.abs(U - 0.5))[..., None]
    img *= 1 - 0.10 * _sm(0.24, 0.16, V)[..., None]

    CY, CX0, AX, AY = 0.535, 0.175, 0.108, 0.066
    for s in (-1, 1):  # s = -1 ojo de su derecha, +1 izquierdo
        cx = CX0 * s + 0.5
        du, dy = U - cx, V - CY
        o = s * du  # radial: positivo hacia fuera
        dy = dy - 0.20 * np.clip(o, 0, None)  # inclinación: canto externo arriba
        dyu = np.where(dy > 0, dy * 1.35, dy)  # párpado superior más plano
        r_ojo = np.sqrt((du / AX) ** 2 + (dyu / AY) ** 2)
        ojo = 1 - _sm(0.88, 1.0, r_ojo)
        pon(ojo, '#f8f1ea')
        pon(ojo * _sm(0.55, 1.0, dy / AY) * _sm(0.2, 0.75, dy), '#dcc3bb', 0.5)  # sombra párpado
        # Iris ámbar anulado (gradiente vertical), limbo, pupila.
        iu, iv = du - 0.006 * s, dy + 0.002
        r_ir = np.sqrt((iu / (AX * 0.55)) ** 2 + (iv / (AY * 0.86)) ** 2)
        ir = np.clip(r_ir, 0, 1.0)
        cuerpo = _rgb('#c07a35')[None, None, :] * (0.55 + 0.75 * _sm(-0.9, 0.9, iv / (AY * 0.86)))[..., None]
        anillo = _rgb('#f2c179')[None, None, :] * ((1 - _sm(0.72, 0.86, r_ir)) * _sm(0.5, 0.64, r_ir))[..., None]
        col_ir = cuerpo * _sm(0.0, 0.2, r_ir)[..., None] + anillo
        col_ir = col_ir * (1 - _sm(0.86, 0.98, r_ir)[..., None]) + _rgb('#4a2410')[None, None, :] * _sm(0.86, 0.98, r_ir)[..., None]
        m_ir = (1 - _sm(0.9, 1.0, r_ir)) * ojo
        mm = m_ir[..., None]
        img = img * (1 - mm) + col_ir * mm
        dp = np.sqrt((iu / (AX * 0.16)) ** 2 + (iv / (AY * 0.34)) ** 2)
        pon((1 - _sm(0.7, 1.0, dp)) * ojo, '#140a06')
        # Brillos: uno grande arriba-afuera, dos chicos abajo-adentro.
        for hx, hy, hr, ha in ((0.036, 0.030, 0.024, 0.95), (-0.026, -0.030, 0.011, 0.8), (-0.004, 0.012, 0.005, 0.7)):
            dh = np.sqrt((du - hx * s) ** 2 + (dy - hy) ** 2) / hr
            pon((1 - _sm(0.55, 1.0, dh)) * ojo, '#ffffff', ha)
        # Pestañas superiores: borde del párpado con grosor variable + pestañeo externo.
        th = np.linspace(0.06, math.pi - 0.06, 60)
        pts, ws = [], []
        for t in th:
            eu, ev = AX * math.cos(t), AY * math.sin(t) / 1.35
            wpx = 0.0035 + 0.0055 * math.sin(t) * (1 + 0.7 * max(0, s * eu / AX))
            pts.append((cx + eu, CY + ev + 0.20 * max(0, s * eu)))
            ws.append(wpx)
        kk = np.linspace(0.1, 1.0, 8)
        for k in kk:  # eyeliner: ala fina hacia arriba-afuera, no pico ancho
            pts.append((cx + s * (AX + 0.036 * k), CY + AY * 0.62 + 0.034 * k))
            ws.append(0.0055 * (1 - 0.82 * k))
        trazo(pts, ws, '#241210')
        # Pestañas inferiores: línea fina, algo más densa en el tercio externo.
        th2 = np.linspace(-math.pi + 0.35, -0.35, 46)
        pts, ws = [], []
        for t in th2:
            eu, ev = AX * math.cos(t), AY * math.sin(t)
            densa = max(0.0, s * eu / AX)
            pts.append((cx + eu, CY + ev * 1.02))
            ws.append(0.0014 + 0.0022 * densa ** 1.6)
        trazo(pts, ws, '#4a2a20', 0.8)
        # Pliegue del párpado superior sobre la pestaña.
        th3 = np.linspace(0.25, math.pi - 0.35, 40)
        pts, ws = [], []
        for t in th3:
            eu, ev = AX * 1.16 * math.cos(t), AY * 0.95 * math.sin(t) / 1.35
            pts.append((cx + eu, CY + ev + 0.20 * max(0, s * eu) + 0.020))
            ws.append(0.0026)
        trazo(pts, ws, '#b87a5e', 0.6)
        # Ceja castaña: arco fino, cola punteada, nada de semicírculo.
        tb = np.linspace(-0.30, 1.12, 64)
        pts, ws = [], []
        for t in tb:
            ov = t * 0.072
            vbo = CY + 0.104 + 0.046 * ov - 0.10 * ov ** 2
            w = 0.0040 + 0.0034 * _sm(-0.4, 0.15, t) * (1 - _sm(0.75, 1.12, t))
            pts.append((cx + s * ov, vbo))
            ws.append(w)
        trazo(pts, ws, '#5f3d24', 0.92)
    # Nariz: sombra en la punta y un orificio insinuado (puente lo da la malla).
    dn = ((U - 0.502) / 0.014) ** 2 + ((V - 0.404) / 0.009) ** 2
    pon(1 - _sm(0.35, 1.0, dn), '#cf8f6d', 0.65)
    dn2 = ((U - 0.489) / 0.005) ** 2 + ((V - 0.391) / 0.004) ** 2
    pon(1 - _sm(0.3, 1.0, dn2), '#a86a4c', 0.45)
    dh = ((U - 0.502) / 0.009) ** 2 + ((V - 0.416) / 0.006) ** 2
    pon(1 - _sm(0.3, 1.0, dh), '#ffe9d8', 0.5)
    # Boca: sonrisa cerrada, más marcada en la comisura derecha de ella, leve tilde.
    tm = (U - 0.498) / 0.072
    vboca = 0.300 + 0.0125 * np.clip(tm, -1, 1) ** 2 - 0.004 * (U - 0.5)
    g_boca = 0.0035 + 0.008 * np.clip(tm, 0, 1) ** 1.5
    lin = np.clip(1.2 - np.abs(V - vboca) / np.maximum(g_boca, 1e-6), 0, 1) * (np.abs(tm) < 1.0)
    pon(lin, '#7a2e30')
    dc = ((U - 0.566) / 0.007) ** 2 + ((V - 0.312) / 0.006) ** 2
    pon(1 - _sm(0.2, 1.0, dc), '#5e1f22', 0.55)  # profundidad de la comisura
    for s in (-1, 1):  # comas bajo cada comisura
        dmm = ((U - (0.5 + 0.078 * s)) / 0.004) ** 2 + ((V - (0.293 - 0.006 * s)) / 0.0035) ** 2
        pon(1 - _sm(0.3, 1.0, dmm), '#7a2e30', 0.4)
    dl = ((U - 0.498) / 0.024) ** 2 + ((V - 0.286) / 0.007) ** 2
    pon(1 - _sm(0.4, 1.0, dl), '#f5b49c', 0.45)  # labio inferior
    du_l = ((U - 0.498) / 0.020) ** 2 + ((V - 0.316) / 0.0045) ** 2
    pon((1 - _sm(0.4, 1.0, du_l)) * (np.abs(tm) < 0.75), '#d89a80', 0.28)  # labio superior
    # Rubor de mejillas y punta de nariz.
    for s in (-1, 1):
        db = ((U - (0.5 + 0.262 * s)) / 0.062) ** 2 + ((V - 0.445) / 0.036) ** 2
        pon(1 - _sm(0.25, 1.0, db), '#e8836f', 0.26)
    # Pecas: banda en las mejillas y el puente, dispersión determinista.
    rng = np.random.RandomState(7207)
    for _ in range(64):
        s = 1 if rng.rand() < 0.5 else -1
        pu = 0.5 + s * rng.uniform(0.085, 0.30)
        pv = rng.uniform(0.405, 0.505)
        if abs(pu - 0.5) < 0.075:
            continue
        r = rng.uniform(0.0022, 0.0042)
        d = ((U - pu) / r) ** 2 + ((V - pv) / (r * 1.15)) ** 2
        pon(1 - _sm(0.2, 0.85, d), '#b06f4e', rng.uniform(0.22, 0.42))

    old = bpy.data.images.get(f'cara_{nombre}_v2')
    if old:
        bpy.data.images.remove(old)
    im = bpy.data.images.new(f'cara_{nombre}_v2', size, size, alpha=False)
    im.pixels.foreach_set(np.concatenate([img, np.ones((size, size, 1))], axis=2).astype(np.float32).ravel())
    return im


def piel_clara(h, hex_target='#f7d8c4'):
    """Piel del paquete (más clara que la genérica): tinte de la textura pintada.
    Los píxeles de bpy.data.images están en LINEAL; el objetivo hay que convertirlo."""
    src = H.textura('piel_trigo')
    px = np.array(src.pixels[:], dtype=np.float32).reshape(-1, 4)
    cur = px[:, :3].mean(0)
    tgt = _rgb(hex_target) ** 2.2  # sRGB -> lineal, mismo espacio que los píxeles
    esc = np.clip(tgt / np.maximum(cur, 1e-3), 0.4, 2.2)
    px[:, :3] = np.clip(px[:, :3] * esc, 0, 1)
    old = bpy.data.images.get('piel_diablica_clara')
    if old:
        bpy.data.images.remove(old)
    im = bpy.data.images.new('piel_diablica_clara', src.size[0], src.size[1], alpha=False)
    im.pixels.foreach_set(px.ravel())
    return im


def cabeza_v2(h, cara_mat, piel_mat):
    """Cabeza con mandíbula y mentón de la referencia: perfil de radio por altura
    (cráneo ancho arriba, pómulos, quijada redondeada que cierra en mentón)."""
    f = H.ff.Figura('Cabeza', h.bones)
    C = h.head_c
    anillos = []
    for dz, rx, ry in ((0.135, 0.020, 0.020), (0.118, 0.052, 0.058), (0.102, 0.088, 0.096),
                       (0.084, 0.107, 0.116), (0.060, 0.116, 0.124), (0.030, 0.117, 0.124),
                       (0.000, 0.114, 0.121), (-0.030, 0.107, 0.115), (-0.060, 0.097, 0.106),
                       (-0.086, 0.084, 0.095), (-0.106, 0.069, 0.084), (-0.120, 0.050, 0.072),
                       (-0.130, 0.028, 0.058)):
        yoff = -0.008 * _sm(-0.08, -0.13, dz)  # el mentón avanza un poco
        anillos.append((tuple(C + Vector((0, yoff, dz))), rx, ry))

    def deform(q):
        q = Vector(q)
        rel = q - C
        if rel.y < 0 and -0.075 < rel.z < 0.015:  # pómulos suaves
            k = _sm(0.35, 0.85, -rel.y) * (1 - abs(rel.z + 0.03) / 0.045)
            q += Vector((math.copysign(1, rel.x), -0.4, 0.25)).normalized() * 0.004 * max(k, 0)
        if rel.y < 0 and rel.z < -0.03:  # valle bajo el pómulo hacia la boca
            k = _sm(-0.03, -0.075, rel.z) * _sm(0.3, 0.8, -rel.y / 0.121) * (1 - _sm(0.55, 0.95, abs(rel.x) / 0.117))
            q += rel.normalized() * 0.005 * max(k, 0)
        return q
    f.loft(anillos, cara_mat, 'head', sides=28, cap0=True, cap1=True, urep=1.4, deform=deform)
    # Nariz con puente: bulto fino casi en la superficie y punta pequeña.
    f.ellipsoid(tuple(C + Vector((0.001, -0.112, -0.018))), (0.008, 0.010, 0.019), cara_mat, 'head', sides=8, rings=5,
                deform=lambda q: Vector((q.x, q.y - 0.18 * (q.z - (C.z - 0.018)), q.z)) if q.y < C.y else q)
    f.ellipsoid(tuple(C + Vector((0.002, -0.118, -0.038))), (0.011, 0.010, 0.008), cara_mat, 'head', sides=8, rings=4)
    # Orejas integradas bajo el pelo.
    for x in (-1, 1):
        f.ellipsoid((0.112 * x, C.y + 0.01, C.z - 0.005), (0.014, 0.022, 0.03), piel_mat, 'head', sides=8, rings=5)
    o = H.uv_nombre(f.object(h.scene))
    me = o.data
    uv = me.uv_layers.active
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if poly.normal.y > 0.25:
                uv.data[li].uv = (0.03, 0.97)  # nuca lisa
            else:
                uv.data[li].uv = (0.5 + co.x / 0.26, 0.5 + (co.z - C.z) / 0.3)
    for pl in me.polygons:
        pl.use_smooth = True
    return o


def construir():
    nombre = 'diablica_espejo'
    h = H.Heroe(nombre, sexo='f', piel='piel_trigo', piel_hex='#f7d8c4', pelo='pelo_castano', iris='#7a4a1e')
    rnd = random.Random(9107)
    extra_bones(h, [
        ('tocado', 'head', (0, 0, 1.62), (0, 0, 1.78)),
        ('falda', 'hips', (0, 0, 0.92), (0, 0, 0.30)),
        ('flecoL', 'head', (0.13, 0.02, 1.50), (0.16, 0.05, 1.10)),
        ('flecoR', 'head', (-0.13, 0.02, 1.50), (-0.16, 0.05, 1.10)),
    ])

    # Paleta recalibrada a 03_materiales_basecolor del paquete V2 (el usuario
    # rechazó 05_pbr_roughness; sólo se usan los nombres/colores como guía).
    CARA_IM = pintar_rostro_v2(nombre)
    h.piel = H.mat(f'{nombre}_piel', piel_clara(h), rough=0.65)
    h.cara = H.mat(f'{nombre}_cara', CARA_IM, rough=0.6)
    BLUSA = H.mat(f'{nombre}_blusa', 'tela_blanca', rough=0.8)
    GUANTE = H.mat(f'{nombre}_guante', 'tela_blanca', rough=0.65, doble=True)
    ZAP = liso(f'{nombre}_zapato', '#f4f0ea', rough=0.35)
    TURQ = liso(f'{nombre}_turquesa', '#7fd6cf', rough=0.75)  # sobrefalda_menta / tocado
    TURQ_L = liso(f'{nombre}_turq_claro', '#b0ece7', rough=0.7)
    MENTA = liso(f'{nombre}_menta', '#b1eeb2', rough=0.8, doble=True)  # cintas_lima
    ROSA = liso(f'{nombre}_rosa', '#febfdb', rough=0.75, doble=True)  # volantes_rosa
    ROSA_O = liso(f'{nombre}_rosa_os', '#f655c1', rough=0.75, doble=True)  # cintas_fucsia
    FALDA_M = liso(f'{nombre}_falda', '#fa91cb', rough=0.7, doble=True)  # falda_rosa
    ENCAJE = liso(f'{nombre}_encaje', '#faf6ef', rough=0.85, doble=True)
    ORO = liso(f'{nombre}_oro', '#f9e29d', rough=0.4, metal=0.3)  # borde_dorado
    ESPEJO = liso(f'{nombre}_espejo', '#e7f6fb', rough=0.08, metal=0.85)
    AZUL = liso(f'{nombre}_liston_az', '#5399e4', rough=0.7, doble=True)
    AMAR = liso(f'{nombre}_liston_am', '#fff19d', rough=0.7, doble=True)
    VERDE = liso(f'{nombre}_verde', '#7cd098', rough=0.7, doble=True)  # baston_verde
    LAVANDA = liso(f'{nombre}_lavanda', '#e3ceed', rough=0.75, doble=True)  # volantes_lavanda
    ROSA_B = liso(f'{nombre}_rosa_baston', '#f798cd', rough=0.7, doble=True)
    HUESO = liso(f'{nombre}_hueso', '#efe7d8', rough=0.6)
    NEGRO = liso(f'{nombre}_negro', '#17120f', rough=0.6)
    MORADO = liso(f'{nombre}_morado', '#dac2e1', rough=0.7)  # marcos_espejos
    POM_M = {c: liso(f'{nombre}_pom_{c.strip("#")}', c, rough=0.9) for c in POM}

    h.mats = {'piel': h.piel, 'blusa': BLUSA, 'guante': GUANTE, 'zapato': ZAP,
              'falda': FALDA_M, 'turquesa': TURQ}

    # ---------------------------------------------------------- cuerpo y ropa
    # Camisa blanca de cuello y mangas abullonadas; guantes blancos; zapatos blancos;
    # medias/faldón bajo rosados (la falda exterior es una pieza aparte).
    def zonas(b, c):
        if b.startswith('foot') or (b.startswith('shin') and c.z < 0.22):
            return 'zapato'
        if b.startswith(('hand', 'foreArm')):
            return 'guante'
        if b.startswith('upperArm'):
            return 'blusa' if c.z < 1.16 else 'piel'
        if b.startswith('head') or c.z > 1.33:
            return 'piel'
        if b.startswith(('thigh', 'shin')) or (b == 'hips' and c.z < 0.98):
            return 'falda'
        return 'blusa'
    cortes = [0.22, 1.16, 1.33, 0.98]
    h.cuerpo(zonas, {'zapato': 0.012, 'guante': 0.007, 'blusa': 0.010, 'falda': 0.014}, cortes)
    h.extras_obj = [cabeza_v2(h, h.cara, h.piel)]

    x = h.figura('Ropa')
    # Cuello de camisa y puños.
    x.band([(1.33, 0.062, 0.056), (1.36, 0.07, 0.062), (1.385, 0.062, 0.055)], BLUSA, {'chest': 1.0, 'head': 0.2}, sides=18, urep=3)
    for s in ('L', 'R'):
        k = side(s)
        fore = {'foreArm' + s: 1.0, 'hand' + s: 0.3}
        x.loft([((0.266 * k, -0.028, 0.86), 0.042, 0.04), ((0.269 * k, -0.031, 0.83), 0.041, 0.039)], GUANTE, fore, sides=12, urep=2, vlen=0.05)
    # Volantes del pecho: menta y rosa en capas cortas, como el traje de la referencia.
    for z, M in ((1.30, MENTA), (1.24, ROSA), (1.18, MENTA)):
        def frill(u, v, z=z, M=M):
            a = (u - 0.5) * 2.4
            rr = Vector((0.148 + 0.012 * v, 0.108 + 0.008 * v))
            return Vector((rr.x * math.sin(a), -(rr.y + 0.018 * math.sin(v * math.pi)) + 0.008 * math.cos(a), z - 0.05 * v + 0.006 * math.cos(a * 2)))
        x.sheet(frill, 14, 2, M, {'chest': 1.0, 'spine': 0.25}, urep=3, vrep=1)
    # Faja turquesa ancha en la cintura (bajo el borde de la falda).
    x.band([(0.95, 0.168, 0.128), (1.00, 0.158, 0.118), (1.05, 0.166, 0.124)], TURQ, {'hips': 1.0, 'spine': 0.4}, sides=22, urep=5)
    # Volantes del pecho: cintas onduladas pegadas al torso, alternando menta y rosa.
    def wave(sx, sy):
        def d(q):
            a = math.atan2(q.y * sx, q.x * sy)
            w = 1 + 0.10 * math.sin(a * 9)
            return Vector((q.x * w, q.y * w, q.z))
        return d
    x.band([(1.27, 0.138, 0.106), (1.245, 0.140, 0.108)], MENTA, {'chest': 1.0}, sides=24, urep=5, deform=wave(1, 1))
    x.band([(1.215, 0.138, 0.106), (1.19, 0.142, 0.110)], ROSA, {'chest': 1.0}, sides=24, urep=5, deform=wave(1, 1))

    # ---------------------------------------------------------- falda campana
    f = H.ff.Figura('Falda', h.bones)
    FW = {'hips': 1.0, 'falda': 1.0, 'spine': 0.5, 'thighL': 0.25, 'thighR': 0.25}

    def skirt_r(z, out=0.0):
        """Radio de la campana a la altura z: arranca estrecha en la cintura y ensancha
        bajo la rodilla, como la referencia (nada de globo)."""
        t = max(0.0, min(1.0, (1.05 - z) / 1.02))
        return 0.175 + 0.395 * (t ** 2.1) + out
    prof = []
    for i in range(15):
        z = 1.05 - i * (1.05 - 0.04) / 14
        prof.append((z, skirt_r(z), skirt_r(z) * 0.86))
    def skirt_deform(pv):
        ang = math.atan2(pv.y, pv.x)
        t = max(0.0, min(1.0, (1.05 - pv.z) / 1.02))
        w = 0.016 * math.sin(ang * 12) * t * t
        return pv + Vector((math.cos(ang), math.sin(ang) * 0.86, 0)).normalized() * w
    f.band(prof, FALDA_M, FW, sides=32, urep=6, deform=skirt_deform)
    # Encaje del dobladillo (3 % más fuera para que el contacto no se hornee gris).
    f.band([(0.09, skirt_r(0.09), skirt_r(0.09) * 0.86), (0.055, skirt_r(0.055) * 1.035, skirt_r(0.055) * 0.89),
            (0.03, skirt_r(0.03) * 1.015, skirt_r(0.03) * 0.872)], ENCAJE, FW, sides=32, urep=8, deform=skirt_deform)
    # Delantal turqueso claro sobre el frente, siguiendo la campana, y su volante rosa.
    def apron(u, v):
        a = -1.15 + u * 2.3
        z = 1.02 - v * 0.56
        rr = skirt_r(z, 0.014)
        return Vector((rr * math.sin(a), -rr * 0.86 * math.cos(a) - 0.01, z))
    f.sheet(apron, 16, 5, TURQ_L, FW, urep=4, vrep=2)
    def apron_ruffle(u, v):
        a = -1.15 + u * 2.3
        z = 0.46 + 0.045 * math.sin(u * 34) - 0.05 * v
        rr = skirt_r(z, 0.024)
        return Vector((rr * math.sin(a), -rr * 0.86 * math.cos(a) - 0.012, z))
    f.sheet(apron_ruffle, 26, 1, ROSA, FW, urep=5, vrep=1)
    # Espejos cosidos: disco plano con anillo, normal hacia el frente-curva.
    def mirror(a, z, r, ring):
        rr = skirt_r(z, 0.012)
        cx, cy = rr * math.sin(a), -rr * 0.86 * math.cos(a)
        nrm = Vector((math.sin(a), -0.86 * math.cos(a), 0)).normalized()
        d = Vector((cx, cy, z))
        f.loft([(tuple(d - nrm * 0.006), r, r), (tuple(d + nrm * 0.004), r, r)], ring, FW, sides=14, xdir=(0, 0, 1), cap0=True, cap1=True)
        f.loft([(tuple(d + nrm * 0.002), r * 0.7, r * 0.7), (tuple(d + nrm * 0.008), r * 0.7, r * 0.7)], ESPEJO, FW, sides=14, xdir=(0, 0, 1), cap0=True, cap1=True)
    for a, z, r, ring in ((-0.35, 0.62, 0.05, ROSA_O), (0.5, 0.4, 0.055, VERDE), (-0.85, 0.28, 0.05, AZUL)):
        mirror(a, z, r, ring)
    # Pompones pequeños + cintas doradas verticales sobre la campana.
    for i, (a, z) in enumerate([(0.15, 0.55), (0.9, 0.34), (-0.6, 0.45), (0.4, 0.18), (-1.0, 0.6), (1.1, 0.52), (-0.2, 0.2), (0.75, 0.7)]):
        rr = skirt_r(z, 0.016)
        f.ellipsoid((rr * math.sin(a), -rr * 0.86 * math.cos(a), z), (0.021, 0.021, 0.021), POM_M[POM[i % 6]], FW, sides=8, rings=5)
    for a0 in (-1.0, -0.45, 0.1, 0.6, 1.15):
        def ribbon(u, v, a0=a0):
            a = a0 + u * 0.28 * math.sin(u * 3 + a0)
            z = 1.0 - u * 0.92
            rr = skirt_r(z, 0.008 + (v - 0.5) * 0.008)
            return Vector((rr * math.sin(a), -rr * 0.86 * math.cos(a) - 0.004, z))
        f.sheet(ribbon, 14, 1, ORO, FW, urep=2, vrep=1)
    h.pieza(f, 'Falda')

    # ---------------------------------------------------------- tocado de pompones
    t = H.ff.Figura('Tocado', h.bones)
    TW = {'head': 0.6, 'tocado': 1.0}
    C = h.head_c

    def skull_r(dz):
        """Radio del cráneo (con 6 mm de holgura) a dz sobre el centro de la cabeza."""
        fct = max(0.0, 1 - (dz / 0.135) ** 2) ** 0.5
        return 0.118 * fct + 0.006, 0.122 * fct + 0.006
    # Banda turquesa sobre la frente alta. Todo por encima de C.z+0.05: el deform
    # `gorro` del Heroe encoge el frente por debajo de esa cota y la banda flotaría.
    t.band([(C.z + 0.055,) + (skull_r(0.055)[0] + 0.004, skull_r(0.055)[1] + 0.004),
            (C.z + 0.085,) + (skull_r(0.085)[0] + 0.004, skull_r(0.085)[1] + 0.004),
            (C.z + 0.12,) + (skull_r(0.12)[0] + 0.003, skull_r(0.12)[1] + 0.003)], TURQ, TW, sides=20, urep=4)
    # Espejo de la sien IZQUIERDA (+X), como la referencia: disco con aro índigo.
    dz = 0.075
    rx, ry = skull_r(dz)
    a = math.radians(64)  # desde el frente (-Y) hacia la sien
    q = C + Vector((rx * math.sin(a), -ry * math.cos(a), dz))
    nrm = Vector((math.sin(a) * 0.9, -math.cos(a) * 0.9, 0.25)).normalized()
    t.loft([(tuple(q + nrm * 0.006), 0.052, 0.052), (tuple(q + nrm * 0.018), 0.052, 0.052)], MORADO, TW, sides=16, xdir=tuple(nrm.cross(Vector((0, 0, 1)))), cap0=True, cap1=True)
    t.loft([(tuple(q + nrm * 0.014), 0.040, 0.040), (tuple(q + nrm * 0.024), 0.040, 0.040)], ESPEJO, TW, sides=16, xdir=tuple(nrm.cross(Vector((0, 0, 1)))), cap0=True, cap1=True)
    # Pompones en la parte frontal/side de la banda, pegados a ella.
    for i, adeg in enumerate(((-0.55), (-0.25), (0.25), (0.55))):
        a = math.radians(90 + adeg * 90)  # 0 = frente (-Y), + hacia su izquierda
        rx, ry = skull_r(0.06)
        q = C + Vector((rx * math.sin(a) * 1.05, -ry * math.cos(a) * 1.05, 0.06))
        t.ellipsoid(tuple(q), (0.028, 0.028, 0.028), POM_M[POM[(i * 2 + 1) % 6]], TW, sides=8, rings=5)

    def pomp(q, r, M):
        t.ellipsoid(tuple(q), (r, r, r), M, TW, sides=8, rings=5, urep=1, vrep=1)
    # Arco de pompones: corona que nace de la sien izquierda, pasa por detrás de la
    # coronilla y desciende por SU IZQUIERDA (+X) hasta el hombro. Sigue la cabeza.
    arc_r = 0.215
    for k in range(14):
        a = math.radians(15 + k * 12)  # 90° = lado izquierdo; 195° baja hacia el frente-izquierda
        q = C + Vector((arc_r * math.sin(a), -0.06 * math.cos(a), arc_r * math.cos(a)))
        pomp(q, 0.05 + 0.008 * math.sin(k * 1.7), POM_M[POM[k % 6]])
    # Cascada final: tres racimos pegados al pelo del lado izquierdo + remate en el hombro.
    fall = [C + Vector((0.155, -0.005, -0.13)), C + Vector((0.185, 0.01, -0.25)), C + Vector((0.2, 0.02, -0.34))]
    for i, q in enumerate(fall):
        pomp(q, 0.05, POM_M[POM[(i * 2 + 1) % 6]])
    # Listones colgando del último racimo (rosa, azul, amarillo, rosa).
    for i, M in enumerate((ROSA, AZUL, AMAR, ROSA)):
        top = fall[-1] + Vector((0, -0.004, -0.05))
        def ribbon(u, v, top=top, i=i):
            x_ = top.x + 0.02 * math.sin(u * 3.2 + i * 1.4) + (v - 0.5) * 0.026
            y_ = top.y + 0.012 * i * 0.6 - 0.02 * u
            return Vector((x_, y_, top.z - u * (0.36 + 0.03 * i)))
        t.sheet(ribbon, 7, 1, M, {'tocado': 1.0, 'flecoL': 0.5}, urep=1, vrep=1)
    h.pieza(t, 'Tocado')

    # ---------------------------------------------------------- pelo: coleta castaña
    pelo, PELO = h.pelo('coleta', rnd, fleco_parte=True)
    h.pieza(pelo, 'Pelo')

    # ---------------------------------------------------------- bastón de cintas
    grip, xf, D = h.agarre('handR')
    b = H.ff.Figura('Baston', h.bones)
    b.xf = xf
    up = Vector((0, 0, 1))
    g = Vector((grip.x, grip.y, 0))
    bottom, top = 0.075, grip.z + 0.78  # la punta dorada acaba a ~3 cm del suelo
    # Asta con franjas verdes y rosadas en espiral: tramos alternos de dos colores.
    nseg = 9
    for i in range(nseg):
        z0 = bottom + (top - bottom) * i / nseg
        z1 = bottom + (top - bottom) * (i + 1) / nseg
        M = VERDE if i % 2 == 0 else ROSA
        b.loft([(tuple(g + up * (z0 - 0.02)), 0.017, 0.017), (tuple(g + up * (z1 + 0.01)), 0.017, 0.017)],
               M, 'handR', sides=9, urep=1.5 + i * 0.35, vlen=None, cap0=False, cap1=False)
    b.loft([(tuple(g + up * bottom), 0.02, 0.02), (tuple(g + up * (bottom - 0.05)), 0.013, 0.013)], ORO, 'handR', sides=9, cap1=True, urep=1)
    # Bolas pequeñas a lo largo del asta y lazo de cintas en la punta.
    for z in (bottom + 0.18, bottom + 0.42, grip.z + 0.4, top - 0.16):
        b.ellipsoid(tuple(g + up * z), (0.021, 0.021, 0.021), ORO, 'handR', sides=8, rings=5)
    for i, (M, dx) in enumerate(((ROSA, 0.0), (VERDE, 0.015), (ROSA_O, -0.015))):
        def loop(u, v, M=M, i=i, dx=dx):
            a = u * 2 * math.pi
            r = 0.06 + 0.012 * math.sin(a * 2 + i)
            return g + up * (top + 0.03) + Vector((math.cos(a) * r, math.sin(a) * r * 0.45 - 0.02, math.sin(a) * r * 0.75 + dx))
        b.sheet(lambda u, v: loop(u, v), 10, 1, M, 'handR', urep=1, vrep=1)
        def tail(u, v, i=i, dx=dx):
            return g + up * (top - 0.02) + Vector((dx + 0.035 * (v - 0.5), -0.045, -u * (0.34 + 0.08 * i) + 0.02 * math.sin(u * 4 + i)))
        b.sheet(tail, 8, 1, (ROSA if i != 1 else VERDE), 'handR', urep=1, vrep=1)
    h.pieza(b, 'Baston')

    # ---------------------------------------------------------- máscara de careta
    # Calavera pintada de la danza (foto): cuencas triangulares, triángulo magenta
    # en la frente, nariz invertida, dientes, rombos en las mejillas, gorro morado
    # con borlas y estambres de colores cayendo por los lados.
    m = H.ff.Figura('Mascara', h.bones)
    MW = {'head': 1.0}
    MRX, MRY, MRZ, MYOFF = 0.130, 0.150, 0.148, 0.016

    def mfront(x, z, gap=0.004):
        """Punto de la cáscara frontal (elipsoide con centro en C desplazado +MYOFF)."""
        q = max(0.0, 1 - (x / MRX) ** 2 - (z / MRZ) ** 2)
        return C + Vector((x, MYOFF - MRY * math.sqrt(q) - gap, z))

    # Media cáscara frontal: elipsoide recortado a los cuadrantes del frente (-Y).
    m.ellipsoid(tuple(C + Vector((0, MYOFF, 0))), (MRX, MRY, MRZ), HUESO, MW, sides=20, rings=10,
                keep=lambda j, i: 5 <= i <= 15)
    # Mentón: la careta cierra en quijada estrecha que avanza bajo la boca.
    m.ellipsoid(tuple(C + Vector((0, -0.070, -0.118))), (0.050, 0.055, 0.030), HUESO, MW, sides=12, rings=6)
    # Cuencas: triángulo romo con la punta exterior caída (dos losas cruzadas).
    for s in (-1, 1):
        pts = [(0.026 * s, 0.040), (0.078 * s, 0.034), (0.064 * s, 0.004), (0.036 * s, 0.014)]
        for a, b in ((0, 1), (2, 3), (1, 2), (3, 0)):
            pa, pb = mfront(*pts[a]), mfront(*pts[b])
            m.loft([(tuple(pa), 0.011, 0.011), (tuple(pb), 0.011, 0.011)], NEGRO, MW, sides=6, xdir=(0, 1, 0), cap0=True, cap1=True, smooth=False)
    # Nariz: triángulo invertido en el centro.
    for a, b in (((0, 0.008), (-0.014, -0.020)), ((0, 0.008), (0.014, -0.020)), ((-0.014, -0.020), (0.014, -0.020))):
        pa, pb = mfront(*a), mfront(*b)
        m.loft([(tuple(pa), 0.008, 0.008), (tuple(pb), 0.008, 0.008)], NEGRO, MW, sides=5, xdir=(0, 1, 0), cap0=True, cap1=True, smooth=False)
    # Dientes: banda clara con cinco estrías negras.
    m.loft([(tuple(mfront(0, -0.052, 0.002)), 0.050, 0.014), (tuple(mfront(0, -0.052, 0.010)), 0.050, 0.014)], HUESO, MW, sides=16, xdir=(1, 0, 0), cap0=True, cap1=True)
    for i in range(5):
        xa = -0.034 + i * 0.017
        pa, pb = mfront(xa, -0.060, 0.001), mfront(xa, -0.044, 0.001)
        m.loft([(tuple(pa), 0.0024, 0.0024), (tuple(pb), 0.0024, 0.0024)], NEGRO, MW, sides=5, xdir=(0, 1, 0), cap0=True, cap1=True)
    # Triángulo magenta en la frente.
    tri = ((-0.018, 0.072), (0.018, 0.072), (0.0, 0.104))
    for a, b in ((0, 1), (1, 2), (2, 0)):
        pa, pb = mfront(*tri[a], 0.002), mfront(*tri[b], 0.002)
        m.loft([(tuple(pa), 0.009, 0.009), (tuple(pb), 0.009, 0.009)], ROSA_B, MW, sides=5, xdir=(0, 1, 0), cap0=True, cap1=True, smooth=False)
    # Rombos magenta en columna en cada mejilla.
    for s in (-1, 1):
        for k, dz in enumerate((0.018, -0.004, -0.026)):
            p_ = mfront((0.092 + 0.006 * k) * s, dz, 0.002)
            m.loft([(tuple(p_ + Vector((0, 0, 0.008))), 0.0075, 0.0075), (p_.to_tuple(), 0.0075, 0.0075)], ROSA_B, MW, sides=4, xdir=(1, 0, 0), cap0=True, cap1=True, smooth=False)
    # Gorro morado con pompones y flecos de estambre verde/amarillo por los lados.
    m.band([(C.z + 0.12, 0.128, 0.135), (C.z + 0.16, 0.11, 0.118)], MORADO, MW, sides=16, urep=3)
    for k in range(6):
        a = math.pi * (0.15 + 0.7 * k / 5)
        q = C + Vector((math.sin(a) * 0.12, -math.cos(a) * 0.12, 0.175))
        m.ellipsoid(tuple(q), (0.024, 0.024, 0.024), POM_M[POM[k % 6]], MW, sides=6, rings=4)
    for s in (-1, 1):
        bone = 'flecoL' if s > 0 else 'flecoR'
        for j in range(7):
            def strand(u, v, s=s, j=j):
                x0 = s * (0.112 + 0.004 * math.sin(j * 2.1))
                y0 = 0.01 + 0.028 * j  # caen por el lateral/nuca, no por delante
                return Vector((x0 + s * u * 0.02 + (v - 0.5) * 0.01,
                               y0 + 0.02 * u,
                               C.z + 0.075 - u * 0.46 - 0.006 * (j % 3)))
            m.sheet(strand, 6, 1, (VERDE if j % 2 == 0 else AMAR), {bone: 1.0, 'head': 0.3}, urep=1, vrep=1)
    h.pieza(m, 'Mascara')

    # ---------------------------------------------------------- clips
    # Compartidos (con huesos de balance) + propios; Heroe.clips no reenvía `extra`
    # a biped_clips, así que se llaman directo aquí.
    atacar = [
        (1, p()),
        (7, p(chest=(0, 0, -22), upperArmR=(-60, -20, 0), foreArmR=(-60, 0, 0))),
        (11, p(chest=(10, 0, 16), upperArmR=(20, -12, 0), foreArmR=(-20, 0, 0), thighR=(-16, 0, 0), shinR=(12, 0, 0))),
        (18, p()),
    ]
    lanzar = [
        (1, p()),
        (8, p(chest=(-10, 0, 0), head=(-8, 0, 0), upperArmR=(-100, -12, 0), foreArmR=(-25, 0, 0))),
        (16, p(chest=(-6, 0, 0), upperArmR=(-112, -12, 0), foreArmR=(-18, 0, 0))),
        (24, p()),
    ]
    fg_rig.biped_clips(h.rig, extra=sway)
    fg_rig.biped_emote_clips(h.rig)
    h.rig.clip('Atacar', atacar)
    h.rig.clip('Lanzar', lanzar)
    h.rig.clip('MascaraOn', [
        (1, p()),
        (7, p(upperArmR=(-28, -30, 0), foreArmR=(-120, 10, 0))),
        (13, p(chest=(-8, 0, 0), head=(-10, 0, 0), upperArmR=(-88, -14, 0), upperArmL=(-86, 12, 0), foreArmR=(-60, 0, 0), foreArmL=(-62, 0, 0))),
        (19, p(upperArmR=(-96, -12, 0), upperArmL=(-90, 12, 0), foreArmR=(-40, 0, 0), foreArmL=(-44, 0, 0))),
        (26, p()),
    ])
    h.rig.clip('MascaraOff', [
        (1, p()),
        (8, p(upperArmR=(-100, -10, 0), foreArmR=(-40, 0, 0))),
        (16, p(chest=(6, 0, 0), head=(8, 0, 0), upperArmR=(-30, -22, 0), foreArmR=(-105, 0, 0))),
        (24, p()),
    ])
    h.rig.clip('Baston', [
        (1, p()),
        (7, p(chest=(0, 0, 14), head=(2, 6, 0), upperArmR=(18, -40, 0), foreArmR=(-30, 0, 0))),
        (15, p(chest=(0, 0, -10), head=(0, -6, 0), upperArmR=(-25, -6, 0), foreArmR=(-70, 0, 0))),
        (23, p()),
    ])
    h.rig.clip('Reaccion', [  # gira cabeza y busto hacia el que se acerca
        (1, p()),
        (8, p(chest=(0, 0, -7), head=(0, 4, 16), tocado=(2, 0, -3))),
        (16, p(chest=(0, 0, -7), head=(0, 4, 16), tocado=(1, 0, -2))),
        (24, p()),
    ])
    h.montar()
    return h


def main(argv):
    h = construir()
    if '--sin-exportar' in argv:
        return h
    h.exportar('diablica_espejo.glb', {'Cuerpo': 2048, 'Falda': 2048, 'Tocado': 1024, 'Pelo': 1024, 'Mascara': 1024, 'Baston': 1024},
               guardar_blend=True, aos={'Cuerpo': 0.22, 'Falda': 0.22, 'Mascara': 0.25})


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
