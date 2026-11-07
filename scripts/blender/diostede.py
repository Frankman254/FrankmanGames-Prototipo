# Diostedé: montura voladora original, un tucán rechoncho del Darién (en Centroamérica se le llama
# «diostedé» por su canto). Pico enorme en tres bandas, piel de color alrededor del ojo, babero,
# alas cortas plegadas al flanco, cola larga levantada y patas zigodáctilas. Manta de silla en capas
# con borde en zigzag (idea de mola). Diseño PROPUESTA, propio del proyecto.
# Una sola malla, un rig y siete clips; las diez variantes de color solo cambian los materiales
# `montura_<region>` (data/art/diostede_variantes.json). Mira a -Y, +Z arriba, patas en z=0.
#   blender --background --python scripts/blender/diostede.py
#   blender --background --python scripts/blender/diostede.py -- --capturas   (además, capturas en work/diostede/)
# Por MCP: exec del archivo (ver docs/GUIA_BLENDER_MCP.md). Salidas: assets/models/diostede.glb y
# arte/blender/diostede.blend.
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

try:
    HERE = os.path.dirname(bpy.path.abspath(__file__))
except NameError:  # ejecutado por MCP con exec(): ruta del repo fija
    HERE = r'C:\Users\frank\Desktop\2026\FrankmanGames-Prototipo\scripts\blender'
sys.path.insert(0, HERE)
import fg

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PALETTE = json.load(open(os.path.join(ROOT, 'data', 'art', 'diostede_variantes.json'), encoding='utf-8'))
REGIONS = PALETTE['regiones']
ROUGH = {'plumaje_principal': 0.82, 'plumaje_secundario': 0.74, 'mascara': 0.6, 'pecho_cresta': 0.7,
         'pico_garras': 0.45, 'cuero': 0.78, 'herrajes': 0.38}
METAL = {'herrajes': 0.55}


def srgb(hexcode):
    h = hexcode.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def paint(mat, region, variant):
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    v = PALETTE['variantes'][variant]
    bsdf.inputs['Base Color'].default_value = (*srgb(v[region]), 1)
    bsdf.inputs['Roughness'].default_value = v.get('rugosidad', {}).get(region, ROUGH[region])
    bsdf.inputs['Metallic'].default_value = METAL.get(region, 0.0)


scene = fg.fresh_scene('Diostede')  # en el Blender abierto (MCP) no reinicia: el addon sigue vivo
for old in [c for c in bpy.data.collections if c.name.startswith('DIOS_')]:
    bpy.data.collections.remove(old)
for store in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.actions):
    for block in [b for b in store if b.name.startswith('DIOS_') or b.name.startswith('montura_') or b.name in ('idle_ground', 'walk', 'run', 'takeoff', 'fly_idle', 'fly_forward', 'land')]:
        if block.users == 0 or block.use_fake_user:
            store.remove(block)
M = {}
for region in REGIONS:
    M[region] = fg.material(f'montura_{region}', (1, 1, 1))
    paint(M[region], region, PALETTE['base'])
EYE = fg.material('montura_ojo_iris', (0.80, 0.42, 0.06), rough=0.25)
PUPIL = fg.material('montura_ojo_pupila', (0.02, 0.015, 0.012), rough=0.15)
GLINT = fg.material('montura_ojo_brillo', (1, 1, 1), rough=0.1, emit=(1, 1, 1), strength=0.6)
P, S, MASK, CREST, BEAK, LEATHER, METALS = (M[r] for r in REGIONS)

# Colecciones del .blend: rig, malla por piezas y anclajes.
COLS = {}
for name in ('DIOS_rig', 'DIOS_malla', 'DIOS_anclajes', 'DIOS_capturas'):
    COLS[name] = bpy.data.collections.new(name)
    scene.collection.children.link(COLS[name])

