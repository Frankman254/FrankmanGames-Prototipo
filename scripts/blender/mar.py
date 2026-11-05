# Textura del mar: color y relieve de las olas, repetibles sin costura.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/mar.py
# Escribe assets/textures/mar.png y assets/textures/mar_relieve.png.
import os
import sys
import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg

TEXTURES = os.path.normpath(os.path.join(fg.MODELS, '..', 'textures'))
SIZE = 512


def waves(rng):
    """Suma de ondas que encajan en el borde: crestas largas con varias direcciones."""
    t = np.arange(SIZE) * 2 * np.pi / SIZE
    x, y = np.meshgrid(t, t)
    h = np.zeros((SIZE, SIZE))
    for _ in range(60):
        fx, fy = rng.integers(-16, 17), rng.integers(4, 34)
        amp = 1 / (6 + np.hypot(fx, fy))
        h += amp * np.sin(fx * x + fy * y + rng.random() * 2 * np.pi)
    h = (h - h.min()) / (h.max() - h.min())
    return h


def save(name, rgb):
    px = np.ones((SIZE, SIZE, 4), dtype=np.float32)
    px[..., :3] = rgb
    img = bpy.data.images.new(name, SIZE, SIZE, alpha=True)
    img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = os.path.join(TEXTURES, name + '.png')
    img.file_format = 'PNG'
    img.save()


h = waves(np.random.default_rng(71))
deep = np.array([0.07, 0.29, 0.42])
light = np.array([0.16, 0.47, 0.56])
foam = np.array([0.82, 0.92, 0.93])
crest = np.clip((h - 0.78) / 0.1, 0, 1)[..., None]
color = deep + (light - deep) * h[..., None]
save('mar', color * (1 - crest * 0.55) + foam * crest * 0.55)

STRENGTH = 9.0
dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * STRENGTH
dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * STRENGTH
n = np.dstack((-dx, -dy, np.ones_like(h)))
n /= np.linalg.norm(n, axis=2, keepdims=True)
save('mar_relieve', n * 0.5 + 0.5)
print('mar listo')
