# Catalogo original de detalle natural NO BLOQUEANTE para el suelo de Panama.
# Ramas, raices, hojarasca, piedritas, madera de arrastre, conchas y semillas.
# Clean-room: primitivas y materiales propios, sin assets externos.
# Catálogo integrado en assets/models/; se regenera desde este script.
# Ninguna pieza necesita colision: son detalle atravesable, todo bajo 0,15 m.
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector, Matrix, Euler

try:
    HERE = Path(bpy.path.abspath(__file__)).parent
except NameError:
    HERE = Path(__file__).resolve().parent  # por MCP no existe __file__
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / 'scripts' / 'blender'))
import fg  # noqa: E402

MODEL_OUT = ROOT / 'assets' / 'models' / 'detalle_suelo.glb'
BLEND_OUT = ROOT / 'arte' / 'blender' / 'detalle_suelo.blend'

scene = fg.fresh_scene('DetalleSuelo')
parts = []

NAMES = [
    'rama_corta', 'rama_larga', 'rama_bifurcada', 'rama_con_hojas',
    'raices_bajas', 'raices_serpenteantes',
    'hojarasca_redonda', 'hojarasca_alargada', 'hojarasca_dispersa',
    'piedritas_claras', 'piedritas_oscuras', 'piedritas_mixtas',
    'madera_arrastre_corta', 'madera_arrastre_larga',
    'conchas_pequenas', 'conchas_grupo',
    'semillas_caidas', 'hojas_grandes_caidas',
]
for me in list(bpy.data.meshes):
    if me.name.split('.')[0] in NAMES:
        bpy.data.meshes.remove(me)
for ob in list(scene.collection.objects):
    if ob.name.split('.')[0] in NAMES:
        bpy.data.objects.remove(ob)


def mat(name, rgb, rough=0.95):
    return fg.material('detalle_' + name, rgb, rough=rough)


# Mismos colores que naturaleza_modular.glb y naturaleza_suelo.glb; concha es el
# unico nuevo: crema de playa generico, sin fotografias ni tiles externos.
HOJA = mat('hoja', (0.075, 0.31, 0.105))
HOJA_CLARA = mat('hoja_clara', (0.22, 0.46, 0.12))
SECO = mat('seco', (0.48, 0.34, 0.13))          # hojarasca y madera decolorada
CORTEZA = mat('corteza', (0.24, 0.13, 0.06))
CORTEZA_CLARA = mat('corteza_clara', (0.42, 0.26, 0.11))
PIEDRA_CLARA = mat('piedra_clara', (0.52, 0.50, 0.44))
PIEDRA_OSCURA = mat('piedra_oscura', (0.28, 0.28, 0.27))
MADERA = mat('madera', (0.55, 0.36, 0.17))      # tapa de corte fresco
CONCHA = mat('concha', (0.72, 0.64, 0.52))


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


def add(name, build):
    piece(name, build)
    settle(parts[-1])


def leaf(b, p, rx, ry, material, tilt, h=0.02, n=6, seed=0.0):
    """Hoja solida de bajo relieve: dos contornos (base y dorso) unidos.

    Siempre inclinada (`tilt`): ninguna cara queda coplanar con el suelo y la
    hoja tiene volumen propia, cumpliendo la regla de no-planos.
    """
    q = Euler(tilt).to_quaternion()
    base, top = [], []
    for i in range(n):
        t = 2 * math.pi * i / n
        rr = 1 + 0.16 * math.sin(3 * t + seed)
        vx, vy = rx * rr * math.cos(t), ry * rr * math.sin(t)
        v0 = Vector((vx, vy, 0))
        v1 = Vector((vx * 0.55, vy * 0.55, h))
        v0.rotate(q)
        v1.rotate(q)
        base.append((v0 + Vector(p)))
        top.append((v1 + Vector(p)))
    b.poly(base, top, material)


def twig(b, pts, radii, material, sides=5, flat=None):
    """Rama quebrada: tramos de tubo con grosor decreciente."""
    for i in range(len(pts) - 1):
        b.tube(pts[i], pts[i + 1], radii[i], radii[i + 1], material, sides=sides, flat=flat)


