# Cangrejo del manglar (OMP-FA-01): `chame_crab` (Cangrejo Machetero) y
# `chame_grandcrab` (Cangrejo Abuelo) comparten este GLB; el tamaño lo marca
# data/ con `scale`, aquí no se toca nada.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/cangrejo.py
# Método de escultura por código (GUIA_BLENDER_MCP §7): masas de metabolas que se
# funden sin costura, vóxel remesh, suavizado Laplaciano, relieve de placas
# desplazando vértices por su normal, y piezas finas (dedos, pinchos, ojos) como
# mallas aparte que se solapan.
# Rasgos que lo identifican (revisión visual, no cajas planas): caparazón ancho y
# bajo con areola elevada, borde anterior festoneado con pinchos laterales, ojos
# sobre pedúnculo con pupila vertical, la tenaza derecha mayor que la izquierda
# (el «machete»), seis patas andaderas con la rodilla por encima del caparazón y
# punta clavada en el suelo, y abdomen plegado debajo del dorso.
# Contrato de la casa: mira a -Y, +Z arriba, apoyo en z=0 en el Reposo, materiales
# por región teñible (skin/cloth/trim/hair/gear) y clips Reposo, Caminar, Atacar,
# Golpeado, Morir con los bucles sin salto. ≤1500 tri.
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Euler, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import fg  # noqa: E402
import fg_rig  # noqa: E402


def R(d):
    return math.radians(d)


def V(t):
    return Vector(t)


def ss(e0, e1, x):
    x = np.clip((np.asarray(x, float) - e0) / (e1 - e0 + 1e-12), 0, 1)
    return x * x * (3 - 2 * x)


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def arrays(me):
    return (np.array([v.co[:] for v in me.vertices]),
            np.array([v.normal[:] for v in me.vertices]))


def set_co(me, co):
    for v, c in zip(me.vertices, co):
        v.co = c


def laplace(ob, iters, f):
    me = ob.data
    for _ in range(iters):
        co, _ = arrays(me)
        adj = [[] for _ in co]
        for p in me.polygons:
            for a in p.vertices:
                for b in p.vertices:
                    if a != b:
                        adj[a].append(b)
        new = co.copy()
        for i, ns in enumerate(adj):
            if ns:
                new[i] = co[i] * (1 - f) + co[ns].mean(axis=0) * f
        set_co(me, new)
        me.update()
    for p in me.polygons:
        p.use_smooth = True


# ================================================================ masas (metabolas → vóxel)
class Meta:
    def __init__(self, name, res=0.014):
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
        # radios reales aproximados: la isosuperficie queda a ~0,84 del radio
        return self.el('ELLIPSOID', c, 1.19, size=(rx, ry, rz), rot=rot, **k)

    def mesh(self, name, voxel):
        dg = bpy.context.evaluated_depsgraph_get()
        me = bpy.data.meshes.new_from_object(self.obj.evaluated_get(dg))
        me.name = name
        ob = link(bpy.data.objects.new(name, me))
        bpy.data.objects.remove(self.obj)
        me.remesh_voxel_size = voxel
        me.remesh_voxel_adaptivity = 0
        with bpy.context.temp_override(object=ob, active_object=ob,
                                       selected_objects=[ob], selected_editable_objects=[ob]):
            bpy.ops.object.voxel_remesh()
        return ob


def decimate(ob, ratio):
    mod = ob.modifiers.new('red', 'DECIMATE')
    mod.ratio = ratio
    with bpy.context.temp_override(object=ob, active_object=ob,
                                   selected_objects=[ob], selected_editable_objects=[ob]):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


# ================================================================ caparazón
C_CAP = (0, 0.02, 0.235)


def build_shell():
    m = Meta('cap_meta')
    m.ell((0, 0.02, 0.235), 0.345, 0.29, 0.105)                    # disco ancho y bajo
    m.ell((0, -0.12, 0.24), 0.27, 0.155, 0.105)                    # maciza frontal
    for s in (-1, 1):
        m.ell((0.22 * s, -0.09, 0.25), 0.13, 0.16, 0.078, rot=(0, 0, R(-20 * s)))  # hombros cuadrados
    m.ell((0, 0.18, 0.21), 0.175, 0.11, 0.068)                     # lomo posterior
    # abdomen plegado debajo del dorso: placas, no cola
    m.ell((0, 0.205, 0.172), 0.09, 0.055, 0.026)
    m.ell((0, 0.248, 0.168), 0.058, 0.045, 0.020)
    for s in (-1, 1):
        m.ball((0.078 * s, -0.215, 0.315), 0.055 * 1.19, neg=True)   # cuenca del pedúnculo
    m.ell((0, -0.245, 0.27), 0.05, 0.06, 0.05, neg=True)             # muesca entre los ojos
    ob = m.mesh('Caparazon', 0.022)
    laplace(ob, 2, 0.5)
    decimate(ob, 0.138)
    return ob


