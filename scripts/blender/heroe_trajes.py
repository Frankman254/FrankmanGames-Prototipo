# MOD-04: viste a los seis héroes anime con piezas propias al estilo de La Espeja.
#
#   Blender -b --factory-startup --python scripts/blender/heroe_trajes.py -- [clase ...] [--salida DIR]
#
# Parte del GLB de producción (rig, clips, piel y piezas que se tiñen) y le añade:
#   Traje  – ropa que sigue a la piel (pesos copiados del vértice de piel más cercano)
#   Banda / Yelmo – tocado rígido a la cabeza; el juego lo oculta al equipar algo en la cabeza
#   Capa  – pieza de espalda; el juego la oculta al equipar algo en la espalda
# Material único por clase (`heroe_<id>_traje`) con una paleta 8×8 de color plano.
# Diseños propios (clean-room): Vanguardia de Brasa, Tejedora de Tormentas y Cazador del Manglar.
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fg_traje as T  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
MODELOS = os.path.join(RAIZ, 'assets', 'models')
HEROES = ('centinela', 'centinela_f', 'oraculo', 'oraculo_f', 'cazador', 'cazador_f')
TAU = 2 * math.pi

PALETAS = {
    'centinela': {
        'acero': ('#5b5f6b', 0.35, 0.85), 'acero_claro': ('#9aa0ad', 0.3, 0.9), 'oro': ('#e0a526', 0.3, 0.9),
        'rojo': ('#b3261e', 0.7, 0), 'rojo_osc': ('#6e1414', 0.75, 0), 'cuero': ('#6b4026', 0.8, 0),
        'cuero_osc': ('#3e2416', 0.85, 0), 'brasa': ('#ff6a1a', 0.4, 0, 3.0), 'llama': ('#ffc53d', 0.4, 0, 3.5),
        'tela': ('#f2e2c4', 0.85, 0), 'negro': ('#1d1a1c', 0.6, 0),
    },
    'oraculo': {
        'blanco': ('#f7f4ee', 0.85, 0), 'azul': ('#2457c5', 0.7, 0), 'azul_osc': ('#16245e', 0.7, 0),
        'celeste': ('#7fd0ff', 0.6, 0), 'rayo': ('#fff27a', 0.4, 0, 3.0), 'rosa': ('#ff5fa2', 0.7, 0),
        'rojo': ('#e5322d', 0.7, 0), 'verde': ('#2fb36b', 0.7, 0), 'amarillo': ('#ffd23d', 0.7, 0),
        'oro': ('#e8b23a', 0.3, 0.9), 'perla': ('#fff8e8', 0.25, 0.1), 'morado': ('#7a3fd1', 0.7, 0),
        'naranja': ('#ff8a2b', 0.7, 0), 'negro': ('#1c1a26', 0.6, 0),
    },
    'cazador': {
        'cuero': ('#8a5a35', 0.8, 0), 'cuero_osc': ('#4f3220', 0.85, 0), 'paja': ('#efe2bf', 0.8, 0),
        'negro': ('#1e1b18', 0.75, 0), 'verde': ('#3f7d3a', 0.75, 0), 'verde_osc': ('#244a26', 0.8, 0),
        'musgo': ('#8fb34a', 0.8, 0), 'rojo': ('#c4392b', 0.75, 0), 'tela': ('#e9dcc0', 0.85, 0),
        'oro': ('#d9a53a', 0.35, 0.8), 'madera': ('#9c6b3c', 0.7, 0), 'pluma': ('#f4f1e8', 0.8, 0),
        'pluma_r': ('#e8553b', 0.8, 0), 'turquesa': ('#2bb3a3', 0.6, 0),
    },
}


# ------------------------------------------------------------------ carga del héroe
def cargar(heroe):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELOS, f'{heroe}_anime.glb'))
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    ad = arm.animation_data
    if ad:
        ad.action = None
    for pb in arm.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH' and o.name.split('.')[0] in ('Traje', 'Banda', 'Yelmo', 'Capa'):
            bpy.data.objects.remove(o)  # vuelve a generarse
    objs = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}
    cuerpo = T.Cuerpo(arm, [objs['Piel']])
    ropa = T.Cuerpo(arm, [objs[n] for n in ('Piel', 'Ropa', 'Ropa2') if n in objs])
    return arm, objs, cuerpo, ropa


