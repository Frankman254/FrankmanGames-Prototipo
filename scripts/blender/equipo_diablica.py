# EQ-10: el ajuar de La Espeja como 8 objetos equipables, sacado de las piezas de su propio modelo.
#
#   Blender -b --factory-startup --python scripts/blender/equipo_diablica.py -- [--diag] [--salida RUTA.glb]
#
# Creador (2026-11-19): «genera un set de 8 piezas de la diablica para nivel 50 […] y se utilicen
# las piezas del propio npc para separarlas y guardarlas como items equipables».
#
# 1. Rehace La Espeja con su generador (`diablica_espejo.py`, mismas funciones y mismo orden) y,
#    antes de unir sus mallas, separa por color de paleta y por hueso: tocado y careta (cabeza),
#    blusa (pecho), cuello y botones (amuleto), falda (cintura), guantes (manos), medias y zapatos
#    (pies), lazo grande de la espalda (espalda) y bastón (arma; este va a la mano como las demás
#    armas: origen en el agarre y punta hacia +Z). Los ids son los de
#    `scripts/balance/eq10DiablicaEspeja.mjs`.
# 2. Cada objeto va a `assets/models/equipo.glb` como un nodo vacío `obj_<itemId>` con una malla
#    hija por hueso, `obj_<itemId>@<hueso>`, en el espacio de ese hueso de La Espeja y centrada en
#    su silueta vestida de ese hueso (cuerpo y ropa, sin pelo, tocado ni bastón).
# 3. Mide cada héroe (mismo esqueleto de 16 huesos) y escribe en `data/art/ajusteEquipo.json`, por
#    GLB y por hueso, dónde va ese centro en el héroe (`at`, espacio glTF del modelo en reposo), con
#    qué giro (`rot`, cuaternión x, y, z, w) y qué escala por eje (`scale`): la silueta vestida del héroe
#    frente a la de La Espeja, para que la pieza tape su ropa. El juego pega cada malla hija a su hueso con eso (gltfCharacter.ts).
#
# Ejecútese después de `equipo.py` y `equipo_espeja.py` (los dos reescriben equipo.glb): este
# script importa el GLB, quita solo sus nodos y exporta todo de nuevo.
import json
import os
import sys
from collections import Counter, defaultdict

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import diablica_espejo as de  # noqa: E402

RAIZ = os.path.normpath(os.path.join(HERE, '..', '..'))
EQUIPO = os.path.join(RAIZ, 'assets', 'models', 'equipo.glb')
AJUSTE = os.path.join(RAIZ, 'data', 'art', 'ajusteEquipo.json')
SET = 'diablica_espeja'

HUESOS = ['hips', 'spine', 'chest', 'head', 'upperArmL', 'foreArmL', 'handL', 'upperArmR', 'foreArmR', 'handR',
          'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR']
# Huesos propios de La Espeja (física, careta) que un héroe no tiene: van con su padre.
PADRE = {'falda': 'hips', 'coleta': 'head', 'careta': 'head', 'cintas_oreja': 'head', 'cola1': 'head',
         'cola2': 'head', 'cola3': 'head', 'cintas_cola': 'head'}
# GLB de los héroes que pueden llevarlo (plantillas de data/assets.json con el esqueleto común).
HEROES = ['centinela_anime', 'centinela_f_anime', 'oraculo_anime', 'oraculo_f_anime', 'cazador_anime',
          'cazador_f_anime']
# Lo que no cuenta como cuerpo al medir un héroe: lo quita lo puesto o es pelo, arma o accesorio.
NO_CUERPO = ('Pelo', 'Capa', 'Banda', 'Yelmo', 'Capucha', 'Lanza', 'Arma_', 'Escudo')
LARGO_E = {}  # largo de cada hueso de La Espeja
AGARRE = 'agarre'  # el bastón no va por huesos: a la mano, como cualquier arma
AGARRE_T = {}
MARGEN = 1.04  # holgura en el ancho y el fondo para tapar la ropa del héroe
ESCALA_MIN, ESCALA_MAX = 0.85, 1.5
GROSOR_MAX = 1.2  # la pollera ya es ancha: más, en un héroe de túnica, la vuelve un globo


def item(slot):
    return f'{SET}_{"staff" if slot == "weapon" else slot}'


# ------------------------------------------------------------------ utilidades
def hueso(nombre):
    return PADRE.get(nombre, nombre)


