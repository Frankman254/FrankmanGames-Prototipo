# Generador OMP-FA-21 (aguilas de Dariena).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/aguilas_darien.py
# Familia propia de rapaces, distinta de la montura montura_arpia.glb (que no se
# toca): un rig de aguila posada (FG_Aguila) con tres variantes de silueta y color
# sobre el mismo armazon, segun work/claude-ref01/aguilas.md:
#   - aguila_negra    (darien_eagle_black): pequena y rapida, cresta corta
#   - aguila_ornada   (darien_eagle_ornate): penacho negro, cuello castano, pecho
#     blanco barrado y calzas emplumadas
#   - aguila_crestada (jefa): Morphnus fantasioso, ~3 m con las alas plegadas,
#     cresta unica en punta y garras desmesuradas; no es una harpia gigante
# Fantasticas y comicas, con nombre y cifras propios; sin copiar especies literales.
# Piezas por familia en `arte/blender/aguilas_darien.blend`; cada GLB, en
# `assets/models/`. Las pruebas van en work/omp-fa-21/.
import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import fg  # noqa: E402
import fg_rig  # noqa: E402
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))

# colores por variante (PROPUESTA):
#   cloth: plumaje claro del pecho /  trim: collar, cara y bandas
#   hair: manto, alas y cola          /  skin: cere y patas
#   gear: garras                      /  ojo: iris
VARIANTES = {
    # azor negro: apagada, lista, cresta corta; barras claras solo en cola y tobillo
    'negra': dict(nombre='AguilaNegra', archivo='aguila_negra.glb', k=0.94, tope=1500,
                  cresta=0.7, garra=0.9, collar=0, pecho_barras=0, calzas=0, bandas=2,
                  colores=dict(cloth=(0.13, 0.12, 0.115), trim=(0.62, 0.60, 0.54),
                               hair=(0.055, 0.052, 0.05), skin=(0.55, 0.47, 0.22),
                               gear=(0.10, 0.095, 0.09), ojo=(0.72, 0.50, 0.12))),
    # azor galano: cuello castano, pecho blanco con barras negras, calzas de pluma
    'ornada': dict(nombre='AguilaOrnada', archivo='aguila_ornada.glb', k=1.06, tope=1500,
                   cresta=1.0, garra=1.0, collar=1, pecho_barras=4, calzas=1, bandas=3,
                   colores=dict(cloth=(0.80, 0.77, 0.70), trim=(0.42, 0.18, 0.075),
                                hair=(0.06, 0.055, 0.05), skin=(0.60, 0.52, 0.24),
                                gear=(0.09, 0.085, 0.08), ojo=(0.80, 0.58, 0.13))),
    # jefa: gris pizarra con cabeza y pecho claros, cresta de lanza, garras enormes
    'crestada': dict(nombre='AguilaCrestada', archivo='aguila_crestada.glb', k=2.35, tope=2500,
                     cresta=2.2, garra=1.7, collar=0, pecho_barras=0, calzas=0, bandas=3,
                     colores=dict(cloth=(0.52, 0.53, 0.56), trim=(0.66, 0.66, 0.66),
                                  hair=(0.13, 0.14, 0.17), skin=(0.22, 0.20, 0.16),
                                  gear=(0.07, 0.068, 0.066), ojo=(0.85, 0.80, 0.42))),
}


def mats(v):
    c = v['colores']
    return dict(
        cloth=fg.material('cloth', c['cloth'], rough=0.85),
        trim=fg.material('trim', c['trim'], rough=0.8),
        hair=fg.material('hair', c['hair'], rough=0.9),
        skin=fg.material('skin', c['skin'], rough=0.55),
        gear=fg.material('gear', c['gear'], metallic=0.3, rough=0.35),
        ojo=fg.material(f"ojo_{v['nombre']}", c['ojo'], rough=0.25),
        pupil=fg.material(f"pupil_{v['nombre']}", (0.02, 0.02, 0.022), rough=0.2),
    )