class Medidas:
    """Cotas en pose de reposo que usan los diseños."""

    def __init__(self, arm, objs, cuerpo):
        self.b = {n: T.Cuerpo.hueso(cuerpo, n) for n in T.HUESOS}
        pelo = objs['Pelo_short']
        bb = [pelo.matrix_world @ Vector(c) for c in pelo.bound_box]
        self.pelo_min = Vector([min(p[i] for p in bb) for i in range(3)])
        self.pelo_max = Vector([max(p[i] for p in bb) for i in range(3)])
        hy = self.b['head'][0].y
        # el pelo se alarga hacia la nuca: el frente es el lado contrario
        self.frente = -1.0 if (self.pelo_max.y - hy) > (hy - self.pelo_min.y) else 1.0
        self.a_frente = math.atan2(self.frente, 0)  # ángulo del frente (eje vertical)
        # cabeza: en los chicos la cabeza entera es Cara_N; en las chicas, la piel
        cara = objs['Cara_0']
        pts = [cara.matrix_world @ v.co for v in cara.data.vertices]
        pts += [Vector(p) for p, d in zip(cuerpo.p, cuerpo.dom) if d == 'head']
        lo = Vector([min(p[i] for p in pts) for i in range(3)])
        hi = Vector([max(p[i] for p in pts) for i in range(3)])
        self.cabeza_top = hi.z
        self.cabeza_c = (lo + hi) / 2
        self.cabeza_r = max(hi.x - lo.x, hi.y - lo.y) / 2
        self.hips = self.b['hips'][0].z
        self.chest = self.b['chest'][0].z
        self.cuello = self.b['head'][0].z
        self.hombro = self.b['upperArmL'][0]
        self.rodilla = self.b['shinL'][0].z
        self.cy = self.b['hips'][0].y

    def fy(self, d):
        return self.frente * d


def frente_rot(med):
    """Rotación que lleva +Y local al frente del héroe."""
    return Matrix.Identity(3) if med.frente > 0 else Matrix.Rotation(math.pi, 3, 'Z')


# ------------------------------------------------------------------ piezas comunes
def faja(m, cuerpo, med, z, alto, off, col, col_borde=None):
    T.tronco(m, cuerpo, z - alto / 2, z + alto / 2, 2, off,
             (lambda i, j: col_borde if col_borde and i in (0, 1) and j % 2 else col), huesos=('hips', 'spine'))


def peso_falda(cuerpo, f=0.5):
    return T.suave(cuerpo.pesador(solo=T.CADERA, k=10), 'hips', f)


def falda(m, cuerpo, med, z0, largo, vuelo, colores, n=32, pasos=6, rx=None, ry=None, ondas=0, peso=None):
    """Falda/faldón con perfil elíptico que se abre hacia abajo; colores(i, j) por cara."""
    hips = Vector((0, med.cy, z0))
    u, v, r = cuerpo.radios(hips, (0, 0, 1), {'hips', 'spine', 'thighL', 'thighR'}, dz=0.03)
    rows = []
    for i in range(pasos + 1):
        k = i / pasos
        row = []
        for s in range(n):
            a = TAU * s / n
            rr = T._interp(r, a) + 0.025 + vuelo * (k ** 1.3)
            if ondas:
                rr += 0.012 * k * math.sin(a * ondas)
            row.append(Vector((math.cos(a) * rr * (rx or 1), med.cy + math.sin(a) * rr * (ry or 1), z0 - largo * k)))
        rows.append(row)
    m.grid(rows, colores, peso or peso_falda(cuerpo))
    return lambda a, k: T._interp(r, a) + 0.025 + vuelo * (k ** 1.3)


