# Piezas para personajes detallados: superficies con UV para texturas repetibles,
# pesos suaves entre huesos y placas con el contorno de una imagen (escudos, broches).
# Lo usan centinela.py y los personajes que vengan después; fg.Builder sigue sirviendo
# para los modelos facetados de colores planos.
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

TEXTURES = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..', 'assets', 'textures', 'personajes'))


def tex_material(name, texture, rough=0.85, metallic=0.0, two_sided=False, tint=None):
    """Material con una textura de assets/textures/personajes (sin extensión)."""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = not two_sided
    tree = m.node_tree
    bsdf = next(n for n in tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metallic
    tex = tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(TEXTURES, f'{texture}.png'), check_existing=True)
    tex.interpolation = 'Linear'
    tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def srgb(c):
    """Color tal como se ve (sRGB) a lineal, que es lo que guardan Blender y glTF."""
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def plain_material(name, rgb, rough=0.7, metallic=0.0, two_sided=False):
    """Material liso; `rgb` en sRGB (el color que se ve en pantalla)."""
    rgb = srgb(rgb)
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = not two_sided
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metallic
    return m


def image_rows(texture, rows, threshold=0.5):
    """Contorno de una pieza con transparencia: por fila (v de arriba abajo), u izquierda y derecha."""
    img = bpy.data.images.load(os.path.join(TEXTURES, f'{texture}.png'), check_existing=True)
    w, h = img.size
    px = img.pixels[:]
    out = []
    for i in range(rows + 1):
        v = 0.02 + 0.96 * i / rows
        y = min(h - 1, int((1 - v) * h))  # las filas de Blender empiezan abajo
        xs = [x for x in range(w) if px[(y * w + x) * 4 + 3] > threshold]
        if xs:
            out.append((v, (xs[0] + 1.5) / w, (xs[-1] - 0.5) / w))
    return out, w / h


