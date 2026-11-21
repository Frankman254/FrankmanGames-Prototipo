# Aves enemigas sobre el esqueleto de ave de D-17 (OMP-FA-11):
#   buho_chismoso.glb (`boquete_owl`,     Búho Chismoso, ranged nocturno de Boquete)
#   quetzal.glb       (`boquete_quetzal`, Quetzal Cascarrabias, ranged de Boquete)
#   pavo_griton.glb   (`ancon_pavo`,      Pavo Gritón, ranged del Cerro Ancón)
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/fauna_aves.py
#
# El esqueleto es el de ave.py (D-17), hueso por hueso: hips > chest > neck > head,
# hips > tail, hips > leg > shin > foot, y dos alas (wing > wingTip) modeladas
# extendidas a lo +X que el Reposo pliega con Z/Y. La cola del quetzal y el
# pavo lucen en el hueso `tail`. Cinco clips de enemigo (Reposo, Caminar,
# Atacar, Golpeado, Morir), los bucles terminan en la pose exacta del fotograma
# 1 y todo apoya en z=0. Mira a -Y, +Z arriba, metros.
# Clean-room: silueta y gestos observados de campo, escritos desde cero.
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

CLIPS = {'Reposo', 'Caminar', 'Atacar', 'Golpeado', 'Morir'}


