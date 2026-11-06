# Centinela del Istmo (versión masculina de la ficha del creador): personaje detallado
# con texturas recortadas de su lámina, el mismo esqueleto y los mismos clips que
# personaje.py (Reposo, Correr, Atacar, Lanzar, Rodar, Golpeado, Morir).
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/centinela.py
# Escribe assets/models/centinela.glb. Mira hacia -Y (+Z en el juego), pies en z=0.
# Las texturas salen de scripts/art/recortarLaminas.py (assets/textures/personajes/).
# Ningún material se llama como un canal de paleta: el juego no los tiñe.
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg
import fg_figura as ff
import fg_rig
from fg_rig import p

scene = fg.reset()
BONES = fg_rig.biped_bones()
rig = fg_rig.Rig(scene, 'FG_Centinela', BONES)
rnd = random.Random(1508)

# Materiales: telas, cueros y metal de la lámina; piel, pelo y ojos lisos.
CAMISA = ff.tex_material('camisa', 'tela_beige')
PANTALON = ff.tex_material('pantalon', 'tela_oliva')
CAPA = ff.tex_material('capa', 'tela_azul', two_sided=True)
CENEFA_CAPA = ff.tex_material('cenefa_capa', 'cenefa_azul_triangulos_fina', two_sided=True)
FAJA = ff.tex_material('faja', 'tela_roja')
FALDON = ff.tex_material('faldon', 'cenefa_roja_greca', two_sided=True)
MANGA = ff.tex_material('manga', 'cenefa_roja_espiral')
CUERO = ff.tex_material('cuero', 'cuero_marron', rough=0.7)
CUERO_OSC = ff.tex_material('cuero_oscuro', 'cuero_oscuro', rough=0.75)
CORREA = ff.tex_material('correa', 'correa_marron', rough=0.7, two_sided=True)
VENDA = ff.tex_material('venda', 'tela_beige_drapeada')
ORO = ff.tex_material('oro', 'metal_dorado', rough=0.4, metallic=0.35)
ARO = ff.tex_material('aro', 'barra_dorada_trenzada', rough=0.4, metallic=0.35)
ASTA = ff.tex_material('asta', 'madera_vertical', rough=0.8)
PUNO = ff.tex_material('puno', 'empunadura_lino', rough=0.85)
HOJA = ff.tex_material('hoja', 'hierro_martillado', rough=0.35, metallic=0.4)
CINTA = ff.tex_material('cinta', 'cenefa_roja_zigzag', two_sided=True)
ESCUDO = ff.tex_material('escudo_cara', 'escudo_rombos', rough=0.6)
BROCHE = ff.tex_material('broche', 'medallon_sol', rough=0.4, metallic=0.35)
PIEL = ff.plain_material('piel', (0.8, 0.56, 0.4), rough=0.65)
PELO = ff.plain_material('pelo', (0.2, 0.13, 0.09), rough=0.55)
BLANCO = ff.plain_material('ojo_blanco', (0.96, 0.94, 0.9), rough=0.4)
IRIS = ff.plain_material('ojo_iris', (0.42, 0.24, 0.1), rough=0.3)
OSCURO = ff.plain_material('rasgos', (0.22, 0.1, 0.07), rough=0.6)
PINTURA = ff.plain_material('pintura', (0.78, 0.2, 0.12), rough=0.7)

TORSO = [  # (z, rx, ry, dy): la camisa, de la falda al cuello
    (0.73, 0.178, 0.128, 0.0),
    (0.80, 0.168, 0.118, 0.0),
    (0.90, 0.150, 0.104, 0.0),
    (0.98, 0.148, 0.102, 0.0),
    (1.08, 0.160, 0.110, -0.004),
    (1.18, 0.182, 0.122, -0.008),
    (1.26, 0.192, 0.116, -0.004),
    (1.31, 0.165, 0.102, 0.0),
    (1.34, 0.095, 0.078, 0.004),
    (1.36, 0.064, 0.062, 0.006),
]


def torso_at(z):
    """Radios de la camisa a la altura z (interpolados)."""
    if z <= TORSO[0][0]:
        return TORSO[0][1:3]
    for a, b in zip(TORSO, TORSO[1:]):
        if a[0] <= z <= b[0]:
            t = (z - a[0]) / (b[0] - a[0])
            return a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t
    return TORSO[-1][1:3]


def side(s):
    return 1 if s == 'L' else -1