def eagle_bones(v):
    k = v['k']

    def p(x, y, z):
        return (x * k, y * k, z * k)
    huesos = [
        ('hips', None, p(0, 0.12, 0.66), p(0, 0.0, 0.74)),
        ('chest', 'hips', p(0, 0.0, 0.74), p(0, -0.14, 0.84)),
        ('neck', 'chest', p(0, -0.14, 0.90), p(0, -0.21, 1.00)),
        ('head', 'neck', p(0, -0.21, 1.02), p(0, -0.34, 1.05)),
        ('jaw', 'head', p(0, -0.28, 1.00), p(0, -0.40, 0.985)),
        ('tail', 'hips', p(0, 0.18, 0.70), p(0, 0.56, 0.63)),
        ('wingL', 'chest', p(0.08, 0.0, 0.84), p(0.19, 0.13, 0.79)),
        ('wingTipL', 'wingL', p(0.19, 0.13, 0.79), p(0.235, 0.42, 0.70)),
        ('wingR', 'chest', p(-0.08, 0.0, 0.84), p(-0.19, 0.13, 0.79)),
        ('wingTipR', 'wingR', p(-0.19, 0.13, 0.79), p(-0.235, 0.42, 0.70)),
    ]
    for s, x in (('L', 1), ('R', -1)):
        huesos += [
            (f'thigh{s}', 'hips', p(x * 0.065, 0.03, 0.62), p(x * 0.065, -0.01, 0.42)),
            (f'shin{s}', f'thigh{s}', p(x * 0.065, -0.01, 0.42), p(x * 0.07, 0.02, 0.14)),
            (f'foot{s}', f'shin{s}', p(x * 0.07, 0.02, 0.14), p(x * 0.07, -0.06, 0.02)),
        ]
    return huesos


