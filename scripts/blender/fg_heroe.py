# Constructor de héroes jugables (P01/P02): cuerpo continuo y suave, cara pintada,
# ropa por zonas con las texturas pintadas de fg_pintura y horneado final a una
# textura por pieza (color con sombras pintadas de oclusión).
#
# Contrato: esqueleto `fg_rig.biped_bones`, mismos clips que centinela.glb, mira a -Y
# (+Z en el juego), pies en z=0. Piezas: `Cuerpo`, `Pelo` y las del arma
# (`Lanza`/`Escudo`, `Arma_baston`, `Arma_arco`), los nombres que lee heldGear.ts.
#
# Uso desde un generador de clase:
#   h = Heroe('oraculo_f', sexo='f', piel='piel_trigo', pelo='pelo_negro')
#   h.ropa({...}); h.pieza(...); h.exportar()
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

try:
    _HERE = os.path.dirname(bpy.path.abspath(__file__))
except NameError:
    _HERE = r'C:\Users\frank\Desktop\2026\FrankmanGames-Prototipo\scripts\blender'
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import fg
import fg_figura as ff
import fg_pintura
import fg_rig
from fg_rig import p

PINTADAS = fg_pintura.OUT
HORNEADAS = os.path.normpath(os.path.join(_HERE, '..', '..', 'assets', 'textures', 'personajes', 'heroes'))
ARTE = os.path.normpath(os.path.join(_HERE, '..', '..', 'arte', 'blender'))


# ---------------------------------------------------------------- materiales
def textura(nombre):
    path = os.path.join(PINTADAS, f'{nombre}.png')
    if not os.path.exists(path):
        fg_pintura.hornear(nombre, fg_pintura.RECETAS[nombre])
    img = bpy.data.images.load(path, check_existing=True)
    return img


