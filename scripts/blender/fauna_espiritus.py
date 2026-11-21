# Espiritus elementales de la familia `imp` (OMP-FA-12): un rig y cinco
# variantes + la chitra picadora.
#   "/Applications/Blender.app/Contents/MacOS/Blender" -b --python scripts/blender/fauna_espiritus.py
# Escribe en assets/models/: gotita.glb (boquete_drizzle), jiron.glb
# (cerropunta_wisp), brasita.glb (baru_ember), copito.glb (fortuna_flake),
# alma.glb (ancon_soul) y chitra.glb (chame_chitra); salva
# arte/blender/fauna_espiritus.blend.
#
# Los cinco espíritus comparten LITERALMENTE el mismo esqueleto FG_Espiritu:
# hips (núcleo flotante), chest, head, dos brazos regordetes (armL/armR), y una
# cola o manto que cae y barre el suelo (tail > tip) — el apoyo z=0 del
# fotograma 1 está en la cola, como los tentáculos de la medusa de FA-10. Lo que
# cambia es solo la malla y el color: gota de lluvia, jirón de niebla, brasa,
# copo y alma en pena. La chitra (insecto) lleva su propio rig FG_Chitra: hips,
# head, trompa, dos alitas y seis patas cortas, en miniatura del zancudo.
# Convenciones de la casa: mira a -Y, +Z arriba, metros, cinco clips (Reposo,
# Caminar, Atacar, Golpeado, Morir), los bucles terminan en la pose exacta del
# fotograma 1. Clean-room: desde cero.
import math
import os
import sys
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fg
import fg_rig

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))

CLIPS = {'Reposo', 'Caminar', 'Atacar', 'Golpeado', 'Morir'}


def mats(v):
    """Regiones teñibles por variante + ojo y nucleo emisivo."""
    c = v['col']
    return dict(
        cloth=fg.material('cloth', c['cloth']),
        trim=fg.material('trim', c['trim']),
        hair=fg.material('hair', c['hair']),
        skin=fg.material('skin', c['skin']),
        gear=fg.material('gear', c['gear']),
        ojo=fg.material('ojo_esp', c['ojo'], rough=0.25),
        nucleo=fg.material('nucleo', c['nucleo'], rough=0.4,
                           emit=c['nucleo'], strength=c.get('brillo', 0.6)),
    )


# ============================================================
# Esqueleto común de los espíritus
# ============================================================
ESPIRITU_BONES = [
    ('hips', None, (0, 0.02, 0.34), (0, -0.06, 0.42)),
    ('chest', 'hips', (0, -0.06, 0.42), (0, -0.13, 0.47)),
    ('head', 'chest', (0, -0.13, 0.47), (0, -0.24, 0.52)),
    ('armL', 'chest', (0.10, -0.10, 0.45), (0.19, -0.16, 0.40)),
    ('armR', 'chest', (-0.10, -0.10, 0.45), (-0.19, -0.16, 0.40)),
    ('tail', 'hips', (0, 0.06, 0.30), (0, 0.13, 0.12)),
    ('tip', 'tail', (0, 0.13, 0.12), (0, 0.17, 0.02)),
]


def chitra_bones():
    """Mini-zancudo volador: cuerpo corto con tromba y alitas."""
    bones = [
        ('hips', None, (0, 0.03, 0.17), (0, -0.03, 0.18)),
        ('head', 'hips', (0, -0.03, 0.18), (0, -0.13, 0.185)),
        ('trunk', 'hips', (0, 0.03, 0.17), (0, 0.15, 0.16)),
        ('abdomen', 'trunk', (0, 0.15, 0.16), (0, 0.27, 0.15)),
        ('proboscis', 'head', (0, -0.13, 0.185), (0, -0.30, 0.155)),
        ('wingL', 'hips', (0.03, 0.0, 0.205), (0.10, 0.05, 0.24)),
        ('wingR', 'hips', (-0.03, 0.0, 0.205), (-0.10, 0.05, 0.24)),
    ]
    for nombre, x, y0 in (('FL', 0.05, -0.04), ('FR', 0.05, -0.04), ('ML', 0.055, 0.04),
                          ('MR', 0.055, 0.04), ('BL', 0.05, 0.12), ('BR', 0.05, 0.12)):
        s = 1 if nombre.endswith('L') else -1
        bones += [
            (f'leg{nombre}', 'hips', (s * x, y0, 0.165), (s * (x + 0.07), y0 - 0.03, 0.075)),
            (f'shin{nombre}', f'leg{nombre}', (s * (x + 0.07), y0 - 0.03, 0.075),
             (s * (x + 0.05), y0 + 0.08, 0.004)),
        ]
    return bones


# ============================================================
# Mallas de las cinco variantes. Todas usan los mismos huesos; lo que cambia
# es la forma del núcleo, la cola y los remates.
# ============================================================
def gotita_mesh(b, m):
    """Gotita de Bajareque: lágrima azul con onda de agua en la base, brazos de
    chorrito y una estela que gotea hasta el suelo."""
    b.blob((0, 0.0, 0.42), (0.185, 0.20, 0.20), m['cloth'], 'hips', subdiv=1)
    b.tube((0, 0.02, 0.52), (0, 0.0, 0.665), 0.075, 0.008, m['cloth'], 'head', sides=5)  # punta
    b.blob((0, -0.13, 0.50), (0.10, 0.085, 0.09), m['skin'], 'head', subdiv=1)  # frente clara
    b.blob((0, -0.02, 0.30), (0.185, 0.19, 0.075), m['trim'], 'hips', subdiv=1)  # onda de base
    b.blob((0, -0.03, 0.40), (0.085, 0.075, 0.085), m['nucleo'], 'hips', subdiv=0)
    for sgn in (1, -1):
        b.blob((0.062 * sgn, -0.185, 0.52), (0.020, 0.014, 0.026), m['ojo'], 'head', subdiv=0)
    b.tube((0.13, -0.09, 0.44), (0.20, -0.17, 0.375), 0.040, 0.030, m['skin'], 'armL', sides=5)
    b.tube((-0.13, -0.09, 0.44), (-0.20, -0.17, 0.375), 0.040, 0.030, m['skin'], 'armR', sides=5)
    for sgn in (1, -1):
        b.tube((0.20 * sgn, -0.17, 0.375), (0.24 * sgn, -0.22, 0.325), 0.028, 0.016, m['cloth'],
               f'arm{"L" if sgn > 0 else "R"}', sides=4)
    # estela de goteo: dos gotas que bajan hasta tocar el suelo
    b.tube((0, 0.06, 0.30), (0, 0.11, 0.16), 0.075, 0.050, m['cloth'], 'tail', sides=5)
    b.blob((0, 0.13, 0.12), (0.050, 0.055, 0.060), m['cloth'], 'tail', subdiv=0)
    b.tube((0, 0.155, 0.085), (0, 0.165, 0.020), 0.036, 0.012, m['cloth'], 'tip', sides=4)
    b.blob((0, 0.17, 0.012), (0.070, 0.075, 0.012), m['trim'], 'tip', subdiv=0)   # salpicadura
    b.tube((0, 0.02, 0.63), (0.03, 0.05, 0.685), 0.020, 0.006, m['hair'], 'head', sides=4)  # espuma
    b.blob((0.055, 0.185, 0.020), (0.016, 0.016, 0.012), m['gear'], 'tip', subdiv=0)        # guijarro


