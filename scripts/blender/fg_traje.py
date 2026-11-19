# Utilidades para vestir a los héroes anime con piezas propias al estilo de La Espeja
# (diablica_espejo.py): geometría por código, color plano por cara (celdas de una paleta 8×8)
# y pesos copiados de la piel más cercana para que la ropa siga a los clips del héroe.
#
# Lo usan heroe_trajes.py (las tres clases) y equipo_espeja.py (el set de la Espeja).
import math

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector, kdtree

HUESOS = ('hips', 'spine', 'chest', 'head', 'upperArmL', 'foreArmL', 'handL', 'upperArmR', 'foreArmR',
          'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR')


def hex_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


class Paleta:
    """Hasta 64 colores con nombre: (hex sRGB, rugosidad, metal, brillo)."""

    def __init__(self, colores):
        self.c = dict(colores)
        self.nombres = list(self.c)
        assert len(self.nombres) <= 64, len(self.nombres)

    def uv(self, nombre):
        i = self.nombres.index(nombre)
        return ((i % 8 + 0.5) / 8, 1 - (i // 8 + 0.5) / 8)

    def imagenes(self, prefijo, px=64):
        col = np.ones((px, px, 4))
        mr = np.ones((px, px, 4))
        em = np.zeros((px, px, 4))
        em[..., 3] = 1
        c = px // 8
        for i, n in enumerate(self.nombres):
            hx, rough, metal, *glow = self.c[n]
            y0 = px - (i // 8 + 1) * c  # fila 0 arriba (v alto)
            x0 = (i % 8) * c
            col[y0:y0 + c, x0:x0 + c, :3] = hex_rgb(hx)
            mr[y0:y0 + c, x0:x0 + c, :3] = (0, rough, metal)
            if glow and glow[0]:
                em[y0:y0 + c, x0:x0 + c, :3] = np.array(hex_rgb(hx)) * glow[0]
        out = []
        for suf, data, space in (('', col, 'sRGB'), ('_mr', mr, 'Non-Color'), ('_em', em, 'sRGB')):
            im = bpy.data.images.new(f'{prefijo}{suf}', px, px, alpha=False)
            im.colorspace_settings.name = space
            im.pixels.foreach_set(data.astype(np.float32).ravel())
            im.pack()
            out.append(im)
        return out

    def material(self, nombre, imgs, brilla=False):
        col, mr, em = imgs
        m = bpy.data.materials.new(nombre)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        tc = nt.nodes.new('ShaderNodeTexImage')
        tc.image = col
        tc.interpolation = 'Closest'
        nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
        tm = nt.nodes.new('ShaderNodeTexImage')
        tm.image = mr
        tm.interpolation = 'Closest'
        sep = nt.nodes.new('ShaderNodeSeparateColor')
        nt.links.new(tm.outputs['Color'], sep.inputs['Color'])
        nt.links.new(sep.outputs[1], bsdf.inputs['Roughness'])
        nt.links.new(sep.outputs[2], bsdf.inputs['Metallic'])
        if brilla:
            te = nt.nodes.new('ShaderNodeTexImage')
            te.image = em
            te.interpolation = 'Closest'
            nt.links.new(te.outputs['Color'], bsdf.inputs['Emission Color'])
            bsdf.inputs['Emission Strength'].default_value = 1.0
        m.use_backface_culling = False
        return m


# ------------------------------------------------------------------ cuerpo medido
class Cuerpo:
    """Vértices de la piel y la ropa base en pose de reposo, con sus pesos normalizados."""

    def __init__(self, arm, objs):
        self.arm = arm
        self.p, self.w, self.dom = [], [], []
        for o in objs:
            names = {g.index: g.name for g in o.vertex_groups}
            mw = o.matrix_world
            for v in o.data.vertices:
                w = {names[g.group]: g.weight for g in v.groups if g.weight > 0.02 and names.get(g.group) in HUESOS}
                s = sum(w.values())
                if s <= 0:
                    continue
                w = {k: x / s for k, x in w.items()}
                self.p.append(mw @ v.co)
                self.w.append(w)
                self.dom.append(max(w, key=w.get))
        self.kd = kdtree.KDTree(len(self.p))
        for i, p in enumerate(self.p):
            self.kd.insert(p, i)
        self.kd.balance()
        self.np = np.array([tuple(p) for p in self.p])

    def hueso(self, name):
        b = self.arm.data.bones[name]
        return self.arm.matrix_world @ b.head_local, self.arm.matrix_world @ b.tail_local

    def peso(self, p, k=6, solo=None):
        """Pesos del vértice de piel más cercano (media de k, por inverso de la distancia)."""
        acc = {}
        for co, i, d in self.kd.find_n(Vector(p), k):
            f = 1.0 / (d + 0.01)
            for b, x in self.w[i].items():
                if solo and b not in solo:
                    continue
                acc[b] = acc.get(b, 0) + x * f
        if not acc:
            return {solo[0]: 1.0} if solo else {'hips': 1.0}
        s = sum(acc.values())
        top = sorted(acc.items(), key=lambda t: -t[1])[:3]
        s = sum(x for _, x in top)
        return {b: x / s for b, x in top if x / s > 0.03}

    def pesador(self, solo=None, k=6):
        return lambda p: self.peso(p, k, solo)

    def radios(self, centro, eje, huesos, dz=0.02, bins=24, rmin=0.03):
        """Radio máximo de la piel por sector alrededor de `eje` en el plano que pasa por `centro`."""
        c = np.array(tuple(centro))
        a = Vector(eje).normalized()
        u = a.orthogonal().normalized() if abs(a.z) < 0.9 else Vector((1, 0, 0))
        u = (u - a * u.dot(a)).normalized()
        v = a.cross(u)
        d = self.np - c
        h = d @ np.array(tuple(a))
        sel = np.abs(h) < dz
        if huesos:
            ok = np.array([x in huesos for x in self.dom])
            sel &= ok
        r = [0.0] * bins
        for q in d[sel]:
            x, y = float(q @ np.array(tuple(u))), float(q @ np.array(tuple(v)))
            k = int(((math.atan2(y, x) / (2 * math.pi)) % 1) * bins) % bins
            r[k] = max(r[k], math.hypot(x, y))
        m = max(r) if max(r) > 0 else rmin
        for _ in range(bins):
            r = [x if x > 0 else max(r[(k - 1) % bins], r[(k + 1) % bins]) for k, x in enumerate(r)]
        r = [max(x if x > 0 else m, rmin) for x in r]
        # suaviza un poco (la ropa no sigue cada pliegue)
        r = [max(r[k], 0.5 * r[k] + 0.25 * (r[k - 1] + r[(k + 1) % bins])) for k in range(bins)]
        return u, v, r


def _interp(r, ang):
    n = len(r)
    t = ((ang / (2 * math.pi)) % 1) * n
    i = int(t) % n
    f = t - int(t)
    return r[i] * (1 - f) + r[(i + 1) % n] * f


# ------------------------------------------------------------------ malla con color por cara
class Malla:
    def __init__(self, paleta):
        self.pal = paleta
        self.v, self.f, self.c, self.w, self.smooth = [], [], [], [], []

    def vert(self, p, w):
        self.v.append(Vector(p))
        self.w.append(w)
        return len(self.v) - 1

    def face(self, idx, color, smooth=True):
        self.f.append(tuple(idx))
        self.c.append(color)
        self.smooth.append(smooth)

    def grid(self, rows, color, weight, closed=True, smooth=True, cap=None, flip=False):
        ids = [[self.vert(p, weight(p)) for p in row] for row in rows]
        n = len(rows[0])
        for i in range(len(rows) - 1):
            for j in range(n if closed else n - 1):
                k = (j + 1) % n
                col = color(i, j) if callable(color) else color
                q = (ids[i][j], ids[i][k], ids[i + 1][k], ids[i + 1][j])
                self.face(q[::-1] if flip else q, col, smooth)
        if cap:
            for end, col in cap:
                ring = ids[0] if end == 0 else ids[-1]
                ctr = sum((self.v[i] for i in ring), Vector()) / len(ring)
                c = self.vert(ctr, weight(ctr))
                for j in range(n):
                    a, b = ring[j], ring[(j + 1) % n]
                    tri = (a, b, c) if end else (b, a, c)
                    self.face(tri[::-1] if flip else tri, col, smooth)
        return ids

    def tube(self, pts, radius, sides, color, weight, cap=True):
        rows = []
        pts = [Vector(p) for p in pts]
        prev = None
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            a = (prev - t * prev.dot(t)).normalized() if prev is not None else t.orthogonal().normalized()
            prev = a
            b = t.cross(a)
            r = radius(i / (len(pts) - 1)) if callable(radius) else radius
            rows.append([p + (a * math.cos(2 * math.pi * s / sides) + b * math.sin(2 * math.pi * s / sides)) * r
                         for s in range(sides)])
        c0 = color(0, 0) if callable(color) else color
        return self.grid(rows, color, weight, cap=[(0, c0), (1, c0)] if cap else None)

    def esfera(self, centro, radios, color, weight, rot=None, seg=12, anillos=8, lat=(-90, 90), lon=(0, 360),
               cap=True, smooth=True):
        """Elipsoide (o casquete) de radios (x, y, z), girado por rot (Matrix 3x3)."""
        rot = rot or Matrix.Identity(3)
        c = Vector(centro)
        rx, ry, rz = radios
        full = (lon[1] - lon[0]) >= 359.9
        nlon = seg if full else seg + 1
        rows = []
        for i in range(anillos + 1):
            la = math.radians(lat[0] + (lat[1] - lat[0]) * i / anillos)
            row = []
            for j in range(nlon):
                lo = math.radians(lon[0] + (lon[1] - lon[0]) * j / seg)
                q = Vector((rx * math.cos(la) * math.cos(lo), ry * math.cos(la) * math.sin(lo), rz * math.sin(la)))
                row.append(c + rot @ q)
            rows.append(row)
        return self.grid(rows, color, weight, closed=full, smooth=smooth)

    def caja(self, centro, medidas, color, weight, rot=None, bisel=0.0):
        rot = rot or Matrix.Identity(3)
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        if bisel > 0:
            bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bisel, segments=2, affect='EDGES')
        base = len(self.v)
        for v in bm.verts:
            p = Vector(centro) + rot @ Vector((v.co.x * medidas[0], v.co.y * medidas[1], v.co.z * medidas[2]))
            self.vert(p, weight(p))
        for f in bm.faces:
            self.face([base + v.index for v in f.verts], color, smooth=bisel > 0)
        bm.free()

    def ico(self, centro, r, color, weight, sub=1, escala=(1, 1, 1), smooth=True):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
        base = len(self.v)
        w = weight(Vector(centro))
        for v in bm.verts:
            self.vert(Vector(centro) + Vector((v.co.x * r * escala[0], v.co.y * r * escala[1], v.co.z * r * escala[2])), w)
        for f in bm.faces:
            self.face([base + v.index for v in f.verts], color, smooth=smooth)
        bm.free()

    def cinta(self, pts, ancho, normal, color, weight, grosor=0.0):
        """Tira plana que sigue `pts`; `normal(i)` o vector fijo da hacia dónde mira."""
        pts = [Vector(p) for p in pts]
        rows = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            n = Vector(normal(i) if callable(normal) else normal).normalized()
            s = t.cross(n).normalized()
            w = ancho(i / (len(pts) - 1)) if callable(ancho) else ancho
            if grosor:
                rows.append([p - s * w / 2, p + s * w / 2, p + s * w / 2 + n * grosor, p - s * w / 2 + n * grosor])
            else:
                rows.append([p - s * w / 2, p + s * w / 2])
        return self.grid(rows, color, weight, closed=bool(grosor), cap=[(0, color), (1, color)] if grosor else None)

    def objeto(self, nombre, arm, material):
        me = bpy.data.meshes.new(nombre)
        me.from_pydata([tuple(v) for v in self.v], [], self.f)
        me.validate()
        me.update()
        uv = me.uv_layers.new(name='UVMap')
        for poly, col, sm in zip(me.polygons, self.c, self.smooth):
            poly.use_smooth = sm
            for li in poly.loop_indices:
                uv.data[li].uv = self.pal.uv(col)
        o = bpy.data.objects.new(nombre, me)
        bpy.context.scene.collection.objects.link(o)
        groups = {}
        for i, w in enumerate(self.w):
            for bone, val in w.items():
                if bone not in groups:
                    groups[bone] = o.vertex_groups.new(name=bone)
                groups[bone].add([i], val, 'REPLACE')
        o.parent = arm
        o.matrix_parent_inverse = arm.matrix_world.inverted()
        o.modifiers.new('Huesos', 'ARMATURE').object = arm
        me.materials.append(material)
        return o


TRONCO = ('hips', 'spine', 'chest', 'upperArmL', 'upperArmR', 'thighL', 'thighR', 'head')
CADERA = ('hips', 'spine', 'thighL', 'thighR')


def suave(pesador, base='hips', f=0.5):
    """Atenúa los demás huesos hacia `base` (faldas: que las piernas no las estiren tanto)."""
    def w(p):
        d = pesador(p)
        out = {b: x * f for b, x in d.items() if b != base}
        out[base] = 1 - sum(out.values())
        return out
    return w


def rigido(bone):
    return lambda p: {bone: 1.0}


def mezcla(*pares):
    """Pesos fijos: mezcla(('chest', .7), ('upperArmL', .3))."""
    d = dict(pares)
    return lambda p: d


# ------------------------------------------------------------------ prendas que envuelven
def anillo(cuerpo, centro, eje, huesos, off, n=20, escala=1.0, dz=0.02, rmin=0.03, forma=None, arco=None):
    """Contorno de la piel desplazado `off`. Con eje vertical, ángulo 0 = +X y 90° = +Y.
    `arco=(a0, a1)` da un tramo abierto de n+1 puntos en vez del anillo cerrado."""
    u, v, r = cuerpo.radios(centro, eje, huesos, dz=dz, rmin=rmin)
    pts = []
    for s in range(n + 1 if arco else n):
        ang = arco[0] + (arco[1] - arco[0]) * s / n if arco else 2 * math.pi * s / n
        rr = _interp(r, ang) * escala + off
        if forma:
            rr = forma(ang, rr)
        pts.append(Vector(centro) + (u * math.cos(ang) + v * math.sin(ang)) * rr)
    return pts


def funda(m, cuerpo, bone, t0, t1, pasos, off, color, huesos=None, n=16, extra=None, peso=None):
    """Manga o pernera sobre el hueso `bone` de t0 a t1 (fracción del hueso)."""
    h, t = cuerpo.hueso(bone)
    eje = t - h
    huesos = huesos or {bone}
    rows = []
    for i in range(pasos + 1):
        f = t0 + (t1 - t0) * i / pasos
        c = h + eje * f
        e = extra(i / pasos) if extra else 0.0
        rows.append(anillo(cuerpo, c, eje, huesos, off + e, n=n))
    return m.grid(rows, color, peso or cuerpo.pesador())


def tronco(m, cuerpo, z0, z1, pasos, off, color, huesos=('hips', 'spine', 'chest'), n=24, extra=None,
           centro_y=None, peso=None, forma=None, arco=None):
    hips = cuerpo.hueso('hips')[0]
    rows = []
    for i in range(pasos + 1):
        z = z0 + (z1 - z0) * i / pasos
        c = Vector((0, centro_y if centro_y is not None else hips.y, z))
        e = extra(i / pasos) if extra else 0.0
        f = (lambda ang, rr, k=i / pasos: forma(ang, rr, k)) if forma else None
        rows.append(anillo(cuerpo, c, (0, 0, 1), set(huesos), off + e, n=n, forma=f, arco=arco))
    return m.grid(rows, color, peso or cuerpo.pesador(solo=TRONCO), closed=arco is None)


def volante(m, centro, r, color, weight, ondas=10, alto=0.05, caida=0.6, segs=40, filas=3, amp=0.012, z_eje=(0, 0, 1)):
    """Volante ondulado horizontal alrededor de `centro`: sale de r y cae hacia fuera."""
    rows = []
    for i in range(filas + 1):
        k = i / filas
        row = []
        for s in range(segs):
            a = 2 * math.pi * s / segs
            rr = (r(a) if callable(r) else r) + alto * caida * k + amp * math.sin(a * ondas) * k
            z = -alto * k
            row.append(Vector(centro) + Vector((math.cos(a) * rr, math.sin(a) * rr, z + amp * 0.6 * math.cos(a * ondas) * k)))
        rows.append(row)
    return m.grid(rows, color, weight)


def unir(nombre, objs, arm):
    objs = [o for o in objs if o is not None]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = nombre
    o.data.name = nombre
    for mod in [x for x in o.modifiers if x.type == 'ARMATURE'][1:]:
        o.modifiers.remove(mod)
    return o


def reconstruir_nla(arm, nombres=None):
    """Una pista NLA por acción (el exportador glTF exporta así todos los clips)."""
    ad = arm.animation_data_create()
    ad.action = None
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)
    acts = [a for a in bpy.data.actions if nombres is None or a.name in nombres]
    for act in acts:
        tr = ad.nla_tracks.new()
        tr.name = act.name
        st = tr.strips.new(act.name, int(act.frame_range[0]), act)
        try:
            if act.slots and not st.action_slot:
                st.action_slot = act.slots[0]
        except AttributeError:
            pass
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    bpy.context.scene.frame_set(0)
    return acts
