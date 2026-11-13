# Reconstrucción biomecánica de ciclos de locomoción (Caminar/Correr) para los
# rigs humanoide del proyecto (base YW / Blender-chan), reutilizable por
# personaje vía config JSON (config/*.json).
#
# Síntoma que corrige (medido 2026-11-12 sobre los GLB publicados):
#  - cadera con curva escrita sin resolver las piernas: rebote pico-pico
#    4,2 cm en Caminar y 9,9 cm en Correr, DESPLANTADA en el intercambio de
#    apoyo (los pies despegaban y volvían a caer -> "saltitos");
#  - rodilla de apoyo sobreextendida en el contacto (171-173°) y pie que barre
#    el suelo en la fase de apoyo.
#
# Método por fotograma. El rig exportado NO cambia: cero huesos nuevos, cero
# constraints al exportar (el IK se hornea a cuaterniones locales, como
# `pipeline_core.bake_ik`), cero canales de escala:
#  1. CONTACTO: marcadores de suela (talón y puntera por pie). Un marcador
#     que toca el suelo queda CLAVADO en su posición del mundo hasta que el
#     pie despega. El pie rueda sobre sus clavos: aterrizaje con talón ->
#     apoyo plano -> despegue de puntera. Cero deslizamiento por construcción.
#  2. CADERA RESUELTA por geometría: para cada lado en apoyo, tobillo en la
#     posición corregida por clavos y rodilla en el ángulo objetivo del frame
#     dentro de su segmento de apoyo (knee_contact -> knee_mid -> knee_takeoff,
#     ley del coseno): UNA altura de cadera (descontando el offset fijo
#     cadera->muslo medido de la armadura). Doble apoyo: la MÁS BAJA de las
#     dos requeridas (ningún pie se despega; la otra pierna se flexiona más).
#     Vuelo (Correr): arco original. Suavizado vertical ventana 3 envolvente;
#     frame final iguala al primero (bucle cerrado).
#  3. CoG: apoyo simple -> cadera sobre el tobillo, adelantada
#     cog_offset_cm en la línea del pie; doble -> media de tobillos. El pie
#     delantero se extiende en el contacto porque el ángulo objetivo allí es
#     knee_contact_deg (< 180°), no rectitud forzada.
#  4. HOLGURA: si la cadera nueva hundiría un pie en balanceo bajo el suelo,
#     se sube la cadera esos frames, topada a 0.99 de la extensión máxima de
#     la pierna de apoyo.
#
# Torso, cabeza y brazos conservan sus curvas: al trasladar `hips` los hijos
# siguen por jerarquía; la coordinación brazos/piernas del clip fuente se
# mantiene y Reposo->Caminar->Correr crossfadea igual (nombres, duraciones y
# FPS no cambian).
#
# Uso dentro de Blender (importa sólo bpy/mathutils):
#   import locomotion
#   report = {}
#   for clip in ('Caminar', 'Correr'):
#       locomotion.rebuild(armadura, cfg, clip, report)
import math

import bpy
from mathutils import Matrix, Vector




def _foot_frame(arm, cfg):
    """(toe_local, heel_local) en espacio local del hueso pie. Derivadas de
    la geometría en reposo del RIG (no de los ejes del hueso, que en este
    esqueleto van en diagonal): la suela mide desde los vértices de la malla
    vinculada (o los valores de config `sole_markers`) y se convierte a local
    con la matriz de reposo, de modo que los marcadores roten con la inclinación
    del pie durante la zancada."""
    out = {}
    m = cfg.get('sole_markers', {})
    drop = m.get('sole_drop_cm', 10.4) / 100.0     # suela bajo el tobillo
    fwd = m.get('toe_forward_cm', 15.7) / 100.0    # puntera por delante
    back = m.get('heel_back_cm', 5.6) / 100.0      # talón por detrás
    for s in ('L', 'R'):
        bn = cfg['bones'][f'foot{s}']
        b = arm.data.bones[bn]
        d = b.tail_local - b.head_local
        d.z = 0.0
        if d.length < 1e-6:
            d = Vector((0, -1, 0))
        d.normalize()
        Rm = b.matrix_local.to_3x3()              # rotación de reposo
        toe_w = b.head_local + Vector((d.x * fwd, d.y * fwd, -drop))
        heel_w = b.head_local + Vector((-d.x * back, -d.y * back, -drop))
        out[s] = (Rm.inverted() @ (toe_w - b.head_local),
                  Rm.inverted() @ (heel_w - b.head_local))
    return out


