# Humanoide de geometría propia para el jugador y los PNJ: un esqueleto, siete clips y
# piezas opcionales (pelo, ropa, armas) que el juego enciende según el aspecto.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/personaje.py
# Escribe assets/models/personaje.glb. Mira hacia -Y (+Z en el juego), con los pies en z=0.
# Los materiales se llaman como los canales de la paleta: skin, cloth, trim, hair, gear.
import math
import os
import sys
import bpy
from mathutils import Euler, Matrix, Vector

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

scene = fg.reset()
SKIN = fg.material('skin', (0.8, 0.6, 0.45))
CLOTH = fg.material('cloth', (0.3, 0.3, 0.4))
TRIM = fg.material('trim', (0.6, 0.5, 0.3))
HAIR = fg.material('hair', (0.2, 0.14, 0.1))
GEAR = fg.material('gear', (0.65, 0.65, 0.68), metallic=0.2, rough=0.5)
EYES = fg.material('ojos', (0.03, 0.03, 0.04), rough=0.3)
BOOTS = fg.material('botas', (0.12, 0.075, 0.045), rough=0.8)

# Huesos: nombre, padre, cabeza, cola. La derecha del personaje es -X.
BONES = [
    ('hips', None, (0, 0, 0.82), (0, 0, 0.95)),
    ('spine', 'hips', (0, 0, 0.95), (0, 0, 1.1)),
    ('chest', 'spine', (0, 0, 1.1), (0, 0, 1.3)),
    ('head', 'chest', (0, 0, 1.3), (0, 0, 1.7)),
]
for s, x in (('L', 1), ('R', -1)):
    BONES += [
        (f'upperArm{s}', 'chest', (0.2 * x, 0, 1.27), (0.25 * x, 0, 1.03)),
        (f'foreArm{s}', f'upperArm{s}', (0.25 * x, 0, 1.03), (0.27 * x, -0.03, 0.82)),
        (f'hand{s}', f'foreArm{s}', (0.27 * x, -0.03, 0.82), (0.27 * x, -0.05, 0.74)),
        (f'thigh{s}', 'hips', (0.09 * x, 0, 0.82), (0.1 * x, 0, 0.46)),
        (f'shin{s}', f'thigh{s}', (0.1 * x, 0, 0.46), (0.1 * x, 0, 0.09)),
        (f'foot{s}', f'shin{s}', (0.1 * x, 0, 0.09), (0.1 * x, -0.15, 0.03)),
    ]