def eagle_mesh(b, m, v):
    k = v['k']

    def P(x, y, z):
        return (x * k, y * k, z * k)
    # cuerpo: mole de pecho claro y manto oscuro, inclinado hacia delante; la
    # popa cae en falda de pluma sobre los muslos, que no asoman como tubos
    b.blob(P(0, -0.05, 0.795), P(0.135, 0.175, 0.145), m['cloth'], 'chest', subdiv=2)
    b.blob(P(0, 0.10, 0.71), P(0.120, 0.140, 0.130), m['hair'], 'hips', subdiv=1)
    b.blob(P(0, 0.02, 0.880), P(0.135, 0.20, 0.075), m['hair'], 'chest', subdiv=1)
    for x in (-1, 1):
        b.blob(P(x * 0.075, 0.06, 0.60), P(0.062, 0.10, 0.115), m['hair'], 'hips', subdiv=1)
    # pechuga: placa clara que baja del cuello al vientre; la ornada, barrada
    b.blob(P(0, -0.165, 0.775), P(0.098, 0.075, 0.115), m['cloth'], 'chest', subdiv=1)
    for i in range(v['pecho_barras']):
        b.tube(P(-0.075, -0.225, 0.855 - 0.052 * i), P(0.075, -0.225, 0.855 - 0.052 * i),
               0.016 * k, 0.014 * k, m['hair'], 'chest', sides=4, flat=0.5)
    # cuello corto y fuerte; la ornada lleva collar castano
    b.tube(P(0, -0.11, 0.885), P(0, -0.205, 0.995), 0.062 * k, 0.052 * k, m['hair'], 'neck', sides=6)
    if v['collar']:
        b.tube(P(0, -0.155, 0.93), P(0, -0.22, 1.00), 0.066 * k, 0.055 * k, m['trim'], 'neck', sides=6, flat=0.9)
    # cabeza: casquete con cara clara
    b.blob(P(0, -0.245, 1.045), P(0.068, 0.075, 0.058), m['hair'], 'head', subdiv=1)
    b.blob(P(0, -0.285, 1.03), P(0.05, 0.045, 0.043), m['cloth'], 'head', subdiv=1)
    # ojos grandes de rapaz, con arco superciliar serio
    for x in (-1, 1):
        b.blob(P(x * 0.042, -0.30, 1.055), P(0.021, 0.016, 0.021), m['ojo'], 'head', subdiv=1)
        b.blob(P(x * 0.046, -0.313, 1.055), P(0.009, 0.010, 0.014), m['pupil'], 'head', subdiv=0)
        b.tube(P(x * 0.028, -0.318, 1.082), P(x * 0.058, -0.306, 1.079),
               0.011 * k, 0.008 * k, m['hair'], 'head', sides=4, flat=0.7)
    # pico ganchudo: cere en la base, maxilar que cae en garra y mandibula corta
    b.blob(P(0, -0.315, 1.048), P(0.028, 0.022, 0.020), m['skin'], 'head', subdiv=1)
    b.tube(P(0, -0.33, 1.045), P(0, -0.395, 1.018), 0.026 * k, 0.014 * k, m['skin'], 'head', sides=6, flat=0.85)
    b.poly([P(-0.014, -0.385, 1.022), P(0.014, -0.385, 1.022), P(0, -0.38, 1.045)],
           [P(-0.006, -0.418, 0.985), P(0.006, -0.418, 0.985), P(0, -0.442, 0.998)], m['gear'], 'head')
    b.tube(P(0, -0.325, 1.008), P(0, -0.385, 0.999), 0.015 * k, 0.007 * k, m['skin'], 'jaw', sides=5)
    # cresta unica y puntiaguda (nunca la doble caida de la harpia): puas que
    # nacen detras de la coronilla y se van atras-arriba; la jefa, lanza larga
    # la punta cae atras (y positiva) y solo sube lo justo: es una visera de
    # pluma erguida, no unas orejas; la jefa la lleva de lanza
    cr = v['cresta']
    b.poly([P(-0.030, -0.185, 1.075), P(0.030, -0.185, 1.075), P(0, -0.205, 1.098)],
           [P(-0.010, -0.115 + 0.105 * cr, 1.105 + 0.048 * cr),
            P(0.010, -0.115 + 0.105 * cr, 1.105 + 0.048 * cr),
            P(0, -0.100 + 0.130 * cr, 1.112 + 0.062 * cr)], m['hair'], 'head')
    for x in (-1, 1):
        b.poly([P(x * 0.046, -0.195, 1.058), P(x * 0.022, -0.195, 1.078), P(x * 0.038, -0.212, 1.082)],
               [P(x * 0.060, -0.130 + 0.085 * cr, 1.086 + 0.030 * cr),
                P(x * 0.032, -0.135 + 0.095 * cr, 1.098 + 0.036 * cr),
                P(x * 0.050, -0.125 + 0.115 * cr, 1.100 + 0.040 * cr)], m['hair'], 'head')
    # cola larga y ancha, en abanico, con bandas claras
    for d in (-0.075, -0.025, 0.025, 0.075):
        b.poly([P(d - 0.022, 0.20, 0.72), P(d + 0.022, 0.20, 0.72), P(d, 0.21, 0.745)],
               [P(d * 1.5 - 0.024, 0.55, 0.625), P(d * 1.5 + 0.024, 0.55, 0.625), P(d * 1.5, 0.585, 0.648)],
               m['hair'], 'tail')
    for i in range(v['bandas']):
        f = 0.30 + 0.085 * i
        b.tube(P(-0.085 * f - 0.02, 0.20 + 0.35 * f, 0.718 - 0.085 * f),
               P(0.085 * f + 0.02, 0.20 + 0.35 * f, 0.718 - 0.085 * f),
               0.010 * k, 0.010 * k, m['trim'], 'tail', sides=4, flat=0.5)
    # alas plegadas sobre el manto: braza ancha y punta larga que cae a la cola;
    # aletear y atacar las abre con Z y las eleva con X
    for s, x in (('L', 1), ('R', -1)):
        b.tube(P(x * 0.075, -0.01, 0.845), P(x * 0.155, 0.14, 0.795), 0.055 * k, 0.040 * k,
               m['hair'], f'wing{s}', sides=6, flat=0.55)
        b.tube(P(x * 0.155, 0.12, 0.79), P(x * 0.215, 0.40, 0.705), 0.038 * k, 0.018 * k,
               m['hair'], f'wingTip{s}', sides=6, flat=0.45)
        for i, largo in enumerate((0.20, 0.155, 0.11)):
            p0 = P(x * (0.185 + 0.02 * i), 0.30 - i * 0.055, 0.705)
            tip = (p0[0] + x * 0.012, p0[1] + largo, p0[2] - 0.024 - 0.008 * i)
            mid = (p0[0] + x * 0.006, p0[1] + largo * 0.5, p0[2] - 0.010)
            b.poly([(p0[0] - 0.014, p0[1], p0[2] + 0.005), (p0[0] + 0.014, p0[1], p0[2] - 0.005),
                    (p0[0], p0[1] + 0.018, p0[2] + 0.002)],
                   [(mid[0] - 0.010, mid[1], mid[2] + 0.003), (mid[0] + 0.010, mid[1], mid[2] - 0.003),
                    (mid[0], mid[1] + 0.012, mid[2])], m['cloth'], f'wingTip{s}')
            b.poly([(mid[0] - 0.008, mid[1], mid[2] + 0.002), (mid[0] + 0.008, mid[1], mid[2] - 0.002),
                    (mid[0], mid[1] + 0.010, mid[2])],
                   [(tip[0] - 0.003, tip[1], tip[2] + 0.001), (tip[0] + 0.003, tip[1], tip[2] - 0.001),
                    (tip[0], tip[1] + 0.005, tip[2])], m['hair'], f'wingTip{s}')
    # pata de rapaz: muslo de pluma, tarso (desnudo o emplumado segun variante)
    # y pie de tres dedos delante con garra trasera; garras curvas y enormes
    for s, x in (('L', 1), ('R', -1)):
        # el muslo va dentro de la falda de pluma: solo asoma la rodilla baja
        b.tube(P(x * 0.070, 0.03, 0.60), P(x * 0.072, -0.005, 0.36), 0.052 * k, 0.034 * k,
               m['hair'], f'thigh{s}', sides=6)
        calc = m['cloth'] if v['calzas'] else m['skin']
        b.tube(P(x * 0.072, -0.005, 0.37), P(x * 0.075, 0.012, 0.15), 0.030 * k, 0.024 * k,
               calc, f'shin{s}', sides=6, flat=0.8)
        if v['calzas']:
            for i in (0, 1):
                b.tube(P(x * 0.050, -0.005, 0.32 - 0.075 * i), P(x * 0.098, 0.030, 0.29 - 0.075 * i),
                       0.014 * k, 0.014 * k, m['hair'], f'shin{s}', sides=4)
        b.blob(P(x * 0.075, 0.010, 0.130), P(0.036, 0.048, 0.042), m['skin'], f'foot{s}', subdiv=1)
        # tres dedos delante y uno atras, cada uno con su garra curvada
        gar = v['garra']
        for d in (-0.052, 0.0, 0.052):
            b.tube(P(x * 0.07 + d, 0.0, 0.05), P(x * 0.072 + d * 1.25, -0.062 * (1 + 0.35 * gar), 0.022),
                   0.014 * k, 0.010 * k, m['skin'], f'foot{s}', sides=5)
            b.poly([(x * 0.072 + d * 1.25 - 0.008, -0.062 * (1 + 0.35 * gar), 0.024),
                    (x * 0.072 + d * 1.25 + 0.008, -0.062 * (1 + 0.35 * gar), 0.024),
                    (x * 0.072 + d * 1.25, -0.052 * (1 + 0.35 * gar), 0.030)],
                   [(x * 0.072 + d * 1.35 - 0.004, -0.085 * (1 + 0.5 * gar), 0.006),
                    (x * 0.072 + d * 1.35 + 0.004, -0.085 * (1 + 0.5 * gar), 0.006),
                    (x * 0.072 + d * 1.42, -0.095 * (1 + 0.55 * gar), 0.0035)], m['gear'], f'foot{s}')
        b.tube(P(x * 0.07, 0.02, 0.06), P(x * 0.07, 0.075 * (1 + 0.2 * gar), 0.030), 0.012 * k, 0.009 * k,
               m['skin'], f'foot{s}', sides=4)


