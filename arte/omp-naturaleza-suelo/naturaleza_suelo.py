# Catalogo original de suelo para Panama: rocas, troncos caidos y tocones.
# Clean-room: primitivas y materiales propios, sin assets externos.
# Entrega aislada en work/omp-naturaleza-suelo/ (no se integra aun).
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

scene = fg.fresh_scene('NaturalezaSuelo')
parts = []

# Al repetir el script en el Blender abierto, las mallas de un intento fallido
# siguen ocupando el nombre y Blender renombraria todo con sufijo .001.
NAMES = [
    'roca_redonda_pequena', 'roca_redonda_mediana', 'roca_redonda_grande',
    'roca_puntiaguda_pequena', 'roca_puntiaguda_mediana', 'roca_puntiaguda_grande',
    'roca_plana_pequena', 'roca_plana_mediana', 'roca_plana_grande',
    'roca_partida', 'roca_musgosa', 'grupo_rocas_bajo',
    'tronco_recto', 'tronco_curvo', 'tronco_hueco', 'tronco_musgoso',
    'tocon_bajo', 'tocon_raices',
]
for me in list(bpy.data.meshes):
    if me.name.split('.')[0] in NAMES:
        bpy.data.meshes.remove(me)
for ob in list(scene.collection.objects):
    if ob.name.split('.')[0] in NAMES:
        bpy.data.objects.remove(ob)


def mat(name, rgb, rough=0.95):
    return fg.material('suelo_' + name, rgb, rough=rough)


# Paleta original generica, coherente con naturaleza_modular.glb.
PIEDRA_CLARA = mat('piedra_clara', (0.52, 0.50, 0.44))
PIEDRA_OSCURA = mat('piedra_oscura', (0.28, 0.28, 0.27))
CORTEZA = mat('corteza', (0.24, 0.13, 0.06))
CORTEZA_CLARA = mat('corteza_clara', (0.42, 0.26, 0.11))
MUSGO = mat('musgo', (0.16, 0.30, 0.10), rough=1.0)
MADERA = mat('madera', (0.55, 0.36, 0.17), rough=0.95)


def piece(name, build):
    b = fg.Builder(name)
    build(b)
    parts.append(b.object(scene))


def settle(o):
    """Apoya la pieza en z=0 moviendo la malla, no el objeto."""
    zs = [(o.matrix_world @ v.co).z for v in o.data.vertices]
    dz = min(zs)
    if abs(dz) > 1e-6:
        o.data.transform(Matrix.Translation((0, 0, -dz)))


# ---------------------------------------------------------------- rocas
def rock_round(b, s, material=PIEDRA_CLARA, bump=(0.42, -0.30, 0.55), lean=0.0):
    """Roca redondeada: icosfera achatada con un nudo asimetrico.

    `lean` desplaza el cuerpo y `bump` coloca el nudo, para que cada talla
    tenga su propia silueta y no sea la misma malla escalada.
    """
    b.blob((lean, -lean * 0.5, s[2] * 0.86), s, material, subdiv=1)
    bx, by, bz = bump
    b.blob((s[0] * bx, s[1] * by, s[2] * bz), (s[0] * 0.42, s[1] * 0.38, s[2] * 0.45), material, subdiv=1)


def add(name, build):
    piece(name, build)
    settle(parts[-1])


ROUND = {
    'pequena': ((0.34, 0.30, 0.24), (0.35, -0.45, 0.45), 0.03),   # canto con nudo al frente
    'mediana': ((0.62, 0.52, 0.44), (0.5, 0.35, 0.6), -0.05),     # bola con joroba atras
    'grande': ((1.05, 0.84, 0.72), (-0.55, -0.2, 0.5), 0.09),     # peñasco inclinado, nudo a la izquierda
}
for k, (rs, bump, ln) in ROUND.items():
    add(f'roca_redonda_{k}', lambda b, s=rs, bp=bump, l=ln: rock_round(b, s, bump=bp, lean=l))