def jiron_mesh(b, m):
    """Jirón de Neblina: tres bolas de niebla escalonadas con flecos laterales,
    ojitos asomando y un rastro de bruma que lame el suelo."""
    b.blob((0, 0.03, 0.40), (0.19, 0.20, 0.155), m['cloth'], 'hips', subdiv=1)
    b.blob((0, -0.07, 0.50), (0.145, 0.14, 0.125), m['cloth'], 'chest', subdiv=1)
    b.blob((0, -0.17, 0.535), (0.105, 0.10, 0.090), m['trim'], 'head', subdiv=1)  # testa clara
    for x, y, z, s in ((0.15, 0.13, 0.33, 0.062), (-0.15, 0.12, 0.36, 0.058),
                       (0.08, 0.19, 0.30, 0.052), (-0.07, 0.20, 0.33, 0.048)):
        b.blob((x, y, z), (s, s * 1.1, s * 0.75), m['cloth'], 'hips', subdiv=0)   # flecos
    b.blob((0, 0.0, 0.42), (0.070, 0.065, 0.060), m['nucleo'], 'hips', subdiv=0)
    for sgn in (1, -1):
        b.blob((0.052 * sgn, -0.245, 0.545), (0.017, 0.012, 0.021), m['ojo'], 'head', subdiv=0)
        b.blob((0.056 * sgn, -0.238, 0.572), (0.026, 0.012, 0.010), m['hair'], 'head', subdiv=0)  # ceja
    b.tube((0.13, -0.12, 0.47), (0.21, -0.19, 0.42), 0.042, 0.034, m['cloth'], 'armL', sides=5)
    b.tube((-0.13, -0.12, 0.47), (-0.21, -0.19, 0.42), 0.042, 0.034, m['cloth'], 'armR', sides=5)
    b.blob((0.225, -0.205, 0.405), (0.036, 0.036, 0.030), m['cloth'], 'armL', subdiv=0)
    b.blob((-0.225, -0.205, 0.405), (0.036, 0.036, 0.030), m['cloth'], 'armR', subdiv=0)
    # cola de bruma que se desenrosna y se extiende por el suelo
    b.tube((0, 0.08, 0.32), (0.04, 0.15, 0.16), 0.085, 0.058, m['cloth'], 'tail', sides=5)
    b.blob((-0.02, 0.18, 0.11), (0.065, 0.075, 0.045), m['cloth'], 'tail', subdiv=0)
    b.blob((0.05, 0.24, 0.045), (0.085, 0.090, 0.035), m['trim'], 'tip', subdiv=0)
    b.blob((0.02, 0.31, 0.012), (0.10, 0.10, 0.012), m['trim'], 'tip', subdiv=0)   # lama el suelo
    b.blob((0, -0.215, 0.540), (0.055, 0.030, 0.055), m['skin'], 'head', subdiv=0)  # cara asomada
    b.tube((0, -0.14, 0.60), (0.03, -0.05, 0.72), 0.055, 0.014, m['cloth'], 'head', sides=5)  # copete
    b.tube((0.13, 0.10, 0.28), (0.20, 0.16, 0.20), 0.012, 0.007, m['gear'], 'hips', sides=3)  # ramita