def hombrera(m, cuerpo, med, lado, r, capas, cols, alto=0.0):
    h = med.b['upperArm' + lado][0]
    sx = 1 if lado == 'L' else -1
    for k in range(capas):
        c = h + Vector((sx * (0.01 + 0.03 * k), 0, 0.03 + alto - 0.045 * k))
        rot = Matrix.Rotation(sx * math.radians(-20 - 12 * k), 3, 'Y')
        m.esfera(c, (r * (1 - 0.08 * k), r * 0.95 * (1 - 0.05 * k), r * 0.62), cols[k % len(cols)],
                 T.mezcla(('upperArm' + lado, 0.75), ('chest', 0.25)), rot=rot, seg=14, anillos=5, lat=(-5, 90))


def brazal(m, cuerpo, lado, col, col2, off=0.016, t0=0.4, t1=0.95):
    T.funda(m, cuerpo, 'foreArm' + lado, t0, t1, 3, off, lambda i, j: col2 if i == 2 else col,
            extra=lambda k: 0.012 * k, n=14, peso=T.rigido('foreArm' + lado))


def greba(m, cuerpo, lado, col, col2, off=0.02, t0=0.08, t1=0.72):
    T.funda(m, cuerpo, 'shin' + lado, t0, t1, 4, off, lambda i, j: col2 if i in (0, 3) else col,
            extra=lambda k: 0.01 * (1 - k), n=14, peso=T.rigido('shin' + lado))


def pompon(m, c, r, col, peso):
    m.ico(c, r, col, peso, sub=2)


def plumas(m, med, base, n, largo, cols, peso, abre=0.5, inclina=0.0):
    for k in range(n):
        a = (k - (n - 1) / 2) * abre / max(n - 1, 1)
        d = Vector((math.sin(a), math.sin(inclina) * -med.frente, math.cos(a)))
        pts = [base + d * largo * t + Vector((0, 0, 0.02 * math.sin(t * math.pi))) for t in (0, 0.33, 0.66, 1)]
        m.cinta(pts, lambda t: 0.035 * math.sin(math.pi * min(0.15 + t, 1)) + 0.006, (0, med.frente, 0),
                cols[k % len(cols)], peso, grosor=0.006)