def capture(arm, cfg, f0, f1):
    """Snapshot FK del clip fuente en espacio de armadura."""
    B = cfg['bones']
    ft = _foot_frame(arm, cfg)
    out = {}
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f)
        bpy.context.view_layer.update()
        r = {'hipsM': arm.pose.bones[B['hips']].matrix.copy(),
             'hipLoc': tuple(arm.pose.bones[B['hips']].location)}
        for s in ('L', 'R'):
            fm = arm.pose.bones[B[f'foot{s}']].matrix
            r[f'foot{s}'] = fm.copy()
            r[f'toe{s}'] = fm @ ft[s][0]
            r[f'heel{s}'] = fm @ ft[s][1]
            r[f'thig{s}'] = arm.pose.bones[B[f'thigh{s}']].matrix.translation.copy()
            r[f'knee{s}'] = arm.pose.bones[B[f'shin{s}']].matrix.translation.copy()
        out[f] = r
    return out


def leg_lengths(arm, cfg):
    B = cfg['bones']
    return {s: (arm.data.bones[B[f'thigh{s}']].length,
                arm.data.bones[B[f'shin{s}']].length) for s in ('L', 'R')}


def _dist(a, b, deg):
    """Distancia muslo-cabeza->tobillo con la rodilla en `deg` internos."""
    c = math.cos(math.radians(deg))
    return math.sqrt(max(a * a + b * b - 2 * a * b * c, 1e-6))


def _schedule(i, n, kc, km, kt):
    """Ángulo de rodilla en la posición i de un apoyo de n frames."""
    if n <= 1:
        return kc
    t = i / (n - 1)
    if t < 0.45:
        return kc + (km - kc) * (t / 0.45)
    return km + (kt - km) * ((t - 0.45) / 0.55)


