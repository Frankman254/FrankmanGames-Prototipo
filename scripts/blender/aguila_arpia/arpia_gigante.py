# Águila arpía gigante montable, estilo anime. Diseño propio (MOD-01, Claude, 2026-11-17).
# Anatomía de la especie real (Harpia harpyja): doble cresta gris, disco facial, banda
# pectoral negra, vientre blanco, "pantalones" barrados, tarsos amarillos muy gruesos,
# garras enormes, dorso pizarra y cola con bandas. Nada de otra obra.
#
# Orden: arpia_gigante.py (esculpido) → bake_juego.py (versión de juego) → rig_arpia.py (rig,
# clips y assets/models/aguila_arpia.glb) → ../validar_aguila_arpia.py.
# Blender -b --factory-startup --python arpia_gigante.py -- [--render] [--out DIR]
# Frente −Y, +Z arriba, apoyo en z = 0. Unidades en metros.
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Euler, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
# trabajo y evidencias fuera del repo (work/ está ignorado); --out cambia el destino
WORK = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'work', 'claude-mod01'))
OUT = ARGS[ARGS.index('--out') + 1] if '--out' in ARGS else WORK
RENDER = '--render' in ARGS
os.makedirs(OUT, exist_ok=True)
V = Vector
R = math.radians


# ================================================================ utilidades
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def lin(h):
    h = h.lstrip('#')
    s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return np.array([c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in s] + [1.0])


def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    t = np.asarray(t)[..., None]
    return a * (1 - t) + b * t


def arrays(me):
    n = len(me.vertices)
    co = np.empty(n * 3, np.float32)
    no = np.empty(n * 3, np.float32)
    me.vertices.foreach_get('co', co)
    me.vertices.foreach_get('normal', no)
    return co.reshape(-1, 3).astype(np.float64), no.reshape(-1, 3).astype(np.float64)


def set_co(me, co):
    me.vertices.foreach_set('co', co.astype(np.float32).ravel())
    me.update()


def set_col(me, col):
    col = np.asarray(col, np.float32).copy()
    col[:, 3] = 1
    me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT').data.foreach_set('color', col.ravel())


def smooth_shade(ob):
    ob.data.shade_smooth() if hasattr(ob.data, 'shade_smooth') else None
    for p in ob.data.polygons:
        p.use_smooth = True


def laplace(ob, iters=2, f=0.5):
    """Suavizado de pincel 'Smooth' aplicado a toda la malla."""
    m = ob.modifiers.new('suave', 'SMOOTH')
    m.iterations, m.factor = iters, f
    apply(ob, m)


def apply(ob, mod):
    bpy.context.view_layer.objects.active = ob
    with bpy.context.temp_override(object=ob, active_object=ob):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


# ================================================================ masas (metabolas → vóxel)
class Meta:
    def __init__(self, name, res=0.02):
        self.mb = bpy.data.metaballs.new(name)
        self.mb.resolution = self.mb.render_resolution = res
        self.mb.threshold = 0.6
        self.obj = link(bpy.data.objects.new(name, self.mb))

    def el(self, kind, c, r, size=None, rot=(0, 0, 0), stiff=2.0, neg=False):
        e = self.mb.elements.new(type=kind)
        e.co, e.radius, e.stiffness, e.use_negative = V(c), r, stiff, neg
        if size:
            e.size_x, e.size_y, e.size_z = size
        e.rotation = Euler(rot).to_quaternion()
        return e

    def ball(self, c, r, **k):
        return self.el('BALL', c, r, **k)

    def ell(self, c, rx, ry, rz, rot=(0, 0, 0), **k):
        # radios reales aproximados: la isosuperficie queda a ~0,84 del radio con umbral 0,6
        return self.el('ELLIPSOID', c, 1.19, size=(rx, ry, rz), rot=rot, **k)

    def cap(self, a, b, r, **k):
        a, b = V(a), V(b)
        d = b - a
        e = self.el('CAPSULE', (a + b) / 2, r * 1.19, **k)
        e.size_x = d.length / 2
        e.rotation = V((1, 0, 0)).rotation_difference(d.normalized())
        return e

    def mesh(self, name, voxel):
        dg = bpy.context.evaluated_depsgraph_get()
        me = bpy.data.meshes.new_from_object(self.obj.evaluated_get(dg))
        me.name = name
        ob = link(bpy.data.objects.new(name, me))
        bpy.data.objects.remove(self.obj)
        me.remesh_voxel_size = voxel
        me.remesh_voxel_adaptivity = 0
        with bpy.context.temp_override(object=ob, active_object=ob):
            bpy.ops.object.voxel_remesh()
        return ob


