# Catalogo original de escenario costero: playas, costas rocosas, esteros y
# bordes de manglar. Formas fantasticas genericas: no representan una playa,
# especie o comunidad concreta. Entrega aislada en work/omp-costa-modular/.
# Clean-room: primitivas y materiales propios, sin assets externos, sin animales,
# basura moderna, barcos, banderas, texto ni simbolos.
# Contrato: +Z arriba, metros, origen en el centro de la huella y apoyo en z=0;
# piezas 14-18 muy pegadas al suelo (decoracion no bloqueante); <=450 tris/nodo,
# <=6000 total, seis materiales, sin texturas.
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

scene = fg.fresh_scene('CostaModular')
parts = []

NAMES = [
    'costa_roca_baja_pequena', 'costa_roca_baja_mediana', 'costa_roca_baja_grande',
    'costa_roca_erosionada', 'costa_roca_con_hendidura', 'costa_grupo_rocoso',
    'costa_madera_arrasta', 'costa_madera_arrastre_curva', 'costa_madera_arrastre_raices',
    'costa_raices_bajas', 'costa_raices_entrelazadas', 'costa_monticulo_arena',
    'costa_borde_poza', 'costa_huellas_olas', 'costa_mata_duna_pequena',
    'costa_mata_duna_grande', 'costa_conchas_grupo', 'costa_restos_ramas',
]
# Al repetir el script, las mallas de un intento fallido ocupan el nombre y
# Blender renombraria con sufijo .001.
for me in list(bpy.data.meshes):
    if me.name.split('.')[0] in NAMES:
        bpy.data.meshes.remove(me)
for ob in list(scene.collection.objects):
    if ob.name.split('.')[0] in NAMES:
        bpy.data.objects.remove(ob)
for m in list(bpy.data.materials):
    if m.name.startswith('costa_'):
        bpy.data.materials.remove(m)


def mat(name, rgb, rough=0.9, metallic=0.0):
    return fg.material('costa_' + name, rgb, metallic=metallic, rough=rough)


# Paleta propia coherente con naturaleza_suelo.glb y detalle_suelo.glb.
ARENA = mat('arena', (0.62, 0.50, 0.32), rough=1.0)
PIEDRA_CLARA = mat('piedra_clara', (0.55, 0.53, 0.47))
PIEDRA_OSURA = mat('piedra_oscura', (0.26, 0.26, 0.25), rough=0.85)
MADERA = mat('madera', (0.55, 0.47, 0.36), rough=0.95)   # madera de arrastre blanqueada por el sol
RAIZ = mat('raiz', (0.24, 0.15, 0.09), rough=0.9)         # raiz aerea humeda, cacao oscuro
CONCHA = mat('concha', (0.83, 0.76, 0.66), rough=0.6)     # crema de concha generico


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