# ---------------------------------------------------------------- Cuerpo
f = ff.Figura('Cuerpo', BONES)

# Camisa: torso con faldón por debajo del cinturón.
hem = {'hips': 1.0, 'spine': 1.0, 'chest': 1.0}
f.loft([((0, dy, z), rx, ry) for z, rx, ry, dy in TORSO], CAMISA, hem, sides=18, urep=9, vlen=0.12)
# Cuello y cabeza.
f.loft([((0, 0.004, 1.32), 0.058, 0.056), ((0, 0.0, 1.40), 0.053, 0.052), ((0, -0.004, 1.46), 0.05, 0.05)], PIEL, {'chest': 0.4, 'head': 1.0}, sides=10)
HEAD = Vector((0, -0.004, 1.535))
HR = (0.094, 0.108, 0.122)


def jaw(q):
    """Mandíbula: estrecha la parte baja y adelanta un poco el mentón."""
    q = Vector(q)
    dz = HEAD.z - q.z
    if dz > 0:
        s = min(1.0, dz / HR[2])
        k = 1 - 0.38 * s * s
        q.x *= k
        if q.y < HEAD.y:
            q.y = HEAD.y + (q.y - HEAD.y) * (1 - 0.12 * s) - 0.012 * s * s
        else:
            q.y = HEAD.y + (q.y - HEAD.y) * (1 - 0.3 * s)
    return q


f.ellipsoid(HEAD, HR, PIEL, 'head', sides=20, rings=14, deform=jaw)
# Orejas.
for x in (-1, 1):
    f.ellipsoid((0.091 * x, 0.012, 1.525), (0.014, 0.022, 0.03), PIEL, 'head', sides=8, rings=5)
# Ojos: blanco, iris y brillo; cejas, nariz, boca y la pintura de la mejilla.
for x in (-1, 1):
    ex = 0.038 * x
    f.ellipsoid((ex, -0.093, 1.534), (0.02, 0.007, 0.013), BLANCO, 'head', sides=10, rings=5)
    f.ellipsoid((ex + 0.003 * x, -0.0985, 1.533), (0.0095, 0.004, 0.0115), IRIS, 'head', sides=8, rings=5)
    f.box((ex - 0.002 * x, -0.1005, 1.538), (0.004, 0.002, 0.004), BLANCO, 'head')
    f.box((ex, -0.0965, 1.5475), (0.042, 0.006, 0.0035), OSCURO, 'head', rot=Matrix.Rotation(math.radians(-6 * x), 3, 'Y'))
f.loft([((0, -0.103, 1.53), 0.006, 0.004), ((0, -0.113, 1.503), 0.012, 0.008), ((0, -0.106, 1.495), 0.01, 0.004)], PIEL, 'head', sides=6, cap1=True)


def on_face(x, z, out=0.002):
    """Punto de la cara (con la mandíbula aplicada) y giro para que una pieza plana mire hacia fuera."""
    dz = z - HEAD.z
    k = 1 - 0.38 * min(1.0, max(0.0, -dz) / HR[2]) ** 2
    x0 = x / k
    y0 = HEAD.y - HR[1] * math.sqrt(max(0.0, 1 - (x0 / HR[0]) ** 2 - (dz / HR[2]) ** 2))
    q = jaw(Vector((x0, y0, z)))
    n = Vector((x0 / HR[0] ** 2, (y0 - HEAD.y) / HR[1] ** 2, 0)).normalized()
    return q + n * out, Matrix.Rotation(math.atan2(n.x, -n.y), 3, 'Z')


for k in range(2):
    q, rot = on_face(-0.044 - 0.006 * k, 1.512 - 0.012 * k)
    f.box(q, (0.022, 0.002, 0.005), PINTURA, 'head', rot=rot @ Matrix.Rotation(math.radians(20), 3, 'Y'))
for x, ang in ((-0.009, 8), (0.009, -8)):
    q, rot = on_face(x, 1.471, 0.001)
    f.box(q, (0.02, 0.003, 0.0035), OSCURO, 'head', rot=rot @ Matrix.Rotation(math.radians(ang), 3, 'Y'))
for x in (-1, 1):
    q, rot = on_face(0.038 * x, 1.562, 0.002)
    f.box(q, (0.036, 0.004, 0.007), PELO, 'head', rot=rot @ Matrix.Rotation(math.radians(-8 * x), 3, 'Y'))