class Figura:
    """Malla con UV y pesos suaves. Los huesos se dan como {nombre: sesgo}; cada vértice
    reparte su peso según la distancia a esos huesos (los más cercanos mandan)."""

    def __init__(self, name, bones):
        self.name = name
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.verify()
        self.layer = self.bm.verts.layers.deform.verify()
        self.mats = []
        self.groups = []
        self.segs = {b[0]: (Vector(b[2]), Vector(b[3])) for b in bones}
        self.xf = Matrix.Identity(4)

    # -- utilidades internas ------------------------------------------------
    def _mi(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _gi(self, bone):
        if bone not in self.groups:
            self.groups.append(bone)
        return self.groups.index(bone)

    def _dist(self, p, bone):
        a, b = self.segs[bone]
        ab = b - a
        t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
        return (a + ab * t - p).length

    def _weigh(self, verts, bones):
        if isinstance(bones, str):
            bones = {bones: 1.0}
        for v in verts:
            if len(bones) == 1:
                v[self.layer][self._gi(next(iter(bones)))] = 1.0
                continue
            ws = {b: k / max(self._dist(v.co, b), 0.006) ** 4 for b, k in bones.items()}
            tot = sum(ws.values())
            ws = {b: w / tot for b, w in ws.items() if w / tot > 0.04}
            tot = sum(ws.values())
            for b, w in ws.items():
                v[self.layer][self._gi(b)] = w / tot

    def _v(self, p):
        return self.bm.verts.new(self.xf @ Vector(p))

    def _face(self, verts, uvs, mi, smooth):
        f = self.bm.faces.new(verts)
        f.material_index = mi
        f.smooth = smooth
        for loop, uv in zip(f.loops, uvs):
            loop[self.uv].uv = uv
        return f

    # -- primitivas -----------------------------------------------------------
    def loft(self, sections, mat, bones, sides=12, xdir=(1, 0, 0), urep=1.0, vlen=None,
             cap0=False, cap1=False, smooth=True, seam=math.pi / 2, keep=None, arc=None, deform=None):
        """Tubo por secciones (centro, rx, ry). u da la vuelta (`urep` repeticiones), v sigue
        la longitud (una repetición cada `vlen` m; sin él, de 0 a 1). `arc` = (a0, a1) abre
        el tubo en una lámina curva. `deform(p) -> p` retoca cada punto antes de pesarlo."""
        cs = [Vector(s[0]) for s in sections]
        n = len(cs)
        open_arc = arc is not None
        cols = sides + 1 if open_arc else sides
        rings = []
        lengths = [0.0]
        for j in range(1, n):
            lengths.append(lengths[-1] + (cs[j] - cs[j - 1]).length)
        total = lengths[-1] or 1.0
        for j, s in enumerate(sections):
            c, rx, ry = cs[j], s[1], s[2]
            off = Vector(s[3]) if len(s) > 3 else Vector((0, 0, 0))
            axis = (cs[min(j + 1, n - 1)] - cs[max(j - 1, 0)]).normalized()
            X = Vector(xdir) - axis * axis.dot(Vector(xdir))
            if X.length < 1e-6:
                X = axis.orthogonal()
            X.normalize()
            Y = axis.cross(X)
            ring = []
            for i in range(cols):
                if open_arc:
                    t = arc[0] + (arc[1] - arc[0]) * i / sides
                else:
                    t = seam + 2 * math.pi * i / sides
                p = c + off + X * (rx * math.cos(t)) + Y * (ry * math.sin(t))
                if deform:
                    p = deform(p)
                ring.append(self._v(p))
            rings.append(ring)
        mi = self._mi(mat)
        vs = [lengths[j] / vlen if vlen else lengths[j] / total for j in range(n)]
        made = []
        for j in range(n - 1):
            for i in range(sides):
                i2 = i + 1 if open_arc else (i + 1) % sides
                if keep and not keep(j, i):
                    continue
                u0, u1 = urep * i / sides, urep * (i + 1) / sides
                made.append(self._face((rings[j][i], rings[j][i2], rings[j + 1][i2], rings[j + 1][i]),
                                       ((u0, vs[j]), (u1, vs[j]), (u1, vs[j + 1]), (u0, vs[j + 1])), mi, smooth))
        for which, ring, flip in ((cap0, rings[0], True), (cap1, rings[-1], False)):
            if not which or open_arc:
                continue
            tip = which if isinstance(which, (tuple, Vector)) else None
            cpos = Vector(tip) if tip is not None else sum((v.co for v in ring), Vector()) / len(ring)
            cv = self.bm.verts.new(cpos if tip is None else self.xf @ cpos)
            for i in range(sides):
                a, b = ring[i], ring[(i + 1) % sides]
                ta, tb = seam + 2 * math.pi * i / sides, seam + 2 * math.pi * (i + 1) / sides
                ua = (0.5 + 0.5 * math.cos(ta), 0.5 + 0.5 * math.sin(ta))
                ub = (0.5 + 0.5 * math.cos(tb), 0.5 + 0.5 * math.sin(tb))
                if flip:
                    made.append(self._face((cv, b, a), ((0.5, 0.5), ub, ua), mi, smooth))
                else:
                    made.append(self._face((cv, a, b), ((0.5, 0.5), ua, ub), mi, smooth))
        verts = {v for f in made for v in f.verts}
        self._weigh(verts, bones)
        return made

    def ellipsoid(self, center, radii, mat, bones, sides=16, rings=10, urep=1.0, vrep=1.0, smooth=True, keep=None, deform=None, poles=(True, True)):
        """Elipsoide con polos: u alrededor, v de abajo arriba."""
        c = Vector(center)
        secs = []
        for k in range(1, rings):
            a = -math.pi / 2 + math.pi * k / rings
            secs.append(((c.x, c.y, c.z + radii[2] * math.sin(a)), radii[0] * math.cos(a), radii[1] * math.cos(a)))
        bottom = Vector((c.x, c.y, c.z - radii[2]))
        top = Vector((c.x, c.y, c.z + radii[2]))
        if deform:
            bottom, top = deform(bottom), deform(top)
        return self.loft(secs, mat, bones, sides=sides, urep=urep, vlen=None, cap0=bottom if poles[0] else False, cap1=top if poles[1] else False,
                         smooth=smooth, keep=keep, deform=deform)

    def band(self, profile, mat, bones, sides=20, urep=4.0, smooth=True, deform=None):
        """Aro abierto arriba y abajo (cinturones, fajas): profile = [(z, rx, ry, (dx, dy))]."""
        secs = [((p[3][0] if len(p) > 3 else 0, p[3][1] if len(p) > 3 else 0, p[0]), p[1], p[2]) for p in profile]
        return self.loft(secs, mat, bones, sides=sides, urep=urep, smooth=smooth, deform=deform)

    def sheet(self, fn, nu, nv, mat, bones, urep=1.0, vrep=1.0, smooth=True):
        """Lámina fn(u, v) -> punto, u y v de 0 a 1 (capas, cintas, faldones)."""
        grid = [[self._v(fn(i / nu, j / nv)) for i in range(nu + 1)] for j in range(nv + 1)]
        mi = self._mi(mat)
        made = []
        for j in range(nv):
            for i in range(nu):
                u0, u1, v0, v1 = urep * i / nu, urep * (i + 1) / nu, vrep * j / nv, vrep * (j + 1) / nv
                made.append(self._face((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]),
                                       ((u0, 1 - v0), (u1, 1 - v0), (u1, 1 - v1), (u0, 1 - v1)), mi, smooth))
        self._weigh({v for row in grid for v in row}, bones)
        return made

    def box(self, center, size, mat, bones, rot=None, uvm=0.1):
        """Caja con UV por cara (una repetición cada `uvm` m). rot: Matrix 3x3."""
        c = Vector(center)
        R = rot or Matrix.Identity(3)
        hx, hy, hz = (s / 2 for s in size)
        faces = [
            ((1, 0, 0), [(hx, -hy, -hz), (hx, hy, -hz), (hx, hy, hz), (hx, -hy, hz)], (1, 2)),
            ((-1, 0, 0), [(-hx, hy, -hz), (-hx, -hy, -hz), (-hx, -hy, hz), (-hx, hy, hz)], (1, 2)),
            ((0, -1, 0), [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, -hy, hz), (-hx, -hy, hz)], (0, 2)),
            ((0, 1, 0), [(hx, hy, -hz), (-hx, hy, -hz), (-hx, hy, hz), (hx, hy, hz)], (0, 2)),
            ((0, 0, 1), [(-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)], (0, 1)),
            ((0, 0, -1), [(-hx, hy, -hz), (hx, hy, -hz), (hx, -hy, -hz), (-hx, -hy, -hz)], (0, 1)),
        ]
        mi = self._mi(mat)
        made = []
        for _, pts, (a, b) in faces:
            vs = [self._v(c + R @ Vector(p)) for p in pts]
            uvs = [(p[a] / uvm + 0.5, p[b] / uvm + 0.5) for p in pts]
            made.append(self._face(vs, uvs, mi, False))
        self._weigh({v for f in made for v in f.verts}, bones)
        return made

    def plate(self, texture, height, thickness, front, back, rim, bones, rows=20, cols=8, bulge=0.0):
        """Placa con el contorno de una imagen con transparencia, centrada en el origen,
        de cara a -Y, con z arriba: la cara lleva la imagen entera y el canto, `rim`."""
        outline, aspect = image_rows(texture, rows)
        width = height * aspect
        fm, bm_, rm = self._mi(front), self._mi(back), self._mi(rim)
        fronts, backs = [], []
        for v, ul, ur in outline:
            fr, br = [], []
            for i in range(cols + 1):
                u = ul + (ur - ul) * i / cols
                x = (u - 0.5) * width
                z = (0.5 - v) * height
                r2 = (2 * x / width) ** 2 + (2 * z / height) ** 2
                d = bulge * max(0.0, 1 - r2)
                fr.append((self._v((x, -thickness / 2 - d, z)), (u, 1 - v)))
                br.append((self._v((x, thickness / 2 - d * 0.6, z)), (u, 1 - v)))
            fronts.append(fr)
            backs.append(br)
        made = []
        for j in range(len(outline) - 1):
            for i in range(cols):
                a, b, c, d = fronts[j][i], fronts[j][i + 1], fronts[j + 1][i + 1], fronts[j + 1][i]
                made.append(self._face((a[0], d[0], c[0], b[0]), (a[1], d[1], c[1], b[1]), fm, True))
                a, b, c, d = backs[j][i], backs[j][i + 1], backs[j + 1][i + 1], backs[j + 1][i]
                made.append(self._face((a[0], b[0], c[0], d[0]), (a[1], b[1], c[1], d[1]), bm_, True))
        # Canto: el contorno de delante unido al de detrás.
        loop_f = [r[0][0] for r in fronts] + [fronts[-1][i][0] for i in range(1, cols)] + [r[-1][0] for r in reversed(fronts)] + [fronts[0][i][0] for i in range(cols - 1, 0, -1)]
        loop_b = [r[0][0] for r in backs] + [backs[-1][i][0] for i in range(1, cols)] + [r[-1][0] for r in reversed(backs)] + [backs[0][i][0] for i in range(cols - 1, 0, -1)]
        n = len(loop_f)
        for i in range(n):
            k = (i + 1) % n
            made.append(self._face((loop_f[i], loop_b[i], loop_b[k], loop_f[k]), ((i / n * 8, 0), (i / n * 8, 1), (k / n * 8 if k else 8, 1), (k / n * 8 if k else 8, 0)), rm, False))
        self._weigh({v for f in made for v in f.verts}, bones)
        return width

    # -- cierre ---------------------------------------------------------------
    def object(self, scene, parent=None):
        loose = [v for v in self.bm.verts if not v.link_faces]
        if loose:
            bmesh.ops.delete(self.bm, geom=loose, context='VERTS')
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for mat in self.mats:
            me.materials.append(mat)
        o = bpy.data.objects.new(self.name, me)
        scene.collection.objects.link(o)
        for g in self.groups:
            o.vertex_groups.new(name=g)
        if parent:
            o.parent = parent
        return o


def pose_deltas(rig, pose):
    """Matriz de cada hueso entre el reposo del esqueleto y la pose dada (espacio del modelo):
    sirve para modelar en la pose de juego lo que va rígido en un hueso (armas en la mano)."""
    import fg_rig  # noqa: F401  (las poses usan su convención de ejes)
    from mathutils import Euler
    for pb in rig.pose:
        rest = pb.bone.matrix_local.to_3x3()
        r = Euler([math.radians(v) for v in pose.get(pb.name, (0, 0, 0))]).to_matrix()
        pb.rotation_quaternion = (rest.inverted() @ r @ rest).to_quaternion()
    bpy.context.view_layer.update()
    out = {pb.name: pb.matrix @ pb.bone.matrix_local.inverted() for pb in rig.pose}
    for pb in rig.pose:
        pb.rotation_quaternion = (1, 0, 0, 0)
    bpy.context.view_layer.update()
    return out
