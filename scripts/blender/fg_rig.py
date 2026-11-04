# Esqueleto, poses y clips comunes de los personajes con huesos.
# Las poses son grados sobre los ejes del modelo (mira a -Y, z arriba): X negativo lleva
# una pierna o un brazo hacia delante. Solo se indica lo que se aparta del reposo.
import math
import bpy
from mathutils import Euler, Vector

import fg


class Rig:
    def __init__(self, scene, name, bones):
        self.scene = scene
        self.parts = []
        arm = bpy.data.armatures.new(f'{name}_huesos')
        self.obj = bpy.data.objects.new(name, arm)
        scene.collection.objects.link(self.obj)
        bpy.context.view_layer.objects.active = self.obj
        bpy.ops.object.mode_set(mode='EDIT')
        for bone, parent, head, tail in bones:
            b = arm.edit_bones.new(bone)
            b.head, b.tail = head, tail
            if parent:
                b.parent = arm.edit_bones[parent]
        bpy.ops.object.mode_set(mode='OBJECT')
        self.pose = self.obj.pose.bones
        for pb in self.pose:
            pb.rotation_mode = 'QUATERNION'
        self.root = bones[0][0]
        self.actions = []

    def part(self, builder):
        o = builder.object(self.scene, parent=self.obj)
        o.modifiers.new('Huesos', 'ARMATURE').object = self.obj
        self.parts.append(o)
        return o

    def _key(self, frame, pose, offset):
        for pb in self.pose:
            rest = pb.bone.matrix_local.to_3x3()
            r = Euler([math.radians(v) for v in pose.get(pb.name, (0, 0, 0))]).to_matrix()
            pb.rotation_quaternion = (rest.inverted() @ r @ rest).to_quaternion()
            pb.keyframe_insert('rotation_quaternion', frame=frame)
        root = self.pose[self.root]
        root.location = root.bone.matrix_local.to_3x3().inverted() @ Vector(offset)
        root.keyframe_insert('location', frame=frame)

    def clip(self, name, keys):
        """keys: (fotograma, pose) o (fotograma, pose, desplazamiento de la raíz)."""
        self.obj.animation_data_clear()
        for frame, pose, *off in keys:
            self._key(frame, pose, off[0] if off else (0, 0, 0))
        act = self.obj.animation_data.action
        act.name = name
        act.use_fake_user = True
        self.actions.append(act)

    def export(self, filename):
        fg.to_tracks(self.obj, self.actions)
        for pb in self.pose:
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.location = (0, 0, 0)
        fg.export(filename, self.scene, [self.obj, *self.parts])


def biped_bones(k=1.0):
    """Huesos del humanoide; `k` es la altura respecto a 1,7 m."""
    def v(x, y, z):
        return (x * k, y * k, z * k)
    bones = [
        ('hips', None, v(0, 0, 0.82), v(0, 0, 0.95)),
        ('spine', 'hips', v(0, 0, 0.95), v(0, 0, 1.1)),
        ('chest', 'spine', v(0, 0, 1.1), v(0, 0, 1.3)),
        ('head', 'chest', v(0, 0, 1.3), v(0, 0, 1.7)),
    ]
    for s, x in (('L', 1), ('R', -1)):
        bones += [
            (f'upperArm{s}', 'chest', v(0.2 * x, 0, 1.27), v(0.25 * x, 0, 1.03)),
            (f'foreArm{s}', f'upperArm{s}', v(0.25 * x, 0, 1.03), v(0.27 * x, -0.03, 0.82)),
            (f'hand{s}', f'foreArm{s}', v(0.27 * x, -0.03, 0.82), v(0.27 * x, -0.05, 0.74)),
            (f'thigh{s}', 'hips', v(0.09 * x, 0, 0.82), v(0.1 * x, 0, 0.46)),
            (f'shin{s}', f'thigh{s}', v(0.1 * x, 0, 0.46), v(0.1 * x, 0, 0.09)),
            (f'foot{s}', f'shin{s}', v(0.1 * x, 0, 0.09), v(0.1 * x, -0.15, 0.03)),
        ]
    return bones


ARMS = {'upperArmL': (0, 12, 0), 'upperArmR': (0, -12, 0), 'foreArmL': (-22, 0, 0), 'foreArmR': (-22, 0, 0)}


def p(**kw):
    """Pose con los brazos caídos de reposo más lo indicado."""
    return {**ARMS, **kw}


def _stride(sign):
    return {
        'hips': (6, 0, 5 * sign), 'spine': (5, 0, -3 * sign), 'chest': (3, 0, -7 * sign),
        'thighR': (-36 * sign, 0, 0), 'shinR': (12 if sign > 0 else 62, 0, 0), 'footR': (-6 if sign > 0 else 18, 0, 0),
        'thighL': (36 * sign, 0, 0), 'shinL': (62 if sign > 0 else 12, 0, 0), 'footL': (18 if sign > 0 else -6, 0, 0),
        'upperArmR': (30 * sign, -10, 0), 'foreArmR': (-46, 0, 0),
        'upperArmL': (-30 * sign, 10, 0), 'foreArmL': (-46, 0, 0),
    }