# ---------------------------------------------------------------- esqueleto
BONES = [
    ('hips', None, (0, 0.40, 0.80), (0, 0.0, 0.82)),
    ('chest', 'hips', (0, 0.0, 0.82), (0, -0.36, 0.94)),
    ('neck', 'chest', (0, -0.36, 0.94), (0, -0.50, 1.12)),
    ('head', 'neck', (0, -0.50, 1.12), (0, -0.98, 1.26)),
    ('crest', 'head', (0, -0.66, 1.58), (0, -0.52, 1.74)),
    ('tail', 'hips', (0, 0.48, 0.90), (0, 0.84, 1.14)),
    ('tailTip', 'tail', (0, 0.84, 1.14), (0, 1.12, 1.36)),
]
for side, s in (('L', 1), ('R', -1)):
    BONES += [
        (f'wing_{side}', 'chest', (0.40 * s, -0.14, 1.02), (0.80 * s, -0.12, 1.04)),
        (f'wingTip_{side}', f'wing_{side}', (0.80 * s, -0.12, 1.04), (1.28 * s, -0.08, 1.04)),
        (f'thigh_{side}', 'hips', (0.22 * s, -0.02, 0.44), (0.22 * s, -0.04, 0.28)),
        (f'shin_{side}', f'thigh_{side}', (0.22 * s, -0.04, 0.28), (0.22 * s, -0.06, 0.08)),
        (f'foot_{side}', f'shin_{side}', (0.22 * s, -0.06, 0.08), (0.22 * s, -0.22, 0.03)),
    ]

arm = bpy.data.armatures.new('DIOS_huesos')
RIG = bpy.data.objects.new('DIOS_Diostede', arm)
COLS['DIOS_rig'].objects.link(RIG)
bpy.context.view_layer.objects.active = RIG
bpy.ops.object.mode_set(mode='EDIT')
for bone, parent, head, tail in BONES:
    b = arm.edit_bones.new(bone)
    b.head, b.tail = head, tail
    if parent:
        b.parent = arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for pb in RIG.pose.bones:
    pb.rotation_mode = 'QUATERNION'