def rock_pointed(b, s, material=PIEDRA_OSCURA, twist=0.35, kink=0.0):
    """Roca puntiaguda: cono facetado de base irregular y vertice descentrado.

    `twist` gira la corona y `kink` inclina la punta hacia un lado.
    """
    n = 7
    base = []
    for i in range(n):
        t = 2 * math.pi * i / n
        r = 1.0 + 0.22 * math.sin(3 * t + 1.3)
        base.append((s[0] * 0.55 * r * math.cos(t), s[1] * 0.55 * r * math.sin(t), 0.02))
    tip = []
    for i in range(n):
        t = 2 * math.pi * i / n + twist
        r = 0.30 + 0.16 * math.cos(2 * t)
        tip.append((s[0] * 0.5 * r * math.cos(t) + kink, s[1] * 0.5 * r * math.sin(t) - kink * 0.6, s[2] * 0.92))
    b.poly(base, tip, material)
    b.blob((kink * 0.4, -kink * 0.3, s[2] * 0.16), (s[0] * 0.52, s[1] * 0.5, s[2] * 0.2), material, subdiv=1)


POINTED = {
    'pequena': (0.30, 0.26, 0.55, 0.20, 0.0),   # aguja corta y recta
    'mediana': (0.5, 0.46, 0.95, 0.5, 0.07),    # colmillo inclinado
    'grande': (0.72, 0.66, 1.3, 0.95, 0.12),    # pico torcido
}
for k, (px, py, pz, tw, ki) in POINTED.items():
    add(f'roca_puntiaguda_{k}', lambda b, s=(px, py, pz), tw=tw, ki=ki: rock_pointed(b, s, twist=tw, kink=ki))


def rock_flat(b, s, material=PIEDRA_CLARA, chip=True, step=False):
    """Roca plana: losa ancha y baja. `chip` anade lasca oscura; `step` un segundo escalon."""
    b.blob((0, 0, s[2] * 0.55), (s[0], s[1], s[2] * 0.5), material, subdiv=1)
    b.box((s[0] * 0.18, -s[1] * 0.1, s[2] * 0.32), (s[0] * 1.05, s[1] * 0.9, s[2] * 0.34), material,
          rot=(math.radians(4), (1, 0, 0)))
    if chip:
        b.box((-s[0] * 0.28, s[1] * 0.18, s[2] * 0.16), (s[0] * 0.55, s[1] * 0.5, s[2] * 0.2), PIEDRA_OSCURA,
              rot=(math.radians(-5), (0, 1, 0)))
    if step:
        b.box((-s[0] * 0.35, -s[1] * 0.45, s[2] * 0.55), (s[0] * 0.6, s[1] * 0.55, s[2] * 0.4), material,
              rot=(math.radians(7), (0.3, 1, 0)))


FLAT = {
    'pequena': ((0.52, 0.44, 0.14), False, False),   # laja lisa sin lasca
    'mediana': ((0.86, 0.7, 0.24), True, False),     # losa con lasca oscura
    'grande': ((1.35, 1.05, 0.36), True, True),      # losa escalonada tipo mesa
}
for k, (fs, ch, st) in FLAT.items():
    add(f'roca_plana_{k}', lambda b, s=fs, c=ch, st=st: rock_flat(b, s, chip=c, step=st))


def rock_broken(b):
    """Roca partida: dos cascos redondeados achatados, separados por una grieta."""
    s = (0.85, 0.6, 0.5)
    # dos mitades: esferas achatadas y estiradas (no cubos), casi tocandose
    b.blob((-s[0] * 0.36, 0, s[2] * 0.46), (s[0] * 0.52, s[1] * 0.88, s[2] * 0.46), PIEDRA_OSCURA, subdiv=1)
    b.blob((s[0] * 0.40, 0.05, s[2] * 0.36), (s[0] * 0.46, s[1] * 0.78, s[2] * 0.36), PIEDRA_OSCURA, subdiv=1)
    # cara fresca del corte: losa clara casi tapada por las mitades
    b.box((-s[0] * 0.02, 0, s[2] * 0.38), (s[0] * 0.05, s[1] * 0.62, s[2] * 0.52), PIEDRA_CLARA,
          rot=(math.radians(10), (1, 0, 0.3)))
    # astilla caída junto a la grieta
    b.blob((0, s[1] * 0.55, 0.06), (s[0] * 0.2, s[0] * 0.16, s[2] * 0.1), PIEDRA_OSCURA, subdiv=1)


add('roca_partida', rock_broken)


