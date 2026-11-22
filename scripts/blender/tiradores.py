# Tiradores propios (OMP-FA-20): los seis ranged que hoy son arquero.glb
# teñido — Duende Tirapiedras (ranged), Trampero del Matorral (trapper),
# Cerbatanero del Tapón (darien_blowgun), Arquero de la Ventisca
# (fortuna_archer), Vigía del Cráter (baru_lookout) y Pescador Fantasma de
# las Perlas (perlas_fisher).
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup --python scripts/blender/tiradores.py
# Todos sobre el rig humano comun (fg_rig.biped_bones) con los seis clips
# comunes y `Disparar` (attack/cast de la plantilla arquero) con arma y gesto
# propios. Los materiales se llaman como los canales de la paleta
# (skin/cloth/trim/hair/gear, brillo_* luce) para que las palettes vigentes de
# data/assets.json pinten a cada cual sin tocar data/:
#   duende_tirapiedras.glb  duende chico y orejón, hocico afilado, taparrabo y
#                           bandolera de piedras; honda que gira sobre la cabeza.
#   trampero_matorral.glb   capa de hojas, lazo enroscado al cinto, red al
#                           hombro y arco corto recurvo; dispara agachado.
#   cerbatanero_tapon.glb   flaco de la selva, cerbatana larguisima que asoma
#                           por delante, dardos en el muslo, penacho bajo y
#                           falda de hojas; sopla y da un paso.
#   arquero_ventisca.glb    encapuchado de pieles, bufanda al viento, arco de
#                           hueso con tensores helados que brillan; tiro largo.
#   vigia_crater.glb        ojeros de ceniza y gorro de ala, cuerno de aviso al
#                           cinto, tirachinas de Y con goma; posa de ballestero.
#   pescador_fantasma.glb   pescador de las Perlas: sombrero de paja ancho,
#                           chaleco de conchas, arpón de tres puas con sedal
#                           liado al antebrazo; lo lanza por encima.
# Clean-room, desde cero; no toca data/ ni src/. <= 1.500 tri por criatura.
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
import fg
import fg_rig
from fg_rig import p


def mats():
    return dict(
        skin=fg.material('skin', (0.62, 0.46, 0.34)),
        cloth=fg.material('cloth', (0.4, 0.35, 0.4)),
        trim=fg.material('trim', (0.8, 0.75, 0.6)),
        hair=fg.material('hair', (0.2, 0.17, 0.15)),
        gear=fg.material('gear', (0.45, 0.42, 0.38), rough=0.6),
        glow=fg.material('brillo_gear', (0.85, 0.8, 0.5), emit=(0.85, 0.8, 0.5), strength=1.1),
        halo=fg.material('brillo_trim', (0.8, 0.75, 0.5), emit=(0.8, 0.75, 0.5), strength=1.1),
    )


def biped_body(b, m, k, width=1.0, head=1.0):
    """Mismo cuerpo visual de los humanoides publicados."""
    def v(x, y, z):
        return (x * k, y * k, z * k)
    w = width * k
    b.tube(v(0, 0, 0.8), v(0, 0, 0.98), 0.17 * w, 0.16 * w, m['cloth'], 'hips', sides=7, flat=0.72)
    b.tube(v(0, 0, 0.98), v(0, 0, 1.12), 0.16 * w, 0.18 * w, m['cloth'], 'spine', sides=7, flat=0.72)
    b.tube(v(0, 0, 1.12), v(0, 0, 1.32), 0.18 * w, 0.2 * w, m['cloth'], 'chest', sides=7, flat=0.7)
    b.blob((0, 0, 1.47 * k), (0.15 * head * k, 0.15 * head * k, 0.17 * head * k), m['skin'], 'head')
    for s, x in (('L', 1), ('R', -1)):
        b.tube(v(0.2 * x, 0, 1.27), v(0.25 * x, 0, 1.03), 0.055 * w, 0.045 * w, m['cloth'], f'upperArm{s}', sides=5)
        b.tube(v(0.25 * x, 0, 1.05), v(0.27 * x, -0.03, 0.84), 0.045 * w, 0.036 * w, m['skin'], f'foreArm{s}', sides=5)
        b.blob(v(0.27 * x, -0.04, 0.79), (0.045 * w, 0.045 * w, 0.055 * k), m['skin'], f'hand{s}', subdiv=1)
        b.tube(v(0.09 * x, 0, 0.84), v(0.1 * x, 0, 0.46), 0.08 * w, 0.056 * w, m['cloth'], f'thigh{s}', sides=5)
        b.tube(v(0.1 * x, 0, 0.48), v(0.1 * x, 0, 0.1), 0.056 * w, 0.044 * w, m['cloth'], f'shin{s}', sides=5)
        b.box(v(0.1 * x, -0.05, 0.05), (0.1 * w, 0.25 * k, 0.1 * k), m['hair'], f'foot{s}')


