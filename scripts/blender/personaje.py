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
    pelo, _ = h.pelo('corto', rnd, color_mat=HAIR)
    h.pieza(pelo, 'Pelo_corto')
    pelo, _ = h.pelo('largo', random.Random(255), color_mat=HAIR)
    h.pieza(pelo, 'Pelo_largo')

    b = H.ff.Figura('Barba', h.bones)
    b.ellipsoid((0, C.y - 0.06, C.z - 0.105), (0.088, 0.072, 0.06), HAIR, 'head', sides=18, rings=10, deform=lambda q: Vector((q.x, q.y, q.z - 0.04 * max(0.0, 0.05 - abs(q.x)) / 0.05)))
    for k in (-1, 1):
        b.loft([((0.012 * k, C.y - 0.122, C.z - 0.06), 0.012, 0.007), ((0.04 * k, C.y - 0.112, C.z - 0.07), 0.01, 0.006), ((0.058 * k, C.y - 0.095, C.z - 0.09), 0.004, 0.003)],
               HAIR, 'head', sides=6, cap0=True, cap1=True)
    for k in (-1, 1):  # patillas
        b.loft([((0.108 * k, C.y + 0.0, C.z + 0.02), 0.012, 0.022), ((0.1 * k, C.y - 0.02, C.z - 0.07), 0.016, 0.03)], HAIR, 'head', sides=8, cap0=True)
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
    bd.band([(C.z + 0.035, R.x + 0.008, R.y + 0.01, (0, C.y)), (C.z + 0.075, R.x + 0.002, R.y + 0.004, (0, C.y))], TRIM, 'head', sides=24, urep=6)
    bd.ellipsoid((0, C.y + R.y + 0.012, C.z + 0.05), (0.024, 0.018, 0.022), TRIM, 'head', sides=10, rings=6)
    for k in (-1, 1):
        def cola(u, v, k=k):
            return Vector((0.012 * k + 0.05 * k * u + (v - 0.5) * 0.03, C.y + R.y + 0.02 + 0.04 * u, C.z + 0.04 - 0.17 * u))
        bd.sheet(cola, 5, 1, TRIM, {'head': 1.0}, urep=1, vrep=1)
    h.pieza(bd, 'Banda')

    # ------------------------------------------------------------ ropa por capas
    skirt_w = {'hips': 1.0, 'thighL': 0.55, 'thighR': 0.55}
    t = H.ff.Figura('Tunica', h.bones)
    t.band([(1.0, rx + 0.012, ry + 0.012), (0.88, rx + 0.04, ry + 0.032), (0.7, rx + 0.08, ry + 0.06), (0.5, rx + 0.12, ry + 0.09), (0.42, rx + 0.135, ry + 0.1)], CLOTH, skirt_w, sides=28, urep=5)
    t.band([(0.445, rx + 0.132, ry + 0.098), (0.4, rx + 0.142, ry + 0.104)], TRIM, skirt_w, sides=28, urep=8)
    t.band([(1.0, rx + 0.02, ry + 0.02), (0.955, rx + 0.024, ry + 0.022)], TRIM, waist, sides=24, urep=6)
    t.sheet(lambda u, v: Vector(((v - 0.5) * (0.06 + 0.08 * u), -(ry + 0.035 + 0.075 * u) - 0.004, 0.95 - 0.52 * u)), 6, 1, TRIM, skirt_w, urep=1, vrep=1)
    h.pieza(t, 'Tunica')

    m = H.ff.Figura('Mandil', h.bones)

    def apron(u, v):
        z = 1.25 - v * 0.62
        wdt = 0.13 + 0.06 * min(1.0, v * 2.5)
        xx = (u - 0.5) * 2 * wdt
        yy = -(0.13 if z > 1.0 else ry + 0.03) - 0.02 * v - 0.012 * (xx / max(wdt, 1e-3)) ** 2 * -1
        return Vector((xx, yy - 0.01, z))
    m.sheet(apron, 8, 10, TRIM, {'chest': 1.0, 'spine': 0.7, 'hips': 0.6, 'thighL': 0.3, 'thighR': 0.3}, urep=2, vrep=2)
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
    blade = [(0.1, 0.03, 0.0), (0.5, 0.028, 0.0), (0.68, 0.02, 0.0), (0.76, 0.002, 0.0)]
    e.loft([(tuple(g + up * (grip.z + zz)), w, 0.006) for zz, w, _ in blade], GEAR, 'handR', sides=4, xdir=(1, 0, 0), seam=0, smooth=False, cap0=True, urep=1)
    e.loft([(tuple(g + up * (grip.z + 0.1) + Vector((0, -0.0065, 0))), 0.005, 0.001), (tuple(g + up * (grip.z + 0.6) + Vector((0, -0.0065, 0))), 0.004, 0.001)], TRIM, 'handR', sides=4, xdir=(1, 0, 0), seam=0, smooth=False)
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
