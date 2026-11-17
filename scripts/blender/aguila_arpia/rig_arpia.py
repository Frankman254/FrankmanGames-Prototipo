# Rig y clips del águila arpía de juego (MOD-01).
# Lee arpia_piezas.blend (piezas bajas con UV y atlas horneado, de bake_juego.py), pesa cada
# pieza a sus huesos, une todo en una malla con piel, añade anclajes y clips del contrato de
# monturas, exporta assets/models/aguila_arpia.glb y guarda arte/blender/aguila_arpia.blend.
# Con --render hace las poses en work/claude-mod01/.
# Blender -b --factory-startup --python rig_arpia.py -- [--render]
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Euler, Matrix, Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
W = os.path.join(ROOT, 'work', 'claude-mod01')          # piezas de bake_juego.py y renders
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = '--render' in ARGS

bpy.ops.wm.open_mainfile(filepath=os.path.join(W, 'arpia_piezas.blend'))
scene = bpy.context.scene
scene.render.fps = 24

# ---------------------------------------------------------------- esqueleto (mira a -Y, +Z arriba)
BONES = [
    ('hips', None, (0, 0.70, 1.45), (0, 0.05, 1.50)),
    ('chest', 'hips', (0, 0.05, 1.50), (0, -0.55, 1.85)),
    ('neck', 'chest', (0, -0.55, 1.85), (0, -0.72, 2.20)),
    ('head', 'neck', (0, -0.72, 2.20), (0, -1.25, 2.40)),
    ('crest', 'head', (0, -0.78, 2.62), (0, -0.55, 2.95)),
    ('tail', 'hips', (0, 0.80, 1.45), (0, 1.50, 1.30)),
    ('tailTip', 'tail', (0, 1.50, 1.30), (0, 2.30, 1.08)),
]
for side, s in (('L', 1), ('R', -1)):
    BONES += [
        (f'wing_{side}', 'chest', (0.62 * s, -0.32, 1.98), (0.80 * s, 0.40, 1.72)),
        (f'wingTip_{side}', f'wing_{side}', (0.80 * s, 0.40, 1.72), (0.55 * s, 1.75, 1.40)),
        (f'thigh_{side}', 'hips', (0.40 * s, -0.10, 1.25), (0.41 * s, -0.20, 0.66)),
    ]
    # una pluma primaria, un hueso: el ala abierta se despliega en abanico
    for k in range(9):
        f = k / 8
        BONES += [(f'prim_{side}_{k}', f'wingTip_{side}',
                   (0.90 * s - 0.06 * s * f, 0.20 + 0.08 * f, 1.70 - 0.08 * f),
                   (0.66 * s - 0.30 * s * f, 1.58 + 0.20 * f, 1.46 - 0.14 * f))]
    BONES += [
        (f'shin_{side}', f'thigh_{side}', (0.41 * s, -0.20, 0.66), (0.42 * s, -0.33, 0.09)),
        (f'foot_{side}', f'shin_{side}', (0.42 * s, -0.33, 0.09), (0.42 * s, -0.65, 0.04)),
    ]
SEG = {b: (np.array(h), np.array(t)) for b, _, h, t in BONES}

arm = bpy.data.armatures.new('arpia_huesos')
RIG = bpy.data.objects.new('arpia_rig', arm)
scene.collection.objects.link(RIG)
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


# ---------------------------------------------------------------- pesos
def seg_dist(p, a, b):
    ab = b - a
    t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)


