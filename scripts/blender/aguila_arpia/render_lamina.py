# Lámina de revisión: frente, 3/4, perfil y detalle de cabeza, con humano de 1,7 m.
import math
import os

import bpy
from mathutils import Vector as V

VIEWS = {
    'frente': (V((0, -1, 0.12)), 8.2, V((0, -0.2, 1.35))),
    'tres_cuartos': (V((-0.85, -0.85, 0.30)), 8.4, V((0, 0, 1.35))),
    'perfil': (V((-1, 0, 0.06)), 8.4, V((0, 0.35, 1.35))),
    'detalle': (V((-0.55, -1, 0.18)), 2.4, V((0, -1.0, 2.40))),
    'dorso': (V((0.6, 0.9, 0.9)), 6.4, V((0, 0.3, 1.7))),
}


def _hexl(h):
    h = h.lstrip('#')
    s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in s) + (1,)


def setup(human=True):
    sc = bpy.context.scene
    try:
        sc.render.engine = 'CYCLES'
    except TypeError:
        pass
    sc.cycles.samples = 64
    sc.cycles.use_denoising = True
    try:
        sc.cycles.device = 'GPU'
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
    except Exception:
        pass
    sc.render.resolution_x = sc.render.resolution_y = 900
    sc.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else sc.view_settings.view_transform
    w = bpy.data.worlds.new('w')
    sc.world = w
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = _hexl('#8c9096')
    bg.inputs['Strength'].default_value = 0.55
    # suelo
    bpy.ops.mesh.primitive_plane_add(size=30)
    fl = bpy.context.object
    m = bpy.data.materials.new('suelo')
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = _hexl('#9a9da1')
    b.inputs['Roughness'].default_value = 0.9
    fl.data.materials.append(m)
    # luces: clave cálida, relleno frío, contra
    for name, rot, energy, col in (('clave', (50, 0, -40), 4.0, '#fff1dc'),
                                   ('relleno', (65, 0, 140), 1.2, '#dbe6ff'),
                                   ('contra', (35, 0, 180), 2.5, '#ffffff')):
        ld = bpy.data.lights.new(name, 'SUN')
        ld.energy = energy
        ld.color = _hexl(col)[:3]
        ld.angle = math.radians(8)
        lo = bpy.data.objects.new(name, ld)
        lo.rotation_euler = [math.radians(a) for a in rot]
        sc.collection.objects.link(lo)
    if human:
        mh = bpy.data.materials.new('humano')
        b = next(n for n in mh.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Base Color'].default_value = _hexl('#5d7fa8')
        bpy.ops.mesh.primitive_cylinder_add(radius=0.17, depth=1.45, location=(2.0, 0.2, 0.725))
        bpy.context.object.data.materials.append(mh)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(2.0, 0.2, 1.58))
        bpy.context.object.data.materials.append(mh)


def lamina(out, tag, views=VIEWS):
    setup()
    sc = bpy.context.scene
    cd = bpy.data.cameras.new('cam')
    cd.lens = 50
    cam = bpy.data.objects.new('cam', cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    paths = []
    for name, (d, dist, tgt) in views.items():
        d = d.normalized()
        cam.location = tgt + d * dist
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(out, f'{tag}_{name}.png')
        bpy.ops.render.render(write_still=True)
        paths.append(sc.render.filepath)
    print('RENDERS', paths)
    return paths
