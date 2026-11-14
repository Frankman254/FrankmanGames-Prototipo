# Ave familiar: UN esqueleto con alas y dos variantes de malla (D-17, 2026-11-14).
#   "…/Blender" --background --python scripts/blender/ave.py
# Escribe assets/models/ave_gallote.glb y assets/models/ave_tijereta.glb y salva
# arte/blender/ave.blend. NO se integra: nada toca data/ ni src/.
#
#   Gallote  (gallinazo carroñero): cuerpo negro encorvado y redondo, cuello y
#            cabeza pelados color carne, papada hundida, cola en abanico corto.
#            ~0,9 m posado.
#   Tijereta (ave marina de costa): cuerpo fino, alas larguísimas y puntiagudas
#            (envergadura ~1,6 m en el planeo), cola ahorquillada muy larga,
#            pico de daga y bolsa gular roja.
#
# Convenciones de la casa (fg_rig): mira a -Y, +Z arriba, escala en metros, apoyo en
# z=0 en el fotograma 1 (Reposo). Clips compartidos por las dos variantes para
# que el esqueleto sea literalmente reutilizable: Reposo, Aleteo, Planear,
# Picada, Golpeado, Morir. Los bucles (Reposo, Aleteo, Planear) terminan con la
# pose exacta del primer fotograma.
# En el .blend las acciones se renombran con prefijo de variante DESPUÉS de
# exportar cada GLB, para que las dos criaturas convivan en un solo archivo sin
# colisión de nombres y los GLB salgan con los clips limpios.
import math
import os
import sys
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fg
import fg_rig

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))

CLIPS = {'Reposo', 'Aleteo', 'Planear', 'Picada', 'Golpeado', 'Morir'}


def mats():
    """Paleta pintada limpia: plumas negras con gris de dorso, carne de buitre,
    pico córneo y la bolsa roja del macho tijereta. Sin texturas."""
    return dict(
        black=fg.material('pluma_negra', (0.040, 0.038, 0.045), rough=0.6),
        grey=fg.material('pluma_gris', (0.155, 0.150, 0.165), rough=0.7),
        white=fg.material('pluma_blanca', (0.83, 0.82, 0.78), rough=0.8),
        skin=fg.material('piel_pajiza', (0.55, 0.27, 0.20), rough=0.85),
        pouch=fg.material('bolsa_roja', (0.52, 0.075, 0.065), rough=0.6),
        beak=fg.material('pico', (0.72, 0.70, 0.62), rough=0.5),
        darkbeak=fg.material('pico_negro', (0.08, 0.08, 0.09), rough=0.45),
        legs=fg.material('patas', (0.33, 0.27, 0.25), rough=0.8),
        eye=fg.material('ojo', (0.015, 0.014, 0.016), rough=0.35),
    )


def feather(builder, base, direction, width, thickness, mat, bone):
    """Prisma de pluma redondeada y apuntada (patrón crestalba: sin tarjetas)."""
    a = Vector(base)
    d = Vector(direction)
    length = d.length
    d.normalize()
    n = Vector((0, 0, 1))
    if abs(d.dot(n)) > 0.9:
        n = Vector((0, 1, 0))
    side = d.cross(n).normalized()
    n = side.cross(d).normalized()
    shoulder = a + d * (length * 0.38)
    tip = a + d * length
    outline = [a - side * width * 0.35, shoulder - side * width, tip,
               shoulder + side * width, a + side * width * 0.35]
    builder.poly([p - n * thickness for p in outline], [p + n * thickness for p in outline], mat, bone)