def ojos(b, m, k, hz, brillos=False):
    mo = m['glow'] if brillos else m['hair']
    for x in (-1, 1):
        b.blob((x * 0.055 * k, -0.14 * k, hz + 0.03 * k), (0.022 * k, 0.012 * k, 0.022 * k), mo, 'head', subdiv=1)


def arco(b, m, k, mat, r=0.26, tensores=False):
    """Arco en la siniestra, apoyado en handL; curva abierta hacia delante."""
    hx, hy, hz = 0.27 * k, -0.05 * k, 0.79 * k
    prev = None
    for i in range(9):
        t = -1 + i / 4
        q = (hx, hy - r * (1 - t * t), hz + t * r * 1.9)
        if prev:
            b.tube(prev, q, 0.014 * k, 0.014 * k, mat, 'handL', sides=4)
        prev = q
    b.tube((hx, hy - r, hz - r * 1.9), (hx, hy - r, hz + r * 1.9), 0.004 * k, 0.004 * k, m['trim'], 'handL', sides=3)
    if tensores:
        for s in (-1, 1):
            b.tube((hx, hy - r * 0.8, hz + s * r * 1.55), (hx + 0.05 * k, hy - r * 0.55, hz + s * r * 1.15),
                   0.008 * k, 0.003 * k, m['halo'], 'handL', sides=3)


def disparar_basico(rig, k):
    """Pose de arco abierta/cerrada canonica (como arquero.glb)."""
    rig.clip('Disparar', [
        (1, p()),
        (8, p(chest=(0, 0, -16), upperArmL=(-85, 18, 0), foreArmL=(-6, 0, 0), upperArmR=(-70, -20, 0), foreArmR=(-20, 0, 0), thighL=(-12, 0, 0), thighR=(12, 0, 0))),
        (15, p(chest=(0, 0, -30), head=(0, 0, 14), upperArmL=(-90, 26, 0), foreArmL=(0, 0, 0), upperArmR=(-90, -14, 0), foreArmR=(-110, 0, 0), thighL=(-14, 0, 0), thighR=(14, 0, 0))),
        (17, p(chest=(2, 0, -32), head=(0, 0, 14), upperArmL=(-90, 26, 0), foreArmL=(0, 0, 0), upperArmR=(-58, -36, 0), foreArmR=(-30, 0, 0), thighL=(-14, 0, 0), thighR=(14, 0, 0)), (0, 0.02, 0)),
        (26, p()),
    ])