# Brazos: manga de la camisa con cenefa, antebrazo, brazal de cuero y vendas.
for s in ('L', 'R'):
    x = side(s)
    arm = {'chest': 0.5, f'upperArm{s}': 1.0, f'foreArm{s}': 1.0}
    f.loft([((0.175 * x, 0, 1.245), 0.058, 0.058), ((0.2 * x, 0, 1.22), 0.064, 0.061), ((0.228 * x, 0, 1.14), 0.06, 0.057), ((0.243 * x, 0, 1.08), 0.057, 0.055)], CAMISA, arm, sides=12, urep=4, vlen=0.08)
    f.loft([((0.235 * x, 0, 1.115), 0.061, 0.059), ((0.245 * x, 0, 1.07), 0.06, 0.058)], MANGA, arm, sides=12, urep=5)
    fore = {f'upperArm{s}': 0.6, f'foreArm{s}': 1.0, f'hand{s}': 0.3}
    f.loft([((0.246 * x, 0, 1.075), 0.045, 0.044), ((0.255 * x, -0.012, 0.98), 0.042, 0.04), ((0.268 * x, -0.028, 0.84), 0.033, 0.03)], PIEL, fore, sides=10)
    f.loft([((0.254 * x, -0.01, 0.995), 0.05, 0.047), ((0.26 * x, -0.018, 0.93), 0.049, 0.045), ((0.266 * x, -0.025, 0.875), 0.043, 0.04)], CUERO, fore, sides=12, urep=1.5, vlen=0.12)
    for z in (0.97, 0.9):
        t = (1.03 - z) / 0.21
        f.loft([((0.25 * x + 0.02 * t * x, -0.03 * t, z + 0.008), 0.052 - 0.01 * t, 0.049 - 0.01 * t), ((0.25 * x + 0.02 * t * x, -0.03 * t, z - 0.008), 0.052 - 0.01 * t, 0.049 - 0.01 * t)], CORREA, fore, sides=12, urep=4)
    f.loft([((0.267 * x, -0.026, 0.87), 0.037, 0.034), ((0.27 * x, -0.03, 0.835), 0.036, 0.033)], VENDA, fore, sides=10, urep=2, vlen=0.05)

# Pantalón cargo, metido en las botas; bolsillos a los lados.
for s in ('L', 'R'):
    x = side(s)
    leg = {'hips': 0.5, f'thigh{s}': 1.0, f'shin{s}': 1.0}
    f.loft([((0.085 * x, 0, 0.9), 0.11, 0.1), ((0.09 * x, 0, 0.8), 0.106, 0.104), ((0.095 * x, 0, 0.68), 0.098, 0.096),
            ((0.098 * x, -0.004, 0.57), 0.088, 0.086), ((0.1 * x, -0.01, 0.48), 0.08, 0.082), ((0.1 * x, -0.006, 0.43), 0.086, 0.087),
            ((0.1 * x, 0, 0.395), 0.084, 0.084), ((0.1 * x, 0, 0.37), 0.066, 0.068)], PANTALON, leg, sides=14, urep=6, vlen=0.1)
    thigh = {f'thigh{s}': 1.0}
    f.box((0.188 * x, 0.0, 0.64), (0.035, 0.13, 0.14), PANTALON, thigh, rot=Matrix.Rotation(math.radians(-3 * x), 3, 'Y'), uvm=0.12)
    f.box((0.199 * x, 0.0, 0.7), (0.02, 0.138, 0.045), PANTALON, thigh, uvm=0.12)
    f.box((0.21 * x, -0.0, 0.693), (0.008, 0.016, 0.012), ORO, thigh)

