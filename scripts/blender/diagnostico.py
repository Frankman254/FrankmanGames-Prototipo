# Diagnóstico FK de los GLB piloto (2026-11-12), sin Blender: recorre la
# jerarquía de huesos con los canales del glTF y mide lo que el ojo verá mal:
#  - deslizamiento: desplazamiento horizontal de la puntera mientras está apoyada
#    (frame donde el pie es el más bajo de los dos en ese instante);
#  - Disparar: a 1,20 m (longitud del arco de cazador.py), ¿dónde cae la mano R
#    respecto a los extremos de la cuerda? ¿y la mano L respecto a la empuñadura?
# Uso: python3 diagnostico.py cazador_anime.glb
import json
import struct
import sys
from math import sqrt

import numpy as np

FPS = 24
Cadena = {
    'spine': 'hips', 'chest': 'spine', 'head': 'chest',
    'upperArmL': 'chest', 'foreArmL': 'upperArmL', 'handL': 'foreArmL',
    'upperArmR': 'chest', 'foreArmR': 'upperArmR', 'handR': 'foreArmR',
    'thighL': 'hips', 'shinL': 'thighL', 'footL': 'shinL',
    'thighR': 'hips', 'shinR': 'thighR', 'footR': 'shinR',
}
HUESOS = list(Cadena) + ['hips']


def load(path):
    d = open(path, 'rb').read()
    ln = struct.unpack('<I', d[12:16])[0]
    g = json.loads(d[20:20 + ln])
    bo = 20 + ln  # cabecera del chunk BIN: [longitud(4)][tipo(4)]
    blen = struct.unpack('<I', d[bo:bo + 4])[0]
    buf = d[bo + 8:bo + 8 + blen]
    return g, buf


def acc(g, buf, i):
    a = g['accessors'][i]
    bv = g['bufferViews'][a['bufferView']]
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    fmt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}[a['componentType']]
    w = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    es = np.dtype(fmt).itemsize
    stride = bv.get('byteStride')
    if stride:
        dt = np.dtype(fmt).newbyteorder('<')
        raw = np.frombuffer(buf[base:base + a['count'] * stride], dtype=np.uint8).reshape(a['count'], stride)
        return raw[:, :w * es].copy().view(dt).reshape(a['count'], w).astype(float)
    return np.frombuffer(buf[base:base + a['count'] * w * es], dtype=fmt).reshape(a['count'], w).astype(float)


def canales(anim, g, buf):
    """{hueso: {path: (times, values)}}"""
    out = {}
    for c in anim['channels']:
        n = g['nodes'][c['target']['node']].get('name')
        if n not in HUESOS:
            continue
        s = anim['samplers'][c['sampler']]
        out.setdefault(n, {})[c['target']['path']] = (acc(g, buf, s['input']), acc(g, buf, s['output']))
    return out


def lerpr(t, ch, path, base):
    if path not in ch:
        return base
    tt, tv = ch[path]
    tt = tt[:, 0]
    if t <= float(tt[0]):
        return tv[0]
    if t >= float(tt[-1]):
        return tv[-1]
    j = int(np.searchsorted(tt, t))
    f = (t - float(tt[j - 1])) / (float(tt[j]) - float(tt[j - 1]))
    return tv[j - 1] * (1 - f) + tv[j] * f


def pose_local(anim, g, buf, ch_cache, t):
    loc = {}
    for n in HUESOS:
        node = next(nd for nd in g['nodes'] if nd.get('name') == n)
        ch = ch_cache.get(n, {})
        T = np.array(lerpr(t, ch, 'translation', np.array(node.get('translation', (0, 0, 0)), float)), float)
        Q = np.array(lerpr(t, ch, 'rotation', np.array(node.get('rotation', (0, 0, 0, 1)), float)), float)
        Q = Q / np.linalg.norm(Q)
        x, y, z, w = Q
        R = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        loc[n] = (T, R)
    return loc


def world(loc):
    W = {}
    for n in ['hips', *[h for h in HUESOS if h != 'hips']]:
        T, R = loc[n]
        if n == 'hips':
            W[n] = (R, T)
        else:
            pR, pT = W[Cadena[n]]
            W[n] = (pR @ R, pR @ T + pT)
    return W


def punta(W, side):
    """Puntera: offset (-Y delante, bajo) en Blender → (x, z, −y) en glTF (Y arriba)."""
    R, T = W['foot' + side]
    return R @ np.array((0, -0.02, 0.13)) + T


def talon(W, side):
    R, T = W['foot' + side]
    return R @ np.array((0, -0.02, -0.02)) + T


if __name__ == '__main__':
    path = sys.argv[1]
    g, buf = load(path)
    print(f'== {path}')
    for a in g['animations']:
        name = a.get('name')
        if name not in ('Caminar', 'Correr', 'Disparar', 'Lanzar', 'Atacar'):
            continue
        ch = canales(a, g, buf)
        dur = max(float(acc(g, buf, s['input'])[-1][0]) for s in a['samplers'])
        nf = round(dur * FPS)
        print(f'\n-- {name} ({dur:.3f} s, {nf} f)')
        if name in ('Caminar', 'Correr'):
            Ws = [world(pose_local(a, g, buf, ch, f / FPS)) for f in range(nf)]
            for side in ('L', 'R'):
                desl = []
                for i in range(nf):
                    p_i, t_i = punta(Ws[i], side), talon(Ws[i], side)
                    h = min(p_i[1], t_i[1])
                    apoyo = h < 0.02 and all(
                        min(punta(Ws[i], s2)[1], talon(Ws[i], s2)[1]) >= h - 0.005 for s2 in ('L', 'R') if s2 != side)
                    if apoyo:
                        j = (i + 1) % nf
                        d = punta(Ws[j], side) - p_i
                        dxy = sqrt(d[0] ** 2 + d[2] ** 2)
                        desl.append((i / FPS, dxy))
                if desl:
                    mx = max(desl, key=lambda x: x[1])
                    print(f'  pie{side}: apoyo en {len(desl)} frames, derrape máx {mx[1]*100:.1f} cm/f en t={mx[0]:.2f}s'
                          f' (~{mx[1]*FPS:.2f} m/s)')
        if name == 'Disparar':
            # Arco como en cazador.py (Blender): mano L = empuñadura, extremos ±0,62,
            # cuerda a +Y≈0,09 tras GIRO. Convertimos glTF→Blender: (x,−z,y).
            toB = lambda v: np.array((v[0], -v[2], v[1]))
            for f in (8, 15, 17):
                W = world(pose_local(a, g, buf, ch, f / FPS))
                hL, hR = toB(W['handL'][1]), toB(W['handR'][1])
                R_L = toB(W['handL'][0][:, 0]), toB(W['handL'][0][:, 1]), toB(W['handL'][0][:, 2])
                Rz = np.column_stack(R_L)  # ejes Blender de la mano L
                grip = hL
                top = grip + Rz @ np.array((0, 0.09, 0.62))
                bot = grip + Rz @ np.array((0, 0.09, -0.62))
                dv = top - bot
                s = max(0.0, min(1.0, float((hR - bot) @ dv / (dv @ dv))))
                cuerd = bot + dv * s
                dist = float(np.linalg.norm(hR - cuerd))
                print(f'  f{f}: manoR→cuerda {dist*100:.1f} cm; '
                      f'empuñadura {np.round(grip,2)}; extremos {np.round(top,2)}/{np.round(bot,2)}; '
                      f'arco eje {np.round(Rz @ np.array((0,0,1)),2)}')
