# -*- coding: utf-8 -*-
"""OMP-PJ-01: los seis héroes por clase y sexo sobre la base CC0 de Quaternius.

Genera `assets/models/heroes_cc0/<clase>[_f].glb` (cazador, centinela, oráculo;
hombre sin sufijo y mujer con `_f`, como hoy) desde dos paquetes CC0 1.0 en
`work/claude-cc0/descargas/`:
  - Universal Base Characters: cuerpo, peinados y cejas.
  - Universal Animation Library 1 y 2: clips sobre el mismo esqueleto (65 huesos).

La ropa se modela aquí desde cero (clean-room). El mapa de huesos UBC→FG, los
nombres de malla y los de material están en `work/omp-pj-01/CONTRATO.md`.

Uso (headless):
  Blender -b --factory-startup --python scripts/blender/heroes_cc0.py -- --hero cazador h
  Blender -b --factory-startup --python scripts/blender/heroes_cc0.py -- --all
"""
import math
import os
import re
import sys

import bpy
import numpy as np
from mathutils import Euler, Matrix, Quaternion, Vector

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DESC = os.path.join(RAIZ, 'work', 'claude-cc0', 'descargas')
UBC = os.path.join(DESC, 'Universal_Base_Characters', 'Universal Base Characters[Standard]')
BODY = os.path.join(UBC, 'Base Characters', 'Godot - UE')
HAIR = os.path.join(UBC, 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)')
UAL1 = os.path.join(DESC, 'Universal_Animation_Library', 'Universal Animation Library[Standard]',
                    'Unreal-Godot', 'UAL1_Standard.glb')
UAL2 = os.path.join(DESC, 'Universal_Animation_Library_2', 'Universal Animation Library 2[Standard]',
                    'Unreal-Godot', 'UAL2_Standard.glb')
SALIDA = os.path.join(RAIZ, 'assets', 'models', 'heroes_cc0')
TRABAJO = os.path.join(RAIZ, 'work', 'omp-pj-01')

CLASES = ('centinela', 'cazador', 'oraculo')
ALTO = {'h': 1.75, 'm': 1.65}              # 'h' hombre, 'm' mujer

# Huesos UBC → nombres FG del motor (los 16 que usa el juego; el resto se queda igual)
MAPA = {'pelvis': 'hips', 'spine_01': 'spine', 'spine_02': 'spine_02', 'spine_03': 'chest',
        'neck_01': 'neck', 'Head': 'head',
        'clavicle_l': 'clavicleL', 'upperarm_l': 'upperArmL', 'lowerarm_l': 'foreArmL', 'hand_l': 'handL',
        'clavicle_r': 'clavicleR', 'upperarm_r': 'upperArmR', 'lowerarm_r': 'foreArmR', 'hand_r': 'handR',
        'thigh_l': 'thighL', 'calf_l': 'shinL', 'foot_l': 'footL', 'ball_l': 'ballL',
        'thigh_r': 'thighR', 'calf_r': 'shinR', 'foot_r': 'footR', 'ball_r': 'ballR'}
# dedos: se renombran con patrón *_l → *_L etc. conservando el resto del nombre
def nombre_fg(n):
    if n in MAPA:
        return MAPA[n]
    if n.endswith('_l'):
        return n[:-2] + 'L'
    if n.endswith('_r'):
        return n[:-2] + 'R'
    return n

TRI = {                       # presupuesto de triángulos por pieza (total ≤ 12 000)
    'cuerpo': 2300, 'cara': 900, 'ceja': 150, 'ojos': 240,
    'short': 420, 'long': 900, 'bun': 700, 'ropa': 2600,
}


def reset(fps=30):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = fps
    return sc


def basura():
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH' and (o.name.startswith('Icosphere') or o.name == 'Cube'):
            bpy.data.objects.remove(o, do_unlink=True)


def mallas(prefijo):
    return [o for o in bpy.context.scene.objects
            if o.type == 'MESH' and o.name.lower().startswith(prefijo.lower())]


def una_malla(prefijo):
    return mallas(prefijo)[0]


def renombrar(obj, nombre):
    """El exportador gltf usa el nombre de los datos de la malla, no el del objeto."""
    obj.name = nombre
    obj.data.name = nombre


def tri(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def tri_total(objs):
    return sum(tri(o) for o in objs if o.type == 'MESH')


def decimar(obj, target):
    t = tri(obj)
    if t <= target:
        return t
    md = obj.modifiers.new('dec', 'DECIMATE')
    md.ratio = target / t
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=md.name)
    return tri(obj)


def ranura(nombre, rough=0.7, metal=0.0, img=None, rgb=None):
    """Material de una ranura de tinte: el motor tiñe por el nombre tras ':'."""
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')
    if rgb is not None:
        b.inputs['Base Color'].default_value = (*rgb, 1.0)
    if img is not None:
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    if 'Metallic' in b.inputs:
        b.inputs['Metallic'].default_value = metal
    return m


def imagen_numpy(nombre, arr, size):
    old = bpy.data.images.get(nombre)
    if old:
        bpy.data.images.remove(old)
    im = bpy.data.images.new(nombre, size, size, alpha=False)
    rgba = np.concatenate([np.clip(arr, 0, 1), np.ones((size, size, 1), np.float32)], axis=2)
    im.pixels.foreach_set(rgba.astype(np.float32).ravel())
    return im


# ------------------------------------------------------------------ cuerpo base



def peso_dominante(obj):
    vg = {g.index: g.name for g in obj.vertex_groups}
    dom = np.empty(len(obj.data.vertices), dtype=np.int32) - 1
    for v in obj.data.vertices:
        if v.groups:
            g = max(v.groups, key=lambda x: x.weight)
            dom[v.index] = g.group
    return vg, dom


# el cuerpo UBC ya viene con grupos renombrados a FG en algunos paquetes: alias
UBC_ALIAS = {'pelvis': 'hips', 'spine_01': 'spine', 'spine_03': 'chest', 'neck_01': 'neck',
             'Head': 'head', 'upperarm_l': 'upperArmL', 'upperarm_r': 'upperArmR',
             'lowerarm_l': 'foreArmL', 'lowerarm_r': 'foreArmR',
             'calf_l': 'shinL', 'calf_r': 'shinR'}


def grupo_por_hueso(obj):
    """{nombre_hueso: [índices de vértice]} con ese peso dominante.

    Indexa también por el alias UBC para que las recetas de ropa funcionen con
    cuerpos con grupos en cualquiera de los dos idiomas.
    """
    vg, dom = peso_dominante(obj)
    out = {}
    for i, gi in enumerate(dom):
        if gi >= 0:
            out.setdefault(vg[gi], []).append(i)
    for ubc, fg in UBC_ALIAS.items():
        if ubc not in out and fg in out:
            out[ubc] = out[fg]
        elif fg not in out and ubc in out:
            out[fg] = out[ubc]
    # el paquete masculino escribe 'head' y 'chest' en minúsculas; 'Head' debe resolver igual
    for a, b in (('Head', 'head'),):
        if a not in out and b in out:
            out[a] = out[b]
        if b not in out and a in out:
            out[b] = out[a]
    return out




def weights_matriz(obj):
    """(n_verts, n_grupos) de pesos puros, para mover vértices suavemente por hueso."""
    nombres = sorted({g.name for g in obj.vertex_groups})
    col = {n: i for i, n in enumerate(nombres)}
    M = np.zeros((len(obj.data.vertices), len(nombres)), np.float32)
    for v in obj.data.vertices:
        for g in v.groups:
            name = obj.vertex_groups[g.group].name
            if name in col:
                M[v.index, col[name]] = g.weight
    return nombres, col, M