def candidates(name, co):
    """Huesos candidatos por pieza y máscaras que impiden que un hueso arrastre lo que no es suyo."""
    side = np.where(co[:, 0] >= 0, 'L', 'R')
    one = np.ones(len(co))
    if name.startswith(('body', 'saddle')):
        thigh = (1 - np.clip((co[:, 2] - 1.05) / 0.30, 0, 1)) * np.clip((np.abs(co[:, 0]) - 0.10) / 0.18, 0, 1)
        neckm = np.clip((co[:, 2] - 1.80) / 0.25, 0, 1)
        return {'hips': one, 'chest': one, 'neck': neckm, 'head': neckm,
                'tail': np.clip((co[:, 1] - 0.75) / 0.2, 0, 1),
                'thigh_L': thigh * (side == 'L'), 'thigh_R': thigh * (side == 'R')}
    if name.startswith(('beak', 'jaw', 'eye_')):
        return {'head': one}
    if name.startswith('crest_'):
        return {'crest': one, 'head': one * 0.3}
    if name.startswith('tail_'):
        return {'tail': one, 'tailTip': one}
    if name.startswith('prim_'):
        sd = 'L' if co[:, 0].mean() > 0 else 'R'
        k = int(name.split('_')[2])
        return {f'prim_{sd}_{k}': one}
    if name.startswith('wing_'):
        sd = 'L' if co[:, 0].mean() > 0 else 'R'
        return {f'wing_{sd}': one, f'wingTip_{sd}': one}
    if name.startswith('talon_'):
        sd = 'L' if co[:, 0].mean() > 0 else 'R'
        return {f'foot_{sd}': one}
    if name.startswith('legs'):
        up = np.clip((co[:, 2] - 0.55) / 0.15, 0, 1)
        out = {}
        for sd in ('L', 'R'):
            m = (side == sd).astype(float)
            out[f'thigh_{sd}'] = m * up
            out[f'shin_{sd}'] = m
            out[f'foot_{sd}'] = m
        return out
    return {'hips': one}


def weigh(ob):
    me = ob.data
    co = np.array([ob.matrix_world @ v.co for v in me.vertices])
    cand = candidates(ob.name, co)
    names = list(cand)
    W = np.zeros((len(co), len(names)))
    for j, b in enumerate(names):
        a, t = SEG[b]
        d = seg_dist(co, a, t)
        W[:, j] = cand[b] / (d + 0.04) ** 6
    W /= W.sum(1, keepdims=True) + 1e-12
    W[W < 0.03] = 0
    W /= W.sum(1, keepdims=True) + 1e-12
    groups = {b: ob.vertex_groups.new(name=b) for b in names}
    for j, b in enumerate(names):
        g = groups[b]
        for i in np.nonzero(W[:, j])[0]:
            g.add([int(i)], float(W[i, j]), 'REPLACE')


lows = [o for o in scene.objects if o.type == 'MESH' and o.name.endswith('_low')]
for o in lows:
    weigh(o)

# asiento: punto más alto del cojín de cuero
seat_ob = next(o for o in lows if o.name.startswith('saddle_seat'))
sz = max((seat_ob.matrix_world @ v.co).z for v in seat_ob.data.vertices)
SEAT_POS = Vector((0, 0.20, sz))

# una sola malla con un material
bpy.ops.object.select_all(action='DESELECT')
for o in lows:
    o.select_set(True)
bpy.context.view_layer.objects.active = lows[0]
bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
body.name = body.data.name = 'arpia'
body.data.materials.clear()
mat = bpy.data.materials.new('montura_arpia')
body.data.materials.append(mat)
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
tc, tn = nt.nodes.new('ShaderNodeTexImage'), nt.nodes.new('ShaderNodeTexImage')
col_img = bpy.data.images.load(os.path.join(W, 'arpia_color.png'))
col_img.name = 'arpia_color'
col_img.pack()
tc.image, tn.image = col_img, bpy.data.images['arpia_normal']
nmap = nt.nodes.new('ShaderNodeNormalMap')
nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
nt.links.new(tn.outputs['Color'], nmap.inputs['Color'])
nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Roughness'].default_value = 0.6
if 'Col' in body.data.color_attributes:
    body.data.color_attributes.remove(body.data.color_attributes['Col'])
body.parent = RIG
body.modifiers.new('Huesos', 'ARMATURE').object = RIG
TRIS = sum(len(p.vertices) - 2 for p in body.data.polygons)


# ---------------------------------------------------------------- anclajes bajo hips
def anchor(name, loc, bone='hips'):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = 'ARROWS'
    e.empty_display_size = 0.3
    scene.collection.objects.link(e)
    e.parent = RIG
    e.parent_type = 'BONE'
    e.parent_bone = bone
    pb = RIG.data.bones[bone]
    tail_m = Matrix.Translation(pb.tail_local) @ pb.matrix_local.to_3x3().to_4x4()
    e.matrix_parent_inverse = tail_m.inverted()
    e.location = loc
    return e


SEAT = anchor('mount_seat', SEAT_POS)
RIDER = anchor('rider_root', SEAT_POS)

# ---------------------------------------------------------------- poses
# Valor de pose: euler en grados (ejes del armature) o una Matrix 3x3 ya calculada.


def rot(v):
    if isinstance(v, Matrix):
        return v
    return Euler([math.radians(a) for a in v]).to_matrix()