def mat(nombre, tex, rough=0.85, metal=0.0, doble=False, uv='UVMap'):
    """Material con una textura pintada; la UV se nombra para hornear desde otra."""
    key = f'H_{nombre}'
    m = bpy.data.materials.get(key)
    if m:
        bpy.data.materials.remove(m)
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    m.use_backface_culling = not doble
    t = m.node_tree
    bsdf = next(n for n in t.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    node = t.nodes.new('ShaderNodeTexImage')
    node.image = tex if isinstance(tex, bpy.types.Image) else textura(tex)
    uvn = t.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = uv
    t.links.new(uvn.outputs[0], node.inputs['Vector'])
    t.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def liso(nombre, hexcol, rough=0.6, metal=0.0, doble=False):
    key = f'H_{nombre}'
    m = bpy.data.materials.get(key) or bpy.data.materials.new(key)
    m.use_nodes = True
    m.use_backface_culling = not doble
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*fg_pintura.hexc(hexcol), 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    return m


# ---------------------------------------------------------------- cara pintada
def _hs(h):
    """Color hexadecimal tal cual (sRGB): los píxeles de una imagen de 8 bits se guardan así."""
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def _ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def pintar_cara(nombre, piel, iris='#5a3418', sexo='m', pintura=None, size=512):
    """Cara de estilo anime pintada con numpy: ojos grandes con brillo, pestañas,
    cejas, nariz y boca. Se proyecta de frente sobre la cabeza (u = x, v = z)."""
    base = _hs(piel)
    sombra = base * 0.78
    U, V = np.meshgrid((np.arange(size) + 0.5) / size, (np.arange(size) + 0.5) / size)
    img = np.ones((size, size, 3)) * base
    # Sombra suave bajo el flequillo y a los lados.
    img = img * (1 - 0.12 * _ss(0.72, 0.95, V)[..., None]) * (1 - 0.1 * _ss(0.32, 0.5, np.abs(U - 0.5))[..., None])
    # Rubor.
    rub = _hs('#e07a6a')
    for cx in (0.31, 0.69):
        d = ((U - cx) / 0.08) ** 2 + ((V - 0.37) / 0.035) ** 2
        k = 0.35 * (1 - _ss(0.3, 1.0, d))
        img = img * (1 - k[..., None]) + rub * k[..., None]

    def pon(mask, col, a=1.0):
        nonlocal img
        c = _hs(col) if isinstance(col, str) else np.array(col)
        m = np.clip(mask * a, 0, 1)[..., None]
        img = img * (1 - m) + c * m

    oscuro = '#2a1712'
    ancho = 0.075 if sexo == 'f' else 0.07
    alto = 0.075 if sexo == 'f' else 0.062
    for s in (-1, 1):
        cx, cy = 0.5 + 0.17 * s, 0.47
        # Blanco del ojo: óvalo con la parte de arriba algo plana.
        d = ((U - cx) / ancho) ** 2 + ((V - cy) / alto) ** 2
        ojo = 1 - _ss(0.85, 1.0, d)
        pon(ojo, '#f7f3ec')
        # Iris grande, oscuro arriba y claro abajo, pupila y dos brillos.
        di = ((U - cx - 0.006 * s) / (ancho * 0.66)) ** 2 + ((V - cy + 0.004) / (alto * 0.92)) ** 2
        ir = (1 - _ss(0.8, 1.0, di)) * ojo
        c_ir = _hs(iris)
        grad = _ss(cy + alto, cy - alto, V)[..., None]
        iris_col = c_ir * (0.45 + 0.75 * grad)
        m = ir[..., None]
        img = img * (1 - m) + iris_col * m
        dp = ((U - cx - 0.006 * s) / (ancho * 0.28)) ** 2 + ((V - cy + 0.01) / (alto * 0.42)) ** 2
        pon((1 - _ss(0.7, 1.0, dp)) * ojo, '#120a08')
        for bx, by, r in ((-0.022, 0.026, 0.018), (0.02, -0.022, 0.009)):
            db = ((U - cx - bx * s) ** 2 + (V - cy - by) ** 2) / r ** 2
            pon((1 - _ss(0.5, 1.0, db)) * ojo, '#ffffff')
        # Párpado superior: arco grueso con la cola hacia fuera.
        t = (U - cx) / ancho
        arco = cy + alto * 0.95 * np.sqrt(np.clip(1 - t ** 2, 0, 1)) - 0.004
        grosor = (0.016 if sexo == 'f' else 0.011) * (1 - 0.4 * np.abs(t))
        lin = (1 - _ss(grosor * 0.6, grosor, np.abs(V - arco))) * (np.abs(t) < 1.0)
        pon(lin, oscuro)
        # Párpado inferior, fino.
        abajo = cy - alto * 0.9 * np.sqrt(np.clip(1 - (t * 1.1) ** 2, 0, 1))
        pon((1 - _ss(0.002, 0.005, np.abs(V - abajo))) * np.clip(1 - np.abs(t) / 0.7, 0, 1) * (t * s > -0.3), '#8a4a3a', 0.6)
        # Ceja.
        tb = (U - cx - 0.008 * s) / 0.075
        ceja = cy + 0.11 + 0.025 * (1 - tb ** 2) - 0.012 * tb * s
        g = (0.007 if sexo == 'f' else 0.013) * (1 - 0.5 * np.clip(tb * s, 0, 1))
        pon((1 - _ss(g * 0.5, g, np.abs(V - ceja))) * (np.abs(tb) < 1), oscuro, 0.9)
    # Nariz: sombra pequeña.
    dn = ((U - 0.515) / 0.016) ** 2 + ((V - 0.355) / 0.008) ** 2
    pon(1 - _ss(0.3, 1.0, dn), sombra, 0.7)
    # Boca: sonrisa corta, con labio inferior más claro.
    tm = (U - 0.5) / (0.055 if sexo == 'f' else 0.06)
    boca = 0.27 + 0.012 * tm ** 2
    pon((1 - _ss(0.003, 0.0065, np.abs(V - boca))) * (np.abs(tm) < 1), '#6b2c22')
    if sexo == 'f':
        lab = ((U - 0.5) / 0.03) ** 2 + ((V - 0.255) / 0.008) ** 2
        pon(1 - _ss(0.4, 1.0, lab), '#d88470', 0.6)
    if pintura:  # pintura de guerra en la mejilla: dos trazos
        col, lado = pintura
        for k in range(2):
            y0 = 0.4 - 0.03 * k
            d = np.abs((V - y0) - (U - (0.5 + 0.26 * lado)) * 0.45 * lado)
            pon((1 - _ss(0.006, 0.01, d)) * (np.abs(U - (0.5 + 0.27 * lado)) < 0.06), col, 0.9)
    rgba = np.concatenate([img, np.ones((size, size, 1))], axis=2).astype(np.float32)
    old = bpy.data.images.get(f'cara_{nombre}')
    if old:
        bpy.data.images.remove(old)
    im = bpy.data.images.new(f'cara_{nombre}', size, size, alpha=False)
    im.pixels.foreach_set(rgba.ravel())
    os.makedirs(HORNEADAS, exist_ok=True)
    im.filepath_raw = os.path.join(HORNEADAS, f'cara_{nombre}.png')
    im.file_format = 'PNG'
    im.save()
    return im


# ---------------------------------------------------------------- utilidades
def _evaluated_copy(obj, name):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    me.name = name
    return me


def _seg_dist(q, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (q - a).dot(ab) / max(ab.length_squared, 1e-9)))
    return (a + ab * t - q).length, t