def brasita_mesh(b, m):
    """Brasita Saltarina: ascua anaranjada con núcleo amarillo vivo, llama de
    tres pavesas en la testa y una estela de ceniza con pavesas al suelo."""
    b.blob((0, 0.0, 0.385), (0.155, 0.165, 0.150), m['cloth'], 'hips', subdiv=1)
    b.blob((0, -0.01, 0.375), (0.095, 0.10, 0.090), m['nucleo'], 'hips', subdiv=0)
    for x, y, z in ((0.10, 0.02, 0.44), (-0.09, 0.05, 0.33), (0.04, 0.10, 0.40)):
        b.poly([(x - 0.030, y, z - 0.020), (x + 0.034, y + 0.01, z - 0.014), (x + 0.010, y + 0.03, z + 0.022)],
               [(x - 0.022, y - 0.01, z - 0.010), (x + 0.026, y, z - 0.006), (x + 0.008, y + 0.022, z + 0.014)],
               m['gear'], 'hips')                                                   # costras de carbon
    b.blob((0, -0.12, 0.475), (0.095, 0.088, 0.082), m['skin'], 'head', subdiv=1)
    # llama en la testa: tres pavesas apuntadas
    for x, dy, l, w in ((0.0, 0.0, 0.175, 0.052), (0.055, 0.02, 0.115, 0.038),
                        (-0.05, 0.03, 0.100, 0.034)):
        b.poly([(x - w, dy + 0.02, 0.545), (x + w, dy + 0.02, 0.545),
                (x + w * 0.5, dy - 0.01, 0.545 + l * 0.6), (x, dy - 0.02, 0.545 + l)],
               [(x - w * 0.6, dy + 0.03, 0.540), (x + w * 0.6, dy + 0.03, 0.540),
                (x + w * 0.3, dy + 0.0, 0.540 + l * 0.6), (x, dy - 0.01, 0.540 + l * 0.92)],
               m['nucleo'], 'head')
    for sgn in (1, -1):
        b.blob((0.048 * sgn, -0.185, 0.485), (0.017, 0.012, 0.021), m['ojo'], 'head', subdiv=0)
    # bocaza de brasas
    b.poly([(-0.034, -0.195, 0.452), (0.034, -0.195, 0.452), (0.026, -0.212, 0.436),
            (-0.026, -0.212, 0.436)],
           [(-0.028, -0.198, 0.436), (0.028, -0.198, 0.436), (0.020, -0.212, 0.428),
            (-0.020, -0.212, 0.428)], m['nucleo'], 'head')
    b.tube((0.115, -0.07, 0.40), (0.185, -0.15, 0.345), 0.036, 0.026, m['skin'], 'armL', sides=5)
    b.tube((-0.115, -0.07, 0.40), (-0.185, -0.15, 0.345), 0.036, 0.026, m['skin'], 'armR', sides=5)
    for sgn in (1, -1):
        b.blob((0.195 * sgn, -0.165, 0.330), (0.030, 0.032, 0.026), m['hair'],
               f'arm{"L" if sgn > 0 else "R"}', subdiv=0)
    # estela de ceniza gris con dos pavesas que caen al suelo
    b.tube((0, 0.09, 0.30), (0.02, 0.16, 0.145), 0.070, 0.048, m['trim'], 'tail', sides=5)
    b.blob((-0.03, 0.19, 0.095), (0.045, 0.050, 0.042), m['trim'], 'tail', subdiv=0)
    b.blob((0.02, 0.225, 0.040), (0.030, 0.034, 0.028), m['nucleo'], 'tip', subdiv=0)  # pavesa viva
    b.tube((0.02, 0.24, 0.030), (0.0, 0.265, 0.006), 0.024, 0.012, m['trim'], 'tip', sides=4)
    b.blob((0.0, 0.275, 0.010), (0.055, 0.060, 0.010), m['trim'], 'tip', subdiv=0)     # ceniza


def copito_mesh(b, m):
    """Copito Malcriado: bola de nieve con púas de cristal en cruz, corona de
    estrellita y una falda de escarcha con cristales que tocan el suelo."""
    b.blob((0, 0.0, 0.42), (0.175, 0.175, 0.170), m['cloth'], 'hips', subdiv=1)
    b.blob((0, -0.11, 0.505), (0.100, 0.090, 0.088), m['cloth'], 'head', subdiv=1)
    b.blob((0, -0.02, 0.42), (0.070, 0.068, 0.065), m['nucleo'], 'hips', subdiv=0)
    b.blob((0, -0.10, 0.36), (0.085, 0.060, 0.055), m['skin'], 'hips', subdiv=0)   # tripa palida
    # púas laterales a cada lado (viven en los brazos)
    for sgn in (1, -1):
        b.tube((0.15 * sgn, 0, 0.42), (0.26 * sgn, 0, 0.42), 0.026, 0.010, m['trim'],
               f'arm{"L" if sgn > 0 else "R"}', sides=4)
        for dz in (-0.036, 0.036):
            b.tube((0.205 * sgn, 0, 0.42), (0.245 * sgn, 0, 0.42 + dz), 0.012, 0.006,
                   m['trim'], f'arm{"L" if sgn > 0 else "R"}', sides=3)
    for ang in (60, 120, 240, 300):  # púas diagonales en el plano del cuerpo
        a = math.radians(ang)
        x, y = 0.15 * math.sin(a), 0.15 * math.cos(a)
        b.tube((x, y, 0.42), (x * 1.62, y * 1.62, 0.42), 0.021, 0.007, m['trim'], 'hips', sides=4)
    # corona de estrellita: seis puntas cortas sobre la cabeza
    for ang in range(0, 360, 60):
        a = math.radians(ang)
        x, y = 0.055 * math.sin(a), 0.055 * math.cos(a)
        b.tube((x * 0.6, y - 0.11, 0.572), (x, y - 0.11, 0.618), 0.014, 0.005, m['trim'], 'head',
               sides=3)
    for sgn in (1, -1):
        b.blob((0.050 * sgn, -0.178, 0.512), (0.016, 0.012, 0.020), m['ojo'], 'head', subdiv=0)
        # ceño malcriado
        b.tube((0.034 * sgn, -0.205, 0.548), (0.066 * sgn, -0.208, 0.535), 0.010, 0.010, m['hair'],
               'head', sides=3)
    b.poly([(-0.020, -0.192, 0.478), (0.020, -0.192, 0.478), (0.0, -0.210, 0.468)],
           [(-0.014, -0.195, 0.468), (0.014, -0.195, 0.468), (0.0, -0.210, 0.462)], m['hair'],
           'head')                                                          # boquita de morro
    # falda de escarcha: manto que cae y un cristal que toca el suelo
    b.tube((0, 0.07, 0.31), (0, 0.12, 0.15), 0.085, 0.055, m['cloth'], 'tail', sides=5)
    b.blob((0.03, 0.15, 0.10), (0.055, 0.060, 0.045), m['trim'], 'tail', subdiv=0)
    b.poly([(0.0, 0.17, 0.085), (0.05, 0.21, 0.020), (0.0, 0.25, 0.006), (-0.05, 0.21, 0.020)],
           [(0.012, 0.19, 0.060), (0.045, 0.22, 0.016), (0.012, 0.235, 0.008),
            (-0.02, 0.22, 0.016)], m['trim'], 'tip')                        # cristal
    b.blob((0.0, 0.20, 0.008), (0.060, 0.065, 0.009), m['trim'], 'tip', subdiv=0)
    for x in (-0.028, 0.034):
        b.blob((x, 0.205, 0.024), (0.010, 0.010, 0.009), m['gear'], 'tip', subdiv=0)  # piedras en el hielo


