# Texturas pintadas a mano, generadas en Blender con nodos y horneadas a PNG.
# Estilo «pintura» del juego: colores planos, manchas suaves y sombras pintadas, sin
# ruido fotográfico. Todas son repetibles: el ruido se muestrea sobre un toro en 4D
# (u y v dan la vuelta) y los dibujos usan frecuencias enteras.
#   from fg_pintura import hornear_todo; hornear_todo()   (o ejecutar este archivo)
# Escribe assets/textures/pintadas/<nombre>.png y <nombre>_normal.png.
import math
import os

import bpy

try:
    _HERE = os.path.dirname(bpy.path.abspath(__file__))
except NameError:  # exec() por MCP
    _HERE = os.path.join(os.path.dirname(bpy.data.filepath or ''), '')
    _HERE = _HERE if os.path.isdir(os.path.join(_HERE, 'scripts')) else r'C:\Users\frank\Desktop\2026\FrankmanGames-Prototipo\scripts\blender'
OUT = os.path.normpath(os.path.join(_HERE, '..', '..', 'assets', 'textures', 'pintadas'))
TAU = 2 * math.pi


def srgb(c):
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def acerca(a, b, k):
    """Color de `a` llevado una fracción `k` hacia `b`: baja el contraste de una mancha."""
    return tuple(x + (y - x) * k for x, y in zip(a, b))


def hexc(h):
    h = h.lstrip('#')
    return srgb(tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)))


class Nodos:
    """Atajos para escribir árboles de nodos con pocas líneas."""

    def __init__(self, mat):
        self.t = mat.node_tree
        self.t.nodes.clear()
        tc = self.n('ShaderNodeTexCoord')
        sep = self.n('ShaderNodeSeparateXYZ')
        self.link(tc.outputs['UV'], sep.inputs[0])
        self.u, self.v = sep.outputs[0], sep.outputs[1]

    def n(self, kind, **props):
        node = self.t.nodes.new(kind)
        for k, val in props.items():
            setattr(node, k, val)
        return node

    def link(self, a, b):
        self.t.links.new(a, b)

    def math(self, op, a, b=None, c=None):
        m = self.n('ShaderNodeMath', operation=op)
        for i, x in enumerate((a, b, c)):
            if x is None:
                continue
            if isinstance(x, (int, float)):
                m.inputs[i].default_value = x
            else:
                self.link(x, m.inputs[i])
        return m.outputs[0]

    def mix(self, fac, a, b, blend='MIX'):
        m = self.n('ShaderNodeMix', data_type='RGBA', blend_type=blend)
        fac_in = m.inputs[0]
        a_in = next(s for s in m.inputs if s.name == 'A' and s.type == 'RGBA')
        b_in = next(s for s in m.inputs if s.name == 'B' and s.type == 'RGBA')
        for sock, x in ((fac_in, fac), (a_in, a), (b_in, b)):
            if isinstance(x, (int, float)):
                sock.default_value = x
            elif isinstance(x, tuple):
                sock.default_value = (*x[:3], 1)
            else:
                self.link(x, sock)
        return next(s for s in m.outputs if s.type == 'RGBA')

    def torus(self, freq_u=1, freq_v=1, r=1.0):
        """Vector 3D + W que recorren un toro: el ruido sale repetible en u y v."""
        au = self.math('MULTIPLY', self.u, TAU * freq_u)
        av = self.math('MULTIPLY', self.v, TAU * freq_v)
        x = self.math('MULTIPLY', self.math('COSINE', au), r)
        y = self.math('MULTIPLY', self.math('SINE', au), r)
        z = self.math('MULTIPLY', self.math('COSINE', av), r)
        w = self.math('MULTIPLY', self.math('SINE', av), r)
        comb = self.n('ShaderNodeCombineXYZ')
        self.link(x, comb.inputs[0])
        self.link(y, comb.inputs[1])
        self.link(z, comb.inputs[2])
        return comb.outputs[0], w

    def noise(self, scale=1.0, detail=2.0, rough=0.5, freq=(1, 1), seed=0.0, distortion=0.0):
        vec, w = self.torus(*freq, r=scale)
        n = self.n('ShaderNodeTexNoise', noise_dimensions='4D')
        self.link(vec, n.inputs['Vector'])
        self.link(self.math('ADD', w, seed * 7.31), n.inputs['W'])
        n.inputs['Scale'].default_value = 1.0
        n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough
        n.inputs['Distortion'].default_value = distortion
        return n.outputs['Fac']

    def voronoi(self, scale=1.0, freq=(1, 1), seed=0.0, feature='F1', out='Distance'):
        vec, w = self.torus(*freq, r=scale)
        n = self.n('ShaderNodeTexVoronoi', voronoi_dimensions='4D', feature=feature)
        self.link(vec, n.inputs['Vector'])
        self.link(self.math('ADD', w, seed * 3.17), n.inputs['W'])
        n.inputs['Scale'].default_value = 1.0
        return n.outputs[out]

    def ramp(self, fac, stops, interp='EASE'):
        r = self.n('ShaderNodeValToRGB')
        cr = r.color_ramp
        cr.interpolation = interp
        while len(cr.elements) > 1:
            cr.elements.remove(cr.elements[-1])
        cr.elements[0].position, cr.elements[0].color = stops[0][0], (*stops[0][1], 1)
        for pos, col in stops[1:]:
            e = cr.elements.new(pos)
            e.color = (*col, 1)
        self.link(fac, r.inputs['Fac'])
        return r.outputs['Color']

    def wave(self, a, freq):
        """sin(2π·freq·a) en [0,1]."""
        return self.math('MULTIPLY_ADD', self.math('SINE', self.math('MULTIPLY', a, TAU * freq)), 0.5, 0.5)

    def frac(self, a, freq):
        return self.math('FRACT', self.math('MULTIPLY', a, freq))

    def tri(self, a, freq):
        """Diente triangular 0→1→0 con `freq` dientes por vuelta."""
        return self.math('MULTIPLY', self.math('ABSOLUTE', self.math('SUBTRACT', self.frac(a, freq), 0.5)), 2.0)

    def _smooth(self, a, e0, e1):
        m = self.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP')
        self.link(a, m.inputs['Value'])
        m.inputs['From Min'].default_value = e0
        m.inputs['From Max'].default_value = e1
        return m.outputs['Result']


