# Valida que equipo.glb cubra exactamente las armas y escudos de items.json.
# blender --background --python scripts/blender/validar_equipo.py
import json
import os

import bpy


ROOT = os.path.normpath(os.path.join(os.path.dirname(bpy.path.abspath(__file__)), '..', '..'))
with open(os.path.join(ROOT, 'data', 'rpg', 'items.json'), encoding='utf-8') as stream:
    items = json.load(stream)['items']
expected = {
    f'obj_{item_id}'
    for item_id, item in items.items()
    if item.get('slot') in ('weapon', 'offhand', 'head', 'back')
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', 'models', 'equipo.glb'))
objects = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == 'MESH'}
actual = set(objects)
missing, extra = sorted(expected - actual), sorted(actual - expected)
assert not missing, f'nodos ausentes: {missing}'
assert not extra, f'nodos sobrantes: {extra}'

for name, obj in objects.items():
    item = items[name.removeprefix('obj_')]
    assert len(obj.data.polygons) > 0, f'{name}: malla vacía'
    assert obj.location.length < 1e-5, f'{name}: origen trasladado {tuple(obj.location)}'
    coords = [vertex.co for vertex in obj.data.vertices]
    lo = tuple(min(point[i] for point in coords) for i in range(3))
    hi = tuple(max(point[i] for point in coords) for i in range(3))
    size = tuple(hi[i] - lo[i] for i in range(3))
    assert max(size) < 3.0, f'{name}: escala excesiva {size}'
    assert max(size) > 0.25, f'{name}: escala diminuta {size}'
    if item.get('slot') in ('weapon', 'offhand'):
        assert hi[2] > 0.15, f'{name}: no orientado hacia +Z {lo}..{hi}'
    elif item.get('slot') == 'head':
        assert lo[2] > -0.60 and hi[2] < 0.60, f'{name}: fuera del anclaje de cabeza {lo}..{hi}'
    elif item.get('slot') == 'back':
        assert hi[2] < 0.15 and lo[2] > -1.20, f'{name}: fuera del anclaje de capa {lo}..{hi}'

print(f'equipo.glb válido: {len(objects)} nodos, IDs exactos, origen común y escala real')
