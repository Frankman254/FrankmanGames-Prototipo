# Corrección de animación de los pilotos anime (2026-11-12). Etapa de
# post-proceso sobre los GLB generados por `heroe_anime.py`: carga el GLB
# publicado en assets/models/, arregla y reexporta al mismo archivo. El mismo
# fix() sirve para cazador/centinela/oráculo: si el modelo no tiene 'Disparar'
# o 'Lanzar', se salta ese fix. Es idempotente: puede correrse sobre un GLB ya
# corregido (las dos acciones se reconstruyen desde cero; la comprobación de
# pies deja intactas las curvas limpias).
# Uso (Blender en segundo plano, o MCP):
#   blender --background --python scripts/blender/cazador_anime_fix.py -- \
#       cazador_anime.glb cazador_anime.glb
#
# Qué corrige (medido con diagnostico.py y con fix_slide sobre los GLB):
#  - Pies en Caminar/Correr: los pilotos son walk-in-place (hips sin avance;
#    root motion en el motor). `diagnostico.py` contaba como "derrape" el barrido
#    de puntera/talón en las transiciones talón->puntera (~15 cm/f), que es la
#    rótula pivotando, NO deslizamiento: clavar ahí la puntera rompía el paso.
#    fix_slide mide sólo el desplazo de la puntera con la SUELA A NIVEL (pie
#    plano, sin rodar); en estos clips eso es 0.0 cm -> deja la curva intacta.
#    Si algún clip deslizara de verdad (>2 cm/f en plano) desplaza `hips` para
#    inmovilizar esa puntera.
#  - Disparar ilegible: mano R a 24-50 cm de la cuerda. Reescrito con IK de
#    tres huesos horneada por fotograma (muñeca L a la empuñadura, muñeca R
#    a la muesca). Todos los blancos dentro de 0.44 m del hombro (alcance
#    óseo 0.468 m), medido sobre el armazón.
#  - Lanzar ilegible: reescrito con IK (carga detrás de la nuca, suelta por
#    delante, izquierdo apunta).
#  - El último fotograma de Disparar/Lanzar es la pose neutra de Reposo:
#    transición limpia al volver.
# v2 respecto a v1 (problemas comprobados en la sesión MCP):
#  - Sin clavículas: el skin del juego tiene 16 joints; huesos nuevos
#    generaban avisos "not found" y cambios de estructura.
#  - chain_count=3 (v1 usaba 2 y el brazo entero no perseguía el blanco).
#  - Export por NLA_TRACKS con pistas reconstruidas: no se arrastran acciones
#    duplicadas (.001-.004) ni pistas _old de ejecuciones anteriores.
import math
import os
import sys

import bpy
from mathutils import Euler, Matrix, Vector

W = os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..', 'assets', 'models') \
    if '__file__' in dir() else 'assets/models'
ARMS = {'upperArmL': (0, 12, 0), 'upperArmR': (0, -12, 0), 'foreArmL': (-22, 0, 0), 'foreArmR': (-22, 0, 0)}
CHAINS = {'L': ('upperArmL', 'foreArmL', 'handL'), 'R': ('upperArmR', 'foreArmR', 'handR')}


def p(**kw):
    return {**ARMS, **kw}


def action_fcurves(act):
    """Todas las fcurves de una acción en Blender 5.x (acciones con capas)."""
    for l in act.layers:
        for s in l.strips:
            for cb in s.channelbags:
                yield from cb.fcurves


def new_fcurve(act, path, index):
    for l in act.layers:
        for s in l.strips:
            for cb in s.channelbags:
                for c in cb.fcurves:
                    if c.data_path == path and c.array_index == index:
                        return c
                return cb.fcurves.new(path, index=index)
    return None