def wing_bones(side, sign, anchor, elbow_z, r1, r2, y1, y2, z=0.0):
    """Dos huesos de ala a lo largo de +X*sign desde el pecho (convención
    crestalba/arpy: aleteo sobre Y, barrido sobre Z, espejo en el signo)."""
    x0 = anchor[0] + 0.10 * sign
    p0 = (x0, anchor[1], anchor[2])
    p1 = (anchor[0] + r1 * sign, anchor[1] + y1, z + anchor[2])
    p2 = (anchor[0] + r2 * sign, anchor[1] + y2, z + anchor[2] - 0.02)
    return [
        (f'wing{side}', 'chest', p0, p1),
        (f'wingTip{side}', f'wing{side}', p1, p2),
    ]


def bones_for(v):
    """Esqueleto común; `v` aporta las medidas de la variante (mismos nombres,
    mismos ejes: una sola familia de acciones sirve a las dos mallas)."""
    bones = [
        ('hips', None, v['hips_h'], v['hips_t']),
        ('chest', 'hips', v['hips_t'], v['chest_t']),
        ('neck', 'chest', v['chest_t'], v['neck_t']),
        ('head', 'neck', v['neck_t'], v['head_t']),
        ('tail', 'hips', v['tail_h'], v['tail_t']),
        (f'legL', 'hips', v['thigh_h_L'], v['knee_L']),
        ('shinL', 'legL', v['knee_L'], v['ankle_L']),
        ('footL', 'shinL', v['ankle_L'], v['toe_L']),
        ('legR', 'hips', v['thigh_h_R'], v['knee_R']),
        ('shinR', 'legR', v['knee_R'], v['ankle_R']),
        ('footR', 'shinR', v['ankle_R'], v['toe_R']),
    ]
    bones += wing_bones('L', 1, v['wing_anchor'], 0, v['wing_r1'], v['wing_r2'], v['wing_y1'], v['wing_y2'])
    bones += wing_bones('R', -1, v['wing_anchor'], 0, v['wing_r1'], v['wing_r2'], v['wing_y1'], v['wing_y2'])
    return bones


GALLOTE = dict(
    rig='FG_AveGallote', archivo='ave_gallote.glb', glb_prefijo='gallote_',
    # cuerpo agazapado ~0,9 m; encadenado hips->chest->neck->head inclinado
    hips_h=(0, 0.12, 0.50), hips_t=(0, -0.04, 0.52),
    chest_t=(0, -0.22, 0.58), neck_t=(0, -0.34, 0.70), head_t=(0, -0.50, 0.82),
    tail_h=(0, 0.12, 0.50), tail_t=(0, 0.34, 0.50),
    thigh_h_L=(0.11, 0.02, 0.44), knee_L=(0.11, 0.10, 0.30), ankle_L=(0.11, -0.01, 0.13), toe_L=(0.11, -0.16, 0.05),
    thigh_h_R=(-0.11, 0.02, 0.44), knee_R=(-0.11, 0.10, 0.30), ankle_R=(-0.11, -0.01, 0.13), toe_R=(-0.11, -0.16, 0.05),
    wing_anchor=(0.10, -0.12, 0.60), wing_r1=0.40, wing_r2=0.55, wing_y1=0.02, wing_y2=0.10,
    # plegado del reposo: ala que cae pegada al costado y apunta a la cola
    fold=(48, 26), sweep=(6, 14),
    rest=dict(chest=(-6, 0, 0), neck=(-10, 0, 0), head=(16, 0, 0), tail=(6, 0, 0)),
    tuck=dict(legL=(16, 0, 0), shinL=(30, 0, 0), footL=(-18, 0, 0),
              legR=(16, 0, 0), shinR=(30, 0, 0), footR=(-18, 0, 0)),
)

