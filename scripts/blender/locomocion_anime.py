# ANIM-01 (2026-11-17): rehacer Caminar/Correr de los héroes anime como ciclos EN EL SITIO
# con el pie de apoyo CONGELADO. El motor coloca la raíz cada fotograma y no
# compensa avance interno del clip (playerAvatar.sync fija m.root.position;
# gltfCharacter sólo escala speedRatio): un clip con root motion rebotaría.
# Contrato del ciclo nuevo:
#  - stance (0..0,5 de la fase de cada pierna): muslo, rodilla y tobillo
#    IDÉNTICOS fotograma a fotograma -> el pie de apoyo no se mueve -> derrape
#    0 por construcción (lo mide diagnostico.py);
#  - vuelo (0,5..1): la pierna se levanta (toe-up), retrocede un poco, barre
#    hacia delante con la rodilla flexada y planta con ease-in;
#  - la segunda mitad del ciclo es la primera con los lados cambiados
#    (simetría L/R exacta) y cierra sin salto (key n+1 = key 1);
#  - cadera sin guiño de avance: sólo bob vertical pequeño.
# Duraciones: Caminar 26 fotogramas (1,083 s) y Correr 17 (0,708 s) a 24 fps
# para los seis (antes: centinela/oráculo 1,100/0,700; cazador ya era
# 1,083/0,708). Anotado en el REPORTE para la cadencia de Junie.
# Post-proceso sobre el GLB publicado (las bases CC0 no viven en el repo),
# misma vía que cazador_anime_fix.py. Idempotente.
# Uso (los tres `_f` son B-chan y llevan --b):
#   blender --background --python scripts/blender/locomocion_anime.py -- \
#       assets/models/centinela_anime.glb assets/models/centinela_anime.glb
import math
import os
import sys

import bpy
from mathutils import Euler, Vector

# ----------------------------------------------------------------- poses
# Convención "natural" (grados): thighFwd + = muslo hacia delante; knee + =
# rodilla flexada (talón al glúteo); toeUp + = puntera arriba. El rig anime
# gira al revés en muslo (medido con --probe: +X mueve el pie hacia -Y, atrás)
# -> al aplicar: muslo = -thighFwd, rodilla = +knee, tobillo = -toeUp (a
# confirmar con --probe en esta máquina antes de fijar el signo del tobillo).
PLANT = (13, 7, 2)       # apoyo congelado: pie clavado en el suelo, delante
PIVOT = (13, 7, 14)      # 0,62: SOLO tobillo: la puntera gira sobre el suelo (desliza ~0,2 cm)
LIFTK = (10, 40, 10)     # 0,74: despega, talón sube, muslo aún adelantado
BACK = (-8, 55, 6)       # 0,86: muslo atrás, talón alto (ya lejos del suelo)
# 1,00 vuelve a PLANT con ease: caída casi vertical (la rodilla se estira
# mientras el muslo avanza 3 grados), el pie aterriza donde estaba congelado.
ANKLE_TOE_UP_SIGN = 1.0  # --probe: +X de tobillo sube la puntera (2 cm) y adelanta (4 cm)

KEYS_LEG = [(0.50, (24, 10, 1)), (0.61, (24, 10, 17)), (0.73, (16, 52, 14)),
            (0.85, (-10, 80, 16)), (0.93, (14, 44, 6)), (1.00, (24, 10, 1))]
# Correr (n PAR 16: con n impar el semiperíodo 8,5 fotogramas rompe la simetría
# del muestreo). Despegue con el tobillo solo hasta fuera del umbral de apoyo
# (2 cm): cualquier barrido hacia atrás por debajo de esa altura se mide como
# derrape (tuner: talón 25° en el despegue = 4,9 cm/f; aquí 9° = 0,5).
KEYS_RUN = [(0.44, (20, 9, 2)), (0.57, (20, 9, 9)), (0.70, (10, 62, 10)),
            (0.83, (-14, 88, 12)), (0.92, (12, 42, 4)), (1.00, (20, 9, 2))]