# blancos del arquero, en el espacio del modelo (mira a -Y, z arriba, m).
# Alcance hombro→muñeca = 0.468 m; todos por debajo de 0.45 para margen.
GRIP = Vector((0.09, -0.30, 1.32))          # empuñadura (muñeca L)
NOCK_FULL = Vector((-0.05, -0.08, 1.45))    # cuerda junto a la barbilla
NOCK_HALF = Vector((-0.04, -0.22, 1.40))    # a media traída
RELEASE = Vector((-0.09, -0.20, 1.38))      # follow-through tras soltar
POLE_L = Vector((0.35, 0.35, 0.85))         # codo izquierdo: abajo y atrás
POLE_R = Vector((-0.45, 0.30, 1.30))        # codo derecho: abierto y atrás
THROW_BACK = Vector((-0.22, 0.22, 1.56))    # mano R detrás de la nuca
THROW_FWD = Vector((-0.08, -0.38, 1.28))    # suelta del lanzamiento
AIM_L = Vector((0.26, -0.32, 1.30))         # mano L apuntando
POLE_THR_R = Vector((-0.45, 0.35, 1.45))
POLE_AIM_L = Vector((0.45, 0.30, 0.90))


def solo(arm, act):
    if arm.animation_data:
        for t in arm.animation_data.nla_tracks:
            t.mute = True
        arm.animation_data.action = act


def contact_bone_space(arm):
    """Puntos de apoyo (puntera, talón) en espacio local de hueso de cada pie."""
    out = {}
    for s in ('L', 'R'):
        b = arm.data.bones['foot' + s]
        d = b.tail_local - b.head_local
        ml_inv = b.matrix_local.inverted()
        pts = [ml_inv @ (b.head_local + d * k + Vector((0, 0, -0.055))) for k in (0.92, 0.08)]
        out[s] = (b.name, pts)
    return out


# ------------------------------------------------------- 1. lock de apoyo
def _set_hips(fcs, f, orig, off_local):
    """Valor absoluto = cadera original (hueso-local) + corrección local."""
    for i in (0, 1, 2):
        fc = fcs[i]
        for kp in list(fc.keyframe_points):
            if int(round(kp.co.x)) == f:
                fc.keyframe_points.remove(kp)
        fc.keyframe_points.insert(f, orig[i] + off_local[i], options={'REPLACE'})
        kp = min(fc.keyframe_points, key=lambda c: abs(c.co.x - f))
        kp.interpolation = 'LINEAR'


def _sole_z(arm, cps):
    """{lado: (z_min, z_max)} y {lado: Vector puntera}. Espacio armadura.
    Un pie está PLANO (no rueda) si puntera y talón están a la misma altura."""
    rng, toe = {}, {}
    for s, (bn, pts) in cps.items():
        M = arm.pose.bones[bn].matrix
        vs = [M @ p for p in pts]
        zs = [v.z for v in vs]
        rng[s] = (min(zs), max(zs))
        toe[s] = vs[0]                      # idx 0 = puntera (contact_bone_space)
    return rng, toe


