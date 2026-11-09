# Centinela del Istmo (ficha del creador, «Vanguardia protectora»), masculino y femenino.
# Camisa de lino, pantalón cargo oliva, botas altas, faja coral con cenefa, manto
# turquesa con broche de sol, lanza con cintas y escudo de rombos.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/centinela.py
# Por MCP: exec(...) con {'__name__': '__main__'}. Con `-- f` o `-- m` hace solo uno.
# Escribe assets/models/centinela.glb y centinela_f.glb; texturas en
# assets/textures/personajes/heroes/ (horneadas de las pintadas de fg_pintura).
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector

try:
    sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
except NameError:
    sys.path.insert(0, r'C:\Users\frank\Desktop\2026\FrankmanGames-Prototipo\scripts\blender')
import fg_heroe as H
from fg_heroe import mat, liso
from fg_rig import p


def side(s):
    return 1 if s == 'L' else -1


def construir(sexo):
    f = sexo == 'f'
    nombre = 'centinela_f' if f else 'centinela'
    h = H.Heroe(nombre, sexo=sexo, piel='piel_canela', piel_hex='#c98d66', pelo='pelo_negro',
                iris='#6a3a1a', pintura=None if f else ('#b4402e', -1))
    rnd = random.Random(1508 + f)
    CAMISA = mat(f'{nombre}_camisa', 'tela_lino')
    PANT = mat(f'{nombre}_pant', 'tela_oliva')
    BOTA = mat(f'{nombre}_bota', 'cuero_castano', rough=0.7)
    CUERO_OSC = mat(f'{nombre}_cuero_osc', 'cuero_oscuro', rough=0.75)
    FAJA = mat(f'{nombre}_faja', 'tela_coral')
    MOLA = mat(f'{nombre}_mola', 'mola_coral_zigzag', doble=True)
    MANTO = mat(f'{nombre}_manto', 'tela_turquesa', doble=True)
    MOLA_M = mat(f'{nombre}_mola_manto', 'mola_turquesa_escalones', doble=True)
    ORO = mat(f'{nombre}_oro', 'oro_pintado', rough=0.4, metal=0.3)
    VENDA = mat(f'{nombre}_venda', 'tela_lino', rough=0.9)
    h.mats = {'piel': h.piel, 'camisa': CAMISA, 'pant': PANT, 'bota': BOTA, 'brazal': CUERO_OSC}

    # ---------------------------------------------------------- cuerpo y ropa
    def zonas(b, c):
        if b.startswith('foot') or (b.startswith('shin') and c.z < 0.4):
            return 'bota'
        if b.startswith(('thigh', 'shin')) or (b == 'hips' and c.z < 0.97):
            return 'pant'
        if b.startswith('foreArm') and 0.86 < c.z < 0.99:
            return 'brazal'
        if b.startswith(('hand', 'foreArm')) or b == 'head' or c.z > 1.33:
            return 'piel'
        if b.startswith('upperArm') and c.z < 1.08:
            return 'piel'
        return 'camisa'
    cortes = [0.4, 0.97, 1.33, 0.86, 0.99, 1.08]
    h.cuerpo(zonas, {'bota': 0.016, 'pant': 0.012, 'camisa': 0.007, 'brazal': 0.008}, cortes)
    h.cabeza()

    x = h.figura('Ropa')
    # Puño de la manga remangada con cenefa, en el codo.
    for s in ('L', 'R'):
        k = side(s)
        arm = {'upperArm' + s: 1.0, 'foreArm' + s: 0.3}
        x.loft([((0.236 * k, 0, 1.1), 0.062 if not f else 0.056, 0.06 if not f else 0.054), ((0.242 * k, 0, 1.075), 0.064 if not f else 0.058, 0.062 if not f else 0.056)],
               CAMISA, arm, sides=14, urep=3)
        x.loft([((0.243 * k, 0, 1.078), 0.066 if not f else 0.06, 0.064 if not f else 0.058), ((0.246 * k, 0, 1.055), 0.064 if not f else 0.058, 0.062 if not f else 0.056)],
               MOLA, arm, sides=14, urep=3)
        # Vendas en la muñeca.
        fore = {'foreArm' + s: 1.0, 'hand' + s: 0.3}
        x.loft([((0.265 * k, -0.026, 0.865), 0.036, 0.033), ((0.268 * k, -0.03, 0.835), 0.035, 0.032)], VENDA, fore, sides=12, urep=2, vlen=0.05)
        for z in (0.95, 0.9):
            x.loft([((0.258 * k, -0.02, z + 0.007), 0.05, 0.047), ((0.258 * k, -0.02, z - 0.007), 0.05, 0.047)], CUERO_OSC, fore, sides=12, urep=3)
        # Botas: vuelta, tres correas con hebilla.
        shin = {'shin' + s: 1.0}
        x.loft([((0.1 * k, 0, 0.43), 0.08, 0.082), ((0.1 * k, 0, 0.39), 0.078, 0.08)], CUERO_OSC, shin, sides=16, urep=3)
        for z in (0.16, 0.24, 0.32):
            r = 0.062 + (z - 0.16) * 0.06
            x.loft([((0.1 * k, 0.002, z + 0.012), r, r + 0.003), ((0.1 * k, 0.002, z - 0.012), r, r + 0.003)], CUERO_OSC, shin, sides=16, urep=4)
            x.box((0.1 * k + r * k * 0.98, -0.01, z), (0.008, 0.024, 0.028), ORO, shin)
        # Suela.
        foot = {'foot' + s: 1.0}
        x.loft([((0.1 * k, 0.07, 0.012), 0.05, 0.012), ((0.1 * k, -0.02, 0.012), 0.062, 0.012), ((0.1 * k, -0.15, 0.014), 0.055, 0.014), ((0.1 * k, -0.2, 0.017), 0.035, 0.012)],
               CUERO_OSC, foot, sides=10, xdir=(1, 0, 0), cap0=True, cap1=True, urep=2, vlen=0.15)
        # Bolsillos cargo en el muslo.
        if not f or s == 'R':
            th = {'thigh' + s: 1.0}
            x.box((0.19 * k, 0.0, 0.66), (0.035, 0.12, 0.13), PANT, th, rot=Matrix.Rotation(math.radians(-3 * k), 3, 'Y'), uvm=0.2)
            x.box((0.2 * k, 0.0, 0.715), (0.022, 0.126, 0.042), PANT, th, uvm=0.2)
            x.box((0.212 * k, 0.0, 0.708), (0.006, 0.016, 0.014), ORO, th)

    # Faja coral, cinturones, hebillas y bolsas.
    waist = {'hips': 1.0, 'spine': 0.4}
    rx, ry = (0.165, 0.12) if f else (0.16, 0.118)
    x.band([(0.88, rx, ry), (0.92, rx + 0.004, ry + 0.004), (0.96, rx, ry), (1.0, rx - 0.008, ry - 0.006)], FAJA, waist, sides=24, urep=5)
    x.band([(0.97, rx + 0.012, ry + 0.012), (1.005, rx + 0.006, ry + 0.01)], CUERO_OSC, waist, sides=24, urep=6)
    x.box((0, -ry - 0.016, 0.987), (0.05, 0.012, 0.042), ORO, 'hips', uvm=0.05)
    x.band([(0.88, rx + 0.02, ry + 0.022, (0, 0)), (0.91, rx + 0.02, ry + 0.022, (0, 0))], CUERO_OSC, waist, sides=24, urep=6,
           deform=lambda q: Vector((q.x, q.y, q.z - 0.06 * (0.18 - q.x) / 0.36)))
    # Cola de la faja con cenefa, colgando a la derecha del frente.
    for kk, (x0, length, width) in enumerate(((-0.1, 0.38, 0.075), (-0.135, 0.3, 0.06))):
        def tail(u, v, x0=x0, length=length, width=width, kk=kk):
            z = 0.92 - u * length
            xx = x0 - 0.03 * u - width * (v - 0.5)
            return Vector((xx, -(ry + 0.02 + 0.006 * kk + 0.03 * u) - 0.01 * math.sin(u * 3), z))
        x.sheet(tail, 8, 2, MOLA if kk == 0 else FAJA, {'hips': 1.0, 'thighR': 0.3}, urep=1, vrep=1)
    for xx, z, rot in ((-0.14, 0.86, 28), (0.135, 0.885, -32)):
        R = Matrix.Rotation(math.radians(rot), 3, 'Z')
        c = Vector((xx, -0.11, z))
        x.box(c, (0.09, 0.05, 0.08), BOTA, {'hips': 1.0}, rot=R, uvm=0.12)
        x.box(c + R @ Vector((0, -0.006, 0.03)), (0.096, 0.054, 0.03), CUERO_OSC, {'hips': 1.0}, rot=R, uvm=0.12)
        x.box(c + R @ Vector((0, -0.032, 0.012)), (0.016, 0.006, 0.016), ORO, {'hips': 1.0}, rot=R)

    # Tirante cruzado del hombro derecho a la cadera izquierda.
    def torso_r(z):
        t = max(0.0, min(1.0, (z - 1.0) / 0.28))
        return (0.14 + 0.04 * math.sin(t * math.pi * 0.9) if not f else 0.13 + 0.03 * math.sin(t * math.pi * 0.9)), 0.112

    def strap(u, v):
        t = 2 * math.pi * u
        z = 1.13 + 0.16 * math.cos(t + 0.6) * (1 if True else 0)
        rrx, rry = torso_r(z)
        return Vector(((rrx + 0.012) * math.cos(t), (rry + 0.012 + 0.008) * math.sin(t), z + (0.5 - v) * 0.036))
    x.sheet(strap, 32, 1, CUERO_OSC, {'chest': 1.0, 'spine': 0.6}, urep=10, vrep=1)

    # Manto turquesa sobre los hombros, con cenefa de escalones y broche de sol.
    def mantle(q):
        return Vector((q.x, q.y, q.z - 0.012 * (q.x + 0.25) / 0.5))
    sw = 0.27 if f else 0.3
    x.band([(1.42, 0.07, 0.068, (0, 0.006)), (1.37, 0.12, 0.1, (0, 0.01)), (1.31, sw - 0.05, 0.142, (0, 0.012)), (1.24, sw, 0.17, (0, 0.016)), (1.18, sw + 0.01, 0.18, (0, 0.02))],
           MANTO, {'chest': 1.0}, sides=28, urep=6, deform=mantle)
    x.band([(1.185, sw + 0.012, 0.182, (0, 0.02)), (1.14, sw + 0.016, 0.186, (0, 0.021))], MOLA_M, {'chest': 1.0}, sides=28, urep=7, deform=mantle)
    x.loft([((0.085, -0.135, 1.29), 0.03, 0.03), ((0.085, -0.15, 1.29), 0.03, 0.03)], ORO, 'chest', sides=16, xdir=(1, 0, 0), cap1=True)
    # Capa a la espalda.

    def cape_pt(u, v, out=0.0):
        a = (u - 0.5) * 2.6
        z = 1.27 - v * (0.7 if not f else 0.62)
        rrx = 0.22 + 0.1 * v
        rry = 0.13 + 0.09 * v
        fold = 0.016 * math.sin(a * 7) * v
        return Vector((rrx * math.sin(a), 0.02 + 0.1 * v + (rry + fold + out) * math.cos(a), z))
    cape_w = {'chest': 1.0, 'spine': 0.7, 'hips': 0.35}
    x.sheet(lambda u, v: cape_pt(u, v * 0.86), 18, 9, MANTO, cape_w, urep=3, vrep=3)
    x.sheet(lambda u, v: cape_pt(u, 0.86 + v * 0.14, 0.001), 18, 1, MOLA_M, cape_w, urep=4, vrep=1)

    # Pendientes (ella) o nada.
    if f:
        for k in (-1, 1):
            x.loft([((0.118 * k, h.head_c.y + 0.008, 1.47), 0.012, 0.012), ((0.118 * k, h.head_c.y + 0.008, 1.462), 0.012, 0.012)], ORO, 'head', sides=10, cap0=True, cap1=True)

    # ---------------------------------------------------------- pelo
    if f:
        pelo, PELO = h.pelo('trenza', rnd)
        # Flor de hibisco sobre la oreja izquierda.
        FLOR = liso(f'{nombre}_flor', '#f4ede0', rough=0.6, doble=True)
        CENTRO = liso(f'{nombre}_flor_c', '#e9a23b', rough=0.6)
        fc = Vector((0.1, h.head_c.y - 0.02, h.head_c.z + 0.08))
        for i in range(5):
            a = i * 2 * math.pi / 5
            d = Vector((math.cos(a), 0, math.sin(a)))
            def petal(u, v, d=d):
                w = math.sin(v * math.pi) * 0.022
                side_v = Vector((-d.z, 0, d.x))
                return fc + d * (0.045 * v) + side_v * (u - 0.5) * w * 2 + Vector((0.012 * v, -0.02 * v * v, 0))
            pelo.sheet(petal, 3, 4, FLOR, 'head')
        pelo.ellipsoid(tuple(fc + Vector((0.004, -0.004, 0))), (0.01, 0.01, 0.01), CENTRO, 'head', sides=8, rings=5)
        # Lazo rojo en la trenza.
        pelo.ellipsoid(tuple(h.head_c + Vector((0, 0.16, -0.06))), (0.04, 0.02, 0.022), FAJA, {'head': 1.0}, sides=10, rings=6)
    else:
        pelo, PELO = h.pelo('corto', rnd)
    h.pieza(pelo, 'Pelo')

    # ---------------------------------------------------------- lanza
    grip, xf, D = h.agarre('handR')
    lz = H.ff.Figura('Lanza', h.bones)
    lz.xf = xf
    ASTA = mat(f'{nombre}_asta', 'madera_asta', rough=0.8)
    HOJA = mat(f'{nombre}_hoja', 'hierro_pintado', rough=0.35, metal=0.3)
    up = Vector((0, 0, 1))
    g = Vector((grip.x, grip.y, 0))
    bottom, top = grip.z - 0.74, grip.z + 1.18
    lz.loft([(tuple(g + up * bottom), 0.017, 0.017), (tuple(g + up * top), 0.016, 0.016)], ASTA, 'handR', sides=10, urep=1, vlen=0.4, cap0=True)
    lz.loft([(tuple(g + up * (grip.z - 0.09)), 0.02, 0.02), (tuple(g + up * (grip.z + 0.09)), 0.02, 0.02)], VENDA, 'handR', sides=10, urep=2, vlen=0.04)
    for z in (bottom + 0.02, top - 0.42, top - 0.2, top - 0.02):
        lz.loft([(tuple(g + up * (z - 0.016)), 0.022, 0.022), (tuple(g + up * (z + 0.016)), 0.022, 0.022)], ORO, 'handR', sides=10, cap0=True, cap1=True)
    lz.loft([(tuple(g + up * top), 0.022, 0.022), (tuple(g + up * (top + 0.07)), 0.014, 0.014)], ORO, 'handR', sides=10, cap0=True)
    # Hoja de cuchilla curva con lomo.
    blade = [(0.0, 0.012, 0.0), (0.05, 0.036, 0.004), (0.13, 0.048, 0.01), (0.22, 0.04, 0.018), (0.3, 0.022, 0.026), (0.37, 0.003, 0.034)]
    lz.loft([(tuple(g + up * (top + 0.07 + zz) + Vector((cx, 0, 0))), w, 0.008) for zz, w, cx in blade], HOJA, 'handR', sides=4, xdir=(1, 0, 0), seam=0, urep=1, smooth=False, cap0=True)
    for kk, (dx, length) in enumerate(((0.0, 0.36), (0.02, 0.28))):
        def ribbon(u, v, dx=dx, length=length, kk=kk):
            z = top - 0.03 - u * length
            sway = 0.05 * math.sin(u * 2.6 + kk) * u + dx
            return Vector((g.x - 0.02 - sway + (v - 0.5) * 0.04, g.y + 0.012 + 0.04 * u * (1 if kk else -0.5) + (v - 0.5) * 0.012, z))
        lz.sheet(ribbon, 7, 1, MOLA if kk == 0 else FAJA, 'handR', urep=1, vrep=1)
    h.pieza(lz, 'Lanza')

    # ---------------------------------------------------------- escudo de rombos
    es = H.ff.Figura('Escudo', h.bones)
    fa, fb = (D['foreArmL'] @ h.segs['foreArmL'][0], D['foreArmL'] @ h.segs['foreArmL'][1])
    mid = fa + (fb - fa) * 0.55
    normal = Vector((0.85, -0.5, 0)).normalized()
    across = Vector((0, 0, 1)).cross(normal).normalized()
    R = Matrix((across, -normal, Vector((0, 0, 1)))).transposed().to_4x4()
    center = mid + normal * 0.07 + Vector((0, -0.02, -0.01))
    es.xf = D['foreArmL'].inverted() @ Matrix.Translation(center) @ R
    CARA = mat(f'{nombre}_escudo', 'cuero_castano', rough=0.6, doble=True)
    ORO_E = mat(f'{nombre}_oro_e', 'oro_pintado', rough=0.4, metal=0.3, doble=True)
    REVES = mat(f'{nombre}_reves', 'cuero_oscuro', rough=0.75, doble=True)
    # Contorno de escudo alargado de seis lados, abombado: aro de oro y cara de cuero.
    W, Hh = 0.23, 0.31
    outline = [(0, Hh), (W, Hh * 0.55), (W * 0.92, -Hh * 0.45), (0, -Hh), (-W * 0.92, -Hh * 0.45), (-W, Hh * 0.55)]

    def ring_pt(u, scale, y):
        k = len(outline)
        s = (u % 1.0) * k
        i = int(s) % k
        t = s - int(s)
        a, b = Vector(outline[i]), Vector(outline[(i + 1) % k])
        q = (a + (b - a) * t) * scale
        bul = 0.035 * max(0.0, 1 - (q.x / W) ** 2) * max(0.0, 1 - (q.y / Hh) ** 2)
        return Vector((q.x, y - bul, q.y))

    def plate(sc0, sc1, y0, y1, M):
        es.sheet(lambda u, v: ring_pt(u, sc0 + (sc1 - sc0) * v, y0 + (y1 - y0) * v), 36, 3, M, 'foreArmL', urep=4, vrep=1)
    plate(1.0, 0.88, 0.0, -0.012, ORO_E)
    plate(0.88, 0.0, -0.012, -0.012, CARA)
    plate(1.0, 1.0, 0.012, 0.0, REVES)
    plate(1.0, 0.0, 0.012, 0.012, REVES)
    # Rombos dorados concéntricos en relieve.
    for sc, dy in ((0.62, 0.0), (0.36, 0.0)):
        d = [(0, Hh * sc), (W * sc * 0.75, 0), (0, -Hh * sc), (-W * sc * 0.75, 0)]
        for i in range(4):
            a, b = Vector(d[i]), Vector(d[(i + 1) % 4])
            mid2 = (a + b) / 2
            ang = math.atan2(b.y - a.y, b.x - a.x)
            es.box((mid2.x, -0.05, mid2.y), ((b - a).length + 0.02, 0.012, 0.018), ORO, 'foreArmL', rot=Matrix.Rotation(-ang, 3, 'Y'))
    es.box((0, -0.054, 0), (0.03, 0.014, 0.03), ORO, 'foreArmL', rot=Matrix.Rotation(math.radians(45), 3, 'Y'))
    h.pieza(es, 'Escudo')

    # ---------------------------------------------------------- clips
    h.clips(
        atacar=[
            (1, p()),
            (7, p(chest=(0, 0, -28), spine=(0, 0, -10), upperArmR=(0, -78, -15), foreArmR=(-10, 0, 0), thighR=(10, 0, 0), thighL=(-10, 0, 0), shinL=(8, 0, 0)), (0, 0.03, -0.01)),
            (11, p(chest=(6, 0, 22), spine=(4, 0, 10), upperArmR=(0, -84, 58), foreArmR=(-6, 0, 0), thighR=(-30, 0, 0), shinR=(18, 0, 0), thighL=(16, 0, 0), shinL=(20, 0, 0)), (0, -0.12, -0.06)),
            (16, p(chest=(4, 0, 18), spine=(2, 0, 8), upperArmR=(0, -80, 52), foreArmR=(-12, 0, 0), thighR=(-24, 0, 0), shinR=(16, 0, 0), thighL=(12, 0, 0), shinL=(16, 0, 0)), (0, -0.1, -0.05)),
            (24, p()),
        ],
        lanzar=[
            (1, p()),
            (9, p(chest=(-14, 0, 0), head=(-8, 0, 0), upperArmR=(-120, -18, 0), upperArmL=(-120, 18, 0), foreArmR=(-40, 0, 0), foreArmL=(-40, 0, 0)), (0, 0.02, 0)),
            (14, p(chest=(14, 0, 0), head=(6, 0, 0), upperArmR=(-88, -6, 0), upperArmL=(-88, 6, 0), foreArmR=(-6, 0, 0), foreArmL=(-6, 0, 0), thighR=(-18, 0, 0), shinR=(10, 0, 0), thighL=(10, 0, 0), shinL=(10, 0, 0)), (0, -0.04, -0.03)),
            (20, p(chest=(8, 0, 0), upperArmR=(-70, -6, 0), upperArmL=(-70, 6, 0), foreArmR=(-14, 0, 0), foreArmL=(-14, 0, 0))),
            (27, p()),
        ])
    h.montar()
    return h


def main(argv):
    sexos = [a for a in argv if a in ('m', 'f')] or ['m', 'f']
    for sexo in sexos:
        h = construir(sexo)
        if '--sin-exportar' not in argv:
            h.exportar('centinela_f.glb' if sexo == 'f' else 'centinela.glb', {'Cuerpo': 2048, 'Pelo': 1024, 'Lanza': 1024, 'Escudo': 1024})


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
