# Piezas del pueblo de Azuero, de geometría propia, cada una con su clip "Reposo" en bucle.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/pueblo.py
# Escribe assets/models/iglesia.glb y trapiche.glb. Medidas en metros, base en z=0; el frente
# mira hacia -Y. Inspiradas en la idea general de las iglesias coloniales de la península y
# de un trapiche de bueyes: no reproducen ningún edificio real.
import math
import os
import sys
import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg


def gable(b, x0, x1, y0, y1, z, rise, mat, over=0.3):
    """Tejado a dos aguas con la cumbrera a lo largo de Y."""
    xm = (x0 + x1) / 2
    a = [(x0 - over, y0 - over, z), (xm, y0 - over, z + rise), (x1 + over, y0 - over, z)]
    c = [(x0 - over, y1 + over, z), (xm, y1 + over, z + rise), (x1 + over, y1 + over, z)]
    b.poly(a, c, mat)


def iglesia():
    scene = fg.reset()
    lime = fg.material('Cal', (0.9, 0.87, 0.78), rough=0.95)
    trim = fg.material('Remate', (0.2, 0.42, 0.55), rough=0.8)
    tile = fg.material('Teja', (0.56, 0.24, 0.13), rough=0.9)
    wood = fg.material('Madera', (0.27, 0.15, 0.08), rough=0.85)
    dark = fg.material('Hueco', (0.03, 0.025, 0.02), rough=1)
    stone = fg.material('Piedra', (0.5, 0.46, 0.4), rough=0.95)
    bronze = fg.material('Bronce', (0.62, 0.42, 0.14), metallic=0.2, rough=0.5)
    W, D, H = 7.6, 11.5, 5.4
    hw, hd = W / 2, D / 2
    b = fg.Builder('FG_Iglesia')
    b.box((0, 0, -0.45), (W + 0.3, D + 0.3, 1.1), stone)
    b.box((0, 0, H / 2), (W, D, H), lime)
    gable(b, -hw, hw, -hd + 0.8, hd, H, 2.5, tile)
    # Fachada más alta, con remate curvo en escalones.
    b.box((0, -hd + 0.2, (H + 2.3) / 2), (W + 0.3, 0.42, H + 2.3), lime)
    for k, (w, h) in enumerate(((5.0, 0.55), (3.3, 0.5), (1.7, 0.45))):
        z = H + 2.3 + 0.55 * k
        b.box((0, -hd + 0.2, z + h / 2), (w, 0.42, h), lime)
    b.box((0, -hd + 0.2, H + 3.95 + 0.42), (0.14, 0.14, 0.85), wood)
    b.box((0, -hd + 0.2, H + 3.95 + 0.62), (0.5, 0.14, 0.14), wood)
    # Portal azul y ventanas.
    b.box((0, -hd - 0.02, 1.35), (2.3, 0.2, 2.9), trim)
    b.box((0, -hd - 0.08, 1.2), (1.75, 0.16, 2.5), wood)
    b.box((0, -hd - 0.1, 3.5), (1.1, 0.14, 1.0), dark)
    for x in (-2.6, 2.6):
        b.box((x, -hd - 0.02, 2.3), (0.9, 0.2, 1.8), trim)
        b.box((x, -hd - 0.08, 2.3), (0.62, 0.14, 1.45), dark)
    for y in (-2.6, 0.6, 3.6):
        for x in (-hw - 0.02, hw + 0.02):
            b.box((x, y, 3.0), (0.14, 1.1, 1.9), trim)
            b.box((x * 1.012, y, 3.0), (0.08, 0.78, 1.5), dark)
    for x in (-hw, hw):
        for y in (-3.9, -0.9, 2.1, 5.1):
            b.box((x * 1.04, y, 1.4), (0.5, 0.5, 2.9), lime)
    # Campanario a un lado de la fachada, con hueco para la campana.
    tx, ty = hw + 1.05, -hd + 1.05
    b.box((tx, ty, -0.4), (2.5, 2.5, 1.0), stone)
    b.box((tx, ty, 3.35), (2.1, 2.1, 6.7), lime)
    for dx, dy in ((-0.85, -0.85), (0.85, -0.85), (-0.85, 0.85), (0.85, 0.85)):
        b.box((tx + dx, ty + dy, 8.1), (0.4, 0.4, 2.8), lime)
    b.box((tx, ty, 9.6), (2.4, 2.4, 0.35), trim)
    b.tube((tx, ty, 9.75), (tx, ty, 11.1), 1.25, 0.08, tile, sides=4)
    b.box((tx, ty, 6.72), (2.3, 2.3, 0.14), trim)
    body = b.object(scene)
    # La campana se balancea colgada de su eje.
    pivot = (tx, ty, 9.25)
    c = fg.Builder('FG_Iglesia_Campana')
    c.tube((tx, ty, 8.3), (tx, ty, 9.15), 0.5, 0.2, bronze, sides=10)
    c.tube((tx, ty, 9.15), (tx, ty, 9.3), 0.2, 0.08, wood, sides=6)
    bell = c.object(scene, parent=body, location=pivot)
    act = fg.key_rotation(bell, 'Reposo', [(1, -10), (31, 10), (61, -10)], axis=0)
    fg.to_tracks(bell, [act])
    bell.rotation_euler = (0, 0, 0)
    fg.export('iglesia.glb', scene, [body, bell])


