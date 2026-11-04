# Piezas del mapa con vida propia: clip "Reposo" en bucle.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/mapa.py
# Escribe assets/models/farola.glb, pozo.glb y molino.glb. Medidas en metros, base en z=0.
import math
import os
import sys
import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg


def materials():
    return {
        'iron': fg.material('Hierro', (0.14, 0.14, 0.15), metallic=0.15, rough=0.6),
        'wood': fg.material('Madera', (0.25, 0.14, 0.07), rough=0.85),
        'dark': fg.material('Madera_oscura', (0.12, 0.07, 0.04), rough=0.85),
        'stone': fg.material('Piedra', (0.42, 0.4, 0.37), rough=0.95),
        'stone2': fg.material('Piedra_clara', (0.55, 0.52, 0.47), rough=0.95),
        'roof': fg.material('Tejado', (0.4, 0.15, 0.09), rough=0.85),
        'cloth': fg.material('Lona', (0.78, 0.72, 0.58), rough=0.95),
        'glow': fg.material('Luz', (1.0, 0.72, 0.3), emit=(1.0, 0.55, 0.15), strength=1.1),
        'water': fg.material('Agua', (0.05, 0.16, 0.2), rough=0.2),
    }


def farola():
    scene = fg.reset()
    m = materials()
    b = fg.Builder('FG_Farola')
    b.tube((0, 0, 0), (0, 0, 0.18), 0.2, 0.15, m['stone'], sides=6)
    b.tube((0, 0, 0.18), (0, 0, 2.95), 0.08, 0.05, m['iron'], sides=6)
    b.box((0, 0, 0.9), (0.14, 0.14, 0.06), m['iron'])
    b.box((0.26, 0, 2.92), (0.62, 0.05, 0.05), m['iron'])
    b.box((0.5, 0, 2.86), (0.03, 0.03, 0.12), m['iron'])
    post = b.object(scene)
    # El farol cuelga de su gancho y se mece con el viento.
    pivot = (0.5, 0, 2.8)
    f = fg.Builder('FG_Farola_Farol')
    f.tube((0.5, 0, 2.5), (0.5, 0, 2.78), 0.11, 0.09, m['glow'], sides=6)
    f.tube((0.5, 0, 2.77), (0.5, 0, 2.83), 0.14, 0.04, m['iron'], sides=6)
    f.tube((0.5, 0, 2.46), (0.5, 0, 2.51), 0.08, 0.13, m['iron'], sides=6)
    for a in range(3):
        t = math.radians(a * 120 + 30)
        p = (0.5 + 0.11 * math.cos(t), 0.11 * math.sin(t))
        f.box((p[0], p[1], 2.64), (0.018, 0.018, 0.32), m['iron'])
    lantern = f.object(scene, parent=post, location=pivot)
    a = fg.key_rotation(lantern, 'Reposo', [(1, 0), (31, 5), (61, 0), (91, -5), (121, 0)], axis=1)
    fg.to_tracks(lantern, [a])
    lantern.rotation_euler = (0, 0, 0)
    fg.export('farola.glb', scene, [post, lantern])


def pozo():
    scene = fg.reset()
    m = materials()
    b = fg.Builder('FG_Pozo')
    b.tube((0, 0, 0), (0, 0, 0.82), 0.82, 0.78, m['stone'], sides=10)
    b.tube((0, 0, 0.82), (0, 0, 0.92), 0.86, 0.86, m['stone2'], sides=10)
    b.tube((0, 0, 0.9), (0, 0, 0.94), 0.62, 0.62, m['water'], sides=10)
    for x in (-1, 1):
        b.box((x * 0.72, 0, 1.55), (0.13, 0.13, 1.6), m['wood'])
    b.tube((-0.74, 0, 1.92), (0.74, 0, 1.92), 0.07, 0.07, m['dark'], sides=7)
    b.poly(
        [(-1.05, -0.78, 2.2), (-1.05, 0.78, 2.2), (-1.05, 0, 2.86)],
        [(1.05, -0.78, 2.2), (1.05, 0.78, 2.2), (1.05, 0, 2.86)],
        m['roof'],
    )
    base = b.object(scene)
    # Cubo: gira en su cuerda bajo el torno.
    pivot = (0, 0, 1.88)
    c = fg.Builder('FG_Pozo_Cubo')
    c.tube((0, 0, 1.38), (0, 0, 1.88), 0.012, 0.012, m['cloth'], sides=4)
    c.tube((0, 0, 1.12), (0, 0, 1.38), 0.13, 0.16, m['wood'], sides=8)
    c.tube((0, 0, 1.3), (0, 0, 1.34), 0.17, 0.17, m['iron'], sides=8)
    bucket = c.object(scene, parent=base, location=pivot)
    a = fg.key_rotation(bucket, 'Reposo', [(1, 0), (46, 4), (91, 0), (136, -4), (181, 0)], axis=0)
    fg.to_tracks(bucket, [a])
    bucket.rotation_euler = (0, 0, 0)
    fg.export('pozo.glb', scene, [base, bucket])