def _passing(sign):
    return {
        'hips': (6, 0, 0), 'spine': (5, 0, 0), 'chest': (3, 0, 0),
        'thighR': (-6 * sign, 0, 0), 'shinR': (8 if sign > 0 else 72, 0, 0),
        'thighL': (6 * sign, 0, 0), 'shinL': (72 if sign > 0 else 8, 0, 0),
        'upperArmR': (0, -10, 0), 'foreArmR': (-46, 0, 0),
        'upperArmL': (0, 10, 0), 'foreArmL': (-46, 0, 0),
    }


def biped_clips(rig, k=1.0, extra=None):
    """Reposo, Correr, Rodar, Golpeado y Morir. `extra(fotograma)` añade huesos propios (alas)."""
    def o(x, y, z):
        return (x * k, y * k, z * k)

    def e(frame, pose):
        return {**pose, **extra(frame)} if extra else pose

    rig.clip('Reposo', [
        (1, e(1, p())),
        (16, e(16, p(chest=(-1.2, 0, 0), head=(1, 2.5, 0))), o(0, 0, -0.004)),
        (31, e(31, p(chest=(-2.5, 0, 0), head=(2, 5, 0), upperArmL=(0, 14, 0), upperArmR=(0, -14, 0))), o(0, 0, -0.008)),
        (46, e(46, p(chest=(-1.2, 0, 0), head=(1, 2.5, 0))), o(0, 0, -0.004)),
        (61, e(61, p())),
    ])
    rig.clip('Correr', [
        (1, e(1, _stride(1)), o(0, 0, -0.02)),
        (6, e(6, _passing(1)), o(0, 0, 0.03)),
        (11, e(11, _stride(-1)), o(0, 0, -0.02)),
        (16, e(16, _passing(-1)), o(0, 0, 0.03)),
        (21, e(21, _stride(1)), o(0, 0, -0.02)),
    ])
    rig.clip('Rodar', [
        (1, p()),
        (4, p(hips=(-60, 0, 0), spine=(-30, 0, 0), chest=(-20, 0, 0), thighR=(-90, 0, 0), thighL=(-90, 0, 0), shinR=(110, 0, 0), shinL=(110, 0, 0)), o(0, -0.25, -0.35)),
        (9, p(hips=(-180, 0, 0), spine=(-30, 0, 0), chest=(-20, 0, 0), thighR=(-100, 0, 0), thighL=(-100, 0, 0), shinR=(120, 0, 0), shinL=(120, 0, 0)), o(0, -0.7, -0.4)),
        (14, p(hips=(-300, 0, 0), spine=(-20, 0, 0), thighR=(-80, 0, 0), thighL=(-80, 0, 0), shinR=(100, 0, 0), shinL=(100, 0, 0)), o(0, -1.1, -0.35)),
        (19, p(hips=(-360, 0, 0)), o(0, -1.3, 0)),
    ])
    rig.clip('Golpeado', [
        (1, e(1, p())),
        (4, e(4, p(chest=(-22, 0, 8), spine=(-8, 0, 0), head=(-14, 0, 0), upperArmR=(12, -35, 0), upperArmL=(12, 35, 0))), o(0, 0.05, -0.02)),
        (13, e(13, p())),
    ])
    rig.clip('Morir', [
        (1, p()),
        (6, p(chest=(-26, 0, 0), head=(-16, 0, 0), upperArmR=(-30, -40, 0), upperArmL=(-30, 40, 0), thighR=(-14, 0, 0), shinR=(20, 0, 0)), o(0, 0.06, -0.05)),
        (16, p(hips=(-52, 0, 0), chest=(-10, 0, 0), head=(-10, 0, 0), upperArmR=(-60, -55, 0), upperArmL=(-60, 55, 0), thighR=(-30, 0, 0), thighL=(-15, 0, 0), shinR=(50, 0, 0), shinL=(35, 0, 0)), o(0, 0.25, -0.42)),
        (26, p(hips=(-88, 0, 0), head=(-6, 8, 0), upperArmR=(-60, -80, 0), upperArmL=(-60, 80, 0), foreArmR=(0, 0, 0), foreArmL=(0, 0, 0), thighR=(-8, 0, 0), thighL=(-4, 0, 0), shinR=(10, 0, 0), shinL=(6, 0, 0)), o(0, 0.45, -0.72)),
        (31, p(hips=(-90, 0, 0), head=(-4, 10, 0), upperArmR=(-60, -80, 0), upperArmL=(-60, 80, 0), foreArmR=(0, 0, 0), foreArmL=(0, 0, 0)), o(0, 0.45, -0.73)),
    ])