def fix_slide(arm, clips=('Caminar', 'Correr')):
    """Sólo hay derrape real si, con el pie APLANTADO (puntera y talón ambos a
    < ROLL del suelo propio de ese pie, sin rodar), su puntera se mueve en XY.
    En las transiciones talón->puntera el punto más bajo barre porque la rótula
    pivot: NO es derrape y no se toca (clavarlo rompería el paso, como pasaba
    anclando la puntera durante la rodadura). Mide el desplazamiento de puntera
    entre frames consecutivos aplastados; si el máximo supera TOL, desplaza
    hips.location (en su espacio local) para inmovilizar esa puntera; si no,
    deja la curva intacta. Los GLB piloto son walk-in-place: ya cumplen TOL y
    salen sin modificar; el fix sirve para clips que sí deslicen de verdad.
    off[f1]=off[f0] para respetar el bucle.
    Devuelve {clip: (derrape_max_cm, corregido|ok)}."""
    cps = contact_bone_space(arm)
    ROLL = 0.02          # banda: puntera y talón dentro -> pie plano
    TOL = 0.02           # >2 cm/f en plano se considera deslizamiento real
    R_inv = arm.data.bones['hips'].matrix_local.to_3x3().inverted()
    report = {}
    live = {t.name for t in arm.animation_data.nla_tracks} if arm.animation_data else set()
    for cname in clips:
        if cname not in live:
            continue
        act = next(a for a in bpy.data.actions if a.name == cname)
        solo(arm, act)
        f0, f1 = int(round(act.frame_range[0])), int(round(act.frame_range[1]))
        fcs = {i: new_fcurve(act, 'pose.bones["hips"].location', i) for i in (0, 1, 2)}
        flat, origs, tp = {}, {}, {}        # flat[f]=set(pies planos); tp=fotograma
        for f in range(f0, f1 + 1):
            bpy.context.scene.frame_set(f)
            rng, toe = _sole_z(arm, cps)
            ground = min(rng[s][0] for s in rng)   # suelo de este fotograma
            # plano = suela a nivel (no rueda) y tocando el suelo
            flat[f] = {s for s in rng
                       if rng[s][1] - rng[s][0] < ROLL and rng[s][0] < ground + ROLL}
            tp[f] = {s: (toe[s].x, toe[s].y) for s in rng}
            hp = arm.pose.bones['hips']
            origs[f] = (hp.location.x, hp.location.y, hp.location.z)
        # derrape real: puntera de un pie plano que cambia de posición XY
        worst = 0.0
        for f in range(f0 + 1, f1 + 1):
            for s in (flat[f - 1] & flat[f]):
                d = math.hypot(tp[f][s][0] - tp[f - 1][s][0], tp[f][s][1] - tp[f - 1][s][1])
                if d > worst:
                    worst = d
        if worst <= TOL:
            report[cname] = (round(worst * 100, 1), 'ok')
            solo(arm, None)
            continue
        # integrador: ancla absoluta sobre la puntera del pie plano, por lado,
        # acumulada mientras ese pie sigue plano; se reinicia al despegar.
        anchor = {}
        cur = {}
        for f in range(f0, f1 + 1):
            for s in ('L', 'R'):
                if s in flat[f]:
                    if s not in cur:                       # entrada en plano
                        cur[s] = (tp[f][s][0], tp[f][s][1])
                    anchor[(f, s)] = cur[s]
                else:
                    cur.pop(s, None)
        off_raw = {}
        for f in range(f0, f1 + 1):
            ds = [Vector((anchor[(f, s)][0] - tp[f][s][0],
                          anchor[(f, s)][1] - tp[f][s][1], 0))
                  for s in ('L', 'R') if (f, s) in anchor]
            off_raw[f] = sum(ds, Vector((0, 0, 0))) / len(ds) if ds else None
        # rellenar huecos de doble-apoyo/vuelo con el valor vecino más cercano y
        # cerrar el bucle
        keys = [f for f in range(f0, f1 + 1) if off_raw[f] is not None]
        off = {}
        for f in range(f0, f1 + 1):
            if off_raw[f] is not None:
                off[f] = off_raw[f]
            else:
                near = min(keys, key=lambda k: abs(k - f))
                off[f] = off_raw[near]
        base = off[f0]
        for f in range(f0, f1 + 1):
            off[f] = off[f] - base
        off[f1] = off[f0]
        for f in range(f0, f1):
            _set_hips(fcs, f, origs[f], R_inv @ off[f])
        bpy.context.view_layer.update()
        flat2, toe2b = {}, {}
        for f in range(f0, f1 + 1):
            bpy.context.scene.frame_set(f)
            rng, toe = _sole_z(arm, cps)
            ground = min(rng[s][0] for s in rng)
            flat2[f] = {s for s in rng
                        if rng[s][1] - rng[s][0] < ROLL and rng[s][0] < ground + ROLL}
            toe2b[f] = {s: (toe[s].x, toe[s].y) for s in rng}
        after = 0.0
        for f in range(f0 + 1, f1 + 1):
            for s in (flat2[f - 1] & flat2[f]):
                after = max(after, math.hypot(toe2b[f][s][0] - toe2b[f - 1][s][0],
                                              toe2b[f][s][1] - toe2b[f - 1][s][1]))
        report[cname] = (round(worst * 100, 1), round(after * 100, 1))
    solo(arm, None)
    bpy.context.scene.frame_set(1)
    return report