def key(frame, pose, offset=(0, 0, 0)):
    for pb in RIG.pose.bones:
        rest = pb.bone.matrix_local.to_3x3()
        r = rot(pose.get(pb.name, (0, 0, 0)))
        pb.rotation_quaternion = (rest.inverted() @ r @ rest).to_quaternion()
        pb.keyframe_insert('rotation_quaternion', frame=frame)
    root = RIG.pose.bones['hips']
    root.location = root.bone.matrix_local.to_3x3().inverted() @ Vector(offset)
    root.keyframe_insert('location', frame=frame)


ACTIONS = []


def plant(frames, only_up=False):
    """Apoyo: sube o baja la raíz para que lo más bajo de la malla toque z = 0 en esos fotogramas.
    only_up: solo corrige si atraviesa el suelo (fotogramas en el aire)."""
    root = RIG.pose.bones['hips']
    rest = root.bone.matrix_local.to_3x3()
    for f in frames:
        scene.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        ev = body.evaluated_get(dg)
        me = ev.to_mesh()
        co = np.empty(len(me.vertices) * 3, np.float32)
        me.vertices.foreach_get('co', co)
        lo = float(co.reshape(-1, 3)[:, 2].min())
        ev.to_mesh_clear()
        if only_up and lo >= 0:
            continue
        world = rest @ root.location
        root.location = rest.inverted() @ (world + Vector((0, 0, -lo)))
        root.keyframe_insert('location', frame=f)


def clip(name, keys, cyclic=True, ground=None):
    """ground: 'all' o lista de fotogramas que deben quedar apoyados en el suelo."""
    RIG.animation_data_clear()
    for frame, pose, *off in keys:
        key(frame, pose, off[0] if off else (0, 0, 0))
    if ground:
        plant([k[0] for k in keys] if ground == 'all' else ground)
        if ground != 'all':                     # el resto del clip nunca atraviesa el suelo
            rest_frames = [f for f in range(keys[0][0], keys[-1][0] + 1) if f not in ground]
            plant(rest_frames, only_up=True)
    act = RIG.animation_data.action
    act.name = name
    act.use_fake_user = True
    act['loop'] = cyclic
    ACTIONS.append(act)


def mix(*poses):
    out = {}
    for p in poses:
        for k, v in p.items():
            if isinstance(v, Matrix) or isinstance(out.get(k), Matrix):
                out[k] = rot(v) @ rot(out.get(k, (0, 0, 0)))
            else:
                o = out.get(k, (0, 0, 0))
                out[k] = (o[0] + v[0], o[1] + v[1], o[2] + v[2])
    return out


# El ala está esculpida plegada contra el flanco. Para abrirla, una rotación rígida desde el
# hombro lleva el brazo (hacia atrás, +Y) a lo ancho (+X), el borde alto del ala plegada al borde
# de ataque (-Y) y la cara externa hacia abajo. S refleja para el lado derecho.
_ML = Matrix(((0, 1, 0), (0, 0, -1), (-1, 0, 0)))
_S = Matrix(((-1, 0, 0), (0, 1, 0), (0, 0, 1)))
SPREAD = {'L': _ML, 'R': _S @ _ML @ _S}


def wings(open_=0.0, up=0.0, sweep=0.0, tip=0.0):
    """open_ 0 plegada → 1 abierta; up alza (grados); sweep lleva atrás; tip dobla la punta."""
    out = {}
    for sd, s in (('L', 1), ('R', -1)):
        base = Quaternion().slerp(SPREAD[sd].to_quaternion(), open_).to_matrix()
        flap = Euler((0, math.radians(-up * s), math.radians(sweep * s))).to_matrix()
        out[f'wing_{sd}'] = flap @ base
        out[f'wingTip_{sd}'] = (0, tip * s * open_, 0) if open_ > 0 else (0, 0, 0)
        for k in range(9):                      # abanico: las de atrás bajan (atrás al abrir)
            out[f'prim_{sd}_{k}'] = (-open_ * (4 + 7.5 * k), 0, 0)
    return out


FOLD = wings(0.0)


def legs_tucked():
    return {'thigh_L': (45, 0, 0), 'shin_L': (55, 0, 0), 'foot_L': (70, 0, 0),
            'thigh_R': (45, 0, 0), 'shin_R': (55, 0, 0), 'foot_R': (70, 0, 0)}


