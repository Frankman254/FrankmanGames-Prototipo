# Rig y clips de la Falcopama montable (MOD-02a).
# Lee work/omp-mod02/falcopama_piezas.blend (piezas bajas con UV y atlas de bake_falcopama.py),
# pesa cada pieza a sus huesos — el ala lleva hombro (wing), codo/muñeca (wingTip) y un hueso por
# pluma para el abanico —, une la piel, añade anclajes mount_seat / rider_root sobre la silla y
# los siete clips del contrato de monturas. Exporta assets/models/falcopama.glb y guarda
# arte/blender/falcopama.blend. Con --render genera poses y láminas en work/omp-mod02/.
# Blender -b --factory-startup --python scripts/blender/falcopama/rig_falcopama.py -- [--render]
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Euler, Matrix, Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
WORK = os.path.join(ROOT, 'work', 'omp-mod02')
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'blender', 'aguila_arpia'))
import falcopama as F  # noqa: E402  (paleta, puntos clave H, B, seat)

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = '--render' in ARGS
V = Vector
R = math.radians

bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, 'falcopama_piezas.blend'))
scene = bpy.context.scene
scene.render.fps = 24
# Las imágenes horneadas quedan sin usuarios en el blend de piezas y se purgan al guardar:
# se recargan desde el PNG (método de rig_arpia.py) y se empaquetan.
for kind, noncolor in (('color', False), ('normal', True)):
    nm = f'falcopama_{kind}'
    if nm not in bpy.data.images:
        img = bpy.data.images.load(os.path.join(WORK, f'{nm}.png'))
        img.name = nm
        img.pack()
    if noncolor:
        bpy.data.images[nm].colorspace_settings.name = 'Non-Color'

# ---------------------------------------------------------------- esqueleto (mira a -Y, +Z arriba)
# Geometría de referencia: cabeza H=(0,-0.50,1.30) r≈0.40; cuerpo B=(0,0.10,0.92) r≈0.49;
# hombro SHOULDER=(±0.40,-0.12,1.12); raíz de cola (0,0.66,1.06); muslo top (±0.24,-0.04,0.56),
# tobillo (±0.26,-0.10,0.12); silla seat_z ≈ 1.333.
BONES = [
    ('hips', None, (0, 0.55, 1.06), (0, 0.05, 1.14)),
    ('chest', 'hips', (0, 0.05, 1.14), (0, -0.34, 1.26)),
    ('neck', 'chest', (0, -0.34, 1.26), (0, -0.46, 1.42)),
    ('head', 'neck', (0, -0.46, 1.42), (0, -0.92, 1.22)),
    ('tail', 'hips', (0, 0.66, 1.06), (0, 0.90, 1.42)),
    ('tailTip', 'tail', (0, 0.90, 1.42), (0, 1.30, 1.97)),
]
for side, s in (('L', 1), ('R', -1)):
    sh = V((F.SHOULDER.x * s, F.SHOULDER.y, F.SHOULDER.z))
    arm_dir = V((0.305, 0.845, 0.440))            # eje medio del manojo de plumas plegadas
    BONES += [
        (f'wing_{side}', 'chest', tuple(sh), tuple(sh + arm_dir * 0.45)),
        (f'wingTip_{side}', f'wing_{side}', tuple(sh + arm_dir * 0.45), tuple(sh + arm_dir * 1.05)),
        (f'thigh_{side}', 'hips', (0.24 * s, -0.04, 0.62), (0.25 * s, -0.07, 0.30)),
        (f'shin_{side}', f'thigh_{side}', (0.25 * s, -0.07, 0.30), (0.26 * s, -0.10, 0.12)),
        (f'foot_{side}', f'shin_{side}', (0.26 * s, -0.10, 0.12), (0.26 * s, -0.32, 0.045)),
    ]
    # una pluma larga, un hueso: el ala abierta se despliega en abanico (hueso leído de la pieza)
    for k in range(8):
        p = scene.objects.get(f'ala_{side}{k}_low')
        BONES += [(f'prim_{side}_{k}', f'wingTip_{side}', V(p['bone_h']), V(p['bone_t']))]
