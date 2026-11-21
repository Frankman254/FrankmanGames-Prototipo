# Biblioteca original de utileria para los pisos de la cripta (OMP-M25).
# Blender 5.2:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scripts/blender/utileria_cripta.py
# Salidas: assets/models/utileria_cripta.glb
# Doce piezas estaticas (sin rig ni clips), cada una con su origen en el suelo y
# mirando a -Y, igual que utileria.glb. Los tramos son los de OMP-POL-02:
#   1-30  piedra y raices   : sarcofago, urnas, raices, velas
#   31-70 cueva humeda      : pila de agua, estalagmitas, telaranas, velon
#   71-100 oro y huesos     : sarcofago dorado, osario, ofrenda, altar
# Las piezas leen bien a la luz de la falcopama: siluetas simples, poco detalle
# fino y emissives solo en llama y oro de huaca. Nada copiado de referencia_assets.
import importlib
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
scene = fg.fresh_scene('UtileriaCripta')
parts = []


def mat(name, rgb, **kwargs):
    return fg.material('crip_' + name, rgb, **kwargs)


PIEDRA = mat('piedra', (0.30, 0.30, 0.285), rough=0.92)
PIEDRA_OSC = mat('piedra_oscura', (0.155, 0.155, 0.15), rough=0.9)
PIEDRA_CLARA = mat('piedra_clara', (0.46, 0.45, 0.41), rough=0.9)
BARRO = mat('barro', (0.44, 0.24, 0.115), rough=0.95)
BARRO_CLARO = mat('barro_claro', (0.60, 0.40, 0.21), rough=0.96)
HUESO = mat('hueso', (0.78, 0.73, 0.58), rough=0.85)
HUESO_VIEJO = mat('hueso_viejo', (0.52, 0.47, 0.36), rough=0.9)
ORO = mat('oro', (0.85, 0.58, 0.12), metallic=0.35, rough=0.42,
          emit=(1.0, 0.62, 0.12), strength=0.35)
ORO_MATE = mat('oro_mate', (0.66, 0.44, 0.10), metallic=0.25, rough=0.6)
HIERRO = mat('hierro', (0.16, 0.165, 0.175), metallic=0.35, rough=0.5)
CERA = mat('cera', (0.87, 0.80, 0.62), rough=0.6)
LLAMA = mat('llama', (1.0, 0.5, 0.06), rough=0.4, emit=(1.0, 0.42, 0.05), strength=6.0)
AGUA = mat('agua_estancada', (0.075, 0.15, 0.15), rough=0.15)
RAIZ = mat('raiz', (0.185, 0.125, 0.07), rough=0.95)
RAIZ_CLARA = mat('raiz_clara', (0.30, 0.21, 0.12), rough=0.95)
MUSGO = mat('musgo', (0.13, 0.22, 0.09), rough=1.0)
TELA = mat('tela_ritual', (0.40, 0.05, 0.07), rough=0.95)
TELARANA = mat('telarana', (0.62, 0.63, 0.60), rough=1.0)


def box(b, center, size, material, rot=None):
    b.box(center, size, material, rot=rot)


def tube(b, a, c, r0, r1, material, sides=8):
    b.tube(a, c, r0, r1, material, sides=sides)


def piece(name, build):
    b = fg.Builder('crip_' + name)
    build(b)
    obj = b.object(scene)
    parts.append(obj)
    return obj


# ------------------------------------------------------------
# tramo 1-30: piedra y raices
# ------------------------------------------------------------
def sarcophagus(b, gold=False):
    """Sarcofago de tapa a dos aguas. Con gold=True (tramo huaca) va chapado en
    oro con mascara felina tallada en la tapa."""
    cuerpo = ORO_MATE if gold else PIEDRA
    tapa = ORO if gold else PIEDRA_CLARA
    box(b, (0, 0, 0.10), (0.98, 2.30, 0.20), PIEDRA_OSC)                 # zocalo
    box(b, (0, 0, 0.52), (0.86, 2.14, 0.66), cuerpo)                     # caja
    box(b, (0, 0, 0.88), (0.94, 2.22, 0.08), cuerpo)                     # cornisa
    for s in (-1, 1):                                                    # tapa a dos aguas
        box(b, (s * 0.245, 0, 1.02), (0.52, 2.26, 0.075), tapa, rot=(math.radians(24 * s), 'Y'))
    box(b, (0, 0, 1.145), (0.10, 2.26, 0.07), tapa)                      # caballete
    # cabecera: frontis con rasgos (la version dorada, mascara felina de huaca)
    cara = ORO if gold else PIEDRA_CLARA
    box(b, (0, -1.07, 0.55), (0.70, 0.10, 0.52), cara)
    for x in (-0.16, 0.16):
        box(b, (x, -1.12, 0.66), (0.13, 0.04, 0.09), PIEDRA_OSC if not gold else ORO_MATE)
    if gold:
        box(b, (0, -1.13, 0.47), (0.30, 0.05, 0.14), ORO_MATE)           # hocico
        for x in (-0.24, 0.24):
            box(b, (x, -1.11, 0.84), (0.14, 0.05, 0.10), ORO)            # orejas
    else:
        box(b, (0, -1.12, 0.44), (0.26, 0.04, 0.10), PIEDRA_OSC)         # boca tallada