def shell_relief(ob):
    """Placas: areola central elevada y teselas en abanico hacia el borde,
    fleco en el borde anterior. Desplazamiento por la normal, sin pincel."""
    me = ob.data
    co, no = arrays(me)
    rel = co - np.array(C_CAP)
    d = np.linalg.norm(rel[:, [0, 1]] / np.array([0.33, 0.30]), axis=1)   # 0 centro, 1 borde
    a = np.arctan2(rel[:, 1], rel[:, 0])
    s = 0.105 - 0.040 * d                                                 # teselas mayores dentro
    row = np.floor(d / s)
    w = 2 * math.pi / np.maximum(5, np.round(2 * math.pi * np.maximum(d, 1e-6) * 0.315 / s))
    col = (a / w + 0.5 * (row % 2)) % 1.0
    f = d / s - row
    lobe = np.sqrt(np.clip(1 - (2 * col - 1) ** 2, 0, 1))
    h = ss(0.0, 0.75, f) * (1 - ss(0.85, 1.0, f)) * (0.5 + 0.5 * lobe)
    h = h * ss(0.10, 0.30, d)                                             # la areola va lisa
    areola = (1 - ss(0.10, 0.19, d)) * 1.6
    top = ss(0.25, 0.7, no[:, 2])                                         # solo el dorso
    front = ss(0.30, 0.55, -rel[:, 1] / 0.30) * ss(0.75, 0.55, d) * (1 - top)
    amp = 0.013 * top + 0.009 * front
    set_co(me, co + no * (h * amp + areola * 0.014 * top)[:, None])
    me.update()
    return d


def shell_finish(ob, m, d):
    """Materiales por región teñible: dorso `skin`, cantos y panza `trim`,
    reborde inferior `hair`."""
    me = ob.data
    me.materials.clear()
    for mat in (m['skin'], m['trim'], m['hair']):
        me.materials.append(mat)
    _, no = arrays(me)
    for p in me.polygons:
        zc = p.center.z
        dz = no[list(p.vertices)].mean(axis=0)
        dn = d[list(p.vertices)].mean()
        if dz[2] < -0.3 and zc < 0.24:
            p.material_index = 1 if zc > 0.145 else 2
        elif dn > 0.955 and dz[2] < 0.35:
            p.material_index = 1
        else:
            p.material_index = 0


# ================================================================ esqueleto
LEGS = (('L', 1.0), ('R', -1.0))
PAIRS = ((-0.125, 0.46, 0.55), (-0.015, 0.50, 0.585), (0.095, 0.46, 0.545))  # y, alto rodilla, largo


def bones():
    bs = [
        ('hips', None, (0, 0.06, 0.26), (0, -0.10, 0.28)),
        ('tail', 'hips', (0, 0.235, 0.175), (0, 0.33, 0.15)),
    ]
    for s, x in LEGS:
        bs += [(f'eye{s}', 'hips', (0.075 * x, -0.215, 0.335), (0.115 * x, -0.265, 0.46))]
        bs += [
            (f'arm{s}', 'hips', (0.24 * x, -0.085, 0.255), (0.42 * x, -0.16, 0.26)),
            (f'fore{s}', f'arm{s}', (0.42 * x, -0.16, 0.26), (0.565 * x, -0.275, 0.25)),
            (f'hand{s}', f'fore{s}', (0.565 * x, -0.275, 0.25), (0.80 * x, -0.44, 0.235)),
            (f'pin{s}', f'hand{s}', (0.645 * x, -0.35, 0.235), (0.82 * x, -0.475, 0.225)),
        ]
        for i, (y, knee, _tip) in enumerate(PAIRS, start=1):
            bs += [
                (f'leg{s}{i}', 'hips', (0.225 * x, y, 0.21), (0.44 * x, y, 0.305)),
                (f'shin{s}{i}', f'leg{s}{i}', (0.44 * x, y, 0.305), (0.545 * x, y - 0.015, 0.004)),
            ]
    return bs