# Botas altas con vuelta, tres correas con hebilla y suela.
for s in ('L', 'R'):
    x = side(s)
    shin = {f'shin{s}': 1.0, f'foot{s}': 0.5}
    f.loft([((0.1 * x, 0, 0.405), 0.075, 0.079), ((0.1 * x, 0, 0.34), 0.068, 0.072), ((0.1 * x, 0, 0.24), 0.06, 0.064), ((0.1 * x, 0.002, 0.14), 0.058, 0.064), ((0.1 * x, 0.004, 0.08), 0.06, 0.07)], CUERO, shin, sides=14, urep=2, vlen=0.18)
    f.loft([((0.1 * x, 0, 0.44), 0.082, 0.086), ((0.1 * x, 0, 0.395), 0.08, 0.084)], CUERO_OSC, shin, sides=14, urep=2)
    for z in (0.17, 0.245, 0.32):
        rx, ry = 0.065 - (0.32 - z) * 0.05, 0.069 - (0.32 - z) * 0.03
        f.loft([((0.1 * x, 0.001, z + 0.013), rx, ry), ((0.1 * x, 0.001, z - 0.013), rx, ry)], CORREA, shin, sides=14, urep=3.5)
        f.box((0.1 * x + rx * x * 0.98, -0.01, z), (0.008, 0.024, 0.03), ORO, shin)
    foot = {f'foot{s}': 1.0}
    f.loft([((0.1 * x, 0.06, 0.07), 0.055, 0.05), ((0.1 * x, 0.0, 0.065), 0.062, 0.062), ((0.1 * x, -0.08, 0.05), 0.06, 0.048),
            ((0.1 * x, -0.15, 0.04), 0.052, 0.036), ((0.1 * x, -0.19, 0.035), 0.038, 0.028)], CUERO, foot, sides=12, xdir=(1, 0, 0), urep=2, vlen=0.15, cap0=True, cap1=True)
    f.loft([((0.1 * x, 0.066, 0.013), 0.054, 0.013), ((0.1 * x, 0.0, 0.013), 0.064, 0.013), ((0.1 * x, -0.08, 0.013), 0.063, 0.013), ((0.1 * x, -0.15, 0.014), 0.055, 0.014), ((0.1 * x, -0.198, 0.017), 0.04, 0.014)], CUERO_OSC, foot, sides=10, xdir=(1, 0, 0), urep=2, vlen=0.15, cap0=True, cap1=True, smooth=False)

# Faja roja con faldón de cenefa, cinturones, hebillas y bolsas.
waist = {'hips': 1.0, 'spine': 0.4}
f.band([(0.865, 0.157, 0.112), (0.9, 0.163, 0.118), (0.94, 0.162, 0.116), (0.985, 0.156, 0.11)], FAJA, waist, sides=20, urep=5)
for k, (x0, length, width) in enumerate(((-0.095, 0.34, 0.072), (-0.13, 0.27, 0.056))):
    def tail(u, v, x0=x0, length=length, width=width, k=k):
        z = 0.9 - u * length
        x = x0 - 0.03 * u - width * (v - 0.5)
        r = torso_at(0.8)[1] + 0.012 + 0.006 * k + 0.02 * u
        return Vector((x, -r - 0.01 * math.sin(u * 3), z))
    f.sheet(tail, 6, 2, FALDON if k == 0 else FAJA, {'hips': 1.0, 'thighR': 0.25}, urep=length / (width * 1.83) if k == 0 else 2, vrep=1)
f.band([(0.955, 0.168, 0.123), (0.995, 0.168, 0.123)], CORREA, waist, sides=22, urep=6)
f.box((0, -0.126, 0.975), (0.052, 0.012, 0.046), ORO, 'hips', uvm=0.05)
f.box((0, -0.133, 0.975), (0.026, 0.006, 0.022), CUERO_OSC, 'hips')
# Cinturón bajo, inclinado hacia la derecha.
f.band([(0.885, 0.178, 0.132, (0, 0)), (0.915, 0.178, 0.132, (0, 0))], CORREA, waist, sides=22, urep=6,
       deform=lambda q: Vector((q.x, q.y, q.z - 0.06 * (0.18 - q.x) / 0.36)))
for x, z, rot in ((-0.135, 0.85, 28), (0.13, 0.885, -32)):
    R = Matrix.Rotation(math.radians(rot), 3, 'Z')
    c = Vector((x, -0.105 if x > 0 else -0.11, z))
    f.box(c, (0.095, 0.05, 0.085), CUERO, {'hips': 1.0}, rot=R, uvm=0.1)
    f.box(c + R @ Vector((0, -0.006, 0.03)), (0.1, 0.05, 0.035), CUERO_OSC, {'hips': 1.0}, rot=R, uvm=0.1)
    f.box(c + R @ Vector((0, -0.033, 0.014)), (0.016, 0.006, 0.016), ORO, {'hips': 1.0}, rot=R)