def disc(b, p, d, r, sides, material):
    """Disco de corte en un extremo de madera."""
    q = Vector((0, 0, 1)).rotation_difference(Vector(d).normalized())
    ring = []
    for i in range(sides):
        t = 2 * math.pi * i / sides
        v = Vector((r * math.cos(t), r * math.sin(t), 0))
        v.rotate(q)
        ring.append(b.bm.verts.new(Vector(p) + v))
    c = b.bm.verts.new(Vector(p))
    for i in range(sides):
        f = b.bm.faces.new((c, ring[i], ring[(i + 1) % sides]))
        f.material_index = b._index(material)


# ---------------------------------------------------------------- ramas
def rama_short(b):
    pts = [(-0.17, -0.02, 0.030), (0.0, 0.02, 0.045), (0.17, -0.01, 0.028)]
    twig(b, pts, [0.016, 0.013, 0.009], CORTEZA, sides=5)
    b.tube((0.06, 0.01, 0.038), (0.11, 0.09, 0.075), 0.008, 0.005, CORTEZA, sides=5)


add('rama_corta', rama_short)


def rama_long(b):
    pts = [(-0.31, 0.0, 0.028), (-0.12, 0.05, 0.040), (0.08, 0.02, 0.034), (0.30, -0.03, 0.022)]
    radii = [0.020, 0.017, 0.013, 0.008]
    twig(b, pts, radii, CORTEZA, sides=6)
    b.tube((-0.05, 0.035, 0.037), (-0.14, 0.13, 0.075), 0.009, 0.005, CORTEZA, sides=5)
    b.tube((0.18, -0.02, 0.028), (0.26, -0.10, 0.055), 0.007, 0.004, CORTEZA, sides=5)


add('rama_larga', rama_long)


def rama_forked(b):
    b.tube((-0.20, 0.0, 0.026), (0.0, 0.02, 0.045), 0.021, 0.016, CORTEZA, sides=6)
    b.tube((0.0, 0.02, 0.045), (0.16, 0.12, 0.085), 0.014, 0.007, CORTEZA, sides=5)
    b.tube((0.0, 0.02, 0.045), (0.17, -0.08, 0.075), 0.012, 0.006, CORTEZA, sides=5)


add('rama_bifurcada', rama_forked)


def rama_with_leaves(b):
    pts = [(-0.18, -0.02, 0.030), (0.0, 0.02, 0.052), (0.19, 0.0, 0.032)]
    twig(b, pts, [0.014, 0.011, 0.007], CORTEZA_CLARA, sides=5)
    for i, (x, y, z, rx, ry, tl, m) in enumerate((
            (-0.10, 0.02, 0.052, 0.055, 0.028, (0.5, 0.2, 0.4), HOJA),
            (-0.02, -0.03, 0.058, 0.06, 0.03, (-0.45, 0.3, 1.2), HOJA_CLARA),
            (0.07, 0.05, 0.05, 0.05, 0.026, (0.55, -0.25, 2.2), HOJA),
            (0.14, -0.02, 0.045, 0.055, 0.028, (-0.5, -0.3, 0.8), SECO))):
        leaf(b, (x, y, z), rx, ry, m, tl, h=0.012, seed=i)


add('rama_con_hojas', rama_with_leaves)


# ---------------------------------------------------------------- raices
def raices_bajas(b):
    """Mecha de raices superficiales que asoman del suelo."""
    for ux, uy, len_, r0, wob in ((0.95, 0.15, 0.20, 0.020, 0.05), (-0.85, 0.35, 0.17, 0.018, -0.04),
                                   (0.15, -0.97, 0.18, 0.016, 0.03), (-0.3, 0.9, 0.14, 0.014, -0.05)):
        mx, my = ux * len_ * 0.55 + wob * uy, uy * len_ * 0.55 - wob * ux
        b.tube((0, 0, 0.045), (mx, my, 0.020), r0, r0 * 0.55, CORTEZA, sides=5)
        b.tube((mx, my, 0.020), (ux * len_, uy * len_, 0.004), r0 * 0.55, 0.004, CORTEZA, sides=4)
    b.blob((0, 0, 0.020), (0.10, 0.10, 0.025), CORTEZA, subdiv=1)


add('raices_bajas', raices_bajas)


