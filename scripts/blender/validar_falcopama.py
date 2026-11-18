# Valida assets/models/falcopama.glb (MOD-02a) contra el contrato de monturas: clips exactos,
# anclajes sobre la silla, coste ≤ 18 000 triángulos, piel con pesos y UV, apoyo en el suelo de
# los clips de tierra, altura de montura y materiales por región montura_<region>.
# Copia las comprobaciones de validar_crestalba.py y validar_aguila_arpia.py.
# Blender -b --factory-startup --python scripts/blender/validar_falcopama.py
import json
import os

import bpy

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
CLIPS = {'idle_ground', 'walk', 'run', 'takeoff', 'fly_idle', 'fly_forward', 'land'}
BONES = {'hips', 'chest', 'neck', 'head', 'tail', 'tailTip',
         'wing_L', 'wing_R', 'wingTip_L', 'wingTip_R', 'thigh_L', 'thigh_R',
         'shin_L', 'shin_R', 'foot_L', 'foot_R'}
palette = json.load(open(os.path.join(ROOT, 'data', 'art', 'crestalba_variantes.json'),
                         encoding='utf-8'))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'falcopama.glb'))
objs = bpy.context.scene.objects
names = {o.name for o in objs}
arm = next(o for o in objs if o.type == 'ARMATURE')
mesh = next(o for o in objs if o.type == 'MESH' and o.name.startswith('falcopama'))
actions = {a.name for a in bpy.data.actions}
fails = []
if not CLIPS <= actions:
    fails.append(f'clips ausentes: {sorted(CLIPS - actions)}')
extra = {a for a in actions if a not in CLIPS}
if extra:
    fails.append(f'clips fuera de contrato: {sorted(extra)}')
if not {'mount_seat', 'rider_root'} <= names:
    fails.append('faltan anclajes de montura')
if not BONES <= {b.name for b in arm.data.bones}:
    fails.append(f'huesos ausentes: {sorted(BONES - {b.name for b in arm.data.bones})}')
tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
if tris > 18000:
    fails.append(f'triángulos {tris} > 18000')
if not mesh.data.uv_layers:
    fails.append('sin UV')
unweighted = sum(1 for v in mesh.data.vertices if not any(g.weight > 0 for g in v.groups))
if unweighted:
    fails.append(f'{unweighted} vértices sin peso')
regions = {f'montura_{r}' for r in palette['regiones']}
missing = regions - {m.name.split('.')[0] for m in mesh.data.materials if m}
if missing:
    fails.append(f'regiones de material ausentes: {sorted(missing)}')

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
lo, hi = min(zs), max(zs)
if not (1.75 <= hi <= 2.25):
    fails.append(f'altura fuera de contrato: {hi:.2f} m')
seat = next(o for o in objs if o.name == 'rider_root').matrix_world.translation
if not (1.30 <= seat.z <= 1.55 and abs(seat.x) < 0.02):
    fails.append(f'silla fuera de contrato: {tuple(round(c, 3) for c in seat)}')
print('VALIDACION falcopama.glb')
print(f'  {tris} triángulos, huesos {len(arm.data.bones)}, '
      f'materiales {sorted({m.name for m in mesh.data.materials if m})}')
print(f'  altura {hi:.2f} m, apoyo {lo:+.3f}, silla z={seat.z:.2f} x={seat.x:+.3f}')
for r in report:
    print('  ' + r)
print('  RESULTADO:', 'OK' if not fails else 'FALLA')
for f in fails:
    print('  - ' + f)
if fails:
    raise SystemExit(1)
