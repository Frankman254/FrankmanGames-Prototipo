# NAV-02 (creador, 2026-11-27: «me gustaria armar un mapa estilo navidad […] tu los modelados y
# texturas e implementas»): piezas del mapa de Navidad de data/navidad.json.
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scripts/blender/navidad.py
# Salidas: assets/models/navidad.glb y arte/blender/navidad.blend.
# Mallas estáticas (sin rig), un nodo por pieza, origen en el suelo y frente a −Y, en metros:
#   arbol_navidad, regalo_a/b/c, nacimiento, casita_nevada_a/b/c, farol_navidad,
#   guirnalda (6 m a lo largo de +X; el juego la estira entre dos faroles), muneco_nieve, banca_nevada.
# Clean-room: Navidad del istmo inventada desde cero (faroles de papel, banderines con colores de
# pollera, casitas de quincha con teja, sombrero pintao en el muñeco). Primitivas de fg.py.
import importlib
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
scene = fg.fresh_scene('Navidad')


def mat(name, rgb, **kw):
    return fg.material('nav_' + name, rgb, **kw)


NIEVE = mat('nieve', (0.90, 0.94, 1.0), rough=0.85)
PINO = mat('pino', (0.10, 0.36, 0.20), rough=0.8)
PINO_CLARO = mat('pino_claro', (0.16, 0.46, 0.25), rough=0.8)
TRONCO = mat('tronco', (0.36, 0.22, 0.12), rough=0.9)
MADERA = mat('madera', (0.52, 0.34, 0.18), rough=0.8)
MADERA_OSC = mat('madera_osc', (0.30, 0.19, 0.10), rough=0.85)
PAJA = mat('paja', (0.80, 0.66, 0.34), rough=0.95)
TEJA = mat('teja', (0.62, 0.24, 0.14), rough=0.8)
HIERRO = mat('hierro', (0.12, 0.12, 0.13), metallic=0.3, rough=0.6)
ORO = mat('oro', (0.95, 0.70, 0.18), metallic=0.4, rough=0.35, emit=(1.0, 0.75, 0.2), strength=0.6)
ESTRELLA = mat('estrella', (1.0, 0.86, 0.35), rough=0.3, emit=(1.0, 0.82, 0.3), strength=4.0)
VENTANA = mat('ventana', (1.0, 0.75, 0.38), rough=0.4, emit=(1.0, 0.66, 0.28), strength=2.5)
PAPEL_ROJO = mat('papel_rojo', (0.86, 0.18, 0.14), rough=0.7, emit=(1.0, 0.35, 0.18), strength=2.0)
PAPEL_AMBAR = mat('papel_ambar', (0.98, 0.66, 0.22), rough=0.7, emit=(1.0, 0.62, 0.22), strength=2.2)
LUCES = [mat(f'luz_{n}', c, rough=0.3, emit=c, strength=3.0) for n, c in (
    ('roja', (1.0, 0.18, 0.15)), ('ambar', (1.0, 0.68, 0.18)), ('azul', (0.25, 0.55, 1.0)), ('verde', (0.3, 0.95, 0.4)))]
BOLAS = [mat(f'bola_{n}', c, metallic=0.35, rough=0.3) for n, c in (
    ('roja', (0.78, 0.08, 0.10)), ('dorada', (0.92, 0.66, 0.15)), ('azul', (0.12, 0.30, 0.75)), ('blanca', (0.92, 0.92, 0.95)))]
# Banderines con colores de pollera: rojo, amarillo, azul, verde y blanco.
POLLERA = [mat(f'pollera_{n}', c, rough=0.7) for n, c in (
    ('roja', (0.80, 0.12, 0.12)), ('amarilla', (0.96, 0.78, 0.15)), ('azul', (0.15, 0.35, 0.80)),
    ('verde', (0.15, 0.58, 0.28)), ('blanca', (0.95, 0.95, 0.95)))]
