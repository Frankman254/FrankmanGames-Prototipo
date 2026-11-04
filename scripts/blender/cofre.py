# Cofre de geometría propia con tapa articulada: clips "Abrir" y "Cerrar", uno por pista NLA.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/cofre.py
# Escribe assets/models/cofre.glb. Medidas en metros, base en z=0, frente hacia -Y (+Z en el juego).
# Plantilla de modelo animado: piezas móviles con su pivote real y una pista por clip.
import math
import os
import bpy
import bmesh
from mathutils import Matrix, Vector

OUT = os.path.join(os.path.dirname(bpy.path.abspath(__file__)) if '__file__' in globals() else os.getcwd(), '..', '..', 'assets', 'models', 'cofre.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30


def material(name, rgb, metallic=0.0, rough=0.7, emit=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m


# Colores pensados para el juego: sin mapa de entorno, un metal puro se ve negro.
WOOD = material("Madera_oscura", (0.22, 0.1, 0.04), rough=0.78)
WOOD_ALT = material("Madera_oscura_clara", (0.34, 0.17, 0.07), rough=0.72)
INSIDE = material("Interior_oscuro", (0.012, 0.007, 0.005), rough=0.95)
IRON = material("Metal_envejecido", (0.5, 0.47, 0.42), metallic=0.25, rough=0.5)
CRYSTAL = material("Cristal_azul", (0.02, 0.12, 0.9), rough=0.12, emit=(0.03, 0.22, 1.0), strength=2.2)


def box(name, center, size, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat)
    return o


def join(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    o.data.name = name
    for f in o.data.polygons:
        f.use_smooth = False
    return o


W, D, H = 1.2, 0.76, 0.5
WALL = 0.05
R = D / 2
base_parts, lid_parts = [], []

# Cuerpo hueco: cada tablon es un anillo de cuatro paredes.
planks = 4
for i in range(planks):
    h = H / planks
    z = h * (i + 0.5)
    mat = WOOD if i % 2 else WOOD_ALT
    for sy in (-1, 1):
        base_parts.append(box(f"Tablon_{i}", (0, sy * (D - WALL) / 2, z), (W, WALL, h * 0.96), mat))
    for sx in (-1, 1):
        base_parts.append(box(f"Tablon_{i}", (sx * (W - WALL) / 2, 0, z), (WALL, D - 2 * WALL, h * 0.96), mat))
base_parts.append(box("Fondo", (0, 0, 0.06), (W - 2 * WALL, D - 2 * WALL, 0.02), INSIDE))
base_parts.append(box("Zocalo", (0, 0, 0.025), (W + 0.04, D + 0.04, 0.05), IRON))
for sx in (-1, 1):
    for sy in (-1, 1):
        base_parts.append(box("Esquina", (sx * (W / 2 - 0.02), sy * (D / 2 - 0.02), (H + 0.01) / 2), (0.07, 0.07, H + 0.01), IRON))
# Canto del cuerpo: marco abierto, para que se vea el interior.
RW, RH, RZ = 0.05, 0.022, H - 0.005
for sy in (-1, 1):
    base_parts.append(box("Canto", (0, sy * (D + 0.025 - RW) / 2, RZ), (W + 0.025, RW, RH), IRON))
for sx in (-1, 1):
    base_parts.append(box("Canto", (sx * (W + 0.025 - RW) / 2, 0, RZ), (RW, D + 0.025 - 2 * RW, RH), IRON))


# Tapa: medio cilindro con forro oscuro por debajo.
segs = 8
prof = [(R * math.cos(math.pi * i / segs), R * 0.72 * math.sin(math.pi * i / segs)) for i in range(segs + 1)]


def custom(name, bm, mat):
    bm.normal_update()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    me.materials.append(mat)
    return o


def shell():
    bm = bmesh.new()
    left = [bm.verts.new((-W / 2, y, H + z)) for y, z in prof]
    right = [bm.verts.new((W / 2, y, H + z)) for y, z in prof]
    for i in range(segs):
        bm.faces.new((left[i], right[i], right[i + 1], left[i + 1]))
    bm.faces.new(left[::-1])
    bm.faces.new(right)
    return bm


def underside():
    bm = bmesh.new()
    a = [bm.verts.new((sx * W / 2, sy * R, H + 0.002)) for sx, sy in ((-1, -1), (-1, 1), (1, 1), (1, -1))]
    bm.faces.new(a)
    return bm


lid_parts.append(custom("Tapa", shell(), WOOD_ALT))
lid_parts.append(custom("Forro", underside(), INSIDE))


def band(name, x, width):
    off = 0.016
    for sy in (-1, 1):
        base_parts.append(box(f"{name}_c", (x, sy * (D / 2 + off / 2), H / 2), (width, off, H), IRON))

    def arc():
        b = bmesh.new()
        outer = [(y * (1 + off / R), z * (1 + off / R)) for y, z in prof]
        a0 = [b.verts.new((x - width / 2, y, H + z)) for y, z in outer]
        a1 = [b.verts.new((x + width / 2, y, H + z)) for y, z in outer]
        c0 = [b.verts.new((x - width / 2, y, H + z)) for y, z in prof]
        c1 = [b.verts.new((x + width / 2, y, H + z)) for y, z in prof]
        for i in range(segs):
            b.faces.new((a0[i], a1[i], a1[i + 1], a0[i + 1]))
            b.faces.new((a0[i + 1], c0[i + 1], c0[i], a0[i]))
            b.faces.new((a1[i], c1[i], c1[i + 1], a1[i + 1]))
        return b

    lid_parts.append(custom(f"{name}_arco", arc(), IRON))


for n, x, w in (("Fleje_izq", -W / 2 + 0.11, 0.085), ("Fleje_der", W / 2 - 0.11, 0.085), ("Fleje_c1", -0.2, 0.05), ("Fleje_c2", 0.2, 0.05)):
    band(n, x, w)

# Cerradura y cristal viajan con la tapa.
lid_parts.append(box("Cerradura", (0, -D / 2 - 0.03, H - 0.015), (0.2, 0.05, 0.26), IRON))
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.075, location=(0, -D / 2 - 0.075, H - 0.015))
gem = bpy.context.object
gem.scale = (0.8, 0.55, 1.15)
bpy.ops.object.transform_apply(scale=True)
gem.data.materials.append(CRYSTAL)
lid_parts.append(gem)

# Bisagras visibles detras.
for sx in (-1, 1):
    base_parts.append(box("Bisagra", (sx * 0.34, D / 2 + 0.022, H), (0.11, 0.03, 0.05), IRON))

base = join(base_parts, "FG_Cofre")
lid = join(lid_parts, "FG_Cofre_Tapa")

# Pivote de la tapa en la bisagra, hija del cuerpo.
HINGE = Vector((0, D / 2 + 0.008, H))
lid.data.transform(Matrix.Translation(-HINGE))
lid.location = HINGE
lid.parent = base
lid.rotation_mode = "XYZ"


def clip(name, keys):
    """keys: (fotograma, grados de apertura)."""
    lid.animation_data_clear()
    for frame, deg in keys:
        lid.rotation_euler = (-math.radians(deg), 0, 0)
        lid.keyframe_insert("rotation_euler", index=0, frame=frame)
    act = lid.animation_data.action
    act.name = name
    act.use_fake_user = True
    return act


# Forcejeo, apertura con rebote; y al cerrar, golpe seco.
ABRIR = [(1, 0), (5, 2.5), (9, 0), (12, 1.5), (15, 0), (28, 108), (33, 97), (38, 100)]
CERRAR = [(1, 100), (6, 104), (20, 0), (23, 1.8), (26, 0)]
actions = [(name, keys, clip(name, keys)) for name, keys in (("Abrir", ABRIR), ("Cerrar", CERRAR))]

# Un clip por pista NLA: cada pista se exporta como una animación.
ad = lid.animation_data
ad.action = None
for name, keys, act in actions:
    track = ad.nla_tracks.new()
    track.name = name
    track.strips.new(name, keys[0][0], act)
scene.frame_set(1)
lid.rotation_euler = (0, 0, 0)

bpy.ops.object.select_all(action="DESELECT")
base.select_set(True)
lid.select_set(True)
bpy.context.view_layer.objects.active = base
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_animations=True, export_animation_mode="NLA_TRACKS", export_apply=False)
tris = sum(len(p.vertices) - 2 for o in (base, lid) for p in o.data.polygons)
print("cofre.glb:", tris, "triangulos")