def _plane(scene):
    old = bpy.data.objects.get('FG_Pintura_lienzo')
    if old:
        bpy.data.objects.remove(old)
    me = bpy.data.meshes.get('FG_Pintura_lienzo') or bpy.data.meshes.new('FG_Pintura_lienzo')
    me.clear_geometry()
    me.from_pydata([(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name='UVMap')
    for li, c in zip(range(4), ((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[li].uv = c
    o = bpy.data.objects.new('FG_Pintura_lienzo', me)
    scene.collection.objects.link(o)
    return o


def _scene():
    sc = bpy.data.scenes.get('FG_Pintura') or bpy.data.scenes.new('FG_Pintura')
    try:
        sc.render.engine = 'CYCLES'
    except TypeError as e:
        raise RuntimeError(f'Cycles no disponible: {e}')
    sc.cycles.samples = 4
    sc.cycles.device = 'CPU'
    return sc


def _image(name, size, non_color):
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    return img


def hornear(nombre, pintar, size=512, relieve=0.6):
    """`pintar(N)` devuelve (color, alto). Hornea color y normal OpenGL."""
    sc = _scene()
    prev = bpy.context.window.scene if bpy.context.window else None
    if bpy.context.window:
        bpy.context.window.scene = sc
    obj = _plane(sc)
    mat = bpy.data.materials.get('FG_Pintura_mat') or bpy.data.materials.new('FG_Pintura_mat')
    mat.use_nodes = True
    N = Nodos(mat)
    color, alto = pintar(N)
    out = N.n('ShaderNodeOutputMaterial')
    bsdf = N.n('ShaderNodeBsdfPrincipled')
    emit = N.n('ShaderNodeEmission')
    N.link(color, emit.inputs['Color'])
    N.link(color, bsdf.inputs['Base Color'])
    if alto is not None:
        bump = N.n('ShaderNodeBump')
        bump.inputs['Strength'].default_value = relieve
        bump.inputs['Distance'].default_value = 0.004
        N.link(alto, bump.inputs['Height'])
        N.link(bump.outputs['Normal'], bsdf.inputs['Normal'])
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    tex = N.n('ShaderNodeTexImage')
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    results = []
    for suffix, kind, non_color, shader in (('', 'EMIT', False, emit), ('_normal', 'NORMAL', True, bsdf)):
        if suffix and alto is None:
            continue
        N.link(shader.outputs[0], out.inputs['Surface'])
        img = _image(f'pint_{nombre}{suffix}', size, non_color)
        tex.image = img
        N.t.nodes.active = tex
        sc.render.bake.normal_space = 'TANGENT'
        bpy.ops.object.bake(type=kind, margin=0)
        path = os.path.join(OUT, f'{nombre}{suffix}.png')
        img.filepath_raw = path
        img.file_format = 'PNG'
        img.save()
        results.append(path)
    if prev:
        bpy.context.window.scene = prev
    print('horneada', nombre)
    return results


# ---------------------------------------------------------------- recetas
def tela(base, sombra, luz, trama=48, manchas=3.0, seed=0.0):
    """Tela de algodón: manchas pintadas grandes y una trama fina y suave."""
    def pintar(N):
        m = N.noise(scale=manchas, detail=0.6, rough=0.3, seed=seed)
        col = N.ramp(m, [(0.25, acerca(sombra, base, 0.55)), (0.5, base), (0.78, acerca(luz, base, 0.5))])
        hilo = N.math('MULTIPLY', N.wave(N.u, trama), N.wave(N.v, trama))
        col = N.mix(N.math('MULTIPLY', hilo, 0.12), col, sombra, 'MIX')
        alto = N.math('ADD', N.math('MULTIPLY', hilo, 0.6), N.math('MULTIPLY', m, 0.4))
        return col, alto
    return pintar


def palma(base, sombra, luz, trama=8, seed=0.0):
    """Tejido de cesta: tiras de palma que pasan por encima y por debajo, alternadas por celda."""
    def pintar(N):
        cel = N.math('FLOORED_MODULO', N.math('ADD', N.math('FLOOR', N.math('MULTIPLY', N.u, trama)), N.math('FLOOR', N.math('MULTIPLY', N.v, trama))), 2.0)
        bv = N.math('SUBTRACT', 1.0, N.tri(N.v, trama))
        bu = N.math('SUBTRACT', 1.0, N.tri(N.u, trama))
        tira = N.math('MULTIPLY_ADD', N.math('SUBTRACT', bu, bv), cel, bv)
        fibra = N.math('MULTIPLY_ADD', N.math('SUBTRACT', N.wave(N.u, trama * 9), N.wave(N.v, trama * 9)), cel, N.wave(N.v, trama * 9))
        m = N.noise(scale=4.0, detail=0.6, rough=0.3, seed=seed)
        forma = N.math('ADD', N.math('MULTIPLY', N.math('POWER', tira, 0.6), 0.8), N.math('MULTIPLY', fibra, 0.12))
        col = N.ramp(forma, [(0.0, acerca(sombra, (0, 0, 0), 0.4)), (0.28, sombra), (0.6, base), (0.9, luz)])
        col = N.mix(N.math('MULTIPLY', m, 0.35), col, acerca(base, luz, 0.4), 'MIX')
        return col, forma
    return pintar


def cuero(base, sombra, luz, seed=0.0):
    def pintar(N):
        m = N.noise(scale=2.0, detail=0.8, rough=0.35, seed=seed)
        grano = N.voronoi(scale=26.0, seed=seed)
        col = N.ramp(m, [(0.25, acerca(sombra, base, 0.45)), (0.52, base), (0.78, acerca(luz, base, 0.4))])
        poros = N.math('SUBTRACT', 1.0, N.math('MINIMUM', N.math('MULTIPLY', grano, 3.0), 1.0))
        col = N.mix(N.math('MULTIPLY', poros, 0.12), col, sombra)
        alto = N.math('ADD', N.math('MULTIPLY', grano, 0.5), N.math('MULTIPLY', m, 0.5))
        return col, alto
    return pintar


def madera(base, sombra, luz, vetas=9, seed=0.0):
    """Vetas a lo largo de v (la longitud del asta o la tabla)."""
    def pintar(N):
        warp = N.noise(scale=1.8, detail=2.0, freq=(1, 1), seed=seed)
        a = N.math('ADD', N.u, N.math('MULTIPLY', warp, 0.25))
        veta = N.tri(a, vetas)
        m = N.noise(scale=3.0, detail=1.0, seed=seed + 1)
        col = N.ramp(veta, [(0.1, acerca(sombra, base, 0.3)), (0.5, base), (0.95, acerca(luz, base, 0.3))])
        col = N.mix(N.math('MULTIPLY', m, 0.25), col, luz)
        return col, veta
    return pintar


def metal(base, sombra, luz, seed=0.0):
    """Metal pintado: degradado de brillo, rayas de cepillado suaves y marcas."""
    def pintar(N):
        m = N.noise(scale=1.4, detail=0.5, seed=seed)
        cep = N.noise(scale=1.0, detail=4.0, freq=(1, 24), seed=seed + 2)
        golpes = N.voronoi(scale=9.0, seed=seed, feature='F1')
        col = N.ramp(N.math('ADD', N.math('MULTIPLY', m, 0.8), N.math('MULTIPLY', cep, 0.2)), [(0.25, acerca(sombra, base, 0.4)), (0.5, base), (0.75, acerca(luz, base, 0.3))])
        hoyo = N.math('SUBTRACT', 1.0, N._smooth(golpes, 0.03, 0.09))
        col = N.mix(N.math('MULTIPLY', hoyo, 0.4), col, sombra)
        return col, N.math('SUBTRACT', N.math('MULTIPLY', cep, 0.3), N.math('MULTIPLY', hoyo, 0.7))
    return pintar


def piel(base, sombra, rubor, seed=0.0):
    def pintar(N):
        m = N.noise(scale=1.5, detail=0.0, rough=0.3, seed=seed)
        col = N.ramp(m, [(0.2, acerca(sombra, base, 0.7)), (0.6, base)], 'LINEAR')
        r = N.noise(scale=2.5, detail=0.0, seed=seed + 5)
        col = N.mix(N.math('MULTIPLY', N._smooth(r, 0.5, 0.8), 0.12), col, rubor)
        return col, None
    return pintar


def pelo(base, sombra, luz, seed=0.0):
    """Mechones: rayas a lo largo de v, con brillo pintado."""
    def pintar(N):
        warp = N.noise(scale=1.5, detail=1.0, seed=seed)
        a = N.math('ADD', N.u, N.math('MULTIPLY', warp, 0.15))
        hebra = N.noise(scale=1.0, detail=1.5, freq=(24, 1), seed=seed + 1)
        brillo = N._smooth(N.wave(N.v, 2), 0.7, 0.95)
        col = N.ramp(N.math('ADD', N.math('MULTIPLY', hebra, 0.75), N.math('MULTIPLY', N.tri(a, 7), 0.25)), [(0.3, acerca(sombra, base, 0.3)), (0.55, base), (0.8, acerca(luz, base, 0.3))])
        col = N.mix(N.math('MULTIPLY', brillo, 0.3), col, luz)
        return col, hebra
    return pintar


def plumas(base, sombra, punta, filas=5, seed=0.0):
    """Plumas en escama: filas desplazadas que acaban en punta redonda hacia abajo,
    raquis central, punta de otro color y hueco oscuro entre plumas."""
    def pintar(N):
        fila = N.math('FLOOR', N.math('MULTIPLY', N.v, filas))
        desp = N.math('MULTIPLY', N.math('MODULO', fila, 2.0), 0.5)
        x = N.frac(N.math('ADD', N.math('MULTIPLY', N.u, filas * 2), desp), 1.0)
        y = N.frac(N.v, filas)
        dx = N.math('SUBTRACT', x, 0.5)
        yy = N.math('SUBTRACT', 1.0, y)
        forma = N.math('ADD', N.math('MULTIPLY', N.math('MULTIPLY', dx, dx), 4.0), N.math('MULTIPLY', yy, yy))
        fuera = N._smooth(forma, 0.88, 1.0)
        raquis = N.math('SUBTRACT', 1.0, N._smooth(N.math('ABSOLUTE', dx), 0.0, 0.035))
        barbas = N.wave(N.math('ADD', N.math('MULTIPLY', N.math('ABSOLUTE', dx), 1.0), N.math('MULTIPLY', y, 0.5)), 6)
        col = N.ramp(y, [(0.0, punta), (0.3, base), (1.0, acerca(sombra, base, 0.4))])
        col = N.mix(N.math('MULTIPLY', barbas, 0.08), col, sombra)
        col = N.mix(N.math('MULTIPLY', raquis, 0.35), col, acerca(base, (1, 1, 1), 0.4))
        col = N.mix(N.math('MULTIPLY', fuera, 0.85), col, acerca(sombra, (0, 0, 0), 0.3))
        return col, N.math('SUBTRACT', N.math('MULTIPLY', yy, 0.6), N.math('MULTIPLY', fuera, 0.8))
    return pintar


def mola(fondo, c1, c2, c3, motivo='zigzag', reps=8):
    """Cenefa de capas recortadas en el espíritu de la mola: banda con dibujo
    geométrico propio y filetes de colores. La banda corre a lo largo de u."""
    def pintar(N):
        v = N.v
        if motivo == 'zigzag':
            d = N.math('SUBTRACT', v, N.math('MULTIPLY_ADD', N.tri(N.u, reps), 0.4, 0.3))
            fig = N._smooth(N.math('ABSOLUTE', d), 0.07, 0.06)
            fig2 = N._smooth(N.math('ABSOLUTE', d), 0.16, 0.15)
        elif motivo == 'rombos':
            d = N.math('ADD', N.tri(N.u, reps), N.math('MULTIPLY', N.math('ABSOLUTE', N.math('SUBTRACT', v, 0.5)), 2.0))
            fig = N._smooth(d, 0.62, 0.58)
            fig2 = N._smooth(N.math('ABSOLUTE', N.math('SUBTRACT', d, 0.82)), 0.1, 0.08)
        else:  # escalones
            s = N.math('FLOOR', N.math('MULTIPLY', N.tri(N.u, reps), 4.0))
            top = N.math('MULTIPLY_ADD', s, 0.12, 0.25)
            fig = N.math('MULTIPLY', N._smooth(N.math('SUBTRACT', top, v), -0.01, 0.01), N._smooth(v, 0.2, 0.22))
            fig2 = N._smooth(N.math('ABSOLUTE', N.math('SUBTRACT', v, N.math('ADD', top, 0.07))), 0.035, 0.025)
        filete = N.math('MAXIMUM', N._smooth(v, 0.1, 0.08), N._smooth(v, 0.9, 0.92))
        col = N.mix(fig2, fondo, c2)
        col = N.mix(fig, col, c1)
        col = N.mix(filete, col, c3)
        m = N.noise(scale=3.0, detail=1.0)
        col = N.mix(N.math('MULTIPLY', m, 0.18), col, (0.0, 0.0, 0.0))
        hilo = N.math('MULTIPLY', N.wave(N.u, 96), N.wave(N.v, 24))
        return col, N.math('ADD', N.math('MAXIMUM', fig, filete), N.math('MULTIPLY', hilo, 0.2))
    return pintar


PALETA = {
    'lino': ('#e8dcc0', '#bfa98a', '#f6eedb'),
    'oliva': ('#6f7046', '#4c4c30', '#8a8a5c'),
    'turquesa': ('#2d6670', '#1d434b', '#468892'),
    'coral': ('#b4402e', '#7d2a20', '#d4644a'),
    'bruma': ('#59649a', '#3a4170', '#8189bd'),
    'violeta': ('#6a4b86', '#46305c', '#8d6cab'),
    'musgo': ('#4d6b3a', '#334a26', '#6c8d50'),
    'arena': ('#c9a46e', '#9c7a4b', '#e0c18e'),
    'carbon': ('#3a3735', '#262423', '#57524e'),
    'blanca': ('#ece9e1', '#c4c3c4', '#fbfaf6'),
    'noche': ('#3b3550', '#262236', '#57507a'),
}

RECETAS = {
    'tela_lino': tela(*map(hexc, PALETA['lino']), seed=1),
    'tela_oliva': tela(*map(hexc, PALETA['oliva']), trama=40, seed=2),
    'tela_turquesa': tela(*map(hexc, PALETA['turquesa']), seed=3),
    'tela_coral': tela(*map(hexc, PALETA['coral']), seed=4),
    'tela_bruma': tela(*map(hexc, PALETA['bruma']), seed=5),
    'tela_violeta': tela(*map(hexc, PALETA['violeta']), seed=6),
    'tela_musgo': tela(*map(hexc, PALETA['musgo']), seed=7),
    'tela_arena': tela(*map(hexc, PALETA['arena']), seed=8),
    'tela_carbon': tela(*map(hexc, PALETA['carbon']), seed=9),
    'tela_blanca': tela(*map(hexc, PALETA['blanca']), trama=56, seed=10),
    'tela_noche': tela(*map(hexc, PALETA['noche']), seed=11),
    'palma_tejida': palma(hexc('#c7a557'), hexc('#6f5428'), hexc('#efd68f'), seed=12),
    'cuero_castano': cuero(hexc('#7a4a2a'), hexc('#4e2d19'), hexc('#a06a40'), seed=1),
    'cuero_oscuro': cuero(hexc('#4a2e1e'), hexc('#2c1a10'), hexc('#6a4430'), seed=2),
    'madera_asta': madera(hexc('#7b5232'), hexc('#4f321d'), hexc('#a77a4c'), seed=1),
    'madera_oscura': madera(hexc('#4d2f1b'), hexc('#28170c'), hexc('#74492b'), vetas=11, seed=3),
    'madera_clara': madera(hexc('#b58a55'), hexc('#7e5a33'), hexc('#d6b07a'), vetas=7, seed=2),
    'oro_pintado': metal(hexc('#c99a3a'), hexc('#7d5a1c'), hexc('#f2d27a'), seed=1),
    'hierro_pintado': metal(hexc('#8d949a'), hexc('#555b61'), hexc('#c9d0d4'), seed=2),
    'bronce_pintado': metal(hexc('#a8693a'), hexc('#6a3e1f'), hexc('#d89a62'), seed=3),
    'piel_canela': piel(hexc('#c98d66'), hexc('#a8704f'), hexc('#d9786a'), seed=1),
    'piel_trigo': piel(hexc('#e0b48e'), hexc('#c09070'), hexc('#e88f80'), seed=2),
    'piel_cacao': piel(hexc('#8a5a3c'), hexc('#6c432b'), hexc('#a65a4a'), seed=3),
    'pelo_negro': pelo(hexc('#2a1d17'), hexc('#140d0a'), hexc('#5a4234'), seed=1),
    'pelo_castano': pelo(hexc('#4a2e1d'), hexc('#2a170d'), hexc('#7a5136'), seed=2),
    'plumas_garza': plumas(hexc('#d9dcd6'), hexc('#8d9a9c'), hexc('#3a4d55'), seed=1),
    'plumas_guacamaya': plumas(hexc('#c23b2b'), hexc('#7a2018'), hexc('#2f6fb5'), seed=2),
    # Neutras: casi blancas, para materiales que el juego tiñe con la paleta (personaje.glb).
    'neutra_piel': piel(hexc('#f4ece6'), hexc('#ddd0c8'), hexc('#f6dcd6'), seed=4),
    'neutra_tela': tela(hexc('#e9e9e9'), hexc('#c2c2c2'), hexc('#fafafa'), seed=13),
    'neutra_cuero': cuero(hexc('#e4e4e4'), hexc('#b0b0b0'), hexc('#f7f7f7'), seed=3),
    'neutra_pelo': pelo(hexc('#dcdcdc'), hexc('#8e8e8e'), hexc('#ffffff'), seed=3),
    'neutra_metal': metal(hexc('#e0e0e0'), hexc('#a4a4a4'), hexc('#ffffff'), seed=4),
    'mola_coral_zigzag': mola(hexc('#b4402e'), hexc('#e9c46a'), hexc('#1d1b1a'), hexc('#2d6670'), 'zigzag'),
    'mola_turquesa_escalones': mola(hexc('#2d6670'), hexc('#e9c46a'), hexc('#f2e6c9'), hexc('#b4402e'), 'escalones'),
    'mola_violeta_rombos': mola(hexc('#46305c'), hexc('#7fc8c0'), hexc('#e9c46a'), hexc('#d4644a'), 'rombos'),
    'mola_musgo_zigzag': mola(hexc('#334a26'), hexc('#e0a040'), hexc('#f2e6c9'), hexc('#b4402e'), 'zigzag', reps=10),
    'mola_bruma_rombos': mola(hexc('#3a4170'), hexc('#f2e6c9'), hexc('#7fc8c0'), hexc('#c99a3a'), 'rombos', reps=6),
}


def hornear_todo(nombres=None, size=512):
    for nombre in (nombres or RECETAS):
        hornear(nombre, RECETAS[nombre], size)


if __name__ == '__main__':
    hornear_todo()