piece('sarcofago', lambda b: sarcophagus(b, False))
piece('sarcofago_oro', lambda b: sarcophagus(b, True))


def urns(b):
    """Fila de tres urnas funerarias de barro con tapa."""
    for (x, h, r) in ((-0.52, 0.78, 0.20), (0.12, 0.62, 0.24), (0.66, 0.5, 0.16)):
        tube(b, (x, 0, 0.03), (x, 0, 0.10), r * 0.75, r * 0.95, BARRO, sides=8)
        tube(b, (x, 0, 0.10), (x, 0, h * 0.72), r * 0.95, r * 0.72, BARRO, sides=8)
        tube(b, (x, 0, h * 0.72), (x, 0, h * 0.9), r * 0.72, r * 0.5, BARRO_CLARO, sides=8)
        tube(b, (x, 0, h * 0.9), (x, 0, h + 0.06), r * 0.56, r * 0.62, BARRO_CLARO, sides=8)
        tube(b, (x, 0, h + 0.06), (x, 0, h + 0.16), r * 0.14, r * 0.05, BARRO, sides=6)


piece('urnas', urns)


def roots(b):
    """Manojo de raices que revienta el suelo y sube por el muro (tramo 1).
    La boca de tierra va en el centro; las raices arquean hacia atras-arriba,
    donde se apoyarian contra la pared."""
    b.blob((0, 0.30, 0.11), (0.55, 0.42, 0.11), PIEDRA_OSC, subdiv=1)    # tierra removida
    for i, (dx, alto, grosor) in enumerate(((-0.34, 1.5, 0.11), (-0.10, 2.0, 0.14),
                                            (0.16, 1.7, 0.12), (0.38, 1.2, 0.09))):
        m = RAIZ if i % 2 == 0 else RAIZ_CLARA
        tube(b, (dx * 0.5, 0.30, 0.08), (dx, 0.42, alto * 0.55), grosor, grosor * 0.62, m, sides=6)
        tube(b, (dx, 0.42, alto * 0.55), (dx * 1.15, 0.55, alto), grosor * 0.62, grosor * 0.22, m, sides=6)
    for d in (-0.5, 0.5):                                                # raices rastreras
        tube(b, (d * 0.4, 0.2, 0.05), (d * 1.1, -0.35, 0.045), 0.05, 0.022, RAIZ, sides=5)


piece('raices_muro', roots)


def candles(b):
    """Tres velas de cera sobre pedestales bajos, con llama."""
    for i, (x, y, h) in enumerate(((-0.26, 0.0, 0.62), (0.04, 0.14, 0.86), (0.28, -0.1, 0.48))):
        box(b, (x, y, 0.05), (0.16, 0.16, 0.10), PIEDRA_OSC)
        tube(b, (x, y, 0.1), (x, y, h), 0.05, 0.042, CERA, sides=7)
        tube(b, (x, y, h), (x, y, h + 0.02), 0.012, 0.008, HUESO_VIEJO, sides=4)
        # llama: rombo vertical estrecho (dos tarjetas gemelas)
        for s in (-1, 1):
            b.card([(x, y, h + 0.02), (x + s * 0.03, y, h + 0.075),
                    (x, y, h + 0.185), (x - s * 0.03, y, h + 0.075)], LLAMA)


piece('velas', candles)

