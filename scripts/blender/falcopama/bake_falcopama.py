# Versión de juego de la Falcopama: decima las piezas del esculpido (falcopama.py), desenvuelve
# un atlas común y hornea color + normales de alta a baja. Guarda work/omp-mod02/falcopama_piezas.blend
# (piezas sueltas con UV y atlas, entradas de rig_falcopama.py).
# Orden: falcopama.py → bake_falcopama.py → rig_falcopama.py → ../../validar_falcopama.py
# Blender -b --factory-startup --python scripts/blender/falcopama/bake_falcopama.py
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'blender', 'aguila_arpia'))
sys.path.insert(0, HERE)
import falcopama as F  # noqa: E402

TEX = 2048
# reducción por pieza (prefijo del nombre → proporción de triángulos que se conserva).
# Objetivo: la montura de juego no pasa de 18 000 triángulos (contrato de la Crestalba).
RATIO = [
    ('cabeza', 0.014), ('ojo_', 0.30), ('parpado_', 0.30), ('corona_', 0.35), ('antifaz_', 0.35),
    ('mejilla_', 0.40), ('barbilla', 0.35), ('pico', 0.30), ('mandibula', 0.35), ('bozal', 0.40),
    ('argolla_', 0.40),
    ('cuerpo', 0.017), ('plumon_', 0.20),
    ('tarso_', 0.25), ('dedo_', 0.35), ('garra_', 0.40), ('pantalon_', 0.25),
    ('ala_', 0.30), ('cobertora_', 0.40),
    ('cola_', 0.30),
    ('silla_manta', 0.10), ('silla_ribete', 0.40), ('silla_asiento', 0.12), ('silla_respaldo', 0.25),
    ('silla_perilla', 0.30), ('silla_borren', 0.30), ('silla_argolla_', 0.40),
    ('alforja', 0.20), ('rienda_', 0.50),
]
# solo las masas grandes reciben normales horneadas; las piezas finas van con normal plana
NORMAL_FROM = ('cabeza', 'cuerpo', 'ala_', 'silla_manta', 'silla_asiento', 'tarso_')


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
        for d in scn.cycles.devices:
            if d.type != 'CPU':
                d.use = True
    except Exception:
        pass


def select(objs, active):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active


def main():
    F.main()                                          # reconstruye todas las piezas (alta)
    scn = bpy.context.scene
    highs = [o for o in scn.objects if o.type == 'MESH']
    pairs = []
    for h in highs:
        lo = h.copy()
        lo.data = h.data.copy()
        lo.name = h.name + '_low'
        scn.collection.objects.link(lo)
        d = lo.modifiers.new('reduce', 'DECIMATE')
        d.ratio = ratio(h.name)
        F.A.apply(lo, d)
        for p in lo.data.polygons:
            p.use_smooth = True
        pairs.append((h, lo))
    lows = [lo for _, lo in pairs]
    print('TRIS juego', sum(F.A.tris(lo) for lo in lows))
    # UV: un solo atlas para todas las piezas (edición multiobjeto)
    select(lows, lows[0])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.003)
    bpy.ops.uv.pack_islands(margin=0.003)
    bpy.ops.object.mode_set(mode='OBJECT')
    color = bpy.data.images.new('falcopama_color', TEX, TEX, alpha=False)
    normal = bpy.data.images.new('falcopama_normal', TEX, TEX, alpha=False)
    normal.colorspace_settings.name = 'Non-Color'
    normal.generated_color = (0.5, 0.5, 1.0, 1.0)    # normal plana donde no se hornea
    cycles(scn)
    bk = scn.render.bake
    bk.margin = 6
    bk.use_clear = False
    # 1) color: cada pieza baja hornea sus propios materiales al atlas
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
        img.filepath_raw = os.path.join(F.WORK, f'falcopama_{kind}.png')
        img.file_format = 'PNG'
        img.save()
    for h in highs:
        bpy.data.objects.remove(h)
    # los datos de pieza (bone_h/bone_t) sobreviven al decimate; el rig los lee aquí
    color.pack()
    normal.pack()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(F.WORK, 'falcopama_piezas.blend'))
    print('PIEZAS ok', len(lows))


if __name__ == '__main__':
    main()