# ======================================================== duende tirapiedras
def duende_tirapiedras():
    """Duende chico y orejón con hocico afilado, taparrabo y bandolera de
    piedras; honda que gira sobre la cabeza antes del latigazo."""
    scene = fg.reset()
    m = mats()
    k = 0.74
    rig = fg_rig.Rig(scene, 'FG_Humanoide', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=0.92, head=1.18)
    hz = 1.47 * k
    ojos(b, m, k, hz)
    for x in (-1, 1):
        b.tube((x * 0.13 * k, 0.01 * k, hz + 0.02 * k), (x * 0.32 * k, 0.05 * k, hz + 0.1 * k), 0.05 * k, 0.007 * k, m['skin'], 'head', sides=4)
    b.tube((0, -0.13 * k, hz + 0.01 * k), (0, -0.24 * k, hz - 0.05 * k), 0.038 * k, 0.01 * k, m['skin'], 'head', sides=5, flat=0.7)
    b.tube((0, 0.05 * k, hz + 0.09 * k), (0, 0.12 * k, hz - 0.28 * k), 0.13 * k, 0.05 * k, m['hair'], 'head', sides=6, flat=0.5)
    # taparrabo y faja de cuerdas
    b.tube((0, 0, 0.87 * k), (0, 0, 0.68 * k), 0.16 * k, 0.12 * k, m['trim'], 'hips', sides=6, flat=0.8)
    b.tube((0, 0, 0.9 * k), (0, 0, 0.88 * k), 0.175 * k, 0.18 * k, m['hair'], 'hips', sides=7, flat=0.8)
    # bandolera de piedras: tira cruzada con cantos rodados
    b.tube((-0.17 * k, -0.06 * k, 1.3 * k), (0.17 * k, -0.05 * k, 0.92 * k), 0.016 * k, 0.016 * k, m['hair'], 'chest', sides=4)
    for i, t in enumerate((0.25, 0.5, 0.75)):
        px = (-0.17 + 0.34 * t) * k
        pz = (1.3 - 0.38 * t) * k
        b.blob((px, -0.075 * k, pz), (0.028 * k, 0.022 * k, 0.026 * k), m['gear'], 'chest', subdiv=1)
    # morral de piedras al cinto
    b.box((0.16 * k, 0.06 * k, 0.86 * k), (0.09 * k, 0.08 * k, 0.11 * k), m['hair'], 'hips')
    # honda en la diestra: piel con cordel y piedra armada
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2), (hx - 0.06 * k, hy - 0.1 * k, hz2 + 0.16 * k), 0.008 * k, 0.008 * k, m['hair'], 'handR', sides=3)
    b.tube((hx, hy, hz2), (hx - 0.1 * k, hy + 0.02 * k, hz2 + 0.16 * k), 0.008 * k, 0.008 * k, m['hair'], 'handR', sides=3)
    b.box((hx - 0.08 * k, hy - 0.04 * k, hz2 + 0.16 * k), (0.06 * k, 0.05 * k, 0.02 * k), m['gear'], 'handR')
    b.blob((hx - 0.08 * k, hy - 0.04 * k, hz2 + 0.185 * k), (0.022 * k, 0.022 * k, 0.02 * k), m['gear'], 'handR', subdiv=1)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    # honda: carga atras, dos vueltas sobre la cabeza y latigazo al frente
    rig.clip('Disparar', [
        (1, p()),
        (5, p(chest=(0, 0, 18), head=(0, 0, 16), upperArmR=(30, 60, 0), foreArmR=(-70, 0, 0), upperArmL=(-30, 20, 0))),
        (9, p(chest=(0, 0, -14), upperArmR=(-170, 30, 0), foreArmR=(-40, 0, 0))),
        (13, p(chest=(0, 0, 18), head=(0, 0, 12), upperArmR=(20, -50, 0), foreArmR=(-90, 0, 0))),
        (17, p(chest=(0, 0, -16), upperArmR=(-175, -20, 0), foreArmR=(-30, 0, 0), thighR=(14, 0, 0))),
        (20, p(chest=(-10, 0, 6), head=(-8, 0, 0), upperArmR=(-120, 0, 0), foreArmR=(-6, 0, 0), upperArmL=(-40, 24, 0))),
        (26, p()),
    ])
    rig.export('duende_tirapiedras.glb')