SEG = {b: (np.array(h), np.array(t)) for b, _, h, t in BONES}

arm = bpy.data.armatures.new('falcopama_huesos')
RIG = bpy.data.objects.new('falcopama_rig', arm)
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


HEADY = ('ojo_', 'parpado_', 'corona_', 'antifaz_', 'mejilla_', 'barbilla', 'pico', 'mandibula',
         'bozal', 'argolla_')


def candidates(name, co):
    """Huesos candidatos por pieza, con máscaras que impiden arrastrar lo ajeno."""
    one = np.ones(len(co))
    side = np.where(co[:, 0] >= 0, 'L', 'R')
    if name.startswith(HEADY):
        return {'head': one}
    if name.startswith('ala_'):
        sd, k = name.split('_')[1][0], int(name.split('_')[1][1:])
        return {f'prim_{sd}_{k}': one}
    if name.startswith('cobertora_'):
        sd = name.split('_')[1][0]
        return {f'wing_{sd}': one, f'wingTip_{sd}': one}
    if name.startswith('cola_tallo'):
        return {'tail': one}
    if name.startswith('cola_penacho'):
        return {'tail': one, 'tailTip': one}
    if name.startswith(('tarso_', 'dedo_', 'garra_', 'pantalon_')):
        up = np.clip((co[:, 2] - 0.50) / 0.15, 0, 1)          # el pantalón alto tira del muslo
        out = {}
        for sd in ('L', 'R'):
            m = (side == sd).astype(float)
            out[f'thigh_{sd}'] = m * up
            out[f'shin_{sd}'] = m
            out[f'foot_{sd}'] = m
        return out
    if name.startswith(('rienda_',)):
        return {'head': one, 'chest': one, 'hips': one}
    if name.startswith(('silla_', 'alforja')):
        neckm = np.clip((co[:, 1] + 0.35) / -0.25, 0, 1)      # el frente de la manta roza el pecho
        return {'hips': one, 'chest': neckm,
                'tail': np.clip((co[:, 1] - 0.42) / 0.18, 0, 1)}
    # cuerpo y plumón: cadera, pecho, cuello hacia la cabeza, cola atrás y muslos abajo
    thigh = (1 - np.clip((co[:, 2] - 0.48) / 0.22, 0, 1)) * np.clip((np.abs(co[:, 0]) - 0.08) / 0.16, 0, 1)
    neckm = np.clip((co[:, 2] - 1.35) / 0.25, 0, 1) * np.clip((co[:, 1] + 0.20) / -0.25, 0, 1)
    return {'hips': one, 'chest': one, 'neck': neckm, 'head': neckm * 0.6,
            'tail': np.clip((co[:, 1] - 0.55) / 0.18, 0, 1),
            'thigh_L': thigh * (side == 'L'), 'thigh_R': thigh * (side == 'R')}


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

# asiento: punto más alto del cojín
seat_ob = next(o for o in lows if o.name.startswith('silla_asiento'))
sz = max((seat_ob.matrix_world @ v.co).z for v in seat_ob.data.vertices)
SEAT_POS = Vector((0, 0.10, sz + 0.02))

# una sola piel con materiales por región; el atlas horneado se comparte
bpy.ops.object.select_all(action='DESELECT')
for o in lows:
    o.select_set(True)
bpy.context.view_layer.objects.active = lows[0]
bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
body.name = body.data.name = 'falcopama'
REGION_SET = {f'montura_{r}' for r in F.REGIONES}


def atlas_material(name, metallic=0.0, rough=0.62):
    m = bpy.data.materials.get(name)
    if m and m.users == 0:                       # el datablock homónimo del esculpido ya no tiene dueños
        bpy.data.materials.remove(m)
        m = None
    if not m:
        m = bpy.data.materials.new(name)
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tc, tn = nt.nodes.new('ShaderNodeTexImage'), nt.nodes.new('ShaderNodeTexImage')
    tc.image, tn.image = bpy.data.images['falcopama_color'], bpy.data.images['falcopama_normal']
    nmap = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(tn.outputs['Color'], nmap.inputs['Color'])
    nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metallic
    return m


