# Héroes masculinos sobre una base anime descargada (CC0): «Base Rigged Stylized Humanoid
# Character (YW)» de Girush, OpenGameArt. Registro en PROCEDENCIA.md.
#
# La base no se copia al repositorio: se descarga aparte y se pasa su .blend al generador.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/heroe_anime.py -- --fuente "<ruta>/baseMesh_A1_(human_YW)_by_Girush.blend" [centinela|oraculo|cazador]
#
# Qué hace con la base:
#   1. Baja los brazos de la pose en A a la de reposo del juego y hornea esa pose en la malla.
#   2. Reduce sus 65 huesos a los 16 de `fg_rig.biped_bones` siguiendo la cadena de padres
#      (dedos → mano, clavícula → pecho…), así los clips comunes valen tal cual.
#   3. Construye el esqueleto común en las articulaciones de la base (proporciones anime).
#   4. Viste por zonas con las telas pintadas de cada clase y hornea una textura por pieza.
# Contrato igual que fg_heroe: mira a -Y, pies en z=0, piezas `Cuerpo` y `Pelo`, clips
# Reposo/Caminar/Correr/Rodar/Golpeado/Morir/Atacar/Lanzar (+ Disparar) y gestos.
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

try:
    _HERE = os.path.dirname(bpy.path.abspath(__file__))
except NameError:
    _HERE = r'C:\Users\frank\Desktop\2026\FrankmanGames-Prototipo\scripts\blender'
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import fg
import fg_heroe as H
import fg_rig
from fg_heroe import mat
from fg_rig import p

ALTURA_CABEZA = 1.66  # coronilla sin pelo, como los héroes de fg_heroe
BRAZO_GRADOS = 12     # apertura del brazo en reposo (biped_bones)
OBJETOS = ('Armature', 'body.001', 'baseMesh1_A1.001', 'eye.L', 'eye.R', 'hair')

# Hueso de la base → hueso común. Los que no figuran heredan el de su padre.
MAPA = {'Sacrum': 'hips', 'Sacrum.001': 'hips', 'Spine1': 'hips', 'Spine1.001': 'spine', 'Spine2': 'spine',
        'Spine3': 'chest', 'Spine3.002': 'chest', 'head': 'head'}
for _s in ('L', 'R'):
    MAPA.update({f'Clavicle.{_s}': 'chest', f'Humerus.{_s}': f'upperArm{_s}', f'LowerArm.{_s}': f'foreArm{_s}',
                 f'hand001.{_s}': f'hand{_s}', f'Femur.{_s}': f'thigh{_s}', f'Tibia.{_s}': f'shin{_s}', f'Foot.{_s}': f'foot{_s}'})


def destino(bone):
    while bone is not None:
        if bone.name in MAPA:
            return MAPA[bone.name]
        bone = bone.parent
    return 'hips'


# ------------------------------------------------------------------ clases
def _p_cazador():
    giro = (90, 0, 0)
    return [
        (1, p()),
        (8, p(chest=(0, 0, -16), upperArmL=(-85, 18, 0), foreArmL=(-6, 0, 0), handL=giro, upperArmR=(-70, -20, 0), foreArmR=(-20, 0, 0), thighL=(-12, 0, 0), thighR=(12, 0, 0))),
        (15, p(chest=(0, 0, -30), head=(0, 0, 14), upperArmL=(-90, 26, 0), foreArmL=(0, 0, 0), handL=giro, upperArmR=(-90, -14, 0), foreArmR=(-110, 0, 0), thighL=(-14, 0, 0), thighR=(14, 0, 0))),
        (17, p(chest=(2, 0, -32), head=(0, 0, 14), upperArmL=(-90, 26, 0), foreArmL=(0, 0, 0), handL=giro, upperArmR=(-58, -36, 0), foreArmR=(-30, 0, 0), thighL=(-14, 0, 0), thighR=(14, 0, 0)), (0, 0.02, 0)),
        (26, p()),
    ]