# ======================================================= trampero del matorral
def trampero_matorral():
    """Trampero: capa de hojas, lazo enroscado al cinto, red al hombro y arco
    corto recurvo; dispara agachado y desde el lado."""
    scene = fg.reset()
    m = mats()
    k = 0.92
    rig = fg_rig.Rig(scene, 'FG_Humanoide', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=1.0, head=0.98)
    hz = 1.47 * k
    ojos(b, m, k, hz)
    # sombrero de ala chata de palma
    b.tube((0, 0.01 * k, hz + 0.13 * k), (0, 0.01 * k, hz + 0.2 * k), 0.13 * k, 0.09 * k, m['trim'], 'head', sides=8)
    b.tube((0, 0.01 * k, hz + 0.135 * k), (0, 0.01 * k, hz + 0.15 * k), 0.24 * k, 0.24 * k, m['trim'], 'head', sides=9)
    # capa de hojas: trapecio trasero escalonado
    for r, z0, z1 in ((0.27, 1.28, 1.0), (0.22, 1.02, 0.8)):
        for a in range(5):
            t0, t1 = math.pi * (0.32 + a * 0.55) / 3.4, math.pi * (0.32 + (a + 1) * 0.55) / 3.4
            b.poly([(r * math.cos(t0) * k, abs(r * math.sin(t0)) * k + 0.03 * k, z0 * k),
                    (r * math.cos(t1) * k, abs(r * math.sin(t1)) * k + 0.03 * k, z0 * k),
                    ((r - 0.08) * math.cos(t1) * k, abs((r - 0.08) * math.sin(t1)) * k + 0.04 * k, z1 * k),
                    ((r - 0.08) * math.cos(t0) * k, abs((r - 0.08) * math.sin(t0)) * k + 0.04 * k, z1 * k)],
                   [(r * math.cos(t0) * k, abs(r * math.sin(t0)) * k + 0.06 * k, z0 * k),
                    (r * math.cos(t1) * k, abs(r * math.sin(t1)) * k + 0.06 * k, z0 * k),
                    ((r - 0.08) * math.cos(t1) * k, abs((r - 0.08) * math.sin(t1)) * k + 0.09 * k, z1 * k),
                    ((r - 0.08) * math.cos(t0) * k, abs((r - 0.08) * math.sin(t0)) * k + 0.09 * k, z1 * k)],
                   m['cloth'] if a % 2 else m['hair'], 'chest')
    # lazo enroscado al cinto: aro plano de soga
    prev = None
    for i in range(9):
        t = 2 * math.pi * i / 8
        q = (0.19 * k * math.cos(t), 0.11 * k + 0.05 * k * math.sin(t), 0.9 * k)
        if prev:
            b.tube(prev, q, 0.013 * k, 0.13e-1, m['hair'], 'hips', sides=3)
        prev = q
    # rollo de red al hombro derecho: malla insinuada en dos correas y un bulto
    b.tube((0.17 * k, 0.03 * k, 1.3 * k), (0.2 * k, 0.09 * k, 1.02 * k), 0.055 * k, 0.05 * k, m['trim'], 'chest', sides=5, flat=0.5)
    b.tube((0.14 * k, -0.04 * k, 1.28 * k), (0.15 * k, 0.12 * k, 1.1 * k), 0.012 * k, 0.012 * k, m['hair'], 'chest', sides=3)
    # cartuchera de resortes/trampas
    b.box((-0.17 * k, 0.05 * k, 0.86 * k), (0.1 * k, 0.07 * k, 0.09 * k), m['gear'], 'hips')
    arco(b, m, k, m['gear'], r=0.2)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    # agachado y de lado
    rig.clip('Disparar', [
        (1, p()),
        (8, p(hips=(-12, 0, 0), chest=(-8, 0, -14), upperArmL=(-80, 14, 0), foreArmL=(-8, 0, 0), upperArmR=(-64, -22, 0), foreArmR=(-24, 0, 0), thighL=(-24, 0, 0), thighR=(18, 0, 0))),
        (15, p(hips=(-16, 0, 0), chest=(-6, 0, -26), head=(0, 0, 12), upperArmL=(-86, 22, 0), foreArmL=(0, 0, 0), upperArmR=(-88, -14, 0), foreArmR=(-108, 0, 0), thighL=(-30, 0, 0), thighR=(22, 0, 0), shinL=(18, 0, 0))),
        (17, p(hips=(-14, 0, 0), chest=(-4, 0, -28), head=(0, 0, 12), upperArmL=(-86, 22, 0), upperArmR=(-56, -34, 0), foreArmR=(-30, 0, 0), thighL=(-26, 0, 0), thighR=(20, 0, 0))),
        (26, p()),
    ])
    rig.export('trampero_matorral.glb')


