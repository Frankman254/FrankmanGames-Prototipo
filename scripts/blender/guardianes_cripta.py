# Guardianes de la cripta por tramo (OMP-POL-03, PROTOTIPOS: el creador elige
# antes de que nada entre en assets/models/).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup \
#       --python scripts/blender/guardianes_cripta.py
# Hoy los once pisos con guardián se reparten entre cuatro archetipos de zona
# (data/dungeon.json `tiers`), y en la cripta profunda solo hay una silueta de
# bípedo. Este guion planta cuatro guardianes nuevos, uno por tramo de
# `data/dungeon.json` (5-20 losas y raíces, 30-50 cueva húmeda, 60-80 umbral de
# la huaca, 90-100 oro y huesos), cada uno MÁS GRANDE que el base (k 0,85) y con
# silueta legible de lejos. Mismo rig FG_* bipedo, mismos clips que los enemigos
# (Reposo, Caminar, Correr, Atacar, Golpeado, Morir, Lanzar, Rodar). Miran a -Y.
# Escribe los cuatro GLB en work/omp-pol03/ (fg.MODELS reorientado: NO toca
# assets/models/ ni data/ hasta el visto del creador) y salva
# arte/... no: salva el .blend de trabajo en work/omp-pol03/ tambien.
# Clean-room: primitivas propias, sin referencias de FATE ni DOFUS. ≤1250 tri.
import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'work', 'omp-pol03')
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
import fg  # noqa: E402
import fg_rig  # noqa: E402
from fg_rig import p  # noqa: E402

fg.MODELS = OUT  # prototipos al sandbox hasta el visto del creador


def escena(nombre):
    s = fg.fresh_scene(nombre)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    return s


def mats():
    """Paleta propia legible en pasillos oscuros: piel ceniza, hueso viejo,
    lino mortaja, hierro; lo emisivo (`brillo_*`) es lo que se lee de lejos."""
    return dict(
        skin=fg.material('skin', (0.62, 0.55, 0.44)),
        cloth=fg.material('cloth', (0.16, 0.13, 0.12)),
        trim=fg.material('trim', (0.72, 0.68, 0.56)),
        hair=fg.material('hair', (0.20, 0.12, 0.08)),
        gear=fg.material('gear', (0.28, 0.24, 0.20), rough=0.5),
        bone=fg.material('bone', (0.85, 0.80, 0.72)),
        root=fg.material('root', (0.24, 0.17, 0.10), rough=0.85),
        mold=fg.material('mold', (0.22, 0.34, 0.22), rough=0.9),
        wet=fg.material('wet', (0.30, 0.38, 0.40), rough=0.25),
        jade=fg.material('jade', (0.16, 0.45, 0.34), rough=0.45),
        gold=fg.material('gold', (0.78, 0.58, 0.20), metallic=0.9, rough=0.35),
        obsid=fg.material('obsid', (0.06, 0.05, 0.07), rough=0.25),
        glow=fg.material('brillo_gear', (0.85, 0.45, 0.12), emit=(0.85, 0.45, 0.12), strength=1.6),
        halo=fg.material('brillo_trim', (0.55, 0.75, 0.95), emit=(0.55, 0.75, 0.95), strength=1.2),
        fosfo=fg.material('brillo_mold', (0.30, 0.85, 0.70), emit=(0.30, 0.85, 0.70), strength=2.0),
        brasa=fg.material('brillo_gold', (0.95, 0.62, 0.18), emit=(0.95, 0.62, 0.18), strength=1.8),
    )