def alma_mesh(b, m):
    """Alma en Pena de la Parada: fantasma lavanda con capucha hundida, cara
    vacía con dos óvalos de luz, mangos caídos y un manto roto que barre el
    suelo en picos."""
    b.blob((0, 0.02, 0.40), (0.165, 0.175, 0.20), m['cloth'], 'hips', subdiv=1)   # torso
    b.blob((0, -0.06, 0.56), (0.135, 0.145, 0.125), m['cloth'], 'head', subdiv=1)  # capucha
    b.blob((0, -0.165, 0.545), (0.085, 0.045, 0.085), m['hair'], 'head', subdiv=1)  # hueco
    b.blob((0, -0.02, 0.60), (0.115, 0.12, 0.095), m['trim'], 'head', subdiv=0)     # cresterío
    for sgn in (1, -1):                                                              # óvalos de luz
        b.blob((0.040 * sgn, -0.190, 0.555), (0.024, 0.012, 0.034), m['ojo'], 'head', subdiv=0)
        b.blob((0.040 * sgn, -0.199, 0.555), (0.015, 0.010, 0.025), m['nucleo'], 'head', subdiv=0)
    b.blob((0.0, -0.205, 0.500), (0.014, 0.010, 0.022), m['nucleo'], 'head', subdiv=0)  # lamento
    # mangos caídos con puños de humo
    b.tube((0.125, -0.03, 0.44), (0.215, -0.10, 0.315), 0.052, 0.036, m['cloth'], 'armL', sides=5)
    b.tube((-0.125, -0.03, 0.44), (-0.215, -0.10, 0.315), 0.052, 0.036, m['cloth'], 'armR', sides=5)
    for sgn in (1, -1):
        b.blob((0.235 * sgn, -0.125, 0.295), (0.042, 0.046, 0.040), m['skin'],
               f'arm{"L" if sgn > 0 else "R"}', subdiv=0)
    # manto roto: bajera amplia con picos que barren el suelo
    b.tube((0, 0.05, 0.315), (0, 0.09, 0.14), 0.145, 0.125, m['cloth'], 'tail', sides=6)
    for i, x in enumerate((-0.115, -0.05, 0.015, 0.08, 0.145)):
        h = (0.055 if i % 2 else 0.02)
        b.poly([(x - 0.035, 0.10, h + 0.055), (x + 0.035, 0.10, h + 0.055), (x + 0.012, 0.165, h)],
               [(x - 0.028, 0.115, h + 0.030), (x + 0.028, 0.115, h + 0.030),
                (x + 0.010, 0.170, h)], m['trim'], 'tip')
    b.blob((0, 0.115, 0.075), (0.13, 0.095, 0.060), m['cloth'], 'tail', subdiv=0)
    b.blob((0, 0.145, 0.014), (0.105, 0.075, 0.014), m['trim'], 'tip', subdiv=0)      # dobladillo
    # cadena rota colgando del mango derecho
    b.tube((-0.235, -0.125, 0.28), (-0.25, -0.14, 0.16), 0.010, 0.008, m['gear'], 'armR', sides=3)
    for i, z in enumerate((0.135, 0.105)):
        b.blob((-0.255 - 0.012 * i, -0.148 - 0.010 * i, z), (0.016, 0.016, 0.020), m['gear'],
               'armR', subdiv=0)


def legs_tuck(k):
    """Recoge las seis patas una fracción k (0 colgando, 1 arriba)."""
    out = {}
    for n in ('FL', 'FR', 'ML', 'MR', 'BL', 'BR'):
        out[f'leg{n}'] = (-26 * k, 0, 10 * k * (1 if n.endswith('L') else -1))
        out[f'shin{n}'] = (-64 * k, 0, 0)
    return out


def chitra_mesh(b, m):
    """Chitra Picadora: miniatura del zancudo — cuerpo fino pardo, trompa larga
    de clavo, ojos compuestos, dos alitas de humo y seis patas colgando."""
    b.blob((0, 0.0, 0.175), (0.062, 0.085, 0.050), m['cloth'], 'hips', subdiv=1)   # tórax
    b.blob((0, -0.08, 0.185), (0.048, 0.052, 0.044), m['skin'], 'head', subdiv=1)  # cabeza
    for sgn in (1, -1):
        b.blob((0.034 * sgn, -0.105, 0.200), (0.020, 0.022, 0.020), m['ojo'], 'head', subdiv=0)
    b.tube((0, -0.125, 0.180), (0, -0.295, 0.150), 0.012, 0.0035, m['gear'], 'proboscis', sides=4)
    # abdomen estriado en cuatro anillos que apunta atrás
    for i, (y, z, r) in enumerate(((0.06, 0.168, 0.048), (0.13, 0.162, 0.041),
                                   (0.195, 0.155, 0.032), (0.255, 0.148, 0.021))):
        b.tube((0, y - 0.02, z), (0, y, z), r, r * 0.9,
               m['trim'] if i % 2 else m['cloth'],
               'trunk' if i < 2 else 'abdomen', sides=5)
    # dos alitas alargadas de humo
    for sgn in (1, -1):
        b.poly([(0.02 * sgn, 0.0, 0.212), (0.12 * sgn, 0.06, 0.245), (0.05 * sgn, 0.10, 0.218)],
               [(0.024 * sgn, 0.0, 0.222), (0.118 * sgn, 0.055, 0.252),
                (0.052 * sgn, 0.095, 0.226)], m['hair'], f'wing{"L" if sgn > 0 else "R"}')
    # seis patas finas que cuelgan (siguen los tubos de chitra_bones)
    for (nb, x, y0) in (('FL', 0.05, -0.04), ('FR', 0.05, -0.04), ('ML', 0.055, 0.04),
                        ('MR', 0.055, 0.04), ('BL', 0.05, 0.12), ('BR', 0.05, 0.12)):
        s = 1 if nb.endswith('L') else -1
        b.tube((x * s, y0, 0.165), ((x + 0.07) * s, y0 - 0.03, 0.075), 0.006, 0.0045,
               m['gear'], f'leg{nb}', sides=4)
        b.tube(((x + 0.07) * s, y0 - 0.03, 0.075), ((x + 0.05) * s, y0 + 0.08, 0.004),
               0.0045, 0.003, m['gear'], f'shin{nb}', sides=4)


