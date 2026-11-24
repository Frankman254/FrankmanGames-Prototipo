# Telas, capas y piezas que cuelgan: cadenas de huesos con retraso, horneadas en cada clip
# (docs/GUIA_BLENDER_MCP.md, «Telas, capas y piezas que se mueven»; creador, 2026-11-23).
#
# Nada de simulación: cada hueso de la cadena repite el giro y el vaivén del hueso del cuerpo
# que la sostiene (el ancla) con un retraso que crece hacia la punta. En los bucles el retraso
# de la punta es medio paso (un cuarto del ciclo) y se lee dando la vuelta al ciclo, así que el
# bucle cierra sin salto. Encima se suman tres cosas pequeñas:
#   - colgar: la tela recupera parte de la vertical cuando el cuerpo se inclina;
#   - aire: al andar y correr la punta se va hacia atrás;
#   - cuerpo: la tela nunca pasa por delante de su posición de reposo hacia el cuerpo (capas y
#     pelo de la espalda), ni se aleja más de `max_deg` del reposo.
#
# Uso desde un generador o una etapa de post-proceso:
#   cadena = fg_telas.Cadena('capa', ancla='chest', n=3, cabeza=v0, punta=v1, ...)
#   fg_telas.crear_huesos(arm, [cadena])
#   fg_telas.pesar(obj, arm, cadena, peso_fn)
#   fg_telas.hornear(arm, [cadena], acciones, bucles={'Caminar': 1.2, ...})
import math

import bpy
from mathutils import Matrix, Quaternion, Vector

PREFIJO = 'tela_'


class Cadena:
    """Una cadena de `n` huesos en línea recta de `cabeza` a `punta` (espacio del armazón),
    emparentada al hueso `ancla` del cuerpo."""

    def __init__(self, nombre, ancla, n, cabeza, punta, retraso_frac=0.25, retraso_golpe=4.0,
                 ganancia=1.0, colgar=0.3, aire_deg=(0.0, 8.0, 22.0), max_deg=45.0,
                 hacia_cuerpo_deg=2.0, vaiven=1.0):
        self.nombre = nombre
        self.ancla = ancla
        self.n = n
        self.cabeza = Vector(cabeza)
        self.punta = Vector(punta)
        self.retraso_frac = retraso_frac      # retraso de la punta en bucles, fracción del ciclo
        self.retraso_golpe = retraso_golpe    # retraso de la punta en clips sueltos (fotogramas)
        self.ganancia = ganancia              # 1 = repite el giro retrasado entero
        self.colgar = colgar                  # 0 = rígida con el ancla, 1 = siempre a plomo
        self.aire_deg = aire_deg              # inclinación hacia atrás en Reposo, Caminar y Correr
        self.max_deg = max_deg                # tope de giro por hueso respecto a su reposo
        self.hacia_cuerpo_deg = hacia_cuerpo_deg  # lo que puede acercarse al cuerpo la punta
        self.vaiven = vaiven                  # cuánto empuja el sube y baja del ancla

    def huesos(self):
        return [f'{PREFIJO}{self.nombre}{i + 1}' for i in range(self.n)]


def crear_huesos(arm, cadenas):
    """Añade los huesos de cada cadena (sin malla propia: solo reparten pesos)."""
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    for c in cadenas:
        prev = eb[c.ancla]
        for i, nombre in enumerate(c.huesos()):
            if nombre in eb:
                eb.remove(eb[nombre])
            b = eb.new(nombre)
            b.head = c.cabeza.lerp(c.punta, i / c.n)
            b.tail = c.cabeza.lerp(c.punta, (i + 1) / c.n)
            b.roll = 0.0
            b.parent = prev
            b.use_connect = i > 0
            b.use_deform = True
            prev = b
    bpy.ops.object.mode_set(mode='OBJECT')
    for c in cadenas:
        for nombre in c.huesos():
            arm.pose.bones[nombre].rotation_mode = 'QUATERNION'


def pesar(obj, arm, cadena, cuanto):
    """Reparte los vértices de `obj` entre el ancla y la cadena. `cuanto(p)` (p en espacio del
    armazón) dice qué parte va a la cadena (0–1). Dentro de la cadena, cada vértice va al hueso
    a su altura, mezclado con el anterior cerca de cada articulación para que no se quiebre."""
    inv = arm.matrix_world.inverted() @ obj.matrix_world
    eje = cadena.punta - cadena.cabeza
    L2 = eje.length_squared
    nombres = cadena.huesos()
    grupos = {g.name: g for g in obj.vertex_groups}
    for nombre in nombres:
        if nombre not in grupos:
            grupos[nombre] = obj.vertex_groups.new(name=nombre)
    for v in obj.data.vertices:
        p = inv @ v.co
        w = max(0.0, min(1.0, cuanto(p)))
        if w <= 0.0:
            continue
        s = max(0.0, min(cadena.n - 1e-6, (p - cadena.cabeza).dot(eje) / L2 * cadena.n))
        k = int(s)
        f = s - k
        # La mitad de arriba de cada hueso se mezcla con el de arriba (o con el ancla).
        mez = max(0.0, 0.5 - f) if k > 0 else 0.0
        reparto = {nombres[k]: w * (1 - mez)}
        if mez > 0:
            reparto[nombres[k - 1]] = w * mez
        # Lo que se lleva la cadena sale de los pesos que tenía el vértice.
        viejos = [(obj.vertex_groups[g.group].name, g.weight) for g in v.groups if g.weight > 0]
        for nombre, peso in viejos:
            obj.vertex_groups[nombre].add([v.index], peso * (1 - w), 'REPLACE')
        for nombre, peso in reparto.items():
            grupos[nombre].add([v.index], peso, 'REPLACE')