def pesos(o):
    """Por vértice: {hueso común: peso}."""
    gn = {g.index: g.name for g in o.vertex_groups}
    out = []
    for v in o.data.vertices:
        w = defaultdict(float)
        for g in v.groups:
            if g.group in gn and g.weight > 0:
                w[hueso(gn[g.group])] += g.weight
        out.append(w)
    return out


def dominante_cara(o, pw):
    out = []
    for p in o.data.polygons:
        acc = defaultdict(float)
        for vi in p.vertices:
            for b, w in pw[vi].items():
                acc[b] += w
        out.append(max(acc, key=acc.get) if acc else 'hips')
    return out


def color_cara(o):
    """Nombre de la casilla de paleta de cada cara (las piezas del generador llevan UV de celda)."""
    uv = o.data.uv_layers.active.data
    out = []
    for p in o.data.polygons:
        u = sum(uv[li].uv.x for li in p.loop_indices) / p.loop_total
        v = sum(uv[li].uv.y for li in p.loop_indices) / p.loop_total
        i = min(7, int(u * 8)) + min(7, int(v * 8)) * 8
        out.append(de.NOMBRES[i] if i < len(de.NOMBRES) else '?')
    return out


def marcos(arm):
    """Marco de reposo de cada hueso común en el mundo de Blender (giro sin escala y cabeza)."""
    out = {}
    for b in HUESOS:
        m = arm.matrix_world @ arm.data.bones[b].matrix_local
        loc, rot, _ = m.decompose()
        out[b] = Matrix.LocRotScale(loc, rot, None)
    return out


def medir(arm, mallas):
    """Caja del cuerpo de cada hueso en su marco: {hueso: (centro, tamaño)} (vértices por hueso dominante)."""
    fr = marcos(arm)
    inv = {b: m.inverted() for b, m in fr.items()}
    pts = defaultdict(list)
    for o in mallas:
        pw = pesos(o)
        mw = o.matrix_world
        for v, w in zip(o.data.vertices, pw):
            if not w:
                continue
            b = max(w, key=w.get)
            if b in inv:
                pts[b].append(inv[b] @ (mw @ v.co))
    out = {}
    for b in HUESOS:
        p = pts.get(b)
        if not p or len(p) < 8:
            continue
        lo = Vector((min(q.x for q in p), min(q.y for q in p), min(q.z for q in p)))
        hi = Vector((max(q.x for q in p), max(q.y for q in p), max(q.z for q in p)))
        out[b] = ((lo + hi) / 2, hi - lo)
    return fr, out


def gltf(v):
    """Blender (Z arriba, −Y delante) → glTF (Y arriba, +Z delante)."""
    return [v.x, v.z, -v.y]


C = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))


# ------------------------------------------------------------------ La Espeja por piezas
def espeja():
    """Rehace La Espeja en el orden de `diablica_espejo.main` y devuelve sus piezas sin unir."""
    arm = de.importar_base()
    arm.name = 'diablica_espejo'
    imgs = {n: [i.name for i in bpy.data.images if n in i.name][0] for n in ('piel', 'cara')}
    piel, cara, cal, blusa, guantes, adorno = de.vestir_cuerpo(arm)
    de.ojos_separados(cara)
    de.pintar_rostro(de.tile_image(imgs['piel'], '#f1bfa1'), piel, cara)
    fa = de.falda(arm, blusa)
    de.peinado(arm)
    toc = de.tocado(arm)
    mas = de.mascara(arm)
    de.huesos_fisica(arm)
    de.pose_reposo(arm)
    bas = de.baston(arm, None)
    # El bastón es un arma de mano como las de equipo.py (contrato de equipo.glb: origen en el agarre,
    # punta hacia +Z): se exporta como está en la pose de reposo, vertical en la mano derecha.
    hb = arm.pose.bones['handR']
    T = arm.matrix_world @ hb.matrix @ hb.bone.matrix_local.inverted() @ arm.matrix_world.inverted()
    AGARRE_T.update(T=T, grip=arm.matrix_world @ hb.head.lerp(hb.tail, 0.42))
    de.descansar(arm)
    # Silueta vestida (cuerpo y ropa, sin pelo, tocado ni bastón), igual que se mide a cada héroe.
    fr, caja = medir(arm, [piel, cara, cal, blusa, guantes, adorno, fa])
    LARGO_E.update({b: arm.data.bones[b].length for b in HUESOS})
    fuentes = {'blusa': blusa, 'guantes': guantes, 'adorno': adorno, 'calzado': cal, 'falda': fa,
               'tocado': toc, 'baston': bas}
    for i, m in enumerate(mas):
        fuentes[f'mascara{i}'] = m
    return arm, fr, caja, fuentes