# ============================================================
# Variantes
# ============================================================
GOTA = dict(
    archivo='gotita.glb', rig='FG_Espiritu', nombre='gotita',
    col=dict(cloth=(0.30, 0.52, 0.78), trim=(0.62, 0.80, 0.94), hair=(0.20, 0.35, 0.55),
             skin=(0.75, 0.88, 0.97), gear=(0.35, 0.45, 0.60), ojo=(0.05, 0.08, 0.12),
             nucleo=(0.80, 0.95, 1.0), brillo=0.9),
    rest=dict(hips=(0, 0, 0), chest=(-2, 0, 0), head=(-4, 0, 0), armL=(10, 0, 0),
              armR=(10, 0, 0), tail=(6, 0, 0), tip=(8, 0, 0)),
)
JIRON = dict(
    archivo='jiron.glb', rig='FG_Espiritu', nombre='jiron',
    col=dict(cloth=(0.60, 0.66, 0.72), trim=(0.84, 0.88, 0.92), hair=(0.30, 0.33, 0.38),
             skin=(0.72, 0.76, 0.80), gear=(0.45, 0.48, 0.52), ojo=(0.03, 0.03, 0.05),
             nucleo=(0.92, 0.97, 1.0), brillo=0.7),
    rest=dict(hips=(0, 0, 0), chest=(-3, 0, 0), head=(-6, 0, 0), armL=(8, 0, 0),
              armR=(8, 0, 0), tail=(8, 0, 0), tip=(12, 0, 0)),
)
BRASITA = dict(
    archivo='brasita.glb', rig='FG_Espiritu', nombre='brasita',
    col=dict(cloth=(0.80, 0.28, 0.06), trim=(0.35, 0.30, 0.28), hair=(0.95, 0.55, 0.10),
             skin=(0.55, 0.20, 0.08), gear=(0.25, 0.15, 0.10), ojo=(1.0, 0.85, 0.35),
             nucleo=(1.0, 0.72, 0.15), brillo=1.3),
    rest=dict(hips=(0, 0, 0), chest=(-3, 0, 0), head=(-5, 0, 0), armL=(12, 0, 0),
              armR=(12, 0, 0), tail=(6, 0, 0), tip=(10, 0, 0)),
)
COPITO = dict(
    archivo='copito.glb', rig='FG_Espiritu', nombre='copito',
    col=dict(cloth=(0.86, 0.91, 0.98), trim=(0.55, 0.72, 0.92), hair=(0.35, 0.40, 0.52),
             skin=(0.95, 0.97, 1.0), gear=(0.5, 0.55, 0.65), ojo=(0.10, 0.14, 0.25),
             nucleo=(0.85, 0.95, 1.0), brillo=0.8),
    rest=dict(hips=(0, 0, 0), chest=(-2, 0, 0), head=(-4, 0, 0), armL=(6, 0, 0),
              armR=(6, 0, 0), tail=(6, 0, 0), tip=(8, 0, 0)),
)
ALMA = dict(
    archivo='alma.glb', rig='FG_Espiritu', nombre='alma',
    col=dict(cloth=(0.42, 0.42, 0.62), trim=(0.58, 0.58, 0.80), hair=(0.12, 0.12, 0.20),
             skin=(0.70, 0.70, 0.86), gear=(0.30, 0.30, 0.45), ojo=(0.9, 0.9, 1.0),
             nucleo=(0.80, 0.85, 1.0), brillo=1.0),
    rest=dict(hips=(0, 0, 0), chest=(-4, 0, 0), head=(-8, 0, 0), armL=(14, 0, 0),
              armR=(14, 0, 0), tail=(8, 0, 0), tip=(10, 0, 0)),
)
CHITRA = dict(
    archivo='chitra.glb', rig='FG_Chitra', nombre='chitra',
    col=dict(cloth=(0.32, 0.26, 0.20), trim=(0.48, 0.38, 0.26), hair=(0.55, 0.58, 0.62),
             skin=(0.40, 0.32, 0.24), gear=(0.25, 0.20, 0.16), ojo=(0.06, 0.05, 0.04),
             nucleo=(0.3, 0.3, 0.3), brillo=0.0),
    rest=dict(hips=(0, 0, 0), head=(0, 0, 0), trunk=(-4, 0, 0), abdomen=(-8, 0, 0),
              proboscis=(6, 0, 0), wingL=(0, 0, 26), wingR=(0, 0, -26)),
)
VARIANTES = dict(gotita=GOTA, jiron=JIRON, brasita=BRASITA, copito=COPITO, alma=ALMA,
                 chitra=CHITRA)
MALLAS = dict(gotita=gotita_mesh, jiron=jiron_mesh, brasita=brasita_mesh,
              copito=copito_mesh, alma=alma_mesh, chitra=chitra_mesh)


