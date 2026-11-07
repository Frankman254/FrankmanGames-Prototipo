# Humanoide de geometría propia para el jugador y los PNJ: un esqueleto, siete clips y
# piezas opcionales (pelo, ropa, armas) que el juego enciende según el aspecto.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/personaje.py
# Escribe assets/models/personaje.glb. Mira hacia -Y (+Z en el juego), con los pies en z=0.
# Los materiales se llaman como los canales de la paleta: skin, cloth, trim, hair, gear.
import os
import sys
import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg
import fg_rig
from fg_rig import p

scene = fg.reset()
SKIN = fg.material('skin', (0.8, 0.6, 0.45))
CLOTH = fg.material('cloth', (0.3, 0.3, 0.4))
TRIM = fg.material('trim', (0.6, 0.5, 0.3))
HAIR = fg.material('hair', (0.2, 0.14, 0.1))
GEAR = fg.material('gear', (0.65, 0.65, 0.68), metallic=0.2, rough=0.5)
EYES = fg.material('ojos', (0.03, 0.03, 0.04), rough=0.3)
EYE_WHITE = fg.material('blanco_ojos', (0.93, 0.9, 0.8), rough=0.45)
EYE_GLINT = fg.material('brillo_ojos', (1.0, 0.86, 0.45), emit=(1.0, 0.72, 0.25), strength=0.45)
MOUTH = fg.material('boca', (0.16, 0.055, 0.045), rough=0.8)
BOOTS = fg.material('botas', (0.12, 0.075, 0.045), rough=0.8)

rig = fg_rig.Rig(scene, 'FG_Personaje', fg_rig.biped_bones())
part = rig.part

# Cuerpo.
b = fg.Builder('Cuerpo')
b.tube((0, 0, 0.8), (0, 0, 0.98), 0.17, 0.16, CLOTH, 'hips', sides=8, flat=0.72)
b.tube((0, 0, 0.98), (0, 0, 1.12), 0.16, 0.18, CLOTH, 'spine', sides=8, flat=0.72)
b.tube((0, 0, 1.12), (0, 0, 1.32), 0.18, 0.2, CLOTH, 'chest', sides=8, flat=0.7)
b.box((0, 0, 0.95), (0.35, 0.25, 0.045), TRIM, 'hips')
b.box((0, -0.14, 0.95), (0.08, 0.02, 0.07), GEAR, 'hips')
b.blob((0, -0.155, 0.95), (0.045, 0.018, 0.045), TRIM, 'hips', subdiv=1)
# Cuello y costuras dan escala al torso sin depender de una textura.
b.tube((0, -0.02, 1.315), (0, -0.025, 1.28), 0.13, 0.11, TRIM, 'chest', sides=8, flat=0.55)
b.tube((0, -0.132, 1.25), (0, -0.142, 1.02), 0.012, 0.010, TRIM, 'chest', sides=4)
for x in (-1, 1):
    b.poly([(x * 0.03, -0.145, 1.29), (x * 0.15, -0.12, 1.30), (x * 0.08, -0.15, 1.20)],
           [(x * 0.03, -0.105, 1.29), (x * 0.15, -0.08, 1.30), (x * 0.08, -0.11, 1.20)], TRIM, 'chest')
b.tube((0, 0, 1.3), (0, 0, 1.37), 0.05, 0.05, SKIN, 'head', sides=6)
b.blob((0, 0, 1.51), (0.15, 0.15, 0.17), SKIN, 'head')
for x in (-1, 1):
    b.blob((x * 0.15, 0, 1.51), (0.022, 0.038, 0.045), SKIN, 'head', subdiv=1)
    b.blob((x * 0.058, -0.137, 1.535), (0.030, 0.014, 0.029), EYE_WHITE, 'head', subdiv=1)
    b.blob((x * 0.058, -0.151, 1.535), (0.014, 0.006, 0.017), EYES, 'head', subdiv=1)
    b.box((x * 0.052, -0.156, 1.547), (0.006, 0.003, 0.006), EYE_GLINT, 'head')
    b.tube((x * 0.025, -0.149, 1.575), (x * 0.092, -0.137, 1.585), 0.008, 0.005, HAIR, 'head', sides=4)