# Tirantes cruzados sobre el pecho, con anilla en el cruce.
for sgn, extra in ((1, 0.0), (-1, 0.005)):
    slope = 1.05 * sgn
    zc = 1.13

    def strap_pt(t, half):
        zz = zc
        for _ in range(4):
            rx, ry = torso_at(zz)
            xx = (rx + 0.008 + extra) * math.cos(t)
            zz = min(1.29, zc + slope * xx)
        yy = (ry + 0.008 + extra) * math.sin(t)
        return Vector((xx, yy, zz + half))

    def strap(u, v):
        t = 2 * math.pi * u
        return strap_pt(t, (0.5 - v) * 0.036)
    f.sheet(strap, 28, 1, CORREA, {'chest': 1.0, 'spine': 0.6}, urep=9, vrep=1)
f.box((0, -0.128, 1.13), (0.03, 0.012, 0.03), ORO, 'chest', uvm=0.04)

# Manto azul sobre los hombros, caído hacia la izquierda, con broche de sol.
def mantle_drop(q):
    return Vector((q.x, q.y, q.z - 0.008 * (q.x + 0.25) / 0.5))


f.band([(1.425, 0.072, 0.07, (0, 0.006)), (1.37, 0.115, 0.1, (0, 0.01)), (1.31, 0.225, 0.142, (0, 0.012)), (1.24, 0.278, 0.17, (0, 0.018)), (1.18, 0.288, 0.182, (0, 0.02))],
       CAPA, {'chest': 1.0}, sides=24, urep=8, deform=mantle_drop)
f.band([(1.192, 0.29, 0.183, (0, 0.02)), (1.16, 0.293, 0.186, (0, 0.021))], CENEFA_CAPA, {'chest': 1.0}, sides=24, urep=18, deform=mantle_drop)
f.loft([((0.085, -0.128, 1.29), 0.032, 0.032), ((0.085, -0.142, 1.29), 0.032, 0.032)], ORO, 'chest', sides=16, xdir=(1, 0, 0), cap0=True, cap1=False)
f.loft([((0.085, -0.142, 1.29), 0.032, 0.032), ((0.085, -0.143, 1.29), 0.032, 0.032)], BROCHE, 'chest', sides=16, xdir=(1, 0, 0), cap1=True, seam=0)


# Capa a la espalda con pliegues y cenefa en el borde.
def cape_pt(u, v, out=0.0):
    a = (u - 0.5) * 2.7
    z = 1.27 - v * 0.72
    rx = 0.215 + 0.1 * v
    ry = 0.13 + 0.09 * v
    cy = 0.0 + 0.11 * v
    fold = 0.016 * math.sin(a * 7) * v
    return Vector((rx * math.sin(a), cy + (ry + fold + out) * math.cos(a), z))


cape_w = {'chest': 1.0, 'spine': 0.7, 'hips': 0.35}
f.sheet(lambda u, v: cape_pt(u, v * 0.9), 16, 8, CAPA, cape_w, urep=8, vrep=6)
f.sheet(lambda u, v: cape_pt(u, 0.9 + v * 0.1, 0.001), 16, 1, CENEFA_CAPA, cape_w, urep=6, vrep=1)
rig.part(f)

# ---------------------------------------------------------------- Pelo por mechones
h = ff.Figura('Pelo', BONES)


def scalp(q):
    """Gorro de pelo: lo que caería sobre la cara se esconde dentro de la cabeza."""
    q = Vector(q)
    rel = q - HEAD
    if rel.y < -0.035 and rel.z < 0.045:
        q = HEAD + rel * 0.8
    return q


h.ellipsoid(HEAD + Vector((0, 0.008, 0.016)), (0.101, 0.115, 0.122), PELO, 'head', sides=18, rings=10, deform=scalp,
            keep=lambda j, i: not (j < 4), poles=(False, True))
