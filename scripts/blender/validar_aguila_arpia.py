# Valida assets/models/aguila_arpia.glb (MOD-01) contra el contrato de monturas: clips, anclajes,
# coste, piel, UV y apoyo en el suelo de los clips de tierra.
# Blender -b --factory-startup --python scripts/blender/validar_aguila_arpia.py
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
CLIPS = {'idle_ground', 'walk', 'run', 'takeoff', 'fly_idle', 'fly_forward', 'land'}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'aguila_arpia.glb'))
objs = bpy.context.scene.objects
arm = next(o for o in objs if o.type == 'ARMATURE')
mesh = next(o for o in objs if o.type == 'MESH' and o.name == 'arpia')
names = {o.name for o in objs}
actions = {a.name for a in bpy.data.actions}
fails = []
if not CLIPS <= actions:
    fails.append(f'clips ausentes: {sorted(CLIPS - actions)}')
if not {'mount_seat', 'rider_root'} <= names:
    fails.append('faltan anclajes')
tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
if tris > 18000:
    fails.append(f'triángulos {tris} > 18000')
if not mesh.data.uv_layers:
    fails.append('sin UV')
unweighted = sum(1 for v in mesh.data.vertices if not any(g.weight > 0 for g in v.groups))
if unweighted:
    fails.append(f'{unweighted} vértices sin peso')
mats = [m.name for m in mesh.data.materials]
imgs = [i.name for i in bpy.data.images]
arm.animation_data_create()
for t in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(t)
report = []
for clip in sorted(CLIPS & actions):
    act = bpy.data.actions[clip]
    arm.animation_data.action = act
    if hasattr(arm.animation_data, 'action_slot') and act.slots:
        arm.animation_data.action_slot = act.slots[0]
    f0, f1 = (int(x) for x in act.frame_range)
    lo = 1e9
    for f in range(f0, f1 + 1, 2):
        bpy.context.scene.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        ev = mesh.evaluated_get(dg)
        me = ev.to_mesh()
        lo = min(lo, min((mesh.matrix_world @ v.co).z for v in me.vertices))
        ev.to_mesh_clear()
    report.append(f'{clip}: {f1 - f0 + 1} fotogramas, z mínima {lo:+.3f}')
    if clip in ('idle_ground', 'walk', 'run') and not (-0.06 <= lo <= 0.05):
        fails.append(f'{clip}: no apoya en el suelo ({lo:+.3f})')
arm.animation_data.action = bpy.data.actions['idle_ground']
bpy.context.scene.frame_set(1)
dg = bpy.context.evaluated_depsgraph_get()
ev = mesh.evaluated_get(dg)
me = ev.to_mesh()
zs = [(mesh.matrix_world @ v.co).z for v in me.vertices]
ev.to_mesh_clear()
seat = next(o for o in objs if o.name == 'rider_root').matrix_world.translation
print('VALIDACION')
print(f'  {tris} triángulos, huesos {len(arm.data.bones)}, materiales {mats}, imágenes {imgs}')
print(f'  altura {max(zs):.2f} m, apoyo {min(zs):+.3f}, silla z={seat.z:.2f} x={seat.x:+.3f}')
for r in report:
    print('  ' + r)
print('  RESULTADO:', 'OK' if not fails else 'FALLA')
for f in fails:
    print('  - ' + f)
if fails:
    raise SystemExit(1)
