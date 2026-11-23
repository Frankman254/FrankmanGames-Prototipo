# OMP-POL-07 (PROPUESTA, no sustituye nada): el hombre sobre el cuerpo de la mujer.
# El creador dijo que «el diseño del hombre está horrible»: los masculinos de hoy
# (base YW) son muñecos de articulaciones de bola y hombros caídos. Esta propuesta
# toma el GLB femenino (`<clase>_f_anime.glb`: mismas piezas, misma topología,
# mismo rig FG_* y los mismos clips) y lo re-proporciona a varón:
#   - hombros más anchos y cuadrado el torso, cintura menos pinchada, cadera más estrecha,
#   - pecho sin busto (la Ropa y la Piel del torso se aplanan por bandas de altura),
#   - cuello, brazos y manos más gruesos, pie algo mayor,
#   - cara nueva pintada con `pintar_cara(sexo='m')` remapeando la UV de la cáscara,
#   - pelo corto asentado al cráneo (las púas de la base se recogen hacia dentro).
# Salida (fuera de Git, es propuesta): work/omp-pol07/<clase>_propuesto.glb.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup \
#       --python scripts/blender/pol07_hombre_propuesta.py
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import fg_heroe as H  # noqa: E402
from fg_heroe import mat  # noqa: E402

OUT = os.path.join(ROOT, 'work', 'omp-pol07')
os.makedirs(OUT, exist_ok=True)
MD = os.path.join(ROOT, 'assets', 'models')

# piel y pelo de cada clase (los mismos hex que usan los femeninos)
CLASES = {
    'centinela': {'nombre': 'Vanguardia de Brasa', 'piel_hex': '#e8b48e', 'iris': '#6a3a1a'},
    'oraculo': {'nombre': 'Tejedora de Tormentas', 'piel_hex': '#f0c8a0', 'iris': '#3a6ea5'},
    'cazador': {'nombre': 'Cazador del Manglar', 'piel_hex': '#d9a06a', 'iris': '#4a2c18'},
}

PIEZA = ('Piel', 'Ropa', 'Ropa2', 'Calzado', 'Traje')


def banda(vs, z0, z1, mask=None):
    m = (vs[:, 2] >= z0) & (vs[:, 2] < z1)
    if mask is not None:
        m &= mask
    return m


def deformar(vs):
    """`vs` (n,3) → (n,3) numpy: re-proporción masculina por bandas de altura."""
    out = vs.copy()
    x, y, z = vs[:, 0], vs[:, 1], vs[:, 2]
    ax = np.abs(x)
    # Hombros y pecho alto: más anchos y cuadrados.
    m = banda(vs, 1.14, 1.32) & (ax < 0.30)
    out[m, 0] = x[m] * 1.10
    # Brazos: algo más separados y gruesos (bíce a muñeca).
    m = (ax >= 0.15) & (z < 1.14) & (z > 0.70)
    s = np.sign(x[m])
    out[m, 0] = x[m] + s * 0.008
    out[m, 1] = y[m] * 1.06
    # Manos (el guante/piel al final del brazo).
    m = (ax >= 0.185) & (z <= 0.98) & (z > 0.60)
    out[m, 0] = x[m] * 1.05
    # Cuello más grueso.
    m = banda(vs, 1.32, 1.42) & (ax < 0.14)
    out[m, 0] = x[m] * 1.14
    out[m, 1] = y[m] * 1.12
    # Pecho sin busto: la superficie frontal del tórax retrocede hacia el torso.
    m = banda(vs, 1.06, 1.30) & (y < -0.10) & (ax < 0.13)
    out[m, 1] = -0.10 + (y[m] + 0.10) * 0.35
    # Cintura menos pinchada y caja torácica recta.
    m = banda(vs, 0.96, 1.08) & (ax < 0.20)
    out[m, 0] = x[m] * 1.05
    # Cadera y glúteos más estrechos.
    m = banda(vs, 0.78, 0.96) & (ax < 0.24)
    out[m, 0] = x[m] * 0.96
    # Muslos algo más gruesos (rectos, no cónicos).
    m = banda(vs, 0.45, 0.78) & (ax < 0.18)
    s = np.where(x[m] >= 0, 1.0, -1.0)
    cx = 0.10 * s
    out[m, 0] = cx + (x[m] - cx) * 1.05
    # Pie un poco mayor y más ancho.
    m = z < 0.07
    out[m, 1] = y[m] * 1.10
    out[m, 0] = x[m] * 1.05
    return out


def maxilar(vs):
    """Mandíbula cuadrada para la cáscara de la cara: ensancha hacia el mentón."""
    x, z = vs[:, 0], vs[:, 2]
    out = vs.copy()
    t = np.clip((1.480 - z) / 0.064, 0.0, 1.0)  # 0 en cejas, 1 en mentón
    out[:, 0] = x * (1 + 0.10 * t)
    return out


