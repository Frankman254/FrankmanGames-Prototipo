# Animación de lanzamiento (clip 'Lanzar'), parametrizada por config.
# Secuencia legible desde la cámara real (3/4 cenital):
#   1 preparación + apoyo firme (1), 2 anticipación con carga atrás (6),
#   3-4 transferencia piernas/cadera + rotación de torso (13), 5 hombro-codo-
#   muñeca controlados por IK al blanco de suelta, 6 liberación clara (frame
#   'liberacion'), 7 continuación del gesto (18, brazo abajo y cruzado),
#   8 recuperación a reposo (f1).
# El torso rota en yaw Y PITCH (chest/spine) y la rodilla de atrás flexiona en
# la transferencia: la fuerza viene de abajo, no sólo del brazo.
from mathutils import Vector

import pipeline_core as core


def _v(p):
    return Vector(p)


def _p(**kw):
    return {**core.ARMS, **kw}


def specs(cfg):
    ev = cfg['eventos']['Lanzar']
    L = cfg['lanzamiento']
    f1 = cfg['clips']['Lanzar']['f1']
    return [
        (1, _p()),
        (ev['anticipacion']['frame'], dict(
            _p(chest=(-10, 0, 14), spine=(-4, 0, 6), head=(2, 0, -10),
               thighL=(-8, 0, 0), thighR=(8, 0, 0)),
            **{'~handL': (_v(L['AIM_L']), _v(L['POLE_AIM_L'])),
               '~handR': (_v(L['THROW_BACK']), _v(L['POLE_THR_R']))})),
        (ev['liberacion']['frame'], dict(
            _p(chest=(10, 0, -18), spine=(4, 0, -8), head=(-4, 0, 12),
               thighR=(-18, 0, 0), shinR=(10, 0, 0), thighL=(10, 0, 0)),
            **{'~handL': (_v(L['AIM_L']), _v(L['POLE_AIM_L'])),
               '~handR': (_v(L['THROW_FWD']), _v(L['POLE_THR_R']))})),
        (ev['continuacion']['frame'], _p(chest=(8, 0, -12), thighR=(-14, 0, 0),
                                         shinR=(8, 0, 0), thighL=(8, 0, 0),
                                         upperArmR=(-100, -20, 0), foreArmR=(-25, 0, 0),
                                         upperArmL=(-70, 14, 0), foreArmL=(-15, 0, 0))),
        (f1, _p()),
    ]


def build(arm, cfg, report):
    return core.build_clip(arm, 'Lanzar', specs(cfg), report)
