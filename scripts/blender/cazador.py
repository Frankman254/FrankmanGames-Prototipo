# Cazador del Manglar (clase mangrove_hunter, arquero), masculino y femenino.
# Camisa musgo, chaleco de cuero oscuro, pantalón carbón, espinillas vendadas, botas,
# capucha caída y capa corta deshilachada verde, cinta en la frente, carcaj a la
# espalda y arco de madera de mangle en la mano izquierda.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/cazador.py
# Por MCP: exec(...) y main(['m']) / main(['f']).
# Escribe assets/models/cazador.glb y cazador_f.glb (partes Cuerpo, Pelo, Arma_arco).
# Clip extra `Disparar` (26 fotogramas a 24 fps): tensa hasta el 15 y suelta en el 16,
# así el evento de disparo cae hacia t = 0,6 del clip, como el del arquero enemigo.
import math
import os
import random
import sys

import bpy
from mathutils import Vector

try:
    sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
except NameError:
    sys.path.insert(0, r'C:\Users\frank\Desktop\2026\FrankmanGames-Prototipo\scripts\blender')
import fg_heroe as H
from fg_heroe import mat
from fg_rig import p


def construir(sexo):
    f = sexo == 'f'
    nombre = 'cazador_f' if f else 'cazador'
    h = H.Heroe(nombre, sexo=sexo, piel='piel_cacao', piel_hex='#9a6544', pelo='pelo_negro', iris='#3a2a12',
                pintura=('#e8e0c8', 1) if not f else None)
    rnd = random.Random(3307 + f)
    CAMISA = mat(f'{nombre}_camisa', 'tela_arena', doble=True)
    PANT = mat(f'{nombre}_pant', 'tela_carbon')
    CHALECO = mat(f'{nombre}_chaleco', 'cuero_oscuro', rough=0.75, doble=True)
    BOTA = mat(f'{nombre}_bota', 'cuero_castano', rough=0.7)
    VENDA = mat(f'{nombre}_venda', 'tela_lino', rough=0.9)
    CAPA = mat(f'{nombre}_capa', 'tela_musgo', doble=True)
    MOLA = mat(f'{nombre}_mola', 'mola_musgo_zigzag', doble=True)
    CINTA = mat(f'{nombre}_cinta', 'tela_coral', doble=True)
    BRONCE = mat(f'{nombre}_bronce', 'bronce_pintado', rough=0.4, metal=0.3)
    MADERA = mat(f'{nombre}_madera', 'madera_asta', rough=0.8)
    PLUMA = mat(f'{nombre}_pluma', 'plumas_garza', doble=True)
    HIERRO = mat(f'{nombre}_hierro', 'hierro_pintado', rough=0.35, metal=0.3)
    h.mats = {'piel': h.piel, 'camisa': CAMISA, 'pant': PANT, 'bota': BOTA}

    def zonas(b, c):
        if b.startswith('foot') or (b.startswith('shin') and c.z < 0.15):
            return 'bota'
        if b.startswith(('thigh', 'shin')) or (b == 'hips' and c.z < 0.95):
            return 'pant'
        if b.startswith('hand') or b == 'head' or c.z > 1.37 or (b.startswith('foreArm') and c.z < 0.86):
            return 'piel'
        return 'camisa'
    h.cuerpo(zonas, {'bota': 0.016, 'pant': 0.012, 'camisa': 0.007}, [0.15, 0.95, 1.37, 0.86])
    h.cabeza()
    x = h.figura('Ropa')

    for s, k in (('L', 1), ('R', -1)):
        # Espinillas vendadas en espiral sobre el pantalón.
        shin = {'shin' + s: 1.0}
        for i in range(7):
            z = 0.17 + i * 0.04
            r = 0.058 + i * 0.003
            tilt = 0.014 * k
            x.loft([((0.1 * k, 0.0, z - 0.016), r, r + 0.002), ((0.1 * k, 0.0, z + 0.016), r + 0.002, r + 0.004)], VENDA, shin, sides=14, urep=2,
                   deform=lambda q, tilt=tilt, k=k: Vector((q.x, q.y, q.z + tilt * (q.x - 0.1 * k) / 0.06)))
        # Botas: vuelta y suela.
        x.loft([((0.1 * k, 0, 0.17), 0.064, 0.066), ((0.1 * k, 0, 0.13), 0.062, 0.064)], BOTA, shin, sides=14, urep=3)
        foot = {'foot' + s: 1.0}
        x.loft([((0.1 * k, 0.07, 0.012), 0.05, 0.012), ((0.1 * k, -0.02, 0.012), 0.062, 0.012), ((0.1 * k, -0.15, 0.014), 0.055, 0.014), ((0.1 * k, -0.2, 0.017), 0.035, 0.012)],
               CHALECO, foot, sides=10, xdir=(1, 0, 0), cap0=True, cap1=True, urep=2, vlen=0.15)
        # Puños de la camisa y brazal de arquero en el antebrazo izquierdo.
        fore = {'foreArm' + s: 1.0}
        x.loft([((0.262 * k, -0.02, 0.9), 0.046, 0.043), ((0.265 * k, -0.024, 0.865), 0.044, 0.041)], VENDA, fore, sides=12, urep=2)
        if s == 'L':
            x.loft([((0.256 * k, -0.015, 0.99), 0.05, 0.047), ((0.262 * k, -0.022, 0.9), 0.047, 0.044)], CHALECO, fore, sides=12, urep=3, vlen=0.1)
            for z in (0.97, 0.93):
                x.loft([((0.258 * k, -0.018, z - 0.006), 0.052, 0.049), ((0.26 * k, -0.02, z + 0.006), 0.052, 0.049)], BOTA, fore, sides=12, urep=3)

    # Chaleco de cuero abierto al frente, con cordones.
    rx_, ry_ = (0.15, 0.112) if f else (0.165, 0.118)
    pecho = [(0.96, rx_ + 0.012, ry_ + 0.012), (1.06, rx_ - 0.004, ry_ + 0.002), (1.17, rx_ + (0.012 if f else 0.02), ry_ + 0.012), (1.27, rx_ - 0.012, ry_ - 0.008), (1.32, rx_ - 0.05, ry_ - 0.03)]
    secs = [((0, -0.004, z), rx, ry) for z, rx, ry in pecho]
    x.loft(secs, CHALECO, {'chest': 1.0, 'spine': 1.0, 'hips': 0.5}, sides=26, arc=(math.radians(-90 + 12), math.radians(270 - 12)), urep=4, vlen=0.3)
    for z in (1.02, 1.08, 1.14, 1.2):
        x.box((0, -ry_ - 0.012, z), (0.06, 0.006, 0.008), BRONCE, 'chest')
    # Cinturón con hebilla, bolsas y cuchillo.
    x.band([(0.93, rx_ + 0.018, ry_ + 0.018), (0.97, rx_ + 0.016, ry_ + 0.016)], BOTA, {'hips': 1.0}, sides=24, urep=6)
    x.box((0, -ry_ - 0.024, 0.95), (0.04, 0.01, 0.036), BRONCE, 'hips')
    for xx in (-0.15, 0.13):
        x.box((xx, -0.1, 0.89), (0.07, 0.05, 0.08), BOTA, 'hips', uvm=0.12)
        x.box((xx, -0.103, 0.92), (0.074, 0.054, 0.026), CHALECO, 'hips', uvm=0.12)
    x.loft([((0.18, -0.02, 0.94), 0.018, 0.012), ((0.19, -0.02, 0.8), 0.016, 0.01)], CHALECO, {'hips': 1.0, 'thighL': 0.3}, sides=8, cap1=True)
    x.loft([((0.18, -0.02, 0.94), 0.012, 0.01), ((0.178, -0.02, 1.0), 0.012, 0.01)], MADERA, 'hips', sides=8, cap1=True)

    # Capucha caída sobre los hombros y bufanda.
    x.band([(1.34, 0.11, 0.098, (0, 0.01)), (1.38, 0.1, 0.09, (0, 0.006)), (1.42, 0.085, 0.08, (0, 0.004))], CAPA, {'chest': 1.0, 'head': 0.3}, sides=24, urep=4)
    x.ellipsoid((0, 0.1, 1.33), (0.13, 0.07, 0.07), CAPA, {'chest': 1.0}, sides=16, rings=8)
    # Capa corta de bordes deshilachados con cenefa.
    sw = 0.26 if f else 0.29
    corte = [rnd.uniform(0.0, 0.12) for _ in range(19)]

    def cape(u, v, out=0.0):
        a = (u - 0.5) * 3.4
        i = min(18, int(u * 18 + 0.5))
        largo = 0.5 - corte[i] if 0.2 < u < 0.8 else 0.34 - corte[i] * 0.6
        z = 1.33 - v * largo
        rr = 0.17 + 0.07 * v
        return Vector(((sw - 0.04 + 0.05 * v) * math.sin(a), 0.01 + 0.05 * v + (rr + out) * math.cos(a) * (1 if math.cos(a) > 0 else 0.7), z))
    cw = {'chest': 1.0, 'spine': 0.6}
    x.sheet(lambda u, v: cape(u, v * 0.84), 18, 7, CAPA, cw, urep=3, vrep=2)
    x.sheet(lambda u, v: cape(u, 0.84 + 0.16 * v, 0.001), 18, 1, MOLA, cw, urep=5, vrep=1)

    # Carcaj en la espalda con flechas emplumadas.
    q0, q1 = Vector((0.11, 0.2, 0.86)), Vector((-0.1, 0.24, 1.3))
    x.loft([(tuple(q0), 0.05, 0.045), (tuple(q1), 0.058, 0.052)], BOTA, {'chest': 1.0}, sides=12, cap0=True, urep=2, vlen=0.2)
    x.loft([(tuple(q1 + (q1 - q0).normalized() * -0.03), 0.06, 0.054), (tuple(q1), 0.06, 0.054)], CHALECO, {'chest': 1.0}, sides=12, urep=3)
    x.loft([(tuple(q0 + (q1 - q0) * 0.4), 0.052, 0.047), (tuple(q0 + (q1 - q0) * 0.45), 0.052, 0.047)], BRONCE, {'chest': 1.0}, sides=12, urep=3)
    ax = (q1 - q0).normalized()
    for i in range(5):
        off = Vector((-0.025 + 0.0125 * i, 0.006 * (i % 2), 0))
        base = q1 + off - ax * 0.1
        tip = q1 + off + ax * (0.12 + 0.015 * (i % 3))
        x.loft([(tuple(base), 0.005, 0.005), (tuple(tip), 0.005, 0.005)], MADERA, 'chest', sides=5, cap1=True)
        side = Vector((1, 0, 0)).cross(ax).normalized()
        for sgn in (-1, 1):
            def fl(u, v, tip=tip, side=side, sgn=sgn):
                return tip - ax * (0.02 + 0.07 * u) + side * sgn * 0.018 * v * (1 - 0.3 * u) + Vector((0, 0, 0))
            x.sheet(fl, 3, 1, PLUMA, 'chest', urep=1, vrep=1)
    # Correa del carcaj cruzando el pecho.

    def strap(u, v):
        t = 2 * math.pi * u
        z = 1.13 - 0.15 * math.cos(t + 0.5)
        return Vector(((rx_ + 0.03) * math.cos(t), (ry_ + 0.03) * math.sin(t), z + (0.5 - v) * 0.032))
    x.sheet(strap, 32, 1, BOTA, {'chest': 1.0, 'spine': 0.6}, urep=10, vrep=1)

    # Cinta en la frente con las puntas sueltas atrás.
    C, R = h.head_c, h.head_r
    x.loft([((0, C.y + 0.004, C.z + 0.035), R.x + 0.012, R.y + 0.012), ((0, C.y + 0.004, C.z + 0.06), R.x + 0.01, R.y + 0.01)],
           CINTA, 'head', sides=24, xdir=(1, 0, 0), urep=4)
    for kk in (-1, 1):
        def tail(u, v, kk=kk):
            return Vector((0.025 * kk + 0.04 * kk * u + (v - 0.5) * 0.02, C.y + R.y + 0.01 + 0.07 * u, C.z + 0.045 - 0.16 * u))
        x.sheet(tail, 5, 1, CINTA, {'head': 1.0, 'chest': 0.4}, urep=1, vrep=1)

    pelo, _ = h.pelo('coleta' if f else 'corto', rnd)
    h.pieza(pelo, 'Pelo')

    # Arco de mangle en la mano izquierda: empuñadura en el agarre, palas hacia atrás
    # (+Y) y la cuerda detrás; en `Disparar` la mano gira y el arco queda vertical.
    grip, xf, D = h.agarre('handL')
    ar = H.ff.Figura('Arma_arco', h.bones)
    ar.xf = xf
    half = 0.62
    pts = []
    for i in range(13):
        t = -1 + i / 6
        pts.append(grip + Vector((0.0, 0.11 * t * t - 0.02 * t ** 4, t * half)))
    for i in range(12):
        a, b = pts[i], pts[i + 1]
        t = abs(-1 + (i + 0.5) / 6)
        r = 0.02 - 0.011 * t
        ar.loft([(tuple(a), r, r * 0.75), (tuple(b), r, r * 0.75)], MADERA, 'handL', sides=7, xdir=(1, 0, 0), vlen=0.3)
    ar.loft([(tuple(pts[0]), 0.009, 0.009), (tuple(pts[0] + Vector((0, 0.025, -0.03))), 0.004, 0.004)], HIERRO, 'handL', sides=6, cap1=True)
    ar.loft([(tuple(pts[-1]), 0.009, 0.009), (tuple(pts[-1] + Vector((0, 0.025, 0.03))), 0.004, 0.004)], HIERRO, 'handL', sides=6, cap1=True)
    ar.loft([(tuple(grip + Vector((0, 0.002, -0.07))), 0.024, 0.02), (tuple(grip + Vector((0, 0.002, 0.07))), 0.024, 0.02)], CINTA, 'handL', sides=10, urep=2, vlen=0.05)
    ar.loft([(tuple(pts[0] + Vector((0, 0.002, 0))), 0.0025, 0.0025), (tuple(pts[-1] + Vector((0, 0.002, 0))), 0.0025, 0.0025)], VENDA, 'handL', sides=4)
    # Plumas atadas bajo la pala de arriba.
    top = pts[9]
    for kk in range(2):
        def pl(u, v, kk=kk):
            return top + Vector((0.01 * kk + (v - 0.5) * 0.03, 0.01 + 0.01 * kk, -0.02 - 0.11 * u))
        ar.sheet(pl, 3, 1, PLUMA, 'handL', urep=1, vrep=1)
    h.pieza(ar, 'Arma_arco')

    GIRO = (90, 0, 0)  # la mano gira el arco a vertical mientras apunta
    disparar = [
        (1, p()),
        (8, p(chest=(0, 0, -16), upperArmL=(-85, 18, 0), foreArmL=(-6, 0, 0), handL=GIRO, upperArmR=(-70, -20, 0), foreArmR=(-20, 0, 0), thighL=(-12, 0, 0), thighR=(12, 0, 0))),
        (15, p(chest=(0, 0, -30), head=(0, 0, 14), upperArmL=(-90, 26, 0), foreArmL=(0, 0, 0), handL=GIRO, upperArmR=(-90, -14, 0), foreArmR=(-110, 0, 0), thighL=(-14, 0, 0), thighR=(14, 0, 0))),
        (17, p(chest=(2, 0, -32), head=(0, 0, 14), upperArmL=(-90, 26, 0), foreArmL=(0, 0, 0), handL=GIRO, upperArmR=(-58, -36, 0), foreArmR=(-30, 0, 0), thighL=(-14, 0, 0), thighR=(14, 0, 0)), (0, 0.02, 0)),
        (26, p()),
    ]
    h.clips(
        # Golpe con el arco de revés, barriendo de izquierda a derecha.
        atacar=[
            (1, p()),
            (7, p(chest=(0, 0, 26), spine=(0, 0, 10), upperArmL=(-40, 60, 30), foreArmL=(-30, 0, 0), thighL=(-10, 0, 0), thighR=(8, 0, 0))),
            (12, p(chest=(6, 0, -24), spine=(2, 0, -10), upperArmL=(-80, -30, -20), foreArmL=(-6, 0, 0), thighL=(-24, 0, 0), shinL=(14, 0, 0), thighR=(12, 0, 0), shinR=(12, 0, 0)), (0, -0.08, -0.04)),
            (17, p(chest=(4, 0, -18), spine=(2, 0, -6), upperArmL=(-70, -24, -16), foreArmL=(-12, 0, 0), thighL=(-18, 0, 0), shinL=(12, 0, 0), thighR=(10, 0, 0), shinR=(10, 0, 0)), (0, -0.06, -0.03)),
            (24, p()),
        ],
        lanzar=[
            (1, p()),
            (9, p(chest=(-14, 0, 0), head=(-8, 0, 0), upperArmR=(-120, -18, 0), upperArmL=(-120, 18, 0), foreArmR=(-40, 0, 0), foreArmL=(-40, 0, 0)), (0, 0.02, 0)),
            (14, p(chest=(14, 0, 0), head=(6, 0, 0), upperArmR=(-88, -6, 0), upperArmL=(-88, 6, 0), foreArmR=(-6, 0, 0), foreArmL=(-6, 0, 0), thighR=(-18, 0, 0), shinR=(10, 0, 0), thighL=(10, 0, 0), shinL=(10, 0, 0)), (0, -0.04, -0.03)),
            (20, p(chest=(8, 0, 0), upperArmR=(-70, -6, 0), upperArmL=(-70, 6, 0), foreArmR=(-14, 0, 0), foreArmL=(-14, 0, 0))),
            (27, p()),
        ],
        extra={'Disparar': disparar})
    h.montar()
    return h


def main(argv):
    sexos = [a for a in argv if a in ('m', 'f')] or ['m', 'f']
    for sexo in sexos:
        h = construir(sexo)
        if '--sin-exportar' not in argv:
            h.exportar('cazador_f.glb' if sexo == 'f' else 'cazador.glb', {'Cuerpo': 2048, 'Pelo': 1024, 'Arma_arco': 1024})


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