# alas a media apertura, base de los pose de salto (como en la garza)
MEDIA = {'wingL': (0, 6, -26), 'wingTipL': (0, 3, -12), 'wingR': (0, -6, 26), 'wingTipR': (0, -3, 12)}


# ============================================================
# Clips
# ============================================================
def eagle_clips(rig, v):
    kk = v['k']
    rest = {'neck': (5, 0, 0), 'head': (-8, 0, 0), 'jaw': (2, 0, 0), 'tail': (4, 0, 0)}

    def r(**kw):
        return {**rest, **kw}

    def gait(t):
        pose = {}
        for leg, phase in (('L', 0.0), ('R', 0.5)):
            s = math.sin(2 * math.pi * (t + phase))
            c = math.cos(2 * math.pi * (t + phase))
            pose[f'thigh{leg}'] = (-24 * s, 0, 0)
            pose[f'shin{leg}'] = (16 * max(0.0, c) - 3, 0, 0)
            pose[f'foot{leg}'] = (9 * min(0.0, s), 0, 0)
        bob = math.sin(4 * math.pi * t)
        pose.update(r())
        pose['chest'] = (-2 - 2 * bob, 0, 2 * math.sin(2 * math.pi * t))
        pose['tail'] = (4 - 5 * bob, 0, 6 * math.sin(2 * math.pi * t))
        return pose, (0, 0, 0.014 * abs(bob) - 0.007)

    rig.clip('Reposo', [
        (1, r()),
        (16, {**r(), 'head': (-11, 4, 0), 'tail': (10, 0, 0), 'jaw': (7, 0, 0)}, (0, 0, -0.010)),
        (30, r()),
        (46, {**r(), 'neck': (10, -3, 0), 'head': (-14, -4, 0), 'wingL': (0, 0, -7), 'wingR': (0, 0, 7)}, (0, 0, -0.006)),
        (61, r()),
    ])
    rig.clip('Caminar', [(1 + i * 3, *gait(i / 8)) for i in range(9)])
    rig.clip('Atacar', [
        # agacha, salta al claro y clava las garras en el suelo
        (1, r()),
        (5, {**r(), 'chest': (12, 0, 0), 'thighL': (-10, 0, 0), 'thighR': (-10, 0, 0),
             'shinL': (14, 0, 0), 'shinR': (14, 0, 0), 'neck': (10, 0, 0), 'head': (-2, 0, 0),
             'wingL': (8, 0, -16), 'wingR': (8, 0, 16)}, (0, 0.04, -0.05)),
        (8, {**MEDIA, 'wingL': (0, 10, -58), 'wingR': (0, -10, 58),
             'chest': (-10, 0, 0), 'neck': (-6, 0, 0), 'head': (-4, 0, 0), 'jaw': (16, 0, 0),
             'thighL': (-58, 0, 12), 'thighR': (-58, 0, -12), 'shinL': (28, 0, 0), 'shinR': (28, 0, 0),
             'footL': (-24, 0, 10), 'footR': (-24, 0, -10), 'tail': (-14, 0, 0)},
            (0, -0.09, 0.11)),
        (11, {**MEDIA, 'wingL': (-6, 6, -40), 'wingR': (6, -6, 40), 'chest': (2, 0, 0),
              'thighL': (-34, 0, 8), 'thighR': (-34, 0, -8), 'shinL': (12, 0, 0), 'shinR': (12, 0, 0),
              'footL': (-16, 0, 8), 'footR': (-16, 0, -8), 'jaw': (20, 0, 0), 'tail': (8, 0, 0)},
             (0, -0.13, -0.03)),
        (14, {**r(), 'chest': (10, 0, 0), 'wingL': (4, 0, -20), 'wingR': (4, 0, 20),
              'thighL': (-14, 0, 0), 'thighR': (-14, 0, 0), 'shinL': (16, 0, 0), 'shinR': (16, 0, 0)},
             (0, 0.02, -0.04)),
        (24, r()),
    ])
    rig.clip('Golpeado', [
        (1, r()),
        (4, {'chest': (14, 0, -6), 'neck': (16, 0, 0), 'head': (16, 0, 0), 'jaw': (14, 0, 0),
             'tail': (20, 0, 0), 'wingL': (16, 0, -26), 'wingR': (16, 0, 26),
             'wingTipL': (8, 0, -14), 'wingTipR': (8, 0, 14), 'thighL': (-16, 0, 0), 'shinL': (20, 0, 0)},
            (0, 0.05, -0.02)),
        (13, r()),
    ])
    rig.clip('Morir', [
        (1, r()),
        (6, {**r(), 'jaw': (20, 0, 0), 'neck': (12, 0, 0), 'head': (14, 0, 0),
             'wingL': (10, 0, -20), 'wingR': (10, 0, 20)}, (0, 0.03, -0.05)),
        (15, {'wingL': (18, 8, -46), 'wingR': (-18, -8, 46), 'wingTipL': (10, 6, -18), 'wingTipR': (-10, -6, 18),
              'chest': (28, 0, 8), 'neck': (26, 0, 0), 'head': (24, 0, 0), 'jaw': (26, 0, 0),
              'tail': (24, 0, 0), 'thighL': (-58, 0, 12), 'shinL': (50, 0, 0),
              'thighR': (-58, 0, -12), 'shinR': (50, 0, 0)}, (0, 0.05, -0.36)),
        (26, {'wingL': (26, 10, -34), 'wingR': (-26, -10, 34), 'wingTipL': (14, 8, -16), 'wingTipR': (-14, -8, 16),
              'chest': (42, 0, 14), 'neck': (32, 0, 0), 'head': (30, 0, 0), 'jaw': (34, 0, 0),
              'tail': (30, 0, 6), 'thighL': (-66, 0, 18), 'shinL': (60, 0, 0), 'footL': (24, 0, 0),
              'thighR': (-66, 0, -18), 'shinR': (60, 0, 0), 'footR': (24, 0, 0)}, (0, 0.06, -0.56)),
    ])


# ============================================================
# Generacion
# ============================================================
def generar(escena, v):
    m = mats(v)
    rig = fg_rig.Rig(escena, f"FG_{v['nombre']}", eagle_bones(v))
    b = fg.Builder('Cuerpo')
    eagle_mesh(b, m, v)
    cuerpo = rig.part(b)
    eagle_clips(rig, v)
    rig.export(v['archivo'])
    tris = sum(len(p.vertices) - 2 for p in cuerpo.data.polygons)
    print(f"{v['archivo']}: {tris} triangulos")
    assert tris <= v['tope'], f"{v['archivo']} fuera de presupuesto: {tris} triangulos"
    for act in rig.actions:  # prefijo para que convivan en el .blend sin colision
        act.name = f"{v['nombre']}_{act.name}"
    return rig, cuerpo


def main():
    escena_base = fg.reset()
    for clave in ('negra', 'ornada', 'crestada'):
        cuerpo = generar(escena_base, VARIANTES[clave])[1]
        cuerpo.name = f"Cuerpo_{clave}"
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'aguilas_darien.blend'), copy=True)
    print('aguilas_darien.blend salvo las tres aguilas con clips prefijados')


if __name__ == '__main__':
    main()
