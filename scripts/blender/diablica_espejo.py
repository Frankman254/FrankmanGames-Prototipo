# La Espeja (Diablica de espejo): NPC y jefa de la familia Diablicos Espejos.
# Referencia aprobada por el creador: work/omp-diablica-espejo/v2_paquete/00_referencias/
# ilustracion_completa_original.png (ilustración propia; se sigue en forma, colores y vestuario).
#
#   blender -b --factory-startup --python scripts/blender/diablica_espejo.py
#
# Cuerpo, cara y pelo salen de la base anime de los héroes (`assets/models/oraculo_f_anime.glb`,
# base CC0 registrada en PROCEDENCIA.md); de ella solo se toma la malla y el esqueleto de 16 huesos.
# Los clips se generan aquí (no se heredan los de los héroes): paso corto de bailarina bajo la
# falda, brazos que sujetan el bastón y la falda, giro de evasión, máscara on/off y gestos.
# Vestuario, tocado, bastón y máscara son geometría propia con una paleta de colores por pieza.
#
# Contrato (scripts/blender/validar_diablica_espejo.py): piezas Cuerpo, Pelo, Falda, Tocado,
# Baston y Mascara, un material `heroe_diablica_espejo_<pieza>` por pieza, mira a -Y, pies en z=0.
import math
import os
import random
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

try:
    HERE = os.path.dirname(bpy.path.abspath(__file__))
except NameError:
    HERE = os.path.join(os.getcwd(), 'scripts', 'blender')
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import fg_rig  # noqa: E402  (solo para los gestos comunes: biped_emote_clips y p)

BASE = os.path.join(ROOT, 'assets', 'models', 'oraculo_f_anime.glb')
OUT = os.path.join(ROOT, 'assets', 'models', 'diablica_espejo.glb')
BLEND = os.path.join(ROOT, 'arte', 'blender', 'diablica_espejo.blend')
rnd = random.Random(7)

# ------------------------------------------------------------------ paleta
# nombre: (color sRGB, rugosidad, metal). Los espejos no son metal (el juego no tiene
# mapa de entorno): claros y muy lisos para que el brillo especular los delate.
PALETA = {
    'blusa': ('#f6f3f8', 0.6, 0), 'guante': ('#fdfdfd', 0.55, 0), 'cuello': ('#ffffff', 0.6, 0),
    'rosa': ('#f27fb4', 0.28, 0), 'rosa_osc': ('#e2508f', 0.32, 0), 'rosa_claro': ('#f8b4d2', 0.35, 0),
    'menta': ('#a3e6d2', 0.3, 0), 'menta_osc': ('#6fcbb4', 0.32, 0), 'turquesa': ('#8fe3d6', 0.25, 0),
    'lavanda': ('#c8a2ec', 0.3, 0), 'encaje': ('#ffffff', 0.75, 0),
    'espejo': ('#eef4fb', 0.05, 0), 'espejo_brillo': ('#ffffff', 0.02, 0), 'oro': ('#e8b64a', 0.25, 0),
    'rojo': ('#d8343f', 0.35, 0), 'naranja': ('#f08a2a', 0.35, 0),
    'pom_fucsia': ('#ef2f86', 0.8, 0), 'pom_rosa': ('#f77fb8', 0.8, 0), 'pom_rojo': ('#d61f33', 0.8, 0),
    'pom_azul': ('#2846cc', 0.8, 0), 'pom_amarillo': ('#f6d24a', 0.8, 0), 'pom_crema': ('#f3e2a6', 0.8, 0),
    'pom_magenta': ('#c02a8e', 0.8, 0), 'hoja': ('#3f9a3c', 0.6, 0),
    'cinta_amarilla': ('#f6d23c', 0.3, 0), 'cinta_rosa': ('#f45aa5', 0.3, 0), 'cinta_azul': ('#4f8ff0', 0.3, 0),
    'cinta_lima': ('#b8e04a', 0.3, 0), 'cinta_lavanda': ('#b78be6', 0.3, 0),
    'baston_rosa': ('#f05a9a', 0.3, 0), 'baston_verde': ('#2f9e5a', 0.3, 0), 'baston_blanco': ('#fafafa', 0.3, 0),
    'pelo': ('#7b4a2c', 0.55, 0), 'pelo_osc': ('#5a331d', 0.6, 0),
    'mascara': ('#e0307e', 0.3, 0), 'mascara_osc': ('#9e1d55', 0.35, 0), 'cuerno': ('#c8222f', 0.35, 0),
    'negro': ('#1d1416', 0.5, 0),
}
NOMBRES = list(PALETA)
assert len(NOMBRES) <= 64