# ===================================================== cerbatanero del tapón
def cerbatanero_tapon():
    """Flaco de la selva del Tapón: cerbatana larguísima que asoma por delante,
    dardos en el muslo, penacho bajo y falda de hojas; sopla y avanza el paso."""
    scene = fg.reset()
    m = mats()
    k = 0.94
    rig = fg_rig.Rig(scene, 'FG_Humanoide', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=0.82, head=0.97)
    hz = 1.47 * k
    ojos(b, m, k, hz)
    b.tube((0, -0.13 * k, hz), (0, -0.185 * k, hz - 0.05 * k), 0.034 * k, 0.02 * k, m['skin'], 'head', sides=5, flat=0.7)
    # penacho bajo: tres plumas del frente a la nuca
    for i, y in enumerate((-0.09, -0.02, 0.06)):
        b.poly([(0, y * k, hz + 0.15 * k), (0.028 * k, (y + 0.05) * k, hz + (0.27 - i * 0.04) * k), (0, (y + 0.06) * k, hz + 0.16 * k)],
               [(0, y * k, hz + 0.17 * k), (0.028 * k, (y + 0.05) * k, hz + (0.29 - i * 0.04) * k), (0, (y + 0.06) * k, hz + 0.18 * k)],
               m['trim'] if i else m['hair'], 'head')
    # falda de hojas: faldellin de tiras hasta la rodilla
    b.tube((0, 0, 0.9 * k), (0, 0, 0.84 * k), 0.175 * k, 0.19 * k, m['cloth'], 'hips', sides=8, flat=0.8)
    for a in range(5):
        t = 2 * math.pi * a / 5 + 0.3
        x, y = 0.18 * k * math.cos(t), 0.15 * k * math.sin(t)
        b.poly([(x - 0.03 * k, y, 0.84 * k), (x + 0.03 * k, y, 0.84 * k), (x, y * 1.15, 0.5 * k)],
               [(x - 0.02 * k, y, 0.84 * k), (x + 0.02 * k, y, 0.84 * k), (x, y * 1.15, 0.5 * k)],
               m['hair'], 'hips')
    # dardos en el muslo: canilla-tubo con tres varillas
    b.tube((0.1 * k, 0.07 * k, 0.66 * k), (0.1 * k, 0.07 * k, 0.5 * k), 0.045 * k, 0.045 * k, m['gear'], 'thighL', sides=5)
    for o in (-0.018, 0, 0.018):
        b.tube((0.1 * k + o, 0.07 * k, 0.64 * k), (0.1 * k + o * 1.4, 0.07 * k, 0.76 * k), 0.005 * k, 0.005 * k, m['trim'], 'thighL', sides=3)
    # cerbatana larguísima: asta de 1,35 m que asoma por delante de la boca
    b.tube((-0.26 * k, -0.04 * k, 1.4 * k), (0.32 * k, -0.34 * k, 1.42 * k), 0.019 * k, 0.015 * k, m['gear'], 'chest', sides=5)
    b.tube((0.3 * k, -0.32 * k, 1.42 * k), (0.36 * k, -0.37 * k, 1.42 * k), 0.026 * k, 0.022 * k, m['trim'], 'chest', sides=5)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    # sopla: boca a la boquilla (arma en pose fija sobre chest), paso al frente
    rig.clip('Disparar', [
        (1, p()),
        (7, p(chest=(-6, 0, 0), head=(10, 6, 0), upperArmR=(-60, -30, 0), foreArmR=(-70, 0, 0), upperArmL=(-70, 18, 0), foreArmL=(-40, 0, 0))),
        (13, p(chest=(-8, 0, 0), head=(14, 8, 0), upperArmR=(-64, -30, 0), foreArmR=(-66, 0, 0), upperArmL=(-72, 18, 0), foreArmL=(-44, 0, 0), thighL=(-24, 0, 0), shinL=(12, 0, 0))),
        (17, p(chest=(-2, 0, 0), head=(-4, 0, 0), upperArmR=(-50, -26, 0), foreArmR=(-60, 0, 0), thighL=(-12, 0, 0))),
        (24, p()),
    ])
    rig.export('cerbatanero_tapon.glb')


