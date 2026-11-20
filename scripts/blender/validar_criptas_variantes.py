# Valida OMP-FA-03 (variantes de la cripta por tramo) reimportando los GLB.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/validar_criptas_variantes.py
# Comprueba por especie: las dos variantes con el MISMO esqueleto (nombres de
# hueso), los MISMOS clips que la base publicada (lista exacta, sin sufijos de
# Blender), ≤1500 triángulos, apoyo en z≈0 y los materiales emisivos del tramo
# con fuerza de brillo encendida. El Icosphere invisible que el importador de
# glTF crea como forma de exibición de los huesos se ignora: no está en el
# archivo (los nodos del JSON son solo la armadura, los huesos y 'Cuerpo').
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))

BASE_CLIPS = {
    'cripta_rata': {'Atacar', 'Caminar', 'Correr', 'Golpeado', 'Morir', 'Reposo'},
    'cripta_guardian': {'Atacar', 'Caminar', 'Correr', 'Golpeado', 'Lanzar', 'Morir', 'Reposo', 'Rodar'},
    'cripta_bruto': {'Atacar', 'Caminar', 'Correr', 'Golpeado', 'Morir', 'Reposo', 'Rodar', 'Terremoto'},
}
# el brillo de un tramo debe verse en la oscuridad y superar al de la base
# (pico 1,36): exigimos pico = fuerza × canal máximo del color emisivo
EMISIVOS = {'cueva': 1.6, 'huaca': 1.8}


def informe(archivo):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', f'{archivo}.glb'))
    arm = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    assert len(arm) == 1, f'{archivo}: {len(arm)} esqueletos'
    arm = arm[0]
    formas = {pb.custom_shape for pb in arm.pose.bones}  # exibición, no geometría
    cuerpos = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name == 'Cuerpo']
    assert len(cuerpos) == 1, f"{archivo}: falta la malla 'Cuerpo'"
    cuerpo = cuerpos[0]
    assert cuerpo.parent is arm, f'{archivo}: Cuerpo no ligado al esqueleto'

    deps = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(cuerpo.evaluated_get(deps))
    pts = [cuerpo.matrix_world @ Vector(v.co) for v in me.vertices]
    tri = sum(len(p.vertices) - 2 for p in me.polygons)
    bpy.data.meshes.remove(me)

    clips = {t.strips[0].action.name for t in arm.animation_data.nla_tracks if t.strips}
    huesos = {b.name for b in arm.data.bones}
    emis = {}
    for s in cuerpo.material_slots:
        if s.material.name.startswith('brillo'):
            bsdf = s.material.node_tree.nodes.get('Principled BSDF')
            fuerza = bsdf.inputs['Emission Strength'].default_value
            color = bsdf.inputs['Emission Color'].default_value
            emis[s.material.name] = fuerza * max(color[0], color[1], color[2])
    return arm.name, huesos, tri, clips, min(p.z for p in pts), emis


for base, clips_base in BASE_CLIPS.items():
    _, huesos_ref, _, clips_ref, _, _ = informe(base)
    for tramo, minimo in EMISIVOS.items():
        nombre, huesos, tri, clips, zmin, emis = informe(f'{base}_{tramo}')
        assert huesos == huesos_ref, f'{base}_{tramo}: cambió el esqueleto respecto de la base'
        assert clips == clips_ref, \
            f'{base}_{tramo}: clips {sorted(clips)} != {sorted(clips_ref)}'
        assert tri <= 1500, f'{base}_{tramo}: {tri} triángulos (límite 1500)'
        assert -0.02 <= zmin <= 0.05, f'{base}_{tramo}: no apoya en el suelo ({zmin:.3f})'
        assert emis, f'{base}_{tramo}: sin materiales de brillo'
        assert all(v >= minimo for v in emis.values()), \
            f'{base}_{tramo}: brillo flojo { {k: round(v, 1) for k, v in emis.items()} }'
        print(f'{base}_{tramo}.glb OK: {tri} tri, {len(clips)} clips, '
              f'{nombre}, apoyo {zmin:.3f}, brillo { {k: round(v, 1) for k, v in emis.items()} }')