# ------------------------------------------------------------- 2. IK horneada
def bake_ik(arm, chain, target, pole_pos):
    """Muñeca (head del último hueso de `chain`) en `target` (espacio armadura).
    chain_count=2 (hombro+codo) + use_tail=False: la cabeza de la mano llega
    exacta al blanco y la mano conserva su rotación natural."""
    ctl = bpy.data.objects.new('~ik', None)
    arm.users_collection[0].objects.link(ctl)
    pole = bpy.data.objects.new('~pk', None)
    arm.users_collection[0].objects.link(pole)
    pb = arm.pose.bones[chain[-1]]
    con = pb.constraints.new('IK')
    con.chain_count = 2
    con.target = ctl
    con.pole_target = pole
    con.pole_angle = 0.0
    con.use_tail = False   # apuntar a la cabeza (muñeca), no a la cola de la mano
    con.iterations = 50
    ctl.matrix_world = arm.matrix_world.inverted() @ Matrix.Translation(target)
    pole.matrix_world = arm.matrix_world.inverted() @ Matrix.Translation(pole_pos)
    bpy.context.view_layer.update()
    quats = {}
    for bn in chain[:2]:
        pb2 = arm.pose.bones[bn]
        parent = pb2.parent
        basis = (parent.matrix if parent else Matrix.Identity(4)).inverted() @ pb2.matrix
        quats[bn] = basis.to_quaternion()
    tip = (arm.matrix_world @ pb.matrix).translation
    pb.constraints.remove(con)
    bpy.data.objects.remove(ctl, do_unlink=True)
    bpy.data.objects.remove(pole, do_unlink=True)
    return quats, tip


def set_euler(pb, e):
    """Euler en espacio de reposo (la convención con la que están escritos los specs)."""
    rest = pb.bone.matrix_local.to_3x3()
    pb.rotation_quaternion = (rest.inverted() @ Euler([math.radians(v) for v in e]).to_matrix() @ rest).to_quaternion()


def frame_pose(arm, pose, report, f):
    """Pose completa del fotograma: huesos explícitos + muñecas por IK."""
    pose = dict(pose)
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    arm.pose.bones['hips'].location = pose.pop('~hips', (0, 0, 0))
    ik_sides = {s for s in CHAINS if f'~hand{s}' in pose}
    for bn, e in pose.items():
        if bn.startswith('~'):
            continue
        side = bn[-1]
        if side in ik_sides and bn in CHAINS[side][:2]:
            continue  # esta cadena la manda el IK
        set_euler(arm.pose.bones[bn], e)
    bpy.context.view_layer.update()
    quats = {}
    for s in ik_sides:
        tgt, pole = pose[f'~hand{s}']
        q, tip = bake_ik(arm, CHAINS[s], tgt, pole)
        quats.update(q)
        report[(s, f)] = round((tip - tgt).length * 100, 1)
    for bn, q in quats.items():
        arm.pose.bones[bn].rotation_quaternion = q
    bpy.context.view_layer.update()


def key_all(arm, f):
    for pb in arm.pose.bones:
        pb.keyframe_insert('rotation_quaternion', frame=f)
    arm.pose.bones['hips'].keyframe_insert('location', frame=f)


def build_clip(arm, name, specs, report):
    """specs: [(frame, pose)] con '~handL/handR': (target, pole) horneados a quat."""
    old = bpy.data.actions.get(name)
    if old:
        old.name = name + '_old'
    arm.animation_data_clear()
    act_report = {}
    for f, pose in specs:
        bpy.context.scene.frame_set(f)
        frame_pose(arm, pose, act_report, f)
        key_all(arm, f)
    act = arm.animation_data.action
    act.name = name
    act.use_fake_user = True
    report[name + '_error_cm'] = act_report
    solo(arm, None)
    return act


def fix_shoot(arm, report):
    specs = [
        (1, p()),
        (4, p(chest=(0, 0, -6), upperArmL=(-45, 14, 0), foreArmL=(-24, 0, 0),
              upperArmR=(-40, -16, 0), foreArmR=(-50, 0, 0), thighL=(-6, 0, 0), thighR=(6, 0, 0))),
        (8, dict(p(chest=(0, 0, -14), head=(0, 0, 6), thighL=(-12, 0, 0), thighR=(12, 0, 0)),
                 **{'~handL': (GRIP, POLE_L), '~handR': (NOCK_HALF, POLE_R)})),
        (15, dict(p(chest=(0, 0, -22), head=(-2, 0, 10), thighL=(-14, 0, 0), thighR=(14, 0, 0)),
                  **{'~handL': (GRIP, POLE_L), '~handR': (NOCK_FULL, POLE_R)})),
        (17, dict(p(chest=(2, 0, -18), head=(-2, 0, 8), thighL=(-14, 0, 0), thighR=(14, 0, 0)),
                  **{'~handL': (GRIP, POLE_L), '~handR': (RELEASE, POLE_R)})),
        (21, p(chest=(0, 0, -8), upperArmL=(-55, 12, 0), foreArmL=(-22, 0, 0),
               upperArmR=(-25, -14, 0), foreArmR=(-35, 0, 0))),
        (26, p()),
    ]
    return build_clip(arm, 'Disparar', specs, report)


