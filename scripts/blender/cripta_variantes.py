# Variantes de la cripta por tramo (OMP-FA-03, adelantando OMP-POL-04): rata,
# guardián y bruto para el tramo húmedo (pisos 31-70) y el tramo de oro y huesos
# (71-100) de OMP-POL-02. El tramo 1-30 ya lo cubre la base publicada.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/cripta_variantes.py
# Importa assets/models/cripta_{rata,guardian,bruto}.glb, conserva su esqueleto
# FG_*, su malla 'Cuerpo' y sus clips exactos, y solo añade: tinte de materiales
# por tramo y piezas nuevas unidas al Cuerpo con grupo de vértices rígido al hueso
# que les toca. Sin rig nuevo. Escribe seis GLB nuevos y salva
# arte/blender/cripta_variantes.blend (las acciones se prefijan por variante).
# El Icosphere invisible que sale al reimportar es la forma de exibición de los
# huesos que recrea el importador de glTF: nunca estuvo en los archivos.
# NO toca data/ ni src/: la integración es JL-45 de Junie. ≤1500 triángulos.
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import fg  # noqa: E402


def V(t):
    return Vector(t)


BASES = ('cripta_rata', 'cripta_guardian', 'cripta_bruto')

# Tintes por tramo (PROPUESTA, clean-room): cueva = limo y hueso calcificado con
# brillo verdoso de agua quieta; huaca = oro batido, obsidiana y marfil con brillo
# de brasa de ofrenda. Las claves son materiales de la base; lo que no se nombra
# se queda como está. `metal`: lista de materiales que pasan a ser metálicos.
TRAMOS = {
    'cueva': dict(
        skin=(0.30, 0.37, 0.29), hair=(0.07, 0.12, 0.09), cloth=(0.10, 0.13, 0.10),
        trim=(0.62, 0.66, 0.58), gear=(0.20, 0.24, 0.21), bone=(0.70, 0.73, 0.64),
        brillo_gear=dict(emit=(0.28, 0.85, 0.78), strength=2.1, base=(0.35, 0.75, 0.70)),
        brillo_trim=dict(emit=(0.30, 0.80, 0.85), strength=2.1, base=(0.35, 0.75, 0.70)),
    ),
    'huaca': dict(
        skin=(0.52, 0.35, 0.15), hair=(0.05, 0.04, 0.04), cloth=(0.28, 0.09, 0.07),
        trim=(0.83, 0.62, 0.20), gear=(0.80, 0.60, 0.22), bone=(0.88, 0.84, 0.72),
        brillo_gear=dict(emit=(1.00, 0.72, 0.28), strength=1.9, base=(0.86, 0.65, 0.22)),
        brillo_trim=dict(emit=(1.00, 0.78, 0.35), strength=1.9, base=(0.86, 0.65, 0.22)),
        metal=('trim', 'gear'),
    ),
}


def aplicar_tinte(tramo):
    cfg = TRAMOS[tramo]
    metal = set(cfg.get('metal', ()))
    for nombre, v in cfg.items():
        if nombre == 'metal':
            continue
        m = bpy.data.materials.get(nombre)
        if m is None:
            continue
        if isinstance(v, dict):  # emisivos brillo_*
            fg.material(nombre, v['base'], rough=0.4, emit=v['emit'], strength=v['strength'])
        else:
            fg.material(nombre, v, metallic=0.75 if nombre in metal else 0.0,
                        rough=0.35 if nombre in metal else 0.6)


def oro():
    return fg.material('oro_huaca', (0.83, 0.62, 0.20), metallic=0.75, rough=0.35)


def musgo():
    return fg.material('musgo_cueva', (0.12, 0.22, 0.13), rough=0.9)


def hueso_ponzoa():
    return fg.material('hueso_ponzoa', (0.55, 0.62, 0.48), rough=0.6)


def brillo_oro():
    return fg.material('brillo_oro', (0.86, 0.65, 0.22), rough=0.3,
                       emit=(1.0, 0.72, 0.28), strength=1.9)


