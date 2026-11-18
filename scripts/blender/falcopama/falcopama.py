# Falcopama: ave montable chibi, fiel a la lámina propia del creador (generada con ChatGPT,
# autorizada para modelarse fiel a su desglose modular: creador, 2026-11-17).
# Piezas del desglose: Cabeza, Alas, Cola, Cuerpo, Silla, Alforja. Cada una se construye y se
# revisa sola; después se unen con un esqueleto y clips.
#
# Contrato (el de la Crestalba, para poder sustituirla): frente −Y, +Z arriba, apoyo en z = 0,
# altura 1,75–2,25 m, silla 1,30–1,55 m, materiales por región `montura_<region>` leídos de
# data/art/crestalba_variantes.json (solo lectura), ≤ 18 000 triángulos en la versión de juego.
#
# Pipeline completo de la Falcopama de juego:
#   falcopama.py (piezas) → bake_juego.py (versión de juego con UV) → rig_falcopama.py (esqueleto,
#   clips y assets/models/falcopama.glb) → validar_falcopama.py.
# Blender -b --factory-startup --python falcopama.py -- [--pieza cabeza|alas|...|todo] [--render]
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
# Utilidades de escultura ya en el repo (metaballs, lofts, bezier, láminas).
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'blender', 'aguila_arpia'))
import arpia_gigante as A  # noqa: E402

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
# Trabajo y evidencias fuera del repo (work/ está ignorado); --out cambia el destino.
WORK = ARGS[ARGS.index('--out') + 1] if '--out' in ARGS else os.path.join(ROOT, 'work', 'omp-mod02')
os.makedirs(WORK, exist_ok=True)
sys.path.insert(0, WORK)
PIEZA = ARGS[ARGS.index('--pieza') + 1] if '--pieza' in ARGS else 'todo'
RENDER = '--render' in ARGS
V = Vector
R = math.radians
ss = A.ss

PALETA = json.load(open(os.path.join(ROOT, 'data', 'art', 'crestalba_variantes.json'), encoding='utf-8'))
REGIONES = PALETA['regiones']
VARIANTE = ARGS[ARGS.index('--variante') + 1] if '--variante' in ARGS else PALETA['base']
BASE = PALETA['variantes'][VARIANTE]

# ---------------------------------------------------------------- puntos clave del cuerpo
H = V((0, -0.50, 1.30))          # centro de la cabeza
B = V((0, 0.10, 0.92))           # centro del cuerpo (huevo)
SEAT = V((0, 0.10, 1.36))


def hp(x, y, z):
    return H + V((x, y, z))


# ---------------------------------------------------------------- materiales
MATS = {}