b.tube((0, -0.14, 1.51), (0, -0.17, 1.465), 0.024, 0.012, SKIN, 'head', sides=5, flat=0.7)
b.blob((0, -0.151, 1.416), (0.048, 0.010, 0.012), MOUTH, 'head', subdiv=1)
b.blob((0, -0.105, 1.385), (0.075, 0.055, 0.035), SKIN, 'head', subdiv=1)
for s, x in (('L', 1), ('R', -1)):
    b.blob((0.2 * x, 0, 1.28), (0.075, 0.075, 0.07), TRIM, f'upperArm{s}', subdiv=1)
    b.tube((0.2 * x, 0, 1.27), (0.25 * x, 0, 1.03), 0.058, 0.048, CLOTH, f'upperArm{s}', sides=6)
    b.tube((0.25 * x, 0, 1.05), (0.27 * x, -0.03, 0.84), 0.046, 0.038, SKIN, f'foreArm{s}', sides=6)
    b.tube((0.255 * x, -0.01, 0.96), (0.27 * x, -0.03, 0.86), 0.05, 0.046, TRIM, f'foreArm{s}', sides=6)
    b.blob((0.27 * x, -0.04, 0.79), (0.045, 0.045, 0.055), SKIN, f'hand{s}', subdiv=1)
    for finger in (-0.022, 0, 0.022):
        b.tube((0.27 * x + finger, -0.055, 0.78), (0.27 * x + finger, -0.078, 0.735), 0.007, 0.004, SKIN, f'hand{s}', sides=4)
    b.tube((0.09 * x, 0, 0.84), (0.1 * x, 0, 0.46), 0.08, 0.058, CLOTH, f'thigh{s}', sides=6)
    b.tube((0.1 * x, 0, 0.48), (0.1 * x, 0, 0.1), 0.058, 0.045, TRIM, f'shin{s}', sides=6)
    b.box((0.1 * x, -0.05, 0.05), (0.1, 0.25, 0.1), BOOTS, f'foot{s}')
    b.blob((0.1 * x, -0.15, 0.055), (0.052, 0.11, 0.052), BOOTS, f'foot{s}', subdiv=1)
    b.tube((0.1 * x, 0, 0.14), (0.1 * x, 0, 0.10), 0.064, 0.06, TRIM, f'shin{s}', sides=6)
part(b)

# Pelo y cabeza.
b = fg.Builder('Pelo_corto')
b.blob((0, 0.025, 1.58), (0.158, 0.152, 0.125), HAIR, 'head')
for x in (-0.10, -0.05, 0, 0.05, 0.10):
    b.poly([(x - 0.028, -0.13, 1.63), (x + 0.028, -0.13, 1.63), (x, -0.15, 1.555 - abs(x) * 0.12)],
           [(x - 0.028, -0.095, 1.63), (x + 0.028, -0.095, 1.63), (x, -0.115, 1.555 - abs(x) * 0.12)], HAIR, 'head')
part(b)
b = fg.Builder('Pelo_largo')
b.blob((0, 0.025, 1.58), (0.16, 0.155, 0.125), HAIR, 'head')
b.tube((0, 0.1, 1.56), (0, 0.13, 1.2), 0.12, 0.07, HAIR, 'head', sides=6, flat=0.55)
for x in (-1, 1):
    b.tube((x * 0.13, -0.01, 1.56), (x * 0.14, -0.01, 1.27), 0.052, 0.022, HAIR, 'head', sides=5, flat=0.65)
part(b)
b = fg.Builder('Barba')
b.tube((0, -0.09, 1.45), (0, -0.14, 1.3), 0.09, 0.03, HAIR, 'head', sides=6, flat=0.6)
for x in (-1, 1):
    b.tube((x * 0.055, -0.12, 1.45), (x * 0.035, -0.15, 1.34), 0.028, 0.010, HAIR, 'head', sides=5)