TIJERETA = dict(
    rig='FG_AveTijereta', archivo='ave_tijereta.glb', glb_prefijo='tijereta_',
    hips_h=(0, 0.08, 0.48), hips_t=(0, -0.08, 0.50),
    chest_t=(0, -0.24, 0.55), neck_t=(0, -0.40, 0.64), head_t=(0, -0.56, 0.70),
    tail_h=(0, 0.08, 0.50), tail_t=(0, 0.44, 0.48),
    thigh_h_L=(0.07, 0.01, 0.40), knee_L=(0.07, 0.07, 0.27), ankle_L=(0.07, -0.01, 0.13), toe_L=(0.07, -0.14, 0.05),
    thigh_h_R=(-0.07, 0.01, 0.40), knee_R=(-0.07, 0.07, 0.27), ankle_R=(-0.07, -0.01, 0.13), toe_R=(-0.07, -0.14, 0.05),
    wing_anchor=(0.08, -0.14, 0.55), wing_r1=0.50, wing_r2=0.80, wing_y1=0.04, wing_y2=0.14,
    fold=(42, 30), sweep=(8, 12),
    rest=dict(chest=(-2, 0, 0), neck=(-4, 0, 0), head=(6, 0, 0), tail=(-4, 0, 0)),
    tuck=dict(legL=(18, 0, 0), shinL=(36, 0, 0), footL=(-22, 0, 0),
              legR=(18, 0, 0), shinR=(36, 0, 0), footR=(-22, 0, 0)),
)


# ============================================================
# Mallas. Un solo nodo 'Cuerpo' por variante (contrato del juego:
# un esqueleto, una malla; fg_rig.Rig.part enlaza y pesa por grupos).
# ============================================================
def gallote_mesh(b, m):
    """Gallinazo carroñero: mole negra agazapada, cuello y calva pelados,
    papada, manto de plumas al hombro y cola en abanico. ~676 tri."""
    # cuerpo y grupa
    b.blob((0, 0.04, 0.52), (0.26, 0.33, 0.25), m['black'], 'hips', subdiv=1)
    b.blob((0, 0.22, 0.52), (0.15, 0.13, 0.11), m['black'], 'hips', subdiv=0)
    # manto de plumas en el pecho (collar que cubre el arranque del cuello)
    b.blob((0, -0.19, 0.575), (0.155, 0.115, 0.125), m['grey'], 'chest', subdiv=1)
    # cuello y calva pelados, cabeza hunde-hombros
    b.tube((0, -0.23, 0.60), (0, -0.36, 0.72), 0.052, 0.062, m['skin'], 'neck', sides=6)
    b.blob((0, -0.45, 0.80), (0.088, 0.105, 0.082), m['skin'], 'head', subdiv=1)
    b.tube((0, -0.49, 0.80), (0, -0.60, 0.73), 0.048, 0.028, m['skin'], 'head', sides=5)
    # pico corto, grueso y ganchudo (no varilla)
    b.poly([(-0.040, -0.535, 0.815), (0.040, -0.535, 0.815), (0.022, -0.665, 0.775), (-0.022, -0.665, 0.775)],
           [(-0.030, -0.535, 0.745), (0.030, -0.535, 0.745), (0.000, -0.655, 0.685), (-0.000, -0.655, 0.685)],
           m['darkbeak'], 'head')
    # ojos incrustados y papada carnosa
    for x in (-1, 1):
        b.tube((x * 0.062, -0.485, 0.828), (x * 0.078, -0.522, 0.818), 0.014, 0.004, m['eye'], 'head', sides=3)
    b.blob((0, -0.515, 0.695), (0.030, 0.050, 0.048), m['skin'], 'head', subdiv=0)
    # cola en abanico corto: cuatro plumas
    for i, x in enumerate((-0.105, -0.035, 0.035, 0.105)):
        feather(b, (x * 0.5, 0.30, 0.505), (x * 1.5, 0.30, 0.02 - abs(x) * 0.35), 0.062, 0.014, m['black'], 'tail')
    # alas modeladas EXTENDIDAS a lo +X (el Reposo las pliega hacia atrás con
    # una rotación Z del hueso; misma convención que crestalba y la tijereta):
    # hombro redondo, dos secundarias y tres primarias largas y puntiagudas.
    for side, sgn in (('L', 1), ('R', -1)):
        w, t = f'wing{side}', f'wingTip{side}'
        b.blob((0.22 * sgn, -0.09, 0.60), (0.095, 0.12, 0.06), m['black'], w, subdiv=0)
        feather(b, (0.245 * sgn, -0.045, 0.585), (0.20 * sgn, 0.055, -0.02), 0.06, 0.015, m['grey'], w)
        feather(b, (0.26 * sgn, -0.005, 0.565), (0.20 * sgn, 0.09, -0.03), 0.058, 0.015, m['black'], w)
        for i, yy in enumerate((-0.03, 0.04, 0.115)):
            feather(b, (0.42 * sgn, -0.05 + yy, 0.55 - i * 0.005),
                    (0.26 * sgn, 0.055 + 0.03 * i, -0.02), 0.048, 0.014, m['black'], t)
    # patas desnudas gris pizarra y dedos planos de carroñero
    for side, sgn in (('L', 1), ('R', -1)):
        f = f'foot{side}'
        b.tube((0.105 * sgn, 0.055, 0.28), (0.11 * sgn, -0.005, 0.125), 0.026, 0.020, m['legs'], f'shin{side}', sides=6)
        for dx, dy in ((-0.055, -0.135), (0.0, -0.15), (0.055, -0.135), (0.0, 0.075)):
            b.tube((0.11 * sgn, -0.01, 0.115), (0.11 * sgn + dx * sgn, -0.01 + dy, 0.004),
                   0.014, 0.005, m['legs'], f, sides=4)