def torso_piernas(b, m, k, cloth=None):
    """Biped comun: tronco, brazos, piernas sobre el rig de fg_rig."""
    cloth = cloth or m['cloth']

    def v(x, y, z):
        return (x * k, y * k, z * k)
    b.tube(v(0, 0, 0.8), v(0, 0, 0.98), 0.16 * k, 0.15 * k, cloth, 'hips', sides=7, flat=0.72)
    b.tube(v(0, 0, 0.98), v(0, 0, 1.12), 0.15 * k, 0.17 * k, cloth, 'spine', sides=7, flat=0.72)
    b.tube(v(0, 0, 1.12), v(0, 0, 1.32), 0.17 * k, 0.19 * k, cloth, 'chest', sides=7, flat=0.7)
    for s, x in (('L', 1), ('R', -1)):
        b.tube(v(0.2 * x, 0, 1.27), v(0.25 * x, 0, 1.03), 0.05 * k, 0.042 * k, cloth, f'upperArm{s}', sides=5)
        b.tube(v(0.25 * x, 0, 1.05), v(0.27 * x, -0.03, 0.84), 0.042 * k, 0.034 * k, m['skin'], f'foreArm{s}', sides=5)
        b.blob(v(0.27 * x, -0.04, 0.79), (0.04 * k, 0.04 * k, 0.05 * k), m['skin'], f'hand{s}', subdiv=1)
        b.tube(v(0.09 * x, 0, 0.84), v(0.1 * x, 0, 0.46), 0.075 * k, 0.052 * k, cloth, f'thigh{s}', sides=5)
        b.tube(v(0.1 * x, 0, 0.48), v(0.1 * x, 0, 0.1), 0.052 * k, 0.040 * k, m['trim'], f'shin{s}', sides=5)
        b.box(v(0.1 * x, -0.05, 0.05), (0.09 * k, 0.22 * k, 0.09 * k), m['hair'], f'foot{s}')


def extras_golpe(rig, k):
    """Ataque y Lanzar propios de guardián (varia solo el eje del golpe)."""
    rig.clip('Atacar', [
        (1, p()),
        (8, p(chest=(-8, 0, -12), head=(-4, 0, 6), upperArmR=(-80, -16, 0), foreArmR=(-10, 0, 0),
              upperArmL=(-40, 20, 0), foreArmL=(-30, 0, 0), thighL=(-10, 0, 0), thighR=(10, 0, 0))),
        (14, p(chest=(12, 0, -24), head=(4, 0, 10), upperArmR=(-100, -20, 0), foreArmR=(-5, 0, 0),
               upperArmL=(-60, 24, 0), foreArmL=(-40, 0, 0), thighL=(-14, 0, 0), thighR=(14, 0, 0)),
             (0, -0.15 * k, 0.05 * k)),
        (18, p(chest=(6, 0, -10), upperArmR=(-70, -14, 0), foreArmR=(-8, 0, 0),
               upperArmL=(-45, 18, 0), foreArmL=(-32, 0, 0))),
        (28, p()),
    ])
    rig.clip('Lanzar', [
        (1, p()),
        (10, p(chest=(-16, 0, 0), upperArmR=(-140, -16, 0), upperArmL=(-140, 16, 0),
               foreArmR=(-20, 0, 0), foreArmL=(-20, 0, 0)), (0, 0, 0.04 * k)),
        (16, p(chest=(16, 0, 0), upperArmR=(-70, -8, 0), upperArmL=(-70, 8, 0),
               foreArmR=(-10, 0, 0), foreArmL=(-10, 0, 0)), (0, -0.06 * k, -0.02 * k)),
        (26, p()),
    ])