CUERDA = mat('cuerda', (0.55, 0.45, 0.30), rough=0.9)
CARBON = mat('carbon', (0.05, 0.05, 0.06), rough=0.6)
ZANAHORIA = mat('zanahoria', (0.95, 0.45, 0.08), rough=0.7)
SOMBRERO_BLANCO = mat('sombrero_blanco', (0.90, 0.86, 0.74), rough=0.9)
SOMBRERO_NEGRO = mat('sombrero_negro', (0.08, 0.07, 0.06), rough=0.9)
PIEL = mat('piel', (0.70, 0.48, 0.32), rough=0.8)
MANTO_AZUL = mat('manto_azul', (0.18, 0.32, 0.62), rough=0.85)
TUNICA = mat('tunica', (0.55, 0.36, 0.22), rough=0.9)
TELA_BLANCA = mat('tela_blanca', (0.92, 0.90, 0.84), rough=0.9)
BUEY = mat('buey', (0.45, 0.30, 0.20), rough=0.9)
BURRO = mat('burro', (0.48, 0.46, 0.44), rough=0.9)
CUERNO = mat('cuerno', (0.88, 0.84, 0.70), rough=0.6)

PAREDES = [mat('pared_cal', (0.93, 0.90, 0.82)), mat('pared_ocre', (0.88, 0.70, 0.42)), mat('pared_celeste', (0.62, 0.78, 0.86))]
PUERTAS = [mat('puerta_verde', (0.12, 0.40, 0.26)), mat('puerta_roja', (0.62, 0.14, 0.12)), mat('puerta_azul', (0.14, 0.26, 0.55))]


def lazo(b, cx, cy, z, s, m):
    """Moño de regalo: dos lazadas y un nudo."""
    for x in (-1, 1):
        b.blob((cx + x * s * 0.55, cy, z + s * 0.25), (s * 0.5, s * 0.22, s * 0.32), m, subdiv=1)
    b.blob((cx, cy, z + s * 0.1), (s * 0.22, s * 0.22, s * 0.2), m, subdiv=1)


def regalo(b, w, d, h, caja, cinta):
    b.box((0, 0, h / 2), (w, d, h), caja)
    b.box((0, 0, h / 2), (w + 0.02, 0.10, h + 0.02), cinta)
    b.box((0, 0, h / 2), (0.10, d + 0.02, h + 0.02), cinta)
    lazo(b, 0, 0, h, min(w, d) * 0.35, cinta)


def regalo_a(b):
    regalo(b, 0.8, 0.8, 0.8, BOLAS[0], BOLAS[1])


def regalo_b(b):
    regalo(b, 0.6, 0.6, 1.0, PINO_CLARO, BOLAS[0])


def regalo_c(b):
    regalo(b, 1.0, 0.7, 0.45, BOLAS[2], BOLAS[3])


def estrella(b, cx, cy, cz, r, m, grosor=0.08):
    pts = []
    for i in range(10):
        t = math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rr * math.cos(t), cz + rr * math.sin(t)))
    b.poly([(x, cy - grosor, z) for x, z in pts], [(x, cy + grosor, z) for x, z in pts], m)


def arbol_navidad(b):
    # Pino de 11,5 m: tronco, cinco pisos de ramas, bolas, una espiral de luces y la estrella.
    b.tube((0, 0, 0), (0, 0, 1.6), 0.45, 0.38, TRONCO, sides=8)
    pisos = [(1.0, 4.2, 4.6), (3.0, 3.6, 4.0), (4.9, 2.9, 3.4), (6.7, 2.2, 2.8), (8.4, 1.4, 2.3)]
    for i, (z0, r, h) in enumerate(pisos):
        b.tube((0, 0, z0), (0, 0, z0 + h), r, 0.05, PINO if i % 2 == 0 else PINO_CLARO, sides=12)
        # nieve en los bordes de las ramas
        for k in range(8):
            t = 2 * math.pi * (k + 0.5 * i) / 8
            b.blob((r * 0.92 * math.cos(t), r * 0.92 * math.sin(t), z0 + 0.12), (0.45, 0.45, 0.10), NIEVE, subdiv=1)
    # bolas sobre la superficie de cada piso
    n = 0
    for i, (z0, r, h) in enumerate(pisos):
        cuantas = 10 - i
        for k in range(cuantas):
            t = 2 * math.pi * (k + 0.37 * i) / cuantas
            f = 0.35
            rr = r * (1 - f) + 0.12
            b.blob((rr * math.cos(t), rr * math.sin(t), z0 + h * f), (0.22, 0.22, 0.22), BOLAS[n % 4], subdiv=1)
            n += 1
    # espiral de luces
    vueltas, total = 5, 90
    for k in range(total):
        u = k / total
        z = 1.3 + u * 9.2
        r = 4.0 * (1 - u) + 0.3
        t = 2 * math.pi * vueltas * u
        b.blob((r * math.cos(t), r * math.sin(t), z), (0.09, 0.09, 0.09), LUCES[k % 4], subdiv=0)
    b.tube((0, 0, 10.6), (0, 0, 11.0), 0.08, 0.08, ORO, sides=6)
    estrella(b, 0, 0, 11.6, 0.75, ESTRELLA, grosor=0.12)


