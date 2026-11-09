# Piezas personalizables de los héroes anime (heroe_anime.py y heroe_bchan.py).
#
# Cada héroe se exporta en piezas con un material por pieza. Los materiales `skin`, `cloth`,
# `trim` y `hair` se tiñen en el juego con los colores que el jugador elige al crear el
# personaje (las mismas ranuras que las paletas de data/assets.json): por eso sus texturas
# se hornean neutras (gris, o la piel dividida por su tono medio) y el color lo pone el juego.
#   Piel      → skin     piel del cuerpo (en la base femenina, también la cara)
#   Ropa      → cloth    prenda principal
#   Ropa2     → trim     prenda secundaria (pantalón, falda, medias)
#   Calzado   → sin teñir: botas, guantes, cinturón, brazales…
#   Cara_N    → variantes de cara; el juego deja sólo la elegida
#   Pelo_<e>  → hair     peinados (`short`, `long`, `bun`); sin ninguno, rapado
import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

import fg_heroe as H

RANURA = {'Piel': 'skin', 'Cara': 'skin', 'Ropa': 'cloth', 'Ropa2': 'trim', 'Pelo': 'hair'}
SEPARACION = 0.7  # las variantes de cara se hornean juntas, apartadas en X


class _Horno:
    def __init__(self, scene, nombre):
        self.scene = scene
        self.nombre = nombre


def ranura(nombre_pieza):
    base = nombre_pieza.split('_')[0]
    if nombre_pieza.startswith('Ropa2'):
        return 'trim'
    return RANURA.get(base)


def asegurar_uv(o):
    me = o.data
    if not me.uv_layers:
        me.uv_layers.new(name='UVMap')
    me.uv_layers[0].name = 'UVMap'
    for extra in list(me.uv_layers)[1:]:
        me.uv_layers.remove(extra)


def unir(scene, objs, nombre):
    """Une `objs` en un objeto llamado `nombre` (el primero absorbe a los demás)."""
    objs = [o for o in objs if o is not None]
    for o in objs:
        asegurar_uv(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = objs[0]
    viejo = bpy.data.objects.get(nombre)
    if viejo is not None and viejo is not o:
        viejo.name = nombre + '_viejo'
    o.name = o.data.name = nombre
    return o


def separar(scene, o, grupos):
    """Parte `o` por materiales: `grupos` = {pieza: claves de material}; devuelve {pieza: objeto}."""
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='MATERIAL')
    bpy.ops.object.mode_set(mode='OBJECT')
    trozos = list(bpy.context.selected_objects)
    por_pieza = {}
    for t in trozos:
        if not t.data.polygons:
            bpy.data.objects.remove(t)
            continue
        m = t.data.materials[t.data.polygons[0].material_index]
        pieza = next((k for k, claves in grupos.items() if any(m.name.endswith('_' + c) for c in claves)), None)
        if pieza is None:
            raise RuntimeError(f'material sin pieza: {m.name}')
        por_pieza.setdefault(pieza, []).append(t)
    return {k: unir(scene, v, k) for k, v in por_pieza.items()}


# ------------------------------------------------------------------ horneado neutro
def neutralizar(img, modo, media=0.88, contraste=1.0):
    """Deja la textura lista para teñir: `gris` (luminancia) o `piel` (tono relativo)."""
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    rgb = px[:, :3]
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    vivo = lum > 0.02
    if not vivo.any():
        return
    if modo == 'piel':
        base = rgb[vivo].mean(axis=0)
        rel = rgb / base
        rgb = (1 + (rel - 1) * contraste) * media
    else:
        rel = lum / lum[vivo].mean()
        g = (1 + (rel - 1) * contraste) * media
        rgb = np.repeat(g[:, None], 3, axis=1)
    px[:, :3] = np.clip(rgb, 0, 1)
    img.pixels.foreach_set(px.ravel())
    img.save()


def hornear(scene, nombre, o, size, modo=None, ao=0.45, media=0.88, contraste=1.0, tenir=True):
    """Hornea la pieza (fg_heroe) y, si se tiñe, deja su textura neutra y su material en la ranura."""
    limpiar_materiales(o)
    H.Heroe.hornear(_Horno(scene, nombre), o, size, ao=ao)
    img = bpy.data.images[f'{nombre}_{o.name.lower()}']
    r = ranura(o.name) if tenir else None
    if r and modo:
        neutralizar(img, modo, media=media, contraste=contraste)
    if r:
        o.data.materials[0].name = r
    return img