arm_data = bpy.data.armatures.new('Esqueleto')
rig = bpy.data.objects.new('FG_Personaje', arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, parent, head, tail in BONES:
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = head, tail
    if parent:
        b.parent = arm_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')

parts = []


def part(builder):
    o = builder.object(scene, parent=rig)
    mod = o.modifiers.new('Esqueleto', 'ARMATURE')
    mod.object = rig
    parts.append(o)
    return o


# Cuerpo.
b = fg.Builder('Cuerpo')
b.tube((0, 0, 0.8), (0, 0, 0.98), 0.17, 0.16, CLOTH, 'hips', sides=8, flat=0.72)
b.tube((0, 0, 0.98), (0, 0, 1.12), 0.16, 0.18, CLOTH, 'spine', sides=8, flat=0.72)
b.tube((0, 0, 1.12), (0, 0, 1.32), 0.18, 0.2, CLOTH, 'chest', sides=8, flat=0.7)
b.box((0, 0, 0.95), (0.35, 0.25, 0.045), TRIM, 'hips')
b.box((0, -0.14, 0.95), (0.08, 0.02, 0.07), GEAR, 'hips')
b.tube((0, 0, 1.3), (0, 0, 1.37), 0.05, 0.05, SKIN, 'head', sides=6)
b.blob((0, 0, 1.51), (0.15, 0.15, 0.17), SKIN, 'head')
for x in (-0.055, 0.055):
    b.blob((x, -0.135, 1.53), (0.021, 0.012, 0.03), EYES, 'head', subdiv=1)
b.blob((0, -0.15, 1.47), (0.018, 0.02, 0.022), SKIN, 'head', subdiv=1)
for s, x in (('L', 1), ('R', -1)):
    b.blob((0.2 * x, 0, 1.28), (0.075, 0.075, 0.07), TRIM, f'upperArm{s}', subdiv=1)
    b.tube((0.2 * x, 0, 1.27), (0.25 * x, 0, 1.03), 0.058, 0.048, CLOTH, f'upperArm{s}', sides=6)
    b.tube((0.25 * x, 0, 1.05), (0.27 * x, -0.03, 0.84), 0.046, 0.038, SKIN, f'foreArm{s}', sides=6)
    b.tube((0.255 * x, -0.01, 0.96), (0.27 * x, -0.03, 0.86), 0.05, 0.046, TRIM, f'foreArm{s}', sides=6)
    b.blob((0.27 * x, -0.04, 0.79), (0.045, 0.045, 0.055), SKIN, f'hand{s}', subdiv=1)
    b.tube((0.09 * x, 0, 0.84), (0.1 * x, 0, 0.46), 0.08, 0.058, CLOTH, f'thigh{s}', sides=6)
    b.tube((0.1 * x, 0, 0.48), (0.1 * x, 0, 0.1), 0.058, 0.045, TRIM, f'shin{s}', sides=6)
    b.box((0.1 * x, -0.05, 0.05), (0.1, 0.25, 0.1), BOOTS, f'foot{s}')
part(b)

# Pelo y cabeza.
b = fg.Builder('Pelo_corto')
b.blob((0, 0.025, 1.58), (0.158, 0.152, 0.125), HAIR, 'head')
part(b)
b = fg.Builder('Pelo_largo')
b.blob((0, 0.025, 1.58), (0.16, 0.155, 0.125), HAIR, 'head')
b.tube((0, 0.1, 1.56), (0, 0.13, 1.2), 0.12, 0.07, HAIR, 'head', sides=6, flat=0.55)
part(b)
b = fg.Builder('Barba')
b.tube((0, -0.09, 1.45), (0, -0.14, 1.3), 0.09, 0.03, HAIR, 'head', sides=6, flat=0.6)
part(b)
b = fg.Builder('Capucha')
b.blob((0, 0.03, 1.56), (0.18, 0.18, 0.2), CLOTH, 'head')
b.tube((0, 0.1, 1.45), (0, 0.17, 1.28), 0.14, 0.05, CLOTH, 'chest', sides=6, flat=0.6)
part(b)
b = fg.Builder('Yelmo')
b.blob((0, 0.01, 1.57), (0.172, 0.172, 0.15), GEAR, 'head')
b.box((0, -0.13, 1.53), (0.05, 0.05, 0.16), GEAR, 'head')
part(b)
b = fg.Builder('Banda')
b.tube((0, 0, 1.56), (0, 0, 1.6), 0.16, 0.16, TRIM, 'head', sides=10)
part(b)

# Ropa por capas.
b = fg.Builder('Tunica')
b.tube((0, 0, 0.97), (0, 0, 0.42), 0.19, 0.3, CLOTH, 'hips', sides=8, flat=0.78)
b.tube((0, 0, 0.45), (0, 0, 0.4), 0.3, 0.31, TRIM, 'hips', sides=8, flat=0.78)
part(b)
b = fg.Builder('Mandil')
b.box((0, -0.155, 0.85), (0.27, 0.02, 0.62), TRIM, 'hips')
part(b)
b = fg.Builder('Armadura')
b.tube((0, 0, 1.08), (0, 0, 1.33), 0.195, 0.22, GEAR, 'chest', sides=8, flat=0.74)
for x in (-1, 1):
    b.blob((0.23 * x, 0, 1.31), (0.1, 0.11, 0.075), GEAR, 'chest', subdiv=1)
part(b)
b = fg.Builder('Capa')
b.poly([(-0.17, 0.14, 1.33), (0.17, 0.14, 1.33), (0.17, 0.16, 1.33), (-0.17, 0.16, 1.33)], [(-0.27, 0.25, 0.42), (0.27, 0.25, 0.42), (0.27, 0.28, 0.42), (-0.27, 0.28, 0.42)], CLOTH, 'chest')
part(b)

# Armas en la mano derecha; rodela y escudo en la izquierda.
H = (-0.27, -0.05, 0.79)
b = fg.Builder('Arma_espada')
b.box((H[0], H[1] - 0.09, H[2]), (0.03, 0.2, 0.03), HAIR, 'handR')
b.box((H[0], H[1] - 0.2, H[2]), (0.17, 0.03, 0.03), GEAR, 'handR')
b.box((H[0], H[1] - 0.58, H[2]), (0.06, 0.74, 0.016), GEAR, 'handR')
part(b)
b = fg.Builder('Arma_baston')
b.tube((H[0], H[1], H[2] - 0.6), (H[0], H[1], H[2] + 0.85), 0.018, 0.024, TRIM, 'handR', sides=5)
b.blob((H[0], H[1], H[2] + 0.92), (0.06, 0.06, 0.08), GEAR, 'handR', subdiv=1)
part(b)
b = fg.Builder('Arma_arco')
LH = (0.27, -0.05, 0.79)
prev = None
for i in range(9):
    t = -1 + i / 4
    p = (LH[0], LH[1] - 0.14 * (1 - t * t), LH[2] + t * 0.6)
    if prev:
        b.tube(prev, p, 0.016, 0.016, TRIM, 'handL', sides=4)
    prev = p
b.tube((LH[0], LH[1], LH[2] - 0.6), (LH[0], LH[1], LH[2] + 0.6), 0.003, 0.003, GEAR, 'handL', sides=3)
part(b)
b = fg.Builder('Escudo')
b.tube((LH[0] + 0.05, LH[1], LH[2] + 0.1), (LH[0] + 0.09, LH[1], LH[2] + 0.1), 0.26, 0.22, TRIM, 'handL', sides=8)
b.tube((LH[0] + 0.09, LH[1], LH[2] + 0.1), (LH[0] + 0.12, LH[1], LH[2] + 0.1), 0.08, 0.05, GEAR, 'handL', sides=6)
part(b)

# Pose por huesos, en grados sobre los ejes del personaje: X negativo lleva pierna o brazo hacia delante.
pose_bones = rig.pose.bones
for pb in pose_bones:
    pb.rotation_mode = 'QUATERNION'


def apply_pose(frame, pose, offset=(0, 0, 0)):
    for pb in pose_bones:
        rest = pb.bone.matrix_local.to_3x3()
        d = pose.get(pb.name, (0, 0, 0))
        r = Euler([math.radians(v) for v in d]).to_matrix()
        pb.rotation_quaternion = (rest.inverted() @ r @ rest).to_quaternion()
        pb.keyframe_insert('rotation_quaternion', frame=frame)
    hips = pose_bones['hips']
    hips.location = hips.bone.matrix_local.to_3x3().inverted() @ Vector(offset)
    hips.keyframe_insert('location', frame=frame)


def clip(name, keys):
    rig.animation_data_clear()
    for frame, pose, *off in keys:
        apply_pose(frame, pose, off[0] if off else (0, 0, 0))
    act = rig.animation_data.action
    act.name = name
    act.use_fake_user = True
    return act


ARMS = {'upperArmL': (0, 12, 0), 'upperArmR': (0, -12, 0), 'foreArmL': (-22, 0, 0), 'foreArmR': (-22, 0, 0)}


def p(**kw):
    return {**ARMS, **kw}


def stride(sign):
    """Medio paso: pierna derecha adelante con sign=1."""
    return {
        'hips': (6, 0, 5 * sign), 'spine': (5, 0, -3 * sign), 'chest': (3, 0, -7 * sign),
        'thighR': (-36 * sign, 0, 0), 'shinR': (12 if sign > 0 else 62, 0, 0), 'footR': (-6 if sign > 0 else 18, 0, 0),
        'thighL': (36 * sign, 0, 0), 'shinL': (62 if sign > 0 else 12, 0, 0), 'footL': (18 if sign > 0 else -6, 0, 0),
        'upperArmR': (30 * sign, -10, 0), 'foreArmR': (-46, 0, 0),
        'upperArmL': (-30 * sign, 10, 0), 'foreArmL': (-46, 0, 0),
    }


def passing(sign):
    """Pierna que apoya recta, la otra pasa doblada: el cuerpo sube."""
    return {
        'hips': (6, 0, 0), 'spine': (5, 0, 0), 'chest': (3, 0, 0),
        'thighR': (-6 * sign, 0, 0), 'shinR': (8 if sign > 0 else 72, 0, 0),
        'thighL': (6 * sign, 0, 0), 'shinL': (72 if sign > 0 else 8, 0, 0),
        'upperArmR': (0, -10, 0), 'foreArmR': (-46, 0, 0),
        'upperArmL': (0, 10, 0), 'foreArmL': (-46, 0, 0),
    }


actions = [
    clip('Reposo', [
        (1, p(chest=(0, 0, 0), head=(0, 0, 0))),
        (31, p(chest=(-2.5, 0, 0), head=(2, 5, 0), upperArmL=(0, 14, 0), upperArmR=(0, -14, 0)), (0, 0, -0.008)),
        (61, p(chest=(0, 0, 0), head=(0, 0, 0))),
    ]),
    clip('Correr', [
        (1, stride(1), (0, 0, -0.02)),
        (6, passing(1), (0, 0, 0.03)),
        (11, stride(-1), (0, 0, -0.02)),
        (16, passing(-1), (0, 0, 0.03)),
        (21, stride(1), (0, 0, -0.02)),
    ]),
    clip('Atacar', [
        (1, p()),
        (8, p(chest=(0, 0, 28), spine=(0, 0, 10), upperArmR=(-140, -25, 0), foreArmR=(-50, 0, 0), thighR=(10, 0, 0), thighL=(-12, 0, 0), shinL=(10, 0, 0)), (0, 0, -0.02)),
        (12, p(chest=(14, 0, -32), spine=(8, 0, -12), upperArmR=(-50, -8, 0), foreArmR=(-12, 0, 0), thighR=(-26, 0, 0), shinR=(16, 0, 0), thighL=(14, 0, 0), shinL=(18, 0, 0)), (0, -0.05, -0.05)),
        (16, p(chest=(10, 0, -20), upperArmR=(-30, -6, 0), foreArmR=(-20, 0, 0), thighR=(-20, 0, 0), shinR=(14, 0, 0), thighL=(12, 0, 0), shinL=(14, 0, 0)), (0, -0.04, -0.04)),
        (24, p()),
    ]),
    clip('Lanzar', [
        (1, p()),
        (9, p(chest=(-14, 0, 0), head=(-8, 0, 0), upperArmR=(-120, -18, 0), upperArmL=(-120, 18, 0), foreArmR=(-40, 0, 0), foreArmL=(-40, 0, 0)), (0, 0.02, 0)),
        (14, p(chest=(14, 0, 0), head=(6, 0, 0), upperArmR=(-88, -6, 0), upperArmL=(-88, 6, 0), foreArmR=(-6, 0, 0), foreArmL=(-6, 0, 0), thighR=(-18, 0, 0), shinR=(10, 0, 0), thighL=(10, 0, 0), shinL=(10, 0, 0)), (0, -0.04, -0.03)),
        (20, p(chest=(8, 0, 0), upperArmR=(-70, -6, 0), upperArmL=(-70, 6, 0), foreArmR=(-14, 0, 0), foreArmL=(-14, 0, 0))),
        (27, p()),
    ]),
    clip('Rodar', [
        (1, p(), (0, 0, 0)),
        (4, p(hips=(-60, 0, 0), spine=(-30, 0, 0), chest=(-20, 0, 0), thighR=(-90, 0, 0), thighL=(-90, 0, 0), shinR=(110, 0, 0), shinL=(110, 0, 0)), (0, -0.25, -0.35)),
        (9, p(hips=(-180, 0, 0), spine=(-30, 0, 0), chest=(-20, 0, 0), thighR=(-100, 0, 0), thighL=(-100, 0, 0), shinR=(120, 0, 0), shinL=(120, 0, 0)), (0, -0.7, -0.4)),
        (14, p(hips=(-300, 0, 0), spine=(-20, 0, 0), thighR=(-80, 0, 0), thighL=(-80, 0, 0), shinR=(100, 0, 0), shinL=(100, 0, 0)), (0, -1.1, -0.35)),
        (19, p(hips=(-360, 0, 0)), (0, -1.3, 0)),
    ]),
    clip('Golpeado', [
        (1, p()),
        (4, p(chest=(-22, 0, 8), spine=(-8, 0, 0), head=(-14, 0, 0), upperArmR=(12, -35, 0), upperArmL=(12, 35, 0)), (0, 0.05, -0.02)),
        (13, p()),
    ]),
    clip('Morir', [
        (1, p()),
        (6, p(chest=(-26, 0, 0), head=(-16, 0, 0), upperArmR=(-30, -40, 0), upperArmL=(-30, 40, 0), thighR=(-14, 0, 0), shinR=(20, 0, 0)), (0, 0.06, -0.05)),
        (16, p(hips=(-52, 0, 0), chest=(-10, 0, 0), head=(-10, 0, 0), upperArmR=(-60, -55, 0), upperArmL=(-60, 55, 0), thighR=(-30, 0, 0), thighL=(-15, 0, 0), shinR=(50, 0, 0), shinL=(35, 0, 0)), (0, 0.25, -0.42)),
        (26, p(hips=(-88, 0, 0), head=(-6, 8, 0), upperArmR=(-60, -80, 0), upperArmL=(-60, 80, 0), foreArmR=(0, 0, 0), foreArmL=(0, 0, 0), thighR=(-8, 0, 0), thighL=(-4, 0, 0), shinR=(10, 0, 0), shinL=(6, 0, 0)), (0, 0.45, -0.72)),
        (31, p(hips=(-90, 0, 0), head=(-4, 10, 0), upperArmR=(-60, -80, 0), upperArmL=(-60, 80, 0), foreArmR=(0, 0, 0), foreArmL=(0, 0, 0)), (0, 0.45, -0.73)),
    ]),
]
fg.to_tracks(rig, actions)
for pb in pose_bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)

fg.export('personaje.glb', scene, [rig, *parts])