CROWN = Vector((0, 0.3, 0.95)).normalized()
GRAV = Vector((0, 0, -1))
for k in range(78):
    if k < 14:  # flequillo
        az = -math.pi / 2 + (k - 6.5) * 0.17 + rnd.uniform(-0.05, 0.05)
        el = math.radians(rnd.uniform(40, 52))
        length = rnd.uniform(0.05, 0.065)
    else:
        az = rnd.uniform(-math.pi, math.pi)
        el = math.radians(rnd.uniform(-8, 85))
        if math.sin(az) < -0.5 and el < math.radians(50):
            continue  # la cara
        length = rnd.uniform(0.055, 0.09)
    n = Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el)))
    root = HEAD + Vector((n.x * HR[0], n.y * HR[1], n.z * HR[2])) + Vector((0, 0.008, 0.012))
    if k < 14:
        flow = Vector((0.9 * n.x, -0.5, -0.8))
    else:
        flow = n * n.dot(CROWN) - CROWN + GRAV * 0.5
    t = flow - n * flow.dot(n)
    t = Matrix.Rotation(math.radians(rnd.uniform(-25, 25)), 3, n) @ t.normalized()
    lift = rnd.uniform(0.05, 0.22)
    d = (t + n * lift).normalized()
    secs = []
    r0 = rnd.uniform(0.03, 0.04)
    for i in range(5):
        s_ = i / 4
        pt = root - n * 0.008 + d * (length * s_) + (n * 0.14 + GRAV * 0.4) * (length * s_ * s_)
        secs.append((tuple(pt), r0 * (1 - s_) ** 0.85 + 0.0012, r0 * 0.36 * (1 - s_) ** 0.85 + 0.0008))
    side_v = n.cross(d)
    h.loft(secs, PELO, 'head', sides=5, xdir=tuple(side_v.normalized()), cap0=True)
rig.part(h)

# ---------------------------------------------------------------- Lanza y escudo
# Se modelan en la pose de reposo del juego (brazos caídos) y se llevan al reposo
# del esqueleto: así la lanza queda vertical y el escudo de cara cuando está quieto.
D = ff.pose_deltas(rig, p())


def posed_bone(name):
    a, b = (Vector(v) for v in next((bb[2], bb[3]) for bb in BONES if bb[0] == name))
    return D[name] @ a, D[name] @ b


def fist(fig, grip, axis, palm, bone):
    """Puño cerrado alrededor de un eje: guante de cuero, dedos y pulgar."""
    axis, palm = axis.normalized(), palm.normalized()
    side_v = axis.cross(palm)
    fig.ellipsoid(grip + palm * 0.034, (0.03, 0.03, 0.03), CUERO, bone, sides=10, rings=6,
                  deform=lambda q: grip + palm * 0.034 + Matrix((side_v, palm, axis)).transposed() @ (Matrix((side_v, palm, axis)) @ (q - grip - palm * 0.034) * Vector((1.0, 0.7, 1.45))))
    for k in range(4):
        off = axis * (0.022 - k * 0.015)
        pts = []
        for i in range(5):
            a = math.radians(-60 + i * 55)
            pts.append(grip + off + (palm * math.cos(a) * -1 + side_v * math.sin(a)) * 0.028 * -1)
        fig.loft([(tuple(q), 0.0095, 0.0085) for q in pts], PIEL, bone, sides=6, xdir=tuple(axis), cap1=True)
    fig.loft([(tuple(grip + palm * 0.03 + side_v * 0.02 + axis * 0.03), 0.011, 0.01), (tuple(grip + side_v * 0.03 + axis * 0.035), 0.01, 0.009), (tuple(grip - palm * 0.015 + side_v * 0.02 + axis * 0.03), 0.009, 0.008)], PIEL, bone, sides=6, cap1=True)


lz = ff.Figura('Lanza', BONES)
wa, wb = posed_bone('handR')
grip = wa + (wb - wa) * 0.55 + Vector((0, -0.005, 0))
up = Vector((0, 0, 1))
lz.xf = D['handR'].inverted()
fist(lz, grip, up, Vector((-1, 0.2, 0)), 'handR')
bottom, top = grip.z - 0.72, grip.z + 1.2
g = Vector((grip.x, grip.y, 0))
lz.loft([(tuple(g + up * bottom), 0.017, 0.017), (tuple(g + up * top), 0.016, 0.016)], ASTA, 'handR', sides=8, urep=1, vlen=0.3, cap0=True)
lz.loft([(tuple(g + up * (grip.z - 0.1)), 0.0195, 0.0195), (tuple(g + up * (grip.z + 0.1)), 0.0195, 0.0195)], PUNO, 'handR', sides=8, urep=1, vlen=0.06)
for z in (bottom + 0.02, top - 0.42, top - 0.2, top - 0.02):
    lz.loft([(tuple(g + up * (z - 0.018)), 0.021, 0.021), (tuple(g + up * (z + 0.018)), 0.021, 0.021)], ARO, 'handR', sides=8, urep=1, cap0=True, cap1=True)