def nieve_techo(b, ancho, medio, alto_alero, alto_cumbre, grosor=0.14, vuelo=0.45):
    """Capa de nieve sobre un tejado a dos aguas cuya cumbrera corre en X."""
    # `medio`: profundidad total del tejado; cada faldón mide medio/2 en planta.
    ang = math.atan2(alto_cumbre - alto_alero, medio / 2)
    largo = math.hypot(medio / 2, alto_cumbre - alto_alero) - vuelo
    for s in (-1, 1):
        cy = s * (medio / 4 - vuelo * 0.45)
        cz = (alto_alero + alto_cumbre) / 2 + grosor * 0.55
        b.box((0, cy, cz), (ancho, largo, grosor), NIEVE, rot=(-s * ang, 'X'))


def casita(b, pared, puerta, chimenea=True):
    # Casita de quincha 7 × 6 m, teja a dos aguas nevada, puerta y dos ventanas encendidas al frente (−Y).
    W, D, H, CUMBRE = 7.0, 6.0, 3.0, 4.7
    b.box((0, 0, 0.2), (W + 0.3, D + 0.3, 0.4), MADERA_OSC)          # zócalo
    b.box((0, 0, H / 2 + 0.2), (W, D, H), pared)
    perfil = [(-D / 2 - 0.45, H + 0.15), (D / 2 + 0.45, H + 0.15), (0, CUMBRE + 0.2)]
    b.poly([(-W / 2 - 0.4, y, z) for y, z in perfil], [(W / 2 + 0.4, y, z) for y, z in perfil], TEJA)
    nieve_techo(b, W + 0.2, D + 0.9, H + 0.15, CUMBRE + 0.2)
    # frontón con la pared
    b.poly([(-W / 2, y, z) for y, z in [(-D / 2, H + 0.2), (D / 2, H + 0.2), (0, CUMBRE)]],
           [(W / 2, y, z) for y, z in [(-D / 2, H + 0.2), (D / 2, H + 0.2), (0, CUMBRE)]], pared)
    fy = -D / 2 - 0.04
    b.box((0, fy, 1.25), (1.2, 0.12, 2.1), puerta)                    # puerta
    b.box((0, fy - 0.03, 2.38), (1.5, 0.14, 0.16), MADERA_OSC)        # dintel
    b.blob((0.4, fy - 0.1, 1.2), (0.05, 0.05, 0.05), ORO, subdiv=0)   # pomo
    # corona en la puerta
    for k in range(10):
        t = 2 * math.pi * k / 10
        b.blob((0.32 * math.cos(t), fy - 0.1, 1.9 + 0.32 * math.sin(t)), (0.11, 0.08, 0.11), PINO_CLARO, subdiv=1)
    b.blob((0, fy - 0.14, 1.62), (0.09, 0.05, 0.07), BOLAS[0], subdiv=1)
    for x in (-2.2, 2.2):
        b.box((x, fy, 1.7), (1.1, 0.1, 1.0), VENTANA)
        b.box((x, fy - 0.05, 1.7), (1.25, 0.08, 0.1), MADERA_OSC)
        b.box((x, fy - 0.05, 1.7), (0.08, 0.08, 1.1), MADERA_OSC)
        b.box((x, fy - 0.12, 1.12), (1.35, 0.3, 0.1), MADERA_OSC)     # alféizar
        b.box((x, fy - 0.14, 1.2), (1.3, 0.3, 0.08), NIEVE)
        for s in (-1, 1):                                             # postigos
            b.box((x + s * 0.72, fy - 0.03, 1.7), (0.3, 0.06, 1.1), puerta)
    # luces bajo el alero del frente
    for k in range(15):
        x = -W / 2 + 0.2 + k * (W - 0.4) / 14
        b.blob((x, -D / 2 - 0.42, H + 0.02 - 0.12 * math.sin(math.pi * ((k % 3) / 3))), (0.07, 0.07, 0.09), LUCES[k % 4], subdiv=0)
    if chimenea:
        b.box((2.0, 1.2, 4.6), (0.7, 0.7, 1.6), TEJA)
        b.box((2.0, 1.2, 5.45), (0.85, 0.85, 0.16), NIEVE)