# idle_ground: respira, gira la cabeza, alza el penacho.
clip('idle_ground', [
    (1, mix(FOLD, {})),
    (25, mix(FOLD, {'chest': (-2, 0, 0), 'neck': (3, 0, -8), 'head': (-2, 0, 14), 'crest': (-14, 0, 0), 'tail': (3, 0, 0),
                    'wing_L': (0, 2, 0), 'wing_R': (0, -2, 0)}), (0, 0, 0.015)),
    (49, mix(FOLD, {'neck': (-2, 0, 0), 'head': (4, 0, 0), 'crest': (6, 0, 0), 'tail': (0, 0, 5)})),
    (73, mix(FOLD, {'chest': (-2, 0, 0), 'neck': (3, 0, 8), 'head': (-2, 0, -16), 'crest': (-14, 0, 0), 'tail': (3, 0, 0),
                    'wing_L': (0, 2, 0), 'wing_R': (0, -2, 0)}), (0, 0, 0.015)),
    (97, mix(FOLD, {})),
], ground='all')


def stride(t, amp, bounce, lean):
    """Paso pesado de rapaz: el muslo oscila, el tarso de la pata que avanza se recoge."""
    ph = 2 * math.pi * t
    s = math.sin(ph)
    lift_L = max(0.0, math.sin(ph + math.pi / 2))
    lift_R = max(0.0, math.sin(ph - math.pi / 2))
    up = abs(math.cos(ph))
    pose = mix(FOLD, {
        'hips': (-lean, 0, 3 * s * amp / 30),
        'chest': (lean * 0.4, 0, -2 * s * amp / 30),
        'neck': (-5 * up * bounce * 10, 0, 0),
        'head': (5 * up * bounce * 10, 0, 2 * s),
        'crest': (8 * up * bounce * 10, 0, 0),
        'tail': (4 * up * bounce * 10, 0, -5 * s),
        'thigh_L': (amp * s, 0, 0), 'shin_L': (45 * lift_L, 0, 0), 'foot_L': (30 * lift_L - 6 * s, 0, 0),
        'thigh_R': (-amp * s, 0, 0), 'shin_R': (45 * lift_R, 0, 0), 'foot_R': (30 * lift_R + 6 * s, 0, 0),
    })
    for sd, sg in (('L', 1), ('R', -1)):
        pose[f'wing_{sd}'] = Euler((0, math.radians(3 * up * bounce * 10 * sg), 0)).to_matrix()
    return pose, (0, 0, bounce * up - bounce * 0.5)


clip('walk', [(1 + 2 * i, *stride(i / 16, 22, 0.04, 2)) for i in range(17)], ground='all')
clip('run', [(1 + 2 * i, *stride(i / 10, 34, 0.09, 8)) for i in range(11)], ground='all')


def flap(t, power=1.0):
    c = math.cos(2 * math.pi * t)
    return wings(1.0, up=38 * c * power, sweep=6 + 8 * max(0, c) * power, tip=(-18 * c + 6) * power)


def fly(t, power, lean, bob):
    c = math.cos(2 * math.pi * t)
    pose = mix(flap(t, power), legs_tucked(), {
        'hips': (-lean, 0, 0), 'chest': (lean * 0.4 - 3 * c, 0, 0), 'neck': (-lean * 0.4, 0, 0),
        'head': (-lean * 0.3 + 3 * c, 0, 0), 'crest': (16 + 5 * c, 0, 0), 'tail': (6 - 4 * c, 0, 0)})
    return pose, (0, 0, -bob * c)


clip('fly_idle', [(1 + 3 * i, *fly(i / 10, 0.9, 0, 0.07)) for i in range(11)])
clip('fly_forward', [(1 + 2 * i, *fly(i / 12, 1.0, 8, 0.05)) for i in range(13)])

crouch = mix(FOLD, {'hips': (-8, 0, 0), 'chest': (-6, 0, 0), 'neck': (8, 0, 0), 'head': (-6, 0, 0),
                    'thigh_L': (30, 0, 0), 'shin_L': (-40, 0, 0), 'foot_L': (20, 0, 0),
                    'thigh_R': (30, 0, 0), 'shin_R': (-40, 0, 0), 'foot_R': (20, 0, 0), 'tail': (-10, 0, 0)})