def rbox(b, c, s, m, eul=(0, 0, 0)):
    """Caja con rotacion de Euler XYZ (fg.box solo gira alrededor de un eje)."""
    r = Matrix.Rotation(eul[0], 4, 'X') @ Matrix.Rotation(eul[1], 4, 'Y') @ Matrix.Rotation(eul[2], 4, 'Z')
    a = [Vector(c) + r @ Vector((dx * s[0] / 2, dy * s[1] / 2, -s[2] / 2)) for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    bb = [Vector(c) + r @ Vector((dx * s[0] / 2, dy * s[1] / 2, s[2] / 2)) for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    b.poly(a, bb, m)


def slab(b, c, s, m, n=6, eul=(0, 0, 0)):
    """Laja poligonal regular (n lados) achatada: muro + dos tapas, orientable."""
    r = Matrix.Rotation(eul[0], 4, 'X') @ Matrix.Rotation(eul[1], 4, 'Y') @ Matrix.Rotation(eul[2], 4, 'Z')
    a, bb = [], []
    for i in range(n):
        t = 2 * math.pi * i / n
        pxy = Vector((s[0] * math.cos(t), s[1] * math.sin(t), 0))
        a.append(Vector(c) + r @ (pxy - Vector((0, 0, s[2] / 2))))
        bb.append(Vector(c) + r @ (pxy + Vector((0, 0, s[2] / 2))))
    b.poly(a, bb, m)


def rock(b, c, s, m, subdiv=1, eul=(0, 0, 0)):
    """Roca facetada: icosaedro achatado y girado (silueta distinta por rotacion)."""
    r = Matrix.Rotation(eul[0], 4, 'X') @ Matrix.Rotation(eul[1], 4, 'Y') @ Matrix.Rotation(eul[2], 4, 'Z')
    mm = Matrix.Translation(c) @ r @ Matrix.Diagonal((*s, 1))
    res = __import__('bmesh').ops.create_icosphere(b.bm, subdivisions=subdiv, radius=1, matrix=mm)
    vs = res['verts']
    fs = list({f for v in vs for f in v.link_faces})
    b._finish(vs, fs, m, None)


# ---------------------------------------------------------------- rocas (1-6)
def roca_baja_pequena(b):
    """Roca baja redondeada con un guijarro al lado; talla pequena."""
    rock(b, (0, 0, 0.12), (0.28, 0.24, 0.14), PIEDRA_CLARA, subdiv=1, eul=(0.3, 0.2, 0.5))
    rock(b, (0.2, -0.12, 0.05), (0.1, 0.09, 0.06), PIEDRA_OSURA, subdiv=0)


add('costa_roca_baja_pequena', roca_baja_pequena)


def roca_baja_mediana(b):
    """Dorsal doble: dos lomos unidos mas bajos que anchos (silueta gemela)."""
    rock(b, (-0.28, 0.05, 0.2), (0.42, 0.36, 0.22), PIEDRA_OSURA, subdiv=1, eul=(0.5, -0.3, 0.2))
    rock(b, (0.3, -0.05, 0.16), (0.38, 0.34, 0.18), PIEDRA_OSURA, subdiv=1, eul=(-0.4, 0.6, 1.1))
    rock(b, (0.0, 0.02, 0.06), (0.5, 0.3, 0.06), PIEDRA_CLARA, subdiv=0)


add('costa_roca_baja_mediana', roca_baja_mediana)


def roca_baja_grande(b):
    """Laja grande escalonada: roca ancha achatada con segundo piso menor girado."""
    rock(b, (0, 0, 0.16), (0.95, 0.72, 0.18), PIEDRA_CLARA, subdiv=1, eul=(0.25, 0.15, 0.4))
    rock(b, (-0.16, 0.08, 0.36), (0.48, 0.38, 0.14), PIEDRA_CLARA, subdiv=1, eul=(-0.3, 0.4, 1.1))
    rock(b, (0.48, -0.26, 0.08), (0.22, 0.18, 0.09), PIEDRA_OSURA, subdiv=0, eul=(0.6, 0.2, 0))


add('costa_roca_baja_grande', roca_baja_grande)


def roca_erosionada(b):
    """Roca socavada por el oleaje: pie estrecho y corona ancha (hongo bajo)."""
    rock(b, (0, 0, 0.26), (0.24, 0.21, 0.28), PIEDRA_OSURA, subdiv=1, eul=(0.4, 0.3, 0.7))  # pie erosionado
    rock(b, (0.02, 0, 0.56), (0.52, 0.46, 0.16), PIEDRA_CLARA, subdiv=1, eul=(0.2, 0.5, 0.9))  # sombrero
    rock(b, (-0.3, 0.22, 0.04), (0.16, 0.14, 0.06), PIEDRA_OSURA, subdiv=0, eul=(0.3, 0.6, 0))  # cascajo caido


add('costa_roca_erosionada', roca_erosionada)


def roca_con_hendidura(b):
    """Roca partida: dos bloques con grieta oscura visible entre ambos."""
    rock(b, (-0.34, 0, 0.24), (0.5, 0.42, 0.28), PIEDRA_CLARA, subdiv=1, eul=(0.4, -0.2, 0.6))
    rock(b, (0.36, 0.02, 0.22), (0.46, 0.4, 0.26), PIEDRA_CLARA, subdiv=1, eul=(-0.3, 0.5, 1.3))
    rbox(b, (0.01, 0.0, 0.14), (0.16, 0.34, 0.2), PIEDRA_OSURA, (0, math.radians(4), math.radians(6)))


add('costa_roca_con_hendidura', roca_con_hendidura)


def grupo_rocoso(b):
    """Grupo de cuatro rocas de tallas distintas apretadas (silueta irregular)."""
    rock(b, (-0.35, -0.15, 0.22), (0.5, 0.44, 0.26), PIEDRA_OSURA, subdiv=1, eul=(0.3, 0.4, 0.2))
    rock(b, (0.25, -0.2, 0.14), (0.36, 0.3, 0.16), PIEDRA_CLARA, subdiv=1, eul=(-0.5, 0.2, 1.0))
    rock(b, (0.1, 0.3, 0.3), (0.3, 0.28, 0.32), PIEDRA_OSURA, subdiv=1, eul=(0.6, -0.4, 0.4))
    rock(b, (-0.15, 0.05, 0.05), (0.2, 0.16, 0.08), PIEDRA_CLARA, subdiv=0)


add('costa_grupo_rocoso', grupo_rocoso)

# ---------------------------------------------------------------- madera de arrastre (7-9)
def madera_arrasta(b):
    """Tronco arrastrado recto: cilindro grueso tumbado con un cabo roto arriba."""
    b.tube((-0.8, 0, 0.14), (0.72, 0.06, 0.16), 0.15, 0.12, MADERA, sides=7)
    b.tube((0.72, 0.06, 0.16), (0.92, 0.02, 0.1), 0.12, 0.05, MADERA, sides=6)   # punta desgastada
    b.tube((-0.1, 0.02, 0.26), (0.25, -0.14, 0.42), 0.05, 0.02, MADERA, sides=5)  # rama rota


add('costa_madera_arrasta', madera_arrasta)


def madera_arrastre_curva(b):
    """Madero curvo en arco: tres segmentos con quiebre leido, apoyo en los extremos."""
    b.tube((-0.75, 0, 0.08), (-0.25, 0.05, 0.24), 0.09, 0.1, MADERA, sides=6)
    b.tube((-0.25, 0.05, 0.24), (0.3, 0.0, 0.26), 0.1, 0.09, MADERA, sides=6)
    b.tube((0.3, 0.0, 0.26), (0.78, -0.06, 0.07), 0.09, 0.04, MADERA, sides=6)
    rock(b, (-0.72, 0.02, 0.03), (0.14, 0.12, 0.05), PIEDRA_OSURA, subdiv=0)


add('costa_madera_arrastre_curva', madera_arrastre_curva)


def madera_arrastre_raices(b):
    """Trozo de arbol arrancado: patron con pan de raices de tres dedos cortos."""
    b.tube((-0.55, 0.1, 0.13), (0.5, -0.05, 0.15), 0.12, 0.08, MADERA, sides=7)
    rock(b, (-0.6, 0.08, 0.1), (0.2, 0.22, 0.12), RAIZ, subdiv=0)   # nudo del pan
    for (tx, ty, tz) in ((-0.85, -0.15, 0.03), (-0.8, 0.35, 0.04), (-0.5, -0.32, 0.03)):
        b.tube((-0.62, 0.08, 0.08), (tx, ty, tz), 0.05, 0.015, RAIZ, sides=5)


add('costa_madera_arrastre_raices', madera_arrastre_raices)

# ---------------------------------------------------------------- raices de manglar (10-11)
def raices_bajas(b):
    """Zarpa baja: cuatro raices finas que serpentean sobre la arena."""
    rock(b, (0.25, 0, 0.1), (0.2, 0.18, 0.1), RAIZ, subdiv=0)
    for (ty, lift) in ((-0.35, 0.06), (0.32, 0.07), (-0.05, 0.045)):
        b.tube((0.25, 0, 0.08), (-0.1, ty, lift), 0.045, 0.02, RAIZ, sides=5)
        b.tube((-0.1, ty, lift), (-0.5, ty * 1.5, 0.02), 0.02, 0.012, RAIZ, sides=5)
    b.tube((0.2, 0.02, 0.16), (0.05, -0.02, 0.3), 0.05, 0.02, RAIZ, sides=5)  # retoño vertical


add('costa_raices_bajas', raices_bajas)


def raices_entrelazadas(b):
    """Andamio de zancos: cinco arcos que se cruzan, borde de estero."""
    rock(b, (0, 0, 0.62), (0.3, 0.26, 0.2), RAIZ, subdiv=0)  # tronco corto cortado arriba
    for ang, r0, r1, h in ((0.3, -0.5, 0.45, 0.55), (2.1, -0.45, -0.5, 0.6),
                           (3.9, 0.5, -0.4, 0.5), (5.4, 0.45, 0.5, 0.65), (1.2, -0.2, 0.62, 0.4)):
        cx, cy = math.cos(ang) * 0.1, math.sin(ang) * 0.1
        b.tube((r0 * math.cos(ang), r0 * math.sin(ang), 0.02), (cx, cy, h), 0.055, 0.05, RAIZ, sides=6)
        b.tube((cx, cy, h), (r1 * math.cos(ang), r1 * math.sin(ang), 0.02), 0.05, 0.03, RAIZ, sides=6)


add('costa_raices_entrelazadas', raices_entrelazadas)

# ---------------------------------------------------------------- arena y poza (12-13)
def monticulo_arena(b):
    """Monticulo de arena con lomo y falda; silueta asimetrica de dos lobulos."""
    rock(b, (-0.15, 0, 0.12), (0.62, 0.5, 0.24), ARENA, subdiv=1, eul=(0.3, 0.2, 0.6))
    rock(b, (0.35, 0.1, 0.07), (0.4, 0.34, 0.14), ARENA, subdiv=1, eul=(-0.4, 0.3, 1.2))
    rock(b, (0.1, -0.35, 0.03), (0.3, 0.2, 0.07), ARENA, subdiv=0)


add('costa_monticulo_arena', monticulo_arena)


def borde_poza(b):
    """Sólo el cerco de piedras de una poza de marea (sin agua): anillo abierto al mar (-Y)."""
    for i, ang in enumerate((-1.9, -1.25, -0.65, 0.0, 0.7, 1.4, 2.1, 2.75, 3.4)):
        rr = 0.62 + (0.06 if i % 2 else 0)
        rock(b, (math.cos(ang) * rr, math.sin(ang) * rr * 0.85, 0.09 + (0.04 if i % 3 == 0 else 0)),
             (0.2, 0.16, 0.12) if i % 2 else (0.16, 0.2, 0.1),
             PIEDRA_CLARA if i % 2 else PIEDRA_OSURA, subdiv=0)
    slab(b, (0.0, -0.55, 0.03), (0.5, 0.3, 0.05), ARENA, n=6)  # lengua de arena hacia el mar


add('costa_borde_poza', borde_poza)

# ---------------------------------------------------------------- decoracion no bloqueante (14-18)
def huellas_olas(b):
    """Cordones de arena que dejo el oleaje: cuatro crestas finisimas paralelas."""
    for i, (wy, ln, h) in enumerate(((-0.55, 0.5, 0.03), (-0.15, 0.62, 0.045),
                                     (0.28, 0.55, 0.035), (0.66, 0.4, 0.025))):
        rbox(b, (0.1 * ((i % 2) - 0.5), wy, h / 2), (ln, 0.07, h), ARENA,
             (0, math.radians(2 if i % 2 else -2), math.radians(3 * (i - 1.5))))


add('costa_huellas_olas', huellas_olas)


def mata_duna(b, n, spread, hmax, mound):
    """Matas de pasto de duna: hojas en tres segmentos con arco suave hacia fuera."""
    if mound:
        rock(b, (0, 0, 0.03), (spread * 1.1, spread * 0.9, 0.05), ARENA, subdiv=0)
    for i in range(n):
        t = 2 * math.pi * i / n + 0.4
        lean = spread * (0.9 + 0.35 * math.sin(i * 2.7))
        hh = hmax * (0.6 + 0.4 * math.sin(i * 1.7 + 1))
        base = Vector((math.cos(t) * spread * 0.15, math.sin(t) * spread * 0.15, 0.02))
        dxy = Vector((math.cos(t), math.sin(t), 0))
        p1 = base + dxy * lean * 0.45 + Vector((0, 0, hh * 0.62))
        p2 = base + dxy * lean * 0.8 + Vector((0, 0, hh * 0.24))
        tip = base + dxy * lean + Vector((0, 0, 0.015))
        b.tube(base, p1, 0.018, 0.012, MADERA, sides=4)
        b.tube(p1, p2, 0.012, 0.007, MADERA, sides=4)
        b.tube(p2, tip, 0.007, 0.0015, MADERA, sides=4)


add('costa_mata_duna_pequena', lambda b: mata_duna(b, 6, 0.16, 0.24, False))
add('costa_mata_duna_grande', lambda b: mata_duna(b, 10, 0.34, 0.34, True))


def conchas_grupo(b):
    """Grupo de conchas genéricas semienterradas: media esfera achatada, cada una girada."""
    for (cx, cy, s, rot) in ((-0.12, -0.08, 0.07, 0.5), (0.1, 0.02, 0.09, 2.1),
                             (-0.02, 0.16, 0.06, 4.0), (0.2, -0.14, 0.055, 1.2),
                             (-0.22, 0.08, 0.05, 3.3)):
        rock(b, (cx, cy, s * 0.35), (s, s * 0.85, s * 0.5), CONCHA, subdiv=0, eul=(rot, 0, rot * 0.7))
    rock(b, (0.0, -0.2, 0.02), (0.09, 0.07, 0.03), CONCHA, subdiv=0, eul=(0.1, 0.2, 1.7))


add('costa_conchas_grupo', conchas_grupo)


def restos_ramas(b):
    """Restos de ramitas y cortezas secas al pie del manglar: tubos finos cruzados."""
    for (ax, ay, bx, by, r) in ((-0.3, -0.1, 0.25, 0.05, 0.02), (-0.1, 0.22, 0.3, -0.15, 0.015),
                                (-0.25, 0.12, 0.1, -0.24, 0.012), (0.05, 0.05, 0.33, 0.2, 0.018),
                                (-0.32, 0.0, -0.05, -0.22, 0.011)):
        b.tube((ax, ay, 0.015), (bx, by, 0.02), r, r * 0.6, RAIZ, sides=5)
    rbox(b, (-0.02, -0.05, 0.008), (0.16, 0.09, 0.014), MADERA, (0, 0, math.radians(28)))  # corteza plana


add('costa_restos_ramas', restos_ramas)

# ---------------------------------------------------------------- salida
def tri_count(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


missing = [n for n in NAMES if n not in {o.name for o in parts}]
assert not missing, f'faltan: {missing}'

total = 0
for o in parts:
    t = tri_count(o)
    total += t
    assert t <= 450, f'{o.name}: {t} triangulos (limite 450)'
assert total <= 6000, f'catalogo completo: {total} triangulos'
mats = set()
for o in parts:
    for ms in o.data.materials:
        mats.add(ms.name)
assert len(mats) <= 6, f'materiales: {sorted(mats)}'
print('total triangulos:', total, '| materiales:', len(mats))
for o in parts:
    print(f'{o.name}: {tri_count(o)}')

glb_out = str(OUT / 'costa_modular.glb')
for ob in bpy.data.objects:
    ob.select_set(False)
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.export_scene.gltf(filepath=glb_out, export_format='GLB', use_selection=True, export_apply=True)
print(f'exportado {glb_out} ({os.path.getsize(glb_out)} bytes)')

blend = str(OUT / 'costa_modular.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend, copy=True)
print('blend:', blend)
print('costa_modular: OK', len(parts), 'nodos')