def tijereta_mesh(b, m):
    """Ave marina de costa: cuerpo fino blanco y negro, alas larguísimas
    puntiagudas, cola ahorquillada, pico de daga y bolsa gular. ~666 tri.
    Las alas se modelan extendidas a lo +X (la pose de reposo las pliega)."""
    # cuerpo fusiforme y vientre claro
    b.blob((0, 0.01, 0.515), (0.145, 0.255, 0.145), m['white'], 'hips', subdiv=1)
    b.blob((0, -0.13, 0.55), (0.10, 0.10, 0.095), m['white'], 'chest', subdiv=0)
    # cuello fino, cabeza blanca y ojo
    b.tube((0, -0.19, 0.565), (0, -0.40, 0.655), 0.042, 0.048, m['white'], 'neck', sides=5)
    b.blob((0, -0.465, 0.675), (0.068, 0.085, 0.062), m['white'], 'head', subdiv=1)
    for x in (-1, 1):
        b.tube((x * 0.052, -0.50, 0.70), (x * 0.062, -0.535, 0.692), 0.011, 0.003, m['eye'], 'head', sides=3)
    # pico de daga largo y ganchudo
    b.poly([(-0.020, -0.505, 0.695), (0.020, -0.505, 0.695), (0.008, -0.885, 0.615), (-0.008, -0.885, 0.615)],
           [(-0.014, -0.505, 0.655), (0.014, -0.505, 0.655), (0.005, -0.87, 0.598), (-0.005, -0.87, 0.598)],
           m['darkbeak'], 'head')
    # bolsa gular roja del macho, desinflada en reposo
    b.blob((0, -0.435, 0.60), (0.034, 0.052, 0.042), m['pouch'], 'head', subdiv=0)
    # alas extendidas: hombro negro, dos primarias cortas y tres largas
    for side, sgn in (('L', 1), ('R', -1)):
        w, t = f'wing{side}', f'wingTip{side}'
        b.blob((0.17 * sgn, -0.11, 0.565), (0.075, 0.115, 0.05), m['black'], w, subdiv=0)
        feather(b, (0.20 * sgn, -0.075, 0.575), (0.34 * sgn, 0.045, -0.012), 0.055, 0.016, m['black'], w)
        feather(b, (0.20 * sgn, -0.03, 0.56), (0.33 * sgn, 0.105, -0.015), 0.05, 0.015, m['black'], w)
        for i, yy in enumerate((-0.02, 0.055, 0.13)):
            feather(b, (0.45 * sgn, -0.04 + yy, 0.56 - i * 0.006),
                    (0.37 * sgn, 0.075 + 0.03 * i, -0.02), 0.042, 0.013, m['black'], t)
    # cola ahorquillada: dos plumas centrales y dos rastreras laterales
    for i, (x, dyy) in enumerate(((-0.032, 0.46), (0.032, 0.46), (-0.085, 0.38), (0.085, 0.38))):
        feather(b, (x, 0.10, 0.498), (x * 2.6, dyy, -0.028 - 0.012 * i), 0.040, 0.012, m['black'], 'tail')
    # patas cortas y palmeadas
    for side, sgn in (('L', 1), ('R', -1)):
        f = f'foot{side}'
        b.tube((0.07 * sgn, 0.05, 0.26), (0.07 * sgn, -0.005, 0.125), 0.019, 0.014, m['legs'], f'shin{side}', sides=6)
        for dx, dy in ((-0.045, -0.105), (0.0, -0.12), (0.045, -0.105), (0.0, 0.055)):
            b.tube((0.07 * sgn, -0.01, 0.115), (0.07 * sgn + dx * sgn, -0.01 + dy, 0.003),
                   0.012, 0.004, m['legs'], f, sides=4)