def molino():
    scene = fg.reset()
    m = materials()
    b = fg.Builder('FG_Molino')
    b.tube((0, 0, -0.6), (0, 0, 1.0), 2.3, 2.15, m['stone'], sides=10)
    b.tube((0, 0, 1.0), (0, 0, 6.2), 2.1, 1.45, m['stone2'], sides=10)
    b.tube((0, 0, 3.4), (0, 0, 3.6), 1.86, 1.84, m['wood'], sides=10)
    b.tube((0, 0, 6.2), (0, 0, 6.35), 1.65, 1.65, m['dark'], sides=10)
    b.tube((0, 0, 6.35), (0, 0, 8.1), 1.65, 0.1, m['roof'], sides=10)
    # Puerta falsa y ventanas: el molino no se visita.
    b.box((0, -2.13, 1.0), (1.05, 0.15, 2.0), m['dark'])
    b.box((0, -2.18, 2.08), (1.25, 0.15, 0.16), m['wood'])
    for z, y in ((3.0, -1.86), (4.9, -1.58)):
        b.box((0, y, z), (0.62, 0.12, 0.76), m['wood'])
        b.box((0, y - 0.04, z), (0.42, 0.1, 0.56), m['glow'])
    b.tube((0, -1.5, 6.1), (0, -2.25, 6.1), 0.14, 0.14, m['dark'], sides=8)
    tower = b.object(scene)
    # Aspas: un solo objeto que gira sin parar sobre su eje.
    pivot = (0, -2.25, 6.1)
    r = fg.Builder('FG_Molino_Aspas')
    r.tube((0, -2.15, 6.1), (0, -2.42, 6.1), 0.2, 0.15, m['dark'], sides=8)
    L = 4.3
    for k in range(4):
        t = math.radians(90 * k)
        cx, cz = math.cos(t), math.sin(t)
        # Brazo y lona con un listón a cada lado.
        def at(u, v):
            return (u * cx - v * cz, -2.32, 6.1 + u * cz + v * cx)
        r.tube(at(0.1, 0), at(L, 0), 0.05, 0.035, m['dark'], sides=4)
        r.poly(
            [at(1.1, 0.05), at(L, 0.05), at(L, 0.74), at(1.1, 0.74)],
            [(p[0], p[1] + 0.03, p[2]) for p in (at(1.1, 0.05), at(L, 0.05), at(L, 0.74), at(1.1, 0.74))],
            m['cloth'],
        )
        for u in (1.1, 2.2, 3.3, L):
            r.tube(at(u, -0.03), at(u, 0.78), 0.02, 0.02, m['dark'], sides=4)
        r.tube(at(1.1, 0.77), at(L, 0.77), 0.02, 0.02, m['dark'], sides=4)
    rotor = r.object(scene, parent=tower, location=pivot)
    a = fg.key_rotation(rotor, 'Reposo', [(1, 0), (61, 120), (121, 240), (181, 360)], axis=1)
    for fc in a.layers[0].strips[0].channelbags[0].fcurves if a.layers else []:
        for k in fc.keyframe_points:
            k.interpolation = 'LINEAR'
    fg.to_tracks(rotor, [a])
    rotor.rotation_euler = (0, 0, 0)
    fg.export('molino.glb', scene, [tower, rotor])


farola()
pozo()
molino()
