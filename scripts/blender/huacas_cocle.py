# Seis figuritas de oro estilo Gran Coclé para la cripta (OMP-POL-06):
# vitrina del altar y botín en el suelo.
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scripts/blender/huacas_cocle.py
# Salidas: assets/models/huacas_cocle.glb y arte/blender/huacas_cocle.blend.
# Seis mallas estaticas (sin rig ni clips), nodos `huaca_<animal>` (rana,
# jaguar, aguilucho, caiman, tortuga, murcielago), origen en el suelo, mirando
# a -Y, ≤ 300 triangulos cada una: bultos y cajas, como la utilería de OMP-M25
# pero a escala de mano (12-20 cm). Oro con brillo suave para leerse en la
# oscuridad del tramo 71-100 sin farol. Clean-room: siluetas inventadas a
# partir de la idea general de orfebreria istmiena (hocico abierto, ojos de
# dona, extremos en gancho); nada copiado de reference_assets.
import importlib
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

importlib.reload(fg)

ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
scene = fg.fresh_scene('HuacasCocle')
parts = []


def mat(name, rgb, **kw):
    return fg.material('huaca_' + name, rgb, **kw)


ORO = mat('oro', (0.85, 0.58, 0.12), metallic=0.45, rough=0.38,
          emit=(1.0, 0.62, 0.12), strength=0.5)
ORO_CLARO = mat('oro_claro', (0.92, 0.72, 0.25), metallic=0.5, rough=0.3)
OREJERA = mat('disco_oro', (0.72, 0.47, 0.09), metallic=0.4, rough=0.5)
OJO = mat('ojo_brillo', (1.0, 0.85, 0.45), rough=0.25, emit=(1.0, 0.8, 0.35), strength=1.1)


def grito(b, cx, cy, cz, r):
    """Ojo de dona: aro dorado con centro encendido."""
    b.tube((cx, cy, cz), (cx, cy - 0.012, cz), r, r, OREJERA, sides=6)
    b.blob((cx, cy - 0.014, cz), (r * 0.45, r * 0.2, r * 0.45), OJO, subdiv=0)


# ---------------------------------------------------------------- 1. rana
def rana(b):
    # sentada, hocico ancho, ojos arriba: la silueta mas reconocible
    b.blob((0, 0.01, 0.055), (0.055, 0.065, 0.05), ORO, subdiv=1)          # cuerpo
    b.tube((0, -0.045, 0.05), (0, -0.075, 0.038), 0.030, 0.022, ORO, sides=6)  # cabeza
    for x in (-1, 1):
        b.blob((x * 0.026, -0.06, 0.068), (0.016, 0.016, 0.014), ORO, subdiv=0)
        grito(b, x * 0.026, -0.072, 0.068, 0.010)
        # pata agazapada con pie en gancho
        b.tube((x * 0.05, 0.03, 0.035), (x * 0.062, -0.01, 0.022), 0.014, 0.010, ORO, sides=5)
        b.card([(x * 0.062, -0.01, 0.02), (x * 0.05, -0.045, 0.008), (x * 0.072, -0.038, 0.008)], ORO_CLARO)
        # faja repujada
        b.tube((x * 0.03, 0.05, 0.06), (x * 0.05, 0.02, 0.055), 0.007, 0.007, OREJERA, sides=4)
    b.box((0, -0.078, 0.028), (0.05, 0.012, 0.008), ORO_CLARO)             # boca
    b.tube((0, 0.055, 0.045), (0, 0.075, 0.055), 0.012, 0.005, ORO, sides=5)  # trasero