def limpiar_base(archivo):
    """Importa la base publicada y deja solo la armadura y su Cuerpo."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', f'{archivo}.glb'))
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH' and o.name != 'Cuerpo':
            me = o.data
            bpy.data.objects.remove(o)
            if me.users == 0:
                bpy.data.meshes.remove(me)
    return bpy.context.scene


def anadir_variantes(escena, cuerpo, builder):
    """Une la geometría nueva al Cuerpo conservando sus grupos de vértices."""
    acc = builder.object(escena)
    for vg in acc.vertex_groups:
        if vg.name not in cuerpo.vertex_groups:
            cuerpo.vertex_groups.new(name=vg.name)
    bpy.ops.object.select_all(action='DESELECT')
    acc.select_set(True)
    cuerpo.select_set(True)
    bpy.context.view_layer.objects.active = cuerpo
    bpy.ops.object.join()


# ============================================================
# Piezas nuevas por especie y tramo (coords del mundo del juego:
# rata mira a -Y con cráneo en z 0.5-0.7; guardian cabeza z 1.38 y
# baston propio en -X con punta emisiva arriba; bruto cabeza z 2.0)
# ============================================================
def rata_cueva(b):
    # lomo cubierto de setas de cueva (el dorso real esta en z 0.46-0.54) y
    # barbas de limo bajo la barbilla
    for y, z, r in ((-0.16, 0.56, 0.075), (-0.02, 0.50, 0.06), (0.12, 0.52, 0.05)):
        b.blob((0, y, z), (r, r * 0.9, r * 0.5), musgo(), 'chest' if y < 0 else 'hips', subdiv=1)
        b.tube((0, y, z - r * 0.30), (0, y + 0.01, z - r * 1.1), r * 0.24, r * 0.28,
               hueso_ponzoa(), 'chest' if y < 0 else 'hips', sides=5)
    for x in (-0.05, 0.05):
        b.tube((x, -0.40, 0.36), (x * 1.3, -0.46, 0.20), 0.014, 0.004, musgo(), 'jaw', sides=4)


def rata_huaca(b):
    # gorguera de cuentas de oro, vincha y cuenta frontal emisiva
    for k in range(11):
        a = math.pi * (0.15 + 0.7 * k / 10)
        cx, cz = math.cos(a) * 0.13, -math.sin(a) * 0.10
        b.blob((cx, -0.30, 0.46 + cz), (0.020, 0.020, 0.020), oro(), 'chest', subdiv=1)
    b.tube((-0.10, -0.44, 0.58), (0.10, -0.44, 0.58), 0.013, 0.013, oro(), 'head', sides=5)
    b.blob((0, -0.47, 0.57), (0.026, 0.020, 0.026), brillo_oro(), 'head', subdiv=1)


def guardian_cueva(b):
    # cuernos de carnero retorcidos sobre las sienes y barba de musgo calcificado
    for x in (-1, 1):
        b.tube((x * 0.10, -0.05, 1.30), (x * 0.21, -0.01, 1.44), 0.034, 0.024, hueso_ponzoa(), 'head', sides=6)
        b.tube((x * 0.21, -0.01, 1.44), (x * 0.29, 0.10, 1.34), 0.024, 0.011, hueso_ponzoa(), 'head', sides=6)
    for x in (-0.09, 0.0, 0.09):
        b.tube((x, -0.10, 1.12), (x * 1.4, -0.14, 0.90), 0.020, 0.005, musgo(), 'chest', sides=4)
    for x in (-0.23, 0.23):  # algas de los hombros, pegadas a la hombrera de hueso
        b.tube((x, -0.04, 1.18), (x * 1.04, -0.10, 1.00), 0.014, 0.004, musgo(),
               'upperArmL' if x > 0 else 'upperArmR', sides=4)


def guardian_huaca(b):
    # mascara ritual dorada: banda en la frente (los ojos emisivos quedan libres a
    # z 1.25-1.29), guarda-nariz delgado, tocote alto con punta y pectoral de brasa
    b.box((0, -0.105, 1.36), (0.20, 0.04, 0.06), oro(), 'head')
    b.box((0, -0.145, 1.20), (0.05, 0.02, 0.14), oro(), 'head')
    b.box((0, -0.02, 1.50), (0.22, 0.10, 0.05), oro(), 'head')
    b.box((0, -0.02, 1.64), (0.10, 0.08, 0.24), oro(), 'head')
    b.card([V((-0.02, -0.065, 1.76)), V((0.02, -0.065, 1.76)), V((0.0, -0.065, 2.02))], oro(), 'head')
    b.box((0, -0.185, 1.00), (0.14, 0.03, 0.16), oro(), 'chest')
    b.blob((0, -0.205, 1.00), (0.035, 0.020, 0.035), brillo_oro(), 'chest', subdiv=1)


def bruto_cueva(b):
    # coraza de caparazones de río y púas de hueso en los hombros, musgo en la coronilla
    for x in (-1, 1):
        b.blob((x * 0.42, -0.05, 1.42), (0.16, 0.20, 0.10), hueso_ponzoa(),
               'upperArmL' if x > 0 else 'upperArmR', subdiv=1)
        for k in range(3):
            b.tube((x * 0.42, -0.16 + 0.10 * k, 1.50), (x * 0.47, -0.16 + 0.10 * k, 1.66),
                   0.020, 0.004, hueso_ponzoa(), 'upperArmL' if x > 0 else 'upperArmR', sides=5)
    b.blob((0, 0.02, 1.96), (0.16, 0.20, 0.06), musgo(), 'head', subdiv=1)


def bruto_huaca(b):
    # hombreras de oro repujado con colgantes y corona de puntas de oro
    for x in (-1, 1):
        b.blob((x * 0.44, -0.04, 1.46), (0.18, 0.22, 0.12), oro(),
               'upperArmL' if x > 0 else 'upperArmR', subdiv=1)
        b.tube((x * 0.46, -0.10, 1.36), (x * 0.50, -0.12, 1.16), 0.020, 0.012, oro(),
               'upperArmL' if x > 0 else 'upperArmR', sides=5)
    for k in range(5):
        a = math.pi * (0.1 + 0.8 * k / 4)
        cx = math.cos(a) * 0.18
        b.poly([(cx - 0.030, 0.03, 1.94), (cx + 0.030, 0.03, 1.94), (cx, 0.00, 1.94)],
               [(cx - 0.012, 0.03, 2.06), (cx + 0.012, 0.03, 2.06), (cx, 0.005, 2.12)],
               oro(), 'head')


def main():
    # las seis variantes, cada una exportada en su escena limpia
    for base in BASES:
        for tramo in TRAMOS:
            escena = limpiar_base(base)
            aplicar_tinte(tramo)
            cuerpo = bpy.data.objects['Cuerpo']
            b = fg.Builder('extras')
            {'rata_cueva': rata_cueva, 'rata_huaca': rata_huaca,
             'guardian_cueva': guardian_cueva, 'guardian_huaca': guardian_huaca,
             'bruto_cueva': bruto_cueva, 'bruto_huaca': bruto_huaca}[f'{base[7:]}_{tramo}'](b)
            anadir_variantes(escena, cuerpo, b)
            archivo = f'{base}_{tramo}.glb'
            objs = [o for o in escena.objects if o.type in {'ARMATURE', 'MESH'}]
            fg.export(archivo, escena, objs)
            tri = sum(len(p.vertices) - 2 for p in cuerpo.data.polygons)
            print(f'{archivo}: {tri} triangulos')
            assert tri <= 1500, f'{archivo} fuera de presupuesto: {tri} triangulos'
    # 3) el .blend guarda una muestra por especie (el tramo de oro, el más
    #    caracteristico): seis ramas completas colisionan en nombres de hueso
    escena_blend = fg.reset()
    for base in BASES:
        tramo = 'huaca'
        antes = {o.name for o in bpy.data.objects}
        bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models',
                                                         f'{base}_{tramo}.glb'))
        nuevos = [o for o in bpy.data.objects if o.name not in antes]
        arm = next(o for o in nuevos if o.type == 'ARMATURE')
        cuerpo = next(o for o in nuevos if o.type == 'MESH' and o.parent is arm)
        for o in nuevos:
            if o.type == 'MESH' and o is not cuerpo:
                me = o.data
                bpy.data.objects.remove(o)
                if me.users == 0:
                    bpy.data.meshes.remove(me)
        arm.name = f'{arm.name}_{tramo}'
        cuerpo.name = f'Cuerpo_{base[7:]}_{tramo}'
        for act in list(bpy.data.actions):
            if act.users == 0:
                act.use_fake_user = True
            if not act.name.startswith(f'{base[7:]}_{tramo}_'):
                act.name = f'{base[7:]}_{tramo}_' + act.name
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender',
                                                       'cripta_variantes.blend'), copy=True)
    print('cripta_variantes.blend salvo las tres variantes del tramo de oro, con clips prefijados')


if __name__ == '__main__':
    main()