def raices_serpenteantes(b):
    """Raices largas serpenteadas, media luna poco profunda."""
    for off, amp, rr, sides in ((0.0, 0.10, 0.018, 5), (0.10, 0.06, 0.013, 5), (-0.10, 0.13, 0.011, 4)):
        pts = []
        for i in range(6):
            t = -1 + 2 * i / 5
            x = t * 0.30
            y = off + amp * math.sin(math.pi * (t + 1) * 1.3)
            z = 0.035 - 0.02 * abs(t) + 0.012 * math.cos(math.pi * i / 5)
            pts.append((x, y, max(z, 0.006)))
        radii = [rr * (1 - 0.13 * i) for i in range(6)]
        twig(b, pts, radii, CORTEZA, sides=sides)
    b.blob((0.0, 0.0, 0.028), (0.11, 0.13, 0.030), CORTEZA, subdiv=0)


add('raices_serpenteantes', raices_serpenteantes)


# ---------------------------------------------------------------- hojarasca
HOJARASCA = SECO
SECOSO = mat('seco_oscuro', (0.35, 0.24, 0.10))


def hojarasca_redonda(b):
    """Mancha circular de hojas redondas de secano, superpuestas y con volumen."""
    spots = ((0.0, 0.0, 0.058, 0.0), (0.09, 0.05, 0.05, 1.1), (-0.08, 0.04, 0.048, 2.3),
             (0.03, -0.08, 0.052, 3.6), (-0.05, -0.07, 0.045, 4.8), (0.10, -0.04, 0.042, 0.6),
             (-0.11, -0.02, 0.05, 5.6), (0.02, 0.11, 0.046, 2.9), (0.0, 0.0, 0.045, 1.9))
    for i, (x, y, r, rot) in enumerate(spots):
        leaf(b, (x, y, 0.012 + 0.004 * (i % 3)), r, r * 0.85,
             HOJARASCA if i % 3 else SECOSO, (0.16, 0.10, rot), h=0.008, n=7, seed=i * 1.7)


add('hojarasca_redonda', hojarasca_redonda)


def hojarasca_alargada(b):
    """Mancha de hojas alargadas (bamboo/banano caido), cruzadas."""
    spots = ((-0.05, 0.0, 0.13, 0.045, 0.5), (0.04, 0.03, 0.12, 0.04, -0.7),
             (0.0, -0.05, 0.11, 0.04, 1.9), (0.07, -0.04, 0.10, 0.035, 2.8),
             (-0.06, 0.06, 0.10, 0.038, -2.2))
    for i, (x, y, rx, ry, rot) in enumerate(spots):
        leaf(b, (x, y, 0.014 + 0.005 * (i % 3)), rx, ry,
             HOJARASCA if i % 2 else SECOSO, (0.35, 0.15, rot), h=0.010, n=6, seed=i)


add('hojarasca_alargada', hojarasca_alargada)


def hojarasca_dispersa(b):
    """Salpicado amplio y ralo: hojas sueltas por un area mayor."""
    spots = ((-0.24, -0.12, 0.6, 0.20), (-0.08, 0.18, 2.1, 0.24), (0.16, -0.16, 4.0, 0.17),
             (0.27, 0.10, 1.2, 0.28), (-0.19, 0.02, 5.1, 0.21), (0.05, -0.02, 2.9, 0.15),
             (0.20, 0.24, 0.4, 0.26), (-0.02, -0.22, 3.9, 0.19), (0.30, -0.05, 1.8, 0.23),
             (-0.26, 0.16, 5.9, 0.16))
    for i, (x, y, rot, r) in enumerate(spots):
        leaf(b, (x, y, 0.010 + 0.004 * (i % 4)), r * 0.7, r * 0.4,
             HOJARASCA if i % 3 else SECOSO,
             (0.25, 0.12, rot), h=0.006, n=6, seed=i * 2.1)


add('hojarasca_dispersa', hojarasca_dispersa)


# ---------------------------------------------------------------- piedritas
def pebbles(b, n, r_min, r_max, material, alt=PIEDRA_CLARA, alt_every=0):
    """Guijarros: icosferas subdiv 0 (20 tris), achatadas y semienterradas."""
    golden = 2.399963  # angulo aureo: salpicado uniforme sin patrones
    for i in range(n):
        t = i / max(1, n - 1)
        ang = i * golden
        rad = 0.10 + 0.22 * math.sqrt(t)
        x, y = rad * math.cos(ang), rad * math.sin(ang) * 0.8
        r = r_min + (r_max - r_min) * ((i * 37 % 23) / 22)
        m = alt if (alt_every and i % alt_every == alt_every - 1) else material
        b.blob((x, y, r * 0.55), (r * 1.15, r * 0.95, r * 0.7), m, subdiv=0)