def importar_armazon(clase, sexo):
    """Cuerpo UBC: proporciones de clase (malla y huesos a la vez), decimado y altura."""
    reset()
    bpy.ops.import_scene.gltf(filepath=os.path.join(
        BODY, f'Superhero_{"Male" if sexo == "h" else "Female"}_FullBody.gltf'))
    basura()
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    cuerpo = una_malla('super')
    cejas = una_malla('eyebrow')
    ojos = una_malla('eyes')
    # el paquete trae cabezas auxiliares ("Face") y esferas: no van al héroe
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH' and o not in (cuerpo, cejas, ojos):
            bpy.data.objects.remove(o, do_unlink=True)
    nombres, col, M = weights_matriz(cuerpo)
    acum = np.zeros((len(cuerpo.data.vertices), 3), np.float64)
    co0 = np.empty(len(cuerpo.data.vertices) * 3)
    cuerpo.data.vertices.foreach_get('co', co0)
    co0 = co0.reshape(-1, 3).astype(np.float64)
    ops_hueso = [op for op in operaciones_clase(clase, sexo) if op[0] in ('post', 'bones_x')]
    for op in operaciones_clase(clase, sexo):
        tipo = op[0]
        if tipo == 'post':                      # ('post', [huesos], d): malla (el hueso, luego)
            _, hs, d = op
            w = np.zeros(len(nombres), np.float32)
            for h in hs:
                if h in col:
                    w[col[h]] = 1.0
            acum += np.outer(M @ w, np.array(d, np.float64))
        elif tipo == 'band':                    # ancho/profundidad de una zona
            _, hs, kx, ky = op
            mask = np.zeros(M.shape[0], bool)
            for h in hs:
                if h in col:
                    mask |= (M[:, col[h]] > 0.25)
            i = np.flatnonzero(mask)
            if len(i) == 0:
                continue
            xc, yc = co0[i, 0].mean(), co0[i, 1].mean()
            acum[i, 0] += (co0[i, 0] - xc) * (kx - 1.0)
            acum[i, 1] += (co0[i, 1] - yc) * (ky - 1.0)
    co = co0 + acum
    cuerpo.data.vertices.foreach_set('co', co.astype(np.float32).ravel())
    cuerpo.data.update()
    # el esqueleto, en modo edición (fuera es de sólo lectura)
    if ops_hueso:
        bpy.ops.object.select_all(action='DESELECT')
        arm.select_set(True)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.mode_set(mode='EDIT')
        eb = arm.data.edit_bones
        for op in ops_hueso:
            if op[0] == 'post':
                _, hs, d = op
                for h in hs:
                    b = eb.get(h)
                    if b:
                        b.head = b.head + Vector(d)
                        b.tail = b.tail + Vector(d)
            else:                               # bones_x: ensanchar
                _, hs, kk = op
                for h in hs:
                    b = eb.get(h)
                    if b:
                        b.head.x *= kk
                        b.tail.x *= kk
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()
    # ojo/ceja/pelo son mallas sin skin a Head: el `post` de la cabeza hay que
    # pasárselo a mano, si no el globo asoma por la mejilla
    head_off = np.zeros(3)
    for op in operaciones_clase(clase, sexo):
        if op[0] == 'post' and 'Head' in op[1]:
            head_off += np.array(op[2], np.float64)
    for malla in (cejas, ojos):
        co = np.empty(len(malla.data.vertices) * 3)
        malla.data.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3) + head_off
        malla.data.vertices.foreach_set('co', co.astype(np.float32).ravel())
        malla.data.update()
    decimar(cuerpo, TRI['cuerpo'])
    bbox = [cuerpo.matrix_world @ Vector(c) for c in cuerpo.bound_box]
    k = ALTO[sexo] / (max(v.z for v in bbox) - min(v.z for v in bbox))
    arm.scale = (k, k, k)
    bpy.context.view_layer.update()
    return arm, cuerpo, cejas, ojos, k, head_off


def _brazo(l):
    """Todos los huesos de un brazo desde el hombro (para postura y alargue)."""
    base = ['clavicle_' + l, 'upperarm_' + l, 'lowerarm_' + l, 'hand_' + l]
    dedos = []
    for pref in ('thumb', 'index', 'middle', 'ring', 'pinky'):
        for n in (1, 2, 3, 4):
            suf = '_leaf' if n == 4 else ''
            dedos.append(f'{pref}_0{n}{suf}_{l}')
    return base + dedos


def operaciones_clase(clase, sexo):
    """Lo que se edita del cuerpo base para que la clase se lea en la silueta.

    Huesos en nombre UBC: el renombrado a FG se hace al exportar, con los clips.
    """
    if clase == 'centinela':
        return [('band', ['spine_02', 'spine_03'], 1.10, 1.05),
                ('band', ['upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r'], 1.10, 1.10),
                ('band', ['thigh_l', 'calf_l', 'thigh_r', 'calf_r'], 1.06, 1.06),
                ('band', ['neck_01'], 1.32, 1.32),
                ('bones_x', _brazo('l')[:4] + _brazo('r')[:4], 1.07)]
    if clase == 'cazador':
        return [('band', ['pelvis', 'spine_01', 'spine_02', 'spine_03'], 0.94, 0.94),
                ('band', ['upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r'], 0.92, 0.92),
                ('post', ['lowerarm_l', 'hand_l'], (0.05, 0, 0)),
                ('post', ['lowerarm_r', 'hand_r'], (-0.05, 0, 0)),
                ('post', ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head'], (0, -0.012, 0)),
                ('post', ['spine_02', 'spine_03', 'neck_01', 'Head'] + _brazo('l') + _brazo('r'), (0, -0.025, 0)),
                ('post', ['neck_01', 'Head'] + _brazo('l')[1:] + _brazo('r')[1:], (0, -0.020, 0))]
    # oráculo: esbelto, torso alto, manos expresivas (grandes)
    return [('band', ['pelvis', 'spine_01', 'spine_02', 'spine_03'], 0.92, 0.92),
            ('post', ['spine_02'], (0, 0, 0.018)),
            ('post', ['spine_03'], (0, 0, 0.036)),
            ('post', ['neck_01', 'Head'] + _brazo('l') + _brazo('r'), (0, 0, 0.055)),
            ('band', ['hand_l', 'hand_r'] + [h for l in 'lr' for p in ('thumb', 'index', 'middle', 'ring', 'pinky') for n in (1, 2, 3, 4) for h in (f'{p}_0{n}_{l}',)], 1.12, 1.12)]


# ------------------------------------------------------------------ piezas UBC
def traer_pelo(nombre, arm, head_off=None):
    prev = {o.name for o in bpy.context.scene.objects}
    bpy.ops.import_scene.gltf(filepath=os.path.join(HAIR, nombre + '.gltf'))
    basura()
    nuevo = [o for o in bpy.context.scene.objects
             if o.type == 'MESH' and o.name not in prev]
    pelo = max(nuevo, key=lambda o: len(o.data.vertices))
    for o in nuevo:                            # el paquete trae moño/trenza sueltos
        if o is not pelo:
            bpy.data.objects.remove(o, do_unlink=True)
    if head_off is not None and np.any(head_off):
        co = np.empty(len(pelo.data.vertices) * 3)
        pelo.data.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3) + head_off
        pelo.data.vertices.foreach_set('co', co.astype(np.float32).ravel())
        pelo.data.update()
    for g in list(pelo.vertex_groups):
        pelo.vertex_groups.remove(g)
    g = pelo.vertex_groups.new(name='Head')
    g.add(list(range(len(pelo.data.vertices))), 1.0, 'REPLACE')
    pelo.parent = arm
    for m in [x for x in pelo.modifiers if x.type == 'ARMATURE']:
        pelo.modifiers.remove(m)             # el donante del paquete ajeno no debe mandar
    bpy.context.view_layer.update()
    mod = pelo.modifiers.new('arm', 'ARMATURE')
    mod.object = arm
    return pelo


