# Oráculo de Bruma (clase storm_weaver), masculino y femenino.
# Túnica blanca de mangas anchas, falda abierta hasta la rodilla con cenefa violeta,
# poncho turquesa con flecos, faja violeta, pantalón bombacho oscuro, sandalias y un
# bastón de madera clara con una esfera de bruma.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/oraculo.py
# Por MCP: exec(...) y main(['m']) / main(['f']).
# Escribe assets/models/oraculo.glb y oraculo_f.glb (partes Cuerpo, Pelo, Arma_baston).
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
from fg_heroe import mat, liso
from fg_rig import p


def construir(sexo):
    f = sexo == 'f'
    nombre = 'oraculo_f' if f else 'oraculo'
    h = H.Heroe(nombre, sexo=sexo, piel='piel_trigo', piel_hex='#d9a57c', pelo='pelo_negro', iris='#3d5f78')
    rnd = random.Random(2203 + f)
    TUNICA = mat(f'{nombre}_tunica', 'tela_blanca', doble=True)
    PANT = mat(f'{nombre}_pant', 'tela_noche')
    PONCHO = mat(f'{nombre}_poncho', 'tela_turquesa', doble=True)
    VIOLETA = mat(f'{nombre}_violeta', 'tela_violeta', doble=True)
    MOLA_V = mat(f'{nombre}_mola', 'mola_violeta_rombos', doble=True)
    MOLA_B = mat(f'{nombre}_mola_b', 'mola_bruma_rombos', doble=True)
    CUERO = mat(f'{nombre}_cuero', 'cuero_castano', rough=0.7)
    PLATA = mat(f'{nombre}_plata', 'hierro_pintado', rough=0.35, metal=0.3)
    h.mats = {'piel': h.piel, 'tunica': TUNICA, 'pant': PANT}

    def zonas(b, c):
        if b.startswith('foot') or (b.startswith('shin') and c.z < 0.12):
            return 'piel'
        if b.startswith(('thigh', 'shin')) or (b == 'hips' and c.z < 0.93):
            return 'pant'
        if b.startswith('hand') or b == 'head' or c.z > 1.36 or (b.startswith('foreArm') and c.z < 0.88):
            return 'piel'
        return 'tunica'
    h.cuerpo(zonas, {'pant': 0.024, 'tunica': 0.01}, [0.12, 0.93, 1.36, 0.88])
    h.cabeza()
    x = h.figura('Ropa')

    # Mangas anchas acampanadas con borde turquesa y cenefa.
    for s, k in (('L', 1), ('R', -1)):
        arm = {'foreArm' + s: 1.0, 'upperArm' + s: 0.15}
        x.loft([((0.25 * k, -0.01, 0.99), 0.05, 0.048), ((0.258 * k, -0.02, 0.93), 0.066, 0.062), ((0.262 * k, -0.024, 0.885), 0.08, 0.074)],
               TUNICA, arm, sides=16, urep=3, vlen=0.2)
        x.loft([((0.262 * k, -0.024, 0.89), 0.081, 0.075), ((0.264 * k, -0.026, 0.86), 0.084, 0.078)], MOLA_V, arm, sides=16, urep=4)
        # Pantalón recogido en el tobillo y sandalia de tiras.
        shin = {'shin' + s: 1.0}
        x.loft([((0.1 * k, 0, 0.2), 0.066, 0.066), ((0.1 * k, 0, 0.14), 0.056, 0.056)], VIOLETA, shin, sides=14, urep=3)
        foot = {'foot' + s: 1.0}
        x.loft([((0.1 * k, 0.065, 0.008), 0.05, 0.008), ((0.1 * k, -0.04, 0.008), 0.062, 0.008), ((0.1 * k, -0.17, 0.01), 0.05, 0.01), ((0.1 * k, -0.2, 0.012), 0.03, 0.008)],
               CUERO, foot, sides=10, xdir=(1, 0, 0), cap0=True, cap1=True, urep=2, vlen=0.15)
        for yy, zz, rr in ((-0.1, 0.045, 0.05), (-0.03, 0.07, 0.052), (0.02, 0.1, 0.05)):
            x.loft([((0.1 * k, yy - 0.008, zz), rr, rr * 0.75), ((0.1 * k, yy + 0.008, zz + 0.004), rr, rr * 0.75)], CUERO, foot, sides=12, xdir=(1, 0, 0), urep=2)

    # Falda de la túnica, abierta al frente, hasta la rodilla, con cenefa violeta.
    skirt_w = {'hips': 1.2, 'thighL': 1.0, 'thighR': 1.0, 'shinL': 0.25, 'shinR': 0.25}
    rx0, ry0 = (0.168, 0.124) if f else (0.162, 0.12)
    prof = [(0.98, rx0, ry0), (0.88, rx0 + 0.035, ry0 + 0.03), (0.72, rx0 + 0.07, ry0 + 0.055), (0.56, rx0 + 0.1, ry0 + 0.075)]
    secs = [((0, 0.01 * i, z), rx, ry) for i, (z, rx, ry) in enumerate(prof)]
    abierta = (math.radians(90 + 16), math.radians(450 - 16))  # el eje baja: t=90° es el frente
    x.loft(secs, TUNICA, skirt_w, sides=26, arc=abierta, urep=4, vlen=0.25)
    x.loft([((0, 0.03, 0.565), rx0 + 0.1, ry0 + 0.075), ((0, 0.032, 0.5), rx0 + 0.11, ry0 + 0.082)], MOLA_V, skirt_w, sides=26, arc=abierta, urep=6)
    # Faja violeta con nudo y caída al costado izquierdo.
    x.band([(0.93, rx0 + 0.008, ry0 + 0.008), (0.99, rx0 + 0.004, ry0 + 0.004), (1.04, rx0 - 0.01, ry0 - 0.004)], VIOLETA, {'hips': 1.0, 'spine': 0.5}, sides=24, urep=5)
    x.ellipsoid((0.11, -0.12, 0.985), (0.03, 0.022, 0.026), VIOLETA, 'hips', sides=10, rings=6)
    for kk in range(2):
        def tail(u, v, kk=kk):
            return Vector((0.11 + 0.02 * kk + 0.03 * u + (v - 0.5) * 0.05, -0.135 - 0.02 * u - 0.004 * kk, 0.97 - u * (0.34 - 0.06 * kk)))
        x.sheet(tail, 6, 1, MOLA_B if kk == 0 else VIOLETA, {'hips': 1.0, 'thighL': 0.4}, urep=1, vrep=1)

    # Poncho turquesa con cenefa y flecos.
    sw = 0.29 if f else 0.31
    pon = [(1.4, 0.07, 0.068, (0, 0.006)), (1.35, 0.15, 0.112, (0, 0.01)), (1.28, sw - 0.005, 0.158, (0, 0.012)), (1.18, sw + 0.01, 0.18, (0, 0.016)), (1.08, sw + 0.03, 0.2, (0, 0.02))]
    x.band(pon, PONCHO, {'chest': 1.0, 'spine': 0.35}, sides=30, urep=6)
    x.band([(1.085, sw + 0.031, 0.201, (0, 0.02)), (1.03, sw + 0.036, 0.206, (0, 0.021))], MOLA_B, {'chest': 1.0, 'spine': 0.5}, sides=30, urep=8)
    # Picos del poncho al frente y atrás.
    for ys in (-1, 1):
        def pico(u, v, ys=ys):
            a = (u - 0.5) * 1.2
            r = sw + 0.036
            z = 1.03 - v * 0.16 * (1 - abs(u - 0.5) * 2)
            return Vector((r * math.sin(a) * 0.9, ys * (0.206 + 0.02 * v) * math.cos(a) + 0.021, z))
        x.sheet(pico, 10, 3, PONCHO, {'chest': 1.0, 'spine': 1.0, 'hips': 0.4}, urep=2, vrep=1)
    for i in range(44):
        a = 2 * math.pi * i / 44
        r = sw + 0.04
        base = Vector((r * math.sin(a) * (0.9 if abs(math.cos(a)) > 0.8 else 1.0), (0.21 * math.cos(a)) + 0.021, 1.03))
        if abs(math.cos(a)) > 0.86:
            base.z -= 0.12 * (abs(math.cos(a)) - 0.86) / 0.14
        largo = 0.06 + 0.02 * rnd.random()
        x.loft([(tuple(base), 0.006, 0.003), (tuple(base + Vector((0, 0, -largo))), 0.003, 0.002)], VIOLETA if i % 3 == 0 else MOLA_B,
               {'chest': 1.0, 'spine': 0.8}, sides=4, cap1=True)
    # Broche de plata con una espiral de bruma.
    x.loft([((0, -0.128, 1.33), 0.026, 0.026), ((0, -0.142, 1.33), 0.026, 0.026)], PLATA, 'chest', sides=14, xdir=(1, 0, 0), cap1=True)

    # Diadema violeta con cuenta de plata.
    C, R = h.head_c, h.head_r
    x.loft([((0, C.y + 0.006, C.z + 0.052), R.x + 0.012, R.y + 0.012), ((0, C.y + 0.006, C.z + 0.072), R.x + 0.01, R.y + 0.01)],
           VIOLETA, 'head', sides=24, xdir=(1, 0, 0), urep=4, deform=lambda q: Vector((q.x, q.y, q.z + 0.03 * max(0.0, -(q.y - C.y) / R.y) ** 2)))
    x.ellipsoid((0, C.y - R.y - 0.012, C.z + 0.095), (0.014, 0.008, 0.016), PLATA, 'head', sides=10, rings=6)

    # Pelo largo (ella) o recogido en coleta (él).
    pelo, _ = h.pelo('largo' if f else 'coleta', rnd)
    h.pieza(pelo, 'Pelo')

    # Bastón de madera clara, nudoso, con esfera de bruma en una horquilla de plata.
    grip, xf, D = h.agarre('handR')
    bs = H.ff.Figura('Arma_baston', h.bones)
    bs.xf = xf
    MADERA = mat(f'{nombre}_madera', 'madera_clara', rough=0.8)
    ESFERA = liso(f'{nombre}_esfera', '#a9d8e6', rough=0.15)
    NUCLEO = liso(f'{nombre}_nucleo', '#e9f6fb', rough=0.1)
    g = Vector((grip.x, grip.y, 0))
    bottom, top = grip.z - 0.72, grip.z + 0.98
    secs = []
    for i in range(13):
        t = i / 12
        z = bottom + (top - bottom) * t
        wob = Vector((0.012 * math.sin(t * 9.0), 0.01 * math.cos(t * 7.0), 0))
        r = 0.018 + 0.006 * (math.sin(t * 23) > 0.85) + 0.006 * t
        secs.append((tuple(g + wob + Vector((0, 0, z))), r, r))
    bs.loft(secs, MADERA, 'handR', sides=9, urep=1, vlen=0.35, cap0=True)
    tip = g + Vector((0.012 * math.sin(9.0), 0.01 * math.cos(7.0), top))
    # Horquilla: tres ramas que abrazan la esfera.
    orb = tip + Vector((0, 0, 0.1))
    for kk in range(3):
        a = kk * 2 * math.pi / 3
        d = Vector((math.cos(a), math.sin(a), 0))
        pts = [tip, tip + d * 0.05 + Vector((0, 0, 0.04)), orb + d * 0.068 + Vector((0, 0, 0.02)), orb + d * 0.035 + Vector((0, 0, 0.075))]
        bs.loft([(tuple(q), 0.012 - 0.0025 * j, 0.012 - 0.0025 * j) for j, q in enumerate(pts)], PLATA if kk else MADERA, 'handR', sides=7, cap1=True)
    bs.ellipsoid(tuple(orb), (0.06, 0.06, 0.06), ESFERA, 'handR', sides=18, rings=12)
    bs.ellipsoid(tuple(orb), (0.028, 0.028, 0.028), NUCLEO, 'handR', sides=10, rings=6)
    bs.loft([(tuple(tip + Vector((0, 0, -0.02))), 0.026, 0.026), (tuple(tip + Vector((0, 0, 0.02))), 0.024, 0.024)], PLATA, 'handR', sides=10, cap0=True, cap1=True)
    # Cintas violetas atadas bajo la horquilla.
    for kk in range(2):
        def ribbon(u, v, kk=kk):
            return Vector((tip.x + 0.02 + 0.03 * u * (1 if kk else -0.6) + (v - 0.5) * 0.012, tip.y - 0.015 - 0.02 * u + (v - 0.5) * 0.02, tip.z - 0.03 - u * (0.3 - 0.07 * kk)))
        bs.sheet(ribbon, 6, 1, MOLA_V if kk == 0 else VIOLETA, 'handR', urep=1, vrep=1)
    # Empuñadura forrada.
    bs.loft([(tuple(g + Vector((0, 0, grip.z - 0.1))), 0.022, 0.022), (tuple(g + Vector((0, 0, grip.z + 0.1))), 0.022, 0.022)], VIOLETA, 'handR', sides=10, urep=2, vlen=0.05)
    h.pieza(bs, 'Arma_baston')

    # Clips: golpe de bastón de arriba abajo y conjuro con ambas manos.
    h.clips(
        atacar=[
            (1, p()),
            (8, p(chest=(-12, 0, -16), spine=(-4, 0, -6), head=(-6, 0, 0), upperArmR=(-150, -12, 0), foreArmR=(-35, 0, 0), upperArmL=(-30, 10, 0), thighL=(-8, 0, 0)), (0, 0.03, 0)),
            (13, p(chest=(20, 0, 10), spine=(8, 0, 4), head=(8, 0, 0), upperArmR=(-58, -10, 0), foreArmR=(-6, 0, 0), upperArmL=(-20, 10, 0), thighR=(-26, 0, 0), shinR=(16, 0, 0), thighL=(12, 0, 0), shinL=(14, 0, 0)), (0, -0.08, -0.05)),
            (18, p(chest=(14, 0, 6), spine=(6, 0, 2), upperArmR=(-54, -8, 0), foreArmR=(-12, 0, 0), thighR=(-20, 0, 0), shinR=(14, 0, 0), thighL=(10, 0, 0), shinL=(12, 0, 0)), (0, -0.07, -0.04)),
            (26, p()),
        ],
        lanzar=[
            (1, p()),
            (8, p(chest=(-10, 0, 0), head=(-14, 0, 0), upperArmR=(-130, -20, 0), upperArmL=(-40, 40, -40), foreArmR=(-20, 0, 0), foreArmL=(-60, 0, 0)), (0, 0.02, 0)),
            (13, p(chest=(-16, 0, 0), head=(-18, 0, 0), upperArmR=(-160, -10, 0), upperArmL=(-80, 30, -30), foreArmR=(-6, 0, 0), foreArmL=(-30, 0, 0)), (0, 0.0, 0.03)),
            (19, p(chest=(12, 0, 0), head=(6, 0, 0), upperArmR=(-95, -6, 0), upperArmL=(-85, 12, 0), foreArmR=(-8, 0, 0), foreArmL=(-8, 0, 0), thighR=(-14, 0, 0), shinR=(8, 0, 0))),
            (27, p()),
        ])
    h.montar()
    return h


def main(argv):
    sexos = [a for a in argv if a in ('m', 'f')] or ['m', 'f']
    for sexo in sexos:
        h = construir(sexo)
        if '--sin-exportar' not in argv:
            h.exportar('oraculo_f.glb' if sexo == 'f' else 'oraculo.glb', {'Cuerpo': 2048, 'Pelo': 1024, 'Arma_baston': 1024})


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