LANZAR = [
    (1, p()),
    (9, p(chest=(-14, 0, 0), head=(-8, 0, 0), upperArmR=(-120, -18, 0), upperArmL=(-120, 18, 0), foreArmR=(-40, 0, 0), foreArmL=(-40, 0, 0)), (0, 0.02, 0)),
    (14, p(chest=(14, 0, 0), head=(6, 0, 0), upperArmR=(-88, -6, 0), upperArmL=(-88, 6, 0), foreArmR=(-6, 0, 0), foreArmL=(-6, 0, 0), thighR=(-18, 0, 0), shinR=(10, 0, 0), thighL=(10, 0, 0), shinL=(10, 0, 0)), (0, -0.04, -0.03)),
    (20, p(chest=(8, 0, 0), upperArmR=(-70, -6, 0), upperArmL=(-70, 6, 0), foreArmR=(-14, 0, 0), foreArmL=(-14, 0, 0))),
    (27, p()),
]

CLASES = {
    # Camisa de lino remangada, pantalón oliva, botas altas y faja coral.
    'centinela': {
        'ropa': {'camisa': ('tela_lino', 0.85), 'pant': ('tela_oliva', 0.85), 'bota': ('cuero_oscuro', 0.7),
                 'brazal': ('cuero_castano', 0.75), 'faja': ('tela_coral', 0.85)},
        'piel': 'c98d66', 'pelo': 'pelo_negro', 'manga': 'corta', 'bota_alta': 0.42, 'brazal': True, 'tunica': 0.0,
        'atacar': [
            (1, p()),
            (7, p(chest=(0, 0, -28), spine=(0, 0, -10), upperArmR=(0, -78, -15), foreArmR=(-10, 0, 0), thighR=(10, 0, 0), thighL=(-10, 0, 0), shinL=(8, 0, 0)), (0, 0.03, -0.01)),
            (11, p(chest=(6, 0, 22), spine=(4, 0, 10), upperArmR=(0, -84, 58), foreArmR=(-6, 0, 0), thighR=(-30, 0, 0), shinR=(18, 0, 0), thighL=(16, 0, 0), shinL=(20, 0, 0)), (0, -0.12, -0.06)),
            (16, p(chest=(4, 0, 18), spine=(2, 0, 8), upperArmR=(0, -80, 52), foreArmR=(-12, 0, 0), thighR=(-24, 0, 0), shinR=(16, 0, 0), thighL=(12, 0, 0), shinL=(16, 0, 0)), (0, -0.1, -0.05)),
            (24, p()),
        ],
        'lanzar': LANZAR,
    },
    # Túnica blanca larga con mangas enteras, faja violeta y calzón de noche.
    'oraculo': {
        'ropa': {'camisa': ('tela_blanca', 0.85), 'pant': ('tela_noche', 0.85), 'bota': ('cuero_castano', 0.7),
                 'brazal': ('tela_turquesa', 0.85), 'faja': ('tela_violeta', 0.85)},
        'piel': 'd9a57c', 'pelo': 'pelo_negro', 'manga': 'larga', 'bota_alta': 0.16, 'brazal': True, 'tunica': 0.62,
        'atacar': [
            (1, p()),
            (8, p(chest=(-12, 0, -16), spine=(-4, 0, -6), head=(-6, 0, 0), upperArmR=(-150, -12, 0), foreArmR=(-35, 0, 0), upperArmL=(-30, 10, 0), thighL=(-8, 0, 0)), (0, 0.03, 0)),
            (13, p(chest=(20, 0, 10), spine=(8, 0, 4), head=(8, 0, 0), upperArmR=(-58, -10, 0), foreArmR=(-6, 0, 0), upperArmL=(-20, 10, 0), thighR=(-26, 0, 0), shinR=(16, 0, 0), thighL=(12, 0, 0), shinL=(14, 0, 0)), (0, -0.08, -0.05)),
            (18, p(chest=(14, 0, 6), spine=(6, 0, 2), upperArmR=(-54, -8, 0), foreArmR=(-12, 0, 0), thighR=(-20, 0, 0), shinR=(14, 0, 0), thighL=(10, 0, 0), shinL=(12, 0, 0)), (0, -0.07, -0.04)),
            (26, p()),
        ],
        'lanzar': [
            (1, p()),
            (8, p(chest=(-10, 0, 0), head=(-14, 0, 0), upperArmR=(-130, -20, 0), upperArmL=(-40, 40, -40), foreArmR=(-20, 0, 0), foreArmL=(-60, 0, 0)), (0, 0.02, 0)),
            (13, p(chest=(-16, 0, 0), head=(-18, 0, 0), upperArmR=(-160, -10, 0), upperArmL=(-80, 30, -30), foreArmR=(-6, 0, 0), foreArmL=(-30, 0, 0)), (0, 0.0, 0.03)),
            (19, p(chest=(12, 0, 0), head=(6, 0, 0), upperArmR=(-95, -6, 0), upperArmL=(-85, 12, 0), foreArmR=(-8, 0, 0), foreArmL=(-8, 0, 0), thighR=(-14, 0, 0), shinR=(8, 0, 0))),
            (27, p()),
        ],
    },
    # Camisa arena, chaleco de cuero, pantalón carbón, botas y vendas en las muñecas.
    'cazador': {
        'ropa': {'camisa': ('tela_arena', 0.85), 'pant': ('tela_carbon', 0.85), 'bota': ('cuero_oscuro', 0.7),
                 'brazal': ('tela_lino', 0.9), 'faja': ('tela_musgo', 0.85), 'chaleco': ('cuero_oscuro', 0.75)},
        'piel': '9a6544', 'pelo': 'pelo_negro', 'manga': 'corta', 'bota_alta': 0.4, 'brazal': True, 'tunica': 0.0, 'chaleco': True,
        'atacar': [
            (1, p()),
            (7, p(chest=(0, 0, 26), spine=(0, 0, 10), upperArmL=(-40, 60, 30), foreArmL=(-30, 0, 0), thighL=(-10, 0, 0), thighR=(8, 0, 0))),
            (12, p(chest=(6, 0, -24), spine=(2, 0, -10), upperArmL=(-80, -30, -20), foreArmL=(-6, 0, 0), thighL=(-24, 0, 0), shinL=(14, 0, 0), thighR=(12, 0, 0), shinR=(12, 0, 0)), (0, -0.08, -0.04)),
            (17, p(chest=(4, 0, -18), spine=(2, 0, -6), upperArmL=(-70, -24, -16), foreArmL=(-12, 0, 0), thighL=(-18, 0, 0), shinL=(12, 0, 0), thighR=(10, 0, 0), shinR=(10, 0, 0)), (0, -0.06, -0.03)),
            (24, p()),
        ],
        'lanzar': LANZAR,
        'extra': {'Disparar': _p_cazador()},
    },
}


