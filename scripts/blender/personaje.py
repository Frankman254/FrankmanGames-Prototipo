# Humanoide para el jugador y los PNJ (P02): el cuerpo continuo de los héroes (fg_heroe),
# un esqueleto, los clips comunes y piezas opcionales que el juego enciende según el aspecto.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/personaje.py
# Escribe assets/models/personaje.glb. Mira hacia -Y (+Z en el juego), con los pies en z=0.
#
# Contrato con el juego (src/world/look.ts, gltfCharacter.ts), sin cambios:
# - Piezas: Cuerpo, Pelo_corto, Pelo_largo, Barba, Capucha, Yelmo, Banda, Tunica, Mandil,
#   Armadura, Capa, Arma_espada, Arma_baston, Arma_arco y Escudo.
# - Materiales con el nombre de los canales de la paleta: skin, cloth, trim, hair, gear.
#   Llevan una textura pintada casi blanca (neutra_* de fg_pintura) y el juego multiplica
#   el color de la paleta encima; `rasgos` (ojos, cejas y boca) y `botas` no se tiñen.
import math
import os
import random
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Vector

try:
    sys.path.insert(0, os.path.dirname(bpy.path.abspath(__file__)))
except NameError:
    sys.path.insert(0, r'C:\Users\frank\Desktop\2026\FrankmanGames-Prototipo\scripts\blender')
import fg_heroe as H
import fg_pintura
from fg_rig import p

NOMBRE = 'personaje'


# ---------------------------------------------------------------- pelo (MOD-08)
# El humanoide común (jugador sin clase, PNJ del pueblo y humanoides de la cripta)
# llevaba los conos de prueba de P02: punteaban hacia fuera y el fleco cruzaba la
# frente (la cara se leía mal con barba o toca). Aquí se peina en cintas planas que
# siguen el cráneo, con la raya al frente barrida hacia las sienes: ningún mechón
# pasa por delante de los ojos. Los héroes por piezas (centinela/oraculo/cazador)
# no usan este código: conservan el pelo de fg_heroe intacto.

def _punto(C, R, az, el, r):
    d = (math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el))
    return C + Vector((d[0] * R.x, d[1] * R.y, d[2] * R.z)) * r


def pelo_humanoide(h, rnd, M, largo):
    """Figura de pelo pegado al cráneo; `largo` añade la cortina de la espalda."""
    C, R = h.head_c, h.head_r
    fig = H.ff.Figura('Pelo', h.bones)

    def gorro(q):
        q = Vector(q)
        rel = q - C
        if rel.y < -0.04 and rel.z < 0.05:
            q = C + rel * 0.85
        return q
    fig.ellipsoid(C + Vector((0, 0.008, 0.014)), (R.x + 0.008, R.y + 0.01, R.z + 0.006), M, 'head',
                  sides=22, rings=12, deform=gorro, keep=lambda j, i: j >= 4, poles=(False, True),
                  urep=2, vrep=1)

    def cinta(centros, ancho, lados=6, hueso='head'):
        secs = []
        for i, c in enumerate(centros):
            w = ancho * (1 - 0.62 * i / (len(centros) - 1)) + 0.0012
            secs.append((tuple(c), w, w * 0.36 + 0.0006))
        r0 = Vector(centros[0]) - C
        fig.loft(secs, M, hueso, sides=lados, xdir=tuple(r0), cap0=True, urep=0.5, vlen=0.16)

    # Corona: mechones cortos y pegados que resbalan del remate hacia la nuca y las sienes.
    for k in range(58):
        az = rnd.uniform(-math.pi, math.pi)
        el = rnd.uniform(0.35, 1.5)
        # La frente (cerca de az = −π/2, por debajo de la raya) es sólo del fleco.
        if abs((az + math.pi / 2 + math.pi) % (2 * math.pi) - math.pi) < 1.0 and el < 1.02:
            continue
        sgn = 1 if math.sin(az) > 0 else -1
        paso = rnd.uniform(0.18, 0.30)
        deriva = rnd.uniform(0.06, 0.18) * sgn
        r = rnd.uniform(1.012, 1.022)
        centros = [_punto(C, R, az + deriva * i / 3, el - paso * i / 3, r + 0.006 * i * i) for i in range(4)]
        cinta(centros, rnd.uniform(0.015, 0.021))

    # Fleco: manojos que nacen de la raya y barren hasta la sien, pegados al cráneo:
    # la frente queda despejada desde la raya hacia fuera, los picos mueren en la sien.
    for sgn in (-1, 1):
        for j in range(5):
            a0 = -math.pi / 2 + sgn * (0.10 + 0.13 * j)
            e0 = 1.42 - 0.04 * j
            barrido = sgn * (0.95 + 0.22 * j)
            caida = 0.30 + 0.10 * j
            centros = [_punto(C, R, a0 + barrido * (i / 4) ** 1.15, e0 - caida * (i / 4) ** 1.3, 1.014 + 0.010 * i * i) for i in range(6)]
            cinta(centros, 0.024 if j == 0 else 0.018)

    if largo:
        # Cortina de la espalda: cintas que siguen la curva del dorso hasta los
        # omóplatos y terminan en punta escalonada, no una tabla recta.
        for j in range(15):
            x0 = -0.105 + 0.21 * j / 14
            y0 = R.y * 0.86 + 0.02 - abs(x0) * 0.18
            base = C + Vector((x0, y0, 0.03))
            cae = 0.30 + 0.06 * math.sin(j * 1.7 + 1)
            secs = []
            for i in range(7):
                s = i / 6
                secs.append((base.x + 0.028 * s * (1 if x0 > 0 else -1) * abs(x0) / 0.105, base.y + 0.075 * math.sin(1.35 * s) + 0.010 * math.sin(j * 2.1) * s, base.z - cae * s))
            cinta(secs, 0.040 * (1 - 0.35 * abs(j - 7) / 7), lados=8, hueso={'head': 1.0, 'chest': 0.6} if j > 0 else 'head')
        # Dos mechones de marco que pasan por delante de la oreja hacia la mandíbula.
        for sgn in (-1, 1):
            a0 = -math.pi / 2 + sgn * 1.12
            centros = [_punto(C, R, a0 + sgn * 0.10 * i / 4, 0.78 - 0.42 * i / 4, 1.03 + 0.010 * i) for i in range(6)]
            cinta(centros, 0.024)
    return fig