def rock_mossy(b):
    """Roca musgosa: redonda oscura con capas de musgo que asoman del cuerpo."""
    s = (0.7, 0.58, 0.5)
    rock_round(b, s, PIEDRA_OSCURA)
    # casquete superior: a z=0.78 el cuerpo (centro 0.43, radio z 0.5) mide ~0.47 de radio; el musgo lo cubre y desborda
    b.blob((0.06, -0.05, 0.80), (0.47, 0.36, 0.17), MUSGO, subdiv=1)
    # parche lateral izquierdo, asomando del costado
    b.blob((-0.55, 0.13, 0.28), (0.18, 0.24, 0.12), MUSGO, subdiv=1)


add('roca_musgosa', rock_mossy)


def rocks_cluster_low(b):
    """Grupo de rocas bajo: tres piezas apoyadas, silueta compuesta."""
    rock_round(b, (0.55, 0.46, 0.36), PIEDRA_OSCURA)
    b.blob((0.62, 0.18, 0.12), (0.42, 0.34, 0.22), PIEDRA_CLARA, subdiv=1)
    n = 6
    base = [(0.5 * 0.28 * math.cos(2 * math.pi * i / n) - 0.42,
             0.5 * 0.28 * math.sin(2 * math.pi * i / n) + 0.32, 0.01) for i in range(n)]
    tip = [(0.5 * 0.1 * math.cos(2 * math.pi * i / n + 0.4) - 0.42,
            0.5 * 0.1 * math.sin(2 * math.pi * i / n + 0.4) + 0.32, 0.5) for i in range(n)]
    b.poly(base, tip, PIEDRA_CLARA)


add('grupo_rocas_bajo', rocks_cluster_low)


# ---------------------------------------------------------------- troncos
def log_rings(b, a, c, r0, r1, mat_bark, mat_wood, sides=8):
    """Tronco con anillos en los extremos: tubo de corteza + disco de madera."""
    b.tube(a, c, r0, r1, mat_bark, sides=sides)
    d = (Vector(c) - Vector(a)).normalized()
    for p, rr, flip in ((Vector(a) - d * 0.005, r0 * 0.88, True), (Vector(c) + d * 0.005, r1 * 0.88, False)):
        ring_a = []
        q = Vector((0, 0, 1)).rotation_difference(d)
        for i in range(sides):
            t = 2 * math.pi * i / sides
            v = Vector((rr * math.cos(t), rr * math.sin(t), 0))
            v.rotate(q)
            ring_a.append(b.bm.verts.new(p + v))
        center = b.bm.verts.new(p)
        for i in range(sides):
            nxt = (i + 1) % sides
            if flip:
                f = b.bm.faces.new((center, ring_a[nxt], ring_a[i]))
            else:
                f = b.bm.faces.new((center, ring_a[i], ring_a[nxt]))
            f.material_index = b._index(mat_wood)


def trunk_straight(b):
    """Tronco recto caido: cilindro horizontal apoyado con una rama corta."""
    log_rings(b, (-0.95, 0, 0.24), (0.95, 0.06, 0.30), 0.24, 0.21, CORTEZA, MADERA)
    # rama lateral corta
    b.tube((0.25, 0.1, 0.4), (0.62, 0.42, 0.55), 0.09, 0.05, CORTEZA, sides=6)
    # apoyo: el cilindro toca el suelo en los extremos; anadimos dos pies de corteza
    b.blob((-0.78, 0.0, 0.1), (0.22, 0.24, 0.12), CORTEZA, subdiv=1)
    b.blob((0.78, 0.06, 0.1), (0.2, 0.22, 0.11), CORTEZA, subdiv=1)


add('tronco_recto', trunk_straight)


def trunk_curved(b):
    """Tronco curvo: Arco de segmentos horizontales, mismo grosor."""
    pts = [(-1.0, 0.0, 0.20), (-0.55, 0.05, 0.17), (0.0, 0.14, 0.22), (0.55, 0.1, 0.34), (0.98, 0.0, 0.5)]
    radii = [0.2, 0.23, 0.25, 0.22, 0.14]
    for i in range(len(pts) - 1):
        b.tube(pts[i], pts[i + 1], radii[i], radii[i + 1], CORTEZA, sides=7)
    d = (Vector(pts[-1]) - Vector(pts[-2])).normalized()
    q = Vector((0, 0, 1)).rotation_difference(d)
    ring = []
    for i in range(7):
        t = 2 * math.pi * i / 7
        v = Vector((radii[-1] * 0.9 * math.cos(t), radii[-1] * 0.9 * math.sin(t), 0))
        v.rotate(q)
        ring.append(b.bm.verts.new(Vector(pts[-1]) + d * 0.005 + v))
    c = b.bm.verts.new(Vector(pts[-1]) + d * 0.005)
    for i in range(7):
        b.bm.faces.new((c, ring[i], ring[(i + 1) % 7]))
    for x in (-0.85, -0.2, 0.6):
        b.blob((x, 0.02, 0.08), (0.2, 0.22, 0.1), CORTEZA, subdiv=1)


