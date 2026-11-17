# Validador del contrato de montaje de antorchas contra pared (O9, 2026-11-17).
#   blender --background --python scripts/blender/validar_antorchas.py -- <glb>
# Sin argumento revisa el publicado; el candidato de O9 pasa con:
#   ... -- work/omp-cripta-antorchas-montaje/mazmorra.glb
#
# Contrato (work/omp-cripta-antorchas-montaje/REPORTE.md):
#   * Marco comun de las 5 piezas (d_antorcha, d_llama, d_llama_halo,
#     d_llama_humo, d_llama_chispa): origen = punto de contacto con la pared,
#     +X = frente hacia la sala, Z arriba.
#   * Penetracion de pared = 0: ningun vertice en x < 0, soportando la matriz
#     estatica (muro solido detras de x=0).
#   * Margen frontal de la llama >= 5 cm con la PEOR animacion que aplica hoy
#     src/render/torchFlame.ts: nucleo yaw ±0,28 / roll ±0,22 / escala minima
#     0,94; halo roll ±0,18 / escala minima 1,02. (Humo y chispa: ver REPORTE;
#     el validador exige aqui su margen estatico >= 5 cm.)
#   * Altura coherente: la boca de llama (base del nucleo) cae dentro de la
#     copa del soporte cuando el runtime apila bracket en torchY y fuego en
#     torchY+0,36.
#   * Nombres publicos sin cambios y origenes de nodo en (0,0,0).
import os
import sys
import math

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLISHED = os.path.abspath(os.path.join(HERE, '..', '..', 'assets', 'models', 'mazmorra.glb'))
src = os.path.abspath(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else PUBLISHED

PIEZAS = ['d_antorcha', 'd_llama', 'd_llama_halo', 'd_llama_humo', 'd_llama_chispa']
# Como se anima cada capa en torchFlame.ts: (yaw_rad, roll_rad, escala_min)
ANIM = {
    'd_antorcha': (0.0, 0.0, 1.0),
    'd_llama': (0.28, 0.22, 0.94),
    'd_llama_halo': (0.0, 0.18, 1.02),
    'd_llama_humo': (0.0, 0.2, 1.0),    # yaw completo en vida: se mide estatico
    'd_llama_chispa': (0.0, 2.0, 1.0),
}
MARGEN_MIN = 0.05
errs = []


def fail(msg):
    errs.append(msg)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
by = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}

# 1) nombres publicos y origenes estables
for n in PIEZAS:
    if n not in by:
        fail(f'falta {n}')
for n, o in by.items():
    if n in PIEZAS and max(abs(v) for v in o.location) > 1e-4:
        fail(f'{n}: el origen del nodo no esta en (0,0,0) sino en {tuple(o.location)}')
if errs:
    print('FALLO:\n  ' + '\n  '.join(errs))
    sys.exit(1)

# glTF->Blender tras el import: x = frontal del juego, z = altura del juego.
def pts(o):
    return [o.matrix_world @ v.co for v in o.data.vertices]


# 2) penetracion estatica = 0 (x >= 0 para las 5 piezas)
static_min = {}
for n in PIEZAS:
    m = min(p.x for p in pts(by[n]))
    static_min[n] = m
    if m < -1e-6:
        fail(f'{n}: penetra el muro {abs(m) * 100:.1f} cm (x_min={m:+.3f})')

# 3) margen frontal con la peor animacion. Rotaciones de Babylon: yaw sobre el
# eje vertical (z de Blender) y roll sobre el eje de mirlo (y de Blender). El
# minimo de x' = s*(x*cos r - z*?)... se barre por angulos: preciso y barato.
def worst_anim_x(o, yaw, roll, smin):
    vs = [(p.x, p.y, p.z) for p in pts(o)]  # z = altura rel. al ancla de capa
    best = float('inf')
    yaws = [k * math.pi / 8 for k in range(16)] if n_humo(o) else ([-yaw, 0, yaw] if yaw else [0])
    for r in [-roll, 0, roll]:
        # roll sobre Y de Blender: mezcla x con z(altura)
        for y in yaws:
            for (x, yy, z) in vs:
                xr = x * math.cos(r) - z * math.sin(r)   # inclina la lengua de fuego
                yr = x * math.sin(r) + z * math.cos(r)
                xf = xr * math.cos(y) - yy * math.sin(y)
                best = min(best, smin * xf)
    return best


def n_humo(o):
    return o.name in ('d_llama_humo', 'd_llama_chispa')


for n in ('d_llama', 'd_llama_halo'):
    w = worst_anim_x(by[n], *ANIM[n])
    if w < MARGEN_MIN:
        fail(f'{n}: margen frontal animado {w * 100:.1f} cm < {MARGEN_MIN * 100:.0f} cm')
    print(f'{n:14s} margen animado {w * 100:+.1f} cm')
for n in ('d_llama_humo', 'd_llama_chispa'):
    if static_min[n] < MARGEN_MIN:
        fail(f'{n}: margen estatico {static_min[n] * 100:.1f} cm < {MARGEN_MIN * 100:.0f} cm (con yaw completo del runtime queda detras del plano)')

# 4) altura coherente: copa del soporte y boca de la llama.
#    Runtime: bracket en (wall, torchY), capas de fuego en (wall, torchY+0,36).
#    Borde superior de la copa y base del nucleo, en altura local:
copa = max(p.z for p in pts(by['d_antorcha']))
nucleo = min(p.z for p in pts(by['d_llama'])) + 0.36  # + salto del runtime
if not (0.0 <= nucleo - copa <= 0.08):
    fail(f'llama desalineada: boca {nucleo:+.3f} vs copa {copa:+.3f} (debe quedar 0..8 cm por encima)')
print(f'copa {copa:.3f} / boca llama {nucleo:.3f} (relativas al anclaje)')

# 5) el anclaje esta a altura de pared coherente con el muro: torchY=1,98 +
#    placa (z local ±0,15): 1,83..2,13 dentro de la pared de 3,2; punta llama
#    1,98+0,36+0,62=2,96 < 3,2 del techo.
punta = 1.98 + 0.36 + max(p.z for p in pts(by['d_llama'])) + 0.05  # 5 % estirado max
if punta >= 3.2:
    fail(f'punta de llama {punta:.2f} toca el techo 3,2')
print(f'punta de llama animada a {punta:.2f} m (techo 3,2)')

if errs:
    print('FALLO:\n  ' + '\n  '.join(errs))
    sys.exit(1)
tris = {n: sum(len(p.vertices) - 2 for p in by[n].data.polygons) for n in PIEZAS}
print('ANTORCHAS VALIDAS', tris)
