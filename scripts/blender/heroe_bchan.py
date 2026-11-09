# Heroínas sobre una base anime descargada (CC0): «Blender-chan (B-chan)» de AmarilloArts,
# publicada en OpenGameArt. Registro en PROCEDENCIA.md.
#
# La base no se copia al repositorio: se descarga aparte y se pasa su .blend al generador,
# junto con la base masculina (heroe_anime.py), de la que toma el peinado corto.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/heroe_bchan.py -- --fuente "<ruta>/bchan.blend" --fuente-yw "<ruta>/baseMesh_A1_(human_YW)_by_Girush.blend" [centinela|oraculo|cazador]
#
# Qué hace con la base:
#   1. Deja fuera los adornos con su marca (campana, rosquillas, gafas, cola, cubos…).
#   2. Cuece las mallas en reposo, sin subdivisión, y reduce sus huesos a los 16 comunes.
#   3. Baja los brazos de la pose en A girando lo que pesa en cada brazo sobre su hombro.
#   4. Arma las piezas personalizables de heroe_piezas.py: piel, ropa, ropa 2, calzado,
#      cuatro caras (formas de ojos y cejas) y tres peinados.
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
import fg_rig
import heroe_anime as A
import heroe_piezas as P
from fg_heroe import liso, mat

ALTURA_CABEZA = 1.60
RIG = 'BChan Rig_rig'
CUERPO = ('Body Top', 'Body Bottom')
ROPA = ('Leotard Reddit-Safe',)
ROPA2 = ('Skirt', 'Tights')
CALZADO = ('Boots_ThighHighs', 'Gloves', 'Belt', 'Choker')
CARA = ('Eyes_Rigged', 'Eyebrows', 'Eyelashes')
PELO = ('Hair Main', 'Hair Rigged', 'Hair Bun')
OBJETOS = CUERPO + ROPA + ROPA2 + CALZADO + CARA + PELO
CABEZA = set(CARA + PELO)
# Piezas pesadas que se aligeran (proporción de triángulos que se queda).
DIEZMO = {'Hair Rigged': 0.12, 'Gloves': 0.3, 'Eyes_Rigged': 0.35, 'Boots_ThighHighs': 0.6, 'Leotard Reddit-Safe': 0.7, 'Body Top': 0.8}
PELO_MAX = 4000  # triángulos por peinado
# Variantes de cara: valores de las formas de ojos y cejas de la base.
CARAS = [
    {},
    {'Narrow': 1.0},
    {'Eyebrows Fierce': 1.0},
    {'Small': 0.6, 'Eyebrows Fierce': 0.5},
]

# Texturas de cada clase (neutras al hornear las que se tiñen; el color lo pone el juego).
CLASES = {
    'centinela': {'ropa': 'tela_lino', 'ropa2': 'tela_oliva', 'bota': 'cuero_oscuro', 'guante': 'cuero_castano', 'cinto': 'cuero_castano'},
    'oraculo': {'ropa': 'tela_blanca', 'ropa2': 'tela_bruma', 'bota': 'cuero_castano', 'guante': 'tela_turquesa', 'cinto': 'tela_violeta'},
    'cazador': {'ropa': 'tela_arena', 'ropa2': 'tela_carbon', 'bota': 'cuero_oscuro', 'guante': 'cuero_oscuro', 'cinto': 'tela_musgo'},
}


def comun(nombre, x):
    """Hueso de la base → hueso común (el lado sale de la posición: la base se espeja)."""
    n = nombre.lower()
    s = 'L' if x >= 0 else 'R'
    if n.startswith(('root', 'butt')):
        return 'hips'
    if n.startswith('spine_01'):
        return 'spine'
    if n.startswith(('spine_02', 'boob', 'shoulder', 'neck')):
        return 'chest'
    if n.startswith(('head', 'bun', 'bone_eye')):
        return 'head'
    if 'forearm' in n:
        return f'foreArm{s}'
    if 'arm' in n:
        return f'upperArm{s}'
    if n.startswith('hand') or any(d in n for d in ('thumb', 'index', 'middle', 'ring', 'pinky')):
        return f'hand{s}'
    if 'thigh' in n:
        return f'thigh{s}'
    if n.startswith('leg'):
        return f'shin{s}'
    if n.startswith(('foot', 'toes')):
        return f'foot{s}'
    return None


def cargar(scene, fuente):
    with bpy.data.libraries.load(fuente, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n in OBJETOS]
    for o in list(bpy.data.objects):
        if not o.users_scene:
            scene.collection.objects.link(o)
    for o in bpy.data.objects:
        if o.type == 'ARMATURE':
            o.data.pose_position = 'REST'
        for m in o.modifiers:
            if m.type == 'SUBSURF':
                m.levels = 0
            elif m.type == 'MULTIRES':
                m.levels = min(m.levels, 1)
    bpy.context.view_layer.update()
    return {n: bpy.data.objects[n] for n in OBJETOS}


