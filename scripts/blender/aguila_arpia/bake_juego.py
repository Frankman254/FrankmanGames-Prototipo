# Versión de juego del águila arpía: retopo por reducción, UV, horneado de color y
# normales desde el esculpido, GLB y lámina comparativa.
# Blender -b --python bake_juego.py -- [--render]
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import arpia_gigante as A  # noqa: E402

TEX = 2048
# reducción por pieza (prefijo del nombre → proporción de triángulos que se conserva)
RATIO = [('body', 0.014), ('legs', 0.026), ('wing_', 0.035), ('prim_', 0.30), ('tail_', 0.15),
         ('crest_', 0.35), ('talon_', 0.30), ('beak', 0.25), ('jaw', 0.4), ('saddle_seat', 0.15),
         ('saddle', 0.05), ('eye_', 0.30)]
# solo las masas grandes reciben normales horneadas; las piezas finas van con normal plana
NORMAL_FROM = ('body', 'legs', 'wing_', 'saddle')


def ratio(name):
    for p, r in RATIO:
        if name.startswith(p):
            return r
    return 0.5


def cycles(scn):
    try:
        scn.render.engine = 'CYCLES'
    except TypeError:
        pass
    scn.cycles.samples = 4
    try:
        scn.cycles.device = 'GPU'
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
    except Exception:
        pass


def select(objs, active):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active


def main():
    render = A.RENDER
    A.RENDER = False                                 # sin suelo ni humano dentro de la escena
    A.main()                                         # reconstruye el esculpido (alta)
    A.RENDER = render
    scn = bpy.context.scene
    highs = [o for o in scn.objects if o.type == 'MESH']
    # el brillo pintado del ojo pasa al color base para que sobreviva al horneado
    em = bpy.data.materials['montura_ojo'].node_tree
    bsdf = next(n for n in em.nodes if n.type == 'BSDF_PRINCIPLED')
    ramp = next(n for n in em.nodes if n.type == 'VALTORGB')
    add = next(n for n in em.nodes if n.type == 'MATH' and n.operation == 'ADD')
    mixn = em.nodes.new('ShaderNodeMix')
    mixn.data_type = 'RGBA'
    em.links.new(add.outputs[0], mixn.inputs['Factor'])
    em.links.new(ramp.outputs['Color'], mixn.inputs['A'])
    mixn.inputs['B'].default_value = (1, 1, 1, 1)
    em.links.new(mixn.outputs['Result'], bsdf.inputs['Base Color'])

    pairs = []
    for h in highs:
        lo = h.copy()
        lo.data = h.data.copy()
        lo.name = h.name + '_low'
        scn.collection.objects.link(lo)
        d = lo.modifiers.new('reduce', 'DECIMATE')
        d.ratio = ratio(h.name)
        A.apply(lo, d)
        for p in lo.data.polygons:
            p.use_smooth = True
        pairs.append((h, lo))
    lows = [lo for _, lo in pairs]
    print('TRIS juego', sum(A.tris(lo) for lo in lows))
    # UV: un solo atlas para todas las piezas (edición multiobjeto)
    select(lows, lows[0])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.003)
    bpy.ops.uv.pack_islands(margin=0.003)
    bpy.ops.object.mode_set(mode='OBJECT')
    color = bpy.data.images.new('arpia_color', TEX, TEX, alpha=False)
    normal = bpy.data.images.new('arpia_normal', TEX, TEX, alpha=False)
    normal.colorspace_settings.name = 'Non-Color'
    normal.generated_color = (0.5, 0.5, 1.0, 1.0)                   # normal plana donde no se hornea
    cycles(scn)
    bk = scn.render.bake
    bk.margin = 6
    bk.use_clear = False
    # 1) color: cada pieza baja hornea sus propios materiales (vértice y ojo) al atlas
    targets = {}
    for mat in {m for lo in lows for m in lo.data.materials if m}:
        node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = color
        mat.node_tree.nodes.active = node
        targets[mat] = node
    select(lows, lows[0])
    bk.use_selected_to_active = False
    bk.use_pass_direct = bk.use_pass_indirect = False
    bk.use_pass_color = True
    bpy.ops.object.bake(type='DIFFUSE')
    print('BAKE color')
    # 2) normales: de cada masa alta a su baja, al mismo atlas
    for mat, node in targets.items():
        node.image = normal
    bk.use_selected_to_active = True
    bk.cage_extrusion = 0.03
    bk.max_ray_distance = 0.08
    for h, lo in pairs:
        if not h.name.startswith(NORMAL_FROM):
            continue
        select([h, lo], lo)
        bpy.ops.object.bake(type='NORMAL')
    print('BAKE normal')
    for img, kind in ((color, 'color'), (normal, 'normal')):
        img.filepath_raw = os.path.join(A.OUT, f'arpia_{kind}.png')
        img.file_format = 'PNG'
        img.save()
    # una sola malla y un solo material
    for h in highs:
        bpy.data.objects.remove(h)
    # piezas bajas separadas (con UV y atlas) para el rig por piezas
    color.pack()
    normal.pack()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(A.OUT, 'arpia_piezas.blend'))
    select(lows, lows[0])
    bpy.ops.object.join()
    game = bpy.context.view_layer.objects.active
    game.name = game.data.name = 'arpia'
    game.data.materials.clear()
    mat = bpy.data.materials.new('montura_arpia')
    game.data.materials.append(mat)
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tc, tn = nt.nodes.new('ShaderNodeTexImage'), nt.nodes.new('ShaderNodeTexImage')
    tc.image, tn.image = color, normal
    nmap = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(tn.outputs['Color'], nmap.inputs['Color'])
    nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Roughness'].default_value = 0.6
    if 'Col' in game.data.color_attributes:
        game.data.color_attributes.remove(game.data.color_attributes['Col'])
    print('TRIS final', A.tris(game))
    color.pack()
    normal.pack()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(A.OUT, 'arpia_juego.blend'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(A.OUT, 'arpia_gigante.glb'), export_format='GLB',
                              use_selection=False, export_apply=True)
    print('GLB', os.path.getsize(os.path.join(A.OUT, 'arpia_gigante.glb')))
    if A.RENDER:
        import render_lamina
        render_lamina.lamina(A.OUT, 'juego')


if __name__ == '__main__':
    main()