add('tronco_curvo', trunk_curved)


def trunk_hollow(b):
    """Tronco hueco: tubo abierto por delante; se ve el interior carbonoso."""
    # pared exterior (dos tramos), disco posterior y anillo frontal que insinua el hueco
    log_rings(b, (-0.85, 0.0, 0.26), (0.85, -0.05, 0.24), 0.26, 0.24, CORTEZA, MADERA)
    # boca oscura en el frente
    d = Vector((1, 0, 0))
    q = Vector((0, 0, 1)).rotation_difference(d)
    ring_o, ring_i = [], []
    for i in range(8):
        t = 2 * math.pi * i / 8
        p = Vector((0.86, -0.05, 0.24))
        vo = Vector((0.235 * math.cos(t), 0.235 * math.sin(t), 0))
        vo.rotate(q)
        vi = Vector((0.15 * math.cos(t), 0.15 * math.sin(t), 0))
        vi.rotate(q)
        ring_o.append(b.bm.verts.new(p + vo))
        ring_i.append(b.bm.verts.new(p + d * 0.05 + vi))
    for i in range(8):
        b.bm.faces.new((ring_o[i], ring_o[(i + 1) % 8], ring_i[(i + 1) % 8], ring_i[i]))
    inner = b.bm.verts.new(Vector((0.86, -0.05, 0.24)) + d * 0.05)
    for i in range(8):
        b.bm.faces.new((inner, ring_i[i], ring_i[(i + 1) % 8]))
    # el hueco interior (anillo y fondo) sale en madera oscura
    inner_mats = set(ring_i) | {inner}
    for f in list(b.bm.faces):
        if all(v in inner_mats for v in f.verts):
            f.material_index = b._index(PIEDRA_OSCURA)
    b.blob((-0.62, -0.02, 0.1), (0.22, 0.24, 0.12), CORTEZA, subdiv=1)
    b.blob((0.5, 0.0, 0.1), (0.2, 0.22, 0.11), CORTEZA, subdiv=1)


add('tronco_hueco', trunk_hollow)


def trunk_mossy(b):
    """Tronco musgoso: recto con setas y musgo encima."""
    log_rings(b, (-0.8, 0, 0.22), (0.8, 0.05, 0.26), 0.22, 0.19, CORTEZA, MADERA)
    b.blob((-0.15, 0.0, 0.34), (0.5, 0.26, 0.14), MUSGO, subdiv=1)
    b.blob((0.5, 0.05, 0.31), (0.22, 0.16, 0.12), MUSGO, subdiv=1)
    for x, y in ((-0.5, 0.16), (-0.38, 0.2)):
        b.tube((x, y, 0.34), (x, y, 0.47), 0.05, 0.045, CORTEZA_CLARA, sides=5)
        # sombrero de seta: cono de cinco lados, barato y legible
        ring = [b.bm.verts.new((x + 0.08 * math.cos(2 * math.pi * i / 5), y + 0.08 * math.sin(2 * math.pi * i / 5), 0.47)) for i in range(5)]
        cap = b.bm.verts.new((x, y, 0.52))
        for i in range(5):
            f = b.bm.faces.new((cap, ring[i], ring[(i + 1) % 5]))
            f.material_index = b._index(CORTEZA_CLARA)
    b.blob((0.0, 0.02, 0.08), (0.75, 0.22, 0.09), CORTEZA, subdiv=1)


add('tronco_musgoso', trunk_mossy)