def mats(v):
    """Cinco regiones teñibles (data/enemies.json tiñe cloth/skin/trim/hair/gear),
    el ojo y la carne desnuda de cada especie: buho pardo, quetzal verde con
    pechuga bermellon, pavo ocre con cuello azul y carunculas rojas."""
    c = v['col']
    return dict(
        cloth=fg.material('cloth', c['cloth']),
        trim=fg.material('trim', c['trim']),
        hair=fg.material('hair', c['hair']),
        skin=fg.material('skin', c['skin']),
        gear=fg.material('gear', c['gear'], rough=0.45),
        ojo=fg.material('ojo_ave', c['ojo'], rough=0.25),
        carne=fg.material('carne_ave', c['carne']),
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


def wing_bones(side, sign, anchor, r1, r2, y1, y2):
    x0 = anchor[0] + 0.10 * sign
    return [
        (f'wing{side}', 'chest', (x0, anchor[1], anchor[2]), (anchor[0] + r1 * sign, anchor[1] + y1, anchor[2])),
        (f'wingTip{side}', f'wing{side}', (anchor[0] + r1 * sign, anchor[1] + y1, anchor[2]),
         (anchor[0] + r2 * sign, anchor[1] + y2, anchor[2] - 0.02)),
    ]


def bones_for(v):
    """Esqueleto común de la familia (idéntico a ave.py, mismo orden)."""
    bones = [
        ('hips', None, v['hips_h'], v['hips_t']),
        ('chest', 'hips', v['hips_t'], v['chest_t']),
        ('neck', 'chest', v['chest_t'], v['neck_t']),
        ('head', 'neck', v['neck_t'], v['head_t']),
        ('tail', 'hips', v['tail_h'], v['tail_t']),
        ('legL', 'hips', v['thigh_h_L'], v['knee_L']),
        ('shinL', 'legL', v['knee_L'], v['ankle_L']),
        ('footL', 'shinL', v['ankle_L'], v['toe_L']),
        ('legR', 'hips', v['thigh_h_R'], v['knee_R']),
        ('shinR', 'legR', v['knee_R'], v['ankle_R']),
        ('footR', 'shinR', v['ankle_R'], v['toe_R']),
    ]
    bones += wing_bones('L', 1, v['wing_anchor'], v['wing_r1'], v['wing_r2'], v['wing_y1'], v['wing_y2'])
    bones += wing_bones('R', -1, v['wing_anchor'], v['wing_r1'], v['wing_r2'], v['wing_y1'], v['wing_y2'])
    return bones


BUHO = dict(
    rig='FG_BuhoChismoso', archivo='buho_chismoso.glb',
    # búho grande posado y erguido: ~1,25 m a la coronilla, discos faciales
    hips_h=(0, 0.06, 0.52), hips_t=(0, 0.01, 0.55),
    chest_t=(0, -0.10, 0.76), neck_t=(0, -0.14, 0.92), head_t=(0, -0.24, 1.04),
    tail_h=(0, 0.10, 0.50), tail_t=(0, 0.24, 0.44),
    thigh_h_L=(0.10, 0.00, 0.46), knee_L=(0.10, 0.06, 0.30), ankle_L=(0.10, -0.02, 0.14), toe_L=(0.10, -0.16, 0.03),
    thigh_h_R=(-0.10, 0.00, 0.46), knee_R=(-0.10, 0.06, 0.30), ankle_R=(-0.10, -0.02, 0.14), toe_R=(-0.10, -0.16, 0.03),
    col=dict(cloth=(0.32, 0.25, 0.17), trim=(0.75, 0.70, 0.58), hair=(0.14, 0.11, 0.09),
             skin=(0.52, 0.42, 0.30), gear=(0.40, 0.37, 0.32), ojo=(0.92, 0.66, 0.10),
             carne=(0.48, 0.38, 0.28)),
    wing_anchor=(0.10, -0.05, 0.80), wing_r1=0.34, wing_r2=0.50, wing_y1=0.06, wing_y2=0.16,
    fold=(58, 34), sweep=(8, 16),
    rest=dict(chest=(2, 0, 0), neck=(2, 0, 0), head=(-4, 0, 0), tail=(8, 0, 0)),
    tuck=dict(legL=(0, 0, 0), shinL=(0, 0, 0), footL=(0, 0, 0),
              legR=(0, 0, 0), shinR=(0, 0, 0), footR=(0, 0, 0)),
)

QUETZAL = dict(
    rig='FG_Quetzal', archivo='quetzal.glb',
    # ave esbelta de cresta alzada y dos plumas de cola larguísimas (~2 m de
    # pico a rastrera); posada a ~0,72 m de coronilla
    hips_h=(0, 0.08, 0.42), hips_t=(0, 0.00, 0.46),
    chest_t=(0, -0.16, 0.55), neck_t=(0, -0.28, 0.62), head_t=(0, -0.42, 0.70),
    tail_h=(0, 0.10, 0.45), tail_t=(0, 0.62, 0.50),
    thigh_h_L=(0.06, 0.02, 0.36), knee_L=(0.06, 0.08, 0.22), ankle_L=(0.06, -0.01, 0.10), toe_L=(0.06, -0.13, 0.02),
    thigh_h_R=(-0.06, 0.02, 0.36), knee_R=(-0.06, 0.08, 0.22), ankle_R=(-0.06, -0.01, 0.10), toe_R=(-0.06, -0.13, 0.02),
    col=dict(cloth=(0.09, 0.44, 0.25), trim=(0.55, 0.06, 0.05), hair=(0.05, 0.15, 0.10),
             skin=(0.07, 0.26, 0.16), gear=(0.86, 0.83, 0.72), ojo=(0.12, 0.09, 0.07),
             carne=(0.10, 0.32, 0.20)),
    wing_anchor=(0.08, -0.10, 0.52), wing_r1=0.30, wing_r2=0.46, wing_y1=0.05, wing_y2=0.13,
    fold=(44, 28), sweep=(5, 12),
    rest=dict(chest=(-4, 0, 0), neck=(-6, 0, 0), head=(10, 0, 0), tail=(-8, 0, 0)),
    tuck=dict(legL=(0, 0, 0), shinL=(0, 0, 0), footL=(0, 0, 0),
              legR=(0, 0, 0), shinR=(0, 0, 0), footR=(0, 0, 0)),
)

PAVO = dict(
    rig='FG_PavoGriton', archivo='pavo_griton.glb',
    # pavo campante del Cerro Ancón: mole erguida de ~1,35 m con la cola en
    # abanico atrás y carúnculas colgando del pico
    hips_h=(0, 0.10, 0.60), hips_t=(0, 0.02, 0.64),
    chest_t=(0, -0.16, 0.86), neck_t=(0, -0.26, 1.06), head_t=(0, -0.36, 1.24),
    tail_h=(0, 0.14, 0.62), tail_t=(0, 0.30, 0.92),
    thigh_h_L=(0.10, 0.02, 0.54), knee_L=(0.10, 0.10, 0.34), ankle_L=(0.10, -0.01, 0.16), toe_L=(0.10, -0.17, 0.03),
    thigh_h_R=(-0.10, 0.02, 0.54), knee_R=(-0.10, 0.10, 0.34), ankle_R=(-0.10, -0.01, 0.16), toe_R=(-0.10, -0.17, 0.03),
    col=dict(cloth=(0.40, 0.28, 0.15), trim=(0.68, 0.57, 0.41), hair=(0.10, 0.08, 0.11),
             skin=(0.28, 0.34, 0.52), gear=(0.55, 0.50, 0.42), ojo=(0.20, 0.12, 0.06),
             carne=(0.55, 0.06, 0.05)),
    wing_anchor=(0.10, -0.08, 0.84), wing_r1=0.32, wing_r2=0.46, wing_y1=0.07, wing_y2=0.18,
    fold=(48, 26), sweep=(6, 14),
    rest=dict(chest=(0, 0, 0), neck=(-2, 0, 0), head=(4, 0, 0), tail=(-46, 0, 0)),
    tuck=dict(legL=(0, 0, 0), shinL=(0, 0, 0), footL=(0, 0, 0),
              legR=(0, 0, 0), shinR=(0, 0, 0), footR=(0, 0, 0)),
)

VARIANTS = dict(buho=BUHO, quetzal=QUETZAL, pavo=PAVO)


# ============================================================
# Mallas. Un nodo 'Cuerpo' por ave; las alas se modelan extendidas
# (el Reposo las pliega, convención de ave.py).
# ============================================================
def buho_mesh(b, m):
    """Búho Chismoso: cuerpo pardo erguido, dos discos faciales con cejas,
    ojos amarillos enormes, pico ganchudo oculto entre plumas, dos penachos,
    alas anchas de borde aserrado y garfas de rapaz. ~750 tri."""
    b.blob((0, 0.06, 0.55), (0.24, 0.28, 0.27), m['cloth'], 'hips', subdiv=1)
    b.blob((0, -0.02, 0.50), (0.18, 0.22, 0.18), m['trim'], 'hips', subdiv=1)      # vientre claro
    b.blob((0, -0.05, 0.65), (0.185, 0.215, 0.16), m['cloth'], 'chest', subdiv=1)   # vientre continuo
    b.blob((0, -0.11, 0.79), (0.185, 0.185, 0.16), m['trim'], 'chest', subdiv=1)    # pecho jaspeado
    b.tube((0, -0.12, 0.86), (0, -0.16, 0.98), 0.105, 0.115, m['cloth'], 'neck', sides=6)
    # cabeza con discos faciales: dos platos que se cruzan bajo las cejas
    b.blob((0, -0.24, 1.06), (0.155, 0.155, 0.145), m['cloth'], 'head', subdiv=1)
    for sgn in (1, -1):
        b.tube((0.062 * sgn, -0.355, 1.055), (0.062 * sgn, -0.402, 1.06), 0.082, 0.078, m['skin'], 'head', sides=7)
        b.blob((0.066 * sgn, -0.408, 1.062), (0.062, 0.018, 0.060), m['ojo'], 'head', subdiv=0)
        b.blob((0.062 * sgn, -0.394, 1.132), (0.055, 0.030, 0.018), m['hair'], 'head', subdiv=0)  # ceja
        b.tube((0.085 * sgn, -0.335, 1.16), (0.115 * sgn, -0.305, 1.235), 0.024, 0.010, m['hair'], 'head', sides=4)  # penacho
    b.poly([(-0.024, -0.392, 1.062), (0.024, -0.392, 1.062), (0.010, -0.432, 1.035), (-0.010, -0.432, 1.035)],
           [(-0.016, -0.392, 1.022), (0.016, -0.392, 1.022), (0.005, -0.428, 0.990), (-0.005, -0.428, 0.990)],
           m['gear'], 'head')                                                       # pico ganchudo
    # cola corta cuatro plumas
    for x in (-0.09, -0.03, 0.03, 0.09):
        feather(b, (x * 0.6, 0.24, 0.50), (x * 1.4, 0.20, -0.10), 0.052, 0.013, m['hair'], 'tail')
    # alas anchas: hombro, dos secundarias claras y tres primarias pardas
    for side, sgn in (('L', 1), ('R', -1)):
        w, t = f'wing{side}', f'wingTip{side}'
        b.blob((0.20 * sgn, -0.06, 0.82), (0.085, 0.14, 0.07), m['cloth'], w, subdiv=0)
        feather(b, (0.22 * sgn, -0.02, 0.80), (0.17 * sgn, 0.07, -0.02), 0.055, 0.014, m['trim'], w)
        feather(b, (0.23 * sgn, 0.02, 0.78), (0.16 * sgn, 0.10, -0.03), 0.052, 0.014, m['trim'], w)
        for i, yy in enumerate((-0.03, 0.045, 0.12)):
            feather(b, (0.36 * sgn, -0.05 + yy, 0.77 - i * 0.006),
                    (0.24 * sgn, 0.06 + 0.03 * i, -0.02), 0.050, 0.014, m['hair'], t)
    # patas emplumadas hasta el tarso y garfas curvas de rapaz
    for side, sgn in (('L', 1), ('R', -1)):
        b.blob((0.095 * sgn, 0.02, 0.40), (0.062, 0.070, 0.085), m['cloth'], f'leg{side}', subdiv=0)
        b.tube((0.095 * sgn, 0.01, 0.30), (0.10 * sgn, -0.01, 0.145), 0.026, 0.020, m['skin'], f'shin{side}', sides=6)
        for dx, dy in ((-0.055, -0.125), (0.0, -0.145), (0.055, -0.125), (0.0, 0.065)):
            z1, z2 = (0.020, 0.002) if dy < 0 else (0.040, 0.020)   # el posterior roza el suelo
            b.tube((0.10 * sgn, -0.012, 0.135), (0.10 * sgn + dx * sgn, -0.012 + dy, z1 + 0.010),
                   0.016, 0.008, m['skin'], f'foot{side}', sides=4)
            b.tube((0.10 * sgn + dx * sgn, -0.012 + dy, z1 + 0.014), (0.10 * sgn + dx * 1.2 * sgn, -0.012 + dy * 1.12, z2 + 0.014),
                   0.008, 0.003, m['gear'], f'foot{side}', sides=3)                  # garra


def quetzal_mesh(b, m):
    """Quetzal Cascarrabias: manto verde, pechuga bermellón, cresta erizada,
    pico ancho de aserrín y dos rastreras de cola que doblan el cuerpo. ~800 tri."""
    b.blob((0, 0.06, 0.44), (0.13, 0.20, 0.13), m['cloth'], 'hips', subdiv=1)
    b.blob((0, -0.06, 0.41), (0.10, 0.14, 0.10), m['cloth'], 'hips', subdiv=1)     # vientre verde
    b.blob((0, -0.16, 0.55), (0.11, 0.14, 0.12), m['trim'], 'chest', subdiv=1)     # pechuga bermellon
    b.tube((0, -0.22, 0.60), (0, -0.34, 0.67), 0.048, 0.052, m['cloth'], 'neck', sides=5)
    b.blob((0, -0.41, 0.70), (0.072, 0.085, 0.068), m['cloth'], 'head', subdiv=1)
    for sgn in (1, -1):
        b.blob((0.052 * sgn, -0.445, 0.728), (0.018, 0.016, 0.016), m['ojo'], 'head', subdiv=0)
    # pico ancho y bajo, borde aserrado (frutero cascarrabias)
    b.poly([(-0.030, -0.455, 0.712), (0.030, -0.455, 0.712), (0.026, -0.545, 0.700), (-0.026, -0.545, 0.700)],
           [(-0.022, -0.455, 0.678), (0.022, -0.455, 0.678), (0.016, -0.532, 0.676), (-0.016, -0.532, 0.676)],
           m['gear'], 'head')
    for i, x in enumerate((-0.020, 0.0, 0.020)):                                    # sierra del borde
        b.card([(x - 0.006, -0.470 - i * 0.020, 0.686), (x + 0.006, -0.470 - i * 0.020, 0.686),
                (x + 0.004, -0.480 - i * 0.020, 0.670), (x - 0.004, -0.480 - i * 0.020, 0.670)], m['gear'], 'head')
    # cresta alzada: tres plumas lanceoladas
    for x in (-0.026, 0.0, 0.026):
        feather(b, (x, -0.40, 0.755), (x * 1.8, -0.26, 0.185), 0.030, 0.008, m['cloth'], 'head')
    # las dos rastreras: plumas cinto larguísimas desde la grupa
    for x in (-0.017, 0.017):
        feather(b, (x, 0.16, 0.47), (x * 3.0, 1.05, -0.22), 0.040, 0.009, m['cloth'], 'tail')
    for x in (-0.06, -0.02, 0.02, 0.06):                                             # timoneras cortas
        feather(b, (x * 0.6, 0.18, 0.465), (x * 1.4, 0.26, -0.05), 0.040, 0.010, m['hair'], 'tail')
    # alas esbeltas
    for side, sgn in (('L', 1), ('R', -1)):
        w, t = f'wing{side}', f'wingTip{side}'
        b.blob((0.15 * sgn, -0.09, 0.54), (0.060, 0.110, 0.045), m['cloth'], w, subdiv=0)
        feather(b, (0.17 * sgn, -0.05, 0.545), (0.15 * sgn, 0.05, -0.012), 0.048, 0.013, m['hair'], w)
        for i, yy in enumerate((-0.02, 0.05, 0.12)):
            feather(b, (0.30 * sgn, -0.04 + yy, 0.535 - i * 0.005),
                    (0.26 * sgn, 0.07 + 0.03 * i, -0.018), 0.040, 0.012, m['hair'], t)
    for side, sgn in (('L', 1), ('R', -1)):
        b.tube((0.055 * sgn, 0.02, 0.24), (0.06 * sgn, -0.005, 0.105), 0.016, 0.012, m['skin'], f'shin{side}', sides=5)
        for dx, dy in ((-0.038, -0.085), (0.0, -0.098), (0.038, -0.085), (0.0, 0.045)):
            zt = 0.004 if dy < 0 else 0.030
            b.tube((0.06 * sgn, -0.01, 0.098), (0.06 * sgn + dx * sgn, -0.01 + dy, zt),
                   0.010, 0.004, m['skin'], f'foot{side}', sides=4)


def pavo_mesh(b, m):
    """Pavo Gritón del Cerro Ancón: mole erguida ocre, cuello desnudo con
    carúnculas, papada roja, cresta de abaniquito en varilla y cola en abanico
    desplegada con manchas de ojo. El grito: abre la papada y ergue la cresta.
    ~820 tri."""
    b.blob((0, 0.10, 0.62), (0.22, 0.27, 0.25), m['cloth'], 'hips', subdiv=1)
    b.blob((0, 0.00, 0.56), (0.16, 0.20, 0.17), m['trim'], 'hips', subdiv=1)
    b.blob((0, -0.14, 0.86), (0.17, 0.19, 0.20), m['hair'], 'chest', subdiv=1)     # pecho oscuro brillante
    # cuello desnudo azul-pizarra con carne (skin), erguido en S suave
    b.tube((0, -0.20, 0.96), (0, -0.28, 1.16), 0.058, 0.052, m['skin'], 'neck', sides=6)
    b.blob((0, -0.35, 1.245), (0.075, 0.090, 0.070), m['skin'], 'head', subdiv=1)
    for sgn in (1, -1):
        b.blob((0.052 * sgn, -0.38, 1.268), (0.017, 0.015, 0.015), m['ojo'], 'head', subdiv=0)
    # pico fuerte y papada/carúnculas colgando
    b.poly([(-0.024, -0.408, 1.262), (0.024, -0.408, 1.262), (0.014, -0.492, 1.240), (-0.014, -0.492, 1.240)],
           [(-0.018, -0.408, 1.234), (0.018, -0.408, 1.234), (0.006, -0.486, 1.214), (-0.006, -0.486, 1.214)],
           m['gear'], 'head')
    b.tube((0, -0.425, 1.222), (0, -0.418, 1.148), 0.020, 0.028, m['hair'], 'head', sides=4)   # barbada
    b.blob((0, -0.415, 1.132), (0.028, 0.020, 0.034), m['hair'], 'head', subdiv=0)
    for sgn in (1, -1):                                                              # carúnculas
        b.blob((0.040 * sgn, -0.395, 1.230), (0.016, 0.016, 0.022), m['hair'], 'head', subdiv=0)
    # cresta: abaniquito redondo en varilla
    b.tube((0, -0.335, 1.31), (0, -0.315, 1.365), 0.005, 0.005, m['gear'], 'head', sides=4)
    b.blob((0, -0.313, 1.382), (0.030, 0.012, 0.026), m['cloth'], 'head', subdiv=0)
    # cola en abanico desplegada: nueve plumas ovaladas con mancha de ojo,
    # montadas en plano inclinado hacia arriba y atrás (tail hueso)
    for i in range(9):
        ang = math.radians(-64 + i * 16)
        x = 0.46 * math.sin(ang)
        r = 0.40 - 0.10 * abs(i - 4) / 4
        feather(b, (x * 0.16, 0.20, 0.70), (x * 0.60, 0.30 * math.cos(ang * 0.4), 0.42 + 0.26 * math.cos(ang)),
                0.062 * (0.8 + 0.2 * math.cos(ang)), 0.010, m['cloth'], 'tail')
        b.blob((x * 0.52, 0.34, 1.00 + 0.14 * math.cos(ang) - abs(x) * 0.10), (0.024, 0.010, 0.030),
               m['hair'], 'tail', subdiv=0)                                          # mancha de ojo
    # alas caídas, cortas para el cuerpo que es
    for side, sgn in (('L', 1), ('R', -1)):
        w, t = f'wing{side}', f'wingTip{side}'
        b.blob((0.19 * sgn, -0.08, 0.86), (0.080, 0.130, 0.070), m['hair'], w, subdiv=0)
        for i, yy in enumerate((-0.03, 0.035, 0.10)):
            feather(b, (0.20 * sgn, -0.02 + yy, 0.84 - i * 0.006),
                    (0.20 * sgn, 0.06 + 0.03 * i, -0.10), 0.048, 0.013, m['trim'], w)
        for i, yy in enumerate((-0.015, 0.05, 0.115)):
            feather(b, (0.34 * sgn, -0.04 + yy, 0.80 - i * 0.006),
                    (0.22 * sgn, 0.06 + 0.03 * i, -0.06), 0.044, 0.013, m['hair'], t)
    # patas altas de ground bird
    for side, sgn in (('L', 1), ('R', -1)):
        b.tube((0.095 * sgn, 0.05, 0.32), (0.10 * sgn, -0.005, 0.150), 0.026, 0.020, m['skin'], f'shin{side}', sides=6)
        for dx, dy in ((-0.052, -0.125), (0.0, -0.145), (0.052, -0.125), (0.0, 0.070)):
            zt = 0.004 if dy < 0 else 0.030
            b.tube((0.10 * sgn, -0.01, 0.140), (0.10 * sgn + dx * sgn, -0.01 + dy, zt),
                   0.014, 0.005, m['skin'], f'foot{side}', sides=4)


# ============================================================
# Animación. Misma estrategia de ave.py: las alas se modelan extendidas y
# el Reposo las pliega con Z (plegado) + Y (caída); el aleteo abre y bate.
# ============================================================
def wing_poses(v, open_amt, up):
    f1, f2 = v['fold']
    s1, s2 = v['sweep']
    fold1 = f1 * (1 - open_amt)
    fold2 = f2 * (1 - open_amt)
    sweep1 = s1 * (1 - open_amt)
    sweep2 = s2 * (1 - open_amt)
    droop = 30 - 22 * open_amt
    return dict(wingL=(0, droop - up * 34 - 8 * open_amt, fold1 + sweep1),
                wingR=(0, -droop + up * 34 + 8 * open_amt, -fold1 - sweep1),
                wingTipL=(0, -up * 26, fold2 + sweep2),
                wingTipR=(0, up * 26, -fold2 - sweep2))


def clips(v, rig, firma):
    rest = dict(v['rest'])
    rest.update(v['tuck'])
    folded, = [wing_poses(v, 0.0, 0.0)]
    half, = [wing_poses(v, 0.45, 0.0)]
    spread, = [wing_poses(v, 0.95, 0.0)]
    down, = [wing_poses(v, 0.55, -1.0)]
    up_p, = [wing_poses(v, 0.6, 1.0)]

    def pose(**over):
        return {**rest, **folded, **over}

    # --- Reposo: posado, respiración lenta y giro de cabeza (bucle f61) ---
    rig.clip('Reposo', [
        (1, pose()),
        (12, pose(chest=(rest['chest'][0] - 1.5, 0, 0), head=(rest['head'][0] + 1.5, 5, 0),
                  tail=(rest['tail'][0] + 2, 0, 0)), (0, 0, -0.004)),
        (24, pose(head=(rest['head'][0], -8, 0))),
        (38, pose(chest=(rest['chest'][0] - 2.5, 0, 0), head=(rest['head'][0] + 2.5, 4, 0)), (0, 0, -0.008)),
        (50, pose(head=(rest['head'][0], 6, 0))),
        (61, pose()),
    ])

    # --- Caminar: pasitos de ave con medio aleteo de equilibrio (bucle f17) ---
    pasos = []
    for i in range(9):
        t = i / 8
        s = math.sin(2 * math.pi * t)
        c = math.cos(2 * math.pi * t)
        p = pose(legL=(-16 * s, 0, 0), shinL=(14 * max(0.0, c) - 3, 0, 0),
                 footL=(8 * min(0.0, s), 0, 0),
                 legR=(16 * s, 0, 0), shinR=(14 * max(0.0, -c) - 3, 0, 0),
                 footR=(8 * min(0.0, -s), 0, 0),
                 chest=(rest['chest'][0] + 2 * s, 0, 0))
        medio, = [wing_poses(v, 0.18 + 0.10 * abs(s), 0.35 * c)]
        p.update(medio)
        pasos.append((1 + i * 2, p, (0, 0, -0.05 * abs(s))))
    rig.clip('Caminar', pasos)

    # --- Atacar (firma de cada ave) ---
    firma(v, rig, pose, rest, folded, half, spread, down, up_p)

    # --- Golpeado: plumas erizadas y retroceso (no bucle) ---
    rig.clip('Golpeado', [
        (1, pose()),
        (4, {**rest, 'chest': (rest['chest'][0] - 12, 0, 0),
             'head': (rest['head'][0] - 12, 0, 0), 'neck': (-8, 0, 0),
             'tail': (rest['tail'][0] + 16, 0, 0),
             'wingL': (0, 24, 30), 'wingR': (0, -24, -30),
             'wingTipL': (0, 12, 20), 'wingTipR': (0, -12, -20)}, (0, 0.05, -0.02)),
        (10, pose(), (0, 0.01, 0)),
        (16, pose()),
    ])

    # --- Morir: aleteo débil, cae de lado y se aquieta (no bucle) ---
    rig.clip('Morir', [
        (1, pose()),
        (6, {**rest, 'chest': (rest['chest'][0] + 8, 0, 0), 'neck': (12, 0, 0),
             'wingL': (0, -42, 18), 'wingR': (0, 42, -18)}, (0, 0, 0.07)),
        (13, {**rest, 'chest': (rest['chest'][0] - 10, 0, 0),
              'hips': (0, 58, 0), 'wingL': (0, 38, 36), 'wingR': (0, -18, 28),
              'legL': (-18, 0, 0), 'legR': (-18, 0, 0),
              'shinL': (-26, 0, 0), 'shinR': (-26, 0, 0)}, (0.16, 0.04, -0.28)),
        (22, {**rest, 'hips': (0, 84, 6), 'chest': (rest['chest'][0] - 4, 0, 0),
              'head': (rest['head'][0] - 6, 6, 0), 'neck': (-6, 0, 0),
              'wingL': (0, 58, 24), 'wingR': (0, -32, 38),
              'legL': (-42, 0, 0), 'legR': (-42, 0, 0),
              'shinL': (8, 0, 0), 'shinR': (8, 0, 0)}, (0.28, 0.05, -0.46)),
        (34, {**rest, 'hips': (0, 84, 6), 'head': (rest['head'][0] - 8, 8, 0)}, (0.28, 0.05, -0.46)),
    ])


def firma_buho(v, rig, pose, rest, folded, half, spread, down, up_p):
    # chismoso: gira la cabeza casi del revés mirando, y cae en silencio con
    # las dos garfas por delante
    rig.clip('Atacar', [
        (1, pose()),
        (5, pose(head=(rest['head'][0], 52, 0))),                    # gira el disco
        (9, pose(head=(rest['head'][0], 96, 6))),                    # casi nuca: chismea
        (14, {**rest, **half, 'chest': (rest['chest'][0] + 10, 0, 0),
              'neck': (6, 40, 0), 'head': (6, 60, 0)}, (0, -0.03, 0.06)),
        (18, {**rest, **spread, 'chest': (-14, 0, 0), 'neck': (-8, 0, 0),
              'legL': (-58, 0, 14), 'shinL': (48, 0, 0), 'footL': (26, 0, 0),
              'legR': (-58, 0, -14), 'shinR': (48, 0, 0), 'footR': (26, 0, 0)},
            (0, -0.30, 0.10)),                                        # planzón con garfas
        (22, {**rest, **down, 'chest': (-6, 0, 0),
              'legL': (-30, 0, 8), 'legR': (-30, 0, -8)}, (0, -0.16, -0.06)),
        (30, pose()),
    ])


def firma_quetzal(v, rig, pose, rest, folded, half, spread, down, up_p):
    # cascarrabias: eriza la cresta, aletea furioso en el sitio y estampa el
    # pecho contra el aire con las rastreras en bandera
    rig.clip('Atacar', [
        (1, pose()),
        (4, {**rest, **folded, 'chest': (rest['chest'][0] - 10, 0, 0),
             'head': (rest['head'][0] - 14, 0, 0), 'neck': (-10, 0, 0)}, (0, 0, 0.02)),
        (8, {**rest, **up_p, 'chest': (rest['chest'][0] - 16, 0, 0),
             'head': (rest['head'][0] - 18, 0, 0), 'neck': (-12, 0, 0),
             'tail': (rest['tail'][0] - 22, 0, 0)}, (0, -0.05, 0.10)),  # erizado, cola en alto
        (12, {**rest, **down, 'chest': (rest['chest'][0] + 10, 0, 0),
              'head': (rest['head'][0] + 6, 0, 0), 'tail': (rest['tail'][0] - 8, 12, 0)},
            (0, -0.08, -0.04)),
        (16, {**rest, **up_p, 'tail': (rest['tail'][0] - 10, -12, 0)}, (0, -0.02, 0.08)),
        (20, {**rest, **spread, 'chest': (-12, 0, 0), 'tail': (rest['tail'][0] - 30, 0, 0)},
            (0, -0.10, 0.02)),                                          # estampa
        (28, pose()),
    ])


def firma_pavo(v, rig, pose, rest, folded, half, spread, down, up_p):
    # gritón: se hincha, despliega el abanico de la cola y ESTAMPA el grito
    # con la cabeza atrás y la papada abierta; después embiste a saltitos
    rig.clip('Atacar', [
        (1, pose()),
        (5, {**rest, **folded, 'chest': (rest['chest'][0] - 6, 0, 0)}, (0, 0, 0.02)),
        (9, {**rest, 'chest': (rest['chest'][0] - 14, 0, 0),
             'neck': (-10, 0, 0), 'head': (-26, 0, 0),
             'tail': (12, 0, 0)}, (0, -0.02, 0.04)),                    # cabeza atrás, cola plana
        (13, {**rest, 'chest': (rest['chest'][0] - 16, 0, 0),
              'neck': (-12, 0, 0), 'head': (-30, 6, 0),
              'tail': (30, 0, 0), 'wingL': (14, -6, 26), 'wingR': (-14, 6, -26)},
            (0, -0.04, 0.06)),                                          # ¡GRITO! abanico arriba
        (17, {**rest, 'chest': (rest['chest'][0] + 8, 0, 0),
              'neck': (10, 0, 0), 'head': (14, 0, 0),
              'tail': (8, 0, 0), 'wingL': (0, -20, 14), 'wingR': (0, 20, -14)},
            (0, -0.14, -0.02)),                                          # embiste
        (21, {**rest, **half, 'chest': (rest['chest'][0] - 4, 0, 0), 'head': (rest['head'][0] - 8, 0, 0),
              'tail': (-30, 0, 0)}, (0, -0.10, 0.08)),                   # saltito
        (30, pose()),
    ])


FIRMAS = dict(buho=firma_buho, quetzal=firma_quetzal, pavo=firma_pavo)
MALLAS = dict(buho=buho_mesh, quetzal=quetzal_mesh, pavo=pavo_mesh)


def generar(escena_base, v, mesh_fn, firma):
    m = mats(v)
    rig = fg_rig.Rig(escena_base, v['rig'], bones_for(v))
    b = fg.Builder('Cuerpo')
    mesh_fn(b, m)
    rig.part(b)
    clips(v, rig, firma)
    cuerpo = rig.parts[0]
    rig.export(v['archivo'])
    return rig, cuerpo


def main():
    escena_base = fg.reset()
    nombres = []
    for i, nombre in enumerate(('buho', 'quetzal', 'pavo')):
        v = VARIANTS[nombre]
        rig, cuerpo = generar(escena_base, v, MALLAS[nombre], FIRMAS[nombre])
        # cada 'Cuerpo' único en el .blend; los GLB salen con el suyo intacto
        cuerpo.name = f'Cuerpo_{nombre}'
        for a in rig.actions:
            a.name = nombre + '_' + a.name
        nombres.append(v['archivo'])
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'fauna_aves.blend'), copy=True)
    print('fauna_aves.blend salvo las tres aves:', ', '.join(nombres))


if __name__ == '__main__':
    main()