clip('takeoff', [
    (1, mix(FOLD, {})),
    (8, crouch, (0, 0, -0.06)),
    (13, mix(wings(1.0, up=60, sweep=10, tip=-12), {'hips': (10, 0, 0), 'chest': (6, 0, 0), 'head': (-8, 0, 0),
                                                  'thigh_L': (-15, 0, 0), 'thigh_R': (-15, 0, 0)}), (0, 0, 0.18)),
    (18, mix(wings(1.0, up=-40, sweep=4, tip=22), legs_tucked(), {'hips': (4, 0, 0)}), (0, 0, 0.36)),
    (23, mix(wings(1.0, up=45, sweep=14, tip=-12), legs_tucked()), (0, 0, 0.30)),
    (28, mix(wings(1.0, up=-36, sweep=4, tip=20), legs_tucked()), (0, 0, 0.12)),
    (32, fly(0, 0.9, 0, 0.07)[0], (0, 0, -0.07)),
], cyclic=False, ground=list(range(1, 12, 1)))

clip('land', [
    (1, fly(0, 0.9, 0, 0.07)[0], (0, 0, 0.6)),
    (8, mix(wings(1.0, up=18, sweep=2, tip=-6), {'hips': (14, 0, 0), 'head': (-10, 0, 0), 'thigh_L': (-25, 0, 0),
                                               'thigh_R': (-25, 0, 0), 'tail': (18, 0, 0)}), (0, 0, 0.32)),
    (14, mix(wings(1.0, up=50, sweep=-6, tip=-16), {'hips': (18, 0, 0), 'head': (-12, 0, 0), 'thigh_L': (-30, 0, 0),
                                                  'thigh_R': (-30, 0, 0), 'tail': (24, 0, 0)}), (0, 0, 0.08)),
    (18, crouch, (0, 0, -0.06)),
    (25, mix(FOLD, {'hips': (-3, 0, 0), 'chest': (-2, 0, 0), 'crest': (-10, 0, 0)}), (0, 0, -0.03)),
    (32, mix(FOLD, {})),
], cyclic=False, ground=list(range(13, 33, 1)))

# ---------------------------------------------------------------- NLA y exportación
ad = RIG.animation_data_create()
ad.action = None
for act in ACTIONS:
    tr = ad.nla_tracks.new()
    tr.name = act.name
    tr.strips.new(act.name, int(act.frame_range[0]), act)
for pb in RIG.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for o in (RIG, body, SEAT, RIDER):
    o.select_set(True)
bpy.context.view_layer.objects.active = RIG
GLB = os.path.join(ROOT, 'assets', 'models', 'aguila_arpia.glb')
bpy.ops.export_scene.gltf(filepath=GLB, export_format='GLB', use_selection=True, export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_apply=False)
print(f'RIG GLB {os.path.getsize(GLB)} bytes, {TRIS} tri, asiento z={SEAT_POS.z:.2f}, clips {[a.name for a in ACTIONS]}')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'aguila_arpia.blend'))


# ---------------------------------------------------------------- lámina de poses
def play(name, frame):
    for t in ad.nla_tracks:
        t.mute = t.name != name
    scene.frame_set(frame)


if RENDER:
    sys.path.insert(0, HERE)
    import render_lamina as L
    L.setup()
    scene.cycles.samples = 32
    cd = bpy.data.cameras.new('cam')
    cd.lens = 40
    cam = bpy.data.objects.new('cam', cd)
    scene.collection.objects.link(cam)
    scene.camera = cam
    shots = [('idle_ground', 25, 'tres'), ('walk', 9, 'perfil'), ('run', 6, 'tres'),
             ('takeoff', 13, 'tres'), ('fly_forward', 1, 'arriba'), ('fly_forward', 13, 'frente'),
             ('fly_idle', 16, 'tres'), ('land', 14, 'perfil')]
    views = {'tres': (Vector((-0.85, -0.85, 0.35)), 11.0), 'perfil': (Vector((-1, 0, 0.08)), 10.5),
             'arriba': (Vector((-0.35, 0.6, 0.9)), 11.0), 'frente': (Vector((0, -1, 0.15)), 10.0)}
    for clipname, frame, view in shots:
        play(clipname, frame)
        d, dist = views[view]
        tgt = Vector((0, 0.3, 1.6))
        d = d.normalized()
        cam.location = tgt + d * dist
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(W, f'pose_{clipname}_{frame}.png')
        bpy.ops.render.render(write_still=True)
    print('POSES ok')