def casita_nevada_a(b):
    casita(b, PAREDES[0], PUERTAS[0])


def casita_nevada_b(b):
    casita(b, PAREDES[1], PUERTAS[1], chimenea=False)


def casita_nevada_c(b):
    casita(b, PAREDES[2], PUERTAS[2])


def figura(b, x, y, alto, cuerpo, manto=None, arrodillada=False):
    """Figura sencilla de pesebre: cuerpo cónico, cabeza y manto."""
    h = alto * (0.62 if arrodillada else 1.0)
    b.tube((x, y, 0), (x, y, h * 0.78), 0.32 if arrodillada else 0.26, 0.14, cuerpo, sides=10)
    b.blob((x, y, h * 0.86), (0.13, 0.13, 0.15), PIEL, subdiv=2)
    if manto:
        b.tube((x, y + 0.02, h * 0.95), (x, y + 0.05, h * 0.45), 0.15, 0.30, manto, sides=10)


def nacimiento(b):
    # Establo de madera y paja con techo nevado, abierto al frente (−Y), 8 × 4,5 m.
    W, D = 8.0, 4.5
    for x in (-W / 2, W / 2):
        for y in (-D / 2, D / 2):
            b.box((x, y, 1.7), (0.25, 0.25, 3.4 if y > 0 else 2.8), MADERA)
    b.box((0, D / 2, 1.6), (W, 0.18, 3.2), MADERA_OSC)               # pared del fondo
    for x in (-W / 2, W / 2):
        b.box((x, 0, 1.3), (0.15, D, 2.6), MADERA_OSC)               # laterales
    techo = (W + 0.8, D + 1.0, 0.22)
    ang = math.atan2(0.6, D)
    b.box((0, 0, 3.2), techo, PAJA, rot=(ang, 'X'))
    b.box((0, 0, 3.38), (techo[0] + 0.1, techo[1] + 0.05, 0.14), NIEVE, rot=(ang, 'X'))
    b.box((0, 0, 0.05), (W - 0.2, D - 0.2, 0.1), PAJA)               # suelo de paja
    # pesebre con el niño
    b.box((0, 0.2, 0.45), (1.1, 0.6, 0.35), MADERA)
    for x in (-0.45, 0.45):
        b.box((x, 0.2, 0.15), (0.1, 0.5, 0.3), MADERA_OSC)
    b.box((0, 0.2, 0.66), (1.0, 0.5, 0.08), PAJA)
    b.blob((0, 0.2, 0.74), (0.32, 0.16, 0.1), TELA_BLANCA, subdiv=1)
    b.blob((-0.22, 0.2, 0.8), (0.1, 0.1, 0.1), PIEL, subdiv=1)
    figura(b, -1.2, 0.3, 1.7, TELA_BLANCA, MANTO_AZUL, arrodillada=True)
    figura(b, 1.25, 0.5, 1.8, TUNICA, TUNICA)
    b.tube((1.6, 0.4, 0), (1.7, 0.45, 1.9), 0.04, 0.04, MADERA_OSC, sides=5)   # bastón
    # buey y burro al fondo
    b.box((-2.6, 1.3, 0.9), (1.5, 0.8, 0.8), BUEY)
    b.box((-1.8, 1.1, 1.15), (0.5, 0.45, 0.45), BUEY)
    for s in (-1, 1):
        b.tube((-1.8, 1.1 + s * 0.2, 1.4), (-1.75, 1.1 + s * 0.38, 1.6), 0.05, 0.02, CUERNO, sides=5)
    for x in (-3.1, -2.1):
        for y in (1.05, 1.55):
            b.tube((x, y, 0), (x, y, 0.5), 0.08, 0.08, BUEY, sides=5)
    b.box((2.7, 1.3, 0.8), (1.2, 0.6, 0.65), BURRO)
    b.box((2.05, 1.1, 1.05), (0.4, 0.35, 0.4), BURRO)
    for s in (-1, 1):
        b.box((2.12, 1.1 + s * 0.1, 1.45), (0.08, 0.06, 0.45), BURRO)
    for x in (2.3, 3.1):
        for y in (1.1, 1.5):
            b.tube((x, y, 0), (x, y, 0.48), 0.06, 0.06, BURRO, sides=5)
    # estrella sobre el techo
    b.tube((0, -0.6, 3.5), (0, -0.6, 4.4), 0.05, 0.05, MADERA_OSC, sides=5)
    estrella(b, 0, -0.6, 4.9, 0.55, ESTRELLA)