def texturas_cuerpo(cuerpo):
    """(material, nodetree, bsdf, imagen_atlas) del cuerpo UBC.

    UBC conecta el atlas por un Mix (atlas × atributo de color): se busca el
    TEX_IMAGE en la cadena hacia atrás desde Base Color, depth 3.
    """
    m = cuerpo.data.materials[0]
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')

    def busca(soc, prof=0):
        """Cadena hacia atrás (por inputs) desde un socket."""
        if soc is None or prof > 4:
            return None
        for l in soc.links:
            n = l.from_node
            if n.type == 'TEX_IMAGE' and n.image and 'Roughness' not in n.image.name:
                return n
            for inp in n.inputs:
                r = busca(inp, prof + 1)
                if r:
                    return r
        return None
    tex = busca(b.inputs['Base Color'])
    return m, nt, b, (tex.image if tex else None)


def islas_uv(obj):
    """[(loops, (umin,vmin,umax,vmax))] por componente conectado de la UV."""
    import bmesh
    me = obj.data
    uv = me.uv_layers.active.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    uv_l = bm.loops.layers.uv.active
    # union-find por loops que comparten posición
    pos_id = {}
    parent = list(range(len(bm.verts)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra
    for v in bm.verts:
        k = (round(v.co.x, 4), round(v.co.y, 4), round(v.co.z, 4))
        if k in pos_id:
            union(v.index, pos_id[k])
        else:
            pos_id[k] = v.index
    comp = {}
    for f in bm.faces:
        # una cara une sus vértices (malla soldada por posición, no por índice)
        vs = [f.verts[i].index for i in range(len(f.verts))]
        for a, b in zip(vs, vs[1:]):
            union(a, b)
    for f in bm.faces:
        for l in f.loops:
            r = find(l.vert.index)
            comp.setdefault(r, []).append(l.index)
    bm.free()
    out = []
    for r, loops in comp.items():
        if len(loops) < 12:
            continue
        us = [uv[i].uv[0] for i in loops]
        vs = [uv[i].uv[1] for i in loops]
        out.append((loops, (min(us), min(vs), max(us), max(vs))))
    return out


def isla_cabeza(obj):
    """La isla UV cuyo promedio de UVs cae en el cuarto superior central (cara UBC).

    Se valida imprimiéndola en la lámina de trabajo; si fallase, el generador aborta.
    """
    # vértices con peso dominante Head (en nombre UBC, aún no renombrado)
    grupos = grupo_por_hueso(obj)
    head = set(grupos.get('Head', [])) | set(grupos.get('head', []))
    uv = obj.data.uv_layers['UVMap'].data
    vert_uv = {}
    for p in obj.data.polygons:
        for li in p.loop_indices:
            vert_uv.setdefault(obj.data.loops[li].vertex_index, []).append(li)
    # La cara es una isla compacta del atlas: gana la que concentra más vértices
    # Head por área UV. El criterio "más vértices Head" fallaba en el paquete
    # masculino, cuya isla de cuerpo entero está conectada y se traga la cara.
    mejor, mejor_n, mejor_p = None, 0, 0.0
    for loops, caja in islas_uv(obj):
        vs = {obj.data.loops[i].vertex_index for i in loops}
        n = len(vs & head)
        if n < 40:
            continue
        area = max((caja[2] - caja[0]) * (caja[3] - caja[1]), 1e-4)
        pnt = n / area
        if pnt > mejor_p:
            mejor, mejor_n, mejor_p = (loops, caja), n, pnt
    if mejor is None:
        return None, None, 0
    return mejor[0], mejor[1], mejor_n


def pintar_cara(clase, sexo, base_img, isla, variante):
    """Redibuja la boca sobre el atlas: variante 0 neutra, 1 sonrisa, 2 grito/ira, 3 pena.

    `variante` desplaza el trazo de labios y añade ceño en la copia recortada de la
    isla: la isla de la cara se pinta en un lienzo propio y se pega de vuelta.
    """
    if base_img is None:
        raise RuntimeError('el cuerpo UBC no trae atlas: revisar import')
    size = 512
    arr = np.empty(size * size * 4, np.float32)
    base_img.scale(size, size)
    base_img.pixels.foreach_get(arr)
    arr = arr.reshape(size, size, 4)[:, :, :3].copy()
    loops, (u0, v0, u1, v1) = isla
    uv = None
    x0, x1 = int(u0 * size), int(u1 * size)
    y0, y1 = int(v0 * size), int(v1 * size)
    # boca: la isla abarca cuello+cráneo, la boca va al 42 % de la caja
    cx = (x0 + x1) // 2
    w = max(5, (x1 - x0) // 10)
    yb = y0 + int((y1 - y0) * 0.42)
    labio = np.array([0.42, 0.16, 0.13])
    oscuro = np.array([0.20, 0.06, 0.05])
    for dx in range(-w, w + 1):
        t = dx / w
        if variante == 0:
            dy = int(2.0 * t * t * 3)                     # línea casi recta
        elif variante == 1:
            dy = int(3 + 5 * (1 - t * t) * 2)             # sonrisa ancha arriba
        elif variante == 2:
            dy = int(2 - 4 * (1 - t * t) * 2)             # comisuras caídas
        else:
            dy = int(1 + 2 * abs(t) * 3)                  # boca pequeña apenada
        x = cx + dx
        ancho = 2 if variante != 2 else 3
        for k in range(ancho):
            y = min(size - 1, max(0, yb + dy - k))
            arr[y, x] = oscuro if k == 0 else labio
    if variante == 2:                                     # entreabierta (grito)
        for dx in range(-w // 2, w // 2):
            x = cx + dx
            for k in range(4):
                arr[min(size - 1, yb + 4 + k), x] = oscuro
    nombre = f'cara_{clase}_{"h" if sexo == "h" else "m"}_{variante}'
    return imagen_numpy(nombre, arr, size)


def construir_piezas(arm, cuerpo, cejas, ojos, clase, sexo, head_off=None):
    """Devuelve los objetos de personalización ya con nombre y material de contrato."""
    out = {}
    loops, caja, n_head = isla_cabeza(cuerpo)
    if not loops or n_head < 60:
        raise RuntimeError(f'isla de cara no encontrada ({clase} {sexo})')
    mat, nt, b, atlas = texturas_cuerpo(cuerpo)
    # Cara_N: copia de la malla con sólo las caras de la isla, material propio por variante
    caras = []
    for v in range(4):
        cp = cuerpo.copy()                     # datos compartidos no: copia real
        cp.data = cuerpo.data.copy()
        renombrar(cp, f'Cara_{v}')
        bpy.context.scene.collection.objects.link(cp)
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(cp.data)
        keep = set(loops)
        sel_faces = [f for f in bm.faces if all(l.index in keep for l in f.loops)]
        for f in reversed(list(bm.faces)):
            if f.index not in {x.index for x in sel_faces}:
                bm.faces.remove(f)
        for vv in reversed([x for x in bm.verts if not x.link_faces]):
            bm.verts.remove(vv)                # sin esto la bbox de la cara es el cuerpo entero
        bm.to_mesh(cp.data)
        bm.free()
        # quitar las caras duplicadas del cuerpo original
        decimar(cp, TRI['cara'])
        import bmesh as _b2
        _bm2 = _b2.new(); _bm2.from_mesh(cp.data)
        for _vv in _bm2.verts:
            _vv.co += _vv.normal * 0.0007           # 0.7 mm fuera: sin Z-fighting con el cuerpo
        _bm2.to_mesh(cp.data); _bm2.free()
        img = pintar_cara(clase, sexo, atlas, (loops, caja), v)
        m = ranura(f'heroe_{clase}{"_f" if sexo == "m" else ""}:skin', img=img)
        cp.data.materials.clear()
        cp.data.materials.append(m)
        cp.parent = arm
        for m in [x for x in cp.modifiers if x.type == 'ARMATURE']:
            cp.modifiers.remove(m)
        mod = cp.modifiers.new('arm', 'ARMATURE')
        mod.object = arm
        caras.append(cp)
    # Quitar del cuerpo las caras de la isla para que no se vea doble (Z-fighting)
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(cuerpo.data)
    keep = set(loops)
    for f in reversed(list(bm.faces)):
        if all(l.index in keep for l in f.loops):
            bm.faces.remove(f)
    bm.to_mesh(cuerpo.data)
    bm.free()
    renombrar(cuerpo, 'Piel')
    m_piel = ranura(f'heroe_{clase}{"_f" if sexo == "m" else ""}:skin', img=atlas)
    cuerpo.data.materials.clear()
    cuerpo.data.materials.append(m_piel)
    out['caras'] = caras
    # Cejas: 4 variantes desde la malla UBC (natural / thick / thin / arched)
    renombrar(cejas, 'Ceja_natural')
    decimar(cejas, TRI['ceja'])
    m_hair = ranura(f'heroe_{clase}{"_f" if sexo == "m" else ""}:hair', rough=0.55,
                    rgb=(0.16, 0.11, 0.08))
    cejas.data.materials.clear()
    cejas.data.materials.append(m_hair)
    variants = []
    for style, kw in (('Ceja_thick', dict(grosor=1.55)), ('Ceja_thin', dict(grosor=0.55)),
                      ('Ceja_arched', dict(arco=0.006))):
        c = cejas.copy()
        c.data = cejas.data.copy()
        renombrar(c, style)
        bpy.context.scene.collection.objects.link(c)
        co = np.empty(len(c.data.vertices) * 3)
        c.data.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3)
        z0 = co[:, 2].mean()
        if 'grosor' in kw:      # escalar vertical respecto al centro de la ceja
            co[:, 2] = z0 + (co[:, 2] - z0) * kw['grosor']
        if 'arco' in kw:        # levantar el extremo exterior
            for s in (-1, 1):
                m = np.sign(co[:, 0]) == s
                ext = np.abs(co[:, 0]) > np.percentile(np.abs(co[:, 0]), 55)
                co[m & ext, 2] += kw['arco']
        c.data.vertices.foreach_set('co', co.ravel())
        c.data.update()
        c.parent = arm
        variants.append(c)
    cejas.parent = arm
    for c in [cejas] + variants:
        for m in [x for x in c.modifiers if x.type == 'ARMATURE']:
            c.modifiers.remove(m)
        m = c.modifiers.new('arm', 'ARMATURE')
        m.object = arm
    out['cejas'] = [cejas] + variants
    # Ojos: iris en blanco neutro (ranura eyes para poder teñir)
    renombrar(ojos, 'Ojos')
    decimar(ojos, TRI['ojos'])
    blanco = np.full((8, 8, 3), 0.92, np.float32)
    img = imagen_numpy(f'iris_{clase}_{sexo}', blanco, 8)
    m_eye = ranura(f'heroe_{clase}{"_f" if sexo == "m" else ""}:eyes', rough=0.35, img=img)
    ojos.data.materials.clear()
    ojos.data.materials.append(m_eye)
    ojos.parent = arm
    mo = ojos.modifiers.new('arm', 'ARMATURE')
    mo.object = arm
    out['ojos'] = ojos
    # Peinados
    pelo_base = {'h': {'short': 'Hair_Buzzed', 'long': 'Hair_Long', 'bun': 'Hair_Buns'},
                 'm': {'short': 'Hair_BuzzedFemale', 'long': 'Hair_Long', 'bun': 'Hair_Buns'}}[sexo]
    pelos = {}
    for clave, nodo in pelo_base.items():
        p = traer_pelo(nodo, arm, head_off)
        renombrar(p, f'Pelo_{clave}')
        decimar(p, TRI[clave] if clave in TRI else 600)
        p.data.materials.clear()
        p.data.materials.append(m_hair)
        pelos[clave] = p
    out['pelos'] = pelos
    return out


# ------------------------------------------------------------------ ropa
def shell_de_zonas(arm, cuerpo, zonas, inflate, nombre, material, recorte=None):
    """Caparazón de ropa: copia las caras de la malla cuyos pesos dominantes caen en
    `zonas` (lista de huesos UBC), las separa por la normal (`inflate` m) y engrosa 2 mm.
    `recorte`: función (co, normales) -> máscara de caras a quitar (frontal del chaleco)."""
    import bmesh
    me = cuerpo.data
    grupos = grupo_por_hueso(cuerpo)
    keep_v = set(i for z in zonas for i in grupos.get(z, []))
    bm = bmesh.new()
    bm.from_mesh(me)
    vmap = {v.index: v for v in bm.verts}
    vm2 = {}
    for f in list(bm.faces):
        if not all(v.index in keep_v for v in f.verts):   # estricto: sin triángulos mixtos (púas)
            bm.faces.remove(f)
    for v in list(bm.verts):
        if not any(v in f.verts for f in v.link_faces):
            bm.verts.remove(v)
    for v in bm.verts:
        v.co += v.normal * inflate
    ropa = bpy.data.objects.new(nombre, bpy.data.meshes.new(nombre))  # datos ya nacen con el nombre
    bm.to_mesh(ropa.data)
    bm.free()
    bpy.context.scene.collection.objects.link(ropa)
    md = ropa.modifiers.new('sol', 'SOLIDIFY')
    md.thickness = 0.0025
    ropa.data.materials.append(material)
    # pesos: el mismo hueso dominante del cuerpo en la posición original
    bpy.context.view_layer.update()
    copiar_pesos_por_posicion(arm, cuerpo, ropa)
    return ropa


def copiar_pesos_por_posicion(arm, cuerpo, obj):
    """Cada vértice de `obj` hereda los pesos del vértice más cercano de `cuerpo`."""
    nombres, col, M = weights_matriz(cuerpo)
    co_c = np.empty(len(cuerpo.data.vertices) * 3)
    cuerpo.data.vertices.foreach_get('co', co_c)
    co_c = co_c.reshape(-1, 3)
    co_o = np.empty(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get('co', co_o)
    co_o = co_o.reshape(-1, 3)
    for g in list(obj.vertex_groups):
        obj.vertex_groups.remove(g)
    vs = [(obj.vertex_groups.new(name=n)) for n in nombres]
    # búsqueda vecina a mano (numpy): n cuerpo ~2300 vértices, n ropa ~500.
    for i, p in enumerate(co_o):
        d2 = ((co_c - p) ** 2).sum(axis=1)
        j = int(np.argmin(d2))
        w = np.nonzero(M[j])[0]
        for k in w:
            vs[int(k)].add([i], float(M[j, k]), 'REPLACE')
    mod = obj.modifiers.new('arm', 'ARMATURE')
    mod.object = arm
    obj.parent = arm


def solapa_frontal(ropa, ancho_y=0.055):
    """Quita las caras centrales del pecho: escote en V del chaleco/jubón."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ropa.data)
    for f in reversed(list(bm.faces)):
        c = f.calc_center_median()
        if c.y < -ancho_y and c.z > 1.40 and abs(c.x) < 0.05 * math.sin(min((c.z - 1.40) * 6.0, 1.57)):
            bm.faces.remove(f)
    bm.to_mesh(ropa.data)
    bm.free()


def anillo(nombre, r0, r1, z0, z1, segmentos=10, material=None, grosor=0.008):
    """Banda cilíndrica abierta (faja): eje vertical, radio r0 arriba → r1 abajo."""
    import bmesh
    bm = bmesh.new()

    def anillo_v(z, r):
        return [bm.verts.new((math.cos(2 * math.pi * i / segmentos) * r,
                              math.sin(2 * math.pi * i / segmentos) * r, z))
                for i in range(segmentos)]
    prev = anillo_v(z0, r0)
    cur = anillo_v(z1, r1)
    for i in range(segmentos):
        j = (i + 1) % segmentos
        bm.faces.new((prev[i], prev[j], cur[j], cur[i]))
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(o)
    md = o.modifiers.new('sol', 'SOLIDIFY')
    md.thickness = grosor
    if material:
        me.materials.append(material)
    return o


def hueso(arm, nombre, cabeza, cola, padre=None, deform=True):
    """Añade un hueso de cadena física en modo edición."""
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    b = eb.new(nombre)
    b.head = Vector(cabeza)
    b.tail = Vector(cola)
    b.use_deform = deform
    if padre and padre in eb:
        b.parent = eb[padre]
        b.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm.data.bones[nombre]


def media_zona(cuerpo, grupos, huesos):
    idx = [i for h in huesos for i in grupos.get(h, [])]
    co = np.empty(len(cuerpo.data.vertices) * 3)
    cuerpo.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)[idx]
    return co.mean(axis=0), co.std(axis=0)


def construir_ropa(arm, cuerpo, clase, sexo, m_cloth, m_trim):
    """La ropa base de cada clase, shell desde cero sobre la malla UBC (T-pose)."""
    ropa = []
    grupos = grupo_por_hueso(cuerpo)
    torso = ['spine_01', 'spine_02', 'spine_03']
    if clase == 'centinela':
        t = shell_de_zonas(arm, cuerpo, torso + ['neck_01', 'clavicle_l', 'clavicle_r'],
                           0.016, 'Ropa', m_cloth)
        ropa.append(t)
        pt = shell_de_zonas(arm, cuerpo,
                            ['pelvis', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r',
                             'foot_l', 'foot_r'], 0.011, 'Ropa2', m_trim)
        ropa.append(pt)
        for l in ('l', 'r'):
            hom = shell_de_zonas(arm, cuerpo, [f'upperarm_{l}', f'clavicle_{l}'],
                                 0.022, f'Hombrera_{l.upper()}', m_trim)
            import bmesh
            bm = bmesh.new(); bm.from_mesh(hom.data)
            for f in reversed(list(bm.faces)):
                if f.calc_center_median().z < -0.03:      # sólo el casquete del hombro
                    bm.faces.remove(f)
            bm.to_mesh(hom.data); bm.free()
            ropa.append(hom)
    elif clase == 'cazador':
        t = shell_de_zonas(arm, cuerpo, torso + ['clavicle_l', 'clavicle_r'],
                           0.009, 'Ropa', m_cloth)
        solapa_frontal(t)
        ropa.append(t)
        pt = shell_de_zonas(arm, cuerpo, ['pelvis', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r'],
                            0.010, 'Ropa2', m_trim)
        import bmesh
        bm = bmesh.new(); bm.from_mesh(pt.data)
        for f in reversed(list(bm.faces)):
            if f.calc_center_median().z < 0.42:      # remangado bajo la rodilla
                bm.faces.remove(f)
        bm.to_mesh(pt.data); bm.free()
        ropa.append(pt)
        for l in ('l', 'r'):
            br = shell_de_zonas(arm, cuerpo, [f'lowerarm_{l}'], 0.008, f'Bral_{l.upper()}', m_trim)
            ropa.append(br)
    else:   # oráculo: corpiño hasta la cintura + faja; las piernas, sólo el cono
        tu = shell_de_zonas(arm, cuerpo,
                            ['neck_01', 'clavicle_l', 'clavicle_r'] + torso + ['pelvis'],
                            0.014, 'Ropa', m_cloth)
        ropa.append(tu)
        _, rx, ry, zc = cintura(cuerpo)
        fj = anillo('Faja', 0.135, 0.145, 0, 0.06, 12, m_trim)
        c, _ = media_zona(cuerpo, grupos, ['pelvis', 'spine_01'])
        fj.location = (float(c[0]), float(c[1]), float(c[2]) + 0.075)   # cinturón sobre el borde del cono
        fj.scale = (float(rx) / 0.115 * 1.52, (float(ry) / 0.115 if ry else 1.0) * 1.52, 1.0)
        bpy.context.view_layer.update()
        copiar_pesos_por_posicion(arm, cuerpo, fj)
        ropa.append(fj)
        falda = falda_con_cadena(arm, cuerpo, 'oraculo', 'Tunica_Bajo', z_cuelga=0.66,
                                 r_mult=(1.45, 1.95), material=m_cloth, z_extra=0.045)
        ropa.append(falda)
    return ropa


def cintura(cuerpo):
    """(y_centro, radio_x, radio_y, z) aproximada de la cintura (peso pelvis/spine_01)."""
    grupos = grupo_por_hueso(cuerpo)
    idx = grupos.get('pelvis', []) + grupos.get('spine_01', [])
    co = np.empty(len(cuerpo.data.vertices) * 3)
    cuerpo.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)[idx]
    z = float(np.percentile(co[:, 2], 55))
    banda = co[np.abs(co[:, 2] - z) < 0.04]
    return (float(banda[:, 1].mean()), float(max((banda[:, 0].max() - banda[:, 0].min()) / 2, 0.10)),
            float(max((banda[:, 1].max() - banda[:, 1].min()) / 2, 0.08)), z)


def falda_con_cadena(arm, cuerpo, clase, nombre, z_cuelga, r_mult, material, eslabones=3,
                     z_extra=0.0):
    """Faldón/túnica cónica con cadena `fis_<pieza>_n` de 3–4 eslabones (OMP-POL-13).

    El vértice superior pesa a `pelvis` (hips); cada tramo, a su eslabón, con
    solape suave entre eslabones vecinos.
    """
    import bmesh
    yc, rx, ry, zc = cintura(cuerpo)
    bm = bmesh.new()
    seg_v = 14
    filas = eslabones * 2 + 2
    anillo0 = [bm.verts.new((math.cos(2 * math.pi * i / seg_v) * rx * r_mult[0],
                             math.sin(2 * math.pi * i / seg_v) * ry * r_mult[0], 0.0))
               for i in range(seg_v)]
    prev = anillo0
    for f in range(1, filas + 1):
        t = f / filas
        r = r_mult[0] + (r_mult[1] - r_mult[0]) * t
        z = -z_cuelga * t
        cur = [bm.verts.new((math.cos(2 * math.pi * i / seg_v) * rx * r,
                             math.sin(2 * math.pi * i / seg_v) * ry * r, z))
               for i in range(seg_v)]
        for i in range(seg_v):
            j = (i + 1) % seg_v
            try:
                bm.faces.new((prev[i], prev[j], cur[j], cur[i]))
            except ValueError:
                pass
        prev = cur
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = (0, yc, zc + 0.01 + z_extra)
    md = o.modifiers.new('sol', 'SOLIDIFY'); md.thickness = 0.0022
    me.materials.append(material)
    # cadena de físicas anclada a la cintura
    pieza = {'centinela': 'faldon', 'oraculo': 'tunica', 'cazador': 'capa'}[clase]
    huesos_cadena = []
    dz = z_cuelga / eslabones
    for n in range(1, eslabones + 1):
        nom = f'fis_{pieza}_{n}'
        top = zc - dz * (n - 1) - 0.055          # 5.5 cm bajo la pelvis para arrancar fuera
        bot = zc - dz * n - 0.055
        hueso(arm, nom, (0, yc, top), (0, yc, bot), padre='pelvis' if n == 1 else f'fis_{pieza}_{n - 1}')
        huesos_cadena.append(nom)
    bpy.context.view_layer.update()
    # pesos: función sombrero sobre los nodos [pelvis, fis_1 … fis_n] según la altura z
    vg_hips = o.vertex_groups.new(name='pelvis')
    vgs = [o.vertex_groups.new(name=h) for h in huesos_cadena]
    copios = len(me.vertices)
    co = np.empty(copios * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    nodo = [vg_hips] + vgs
    dz = z_cuelga / eslabones
    for i in range(copios):
        t = min(max(-co[i, 2] / dz, 0.0), float(eslabones))   # 0 = cintura, n = dobladillo
        k = min(int(t), eslabones - 1)
        fr = t - k
        if fr > 0:
            nodo[k].add([i], 1.0 - fr, 'REPLACE')
            nodo[k + 1].add([i], fr, 'REPLACE')
        else:
            nodo[k].add([i], 1.0, 'REPLACE')
    mod = o.modifiers.new('arm', 'ARMATURE')
    mod.object = arm
    o.parent = arm
    return o


def encadenar_pelo_largo(arm, pelo, eslabones=3):
    """Pelo largo con cadena fis_pelo_1..3 bajando por la nuca (padre Head)."""
    me = pelo.data
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    zmax, zmin = co[:, 2].max(), co[:, 2].min()
    for g in list(pelo.vertex_groups):
        pelo.vertex_groups.remove(g)
    vg_head = pelo.vertex_groups.new(name='Head')
    vgs = []
    dz = (zmax - zmin) / eslabones
    for n in range(1, eslabones + 1):
        nom = f'fis_pelo_{n}'
        top = zmax - dz * (n - 1)
        bot = zmax - dz * n
        hueso(arm, nom, (0, 0.055, top), (0, 0.055, max(bot, zmin - 0.02)), padre='Head' if n == 1 else f'fis_pelo_{n - 1}')
        vgs.append(pelo.vertex_groups.new(name=nom))
    for i in range(len(me.vertices)):
        t = (zmax - co[i, 2]) / dz
        if t <= 0.5:
            vg_head.add([i], 1.0, 'REPLACE')
        else:
            s = min(int(t - 0.5), eslabones - 1)
            fr = t - 0.5 - s
            if s > 0 and fr < 0.5:
                vgs[s - 1].add([i], 0.5 - fr, 'REPLACE')
                vgs[s].add([i], 0.5 + fr, 'ADD')
            else:
                vgs[s].add([i], 1.0, 'REPLACE')
    pelo.vertex_groups.update()


# ------------------------------------------------------------------ animación
def cargar_acciones():
    """Acciones de UAL1/UAL2 con sus rigs de origen vivos, en la escena actual.

    Blender 5.2 ata cada acción al objeto importado (el slot evalúa sólo sobre
    ese armature), así que el rig donante debe seguir vivo al hornear: se llama
    después de importar el cuerpo, por héroe. Devuelve {nombre: (accion, rig)}.
    """
    out = {}
    for pt in (UAL1, UAL2):
        prev_obj = set(bpy.context.scene.objects)
        prev_ac = set(bpy.data.actions)
        bpy.ops.import_scene.gltf(filepath=pt)
        for o in list(bpy.context.scene.objects):
            if o.type == 'MESH' and o not in prev_obj:
                bpy.data.objects.remove(o, do_unlink=True)
        rigs = [o for o in bpy.context.scene.objects
                if o.type == 'ARMATURE' and o not in prev_obj]
        rig = rigs[-1]
        rig.hide_render = True
        for ac in bpy.data.actions:
            if ac not in prev_ac:
                ac.use_fake_user = True
                out[ac.name] = (ac, rig)
    return out


def hornear(arm, actos, nombre, destino=None, frames=None, stride=1,
            extra=None):
    """Copia el clip UAL (leyéndolo sobre su rig de origen) a una acción nueva de `arm`.

    `arm` debe tener aún los nombres UBC (el renombrado a FG va al final).
    `extra(pose_bone, frame, f1)`: ajuste por fotograma (Montar, manos al pecho).
    """
    accion, rig = actos[nombre]
    destino = destino or nombre
    ad = rig.animation_data
    for sl in accion.slots:
        if sl.target_id_type == 'ARMATURE':
            ad.action_slot = sl
    ad.action = accion
    f0, f1 = int(round(accion.frame_range[0])), int(round(accion.frame_range[1]))
    if frames:
        f1 = f0 + frames - 1
    act = bpy.data.actions.new(destino)
    bpy.context.view_layer.objects.active = arm
    arm.animation_data_create()
    for sl in act.slots:
        if sl.target_id_type == 'ARMATURE':
            arm.animation_data.action_slot = sl
    arm.animation_data.action = act
    pose = list(arm.pose.bones)
    for pb in pose:
        pb.rotation_mode = 'QUATERNION'
    f = f0
    while f <= f1:
        bpy.context.scene.frame_set(f)
        frame = f - f0 + 1
        for pb in pose:
            src = rig.pose.bones.get(pb.name)
            if src is None:
                continue
            pb.matrix_basis = Matrix(src.matrix_basis)
        if extra:
            extra(arm, frame, f1 - f0 + 1)
        for pb in pose:
            pb.keyframe_insert('location', frame=frame)
            pb.keyframe_insert('rotation_quaternion', frame=frame)
            pb.keyframe_insert('scale', frame=frame)
        f += stride
    bpy.context.view_layer.update()
    for pb in pose:
        pb.matrix_basis = Matrix.Identity(4)
    arm.animation_data.action = None
    act.use_fake_user = True
    return act


def renombrar_huesos(arm):
    """UBC → FG en el armazón y en los grupos de vértice de las mallas ligadas.

    Sync de nombres manual: RNA b.name no propaga a vertex groups; si se queda
    desiguales, el modificador de armadura no encuentra los pesos.
    """
    mapa = {b.name: nombre_fg(b.name) for b in arm.data.bones}
    for b in arm.data.bones:
        if mapa[b.name] != b.name:
            b.name = mapa[b.name]
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        for g in o.vertex_groups:
            if g.name in mapa and mapa[g.name] != g.name:
                g.name = mapa[g.name]


def renombrar_accion(act):
    """Rutas de fcurve: pose.bones[\"UBC\"] → [\"FG\"]."""
    for lay in act.layers:
        for st in lay.strips:
            for cb in st.channelbags:
                for fc in cb.fcurves:
                    m = re.search(r'\"([^\"]+)\"', fc.data_path)
                    if m:
                        viejo = m.group(1)
                        nuevo_n = nombre_fg(viejo)
                        if viejo != nuevo_n:
                            fc.data_path = fc.data_path.replace(f'\"{viejo}\"', f'\"{nuevo_n}\"')


# ------------------------------------------------------------------ emotes
def emote(arm, nombre, fotogramas, poses):
    """Clip propio: `poses` = [(frame, {hueso_UBC: (eje_x_deg, eje_y_deg, eje_z_deg)})].

    Se aplica por rotación euler local sobre el reposo; los huesos no mencionados
    se quedan donde estaban (se interpola key a key).
    """
    act = bpy.data.actions.new(nombre)
    arm.animation_data_create()
    for sl in act.slots:
        if sl.target_id_type == 'ARMATURE':
            arm.animation_data.action_slot = sl
    arm.animation_data.action = act
    pb = {b.name: arm.pose.bones[b.name] for b in arm.pose.bones}
    for k in pb:
        # cuaterniones: el horneado UAL los usa y el exportador glTF toma el modo
        # que tienen los huesos al exportar; si quedan en XYZ, los clips horneados
        # salen planos (2 claves constantes).
        pb[k].rotation_mode = 'QUATERNION'
    for f, ps in poses:
        for h, (rx, ry, rz) in ps.items():
            if h not in pb:
                continue
            pb[h].rotation_quaternion = Euler((math.radians(rx), math.radians(ry),
                                               math.radians(rz)), 'XYZ').to_quaternion()
            pb[h].keyframe_insert('rotation_quaternion', frame=f)
    for h in pb:
        pb[h].rotation_quaternion = (1, 0, 0, 0)
    arm.animation_data.action = None
    act.use_fake_user = True
    return act


# ------------------------------------------------------------------ complexión
MASA_ZONAS = {   # bandas y factores robusto (delgado = recíproco aprox.), sin cabeza ni extremos
    'torso': (['pelvis', 'spine_01', 'spine_02', 'spine_03'], 1.10),
    'brazo': (['upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r'], 1.10),
    'pierna': (['thigh_l', 'thigh_r', 'calf_l', 'calf_r'], 1.07),
    'cuello': (['neck_01'], 1.20),
}
EXCLUIDAS = ['Head', 'hand_l', 'hand_r', 'foot_l', 'foot_r', 'ball_l', 'ball_r'] + \
            [f'{p}_0{n}_{l}' for l in 'lr' for p in ('thumb', 'index', 'middle', 'ring', 'pinky') for n in (1, 2, 3, 4)]


def shape_keys_cuerpo(obj):
    """Añade `cuerpo_delgado` y `cuerpo_robusto` (morph targets) sin tocar altura ni extremos."""
    grupos = grupo_por_hueso(obj)
    co0 = np.empty(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get('co', co0)
    co0 = co0.reshape(-1, 3).copy()
    idx = [i for z, (hs, _) in MASA_ZONAS.items() for h in hs for i in grupos.get(h, [])]
    idx = sorted(set(idx) - set(i for e in EXCLUIDAS for i in grupos.get(e, [])))
    if obj.data.shape_keys is None:
        base = obj.shape_key_add(name='Basis')
    else:
        base = obj.data.shape_keys.key_blocks['Basis']
    base.interpolation = 'KEY_LINEAR'
    for nombre, k in (('cuerpo_robusto', 1.0), ('cuerpo_delgado', -1.0)):
        sk = obj.shape_key_add(name=nombre, from_mix=False)
        co = co0.copy()
        for z, (hs, f) in MASA_ZONAS.items():
            zi = [i for i in idx if i in set().union(*[set(grupos.get(h, [])) for h in hs])]
            if not zi:
                continue
            arr = np.array(zi)
            xc = co0[arr, 0].mean(axis=0, keepdims=True)
            yc = co0[arr, 1].mean(axis=0, keepdims=True)
            fac = 1.0 + k * (f - 1.0) * (1 if nombre == 'cuerpo_robusto' else 1)
            if nombre == 'cuerpo_delgado':
                fac = 1.0 - (f - 1.0) * 0.85
            co[arr, 0] = xc + (co[arr, 0] - xc) * fac
            co[arr, 1] = yc + (co[arr, 1] - yc) * fac
        sk.data.foreach_set('co', co.astype(np.float32).ravel())
    return obj


def shape_keys_pieza(obj):
    """Las dos shape keys también en la ropa: mismo desplazamiento radial por posición."""
    if not obj.data.polygons:
        return obj
    co0 = np.empty(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get('co', co0)
    co0 = co0.reshape(-1, 3)
    zband = np.zeros(len(co0), bool)
    for hs, f in MASA_ZONAS.values():
        pass
    # banda por altura: torso ~0.95–1.45, cuello >1.45 (sin cabeza), pierna <0.9
    torso = (co0[:, 2] > 0.92) & (co0[:, 2] < 1.46)
    cuello = (co0[:, 2] >= 1.46) & (np.abs(co0[:, 0]) < 0.075) & (co0[:, 1] > -0.02)
    if obj.data.shape_keys is None:
        obj.shape_key_add(name='Basis')
    for nombre, fac_t, fac_c in (('cuerpo_robusto', 1.10, 1.18), ('cuerpo_delgado', 0.915, 0.85)):
        sk = obj.shape_key_add(name=nombre, from_mix=False)
        co = co0.copy()
        for mask, f in ((torso, fac_t), (cuello, fac_c)):
            i = np.flatnonzero(mask)
            if len(i) == 0:
                continue
            xc = co0[i, 0].mean()
            yc = co0[i, 1].mean()
            co[i, 0] = xc + (co[i, 0] - xc) * f
            co[i, 1] = yc + (co[i, 1] - yc) * f
        sk.data.foreach_set('co', co.astype(np.float32).ravel())
    return obj


# ------------------------------------------------------------------ clips
MAPA_CLIPS = {   # nombre del juego ← clip UAL
    'Reposo': 'Idle_Loop',
    'Caminar': 'Walk_Loop',
    'Correr': 'Jog_Fwd_Loop',
    'Golpeado': 'Hit_Chest',
    'Morir': 'Death01',
    'Rodar': 'Roll',
    'Lanzar': 'Spell_Simple_Shoot',
    'Disparar': 'OverhandThrow',
    'Emote_dance': 'Dance_Loop',
    'Emote_doubt': 'Idle_No_Loop',
    'Emote_love': 'Yes',
}
ATAQUE = {'centinela': 'Sword_Regular_A', 'cazador': 'Sword_Attack', 'oraculo': 'Punch_Jab'}
# emotes sin fuente en UAL: handeados aquí (grados por hueso UBC)
EMOTES = {
    'Emote_wave': (40, [
        (1, {}), (8, {'upperarm_r': (-140, 0, 0), 'lowerarm_r': (0, 0, 35)}),
        (16, {'upperarm_r': (-150, 0, 10), 'lowerarm_r': (0, 0, 55)}),
        (24, {'upperarm_r': (-150, 0, -15), 'lowerarm_r': (0, 0, 15)}),
        (32, {'upperarm_r': (-150, 0, 10), 'lowerarm_r': (0, 0, 55)}),
        (40, {'upperarm_r': (0, 0, 0), 'lowerarm_r': (0, 0, 0)})]),
    'Emote_laugh': (36, [
        (1, {}), (6, {'spine_02': (8, 0, 0), 'spine_03': (6, 0, 0), 'neck_01': (-10, 0, 0), 'Head': (-12, 0, 0)}),
        (12, {'spine_02': (-4, 0, 0), 'spine_03': (-3, 0, 0), 'Head': (6, 0, 0)}),
        (18, {'spine_02': (8, 0, 0), 'spine_03': (6, 0, 0), 'Head': (-12, 0, 0)}),
        (24, {'spine_02': (-4, 0, 0), 'Head': (6, 0, 0)}),
        (30, {'spine_02': (6, 0, 0), 'Head': (-8, 0, 0)}),
        (36, {})])
    , 'Emote_cry': (50, [
        (1, {}), (10, {'spine_02': (12, 0, 0), 'spine_03': (10, 0, 0), 'neck_01': (10, 0, 0), 'Head': (14, 0, 0),
                       'upperarm_l': (-25, 0, 20), 'upperarm_r': (-25, 0, -20),
                       'lowerarm_l': (0, 0, 90), 'lowerarm_r': (0, 0, -90)}),
        (25, {'spine_02': (14, 0, 0), 'spine_03': (12, 0, 0), 'Head': (16, 0, 0),
              'upperarm_l': (-27, 0, 20), 'upperarm_r': (-27, 0, -20),
              'lowerarm_l': (0, 0, 95), 'lowerarm_r': (0, 0, -85)}),
        (40, {'spine_02': (12, 0, 0), 'Head': (14, 0, 0), 'upperarm_l': (-25, 0, 20), 'upperarm_r': (-25, 0, -20),
              'lowerarm_l': (0, 0, 90), 'lowerarm_r': (0, 0, -90)}),
        (50, {})])
    , 'Emote_angry': (32, [
        (1, {}), (8, {'spine_02': (-6, 0, 0), 'spine_03': (-5, 0, 0), 'neck_01': (4, 0, 0), 'Head': (6, 0, 0),
                      'upperarm_l': (0, 0, -30), 'upperarm_r': (0, 0, 30), 'lowerarm_l': (0, 0, -100), 'lowerarm_r': (0, 0, 100)}),
        (16, {'upperarm_l': (0, 0, -32), 'upperarm_r': (0, 0, 32), 'lowerarm_l': (0, 0, -105), 'lowerarm_r': (0, 0, 105),
              'spine_02': (-4, 0, 0)}),
        (24, {'upperarm_l': (0, 0, -30), 'upperarm_r': (0, 0, 30), 'lowerarm_l': (0, 0, -100), 'lowerarm_r': (0, 0, 100), 'spine_02': (-6, 0, 0)}),
        (32, {})])
    , 'Emote_sleep': (70, [
        (1, {}), (16, {'spine_01': (18, 0, 0), 'spine_02': (16, 0, 0), 'spine_03': (12, 0, 0), 'neck_01': (16, 0, 0), 'Head': (20, 0, 0),
                       'upperarm_l': (10, 0, 8), 'upperarm_r': (10, 0, -8), 'thigh_l': (-30, 0, 0), 'thigh_r': (-30, 0, 0),
                       'calf_l': (40, 0, 0), 'calf_r': (40, 0, 0), 'pelvis': (0, 0, 0)}),
        (50, {'spine_01': (20, 0, 0), 'spine_02': (18, 0, 0), 'spine_03': (14, 0, 0), 'neck_01': (18, 0, 0), 'Head': (24, 0, 0),
              'upperarm_l': (12, 0, 8), 'upperarm_r': (12, 0, -8), 'thigh_l': (-32, 0, 0), 'thigh_r': (-32, 0, 0),
              'calf_l': (42, 0, 0), 'calf_r': (42, 0, 0)}),
        (70, {})]),
}


# ------------------------------------------------------------------ ensamblado
def ajustar_loops(act):
    """Sin root motion (los clips UAL la traen despreciable), se deja el bake tal cual;
    sólo se asegura interpolación LINEAR y clave final == inicial en los bucles."""
    bucles = {'Reposo', 'Caminar', 'Correr', 'Emote_dance', 'Emote_doubt'}
    for lay in act.layers:
        for st in lay.strips:
            for cb in st.channelbags:
                for fc in cb.fcurves:
                    for kp in fc.keyframe_points:
                        kp.interpolation = 'LINEAR'
                    if act.name in bucles and len(fc.keyframe_points) > 1:
                        a, b = fc.keyframe_points[0], fc.keyframe_points[-1]
                        if abs(a.co.y - b.co.y) > 1e-5:
                            b.co.y = a.co.y
                            b.handle_left.y = a.handle_left.y
                            b.handle_right.y = a.handle_right.y


def extra_montar(arm):
    """Piernas abiertas a los lados y cadera hundida sobre Sitting_Idle_Loop.

    La apertura va por el eje local Y del muslo (el que separa en UBC); se comprueba
    en la tira de fotogramas de la lámina.
    """
    def _extra(arm_, frame, total):
        pb = arm_.pose.bones
        w = min(frame * 6.0 / max(total - 1, 1), 1.0)
        for l in ('l', 'r'):
            th = pb[f'thigh_{l}']
            ang = math.radians(42 * w) * (1 if l == 'l' else -1)
            th.matrix_basis = Matrix(th.matrix_basis) @ Matrix.Rotation(ang, 4, 'Y')
            ca = pb[f'calf_{l}']
            ca.matrix_basis = Matrix(ca.matrix_basis) @ Matrix.Rotation(math.radians(-18 * w), 4, 'Y')
        pv = pb['pelvis']
        pv.location = Vector(pv.location) + Vector((0, 0.015, -0.10)) * w
    return _extra


def construir(clase, sexo, exportar=True):
    arm, cuerpo, cejas, ojos, k, head_off = importar_armazon(clase, sexo)
    actos = cargar_acciones()
    piezas = construir_piezas(arm, cuerpo, cejas, ojos, clase, sexo, head_off)
    suf = '_f' if sexo == 'm' else ''
    tela = {'centinela': ((0.28, 0.24, 0.22), (0.45, 0.42, 0.44)),
            'cazador': ((0.30, 0.22, 0.14), (0.50, 0.38, 0.22)),
            'oraculo': ((0.62, 0.55, 0.40), (0.40, 0.25, 0.20))}[clase]
    m_cloth = ranura(f'heroe_{clase}{suf}:cloth', rough=0.8, rgb=tela[0])
    m_trim = ranura(f'heroe_{clase}{suf}:trim', rough=0.6, rgb=tela[1])
    ropa = construir_ropa(arm, cuerpo, clase, sexo, m_cloth, m_trim)
    # shape keys en cuerpo y ropa
    shape_keys_cuerpo(cuerpo)
    for r in ropa:
        shape_keys_pieza(r)
    # pelo largo con cadena
    encadenar_pelo_largo(arm, piezas['pelos']['long'], 3)
    if clase == 'centinela':
        cap = falda_con_cadena(arm, cuerpo, 'centinela', 'Capa', 0.72, (1.2, 1.8), m_cloth)
        cap.location.y = 0.13
        import bmesh as _bm
        _b = _bm.new(); _b.from_mesh(cap.data)
        for _f in reversed(list(_b.faces)):
            if (_f.calc_center_median().y + cap.location.y) < -0.02:   # sin faldón delantero
                _b.faces.remove(_f)
        _b.to_mesh(cap.data); _b.free()
        shape_keys_pieza(cap)
        ropa.append(cap)
    # clips
    tracks = []
    for dest, src in MAPA_CLIPS.items():
        tracks.append(hornear(arm, actos, src, destino=dest))
    tracks.append(hornear(arm, actos, ATAQUE[clase], destino='Atacar'))
    tracks.append(hornear(arm, actos, 'Sitting_Idle_Loop', destino='Montar', frames=40,
                         extra=extra_montar(arm)))
    for nombre, (dur, poses) in EMOTES.items():
        tracks.append(emote(arm, nombre, dur, poses))
    for a in tracks:
        ajustar_loops(a)
    renombrar_huesos(arm)
    for a in tracks:
        renombrar_accion(a)
    # los rigs donantes (pelo, UAL) ya no hacen falta: fuera huérfanas
    for o in [x for x in bpy.context.scene.objects if x.type == 'ARMATURE' and x is not arm]:
        bpy.data.objects.remove(o, do_unlink=True)
    # NLA: un clip por pista
    ad = arm.animation_data_create()
    ad.action = None
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)
    for a in tracks:
        tr = ad.nla_tracks.new()
        tr.name = a.name
        tr.strips.new(a.name, int(a.frame_range[0]), a)
    # reposo para el render: silenciar pistas tras exportar
    bpy.context.scene.frame_set(1)
    # piezas del héroe: toda malla emparentada a su armadura (el motor elige variantes)
    vis = [arm] + [o for o in bpy.context.scene.objects
                   if o.type == 'MESH' and o.parent == arm]
    total = tri_total(vis)
    if exportar:
        os.makedirs(SALIDA, exist_ok=True)
        bpy.ops.object.select_all(action='DESELECT')
        for o in vis:
            o.select_set(True)
        arm.select_set(True)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.export_scene.gltf(filepath=os.path.join(SALIDA, f'{clase}{suf}.glb'),
                                  export_format='GLB', use_selection=True,
                                  export_animations=True, export_animation_mode='NLA_TRACKS',
                                  export_apply=False, export_materials='EXPORT',
                                  export_image_format='AUTO')
    # reposo real: el horneado deja matrix_basis escritos en los huesos; sin
    # fcurves que los manden (action=None, pistas mudas) ese valor persiste.
    for tr in ad.nla_tracks:
        tr.mute = True
    ad.action = None
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.rotation_euler = (0, 0, 0)
        pb.rotation_axis_angle = (0, 1, 0, 0)
        pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    return arm, vis, total


def main(argv):
    solo = None
    if '--hero' in argv:
        i = argv.index('--hero')
        solo = (argv[i + 1], argv[i + 2])
    pares = [solo] if solo else [(c, s) for c in CLASES for s in ('h', 'm')]
    for c, s in pares:
        arm, vis, total = construir(c, s)
        print(f'HEROE {c}{"" if s == "h" else "_f"}: {total} triangulos')


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
