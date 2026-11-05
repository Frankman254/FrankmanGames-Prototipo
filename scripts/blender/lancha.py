# Lancha de madera para cruzar de Iguanera a Pedasol, con clip "Reposo": se mece en la orilla.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/lancha.py
# Escribe assets/models/lancha.glb. Proa hacia +X, base en z = 0.
import os
import sys
import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

LENGTH = 4.6
BEAM = 1.5


def hull_section(y, inset=0.0):
    """Perfil del casco visto de lado (x, z): popa recta y proa que sube."""
    half = LENGTH / 2
    return [(-half + inset, y, 0.12), (half - 0.9, y, 0.0), (half, y, 0.55), (half - 0.15, y, 0.78), (-half + inset, y, 0.7)]


scene = fg.reset()
blue = fg.material('Casco', (0.08, 0.32, 0.55), rough=0.7)
yellow = fg.material('Franja', (0.88, 0.66, 0.16), rough=0.7)
wood = fg.material('Tablas', (0.45, 0.29, 0.15), rough=0.85)
dark = fg.material('Motor', (0.12, 0.12, 0.13), metallic=0.3, rough=0.5)

b = fg.Builder('FG_Lancha')
b.poly(hull_section(-BEAM / 2), hull_section(BEAM / 2), blue)
# Franja amarilla a lo largo de la borda, por las dos bandas.
for side in (-1, 1):
    y = side * (BEAM / 2 + 0.01)
    b.box((-0.2, y, 0.6), (LENGTH - 1.3, 0.02, 0.1), yellow)
# Fondo y bancos de tablas.
b.box((-0.3, 0, 0.72), (LENGTH - 1.8, BEAM - 0.2, 0.04), wood)
for x in (-1.3, 0.0, 1.0):
    b.box((x, 0, 0.92), (0.32, BEAM - 0.1, 0.06), wood)
# Motor fuera de borda en la popa.
b.box((-LENGTH / 2 - 0.12, 0, 0.92), (0.3, 0.32, 0.42), dark)
b.tube((-LENGTH / 2 - 0.12, 0, 0.7), (-LENGTH / 2 - 0.12, 0, 0.1), 0.05, 0.05, dark)
root = b.object(scene)

frames = 60
keys = [(f, 3.0 * __import__('math').sin(2 * __import__('math').pi * (f - 1) / frames)) for f in range(1, frames + 2, 5)]
act = fg.key_rotation(root, 'Reposo', keys, axis=0)
ad = root.animation_data
ad.action = None
track = ad.nla_tracks.new()
track.name = 'Reposo'
track.strips.new(act.name, 1, act)
fg.export('lancha.glb', scene, [root])
print('lancha lista')
