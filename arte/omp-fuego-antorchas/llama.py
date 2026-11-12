# Prototipo aislado del fuego de antorchas (Prompt 2, 2026-11-12).
#   blender --background --python arte/omp-fuego-antorchas/llama.py
# Escribe SOLO en esta carpeta: no toca assets/ ni scripts/. Genera las cuatro
# piezas del fuego estilizado sobre el soporte existente d_antorcha:
#   d_llama        nucleo organico (conserva el nombre publico actual)
#   d_llama_halo   capsula mas alta y ancha, material aditivo aparte
#   d_llama_humo   dos tarjetas cruzadas, ascendente por transformacion
#   d_llama_chispa octaedro minimo que sube y se apaga
# La animacion (fase por antorcha, escala, inclinacion) vive en el parche de
# src/render/torchFlame.ts: el modelo es economico y quieto por si solo.
import importlib
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..', 'scripts', 'blender')))
import fg

importlib.reload(fg)

WORK = os.path.normpath(os.path.dirname(bpy.path.abspath(__file__)))
fg.MODELS = WORK
scene = fg.fresh_scene('FuegoAntorchas')  # primero: sin ventana, reset() borraría los materiales
WOOD = fg.material('Hierro_antorcha', (0.2, 0.15, 0.1))
FLAME = fg.material('Llama', (1, 0.6, 0.2), emit=(1, 0.55, 0.15), strength=3)
HALO = fg.material('Halo', (1, 0.45, 0.1), emit=(1, 0.4, 0.08), strength=2)
SMOKE = fg.material('Humo', (0.25, 0.24, 0.24))
parts = []


def B(x, y, z):
    # El exportador pasa y de Blender a -z de glTF; y = altura de juego.
    return (x, z, y)


def piece(name, mat, build):
    b = fg.Builder(name)
    build(b, mat)
    parts.append(b.object(scene))


def box(b, mat, x, y, z, w, h, d):
    b.box(B(x, y, z), (w, d, h), mat)


# Soporte igual que el publicado (d_antorcha): context0 para la lamina.
def build_bracket(b, m):
    box(b, m, 0, 0, 0, 0.08, 0.5, 0.08)
    box(b, m, 0, -0.2, 0, 0.14, 0.08, 0.14)
    b.tube(B(0, 0.18, 0), B(0, 0.34, 0), 0.05, 0.1, m, sides=6)


piece('d_antorcha', WOOD, build_bracket)


# Nucleo: lagrima torcida de 4 tramos con el eje desplazado en X/Z; la punta
# cae hacia delante (mirando +Y de juego = norte local), silueta organica,
# normales planas. ~64 triangulos.
def build_core(b, m):
    b.tube(B(0, -0.08, 0), B(0.012, 0.04, -0.008), 0.05, 0.115, m, sides=5)
    b.tube(B(0.012, 0.04, -0.008), B(0.04, 0.15, 0.012), 0.115, 0.052, m, sides=5)
    b.tube(B(0.04, 0.15, 0.012), B(0.028, 0.26, -0.006), 0.052, 0.016, m, sides=5)
    b.tube(B(0.028, 0.26, -0.006), B(0.045, 0.36, 0.004), 0.016, 0.001, m, sides=4)


piece('d_llama', FLAME, build_core)


# Halo: misma lagrima un 45 % mas gorda y mas alta; el material aditivo hace
# el borde suave sin texturas. ~50 triangulos.
def build_halo(b, m):
    b.tube(B(0, -0.1, 0), B(0.015, 0.06, -0.01), 0.07, 0.17, m, sides=5)
    b.tube(B(0.015, 0.06, -0.01), B(0.05, 0.18, 0.015), 0.17, 0.08, m, sides=5)
    b.tube(B(0.05, 0.18, 0.015), B(0.04, 0.34, 0), 0.08, 0.001, m, sides=5)


piece('d_llama_halo', HALO, build_halo)


# Humo: dos tarjetas cruzadas verticales sobre la punta. El parche las sube,
# agranda y oscurece en bucle (alfa global del material, no por instancia).
def card_pair(b, m):
    for yaw in (0, math.pi / 2):
        c, s = math.cos(yaw), math.sin(yaw)
        pts = [B(w * c, h, w * s) for w, h in ((-0.13, 0.28), (0.13, 0.28), (0.2, 0.95), (-0.2, 0.95))]
        b.card(pts, m)


piece('d_llama_humo', SMOKE, card_pair)


# Chispa: octaedro de 8 tri (dos piramides de base cuadrada en XZ).
def build_spark(b, m):
    r = 0.018
    ring = [B(r, 0, 0), B(0, 0, r), B(-r, 0, 0), B(0, 0, -r)]
    vs = [b.bm.verts.new(p) for p in ring]
    top = b.bm.verts.new(B(0, r * 1.6, 0))
    bot = b.bm.verts.new(B(0, -r * 1.6, 0))
    faces = []
    for i in range(4):
        faces.append(b.bm.faces.new((vs[i], vs[(i + 1) % 4], top)))
        faces.append(b.bm.faces.new((vs[(i + 1) % 4], vs[i], bot)))
    b._finish(vs + [top, bot], faces, m, None)


piece('d_llama_chispa', FLAME, build_spark)

fg.export('llama_fuego.glb', scene, parts, materials=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, 'llama_fuego.blend'))
print('presupuesto: nucleo+halo+humo+chispa, ver REPORTE.md')
