# Catalogo original y modular de utileria para caminos, fincas y senderos rurales.
# Clean-room: primitivas y materiales propios, sin assets externos, sin palabras,
# banderas, escudos ni simbolos culturales. Entrega aislada en work/omp-caminos-rurales/.
# Contrato: +Z arriba, metros, origen centrado en la huella y Z=0 en el apoyo;
# cercas y puentes ensamban en X sin huecos (extremos exactos, poste partido a la mitad).
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector, Matrix

try:
    HERE = Path(bpy.path.abspath(__file__)).parent
except NameError:
    HERE = Path(__file__).resolve().parent  # por MCP no existe __file__
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / 'scripts' / 'blender'))
import fg  # noqa: E402

OUT = HERE

scene = fg.fresh_scene('CaminosRurales')
parts = []

NAMES = [
    'camino_cerca_2m', 'camino_cerca_4m', 'camino_cerca_esquina', 'camino_cerca_rota',
    'camino_porton_cerrado', 'camino_porton_abierto', 'camino_poste_simple',
    'camino_letrero_doble', 'camino_mojon_piedra',
    'camino_puente_tablas_2m', 'camino_puente_tablas_4m', 'camino_alcantarilla_piedra',
    'camino_escalones_tierra', 'camino_banco_rustico', 'camino_abrevadero',
    'camino_carretilla', 'camino_pila_madera', 'camino_barrera_caida',
]
# Al repetir el script, las mallas de un intento fallido ocupan el nombre y
# Blender renombraria con sufijo .001.
for me in list(bpy.data.meshes):
    if me.name.split('.')[0] in NAMES:
        bpy.data.meshes.remove(me)
for ob in list(scene.collection.objects):
    if ob.name.split('.')[0] in NAMES:
        bpy.data.objects.remove(ob)


def mat(name, rgb, rough=0.9, metallic=0.0):
    return fg.material('camino_' + name, rgb, metallic=metallic, rough=rough)


# Paleta propia coherente con utileria.glb y naturaleza_suelo.glb.
MADERA = mat('madera', (0.38, 0.22, 0.11), rough=0.86)
MADERA_CLARA = mat('madera_clara', (0.61, 0.39, 0.19), rough=0.9)
MADERA_OSURA = mat('madera_oscura', (0.19, 0.105, 0.055), rough=0.82)
PIEDRA_CLARA = mat('piedra_clara', (0.52, 0.50, 0.44))
PIEDRA_OSURA = mat('piedra_oscura', (0.28, 0.28, 0.27))
CUERDA = mat('cuerda', (0.63, 0.47, 0.25), rough=1.0)
HIERRO = mat('hierro', (0.18, 0.19, 0.2), metallic=0.25, rough=0.48)
MUSGO = mat('musgo', (0.16, 0.30, 0.10), rough=1.0)
TIERRA = mat('tierra', (0.36, 0.25, 0.14), rough=1.0)
AGUA = mat('agua', (0.05, 0.44, 0.46), rough=0.3)


def add(name, build):
    b = fg.Builder(name)
    build(b)
    o = b.object(scene)
    footprint(o)
    parts.append(o)
    return o


def footprint(o):
    """Orig en el centro de la huella XY y apoyo exacto en z=0 (mueve la malla)."""
    cs = [o.matrix_world @ v.co for v in o.data.vertices]
    cx = (min(p.x for p in cs) + max(p.x for p in cs)) / 2
    cy = (min(p.y for p in cs) + max(p.y for p in cs)) / 2
    dz = min(p.z for p in cs)
    o.data.transform(Matrix.Translation((-cx, -cy, -dz)))


def box(b, c, s, m, rot=None):
    b.box(c, s, m, rot=rot)