def cara_nueva(clase, cfg):
    """Textura de varón con el pincel de fg_heroe; devuelve el material.
    El rubor de `pintar_cara` (común a los dos sexos) se retira: en la cabeza ancha
    de B-chan era lo que más feminizaba la cara."""
    previa, H.HORNEADAS = H.HORNEADAS, OUT  # la propuesta no contamina assets/textures
    img = H.pintar_cara(f'propuesto_{clase}', cfg['piel_hex'], cfg['iris'], sexo='m')
    size = img.size[0]
    px = np.array(img.pixels[:], dtype=np.float32).reshape(size, size, 4)
    U, V = np.meshgrid((np.arange(size) + 0.5) / size, (np.arange(size) + 0.5) / size)
    rub = np.array(H._hs('#e07a6a'), dtype=np.float32)
    for cx in (0.31, 0.69):
        d = ((U - cx) / 0.08) ** 2 + ((V - 0.37) / 0.035) ** 2
        m = (0.35 * (1 - H._ss(0.3, 1.0, d)))[..., None]
        px[..., :3] = (px[..., :3] - rub * m) / np.maximum(1 - m, 1e-3)
    img.pixels.foreach_set(px.ravel())
    img.update()
    ruta_png = os.path.join(OUT, f'cara_propuesto_{clase}.png')
    img.filepath_raw = ruta_png
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    # recargar desde el PNG: el material lee la textura en sRGB (como en producción);
    # los floats en memoria son lineales y se verían desteñidos.
    img = bpy.data.images.load(ruta_png, check_existing=False)
    img.name = f'cara_propuesto_{clase}'
    H.HORNEADAS = previa
    return mat(f'heroe_{clase}_propuesto_cara', img, rough=0.6)


def remapear_cara(obj, material):
    me = obj.data
    uv = me.uv_layers[0]
    zc, W, Ht = 1.4695, 0.176, 0.15
    for poly in me.polygons:
        if poly.normal.y > -0.15:  # la nuca de la cáscara: piel lisa
            for li in poly.loop_indices:
                uv.data[li].uv = (0.03, 0.97)
            continue
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (0.5 + v.x / W, 0.5 + (v.z - zc) / Ht)
    me.materials.clear()
    me.materials.append(material)


def asentar_pelo(objs):
    """Recoge las púas del pelo hacia el cráneo (el erizo YW/B-chan de la base)."""
    C = Vector((0, -0.005, 1.475))
    R = Vector((0.128, 0.118, 0.100))
    for o in objs:
        me = o.data
        for v in me.vertices:
            rel = (v.co - C)
            d = math.sqrt((rel.x / R.x) ** 2 + (rel.y / R.y) ** 2 + (rel.z / R.z) ** 2)
            if d > 1.14:
                v.co = C + rel * (1.14 / d)


def construir(clase):
    cfg = CLASES[clase]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MD, f'{clase}_f_anime.glb'))
    objs = bpy.data.objects
    for n in PIEZA:
        o = objs.get(n)
        if o is None:
            continue
        vs = np.array([list(v.co) for v in o.data.vertices])
        nv = deformar(vs)
        for i, v in enumerate(o.data.vertices):
            v.co = Vector(nv[i])
    # cabeza: mandíbula más ancha en la piel del cráneo y en la cáscara de la cara
    piel = objs['Piel']
    for v in piel.data.vertices:
        if 1.36 < v.co.z < 1.56:
            t = max(0.0, (1.500 - v.co.z) / 0.14)
            v.co.x *= 1 + 0.07 * t
    caras = [objs[f'Cara_{k}'] for k in range(4)]
    material = cara_nueva(clase, cfg)
    for k, o in enumerate(caras):
        vs = np.array([list(v.co) for v in o.data.vertices])
        vs[:, 0] *= 1.07  # la cáscara sigue al cráneo ensanchado
        nv = maxilar(vs)
        for i, v in enumerate(o.data.vertices):
            v.co = Vector(nv[i])
        remapear_cara(o, material)
    pelo = objs.get('Pelo_short')
    if pelo:
        vs = np.array([list(v.co) for v in pelo.data.vertices])
        vs[:, 0] *= 1.05
        for i, v in enumerate(pelo.data.vertices):
            v.co = Vector(vs[i])
        asentar_pelo([pelo])
    for n in ('Pelo_long', 'Pelo_bun'):
        o = objs.get(n)
        if o:
            bpy.data.objects.remove(o)
    # El sombrero del cazador apoyaba en el moño; sin él flotaría. Se baja hasta
    # rozar el pelo asentado (la ala queda sobre la ceja).
    yelmo = objs.get('Yelmo')
    if yelmo:
        for v in yelmo.data.vertices:
            v.co.z -= 0.025
    # el juego enciende piezas por nombre; sin largo/moño el varón lleva el corto
    rig = next(o for o in objs if o.type == 'ARMATURE')
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for o in bpy.data.objects:
        if o.type == 'MESH':
            o.select_set(True)
    destino = os.path.join(OUT, f'{clase}_propuesto.glb')
    bpy.ops.export_scene.gltf(filepath=destino, use_selection=True, export_format='GLB',
                              export_yup=True, export_animations=True, export_skins=True,
                              export_apply=False)
    print(f'XX escrito {destino}')


if __name__ == '__main__':
    clases = [a for a in sys.argv[sys.argv.index('--') + 1:]] if '--' in sys.argv else list(CLASES)
    for c in clases:
        construir(c)