def rig_clips(rig):
    rest = {}

    def gait(t):
        a = 2 * math.pi * t
        pose = {}
        for s, _x in LEGS:
            for i, _ in enumerate(PAIRS, start=1):
                ph = a + 2 * math.pi * ((i - 1) * 0.33 + (0.5 if s == 'R' else 0.0))
                pose[f'leg{s}{i}'] = (0, 17 * math.sin(ph), 0)
                pose[f'shin{s}{i}'] = (0, -14 * math.sin(ph + 1.1), 0)
        pose['hips'] = (0, 0, 3.4 * math.sin(2 * a))
        pose['armL'] = (0, -7, 4 * math.sin(a))
        pose['armR'] = (0, 5, -4 * math.sin(a))
        return pose

    rig.clip('Reposo', [
        (1, rest),
        (16, {'eyeL': (-6, 0, 4), 'eyeR': (4, 0, -7), 'pinL': (0, 0, 4), 'pinR': (0, 0, -3),
              'foreL': (0, -3, 0), 'foreR': (0, 2, 0)}, (0, 0, 0.004)),
        (31, {'hips': (2.5, 0, 0), 'tail': (0, -10, 0), 'eyeL': (5, 0, -3), 'eyeR': (-7, 0, 5),
              'pinL': (0, 0, -3), 'pinR': (0, 0, 4)}, (0, 0, -0.004)),
        (46, {'eyeL': (-3, 0, 6), 'eyeR': (6, 0, -3), 'foreL': (0, -2, 0), 'foreR': (0, 3, 0)}, (0, 0, 0.002)),
        (61, rest),
    ])
    rig.clip('Caminar', [(1 + i * 2, gait(i / 8), (0, 0, 0.007 * abs(math.sin(2 * math.pi * i / 8))))
                         for i in range(9)])
    rig.clip('Atacar', [
        (1, rest),
        (7, {'armR': (0, 34, -12), 'foreR': (0, 10, 0), 'pinR': (0, 0, -22), 'hips': (0, 0, -8)}, (0, 0, 0.02)),
        (11, {'armR': (0, 46, -18), 'foreR': (0, 14, 0), 'pinR': (0, 0, -30), 'hips': (0, 0, -14),
              'armL': (0, -12, 6)}, (0, 0, 0.03)),
        (14, {'armR': (0, -14, 8), 'foreR': (0, -16, 0), 'pinR': (0, 0, 20), 'hips': (-8, 0, 10)}, (0, -0.05, -0.01)),
        (18, {'armR': (0, -4, 2), 'foreR': (0, -4, 0), 'pinR': (0, 0, 8), 'hips': (0, 0, 2)}, (0, -0.015, 0)),
        (24, rest),
    ])
    rig.clip('Golpeado', [
        (1, rest),
        (4, {'hips': (14, 0, 0), 'tail': (0, 26, 0), 'eyeL': (34, 0, 8), 'eyeR': (34, 0, -8),
             'pinL': (0, 0, 14), 'pinR': (0, 0, -14), 'armL': (0, -8, 10), 'armR': (0, 8, -10),
             **{f'leg{s}1': (12, 0, 0) for s, _ in LEGS}}, (0, 0.02, -0.035)),
        (13, rest, (0, 0, -0.01)),
        (17, rest),
    ])
    rig.clip('Morir', [
        (1, rest),
        (10, {'hips': (26, 0, 0), 'tail': (0, -20, 0), 'eyeL': (40, 0, 12), 'eyeR': (40, 0, -12),
              'armL': (0, -14, 18), 'armR': (0, 14, -18)}, (0, 0, -0.05)),
        (20, {'hips': (86, 0, 6), 'tail': (0, -40, 0), 'eyeL': (55, 0, 16), 'eyeR': (55, 0, -16),
              'armL': (0, -20, 40), 'armR': (0, 20, -40), 'pinL': (0, 0, 26), 'pinR': (0, 0, -26),
              **{f'{b}{i}': (-26, 0, 0) for b in ('legL', 'legR') for i in (1, 2, 3)}}, (0, 0.06, -0.06)),
        (30, {'hips': (158, 0, 10), 'tail': (0, -55, 0), 'eyeL': (70, 0, 20), 'eyeR': (70, 0, -20),
              'armL': (0, -18, 52), 'armR': (0, 18, -52), 'pinL': (0, 0, 34), 'pinR': (0, 0, -34),
              **{f'{b}{i}': (-40, 0, 0) for b in ('legL', 'legR') for i in (1, 2, 3)}}, (0, 0.10, -0.02)),
    ])