def rbox(b, c, s, m, eul=(0, 0, 0)):
    """Caja con rotacion de Euler XYZ (fg.box solo gira alrededor de un eje)."""
    r = Matrix.Rotation(eul[0], 4, 'X') @ Matrix.Rotation(eul[1], 4, 'Y') @ Matrix.Rotation(eul[2], 4, 'Z')
    a = [Vector(c) + r @ Vector((dx * s[0] / 2, dy * s[1] / 2, -s[2] / 2)) for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    bb = [Vector(c) + r @ Vector((dx * s[0] / 2, dy * s[1] / 2, s[2] / 2)) for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    b.poly(a, bb, m)


def post(b, x, y, h, w=0.09, m=MADERA, top=None):
    """Palo vertical de seccion cuadrada; `top` anade remate piramidal (generico)."""
    b.box((x, y, h / 2), (w, w, h), m)
    if top:
        pyramid(b, (x, y, h, w / 2), top, m)


def pyramid(b, cbase, h, m):
    """Piramide cuadrangular de 4 tri + base, en (cx,cy,z) con semilado s."""
    cx, cy, cz, s = cbase
    a = [b.bm.verts.new((cx - s, cy - s, cz)), b.bm.verts.new((cx + s, cy - s, cz)),
         b.bm.verts.new((cx + s, cy + s, cz)), b.bm.verts.new((cx - s, cy + s, cz))]
    tip = b.bm.verts.new((cx, cy, cz + h))
    fs = [b.bm.faces.new((a[i], a[(i + 1) % 4], tip)) for i in range(4)]
    fs.append(b.bm.faces.new(a[::-1]))
    b._finish(a + [tip], fs, m, None)


# ---------------------------------------------------------------- cercas
# Modular en X: el tramo acaba en x=+-L/2 con MEDIA poste en cada extremo, de modo
# que dos tramos pegados forman un poste entero y la cerca no deja huecos.
RAIL_H = (0.42, 0.82)  # alturas de los dos listones


def rail_run(b, half, m=MADERA):
    """Dos listones horizontales de extremo a extremo (secciones cuadradas finas)."""
    for z in RAIL_H:
        b.box((0, 0, z), (half * 2, 0.05, 0.09), m)


def half_post(b, x, h=1.0, m=MADERA):
    """Mitad de poste que ocupa [x-0.045, x] (o espejo): al unir dos modulos con
    el borde en x=+-half sale un poste de 9 cm exacto y la huella cierra en half."""
    b.box((x - math.copysign(0.0225, x), 0, h / 2), (0.045, 0.09, h), m)


def add_fence(b, half, m=MADERA):
    for x in (-half, half):
        half_post(b, x, m=m)
    rail_run(b, half, m)


add('camino_cerca_2m', lambda b: add_fence(b, 1.0))
add('camino_cerca_4m', lambda b: (add_fence(b, 2.0), post(b, 0, 0, 1.05, 0.1, MADERA_OSURA)))


def cerca_esquina(b):
    """Esquina a 90: dos medios tramos de 1 m saliendo de un poste entero en el vertice.
    Modulos +X e +Y: cada brazo acaba en su borde con media poste para ensamblar."""
    b.box((0, 0, 0.5), (0.1, 0.1, 1.0), MADERA)          # poste entero en el vertice
    pyramid(b, (0, 0, 1.0, 0.05), 0.12, MADERA)          # remate
    for z in RAIL_H:                                      # brazo +X, solo del vertice al borde
        b.box((0.5, 0, z), (1.0, 0.05, 0.09), MADERA)
        b.box((0, 0.5, z), (0.05, 1.0, 0.09), MADERA)     # brazo +Y
    half_post(b, 1.0)                                     # cierre modulo X (media poste)
    b.box((0, 1.0, 0.5), (0.09, 0.045, 1.0), MADERA)   # cierre modulo Y [0.955,1.0]


add('camino_cerca_esquina', cerca_esquina)


def cerca_rota(b):
    """Tramo de 2 m reventado: un poste caido a medio enterrar y listones torcidos."""
    half_post(b, -1.0)
    b.box((1.0, 0, 0.32), (0.045, 0.09, 0.64), MADERA, rot=(math.radians(52), (0, 1, 0)))  # poste partido
    b.blob((1.02, 0, 0.05), (0.16, 0.16, 0.07), TIERRA, subdiv=1)                           # monticulo de tierra
    rbox(b, (-0.35, 0.02, 0.8), (1.3, 0.05, 0.09), MADERA, (0, math.radians(6), math.radians(4)))
    rbox(b, (-0.45, -0.03, 0.34), (1.1, 0.05, 0.09), MADERA_OSURA, (math.radians(-8), math.radians(14), 0))
    rbox(b, (0.85, 0.06, 0.12), (0.55, 0.05, 0.09), MADERA, (0, math.radians(-24), math.radians(16)))  # suelto en el suelo


add('camino_cerca_rota', cerca_rota)

# ---------------------------------------------------------------- portones
def gate_posts(b, half=1.0, h=1.35):
    for x in (-half, half):
        post(b, x, 0, h, 0.12, MADERA_OSURA, top=0.14)


# Las hojas se construyen con poly() rotado por matriz (b.box solo gira por un eje).
def slab(b, m, px, pz, w, h, thick=0.04, mat_=None):
    """Tabla rectangular transformada por la matriz m (marco de la hoja del porton)."""
    mm = mat_ or MADERA
    a = [m @ Vector((px + dx * w / 2, dy * thick / 2, pz + dz * h / 2))
         for dx, dy, dz in ((-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1))]
    bb = [m @ Vector((px + dx * w / 2, dy * thick / 2, pz + dz * h / 2))
          for dx, dy, dz in ((-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1))]
    b.poly(a, bb, mm)


def leaf(b, hinge_x, width, h0, h1, open_deg, mat_plank=MADERA):
    """Hoja abatida: bisagra en hinge_x, cierra hacia el centro (x=0) o se abre `open_deg`."""
    inward = -1 if hinge_x > 0 else 1
    ang = math.radians(open_deg) * inward
    m = Matrix.Translation((hinge_x, 0, 0)) @ Matrix.Rotation(ang, 4, 'Z')
    for i in range(4):
        px = (i + 0.5) * width / 4 * inward
        slab(b, m, px, (h0 + h1) / 2, width / 4.2, h1 - h0 - 0.02, mat_=mat_plank)
    for pz in (h0 + 0.06, h1 - 0.06):
        slab(b, m, width / 2 * inward, pz, width, 0.07, thick=0.05, mat_=MADERA_OSURA)
    return m


def pestillo(b, m):
    slab(b, m, 0.0, 0.72, 0.34, 0.06, thick=0.05, mat_=HIERRO)
    b.tube((0, 0.04, 0.72), (0, 0.1, 0.72), 0.02, 0.02, HIERRO, sides=6)


add('camino_porton_cerrado', lambda b: (
    gate_posts(b),
    leaf(b, -1.0, 1.0, 0.12, 1.18, 0),
    leaf(b, 1.0, 1.0, 0.12, 1.18, 0),
    pestillo(b, Matrix.Translation((0, 0, 0))),
))


def porton_abierto(b):
    gate_posts(b)
    leaf(b, -1.0, 1.0, 0.12, 1.18, 105)
    leaf(b, 1.0, 1.0, 0.12, 1.18, 105)


add('camino_porton_abierto', porton_abierto)

# ---------------------------------------------------------------- postes y senales
def poste_simple(b):
    post(b, 0, 0, 1.5, 0.1, MADERA, top=0.16)
    b.tube((0, 0, 1.35), (0, 0, 1.42), 0.065, 0.065, CUERDA, sides=6)  # rosca colgada del poste
    b.box((0, 0, 0.06), (0.34, 0.34, 0.06), PIEDRA_OSURA)  # base


add('camino_poste_simple', poste_simple)


def letrero_doble(b):
    """Poste con dos tablones apuntando a lados opuestos, superficies completamente en blanco."""
    post(b, 0, 0, 2.2, 0.11, MADERA_OSURA, top=0.14)
    b.box((0, 0, 0.07), (0.4, 0.4, 0.07), PIEDRA_OSURA)     # base de piedra
    for y, tip, mm, tilt in ((0.14, 1.0, MADERA_CLARA, 9), (-0.14, -1.0, MADERA, -7)):
        cx = tip * 0.62
        zc = 1.9 if y > 0 else 1.45
        # tablon en lanzeta: rectangulo con punta en el extremo exterior, inclinado
        a = [Vector((0, y - 0.02, zc - 0.16)), Vector((cx - 0.18 * tip, y - 0.02, zc - 0.16)),
             Vector((cx - 0.18 * tip, y - 0.02, zc - 0.075)), Vector((cx, y - 0.02, zc)),
             Vector((cx - 0.18 * tip, y - 0.02, zc + 0.075)), Vector((cx - 0.18 * tip, y - 0.02, zc + 0.16)),
             Vector((0, y - 0.02, zc + 0.16))]
        bb = [Vector((p.x, y + 0.02, p.z)) for p in a]
        r = Matrix.Rotation(math.radians(tilt), 4, 'Y')
        pivot = Vector((0, 0, zc))
        a = [r @ (p - pivot) + pivot for p in a]
        bb = [r @ (p - pivot) + pivot for p in bb]
        b.poly(a, bb, mm)
        for dz in (-0.11, 0.11):  # clavijas atravesando el tablon junto al poste
            b.tube((0.02, y - 0.02, zc + dz), (0.02, y + 0.02, zc + dz), 0.014, 0.014, HIERRO, sides=6)


add('camino_letrero_doble', letrero_doble)


def mojon(b):
    """Mojon de piedra: base ancha y tres bloques apilados que se estrechan."""
    b.box((0, 0, 0.07), (0.55, 0.55, 0.14), PIEDRA_OSURA)
    levels = ((0.42, 0.4, 0.28), (0.34, 0.38, 0.42), (0.24, 0.35, 0.52))
    prev_z = 0.14
    for i, (s, x, zc) in enumerate(levels):
        b.poly([(-s, -s * 0.9, prev_z), (s, -s, prev_z), (s * 0.9, s, prev_z), (-s, s * 0.9, prev_z)],
               [(x * 0.5, x * 0.5, zc), (x, 0, zc - 0.02), (x * 0.4, -x * 0.5, zc - 0.01), (-x * 0.6, -x * 0.3, zc)],
               PIEDRA_CLARA if i % 2 == 0 else PIEDRA_OSURA)
        prev_z = zc - 0.01
    b.blob((-0.18, 0.2, 0.05), (0.12, 0.12, 0.05), MUSGO, subdiv=1)


add('camino_mojon_piedra', mojon)

# ---------------------------------------------------------------- puentes y paso de agua
def bridge(b, half, rails=True):
    """Tablero a lo largo de X, extremos enrasados en x=+-half para ensamblar sin huecos."""
    deck_y, beam_w = 0.46, 0.06
    n = max(5, int(half * 2 / 0.42))
    for i in range(n):
        px = -half + (i + 0.5) * (2 * half) / n
        b.box((px, 0, 0.14), (2 * half / n * 0.9, deck_y * 2, 0.045), MADERA if i % 2 else MADERA_CLARA)
    for y in (-deck_y + 0.03, deck_y - 0.03):
        b.box((0, y, 0.085), (2 * half, 0.07, 0.07), MADERA_OSURA)     # traves laterales, enrasadas
    if rails:
        for x in (-half + 0.15, 0, half - 0.15):
            for y in (-deck_y + 0.03, deck_y - 0.03):
                b.box((x, y, 0.42), (0.06, 0.06, 0.55), MADERA)
        for y in (-deck_y + 0.03, deck_y - 0.03):
            b.box((0, y, 0.66), (2 * half, 0.05, 0.06), MADERA_OSURA)


add('camino_puente_tablas_2m', lambda b: bridge(b, 1.0, rails=False))
add('camino_puente_tablas_4m', lambda b: bridge(b, 2.0, rails=True))


def alcantarilla(b):
    """Culvert de piedra: cajon de losas con arco de medio punto hacia -Y y tierra encima."""
    # alas laterales en X
    for x in (-0.75, 0.75):
        b.box((x, 0, 0.25), (0.18, 1.2, 0.5), PIEDRA_OSURA)
    # losas de cubierta (pasables)
    for i in range(4):
        py = -0.45 + i * 0.3
        b.box((0, py, 0.525), (1.68, 0.28, 0.055), PIEDRA_CLARA)
    # arco frontal y trasero: medio anillo de losas
    for front in (-0.6, 0.6):
        for i in range(5):
            t0 = math.pi * i / 5
            t1 = math.pi * (i + 1) / 5
            a = [Vector((math.cos(t0) * 0.34, front, 0.02 + math.sin(t0) * 0.34)),
                 Vector((math.cos(t1) * 0.34, front, 0.02 + math.sin(t1) * 0.34)),
                 Vector((math.cos(t1) * 0.5, front, 0.02 + math.sin(t1) * 0.5)),
                 Vector((math.cos(t0) * 0.5, front, 0.02 + math.sin(t0) * 0.5))]
            bb = [(p.x, p.y + 0.12, p.z) for p in a]
            b.poly(a, bb, PIEDRA_CLARA if i in (0, 4) else PIEDRA_OSURA)
    b.box((0, 0, 0.012), (0.7, 1.08, 0.024), PIEDRA_OSURA)  # fondo oscuro del conducto
    b.blob((0.25, 0.1, 0.56), (0.5, 0.4, 0.05), TIERRA, subdiv=1)
    b.blob((-0.35, -0.2, 0.56), (0.4, 0.35, 0.045), TIERRA, subdiv=1)


add('camino_alcantarilla_piedra', alcantarilla)

# ---------------------------------------------------------------- sendero y descanso
def escalones(b):
    """Tres peldanos de tierra con bordes de piedra; sube hacia +X."""
    for i in range(3):
        z = (i + 1) * 0.17
        b.box((-0.5 + i * 0.5, 0, z / 2), (0.55, 1.1 - i * 0.15, z), TIERRA)
        b.box((-0.24 + i * 0.5, 0, z + 0.02), (0.07, 1.1 - i * 0.15, 0.045), PIEDRA_CLARA)
    # laterales de piedra suelta
    for y in (-0.62, 0.62):
        for i, s in enumerate((0.16, 0.13, 0.11)):
            b.blob((-0.5 + i * 0.5, y, 0.14 + i * 0.15), (s, s * 0.8, s * 0.6), PIEDRA_OSURA, subdiv=1)


add('camino_escalones_tierra', escalones)


def banco(b):
    """Banco rustico: media canoa de tronco sobre dos caballetes de piedra."""
    b.poly([(-0.7, -0.19, 0.46), (0.7, -0.19, 0.46), (0.7, 0, 0.46), (-0.7, 0, 0.46)],
           [(-0.7, -0.14, 0.52), (0.7, -0.14, 0.52), (0.7, 0.06, 0.52), (-0.7, 0.06, 0.52)], MADERA)
    b.box((0, -0.065, 0.44), (1.4, 0.26, 0.05), MADERA_CLARA)  # tapa
    for x in (-0.5, 0.5):
        b.poly([(x - 0.14, -0.12, 0), (x + 0.16, -0.1, 0), (x + 0.12, 0.12, 0), (x - 0.12, 0.14, 0)],
               [(x - 0.07, -0.06, 0.44), (x + 0.08, -0.05, 0.44), (x + 0.06, 0.06, 0.44), (x - 0.05, 0.07, 0.44)], PIEDRA_OSURA)
    b.box((0, 0, 0.2), (0.8, 0.05, 0.05), MADERA_OSURA)  # travesano


add('camino_banco_rustico', banco)


def abrevadero(b):
    """Pila de piedra con agua y brocal; lado de bebeidero rebajado."""
    for i, (sx, sy, h) in enumerate(((0.95, 0.09, 0.36), (0.95, 0.09, 0.36), (0.09, 0.76, 0.36), (0.09, 0.76, 0.24))):
        px, py = (0, -0.425) if i == 0 else (0, 0.425) if i == 1 else (-0.475, 0) if i == 2 else (0.475, 0)
        b.box((px, py, h / 2), (sx, sy, h), PIEDRA_CLARA if i != 3 else PIEDRA_OSURA)
    b.box((0, 0, 0.03), (0.94, 0.84, 0.06), PIEDRA_OSURA)         # fondo
    b.box((0, 0, 0.19), (0.82, 0.72, 0.015), AGUA)                 # nivel del agua
    for px, py in ((0.5, -0.45), (-0.5, -0.45), (0.5, 0.45), (-0.5, 0.45)):
        b.box((px, py, 0.05), (0.14, 0.14, 0.1), PIEDRA_OSURA)     # pies
    b.blob((-0.2, -0.5, 0.03), (0.2, 0.12, 0.03), TIERRA, subdiv=1)


add('camino_abrevadero', abrevadero)

# ---------------------------------------------------------------- aperos de finca
def carretilla(b):
    """Carretilla de mano de madera: caja, dos ruedas laterales y mangos."""
    b.box((0, 0, 0.34), (0.62, 0.42, 0.24), MADERA)                # caja
    b.box((0, 0, 0.47), (0.66, 0.46, 0.03), MADERA_CLARA)          # brocal
    b.box((0, 0, 0.16), (0.5, 0.36, 0.06), MADERA_OSURA)           # chasis
    for y in (-0.26, 0.26):                                        # ruedas de disco con buje
        b.tube((0, y - 0.035, 0.17), (0, y + 0.035, 0.17), 0.17, 0.17, MADERA_OSURA, sides=8)
        b.tube((0, y - 0.05, 0.17), (0, y + 0.05, 0.17), 0.05, 0.05, HIERRO, sides=6)
    for sy in (-1, 1):                                             # mangos
        rbox(b, (0.52, sy * 0.16, 0.5), (0.42, 0.05, 0.05), MADERA, (0, math.radians(-28), 0))
    b.blob((0, 0, 0.52), (0.26, 0.17, 0.09), TIERRA, subdiv=1)     # monticulo de tierra visible sobre el brocal


add('camino_carretilla', carretilla)


def pila_madera(b):
    """Pila de agua de duvas octogonales con aro, dos pilaretes y polea."""
    r_in, r_out, h = 0.34, 0.42, 0.55
    a = [(r_in * math.cos(2 * math.pi * i / 8 + math.pi / 8), r_in * math.sin(2 * math.pi * i / 8 + math.pi / 8), 0.14) for i in range(8)]
    bb = [(r_out * math.cos(2 * math.pi * i / 8 + math.pi / 8), r_out * math.sin(2 * math.pi * i / 8 + math.pi / 8), h) for i in range(8)]
    b.poly(bb, a, MADERA)
    b.box((0, 0, 0.12), (0.7, 0.7, 0.06), PIEDRA_OSURA)            # base de piedra
    b.box((0, 0, 0.5), (0.72, 0.72, 0.05), MADERA_OSURA)           # aro superior
    b.box((0, 0, 0.32), (0.74, 0.74, 0.04), HIERRO)                # banda metalica
    b.box((0, 0, 0.44), (0.6, 0.6, 0.015), AGUA)                   # espejo de agua bajo el brocal
    for x in (-0.46, 0.46):
        post(b, x, 0, 0.95, 0.07, MADERA_OSURA)
    b.box((0, 0, 0.97), (1.05, 0.07, 0.07), MADERA_OSURA)          # travesano
    b.tube((0.1, -0.045, 0.97), (0.1, 0.045, 0.97), 0.055, 0.055, MADERA_CLARA, sides=7)  # polea (eje en Y)
    b.tube((0.1, 0, 0.94), (0.06, 0, 0.6), 0.008, 0.008, CUERDA, sides=4)                 # cuerda hasta el cubo
    b.poly([(0.02, -0.06, 0.44), (0.1, -0.08, 0.44), (0.18, -0.06, 0.44), (0.18, 0.06, 0.44), (0.1, 0.08, 0.44), (0.02, 0.06, 0.44)],
           [(0.03, -0.05, 0.6), (0.1, -0.07, 0.6), (0.17, -0.05, 0.6), (0.17, 0.05, 0.6), (0.1, 0.07, 0.6), (0.03, 0.05, 0.6)], MADERA_CLARA)  # cubo


add('camino_pila_madera', pila_madera)


def barrera_caida(b):
    """Barrera de paso reventada: dos postes cortos y el palo a rayas caido en diagonal."""
    for x in (-0.7, 0.7):
        b.box((x, 0.05, 0.26), (0.1, 0.1, 0.52), MADERA_OSURA)
        b.tube((x, 0.05, 0.52), (x, 0.05, 0.58), 0.06, 0.05, MADERA_OSURA, sides=6)
    # el palo, con franjas alternativas de dos maderas (sin simbolos), tumbado y torcido
    m = Matrix.Translation((0, -0.18, 0.07)) @ Matrix.Rotation(math.radians(-64), 4, 'X') @ Matrix.Rotation(math.radians(18), 4, 'Z')
    for i in range(7):
        px = (i - 3) * 0.24
        slab(b, m, px, 0.0, 0.24, 0.12, thick=0.1, mat_=MADERA_CLARA if i % 2 else MADERA_OSURA)
    b.blob((-0.6, -0.5, 0.02), (0.16, 0.16, 0.05), TIERRA, subdiv=1)


add('camino_barrera_caida', barrera_caida)

# ---------------------------------------------------------------- salida
def tri_count(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


missing = [n for n in NAMES if n not in {o.name for o in parts}]
assert not missing, f'faltan: {missing}'

total = 0
for o in parts:
    t = tri_count(o)
    total += t
    assert t <= 600, f'{o.name}: {t} triangulos (limite 600)'
assert total < 7000, f'catalogo completo: {total} triangulos'
print('total triangulos:', total)
for o in parts:
    print(f'{o.name}: {tri_count(o)}')

blend_out = str(OUT / 'caminos_rurales.glb')
for ob in bpy.data.objects:
    ob.select_set(False)
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.export_scene.gltf(filepath=blend_out, export_format='GLB', use_selection=True, export_apply=True)
print(f'exportado {blend_out} ({os.path.getsize(blend_out)} bytes)')

blend = str(OUT / 'caminos_rurales.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend, copy=True)
print('blend:', blend)
print('caminos_rurales: OK', len(parts), 'nodos')