# ============================================================
# Clips
# ============================================================
def esp_clips(v, rig, firma):
    """Flotación común: los espíritus no andan, se mecen; la cola barre."""
    rest = dict(v['rest'])

    def pose(**over):
        return {**rest, **over}

    # Reposo: vaivén de flotación, la cola ondea detrás (bucle f49)
    rig.clip('Reposo', [
        (1, pose()),
        (13, pose(chest=(rest['chest'][0] - 2, 0, 0), head=(rest['head'][0] - 2, 3, 0),
                  tail=(rest['tail'][0] + 4, 4, 0), tip=(rest['tip'][0] + 7, 6, 0)),
            (0, 0, 0.012)),
        (25, pose(chest=(rest['chest'][0] + 2, 0, 0), head=(rest['head'][0] + 2, -3, 0),
                  tail=(rest['tail'][0] - 3, -4, 0), tip=(rest['tip'][0] - 5, -6, 0))),
        (37, pose(tail=(rest['tail'][0] + 3, 2, 0), tip=(rest['tip'][0] + 5, 3, 0),
                  armL=(rest['armL'][0] + 6, 0, 0), armR=(rest['armR'][0] + 6, 0, 0)),
            (0, 0, 0.008)),
        (49, pose()),
    ])

    # Caminar: desliza hacia delante meciéndose, brazos arrastrados (bucle f17)
    pasos = []
    for i in range(9):
        t = i / 8
        s = math.sin(2 * math.pi * t)
        c = math.cos(2 * math.pi * t)
        p = pose(chest=(rest['chest'][0] - 4 + 2 * s, 0, 0),
                 head=(rest['head'][0] - 4 - 2 * s, 0, 0),
                 armL=(rest['armL'][0] + 14 - 8 * c, 0, 0),
                 armR=(rest['armR'][0] + 14 + 8 * c, 0, 0),
                 tail=(rest['tail'][0] + 8 + 5 * s, 5 * c, 0),
                 tip=(rest['tip'][0] + 12 + 7 * s, 7 * c, 0))
        pasos.append((1 + i * 2, p, (0, -0.06 * abs(s), 0.010 * c)))
    rig.clip('Caminar', pasos)

    firma(v, rig, pose, rest)

    # Golpeado: se aplasta como una bocanada y rebota (no bucle)
    rig.clip('Golpeado', [
        (1, pose()),
        (4, pose(chest=(rest['chest'][0] + 16, 0, 0), head=(rest['head'][0] + 14, 0, 0),
                 armL=(rest['armL'][0] - 22, 0, 0), armR=(rest['armR'][0] - 22, 0, 0),
                 tail=(rest['tail'][0] - 12, 0, 0), tip=(rest['tip'][0] - 16, 0, 0)),
            (0, 0.06, -0.03)),
        (9, pose(chest=(rest['chest'][0] - 6, 0, 0), tail=(rest['tail'][0] + 6, 0, 0)),
            (0, 0.01, 0.02)),
        (16, pose()),
    ])

    # Morir: pierde el aire, se desinfla y la cola se enrosca en el suelo (no bucle)
    rig.clip('Morir', [
        (1, pose()),
        (6, pose(chest=(rest['chest'][0] - 10, 0, 0), head=(rest['head'][0] - 10, 0, 0),
                 tail=(rest['tail'][0] + 14, 8, 0)), (0, 0.03, 0.04)),
        (13, pose(hips=(24, 0, 0), chest=(rest['chest'][0] + 20, 0, 0),
                  head=(rest['head'][0] + 26, 0, 0), tail=(rest['tail'][0] + 22, 0, 0),
                  tip=(rest['tip'][0] + 30, 0, 0)), (0, 0.10, -0.16)),
        (22, pose(hips=(34, 0, 0), chest=(rest['chest'][0] + 30, 0, 0),
                  head=(rest['head'][0] + 34, 0, 0), tail=(rest['tail'][0] + 26, 0, 0),
                  tip=(rest['tip'][0] + 34, 0, 0)), (0, 0.16, -0.24)),
        (34, pose(hips=(34, 0, 0), chest=(rest['chest'][0] + 30, 0, 0),
                  head=(rest['head'][0] + 34, 0, 0), tail=(rest['tail'][0] + 26, 0, 0),
                  tip=(rest['tip'][0] + 34, 0, 0)), (0, 0.16, -0.24)),
    ])


def firma_gotita(v, rig, pose, rest):
    # Gotita: se recoge en perla, SALTA y se ESTAMPA contra el suelo en
    # salpicadura; después rebota como gota de techo.
    rig.clip('Atacar', [
        (1, pose()),
        (5, pose(hips=(-8, 0, 0), chest=(-8, 0, 0), head=(-10, 0, 0),
                 armL=(34, 0, 10), armR=(34, 0, -10), tail=(rest['tail'][0] - 10, 0, 0),
                 tip=(rest['tip'][0] - 14, 0, 0)), (0, 0.04, 0.05)),        # se recoge
        (9, pose(hips=(14, 0, 0), chest=(12, 0, 0), head=(10, 0, 0),
                 armL=(-40, 0, 14), armR=(-40, 0, -14), tail=(-18, 0, 0), tip=(-26, 0, 0)),
            (0, -0.10, 0.22)),                                              # salta estirada
        (13, pose(hips=(26, 0, 0), chest=(22, 0, 0), head=(16, 0, 0),
                  armL=(52, 0, 8), armR=(52, 0, -8), tail=(30, 0, 0), tip=(44, 0, 0)),
            (0, -0.22, -0.06)),                                             # ¡PLAF! salpicadura
        (18, pose(hips=(-4, 0, 0), tail=(2, 0, 0), tip=(4, 0, 0)), (0, -0.10, 0.10)),
        (24, pose(tail=(10, 0, 0), tip=(14, 0, 0)), (0, -0.04, 0.03)),
        (29, pose(tail=(4, 0, 0), tip=(6, 0, 0)), (0, -0.02, 0.012)),
        (35, pose(head=(rest['head'][0] - 2, 2, 0), tip=(4, 3, 0)), (0, 0, 0.008)),
        (42, pose()),
    ])


def firma_jiron(v, rig, pose, rest):
    # Jirón: se arremolina, se LEVANTA en tolvanera y ABRAZA hacia adelante
    # envolviendo con la bruma.
    rig.clip('Atacar', [
        (1, pose()),
        (6, pose(hips=(0, 0, 6), chest=(-6, 4, 0), tail=(rest['tail'][0] - 8, -14, 0),
                 tip=(rest['tip'][0] - 12, -20, 0)), (0, 0, 0.03)),          # se arremolina
        (10, pose(hips=(0, 0, -8), chest=(-4, -4, 0), head=(-6, -4, 0),
                  armL=(-26, 0, 26), armR=(-26, 0, -26), tail=(-20, 18, 0), tip=(-26, 26, 0)),
            (0, 0.03, 0.16)),                                                # tolvanera: cola arriba
        (15, pose(hips=(0, 8, 0), chest=(18, 6, 0), head=(14, 4, 0),
                  armL=(-52, 0, 34), armR=(-52, 0, -34), tail=(18, -8, 0), tip=(26, -10, 0)),
            (0, -0.24, -0.02)),                                              # abrazo hacia delante
        (22, pose(chest=(6, 2, 0), armL=(-20, 0, 14), armR=(-20, 0, -14)), (0, -0.10, 0.04)),
        (26, pose(chest=(2, 1, 0), head=(rest['head'][0] - 2, -2, 0)), (0, -0.04, 0.02)),
        (38, pose()),
    ])