# ---------------------------------------------------------------- geometría suave por piezas
class Piece:
    """Malla de una pieza: capas suaves, un material por región y huesos rígidos por cara."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.layer = self.bm.verts.layers.deform.verify()
        self.mats, self.groups = [], []

    def _done(self, verts, mat, bone, faces=None):
        if mat not in self.mats:
            self.mats.append(mat)
        if bone not in self.groups:
            self.groups.append(bone)
        mi, gi = self.mats.index(mat), self.groups.index(bone)
        for f in faces if faces is not None else {f for v in verts for f in v.link_faces}:
            f.material_index = mi
        for v in verts:
            v[self.layer][gi] = 1.0

    def blob(self, c, r, mat, bone, rot=(0, 0, 0), seg=(14, 9)):
        m = Matrix.Translation(c) @ Euler([math.radians(a) for a in rot]).to_matrix().to_4x4() @ Matrix.Diagonal((*r, 1))
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=seg[0], v_segments=seg[1], radius=1, matrix=m)
        self._done(res['verts'], mat, bone)

    def tube(self, a, b, ra, rb, mat, bone, sides=10):
        a, b = Vector(a), Vector(b)
        d = b - a
        m = Matrix.Translation((a + b) / 2) @ Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=sides, radius1=ra, radius2=rb, depth=d.length, matrix=m)
        self._done(res['verts'], mat, bone)

    def feather(self, base, direction, normal, length, width, mat, bone, tip=None, tip_from=0.66, curl=0.0, rings=7, sides=6, thick=0.16):
        """Pluma lanceolada: huso aplanado de `base` hacia `direction`; `normal` es su cara; `tip` pinta la punta."""
        d = Vector(direction).normalized()
        n = Vector(normal)
        n = (n - d * n.dot(d)).normalized()
        w = d.cross(n)
        ring_list = []
        for i in range(rings + 1):
            t = i / rings
            half = width * math.sin(math.pi * min(1.0, t ** 0.75)) ** 0.8 + 0.004
            center = Vector(base) + d * (length * t) + n * (curl * length * t * t)
            ring = []
            for k in range(sides):
                a = 2 * math.pi * k / sides
                ring.append(self.bm.verts.new(center + w * (math.cos(a) * half) + n * (math.sin(a) * half * thick)))
            ring_list.append(ring)
        faces, tips = [], []
        for i in range(rings):
            for k in range(sides):
                f = self.bm.faces.new((ring_list[i][k], ring_list[i][(k + 1) % sides], ring_list[i + 1][(k + 1) % sides], ring_list[i + 1][k]))
                (tips if tip is not None and (i + 0.5) / rings >= tip_from else faces).append(f)
        faces.append(self.bm.faces.new(ring_list[0][::-1]))
        faces.append(self.bm.faces.new(ring_list[-1]))
        verts = [v for r in ring_list for v in r]
        self._done(verts, mat, bone, faces)
        if tips:
            self._done([], tip, bone, tips)

    def loft(self, rings, mat_at, bone, sides=14):
        """Tubo suave por anillos elípticos [(centro, ancho, alto, t)]; `mat_at(t)` pinta cada tramo."""
        verts = []
        for i, (c, rx, rz, t) in enumerate(rings):
            nxt = rings[min(i + 1, len(rings) - 1)][0]
            prv = rings[max(i - 1, 0)][0]
            tan = (nxt - prv).normalized()
            w = Vector((1, 0, 0))
            up = tan.cross(w).normalized()
            if up.z < 0:
                up = -up
            verts.append([self.bm.verts.new(c + w * (math.cos(2 * math.pi * k / sides) * rx) + up * (math.sin(2 * math.pi * k / sides) * rz)) for k in range(sides)])
        for i in range(len(rings) - 1):
            mat = mat_at((rings[i][3] + rings[i + 1][3]) / 2)
            faces = [self.bm.faces.new((verts[i][k], verts[i][(k + 1) % sides], verts[i + 1][(k + 1) % sides], verts[i + 1][k])) for k in range(sides)]
            self._done(verts[i] + verts[i + 1], mat, bone, faces)
        self._done([], mat_at(0), bone, [self.bm.faces.new(verts[0][::-1])])
        self._done([], mat_at(1), bone, [self.bm.faces.new(verts[-1])])

    def build(self, col=None, scale=None, pivot=(0, 0, 0)):
        if scale:
            bmesh.ops.transform(self.bm, verts=self.bm.verts, matrix=Matrix.Translation(pivot) @ Matrix.Scale(scale, 4) @ Matrix.Translation(-Vector(pivot)))
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(f'DIOS_{self.name}')
        self.bm.to_mesh(me)
        self.bm.free()
        for mat in self.mats:
            me.materials.append(mat)
        for poly in me.polygons:
            poly.use_smooth = True
        o = bpy.data.objects.new(self.name, me)
        (col or COLS['DIOS_malla']).objects.link(o)
        for g in self.groups:
            o.vertex_groups.new(name=g)
        o.parent = RIG
        o.modifiers.new('Huesos', 'ARMATURE').object = RIG
        # UV propias por pieza: proyección inteligente, islas separadas.
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
        bpy.ops.object.mode_set(mode='OBJECT')
        return o


PARTS = []
MOUTH = fg.material('montura_comisura', (0.03, 0.03, 0.035), rough=0.5)

# Cuerpo: bola rechoncha, babero de color del cuello al pecho y coberteras rojas bajo la cola.
body = Piece('body')
body.blob((0, 0.06, 0.82), (0.48, 0.58, 0.48), P, 'hips')
body.blob((0, -0.40, 0.98), (0.36, 0.22, 0.34), CREST, 'chest')
body.blob((0, -0.30, 0.74), (0.32, 0.22, 0.24), CREST, 'chest')
body.blob((0, 0.52, 0.62), (0.24, 0.17, 0.15), S, 'hips')
for s in (1, -1):  # plumas de la espalda, en escamas suaves hacia atrás
    for k in range(3):
        body.feather((0.30 * s, -0.04 + 0.2 * k, 1.12 - 0.05 * k), (0.2 * s, 1, -0.2), (s * 0.6, 0, 1), 0.30, 0.11, P, 'hips', thick=0.3)
PARTS.append(body.build())

# Cabeza grande y redonda, garganta del color del babero, piel desnuda de color alrededor del ojo
# (rasgo de tucán) y pico enorme en tres bandas: base, cuerpo y punta.
head = Piece('head')
head.blob((0, -0.60, 1.30), (0.35, 0.36, 0.34), P, 'head')
head.blob((0, -0.80, 1.13), (0.27, 0.18, 0.17), CREST, 'head')
for s in (1, -1):
    head.blob((0.27 * s, -0.74, 1.36), (0.06, 0.16, 0.15), MASK, 'head', rot=(0, 0, -16 * s))
    head.blob((0.315 * s, -0.75, 1.37), (0.04, 0.095, 0.10), PUPIL, 'head', seg=(12, 8))
    head.blob((0.34 * s, -0.79, 1.41), (0.012, 0.026, 0.028), GLINT, 'head', seg=(8, 5))
    head.blob((0.33 * s, -0.71, 1.33), (0.008, 0.014, 0.014), GLINT, 'head', seg=(6, 4))


def beak_path(t):
    return Vector((0, -0.82 - 0.86 * t, 1.30 - 0.02 * t - 0.26 * t * t))


rings = []
for i in range(13):
    t = i / 12
    rings.append((beak_path(t), 0.15 * (1 - 0.72 * t) + 0.014, 0.25 * (1 - 0.80 * t ** 0.9) + 0.016, t))
head.loft(rings, lambda t: MASK if t < 0.13 else (S if t > 0.84 else BEAK), 'head')
for s in (1, -1):  # comisura: separa las dos mandíbulas
    pts = [beak_path(t) + Vector((0.15 * (1 - 0.72 * t) * s * 0.97, 0, -0.06 * (1 - t))) for t in (0.06, 0.35, 0.65, 0.9)]
    for a, b in zip(pts, pts[1:]):
        head.tube(a, b, 0.010, 0.010, MOUTH, 'head', sides=5)
PARTS.append(head.build())

# Cresta: remolino corto de tres plumas redondas en la coronilla.
crest = Piece('crest')
for k, (dx, ln) in enumerate(((0, 0.26), (-0.07, 0.2), (0.07, 0.2))):
    crest.feather((dx, -0.66, 1.60), (dx * 1.5, 0.75, 0.65), (0, -0.6, 0.8), ln, 0.10, P, 'crest', curl=-0.35, thick=0.5)
PARTS.append(crest.build())

# Alas cortas y redondeadas: en reposo del rig abiertas; en tierra se pliegan pegadas al flanco.
for side, s in (('L', 1), ('R', -1)):
    w = Piece(f'wing_{side}')
    wb, tb = f'wing_{side}', f'wingTip_{side}'
    w.blob((0.58 * s, -0.10, 1.03), (0.22, 0.16, 0.08), P, wb)
    for k in range(4):  # coberteras, del color secundario por arriba
        w.feather(((0.44 + 0.10 * k) * s, -0.16, 1.07), (0.1 * s, 1, 0), (0, 0, 1), 0.32, 0.12, S, wb, thick=0.3)
    for k in range(5):  # secundarias
        w.feather(((0.42 + 0.09 * k) * s, -0.10, 1.03), ((0.08 + 0.04 * k) * s, 1, 0), (0, 0, 1), 0.56, 0.16, P, wb, thick=0.25)
    for k in range(5):  # primarias, redondeadas y cortas
        a = math.radians(10 + 17 * k)
        w.feather(((0.82 + 0.05 * k) * s, -0.09, 1.035), (math.cos(a) * s, math.sin(a), 0), (0, 0, 1), 0.66 - 0.04 * k, 0.17, P, tb, thick=0.25)
    PARTS.append(w.build(scale=0.88, pivot=(0.40 * s, -0.14, 1.02)))

# Cola larga y recta, de plumas anchas juntas, levantada en ángulo detrás de la silla.
tail = Piece('tail')
for k in range(6):
    x = (k - 2.5) * 0.065
    tail.feather((x, 0.50, 0.94), (x * 0.5, 0.55, 0.85), (0, -0.85, 0.55), 0.86 - 0.04 * abs(k - 2.5), 0.15, P, 'tail', thick=0.3)
PARTS.append(tail.build())

# Patas cortas y gruesas de dedos zigodáctilos: dos adelante y dos atrás.
for side, s in (('L', 1), ('R', -1)):
    leg = Piece(f'leg_{side}')
    x = 0.22 * s
    leg.blob((x, -0.03, 0.38), (0.15, 0.17, 0.13), P, f'thigh_{side}')
    leg.tube((x, -0.04, 0.30), (x, -0.06, 0.08), 0.075, 0.065, BEAK, f'shin_{side}', sides=10)
    leg.blob((x, -0.06, 0.07), (0.085, 0.09, 0.05), BEAK, f'foot_{side}', seg=(10, 6))
    for ang, ln in ((-18, 0.17), (18, 0.17), (160, 0.13), (200, 0.11)):
        a = math.radians(ang)
        tip = (x + math.sin(a) * ln, -0.06 - math.cos(a) * ln, 0.04)
        leg.tube((x, -0.06, 0.06), tip, 0.045, 0.035, BEAK, f'foot_{side}', sides=8)
        leg.tube(tip, (tip[0] + math.sin(a) * 0.05, tip[1] - math.cos(a) * 0.05, 0.0), 0.032, 0.006, MOUTH, f'foot_{side}', sides=6)
    PARTS.append(leg.build())

# Silla: manta en capas de colores con borde en zigzag (idea de mola), asiento de cuero bajo y
# pomo corto con herraje. rider_root queda encima, centrado.
saddle = Piece('saddle')
saddle.blob((0, 0.08, 1.235), (0.44, 0.40, 0.05), S, 'hips')
saddle.blob((0, 0.08, 1.255), (0.38, 0.34, 0.05), CREST, 'hips')
saddle.blob((0, 0.08, 1.275), (0.32, 0.28, 0.05), S, 'hips')
for k in range(16):  # borde en zigzag de la manta
    a = 2 * math.pi * k / 16
    c = Vector((math.cos(a) * 0.43, 0.08 + math.sin(a) * 0.39, 1.21))
    saddle.feather(c, (math.cos(a), math.sin(a), -0.9), (0, 0, 1), 0.12, 0.06, CREST if k % 2 else S, 'hips', thick=0.3)
saddle.blob((0, 0.08, 1.31), (0.22, 0.25, 0.06), LEATHER, 'hips')
saddle.tube((0, -0.14, 1.32), (0, -0.17, 1.42), 0.045, 0.04, LEATHER, 'hips')
saddle.blob((0, -0.172, 1.43), (0.055, 0.05, 0.03), METALS, 'hips', seg=(10, 6))
saddle.blob((0, 0.30, 1.35), (0.18, 0.05, 0.07), LEATHER, 'hips')
for s in (1, -1):  # cincha y estribos
    saddle.tube((0.42 * s, 0.10, 1.22), (0.47 * s, 0.10, 0.86), 0.022, 0.022, LEATHER, 'hips', sides=6)
    saddle.blob((0.48 * s, 0.10, 0.84), (0.02, 0.06, 0.035), METALS, 'hips', seg=(8, 6))
PARTS.append(saddle.build())

# Riendas trenzadas de la base del pico al pomo.
reins = Piece('reins')
for s in (1, -1):
    reins.tube((0.13 * s, -0.90, 1.22), (0.24 * s, -0.62, 1.20), 0.014, 0.014, LEATHER, 'head', sides=5)
    reins.tube((0.24 * s, -0.62, 1.20), (0.05 * s, -0.17, 1.40), 0.014, 0.014, LEATHER, 'chest', sides=5)
    reins.blob((0.13 * s, -0.90, 1.22), (0.026, 0.026, 0.026), METALS, 'head', seg=(8, 5))
PARTS.append(reins.build())

# Accesorios: dos bolsas laterales con hebilla y una borla de color cada una.
acc = Piece('accessories')
for s in (1, -1):
    acc.blob((0.47 * s, 0.30, 1.02), (0.07, 0.14, 0.12), LEATHER, 'hips')
    acc.blob((0.54 * s, 0.30, 1.06), (0.012, 0.11, 0.05), LEATHER, 'hips')
    acc.blob((0.545 * s, 0.30, 1.04), (0.012, 0.025, 0.025), METALS, 'hips', seg=(8, 5))
    acc.tube((0.50 * s, 0.30, 0.90), (0.51 * s, 0.31, 0.78), 0.03, 0.012, CREST, 'hips', sides=8)
PARTS.append(acc.build())

# ---------------------------------------------------------------- anclajes
def anchor(name, loc, bone='hips'):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = 'ARROWS'
    e.empty_display_size = 0.2
    COLS['DIOS_anclajes'].objects.link(e)
    e.parent = RIG
    e.parent_type = 'BONE'
    e.parent_bone = bone
    # Con parent_type BONE el origen es la cola del hueso: se compensa con la matriz de reposo.
    pb = RIG.data.bones[bone]
    tail_m = Matrix.Translation(pb.tail_local) @ pb.matrix_local.to_3x3().to_4x4()
    e.matrix_parent_inverse = tail_m.inverted()
    e.location = loc
    return e


SEAT = anchor('mount_seat', (0, 0.08, 1.36))
RIDER = anchor('rider_root', (0, 0.08, 1.36))

# ---------------------------------------------------------------- clips
ROOT_BONE = 'hips'


def key(frame, pose, offset=(0, 0, 0)):
    for pb in RIG.pose.bones:
        rest = pb.bone.matrix_local.to_3x3()
        r = Euler([math.radians(v) for v in pose.get(pb.name, (0, 0, 0))]).to_matrix()
        pb.rotation_quaternion = (rest.inverted() @ r @ rest).to_quaternion()
        pb.keyframe_insert('rotation_quaternion', frame=frame)
    root = RIG.pose.bones[ROOT_BONE]
    root.location = root.bone.matrix_local.to_3x3().inverted() @ Vector(offset)
    root.keyframe_insert('location', frame=frame)


ACTIONS = []


def clip(name, keys, cyclic=True):
    RIG.animation_data_clear()
    for frame, pose, *off in keys:
        key(frame, pose, off[0] if off else (0, 0, 0))
    act = RIG.animation_data.action
    fg.free_action_name(name, act)
    act.name = name
    act.use_fake_user = True
    act['loop'] = cyclic
    ACTIONS.append(act)


def mix(*poses):
    out = {}
    for p in poses:
        for k, v in p.items():
            o = out.get(k, (0, 0, 0))
            out[k] = (o[0] + v[0], o[1] + v[1], o[2] + v[2])
    return out


# Alas plegadas pegadas al flanco: el brazo del ala va hacia atrás y las plumas, que en reposo
# salen hacia +Y, caen hacia abajo y atrás sobre el costado.
def _fold(sign, axis, feather, tip_bend):
    x = Vector((axis[0] * sign, axis[1], axis[2])).normalized()
    y = Vector((feather[0] * sign, feather[1], feather[2]))
    y = (y - x * y.dot(x)).normalized()
    if sign < 0:
        x = -x
    rot = Matrix((x, y, x.cross(y))).transposed()
    e = rot.to_euler('XYZ')
    return tuple(math.degrees(a) for a in e), (0, 0, tip_bend * sign)


_wl, _tl = _fold(1, (0.10, 0.94, 0.28), (0.08, 0.7, -0.7), 10)
_wr, _tr = _fold(-1, (0.10, 0.94, 0.28), (0.08, 0.7, -0.7), 10)
FOLD = {'wing_L': _wl, 'wingTip_L': _tl, 'wing_R': _wr, 'wingTip_R': _tr}


def wings(up=0.0, sweep=0.0, tip=0.0):
    """Alas abiertas: `up` alza (grados), `sweep` las lleva atrás, `tip` dobla las puntas hacia abajo."""
    return {'wing_L': (0, -up, sweep), 'wingTip_L': (0, tip, sweep * 0.5),
            'wing_R': (0, up, -sweep), 'wingTip_R': (0, -tip, -sweep * 0.5)}


def legs_tucked():
    return {'thigh_L': (-38, 0, 0), 'shin_L': (70, 0, 0), 'foot_L': (40, 0, 0),
            'thigh_R': (-38, 0, 0), 'shin_R': (70, 0, 0), 'foot_R': (40, 0, 0)}


# idle_ground: respiración y mirada; patas quietas.
clip('idle_ground', [
    (1, mix(FOLD, {'chest': (0, 0, 0)})),
    (19, mix(FOLD, {'chest': (-3, 0, 0), 'neck': (2, 0, -6), 'head': (-2, 0, 10), 'crest': (-6, 0, 0), 'tail': (4, 0, 0),
                    'wing_L': (0, -3, 0), 'wing_R': (0, 3, 0)}), (0, 0, 0.012)),
    (37, mix(FOLD, {'neck': (-2, 0, 0), 'head': (3, 0, 0), 'crest': (5, 0, 0), 'tail': (0, 0, 5)})),
    (55, mix(FOLD, {'chest': (-3, 0, 0), 'neck': (2, 0, 6), 'head': (-2, 0, -12), 'crest': (-6, 0, 0), 'tail': (4, 0, 0),
                    'wing_L': (0, -3, 0), 'wing_R': (0, 3, 0)}), (0, 0, 0.012)),
    (73, mix(FOLD, {})),
])


def stride(t, amp, bounce, lean):
    """Paso de ave: muslo adelante/atrás, la pata que vuelve se recoge; cadera sube en el paso."""
    ph = 2 * math.pi * t
    s = math.sin(ph)
    lift_L = max(0.0, math.sin(ph + math.pi / 2))
    lift_R = max(0.0, math.sin(ph - math.pi / 2))
    up = abs(math.cos(ph))
    pose = mix(FOLD, {
        'hips': (lean, 0, 4 * s * amp / 30),
        'chest': (-lean * 0.5, 0, -3 * s * amp / 30),
        'neck': (4 * up * bounce * 6, 0, 0),
        'head': (-4 * up * bounce * 6, 0, 2 * s),
        'crest': (-8 * up * bounce * 6, 0, 0),
        'tail': (-6 * up * bounce * 6, 0, -6 * s),
        'thigh_L': (-amp * s, 0, 0), 'shin_L': (55 * lift_L, 0, 0), 'foot_L': (-20 * lift_L + 6 * s, 0, 0),
        'thigh_R': (amp * s, 0, 0), 'shin_R': (55 * lift_R, 0, 0), 'foot_R': (-20 * lift_R - 6 * s, 0, 0),
        'wing_L': (0, -4 * up * bounce * 8, 0), 'wing_R': (0, 4 * up * bounce * 8, 0),
    })
    return pose, (0, 0, bounce * up - bounce * 0.5)


clip('walk', [(1 + 2 * i, *stride(i / 12, 26, 0.03, 3)) for i in range(13)])
clip('run', [(1 + 2 * i, *stride(i / 8, 40, 0.07, 9)) for i in range(9)])


def flap(t, power=1.0):
    """Batido: arriba (alas alzadas y puntas atrás) y abajo (puntas hacia el suelo)."""
    c = math.cos(2 * math.pi * t)
    up = 52 * c * power
    tip = (-20 * c + 10) * power
    return wings(up=up, sweep=(8 + 10 * max(0, c)) * power, tip=tip)


def fly(t, power, lean, bob):
    c = math.cos(2 * math.pi * t)
    pose = mix(flap(t, power), legs_tucked(), {
        'hips': (lean, 0, 0), 'chest': (-lean * 0.4 + 3 * c, 0, 0), 'neck': (lean * 0.4, 0, 0), 'head': (lean * 0.3 - 3 * c, 0, 0),
        'crest': (-10 - 6 * c, 0, 0), 'tail': (-8 + 5 * c, 0, 0)})
    return pose, (0, 0, -bob * c)


clip('fly_idle', [(1 + 3 * i, *fly(i / 8, 0.8, 0, 0.05)) for i in range(9)])
clip('fly_forward', [(1 + 2 * i, *fly(i / 9, 1.0, 5, 0.035)) for i in range(10)])

# takeoff: agacharse, saltar con las alas abiertas y dos batidos fuertes hasta la altura de vuelo.
crouch = mix(FOLD, {'hips': (8, 0, 0), 'chest': (6, 0, 0), 'neck': (-8, 0, 0), 'head': (6, 0, 0),
                    'thigh_L': (-30, 0, 0), 'shin_L': (55, 0, 0), 'foot_L': (-25, 0, 0),
                    'thigh_R': (-30, 0, 0), 'shin_R': (55, 0, 0), 'foot_R': (-25, 0, 0), 'tail': (10, 0, 0)})
spread = mix(wings(up=70, sweep=10, tip=-10), {'hips': (-10, 0, 0), 'chest': (-6, 0, 0), 'head': (8, 0, 0),
                                               'thigh_L': (20, 0, 0), 'thigh_R': (20, 0, 0), 'foot_L': (30, 0, 0), 'foot_R': (30, 0, 0)})
clip('takeoff', [
    (1, mix(FOLD, {})),
    (6, crouch, (0, 0, -0.10)),
    (10, spread, (0, 0, 0.10)),
    (14, mix(wings(up=-45, sweep=6, tip=25), legs_tucked(), {'hips': (-4, 0, 0)}), (0, 0, 0.20)),
    (18, mix(wings(up=55, sweep=16, tip=-12), legs_tucked()), (0, 0, 0.16)),
    (22, mix(wings(up=-40, sweep=6, tip=24), legs_tucked()), (0, 0, 0.06)),
    (25, fly(0, 0.8, 0, 0.05)[0], (0, 0, -0.05)),
], cyclic=False)

# land: desciende planeando, frena con las alas, extiende patas, toca y amortigua.
clip('land', [
    (1, fly(0, 0.8, 0, 0.05)[0], (0, 0, 0.45)),
    (7, mix(wings(up=20, sweep=4, tip=-6), {'hips': (-14, 0, 0), 'head': (10, 0, 0), 'thigh_L': (-20, 0, 0), 'thigh_R': (-20, 0, 0),
                                           'foot_L': (20, 0, 0), 'foot_R': (20, 0, 0), 'tail': (-18, 0, 0)}), (0, 0, 0.25)),
    (12, mix(wings(up=60, sweep=-6, tip=-16), {'hips': (-18, 0, 0), 'head': (12, 0, 0), 'thigh_L': (-26, 0, 0), 'thigh_R': (-26, 0, 0),
                                              'tail': (-24, 0, 0)}), (0, 0, 0.06)),
    (15, crouch, (0, 0, -0.10)),
    (20, mix(FOLD, {'hips': (3, 0, 0), 'chest': (2, 0, 0), 'crest': (8, 0, 0)}), (0, 0, -0.02)),
    (25, mix(FOLD, {})),
], cyclic=False)

# ---------------------------------------------------------------- materiales variantes del .blend
# Copias editables por variante (sin asignar: no se exportan). El juego tiñe las siete regiones.
for variant in PALETTE['variantes']:
    for region in REGIONS:
        m = M[region].copy()
        m.name = f'montura_{region}__{variant}'
        paint(m, region, variant)
        m.use_fake_user = True

# ---------------------------------------------------------------- exportación
fg.to_tracks(RIG, ACTIONS)
for pb in RIG.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)
scene.frame_set(1)
fg.export('diostede.glb', scene, [RIG, *PARTS, SEAT, RIDER])

blend_dir = os.path.join(ROOT, 'arte', 'blender')
os.makedirs(blend_dir, exist_ok=True)


def show(variant):
    for region in REGIONS:
        paint(M[region], region, variant)


def play(name, frame):
    ad = RIG.animation_data
    for t in ad.nla_tracks:
        t.mute = t.name != name
    scene.frame_set(frame)


if '--capturas' in ARGS:
    import capturas_montura
    capturas_montura.run(scene, RIG, PARTS, show, play, COLS['DIOS_capturas'], os.path.join(ROOT, 'work', 'diostede'), list(PALETTE['variantes']))
    show(PALETTE['base'])
    for t in RIG.animation_data.nla_tracks:
        t.mute = False

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(blend_dir, 'diostede.blend'), compress=True, copy=not bpy.app.background)
print('diostede.blend guardado')