# ============================================================
# 1. RAICERO (tramo 5-20, losas y raices)
# Silueta: jorobado ancho, capa de raices que barre el suelo, farol de craneo
# emisivo en la mano izquierda; la derecha arrastra un podon de raiz.
# ============================================================
def raicero():
    scene = escena('Guardian_Raicero')
    m = mats()
    k = 0.95
    rig = fg_rig.Rig(scene, 'FG_Raicero', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    torso_piernas(b, m, k)

    def v(x, y, z):
        return (x * k, y * k, z * k)
    # joroba: capa de raiz gruesa sobre el pecho, mas ancha que los hombros
    b.tube(v(0, 0.06, 1.30), v(0, 0.16, 0.86), 0.26 * k, 0.20 * k, m['root'], 'chest', sides=7, flat=0.85)
    for x in (-0.16, -0.05, 0.07, 0.17):
        b.tube(v(x, 0.20, 1.18), v(x * 1.15, 0.24, 0.60), 0.028 * k, 0.006 * k, m['root'], 'chest', sides=4)
    # cabeza hundida entre los hombros, capucha de corteza
    hz = 1.47
    b.blob(v(0, 0.02, hz), (0.11 * k, 0.12 * k, 0.12 * k), m['skin'], 'head')
    b.tube(v(0, 0.02, hz + 0.02), v(0, 0.12, hz + 0.22), 0.17 * k, 0.06 * k, m['root'], 'head', sides=6)
    for x in (-1, 1):
        b.blob(v(x * 0.045, -0.085, hz + 0.01), (0.020, 0.013, 0.022), m['glow'], 'head', subdiv=1)
    # podon de raiz en la derecha: baston grueso torcido con nudo emisivo
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2 - 0.62), (hx - 0.03, hy - 0.05, hz2 + 0.95), 0.030, 0.020, m['root'], 'handR', sides=5)
    b.tube((hx - 0.03, hy - 0.05, hz2 + 0.95), (hx + 0.02, hy - 0.02, hz2 + 1.18), 0.020, 0.006, m['root'], 'handR', sides=5)
    b.blob((hx, hy, hz2 + 0.52), (0.045, 0.045, 0.06), m['root'], 'handR', subdiv=1)
    # farol de craneo en la izquierda: calavera colgada de un cordon, ojos encendidos
    b.tube((0.27 * k, -0.05 * k, 0.74 * k), (0.29 * k, -0.09 * k, 0.60 * k), 0.008, 0.008, m['hair'], 'handL', sides=4)
    b.blob((0.29 * k, -0.10 * k, 0.53 * k), (0.055, 0.06, 0.065), m['bone'], 'handL', subdiv=1)
    for dx in (-0.02, 0.02):
        b.blob((0.29 * k + dx, -0.155 * k, 0.545 * k), (0.013, 0.008, 0.015), m['halo'], 'handL', subdiv=1)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    extras_golpe(rig, k)
    rig.export('guardian_raicero.glb')


# ============================================================
# 2. ANFIBIO (tramo 30-50, cueva humeda)
# Silueta: alto y desgarbado, pescuezo largo, aletas costales que gotean,
# redecilla de caena entre los brazos; todo mojado y fosforescente.
# ============================================================
def anfibio():
    scene = escena('Guardian_Anfibio')
    m = mats()
    k = 1.05
    rig = fg_rig.Rig(scene, 'FG_Anfibio', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    torso_piernas(b, m, k, cloth=m['wet'])

    def v(x, y, z):
        return (x * k, y * k, z * k)
    # pescuezo largo y cabeza plana de rana
    b.tube(v(0, 0, 1.30), v(0, -0.05, 1.62), 0.055 * k, 0.065 * k, m['wet'], 'head', sides=5)
    b.blob(v(0, -0.10, 1.70), (0.13 * k, 0.16 * k, 0.075 * k), m['wet'], 'head', subdiv=1)
    for x in (-1, 1):
        b.blob(v(x * 0.075, -0.13, 1.76), (0.032 * k, 0.030 * k, 0.032 * k), m['fosfo'], 'head', subdiv=1)
    # aletas dorsales: tres espinas con fleco de limo
    for y, z, h in ((0.06, 1.24, 0.16), (0.02, 1.08, 0.13), (-0.02, 0.92, 0.10)):
        b.card([v(0, y + 0.03, z), v(0, y - 0.02, z), v(0, y + 0.01, z + h)], m['mold'], 'spine')
    # aletas costales a cada lado del torso (la silueta se ensancha y ondea)
    for x in (-1, 1):
        b.poly([v(x * 0.19, 0.02, 1.24), v(x * 0.17, 0.05, 1.02), v(x * 0.20, -0.02, 0.90)],
               [v(x * 0.33, 0.06, 1.16), v(x * 0.30, 0.09, 0.98), v(x * 0.32, 0.02, 0.86)],
               m['mold'], 'chest')
        # redecilla de cana entre brazo y costado
        b.poly([v(x * 0.21, 0, 1.22), v(x * 0.26, 0, 1.02), v(x * 0.27, -0.03, 0.86)],
               [v(x * 0.31, 0.01, 1.14), v(x * 0.33, 0.02, 0.98), v(x * 0.30, -0.02, 0.84)],
               m['trim'], 'upperArmL' if x > 0 else 'upperArmR')
    # garfio de madera hinchada en la derecha, punta de hueso goteando luz
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2 - 0.55), (hx, hy - 0.06, hz2 + 1.05), 0.024, 0.020, m['root'], 'handR', sides=5)
    b.tube((hx, hy - 0.06, hz2 + 1.05), (hx - 0.10, hy - 0.10, hz2 + 0.92), 0.018, 0.005, m['bone'], 'handR', sides=5)
    b.blob((hx, hy - 0.06, hz2 + 1.10), (0.020, 0.020, 0.028), m['fosfo'], 'handR', subdiv=1)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    extras_golpe(rig, k)
    rig.export('guardian_anfibio.glb')


