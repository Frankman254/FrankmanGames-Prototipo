# Hilo de retorno (OMP-DUN-01): la madeja de oro del Ovillo de regreso atada a
# una estaca de madera, con el cabo tendido en el suelo y brillo emisivo leve
# para que se vea en la oscuridad de cada piso de la cripta.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/hilo_retorno.py
# Static prop — malla unica `prop_hilo_retorno`, ≤ 400 tri, sin rig. En `assets/
# models/prop_hilo_retorno.glb`; la colocacion por piso la conecta el programa-
# dor desde data/ (no se toca). Clean-room, desde cero.
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg


def mats():
    return dict(
        madera=fg.material('madera', (0.32, 0.2, 0.11)),
        hilo=fg.material('hilo', (0.85, 0.65, 0.22), rough=0.45),
        # el canal de brillo de la paleta: el hilo dora la oscuridad del piso
        brillo=fg.material('brillo_hilo', (1.0, 0.78, 0.32), emit=(1.0, 0.78, 0.32), strength=0.9),
    )


def madeja(b, m, centro, r):
    """Ovillo compacto: nucleo redondo con cuatro aros de hilo cruzados por
    delante en planos distintos (los bordes de las vueltas)."""
    b.blob(centro, (r,) * 3, m['hilo'], subdiv=1)

    def plano(u, w, rad):
        return [(centro[0] + rad * (math.cos(t) * u[0] + math.sin(t) * w[0]),
                 centro[1] + rad * (math.cos(t) * u[1] + math.sin(t) * w[1]),
                 centro[2] + rad * (math.cos(t) * u[2] + math.sin(t) * w[2]))
                for t in (2 * math.pi * j / 8 for j in range(9))]
    planos = (
        ((1, 0, 0), (0, 0, 1)),
        ((0.25, 0.9, 0.35), (-0.9, 0.25, 0.3)),
        ((0.6, 0.35, -0.7), (0.35, -0.85, 0.4)),
        ((0.7, 0, 0.7), (0, 1, 0)),
    )
    for u, w in planos:
        pts = plano(u, w, r * 0.88)
        for j in range(len(pts) - 1):
            b.tube(pts[j], pts[j + 1], r * 0.2, r * 0.2, m['brillo'], sides=3)
    return (centro[0], centro[1], centro[2] - r * 0.95)


def construir():
    scene = fg.reset()
    m = mats()
    b = fg.Builder('prop_hilo_retorno')
    # estaca de madera torcida con punta
    b.tube((0, 0, 0.02), (0.015, 0.02, 0.34), 0.038, 0.032, m['madera'], sides=5)
    b.tube((0.015, 0.02, 0.34), (-0.01, 0.005, 0.6), 0.032, 0.026, m['madera'], sides=5)
    b.tube((-0.01, 0.005, 0.6), (-0.006, 0.01, 0.68), 0.026, 0.008, m['madera'], sides=5)
    # nudo y madeja colgada del tope
    b.tube((-0.008, 0.008, 0.63), (0.02, 0.02, 0.52), 0.014, 0.014, m['hilo'], sides=3)
    madeja(b, m, (0.05, 0.03, 0.44), 0.115)
    # el cabo cae del ovillo en catenaria y se afloja por el suelo en curvas
    prev = (0.05, 0.03, 0.33)
    for q in ((0.12, 0.0, 0.18), (0.2, -0.04, 0.06), (0.32, -0.02, 0.022),
              (0.46, 0.05, 0.026), (0.58, 0.03, 0.022), (0.7, -0.05, 0.026),
              (0.82, -0.02, 0.022), (0.92, 0.06, 0.024)):
        b.tube(prev, q, 0.016, 0.016, m['brillo'], sides=3)
        prev = q
    o = b.object(scene)
    o.data.calc_loop_triangles()
    tri = len(o.data.loop_triangles)
    assert tri <= 400, f'{tri} tri > 400'
    fg.export('prop_hilo_retorno.glb', scene, [o], materials=True)
    print(f'prop_hilo_retorno: {tri} tri')
    return tri, o


if __name__ == '__main__':
    construir()
    out = os.path.join(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')),
                       'arte', 'blender', 'hilo_retorno.blend')
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print('blend guardado:', out)