def reparto(nombre, color, dom):
    """(hueco, hueso) de una cara de La Espeja; None si no va a ningún objeto."""
    if nombre.startswith('mascara') or nombre == 'tocado':
        return 'head', 'head'
    if nombre == 'falda':
        return 'waist', 'hips'
    if nombre == 'baston':
        return 'weapon', AGARRE
    if nombre == 'blusa':
        return 'chest', dom
    if nombre == 'guantes':
        return 'hands', dom
    if nombre == 'calzado':
        return 'feet', dom
    if nombre == 'adorno':
        if dom.startswith(('foreArm', 'hand')):  # volantes rosa y menta de los guantes
            return 'hands', dom
        if dom.startswith(('shin', 'foot', 'thigh')):  # volantes de las medias, lazo y espejo del zapato
            return 'feet', dom
        if color in ('cuello', 'boton'):
            return 'amulet', 'chest'
        if color in ('menta', 'menta_osc') and dom == 'hips':  # el lazo grande de la espalda
            return 'back', 'hips'
        return 'chest', dom
    return None


def diagnostico(fuentes):
    for nombre, o in fuentes.items():
        pw = pesos(o)
        cnt = Counter(zip(color_cara(o), dominante_cara(o, pw)))
        print('DIAG', nombre, len(o.data.polygons), dict(cnt.most_common(40)))