# ============================================================
# 3. ENMASCARADO (tramo 60-80, umbral de la huaca)
# Silueta: ancho, recto, mascara funeraria de obsidiana y jade sobre torso de
# piedra; dos barras de jade cruzadas en la espalda como andas.
# ============================================================
def enmascarado():
    scene = escena('Guardian_Enmascarado')
    m = mats()
    k = 1.12
    rig = fg_rig.Rig(scene, 'FG_Enmascarado', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    torso_piernas(b, m, k, cloth=m['obsid'])

    def v(x, y, z):
        return (x * k, y * k, z * k)
    # torso de losa: pecho plano y ancho como estela
    b.box(v(0, -0.01, 1.18), (0.44 * k, 0.16 * k, 0.36 * k), m['obsid'], 'chest')
    b.box(v(0, -0.095, 1.18), (0.30 * k, 0.02 * k, 0.22 * k), m['jade'], 'chest')
    b.blob(v(0, -0.115, 1.18), (0.055 * k, 0.02 * k, 0.055 * k), m['brasa'], 'chest', subdiv=1)
    # hombreras de losa escalonada
    for s, x in (('L', 1), ('R', -1)):
        b.box(v(x * 0.26, 0, 1.30), (0.16 * k, 0.20 * k, 0.05 * k), m['gear'], f'upperArm{s}')
        b.box(v(x * 0.30, 0, 1.24), (0.13 * k, 0.17 * k, 0.05 * k), m['gear'], f'upperArm{s}')
    # mascara funeraria plana en vez de cabeza, con ojos de brasa
    b.box(v(0, -0.05, 1.50), (0.17 * k, 0.10 * k, 0.24 * k), m['obsid'], 'head')
    b.box(v(0, -0.105, 1.55), (0.13 * k, 0.02 * k, 0.14 * k), m['gold'], 'head')
    for x in (-1, 1):
        b.box(v(x * 0.038, -0.118, 1.56), (0.028 * k, 0.012 * k, 0.016 * k), m['brasa'], 'head')
    # tocado de dos puntas de jade (triangulos planos)
    for x in (-1, 1):
        b.card([v(x * 0.05, 0.01, 1.62), v(x * 0.14, 0.02, 1.60), v(x * 0.17, -0.02, 1.92)], m['jade'], 'head')
    # andas de jade cruzadas en la espalda
    b.box(v(0, 0.11, 1.18), (0.56 * k, 0.04 * k, 0.06 * k), m['jade'], 'chest')
    b.box(v(0, 0.11, 1.18), (0.06 * k, 0.04 * k, 0.50 * k), m['jade'], 'chest')
    # maza de piedra en la derecha: astil corto, cabeza de disco
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2 - 0.30), (hx, hy, hz2 + 0.62), 0.024, 0.024, m['root'], 'handR', sides=5)
    b.tube((hx, hy - 0.02, hz2 + 0.74), (hx, hy - 0.02, hz2 + 0.90), 0.11, 0.11, m['gear'], 'handR', sides=8)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    extras_golpe(rig, k)
    rig.export('guardian_enmascarado.glb')


