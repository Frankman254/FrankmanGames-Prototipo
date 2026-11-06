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
        fg.free_action_name(name, act)
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
        'hips': (7, -2 * sign, 6 * sign), 'spine': (5, 0, -4 * sign), 'chest': (3, 0, -8 * sign),
        'head': (-2, 0, 3 * sign),
        'thighR': (-36 * sign, 0, 0), 'shinR': (12 if sign > 0 else 62, 0, 0), 'footR': (-6 if sign > 0 else 18, 0, 0),
        'thighL': (36 * sign, 0, 0), 'shinL': (62 if sign > 0 else 12, 0, 0), 'footL': (18 if sign > 0 else -6, 0, 0),
        'upperArmR': (30 * sign, -10, 0), 'foreArmR': (-46, 0, 0),
        'upperArmL': (-30 * sign, 10, 0), 'foreArmL': (-46, 0, 0),
    }


def _passing(sign):
    return {
        'hips': (8, 3 * sign, 0), 'spine': (6, 0, 2 * sign), 'chest': (4, 0, 3 * sign),
        'head': (-3, 0, -2 * sign),
        'thighR': (-6 * sign, 0, 0), 'shinR': (8 if sign > 0 else 72, 0, 0),
        'thighL': (6 * sign, 0, 0), 'shinL': (72 if sign > 0 else 8, 0, 0),
        'upperArmR': (6 * sign, -10, 0), 'foreArmR': (-50, 0, 0),
        'upperArmL': (-6 * sign, 10, 0), 'foreArmL': (-50, 0, 0),
    }


def _run_down(sign):
    pose = _stride(sign)
    pose.update({
        'hips': (10, -4 * sign, 4 * sign), 'spine': (7, 0, -3 * sign),
        'thighR': (-29 * sign, 0, 0), 'thighL': (29 * sign, 0, 0),
        'shinR': (22 if sign > 0 else 68, 0, 0), 'shinL': (68 if sign > 0 else 22, 0, 0),
    })
    return pose


def _run_up(sign):
    pose = _passing(sign)
    pose.update({
        'hips': (5, 2 * sign, 2 * sign), 'spine': (4, 0, -2 * sign),
        'thighR': (12 * sign, 0, 0), 'thighL': (-12 * sign, 0, 0),
        'shinR': (14 if sign > 0 else 58, 0, 0), 'shinL': (58 if sign > 0 else 14, 0, 0),
        'footR': (-8 if sign > 0 else 14, 0, 0), 'footL': (14 if sign > 0 else -8, 0, 0),
    })
    return pose


def _walk_contact(sign):
    return {
        'hips': (1, -2 * sign, 5 * sign), 'spine': (0, 0, -3 * sign),
        'chest': (-1, 0, -6 * sign), 'head': (1, 0, 3 * sign),
        'thighR': (-22 * sign, 0, 0), 'shinR': (6 if sign > 0 else 34, 0, 0),
        'footR': (-5 if sign > 0 else 10, 0, 0),
        'thighL': (22 * sign, 0, 0), 'shinL': (34 if sign > 0 else 6, 0, 0),
        'footL': (10 if sign > 0 else -5, 0, 0),
        'upperArmR': (18 * sign, -10, 0), 'foreArmR': (-32, 0, 0),
        'upperArmL': (-18 * sign, 10, 0), 'foreArmL': (-32, 0, 0),
    }


def _walk_passing(sign):
    return {
        'hips': (2, 3 * sign, 0), 'spine': (1, 0, 2 * sign),
        'chest': (0, 0, 4 * sign), 'head': (0, 0, -2 * sign),
        'thighR': (-3 * sign, 0, 0), 'shinR': (5 if sign > 0 else 42, 0, 0),
        'footR': (0 if sign > 0 else 12, 0, 0),
        'thighL': (3 * sign, 0, 0), 'shinL': (42 if sign > 0 else 5, 0, 0),
        'footL': (12 if sign > 0 else 0, 0, 0),
        'upperArmR': (3 * sign, -10, 0), 'foreArmR': (-34, 0, 0),
        'upperArmL': (-3 * sign, 10, 0), 'foreArmL': (-34, 0, 0),
    }