def variantes(scene, o, n):
    """`o` lleva `n` copias de la cara apartadas SEPARACION en X: las separa en Cara_0..n-1."""
    piezas = []
    for k in range(n):
        me = o.data.copy()
        bm = bmesh.new()
        bm.from_mesh(me)
        lo, hi = (k - 0.5) * SEPARACION, (k + 0.5) * SEPARACION
        fuera = [f for f in bm.faces if not lo <= f.calc_center_median().x < hi]
        bmesh.ops.delete(bm, geom=fuera, context='FACES')
        for v in bm.verts:
            v.co.x -= k * SEPARACION
        bm.to_mesh(me)
        bm.free()
        c = bpy.data.objects.new(f'Cara_{k}', me)
        me.name = f'Cara_{k}'
        scene.collection.objects.link(c)
        for vg in o.vertex_groups:
            c.vertex_groups.new(name=vg.name)
        piezas.append(c)
    bpy.data.objects.remove(o)
    return piezas


def apartar(o, k):
    o.data.transform(Matrix.Translation((k * SEPARACION, 0, 0)))


# ------------------------------------------------------------------ brazos por pesos
def bajar_brazos(objs, hombros, grados):
    """Gira lo que pesa en cada brazo alrededor de su hombro hasta `grados` de la vertical.

    `hombros` = {'L': (hombro, codo)…}; devuelve los giros para mover también las articulaciones.
    """
    import math
    giros = {}
    for s, (h, codo) in hombros.items():
        k = 1 if s == 'L' else -1
        cur = (codo - h).normalized()
        tgt = Vector((math.sin(math.radians(grados)) * k, cur.y, -math.cos(math.radians(grados)))).normalized()
        giros[s] = (h, cur.rotation_difference(tgt))
    for o in objs:
        idx = {vg.name: vg.index for vg in o.vertex_groups}
        for s, (h, q) in giros.items():
            ids = {idx[n] for n in (f'upperArm{s}', f'foreArm{s}', f'hand{s}') if n in idx}
            if not ids:
                continue
            for v in o.data.vertices:
                w = sum(g.weight for g in v.groups if g.group in ids)
                if w <= 0:
                    continue
                girado = q @ (v.co - h) + h
                v.co = v.co.lerp(girado, min(w, 1.0))
    return giros


def girar_punto(p, giro):
    h, q = giro
    return q @ (p - h) + h


# ------------------------------------------------------------------ pelo de la otra base
def caja(puntos):
    xs, ys, zs = zip(*((p.x, p.y, p.z) for p in puntos))
    lo = Vector((min(xs), min(ys), min(zs)))
    hi = Vector((max(xs), max(ys), max(zs)))
    return lo, hi


def cabeza(puntos, cuello):
    """Caja de la parte alta de la cabeza (sobre el 45 % superior entre cuello y coronilla)."""
    top = max(p.z for p in puntos)
    return caja([p for p in puntos if p.z >= top - 0.55 * (top - cuello)])


def encajar(o, origen, destino):
    """Lleva la malla `o` de la caja de cabeza `origen` a la `destino`: ancho y fondo por eje,
    alto con la media de ambos, coronilla con coronilla."""
    (a0, a1), (b0, b1) = origen, destino
    sx, sy = ((b1[i] - b0[i]) / (a1[i] - a0[i]) for i in range(2))
    sz = (sx + sy) / 2
    ca = Vector(((a0.x + a1.x) / 2, (a0.y + a1.y) / 2, a1.z))
    cb = Vector(((b0.x + b1.x) / 2, (b0.y + b1.y) / 2, b1.z))
    M = Matrix.Translation(cb) @ Matrix.Diagonal((sx, sy, sz, 1)) @ Matrix.Translation(-ca)
    o.data.transform(M)


def solo_cabeza(o):
    """Todo el peso en la cabeza (pelo y cara)."""
    for vg in list(o.vertex_groups):
        o.vertex_groups.remove(vg)
    o.vertex_groups.new(name='head').add([v.index for v in o.data.vertices], 1.0, 'REPLACE')


def limpiar_materiales(o):
    """Quita las ranuras vacías (las deja la unión de mallas) y reasigna sus caras."""
    me = o.data
    viejos = list(me.materials)
    usados = {p.material_index for p in me.polygons}
    validos = [m for m in dict.fromkeys(m for i, m in enumerate(viejos) if i in usados) if m is not None]
    if len(validos) == len(viejos):
        return
    nuevo = {i: validos.index(m) if m in validos else 0 for i, m in enumerate(viejos)}
    idx = [nuevo.get(p.material_index, 0) for p in me.polygons]
    me.materials.clear()
    for m in validos:
        me.materials.append(m)
    for p, i in zip(me.polygons, idx):
        p.material_index = i


def material_unico(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)
    for poly in o.data.polygons:
        poly.material_index = 0


def diezmar(o, ratio):
    if ratio >= 1:
        return
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    mod = o.modifiers.new('Diezmar', 'DECIMATE')
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)


def triangulos(objs):
    return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)