# ------------------------------------------------------------
# tramo 31-70: cueva humeda
# ------------------------------------------------------------
def water_basin(b):
    """Pila redonda de piedra con agua estancada a nivel del borde y musgo en el pie."""
    tube(b, (0, 0, 0.02), (0, 0, 0.5), 0.62, 0.58, PIEDRA, sides=10)
    tube(b, (0, 0, 0.5), (0, 0, 0.58), 0.66, 0.62, PIEDRA_CLARA, sides=10)
    tube(b, (0, 0, 0.44), (0, 0, 0.5), 0.52, 0.54, PIEDRA_OSC, sides=10)  # cuenco hueco
    tube(b, (0, 0, 0.5), (0, 0, 0.53), 0.54, 0.52, AGUA, sides=10)        # agua casi al borde
    for a in range(0, 360, 72):                                          # motas de musgo
        r = math.radians(a)
        b.blob((0.5 * math.cos(r), 0.5 * math.sin(r), 0.08), (0.13, 0.13, 0.07), MUSGO, subdiv=0)


piece('pila_agua', water_basin)


def stalagmites(b):
    """Grupo de tres estalagmitas con una columna gotante."""
    for (x, y, h, r) in ((-0.3, 0.1, 0.85, 0.14), (0.12, -0.18, 1.45, 0.19), (0.42, 0.22, 0.6, 0.11)):
        tube(b, (x, y, 0.0), (x, y, h * 0.55), r, r * 0.55, PIEDRA_OSC, sides=6)
        tube(b, (x, y, h * 0.55), (x, y, h), r * 0.55, r * 0.12, PIEDRA, sides=6)
    b.blob((-0.05, 0.28, 0.045), (0.5, 0.42, 0.045), PIEDRA_OSC, subdiv=1)  # charco seco


piece('estalagmitas', stalagmites)


def cobweb(b):
    """Telarana de rincon: dos abanicos de hilo, uno contra cada pared (planos
    x=0 e y=0), compartiendo el anclaje alto de la esquina. Se coloca metida
    en una esquina de la cripta; el origen queda al pie de la esquina."""
    alto = 2.0
    radios = [math.radians(8 + i * 18.5) for i in range(5)]

    def punto(f, fr, eje, lado):
        """Punto del abanico al factor fr del radio f, desplazado `lado` mm
        perpendicular a la pared para dar bulto a la hebra."""
        px, pz = math.sin(f) * alto * fr, alto - math.cos(f) * alto * fr
        return (px, lado, pz) if eje == 0 else (lado, px, pz)

    for eje in range(2):                                                 # pared X o pared Y
        for f in radios:                                                 # hilos radiales
            tube(b, (0, 0, alto), punto(f, 1.0, eje, 0.0), 0.011, 0.006, TELARANA, sides=3)
        for fr in (0.34, 0.58, 0.82):                                    # anillos: triangulos finos
            for i in range(4):
                f0, f1 = radios[i], radios[i + 1]
                q0, q1 = punto(f0, fr, eje, 0), punto(f1, fr, eje, 0)
                fm = (f0 + f1) / 2
                apex = punto(fm, fr * 0.86, eje, 0)                      # comba hacia el anclaje
                a = [q0, q1, apex]
                bb = [(p[0] + (0.012 if eje else 0), p[1] + (0 if eje else 0.012), p[2]) for p in a]
                b.poly(a, bb, TELARANA)
    # hebra colgante con bolita de polvo en el extremo
    tube(b, (0, 0, alto), (0.06, 0.05, 1.2), 0.008, 0.006, TELARANA, sides=3)
    b.blob((0.07, 0.06, 1.16), (0.05, 0.05, 0.06), TELARANA, subdiv=0)


piece('telarana_rincon', cobweb)


def candelabra(b):
    """Velon de hierro con tres brazos y gotas de cera."""
    box(b, (0, 0, 0.04), (0.46, 0.46, 0.08), HIERRO)
    tube(b, (0, 0, 0.08), (0, 0, 1.5), 0.05, 0.035, HIERRO, sides=6)
    for x in (-0.34, 0.0, 0.34):
        if x == 0.0:
            top = 1.62
        else:
            tube(b, (0, 0, 1.3), (x * 0.7, 0, 1.42), 0.028, 0.024, HIERRO, sides=5)
            tube(b, (x * 0.7, 0, 1.42), (x, 0, 1.5), 0.024, 0.02, HIERRO, sides=5)
            top = 1.5
        tube(b, (x, 0, top), (x, 0, top + 0.20), 0.045, 0.04, CERA, sides=7)
        b.poly([(x - 0.024, -0.024, top + 0.2), (x + 0.024, -0.024, top + 0.2), (x, 0.024, top + 0.2)],
               [(x - 0.01, -0.01, top + 0.3), (x + 0.01, -0.01, top + 0.3), (x, 0.01, top + 0.33)], LLAMA)