def cocer(scene, o, T, nombre=None):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    me.transform(T @ o.matrix_world)
    nuevo = bpy.data.objects.new(nombre or (o.name + '_cocido'), me)
    scene.collection.objects.link(nuevo)
    grupos_o = [vg.name for vg in o.vertex_groups]
    pesos = []
    for v in me.vertices:
        d = {}
        for g in v.groups:
            if g.group >= len(grupos_o) or g.weight <= 0:
                continue
            t = comun(grupos_o[g.group], v.co.x)
            if t:
                d[t] = d.get(t, 0.0) + g.weight
        pesos.append(d)
    grupos = {}
    for v, d in enumerate(pesos):
        if not d:
            d = {'head' if o.name in CABEZA else 'hips': 1.0}
        tot = sum(d.values())
        for t, w in sorted(d.items(), key=lambda kv: -kv[1])[:4]:
            g = grupos.get(t) or nuevo.vertex_groups.new(name=t)
            grupos[t] = g
            g.add([v], w / tot, 'REPLACE')
    P.asegurar_uv(nuevo)
    return nuevo


def quitar_material(o, nombre):
    import bmesh
    idx = [i for i, m in enumerate(o.data.materials) if m and m.name.startswith(nombre)]
    if not idx:
        return
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in idx], context='FACES')
    bm.to_mesh(o.data)
    bm.free()


def recoger_falda(o, centro, bajo=0.55):
    """Estrecha la falda hacia el bajo: arriba queda igual, el bajo a `bajo` de su vuelo."""
    zs = [v.co.z for v in o.data.vertices]
    top, bot = max(zs), min(zs)
    for v in o.data.vertices:
        t = (top - v.co.z) / (top - bot)
        k = 1 - (1 - bajo) * t ** 0.8
        v.co.x = centro.x + (v.co.x - centro.x) * k
        v.co.y = centro.y + (v.co.y - centro.y) * k