# ------------------------------------------------------------------ base
def cargar(scene, fuente):
    with bpy.data.libraries.load(fuente, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n in OBJETOS]
    objs = {}
    for o in dst.objects:
        scene.collection.objects.link(o)
        objs[o.name.split('.0')[0] if o.name.startswith(('body', 'baseMesh')) else o.name] = o
    carpeta = os.path.dirname(fuente)
    for im in bpy.data.images:
        if im.filepath:
            im.filepath = os.path.join(carpeta, os.path.basename(im.filepath.replace('\\', '/')))
            im.reload()
    return objs


def bajar_brazos(arm):
    if arm.animation_data:
        arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    arm.data.pose_position = 'POSE'
    for s, k in (('L', 1), ('R', -1)):
        pb = arm.pose.bones[f'Humerus.{s}']
        a = arm.matrix_world @ arm.data.bones[f'Humerus.{s}'].head_local
        b = arm.matrix_world @ arm.data.bones[f'LowerArm.{s}'].head_local
        cur = (b - a).normalized()
        tgt = Vector((math.sin(math.radians(BRAZO_GRADOS)) * k, 0, -math.cos(math.radians(BRAZO_GRADOS))))
        R = (arm.matrix_world @ pb.bone.matrix_local).to_quaternion()
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = R.inverted() @ cur.rotation_difference(tgt) @ R
    bpy.context.view_layer.update()