def firma_brasita(v, rig, pose, rest):
    # Brasita: REBOTA dos saltitos, se enciende (pavesas arriba) y EXPLOTA
    # hacia delante escupiendo ceniza.
    rig.clip('Atacar', [
        (1, pose()),
        (4, pose(chest=(8, 0, 0), head=(6, 0, 0), tail=(-6, 0, 0)), (0, 0, -0.02)),
        (8, pose(hips=(-8, 0, 0), chest=(-10, 0, 0), head=(-12, 0, 0),
                 armL=(-30, 0, 12), armR=(-30, 0, -12), tail=(14, 0, 0), tip=(22, 0, 0)),
            (0, -0.06, 0.16)),                                               # saltito, pavesas arriba
        (12, pose(chest=(10, 0, 0), tail=(-4, 0, 0)), (0, -0.08, -0.03)),
        (16, pose(hips=(-12, 0, 0), chest=(-16, 0, 0), head=(-18, 0, 0),
                  armL=(-56, 0, 20), armR=(-56, 0, -20), tail=(20, 0, 0), tip=(30, 0, 0)),
            (0, -0.14, 0.24)),                                               # se enciende en el aire
        (20, pose(hips=(22, 0, 0), chest=(20, 0, 0), head=(16, 0, 0),
                  armL=(60, 0, 12), armR=(60, 0, -12), tail=(34, 0, 0), tip=(46, 0, 0)),
            (0, -0.30, -0.10)),                                              # ¡EXPLOTA!
        (26, pose(tail=(12, 0, 0), tip=(18, 0, 0)), (0, -0.12, 0.05)),
        (30, pose(head=(rest['head'][0] - 2, 0, 0), tip=(10, 3, 0)), (0, -0.05, 0.02)),
        (40, pose()),
    ])


def firma_copito(v, rig, pose, rest):
    # Copito: se encoge con las puas hacia delante, CABEZA en diagonal como
    # una punitiva de hielo y SE ABRE en estrella clavando las puas.
    rig.clip('Atacar', [
        (1, pose()),
        (5, pose(hips=(-6, 0, 12), chest=(-8, 0, 6), head=(-10, 0, 6),
                 armL=(56, 0, 18), armR=(56, 0, -18), tail=(16, 0, 0), tip=(24, 0, 0)),
            (0, 0.02, 0.04)),                                                # puas hacia delante
        (9, pose(hips=(18, 0, -26), chest=(14, 0, -10), head=(10, 0, -6),
                 armL=(-44, 0, 16), armR=(-44, 0, -16), tail=(-12, 0, 0), tip=(-18, 0, 0)),
            (0, -0.20, 0.06)),                                               # cabezada en diagonal
        (14, pose(hips=(30, 0, -40), chest=(22, 0, -14), head=(14, 0, -8),
                  armL=(-58, 0, 30), armR=(-58, 0, -30), tail=(24, 0, 0), tip=(34, 0, 0)),
            (0, -0.40, -0.04)),                                              # ¡SE ABRE! puas clavadas
        (20, pose(hips=(8, 0, -10), chest=(4, 0, 0), armL=(10, 0, 8), armR=(10, 0, -8),
                  tail=(14, 0, 0), tip=(20, 0, 0)), (0, -0.18, 0.05)),
        (27, pose(tail=(8, 0, 0), tip=(12, 0, 0), armL=rest['armL'], armR=rest['armR']),
            (0, -0.06, 0.02)),
        (30, pose(head=(rest['head'][0] - 2, 2, 0), tip=(12, 0, 0)), (0, -0.05, 0.010)),
        (42, pose()),
    ])


def firma_alma(v, rig, pose, rest):
    # Alma en Pena: se yergue LAMENTÁNDOSE (cabeza atrás, mangos al cielo) y se
    # ABALANZA atravesando al rival, con el dobladillo arrastrado.
    rig.clip('Atacar', [
        (1, pose()),
        (6, pose(hips=(-8, 0, 0), chest=(-14, 0, 0), head=(-22, 0, 0),
                 armL=(-58, 0, 18), armR=(-58, 0, -18), tail=(rest['tail'][0] - 8, 0, 0),
                 tip=(rest['tip'][0] - 10, 0, 0)), (0, 0.04, 0.10)),         # lamento, mangos al cielo
        (11, pose(hips=(10, 0, 0), chest=(16, 0, 0), head=(10, 0, 0),
                  armL=(24, 0, -8), armR=(24, 0, 8), tail=(rest['tail'][0] + 10, 0, 0),
                  tip=(rest['tip'][0] + 14, 0, 0)), (0, -0.10, 0.02)),       # se lanza
        (16, pose(hips=(26, 0, 0), chest=(24, 0, 0), head=(18, 0, 0),
                  armL=(64, 0, 10), armR=(64, 0, -10), tail=(34, 0, 0), tip=(46, 0, 0)),
            (0, -0.34, -0.10)),                                              # ¡atraviesa!
        (24, pose(chest=(8, 0, 0), tail=(16, 0, 0), tip=(22, 0, 0)), (0, -0.12, 0.03)),
        (28, pose(chest=(2, 0, 0), tip=(12, 3, 0)), (0, -0.05, 0.012)),
        (40, pose()),
    ])


def firma_chitra(v, rig, pose, rest):
    # Chitra: dos picaditos de tanteo y la ESTAMPIDA final con la trompa
    # extendida y las patas recogidas.
    def embiste(pk):
        return pose(hips=(-18 * pk, 0, 0), head=(16 * pk, 0, 0),
                    proboscis=(-24 * pk, 0, 0), trunk=(-6 * pk, 0, 0),
                    abdomen=(-8 * pk, 0, 0),
                    wingL=(0, 0, 26 - 40 * pk), wingR=(0, 0, -26 + 40 * pk),
                    **legs_tuck(0.7 * pk))

    rig.clip('Atacar', [
        (1, pose()),
        (3, pose(hips=(8, 0, 0), **legs_tuck(0.2)), (0, -0.10, 0.02)),
        (5, embiste(0.6), (0, -0.22, -0.01)),                                 # picadito de tanteo
        (8, pose(hips=(8, 0, 0), **legs_tuck(0.2)), (0, -0.12, 0.02)),
        (10, embiste(0.65), (0, -0.27, -0.01)),
        (15, pose(hips=(14, 0, 0), trunk=(6, 0, 0), **legs_tuck(0.25)), (0, -0.08, 0.03)),
        (19, embiste(1.0), (0, -0.34, -0.02)),                                # ¡ESTAMPIDA!
        (23, pose(hips=(-6, 0, 0), proboscis=(8, 0, 0), **legs_tuck(0.3)), (0, -0.14, 0.03)),
        (26, pose(hips=(2, 0, 0), proboscis=(4, 3, 0), **legs_tuck(0.15)), (0, -0.05, 0.015)),
        (38, pose()),
    ])