# ============================================================
# Animación compartida. Los huesos de ala apuntan +X/-X (lado L/R) y la malla
# se modela con el ala extendida; el Reposo la pliega hacia atrás y abajo con
# una rotación Z (barrido) + Y (caída) — la misma estrategia de crestalba.
# Un ala L se pliega con Z+ (hacia +Y, la espalda) y cae con Y-.
# ============================================================
def wing_poses(v, open_amt, up):
    """(ala, punta) para una apertura `open_amt` (0 = pegada, 1 = extendida)
    y un batido `up` (-1 punta abajo .. +1 punta arriba), en grados."""
    f1, f2 = v['fold']
    s1, s2 = v['sweep']
    fold1 = f1 * (1 - open_amt)
    fold2 = f2 * (1 - open_amt)
    sweep1 = s1 * (1 - open_amt)
    sweep2 = s2 * (1 - open_amt)
    # el alabeo caido (30°) es para el ala plegada; al extenderla sube a 8°
    droop = 30 - 22 * open_amt
    return dict(wingL=(0, droop - up * 34 - 8 * open_amt, fold1 + sweep1), wingR=(0, -droop + up * 34 + 8 * open_amt, -fold1 - sweep1),
                wingTipL=(0, -up * 26, fold2 + sweep2), wingTipR=(0, up * 26, -fold2 - sweep2))