def _uv_caja(me, uvname, metros):
    uv = me.uv_layers.get(uvname) or me.uv_layers.new(name=uvname)
    for poly in me.polygons:
        n = poly.normal
        axis = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co
            if axis == 2:
                uv.data[li].uv = (c.x / metros, c.y / metros)
            elif axis == 0:
                uv.data[li].uv = (c.y / metros, c.z / metros)
            else:
                uv.data[li].uv = (c.x / metros, c.z / metros)


def uv_nombre(o):
    """bmesh llama `Float2` a la UV nueva; los materiales la buscan como `UVMap`."""
    if o.data.uv_layers:
        o.data.uv_layers[0].name = 'UVMap'
    return o


class Heroe:
    """Un personaje jugable. `sexo`: 'm' o 'f'; cambia hombros, cintura, cadera y cara."""

    def __init__(self, nombre, sexo='m', piel='piel_canela', piel_hex='#c98d66', pelo='pelo_negro', iris='#5a3418', pintura=None):
        self.nombre = nombre
        self.sexo = sexo
        self.scene = fg.fresh_scene(f'FG_{nombre}')
        for coll in (bpy.data.meshes, bpy.data.actions):
            for d in [d for d in coll if d.users == 0]:
                coll.remove(d)
        self.bones = fg_rig.biped_bones()
        self.rig = fg_rig.Rig(self.scene, f'FG_{nombre}', self.bones)
        self.segs = {b[0]: (Vector(b[2]), Vector(b[3])) for b in self.bones}
        self.piel = mat(f'{nombre}_piel', piel, rough=0.65)
        self.piel_hex = piel_hex
        self.pelo_tex = pelo
        self.cara = mat(f'{nombre}_cara', pintar_cara(nombre, piel_hex, iris, sexo, pintura), rough=0.6)
        self.extras = []  # Figuras que se unen al Cuerpo
        self.piezas = {}  # nombre -> objeto (Pelo, armas)
        self.head_c = Vector((0, -0.005, 1.515))
        self.head_r = Vector((0.118, 0.122, 0.135))

    # -- cuerpo ------------------------------------------------------------
    def _esqueleto_piel(self):
        f = self.sexo == 'f'
        P = {
            'pelvis': ((0, 0.0, 0.9), (0.155 if f else 0.15, 0.11)),
            'cintura': ((0, 0.0, 1.03), (0.118 if f else 0.138, 0.095)),
            'pecho': ((0, -0.005, 1.17), (0.14 if f else 0.172, 0.108 if f else 0.115)),
            'hombros': ((0, 0.0, 1.27), (0.13 if f else 0.15, 0.085)),
            'cuello': ((0, 0.0, 1.36), (0.045 if f else 0.052, 0.045 if f else 0.05)),
            'nuca': ((0, 0.0, 1.43), (0.04, 0.04)),
        }
        ed = [('pelvis', 'cintura'), ('cintura', 'pecho'), ('pecho', 'hombros'), ('hombros', 'cuello'), ('cuello', 'nuca')]
        for s, x in (('L', 1), ('R', -1)):
            sh = 0.175 if f else 0.195
            P.update({
                f'hombro{s}': ((sh * x, 0, 1.265), (0.054, 0.054) if f else (0.064, 0.064)),
                f'codo{s}': ((0.245 * x, 0, 1.03), (0.04, 0.04) if f else (0.047, 0.047)),
                f'muneca{s}': ((0.268 * x, -0.03, 0.83), (0.03, 0.027) if f else (0.034, 0.031)),
                f'palma{s}': ((0.272 * x, -0.04, 0.775), (0.04, 0.022) if f else (0.045, 0.025)),
                f'dedos{s}': ((0.272 * x, -0.048, 0.722), (0.036, 0.02) if f else (0.04, 0.022)),
                f'pulgar{s}': ((0.25 * x, -0.072, 0.785), (0.015, 0.015)),
                f'cadera{s}': ((0.095 * x, 0, 0.86), (0.098, 0.098) if f else (0.096, 0.096)),
                f'rodilla{s}': ((0.1 * x, 0, 0.46), (0.063, 0.063) if f else (0.068, 0.068)),
                f'tobillo{s}': ((0.1 * x, 0.0, 0.1), (0.046, 0.046) if f else (0.05, 0.05)),
                f'talon{s}': ((0.1 * x, 0.03, 0.045), (0.048, 0.045)),
                f'punta{s}': ((0.1 * x, -0.14, 0.038), (0.048, 0.034) if f else (0.054, 0.036)),
            })
            ed += [('hombros', f'hombro{s}'), (f'hombro{s}', f'codo{s}'), (f'codo{s}', f'muneca{s}'), (f'muneca{s}', f'palma{s}'),
                   (f'palma{s}', f'dedos{s}'), (f'muneca{s}', f'pulgar{s}'), ('pelvis', f'cadera{s}'), (f'cadera{s}', f'rodilla{s}'),
                   (f'rodilla{s}', f'tobillo{s}'), (f'tobillo{s}', f'talon{s}'), (f'tobillo{s}', f'punta{s}')]
        return P, ed

    def cuerpo(self, zonas, grosor=None, cortes=()):
        """Malla continua con Skin + Subdivisión. `zonas(hueso, punto) -> clave` elige el
        material de cada cara (claves de `self.mats`); `grosor[clave]` hincha la ropa."""
        P, ed = self._esqueleto_piel()
        names = list(P)
        me = bpy.data.meshes.new(f'{self.nombre}_esq')
        me.from_pydata([P[n][0] for n in names], [(names.index(a), names.index(b)) for a, b in ed], [])
        obj = bpy.data.objects.new(f'{self.nombre}_esq', me)
        self.scene.collection.objects.link(obj)
        skin = obj.modifiers.new('Skin', 'SKIN')
        skin.use_smooth_shade = True
        sv = me.skin_vertices[0].data
        for i, n in enumerate(names):
            sv[i].radius = P[n][1]
        sv[0].use_root = True
        sub = obj.modifiers.new('Sub', 'SUBSURF')
        sub.levels = sub.render_levels = 2
        body = _evaluated_copy(obj, 'Cuerpo')
        bpy.data.objects.remove(obj)
        bpy.data.meshes.remove(me)
        # Material por cara según el hueso más cercano y la altura.
        keys = []
        bm = bmesh.new()
        bm.from_mesh(body)
        # Cortes limpios donde acaba cada prenda: (punto, normal) o una altura z.
        for c in cortes:
            co, no = ((0, 0, c), (0, 0, 1)) if isinstance(c, (int, float)) else c
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no)
        bm.normal_update()
        disp = {}
        for face in bm.faces:
            c = face.calc_center_median()
            bone = min(self.segs, key=lambda b: _seg_dist(c, *self.segs[b])[0] - (0.02 if b.startswith('hand') else 0))
            k = zonas(bone, c)
            if k not in keys:
                keys.append(k)
            face.material_index = keys.index(k)
            g = (grosor or {}).get(k, 0.0)
            for v in face.verts:
                disp[v] = max(disp.get(v, 0.0), g)
        for v, g in disp.items():
            v.co += v.normal * g
        bm.to_mesh(body)
        bm.free()
        for k in keys:
            body.materials.append(self.mats[k])
        _uv_caja(body, 'UVMap', 0.35)
        for poly in body.polygons:
            poly.use_smooth = True
        o = bpy.data.objects.new('Cuerpo', body)
        self.scene.collection.objects.link(o)
        self.cuerpo_obj = o
        return o

    def cabeza(self):
        """Cabeza de elipsoide con mandíbula estrecha; la cara se proyecta de frente."""
        f = ff.Figura('Cabeza', self.bones)
        C, R = self.head_c, self.head_r

        def jaw(q):
            q = Vector(q)
            dz = C.z - q.z
            if dz > 0:
                s = min(1.0, dz / R.z)
                q.x *= 1 - 0.42 * s * s
                if q.y < C.y:
                    q.y = C.y + (q.y - C.y) * (1 - 0.1 * s) - 0.008 * s * s
            return q
        f.ellipsoid(C, tuple(R), self.cara, 'head', sides=28, rings=20, deform=jaw)
        for x in (-1, 1):
            f.ellipsoid((0.112 * x, C.y + 0.01, C.z - 0.005), (0.014, 0.022, 0.03), self.piel, 'head', sides=8, rings=5)
        # Nariz apenas marcada.
        f.ellipsoid((0, C.y - R.y * 0.97, C.z - 0.045), (0.011, 0.012, 0.016), self.cara, 'head', sides=8, rings=5)
        o = uv_nombre(f.object(self.scene))
        me = o.data
        uv = me.uv_layers.active
        for poly in me.polygons:
            if poly.material_index != 0:
                continue
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                if poly.normal.y > 0.25:  # nuca: color de piel liso
                    uv.data[li].uv = (0.03, 0.97)
                else:
                    uv.data[li].uv = (0.5 + co.x / 0.26, 0.5 + (co.z - C.z) / 0.3)
        self.extras_obj = getattr(self, 'extras_obj', [])
        self.extras_obj.append(o)
        return o

    def figura(self, nombre='Extra'):
        f = ff.Figura(nombre, self.bones)
        self.extras.append(f)
        return f

    # -- pelo ---------------------------------------------------------------
    def pelo(self, estilo, rnd, color_mat=None):
        """`estilo`: 'corto' (mechones de punta), 'largo' (melena), 'trenza', 'coleta'."""
        import random
        rnd = rnd if isinstance(rnd, random.Random) else random.Random(rnd)
        M = color_mat or mat(f'{self.nombre}_pelo', self.pelo_tex, rough=0.55)
        h = ff.Figura('Pelo', self.bones)
        C, R = self.head_c, self.head_r

        def gorro(q):
            q = Vector(q)
            rel = q - C
            if rel.y < -0.04 and rel.z < 0.05:
                q = C + rel * 0.85
            return q
        h.ellipsoid(C + Vector((0, 0.008, 0.014)), (R.x + 0.008, R.y + 0.01, R.z + 0.006), M, 'head', sides=22, rings=12,
                    deform=gorro, keep=lambda j, i: j >= 4, poles=(False, True), urep=2, vrep=1)
        crown = Vector((0, 0.35, 0.94)).normalized()
        n_mech = 70 if estilo == 'corto' else 60
        largo_base = {'corto': (0.06, 0.1), 'largo': (0.09, 0.14), 'trenza': (0.07, 0.11), 'coleta': (0.06, 0.1)}[estilo]
        for k in range(n_mech):
            fleq = k < 16
            if fleq:
                az = -math.pi / 2 + (k - 7.5) * 0.15 + rnd.uniform(-0.04, 0.04)
                el = math.radians(rnd.uniform(38, 50))
                length = rnd.uniform(0.06, 0.08) * (1.15 if self.sexo == 'f' else 1)
            else:
                az = rnd.uniform(-math.pi, math.pi)
                el = math.radians(rnd.uniform(-5, 85))
                if math.sin(az) < -0.55 and el < math.radians(48):
                    continue
                length = rnd.uniform(*largo_base)
            n = Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el)))
            root = C + Vector((n.x * R.x, n.y * R.y, n.z * R.z)) + Vector((0, 0.008, 0.012))
            if fleq:
                flow = Vector((0.7 * n.x, -0.45, -0.85))
            else:
                flow = n * n.dot(crown) - crown + Vector((0, 0, -0.6 if estilo == 'corto' else -1.2))
            t = (flow - n * flow.dot(n)).normalized()
            t = Matrix.Rotation(math.radians(rnd.uniform(-22, 22)), 3, n) @ t
            lift = rnd.uniform(0.04, 0.2) if estilo == 'corto' else rnd.uniform(0.0, 0.08)
            d = (t + n * lift).normalized()
            r0 = rnd.uniform(0.032, 0.042)
            secs = []
            for i in range(6):
                s_ = i / 5
                pt = root - n * 0.01 + d * (length * s_) + (n * 0.1 + Vector((0, 0, -0.5))) * (length * s_ * s_)
                if estilo == 'corto' and not fleq:
                    pt += n * 0.035 * s_ * s_
                secs.append((tuple(pt), r0 * (1 - s_) ** 0.8 + 0.0015, r0 * 0.42 * (1 - s_) ** 0.8 + 0.001))
            h.loft(secs, M, 'head', sides=6, xdir=tuple(n.cross(d).normalized()), cap0=True, urep=0.5, vlen=0.15)
        if estilo in ('largo', 'trenza', 'coleta'):
            self._melena(h, M, estilo, rnd)
        return h, M

    def _melena(self, h, M, estilo, rnd):
        C = self.head_c
        if estilo == 'largo':
            # Cortina de mechones anchos que caen por la espalda hasta los omóplatos.
            for k in range(14):
                a = math.radians(-100 + k * 200 / 13)
                x0, y0 = 0.11 * math.sin(a), 0.11 * math.cos(a) * 0.9 + 0.02
                bones = {'head': 1.0, 'chest': 0.0}
                secs = []
                for i in range(7):
                    s_ = i / 6
                    z = C.z + 0.04 - s_ * 0.42
                    out = 0.02 + 0.06 * math.sin(min(1, s_ * 1.6) * math.pi / 2)
                    secs.append(((x0 * (1 + out * 4), y0 + out * math.cos(a) + 0.02 * s_, z), 0.034 * (1 - 0.6 * s_) + 0.004, 0.012))
                h.loft(secs, M, {'head': 1.0, 'chest': 0.6}, sides=6, xdir=(math.cos(a), -math.sin(a), 0), cap1=True, urep=0.5, vlen=0.15)
        else:
            # Trenza o coleta que sale de la nuca y cae por la espalda.
            start = C + Vector((0, 0.12, -0.02 if estilo == 'trenza' else 0.05))
            pts = [start + Vector((0.0, 0.03 * i, -0.075 * i)) if i < 2 else start + Vector((0.0, 0.07 + 0.022 * i, -0.075 * i)) for i in range(7)]
            for i, q in enumerate(pts):
                r = 0.034 * (1 - i / 9)
                bones = {'head': 1.0} if i < 2 else {'head': 0.5, 'chest': 1.0}
                h.ellipsoid(tuple(q), (r, r * 0.85, r * 1.25), M, bones, sides=10, rings=6, urep=1, vrep=1)
            h.loft([(tuple(pts[-1] + Vector((0, 0.005, -0.02))), 0.02, 0.016), (tuple(pts[-1] + Vector((0, 0.01, -0.09))), 0.004, 0.003)], M, {'chest': 1.0}, sides=6, cap1=True)
            self.punta_trenza = pts[-1]

    # -- armas ---------------------------------------------------------------
    def agarre(self, bone='handR', t=0.55, pose=None):
        """Punto de agarre en la pose de reposo del juego (brazos caídos) y la matriz que
        lleva lo modelado ahí al reposo del esqueleto: así el arma queda vertical en reposo."""
        D = ff.pose_deltas(self.rig, pose or p())
        a, b = self.segs[bone]
        pa, pb = D[bone] @ a, D[bone] @ b
        return pa + (pb - pa) * t, D[bone].inverted(), D

    # -- clips ----------------------------------------------------------------
    def clips(self, atacar, lanzar, extra=None):
        fg_rig.biped_clips(self.rig)
        fg_rig.biped_emote_clips(self.rig)
        self.rig.clip('Atacar', atacar)
        self.rig.clip('Lanzar', lanzar)
        for name, keys in (extra or {}).items():
            self.rig.clip(name, keys)

    # -- montaje y horneado -------------------------------------------------
    def _parent(self, o, auto=False):
        o.parent = self.rig.obj
        if auto:
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            self.rig.obj.select_set(True)
            bpy.context.view_layer.objects.active = self.rig.obj
            bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        else:
            o.modifiers.new('Huesos', 'ARMATURE').object = self.rig.obj

    def _transfer_weights(self, target, source):
        """Pesos de la ropa y los adornos copiados del cuerpo (cara más cercana)."""
        for vg in source.vertex_groups:
            if vg.name not in target.vertex_groups:
                target.vertex_groups.new(name=vg.name)
        mod = target.modifiers.new('Pesos', 'DATA_TRANSFER')
        mod.object = source
        mod.use_vert_data = True
        mod.data_types_verts = {'VGROUP_WEIGHTS'}
        mod.vert_mapping = 'POLYINTERP_NEAREST'
        bpy.context.view_layer.objects.active = target
        bpy.ops.object.datalayout_transfer(modifier=mod.name)
        bpy.ops.object.modifier_apply(modifier=mod.name)

    def montar(self):
        """Une cabeza y extras al Cuerpo, reparte pesos y deja las piezas colgadas del esqueleto."""
        body = self.cuerpo_obj
        self._parent(body, auto=True)
        mods = [m for m in body.modifiers if m.type == 'ARMATURE']
        joins = list(getattr(self, 'extras_obj', []))
        for f in self.extras:
            joins.append(uv_nombre(f.object(self.scene)))
        for o in joins:
            o.parent = None
        # Los extras traen sus propios pesos por hueso; la cabeza va entera a `head`.
        bpy.ops.object.select_all(action='DESELECT')
        for o in joins:
            o.select_set(True)
        body.select_set(True)
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.join()
        body.parent = self.rig.obj
        if not mods:
            body.modifiers.new('Huesos', 'ARMATURE').object = self.rig.obj
        self._normalizar(body)
        return body

    def _normalizar(self, o):
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
        bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
        bpy.ops.object.mode_set(mode='OBJECT')

    def pieza(self, figura, nombre=None):
        o = uv_nombre(figura.object(self.scene, parent=self.rig.obj))
        if nombre:
            o.name = nombre
            o.data.name = nombre
        o.modifiers.new('Huesos', 'ARMATURE').object = self.rig.obj
        self.piezas[o.name] = o
        return o

    def hornear(self, o, size=1024, ao=0.45, rough=0.75):
        """Hornea todos los materiales de `o` a una textura con UV propia y oclusión
        pintada; deja un único material. Así cada pieza es una primitiva."""
        sc = self.scene
        try:
            sc.render.engine = 'CYCLES'
        except TypeError as e:
            raise RuntimeError(f'Cycles no disponible: {e}')
        sc.cycles.device = 'CPU'
        me = o.data
        if 'Hornear' not in me.uv_layers:
            me.uv_layers.new(name='Hornear')
        me.uv_layers.active = me.uv_layers['Hornear']
        for layer in me.uv_layers:
            layer.active_render = layer.name == 'UVMap'
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004, area_weight=0.0)
        bpy.ops.uv.pack_islands(margin=0.004, rotate=True)
        bpy.ops.object.mode_set(mode='OBJECT')
        # Imágenes destino, una por pasada, activas en cada material.
        results = {}
        for kind, samples in (('DIFFUSE', 1), ('AO', 24)):
            img = bpy.data.images.get(f'{self.nombre}_{o.name}_{kind}')
            if img:
                bpy.data.images.remove(img)
            img = bpy.data.images.new(f'{self.nombre}_{o.name}_{kind}', size, size, alpha=False)
            for m in me.materials:
                t = m.node_tree
                node = next((n for n in t.nodes if n.name == 'HornearDestino'), None) or t.nodes.new('ShaderNodeTexImage')
                node.name = 'HornearDestino'
                node.image = img
                uvn = next((n for n in t.nodes if n.name == 'HornearUV'), None) or t.nodes.new('ShaderNodeUVMap')
                uvn.name = 'HornearUV'
                uvn.uv_map = 'Hornear'
                if not node.inputs['Vector'].links:
                    t.links.new(uvn.outputs[0], node.inputs['Vector'])
                t.nodes.active = node
            sc.cycles.samples = samples
            if kind == 'DIFFUSE':
                sc.render.bake.use_pass_direct = False
                sc.render.bake.use_pass_indirect = False
                sc.render.bake.use_pass_color = True
            bpy.ops.object.bake(type=kind, margin=6, use_clear=True)
            results[kind] = np.array(img.pixels[:], dtype=np.float32).reshape(size, size, 4)
        col = results['DIFFUSE'][..., :3]
        occ = results['AO'][..., :1]
        shade = 1 - ao * (1 - np.clip(occ, 0, 1)) ** 1.3
        final = np.concatenate([col * shade, np.ones((size, size, 1), np.float32)], axis=2)
        name = f'{self.nombre}_{o.name.lower()}'
        img = bpy.data.images.get(name)
        if img:
            bpy.data.images.remove(img)
        img = bpy.data.images.new(name, size, size, alpha=False)
        img.pixels.foreach_set(final.ravel())
        os.makedirs(HORNEADAS, exist_ok=True)
        # JPEG: el GLB las lleva en JPEG igualmente y en disco pesan un décimo.
        img.filepath_raw = os.path.join(HORNEADAS, f'{name}.jpg')
        img.file_format = 'JPEG'
        bpy.context.scene.render.image_settings.quality = 90
        img.save()
        metal = max((next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Metallic'].default_value for m in me.materials), default=0.0)
        doble = any(not m.use_backface_culling for m in me.materials)
        final_mat = bpy.data.materials.get(f'heroe_{name}') or bpy.data.materials.new(f'heroe_{name}')
        final_mat.use_nodes = True
        final_mat.use_backface_culling = not doble
        t = final_mat.node_tree
        for n in [n for n in t.nodes if n.type == 'TEX_IMAGE']:
            t.nodes.remove(n)
        bsdf = next(n for n in t.nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Metallic'].default_value = min(metal, 0.25)
        tex = t.nodes.new('ShaderNodeTexImage')
        tex.image = img
        t.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        me.materials.clear()
        me.materials.append(final_mat)
        for poly in me.polygons:
            poly.material_index = 0
        me.uv_layers.remove(me.uv_layers['UVMap'])
        me.uv_layers['Hornear'].active_render = True
        print(f'horneado {name}: {size} px')

    def exportar(self, filename, tamanos=None, guardar_blend=False):
        tamanos = tamanos or {}
        objs = [self.cuerpo_obj, *self.piezas.values()]
        # Nombres exactos en el GLB: libera los que ocupe otra escena (Cuerpo.001 → Cuerpo).
        for o in objs:
            base = o.name.split('.')[0]
            otro = bpy.data.objects.get(base)
            if otro is not None and otro is not o:
                otro.name = f'{base}_viejo'
            o.name = base
            o.data.name = base
        for o in objs:
            self.hornear(o, tamanos.get(o.name, 1024 if o.name != 'Cuerpo' else 2048))
        self.rig.parts = objs
        self.rig.export(filename, imagenes='JPEG')
        if not guardar_blend:  # el generador es la fuente; el .blend sólo para retocar a mano
            return
        os.makedirs(ARTE, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ARTE, filename.replace('.glb', '.blend')), copy=True)