# ======================================================= arquero de la ventisca
def arquero_ventisca():
    """Arquero de la Ventisca: encapuchado de pieles, bufanda al viento, arco
    de hueso con tensores helados que brillan; tiro largo y plantado."""
    scene = fg.reset()
    m = mats()
    k = 1.0
    rig = fg_rig.Rig(scene, 'FG_Humanoide', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=1.05, head=1.0)
    hz = 1.47 * k
    # capucha de piel: calota con pico al frente y cuello peludo
    b.tube((0, 0.02 * k, hz + 0.09 * k), (0, 0.06 * k, hz + 0.32 * k), 0.185 * k, 0.13 * k, m['hair'], 'head', sides=8, flat=0.6)
    b.tube((0, 0.01 * k, hz + 0.09 * k), (0, 0.01 * k, hz + 0.12 * k), 0.225 * k, 0.225 * k, m['hair'], 'head', sides=9, flat=0.6)
    b.tube((0, -0.1 * k, hz + 0.14 * k), (0, -0.2 * k, hz + 0.03 * k), 0.1 * k, 0.03 * k, m['hair'], 'head', sides=5, flat=0.6)
    for x in (-1, 1):
        b.blob((x * 0.055 * k, -0.15 * k, hz + 0.03 * k), (0.022 * k, 0.012 * k, 0.022 * k), m['halo'], 'head', subdiv=1)
    # bufanda al viento: dos colas hacia atrás
    b.tube((0, -0.11 * k, hz - 0.14 * k), (-0.05 * k, 0.28 * k, hz - 0.3 * k), 0.05 * k, 0.012 * k, m['trim'], 'chest', sides=4)
    b.tube((0.02 * k, -0.11 * k, hz - 0.16 * k), (0.09 * k, 0.22 * k, hz - 0.42 * k), 0.04 * k, 0.01 * k, m['trim'], 'chest', sides=4)
    # manto de pieles al pecho y faldón largo
    b.tube((0, 0, 1.26 * k), (0, 0.02 * k, 0.98 * k), 0.22 * k, 0.25 * k, m['hair'], 'chest', sides=8, flat=0.62)
    b.tube((0, 0, 0.92 * k), (0, 0, 0.36 * k), 0.2 * k, 0.28 * k, m['cloth'], 'hips', sides=8, flat=0.82)
    # carcaj a la cadera y arco de hueso
    b.tube((0.14 * k, 0.1 * k, 0.96 * k), (0.18 * k, 0.14 * k, 1.24 * k), 0.05 * k, 0.055 * k, m['gear'], 'hips', sides=6)
    for o in (-0.02, 0.01):
        b.tube((0.17 * k + o, 0.13 * k, 1.22 * k), (0.17 * k + o * 2, 0.15 * k, 1.34 * k), 0.006 * k, 0.006 * k, m['trim'], 'hips', sides=3)
    arco(b, m, k, m['trim'], r=0.28, tensores=True)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    disparar_basico(rig, k)
    rig.export('arquero_ventisca.glb')