def piel_vertices(nombre):
    """La piel con el color por vértice de la base (rubor, labios, uñas)."""
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    t = m.node_tree
    bsdf = next(n for n in t.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.6
    at = t.nodes.new('ShaderNodeAttribute')
    at.attribute_name = 'Color'
    t.links.new(at.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def articulaciones(T):
    rig = bpy.data.objects[RIG]
    pos = {b.name: T @ (rig.matrix_world @ b.head_local) for b in rig.data.bones}
    return lambda n: pos[n].copy()


def huesos(j):
    cad = (j('thigh_twist.l') + j('thigh_twist.r')) / 2
    col, pec, cue = j('spine_01.x'), j('spine_02.x'), j('head.x')
    v = lambda p: tuple(Vector((0, p.y, p.z)))
    bones = [
        ('hips', None, v(cad), v(col)),
        ('spine', 'hips', v(col), v(pec)),
        ('chest', 'spine', v(pec), v(cue)),
        ('head', 'chest', v(cue), tuple(Vector((0, cue.y, cue.z + 0.2)))),
    ]
    for s, b in (('L', 'l'), ('R', 'r')):
        mano = j(f'hand.{b}')
        bones += [
            (f'upperArm{s}', 'chest', tuple(j(f'c_arm_twist_offset.{b}')), tuple(j(f'forearm_stretch.{b}'))),
            (f'foreArm{s}', f'upperArm{s}', tuple(j(f'forearm_stretch.{b}')), tuple(mano)),
            (f'hand{s}', f'foreArm{s}', tuple(mano), tuple(mano + Vector((0, -0.02, -0.08)))),
            (f'thigh{s}', 'hips', tuple(j(f'thigh_twist.{b}')), tuple(j(f'leg_stretch.{b}'))),
            (f'shin{s}', f'thigh{s}', tuple(j(f'leg_stretch.{b}')), tuple(j(f'foot.{b}'))),
            (f'foot{s}', f'shin{s}', tuple(j(f'foot.{b}')), tuple(j(f'toes_01.{b}'))),
        ]
    return bones


def escala(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    zs = []
    top = -1e9
    for o in objs:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        z = [(o.matrix_world @ v.co).z for v in me.vertices]
        zs += z
        if o.name == 'Body Top':
            top = max(z)
        ev.to_mesh_clear()
    s = ALTURA_CABEZA / (top - min(zs))
    return Matrix.Translation((0, 0, -min(zs) * s)) @ Matrix.Scale(s, 4), s


def cara(scene, objs, T):
    """Cuatro caras: las formas de ojos y cejas de la base, cocidas y apartadas para hornearlas juntas."""
    cejas = liso('bchan_cejas', '3a2418', rough=0.7)
    copias = []
    for k, formas in enumerate(CARAS):
        for n in CARA:
            o = objs[n]
            if o.data.shape_keys:
                for kb in o.data.shape_keys.key_blocks[1:]:
                    kb.value = formas.get(kb.name, 0.0)
        bpy.context.view_layer.update()
        trozos = [cocer(scene, objs[n], T, f'cara{k}_{n}') for n in CARA]
        quitar_material(trozos[0], 'Eye_Cornea')
        P.material_unico(trozos[1], cejas)
        P.diezmar(trozos[0], DIEZMO['Eyes_Rigged'])
        for t in trozos:
            P.apartar(t, k)
        copias += trozos
    return P.unir(scene, copias, 'Cara')


def pelo_bchan(scene, fuente):
    """Melena y moño de la base, con la caja de su cabeza, en coordenadas de la base."""
    antes = set(bpy.data.objects)
    with bpy.data.libraries.load(fuente, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n in PELO + ('Body Top',)]
    for o in list(bpy.data.objects):
        if not o.users_scene:
            scene.collection.objects.link(o)
    for o in bpy.data.objects:
        if o.type == 'ARMATURE':
            o.data.pose_position = 'REST'
        for m in o.modifiers:
            if m.type == 'SUBSURF':
                m.levels = 0
            elif m.type == 'MULTIRES':
                m.levels = min(m.levels, 1)
    bpy.context.view_layer.update()
    rig = bpy.data.objects[RIG]
    cuello = (rig.matrix_world @ rig.data.bones['head.x'].head_local).z
    cuerpo = cocer(scene, bpy.data.objects['Body Top'], Matrix())
    caja = P.cabeza([v.co for v in cuerpo.data.vertices], cuello)
    mechas = cocer(scene, bpy.data.objects['Hair Rigged'], Matrix(), 'pelo_mechas')
    P.diezmar(mechas, DIEZMO['Hair Rigged'])
    mel = P.unir(scene, [cocer(scene, bpy.data.objects['Hair Main'], Matrix()), mechas], 'pelo_largo')
    mono = cocer(scene, bpy.data.objects['Hair Bun'], Matrix(), 'pelo_mono')
    for o in [o for o in bpy.data.objects if o not in antes and o not in (mel, mono)]:
        bpy.data.objects.remove(o)
    return mel, mono, caja


def peinados(scene, mel, mono):
    """Pelo_long (melena) y Pelo_bun (melena + moño) a partir de las mallas cocidas."""
    copia = mel.copy()
    copia.data = mel.data.copy()
    scene.collection.objects.link(copia)
    largo = P.unir(scene, [mel], 'Pelo_long')
    con_mono = P.unir(scene, [copia, mono], 'Pelo_bun')
    for o in (largo, con_mono):
        P.solo_cabeza(o)
        P.diezmar(o, PELO_MAX / max(P.triangulos([o]), 1))
    return largo, con_mono


def construir(clase, fuente, fuente_yw):
    cfg = CLASES[clase]
    anim = A.CLASES[clase]
    nombre = f'{clase}_f_anime'
    scene = fg.fresh_scene(f'FG_{nombre}')
    # Peinado corto de la base masculina, con la caja de su cabeza.
    corto, caja_yw = A.pelo_yw(scene, fuente_yw)
    objs = cargar(scene, fuente)
    T, s = escala([objs[n] for n in CUERPO + CALZADO])
    j = articulaciones(T)

    cocidas = {n: cocer(scene, objs[n], T) for n in CUERPO + ROPA + ROPA2 + CALZADO + PELO}
    caras = cara(scene, objs, T)
    for n, r in DIEZMO.items():
        if n in cocidas:
            P.diezmar(cocidas[n], r)
    # Brazos abajo (lo que pesa en cada brazo gira sobre su hombro) y articulaciones con ellos.
    hombros = {s_: (j(f'c_arm_twist_offset.{b}'), j(f'forearm_stretch.{b}')) for s_, b in (('L', 'l'), ('R', 'r'))}
    giros = P.bajar_brazos(list(cocidas.values()), hombros, A.BRAZO_GRADOS)
    jj = j

    def j(n):  # noqa: F811 — articulaciones con los brazos ya bajados
        p = jj(n)
        lado = n.rsplit('.', 1)[-1].upper()
        if lado in giros and any(k in n for k in ('forearm', 'hand', 'arm_twist')):
            return P.girar_punto(p, giros[lado])
        return p
    bones = huesos(j)
    cuello = j('head.x').z

    # La falda de la base es una campana rígida: se recoge hacia las piernas (opaca).
    recoger_falda(cocidas['Skirt'], j('root.x'))
    # Materiales: la piel por vértice; ropa y calzado con las telas pintadas del juego.
    for n in CUERPO:
        P.material_unico(cocidas[n], piel_vertices(f'{nombre}_piel'))
    for n in ROPA:
        P.material_unico(cocidas[n], mat(f'{nombre}_ropa', cfg['ropa'], rough=0.8, doble=True))
    for n in ROPA2:
        P.material_unico(cocidas[n], mat(f'{nombre}_ropa2', cfg['ropa2'], rough=0.8, doble=True))
    P.material_unico(cocidas['Boots_ThighHighs'], mat(f'{nombre}_bota', cfg['bota'], rough=0.65))
    P.material_unico(cocidas['Gloves'], mat(f'{nombre}_guante', cfg['guante'], rough=0.7, doble=True))
    for n in ('Belt', 'Choker'):
        P.material_unico(cocidas[n], mat(f'{nombre}_cinto', cfg['cinto'], rough=0.7, doble=True))

    piel = P.unir(scene, [cocidas[n] for n in CUERPO], 'Piel')
    ropa = P.unir(scene, [cocidas[n] for n in ROPA], 'Ropa')
    ropa2 = P.unir(scene, [cocidas[n] for n in ROPA2], 'Ropa2')
    calzado = P.unir(scene, [cocidas[n] for n in CALZADO], 'Calzado')
    largo, mono = peinados(scene, P.unir(scene, [cocidas['Hair Main'], cocidas['Hair Rigged']], 'pelo_largo'), cocidas['Hair Bun'])
    # El corto de la otra base, encajado en esta cabeza.
    P.encajar(corto, caja_yw, P.cabeza([v.co for v in piel.data.vertices], cuello))
    corto = P.unir(scene, [corto], 'Pelo_short')
    P.solo_cabeza(corto)
    for o in bpy.data.objects:
        if o.type in ('MESH', 'ARMATURE', 'EMPTY') and o.name not in ('Piel', 'Ropa', 'Ropa2', 'Calzado', 'Cara', 'Pelo_long', 'Pelo_bun', 'Pelo_short'):
            bpy.data.objects.remove(o)

    rig = fg_rig.Rig(scene, f'FG_{nombre}', bones)
    piezas = [piel, ropa, ropa2, calzado, caras, largo, mono, corto]
    print(f'{nombre}: escala {s:.5f}, {P.triangulos(piezas)} triángulos (con 4 caras y 3 peinados)')
    return scene, rig, nombre, piezas, anim


def exportar(scene, rig, nombre, piezas, anim, archivo):
    piel, ropa, ropa2, calzado, caras, largo, mono, corto = piezas
    P.hornear(scene, nombre, piel, 1024, modo='piel', media=0.92)
    P.hornear(scene, nombre, ropa, 1024, modo='gris', contraste=0.8)
    P.hornear(scene, nombre, ropa2, 1024, modo='gris', contraste=0.8)
    P.hornear(scene, nombre, calzado, 1024)
    P.hornear(scene, nombre, caras, 1024, ao=0.25, tenir=False)
    for o in (largo, mono, corto):
        P.hornear(scene, nombre, o, 1024, modo='gris', media=0.85, contraste=0.6)
    caras_n = P.variantes(scene, caras, len(CARAS))
    partes = [piel, ropa, ropa2, calzado, *caras_n, largo, mono, corto]
    for o in partes:
        o.parent = rig.obj
        if not any(m.type == 'ARMATURE' for m in o.modifiers):
            o.modifiers.new('Huesos', 'ARMATURE').object = rig.obj
    rig.parts = partes
    fg_rig.biped_clips(rig)
    fg_rig.biped_emote_clips(rig)
    rig.clip('Atacar', anim['atacar'])
    rig.clip('Lanzar', anim['lanzar'])
    for n, keys in anim.get('extra', {}).items():
        rig.clip(n, keys)
    if archivo:
        rig.export(archivo, imagenes='JPEG')


def main(argv):
    def arg(k, env):
        return argv[argv.index(k) + 1] if k in argv else os.environ.get(env, '')
    fuente, fuente_yw = arg('--fuente', 'FG_BASE_BCHAN'), arg('--fuente-yw', 'FG_BASE_YW')
    if not (os.path.exists(fuente) and os.path.exists(fuente_yw)):
        raise SystemExit('Faltan --fuente <bchan.blend> y --fuente-yw <base YW .blend> (ver cabecera)')
    for clase in [a for a in argv if a in CLASES] or list(CLASES):
        scene, rig, nombre, piezas, anim = construir(clase, fuente, fuente_yw)
        exportar(scene, rig, nombre, piezas, anim, None if '--sin-exportar' in argv else f'{clase}_f_anime.glb')


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