# --------------------------------------------------------------- 2. jaguar
def jaguar(b):
    # felino agazapado mirando a -Y, cola en espiral hacia arriba, cabeza grande
    b.tube((0, 0.055, 0.05), (0, -0.045, 0.05), 0.030, 0.026, ORO, sides=7)   # lomo
    b.box((0, -0.065, 0.026), (0.05, 0.045, 0.052), ORO)                       # pecho/patas
    b.tube((0, 0.06, 0.06), (0.025, 0.085, 0.105), 0.011, 0.008, ORO, sides=5)  # cola
    b.tube((0.025, 0.085, 0.105), (0.015, 0.07, 0.125), 0.008, 0.006, ORO, sides=5)
    b.blob((0.012, 0.075, 0.13), (0.010, 0.010, 0.010), ORO_CLARO, subdiv=0)   # remate
    # cabeza con fauces abiertas (el rasgo de la orfebreria)
    b.blob((0.0, -0.085, 0.075), (0.036, 0.03, 0.032), ORO, subdiv=1)
    for x in (-1, 1):
        grito(b, x * 0.02, -0.108, 0.086, 0.010)
        b.blob((x * 0.03, -0.07, 0.095), (0.012, 0.012, 0.006), ORO, subdiv=0)  # oreja
    b.card([(0.0, -0.092, 0.055), (-0.024, -0.115, 0.062), (0.024, -0.115, 0.062)], ORO_CLARO)  # hocico sup
    b.card([(0.0, -0.09, 0.038), (-0.018, -0.11, 0.05), (0.018, -0.11, 0.05)], OREJERA)          # mandibula
    for x in (-1, 1):  # colmillos
        b.card([(x * 0.012, -0.098, 0.05), (x * 0.018, -0.102, 0.05), (x * 0.015, -0.10, 0.036)], OJO)
    for x in (-1, 1):  # manchas: dos discos repujados en los flancos
        b.blob((x * 0.028, 0.0, 0.058), (0.004, 0.008, 0.008), OREJERA, subdiv=0)


# --------------------------------------------------------------- 3. águila
def aguilucho(b):
    # de frente, alas desplegadas en abanico escalonado, pico ganchudo
    b.tube((0, 0.005, 0.035), (0, 0.0, 0.095), 0.020, 0.016, ORO, sides=6)      # torso
    b.blob((0, -0.008, 0.112), (0.020, 0.022, 0.020), ORO, subdiv=1)            # cabeza
    b.card([(0, -0.02, 0.118), (0, -0.02, 0.102), (0, -0.042, 0.108)], ORO_CLARO)  # pico
    for x in (-1, 1):
        grito(b, x * 0.011, -0.026, 0.118, 0.007)
        b.blob((x * 0.02, -0.005, 0.128), (0.010, 0.010, 0.010), ORO, subdiv=0)  # penacho
    # alas: tres plumas por lado, cada una con su base pegada al torso
    for x in (-1, 1):
        for i, (dy, len_, rise) in enumerate(((0.0, 0.055, 0.013), (0.02, 0.045, 0.011), (0.045, 0.032, 0.009))):
            y0 = 0.004 + dy
            b.card([(x * 0.012, y0 - 0.004, 0.082), (x * 0.012, y0 + 0.008, 0.084),
                    (x * (0.014 + len_), y0 + 0.010, 0.084 + rise), (x * (0.014 + len_), y0 - 0.002, 0.082 + rise)],
                   ORO_CLARO if i % 2 else ORO)
        # pata corta con garra en gancho: del vientre a la losa
        b.tube((x * 0.010, 0.004, 0.032), (x * 0.016, -0.004, 0.012), 0.006, 0.005, OREJERA, sides=4)
        b.card([(x * 0.016, -0.004, 0.012), (x * 0.034, -0.026, 0.002), (x * 0.008, -0.030, 0.006)], OREJERA)
    b.card([(0, 0.02, 0.045), (-0.02, 0.055, 0.028), (0.02, 0.055, 0.028)], ORO)  # cola


# --------------------------------------------------------------- 4. caimán
def caiman(b):
    # reptando hacia -Y, hocico largo, lomo con dientes de escama, cola curvada
    b.tube((0, 0.02, 0.03), (0, -0.03, 0.028), 0.026, 0.018, ORO, sides=7)      # cuerpo
    b.tube((0, -0.03, 0.026), (0, -0.075, 0.020), 0.014, 0.007, ORO, sides=5)   # hocico
    b.tube((0, 0.045, 0.03), (0, 0.085, 0.05), 0.017, 0.006, ORO, sides=6)      # cola base
    b.tube((0, 0.085, 0.05), (0.012, 0.108, 0.068), 0.006, 0.002, ORO, sides=4)
    for k in range(4):  # escamas del lomo
        z = 0.052 - 0.004 * k
        b.card([(-0.014 + k * 0.002, 0.005 - 0.022 * k, z), (0.014 - k * 0.002, 0.005 - 0.022 * k, z),
                (0, 0.005 - 0.022 * k, z + 0.016)], OREJERA)
    for x in (-1, 1):
        grito(b, x * 0.014, -0.036, 0.042, 0.008)
        # pata corta en gancho
        b.tube((x * 0.022, -0.005, 0.022), (x * 0.038, -0.025, 0.008), 0.008, 0.005, ORO, sides=5)
    # fauces entreabiertas
    b.card([(0, -0.06, 0.016), (-0.012, -0.078, 0.020), (0.012, -0.078, 0.020)], ORO_CLARO)