# ========================================================== vigía del cráter
def vigia_crater():
    """Vigía del Cráter del Barú: gorro de ala y visera de ceniza, cuerno de
    aviso al cinto, tirachinas en Y con goma; posa de ballestero de lado."""
    scene = fg.reset()
    m = mats()
    k = 0.95
    rig = fg_rig.Rig(scene, 'FG_Humanoide', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=0.98, head=1.0)
    hz = 1.47 * k
    ojos(b, m, k, hz)
    # visera ancha de ceniza sobre los ojos y gorro
    b.tube((0, 0.01 * k, hz + 0.15 * k), (0, 0.01 * k, hz + 0.24 * k), 0.14 * k, 0.1 * k, m['cloth'], 'head', sides=8)
    b.tube((0, -0.02 * k, hz + 0.12 * k), (0, -0.21 * k, hz + 0.11 * k), 0.16 * k, 0.05 * k, m['gear'], 'head', sides=6, flat=0.5)
    # capa corta de andrajes y bufanda
    b.tube((0, 0.02 * k, 1.28 * k), (0, 0.1 * k, 0.96 * k), 0.2 * k, 0.24 * k, m['cloth'], 'chest', sides=7, flat=0.55)
    b.tube((0, -0.06 * k, hz - 0.15 * k), (0.02 * k, 0.2 * k, hz - 0.36 * k), 0.05 * k, 0.012 * k, m['trim'], 'chest', sides=4)
    # cuerno de aviso colgado del cinto
    b.tube((-0.14 * k, 0.06 * k, 0.9 * k), (-0.3 * k, 0.12 * k, 0.72 * k), 0.045 * k, 0.012 * k, m['trim'], 'hips', sides=6)
    # bolsón de cantos y farolillo de ascua (su luz lo delata de noche)
    b.box((0.15 * k, 0.07 * k, 0.85 * k), (0.1 * k, 0.07 * k, 0.12 * k), m['hair'], 'hips')
    b.tube((0.24 * k, -0.04 * k, 1.02 * k), (0.24 * k, -0.04 * k, 0.9 * k), 0.03 * k, 0.03 * k, m['gear'], 'chest', sides=5)
    b.blob((0.24 * k, -0.04 * k, 0.96 * k), (0.02 * k, 0.02 * k, 0.026 * k), m['glow'], 'chest', subdiv=1)
    # tirachinas en Y con goma y cantito armado, en la diestra
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2 - 0.14 * k), (hx, hy, hz2 + 0.06 * k), 0.018 * k, 0.016 * k, m['gear'], 'handR', sides=4)
    b.tube((hx, hy, hz2 + 0.04 * k), (hx - 0.05 * k, hy, hz2 + 0.2 * k), 0.014 * k, 0.01 * k, m['gear'], 'handR', sides=4)
    b.tube((hx, hy, hz2 + 0.04 * k), (hx + 0.05 * k, hy, hz2 + 0.2 * k), 0.014 * k, 0.01 * k, m['gear'], 'handR', sides=4)
    b.tube((hx - 0.05 * k, hy, hz2 + 0.2 * k), (hx, hy - 0.16 * k, hz2 + 0.14 * k), 0.006 * k, 0.006 * k, m['trim'], 'handR', sides=3)
    b.tube((hx + 0.05 * k, hy, hz2 + 0.2 * k), (hx, hy - 0.16 * k, hz2 + 0.14 * k), 0.006 * k, 0.006 * k, m['trim'], 'handR', sides=3)
    b.box((hx, hy - 0.16 * k, hz2 + 0.13 * k), (0.045 * k, 0.03 * k, 0.018 * k), m['gear'], 'handR')
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    # ballestero de lado: goma a la mejilla y suelta
    rig.clip('Disparar', [
        (1, p()),
        (7, p(chest=(0, 0, -22), head=(0, 0, 10), upperArmL=(-85, 16, 0), foreArmL=(-4, 0, 0), upperArmR=(-40, -70, 0), foreArmR=(-95, 0, 0), thighL=(-14, 0, 0), thighR=(12, 0, 0))),
        (14, p(chest=(0, 0, -30), head=(0, 0, 16), upperArmL=(-88, 20, 0), upperArmR=(-46, -74, 0), foreArmR=(-118, 0, 0), thighL=(-18, 0, 0), thighR=(14, 0, 0))),
        (16, p(chest=(2, 0, -18), upperArmL=(-80, 18, 0), upperArmR=(-96, -40, 0), foreArmR=(-24, 0, 0))),
        (24, p()),
    ])
    rig.export('vigia_crater.glb')