def farol_navidad(b):
    # Poste de madera de 3,2 m con brazo y farol de papel encendido.
    b.box((0, 0, 0.1), (0.5, 0.5, 0.2), MADERA_OSC)
    b.tube((0, 0, 0), (0, 0, 3.3), 0.09, 0.07, MADERA, sides=8)
    b.box((0, -0.35, 3.1), (0.08, 0.8, 0.08), MADERA)
    b.box((0, 0, 3.4), (0.25, 0.25, 0.12), NIEVE)
    b.tube((0, -0.7, 3.1), (0, -0.7, 2.85), 0.012, 0.012, CUERDA, sides=4)
    b.blob((0, -0.7, 2.55), (0.24, 0.24, 0.34), PAPEL_ROJO, subdiv=2)
    for z in (2.35, 2.55, 2.75):
        b.tube((0, -0.7, z - 0.015), (0, -0.7, z + 0.015), 0.245 * (1 - abs(z - 2.55)), 0.245 * (1 - abs(z - 2.55)), PAPEL_AMBAR, sides=12)
    b.tube((0, -0.7, 2.2), (0, -0.7, 2.25), 0.1, 0.12, MADERA_OSC, sides=8)
    b.tube((0, -0.7, 2.86), (0, -0.7, 2.9), 0.12, 0.08, MADERA_OSC, sides=8)


def guirnalda(b):
    # Cuerda de 6 m a lo largo de +X, colgada entre 3,0 m y 2,45 m en el centro, con banderines.
    L, z0, caida = 6.0, 3.0, 0.55
    def zc(x):
        return z0 - caida * (1 - ((x - L / 2) / (L / 2)) ** 2)
    pasos = 12
    for i in range(pasos):
        x0, x1 = L * i / pasos, L * (i + 1) / pasos
        b.tube((x0, 0, zc(x0)), (x1, 0, zc(x1)), 0.015, 0.015, CUERDA, sides=4)
    n = 14
    for k in range(n):
        x = L * (k + 0.5) / n
        z = zc(x)
        tri_a = [(x - 0.16, -0.01, z), (x + 0.16, -0.01, z), (x, -0.01, z - 0.38)]
        tri_b = [(x - 0.16, 0.01, z), (x + 0.16, 0.01, z), (x, 0.01, z - 0.38)]
        b.poly(tri_a, tri_b, POLLERA[k % 5])