def cell_uv(name):
    i = NOMBRES.index(name)
    return ((i % 8 + 0.5) / 8, (i // 8 + 0.5) / 8)


def hex_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def palette_images(px):
    """Color (sRGB) y rugosidad/metal (glTF: G = rugosidad, B = metal) de la paleta, px por lado."""
    col = np.ones((px, px, 4))
    mr = np.ones((px, px, 4))
    c = px // 8
    for i, n in enumerate(NOMBRES):
        hx, rough, metal = PALETA[n]
        y, x = (i // 8) * c, (i % 8) * c
        col[y:y + c, x:x + c, :3] = hex_rgb(hx)
        mr[y:y + c, x:x + c, :3] = (0, rough, metal)
    return col, mr


# ------------------------------------------------------------------ malla propia
class Malla:
    """Geometría con color por cara (celda de paleta) y pesos por vértice."""

    def __init__(self):
        self.v, self.f, self.c, self.w, self.smooth = [], [], [], [], []

    def vert(self, p, w):
        self.v.append(Vector(p))
        self.w.append(w)
        return len(self.v) - 1

    def face(self, idx, color, smooth=True):
        self.f.append(tuple(idx))
        self.c.append(color)
        self.smooth.append(smooth)

    def grid(self, rows, color, weight, closed=True, smooth=True, cap=None):
        """rows: lista de anillos (listas de puntos). color(i, j) o str; weight(p) -> {hueso: w}."""
        ids = [[self.vert(p, weight(p)) for p in row] for row in rows]
        n = len(rows[0])
        for i in range(len(rows) - 1):
            for j in range(n if closed else n - 1):
                k = (j + 1) % n
                col = color(i, j) if callable(color) else color
                self.face((ids[i][j], ids[i][k], ids[i + 1][k], ids[i + 1][j]), col, smooth)
        if cap:
            for end, col in cap:
                ring = ids[0] if end == 0 else ids[-1]
                ctr = sum((self.v[i] for i in ring), Vector()) / len(ring)
                c = self.vert(ctr, weight(ctr))
                for j in range(n):
                    a, b = ring[j], ring[(j + 1) % n]
                    self.face((a, b, c) if end else (b, a, c), col, smooth)
        return ids

    def tube(self, pts, radius, sides, color, weight, cap=True):
        rows = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            a = t.orthogonal().normalized()
            b = t.cross(a)
            r = radius(i / (len(pts) - 1)) if callable(radius) else radius
            rows.append([p + (a * math.cos(2 * math.pi * s / sides) + b * math.sin(2 * math.pi * s / sides)) * r
                         for s in range(sides)])
        c0 = color(0, 0) if callable(color) else color
        return self.grid(rows, color, weight, cap=[(0, c0), (1, c0)] if cap else None)

    def ico(self, center, r, color, weight, spikes=1.25, sub=1, smooth=True):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
        rot = Euler((rnd.uniform(0, 6.3), rnd.uniform(0, 6.3), rnd.uniform(0, 6.3))).to_matrix()
        base = len(self.v)
        w = weight(Vector(center))
        for i, v in enumerate(bm.verts):
            k = spikes if i < 12 else 1.0  # los 12 vértices del icosaedro: pétalos en punta
            self.vert(Vector(center) + rot @ (v.co * r * k), w)
        for f in bm.faces:
            self.face([base + v.index for v in f.verts], color, smooth=smooth)
        bm.free()

    def disc(self, center, normal, r, glass, rim, weight, sides=12, rim_w=0.25):
        n = Vector(normal).normalized()
        a = n.orthogonal().normalized()
        b = n.cross(a)
        ring = lambda rr, lift: [Vector(center) + n * lift + (a * math.cos(2 * math.pi * s / sides) + b * math.sin(2 * math.pi * s / sides)) * rr for s in range(sides)]
        rows = [ring(r * (1 + rim_w), 0.0), ring(r * (1 + rim_w), 0.008), ring(r, 0.010)]
        self.grid(rows, lambda i, j: rim if i < 2 else glass, weight, cap=[(1, glass)])
        # destello: medio disco más claro
        self.grid([ring(r * 0.5, 0.0125)[: sides // 3], ring(r * 0.2, 0.0128)[: sides // 3]], 'espejo_brillo', weight, closed=False)

    def strip(self, pts, width, side, color, weight):
        side = Vector(side).normalized()
        rows = [[p - side * width / 2, p + side * width / 2] for p in pts]
        ids = [[self.vert(p, weight(p)) for p in row] for row in rows]
        for i in range(len(rows) - 1):
            self.face((ids[i][0], ids[i][1], ids[i + 1][1], ids[i + 1][0]), color, smooth=True)

    def object(self, name, arm):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(v) for v in self.v], [], self.f)
        me.update()
        uv = me.uv_layers.new(name='UVMap')
        for poly, col, sm in zip(me.polygons, self.c, self.smooth):
            poly.use_smooth = sm
            for li in poly.loop_indices:
                uv.data[li].uv = cell_uv(col)
        o = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(o)
        groups = {}
        for i, w in enumerate(self.w):
            for bone, val in w.items():
                if bone not in groups:
                    groups[bone] = o.vertex_groups.new(name=bone)
                groups[bone].add([i], val, 'REPLACE')
        bind(o, arm)
        o['tile'] = 'paleta'
        return o


def rigid(bone):
    return lambda p: {bone: 1.0}


def bind(o, arm):
    o.parent = arm
    o.matrix_parent_inverse = arm.matrix_world.inverted()
    if not any(m.type == 'ARMATURE' for m in o.modifiers):
        o.modifiers.new('Huesos', 'ARMATURE').object = arm


# ------------------------------------------------------------------ base
def importar_base():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    bpy.ops.import_scene.gltf(filepath=BASE)
    arm = next(o for o in sc.objects if o.type == 'ARMATURE')
    keep = {'Piel', 'Cara_0', 'Pelo_short', 'Calzado'}
    for o in list(sc.objects):
        if o.type == 'MESH' and o.name not in keep:
            bpy.data.objects.remove(o)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    arm.animation_data_clear()
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    return arm


def world_verts(o):
    return [o.matrix_world @ v.co for v in o.data.vertices]


def dominant(o):
    names = {g.index: g.name for g in o.vertex_groups}
    out = []
    for v in o.data.vertices:
        best = max(v.groups, key=lambda g: g.weight, default=None)
        out.append(names[best.group] if best else '')
    return out


def split_faces(o, pick, name):
    """Saca a un objeto nuevo las caras cuyos vértices cumplen pick(i) (todos)."""
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in o.data.polygons:
        p.select = all(pick(i) for i in p.vertices)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    new = next(x for x in bpy.context.selected_objects if x is not o)
    new.name = name
    return new


def delete_faces(o, pick, any_vert=False):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    test = any if any_vert else all
    dead = [f for f in bm.faces if test(pick(v.index) for v in f.verts)]
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    bm.to_mesh(o.data)
    bm.free()


def push(o, amount):
    """Infla una malla separada a lo largo de sus normales: amount(i, p) en metros."""
    me = o.data
    me.update()
    normals = [v.normal.copy() for v in me.vertices]
    for i, v in enumerate(me.vertices):
        v.co += normals[i] * amount(i, o.matrix_world @ v.co)


def decimar(o, ratio):
    mod = o.modifiers.new('Decimar', 'DECIMATE')
    mod.ratio = ratio
    bpy.context.view_layer.objects.active = o
    for m in [m for m in o.modifiers if m.type == 'ARMATURE']:
        o.modifiers.remove(m)
    bpy.ops.object.modifier_apply(modifier=mod.name)


def recolor_faces(o, color):
    uv = o.data.uv_layers.active
    for p in o.data.polygons:
        for li in p.loop_indices:
            uv.data[li].uv = cell_uv(color)
    o['tile'] = 'paleta'


def bone_pts(arm, name):
    b = arm.data.bones[name]
    return arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local


def perfil(pts, z, dz, center, bins=32):
    """Radio máximo por sector angular (alrededor de center) de los puntos en z ± dz."""
    r = [0.0] * bins
    for p in pts:
        if abs(p.z - z) > dz:
            continue
        d = Vector((p.x - center.x, p.y - center.y))
        k = int(((math.atan2(d.y, d.x) / (2 * math.pi)) % 1) * bins) % bins
        r[k] = max(r[k], d.length)
    m = max(r)
    for _ in range(bins):  # rellena sectores vacíos con los vecinos
        r = [x if x > 0 else max(r[(k - 1) % bins], r[(k + 1) % bins]) for k, x in enumerate(r)]
    r = [x if x > 0 else m for x in r]
    return lambda ang: _interp(r, ang)


def _interp(r, ang):
    n = len(r)
    t = ((ang / (2 * math.pi)) % 1) * n
    i = int(t) % n
    f = t - int(t)
    return r[i] * (1 - f) + r[(i + 1) % n] * f


# ------------------------------------------------------------------ cuerpo
CUELLO_Z = 1.318  # la blusa acaba en la base del cuello (el cuello queda en piel)
BLUSA = {'spine', 'chest', 'upperArmL', 'upperArmR', 'foreArmL', 'foreArmR'}


def vestir_cuerpo(arm):
    piel = bpy.data.objects['Piel']
    pv = world_verts(piel)
    dom = dominant(piel)
    # Piernas y cadera bajo la falda: fuera (no se ven y ahorran triángulos).
    delete_faces(piel, lambda i: 0.34 < pv[i].z < 0.905 and dom[i] in {'hips', 'thighL', 'thighR', 'shinL', 'shinR'})
    pv, dom = world_verts(piel), dominant(piel)
    blusa = split_faces(piel, lambda i: pv[i].z < CUELLO_Z and (dom[i] in BLUSA or (dom[i] == 'hips' and pv[i].z >= 0.88)), 'Blusa')
    # Las manos de la base viven en Calzado (guantes); se sacan y se vuelven blancas.
    cal = bpy.data.objects['Calzado']
    cv, cdom = world_verts(cal), dominant(cal)
    guantes = split_faces(cal, lambda i: cdom[i] in {'handL', 'handR', 'foreArmL', 'foreArmR'}, 'Guantes')

    # Mangas abullonadas: el brazo se infla en el centro del brazo y en el puño.
    bv, bdom = world_verts(blusa), dominant(blusa)
    segs = {n: bone_pts(arm, n) for n in ('upperArmL', 'upperArmR', 'foreArmL', 'foreArmR')}

    def along(name, p):
        a, b = segs[name]
        ab = b - a
        return max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))

    def manga(i, p):
        d = bdom[i]
        if d.startswith('upperArm'):
            t = along(d, p)
            return 0.012 + 0.034 * math.sin(math.pi * min(1, t * 1.15)) ** 0.8
        if d.startswith('foreArm'):
            t = along(d, p)
            return 0.010 + 0.016 * max(0.0, (t - 0.55) / 0.45) ** 1.5
        return 0.007
    push(blusa, manga)
    # La tela cae recta sobre el pecho: rellena el surco central de la malla base.
    bw = [blusa.matrix_world @ v.co for v in blusa.data.vertices]
    for zc in np.arange(1.15, CUELLO_Z, 0.01):
        band = [p for p in bw if abs(p.z - zc) < 0.008 and abs(p.x) < 0.11 and p.y < 0]
        if not band:
            continue
        tip = min(p.y for p in band)
        for v in blusa.data.vertices:
            p = blusa.matrix_world @ v.co
            if abs(p.z - zc) < 0.005 and abs(p.x) < 0.075 and p.y < 0:
                k = (1 - abs(p.x) / 0.075) ** 0.7
                v.co.y = min(v.co.y, v.co.y + (tip + 0.004 - p.y) * k)
    recolor_faces(blusa, 'blusa')
    decimar(guantes, 0.6)  # la mano de la base es muy densa para un NPC de 1,7 m
    push(guantes, lambda i, p: 0.0035)
    recolor_faces(guantes, 'guante')

    cv = world_verts(cal)
    delete_faces(cal, lambda i: cv[i].z > 0.36, any_vert=True)
    decimar(cal, 0.5)  # zapatos: casi siempre bajo la falda

    m = Malla()
    # Cuello de camisa: dos solapas redondeadas sobre la blusa.
    chest_h, _ = bone_pts(arm, 'head')
    neck = perfil(world_verts(blusa), CUELLO_Z - 0.006, 0.006, Vector((0, chest_h.y)))
    rows = []
    for k, (zz, out) in enumerate(((CUELLO_Z + 0.004, 0.002), (CUELLO_Z - 0.006, 0.010), (CUELLO_Z - 0.03, 0.016))):
        row = []
        for s in range(28):
            ang = 2 * math.pi * s / 28
            front = max(0.0, -math.sin(ang)) ** 3  # puntas del cuello hacia delante
            r = neck(ang) + out
            row.append(Vector((math.cos(ang) * r, chest_h.y + math.sin(ang) * r, zz - (0.035 * front if k == 2 else 0))))
        rows.append(row)
    m.grid(rows, 'cuello', rigid('chest'))
    # Pechera: la piel de la base tiene un hueco bajo su ropa; un panel de tela lo cubre.
    bw = world_verts(blusa)
    rows = []
    for zz in np.linspace(1.02, CUELLO_Z - 0.004, 12):
        prof = perfil([p for p in bw if abs(p.y) < 0.2], zz, 0.012, Vector((0, chest_h.y)))
        rows.append([Vector((math.cos(a) * (prof(a) + 0.001), chest_h.y + math.sin(a) * (prof(a) + 0.001), zz))
                     for a in np.linspace(math.radians(205), math.radians(335), 14)])
    m.grid(rows, 'blusa', lambda p: {'chest': 1.0} if p.z > 1.2 else {'chest': (p.z - 1.02) / 0.18, 'spine': 1 - (p.z - 1.02) / 0.18}, closed=False)
    # Volantes (scrunchies): rosa en el codo, menta bajo él y rosa en la muñeca, como la lámina.
    for s in 'LR':
        ua, ub = bone_pts(arm, f'upperArm{s}')
        fa, fb = bone_pts(arm, f'foreArm{s}')
        volante(m, ub.lerp(ua, 0.08), (ub - ua).normalized(), 0.058, 'rosa', {f'upperArm{s}': 0.5, f'foreArm{s}': 0.5})
        volante(m, fa.lerp(fb, 0.35), (fb - fa).normalized(), 0.047, 'menta', {f'foreArm{s}': 1.0}, waves=9)
        volante(m, fa.lerp(fb, 0.93), (fb - fa).normalized(), 0.047, 'rosa_osc', {f'foreArm{s}': 0.7, f'hand{s}': 0.3})
    # Fajín menta con lazo a la espalda.
    hips_h, _ = bone_pts(arm, 'hips')
    bv2 = world_verts(blusa)
    waist = perfil(bv2, 0.95, 0.03, Vector((0, hips_h.y)))
    rows = [[Vector((math.cos(2 * math.pi * s / 36) * (waist(2 * math.pi * s / 36) + o), hips_h.y + math.sin(2 * math.pi * s / 36) * (waist(2 * math.pi * s / 36) + o), z))
             for s in range(36)] for z, o in ((1.02, 0.004), (0.985, 0.012), (0.93, 0.014), (0.9, 0.006))]
    m.grid(rows, 'menta', lambda p: {'hips': 0.6, 'spine': 0.4} if p.z > 0.97 else {'hips': 1.0})
    back = hips_h.y + waist(math.pi / 2) + 0.02
    lazo(m, Vector((0, back, 0.96)), rigid('hips'))
    adorno = m.object('Adorno', arm)
    return [piel, bpy.data.objects['Cara_0'], cal, blusa, guantes, adorno]


def volante(m, c, axis, r, color, w, waves=11):
    a = axis.orthogonal().normalized()
    b = axis.cross(a)
    rows = []
    for k in range(6):
        psi = 2 * math.pi * k / 6
        row = []
        for s in range(30):
            ph = 2 * math.pi * s / 30
            rr = r + 0.016 * math.cos(psi) + 0.008 * math.sin(waves * ph)
            row.append(c + axis * (0.022 * math.sin(psi)) + (a * math.cos(ph) + b * math.sin(ph)) * rr)
        rows.append(row)
    rows.append(rows[0])
    m.grid(rows, color, lambda p: w)


def lazo(m, c, weight):
    for sx in (-1, 1):  # dos lazadas
        pts = []
        for k in range(10):
            t = 2 * math.pi * k / 9
            pts.append(c + Vector((sx * (0.06 + 0.055 * math.cos(t)), 0.02 + 0.01 * math.sin(t), 0.035 * math.sin(t))))
        m.tube(pts, lambda t: 0.018, 6, 'menta_osc', weight)
    for sx in (-1, 1):  # colas
        pts = [c + Vector((sx * (0.01 + 0.05 * t), 0.03 + 0.02 * t, -0.25 * t)) for t in np.linspace(0, 1, 7)]
        m.strip(pts, 0.05, (1, 0, 0), 'menta', weight)
    m.ico(c + Vector((0, 0.02, 0)), 0.025, 'menta_osc', weight, spikes=1.0)


# ------------------------------------------------------------------ falda
WAIST_Z, HEM_Z, HEM_R = 0.985, 0.17, 0.53


def falda(arm, blusa):
    hips_h, _ = bone_pts(arm, 'hips')
    cy = hips_h.y + 0.02
    waist = perfil(world_verts(blusa), 0.95, 0.03, Vector((0, hips_h.y)))
    m = Malla()
    S = 40

    def radius(ang, t, extra=0.0):
        w = waist(ang) + 0.016
        t = min(1.0, max(0.0, t))
        ease = math.sin(t * math.pi / 2) ** 0.75
        r = w + (HEM_R - w) * ease
        r *= 1 + 0.03 * t * math.sin(16 * ang)
        return r + extra

    def pt(ang, z, r):
        return Vector((math.cos(ang) * r, cy + math.sin(ang) * r * 0.94, z))

    hw = lambda p: {'hips': 1.0}
    # Falda rosa satinada.
    rows = []
    for i in range(15):
        t = i / 14
        z = WAIST_Z + (HEM_Z - WAIST_Z) * t
        rows.append([pt(2 * math.pi * s / S, z, radius(2 * math.pi * s / S, t)) for s in range(S)])
    # vivos dorados verticales cada 6 sectores
    m.grid(rows, lambda i, j: 'oro' if j % 6 == 0 and i > 4 else 'rosa', hw)
    # bajo de encaje
    rows = []
    for k, (dz, out) in enumerate(((0.0, 0.0), (-0.025, 0.02), (-0.05, 0.03))):
        rows.append([pt(2 * math.pi * s / S, HEM_Z + dz + (0.008 * math.sin(3 * s) if k == 2 else 0), radius(2 * math.pi * s / S, 1.0, out)) for s in range(S)])
    m.grid(rows, 'encaje', hw)
    # Espejos con aro rojo sobre la falda rosa, en dos hileras al tresbolillo.
    for row, (t, n, off) in enumerate(((0.62, 8, 0.0), (0.88, 10, 0.5))):
        z = WAIST_Z + (HEM_Z - WAIST_Z) * t
        for k in range(n):
            ang = 2 * math.pi * (k + off) / n + 0.1
            p = pt(ang, z, radius(ang, t, 0.004))
            nrm = Vector((math.cos(ang), math.sin(ang), 0.35)).normalized()
            m.disc(p, nrm, 0.045 if row else 0.04, 'espejo', 'rojo', hw, rim_w=0.3)
    # Sobrefalda menta con bajo festoneado, cintas lavanda en diagonal y encaje.
    rows = []
    SO = 56
    for i in range(10):
        t = i / 9
        row = []
        for s in range(SO):
            ang = 2 * math.pi * s / SO
            hem = 0.50 + 0.07 * (0.5 + 0.5 * math.cos(7 * ang))
            z = WAIST_Z + 0.005 + (hem - WAIST_Z - 0.005) * t
            tt = (WAIST_Z - z) / (WAIST_Z - HEM_Z)
            row.append(pt(ang, z, radius(ang, tt, 0.022 + 0.012 * t)))
        rows.append(row)

    def sobre_color(i, j):
        u = (j / SO * 7 + i / 9 * 0.9) % 1.0
        return 'lavanda' if u < 0.16 and i > 0 else 'menta'
    ids = m.grid(rows, sobre_color, hw)
    last = [m.v[k] for k in ids[-1]]
    lace = [last, [p + Vector((p.x, p.y - cy, 0)).normalized() * 0.022 + Vector((0, 0, -0.03 + 0.006 * math.sin(5 * s))) for s, p in enumerate(last)]]
    m.grid(lace, 'encaje', hw)
    # Cuentas naranja y espejitos en la sobrefalda.
    for k in range(7):
        ang = 2 * math.pi * k / 7 + 0.22
        t = 0.45
        z = WAIST_Z + (0.56 - WAIST_Z) * t
        p = pt(ang, z, radius(ang, (WAIST_Z - z) / (WAIST_Z - HEM_Z), 0.04))
        if k % 2:
            m.disc(p, Vector((math.cos(ang), math.sin(ang), 0.3)), 0.03, 'espejo', 'rojo', hw)
        else:
            m.ico(p, 0.014, 'naranja', hw, spikes=1.0)
    return m.object('Falda', arm)


# ------------------------------------------------------------------ pelo
def peinado(arm):
    pelo = bpy.data.objects['Pelo_short']
    pelo.name = 'PeloBase'
    head_h, head_t = bone_pts(arm, 'head')
    pv = world_verts(pelo)
    back = max(p.y for p in pv)
    m = Malla()
    hw = lambda p: {'head': 1.0} if p.z > 1.42 else {'head': max(0.0, (p.z - 1.2) / 0.22), 'chest': 1 - max(0.0, (p.z - 1.2) / 0.22)}
    # Coleta baja: nace en la nuca, cae por la espalda con una curva hacia el hombro izquierdo.
    root = Vector((0.0, back - 0.02, 1.47))
    pts = [root + Vector((0.05 * t * t, 0.025 * math.sin(t * 2.4), -0.46 * t)) for t in np.linspace(0, 1, 11)]
    m.tube(pts, lambda t: 0.03 * (1 - 0.6 * t) + 0.01 * math.sin(t * math.pi), 8,
           lambda i, j: 'pelo_osc' if j % 3 == 0 else 'pelo', hw)
    volante(m, root + Vector((0, 0.005, -0.01)), Vector((0, 0.3, -1)).normalized(), 0.04, 'rosa', {'head': 1.0}, waves=7)
    # Mechones que enmarcan la cara.
    for sx in (-1, 1):
        top = Vector((sx * 0.07, head_h.y - 0.05, 1.53))
        pts = [top + Vector((sx * 0.012 * math.sin(t * 3), -0.01 * t, -0.17 * t)) for t in np.linspace(0, 1, 6)]
        m.tube(pts, lambda t: 0.013 * (1 - 0.7 * t), 5, 'pelo', hw)
    extra = m.object('Coleta', arm)
    return [pelo, extra]


# ------------------------------------------------------------------ tocado
def tocado(arm):
    head_h, head_t = bone_pts(arm, 'head')
    piel = bpy.data.objects['Piel']
    hv = [v for v, d in zip(world_verts(piel), dominant(piel)) if d == 'head'] + world_verts(bpy.data.objects['PeloBase'])
    ctr = Vector((0, sum(p.y for p in hv) / len(hv)))
    m = Malla()
    hw = rigid('head')
    # Banda turquesa satinada, inclinada (más baja delante, sobre la frente).
    tilt = math.radians(14)
    band = []
    # Un solo radio por ángulo (el de la mitad de la banda): banda recta, sin abrirse en campana.
    mid = [perfil(hv, 1.575 + math.sin(2 * math.pi * s / 40) * math.tan(tilt) * 0.09, 0.014, ctr)(2 * math.pi * s / 40) for s in range(40)]
    for k, (dz, out) in enumerate(((-0.034, 0.0), (-0.029, 0.008), (0.03, 0.008), (0.042, -0.012))):
        row = []
        for s in range(40):
            ang = 2 * math.pi * s / 40
            zc = 1.575 + math.sin(ang) * math.tan(tilt) * 0.09 + dz
            r = mid[s] + 0.012 + out
            row.append(Vector((ctr.x + math.cos(ang) * r, ctr.y + math.sin(ang) * r, zc)))
        band.append(row)
    m.grid(band, 'turquesa', hw)
    # Espejo redondo con aro dorado al frente.
    front = band[2][30]
    m.disc(front + Vector((0, -0.004, -0.028)), Vector((0, -1, 0.15)), 0.04, 'espejo', 'oro', hw, sides=16, rim_w=0.3)
    # Corona de pompones sobre la banda.
    colores = ['pom_fucsia', 'pom_rosa', 'pom_rojo', 'pom_azul', 'pom_amarillo', 'pom_crema', 'pom_magenta']
    top = max(p.z for p in hv)
    for k in range(10):
        ang = 2 * math.pi * k / 10
        rr = 0.075 + 0.02 * (k % 2)
        p = Vector((ctr.x + math.cos(ang) * rr, ctr.y + math.sin(ang) * rr * 0.9, top + 0.03 + 0.02 * (k % 3)))
        m.ico(p, 0.045 + 0.01 * (k % 2), colores[k % len(colores)], hw)
    for k in range(4):
        p = Vector((0.03 * math.cos(k * 1.7), ctr.y + 0.03 * math.sin(k * 1.7), top + 0.06))
        m.ico(p, 0.05, colores[(k + 3) % len(colores)], hw)
    # Arco de pompones: sube de la coronilla, se curva hacia atrás y cae al hombro izquierdo.
    arco = [Vector(p) for p in ((0.02, ctr.y + 0.02, top + 0.07), (0.06, ctr.y + 0.13, top + 0.11), (0.13, ctr.y + 0.24, top + 0.07),
                                (0.19, ctr.y + 0.29, top - 0.06), (0.23, ctr.y + 0.30, top - 0.21), (0.25, ctr.y + 0.27, top - 0.36))]
    pts = catmull(arco, 13)
    for i, p in enumerate(pts):
        m.ico(p, 0.06 - 0.008 * (i / len(pts)), colores[(i * 3) % len(colores)], hw)
        if i % 4 == 1:
            m.ico(p + Vector((0.04, 0.0, 0.0)), 0.03, 'hoja', hw, spikes=1.6)
    # Cintas que cuelgan del final del arco.
    end = pts[-1]
    for k, col in enumerate(['cinta_amarilla', 'cinta_rosa', 'cinta_azul', 'cinta_lavanda', 'cinta_amarilla']):
        sx = (k - 2) * 0.018
        cp = [end + Vector((sx + 0.02 * math.sin(t * 4 + k), 0.01 * k, -0.06 - 0.5 * t)) for t in np.linspace(0, 1, 8)]
        m.strip(cp, 0.03, (0, 1, 0), col, hw)
    return m.object('Tocado', arm)


def catmull(ctrl, n):
    pts = []
    P = [ctrl[0]] + ctrl + [ctrl[-1]]
    segs = len(ctrl) - 1
    for i in range(n):
        u = i / (n - 1) * segs
        k = min(int(u), segs - 1)
        t = u - k
        p0, p1, p2, p3 = P[k], P[k + 1], P[k + 2], P[k + 3]
        pts.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return pts


# ------------------------------------------------------------------ máscara
def mascara(arm):
    """Careta de diablico: antifaz fucsia con cuernitos y espejitos; se quita y pone en el juego."""
    piel = bpy.data.objects['Piel']
    pv, dom = world_verts(piel), dominant(piel)
    cara = world_verts(bpy.data.objects['Cara_0'])
    eyes = [sum((p for p in cara if p.x * s > 0.005), Vector()) / max(1, sum(1 for p in cara if p.x * s > 0.005)) for s in (1, -1)]
    hh, _ = bone_pts(arm, 'head')

    def en_cara(i):
        p = pv[i]
        if dom[i] != 'head' or not (1.425 < p.z < 1.585) or p.y > hh.y - 0.035:
            return False
        for e in eyes:
            if ((p.x - e.x) / 0.03) ** 2 + ((p.z - e.z) / 0.019) ** 2 < 1:
                return False
        return True
    bpy.ops.object.select_all(action='DESELECT')
    piel.select_set(True)
    bpy.context.view_layer.objects.active = piel
    bpy.ops.object.duplicate()
    copia = bpy.context.active_object
    cv = world_verts(copia)
    delete_faces(copia, lambda i: not en_cara(i), any_vert=True)
    copia.name = 'MascaraBase'
    push(copia, lambda i, p: 0.007)
    recolor_faces(copia, 'mascara')
    m = Malla()
    hw = rigid('head')
    for s in (1, -1):
        base = Vector((s * 0.06, hh.y - 0.075, 1.575))
        pts = [base + Vector((s * 0.03 * t, 0.02 * t, 0.07 * t ** 0.9)) for t in np.linspace(0, 1, 5)]
        m.tube(pts, lambda t: 0.017 * (1 - t) + 0.002, 7, 'cuerno', hw)
        for k, (dx, dz) in enumerate(((0.055, -0.0), (0.035, 0.05))):
            p = Vector((s * dx, 0, 1.47 + dz))
            near = min((q for q in [pv[i] for i in range(len(pv)) if en_cara(i)]), key=lambda q: (q.x - p.x) ** 2 + (q.z - p.z) ** 2)
            m.disc(near + Vector((0, -0.006, 0)), Vector((s * 0.4, -1, 0)), 0.012, 'espejo', 'oro', hw, sides=10)
    centro = min((pv[i] for i in range(len(pv)) if en_cara(i) and pv[i].z > 1.535), key=lambda q: abs(q.x))
    m.disc(centro + Vector((0, -0.006, 0)), Vector((0, -1, 0.2)), 0.014, 'espejo', 'oro', hw, sides=12)
    deco = m.object('MascaraDeco', arm)
    return [copia, deco]


# ------------------------------------------------------------------ bastón
def baston(arm, reposo_pose):
    """Bastón de rayas rosa y verde con cintas. Se modela en la pose de reposo (vertical junto a la
    mano derecha) y se devuelve a la pose de enlace con la inversa de la mano."""
    hb = arm.pose.bones['handR']
    T = arm.matrix_world @ hb.matrix @ hb.bone.matrix_local.inverted() @ arm.matrix_world.inverted()
    h, t = hb.head, hb.tail
    grip = arm.matrix_world @ (h.lerp(t, 0.42))
    m = Malla()
    hw = rigid('handR')
    axis_x, axis_y = grip.x - 0.005, grip.y - 0.012
    z0, z1 = 0.02, grip.z + 0.26
    rows = []
    N, SIDES = 46, 10
    for i in range(N):
        z = z0 + (z1 - z0) * i / (N - 1)
        rows.append([Vector((axis_x + math.cos(2 * math.pi * s / SIDES) * 0.016, axis_y + math.sin(2 * math.pi * s / SIDES) * 0.016, z)) for s in range(SIDES)])

    def raya(i, j):
        u = (i / (N - 1) * 9 + j / SIDES) % 1.0
        return 'baston_rosa' if u < 0.45 else ('baston_blanco' if u < 0.52 else 'baston_verde')
    m.grid(rows, raya, hw, cap=[(0, 'baston_verde')])
    topc = Vector((axis_x, axis_y, z1 + 0.02))
    m.ico(topc, 0.03, 'baston_rosa', hw, spikes=1.0, sub=1)
    for k, col in enumerate(['cinta_rosa', 'cinta_lima', 'cinta_lavanda', 'baston_rosa']):
        ang = k * 1.6
        cp = [topc + Vector((math.cos(ang) * (0.02 + 0.08 * tt), math.sin(ang) * (0.02 + 0.06 * tt), -0.03 - 0.42 * tt + 0.04 * math.sin(tt * 5 + k))) for tt in np.linspace(0, 1, 9)]
        m.strip(cp, 0.026, (-math.sin(ang), math.cos(ang), 0), col, hw)
    Ti = T.inverted()
    m.v = [Ti @ v for v in m.v]
    return m.object('Baston', arm)


# ------------------------------------------------------------------ clips
P = fg_rig.p


class Clips(fg_rig.Rig):
    """fg_rig.Rig sobre el esqueleto importado (mismas convenciones de pose)."""

    def __init__(self, arm):
        self.scene = bpy.context.scene
        self.obj = arm
        self.parts = []
        self.pose = arm.pose.bones
        self.root = 'hips'
        self.actions = []


# Brazos de reposo de la diablica: el derecho sujeta el bastón, el izquierdo recoge la falda.
ARMS = {'upperArmR': (-16, 26, 6), 'foreArmR': (-58, 0, 0), 'handR': (0, 0, 0),
        'upperArmL': (-6, -30, 0), 'foreArmL': (-24, 0, -8), 'handL': (-10, 22, 0)}


def p(**kw):
    return {**ARMS, **kw}


def paso(sign, k=1.0, lean=0.0):
    """Paso corto de bailarina: la falda tapa las piernas; cadera y busto marcan el ritmo."""
    s = sign
    return {
        'hips': (lean, 0, 7 * s), 'spine': (2 + lean, 0, -3 * s), 'chest': (0, 0, -5 * s), 'head': (0, 0, 2 * s),
        'thighR': (-22 * s * k, 0, 0), 'shinR': (10 if s > 0 else 26 * k, 0, 0), 'footR': (-6 * s, 0, 0),
        'thighL': (22 * s * k, 0, 0), 'shinL': (26 * k if s > 0 else 10, 0, 0), 'footL': (6 * s, 0, 0),
        **ARMS,
        'upperArmR': (-16 + 8 * s * k, 26, 6), 'upperArmL': (-6 - 8 * s * k, -32, 0),
    }


def paso_medio(sign, k=1.0, lean=0.0):
    s = sign
    return {
        'hips': (lean, 0, 0), 'spine': (2 + lean, 0, 0), 'chest': (0, 0, 0),
        'thighR': (-3 * s, 0, 0), 'shinR': (6 if s > 0 else 42 * k, 0, 0),
        'thighL': (3 * s, 0, 0), 'shinL': (42 * k if s > 0 else 6, 0, 0),
        **ARMS,
    }


def clips(arm):
    fg_rig.ARMS = ARMS  # los gestos comunes parten de estos brazos
    r = Clips(arm)
    r.clip('Reposo', [
        (1, p()),
        (16, p(chest=(-1.5, 0, 0), head=(1, 3, 3)), (0, 0, -0.004)),
        (31, p(chest=(-2.5, 0, 0), head=(2, 5, 5), upperArmL=(-6, -42, 0)), (0, 0, -0.008)),
        (46, p(chest=(-1.5, 0, 0), head=(1, 3, 3)), (0, 0, -0.004)),
        (61, p()),
    ])
    r.clip('Caminar', [
        (1, paso(1), (0, 0, 0)), (9, paso_medio(1), (0, 0, 0.018)),
        (17, paso(-1), (0, 0, 0)), (25, paso_medio(-1), (0, 0, 0.018)),
        (33, paso(1), (0, 0, 0)),
    ])
    r.clip('Correr', [
        (1, paso(1, 1.6, 9), (0, 0, -0.01)), (6, paso_medio(1, 1.3, 9), (0, 0, 0.05)),
        (11, paso(-1, 1.6, 9), (0, 0, -0.01)), (16, paso_medio(-1, 1.3, 9), (0, 0, 0.05)),
        (21, paso(1, 1.6, 9), (0, 0, -0.01)),
    ])
    # Evasión: un giro de baile completo sobre sí misma.
    r.clip('Rodar', [
        (1, p(), (0, 0, 0)),
        (5, p(hips=(0, 0, 120), upperArmL=(0, -70, 0), upperArmR=(-10, 60, 0)), (0, 0, 0.04)),
        (9, p(hips=(0, 0, 240), upperArmL=(0, -75, 0), upperArmR=(-10, 65, 0)), (0, 0, 0.05)),
        (13, p(hips=(0, 0, 359), upperArmL=(0, -60, 0)), (0, 0, 0.02)),
        (17, p(), (0, 0, 0)),
    ])
    r.clip('Golpeado', [
        (1, p()),
        (4, p(spine=(10, 0, 0), chest=(14, 0, 6), head=(16, 0, -8), upperArmL=(-30, -55, 0)), (0, 0.04, 0)),
        (12, p()),
    ])
    r.clip('Morir', [
        (1, p()),
        (10, p(hips=(-25, 0, 0), spine=(12, 0, 0), head=(20, 0, 10), upperArmL=(-40, -60, 0)), (0, 0.1, -0.15)),
        (22, p(hips=(-82, 0, 8), head=(10, 0, 25), upperArmL=(-80, -70, 0), upperArmR=(-40, 70, 0)), (0, 0.55, -0.72)),
        (40, p(hips=(-86, 0, 8), head=(12, 0, 30), upperArmL=(-80, -72, 0), upperArmR=(-40, 72, 0)), (0, 0.6, -0.76)),
    ])
    r.clip('Atacar', [  # bastonazo: alza el bastón y lo descarga
        (1, p()),
        (7, p(chest=(-6, 0, 18), upperArmR=(-150, 20, 0), foreArmR=(-30, 0, 0))),
        (11, p(chest=(10, 0, -14), spine=(6, 0, 0), upperArmR=(-60, 10, 0), foreArmR=(-10, 0, 0), thighR=(-14, 0, 0), shinR=(12, 0, 0))),
        (18, p()),
    ])
    r.clip('Lanzar', [  # alza el bastón y el espejo de la mano izquierda
        (1, p()),
        (8, p(chest=(-10, 0, 0), head=(-8, 0, 0), upperArmR=(-120, 20, 0), foreArmR=(-20, 0, 0), upperArmL=(-100, -30, 0), foreArmL=(-20, 0, 0))),
        (16, p(chest=(-6, 0, 0), upperArmR=(-130, 20, 0), foreArmR=(-12, 0, 0), upperArmL=(-110, -30, 0), foreArmL=(-14, 0, 0))),
        (24, p()),
    ])
    r.clip('MascaraOn', [
        (1, p()),
        (8, p(upperArmL=(-70, -10, 0), foreArmL=(-110, 0, 0), head=(-6, 0, 0))),
        (14, p(chest=(-6, 0, 0), head=(-12, 0, 0), upperArmL=(-80, 4, 0), foreArmL=(-118, 0, 0))),
        (20, p(head=(-4, 0, 0), upperArmL=(-70, -10, 0), foreArmL=(-90, 0, 0))),
        (28, p()),
    ])
    r.clip('MascaraOff', [
        (1, p()),
        (8, p(head=(-8, 0, 0), upperArmL=(-80, 4, 0), foreArmL=(-118, 0, 0))),
        (16, p(chest=(4, 0, 0), head=(8, 0, -6), upperArmL=(-40, -50, 0), foreArmL=(-60, 0, 0))),
        (26, p()),
    ])
    r.clip('Baston', [  # golpe de bastón en el suelo al compás
        (1, p()),
        (7, p(chest=(0, 0, 10), head=(2, 0, 6), upperArmR=(-40, 26, 6), foreArmR=(-70, 0, 0)), (0, 0, 0.03)),
        (11, p(chest=(4, 0, -6), upperArmR=(-10, 26, 6), foreArmR=(-50, 0, 0), thighL=(-12, 0, 0), shinL=(20, 0, 0)), (0, 0, -0.01)),
        (18, p(chest=(0, 0, 8), upperArmR=(-40, 26, 6), foreArmR=(-70, 0, 0)), (0, 0, 0.03)),
        (22, p(upperArmR=(-10, 26, 6), foreArmR=(-50, 0, 0), thighR=(-12, 0, 0), shinR=(20, 0, 0)), (0, 0, -0.01)),
        (30, p()),
    ])
    r.clip('Reaccion', [
        (1, p()),
        (8, p(chest=(0, 0, -7), head=(0, 4, 16))),
        (16, p(chest=(0, 0, -7), head=(0, 4, 16))),
        (24, p()),
    ])
    fg_rig.biped_emote_clips(r)
    return r


def pose_reposo(arm):
    """Deja el esqueleto en el primer fotograma de Reposo (para modelar el bastón en la mano)."""
    r = Clips(arm)
    r.obj.animation_data_clear()
    r._key(1, p(), (0, 0, 0))
    arm.animation_data_clear()
    bpy.context.view_layer.update()


def descansar(arm):
    arm.animation_data_clear()
    for pb in arm.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()


# ------------------------------------------------------------------ texturas y exportación
def tile_image(img_name, tint=None, eyes_brown=False):
    im = bpy.data.images[img_name]
    w, h = im.size
    a = np.array(im.pixels[:]).reshape(h, w, 4)
    if eyes_brown:  # iris azul de la base → castaño ámbar de la lámina
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        blue = (b > r + 0.12) & (b > g + 0.02)
        lum = 0.3 * r + 0.59 * g + 0.11 * b
        k = np.clip(lum * 1.9, 0, 1.4)
        for ch, base in enumerate((0.62, 0.36, 0.16)):
            a[..., ch] = np.where(blue, np.clip(base * k, 0, 1), a[..., ch])
    if tint is not None:
        a[..., :3] *= np.array(hex_rgb(tint))
    if (w, h) != (1024, 1024):
        ys = (np.arange(1024) * h // 1024)
        xs = (np.arange(1024) * w // 1024)
        a = a[ys][:, xs]
    return a


def atlas(name, objs_tiles, size):
    """objs_tiles: [(objetos, imagen 1024 o 'paleta')]; une todo en una textura de 2x2 casillas."""
    n = len(objs_tiles)
    cols = 1 if n == 1 else 2
    rows = 1 if n <= 2 else 2
    W, H = cols * 1024, rows * 1024
    col = np.ones((H, W, 4))
    mr = np.ones((H, W, 4))
    mr[..., :3] = (0, 0.6, 0)
    for k, (objs, img) in enumerate(objs_tiles):
        cx, cy = k % cols, k // cols
        if isinstance(img, str):
            c, r = palette_images(1024)
            col[cy * 1024:(cy + 1) * 1024, cx * 1024:(cx + 1) * 1024] = c
            mr[cy * 1024:(cy + 1) * 1024, cx * 1024:(cx + 1) * 1024] = r
        else:
            col[cy * 1024:(cy + 1) * 1024, cx * 1024:(cx + 1) * 1024] = img
        for o in objs:
            uv = o.data.uv_layers.active
            for d in uv.data:
                u, v = d.uv
                d.uv = ((min(max(u, 0.0), 1.0) + cx) / cols, (min(max(v, 0.0), 1.0) + cy) / rows)
    if (W, H) != (size * cols // 2 if cols == 2 else size, size * rows // 2 if rows == 2 else size):
        pass
    images = []
    for suffix, data, space in (('', col, 'sRGB'), ('_mr', mr, 'Non-Color')):
        im = bpy.data.images.new(f'diablica_espejo_{name}{suffix}', W, H, alpha=False)
        im.colorspace_settings.name = space
        im.pixels.foreach_set(data.astype(np.float32).ravel())
        im.pack()
        if (W, H) != (size, size) and max(W, H) > size:
            im.scale(W * size // max(W, H), H * size // max(W, H))
        images.append(im)
    return images


def material(name, col_img, mr_img):
    m = bpy.data.materials.new(f'heroe_diablica_espejo_{name}')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tc = nt.nodes.new('ShaderNodeTexImage')
    tc.image = col_img
    nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
    tm = nt.nodes.new('ShaderNodeTexImage')
    tm.image = mr_img
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(tm.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs[1], bsdf.inputs['Roughness'])
    nt.links.new(sep.outputs[2], bsdf.inputs['Metallic'])
    m.use_backface_culling = False
    return m


def unir(name, objs, arm):
    for o in objs:
        if o.data.uv_layers.active and o.data.uv_layers.active.name != 'UVMap':
            o.data.uv_layers.active.name = 'UVMap'
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    o.data.name = name
    for mod in [m for m in o.modifiers if m.type == 'ARMATURE'][1:]:
        o.modifiers.remove(mod)
    bind(o, arm)
    return o


def pieza(name, arm, tiles, size):
    objs = [o for o, _ in tiles for o in o] if False else [o for group, _ in tiles for o in group]
    col, mr = atlas(name.lower(), tiles, size)
    mat = material(name.lower(), col, mr)
    o = unir(name, objs, arm)
    o.data.materials.clear()
    o.data.materials.append(mat)
    for poly in o.data.polygons:
        poly.material_index = 0
    return o


def exportar(arm, piezas, acciones):
    ad = arm.animation_data_create()
    ad.action = None
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)
    for act in acciones:
        tr = ad.nla_tracks.new()
        tr.name = act.name
        tr.strips.new(act.name, int(act.frame_range[0]), act)
    for pb in arm.pose.bones:  # sin borrar las pistas
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.context.scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    for o in [arm, *piezas]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_apply=False, export_materials='EXPORT',
                              export_image_format='JPEG', export_jpeg_quality=90)
    tris = sum(len(p.vertices) - 2 for o in piezas for p in o.data.polygons)
    print(f'diablica_espejo.glb: {tris} triangulos, {os.path.getsize(OUT)} bytes')


def main(argv):
    arm = importar_base()
    arm.name = 'diablica_espejo'
    imgs = {n: bpy.data.images[[i.name for i in bpy.data.images if n in i.name][0]].name for n in ('piel', 'cara', 'calzado', 'pelo_short')}
    piel_set = vestir_cuerpo(arm)
    piel, cara, cal, blusa, guantes, adorno = piel_set
    fa = falda(arm, blusa)
    pelo = peinado(arm)
    toc = tocado(arm)
    mas = mascara(arm)
    pose_reposo(arm)
    bas = baston(arm, None)
    descansar(arm)

    cuerpo = pieza('Cuerpo', arm, [([piel], tile_image(imgs['piel'], '#f7d3bd')),
                                   ([cara], tile_image(imgs['cara'], None, eyes_brown=True)),
                                   ([cal], tile_image(imgs['calzado'], '#f7cfe1')),
                                   ([blusa, guantes, adorno], 'paleta')], 2048)
    pel = pieza('Pelo', arm, [([pelo[0]], tile_image(imgs['pelo_short'], '#9a6038')), ([pelo[1]], 'paleta')], 1024)
    fal = pieza('Falda', arm, [([fa], 'paleta')], 256)
    tc = pieza('Tocado', arm, [([toc], 'paleta')], 256)
    ms = pieza('Mascara', arm, [(mas, 'paleta')], 256)
    bs = pieza('Baston', arm, [([bas], 'paleta')], 256)
    r = clips(arm)
    piezas = [cuerpo, pel, fal, tc, ms, bs]
    if '--sin-exportar' in argv:
        return
    exportar(arm, piezas, r.actions)
    os.makedirs(os.path.dirname(BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND, compress=True)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