def clips(v, rig):
    rest = dict(v['rest'])
    rest.update(v['tuck'])
    folded, = [wing_poses(v, 0.0, 0.0)]
    half, = [wing_poses(v, 0.45, 0.0)]
    spread, = [wing_poses(v, 0.95, 0.0)]
    down, = [wing_poses(v, 0.55, -1.0)]
    up_p, = [wing_poses(v, 0.6, 1.0)]

    def pose(**over):
        return {**rest, **folded, **over}

    # --- Reposo (posado, alas plegadas, respiración lenta; bucle en f61) ---
    rig.clip('Reposo', [
        (1, pose()),
        (16, pose(chest=(rest['chest'][0] - 1.5, 0, 0), head=(rest['head'][0] + 1.5, 3, 0),
                  tail=(rest['tail'][0] + 3, 8, 0)), (0, 0, -0.004)),
        (31, pose(chest=(rest['chest'][0] - 2.5, 0, 0), head=(rest['head'][0] + 2.5, -2, 0)), (0, 0, -0.008)),
        (46, pose(chest=(rest['chest'][0] - 1.5, 0, 0), head=(rest['head'][0] + 1.5, 2, 0),
                  tail=(rest['tail'][0] + 3, -8, 0)), (0, 0, -0.004)),
        (61, pose()),
    ])

    # --- Aleteo en el sitio: medio batido rápido, cuerpo oscila (bucle f33) ---
    rig.clip('Aleteo', [
        (1, {**rest, **down, 'chest': (rest['chest'][0] + 4, 0, 0)}),
        (5, {**rest, **up_p, 'chest': (rest['chest'][0] - 6, 0, 0),
             'head': (rest['head'][0] + 4, 0, 0)}, (0, 0, 0.06)),
        (9, {**rest, **down, 'chest': (rest['chest'][0] + 4, 0, 0)}),
        (13, {**rest, **up_p, 'chest': (rest['chest'][0] - 6, 0, 0),
              'head': (rest['head'][0] + 4, 0, 0)}, (0, 0, 0.06)),
        (17, {**rest, **down, 'chest': (rest['chest'][0] + 4, 0, 0)}),
        (21, {**rest, **up_p, 'chest': (rest['chest'][0] - 6, 0, 0),
              'head': (rest['head'][0] + 4, 0, 0)}, (0, 0, 0.06)),
        (25, {**rest, **down, 'chest': (rest['chest'][0] + 4, 0, 0)}),
        (29, {**rest, **up_p, 'chest': (rest['chest'][0] - 6, 0, 0),
              'head': (rest['head'][0] + 4, 0, 0)}, (0, 0, 0.06)),
        (33, {**rest, **down, 'chest': (rest['chest'][0] + 4, 0, 0)}),
    ])

    # --- Planear: alas extendidas con diedro, patas recogidas hacia atrás,
    # cabeceo mínimo (bucle f49) ---
    trailing = dict(legL=(20, 0, 0), shinL=(28, 0, 0), footL=(-16, 0, 0),
                    legR=(20, 0, 0), shinR=(28, 0, 0), footR=(-16, 0, 0))
    plane = {**rest, **trailing, **spread, 'chest': (rest['chest'][0] - 4, 0, 0),
             'neck': (rest['neck'][0] - 4, 0, 0), 'tail': (rest['tail'][0] - 12, 0, 0)}
    rig.clip('Planear', [
        (1, plane),
        (25, {**plane, 'wingTipL': (0, spread['wingTipL'][1] - 4, spread['wingTipL'][2]),
              'wingTipR': (0, spread['wingTipR'][1] + 4, spread['wingTipR'][2]),
              'chest': (rest['chest'][0] - 2, 0, 0),
              'tail': (rest['tail'][0] - 16, 4, 0)}, (0, 0, 0.03)),
        (49, plane),
    ])

    # --- Picada (ataque firma del gallote): se remonta, cierra alas, cae en
    # flecha sobre el objetivo, frena y sacude. 34 f, no bucle. ---
    tucked, = [wing_poses(v, 0.05, 0.3)]
    dive = {**v['rest'], **tucked, 'neck': (22, 0, 0), 'head': (-12, 0, 0), 'chest': (32, 0, 0)}
    pull = {**v['rest'], **half, 'neck': (-10, 0, 0), 'head': (6, 0, 0), 'chest': (-18, 0, 0)}
    rig.clip('Picada', [
        (1, pose()),
        (6, {**pose(), 'chest': (v['rest']['chest'][0] + 14, 0, 0),
             'wingL': (0, -28, 12), 'wingR': (0, 28, -12)}, (0, -0.04, 0.10)),
        (11, dive, (0, -0.10, 0.16)),
        (15, dive, (0, -0.62, -0.34)),
        (19, pull, (0, -0.70, -0.10)),
        (24, {**v['rest'], **up_p, 'head': (10, 0, 0)}, (0, -0.42, 0.05)),
        (30, pose(), (0, 0, 0)),
    ])

    # --- Golpeado: plumas erizadas, retroceso (no bucle) ---
    rig.clip('Golpeado', [
        (1, pose()),
        (4, {**v['rest'], 'chest': (v['rest']['chest'][0] - 14, 0, 0),
             'head': (v['rest']['head'][0] - 14, 0, 0), 'neck': (-8, 0, 0),
             'tail': (v['rest']['tail'][0] + 18, 0, 0),
             'wingL': (0, 26, 34), 'wingR': (0, -26, -34),
             'wingTipL': (0, 14, 22), 'wingTipR': (0, -14, -22)}, (0, 0.06, -0.03)),
        (10, pose(), (0, 0.01, 0)),
        (16, pose()),
    ])

    # --- Morir: aleteo débil, cae de lado y se aquieta (no bucle) ---
    rig.clip('Morir', [
        (1, pose()),
        (6, {**v['rest'], 'chest': (v['rest']['chest'][0] + 8, 0, 0), 'neck': (12, 0, 0),
             'wingL': (0, -46, 20), 'wingR': (0, 46, -20)}, (0, 0, 0.08)),
        (13, {**v['rest'], 'chest': (v['rest']['chest'][0] - 10, 0, 0),
              'hips': (0, 62, 0), 'wingL': (0, 40, 40), 'wingR': (0, -20, 30),
              'legL': (-20, 0, 0), 'legR': (-20, 0, 0),
              'shinL': (-30, 0, 0), 'shinR': (-30, 0, 0)}, (0.18, 0.04, -0.30)),
        (22, {**v['rest'], 'hips': (0, 86, 6), 'chest': (v['rest']['chest'][0] - 4, 0, 0),
              'head': (v['rest']['head'][0] - 6, 6, 0), 'neck': (-6, 0, 0),
              'wingL': (0, 60, 25), 'wingR': (0, -35, 40),
              'legL': (-46, 0, 0), 'legR': (-46, 0, 0),
              'shinL': (10, 0, 0), 'shinR': (10, 0, 0),
              'tail': (v['rest']['tail'][0] - 10, 0, 0)}, (0.30, 0.05, -0.50)),
        (34, {**v['rest'], 'hips': (0, 86, 6), 'head': (v['rest']['head'][0] - 8, 8, 0)}, (0.30, 0.05, -0.50)),
    ])