def partes(arm, fr, caja, fuentes, mat):
    """Una malla por (objeto, hueso) en el marco del hueso, centrada en la caja de su cuerpo."""
    bm = defaultdict(lambda: {'v': [], 'f': [], 'uv': [], 'smooth': []})
    for nombre, o in fuentes.items():
        pw = pesos(o)
        cols = color_cara(o)
        doms = dominante_cara(o, pw)
        uv = o.data.uv_layers.active.data
        mw = o.matrix_world
        for p, col, dom in zip(o.data.polygons, cols, doms):
            r = reparto(nombre, col, dom)
            if r is None:
                continue
            slot, b = r
            if b not in fr and b != AGARRE:
                b = 'hips'
            d = bm[(slot, b)]
            if b == AGARRE:  # pose de enlace → reposo, con el agarre en el origen
                inv, centro = AGARRE_T['T'], AGARRE_T['grip']
            else:
                inv = fr[b].inverted()
                centro = caja[b][0] if b in caja else Vector()
            base = len(d['v'])
            for vi in p.vertices:
                d['v'].append(inv @ (mw @ o.data.vertices[vi].co) - centro)
            d['f'].append(list(range(base, base + len(p.vertices))))
            d['uv'].append([tuple(uv[li].uv) for li in p.loop_indices])
            d['smooth'].append(p.use_smooth)
    raices = {}
    for (slot, b), d in sorted(bm.items()):
        nid = item(slot)
        if nid not in raices:
            e = bpy.data.objects.new(f'obj_{nid}', None)
            bpy.context.scene.collection.objects.link(e)
            e['itemId'] = nid
            e['slot'] = slot
            raices[nid] = e
        nombre = f'obj_{nid}_malla' if b == AGARRE else f'obj_{nid}@{b}'
        me = bpy.data.meshes.new(nombre)
        me.from_pydata([tuple(v) for v in d['v']], [], d['f'])
        lay = me.uv_layers.new(name='UVMap')
        k = 0
        for poly, uvs, sm in zip(me.polygons, d['uv'], d['smooth']):
            poly.use_smooth = sm
            for li, u in zip(poly.loop_indices, uvs):
                lay.data[li].uv = u
            k += 1
        me.materials.append(mat)
        me.validate()
        me.update()
        ob = bpy.data.objects.new(nombre, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = raices[nid]
        ob['hueso'] = b
    return list(raices.values())


# ------------------------------------------------------------------ ajuste por héroe
def ajuste(fr_e, caja_e):
    out = {'_nota': 'EQ-10: generado por scripts/blender/equipo_diablica.py; no editar a mano. Por GLB y hueso, '
                    'dónde va el centro del cuerpo de La Espeja en ese héroe (at, glTF), con qué giro (rot, x y z w) '
                    'y escala por eje (scale) para las piezas obj_<id>@<hueso> de equipo.glb.'}
    for heroe in HEROES:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=os.path.join(RAIZ, 'assets', 'models', f'{heroe}.glb'))
        arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
        arm.animation_data_clear()
        for pb in arm.pose.bones:
            pb.rotation_mode = 'QUATERNION'
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.location = (0, 0, 0)
        bpy.context.view_layer.update()
        mallas = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.name.startswith(NO_CUERPO)
                  and not (o.name.startswith('Cara_') and o.name != 'Cara_0')]
        fr_h, caja_h = medir(arm, mallas)
        # Por hueso, la caja de cada uno es ruidosa (qué vértice pesa más en qué hueso cambia entre
        # modelos): a lo largo manda el largo del hueso; de ancho y fondo, la mediana de todo el cuerpo
        # (salvo la cabeza, que va con la suya). Así el modelo base de La Espeja da 1 en todo.
        rel = sorted(caja_h[b][1][i] / max(caja_e[b][1][i], 1e-4) for b in HUESOS if b != 'head'
                     and b in caja_h and b in caja_e for i in (0, 2))
        grosor = min(GROSOR_MAX, max(ESCALA_MIN, rel[len(rel) // 2])) if rel else 1.0
        por = {}
        for b in HUESOS:
            largo = min(ESCALA_MAX, max(ESCALA_MIN, arm.data.bones[b].length / LARGO_E[b]))
            if b == 'head' and b in caja_h and b in caja_e:
                cab = sum(caja_h[b][1][i] / max(caja_e[b][1][i], 1e-4) for i in range(3)) / 3
                cab = min(ESCALA_MAX, max(ESCALA_MIN, cab))
                s = [cab * MARGEN, cab, cab * MARGEN]
            else:
                s = [grosor * MARGEN, largo, grosor * MARGEN]  # Y del hueso: a lo largo; X y Z: ancho y fondo
            ce = caja_e[b][0] if b in caja_e else Vector()
            m = fr_h[b]
            at = m @ Vector((ce.x * s[0], ce.y * s[1], ce.z * s[2]))
            q = (C @ m.to_3x3() @ C.inverted()).to_quaternion()
            por[b] = {'at': [round(x, 4) for x in gltf(at)],
                      'rot': [round(q.x, 5), round(q.y, 5), round(q.z, 5), round(q.w, 5)],
                      'scale': [round(s[0], 3), round(s[2], 3), round(s[1], 3)]}
        out[heroe] = por
    return out


def main(argv):
    arm, fr, caja, fuentes = espeja()
    if '--diag' in argv:
        diagnostico(fuentes)
        return
    col, mr = de.palette_images(256)
    imgs = []
    for suf, data, space in (('', col, 'sRGB'), ('_mr', mr, 'Non-Color')):
        im = bpy.data.images.new(f'diablica_equipo{suf}', 256, 256, alpha=False)
        im.colorspace_settings.name = space
        im.pixels.foreach_set(data.astype('float32').ravel())
        im.pack()
        imgs.append(im)
    mat = de.material('equipo', *imgs)
    mat.name = 'equipo_diablica_espeja'
    raices = partes(arm, fr, caja, fuentes, mat)
    # Fuera todo lo de La Espeja: en la escena solo quedan las raíces nuevas y sus mallas.
    nuevas = set(raices) | {c for r in raices for c in r.children}
    for o in list(bpy.context.scene.objects):
        if o not in nuevas:
            bpy.data.objects.remove(o)
    bpy.ops.import_scene.gltf(filepath=EQUIPO)
    nombres = {r.name for r in raices}
    for o in list(bpy.context.scene.objects):
        base = o.name.split('.')[0]
        if o not in nuevas and base.split('@')[0].removesuffix('_malla') in nombres:
            bpy.data.objects.remove(o)
    tris = sum(len(p.vertices) - 2 for r in raices for c in r.children for p in c.data.polygons)
    salida = argv[argv.index('--salida') + 1] if '--salida' in argv else EQUIPO
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=salida, export_format='GLB', use_selection=True, export_animations=False,
                              export_apply=False, export_materials='EXPORT', export_image_format='AUTO',
                              export_extras=True)
    for r in raices:
        print('pieza', r.name, sorted(c.name.split('@')[-1] for c in r.children),
              sum(len(p.vertices) - 2 for c in r.children for p in c.data.polygons), 'tris')
    print('exportado', salida, os.path.getsize(salida), 'bytes', tris, 'triangulos en total')
    datos = ajuste(fr, caja)
    os.makedirs(os.path.dirname(AJUSTE), exist_ok=True)
    with open(AJUSTE, 'w', encoding='utf-8') as fh:
        json.dump(datos, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    print('ajuste', AJUSTE, ', '.join(HEROES))


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