def cuello_volante(m, cuerpo, med, z, cols, off=0.02, alto=0.06, ondas=12):
    c = Vector((0, med.cy, z))
    u, v, r = cuerpo.radios(c, (0, 0, 1), {'chest', 'upperArmL', 'upperArmR', 'head'}, dz=0.025)
    T.volante(m, c, lambda a: T._interp(r, a) + off, (lambda i, j: cols[j // 3 % len(cols)]),
              cuerpo.pesador(solo=('chest', 'upperArmL', 'upperArmR'), k=8), ondas=ondas, alto=alto, caida=0.9,
              amp=0.014)


# ------------------------------------------------------------------ Vanguardia de Brasa
def centinela(m, banda, capa, cuerpo, ropa, med, fem):
    F = med.a_frente
    zc, zh = med.chest, med.hips
    # peto en dos tonos con ribete dorado arriba y abajo
    T.tronco(m, ropa, zh + 0.10, zc + 0.12, 5, 0.022,
             lambda i, j: 'oro' if i in (0, 4) else ('acero_claro' if i % 2 else 'acero'), huesos=('spine', 'chest'), n=28)
    # emblema de brasa en el pecho
    pe = Vector((0, med.cy, zc + 0.03))
    u, v, r = ropa.radios(pe, (0, 0, 1), {'chest'}, dz=0.03)
    dist = T._interp(r, F) + 0.04
    em = pe + Vector((0, med.frente * dist, 0))
    m.ico(em, 0.05, 'oro', T.rigido('chest'), sub=1, escala=(1, 0.35, 1.15), smooth=False)
    m.ico(em + Vector((0, med.frente * 0.016, 0.005)), 0.032, 'brasa', T.rigido('chest'), sub=2, escala=(1, 0.4, 1.3))
    # fajín rojo con nudo y colas al costado
    faja(m, ropa, med, zh + 0.07, 0.07, 0.03, 'rojo', 'rojo_osc')
    lado = Vector((0.13 if not fem else 0.12, med.cy + med.fy(0.06), zh + 0.07))
    m.ico(lado, 0.04, 'rojo_osc', T.rigido('hips'), sub=1, escala=(0.8, 0.6, 1))
    for k, dx in enumerate((0.0, 0.035)):
        pts = [lado + Vector((dx, 0, -0.02 - 0.08 * t)) + Vector((0.02 * t * t, med.fy(0.02 * t), 0)) for t in (0, 1, 2, 3)]
        m.cinta(pts, 0.045, (0, med.frente, 0), 'rojo' if k == 0 else 'rojo_osc', T.mezcla(('hips', 0.6), ('thighL', 0.4)),
                grosor=0.006)
    # faldones: falda de placas que se abre
    falda(m, ropa, med, zh + 0.03, 0.26 if not fem else 0.22, 0.07, lambda i, j: (
        'oro' if i == 5 else ('cuero_osc' if j % 4 == 0 else ('rojo' if j % 4 == 2 else 'cuero'))), pasos=6, n=32)
    # hombreras de tres láminas
    for L in 'LR':
        hombrera(m, cuerpo, med, L, 0.11 if not fem else 0.095, 3, ['acero_claro', 'acero', 'oro'])
        m.ico(med.b['upperArm' + L][0] + Vector(((0.1 if L == 'L' else -0.1), 0, 0.07)), 0.025, 'brasa',
              T.mezcla(('upperArm' + L, 0.75), ('chest', 0.25)), sub=1)
        brazal(m, cuerpo, L, 'acero', 'oro')
        greba(m, cuerpo, L, 'acero', 'oro')
        # rodillera
        kn = med.b['shin' + L][0]
        m.esfera(kn + Vector((0, med.fy(0.06), 0.0)), (0.06, 0.035, 0.065), 'acero_claro', T.rigido('shin' + L), seg=10,
                 anillos=5)
    # Banda: diadema con cresta de llamas
    hc = Vector((med.cabeza_c.x, med.cabeza_c.y, med.cabeza_top - 0.045))
    rr = med.cabeza_r + 0.012
    rows = []
    for zz in (hc.z - 0.022, hc.z + 0.022):
        rows.append([Vector((hc.x + math.cos(a) * rr, hc.y + math.sin(a) * rr, zz)) for a in [TAU * s / 28 for s in range(28)]])
    rows.insert(1, [Vector((hc.x + math.cos(a) * (rr + 0.01), hc.y + math.sin(a) * (rr + 0.01), hc.z)) for a in [TAU * s / 28 for s in range(28)]])
    banda.grid(rows, lambda i, j: 'rojo' if i == 0 else 'oro', T.rigido('head'))
    frente = Vector((hc.x, hc.y + med.fy(rr + 0.012), hc.z + 0.01))
    banda.ico(frente, 0.03, 'brasa', T.rigido('head'), sub=1, escala=(1, 0.5, 1.2))
    for k, (dx, h, col) in enumerate(((0, 0.17, 'llama'), (-0.04, 0.12, 'brasa'), (0.04, 0.12, 'brasa'),
                                      (-0.075, 0.08, 'rojo'), (0.075, 0.08, 'rojo'))):
        base = frente + Vector((dx, med.fy(-0.01), 0.02))
        pts = [base + Vector((dx * 0.5 * t, med.fy(-0.03 * t), h * t)) for t in (0, 0.35, 0.7, 1)]
        banda.tube(pts, lambda t: 0.022 * (1 - t) + 0.002, 6, col, T.rigido('head'))
    # Capa: medio manto rojo con forro, desde los hombros hasta la cintura baja
    a0, a1 = F + math.pi - 1.25, F + math.pi + 1.25
    rows = []
    for i in range(6):
        k = i / 5
        z = zc + 0.17 - (zc + 0.17 - (zh - 0.18)) * k
        c = Vector((0, med.cy, max(z, zc - 0.02)))
        base = T.anillo(ropa, c, (0, 0, 1), {'chest', 'spine', 'upperArmL', 'upperArmR'}, 0.05 + 0.02 * k, n=12,
                        arco=(a0, a1), dz=0.03)
        rows.append([Vector((p.x * (1 + 0.3 * k), p.y + med.fy(-0.12 * k * k), z)) for p in base])
    capa.grid(rows, lambda i, j: 'oro' if i == 0 else ('rojo_osc' if i == 5 else 'rojo'),
              ropa.pesador(solo=('chest', 'spine', 'hips'), k=12), closed=False)
    # broches
    for sx in (1, -1):
        capa.ico(Vector((sx * 0.12, med.cy + med.fy(0.02), zc + 0.15)), 0.028, 'oro', T.rigido('chest'), sub=1)


# ------------------------------------------------------------------ Tejedora de Tormentas
MOLA = ['rojo', 'amarillo', 'verde', 'azul', 'rosa', 'naranja']


def oraculo(m, banda, capa, cuerpo, ropa, med, fem):
    F = med.a_frente
    zc, zh = med.chest, med.hips
    # blusa/túnica con bandas de mola
    T.tronco(m, ropa, zh - 0.02, zc + 0.10, 5, 0.018,
             lambda i, j: (MOLA[j % 6] if i == 1 else ('azul_osc' if i == 0 else 'blanco')), huesos=('hips', 'spine', 'chest'), n=30)
    cuello_volante(m, ropa, med, zc + 0.11, ['blanco', 'celeste', 'blanco', 'azul'], off=0.03, alto=0.07 if fem else 0.05)
    cuello_volante(m, ropa, med, zc + 0.01, ['azul'], off=0.035, alto=0.05, ondas=14)
    # faja con lazo
    faja(m, ropa, med, zh + 0.02, 0.06, 0.03, 'azul', 'oro')
    lazo_c = Vector((0, med.cy + med.fy(0.16 if fem else 0.15), zh + 0.02))
    for sx in (1, -1):
        m.ico(lazo_c + Vector((sx * 0.055, 0, 0.005)), 0.05, 'rosa' if fem else 'azul_osc', T.rigido('hips'), sub=1,
              escala=(1.1, 0.45, 0.7))
    m.ico(lazo_c, 0.025, 'oro', T.rigido('hips'), sub=1)
    if fem:
        # pollera: tres pisos de volantes, cada uno con banda de mola
        largo = med.hips - med.rodilla + 0.12
        rf = falda(m, ropa, med, zh + 0.0, largo, 0.20, lambda i, j: (
            MOLA[(j // 2) % 6] if i in (2, 5) else ('azul' if i == 8 else 'blanco')), pasos=8, n=40,
                   peso=peso_falda(ropa, 0.35))
        for kk, cols in ((0.30, ['blanco', 'celeste']), (0.63, ['blanco', 'rosa']), (0.97, ['azul', 'blanco'])):
            T.volante(m, Vector((0, med.cy, zh - largo * kk)), lambda a, kk=kk: rf(a, kk) + 0.012,
                      lambda i, j, c=cols: c[(j // 4) % 2], peso_falda(ropa, 0.35), ondas=12, alto=0.08, caida=0.9,
                      segs=48, amp=0.016)
        # pompones colgando del último volante
        for s in range(12):
            a = TAU * s / 12
            rr = rf(a, 1.0) + 0.07
            p = Vector((math.cos(a) * rr, med.cy + math.sin(a) * rr, zh - largo - 0.09))
            pompon(m, p, 0.024, MOLA[s % 6], peso_falda(ropa, 0.35))
    else:
        # túnica larga abierta a los lados
        largo = med.hips - med.rodilla + 0.05
        falda(m, ropa, med, zh + 0.0, largo, 0.11, lambda i, j: (
            MOLA[(j // 2) % 6] if i == 5 else ('azul_osc' if i == 6 else ('azul' if j % 8 in (0, 1) else 'blanco'))),
              pasos=6, n=32)
    # mangas acampanadas con rayo
    for L in 'LR':
        T.funda(m, ropa, 'foreArm' + L, 0.15, 0.85, 4, 0.016, lambda i, j: 'celeste' if i == 3 else 'blanco',
                extra=lambda k: 0.06 * k * k, n=16)
        brazal(m, cuerpo, L, 'azul', 'oro', t0=0.8, t1=1.0, off=0.012)
    # Banda: tocado de pompones y peinetas de rayo
    hc = Vector((med.cabeza_c.x, med.cabeza_c.y, med.cabeza_top - 0.05))
    rr = med.cabeza_r + 0.015
    ring = []
    for s in range(14):
        a = F + math.pi * (0.55 + 0.9 * s / 13)  # arco por detrás y los lados
        p = Vector((hc.x + math.cos(a) * rr, hc.y + math.sin(a) * rr, hc.z + 0.03 * math.sin(math.pi * s / 13)))
        ring.append(p)
    banda.tube(ring, 0.013, 6, 'oro', T.rigido('head'))
    for s, p in enumerate(ring[::2]):
        banda.ico(p + (p - hc).normalized() * 0.02, 0.03 if fem else 0.024, ['rosa', 'amarillo', 'celeste', 'rojo', 'verde',
                                                                               'morado', 'naranja'][s % 7], T.rigido('head'), sub=2)
    for sx in (1, -1):  # peinetas en zigzag
        base = Vector((hc.x + sx * (rr * 0.8), hc.y - med.fy(0.02), hc.z + 0.04))
        pts = [base + Vector((sx * 0.025 * (t % 2), 0, 0.045 * t)) for t in range(4)]
        banda.tube(pts, 0.009, 5, 'rayo', T.rigido('head'))
        banda.ico(pts[-1], 0.018, 'perla', T.rigido('head'), sub=1)
    if fem:  # cintas que caen por detrás
        for k, col in enumerate(('azul', 'rosa', 'celeste')):
            b = Vector((hc.x + (k - 1) * 0.04, hc.y - med.fy(rr), hc.z - 0.02))
            pts = [b + Vector((0.01 * math.sin(t * 2 + k), -med.fy(0.02 * t), -0.07 * t)) for t in range(5)]
            banda.cinta(pts, 0.03, (0, -med.frente, 0), col, T.rigido('head'), grosor=0.004)
    # Capa: chal de tormenta, corto
    a0, a1 = F + math.pi - 1.05, F + math.pi + 1.05
    rows = []
    for i in range(5):
        k = i / 4
        z = zc + 0.08 - 0.32 * k
        base = T.anillo(ropa, Vector((0, med.cy, max(z, zc - 0.05))), (0, 0, 1),
                        {'chest', 'spine', 'upperArmL', 'upperArmR'}, 0.06 + 0.03 * k, n=14, arco=(a0, a1), dz=0.03)
        rows.append([Vector((p.x * (1 + 0.12 * k), p.y, z)) for p in base])
    capa.grid(rows, lambda i, j: ('rayo' if (i == 1 + j % 2) else ('azul_osc' if i == 3 else 'azul')),
              ropa.pesador(solo=('chest', 'spine'), k=12), closed=False)


# ------------------------------------------------------------------ Cazador del Manglar
def cazador(m, banda, capa, cuerpo, ropa, med, fem):
    F = med.a_frente
    zc, zh = med.chest, med.hips
    # camisa de faena
    T.tronco(m, ropa, zh + 0.02, zc + 0.08, 4, 0.012, 'tela', huesos=('hips', 'spine', 'chest'), n=24)
    # chaleco abierto por delante, con flecos
    ab = (F + 0.42, F + TAU - 0.42)
    rows_ids = T.tronco(m, ropa, zh - 0.04, zc + 0.11, 5, 0.042,
                        lambda i, j: 'cuero_osc' if j in (0, 1, 18, 19) else ('verde' if i == 4 else 'cuero'),
                        huesos=('hips', 'spine', 'chest'), n=20, arco=ab)
    for s in range(1, 20):
        a = ab[0] + (ab[1] - ab[0]) * s / 20
        p0 = T.anillo(ropa, Vector((0, med.cy, zh - 0.04)), (0, 0, 1), {'hips', 'spine'}, 0.03, n=1, arco=(a, a + 1e-3))[0]
        pts = [p0 + Vector((0, 0, -0.035 * t)) + (p0 - Vector((0, med.cy, p0.z))).normalized() * 0.004 * t for t in (0, 1, 2)]
        m.cinta(pts, 0.016, (math.cos(a), math.sin(a), 0), 'cuero_osc' if s % 2 else 'cuero', peso_falda(ropa, 0.6))
    # cinturón con hebilla y bolsas
    faja(m, ropa, med, zh + 0.03, 0.045, 0.035, 'cuero_osc')
    hb = Vector((0, med.cy + med.fy(0.0), zh + 0.03))
    u, v, r = ropa.radios(hb, (0, 0, 1), {'hips', 'spine'}, dz=0.03)
    hb.y += med.fy(T._interp(r, F) + 0.045)
    m.caja(hb, (0.05, 0.012, 0.04), 'oro', T.rigido('hips'), bisel=0.004)
    for sx in (1, -1):
        a = F + sx * 1.15
        p = Vector((math.cos(a) * (T._interp(r, a) + 0.065), med.cy + math.sin(a) * (T._interp(r, a) + 0.065), zh - 0.01))
        m.caja(p, (0.07, 0.04, 0.08), 'cuero', T.rigido('hips'), rot=Matrix.Rotation(a - math.pi / 2, 3, 'Z'), bisel=0.01)
        m.caja(p + Vector((0, 0, 0.035)), (0.075, 0.045, 0.025), 'cuero_osc', T.rigido('hips'),
               rot=Matrix.Rotation(a - math.pi / 2, 3, 'Z'), bisel=0.008)
    # pañuelo al cuello con nudo y puntas
    T.tronco(m, ropa, zc + 0.16, zc + 0.205, 2, 0.022, 'rojo', huesos=('chest', 'head'), n=20)
    nk = Vector((0, med.cy, zc + 0.17))
    u, v, r = ropa.radios(nk, (0, 0, 1), {'chest', 'head'}, dz=0.03)
    nk.y += med.fy(T._interp(r, F) + 0.03)
    m.ico(nk, 0.03, 'rojo', T.rigido('chest'), sub=1)
    for sx in (1, -1):
        pts = [nk + Vector((sx * 0.02 * t, med.fy(0.01 * t), -0.04 * t)) for t in (0, 1, 2, 3)]
        m.cinta(pts, lambda t: 0.05 * (1 - t) + 0.005, (0, med.frente, 0), 'rojo', T.rigido('chest'), grosor=0.004)
    # brazales y polainas de cuero con correas
    for L in 'LR':
        brazal(m, cuerpo, L, 'cuero', 'cuero_osc', t0=0.45, t1=0.98)
        T.funda(m, ropa, 'shin' + L, 0.1, 0.8, 6, 0.018, lambda i, j: 'cuero_osc' if i % 2 else 'verde_osc',
                n=14, peso=T.rigido('shin' + L))
    # Yelmo: sombrero de ala ancha con trenza clara y franjas oscuras
    hp = med.pelo_max
    hc = Vector((med.cabeza_c.x, med.cabeza_c.y, med.cabeza_top - 0.04))
    rc = max(med.cabeza_r + 0.03, (med.pelo_max.x - med.pelo_min.x) / 2 * 0.95)
    rows = []
    perfil = [(rc + 0.17, -0.005), (rc + 0.16, 0.012), (rc + 0.02, 0.012), (rc, 0.02), (rc * 0.98, 0.09),
              (rc * 0.9, 0.13), (rc * 0.55, 0.15), (0.001, 0.155)]
    for rr, dz in perfil:
        rows.append([Vector((hc.x + math.cos(TAU * s / 32) * rr, hc.y + math.sin(TAU * s / 32) * rr * 1.04,
                             hc.z + dz + (0.02 * (rr / (rc + 0.17)) ** 3 if rr > rc + 0.05 else 0))) for s in range(32)])
    banda.grid(rows, lambda i, j: (
        'negro' if i in (0, 4) and j % 2 == 0 else ('paja' if i != 3 else 'negro')), T.rigido('head'))
    # ala inferior (cierra el disco)
    banda.grid([rows[0], [Vector((p.x, p.y, p.z - 0.01)) for p in rows[2]]],
               lambda i, j: 'paja' if j % 2 else 'negro', T.rigido('head'), flip=True)
    # pluma
    plumas(banda, med, Vector((hc.x + rc * 0.9, hc.y - med.fy(0.02), hc.z + 0.06)), 2, 0.16,
           ['pluma_r', 'pluma'], T.rigido('head'), abre=0.4, inclina=0.5)
    # Capa: carcaj de madera con flechas, cruzado a la espalda
    bk = Vector((0.0, med.cy - med.fy(0.0), zc))
    u, v, r = ropa.radios(bk, (0, 0, 1), {'chest', 'spine'}, dz=0.03)
    dd = T._interp(r, F + math.pi) + 0.06
    c0 = Vector((-0.07, med.cy - med.fy(dd), zc - 0.17))
    c1 = Vector((0.09, med.cy - med.fy(dd + 0.02), zc + 0.2))
    eje = [c0.lerp(c1, t) for t in (0, 0.33, 0.66, 1)]
    capa.tube(eje, 0.055, 12, lambda i, j: 'cuero_osc' if i in (0, 2) else 'cuero', T.rigido('chest'))
    d = (c1 - c0).normalized()
    for k in range(5):
        off = Vector(((k % 3 - 1) * 0.022, (k // 3 - 0.5) * 0.02, 0))
        p0 = c1 + off - d * 0.05
        p1 = p0 + d * 0.16
        capa.tube([p0, p1], 0.005, 4, 'madera', T.rigido('chest'))
        capa.cinta([p1 - d * 0.06, p1], 0.035, (1, 0, 0), ['pluma_r', 'pluma', 'turquesa'][k % 3], T.rigido('chest'))


DISENOS = {'centinela': centinela, 'oraculo': oraculo, 'cazador': cazador}


def exportar(arm, ruta):
    T.reconstruir_nla(arm)
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=ruta, export_format='GLB', use_selection=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_apply=False, export_materials='EXPORT',
                              export_image_format='AUTO', export_yup=True)


def vestir(heroe, salida):
    clase = heroe.split('_')[0]
    fem = heroe.endswith('_f')
    arm, objs, cuerpo, ropa = cargar(heroe)
    med = Medidas(arm, objs, cuerpo)
    pal = T.Paleta(PALETAS[clase])
    mat = pal.material(f'heroe_{heroe}_traje', pal.imagenes(f'heroe_{heroe}_traje'), brilla=True)
    m, banda, capa = T.Malla(pal), T.Malla(pal), T.Malla(pal)
    DISENOS[clase](m, banda, capa, cuerpo, ropa, med, fem)
    nombre_cabeza = 'Yelmo' if clase == 'cazador' else 'Banda'
    piezas = [m.objeto('Traje', arm, mat)]
    if banda.v:
        piezas.append(banda.objeto(nombre_cabeza, arm, mat))
    if capa.v:
        piezas.append(capa.objeto('Capa', arm, mat))
    for o in piezas:
        print(f'  {heroe}: {o.name} {len(o.data.polygons)} caras')
    ruta = os.path.join(salida, f'{heroe}_anime.glb')
    exportar(arm, ruta)
    print('exportado', ruta)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    salida = MODELOS
    if '--salida' in argv:
        i = argv.index('--salida')
        salida = argv[i + 1]
        del argv[i:i + 2]
    os.makedirs(salida, exist_ok=True)
    for h in (argv or HEROES):
        vestir(h, salida)


main()