# ==================================================== pescador fantasma perlas
def pescador_fantasma():
    """Pescador Fantasma de las Perlas: sombrero de paja ancho, chaleco de
    conchas, sedal liado al antebrazo y arpón de tres puas que lanza por
    encima."""
    scene = fg.reset()
    m = mats()
    k = 0.98
    rig = fg_rig.Rig(scene, 'FG_Humanoide', fg_rig.biped_bones(k))
    b = fg.Builder('Cuerpo')
    biped_body(b, m, k, width=1.0, head=1.0)
    hz = 1.47 * k
    ojos(b, m, k, hz)
    # barba de estuario y sombrero de paja ancho
    b.tube((0, -0.1 * k, hz - 0.09 * k), (0, -0.13 * k, hz - 0.26 * k), 0.055 * k, 0.02 * k, m['hair'], 'head', sides=5, flat=0.6)
    b.tube((0, 0.01 * k, hz + 0.14 * k), (0, 0.01 * k, hz + 0.21 * k), 0.145 * k, 0.1 * k, m['trim'], 'head', sides=8)
    prev = None
    for i in range(11):
        t = 2 * math.pi * i / 10
        q = (0.25 * k * math.cos(t), 0.01 * k + 0.25 * k * math.sin(t), hz + 0.142 * k)
        if prev:
            b.tube(prev, q, 0.018 * k, 0.018 * k, m['trim'], 'head', sides=3)
        prev = q
    b.tube((0, 0.01 * k, hz + 0.145 * k), (0, 0.01 * k, hz + 0.17 * k), 0.157 * k, 0.157 * k, m['cloth'], 'head', sides=8)
    # chaleco abierto con conchas cosidas
    b.tube((0, 0, 1.28 * k), (0, 0, 1.0 * k), 0.205 * k, 0.195 * k, m['cloth'], 'chest', sides=8, flat=0.66)
    for x, z in ((-0.08, 1.22), (0.06, 1.15), (-0.05, 1.06), (0.09, 1.25)):
        b.blob((x * k, -0.175 * k, z * k), (0.024 * k, 0.012 * k, 0.026 * k), m['halo'], 'chest', subdiv=1)
    # pantaloneta remangada y descalzo
    b.tube((0.1 * k, 0, 0.6 * k), (0.1 * k, 0, 0.46 * k), 0.085 * k, 0.09 * k, m['trim'], 'thighL', sides=5)
    b.tube((-0.1 * k, 0, 0.6 * k), (-0.1 * k, 0, 0.46 * k), 0.085 * k, 0.09 * k, m['trim'], 'thighR', sides=5)
    # sedal liado al antebrazo izquierdo y carrete en la mano
    for i in range(3):
        b.tube((0.26 * k, -0.01 * k, (1.0 - i * 0.06) * k), (0.29 * k, -0.05 * k, (0.98 - i * 0.06) * k), 0.048 * k, 0.048 * k, m['trim'], 'foreArmL', sides=5)
    # arpón de tres puas en la diestra, listo por encima del hombro
    hx, hy, hz2 = -0.27 * k, -0.05 * k, 0.79 * k
    b.tube((hx, hy, hz2 - 0.18 * k), (hx + 0.02 * k, hy - 0.04 * k, hz2 + 0.62 * k), 0.016 * k, 0.013 * k, m['gear'], 'handR', sides=4)
    b.tube((hx + 0.02 * k, hy - 0.04 * k, hz2 + 0.56 * k), (hx + 0.02 * k, hy - 0.12 * k, hz2 + 0.66 * k), 0.008 * k, 0.004 * k, m['gear'], 'handR', sides=3)
    b.tube((hx + 0.02 * k, hy - 0.04 * k, hz2 + 0.56 * k), (hx + 0.02 * k, hy + 0.04 * k, hz2 + 0.66 * k), 0.008 * k, 0.004 * k, m['gear'], 'handR', sides=3)
    b.tube((hx + 0.02 * k, hy - 0.04 * k, hz2 + 0.6 * k), (hx + 0.02 * k, hy - 0.04 * k, hz2 + 0.74 * k), 0.009 * k, 0.002 * k, m['gear'], 'handR', sides=3)
    # red recogida al hombro
    b.tube((0.16 * k, 0.02 * k, 1.3 * k), (0.22 * k, 0.12 * k, 1.0 * k), 0.06 * k, 0.05 * k, m['hair'], 'chest', sides=5, flat=0.45)
    rig.part(b)
    fg_rig.biped_clips(rig, k)
    # lanza el arpón por encima: atras, arriba, descarga al frente
    rig.clip('Disparar', [
        (1, p()),
        (7, p(chest=(10, 0, 10), head=(12, 0, 6), upperArmR=(60, -20, 0), foreArmR=(-110, 0, 0), upperArmL=(-50, 26, 0), foreArmL=(-40, 0, 0))),
        (12, p(chest=(-14, 0, -8), head=(-12, 0, -4), upperArmR=(-190, -10, 0), foreArmR=(-20, 0, 0), upperArmL=(-80, 18, 0), thighL=(-16, 0, 0), thighR=(12, 0, 0))),
        (15, p(chest=(18, 0, 4), head=(12, 0, 0), upperArmR=(-60, -6, 0), foreArmR=(-12, 0, 0), upperArmL=(-60, 14, 0), thighL=(-20, 0, 0), thighR=(16, 0, 0)), (0, -0.03, 0)),
        (24, p()),
    ])
    rig.export('pescador_fantasma.glb')


if __name__ == '__main__':
    for f in (duende_tirapiedras, trampero_matorral, cerbatanero_tapon, arquero_ventisca, vigia_crater, pescador_fantasma):
        f()
    out = os.path.join(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')),
                       'arte', 'blender', 'tiradores.blend')
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print('blend guardado:', out)