def fix_throw(arm, report):
    specs = [
        (1, p()),
        (6, dict(p(chest=(-10, 0, 14), spine=(-4, 0, 6), head=(2, 0, -10), thighL=(-8, 0, 0), thighR=(8, 0, 0)),
                 **{'~handL': (AIM_L, POLE_AIM_L), '~handR': (THROW_BACK, POLE_THR_R)})),
        (13, dict(p(chest=(10, 0, -18), spine=(4, 0, -8), head=(-4, 0, 12), thighR=(-18, 0, 0), shinR=(10, 0, 0), thighL=(10, 0, 0)),
                  **{'~handL': (AIM_L, POLE_AIM_L), '~handR': (THROW_FWD, POLE_THR_R)})),
        (18, p(chest=(8, 0, -12), thighR=(-14, 0, 0), shinR=(8, 0, 0), thighL=(8, 0, 0),
               upperArmR=(-100, -20, 0), foreArmR=(-25, 0, 0), upperArmL=(-70, 14, 0), foreArmL=(-15, 0, 0))),
        (27, p()),
    ]
    return build_clip(arm, 'Lanzar', specs, report)


# ------------------------------------------------------------------ pipeline
def clean_sandboxes(scname):
    """Borra escenas sandbox de ejecuciones propias y libera acciones huérfanas."""
    for old_sc in list(bpy.data.scenes):
        if old_sc.name in (scname, 'FG_CazFix'):
            for o in list(old_sc.objects):
                bpy.data.objects.remove(o, do_unlink=True)
            bpy.data.scenes.remove(old_sc)
    for a in bpy.data.actions:
        a.use_fake_user = False
    for _ in range(5):
        bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)


def fix(in_name, out_name):
    src = os.path.join(W, in_name)
    dst = os.path.join(W, out_name)
    name = in_name.rsplit('.', 1)[0]
    scname = 'Fix_' + name
    clean_sandboxes(scname)
    sc = bpy.data.scenes.new(scname)
    bpy.context.window.scene = sc
    bpy.ops.import_scene.gltf(filepath=src)
    arm = next(o for o in sc.objects if o.type == 'ARMATURE')
    live = [t.name for t in arm.animation_data.nla_tracks]
    report = {'clips_fuente': live}
    report['slide_cm_f'] = fix_slide(arm)
    if 'Disparar' in live:
        fix_shoot(arm, report)
    if 'Lanzar' in live:
        fix_throw(arm, report)
    bpy.context.scene.frame_set(1)
    # pistas NLA finales: los clips en vivo, con las acciones corregidas dentro
    arm.animation_data_clear()
    ad = arm.animation_data or arm.animation_data_create()
    for cn in live:
        act = bpy.data.actions.get(cn)
        if act is None:
            continue
        act.use_fake_user = True
        tr = ad.nla_tracks.new()
        tr.name = cn
        tr.strips.new(cn, int(round(act.frame_range[0])), act)
    # exportar solo el modelo: limpiar extras, seleccionar piel+armazón
    for o in list(sc.objects):
        if o.type not in ('ARMATURE', 'MESH') or o.name.startswith('~') \
                or any('not_exported' in c.name for c in o.users_collection):
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    arm.hide_set(False)
    for o in sc.objects:
        if o.type in ('ARMATURE', 'MESH'):
            o.hide_set(False)
            o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    sel = {o.name for o in bpy.context.selected_objects}
    assert sel == {o.name for o in sc.objects}, f'selección inconsistente: {sorted(sel)}'
    raiz = os.path.normpath(os.path.join(W, '..', '..'))
    blend = os.path.join(raiz, 'arte', 'blender', name + '_fix.blend')
    os.makedirs(os.path.dirname(blend), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    with bpy.context.temp_override(scene=sc, view_layer=sc.view_layers[0]):
        bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=True,
                                  export_animations=True, export_animation_mode='NLA_TRACKS',
                                  export_skins=True, export_yup=True, export_apply=False,
                                  export_materials='EXPORT', use_active_scene=True)
    return report


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    print(fix(argv[0], argv[1]))