def biped_clips(rig, k=1.0, extra=None):
    """Reposo, Caminar, Correr, Rodar, Golpeado y Morir; `extra` añade huesos propios."""
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
        (3, e(3, _run_down(1)), o(0.025, 0, -0.045)),
        (6, e(6, _passing(1)), o(0, 0, 0.03)),
        (8, e(8, _run_up(1)), o(-0.02, 0, 0.065)),
        (11, e(11, _stride(-1)), o(0, 0, -0.02)),
        (13, e(13, _run_down(-1)), o(-0.025, 0, -0.045)),
        (16, e(16, _passing(-1)), o(0, 0, 0.03)),
        (18, e(18, _run_up(-1)), o(0.02, 0, 0.065)),
        (21, e(21, _stride(1)), o(0, 0, -0.02)),
    ])
    rig.clip('Caminar', [
        (1, e(1, _walk_contact(1)), o(0, 0, 0)),
        (5, e(5, _walk_contact(1)), o(0.018, 0, -0.018)),
        (9, e(9, _walk_passing(1)), o(0.012, 0, 0.012)),
        (13, e(13, _walk_passing(1)), o(-0.012, 0, 0.024)),
        (17, e(17, _walk_contact(-1)), o(0, 0, 0)),
        (21, e(21, _walk_contact(-1)), o(-0.018, 0, -0.018)),
        (25, e(25, _walk_passing(-1)), o(-0.012, 0, 0.012)),
        (29, e(29, _walk_passing(-1)), o(0.012, 0, 0.024)),
        (33, e(33, _walk_contact(1)), o(0, 0, 0)),
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


def biped_emote_clips(rig, k=1.0):
    """Ocho gestos propios compartidos por los humanoides; nombres estables para la UI."""
    def o(x, y, z):
        return (x * k, y * k, z * k)

    rig.clip('Emote_wave', [
        (1, p()),
        (8, p(chest=(0, 0, -8), head=(0, 0, 8), upperArmR=(-105, -30, -18), foreArmR=(-82, 0, 0), handR=(0, 0, -22))),
        (14, p(chest=(0, 0, -8), head=(0, 0, 8), upperArmR=(-105, -30, -18), foreArmR=(-82, 0, 0), handR=(0, 0, 24))),
        (20, p(chest=(0, 0, -8), head=(0, 0, 8), upperArmR=(-105, -30, -18), foreArmR=(-82, 0, 0), handR=(0, 0, -24))),
        (26, p(chest=(0, 0, -8), head=(0, 0, 8), upperArmR=(-105, -30, -18), foreArmR=(-82, 0, 0), handR=(0, 0, 22))),
        (36, p()),
    ])
    rig.clip('Emote_laugh', [
        (1, p()),
        (8, p(hips=(4, 0, 0), spine=(9, 0, 0), chest=(14, 0, 0), head=(-8, 0, 0), upperArmL=(-42, 20, 0), upperArmR=(-42, -20, 0), foreArmL=(-92, 0, 0), foreArmR=(-92, 0, 0)), o(0, 0, -0.025)),
        (14, p(hips=(-3, 0, 0), spine=(-5, 0, 0), chest=(-8, 0, 0), head=(12, 0, 0), upperArmL=(-52, 20, 0), upperArmR=(-52, -20, 0), foreArmL=(-96, 0, 0), foreArmR=(-96, 0, 0)), o(0, 0, 0.025)),
        (20, p(hips=(4, 0, 0), spine=(9, 0, 0), chest=(14, 0, 0), head=(-8, 0, 0), upperArmL=(-42, 20, 0), upperArmR=(-42, -20, 0), foreArmL=(-92, 0, 0), foreArmR=(-92, 0, 0)), o(0, 0, -0.025)),
        (30, p()),
    ])
    rig.clip('Emote_dance', [
        (1, p()),
        (8, p(hips=(0, 0, 12), spine=(0, 0, -8), chest=(0, 0, -14), head=(0, 0, 8), thighL=(-24, 0, 7), shinL=(28, 0, 0), upperArmL=(-82, 24, -18), upperArmR=(34, -22, 12), foreArmL=(-34, 0, 0), foreArmR=(-62, 0, 0)), o(0.06, 0, 0.035)),
        (16, p(hips=(0, 0, -12), spine=(0, 0, 8), chest=(0, 0, 14), head=(0, 0, -8), thighR=(-24, 0, -7), shinR=(28, 0, 0), upperArmR=(-82, -24, 18), upperArmL=(34, 22, -12), foreArmR=(-34, 0, 0), foreArmL=(-62, 0, 0)), o(-0.06, 0, 0.035)),
        (24, p(hips=(0, 0, 12), spine=(0, 0, -8), chest=(0, 0, -14), head=(0, 0, 8), thighL=(-24, 0, 7), shinL=(28, 0, 0), upperArmL=(-82, 24, -18), upperArmR=(34, -22, 12), foreArmL=(-34, 0, 0), foreArmR=(-62, 0, 0)), o(0.06, 0, 0.035)),
        (32, p(hips=(0, 0, -12), spine=(0, 0, 8), chest=(0, 0, 14), head=(0, 0, -8), thighR=(-24, 0, -7), shinR=(28, 0, 0), upperArmR=(-82, -24, 18), upperArmL=(34, 22, -12), foreArmR=(-34, 0, 0), foreArmL=(-62, 0, 0)), o(-0.06, 0, 0.035)),
        (42, p()),
    ])
    rig.clip('Emote_cry', [
        (1, p()),
        (10, p(hips=(8, 0, 0), spine=(16, 0, 0), chest=(20, 0, 0), head=(18, 0, 0), upperArmL=(-76, 14, 0), upperArmR=(-76, -14, 0), foreArmL=(-116, 0, 0), foreArmR=(-116, 0, 0)), o(0, 0, -0.04)),
        (22, p(hips=(11, 0, 0), spine=(20, 0, 0), chest=(24, 0, 0), head=(22, 0, 0), upperArmL=(-80, 14, 0), upperArmR=(-80, -14, 0), foreArmL=(-122, 0, 0), foreArmR=(-122, 0, 0)), o(0, 0, -0.07)),
        (36, p()),
    ])
    rig.clip('Emote_angry', [
        (1, p()),
        (7, p(hips=(-4, 0, 0), spine=(-8, 0, 0), chest=(-12, 0, 0), head=(10, 0, 0), upperArmL=(-38, 30, 0), upperArmR=(-38, -30, 0), foreArmL=(-104, 0, 0), foreArmR=(-104, 0, 0)), o(0, 0, 0.02)),
        (13, p(hips=(12, 0, 0), spine=(16, 0, 0), chest=(18, 0, 0), head=(-10, 0, 0), upperArmL=(-18, 38, 0), upperArmR=(-18, -38, 0), foreArmL=(-72, 0, 0), foreArmR=(-72, 0, 0), thighL=(-18, 0, 0), thighR=(-18, 0, 0), shinL=(28, 0, 0), shinR=(28, 0, 0)), o(0, 0, -0.09)),
        (20, p(hips=(5, 0, 0), chest=(8, 0, 0), head=(-4, 0, 0), upperArmL=(-30, 30, 0), upperArmR=(-30, -30, 0), foreArmL=(-92, 0, 0), foreArmR=(-92, 0, 0)), o(0, 0, -0.03)),
        (32, p()),
    ])
    rig.clip('Emote_love', [
        (1, p()),
        (10, p(chest=(-5, 0, 0), head=(4, 0, 0), upperArmL=(-138, 28, -25), upperArmR=(-138, -28, 25), foreArmL=(-82, 0, -30), foreArmR=(-82, 0, 30)), o(0, 0, 0.02)),
        (26, p(chest=(-8, 0, 0), head=(7, 0, 0), upperArmL=(-142, 26, -28), upperArmR=(-142, -26, 28), foreArmL=(-88, 0, -34), foreArmR=(-88, 0, 34)), o(0, 0, 0.035)),
        (40, p()),
    ])
    rig.clip('Emote_sleep', [
        (1, p()),
        (12, p(hips=(3, 0, 4), spine=(5, 0, 7), chest=(7, 0, 12), head=(10, 0, 28), upperArmL=(-42, 12, 0), upperArmR=(-54, -18, 0), foreArmL=(-92, 0, 0), foreArmR=(-108, 0, 0)), o(0, 0, -0.025)),
        (34, p(hips=(5, 0, 5), spine=(7, 0, 9), chest=(9, 0, 14), head=(13, 0, 31), upperArmL=(-44, 12, 0), upperArmR=(-56, -18, 0), foreArmL=(-94, 0, 0), foreArmR=(-110, 0, 0)), o(0, 0, -0.04)),
        (46, p()),
    ])
    rig.clip('Emote_doubt', [
        (1, p()),
        (10, p(hips=(0, 0, -5), spine=(0, 0, 7), chest=(0, 0, 10), head=(0, 0, -18), upperArmR=(-68, -20, 8), foreArmR=(-108, 0, 0), upperArmL=(8, 24, 0), foreArmL=(-38, 0, 0))),
        (22, p(hips=(0, 0, 5), spine=(0, 0, -7), chest=(0, 0, -10), head=(0, 0, 18), upperArmR=(-68, -20, -8), foreArmR=(-108, 0, 0), upperArmL=(8, 24, 0), foreArmL=(-38, 0, 0))),
        (34, p(hips=(0, 0, -5), spine=(0, 0, 7), chest=(0, 0, 10), head=(0, 0, -18), upperArmR=(-68, -20, 8), foreArmR=(-108, 0, 0), upperArmL=(8, 24, 0), foreArmL=(-38, 0, 0))),
        (46, p()),
    ])