old_names = [m.name for m in body.data.materials]
old_idx = [p.material_index for p in body.data.polygons]   # clear() pondría todos a 0
slots, index_of = [], {}
for n in old_names:
    base = n.split('.')[0]
    key = base if base in REGION_SET else 'falcopama_atlas'   # ojos y rollo: color ya horneado
    if key not in index_of:
        if key == 'falcopama_atlas':
            m = atlas_material(key)
        else:
            reg = key[len('montura_'):]
            m = atlas_material(key, metallic=0.6 if reg == 'herrajes' else 0.0,
                               rough=0.35 if reg == 'herrajes' else 0.62)
        index_of[key] = len(slots)
        slots.append(m)
new_for_old = [index_of[n.split('.')[0] if n.split('.')[0] in REGION_SET else 'falcopama_atlas']
               for n in old_names]
body.data.materials.clear()
for m in slots:
    body.data.materials.append(m)
for p, i in zip(body.data.polygons, old_idx):
    p.material_index = new_for_old[min(i, len(new_for_old) - 1)]
body.parent = RIG
body.modifiers.new('Huesos', 'ARMATURE').object = RIG
TRIS = sum(len(p.vertices) - 2 for p in body.data.polygons)
# puntera de cada pie: los vértices más delanteros del grupo foot (para el paso sin patinaje)
_gi = {g.name: i for i, g in enumerate(body.vertex_groups)}
_co = np.empty(len(body.data.vertices) * 3, np.float32)
body.data.vertices.foreach_get('co', _co)
_co = _co.reshape(-1, 3)
TIP = {}
for _sd in ('L', 'R'):
    _w = np.zeros(len(body.data.vertices))
    for _v in body.data.vertices:
        for _g in _v.groups:
            if _g.group == _gi[f'foot_{_sd}']:
                _w[_v.index] = _g.weight
    _idx = np.nonzero(_w > 0.5)[0]
    TIP[_sd] = _idx[np.argsort(_co[_idx][:, 1])[:max(8, len(_idx) // 4)]]


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


def lowest():
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    lo = float(co.reshape(-1, 3)[:, 2].min())
    ev.to_mesh_clear()
    return lo


def plant(frames, only_up=False):
    """Apoyo: sube o baja la raíz para que lo más bajo de la malla toque z = 0 en esos fotogramas.
    only_up: solo corrige si atraviesa el suelo (fotogramas en el aire)."""
    root = RIG.pose.bones['hips']
    rest = root.bone.matrix_local.to_3x3()
    for f in frames:
        scene.frame_set(f)
        lo = lowest()
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
        gf = [k[0] for k in keys] if ground == 'all' else ground
        plant(gf)
        if ground != 'all':                     # el resto del clip nunca atraviesa el suelo
            rest_frames = [f for f in range(keys[0][0], keys[-1][0] + 1) if f not in gf]
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


# El ala está esculpida plegada contra el flanco: el manojo de plumas va hacia arriba y atrás,
# eje medio (±0.305, 0.845, 0.440). Al abrir, ese eje debe ir a lo ancho (±X) con el borde de
# ataque hacia −Y y el dorso hacia arriba: rotación mínima del eje del hueso al eje extendido,
# más un diedro de ±14° alrededor del eje extendido.
def _spread(side):
    """Matriz 3×3 que lleva el ala de plegada a extendida."""
    s = 1.0 if side == 'L' else -1.0
    u = V((0.305 * s, 0.845, 0.440)).normalized()            # eje del hueso (hombro→codo)
    t = V((1.0 * s, -0.18, 0.10)).normalized()               # ala extendida: ancha, algo adelante
    aa = u.rotation_difference(t)
    tilt = Quaternion(t, math.radians(-14 * s))              # dorso hacia arriba al extender
    return (tilt @ aa).to_matrix()


SPREAD = {'L': _spread('L'), 'R': _spread('R')}


def wings(open_=0.0, up=0.0, sweep=0.0, tip=0.0):
    """open_ 0 plegada → 1 abierta; up alza (grados); sweep lleva atrás; tip dobla la punta."""
    out = {}
    for sd, s in (('L', 1), ('R', -1)):
        base = Quaternion().slerp(SPREAD[sd].to_quaternion(), open_).to_matrix()
        flap = Euler((0, math.radians(-up * s), math.radians(sweep * s))).to_matrix()
        out[f'wing_{sd}'] = flap @ base
        out[f'wingTip_{sd}'] = (0, tip * s * open_, 0) if open_ > 0 else (0, 0, 0)
        for k in range(8):                      # abanico: las de atrás bajan (atrás al abrir)
            out[f'prim_{sd}_{k}'] = (-open_ * (5 + 8.5 * k), 0, 0)
    return out


FOLD = wings(0.0)


def legs_tucked():
    return {'thigh_L': (50, 0, 0), 'shin_L': (60, 0, 0), 'foot_L': (60, 0, 0),
            'thigh_R': (50, 0, 0), 'shin_R': (60, 0, 0), 'foot_R': (60, 0, 0)}


# idle_ground: respira, gira la cabeza, mueve la cola.
clip('idle_ground', [
    (1, mix(FOLD, {})),
    (25, mix(FOLD, {'chest': (-2, 0, 0), 'neck': (3, 0, -7), 'head': (-2, 0, 12), 'tail': (3, 0, 0),
                    'wing_L': (0, 2, 0), 'wing_R': (0, -2, 0)}), (0, 0, 0.012)),
    (49, mix(FOLD, {'neck': (-2, 0, 0), 'head': (4, 0, 0), 'tail': (0, 0, 5)})),
    (73, mix(FOLD, {'chest': (-2, 0, 0), 'neck': (3, 0, 7), 'head': (-2, 0, -14), 'tail': (3, 0, 0),
                    'wing_L': (0, 2, 0), 'wing_R': (0, -2, 0)}), (0, 0, 0.012)),
    (97, mix(FOLD, {})),
], ground='all')


def stride(t, amp, bounce, lean):
    """Paso de ave: el muslo oscila, el tarso de la pata que avanza se recoge; cabeza en compás."""
    ph = 2 * math.pi * t
    s = math.sin(ph)
    lift_L = max(0.0, math.sin(ph + math.pi / 2))
    lift_R = max(0.0, math.sin(ph - math.pi / 2))
    up = abs(math.cos(ph))
    pose = mix(FOLD, {
        'hips': (-lean, 0, 3 * s * amp / 30),
        'chest': (lean * 0.4, 0, -2 * s * amp / 30),
        'neck': (-8 * up * bounce * 10, 0, 0),
        'head': (8 * up * bounce * 10, 0, 2 * s),
        'tail': (5 * up * bounce * 10, 0, -4 * s),
        'thigh_L': (amp * s, 0, 0), 'shin_L': (50 * lift_L, 0, 0), 'foot_L': (28 * lift_L - 6 * s, 0, 0),
        'thigh_R': (-amp * s, 0, 0), 'shin_R': (50 * lift_R, 0, 0), 'foot_R': (28 * lift_R + 6 * s, 0, 0),
    })
    for sd, sg in (('L', 1), ('R', -1)):
        pose[f'wing_{sd}'] = Euler((0, math.radians(2.5 * up * bounce * 10 * sg), 0)).to_matrix()
    return pose, (0, 0, bounce * up - bounce * 0.5)


clip('walk', [(1 + 2 * i, *stride(i / 16, 24, 0.035, 3)) for i in range(17)], ground='all')
clip('run', [(1 + 2 * i, *stride(i / 10, 38, 0.08, 10)) for i in range(11)], ground='all')


def flap(t, power=1.0):
    c = math.cos(2 * math.pi * t)
    return wings(1.0, up=36 * c * power, sweep=6 + 8 * max(0, c) * power, tip=(-16 * c + 6) * power)


def fly(t, power, lean, bob):
    c = math.cos(2 * math.pi * t)
    pose = mix(flap(t, power), legs_tucked(), {
        'hips': (-lean, 0, 0), 'chest': (lean * 0.4 - 3 * c, 0, 0), 'neck': (-lean * 0.4, 0, 0),
        'head': (-lean * 0.3 + 3 * c, 0, 0), 'tail': (6 - 4 * c, 0, 0)})
    return pose, (0, 0, -bob * c)


clip('fly_idle', [(1 + 3 * i, *fly(i / 10, 0.9, 0, 0.06)) for i in range(11)])
clip('fly_forward', [(1 + 2 * i, *fly(i / 12, 1.0, 8, 0.05)) for i in range(13)])

crouch = mix(FOLD, {'hips': (-8, 0, 0), 'chest': (-6, 0, 0), 'neck': (8, 0, 0), 'head': (-6, 0, 0),
                    'thigh_L': (32, 0, 0), 'shin_L': (-38, 0, 0), 'foot_L': (18, 0, 0),
                    'thigh_R': (32, 0, 0), 'shin_R': (-38, 0, 0), 'foot_R': (18, 0, 0),
                    'tail': (-10, 0, 0)})
clip('takeoff', [
    (1, mix(FOLD, {})),
    (8, crouch, (0, 0, -0.06)),
    (13, mix(wings(1.0, up=58, sweep=10, tip=-10), {'hips': (10, 0, 0), 'chest': (6, 0, 0),
                                                    'head': (-8, 0, 0), 'thigh_L': (-15, 0, 0),
                                                    'thigh_R': (-15, 0, 0)}), (0, 0, 0.16)),
    (18, mix(wings(1.0, up=-38, sweep=4, tip=20), legs_tucked(), {'hips': (4, 0, 0)}), (0, 0, 0.34)),
    (23, mix(wings(1.0, up=42, sweep=14, tip=-10), legs_tucked()), (0, 0, 0.28)),
    (28, mix(wings(1.0, up=-34, sweep=4, tip=18), legs_tucked()), (0, 0, 0.10)),
    (32, fly(0, 0.9, 0, 0.06)[0], (0, 0, -0.06)),
], cyclic=False, ground=list(range(1, 12, 1)))

clip('land', [
    (1, fly(0, 0.9, 0, 0.06)[0], (0, 0, 0.6)),
    (8, mix(wings(1.0, up=18, sweep=2, tip=-6), {'hips': (14, 0, 0), 'head': (-10, 0, 0),
                                                 'thigh_L': (-25, 0, 0), 'thigh_R': (-25, 0, 0),
                                                 'tail': (18, 0, 0)}), (0, 0, 0.32)),
    (14, mix(wings(1.0, up=50, sweep=-6, tip=-14), {'hips': (18, 0, 0), 'head': (-12, 0, 0),
                                                    'thigh_L': (-30, 0, 0), 'thigh_R': (-30, 0, 0),
                                                    'tail': (24, 0, 0)}), (0, 0, 0.06)),
    (18, crouch, (0, 0, -0.05)),
    (25, mix(FOLD, {'hips': (-3, 0, 0), 'chest': (-2, 0, 0)}), (0, 0, -0.02)),
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
GLB = os.path.join(ROOT, 'assets', 'models', 'falcopama.glb')
bpy.ops.export_scene.gltf(filepath=GLB, export_format='GLB', use_selection=True, export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_apply=False)
print(f'RIG GLB {os.path.getsize(GLB)} bytes, {TRIS} tri, asiento z={SEAT_POS.z:.2f}, '
      f'clips {[a.name for a in ACTIONS]}')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'falcopama.blend'))

# ---------------------------------------------------------------- lámina de poses
def play(name, frame):
    for t in ad.nla_tracks:
        t.mute = t.name != name
    scene.frame_set(frame)


if RENDER:
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
    views = {'tres': (Vector((-0.85, -0.85, 0.35)), 9.5), 'perfil': (Vector((-1, 0, 0.08)), 9.0),
             'arriba': (Vector((-0.35, 0.6, 0.9)), 10.5), 'frente': (Vector((0, -1, 0.15)), 9.0)}
    for clipname, frame, view in shots:
        play(clipname, frame)
        d, dist = views[view]
        tgt = Vector((0, 0.1, 1.3))
        d = d.normalized()
        cam.location = tgt + d * dist
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(WORK, f'pose_{clipname}_{frame}.png')
        bpy.ops.render.render(write_still=True)
    print('POSES ok')