piece('velon', candelabra)

# ------------------------------------------------------------
# tramo 71-100: oro y huesos
# ------------------------------------------------------------
def ossuary(b):
    """Nicho de osario: arco de piedra con calaveras apiladas y canillas cruzadas."""
    box(b, (0, 0.16, 0.75), (1.7, 0.5, 1.5), PIEDRA_OSC)                 # fondo
    for x in (-0.8, 0.8):
        box(b, (x, 0, 0.6), (0.22, 0.7, 1.2), PIEDRA)                    # jambas
    box(b, (0, 0, 1.26), (1.82, 0.7, 0.24), PIEDRA)                      # dintel
    box(b, (0, 0, 0.06), (1.82, 0.7, 0.12), PIEDRA_OSC)                  # solera
    for (x, y, z, s) in ((-0.42, -0.05, 0.26, 1.0), (0.36, -0.02, 0.26, 0.92),
                         (-0.05, -0.04, 0.55, 0.95)):
        b.blob((x, y, z), (0.15 * s, 0.16 * s, 0.13 * s), HUESO, subdiv=1)   # craneo
        box(b, (x - 0.05 * s, y - 0.14 * s, z + 0.01), (0.05, 0.04, 0.05), PIEDRA_OSC)
        box(b, (x + 0.05 * s, y - 0.14 * s, z + 0.01), (0.05, 0.04, 0.05), PIEDRA_OSC)
    for i, z0 in enumerate((0.14, 0.27)):                                # canillas en dos camas
        for k in range(4):
            tube(b, (-0.62 + 0.36 * k, -0.12 + 0.09 * i, z0), (-0.42 + 0.36 * k, -0.03 + 0.09 * i, z0 + 0.1),
                 0.035, 0.03, HUESO_VIEJO if k % 2 else HUESO, sides=5)


piece('osario', ossuary)


def offering(b):
    """Ofrenda de huaca: losa con un plato de oro y discos apilados."""
    box(b, (0, 0, 0.08), (0.9, 0.9, 0.16), PIEDRA_OSC)
    box(b, (0, 0, 0.26), (0.7, 0.7, 0.2), PIEDRA_CLARA)
    tube(b, (0, 0, 0.36), (0, 0, 0.44), 0.3, 0.24, ORO_MATE, sides=8)    # plato
    tube(b, (0, 0, 0.44), (0, 0, 0.5), 0.24, 0.2, ORO, sides=8)
    for i in range(4):                                                   # discos apilados
        tube(b, (-0.02 + 0.02 * (i % 2), 0.01 * i, 0.5 + 0.035 * i),
             (-0.02 + 0.02 * (i % 2), 0.01 * i, 0.535 + 0.035 * i), 0.13, 0.13, ORO, sides=8)
    tube(b, (0.3, 0.24, 0.36), (0.3, 0.24, 0.52), 0.06, 0.05, ORO_MATE, sides=6)  # pieza caída


piece('ofrenda_oro', offering)


def altar(b):
    """Altar de dos gradas con manto ritual y copa dorada."""
    box(b, (0, 0, 0.13), (1.5, 1.1, 0.26), PIEDRA_OSC)
    box(b, (0, 0, 0.38), (1.2, 0.86, 0.26), PIEDRA)
    box(b, (0, 0, 0.66), (0.96, 0.68, 0.32), PIEDRA_CLARA)
    box(b, (0, -0.2, 0.62), (0.5, 0.06, 0.5), TELA)                      # manto que cae
    tube(b, (0, 0, 0.82), (0, 0, 0.9), 0.13, 0.1, ORO_MATE, sides=7)     # copa
    tube(b, (0, 0, 0.9), (0, 0, 1.02), 0.1, 0.17, ORO, sides=7)
    b.blob((0, 0, 1.06), (0.1, 0.1, 0.05), HUESO, subdiv=1)              # ofrenda de hueso


piece('altar_huaca', altar)


fg.export('utileria_cripta.glb', scene, parts, materials=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'utileria_cripta.blend'), copy=True)
print(f'utileria_cripta: {len(parts)} piezas')