def cocer(scene, o, arm, T):
    """Malla con la pose y los modificadores aplicados, en metros, con pesos de los 16 huesos."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    me.transform(T @ o.matrix_world)
    nuevo = bpy.data.objects.new(o.name + '_cocido', me)
    scene.collection.objects.link(nuevo)
    nombres = [vg.name for vg in o.vertex_groups]
    pesos = [dict() for _ in me.vertices]
    for v in me.vertices:
        for g in v.groups:
            if g.group >= len(nombres) or g.weight <= 0:
                continue
            b = arm.data.bones.get(nombres[g.group])
            if b is None or not b.use_deform:
                continue
            t = destino(b)
            pesos[v.index][t] = pesos[v.index].get(t, 0.0) + g.weight
    for vg in list(nuevo.vertex_groups):
        nuevo.vertex_groups.remove(vg)
    grupos = {}
    for v, d in enumerate(pesos):
        if not d:
            d = {'head' if o.name.startswith(('eye', 'hair', 'baseMesh')) else 'hips': 1.0}
        tot = sum(d.values())
        for t, w in sorted(d.items(), key=lambda kv: -kv[1])[:4]:
            g = grupos.get(t) or nuevo.vertex_groups.new(name=t)
            grupos[t] = g
            g.add([v], w / tot, 'REPLACE')
    if me.uv_layers:
        me.uv_layers[0].name = 'UVMap'
        for extra in list(me.uv_layers)[1:]:
            me.uv_layers.remove(extra)
    return nuevo


def articulaciones(arm, T):
    pos = {pb.name: T @ (arm.matrix_world @ pb.head) for pb in arm.pose.bones}

    def j(n):
        return pos[n].copy()
    j.tiene = pos.__contains__
    return j


def huesos(j):
    """El esqueleto común colocado en las articulaciones de la base."""
    fem = (j('Femur.L') + j('Femur.R')) / 2
    cad = Vector((0, fem.y, fem.z))
    col = j('Spine1.001')
    pec = j('Spine3')
    cue = j('head')
    bones = [
        ('hips', None, tuple(cad), tuple(Vector((0, col.y, col.z)))),
        ('spine', 'hips', tuple(Vector((0, col.y, col.z))), tuple(Vector((0, pec.y, pec.z)))),
        ('chest', 'spine', tuple(Vector((0, pec.y, pec.z))), tuple(Vector((0, cue.y, cue.z)))),
        ('head', 'chest', tuple(Vector((0, cue.y, cue.z))), tuple(Vector((0, cue.y, cue.z + 0.2)))),
    ]
    for s in ('L', 'R'):
        mano = j(f'hand001.{s}')
        pie = j(f'Foot.{s}')
        punta = j(f'Foot.{s}.001') if j.tiene(f'Foot.{s}.001') else pie + Vector((0, -0.12, -0.06))
        bones += [
            (f'upperArm{s}', 'chest', tuple(j(f'Humerus.{s}')), tuple(j(f'LowerArm.{s}'))),
            (f'foreArm{s}', f'upperArm{s}', tuple(j(f'LowerArm.{s}')), tuple(mano)),
            # Misma dirección que biped_bones: las armas de equipo.glb cuelgan de este hueso.
            (f'hand{s}', f'foreArm{s}', tuple(mano), tuple(mano + Vector((0, -0.02, -0.08)))),
            (f'thigh{s}', 'hips', tuple(j(f'Femur.{s}')), tuple(j(f'Tibia.{s}'))),
            (f'shin{s}', f'thigh{s}', tuple(j(f'Tibia.{s}')), tuple(pie)),
            (f'foot{s}', f'shin{s}', tuple(pie), tuple(punta)),
        ]
    return bones


arm_global = None


# ------------------------------------------------------------------ piel
PIEL_BASE = (165, 95, 68)  # tono medio de las texturas pintadas de la base


def piel(nombre, imagen, hexa):
    """La textura pintada de la base teñida al tono de piel de la clase."""
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    t = m.node_tree
    bsdf = next(n for n in t.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.6
    tex = t.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(imagen, check_existing=True)
    mul = t.nodes.new('ShaderNodeVectorMath')
    mul.operation = 'MULTIPLY'
    c = [int(hexa[i:i + 2], 16) for i in (0, 2, 4)]
    mul.inputs[1].default_value = [c[i] / PIEL_BASE[i] for i in range(3)]
    t.links.new(tex.outputs['Color'], mul.inputs[0])
    t.links.new(mul.outputs['Vector'], bsdf.inputs['Base Color'])
    return m


def ojos(nombre, imagen):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    t = m.node_tree
    bsdf = next(n for n in t.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.25
    tex = t.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(imagen, check_existing=True)
    t.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def poner(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)
    for poly in o.data.polygons:
        poly.material_index = 0


# ------------------------------------------------------------------ ropa
def vestir(cuerpo, cfg, nombre, j):
    me = cuerpo.data
    piel = me.materials[0] if me.materials else None
    mats = {'piel': piel}
    for clave, (tex, rough) in cfg['ropa'].items():
        mats[clave] = mat(f'{nombre}_{clave}', tex, rough=rough, doble=True)
    me.materials.clear()
    orden = list(mats)
    for m in mats.values():
        me.materials.append(m)
    idx = {k: i for i, k in enumerate(orden)}
    names = [g.name for g in cuerpo.vertex_groups]
    rodilla = (j('Tibia.L').z + j('Tibia.R').z) / 2
    cintura = j('Spine1.001').z - 0.03
    cuello = j('Spine3.002').z - 0.01
    codo = (j('LowerArm.L').z + j('LowerArm.R').z) / 2
    muneca = (j('hand001.L').z + j('hand001.R').z) / 2
    bota = cfg['bota_alta'] * rodilla / 0.48
    for poly in me.polygons:
        c = poly.center
        acc = {}
        for vi in poly.vertices:
            for g in me.vertices[vi].groups:
                acc[names[g.group]] = acc.get(names[g.group], 0) + g.weight
        b = max(acc, key=acc.get) if acc else 'hips'
        z = c.z
        if b == 'head' or (z > cuello and abs(c.x) < 0.075) or b.startswith('hand'):
            zona = 'piel'
        elif b.startswith('foot') or (b.startswith('shin') and z < bota):
            zona = 'bota'
        elif cfg['tunica'] and b.startswith(('hips', 'thigh')) and z > cfg['tunica']:
            zona = 'camisa'
        elif b.startswith(('thigh', 'shin')) or (b == 'hips' and z < cintura):
            zona = 'pant'
        elif b == 'hips' or (b == 'spine' and z < cintura + 0.05):
            zona = 'faja'
        elif b.startswith('foreArm'):
            if cfg['manga'] == 'larga':
                zona = 'brazal' if z < muneca + 0.06 else 'camisa'
            else:
                zona = 'brazal' if cfg['brazal'] and z < muneca + 0.07 else 'piel'
        elif b.startswith('upperArm') and cfg['manga'] == 'corta' and z < codo + 0.07:
            zona = 'piel'
        elif cfg.get('chaleco') and b in ('chest', 'spine') and abs(c.x) > 0.035:
            zona = 'chaleco'
        else:
            zona = 'camisa'
        poly.material_index = idx[zona]


def construir(clase, fuente):
    global arm_global
    cfg = CLASES[clase]
    nombre = f'{clase}_anime'
    scene = fg.fresh_scene(f'FG_{nombre}')
    objs = cargar(scene, fuente)
    arm = arm_global = objs['Armature']
    bajar_brazos(arm)
    # Escala: coronilla (sin pelo) a ALTURA_CABEZA; pies en z=0.
    cab = objs['baseMesh1_A1']
    dg = bpy.context.evaluated_depsgraph_get()
    zs_cab = [(cab.matrix_world @ v.co).z for v in cab.evaluated_get(dg).to_mesh().vertices]
    body = objs['body']
    zs_pie = [(body.matrix_world @ v.co).z for v in body.evaluated_get(dg).to_mesh().vertices]
    s = ALTURA_CABEZA / (max(zs_cab) - min(zs_pie))
    T = Matrix.Translation((0, 0, -min(zs_pie) * s)) @ Matrix.Scale(s, 4)
    j = articulaciones(arm, T)
    bones = huesos(j)

    piezas = {n: cocer(scene, objs[n], arm, T) for n in ('body', 'baseMesh1_A1', 'eye.L', 'eye.R', 'hair')}
    for n in ('body', 'baseMesh1_A1', 'eye.L', 'eye.R', 'hair'):
        bpy.data.objects.remove(objs[n])
    bpy.data.objects.remove(arm)

    rig = fg_rig.Rig(scene, f'FG_{nombre}', bones)
    # La base trae materiales sin imagen: se ponen sus texturas pintadas, teñidas por clase.
    carpeta = os.path.dirname(fuente)
    poner(piezas['body'], piel(f'{nombre}_piel', os.path.join(carpeta, 'baseMesh_A1_body.png'), cfg['piel']))
    poner(piezas['baseMesh1_A1'], piel(f'{nombre}_cara', os.path.join(carpeta, 'baseMesh_A1_face.png'), cfg['piel']))
    ojo = ojos(f'{nombre}_ojo', os.path.join(carpeta, 'black_eye.png'))
    poner(piezas['eye.L'], ojo)
    poner(piezas['eye.R'], ojo)
    vestir(piezas['body'], cfg, nombre, j)
    # Pelo con la textura pintada del juego.
    pelo = piezas['hair']
    pelo.data.materials.clear()
    pelo.data.materials.append(mat(f'{nombre}_pelo', cfg['pelo'], rough=0.6, doble=True))

    # Cuerpo = cuerpo + cabeza + ojos.
    bpy.ops.object.select_all(action='DESELECT')
    for n in ('body', 'baseMesh1_A1', 'eye.L', 'eye.R'):
        piezas[n].select_set(True)
    bpy.context.view_layer.objects.active = piezas['body']
    bpy.ops.object.join()
    cuerpo = piezas['body']
    cuerpo.name = cuerpo.data.name = 'Cuerpo'
    pelo.name = pelo.data.name = 'Pelo'
    for o in (cuerpo, pelo):
        o.parent = rig.obj
        o.modifiers.new('Huesos', 'ARMATURE').object = rig.obj
    rig.parts = [cuerpo, pelo]

    fg_rig.biped_clips(rig)
    fg_rig.biped_emote_clips(rig)
    rig.clip('Atacar', cfg['atacar'])
    rig.clip('Lanzar', cfg['lanzar'])
    for n, keys in cfg.get('extra', {}).items():
        rig.clip(n, keys)

    cab_c = (j('head') + Vector((0, 0, (ALTURA_CABEZA - j('head').z) / 2)))
    print(f'{nombre}: escala {s:.5f}, cuello {j("head").z:.3f}, centro de cabeza {tuple(round(v, 3) for v in cab_c)}, coronilla {ALTURA_CABEZA}')
    return scene, rig, nombre, cuerpo, pelo


class _Horno:
    def __init__(self, scene, nombre):
        self.scene = scene
        self.nombre = nombre


def exportar(scene, rig, nombre, cuerpo, pelo, archivo):
    horno = _Horno(scene, nombre)
    H.Heroe.hornear(horno, cuerpo, 2048)
    H.Heroe.hornear(horno, pelo, 1024)
    rig.export(archivo, imagenes='JPEG')


def main(argv):
    fuente = argv[argv.index('--fuente') + 1] if '--fuente' in argv else os.environ.get('FG_BASE_YW', '')
    if not os.path.exists(fuente):
        raise SystemExit('Falta --fuente <ruta al .blend de la base YW> (ver cabecera)')
    clases = [a for a in argv if a in CLASES] or list(CLASES)
    for clase in clases:
        scene, rig, nombre, cuerpo, pelo = construir(clase, fuente)
        if '--sin-exportar' in argv:
            continue
        exportar(scene, rig, nombre, cuerpo, pelo, f'{clase}_anime.glb')


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