def piedritas_claras(b):
    pebbles(b, 6, 0.025, 0.05, PIEDRA_CLARA, alt=CONCHA, alt_every=4)


def piedritas_oscuras(b):
    pebbles(b, 6, 0.025, 0.05, PIEDRA_OSCURA)


def piedritas_mixtas(b):
    """Mezcla: guijarros claros, oscuros y una laja plana al centro."""
    pebbles(b, 7, 0.022, 0.045, PIEDRA_CLARA, alt=PIEDRA_OSCURA, alt_every=2)
    leaf(b, (-0.02, 0.01, 0.012), 0.09, 0.06, PIEDRA_OSCURA, (0.12, 0.05, 0.7), h=0.010, n=7)


add('piedritas_claras', piedritas_claras)
add('piedritas_oscuras', piedritas_oscuras)
add('piedritas_mixtas', piedritas_mixtas)


# ---------------------------------------------------------------- madera de arrastre
def madera_arrastre_corta(b):
    """Pedazo de madera de crecida: trozo redondeado con tapa clara."""
    b.tube((-0.16, 0.03, 0.045), (0.16, -0.02, 0.052), 0.048, 0.040, SECO, sides=7)
    d = (Vector((0.16, -0.02, 0.052)) - Vector((-0.16, 0.03, 0.045))).normalized()
    disc(b, Vector((0.16, -0.02, 0.052)) + d * 0.002, d.to_3d(), 0.036, 7, MADERA)
    b.blob((-0.05, 0.0, 0.016), (0.10, 0.07, 0.020), SECO, subdiv=1)


add('madera_arrastre_corta', madera_arrastre_corta)


def madera_arrastre_larga(b):
    """Tabla o rama gruesa arrastrada, quebrada en dos planos."""
    b.tube((-0.30, 0.06, 0.040), (-0.05, 0.0, 0.055), 0.052, 0.044, SECO, sides=8)
    b.tube((-0.05, 0.0, 0.055), (0.28, -0.05, 0.048), 0.044, 0.034, CORTEZA, sides=7)
    d = Vector((0.28, -0.05, 0.048)) - Vector((-0.05, 0.0, 0.055))
    disc(b, Vector((0.28, -0.05, 0.048)) + d.normalized() * 0.002, d.normalized(), 0.030, 7, MADERA)
    # astillas levantadas: la tabla no es un cilindro puro
    b.tube((0.05, 0.01, 0.078), (0.13, 0.06, 0.115), 0.012, 0.005, CORTEZA, sides=5)
    for x, y in ((-0.2, 0.04), (0.1, -0.01)):
        b.blob((x, y, 0.014), (0.09, 0.07, 0.018), SECO, subdiv=1)


add('madera_arrastre_larga', madera_arrastre_larga)


# ---------------------------------------------------------------- conchas
def shell(b, p, r, rot, material):
    """Concha de dos valvas: lenteja baja apoyada de canto (no plana)."""
    q = Euler(rot).to_quaternion()
    base, top = [], []
    for i in range(7):
        t = 2 * math.pi * i / 7
        vx, vy = r * math.cos(t), r * 0.8 * math.sin(t)
        v0 = Vector((vx, vy, 0.0))
        v1 = Vector((vx * 0.5, vy * 0.5, r * 0.85))
        v0.rotate(q)
        v1.rotate(q)
        base.append(v0 + Vector(p))
        top.append(v1 + Vector(p))
    b.poly(base, top, material)


def conchas_pequenas(b):
    for i, (x, y, r, rz) in enumerate(((-0.09, -0.05, 0.035, 0.4), (0.05, 0.04, 0.03, 1.8),
                                        (0.10, -0.07, 0.026, 5.2), (-0.03, 0.08, 0.028, 2.7))):
        shell(b, (x, y, 0.006), r, (0.25, -0.2, rz), CONCHA if i % 2 else PIEDRA_CLARA)


add('conchas_pequenas', conchas_pequenas)