def chitra_clips(v, rig, firma):
    rest = dict(v['rest'])

    def pose(**over):
        return {**rest, **over}

    def alas(fase, extra=None):
        """Una fase del batido (0..1): alitas arriba/abajo."""
        s = math.sin(2 * math.pi * fase)
        p = dict(wingL=(6 * s, 0, 26 + 52 * s), wingR=(-6 * s, 0, -26 + 52 * s))
        if extra:
            p.update(extra)
        return p

    # Reposo: suspendida en el aire, alitas batiendo rápido, trompa tanteando
    # y abdomen bombeando (bucle f9)
    keys = []
    for i in range(10):
        f = i / 9
        ex = dict(proboscis=(4 * math.sin(2 * math.pi * f), 6 * math.sin(math.pi * f), 0),
                  abdomen=(-6 + 3 * math.sin(2 * math.pi * f), 0, 0),
                  trunk=(-2 + 1.5 * math.sin(2 * math.pi * f), 0, 0))
        keys.append((1 + i, pose(**alas(f, ex)), (0, 0, 0.004 * math.sin(2 * math.pi * f))))
    rig.clip('Reposo', keys)

    # Caminar: vuela hacia delante con alitas rápidas y patas colgando
    # balanceadas (bucle f9)
    keys = []
    for i in range(10):
        f = i / 9
        s = math.sin(2 * math.pi * f)
        ex = dict(legs_tuck(0.10 + 0.08 * s), trunk=(-6, 0, 0), abdomen=(-10 - 4 * s, 0, 0),
                  proboscis=(10 + 4 * s, 0, 0), head=(4 * s, 0, 0))
        keys.append((1 + i, pose(**alas(2 * f, ex)), (0, -0.06 * (0.5 + 0.5 * s), 0.008 * s)))
    rig.clip('Caminar', keys)

    firma(v, rig, pose, rest)

    # Golpeado: voltereta atrás y se tambalea (no bucle)
    rig.clip('Golpeado', [
        (1, pose()),
        (3, pose(hips=(-30, 0, 0), head=(-20, 0, 0), proboscis=(-20, 0, 0),
                 wingL=(0, 0, 70), wingR=(0, 0, -70)), (0, 0.05, 0.03)),
        (6, pose(hips=(16, 0, 0), trunk=(10, 0, 0), abdomen=(12, 0, 0)), (0, 0.02, -0.02)),
        (10, pose(wingL=(0, 0, 50), wingR=(0, 0, -50)), (0, 0, 0.02)),
        (16, pose()),
    ])

    # Morir: las alas caen y se deja caer de espaldas, patas rígidas arriba
    # (no bucle)
    rig.clip('Morir', [
        (1, pose()),
        (5, pose(hips=(20, 0, 0), wingL=(0, 0, 6), wingR=(0, 0, -6),
                 **legs_tuck(0.2)), (0, 0.03, 0.05)),
        (11, pose(hips=(70, 0, 0), head=(30, 0, 0), trunk=(14, 0, 0), abdomen=(20, 0, 0),
                  proboscis=(30, 0, 0), wingL=(0, 0, -10), wingR=(0, 0, 10),
                  **legs_tuck(0.55)), (0, 0.06, -0.10)),
        (20, pose(hips=(84, 0, 0), head=(36, 0, 0), trunk=(18, 0, 0), abdomen=(26, 0, 0),
                  proboscis=(36, 0, 0), wingL=(0, 0, -14), wingR=(0, 0, 14),
                  **legs_tuck(0.75)), (0, 0.06, -0.155)),
        (32, pose(hips=(84, 0, 0), head=(36, 0, 0), trunk=(18, 0, 0), abdomen=(26, 0, 0),
                  proboscis=(36, 0, 0), wingL=(0, 0, -14), wingR=(0, 0, 14),
                  **legs_tuck(0.75)), (0, 0.06, -0.155)),
    ])


# ============================================================
# Ensamblado
# ============================================================
FIRMAS = dict(gotita=firma_gotita, jiron=firma_jiron, brasita=firma_brasita,
              copito=firma_copito, alma=firma_alma, chitra=firma_chitra)


def generar(escena_base, v, mesh_fn, esp: bool):
    m = mats(v)
    rig = fg_rig.Rig(escena_base, v['rig'], ESPIRITU_BONES if esp else chitra_bones())
    b = fg.Builder('Cuerpo')
    mesh_fn(b, m)
    rig.part(b)
    if esp:
        esp_clips(v, rig, FIRMAS[v['nombre']])
    else:
        chitra_clips(v, rig, FIRMAS[v['nombre']])
    cuerpo = rig.parts[0]
    rig.export(v['archivo'])
    return rig, cuerpo


def main():
    escena_base = fg.reset()
    nombres = []
    plan = (('gotita', True), ('jiron', True), ('brasita', True), ('copito', True),
            ('alma', True), ('chitra', False))
    for nombre, esp in plan:
        v = VARIANTES[nombre]
        rig, cuerpo = generar(escena_base, v, MALLAS[nombre], esp)
        cuerpo.name = f'Cuerpo_{nombre}'
        for a in rig.actions:
            a.name = nombre + '_' + a.name
        nombres.append(v['archivo'])
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'arte', 'blender',
                                                       'fauna_espiritus.blend'), copy=True)
    print('fauna_espiritus.blend salvo los seis:', ', '.join(nombres))


if __name__ == '__main__':
    main()