# ============================================================
# Generación de cada variante
# ============================================================
def generar(v, mesh_fn, escena_base):
    m = mats()
    rig = fg_rig.Rig(escena_base, v['rig'], bones_for(v))
    b = fg.Builder('Cuerpo')
    mesh_fn(b, m)
    rig.part(b)
    clips(v, rig)
    cuerpo = rig.parts[0]            # nodo 'Cuerpo' de ESTA variante
    rig.export(v['archivo'])          # GLB limpio, clips sin prefijo
    for a in rig.actions:             # renombrar para convivir en el .blend
        a.name = v['glb_prefijo'] + a.name
    return rig, cuerpo


def main():
    # Una sola escena limpia: ambas variantes conviven en ave.blend. Cada GLB se
    # exporta con su malla 'Cuerpo' intacta. El cuerpo del gallote se renombra
    # ANTES de crear la tijereta, si no Blender llamaría 'Cuerpo.001' al segundo y
    # su GLB saldría con el nodo mal nombrado. El validador importa cada GLB por
    # separado, donde cada uno sigue teniendo su 'Cuerpo'.
    escena_base = fg.reset()
    gallote, gallote_cuerpo = generar(GALLOTE, gallote_mesh, escena_base)
    gallote_cuerpo.name = 'Cuerpo_gallote'   # unico en la escena; los rigs ya
    tijereta, _ = generar(TIJERETA, tijereta_mesh, escena_base)  # difieren (FG_*)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'ave.blend'), copy=True)
    print('ave.blend salvo las dos variantes (Cuerpo_gallote + Cuerpo) con clips prefijados')


main()