def solve(snap, cfg, clip, L, rest):
    """Cálculo puro (sin tocar el armazón). `rest` es la geometría de reposo
    de los pies (ver capture).
    Devuelve (hips_pos, delta, foot_new, support, metrics)."""
    C = cfg['locomotion'][clip]
    f0, f1 = cfg['clips'][clip]['f0'], cfg['clips'][clip]['f1']
    tol = C['ground_tol_cm'] / 100.0
    mins = sorted(min(snap[f][k + s].z for s in 'LR' for k in ('heel', 'toe'))
                  for f in range(f0, f1))          # el cierre no define suelo
    ground = mins[max(1, len(mins) // 25)]

    # offset fijo cadera->cabeza de muslo, en espacio local de la cadera
    Rh = snap[f0]['hipsM'].to_3x3()
    off_local = {s: Rh.inverted() @ (snap[f0][f'thig{s}'] -
                                     snap[f0]['hipsM'].translation)
                 for s in ('L', 'R')}

    # 1) segmentos de apoyo del pie (cualquier marcador en banda); el run que
    #    termina en f1 continúa en f0 (bucle)
    grounded = {s: [f for f in range(f0, f1 + 1)
                    if min(snap[f][k + s].z for k in ('heel', 'toe')) <= ground + tol]
                for s in ('L', 'R')}
    seg = {'L': [], 'R': []}
    for s in ('L', 'R'):
        run = []
        for f in range(f0, f1 + 1):
            if f in grounded[s]:
                run.append(f)
            elif run:
                seg[s].append(run)
                run = []
        if run:
            seg[s].append(run)
        if f1 != f0 and len(seg[s]) > 1 and seg[s][-1][-1] == f1 and seg[s][0][0] == f0:
            seg[s][0] = seg[s].pop() + seg[s][0]
    runs = {}                        # (s, f) -> (i, n)
    seg_ref = {'L': {}, 'R': {}}     # f -> ancla de su run
    for s in ('L', 'R'):
        for r in seg[s]:
            # ancla = frame de ASIENTO MÁXIMO del run (la suela más baja): un
            # aterrizaje alto que sigue hundiendo 1-2 cm de compresión no es
            # arrastre, pero clavarse en el primer frame lo simularía.
            anchor = min(r, key=lambda g: min(snap[g]['toe' + s].z,
                                              snap[g]['heel' + s].z))
            for i, f in enumerate(r):
                runs[(s, f)] = (i, len(r))
                seg_ref[s][f] = anchor

    # 2) clavos: pose plantada por pie. Al entrar en apoyo se congela la
    #    posición de los marcadores del ANCLA; mientras dure el apoyo el pie no
    #    se mueve de ahí (arrastre 0). None = pie en vuelo.
    pins = {}
    for f in range(f0, f1 + 1):
        pins[f] = {}
        for s in ('L', 'R'):
            a = seg_ref[s].get(f)
            if a is None:
                continue
            pins[f][(s, 'heel')] = snap[a]['heel' + s].copy()
            pins[f][(s, 'toe')] = snap[a]['toe' + s].copy()
    if f1 != f0:
        pins[f1] = dict(pins[f0])

    # 3) pies corregidos. PLANTAR (no sólo trasladar): mientras un pie está en
    #    apoyo se fija su POSE DE MUNDO completa a la del primer fotograma en
    #    contacto (ancla del run). Traslapslar el tobillo pero dejar libre la
    #    rotación de la rótula (como hacía la versión previa) hacía barrer la
    #    puntera en la rodadura talón->puntera: el diagnóstico marcaba ese
    #    barrido como arrastre (48 cm/f, peor que el original). Plantar
    #    elimina el arrastre por construcción a costa de una estilización (sin
    #    mecedura de tobillo), coherente con un caminar bajo y controlado.
    #    `foot_rot[f][s]` es el cuaternión de MUNDO objetivo del pie (None =
    #    pie en vuelo, conserva su rotación FK).
    foot_new = {}
    foot_rot = {}
    for f in range(f0, f1 + 1):
        fn = {}
        fr = {}
        for s in ('L', 'R'):
            a = seg_ref[s].get(f)
            if a is None:
                fn[s] = snap[f][f'foot{s}'].copy()
                fr[s] = None
            else:
                fn[s] = snap[a]['foot' + s].copy()
                fr[s] = snap[a]['foot' + s].to_quaternion()
        foot_new[f] = fn
        foot_rot[f] = fr
    if f1 != f0:
        foot_new[f1] = {s: foot_new[f0][s].copy() for s in ('L', 'R')}
        foot_rot[f1] = dict(foot_rot[f0])

    support = {f: {s for s in ('L', 'R') if any((s, k) in pins[f]
                                                for k in ('heel', 'toe'))}
               for f in range(f0, f1 + 1)}

    # 4) cadera resuelta
    hips_pos, raw_z = {}, {}
    for f in range(f0, f1 + 1):
        Rw = snap[f]['hipsM'].to_3x3()
        su = support[f]
        if not su:
            hips_pos[f] = snap[f]['hipsM'].translation.copy()
            raw_z[f] = hips_pos[f].z
            continue
        zs, xys = [], []
        for s in sorted(su):
            i, n = runs.get((s, f), (0, 1))
            deg = _schedule(i, n, C['knee_contact_deg'], C['knee_mid_deg'],
                            C['knee_takeoff_deg'])
            d = _dist(*L[s], deg)
            ow = Rw @ off_local[s]            # cadera->cabeza de muslo, mundo
            ank = foot_new[f][s].translation
            if len(su) == 2:
                hip_xy = (foot_new[f]['L'].translation +
                          foot_new[f]['R'].translation) / 2
            else:
                fv = snap[f]['toe' + s] - snap[f]['heel' + s]
                fv.z = 0.0
                hip_xy = ank + (fv.normalized() * C['cog_offset_cm'] / 100.0
                                if fv.length > 1e-6 else Vector((0, 0, 0)))
            hip_xy.z = 0.0
            xys.append(hip_xy)
            h = math.hypot(hip_xy.x + ow.x - ank.x, hip_xy.y + ow.y - ank.y)
            h = min(h, d * 0.999)
            zs.append(ank.z + math.sqrt(max(d * d - h * h, 1e-6)) - ow.z)
        xy = sum(xys, Vector((0, 0, 0))) / len(xys)
        hips_pos[f] = Vector((xy.x, xy.y, min(zs)))
        raw_z[f] = min(zs)

    # suavizado vertical envolvente + cierre de bucle
    fs = list(range(f0, f1 + 1))
    sm = {}
    for i, f in enumerate(fs):
        w = [raw_z[fs[(i - 1) % len(fs)]], raw_z[f], raw_z[fs[(i + 1) % len(fs)]]]
        sm[f] = sum(w) / 3.0
    if f1 != f0:
        sm[f1] = sm[f0]
        hips_pos[f1].x = hips_pos[f0].x
        hips_pos[f1].y = hips_pos[f0].y
    for f in fs:
        hips_pos[f].z = sm[f]

    # 5) holgura del pie en balanceo, topada por extensión de la pierna de apoyo
    clr = C['swing_clearance_cm'] / 100.0
    for f in fs:
        d = hips_pos[f] - snap[f]['hipsM'].translation
        need = 0.0
        for s in ('L', 'R'):
            if s in support[f]:
                continue
            lo = min((snap[f][k + s] + d).z for k in ('heel', 'toe'))
            need = max(need, ground + clr - lo)
        if need > 0.001:
            for g in (f - 2, f - 1, f, f + 1, f + 2):
                if g not in hips_pos:
                    continue
                caps = [L[s][0] + L[s][1] for s in support.get(g, ())]
                if caps:
                    ank = min(foot_new[g][s].translation.z for s in support[g])
                    tope = ank + 0.99 * max(caps)
                    hips_pos[g].z = min(hips_pos[g].z + need / 3.0, tope)
                else:
                    hips_pos[g].z += need / 3.0
    if f1 != f0:
        z = (hips_pos[f0].z + hips_pos[f1].z) / 2
        hips_pos[f0].z = hips_pos[f1].z = z

    delta = {f: hips_pos[f] - snap[f]['hipsM'].translation for f in fs}
    metrics = {
        'rebote_pp_cm': round((max(hips_pos[f].z for f in fs) -
                               min(hips_pos[f].z for f in fs)) * 100, 1),
        'apoyoL_f': len(grounded['L']), 'apoyoR_f': len(grounded['R']),
        'suelo_cm': round(ground * 100, 1),
        'delta_xy_max_cm': round(max(max(abs(delta[f].x), abs(delta[f].y))
                                     for f in fs) * 100, 1)}
    return hips_pos, delta, foot_new, support, metrics


# ------------------------------------------------------------------ horneado
def _fcs(act, path, bone, optional=False):
    """Todas las fcurves de `bone`.`path` por array_index (lista: en 4.4+ cada
    strip NLA tiene su propio canalbag y la evaluación puede leer uno distinto
    del que devuelve el último; escribir sólo en uno dejaba el FK de origen
    intacto). Los clips fuente ya keyfran cadera y piernas; si faltan, el
    pipeline debe avisar, no crear."""
    dp = f'pose.bones["{bone}"].{path}'
    out = {}
    for l in act.layers:
        for s in l.strips:
            for cb in s.channelbags:
                for fc in cb.fcurves:
                    if fc.data_path == dp:
                        out.setdefault(fc.array_index, []).append(fc)
    need = 4 if 'rotation' in path else 3
    missing = [i for i in range(need) if i not in out]
    if missing:
        if optional:
            return {}
        raise RuntimeError(f'Action {act.name}: faltan fcurves {dp} {missing}')
    return out


def _rekey(fc, f, value):
    """Valor en f sin duplicar; LINEAL (con pies clavados en f y f+1, una
    curva Bezier combaría separándolos del clavo). `fc` puede ser una lista de
    fcurves gemelas: se reescriben todas. Blender 5.x con REPLACE devuelve
    None: se busca la clave insertada por cercanía."""
    for curve in (fc if isinstance(fc, list) else [fc]):
        for kp in list(curve.keyframe_points):
            if abs(kp.co.x - f) < 0.01:
                curve.keyframe_points.remove(kp)
        curve.keyframe_points.insert(f, value)
        min(curve.keyframe_points,
            key=lambda c: abs(c.co.x - f)).interpolation = 'LINEAR'


def bake(arm, cfg, clip, snap, hips_pos, delta, foot_new, support):
    """Reescribe la Action del clip (mutando el strip NLA en vivo, como
    pipeline_core.fix_slide):
      - hips.location: cadera resuelta;
      - muslo/rodilla en apoyo: cuaterniones IK horneados (objetivo el
        tobillo clavado; pole la rodilla fuente + delta -> conserva el plano
        de flexión hacia delante);
      - el resto: curvas fuente intactas."""
    B = cfg['bones']
    act = bpy.data.actions.get(clip)
    if act is None:
        raise RuntimeError(f'falta la Action {clip}')
    was_muted = {}
    if arm.animation_data:
        for t in arm.animation_data.nla_tracks:
            was_muted[t.name] = t.mute
            t.mute = True
    arm.animation_data.action = act
    R_inv = arm.data.bones[B['hips']].matrix_local.to_3x3().inverted()
    f0, f1 = cfg['clips'][clip]['f0'], cfg['clips'][clip]['f1']
    fHip = _fcs(act, 'location', B['hips'])
    fLeg = {}
    for s in ('L', 'R'):
        for bn in (B[f'thigh{s}'], B[f'shin{s}'], B[f'foot{s}']):
            fLeg[bn] = {'rotation_quaternion': _fcs(act, 'rotation_quaternion', bn),
                        'location': _fcs(act, 'location', bn),
                        'scale': _fcs(act, 'scale', bn, optional=True)}
    errs = []
    ctl = bpy.data.objects.new('~t', None)
    pk = bpy.data.objects.new('~p', None)
    for o in (ctl, pk):
        arm.users_collection[0].objects.link(o)
    for f in range(f0, f1 + 1):
        # pose = curva ya reescrita en f0..f-1 + fuente en f..f1
        bpy.context.scene.frame_set(f)
        bpy.context.view_layer.update()
        new_loc = Vector(snap[f]['hipLoc']) + R_inv @ delta[f]
        for i in range(3):
            _rekey(fHip[i], f, new_loc[i])
        bpy.context.view_layer.update()
        for s in sorted(support[f]):
            th = arm.pose.bones[B[f'thigh{s}']]
            sh = arm.pose.bones[B[f'shin{s}']]
            ft = arm.pose.bones[B[f'foot{s}']]
            tgt = foot_new[f][s]                        # pose plantada (ancla)
            ctl.matrix_world = arm.matrix_world.inverted() @ Matrix.Translation(tgt.translation)
            pole = snap[f][f'knee{s}'] + delta[f]
            pk.matrix_world = arm.matrix_world.inverted() @ Matrix.Translation(pole)
            con = ft.constraints.new('IK')
            con.chain_count = 2
            con.target = ctl
            con.pole_target = pk
            con.pole_angle = 0.0
            con.use_tail = False
            con.iterations = 50
            bpy.context.view_layer.update()
            errs.append(round((ft.matrix.translation - tgt.translation).length * 100, 2))
            # El solver IK escribe en la matriz EVALUADA, no en matrix_basis:
            # capturar la base con el IK activo daría el FK sin resolver (fue
            # la causa de pies a 1,6 m). Despejamos la base del canal (no del
            # padre) con la fórmula FK exacta  M = par.matrix @ rest_rel @ basis.
            # El PIE no está en la cadena (use_tail/efector), su rotación la
            # manda el FK: la fijamos a la pose plantada para que la puntera no
            # barra durante la rodadura de rótula (arrastre por construcción).
            solved = {}
            for pb2, want in ((th, None), (sh, None), (ft, tgt)):
                b2 = pb2.bone
                rest_rel = (b2.parent.matrix_local.inverted()
                            @ b2.matrix_local) if b2.parent else b2.matrix_local
                if want is None:                         # resuelto por IK
                    cur = pb2.matrix
                else:                                    # pose de pie deseada
                    cur = want
                basis = rest_rel.inverted() @ (
                    (pb2.parent.matrix.inverted() if pb2.parent
                     else Matrix.Identity(4)) @ cur)
                solved[pb2.name] = basis.decompose()     # loc, quat, scale
            ft.constraints.remove(con)
            for bn, (loc, quat, sca) in solved.items():
                fq = fLeg[bn]
                for i in range(4):
                    _rekey(fq['rotation_quaternion'][i], f, quat[i])
                for i in range(3):
                    _rekey(fq['location'][i], f, loc[i])
                    if fq.get('scale'):
                        _rekey(fq['scale'][i], f, sca[i])
    bpy.data.objects.remove(ctl, do_unlink=True)
    bpy.data.objects.remove(pk, do_unlink=True)
    arm.animation_data.action = None
    for t in (arm.animation_data.nla_tracks if arm.animation_data else []):
        t.mute = was_muted.get(t.name, False)
    return errs


def _solo(arm, act):
    """Silencia el stack NLA y deja visible sólo `act` (patrón pipeline_core:
    al importar un GLB con pistas NLA, todas solapan en el mismo rango)."""
    if arm.animation_data:
        for t in arm.animation_data.nla_tracks:
            t.mute = True
    arm.animation_data.action = act


def rebuild(arm, cfg, clip, report):
    f0, f1 = cfg['clips'][clip]['f0'], cfg['clips'][clip]['f1']
    act = bpy.data.actions.get(clip)
    if act is None:
        raise RuntimeError(f'falta la Action {clip}')
    _solo(arm, act)
    snap = capture(arm, cfg, f0, f1)
    L = leg_lengths(arm, cfg)
    rest = _foot_frame(arm, cfg)
    hips_pos, delta, foot_new, support, m = solve(snap, cfg, clip, L, rest)
    errs = bake(arm, cfg, clip, snap, hips_pos, delta, foot_new, support)
    m['ik_err_max_cm'] = max(errs, default=0.0)
    m['ik_frames'] = len(errs)
    _solo(arm, None)
    report[clip] = m
    return m