def material(name, hexcol, rough=0.6, metal=0.0, emit=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    col = tuple(A.lin(hexcol)[:3]) + (1,)
    b.inputs['Base Color'].default_value = col
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = col
        b.inputs['Emission Strength'].default_value = emit
    MATS[name] = m
    return m


def region(r):
    return material(f'montura_{r}', BASE[r], rough=0.35 if r == 'herrajes' else 0.62,
                    metal=0.6 if r == 'herrajes' else 0.0)


def mats_init():
    for r in REGIONES:
        region(r)
    material('falcopama_ojo_anillo', '#e9cf86', rough=0.3)
    material('falcopama_ojo_iris', '#2a1d18', rough=0.15)
    material('falcopama_ojo_pupila', '#09090b', rough=0.1)
    material('falcopama_ojo_brillo', '#ffffff', rough=0.1, emit=1.5)
    material('falcopama_rollo', '#c99a6f', rough=0.8)


# alias de regiones con su papel en la Falcopama
CREMA, TEAL, OSCURO, PECHO, PICO, CUERO, ORO = REGIONES


def give(ob, names):
    """Asigna ranuras de material (por nombre de región o de material) al objeto."""
    ob.data.materials.clear()
    for n in names:
        ob.data.materials.append(region(n) if n in REGIONES else MATS[n])
    return ob


def split_regions(ob, f, inside, outside, iters=3, among=None):
    """Reparte caras entre dos ranuras con una función continua f(p) (> 0 dentro) y lleva los
    vértices del borde al contorno exacto f = 0: borde limpio en vez de escalones de vóxel."""
    me = ob.data
    nv = len(me.vertices)
    co = np.empty(nv * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3).astype(np.float64)
    polys = [list(p.vertices) for p in me.polygons]
    cen = np.array([co[pv].mean(0) for pv in polys])
    cur = np.empty(len(polys), np.int32)
    me.polygons.foreach_get('material_index', cur)
    cand = np.ones(len(polys), bool) if among is None else np.isin(cur, among)   # caras que pueden cambiar
    ins = cand & (f(cen) > 0)
    me.polygons.foreach_set('material_index', np.where(ins, inside, np.where(cand, outside, cur)).astype(np.int32))
    touch_in = np.zeros(nv, bool)
    touch_out = np.zeros(nv, bool)
    for pv, i, c in zip(polys, ins, cand):
        if i:
            touch_in[pv] = True
        elif c:
            touch_out[pv] = True
    bnd = np.where(touch_in & touch_out)[0]
    no = np.empty(nv * 3, np.float32)
    me.vertices.foreach_get('normal', no)
    no = no.reshape(-1, 3).astype(np.float64)[bnd]
    p = co[bnd].copy()
    e = 0.002
    for _ in range(iters):
        g = np.stack([(f(p + np.eye(3)[k] * e) - f(p - np.eye(3)[k] * e)) / (2 * e) for k in range(3)], 1)
        g -= no * (g * no).sum(1)[:, None]                # solo a lo largo de la superficie
        g2 = (g * g).sum(1) + 1e-9
        step = -(f(p) / g2)[:, None] * g
        ln = np.linalg.norm(step, axis=1)[:, None]
        p += step * np.minimum(1, 0.012 / (ln + 1e-9))
    co[bnd] = p
    me.vertices.foreach_set('co', co.astype(np.float32).ravel())
    me.update()


def paint_faces(ob, fn):
    """fn(centro, normal) → índice de ranura, por cara."""
    me = ob.data
    n = len(me.polygons)
    c = np.empty(n * 3, np.float32)
    no = np.empty(n * 3, np.float32)
    me.polygons.foreach_get('center', c)
    me.polygons.foreach_get('normal', no)
    idx = fn(c.reshape(-1, 3).astype(np.float64), no.reshape(-1, 3).astype(np.float64))
    me.polygons.foreach_set('material_index', np.asarray(idx, np.int32))


def smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


# ---------------------------------------------------------------- primitivas
def blade(name, root, tip, bend, width, thick, n=12, up=V((0, 0, 1)), fat=1.0, seg=10):
    """Mechón puntiagudo de estilo anime: grueso en la raíz y afilado en la punta."""
    root, tip, bend = V(root), V(tip), V(bend)
    pts = A.bezier(root, root + (tip - root) * 0.35 + bend, root + (tip - root) * 0.72 + bend * 0.7, tip, n)
    u = np.linspace(0, 1, n)
    w = width * (0.55 + 0.45 * ss(0, 0.28, u)) * (1 - u) ** (0.9 * fat)
    w[-1] = 0.002
    th = thick * (1 - u) ** 0.75 + 0.002
    ob, uu, aa = A.loft(name, pts, list(w), list(th), up=up, seg=seg, profile='vane')
    return smooth(ob), uu


def leaf(name, root, tip, bend, width, thick, normal, n=14, seg=10, belly=0.45):
    """Mechón plano y ancho en forma de llama: el plano de la hoja contiene la espina y es
    perpendicular a `normal`. belly: dónde está el ancho máximo (0–1)."""
    root, tip, bend = V(root), V(tip), V(bend)
    pts = A.bezier(root, root + (tip - root) * 0.35 + bend, root + (tip - root) * 0.72 + bend * 0.7, tip, n)
    u = np.linspace(0, 1, n)
    w = width * np.where(u < belly, 0.55 + 0.45 * np.sin(u / belly * math.pi / 2),
                         np.cos((u - belly) / (1 - belly) * math.pi / 2) ** 1.25)
    w[-1] = 0.002
    th = 1.7 * thick * (1 - 0.6 * u) ** 0.8 + 0.003           # volumen: almohadilla, no lámina
    # loft pone el ancho en t × up: con up = normal, la hoja queda en el plano perpendicular a ella
    ob, uu, aa = A.loft(name, pts, list(w), list(th), up=V(normal).normalized(), seg=max(seg, 12), profile='ellipse')
    return smooth(ob), uu


def eyeball(name, center, normal, r):
    """Ojo grande: lente abombada con anillo, iris oscuro, pupila y brillos."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1.0)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = A.link(bpy.data.objects.new(name, me))
    z = V(normal).normalized()
    x = V((0, 0, 1)).cross(z).normalized()
    y = z.cross(x).normalized()                       # hacia arriba en el ojo
    rot = Matrix((x, y, z)).transposed()
    ob.matrix_world = Matrix.Translation(center) @ rot.to_4x4() @ Matrix.Diagonal((r, r * 1.08, r * 0.5, 1))
    give(ob, ['falcopama_ojo_anillo', 'falcopama_ojo_iris', 'falcopama_ojo_pupila', OSCURO])

    def fn(c, no):
        rho = np.hypot(c[:, 0], c[:, 1])
        front = c[:, 2] > 0
        out = np.full(len(c), 3)
        out[front & (rho < 0.86)] = 0
        out[front & (rho < 0.66)] = 1
        out[front & (rho < 0.30)] = 2
        return out
    paint_faces(ob, fn)
    smooth(ob)
    bpy.context.view_layer.objects.active = ob
    with bpy.context.temp_override(object=ob, active_object=ob, selected_editable_objects=[ob]):
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    glints = []
    for k, (gx, gy, gr) in enumerate(((-0.28, 0.30, 0.17), (0.25, -0.22, 0.08))):
        g = bpy.data.meshes.new(f'{name}_brillo{k}')
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=6, radius=1.0)
        bm.to_mesh(g)
        bm.free()
        go = A.link(bpy.data.objects.new(g.name, g))
        p = V((gx, gy, 0.47))
        go.matrix_world = (Matrix.Translation(center) @ rot.to_4x4() @ Matrix.Diagonal((r, r, r * 0.5, 1))
                           @ Matrix.Translation(p) @ Matrix.Diagonal((gr, gr, gr * 0.35, 1)))
        give(go, ['falcopama_ojo_brillo'])
        smooth(go)
        glints.append(go)
    return [ob] + glints, (x, y, z)


def tube(name, pts, r, seg=10, closed=False):
    pts = [V(p) for p in pts]
    if closed:
        pts = pts + [pts[0], pts[1]]
    ob, _, _ = A.loft(name, pts, [r] * len(pts), [r] * len(pts), seg=seg)
    return smooth(ob)


def ring(name, center, normal, rx, ry, r, n=32):
    z = V(normal).normalized()
    x = z.cross(V((0, 0, 1)))
    x = (x if x.length > 1e-4 else V((1, 0, 0))).normalized()
    y = z.cross(x)
    pts = [V(center) + x * (rx * math.cos(2 * math.pi * k / n)) + y * (ry * math.sin(2 * math.pi * k / n))
           for k in range(n)]
    return tube(name, pts, r, closed=True)


# ================================================================ CABEZA
def build_head():
    m = A.Meta('cabeza_masa', res=0.02)
    m.ell(hp(0, 0.02, 0.0), 0.37, 0.40, 0.34)              # cráneo
    m.ell(hp(0, -0.14, 0.06), 0.30, 0.28, 0.26)            # frente
    m.ell(hp(0, 0.16, -0.02), 0.30, 0.28, 0.30)            # nuca
    for s in (1, -1):
        m.ell(hp(0.17 * s, -0.16, -0.12), 0.19, 0.21, 0.17)  # mejillas
        m.ell(hp(0.20 * s, -0.22, 0.11), 0.14, 0.13, 0.075)  # ceja pesada
    m.ell(hp(0, -0.30, -0.08), 0.13, 0.12, 0.12)           # base del pico
    head = m.mesh('cabeza', 0.012)
    A.laplace(head, 3, 0.5)
    smooth(head)
    give(head, [CREMA, TEAL, OSCURO])

    def mask(c):
        # antifaz: banda alrededor del ojo que baja hacia la nuca, con borde en zigzag
        p = c - np.array(H)
        ax = np.abs(p[:, 0])
        phi = np.degrees(np.arctan2(ax, -p[:, 1]))          # 0 frente, 90 lado, 180 nuca
        z = p[:, 2]
        top = 0.13 + 0.03 * np.sin(np.radians(phi) * 9) - 0.10 * ss(120, 175, phi)
        bot = -0.07 - 0.20 * ss(55, 150, phi) + 0.025 * np.sin(np.radians(phi) * 11)
        return np.minimum(np.minimum(top - z, z - bot), (phi - 19) * 0.006)
    split_regions(head, mask, 1, 0)
    objs = [head]

    # ojos y párpado superior oscuro
    for s, sd in ((1, 'L'), (-1, 'R')):
        n = V((0.62 * s, -0.76, 0.06)).normalized()
        c = hp(0.215 * s, -0.235, 0.0)
        eye, (ex, ey, ez) = eyeball(f'ojo_{sd}', c, n, 0.13)
        objs += eye
        arc = []
        for k in range(15):
            t = k / 14
            th = math.radians(190 - 180 * t)                 # de delante a atrás por arriba
            rr = 0.122 - 0.013 * math.sin(math.pi * t)       # cae sobre el ojo: mirada decidida
            arc.append(c + ex * (rr * math.cos(th)) * s + ey * (rr * math.sin(th) * 1.0) + ez * (0.05 - 0.025 * t))
        tail = arc[-1] + (arc[-1] - arc[-3]).normalized() * 0.07 + V((0, 0.03, 0.025))
        arc.append(tail)
        u = np.linspace(0, 1, len(arc))
        w = 0.012 + 0.03 * np.sin(np.pi * np.clip(u * 1.05, 0, 1)) ** 0.7
        w[-1] = 0.003
        lid, _, _ = A.loft(f'parpado_{sd}', arc, list(w), list(w * 0.7), up=ez, seg=8)
        give(smooth(lid), [OSCURO])
        objs.append(lid)

    # corona: hojas crema anchas y planas que barren hacia arriba y atrás (de delante a la nuca)
    # v2: melena barrida hacia atrás (lámina), no corona de puntas hacia arriba
    crown = [(0.00, -0.14, 0.27, 0.62, 0.26, 0.15), (0.12, -0.08, 0.25, 0.60, 0.20, 0.14),
             (-0.12, -0.08, 0.25, 0.60, 0.20, 0.14), (0.22, 0.02, 0.17, 0.52, 0.10, 0.12),
             (-0.22, 0.02, 0.17, 0.52, 0.10, 0.12), (0.05, 0.10, 0.26, 0.55, 0.14, 0.125),
             (-0.05, 0.10, 0.26, 0.55, 0.14, 0.125)]
    for i, (x, y, z, dy, dz, w) in enumerate(crown):
        root = hp(x, y, z)
        tip = hp(x * 1.7, y + dy, z + dz)
        nrm = V((1, 0, -x * 1.5)) if x >= 0 else V((-1, 0, x * 1.5))
        b, _ = leaf(f'corona_{i}', root, tip, V((0, -0.04, 0.08)), w, 0.035, nrm, belly=0.35)
        objs.append(give(b, [CREMA]))
    # el antifaz termina detrás en puntas teal planas pegadas al costado
    for s, sd in ((1, 'L'), (-1, 'R')):
        for k, (dz, ln, w) in enumerate(((0.07, 0.40, 0.085), (-0.05, 0.36, 0.08), (-0.16, 0.26, 0.065))):
            root = hp(0.22 * s, 0.06, dz)
            tip = hp((0.36 + 0.03 * k) * s, 0.06 + ln, dz + 0.12 - 0.06 * k)
            b, _ = leaf(f'antifaz_{sd}{k}', root, tip, V((0.03 * s, 0, 0.02)), w, 0.03, V((s, 0, 0.25)), belly=0.3)
            objs.append(give(b, [TEAL]))
    # mejillas y barbilla: hojas crema hacia abajo y atrás
    for s, sd in ((1, 'L'), (-1, 'R')):
        for k in range(3):
            root = hp((0.15 + 0.06 * k) * s, -0.18 + 0.11 * k, -0.17 + 0.01 * k)
            tip = root + V((0.08 * s, 0.12 + 0.05 * k, -0.17))
            b, _ = leaf(f'mejilla_{sd}{k}', root, tip, V((0.02 * s, 0, 0)), 0.065, 0.025, V((s, -0.3, 0)), belly=0.3)
            objs.append(give(b, [CREMA]))
    b, _ = leaf('barbilla', hp(0, -0.25, -0.20), hp(0, -0.17, -0.38), V((0, 0.02, 0)), 0.08, 0.03, V((0, -1, 0)), belly=0.3)
    objs.append(give(b, [CREMA]))

    # pico ganchudo corto y alto, con anillo dorado en la base
    base = hp(0, -0.36, -0.07)
    pts = A.bezier(base, base + V((0, -0.14, 0.05)), base + V((0, -0.27, 0.02)), base + V((0, -0.25, -0.17)), 16)
    u = np.linspace(0, 1, 16)
    w = 0.105 * (1 - u) ** 0.85 + 0.016 * np.sqrt(1 - u) + 0.001
    th = 0.12 * (1 - u) ** 0.7 + 0.016 * np.sqrt(1 - u) + 0.001
    beak, _, _ = A.loft('pico', pts, list(w), list(th), seg=16)
    objs.append(give(smooth(beak), [PICO]))
    jb = hp(0, -0.35, -0.15)
    pts2 = A.bezier(jb, jb + V((0, -0.10, -0.01)), jb + V((0, -0.17, -0.02)), jb + V((0, -0.17, -0.03)), 10)
    u2 = np.linspace(0, 1, 10)
    jaw, _, _ = A.loft('mandibula', pts2, list(0.085 * (1 - u2) ** 0.6 + 0.015), list(0.045 * (1 - u2) ** 0.6 + 0.01), seg=12)
    objs.append(give(smooth(jaw), [PICO]))
    objs.append(give(ring('bozal', hp(0, -0.37, -0.09), V((0, -1, 0.15)), 0.11, 0.125, 0.016), [ORO]))
    for s, sd in ((1, 'L'), (-1, 'R')):
        objs.append(give(ring(f'argolla_{sd}', hp(0.11 * s, -0.36, -0.07), V((s, -0.2, 0)), 0.03, 0.03, 0.009), [ORO]))
    for o in objs:
        o['pieza'] = 'cabeza'
    return objs



def paint_u(ob, uu, fn):
    """Región por cara según u medio (0 raíz → 1 punta) de un loft: fn(u) → índice."""
    me = ob.data
    idx = [fn(float(np.mean([uu[v] for v in p.vertices]))) for p in me.polygons]
    me.polygons.foreach_set('material_index', np.asarray(idx, np.int32))


def bvh(ob):
    from mathutils.bvhtree import BVHTree
    return BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())


def surface(tree, origin, direction):
    hit = tree.ray_cast(V(origin), V(direction).normalized())
    return (hit[0], hit[1]) if hit[0] is not None else (None, None)


# ================================================================ CUERPO (huevo, plumón y patas)
def build_body():
    m = A.Meta('cuerpo_masa', res=0.025)
    m.ell(B, 0.48, 0.50, 0.48)                                   # huevo redondo, casi erguido
    m.ell(B + V((0, -0.26, 0.14)), 0.36, 0.30, 0.40)             # pecho alto que recibe la cabeza
    m.ell(B + V((0, 0.26, -0.04)), 0.34, 0.28, 0.34)             # grupa corta
    for s in (1, -1):
        m.ell(B + V((0.26 * s, -0.04, -0.20)), 0.26, 0.34, 0.28)  # flancos mullidos
    body = m.mesh('cuerpo', 0.016)
    A.laplace(body, 3, 0.5)
    smooth(body)
    give(body, [CREMA, TEAL])

    def back(c):                                                 # dorso teal con borde en zigzag
        p = c - np.array(B)
        ang = np.arctan2(p[:, 0], p[:, 1])
        line = 0.16 - 0.10 * ss(0.0, 0.5, p[:, 1]) + 0.03 * np.sin(ang * 14)
        return p[:, 2] - line

    def stripe(c):                                               # franja central del pecho
        p = c - np.array(B)
        w = 0.12 + 0.03 * np.sin(p[:, 2] * 40)
        return np.minimum(w - np.abs(p[:, 0]), (-0.15 - p[:, 1]) * 2)
    def bib(c):                                                  # babero crema bajo la cabeza
        p = c - np.array(B)
        return (-p[:, 1] - 0.12) + 0.035 * np.sin(np.arctan2(p[:, 0], p[:, 2] + 0.3) * 12) - 0.25 * np.abs(p[:, 0])
    split_regions(body, bib, 0, 1)
    objs = [body]
    tree = bvh(body)
    # plumón: hojas crema planas pegadas al flanco, que caen hacia abajo y atrás, en tres filas
    for r, (dz, n, ln, w) in enumerate(((0.02, 8, 0.30, 0.11), (-0.14, 9, 0.33, 0.12), (-0.30, 7, 0.28, 0.11))):
        for i in range(n):
            th = math.radians(35 + (290 / (n - 1)) * i + 9 * r)
            d = V((math.sin(th), math.cos(th), 0))
            p, nr = surface(tree, B + V((0, 0, dz)) + d * 1.5, -d)
            if p is None:
                continue
            down = (V((0, 0.35, -1)) + nr * 0.35).normalized()
            root = p - nr * 0.03 + V((0, 0, 0.04))
            tip = p + down * ln + nr * 0.05
            b, _ = leaf(f'plumon_{r}_{i}', root, tip, nr * 0.04, w, 0.025, nr, belly=0.35)
            objs.append(give(b, [CREMA if abs(th - math.pi) < math.radians(75) else TEAL]))
    for o in objs:
        o['pieza'] = 'cuerpo'
    return objs


def build_legs(body):
    objs = []
    for s, sd in ((1, 'L'), (-1, 'R')):
        top, ank = V((0.24 * s, -0.04, 0.56)), V((0.26 * s, -0.10, 0.12))
        pts = A.bezier(top, top + V((0, -0.04, -0.13)), ank + V((0, 0.02, 0.10)), ank, 10)
        u = np.linspace(0, 1, 10)
        r = list(0.12 - 0.025 * u)
        tars, _, _ = A.loft(f'tarso_{sd}', pts, r, r, seg=12)
        objs.append(give(smooth(tars), [PICO]))
        # dedos: tres delante y uno atrás, gruesos, con garras marfil grandes
        for k, (ang, ln) in enumerate(((-32, 0.17), (0, 0.19), (32, 0.17), (180, 0.10))):
            a = math.radians(ang)
            d = V((math.sin(a) * s * (1 if ang != 180 else 0), -math.cos(a), 0))
            base = ank + V((0, 0, -0.04))
            end = base + d * ln + V((0, 0, -0.03))
            toe = A.bezier(base, base + d * ln * 0.4 + V((0, 0, 0.03)), end + V((0, 0, 0.02)), end, 8)
            uu = np.linspace(0, 1, 8)
            rr = list(0.072 - 0.014 * uu)
            t, _, _ = A.loft(f'dedo_{sd}{k}', toe, rr, list(np.array(rr) * 0.85), seg=10)
            objs.append(give(smooth(t), [PICO]))
            cr = end + d * 0.02 + V((0, 0, 0.01))
            # garra ancha y corta: triángulo grueso que se clava hacia delante y abajo
            c, _ = blade(f'garra_{sd}{k}', cr, cr + d * 0.075 + V((0, 0, -0.05)), d * 0.006 + V((0, 0, 0.02)),
                         0.068, 0.055, n=8, up=V((0, 0, 1)), fat=1.35)
            objs.append(give(c, [CREMA]))
        # «pantalón»: hojas crema alrededor de la parte alta del tarso
        for i in range(6):
            a = 2 * math.pi * i / 6
            d = V((math.cos(a), math.sin(a), 0))
            root = top + d * 0.06 + V((0, 0, 0.08))
            tip = top + d * 0.17 + V((0, 0.04, -0.26))
            b, _ = leaf(f'pantalon_{sd}{i}', root, tip, d * 0.03, 0.085, 0.02, d, belly=0.35)
            objs.append(give(b, [TEAL]))
    for o in objs:
        o['pieza'] = 'patas'
    return objs


# ================================================================ ALAS (seis plumas largas en llama)
SHOULDER = V((0.40, -0.12, 1.12))


def build_wings():
    objs = []
    for s, sd in ((1, 'L'), (-1, 'R')):
        sh = V((SHOULDER.x * s, SHOULDER.y, SHOULDER.z))
        for k in range(8):                                    # abanico grande abierto hacia arriba y atrás
            ln = 1.20 + 0.11 * k - 0.016 * k * k          # v2: más largas
            e = math.radians(-4 + 9 * k)                   # v2: suben más
            d = V((0.32 * s, math.cos(e), math.sin(e))).normalized()   # v2: plegadas atrás, no abiertas
            root = sh + V((0.012 * k * s, 0.02 * k, -0.02 * k + 0.06))
            tip = root + d * ln
            nrm = V((s, -0.05, -0.25 + 0.04 * k))
            b, uu = leaf(f'ala_{sd}{k}', root, tip, V((0, 0, 0.05 + 0.01 * k)), 0.24 + 0.005 * k, 0.03, nrm,
                         n=16, belly=0.42)
            give(b, [CREMA, TEAL, PECHO])
            cut = 0.70 if k >= 5 else 2.0                      # las de arriba con punta teal
            # punta clara (pecho_cresta): el brillo mint de la lámina en los extremos
            paint_u(b, uu, lambda u, c=cut: 2 if u > 0.93 else (1 if u > c else 0))
            b['lado'], b['k'] = sd, k
            # el rig lee estos extremos para poner un hueso por pluma (abanico al abrir)
            b['bone_h'], b['bone_t'] = tuple(root), tuple(tip)
            objs.append(b)
        for k in range(4):                                    # cobertoras cortas sobre la raíz
            root = sh + V((0.03 * s, -0.04 + 0.07 * k, 0.10 - 0.02 * k))
            tip = root + V((0.10 * s, 0.30, -0.06 + 0.03 * k))
            b, _ = leaf(f'cobertora_{sd}{k}', root, tip, V((0, 0, 0.03)), 0.085, 0.025, V((s, 0, 0.35)), belly=0.4)
            b['lado'], b['k'] = sd, -1
            objs.append(give(b, [CREMA]))
    for o in objs:
        o['pieza'] = 'alas'
    return objs


# ================================================================ COLA (abanico que sube)
TAIL_ROOT = V((0, 0.66, 1.06))


def build_tail():
    objs = []
    d = V((0, 0.55, 0.84)).normalized()
    top = TAIL_ROOT + d * 0.70
    for i in range(6):                                        # tallo: hojas crema superpuestas
        t = i / 6
        r0 = TAIL_ROOT + d * (0.70 * t)
        for sx in (1, -1):
            b, _ = leaf(f'cola_tallo_{i}{"L" if sx > 0 else "R"}', r0, r0 + d * 0.24 + V((0.07 * sx, 0.03, 0)),
                        V((0.02 * sx, 0, 0)), 0.095, 0.025, V((sx * 0.6, -d.z, d.y)), belly=0.4)
            objs.append(give(b, [CREMA]))
    for i in range(5):                                        # penacho teal en abanico, punta clara
        k = i / 4 - 0.5
        e = math.radians(62 - 40 * k)
        dd = V((k * 0.5, math.cos(e) * 0.9 + 0.3, math.sin(e))).normalized()
        b, uu = leaf(f'cola_penacho_{i}', top - d * 0.04, top + dd * (0.46 - 0.12 * abs(k)), V((0, 0.05, 0)),
                     0.11, 0.025, V((k, -dd.z, dd.y)), belly=0.4)
        give(b, [TEAL, PECHO])
        paint_u(b, uu, lambda u: 1 if u > 0.88 else 0)
        objs.append(b)
    for o in objs:
        o['pieza'] = 'cola'
    return objs


# ================================================================ SILLA, ALFORJA Y RIENDAS
def build_saddle(body):
    tree = bvh(body)
    objs = []
    # manta de cuero que abraza el lomo (rejilla lanzada desde arriba)
    cx, cy, rx, ry, nr_, na = 0.0, 0.10, 0.34, 0.30, 12, 56
    verts, faces = [], []
    for i in range(1, nr_ + 1):
        for j in range(na):
            a = 2 * math.pi * j / na
            rho = i / nr_
            k = max(abs(math.cos(a)) ** 3 + abs(math.sin(a)) ** 3, 1e-6) ** (-1 / 3)   # borde redondeado-cuadrado
            q = (cx + math.cos(a) * rx * rho * k, cy + math.sin(a) * ry * rho * k)
            p, nr = surface(tree, (q[0], q[1], 3.0), (0, 0, -1))
            if p is None:                                      # fuera de la silueta: punto más cercano
                p, nr, _, _ = tree.find_nearest(V((q[0], q[1], B.z)))
            verts.append(p + nr * 0.025)
    c0, _ = surface(tree, (cx, cy, 3.0), (0, 0, -1))
    verts.append(c0 + V((0, 0, 0.025)))
    ci = len(verts) - 1
    for j in range(na):
        faces.append((ci, j, (j + 1) % na))
    for i in range(nr_ - 1):
        for j in range(na):
            a, b = i * na + j, i * na + (j + 1) % na
            faces.append((a, b, b + na, a + na))
    me = bpy.data.meshes.new('silla_manta')
    me.from_pydata([tuple(v) for v in verts], [], faces)
    pad = A.link(bpy.data.objects.new('silla_manta', me))
    sol = pad.modifiers.new('grosor', 'SOLIDIFY')
    sol.thickness, sol.offset = 0.05, 1.0
    A.apply(pad, sol)
    objs.append(give(smooth(pad), [CUERO]))
    # ribete dorado por el borde de la manta
    rim = []
    for j in range(na):
        rim.append(verts[(nr_ - 1) * na + j] + V((0, 0, 0.0)))
    if len(rim) > 8:
        objs.append(give(tube('silla_ribete', rim, 0.02, closed=True), [ORO]))
    top, _ = surface(tree, (0, 0.10, 3.0), (0, 0, -1))
    seat_z = top.z + 0.075
    # asiento acolchado
    m = A.Meta('asiento', res=0.02)
    m.ell((0, 0.08, seat_z - 0.04), 0.24, 0.26, 0.09)
    seat = m.mesh('silla_asiento', 0.014)
    A.laplace(seat, 2, 0.5)
    objs.append(give(smooth(seat), [CUERO]))
    # perilla delantera y borrén trasero: arcos altos de cuero con canto dorado
    back = []                                                  # respaldo: panel de cuero dentro del borrén
    for k in range(17):
        t = math.pi * k / 16
        back.append((-math.cos(t) * 0.19, math.sin(t) * 0.16))
    vs = [V((x, 0.34, seat_z - 0.04 + z)) for x, z in back] + [V((x, 0.34, seat_z - 0.04)) for x, _ in back]
    me2 = bpy.data.meshes.new('silla_respaldo')
    me2.from_pydata([tuple(v) for v in vs], [], [(k, k + 1, 17 + k + 1, 17 + k) for k in range(16)])
    panel = A.link(bpy.data.objects.new('silla_respaldo', me2))
    sol2 = panel.modifiers.new('grosor', 'SOLIDIFY')
    sol2.thickness, sol2.offset = 0.045, 0.0
    A.apply(panel, sol2)
    objs.append(give(smooth(panel), [CUERO]))
    for name, y, hh, w in (('perilla', -0.15, 0.20, 0.15), ('borren', 0.34, 0.17, 0.21)):
        arc = []
        for k in range(17):
            t = math.pi * k / 16
            arc.append(V((-math.cos(t) * w, y + 0.03 * math.sin(t) * (1 if y > 0 else -1), seat_z - 0.04 + math.sin(t) * hh)))
        objs.append(give(tube(f'silla_{name}', arc, 0.035, seg=12), [ORO if name == 'borren' else CUERO]))
        objs.append(give(tube(f'silla_{name}_oro', [p + V((0, -0.012 if y < 0 else 0.012, 0.02)) for p in arc], 0.018), [ORO]))
    # argollas laterales
    for s, sd in ((1, 'L'), (-1, 'R')):
        p, nr = surface(tree, (0.9 * s, 0.10, B.z + 0.10), (-s, 0, 0))
        if p is not None:
            objs.append(give(ring(f'silla_argolla_{sd}', p + nr * 0.05, nr, 0.05, 0.05, 0.012), [ORO]))
    for o in objs:
        o['pieza'] = 'silla'
    return objs, V((0, 0.10, seat_z))


def build_bedroll(seat):
    objs = []
    c = V((0, 0.50, seat.z + 0.04))
    r, half = 0.12, 0.30
    pts = [c + V((x, 0, 0)) for x in np.linspace(-half, half, 12)]
    roll, _, _ = A.loft('alforja', pts, [r] * 12, [r] * 12, seg=24)
    objs.append(give(smooth(roll), ['falcopama_rollo']))
    for s in (1, -1):                                         # espiral en cada extremo
        sp = []
        for k in range(60):
            t = k / 59
            a = t * 2.6 * 2 * math.pi
            rr = 0.012 + t * (r - 0.02)
            sp.append(c + V((s * (half + 0.004), rr * math.cos(a), rr * math.sin(a))))
        objs.append(give(tube(f'alforja_espiral_{"L" if s > 0 else "R"}', sp, 0.006, seg=6), [CUERO]))
    for x in (-0.17, 0.17):                                   # correas
        objs.append(give(ring(f'alforja_correa_{x:+.0f}', c + V((x, 0, 0)), V((1, 0, 0)), r + 0.008, r + 0.008, 0.012), [CUERO]))
    loop = [c + V((0.17, 0.03 * math.sin(a), -r * math.cos(a / 2) ** 0 - 0.22 * (0.5 - 0.5 * math.cos(a)))) for a in np.linspace(0, 2 * math.pi, 20)]
    objs.append(give(tube('alforja_lazo', loop, 0.01, seg=6, closed=True), [CUERO]))
    for o in objs:
        o['pieza'] = 'alforja'
    return objs


def build_reins(seat):
    objs = []
    for s, sd in ((1, 'L'), (-1, 'R')):
        a = hp(0.11 * s, -0.36, -0.07)
        b = V((0.14 * s, -0.14, seat.z + 0.02))
        pts = A.bezier(a, a + V((0.10 * s, 0.10, -0.12)), b + V((0.10 * s, -0.10, -0.15)), b, 14)
        objs.append(give(tube(f'rienda_{sd}', pts, 0.011, seg=6), [CUERO]))
    for o in objs:
        o['pieza'] = 'riendas'
    return objs


# ================================================================ render por pieza
def render_views(objs, tag, views):
    import render_lamina as RL
    sc = bpy.context.scene
    RL.setup(human=False)
    w = sc.world.node_tree.nodes
    next(n for n in w if n.type == 'BACKGROUND').inputs['Color'].default_value = RL._hexl('#22262e')
    floor = next(o for o in sc.objects if o.type == 'MESH' and o.name.startswith('Plane'))
    floor.hide_render = True
    sc.render.film_transparent = False
    sc.render.resolution_x = sc.render.resolution_y = 700
    lo = V((min(v[i] for o in objs for v in (o.matrix_world @ p.co for p in o.data.vertices)) for i in range(3)))
    hi = V((max(v[i] for o in objs for v in (o.matrix_world @ p.co for p in o.data.vertices)) for i in range(3)))
    tgt = (lo + hi) / 2
    size = (hi - lo).length
    cd = bpy.data.cameras.new('cam')
    cd.lens = 60
    cam = bpy.data.objects.new('cam', cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    paths = []
    for name, d in views.items():
        d = V(d).normalized()
        cam.location = tgt + d * size * 1.9
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(WORK, f'{tag}_{name}.png')
        bpy.ops.render.render(write_still=True)
        paths.append(sc.render.filepath)
    print('RENDERS', paths)


VIEWS = {'a': (-0.75, -1, 0.25), 'b': (-1, 0, 0.1), 'c': (0.6, 1, 0.35)}
VIEWS_TODO = {'frontal': (0, -1, 0.12), 'tres_cuartos': (-0.8, -0.9, 0.3), 'lateral': (-1, 0, 0.08),
              'trasera_34': (-0.7, 0.9, 0.35), 'trasera': (0, 1, 0.2)}


def main():
    A.reset()
    mats_init()
    built = {}
    want = lambda *k: PIEZA == 'todo' or PIEZA in k      # noqa: E731
    if want('cabeza'):
        built['cabeza'] = build_head()
    body = None
    if want('cuerpo', 'silla', 'alforja', 'riendas'):
        built['cuerpo'] = build_body()
        body = built['cuerpo'][0]
    if want('cuerpo'):
        built['patas'] = build_legs(body)
    if want('alas'):
        built['alas'] = build_wings()
    if want('cola'):
        built['cola'] = build_tail()
    seat = None
    if want('silla', 'alforja', 'riendas'):
        built['silla'], seat = build_saddle(body)
    if want('alforja'):
        built['alforja'] = build_bedroll(seat)
    if want('riendas'):
        built['riendas'] = build_reins(seat)
    show = [o for k, v in built.items() for o in v
            if PIEZA == 'todo' or k == PIEZA or (PIEZA == 'cuerpo' and k == 'patas')]
    for o in [o for v in built.values() for o in v]:
        if o not in show:
            o.hide_render = True
    print('PIEZAS', {k: (len(v), sum(A.tris(o) for o in v)) for k, v in built.items()})
    allo = [o for v in built.values() for o in v]
    hi = max((o.matrix_world @ v.co).z for o in allo for v in o.data.vertices)
    print('ALTURA', round(hi, 3), 'SILLA', seat)
    if VARIANTE == PALETA['base']:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, f'falcopama_{PIEZA}.blend'))
    if RENDER:
        tag = f'pieza_{PIEZA}' + ('' if VARIANTE == PALETA['base'] else f'_{VARIANTE}')
        render_views(show, tag, VIEWS_TODO if PIEZA == 'todo' else VIEWS)


if __name__ == '__main__':
    main()