def _interp(muestras, t):
    """Matriz (rotación + traslación) interpolada en el instante fraccionario `t`."""
    k0 = math.floor(t)
    f = t - k0
    a = muestras[k0]
    b = muestras.get(k0 + 1, a)
    q = a.to_quaternion().slerp(b.to_quaternion(), f)
    tr = a.translation.lerp(b.translation, f)
    return Matrix.Translation(tr) @ q.to_matrix().to_4x4()


def _girar_hacia(q, desde, hacia):
    return desde.rotation_difference(hacia) @ q


def hornear(arm, cadenas, acciones, bucles):
    """Hornea las cadenas en cada acción. `bucles` = {clip: velocidad en m/s} de los clips que se
    repiten (Reposo, Caminar, Correr); la velocidad marca el aire (índice 0, 1, 2 de `aire_deg`
    según sea 0, de andar o de correr)."""
    ad = arm.animation_data_create()
    bones = arm.data.bones
    anclas = sorted({c.ancla for c in cadenas})
    informe = {}
    for act in acciones:
        ad.action = act
        if hasattr(ad, 'action_slot') and act.slots:
            ad.action_slot = act.slots[0]
        f0, f1 = int(round(act.frame_range[0])), int(round(act.frame_range[1]))
        loop = act.name in bucles
        ciclo = max(1, f1 - f0)
        # Pose del ancla en cada fotograma (espacio del armazón).
        muestras = {a: {} for a in anclas}
        for f in range(f0, f1 + 1):
            bpy.context.scene.frame_set(f)
            for a in anclas:
                muestras[a][f] = arm.pose.bones[a].matrix.copy()
        v = bucles.get(act.name, 0.0)
        nivel = 0 if v <= 0 else 1 if v < 2.0 else 2
        peor = 0.0
        claves = {}
        for f in range(f0, f1 + 1):
            for c in cadenas:
                rest_a = bones[c.ancla].matrix_local
                Ma = muestras[c.ancla][f]
                Ra = Ma.to_3x3().normalized()
                Rrel = Ra @ rest_a.to_3x3().normalized().inverted()   # giro del ancla desde reposo
                abajo = Vector((0, 0, -1))
                atras = (Rrel @ Vector((0, 1, 0))).normalized()       # el personaje mira a -Y
                lado = (Rrel @ Vector((1, 0, 0))).normalized()
                retraso_punta = c.retraso_frac * ciclo if loop else c.retraso_golpe
                Mpadre = Ma
                padre_rest = rest_a
                for i, nombre in enumerate(c.huesos()):
                    b = bones[nombre]
                    off = padre_rest.inverted() @ b.matrix_local
                    M0 = Mpadre @ off                                  # pegado al padre, sin retraso
                    y0 = M0.to_3x3().normalized().col[1]
                    # Giro y posición del ancla hace `d` fotogramas.
                    d = retraso_punta * (i + 1) / c.n
                    t = f - d
                    if loop:
                        t = f0 + ((t - f0) % ciclo)
                    else:
                        t = max(f0, t)
                    Ml = _interp(muestras[c.ancla], t)
                    Rl = Ml.to_3x3().normalized() @ rest_a.to_3x3().normalized().inverted()
                    y_rest = b.matrix_local.to_3x3().normalized().col[1]
                    y = Rl @ y_rest
                    # Vaivén: si el ancla se movió, la punta se queda atrás.
                    largo = (c.punta - c.cabeza).length * (i + 1) / c.n
                    mov = Ma.translation - Ml.translation
                    y = (y * largo - mov * c.vaiven).normalized()
                    y = Vector(y0).lerp(y, c.ganancia).normalized()
                    # Colgar: parte del camino hacia la dirección que tendría con el cuerpo derecho.
                    if c.colgar > 0:
                        y = y.lerp(y_rest, c.colgar).normalized()
                    # Aire: la punta se va hacia atrás, girando sobre el eje lateral.
                    a = math.radians(c.aire_deg[nivel]) * (i + 1) / c.n
                    if a:
                        y = (Quaternion(lado, a) @ y).normalized()
                    # Cuerpo: no se acerca al cuerpo más que `hacia_cuerpo_deg` respecto al reposo.
                    yr = (Rrel @ y_rest).normalized()
                    tope = math.sin(math.radians(c.hacia_cuerpo_deg))
                    hacia = -(y - yr).dot(atras)
                    if hacia > tope:
                        y = (y + atras * (hacia - tope)).normalized()
                    # Tope de giro respecto al pegado sin retraso.
                    ang = y0.angle(y, 0.0)
                    if ang > math.radians(c.max_deg):
                        y = y0.slerp(y, math.radians(c.max_deg) / ang)
                    peor = max(peor, math.degrees(y0.angle(y, 0.0)))
                    R = y0.rotation_difference(y).to_matrix() @ M0.to_3x3().normalized()
                    q_local = (M0.to_3x3().normalized().inverted() @ R).to_quaternion()
                    claves.setdefault(nombre, {})[f] = q_local
                    Mpadre = Matrix.Translation(M0.translation) @ R.to_4x4()
                    padre_rest = b.matrix_local
        if loop:
            for nombre in claves:
                claves[nombre][f1] = claves[nombre][f0]
        for nombre, por_f in claves.items():
            pb = arm.pose.bones[nombre]
            for f, q in por_f.items():
                pb.rotation_quaternion = q
                pb.keyframe_insert('rotation_quaternion', frame=f)
        informe[act.name] = round(peor, 1)
    ad.action = None
    return informe