# -------------------------------------------------------------- 5. tortuga
def tortuga(b):
    # caparazon bajo y ancho, cabeza asomada, aletas en cruz
    b.tube((0, 0, 0.02), (0, 0, 0.052), 0.055, 0.024, ORO, sides=8, flat=0.95)
    # patron del caparazon: discos pentagonales planos
    b.blob((0, 0, 0.058), (0.014, 0.014, 0.006), OREJERA, subdiv=0)
    for k in range(6):
        a = math.tau * k / 6
        b.blob((math.cos(a) * 0.03, math.sin(a) * 0.03, 0.052), (0.010, 0.010, 0.005), OREJERA, subdiv=0)
    b.tube((0, -0.05, 0.03), (0, -0.078, 0.042), 0.014, 0.009, ORO, sides=6)    # cuello
    b.blob((0, -0.086, 0.044), (0.012, 0.014, 0.010), ORO, subdiv=0)            # cabeza
    for x in (-1, 1):
        grito(b, x * 0.007, -0.094, 0.048, 0.005)
        b.card([(x * 0.04, 0.01, 0.012), (x * 0.075, 0.03, 0.004), (x * 0.06, -0.02, 0.006)], ORO_CLARO)  # aleta sup
        b.card([(x * 0.03, -0.03, 0.010), (x * 0.06, -0.055, 0.004), (x * 0.055, -0.015, 0.006)], ORO_CLARO)  # aleta inf
    b.card([(0, 0.055, 0.016), (-0.014, 0.075, 0.006), (0.014, 0.075, 0.006)], ORO)  # cola


# ----------------------------------------------------------- 6. murciélago
def murcielago(b):
    # el colgante clasista istmieno: cuerpo con cabeza de feliz, alas de uñas
    b.blob((0, 0, 0.05), (0.016, 0.02, 0.022), ORO, subdiv=1)                  # torso
    b.blob((0, -0.008, 0.082), (0.016, 0.014, 0.014), ORO, subdiv=0)           # cabeza
    for x in (-1, 1):
        grito(b, x * 0.008, -0.018, 0.086, 0.006)
        b.card([(x * 0.010, -0.004, 0.086), (x * 0.022, 0.0, 0.088), (x * 0.018, -0.006, 0.112)], OREJERA)  # oreja
        # ala de tres uñas membranosas
        b.card([(x * 0.014, 0.004, 0.062), (x * 0.072, 0.02, 0.082), (x * 0.066, -0.01, 0.038)], ORO_CLARO)
        b.tube((x * 0.014, 0.002, 0.06), (x * 0.074, 0.022, 0.084), 0.004, 0.002, ORO, sides=4)
        b.tube((x * 0.014, 0.0, 0.058), (x * 0.07, -0.012, 0.04), 0.004, 0.002, ORO, sides=4)
        # pie en gancho
        b.card([(x * 0.008, 0.006, 0.032), (x * 0.026, 0.02, 0.022), (x * 0.012, 0.02, 0.03)], OREJERA)
    # hocico de feliz con colmillo
    b.card([(0, -0.022, 0.074), (-0.006, -0.03, 0.07), (0.006, -0.03, 0.07)], ORO_CLARO)
    b.card([(0, -0.026, 0.07), (-0.003, -0.028, 0.062), (0.003, -0.028, 0.062)], OJO)


PIEZAS = [('rana', rana), ('jaguar', jaguar), ('aguilucho', aguilucho),
          ('caiman', caiman), ('tortuga', tortuga), ('murcielago', murcielago)]


def main():
    for nombre, build in PIEZAS:
        b = fg.Builder(f'huaca_{nombre}')
        build(b)
        obj = b.object(scene)
        # origen en el suelo: la pieza se desplaza baja hasta apoyar
        zmin = min(v.co.z for v in obj.data.vertices)
        for v in obj.data.vertices:
            v.co.z -= zmin
        parts.append(obj)
    fg.export('huacas_cocle.glb', scene, parts, materials=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender',
                                                       'huacas_cocle.blend'), copy=True)
    for obj in parts:
        tri = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        zmin = min((obj.matrix_world @ v.co).z for v in obj.data.vertices)
        print(f'{obj.name}: {tri} triangulos, apoyo z {zmin:.3f}')
        assert tri <= 300, f'{obj.name} fuera de presupuesto: {tri} triangulos'
    print(f'huacas_cocle: {len(parts)} piezas')


if __name__ == '__main__':
    main()
