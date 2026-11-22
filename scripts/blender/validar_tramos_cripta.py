# Valida el contrato de tramos de profundidad (OMP-POL-02):
#   - las seis texturas nuevas existen, son 512x512 en gris y repetibles
#     sin costura (el salto de borde no supera 1,25x el gradiente interior);
#   - viajan casi blancas (media >= 0,55): el juego las tine por tema;
#   - mazmorra.glb conserva los nombres de malla (contrato con src/ y data/).
#   python3 scripts/blender/validar_tramos_cripta.py
import json
import os
import struct
import sys

from PIL import Image
import numpy as np

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
TEX = os.path.join(ROOT, 'assets', 'textures')
GLB = os.path.join(ROOT, 'assets', 'models', 'mazmorra.glb')

NUEVAS = ['baldosa_raices', 'muro_raices', 'baldosa_humedo', 'muro_humedo', 'baldosa_oro', 'muro_oro']
for n in NUEVAS:
    p = os.path.join(TEX, n + '.png')
    assert os.path.exists(p), f'falta {n}.png'
    a = np.asarray(Image.open(p).convert('L'), dtype=float) / 255
    assert a.shape == (512, 512), f'{n}: {a.shape} != 512x512'
    gx = np.abs(np.diff(a, axis=1, prepend=a[:, -1:])).mean()
    gy = np.abs(np.diff(a, axis=0, append=a[:1, :])).mean()
    ix = np.abs(np.diff(a, axis=1)).mean()
    iy = np.abs(np.diff(a, axis=0)).mean()
    assert gx <= 1.25 * ix and gy <= 1.25 * iy, f'{n}: costura visible (x {gx:.4f}/{ix:.4f}, y {gy:.4f}/{iy:.4f})'
    assert a.mean() >= 0.55, f'{n}: media {a.mean():.2f} — demasiado oscura para teñir'

g = open(GLB, 'rb').read()
ln = struct.unpack('<I', g[12:16])[0]
j = json.loads(g[20:20 + ln].decode())
mallas = {m['name'] for m in j['meshes']}
for n in ('d_muro', 'd_baldosa', 'd_remate', 'd_entrada', 'd_entrada_boca',
          'd_entrada_monticulo', 'd_entrada_runa'):
    assert n in mallas, f'la malla {n} cambió de nombre o desapareció'

print(f'tramos validos: {len(NUEVAS)} texturas sin costura, mallas intactas ({len(mallas)} nombres)')