part(b)
b = fg.Builder('Capucha')
b.blob((0, 0.03, 1.56), (0.18, 0.18, 0.2), CLOTH, 'head')
b.tube((0, 0.1, 1.45), (0, 0.17, 1.28), 0.14, 0.05, CLOTH, 'chest', sides=6, flat=0.6)
b.tube((0, -0.02, 1.55), (0, -0.035, 1.48), 0.172, 0.154, TRIM, 'head', sides=10, flat=0.82)
part(b)
b = fg.Builder('Yelmo')
b.blob((0, 0.01, 1.57), (0.172, 0.172, 0.15), GEAR, 'head')
b.box((0, -0.13, 1.53), (0.05, 0.05, 0.16), GEAR, 'head')
b.tube((0, 0.01, 1.66), (0, 0.05, 1.75), 0.035, 0.006, TRIM, 'head', sides=4)
for x in (-1, 1):
    b.box((x * 0.135, -0.02, 1.48), (0.035, 0.08, 0.13), GEAR, 'head')
part(b)
b = fg.Builder('Banda')
b.tube((0, 0, 1.56), (0, 0, 1.6), 0.16, 0.16, TRIM, 'head', sides=10)
b.poly([(0.11, 0.13, 1.58), (0.16, 0.12, 1.56), (0.18, 0.15, 1.40)],
       [(0.11, 0.16, 1.58), (0.16, 0.15, 1.56), (0.18, 0.18, 1.40)], TRIM, 'head')
part(b)

# Ropa por capas.
b = fg.Builder('Tunica')
b.tube((0, 0, 0.97), (0, 0, 0.42), 0.19, 0.3, CLOTH, 'hips', sides=8, flat=0.78)
b.tube((0, 0, 0.45), (0, 0, 0.4), 0.3, 0.31, TRIM, 'hips', sides=8, flat=0.78)
b.poly([(-0.08, -0.245, 0.91), (0.08, -0.245, 0.91), (0.13, -0.27, 0.46), (-0.13, -0.27, 0.46)],
       [(-0.08, -0.20, 0.91), (0.08, -0.20, 0.91), (0.13, -0.225, 0.46), (-0.13, -0.225, 0.46)], TRIM, 'hips')
part(b)
b = fg.Builder('Mandil')
b.box((0, -0.155, 0.85), (0.27, 0.02, 0.62), TRIM, 'hips')
for x in (-1, 1):
    b.box((x * 0.075, -0.18, 0.78), (0.09, 0.018, 0.10), CLOTH, 'hips')
part(b)
b = fg.Builder('Armadura')
b.tube((0, 0, 1.08), (0, 0, 1.33), 0.195, 0.22, GEAR, 'chest', sides=8, flat=0.74)
for x in (-1, 1):
    b.blob((0.23 * x, 0, 1.31), (0.1, 0.11, 0.075), GEAR, 'chest', subdiv=1)
    b.poly([(x * 0.02, -0.17, 1.30), (x * 0.17, -0.14, 1.27), (x * 0.11, -0.18, 1.10)],
           [(x * 0.02, -0.13, 1.30), (x * 0.17, -0.10, 1.27), (x * 0.11, -0.14, 1.10)], TRIM, 'chest')
b.blob((0, -0.18, 1.18), (0.045, 0.018, 0.06), TRIM, 'chest', subdiv=1)
part(b)
b = fg.Builder('Capa')
b.poly([(-0.17, 0.14, 1.33), (0.17, 0.14, 1.33), (0.17, 0.16, 1.33), (-0.17, 0.16, 1.33)], [(-0.27, 0.25, 0.42), (0.27, 0.25, 0.42), (0.27, 0.28, 0.42), (-0.27, 0.28, 0.42)], CLOTH, 'chest')
for x in (-1, 1):
    b.blob((x * 0.14, -0.015, 1.31), (0.045, 0.035, 0.045), TRIM, 'chest', subdiv=1)
part(b)