# ================================================================ piezas finas
def blade(b, mat, group, rings, ws, dzs):
    """Pua aplanada que curva: `rings` puntos a lo largo del eje, `ws`/`dzs` el
    semiancho y el semigrueso de cada seccion romboidal (filo arriba y abajo)."""
    rings = [V(r) for r in rings]

    def ring(p, t, w, dz):
        side = t.cross(V((0, 0, 1))).normalized() if abs(t.z) < 0.98 else V((1, 0, 0))
        nn = side.cross(t)
        return [p + side * w + nn * dz, p + nn * w * 0.5, p - side * w + nn * dz, p - nn * w * 0.5]

    for pa, pb, wa, wb, dza, dzb in zip(rings, rings[1:], ws, ws[1:], dzs, dzs[1:]):
        t = (pb - pa).normalized()
        b.poly(ring(pa, t, wa, dza), ring(pb, t, wb, dzb), mat, group)


def chela(b, m, s, x, big):
    """Tenaza: muñeca → palma globosa → dos dedos curvos que muerde uno contra
    otro, con dientes en el filo del móvil. `big` es la del machete (derecha):
    maciza y roma; la otra es fina y asimétrica (la «pintza» filtradora)."""
    k = 1.0 if big else 0.72
    # merus y carpus: sin ellos la pinza flota separada del caparazon
    b.tube((0.24 * x, -0.085, 0.245), (0.42 * x, -0.16, 0.26), 0.050 * k, 0.046 * k,
           m['skin'], f'arm{s}', sides=6)
    b.tube((0.42 * x, -0.16, 0.26), (0.565 * x, -0.275, 0.25), 0.046 * k, 0.050 * k,
           m['skin'], f'fore{s}', sides=6)
    w = V((0.565 * x, -0.275, 0.25))
    palm = w + V((0.16 * x, -0.13, 0.005)) * k
    b.tube(tuple(w), tuple(w + V((0.08 * x, -0.065, 0)) * k), 0.046 * k, 0.052 * k,
           m['skin'], f'hand{s}', sides=6)
    # palma: capsula gruesa (la blob costaba 80 tri; el bulto lo da el dedo fijo)
    pa = palm + V((-0.03 * x, 0.022, 0.006)) * k
    pb = palm + V((0.055 * x, -0.04, -0.004)) * k
    b.tube(tuple(pa), tuple(pb), 0.062 * k, 0.070 * k, m['skin'], f'hand{s}', sides=6, flat=0.8)
    out = V((0.70 * x, -0.70, -0.02)).normalized()
    fn = palm + out * (0.165 if big else 0.16) * k

    # dedo fijo: grueso, por fuera, córneo oscuro
    f0 = palm + V((0.022 * x, 0.012, -0.032)) * k
    tip1 = fn + V((0.018 * x, 0.012, -0.012))
    blade(b, m['hair'], f'hand{s}', [f0, f0.lerp(tip1, 0.5) + V((0, 0, 0.006)), tip1],
          [0.056 * k, 0.036 * k, 0.006], [0.026 * k, 0.015 * k, 0.005])
    # dedo móvil: nace por dentro, curva mordiendo contra el fijo
    base2 = palm + V((-0.022 * x, 0.034, -0.028)) * k
    tip2 = fn + V((-0.010 * x, 0.010, 0.026))
    mid2 = base2.lerp(tip2, 0.62) + V((-0.008 * x, 0, 0.014))
    blade(b, m['gear'], f'pin{s}', [base2, mid2, tip2],
          [0.048 * k, 0.030 * k, 0.006], [0.022 * k, 0.013 * k, 0.005])
    for t in (0.35, 0.58):
        pc = base2.lerp(tip2, t)
        b.box(tuple(pc + V((0.002 * x, 0.016, -0.026)) * k), (0.011 * k, 0.017 * k, 0.017 * k),
              m['gear'], f'pin{s}')