lz.loft([(tuple(g + up * top), 0.022, 0.022), (tuple(g + up * (top + 0.07)), 0.014, 0.014)], ORO, 'handR', sides=8, cap0=True)
blade = [(0.0, 0.012), (0.05, 0.034), (0.13, 0.045), (0.22, 0.036), (0.3, 0.018), (0.36, 0.002)]
lz.loft([(tuple(g + up * (top + 0.07 + zz) + Vector((0.006 * (zz / 0.36) ** 2 * 0, 0, 0))), w, 0.007) for zz, w in blade], HOJA, 'handR', sides=4, xdir=(1, 0, 0), seam=0, urep=1, smooth=False, cap0=True)
for k, (dx, length) in enumerate(((0.0, 0.36), (0.02, 0.28))):
    def ribbon(u, v, dx=dx, length=length, k=k):
        z = top - 0.02 - u * length
        sway = 0.05 * math.sin(u * 2.6 + k) * u + dx
        return Vector((g.x - 0.02 - sway + (v - 0.5) * 0.038, g.y + 0.012 + 0.04 * u * (1 if k else -0.5) + (v - 0.5) * 0.012, z))
    lz.sheet(ribbon, 6, 1, CINTA, 'handR', urep=length / 0.11, vrep=1)
rig.part(lz)

es = ff.Figura('Escudo', BONES)
fa, fb = posed_bone('foreArmL')
mid = fa + (fb - fa) * 0.55
normal = Vector((0.85, -0.5, 0)).normalized()
across = Vector((0, 0, 1)).cross(normal).normalized()
R = Matrix((across, -normal, Vector((0, 0, 1)))).transposed().to_4x4()
center = mid + normal * 0.064 + Vector((0, -0.02, -0.01))
es.xf = D['foreArmL'].inverted() @ Matrix.Translation(center) @ R
es.plate('escudo_rombos', 0.46, 0.022, ESCUDO, CUERO_OSC, ORO, 'foreArmL', rows=24, cols=10, bulge=0.03)
es.xf = D['handL'].inverted()
ha, hb = posed_bone('handL')
fist(es, ha + (hb - ha) * 0.55, Vector((0, -1, 0)), Vector((1, 0, 0)), 'handL')
rig.part(es)

# ---------------------------------------------------------------- Clips
fg_rig.biped_clips(rig)
fg_rig.biped_emote_clips(rig)
rig.clip('Atacar', [
    (1, p()),
    # Barrido: el brazo se abre y el giro del pecho trae la punta de la lanza al frente.
    (7, p(chest=(0, 0, -28), spine=(0, 0, -10), upperArmR=(0, -78, -15), foreArmR=(-10, 0, 0), thighR=(10, 0, 0), thighL=(-10, 0, 0), shinL=(8, 0, 0)), (0, 0.03, -0.01)),
    (11, p(chest=(6, 0, 22), spine=(4, 0, 10), upperArmR=(0, -84, 58), foreArmR=(-6, 0, 0), thighR=(-30, 0, 0), shinR=(18, 0, 0), thighL=(16, 0, 0), shinL=(20, 0, 0)), (0, -0.12, -0.06)),
    (16, p(chest=(4, 0, 18), spine=(2, 0, 8), upperArmR=(0, -80, 52), foreArmR=(-12, 0, 0), thighR=(-24, 0, 0), shinR=(16, 0, 0), thighL=(12, 0, 0), shinL=(16, 0, 0)), (0, -0.1, -0.05)),
    (24, p()),
])
rig.clip('Lanzar', [
    (1, p()),
    (9, p(chest=(-14, 0, 0), head=(-8, 0, 0), upperArmR=(-120, -18, 0), upperArmL=(-120, 18, 0), foreArmR=(-40, 0, 0), foreArmL=(-40, 0, 0)), (0, 0.02, 0)),
    (14, p(chest=(14, 0, 0), head=(6, 0, 0), upperArmR=(-88, -6, 0), upperArmL=(-88, 6, 0), foreArmR=(-6, 0, 0), foreArmL=(-6, 0, 0), thighR=(-18, 0, 0), shinR=(10, 0, 0), thighL=(10, 0, 0), shinL=(10, 0, 0)), (0, -0.04, -0.03)),
    (20, p(chest=(8, 0, 0), upperArmR=(-70, -6, 0), upperArmL=(-70, 6, 0), foreArmR=(-14, 0, 0), foreArmL=(-14, 0, 0))),
    (27, p()),
])
rig.export('centinela.glb')
