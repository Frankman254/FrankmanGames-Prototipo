# Orquestador del pipeline de animación por personaje.
#   blender --background --python run_pipeline.py -- config/cazador_m.json [--bow] [--cast]
# o desde Blender MCP:
#   import run_pipeline, json
#   cfg = json.load(open('config/cazador_m.json'))
#   print(run_pipeline.run(cfg))
#
# Pasos: importar el GLB de entrada en una escena aislada, comprobar el rig,
# (opcional) reconstruir Disparar/Lanzar desde config y Caminar/Correr con el
# solver de locomoción, reconstruir el stack NLA, exportar GLB + .blend.
# Idempotente: reconstruye desde el clip fuente del config en cada pasada;
# --bow/--cast regeneran esos clips, sin esas banderas se conservan intactos
# (v2 ya revisada). No toca otras escenas.
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else os.getcwd()
sys.path.insert(0, HERE)
import pipeline_core as core       # noqa: E402
import locomotion                  # noqa: E402
import rig_mapping                 # noqa: E402


def _paths(cfg):
    raiz = os.path.dirname(HERE)
    return {k: os.path.normpath(os.path.join(raiz, cfg[k]))
            for k in ('entrada', 'salida', 'blend')}


def run(cfg, bow=False, cast=False, loco=('Caminar', 'Correr')):
    p = _paths(cfg)
    name = cfg['personaje']
    scname = f'Pipe_{name}'
    # limpiar ejecuciones propias
    for old in list(bpy.data.scenes):
        if old.name == scname:
            for o in list(old.objects):
                bpy.data.objects.remove(o, do_unlink=True)
            bpy.data.scenes.remove(old)
    sc = bpy.data.scenes.new(scname)
    bpy.context.window.scene = sc
    bpy.ops.import_scene.gltf(filepath=p['entrada'])
    arm = next(o for o in sc.objects if o.type == 'ARMATURE')
    report = {'personaje': name}
    ok, resuelto, avisos = rig_mapping.check(arm, cfg)
    report['rig'] = {'ok': ok, 'avisos': avisos}
    if not ok:
        return report
    live = [t.name for t in arm.animation_data.nla_tracks]
    report['clips_fuente'] = live
    # Caminar/Correr: solver biomecánico (clavos + cadera resuelta)
    for clip in loco:
        if clip not in live:
            report.setdefault('omitidos', []).append(clip)
            continue
        m = locomotion.rebuild(arm, cfg, clip, report.setdefault('locomotion', {}))
        report[f'{clip}_rebote_pp_cm'] = m['rebote_pp_cm']
    if bow and 'Disparar' in live:
        import bow_animation
        bow_animation.build(arm, cfg, report.setdefault('bow_err', {}))
    if cast and 'Lanzar' in live:
        import casting_animation
        casting_animation.build(arm, cfg, report.setdefault('cast_err', {}))
    # reconstruir NLA con las acciones (posiblemente) nuevas
    bpy.context.scene.frame_set(1)
    arm.animation_data_clear()
    ad = arm.animation_data or arm.animation_data_create()
    for cn in live:
        act = bpy.data.actions.get(cn)
        if act is None:
            continue
        act.use_fake_user = True
        tr = ad.nla_tracks.new()
        tr.name = cn
        tr.strips.new(cn, int(round(act.frame_range[0])), act)
    # exportar solo piel + armazón
    for o in list(sc.objects):
        if o.type not in ('ARMATURE', 'MESH') or o.name.startswith('~') \
                or any('not_exported' in c.name for c in o.users_collection):
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        if o.type in ('ARMATURE', 'MESH'):
            o.hide_set(False)
            o.select_set(True)
    arm.hide_set(False)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    os.makedirs(os.path.dirname(p['salida']), exist_ok=True)
    os.makedirs(os.path.dirname(p['blend']), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=p['blend'])
    with bpy.context.temp_override(scene=sc, view_layer=sc.view_layers[0]):
        bpy.ops.export_scene.gltf(filepath=p['salida'], export_format='GLB',
                                  use_selection=True, export_animations=True,
                                  export_animation_mode='NLA_TRACKS',
                                  export_skins=True, export_yup=True,
                                  export_apply=False, export_materials='EXPORT',
                                  use_active_scene=True)
    report['salida'] = p['salida']
    return report


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    cfgp = next(a for a in argv if not a.startswith('--'))
    c = json.load(open(cfgp))
    print(run(c, bow='--bow' in argv, cast='--cast' in argv))