def conchas_grupo(b):
    """Cumulo playero: varias valvas apiladas de canto y una entera."""
    for i, (x, y, r, rz) in enumerate(((-0.10, 0.0, 0.05, 0.9), (-0.02, -0.07, 0.045, 3.4),
                                        (0.08, 0.02, 0.055, 5.9), (0.02, 0.09, 0.04, 2.2),
                                        (0.13, -0.06, 0.035, 1.5))):
        shell(b, (x, y, 0.008 + 0.01 * (i % 2)), r, (0.3, -0.25, rz),
              CONCHA if i % 3 else PIEDRA_CLARA)
    b.blob((-0.02, 0.01, 0.030), (0.075, 0.075, 0.030), CONCHA, subdiv=0)


add('conchas_grupo', conchas_grupo)


# ---------------------------------------------------------------- semillas y hojas grandes
def semillas_caidas(b):
    """Frutos pequenos caidos: esferas achatadas (subdiv 0) con un rabito."""
    spots = ((-0.10, -0.04, 0.022), (0.02, 0.05, 0.020), (0.09, -0.06, 0.018),
             (-0.04, 0.09, 0.021), (0.10, 0.06, 0.019), (-0.11, 0.03, 0.017))
    for i, (x, y, r) in enumerate(spots):
        b.blob((x, y, r * 0.8), (r, r * 0.9, r * 0.75), SECO if i % 2 else CORTEZA_CLARA, subdiv=0)
        b.tube((x, y, r * 1.4), (x + r * 0.5, y, r * 1.9), 0.003, 0.002, CORTEZA, sides=4)


add('semillas_caidas', semillas_caidas)


def hojas_grandes_caidas(b):
    """Hojas de banano o bamboo podridas, grandes y con nervio en relieve."""
    spots = ((-0.08, 0.05, 0.24, 0.09, 0.6), (0.10, -0.06, 0.22, 0.08, -1.1),
             (0.0, 0.12, 0.2, 0.075, 2.4))
    for i, (x, y, rx, ry, rot) in enumerate(spots):
        leaf(b, (x, y, 0.014), rx, ry, SECO if i % 2 else SECOSO, (0.20, 0.10, rot), h=0.022, n=8, seed=i * 1.3)
        # nervio central: tubo fino siguiendo la hoja
        q = Euler((0.20, 0.10, rot)).to_quaternion()
        a = Vector((-rx * 0.9, 0, 0.020))
        a.rotate(q)
        c = Vector((rx * 0.9, 0, 0.020))
        c.rotate(q)
        b.tube((x + a.x, y + a.y, 0.020 + a.z), (x + c.x, y + c.y, 0.020 + c.z), 0.005, 0.002,
               SECO, sides=4)


add('hojas_grandes_caidas', hojas_grandes_caidas)


# ---------------------------------------------------------------- salida
def tri_count(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


missing = [n for n in NAMES if n not in {o.name for o in parts}]
assert not missing, f'faltan: {missing}'
assert len(parts) == 18

total = 0
for o in parts:
    t = tri_count(o)
    total += t
    assert t <= 250, f'{o.name}: {t} triangulos'
    zs = [v.co.z for v in o.data.vertices]
    assert abs(min(zs)) < 1e-4, f'{o.name}: no apoya en z=0 ({min(zs):.3f})'
    assert max(zs) < 0.20, f'{o.name}: demasiado alta para detalle no bloqueante ({max(zs):.2f})'
assert total < 4000, f'detalle total: {total} triangulos'
print('total triangulos:', total)
for o in parts:
    xs = [v.co.x for v in o.data.vertices]
    ys = [v.co.y for v in o.data.vertices]
    zs = [v.co.z for v in o.data.vertices]
    print(f'{o.name}: {tri_count(o)} tris, {max(xs)-min(xs):.2f}x{max(ys)-min(ys):.2f}x{max(zs):.2f} m')

bpy.ops.object.select_all(action='DESELECT')
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
out = str(MODEL_OUT)
scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True,
                          export_animations=False, use_active_scene=True,
                          export_materials='EXPORT', export_image_format='AUTO')
print(f'exportado {out} ({os.path.getsize(out)} bytes)')
blend = str(BLEND_OUT)
bpy.ops.wm.save_as_mainfile(filepath=blend, copy=True)
print('blend:', blend)
print('detalle_suelo: OK', len(parts), 'nodos')
