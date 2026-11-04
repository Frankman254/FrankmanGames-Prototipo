# Casas de geometría propia con puerta articulada: clips "Abrir" y "Cerrar".
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/casa.py
# Escribe assets/models/casa.glb y casa_dorada.glb. La puerta mira hacia -Y (+Z en el juego).
# Huella de 7 x 6 m: el juego la adapta al ancho y al fondo de cada casa en data/vegetation.json.
import os
import sys
import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

W, D = 7.0, 6.0
WALL_H, ROOF_H = 2.8, 1.9
DOOR_W, DOOR_H = 1.1, 2.0


def build(filename, wall_rgb, roof_rgb, wood_rgb, trim_rgb):
    scene = fg.reset()
    wall = fg.material('Pared', wall_rgb, rough=0.9)
    roof = fg.material('Tejado', roof_rgb, rough=0.85)
    wood = fg.material('Madera', wood_rgb, rough=0.8)
    trim = fg.material('Remate', trim_rgb, rough=0.6)
    stone = fg.material('Piedra', (0.34, 0.33, 0.31), rough=0.95)
    glass = fg.material('Ventana', (0.95, 0.72, 0.32), emit=(1.0, 0.62, 0.22), strength=1.2)
    dark = fg.material('Interior', (0.015, 0.012, 0.01), rough=1.0)
    hw, hd = W / 2, D / 2

    b = fg.Builder('FG_Casa')
    # Zócalo de piedra: baja bajo tierra para cubrir terreno en cuesta.
    b.box((0, 0, -0.45), (W + 0.16, D + 0.16, 1.5), stone)
    # Paredes con el hueco de la puerta.
    b.box((-(hw + DOOR_W / 2) / 2, -hd + 0.1, WALL_H / 2 + 0.15), (hw - DOOR_W / 2, 0.2, WALL_H - 0.3), wall)
    b.box(((hw + DOOR_W / 2) / 2, -hd + 0.1, WALL_H / 2 + 0.15), (hw - DOOR_W / 2, 0.2, WALL_H - 0.3), wall)
    b.box((0, -hd + 0.1, (WALL_H + DOOR_H + 0.1) / 2), (DOOR_W + 0.02, 0.2, WALL_H - DOOR_H - 0.1), wall)
    b.box((0, hd - 0.1, WALL_H / 2 + 0.15), (W, 0.2, WALL_H - 0.3), wall)
    for x in (-1, 1):
        b.box((x * (hw - 0.1), 0, WALL_H / 2 + 0.15), (0.2, D - 0.4, WALL_H - 0.3), wall)
    # Hueco oscuro detrás de la puerta.
    b.box((0, -hd + 0.45, 1.2), (DOOR_W + 0.4, 0.5, 2.4), dark)
    # Vigas: esquinas, dintel y solera.
    for x in (-1, 1):
        for y in (-1, 1):
            b.box((x * (hw - 0.02), y * (hd - 0.02), WALL_H / 2), (0.24, 0.24, WALL_H), wood)
    b.box((0, -hd - 0.01, WALL_H - 0.08), (W + 0.04, 0.2, 0.2), wood)
    b.box((0, hd + 0.01, WALL_H - 0.08), (W + 0.04, 0.2, 0.2), wood)
    for x in (-1, 1):
        b.box((x * (hw + 0.01), 0, WALL_H - 0.08), (0.2, D + 0.04, 0.2), wood)
    for x in (-1, 1):
        b.box((x * (DOOR_W / 2 + 0.07), -hd - 0.02, DOOR_H / 2 + 0.05), (0.14, 0.2, DOOR_H + 0.1), wood)
    b.box((0, -hd - 0.02, DOOR_H + 0.13), (DOOR_W + 0.42, 0.22, 0.16), wood)
    b.box((0, -hd - 0.3, 0.06), (DOOR_W + 0.7, 0.75, 0.12), stone)
    # Ventanas con marco y cruceta, que brillan de noche.
    for sx in (-1, 1):
        cx = sx * (hw * 0.58)
        b.box((cx, -hd - 0.005, 1.65), (0.85, 0.1, 0.85), wood)
        b.box((cx, -hd - 0.035, 1.65), (0.66, 0.08, 0.66), glass)
        b.box((cx, -hd - 0.055, 1.65), (0.06, 0.06, 0.68), wood)
        b.box((cx, -hd - 0.055, 1.65), (0.68, 0.06, 0.06), wood)
        b.box((cx, -hd - 0.11, 1.17), (0.95, 0.22, 0.07), wood)
        b.box((sx * (hw + 0.005), 0.3, 1.65), (0.1, 0.8, 0.8), wood)
        b.box((sx * (hw + 0.03), 0.3, 1.65), (0.08, 0.6, 0.6), glass)
    # Tejado a dos aguas con alero, y hastiales de pared.
    over_x, over_y = 0.4, 0.45
    front = (-W / 2 - over_x, -D / 2 - over_y, WALL_H - 0.1)
    b.poly(
        [(-hw - over_x, -hd - over_y, WALL_H - 0.1), (-hw - over_x, hd + over_y, WALL_H - 0.1), (-hw - over_x, 0, WALL_H + ROOF_H)],
        [(hw + over_x, -hd - over_y, WALL_H - 0.1), (hw + over_x, hd + over_y, WALL_H - 0.1), (hw + over_x, 0, WALL_H + ROOF_H)],
        roof,
    )
    b.box((0, 0, WALL_H + ROOF_H + 0.03), (W + over_x * 2 + 0.1, 0.22, 0.14), trim)
    # Tejas: hileras en relieve en las dos aguas.
    import math
    slope = math.atan2(ROOF_H + 0.1, hd + over_y)
    for sy in (-1, 1):
        for i in range(1, 5):
            t = i / 5
            y = sy * (hd + over_y) * (1 - t)
            z = WALL_H - 0.1 + (ROOF_H + 0.1) * t + 0.02
            b.box((0, y, z), (W + over_x * 2 + 0.02, 0.1, 0.06), roof, rot=(sy * slope, 'X'))
    # Chimenea.
    b.box((hw * 0.5, hd * 0.35, WALL_H + ROOF_H * 0.72), (0.65, 0.65, 1.7), stone)
    b.box((hw * 0.5, hd * 0.35, WALL_H + ROOF_H * 0.72 + 0.88), (0.78, 0.78, 0.12), trim)
    house = b.object(scene)

    # Puerta: pieza aparte con el pivote en su bisagra izquierda.
    d = fg.Builder('FG_Casa_Puerta')
    hinge = (-DOOR_W / 2, -hd + 0.02, 0)
    y = -hd + 0.02
    for i in range(4):
        pw = DOOR_W / 4
        d.box((-DOOR_W / 2 + pw * (i + 0.5), y, DOOR_H / 2 + 0.05), (pw - 0.012, 0.07, DOOR_H - 0.02), wood)
    for z in (0.45, DOOR_H - 0.35):
        d.box((0, y - 0.04, z), (DOOR_W - 0.04, 0.03, 0.09), trim)
    d.blob((DOOR_W / 2 - 0.13, y - 0.07, 1.05), (0.05, 0.05, 0.05), trim, subdiv=1)
    door = d.object(scene, parent=house, location=hinge)
    door.rotation_mode = 'XYZ'
    abrir = fg.key_rotation(door, 'Abrir', [(1, 0), (5, -8), (16, 112), (21, 100), (25, 104)], axis=2)
    cerrar = fg.key_rotation(door, 'Cerrar', [(1, 104), (14, -3), (17, 1.5), (20, 0)], axis=2)
    fg.to_tracks(door, [abrir, cerrar])
    door.rotation_euler = (0, 0, 0)
    fg.export(filename, scene, [house, door])


build('casa.glb', (0.62, 0.53, 0.4), (0.4, 0.15, 0.09), (0.17, 0.09, 0.045), (0.3, 0.25, 0.2))
build('casa_dorada.glb', (0.68, 0.56, 0.32), (0.55, 0.36, 0.08), (0.2, 0.09, 0.05), (0.85, 0.66, 0.2))