# Armas en la mano derecha; rodela y escudo en la izquierda.
H = (-0.27, -0.05, 0.79)
b = fg.Builder('Arma_espada')
b.box((H[0], H[1] - 0.09, H[2]), (0.03, 0.2, 0.03), HAIR, 'handR')
b.box((H[0], H[1] - 0.2, H[2]), (0.17, 0.03, 0.03), GEAR, 'handR')
b.box((H[0], H[1] - 0.58, H[2]), (0.06, 0.74, 0.016), GEAR, 'handR')
part(b)
b = fg.Builder('Arma_baston')
b.tube((H[0], H[1], H[2] - 0.6), (H[0], H[1], H[2] + 0.85), 0.018, 0.024, TRIM, 'handR', sides=5)
b.blob((H[0], H[1], H[2] + 0.92), (0.06, 0.06, 0.08), GEAR, 'handR', subdiv=1)
part(b)
b = fg.Builder('Arma_arco')
LH = (0.27, -0.05, 0.79)
prev = None
for i in range(9):
    t = -1 + i / 4
    q = (LH[0], LH[1] - 0.14 * (1 - t * t), LH[2] + t * 0.6)
    if prev:
        b.tube(prev, q, 0.016, 0.016, TRIM, 'handL', sides=4)
    prev = q
b.tube((LH[0], LH[1], LH[2] - 0.6), (LH[0], LH[1], LH[2] + 0.6), 0.003, 0.003, GEAR, 'handL', sides=3)
part(b)
b = fg.Builder('Escudo')
b.tube((LH[0] + 0.05, LH[1], LH[2] + 0.1), (LH[0] + 0.09, LH[1], LH[2] + 0.1), 0.26, 0.22, TRIM, 'handL', sides=8)
b.tube((LH[0] + 0.09, LH[1], LH[2] + 0.1), (LH[0] + 0.12, LH[1], LH[2] + 0.1), 0.08, 0.05, GEAR, 'handL', sides=6)
part(b)

fg_rig.biped_clips(rig)
fg_rig.biped_emote_clips(rig)
rig.clip('Atacar', [
    (1, p()),
    (8, p(chest=(0, 0, 28), spine=(0, 0, 10), upperArmR=(-140, -25, 0), foreArmR=(-50, 0, 0), thighR=(10, 0, 0), thighL=(-12, 0, 0), shinL=(10, 0, 0)), (0, 0, -0.02)),
    (12, p(chest=(14, 0, -32), spine=(8, 0, -12), upperArmR=(-50, -8, 0), foreArmR=(-12, 0, 0), thighR=(-26, 0, 0), shinR=(16, 0, 0), thighL=(14, 0, 0), shinL=(18, 0, 0)), (0, -0.05, -0.05)),
    (16, p(chest=(10, 0, -20), upperArmR=(-30, -6, 0), foreArmR=(-20, 0, 0), thighR=(-20, 0, 0), shinR=(14, 0, 0), thighL=(12, 0, 0), shinL=(14, 0, 0)), (0, -0.04, -0.04)),
    (24, p()),
])
rig.clip('Lanzar', [
    (1, p()),
    (9, p(chest=(-14, 0, 0), head=(-8, 0, 0), upperArmR=(-120, -18, 0), upperArmL=(-120, 18, 0), foreArmR=(-40, 0, 0), foreArmL=(-40, 0, 0)), (0, 0.02, 0)),
    (14, p(chest=(14, 0, 0), head=(6, 0, 0), upperArmR=(-88, -6, 0), upperArmL=(-88, 6, 0), foreArmR=(-6, 0, 0), foreArmL=(-6, 0, 0), thighR=(-18, 0, 0), shinR=(10, 0, 0), thighL=(10, 0, 0), shinL=(10, 0, 0)), (0, -0.04, -0.03)),
    (20, p(chest=(8, 0, 0), upperArmR=(-70, -6, 0), upperArmL=(-70, 6, 0), foreArmR=(-14, 0, 0), foreArmL=(-14, 0, 0))),
    (27, p()),
])
rig.export('personaje.glb')
