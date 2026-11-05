# Piezas comunes de los modelos del juego: materiales, geometría, clips y exportación.
# Colores pensados para el juego: sin mapa de entorno, un metal puro se ve negro.
import math
import os
import bpy
import bmesh
from mathutils import Matrix, Quaternion, Vector

MODELS = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..', 'assets', 'models'))


def reset(fps=30):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = fps
    return bpy.context.scene


def fresh_scene(name, fps=30):
    """Escena limpia. Dentro de Blender (MCP) no toca las demás; sin ventana, parte de cero."""
    if bpy.app.background:
        return reset(fps)
    old = bpy.data.scenes.get(name)
    if old:
        for o in list(old.collection.all_objects):
            bpy.data.objects.remove(o)
        bpy.data.scenes.remove(old)
    scene = bpy.data.scenes.new(name)
    bpy.context.window.scene = scene
    scene.render.fps = fps
    return scene


def textured_material(name, image):
    m = material(name, (1, 1, 1), rough=0.9)
    tree = m.node_tree
    bsdf = next(n for n in tree.nodes if n.type == 'BSDF_PRINCIPLED')
    tex = next((n for n in tree.nodes if n.type == 'TEX_IMAGE'), None) or tree.nodes.new('ShaderNodeTexImage')
    tex.image = image
    tree.links.new(tex.outputs[0], bsdf.inputs['Base Color'])
    return m


def box_uv(obj, metres):
    """UV por caras: cada una se proyecta según su eje dominante; una repetición cada `metres`."""
    me = obj.data
    uv = me.uv_layers.active or me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        n = poly.normal
        axis = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co
            if axis == 2:
                uv.data[li].uv = (c.x / metres, c.y / metres)
            elif axis == 0:
                uv.data[li].uv = (c.y / metres, c.z / metres)
            else:
                uv.data[li].uv = (c.x / metres, c.z / metres)


def material(name, rgb, metallic=0.0, rough=0.75, emit=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    return m


class Builder:
    """Acumula geometría facetada y la convierte en un objeto. `group` opcional: hueso rígido."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []
        self.layer = self.bm.verts.layers.deform.verify()
        self.uv = self.bm.loops.layers.uv.verify()
        self.groups = []

    def _index(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _finish(self, verts, faces, mat, group):
        mi = self._index(mat)
        for f in faces:
            f.material_index = mi
        if group is not None:
            if group not in self.groups:
                self.groups.append(group)
            gi = self.groups.index(group)
            for v in verts:
                v[self.layer][gi] = 1.0

    def box(self, center, size, mat, group=None, rot=None):
        m = Matrix.Translation(center)
        if rot:
            m = m @ Matrix.Rotation(rot[0], 4, rot[1])
        m = m @ Matrix.Diagonal((*size, 1))
        r = bmesh.ops.create_cube(self.bm, size=1, matrix=m)
        vs = r['verts']
        fs = list({f for v in vs for f in v.link_faces})
        self._finish(vs, fs, mat, group)

    def tube(self, a, b, ra, rb, mat, group=None, sides=7, flat=None):
        """Prisma con tapas de `a` a `b`; `flat` aplasta en Y (torso más plano que ancho)."""
        a, b = Vector(a), Vector(b)
        axis = (b - a).normalized()
        q = Vector((0, 0, 1)).rotation_difference(axis)
        rings = []
        for c, r in ((a, ra), (b, rb)):
            ring = []
            for i in range(sides):
                t = 2 * math.pi * i / sides
                p = Vector((r * math.cos(t), r * math.sin(t) * (flat or 1), 0))
                p.rotate(q)
                ring.append(self.bm.verts.new(c + p))
            rings.append(ring)
        faces = [self.bm.faces.new((rings[0][i], rings[0][(i + 1) % sides], rings[1][(i + 1) % sides], rings[1][i])) for i in range(sides)]
        faces.append(self.bm.faces.new(rings[0][::-1]))
        faces.append(self.bm.faces.new(rings[1]))
        self._finish(rings[0] + rings[1], faces, mat, group)

    def blob(self, center, size, mat, group=None, subdiv=2):
        m = Matrix.Translation(center) @ Matrix.Diagonal((*size, 1))
        r = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=1, matrix=m)
        vs = r['verts']
        fs = list({f for v in vs for f in v.link_faces})
        self._finish(vs, fs, mat, group)

    def poly(self, points_a, points_b, mat, group=None):
        """Dos contornos iguales unidos: paredes, tejados y prismas a medida."""
        a = [self.bm.verts.new(p) for p in points_a]
        b = [self.bm.verts.new(p) for p in points_b]
        n = len(a)
        faces = [self.bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i])) for i in range(n)]
        faces.append(self.bm.faces.new(a[::-1]))
        faces.append(self.bm.faces.new(b))
        self._finish(a + b, faces, mat, group)

    def card(self, corners, mat, group=None):
        """Cuadrilátero con UV de 0 a 1, en orden contrario a las agujas visto desde delante."""
        vs = [self.bm.verts.new(c) for c in corners]
        f = self.bm.faces.new(vs)
        for loop, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            loop[self.uv].uv = uv
        self._finish(vs, [f], mat, group)
        return f

    def object(self, scene, parent=None, location=None):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
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
        if location:
            me.transform(Matrix.Translation(-Vector(location)))
            o.location = location
        return o


def key_rotation(obj, name, keys, axis=0, deg=True, scale=1.0):
    """Acción de una rotación de objeto: keys = [(fotograma, grados)]."""
    obj.animation_data_clear()
    obj.rotation_mode = 'XYZ'
    for frame, v in keys:
        e = list(obj.rotation_euler)
        e[axis] = math.radians(v) * scale if deg else v
        obj.rotation_euler = e
        obj.keyframe_insert('rotation_euler', index=axis, frame=frame)
    act = obj.animation_data.action
    act.name = name
    act.use_fake_user = True
    return act


def to_tracks(obj, actions):
    """Un clip por pista NLA: cada pista se exporta como una animación."""
    ad = obj.animation_data_create()
    ad.action = None
    for act in actions:
        track = ad.nla_tracks.new()
        track.name = act.name
        track.strips.new(act.name, int(act.frame_range[0]), act)


def export(filename, scene, objects, materials=True):
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    out = os.path.join(MODELS, filename)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS', export_apply=False, use_active_scene=True, export_materials='EXPORT' if materials else 'NONE')
    tris = sum(len(p.vertices) - 2 for o in objects if o.type == 'MESH' for p in o.data.polygons)
    print(f'{filename}: {tris} triangulos, {os.path.getsize(out)} bytes')