def muneco_nieve(b):
    # Muñeco de nieve de 2 m con bufanda de pollera y sombrero pintao.
    b.blob((0, 0, 0.55), (0.62, 0.62, 0.55), NIEVE, subdiv=2)
    b.blob((0, 0, 1.3), (0.45, 0.45, 0.42), NIEVE, subdiv=2)
    b.blob((0, 0, 1.85), (0.32, 0.32, 0.3), NIEVE, subdiv=2)
    for x in (-0.11, 0.11):
        b.blob((x, -0.28, 1.93), (0.04, 0.03, 0.04), CARBON, subdiv=0)
    b.tube((0, -0.28, 1.85), (0, -0.58, 1.83), 0.05, 0.01, ZANAHORIA, sides=6)
    for k in range(5):
        t = math.pi * (0.25 + 0.5 * k / 4)
        b.blob((0.22 * math.cos(t + math.pi / 2) * 1.0, -0.27 + 0.0 * k, 1.72 - 0.06 * math.sin(math.pi * k / 4)),
               (0.025, 0.02, 0.025), CARBON, subdiv=0)
    for z in (1.15, 1.35, 1.55):
        b.blob((0, -0.44, z), (0.05, 0.03, 0.05), CARBON, subdiv=0)
    b.tube((0, 0, 1.58), (0, 0, 1.68), 0.36, 0.33, POLLERA[0], sides=12)          # bufanda
    b.box((0.18, -0.32, 1.45), (0.14, 0.06, 0.32), POLLERA[1])
    for s in (-1, 1):                                                              # brazos de rama
        b.tube((s * 0.4, 0, 1.4), (s * 1.0, 0, 1.75), 0.04, 0.02, TRONCO, sides=5)
        b.tube((s * 0.85, 0, 1.68), (s * 1.0, 0, 1.6), 0.02, 0.012, TRONCO, sides=4)
    # sombrero pintao: ala ancha y copa con franjas negras
    b.tube((0, 0, 2.08), (0, 0, 2.11), 0.5, 0.5, SOMBRERO_BLANCO, sides=14)
    b.tube((0, 0, 2.11), (0, 0, 2.36), 0.22, 0.19, SOMBRERO_BLANCO, sides=12)
    for z in (2.15, 2.24, 2.32):
        b.tube((0, 0, z), (0, 0, z + 0.03), 0.225, 0.22, SOMBRERO_NEGRO, sides=12)
    b.tube((0, 0, 2.105), (0, 0, 2.115), 0.5, 0.44, SOMBRERO_NEGRO, sides=14)


def banca_nevada(b):
    # Banca de 1,8 m de tablas sobre patas de hierro, con nieve en el asiento.
    for x in (-0.75, 0.75):
        b.box((x, 0, 0.22), (0.08, 0.5, 0.44), HIERRO)
        b.box((x, 0.24, 0.65), (0.08, 0.06, 0.5), HIERRO)
    for k in range(3):
        b.box((0, -0.15 + k * 0.17, 0.47), (1.8, 0.14, 0.05), MADERA)
    for k in range(2):
        b.box((0, 0.27, 0.62 + k * 0.18), (1.8, 0.05, 0.12), MADERA)
    b.box((0.1, 0.0, 0.52), (1.4, 0.4, 0.06), NIEVE)
    b.box((0, 0.27, 0.95), (1.75, 0.08, 0.05), NIEVE)


PIEZAS = [
    ('arbol_navidad', arbol_navidad),
    ('regalo_a', regalo_a), ('regalo_b', regalo_b), ('regalo_c', regalo_c),
    ('nacimiento', nacimiento),
    ('casita_nevada_a', casita_nevada_a), ('casita_nevada_b', casita_nevada_b), ('casita_nevada_c', casita_nevada_c),
    ('farol_navidad', farol_navidad),
    ('guirnalda', guirnalda),
    ('muneco_nieve', muneco_nieve),
    ('banca_nevada', banca_nevada),
]


def main():
    parts = []
    for i, (nombre, build) in enumerate(PIEZAS):
        b = fg.Builder(nombre)
        build(b)
        obj = b.object(scene)
        if nombre != 'guirnalda':
            zmin = min(v.co.z for v in obj.data.vertices)
            for v in obj.data.vertices:
                v.co.z -= zmin
        parts.append(obj)
    fg.export('navidad.glb', scene, parts, materials=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender', 'navidad.blend'), copy=True)
    for obj in parts:
        tri = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        print(f'{obj.name}: {tri} triangulos')


if __name__ == '__main__':
    main()