# ================================================================ lofts (plumas, pico, garras)
def frame(t, up):
    t = t.normalized()
    s = t.cross(up)
    if s.length < 1e-6:
        s = t.cross(V((1, 0, 0)))
    s.normalize()
    n = s.cross(t).normalized()
    return s, n


def loft(name, spine, widths, thicks, up=V((0, 0, 1)), seg=14, profile='ellipse', twist=None):
    """Malla cerrada por secciones a lo largo de una espina. Devuelve el objeto y, por
    vértice, u (0 raíz → 1 punta) y a (ángulo de la sección: lado, dorso, vientre)."""
    spine = [V(p) for p in spine]
    n = len(spine)
    verts, us, angs, faces = [], [], [], []
    ups = up if isinstance(up, list) else [V(up)] * n
    for i, p in enumerate(spine):
        t = (spine[min(i + 1, n - 1)] - spine[max(i - 1, 0)])
        s, nn = frame(t, ups[i])
        if twist:
            q = t.normalized()
            ang = twist[i]
            s, nn = (s * math.cos(ang) + nn * math.sin(ang)), (nn * math.cos(ang) - s * math.sin(ang))
        w, th = widths[i], thicks[i]
        for k in range(seg):
            a = 2 * math.pi * k / seg
            ca, sa = math.cos(a), math.sin(a)
            if profile == 'vane':  # pluma: dorso con raquis y bordes finos
                y = th * sa * (0.35 + 0.65 * (1 - abs(ca)) ** 1.5)
            else:
                y = th * sa
            verts.append(p + s * (w * ca) + nn * y)
            us.append(i / (n - 1))
            angs.append(a)
    for i in range(n - 1):
        for k in range(seg):
            a, b = i * seg + k, i * seg + (k + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    # tapas
    c0 = len(verts)
    verts.append(spine[0]); us.append(0.0); angs.append(0.0)
    c1 = len(verts)
    verts.append(spine[-1]); us.append(1.0); angs.append(0.0)
    for k in range(seg):
        faces.append((c0, (k + 1) % seg, k))
        last = (n - 1) * seg
        faces.append((c1, last + k, last + (k + 1) % seg))
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.validate()
    ob = link(bpy.data.objects.new(name, me))
    return ob, np.array(us), np.array(angs)


def bezier(p0, p1, p2, p3, n):
    p0, p1, p2, p3 = map(np.array, (p0, p1, p2, p3))
    t = np.linspace(0, 1, n)[:, None]
    return list(((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3)


def feather(name, root, tip, bend, width, n=10, thick=0.012, up=V((0, 0, 1)), tip_round=0.35):
    """Pluma: espina curva, ancho máximo hacia el 40 %, punta redondeada (anime)."""
    root, tip, bend = V(root), V(tip), V(bend)
    pts = bezier(root, root + (tip - root) * 0.33 + bend, root + (tip - root) * 0.7 + bend * 0.8, tip, n)
    u = np.linspace(0, 1, n)
    w = width * (np.sin(np.clip(u, 0, 1) * math.pi) ** tip_round) * (0.55 + 0.45 * ss(0, 0.35, u))
    w[0] = width * 0.25
    w[-1] = 0.002
    th = thick * (1 - 0.6 * u)
    return loft(name, pts, list(w), list(th), up=up, seg=10, profile='vane')


# ================================================================ eje y puntos clave
TAIL_ROOT = V((0, 0.92, 1.42))
HEAD_C = V((0, -0.84, 2.42))
FACE = V((0, -1.18, 2.40))


def build_body():
    m = Meta('body_meta')
    # tórax masivo y quilla
    m.ell((0, -0.40, 1.64), 0.86, 0.70, 0.76)
    m.ell((0, -0.02, 1.44), 0.82, 0.70, 0.64)
    m.ell((0, 0.50, 1.50), 0.64, 0.58, 0.50, rot=(R(-12), 0, 0))
    m.ell((0, 0.88, 1.48), 0.34, 0.34, 0.24, rot=(R(-10), 0, 0))
    # cuello corto y grueso que funde la cabeza con los hombros
    m.ell((0, -0.66, 2.06), 0.54, 0.46, 0.46, rot=(R(18), 0, 0))
    # cabeza grande
    m.ell(tuple(HEAD_C), 0.42, 0.42, 0.40)
    m.ell((0, -0.70, 2.56), 0.34, 0.36, 0.26)                       # nuca alta (base de la cresta)
    m.ell((0, -1.05, 2.40), 0.36, 0.20, 0.33)                       # disco facial
    for s in (-1, 1):
        m.ell((0.20 * s, -1.10, 2.60), 0.17, 0.13, 0.085, rot=(R(-8), R(14 * s), 0))  # ceja fiera
        m.ell((0.29 * s, -1.02, 2.40), 0.10, 0.10, 0.12)            # pómulo
    # muslos emplumados
    for s in (-1, 1):
        m.ell((0.40 * s, -0.12, 1.04), 0.34, 0.38, 0.46, rot=(R(12), 0, R(-6 * s)))
        m.ell((0.41 * s, -0.18, 0.66), 0.27, 0.28, 0.24)
    ob = m.mesh('body', 0.010)
    laplace(ob, 3, 0.5)
    return ob


def build_legs():
    m = Meta('legs_meta', res=0.012)
    for s in (-1, 1):
        x = 0.41 * s
        m.cap((x, -0.20, 0.66), (x * 1.03, -0.30, 0.16), 0.15)
        foot = V((x * 1.03, -0.33, 0.085))
        m.ball(foot, 0.155 * 1.19)
        for ang in (-28, 0, 26):
            d = V((math.sin(R(ang)) * s, -math.cos(R(ang)), 0))
            m.cap(foot, foot + d * 0.30 + V((0, 0, -0.025)), 0.068)
            m.ball(foot + d * 0.16, 0.07 * 1.19)                     # nudillo
        m.cap(foot, foot + V((0, 0.24, -0.025)), 0.068)
    ob = m.mesh('legs', 0.008)
    laplace(ob, 2, 0.5)
    return ob


# ================================================================ relieve de plumas
def scallop_field(u, v, s, w):
    """Escamas de plumas con borde festoneado. u crece hacia la punta de la pluma."""
    row0 = np.floor(u / s)
    c = (v / w + 0.5 * (row0 % 2)) % 1.0
    ue = u + s * 0.42 * (2 * c - 1) ** 2                              # borde curvo
    row = np.floor(ue / s)
    c = (v / w + 0.5 * (row % 2)) % 1.0
    f = ue / s - row
    lobe = np.sqrt(np.clip(1 - (2 * c - 1) ** 2, 0, 1))
    h = ss(0.0, 0.9, f) * (1 - ss(0.9, 1.0, f)) * (0.55 + 0.45 * lobe)
    h -= 0.18 * np.exp(-((c - 0.5) / 0.05) ** 2) * ss(0.2, 0.9, f)    # raquis
    return h, f


def body_relief(ob):
    me = ob.data
    co, no = arrays(me)
    ax = np.array((HEAD_C - TAIL_ROOT).normalized())
    rel = co - np.array(TAIL_ROOT)
    t = rel @ ax
    up = np.array([0, 0, 1.0]) - ax * ax[2]
    up /= np.linalg.norm(up)
    side = np.cross(ax, up)
    rad = rel - np.outer(t, ax)
    theta = np.arctan2(rad @ side, rad @ up)
    radius = np.linalg.norm(rad, axis=1)
    hd = np.linalg.norm(co - np.array(HEAD_C), axis=1)
    head = 1 - ss(0.40, 0.70, hd)
    thigh = (1 - ss(0.95, 1.30, co[:, 2])) * ss(0.14, 0.28, np.abs(co[:, 0]))
    s = 0.13 * (1 - 0.62 * head)
    w = 0.12 * (1 - 0.62 * head)
    h1, f1 = scallop_field(-t, theta * np.maximum(radius, 0.2), s, w)
    # muslos: plumas largas que caen hacia abajo
    ang_t = np.arctan2(co[:, 1] + 0.15, np.abs(co[:, 0]) - 0.40)
    h2, f2 = scallop_field(-co[:, 2], ang_t * 0.28, 0.10, 0.075)
    h = h1 * (1 - thigh) + h2 * thigh
    f = f1 * (1 - thigh) + f2 * thigh
    face = np.clip(1 - np.linalg.norm((co - np.array(FACE)) / np.array([0.36, 0.22, 0.34]), axis=1), 0, 1)
    face_m = ss(0.0, 0.3, face)
    # disco facial: plumas finas radiales alrededor del ojo
    rr = np.linalg.norm((co - np.array(FACE))[:, [0, 2]], axis=1)
    h_face = 0.5 * (np.sin(np.arctan2(co[:, 2] - FACE.z, co[:, 0]) * 26) * 0.5 + 0.5) * ss(0.05, 0.25, rr)
    h = h * (1 - face_m) + h_face * face_m
    amp = 0.016 * (1 - 0.55 * head)
    set_co(me, co + no * (h * amp)[:, None])
    return dict(f=f, head=head, thigh=thigh, face=face_m, theta=theta)


def legs_relief(ob):
    me = ob.data
    co, no = arrays(me)
    x = np.abs(co[:, 0]) - 0.41
    ring = (co[:, 2] / 0.05) % 1.0
    ang = np.arctan2(co[:, 1] + 0.25, x)
    cell = ((ang / 0.6) + 0.5 * np.floor(co[:, 2] / 0.05)) % 1.0
    lobe = np.sqrt(np.clip(1 - (2 * cell - 1) ** 2, 0, 1))
    h = ss(0.0, 0.75, ring) * (1 - ss(0.85, 1.0, ring)) * (0.4 + 0.6 * lobe)
    set_co(me, co + no * (h * 0.007)[:, None])
    return ring


# ================================================================ paleta (especie real, lectura anime)
P = {k: lin(v) for k, v in {
    'cabeza': '#a3aab4', 'disco': '#7f8792', 'cresta': '#353b46', 'cresta_punta': '#1d2027',
    'banda': '#1f2228', 'vientre': '#f4f0e6', 'dorso': '#363c47', 'borde': '#7d8796',
    'barra': '#262930', 'tarso': '#f4b72a', 'tarso_osc': '#c4840f', 'pico': '#22252b',
    'cera': '#4a4f58', 'garra': '#16181c', 'cola_gris': '#8a929e', 'cola_negra': '#1e2127',
    'ala_inf': '#e9e6df',
}.items()}


def paint_body(ob, info):
    co, no = arrays(ob.data)
    info['head'] = info['head'] * ss(2.02, 2.20, co[:, 2])
    f = info['f']
    edge = ss(0.78, 0.97, f)
    col = mix(P['dorso'], P['borde'], edge * 0.55)
    # parte baja y frontal blanca; la banda pectoral negra separa pecho y cuello
    belly = ss(1.70, 1.35, co[:, 2] - 0.55 * np.clip(-co[:, 1] - 0.1, 0, 1)) * ss(0.30, -0.05, co[:, 1] * 0.6 + np.abs(co[:, 0]) * 0.0)
    belly = np.clip(belly + ss(0.2, -0.4, co[:, 1]) * ss(1.95, 1.55, co[:, 2]), 0, 1)
    col = mix(col, P['vientre'], belly)
    dorsal = ss(0.05, 0.45, no[:, 2]) * ss(-0.75, -0.45, co[:, 1]) * ss(1.55, 1.75, co[:, 2])
    col = mix(col, mix(P['dorso'], P['borde'], edge * 0.55), dorsal)
    nape_dark = ss(-0.80, -0.50, co[:, 1]) * ss(1.85, 2.10, co[:, 2]) * ss(0.0, 0.3, no[:, 1])
    col = mix(col, mix(P['dorso'], P['borde'], edge * 0.4), nape_dark)
    front = ss(-0.35, -0.75, co[:, 1])
    band = ss(1.78, 1.88, co[:, 2]) * (1 - ss(2.10, 2.20, co[:, 2])) * ss(-0.45, -0.70, co[:, 1])
    col = mix(col, P['banda'], band)
    # pantalones barrados
    bars = (co[:, 2] / 0.075 + 0.15 * np.sin(info['theta'] * 3)) % 1.0
    barm = ss(0.50, 0.58, bars) * (1 - ss(0.78, 0.86, bars))
    col = mix(col, mix(P['vientre'], P['barra'], barm * 0.9), info['thigh'])
    # cabeza
    headc = mix(np.broadcast_to(P['cabeza'], col.shape), P['disco'], info['face'] * 0.8)
    nape = ss(-0.95, -0.62, co[:, 1]) * ss(2.30, 2.62, co[:, 2])
    headc = mix(headc, P['cresta'], nape)
    col = mix(col, headc, info['head'])
    col[:, :3] *= (1 - 0.16 * (1 - ss(0.0, 0.3, f)))[:, None]
    set_col(ob.data, col)


def paint_legs(ob, ring):
    set_col(ob.data, mix(P['tarso'], P['tarso_osc'], 1 - ss(0.0, 0.2, ring)))


# ================================================================ piezas
def build_beak():
    """Pico ganchudo: sección alta y estrecha, curva hacia abajo en la punta."""
    base = V((0, -1.18, 2.36))
    pts = bezier(base, base + V((0, -0.22, 0.05)), base + V((0, -0.40, 0.02)), base + V((0, -0.36, -0.20)), 16)
    u = np.linspace(0, 1, 16)
    w = 0.10 * (1 - u) ** 0.9 + 0.005
    th = 0.125 * (1 - u) ** 0.7 + 0.006
    ob, uu, aa = loft('beak', pts, list(w), list(th), up=V((0, 0, 1)), seg=18)
    col = mix(P['cera'], P['pico'], ss(0.12, 0.3, uu))
    set_col(ob.data, col)
    # mandíbula inferior
    jb = V((0, -1.17, 2.27))
    pts2 = bezier(jb, jb + V((0, -0.14, -0.01)), jb + V((0, -0.24, -0.02)), jb + V((0, -0.23, -0.03)), 10)
    u2 = np.linspace(0, 1, 10)
    jaw, ju, _ = loft('jaw', pts2, list(0.09 * (1 - u2) ** 0.6 + 0.02), list(0.05 * (1 - u2) ** 0.6 + 0.012), seg=14)
    set_col(jaw.data, mix(P['cera'], P['pico'], ss(0.1, 0.3, ju)))
    return [ob, jaw]


def build_eyes():
    objs = []
    for s in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.088, segments=32, ring_count=16,
                                             location=(0.215 * s, -1.155, 2.47))
        e = bpy.context.object
        e.name = f'eye_{"L" if s > 0 else "R"}'
        # mira al frente y un poco hacia fuera
        e.rotation_euler = (R(90), 0, R(-18 * s))
        e.scale = (1, 1, 0.9)
        objs.append(e)
    return objs


def eye_material():
    """Ojo anime: iris ámbar con anillo oscuro, pupila grande y dos brillos."""
    m = bpy.data.materials.new('montura_ojo')
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    # en espacio de objeto la esfera mira por +Z local → la distancia radial es length(x, y)
    comb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(sep.outputs['X'], comb.inputs['X'])
    nt.links.new(sep.outputs['Y'], comb.inputs['Y'])
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(comb.outputs[0], ln.inputs[0])
    front = nt.nodes.new('ShaderNodeMath')
    front.operation = 'GREATER_THAN'
    front.inputs[1].default_value = 0.0
    nt.links.new(sep.outputs['Z'], front.inputs[0])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    cr = ramp.color_ramp
    cr.interpolation = 'EASE'
    stops = [(0.0, '#050506'), (0.040, '#0b0b0d'), (0.045, '#5a2a08'), (0.060, '#c76d12'),
             (0.072, '#f2b13a'), (0.080, '#2a1404'), (0.085, '#e8e1d4'), (1.0, '#e8e1d4')]
    cr.elements[0].position, cr.elements[0].color = stops[0][0], lin(stops[0][1])
    cr.elements[1].position, cr.elements[1].color = stops[-1][0], lin(stops[-1][1])
    for p, c in stops[1:-1]:
        e = cr.elements.new(p)
        e.color = lin(c)
    nt.links.new(ln.outputs['Value'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.05
    if 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = 1.0
    # brillos anime pintados (no dependen de la luz)
    em = nt.nodes.new('ShaderNodeMath')
    em.operation = 'LESS_THAN'
    d1 = nt.nodes.new('ShaderNodeVectorMath')
    d1.operation = 'DISTANCE'
    d1.inputs[1].default_value = (0.025, 0.028, 0.08)
    nt.links.new(tc.outputs['Object'], d1.inputs[0])
    nt.links.new(d1.outputs['Value'], em.inputs[0])
    em.inputs[1].default_value = 0.020
    d2 = nt.nodes.new('ShaderNodeVectorMath')
    d2.operation = 'DISTANCE'
    d2.inputs[1].default_value = (-0.022, -0.020, 0.084)
    nt.links.new(tc.outputs['Object'], d2.inputs[0])
    em2 = nt.nodes.new('ShaderNodeMath')
    em2.operation = 'LESS_THAN'
    em2.inputs[1].default_value = 0.010
    nt.links.new(d2.outputs['Value'], em2.inputs[0])
    add = nt.nodes.new('ShaderNodeMath')
    add.operation = 'ADD'
    nt.links.new(em.outputs[0], add.inputs[0])
    nt.links.new(em2.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], bsdf.inputs['Emission Strength'])
    bsdf.inputs['Emission Color'].default_value = (1, 1, 1, 1)
    return m


def build_crest():
    """Doble cresta: dos abanicos de plumas largas que suben hacia atrás, puntas rizadas."""
    objs = []
    for s in (-1, 1):
        for i in range(7):
            k = i / 6
            root = V((0.11 * s + 0.03 * s * k, -0.80 + 0.10 * k, 2.66 - 0.03 * k))
            length = 0.82 - 0.28 * abs(k - 0.3)
            spread = R(-8 + 26 * k)
            d = V((math.sin(R(12 + 30 * k)) * s, 0.75 + 0.35 * k, 0.75 - 0.40 * k)).normalized()
            tip = root + d * length
            bend = V((0.0, 0.04, 0.10 - 0.05 * k))
            ob, u, a = feather(f'crest_{s}_{i}', root, tip, bend, 0.065 - 0.012 * k, n=12, thick=0.016,
                               up=V((s, 0, 0.6)).normalized(), tip_round=0.55)
            set_col(ob.data, mix(P['cresta'], P['cresta_punta'], ss(0.55, 0.9, u)))
            objs.append(ob)
    return objs


def build_wing(s):
    """Ala plegada: masa esculpida de coberteras + capa de primarias y secundarias."""
    m = Meta(f'wing_meta_{s}', res=0.018)
    m.ell((0.62 * s, -0.30, 1.96), 0.28, 0.42, 0.30)                    # muñeca alta, hombro imponente
    m.ell((0.80 * s, 0.02, 1.78), 0.18, 0.78, 0.50, rot=(R(-12), 0, R(-4 * s)))
    m.ell((0.74 * s, 0.66, 1.62), 0.16, 0.66, 0.40, rot=(R(-14), 0, R(-8 * s)))
    mass = m.mesh(f'wing_{"L" if s > 0 else "R"}', 0.010)
    laplace(mass, 3, 0.5)
    co, no = arrays(mass.data)
    u = -(co[:, 1] - 0.9)
    v = (co[:, 2] - 1.2) * 1.0 + (np.abs(co[:, 0]) - 0.55) * 0.5
    h, f = scallop_field(-u, v, 0.11, 0.10)
    set_co(mass.data, co + no * (h * 0.018)[:, None])
    col = mix(P['dorso'], P['borde'], ss(0.78, 0.97, f) * 0.6)
    col[:, :3] *= (1 - 0.18 * (1 - ss(0, 0.3, f)))[:, None]
    set_col(mass.data, col)
    objs = [mass]
    # secundarias y primarias: tiras superpuestas que cruzan la rabadilla hacia atrás
    for i in range(9):
        k = i / 8
        root = V((0.90 * s - 0.06 * s * k, 0.20 + 0.08 * k, 1.70 - 0.08 * k))
        tip = V((0.66 * s - 0.30 * s * k, 1.58 + 0.20 * k, 1.46 - 0.14 * k))
        bend = V((0.07 * s, 0, 0.05))
        ob, uu, aa = feather(f'prim_{s}_{i}', root, tip, bend, 0.21, n=12, thick=0.024,
                             up=V((s, 0, 0.25)).normalized(), tip_round=0.4)
        ob.location.x += 0.004 * s * (8 - i)
        bands = ((uu * 4.0) % 1.0)
        bm = ss(0.55, 0.62, bands) * (1 - ss(0.85, 0.92, bands))
        c = mix(mix(P['dorso'], P['cola_negra'], 0.3 + 0.4 * bm), P['cola_negra'], ss(0.8, 1.0, uu))
        set_col(ob.data, c)
        objs.append(ob)
    return objs


def build_tail():
    """Cola en abanico: 12 rectrices en forma de pala, la central encima, con tres bandas
    negras anchas sobre gris claro y punta clara (rasgo real de la arpía)."""
    objs = []
    n = 12
    for i in range(n):
        k = i / (n - 1) - 0.5
        order = 1 - 2 * abs(k)                                          # 1 centro, 0 bordes
        root = V((k * 0.34, 0.86, 1.46 + 0.03 * order))
        tip = V((k * 1.25, 2.30 - 0.10 * abs(k), 1.06 + 0.05 * order))
        m = 28
        pts = bezier(root, root + (tip - root) * 0.33 + V((0, 0, 0.12)),
                     root + (tip - root) * 0.7 + V((0, 0, 0.08)), tip, m)
        u = np.linspace(0, 1, m)
        w = 0.20 * (0.45 + 0.55 * ss(0.0, 0.55, u)) * (1 - ss(0.86, 1.0, u) ** 2 * 0.55)
        w[0] = 0.06
        w[-1] = 0.07                                                    # punta roma, sin espina
        th = 0.024 * (1 - 0.5 * u)
        tilt = V((k * 0.9, 0.0, 1.0)).normalized()                      # el abanico se abre
        ob, uu, _ = loft(f'tail_{i}', pts, list(w), list(th), up=tilt, seg=10, profile='vane')
        dark = np.zeros_like(uu)
        for c0, c1 in ((0.30, 0.42), (0.55, 0.67), (0.78, 0.89)):
            dark = np.maximum(dark, ss(c0 - 0.02, c0 + 0.02, uu) * (1 - ss(c1 - 0.02, c1 + 0.02, uu)))
        c = mix(P['cola_gris'], P['cola_negra'], dark)
        c = mix(c, P['vientre'], ss(0.93, 0.99, uu) * 0.7)
        set_col(ob.data, c)
        ob.location.z += 0.006 * order                                  # central encima
        objs.append(ob)
    return objs


def build_talons():
    objs = []
    for s in (-1, 1):
        foot = V((0.41 * 1.03 * s, -0.33, 0.085))
        dirs = [V((math.sin(R(a)) * s, -math.cos(R(a)), 0)) for a in (-28, 0, 26)] + [V((0, 1, 0))]
        lens = [0.30, 0.30, 0.30, 0.24]
        for j, (d, L) in enumerate(zip(dirs, lens)):
            base = foot + d * (L + 0.01) + V((0, 0, 0.0))
            big = 1.35 if j == 3 else 1.0                               # garra trasera enorme
            tip = base + d * 0.10 * big + V((0, 0, -0.085 * big))
            pts = bezier(base, base + d * 0.07 * big + V((0, 0, 0.02)), tip + d * 0.03 + V((0, 0, 0.03)), tip, 10)
            u = np.linspace(0, 1, 10)
            ob, uu, _ = loft(f'talon_{s}_{j}', pts, list(0.034 * big * (1 - u) ** 0.9 + 0.002),
                             list(0.040 * big * (1 - u) ** 0.9 + 0.002), seg=12)
            set_col(ob.data, np.broadcast_to(P['garra'], (len(uu), 4)))
            objs.append(ob)
    return objs


def conform_patch(name, target, cx, cy, rx, ry, n=40, lift=0.02, zmax=2.08):
    """Rejilla elíptica proyectada desde arriba sobre la malla: se ciñe al lomo."""
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get()
    tree = BVHTree.FromObject(target, dg)
    verts, faces, idx, rs = [], [], {}, []
    for i in range(n + 1):
        for j in range(n + 1):
            u, v = 2 * i / n - 1, 2 * j / n - 1
            r = math.hypot(u, v)
            if r > 1.0001:
                continue
            x, y = cx + u * rx, cy + v * ry
            hit = tree.ray_cast(V((x, y, 4.0)), V((0, 0, -1)))
            if hit[0] is None or hit[0].z > zmax:
                continue
            idx[i, j] = len(verts)
            verts.append(hit[0] + hit[1] * lift)
            rs.append(r)
    for i in range(n):
        for j in range(n):
            q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
            if all(k in idx for k in q):
                faces.append(tuple(idx[k] for k in q))
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    ob = link(bpy.data.objects.new(name, me))
    return ob, np.array(rs)


def build_saddle():
    """Silla propia: manta turquesa con ribete coral y greca dorada, asiento de cuero."""
    body = bpy.data.objects['body']
    blanket, r = conform_patch('saddle', body, 0, 0.22, 0.56, 0.50, lift=0.015)
    col = mix(lin('#178f8c'), lin('#e8604a'), ss(0.84, 0.87, r))
    col = mix(col, lin('#f2c94c'), ss(0.70, 0.72, r) * (1 - ss(0.76, 0.78, r)))
    set_col(blanket.data, col)
    sol = blanket.modifiers.new('grosor', 'SOLIDIFY')
    sol.thickness = 0.03
    sol.offset = 1
    apply(blanket, sol)
    sub = blanket.modifiers.new('sub', 'SUBSURF')
    sub.levels = 1
    apply(blanket, sub)
    seat, r2 = conform_patch('saddle_seat', body, 0, 0.20, 0.26, 0.30, n=28, lift=0.05)
    seat.data.update()
    for _ in range(1):
        laplace(seat, 12, 0.8)
    co, no = arrays(seat.data)
    bump = (1 - r2 ** 2) * 0.10
    back = ss(0.16, 0.30, co[:, 1] - 0.20) * 0.10           # respaldo bajo
    co[:, 2] += bump + back
    set_co(seat.data, co)
    set_col(seat.data, mix(lin('#7a4322'), lin('#3d1f0e'), ss(0.8, 1.0, r2)))
    sol = seat.modifiers.new('grosor', 'SOLIDIFY')
    sol.thickness = 0.05
    apply(seat, sol)
    sub = seat.modifiers.new('sub', 'SUBSURF')
    sub.levels = 1
    apply(seat, sub)
    return [blanket, seat]


# ================================================================ materiales
def mat_vcol(name, rough=0.6, sheen=0.3, coat=0.0):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    a = nt.nodes.new('ShaderNodeVertexColor')
    a.layer_name = 'Col'
    nt.links.new(a.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    if 'Sheen Weight' in bsdf.inputs:
        bsdf.inputs['Sheen Weight'].default_value = sheen
    if 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = coat
    return m


# ================================================================ escena
def main():
    reset()
    M = {
        'plumaje': mat_vcol('montura_plumaje', 0.62, 0.35),
        'pluma': mat_vcol('montura_plumas', 0.55, 0.25),
        'tarsos': mat_vcol('montura_tarsos', 0.42, 0.0, 0.2),
        'pico': mat_vcol('montura_pico', 0.25, 0.0, 0.6),
        'silla': mat_vcol('montura_silla', 0.7, 0.4),
        'ojo': eye_material(),
    }
    body = build_body()
    paint_body(body, body_relief(body))
    legs = build_legs()
    paint_legs(legs, legs_relief(legs))
    parts = {'body': [body], 'legs': [legs], 'beak': build_beak(), 'eyes': build_eyes(),
             'crest': build_crest(), 'wing_L': build_wing(1), 'wing_R': build_wing(-1),
             'tail': build_tail(), 'talons': build_talons(), 'saddle': build_saddle()}
    use = {'body': 'plumaje', 'legs': 'tarsos', 'beak': 'pico', 'eyes': 'ojo', 'crest': 'pluma',
           'wing_L': 'pluma', 'wing_R': 'pluma', 'tail': 'pluma', 'talons': 'pico', 'saddle': 'silla'}
    total = 0
    for k, obs in parts.items():
        for ob in obs:
            ob.data.materials.clear()
            ob.data.materials.append(M[use[k]])
            smooth_shade(ob)
            total += tris(ob)
        if k == 'wing_L':
            body_mass = obs[0]
            body_mass.data.materials.clear()
            body_mass.data.materials.append(M['plumaje'])
    print('TRIS alta', total)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'arpia_alta.blend'))
    if RENDER:
        import render_lamina
        render_lamina.lamina(OUT, 'v2')


if __name__ == '__main__':
    sys.path.insert(0, HERE)
    main()