# B-chan (heroínas, centinela_f/oraculo_f/cazador_f): piernas más cortas; con
# las claves YW el barrido del muslo, aún con el pie bajo el umbral de apoyo
# (2 cm), patinaba 1,5 cm/f. El muslo se queda clavado en el pivot un escalón
# más tarde y la rodilla sube antes.
KEYS_LEG_B = [(0.50, (24, 10, 1)), (0.67, (24, 10, 12)), (0.78, (16, 56, 11)),
              (0.88, (-4, 76, 13)), (0.95, (14, 42, 5)), (1.00, (24, 10, 1))]
KEYS_RUN_B = [(0.44, (20, 9, 2)), (0.58, (20, 9, 9)), (0.72, (8, 66, 11)),
              (0.85, (-12, 90, 13)), (0.93, (11, 46, 5)), (1.00, (20, 9, 2))]


def smooth(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def leg_pose(q, keys):
    """q fase [0,1) de la pierna propia en (thighFwd, knee, toeUp)."""
    if q < keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if q <= t1:
            e = smooth((q - t0) / (t1 - t0))
            return tuple(a + (b - a) * e for a, b in zip(v0, v1))
    return keys[0][1]


def torso(p, arm):
    """p fase global [0,1). Cadera sin rotación ni avance (movería el pie
    clavado). Brazos alternando con el pie contrario y balance lateral suave."""
    s = math.sin(2 * math.pi * p)
    return {
        'spine': (1.5, 0, 2.5 * s), 'chest': (3, 0, -4.5 * s), 'head': (-2, 0, 2 * s),
        'upperArmL': (arm * s, 13, 0), 'foreArmL': (-26 - 14 * max(0.0, s), 0, 0),
        'upperArmR': (-arm * s, -13, 0), 'foreArmR': (-26 - 14 * max(0.0, -s), 0, 0),
    }


def joints(pose, n, arm, bob, keys):
    """[(frame, dict-pose, altura-cadera)] para n fotogramas + cierre."""
    out = []
    for f in range(1, n + 2):
        p = ((f - 1) % n) / n
        q = dict(torso(p, arm))
        q['hips'] = (0, 0, 0)
        for side in ('L', 'R'):
            a, k, t = leg_pose((p + (0.0 if side == 'L' else 0.5)) % 1.0, keys)
            q[f'thigh{side}'] = (-a, 0, 0)
            q[f'shin{side}'] = (k, 0, 0)
            q[f'foot{side}'] = (ANKLE_TOE_UP_SIGN * t, 0, 0)
        # cadera baja a mitad de apoyo (0,25/0,75); alta en apoyos dobles (0/0,5)
        h = -bob * 0.5 * (0.5 - 0.5 * math.cos(4 * math.pi * p))
        out.append((f, q, h))
    return out


# ------------------------------------------------------------- Blender
def set_pose(arm, pose, hip_up):
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    rest = arm.pose.bones['hips'].bone.matrix_local.to_3x3()
    arm.pose.bones['hips'].location = rest.inverted() @ Vector((0, 0, hip_up))
    for bn, e in pose.items():
        pb = arm.pose.bones[bn]
        r0 = pb.bone.matrix_local.to_3x3()
        r = Euler([math.radians(v) for v in e]).to_matrix()
        pb.rotation_quaternion = (r0.inverted() @ r @ r0).to_quaternion()
    bpy.context.view_layer.update()


def probe(arm):
    """Signos: +X por hueso a dónde mueve la PUNTERA (adelante/atrás/arriba)."""
    base = {}
    set_pose(arm, {}, 0.0)
    toe = lambda s: (arm.matrix_world @ arm.pose.bones[f'foot{s}'].matrix
                     @ Vector((0, -0.13, -0.02)))
    for s in 'LR':
        base[s] = toe(s)
    out = {}
    for bn, e in (('thighL', (20, 0, 0)), ('shinL', (20, 0, 0)), ('footL', (20, 0, 0)),
                  ('footR', (20, 0, 0))):
        set_pose(arm, {bn: e}, 0.0)
        s = bn[-1]
        d = toe(s) - base[s]
        # en Blender del rig: -Y = delante del personaje, +Z = arriba
        out[bn] = f'atrás {d.y*100:+.0f} cm, alto {d.z*100:+.0f} cm'
    return out


def rebuild(arm, name, specs):
    old = bpy.data.actions.get(name)
    if old:
        old.name = name + '_discard'
    arm.animation_data_clear()
    for f, pose, h in specs:
        bpy.context.scene.frame_set(f)
        set_pose(arm, pose, h)
        for pb in arm.pose.bones:
            pb.keyframe_insert('rotation_quaternion', frame=f)
        arm.pose.bones['hips'].keyframe_insert('location', frame=f)
    act = arm.animation_data.action
    act.name = name
    act.use_fake_user = True
    for a in list(bpy.data.actions):
        if a.name.endswith('_discard'):
            bpy.data.actions.remove(a)
    # curva de paso lineal salvo el tramo de cierre (ease ya está muestreado)
    for c in act.layers[0].strips[0].channelbags[0].fcurves:
        for kp in c.keyframe_points:
            kp.interpolation = 'LINEAR'
    return act


def calf_measure(arm, specs0):
    """Delta de altura para que el pie congelado del fotograma 1 toque el suelo
    con 0,5 cm de juego (umbral de apoyo de diagnostico.py es 2 cm)."""
    f, pose, h = specs0
    bpy.context.scene.frame_set(1)
    set_pose(arm, pose, h)
    zs = []
    for s in 'LR':
        p = arm.matrix_world @ arm.pose.bones[f'foot{s}'].matrix @ Vector((0, -0.13, -0.02))
        t = arm.matrix_world @ arm.pose.bones[f'foot{s}'].matrix @ Vector((0, 0.02, -0.02))
        zs += [p.z, t.z]
    return 0.005 - min(zs)


def shift(specs, d):
    return [(f, q, h + d) for f, q, h in specs]


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    src, dst = argv[0], argv[1]
    sc = bpy.data.scenes.new('LocRebake')
    bpy.context.window.scene = sc
    bpy.ops.import_scene.gltf(filepath=src)
    arm = next(o for o in sc.objects if o.type == 'ARMATURE')
    tracks = [t.name for t in arm.animation_data.nla_tracks]
    acts = {t.name: t.strips[0].action for t in arm.animation_data.nla_tracks if t.strips}
    for t in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(t)
    if '--probe' in argv:
        bpy.context.scene.frame_set(1)
        set_pose(arm, {}, 0.0)
        print('PROBE', probe(arm))
        return
    w0 = joints('walk', 26, 22, 0.022, KEYS_LEG_B if '--b' in argv else KEYS_LEG)
    r0 = joints('run', 16, 40, 0.045, KEYS_RUN_B if '--b' in argv else KEYS_RUN)
    dw = calf_measure(arm, w0[0])
    dr = calf_measure(arm, r0[0])
    print('CALIB hip-offset', round(dw, 4), round(dr, 4))
    aw = rebuild(arm, 'Caminar', shift(w0, dw))
    ar = rebuild(arm, 'Correr', shift(r0, dr))
    ad = arm.animation_data or arm.animation_data_create()
    for cn, a in (('Caminar', aw), ('Correr', ar)):
        tr = ad.nla_tracks.new()
        tr.name = cn
        tr.strips.new(cn, 1, a)
    for cn in tracks:
        if cn in ('Caminar', 'Correr'):
            continue
        a = acts.get(cn)
        if a is None:
            continue
        a.use_fake_user = True
        tr = ad.nla_tracks.new()
        tr.name = cn
        tr.strips.new(cn, int(round(a.frame_range[0])), a)
    assert sorted(tracks) == sorted(t.name for t in ad.nla_tracks), 'faltan clips'
    for o in list(sc.objects):
        if o.type not in ('ARMATURE', 'MESH'):
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    os.makedirs(os.path.dirname(os.path.abspath(dst)) or '.', exist_ok=True)
    with bpy.context.temp_override(scene=sc, view_layer=sc.view_layers[0]):
        bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=True,
                                  export_animations=True, export_animation_mode='NLA_TRACKS',
                                  export_skins=True, export_yup=True, export_apply=False,
                                  export_materials='EXPORT', use_active_scene=True)
    print('OK', dst)


main()