def trapiche():
    scene = fg.reset()
    wood = fg.material('Madera', (0.3, 0.18, 0.09), rough=0.85)
    dark = fg.material('Madera_oscura', (0.15, 0.09, 0.05), rough=0.9)
    thatch = fg.material('Penca', (0.62, 0.48, 0.24), rough=1)
    stone = fg.material('Piedra', (0.45, 0.41, 0.36), rough=0.95)
    cane = fg.material('Cana', (0.58, 0.66, 0.28), rough=0.8)
    pot = fg.material('Paila', (0.2, 0.17, 0.15), metallic=0.2, rough=0.6)
    syrup = fg.material('Melado', (0.5, 0.26, 0.07), emit=(0.45, 0.18, 0.03), strength=0.5)
    hide = fg.material('Buey', (0.62, 0.5, 0.36), rough=0.95)
    horn = fg.material('Cuerno', (0.85, 0.8, 0.68), rough=0.7)
    b = fg.Builder('FG_Trapiche')
    b.tube((0, 0, -0.4), (0, 0, 0.25), 1.1, 1.05, stone, sides=10)
    # Masas de madera y su marco.
    for x in (-0.36, 0.36):
        b.tube((x, 0, 0.25), (x, 0, 1.45), 0.33, 0.33, wood, sides=10)
    for x in (-0.95, 0.95):
        b.box((x, 0, 1.05), (0.18, 0.5, 2.1), dark)
    b.box((0, 0, 1.55), (2.1, 0.45, 0.2), dark)
    # Canoa que recoge el jugo, hacia el fogón y la paila.
    b.box((0.75, -1.45, 0.35), (0.3, 1.9, 0.14), wood)
    b.tube((0.75, -2.65, -0.2), (0.75, -2.65, 0.5), 0.72, 0.8, stone, sides=9)
    b.tube((0.75, -2.65, 0.5), (0.75, -2.65, 0.72), 0.82, 0.74, pot, sides=12)
    b.tube((0.75, -2.65, 0.7), (0.75, -2.65, 0.73), 0.68, 0.68, syrup, sides=12)
    # Cobertizo de penca junto al corral.
    for dx, dy in ((-2.3, 1.1), (2.3, 1.1), (-2.3, 3.0), (2.3, 3.0)):
        b.tube((dx, dy, -0.2), (dx, dy, 2.35), 0.09, 0.08, dark, sides=6)
    b.poly([(-2.75, 0.7, 2.15), (0, 0.7, 3.2), (2.75, 0.7, 2.15)], [(-2.75, 3.4, 2.15), (0, 3.4, 3.2), (2.75, 3.4, 2.15)], thatch)
    # Atados de caña bajo el cobertizo.
    for k in range(9):
        x = -1.7 + (k % 3) * 0.32
        z = 0.15 + (k // 3) * 0.26
        b.tube((x, 1.2, z), (x, 2.9, z), 0.13, 0.13, cane, sides=6)
    tower = b.object(scene)
    # El palo gira sobre las masas y el buey camina con él.
    r = fg.Builder('FG_Trapiche_Yunta')
    r.tube((0, 0, 1.75), (3.15, 0, 1.15), 0.08, 0.06, dark, sides=6)
    r.tube((0, 0, 1.4), (0, 0, 1.95), 0.16, 0.16, dark, sides=8)
    ox = (3.2, 0, 0)
    r.box((ox[0], 0, 0.82), (0.5, 1.35, 0.72), hide)
    r.box((ox[0], -0.82, 1.03), (0.36, 0.42, 0.42), hide)
    r.box((ox[0], -0.98, 0.92), (0.26, 0.18, 0.2), horn)
    for side in (-1, 1):
        r.tube((ox[0] + side * 0.15, -0.9, 1.22), (ox[0] + side * 0.42, -0.9, 1.45), 0.04, 0.012, horn, sides=4)
        for y in (-0.48, 0.48):
            r.box((ox[0] + side * 0.16, y, 0.25), (0.15, 0.17, 0.62), hide)
    r.box((ox[0], 0.72, 0.9), (0.06, 0.08, 0.5), hide)
    rotor = r.object(scene, parent=tower, location=(0, 0, 0))
    act = fg.key_rotation(rotor, 'Reposo', [(1, 0), (121, 120), (241, 240), (361, 360)], axis=2)
    for fc in act.layers[0].strips[0].channelbags[0].fcurves if act.layers else []:
        for k in fc.keyframe_points:
            k.interpolation = 'LINEAR'
    fg.to_tracks(rotor, [act])
    rotor.rotation_euler = (0, 0, 0)
    fg.export('trapiche.glb', scene, [tower, rotor])


iglesia()
trapiche()