def canal(nombre, tex, color, rough=0.8, metal=0.0, doble=False):
    """Material con el nombre exacto del canal: textura × color (baseColorFactor en el GLB)."""
    old = bpy.data.materials.get(nombre)
    if old:
        old.name = f'{nombre}_viejo'
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    m.use_backface_culling = not doble
    t = m.node_tree
    bsdf = next(n for n in t.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    img = t.nodes.new('ShaderNodeTexImage')
    img.image = H.textura(tex)
    uvn = t.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = 'UVMap'
    t.links.new(uvn.outputs[0], img.inputs['Vector'])
    mix = t.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs[0].default_value = 1.0
    a = next(s for s in mix.inputs if s.name == 'A' and s.type == 'RGBA')
    b = next(s for s in mix.inputs if s.name == 'B' and s.type == 'RGBA')
    t.links.new(img.outputs['Color'], a)
    b.default_value = (*color, 1)
    t.links.new(next(s for s in mix.outputs if s.type == 'RGBA'), bsdf.inputs['Base Color'])
    return m


def rasgos(head_c):
    """Ojos, cejas y boca de la cara de fg_heroe sobre fondo transparente: se pinta dos veces
    (fondo blanco y negro) y de la diferencia sale la opacidad de cada píxel."""
    claro = H.pintar_cara(f'{NOMBRE}_tmp_b', '#ffffff', iris='#4a2c18', sexo='m')
    oscuro = H.pintar_cara(f'{NOMBRE}_tmp_n', '#000000', iris='#4a2c18', sexo='m')
    size = claro.size[0]
    w = np.array(claro.pixels[:], dtype=np.float32).reshape(size, size, 4)[..., :3]
    k = np.array(oscuro.pixels[:], dtype=np.float32).reshape(size, size, 4)[..., :3]
    alpha = np.clip(1 - (w - k).mean(axis=2), 0, 1)
    alpha = np.where(alpha > 0.55, 1.0, 0.0).astype(np.float32)
    col = np.where(alpha[..., None] > 0, np.clip(k / np.maximum(1 - (w - k), 1e-3), 0, 1), 0)
    for im in (claro, oscuro):
        path = bpy.path.abspath(im.filepath_raw)
        bpy.data.images.remove(im)
        if os.path.exists(path):
            os.remove(path)
    img = bpy.data.images.get(f'{NOMBRE}_rasgos') or bpy.data.images.new(f'{NOMBRE}_rasgos', size, size, alpha=True)
    img.pixels.foreach_set(np.concatenate([col, alpha[..., None]], axis=2).astype(np.float32).ravel())
    img.filepath_raw = os.path.join(H.HORNEADAS, f'{NOMBRE}_rasgos.png')
    img.file_format = 'PNG'
    img.save()
    m = bpy.data.materials.get('rasgos') or bpy.data.materials.new('rasgos')
    m.use_nodes = True
    t = m.node_tree
    for n in [n for n in t.nodes if n.type in ('TEX_IMAGE', 'MATH')]:
        t.nodes.remove(n)
    bsdf = next(n for n in t.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.5
    tex = t.nodes.new('ShaderNodeTexImage')
    tex.image = img
    t.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    rnd = t.nodes.new('ShaderNodeMath')
    rnd.operation = 'ROUND'  # el exportador lo escribe como alphaMode MASK
    t.links.new(tex.outputs['Alpha'], rnd.inputs[0])
    t.links.new(rnd.outputs[0], bsdf.inputs['Alpha'])
    try:
        m.surface_render_method = 'DITHERED'
    except AttributeError:
        m.blend_method = 'CLIP'
    return m


def side(s):
    return 1 if s == 'L' else -1


def construir():
    h = H.Heroe(NOMBRE, sexo='m', piel='neutra_piel', piel_hex='#f4ece6', pelo='neutra_pelo')
    # La cara pintada de fg_heroe trae color de piel fijo; aquí la piel la pone la paleta.
    cara_vieja = os.path.join(H.HORNEADAS, f'cara_{NOMBRE}.png')
    if os.path.exists(cara_vieja):
        os.remove(cara_vieja)
    rnd = random.Random(254)
    SKIN = canal('skin', 'neutra_piel', (0.8, 0.6, 0.45), rough=0.65)
    CLOTH = canal('cloth', 'neutra_tela', (0.3, 0.3, 0.4), doble=True)  # capa y capucha se ven por dentro
    TRIM = canal('trim', 'neutra_cuero', (0.6, 0.5, 0.3), rough=0.75)
    HAIR = canal('hair', 'neutra_pelo', (0.2, 0.14, 0.1), rough=0.55)
    GEAR = canal('gear', 'neutra_metal', (0.65, 0.65, 0.68), rough=0.45, metal=0.25)
    BOTAS = H.mat('botas_pers', 'cuero_oscuro', rough=0.75)
    BOTAS.name = 'botas'
    h.piel = h.cara = SKIN
    h.mats = {'skin': SKIN, 'cloth': CLOTH, 'trim': TRIM, 'botas': BOTAS}

    # ------------------------------------------------------------ cuerpo
    def zonas(b, c):
        if b.startswith('foot') or (b.startswith('shin') and c.z < 0.17):
            return 'botas'
        if b.startswith('shin'):
            return 'trim'
        if b.startswith('foreArm') and 0.86 < c.z < 0.97:
            return 'trim'
        if b.startswith(('hand', 'foreArm')) or b == 'head' or c.z > 1.335:
            return 'skin'
        return 'cloth'
    h.cuerpo(zonas, {'botas': 0.016, 'trim': 0.012, 'cloth': 0.009}, [0.17, 0.86, 0.97, 1.335])
    h.cabeza()

    # Rasgos: una cáscara fina delante de la cara con la textura de ojos, cejas y boca.
    C, R = h.head_c, h.head_r
    RAS = rasgos(C)
    fr = H.ff.Figura('Rasgos', h.bones)

    def jaw(q):
        q = Vector(q)
        dz = C.z - q.z
        if dz > 0:
            s = min(1.0, dz / R.z)
            q.x *= 1 - 0.42 * s * s
            if q.y < C.y:
                q.y = C.y + (q.y - C.y) * (1 - 0.1 * s) - 0.008 * s * s
        return q
    sides = 28
    fr.ellipsoid(C, (R.x + 0.0018, R.y + 0.0022, R.z + 0.0018), RAS, 'head', sides=sides, rings=20, deform=jaw,
                 keep=lambda j, i: abs(i - sides / 2) <= 4 and 4 <= j <= 14, poles=(False, False))
    ro = H.uv_nombre(fr.object(h.scene))
    me = ro.data
    uv = me.uv_layers.active
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (0.5 + co.x / 0.26, 0.5 + (co.z - C.z) / 0.3)
    h.extras_obj.append(ro)

    x = h.figura('Ropa')
    waist = {'hips': 1.0, 'spine': 0.4}
    rx, ry = 0.162, 0.12
    # Faldón de la camisa por fuera del pantalón y cinturón con hebilla y bolsa.
    x.band([(0.99, rx - 0.004, ry - 0.004), (0.93, rx + 0.006, ry + 0.006), (0.87, rx + 0.016, ry + 0.012)], CLOTH, {'hips': 1.0, 'thighL': 0.25, 'thighR': 0.25}, sides=24, urep=5)
    x.band([(0.955, rx + 0.012, ry + 0.012), (0.99, rx + 0.006, ry + 0.008)], TRIM, waist, sides=24, urep=6)
    x.box((0, -ry - 0.017, 0.972), (0.05, 0.012, 0.04), GEAR, 'hips', uvm=0.05)
    x.box((0.13, -0.085, 0.93), (0.07, 0.05, 0.075), TRIM, 'hips', uvm=0.1)
    x.box((0.13, -0.112, 0.955), (0.074, 0.008, 0.03), TRIM, 'hips', uvm=0.1)
    # Cuello de la camisa con la abertura en pico.
    x.band([(1.335, 0.085, 0.07, (0, 0.004)), (1.36, 0.068, 0.058, (0, 0.006))], CLOTH, 'chest', sides=20, urep=3)
    for s in ('L', 'R'):
        k = side(s)
        # Puño de la manga en el codo y brazal de cuero.
        x.loft([((0.243 * k, 0, 1.06), 0.06, 0.058), ((0.246 * k, 0, 1.03), 0.058, 0.056)], CLOTH, {'upperArm' + s: 1.0, 'foreArm' + s: 0.4}, sides=14, urep=3)
        fore = {'foreArm' + s: 1.0}
        for z in (0.955, 0.875):
            x.loft([((0.258 * k, -0.018, z + 0.008), 0.047, 0.044), ((0.259 * k, -0.02, z - 0.008), 0.047, 0.044)], GEAR, fore, sides=12, urep=3)
        # Bota: vuelta, correa y suela.
        shin = {'shin' + s: 1.0}
        x.loft([((0.1 * k, 0, 0.2), 0.064, 0.066), ((0.1 * k, 0, 0.165), 0.062, 0.064)], BOTAS, shin, sides=16, urep=3)
        x.loft([((0.1 * k, 0.002, 0.33), 0.068, 0.07), ((0.1 * k, 0.002, 0.31), 0.068, 0.07)], TRIM, shin, sides=16, urep=4)
        foot = {'foot' + s: 1.0}
        x.loft([((0.1 * k, 0.07, 0.012), 0.05, 0.012), ((0.1 * k, -0.02, 0.012), 0.062, 0.012), ((0.1 * k, -0.15, 0.014), 0.055, 0.014), ((0.1 * k, -0.2, 0.017), 0.035, 0.012)],
               BOTAS, foot, sides=10, xdir=(1, 0, 0), cap0=True, cap1=True, urep=2, vlen=0.15)

    # ------------------------------------------------------------ cabeza
    h.pieza(pelo_humanoide(h, rnd, HAIR, False), 'Pelo_corto')
    h.pieza(pelo_humanoide(h, random.Random(255), HAIR, True), 'Pelo_largo')

    b = H.ff.Figura('Barba', h.bones)
    # Barba de herrero (MOD-08-smith): antes un bolo con dos cintas que cruzaban
    # sobre la boca. Ahora la falda abraza el maxilar (radio x hasta la mandíbula),
    # el bigote va pegado al labio sobre la superficie de la cara y la patilla baja
    # de la oreja a la falda siguiendo el contorno.
    b.ellipsoid((0, C.y - 0.055, C.z - 0.095), (0.1, 0.084, 0.076), HAIR, 'head', sides=18, rings=10, deform=lambda q: Vector((q.x, q.y, q.z - 0.045 * max(0.0, 0.05 - abs(q.x)) / 0.05)))
    for k in (-1, 1):  # bigote: arco corto sobre el labio, radio creciente hacia el centro
        b.loft([(tuple(C + Vector((0.072 * k, -0.106, -0.048))), 0.008, 0.006), (tuple(C + Vector((0.038 * k, -0.117, -0.054))), 0.011, 0.008), (tuple(C + Vector((0.004 * k, -0.119, -0.06))), 0.012, 0.009)],
               HAIR, 'head', sides=6, cap0=True, cap1=True)
    for k in (-1, 1):  # patilla pegada al borde de la cara: oreja → falda
        b.loft([(tuple(C + Vector((0.102 * k, -0.012, 0.012))), 0.013, 0.02), (tuple(C + Vector((0.098 * k, -0.048, -0.04))), 0.016, 0.024), (tuple(C + Vector((0.088 * k, -0.062, -0.085))), 0.014, 0.018)],
               HAIR, 'head', sides=6, cap0=True, cap1=True)
    h.pieza(b, 'Barba')

    cap = H.ff.Figura('Capucha', h.bones)
    hc = C + Vector((0, 0.022, 0.02))
    cap.ellipsoid(hc, (R.x + 0.032, R.y + 0.04, R.z + 0.035), CLOTH, 'head', sides=24, rings=14,
                  keep=lambda j, i: not (abs(i - 12) <= 3 and 3 <= j <= 9), poles=(False, True))
    # Borde de la abertura y caída sobre los hombros.
    ring = []
    for a in range(0, 360, 15):
        t = math.radians(a)
        ring.append(((0.078 * math.cos(t), C.y - 0.105, C.z + 0.0 + 0.1 * math.sin(t)), 0.011, 0.011))
    ring.append(ring[0])
    cap.loft(ring, TRIM, 'head', sides=6, urep=1, vlen=0.1)
    cap.band([(1.43, 0.11, 0.1, (0, 0.03)), (1.37, 0.17, 0.14, (0, 0.03)), (1.3, 0.24, 0.17, (0, 0.03)), (1.24, 0.27, 0.18, (0, 0.03))],
             CLOTH, {'head': 0.5, 'chest': 1.0}, sides=24, urep=4)
    cap.band([(1.245, 0.272, 0.182, (0, 0.03)), (1.22, 0.276, 0.186, (0, 0.03))], TRIM, {'chest': 1.0}, sides=24, urep=6)
    h.pieza(cap, 'Capucha')

    y = H.ff.Figura('Yelmo', h.bones)
    y.ellipsoid(C + Vector((0, 0.005, 0.03)), (R.x + 0.025, R.y + 0.025, R.z + 0.02), GEAR, 'head', sides=24, rings=12,
                keep=lambda j, i: j >= 5, poles=(False, True))
    y.band([(C.z + 0.02, R.x + 0.03, R.y + 0.03, (0, C.y + 0.005)), (C.z - 0.005, R.x + 0.032, R.y + 0.032, (0, C.y + 0.005))], TRIM, 'head', sides=24, urep=6)
    y.box((0, C.y - R.y - 0.03, C.z - 0.03), (0.022, 0.016, 0.1), GEAR, 'head', uvm=0.08)
    y.loft([((0, C.y - 0.02, C.z + R.z + 0.035), 0.012, 0.03), ((0, C.y + 0.07, C.z + R.z + 0.02), 0.012, 0.032), ((0, C.y + 0.14, C.z + R.z - 0.03), 0.01, 0.02)],
           TRIM, 'head', sides=8, cap0=True, cap1=True)
    for k in (-1, 1):
        y.box((k * (R.x + 0.02), C.y - 0.02, C.z - 0.06), (0.018, 0.08, 0.1), GEAR, 'head', uvm=0.08)
    h.pieza(y, 'Yelmo')

    bd = H.ff.Figura('Banda', h.bones)
    # Sombrero pintado (MOD-08): ala ancha caída delante y levantada sobre la nuca,
    # copa baja con cintillo de tela. Material `pintado` propio (palma tejida, sin
    # teñir): los cinco canales de la paleta los consume la ropa; el sombrero es de
    # paja sea cual sea el PNJ, como en el Istmo. Antes era una vincha fina: los
    # looks `fisher` y `apothecary` llevaban una cinta en la frente que no decía nada.
    PALMA = canal('pintado', 'neutra_palma', (0.72, 0.62, 0.40), rough=0.85, doble=True)
    z0 = C.z + R.z - 0.055  # arranque de la copa, asentada sobre la calavera del pelo
    bd.band([(z0 + 0.006, R.x * 0.64, R.y * 0.64, (0, C.y)), (z0 + 0.030, R.x * 0.70, R.y * 0.70, (0, C.y)),
             (z0 + 0.052, R.x * 0.60, R.y * 0.62, (0, C.y)), (z0 + 0.066, R.x * 0.34, R.y * 0.35, (0, C.y))],
            PALMA, 'head', sides=22, urep=4)
    bd.ellipsoid((0, C.y, z0 + 0.064), (R.x * 0.34, R.y * 0.35, 0.018), PALMA, 'head', sides=14, rings=4,
                 poles=(False, True))
    # Ala: lámina fn(u=ángulo, v=radio) caída delante (sombra sobre los ojos) y
    # algo levantada sobre la nuca, con el canto en dos olas suaves.
    def sombrero(u, v):
        ang = 2 * math.pi * u
        rr = 0.080 + (R.x * 0.58 + 0.072) * v
        dz = -0.048 * v * v + 0.030 * v * v * max(0.0, -math.cos(ang)) - 0.008 * v * v * math.cos(2 * ang)
        return Vector((rr * math.sin(ang), C.y - rr * math.cos(ang) * 0.92, z0 + 0.006 + dz))
    bd.sheet(sombrero, 26, 5, PALMA, 'head', urep=6, vrep=1)
    # Cintillo de tela en la base de la copa.
    bd.band([(z0 + 0.008, R.x * 0.685, R.y * 0.685, (0, C.y)), (z0 + 0.026, R.x * 0.675, R.y * 0.675, (0, C.y))], CLOTH, 'head', sides=22, urep=5)
    h.pieza(bd, 'Banda')

    # ------------------------------------------------------------ ropa por capas
    skirt_w = {'hips': 1.0, 'thighL': 0.55, 'thighR': 0.55}
    t = H.ff.Figura('Tunica', h.bones)
    # Pollera larga hasta el tobillo con vuelo (MOD-08): la túnica anterior paraba
    # en la espinilla y dejaba la pierna de medio color. Bajo delantal claro al frente
    # y dobladillo ondulado: la silueta de la ropa de pueblo, no la bata de cocina.
    t.band([(1.0, rx + 0.012, ry + 0.012), (0.88, rx + 0.04, ry + 0.032), (0.7, rx + 0.08, ry + 0.06),
            (0.5, rx + 0.13, ry + 0.095), (0.32, rx + 0.175, ry + 0.13), (0.16, rx + 0.205, ry + 0.155),
            (0.145, rx + 0.20, ry + 0.15)], CLOTH, skirt_w, sides=28, urep=5)
    # Cenefa del dobladillo: franja de cenefa cosida al borde (hundo 4 mm en la
    # tela para que no flote como aro).
    t.band([(0.185, rx + 0.202, ry + 0.152), (0.148, rx + 0.199, ry + 0.149)], TRIM, skirt_w, sides=28, urep=8)
    t.band([(0.445, rx + 0.128, ry + 0.094), (0.4, rx + 0.135, ry + 0.1)], TRIM, skirt_w, sides=28, urep=8)
    t.band([(1.0, rx + 0.02, ry + 0.02), (0.955, rx + 0.024, ry + 0.022)], TRIM, waist, sides=24, urep=6)
    t.sheet(lambda u, v: Vector(((v - 0.5) * (0.06 + 0.08 * u), -(ry + 0.035 + 0.14 * u) - 0.004, 0.95 - 0.79 * u)), 6, 1, TRIM, skirt_w, urep=1, vrep=1)
    h.pieza(t, 'Tunica')

    m = H.ff.Figura('Mandil', h.bones)

    def apron(u, v):
        z = 1.25 - v * 0.66
        wdt = 0.12 + 0.075 * min(1.0, v * 2.2)
        xx = (u - 0.5) * 2 * wdt
        # Cuero de herrero: curva alrededor del cuerpo (no un tablero) y cae libre
        # por debajo de la cintura, donde abomba un poco.
        ang = (u - 0.5) * 1.9
        fondo = (0.145 if z > 1.0 else ry + 0.035) + 0.012 * math.sin(v * math.pi) ** 2
        yy = -(fondo * math.cos(ang * 0.62)) - 0.02 * v
        return Vector((fondo * math.sin(ang) * 0.9, yy - 0.012, z))
    m.sheet(apron, 10, 10, TRIM, {'chest': 1.0, 'spine': 0.7, 'hips': 0.6, 'thighL': 0.3, 'thighR': 0.3}, urep=2, vrep=2)
    # Cuello de cuero y bolsillo con el ribete fuera (el detalle que dice «herrero»).
    m.loft([((0, -0.115, 1.36), 0.03, 0.008), ((0, 0.02, 1.4), 0.03, 0.008), ((0, 0.11, 1.33), 0.03, 0.008)], TRIM, 'chest', sides=6, cap0=True, cap1=True)
    m.box((0, -0.178, 0.72), (0.075, 0.014, 0.075), TRIM, {'hips': 1.0, 'thighL': 0.3, 'thighR': 0.3}, uvm=0.1)
    m.box((0, -0.19, 0.76), (0.055, 0.01, 0.028), CLOTH, {'hips': 1.0, 'thighL': 0.3, 'thighR': 0.3}, uvm=0.1)
    m.box((0, -0.175, 0.86), (0.18, 0.012, 0.1), CLOTH, 'hips', uvm=0.1)
    for k in (-1, 1):
        m.loft([((0.1 * k, -0.125, 1.25), 0.008, 0.004), ((0.08 * k, -0.06, 1.36), 0.008, 0.004), ((0, 0.06, 1.37), 0.008, 0.004)], TRIM, 'chest', sides=4, xdir=(0, 0, 1))
    h.pieza(m, 'Mandil')

    a = H.ff.Figura('Armadura', h.bones)
    a.band([(1.0, 0.172, 0.13), (1.1, 0.178, 0.135), (1.2, 0.198, 0.142), (1.3, 0.172, 0.122), (1.345, 0.11, 0.09)], GEAR, {'chest': 1.0, 'spine': 0.5}, sides=28, urep=4)
    a.band([(0.995, 0.176, 0.134), (0.965, 0.18, 0.137)], TRIM, waist, sides=28, urep=6)
    a.loft([((0, -0.152, 1.0), 0.012, 0.008), ((0, -0.162, 1.2), 0.014, 0.01), ((0, -0.13, 1.31), 0.01, 0.008)], TRIM, 'chest', sides=6, cap0=True, cap1=True)
    for s in ('L', 'R'):
        k = side(s)
        sh = {'upperArm' + s: 1.0, 'chest': 0.4}
        a.ellipsoid((0.2 * k, 0.0, 1.29), (0.085, 0.09, 0.06), GEAR, sh, sides=16, rings=8, keep=lambda j, i: j >= 3, poles=(False, True))
        a.band([(1.255, 0.085, 0.09, (0.205 * k, 0)), (1.235, 0.088, 0.093, (0.205 * k, 0))], TRIM, sh, sides=16, urep=4)
    h.pieza(a, 'Armadura')

    cp = H.ff.Figura('Capa', h.bones)

    def cape_pt(u, v, out=0.0):
        ang = (u - 0.5) * 2.5
        z = 1.3 - v * 0.86
        rrx = 0.21 + 0.11 * v
        rry = 0.13 + 0.1 * v
        fold = 0.016 * math.sin(ang * 7) * v
        return Vector((rrx * math.sin(ang), 0.02 + 0.08 * v + (rry + fold + out) * math.cos(ang), z))
    cape_w = {'chest': 1.0, 'spine': 0.7, 'hips': 0.35}
    cp.sheet(lambda u, v: cape_pt(u, v * 0.9), 18, 10, CLOTH, cape_w, urep=3, vrep=3)
    cp.sheet(lambda u, v: cape_pt(u, 0.9 + v * 0.1, 0.001), 18, 1, TRIM, cape_w, urep=4, vrep=1)
    for k in (-1, 1):
        cp.ellipsoid((0.14 * k, -0.05, 1.3), (0.03, 0.02, 0.03), GEAR, 'chest', sides=10, rings=6)
    cp.loft([((-0.14, -0.06, 1.3), 0.005, 0.005), ((0, -0.1, 1.27), 0.005, 0.005), ((0.14, -0.06, 1.3), 0.005, 0.005)], TRIM, 'chest', sides=5)
    h.pieza(cp, 'Capa')

    # ------------------------------------------------------------ armas
    up = Vector((0, 0, 1))
    grip, xf, _ = h.agarre('handR')
    g = Vector((grip.x, grip.y, 0))

    e = H.ff.Figura('Arma_espada', h.bones)
    e.xf = xf
    e.loft([(tuple(g + up * (grip.z - 0.075)), 0.017, 0.017), (tuple(g + up * (grip.z + 0.075)), 0.017, 0.017)], TRIM, 'handR', sides=8, urep=2, vlen=0.05)
    e.ellipsoid(tuple(g + up * (grip.z - 0.09)), (0.024, 0.024, 0.02), GEAR, 'handR', sides=10, rings=6)
    e.box(g + up * (grip.z + 0.088), (0.17, 0.035, 0.022), GEAR, 'handR', uvm=0.1)
    # Hoja con volumen (MOD-08-smith): antes 6 mm de chapa que a 8 m era papel.
    # Sección rombo que adelgaza hacia el filo, filo cortante arriba.
    blade = [(0.09, 0.031, 0.011), (0.5, 0.029, 0.009), (0.68, 0.021, 0.005), (0.78, 0.003, 0.0018)]
    e.loft([(tuple(g + up * (grip.z + zz)), w, t) for zz, w, t in blade], GEAR, 'handR', sides=4, xdir=(1, 0, 0), seam=0, smooth=False, cap0=True, urep=1)
    e.loft([(tuple(g + up * (grip.z + 0.1) + Vector((0, -0.0095, 0))), 0.006, 0.0016), (tuple(g + up * (grip.z + 0.62) + Vector((0, -0.009, 0))), 0.005, 0.0012)], TRIM, 'handR', sides=4, xdir=(1, 0, 0), seam=0, smooth=False)
    h.pieza(e, 'Arma_espada')

    st = H.ff.Figura('Arma_baston', h.bones)
    st.xf = xf
    st.loft([(tuple(g + up * (grip.z - 0.62)), 0.016, 0.016), (tuple(g + up * (grip.z + 0.4)), 0.019, 0.019), (tuple(g + up * (grip.z + 0.86)), 0.022, 0.022)], TRIM, 'handR', sides=10, urep=1, vlen=0.4, cap0=True)
    for z in (grip.z + 0.7, grip.z + 0.84):
        st.loft([(tuple(g + up * (z - 0.012)), 0.026, 0.026), (tuple(g + up * (z + 0.012)), 0.026, 0.026)], GEAR, 'handR', sides=10, cap0=True, cap1=True)
    st.ellipsoid(tuple(g + up * (grip.z + 0.94)), (0.058, 0.058, 0.07), GEAR, 'handR', sides=14, rings=8)
    for k in range(3):
        ang = k * 2 * math.pi / 3
        d = Vector((math.cos(ang), math.sin(ang), 0))
        st.loft([(tuple(g + up * (grip.z + 0.84) + d * 0.02), 0.008, 0.008), (tuple(g + up * (grip.z + 0.95) + d * 0.07), 0.006, 0.006), (tuple(g + up * (grip.z + 1.03) + d * 0.03), 0.004, 0.004)],
                TRIM, 'handR', sides=6, cap1=True)
    h.pieza(st, 'Arma_baston')

    lgrip, lxf, _ = h.agarre('handL')
    lg = Vector((lgrip.x, lgrip.y, 0))
    ar = H.ff.Figura('Arma_arco', h.bones)
    ar.xf = lxf
    pts = []
    for i in range(17):
        tt = -1 + i / 8
        pts.append((tuple(lg + Vector((0, 0.13 * tt * tt, 0)) + up * (lgrip.z + 0.6 * tt)), 0.016 * (1 - 0.45 * abs(tt)), 0.012 * (1 - 0.45 * abs(tt))))
    ar.loft(pts, TRIM, 'handL', sides=8, cap0=True, cap1=True, urep=1, vlen=0.3)
    ar.loft([(tuple(lg + up * (lgrip.z - 0.07)), 0.022, 0.02), (tuple(lg + up * (lgrip.z + 0.07)), 0.022, 0.02)], CLOTH, 'handL', sides=8, urep=2)
    ar.loft([(tuple(lg + Vector((0, 0.13, 0)) + up * (lgrip.z - 0.6)), 0.0025, 0.0025), (tuple(lg + Vector((0, 0.13, 0)) + up * (lgrip.z + 0.6)), 0.0025, 0.0025)], GEAR, 'handL', sides=4)
    h.pieza(ar, 'Arma_arco')

    sh = H.ff.Figura('Escudo', h.bones)
    sh.xf = lxf
    c0 = lgrip + Vector((0.07, 0, 0.1))
    xd = Vector((1, 0, 0))
    sh.loft([(tuple(c0), 0.24, 0.24), (tuple(c0 + xd * 0.025), 0.25, 0.25), (tuple(c0 + xd * 0.04), 0.235, 0.235)], TRIM, 'handL', sides=28, xdir=(0, 1, 0), cap0=True, cap1=True, urep=1)
    sh.loft([(tuple(c0 + xd * 0.035), 0.252, 0.252), (tuple(c0 + xd * 0.05), 0.25, 0.25)], GEAR, 'handL', sides=28, xdir=(0, 1, 0), urep=6)
    sh.ellipsoid(tuple(c0 + xd * 0.045), (0.035, 0.075, 0.075), GEAR, 'handL', sides=14, rings=8)
    for k in range(6):
        ang = k * math.pi / 3
        sh.ellipsoid(tuple(c0 + xd * 0.046 + Vector((0, 0.18 * math.cos(ang), 0.18 * math.sin(ang)))), (0.012, 0.016, 0.016), GEAR, 'handL', sides=8, rings=5)
    h.pieza(sh, 'Escudo')

    # ------------------------------------------------------------ clips
    atacar = [
        (1, p()),
        (8, p(chest=(0, 0, 28), spine=(0, 0, 10), upperArmR=(-140, -25, 0), foreArmR=(-50, 0, 0), thighR=(10, 0, 0), thighL=(-12, 0, 0), shinL=(10, 0, 0)), (0, 0, -0.02)),
        (12, p(chest=(14, 0, -32), spine=(8, 0, -12), upperArmR=(-50, -8, 0), foreArmR=(-12, 0, 0), thighR=(-26, 0, 0), shinR=(16, 0, 0), thighL=(14, 0, 0), shinL=(18, 0, 0)), (0, -0.05, -0.05)),
        (16, p(chest=(10, 0, -20), upperArmR=(-30, -6, 0), foreArmR=(-20, 0, 0), thighR=(-20, 0, 0), shinR=(14, 0, 0), thighL=(12, 0, 0), shinL=(14, 0, 0)), (0, -0.04, -0.04)),
        (24, p()),
    ]
    lanzar = [
        (1, p()),
        (9, p(chest=(-14, 0, 0), head=(-8, 0, 0), upperArmR=(-120, -18, 0), upperArmL=(-120, 18, 0), foreArmR=(-40, 0, 0), foreArmL=(-40, 0, 0)), (0, 0.02, 0)),
        (14, p(chest=(14, 0, 0), head=(6, 0, 0), upperArmR=(-88, -6, 0), upperArmL=(-88, 6, 0), foreArmR=(-6, 0, 0), foreArmL=(-6, 0, 0), thighR=(-18, 0, 0), shinR=(10, 0, 0), thighL=(10, 0, 0), shinL=(10, 0, 0)), (0, -0.04, -0.03)),
        (20, p(chest=(8, 0, 0), upperArmR=(-70, -6, 0), upperArmL=(-70, 6, 0), foreArmR=(-14, 0, 0), foreArmL=(-14, 0, 0))),
        (27, p()),
    ]
    h.clips(atacar, lanzar)
    h.montar()
    return h


def exportar(h):
    """Sin horneado: los canales siguen separados para que el juego los tiña."""
    import fg_rig  # noqa: F401
    objs = [h.cuerpo_obj, *h.piezas.values()]
    for o in objs:
        base = o.name.split('.')[0]
        otro = bpy.data.objects.get(base)
        if otro is not None and otro is not o:
            otro.name = f'{base}_viejo'
        o.name = base
        o.data.name = base
    h.rig.parts = objs
    h.rig.export('personaje.glb', imagenes='JPEG')


def main():
    h = construir()
    exportar(h)
    return h


if __name__ == '__main__':
    main()