# ============================================================
# 4. COLOSO DE LA HUACA (tramo 90-100, oro y huesos)
# Silueta: el mas grande, idolo rigido de oro y hueso, corona de puntas,
# doble hacha; apenas rodillas: columna de templo con brazos.
# ============================================================
def coloso():
    scene = escena('Guardian_Coloso')
    m = mats()
    k = 1.25
    rig = fg_rig.Rig(scene, 'FG_ColosoHuaca', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')

    def v(x, y, z):
        return (x * k, y * k, z * k)
    # fuste en vez de piernas: tunica-campana sobre las espinillas
    b.tube(v(0, 0, 0.10), v(0, 0, 0.84), 0.30 * k, 0.17 * k, m['gold'], 'hips', sides=8, flat=0.9)
    for s, x in (('L', 1), ('R', -1)):
        b.box(v(x * 0.11, -0.06, 0.05), (0.12 * k, 0.26 * k, 0.10 * k), m['obsid'], f'foot{s}')
    b.tube(v(0, 0, 0.84), v(0, 0, 1.00), 0.17 * k, 0.16 * k, m['obsid'], 'hips', sides=7, flat=0.75)
    b.tube(v(0, 0, 1.00), v(0, 0, 1.14), 0.16 * k, 0.19 * k, m['obsid'], 'spine', sides=7, flat=0.75)
    # pechonal de huaca: escudo de oro con mascara felina de hueso
    b.box(v(0, -0.10, 1.00), (0.30 * k, 0.04 * k, 0.34 * k), m['gold'], 'chest')
    b.blob(v(0, -0.145, 1.02), (0.10 * k, 0.04 * k, 0.11 * k), m['bone'], 'chest', subdiv=1)
    for x in (-1, 1):
        b.blob(v(x * 0.045, -0.18, 1.05), (0.016 * k, 0.008 * k, 0.018 * k), m['brasa'], 'chest', subdiv=1)
    b.tube(v(0, 0, 1.14), v(0, 0, 1.36), 0.20 * k, 0.22 * k, m['gold'], 'chest', sides=8, flat=0.68)
    # cabeza de idolo + corona de puntas
    b.blob(v(0, -0.02, 1.52), (0.12 * k, 0.13 * k, 0.14 * k), m['bone'], 'head')
    for x in (-1, 1):
        b.blob(v(x * 0.05, -0.135, 1.54), (0.020 * k, 0.010 * k, 0.024 * k), m['brasa'], 'head', subdiv=1)
    b.box(v(0, -0.02, 1.66), (0.22 * k, 0.14 * k, 0.04 * k), m['gold'], 'head')
    # corona de cinco puntas de oro sobre la banda
    for xq in range(5):
        cx = (-0.16 + 0.08 * xq) * k
        b.card([(cx - 0.022 * k, 0.0, 1.68 * k), (cx + 0.022 * k, 0.0, 1.68 * k),
                (cx, -0.02, 1.90 * k)], m['gold'], 'head')
    # brazos de idolo: mangas de oro, manos de obsidiana
    for s, x in (('L', 1), ('R', -1)):
        b.tube(v(0.2 * x, 0, 1.27), v(0.26 * x, 0, 1.02), 0.062 * k, 0.05 * k, m['gold'], f'upperArm{s}', sides=5)
        b.tube(v(0.26 * x, 0, 1.03), v(0.28 * x, -0.04, 0.83), 0.048 * k, 0.040 * k, m['obsid'], f'foreArm{s}', sides=5)
        b.blob(v(0.28 * x, -0.05, 0.78), (0.045 * k, 0.045 * k, 0.055 * k), m['obsid'], f'hand{s}', subdiv=1)
    # doble hacha en la derecha: astil alto, dos hojas de oro
    hx, hy, hz2 = -0.28 * k, -0.05 * k, 0.78 * k
    b.tube((hx, hy, hz2 - 0.50), (hx, hy, hz2 + 1.05), 0.024, 0.020, m['root'], 'handR', sides=5)
    for dz in (0.78, 1.00):
        for x in (-1, 1):
            b.card([(hx + x * 0.02, hy, hz2 + dz - 0.08), (hx + x * 0.02, hy, hz2 + dz + 0.08),
                    (hx + x * 0.19, hy - 0.04, hz2 + dz)], m['gold'], 'handR')
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    extras_golpe(rig, k)
    rig.export('guardian_coloso.glb')


def main():
    import json
    import struct
    for f in (raicero, anfibio, enmascarado, coloso):
        f()
        bpy.ops.wm.read_factory_settings(use_empty=True)
    for g in sorted(os.listdir(OUT)):
        if not g.endswith('.glb'):
            continue
        with open(os.path.join(OUT, g), 'rb') as fh:
            blob = fh.read()
        clen = struct.unpack_from('<I', blob, 12)[0]
        js = json.loads(blob[20:20 + clen])
        acc = js.get('accessors', [])
        tris = sum(acc[p['indices']]['count'] // 3
                   for mesh in js.get('meshes', []) for p in mesh['primitives'] if 'indices' in p)
        clips = [a['name'] for a in js.get('animations', [])]
        print(f'{g}: {tris} triangulos, clips: {", ".join(sorted(clips))}')


if __name__ == '__main__':
    main()