def thin_parts(b, m):
    """Pinchos del borde, anténulas, pieza bucal, pedúnculos y ojos."""
    for s, x in LEGS:
        for ang, ln, z in ((58, 0.085, 0.275), (34, 0.075, 0.265), (10, 0.065, 0.252)):
            p0 = V((0.285 * x * math.sin(R(ang)), -0.285 * math.cos(R(ang)), z))
            d = V((math.sin(R(ang)) * x, -math.cos(R(ang)), 0.25)).normalized()
            blade(b, m['skin'], 'hips', [p0, p0 + d * ln * 0.55, p0 + d * ln],
                  [0.020, 0.011, 0.004], [0.016, 0.009, 0.004])
        b.tube((0.028 * x, -0.235, 0.272), (0.05 * x, -0.295, 0.288), 0.011, 0.007, m['hair'], 'hips', sides=5)
        b.tube((0.05 * x, -0.295, 0.288), (0.072 * x, -0.345, 0.262), 0.007, 0.002, m['hair'], 'hips', sides=4)
    # pieza bucal: banderola integrada bajo el borde frontal
    b.box((0, -0.19, 0.205), (0.11, 0.045, 0.05), m['skin'], 'hips')
    b.box((0, -0.208, 0.19), (0.07, 0.03, 0.032), m['hair'], 'hips')
    # pedunculo + ojo: globo vertical oscuro con destello; la pupila va empotrada
    for s, x in LEGS:
        b.tube((0.078 * x, -0.215, 0.305), (0.106 * x, -0.243, 0.398), 0.028, 0.024, m['skin'], f'eye{s}', sides=6)
        c = V((0.112 * x, -0.250, 0.420))
        b.blob(tuple(c), (0.033, 0.036, 0.048), m['hair'], f'eye{s}', subdiv=1)
        b.box(tuple(c + V((0.014 * x, -0.030, 0.014))), (0.008, 0.009, 0.012), m['trim'], f'eye{s}')


def legs(b, m):
    for s, x in LEGS:
        for i, (y, _knee, tipx) in enumerate(PAIRS, start=1):
            # muslo grueso que sube por encima del caparazon, rodilla marcada,
            # tibia que baja en diagonal y ponta clava (dactilo)
            b.tube((0.215 * x, y, 0.20), (0.44 * x, y, 0.315), 0.038, 0.030, m['skin'], f'leg{s}{i}', sides=6)
            b.tube((0.44 * x, y, 0.315), (tipx * x, y - 0.012, 0.032), 0.026, 0.012, m['skin'], f'shin{s}{i}', sides=6)
            # dactilo: pua curva que pica el suelo
            p0 = V((tipx * x, y - 0.012, 0.032))
            d = V((0.82 * x, -0.10, -0.62)).normalized()
            blade(b, m['hair'], f'shin{s}{i}', [p0, p0 + d * 0.045, p0 + d * 0.085 + V((0, 0, 0.008))],
                  [0.010, 0.006, 0.0015], [0.008, 0.005, 0.0015])


def mats():
    return dict(
        skin=fg.material('skin', (0.52, 0.14, 0.11)),
        cloth=fg.material('cloth', (0.78, 0.74, 0.7)),
        trim=fg.material('trim', (0.85, 0.76, 0.62)),
        hair=fg.material('hair', (0.14, 0.10, 0.09)),
        gear=fg.material('gear', (0.30, 0.27, 0.25), rough=0.5),
        brillo=fg.material('brillo_gear', (1, 0.85, 0.55), emit=(1, 0.85, 0.55), strength=1.2),
    )


def main():
    scene = fg.fresh_scene('Cangrejo')
    m = mats()
    rig = fg_rig.Rig(scene, 'FG_Cangrejo', bones())

    shell = build_shell()
    d = shell_relief(shell)
    shell_finish(shell, m, d)

    b = fg.Builder('Apendices')
    thin_parts(b, m)
    legs(b, m)
    for s, x in LEGS:
        chela(b, m, s, x, big=(s == 'R'))
    ap = rig.part(b)

    # el caparazon esculpido va rigido a hips
    shell.vertex_groups.new(name='hips')
    shell.vertex_groups['hips'].add(range(len(shell.data.vertices)), 1.0, 'REPLACE')
    shell.parent = rig.obj
    shell.modifiers.new('Huesos', 'ARMATURE').object = rig.obj
    rig.parts.append(shell)

    rig_clips(rig)
    rig.export(os.path.join(ROOT, 'assets', 'models', 'cangrejo.glb'))

    total = tris(shell) + tris(ap)
    print(f'cangrejo: caparazon {tris(shell)} + apendices {tris(ap)} = {total} triangulos')

    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'cangrejo.blend'), copy=True)
    print('cangrejo.blend salvo')
    assert total <= 1500, f'fuera de presupuesto: {total} triangulos'


if __name__ == '__main__':
    main()