# ---------------------------------------------------------------- tocones
def stump_low(b):
    """Tocón bajo: prisma ochavado con tapa de anillos y grieta."""
    n = 8
    r_out, r_top = 0.34, 0.3
    base = [(r_out * math.cos(2 * math.pi * i / n), r_out * 0.92 * math.sin(2 * math.pi * i / n), 0.01) for i in range(n)]
    top = [(r_top * math.cos(2 * math.pi * i / n + 0.12), r_top * 0.92 * math.sin(2 * math.pi * i / n + 0.12), 0.42) for i in range(n)]
    b.poly(base, top, CORTEZA)
    ring = []
    for i in range(n):
        t = 2 * math.pi * i / n + 0.12
        ring.append(b.bm.verts.new((r_top * 0.95 * math.cos(t), r_top * 0.95 * 0.92 * math.sin(t), 0.43)))
    c = b.bm.verts.new((0.01, 0, 0.43))
    for i in range(n):
        b.bm.faces.new((c, ring[i], ring[(i + 1) % n]))
    # la tapa en madera clara: asignar por normal
    for f in b.bm.faces:
        if f.normal.z > 0.9:
            f.material_index = b._index(MADERA)
    # grieta: losa oscura enrasada con la tapa, apenas asomando
    b.box((0.1, 0, 0.40), (0.045, 0.42, 0.05), PIEDRA_OSCURA, rot=(math.radians(6), (1, 0, 0.15)))
    b.blob((-0.22, 0.2, 0.06), (0.14, 0.14, 0.06), CORTEZA, subdiv=1)


add('tocon_bajo', stump_low)


def stump_roots(b):
    """Tocón con raíces: fuste alto y cuatro raíces que se abren al suelo."""
    n = 7
    h = 0.62
    base = [(0.3 * math.cos(2 * math.pi * i / n), 0.3 * math.sin(2 * math.pi * i / n), 0.18) for i in range(n)]
    top = [(0.22 * math.cos(2 * math.pi * i / n + 0.2), 0.22 * math.sin(2 * math.pi * i / n + 0.2), h) for i in range(n)]
    b.poly(base, top, CORTEZA)
    ring = []
    for i in range(n):
        t = 2 * math.pi * i / n + 0.2
        ring.append(b.bm.verts.new((0.21 * math.cos(t), 0.21 * math.sin(t), h + 0.01)))
    c = b.bm.verts.new((0, 0, h + 0.01))
    for i in range(n):
        b.bm.faces.new((c, ring[i], ring[(i + 1) % n]))
    for f in b.bm.faces:
        if f.normal.z > 0.9:
            f.material_index = b._index(MADERA)
    for i in range(4):
        t = 2 * math.pi * i / 4 + 0.5
        ux, uy = math.cos(t), math.sin(t)
        b.tube((ux * 0.16, uy * 0.16, 0.30), (ux * 0.58, uy * 0.58, 0.03), 0.09, 0.05, CORTEZA, sides=5)
    b.blob((0, 0, 0.05), (0.34, 0.34, 0.07), CORTEZA, subdiv=1)


add('tocon_raices', stump_roots)


# ---------------------------------------------------------------- salida
def tri_count(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def export_work(filename):
    """GLB de revision dentro de work/, sin tocar assets/models."""
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    out = str(OUT / filename)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True,
                              export_animations=False, use_active_scene=True,
                              export_materials='EXPORT', export_image_format='AUTO')
    print(f'exportado {out} ({os.path.getsize(out)} bytes)')


# orden estable para la revision
NAMES = [
    'roca_redonda_pequena', 'roca_redonda_mediana', 'roca_redonda_grande',
    'roca_puntiaguda_pequena', 'roca_puntiaguda_mediana', 'roca_puntiaguda_grande',
    'roca_plana_pequena', 'roca_plana_mediana', 'roca_plana_grande',
    'roca_partida', 'roca_musgosa', 'grupo_rocas_bajo',
    'tronco_recto', 'tronco_curvo', 'tronco_hueco', 'tronco_musgoso',
    'tocon_bajo', 'tocon_raices',
]
missing = [n for n in NAMES if n not in {o.name for o in parts}]
assert not missing, f'faltan: {missing}'

total = 0
for o in parts:
    t = tri_count(o)
    total += t
    assert t <= (500 if (o.name.startswith(('tronco_', 'tocon_'))) else 350), f'{o.name}: {t} triangulos'
assert total < 6000, f'catalogo completo: {total} triangulos'
print('total triangulos:', total)
for o in parts:
    print(f'{o.name}: {tri_count(o)}')

export_work('naturaleza_suelo.glb')
blend = str(OUT / 'naturaleza_suelo.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend, copy=True)
print('blend:', blend)
print('naturaleza_suelo: OK', len(parts), 'nodos')
