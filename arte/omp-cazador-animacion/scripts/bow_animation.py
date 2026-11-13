# Animación de arco y flecha (clip 'Disparar'), parametrizada por config.
# Reutiliza pipeline_core.build_clip (bake_ik + set_euler + key_all).
#
# Cadena cinemática, no sólo brazos: la tracción sale de un anclaje IK de la
# muñeca derecha a la cuerda (NOCK) junto a la barbilla y la muñeca izquierda a
# la empuñadura (GRIP); el torso rota (chest yaw) y la cabeza asoma sobre la
# mano. Los pies quedan firmes (thighs opuestos, sin traslación de cadera). El
# ciclo: reposo -> tensado (NOCK_HALF) -> ancla máxima (NOCK_FULL) -> liberación
# (RELEASE, follow-through) -> recuperación -> reposo.
#
# Blancos (GRIP/NOCK/RELEASE/POLE_*) y fotogramas de evento viven en el config
# del personaje (arcos, eventos.Disparar). Para un rig de otra altura, escalar z
# de NOCK_* a la barbilla; si el alcance hombro->muñeca difiere, comprobar que
# todo blanco quede por debajo de ese alcance (build_clip reporta error cm).
from mathutils import Vector

import pipeline_core as core


def _v(p):
    return Vector(p)                      # el IK de pipeline_core espera Vector


def _p(**kw):
    return {**core.ARMS, **kw}


def specs(cfg):
    """Lista [(frame, pose)] para 'Disparar' según el config."""
    ev = cfg['eventos']['Disparar']
    A = cfg['arcos']
    return [
        (1, _p()),
        (4, _p(chest=(0, 0, -6), upperArmL=(-45, 14, 0), foreArmL=(-24, 0, 0),
               upperArmR=(-40, -16, 0), foreArmR=(-50, 0, 0),
               thighL=(-6, 0, 0), thighR=(6, 0, 0))),
        (ev['tensado']['frame'], dict(
            _p(chest=(0, 0, -14), head=(0, 0, 6), thighL=(-12, 0, 0), thighR=(12, 0, 0)),
            **{'~handL': (_v(A['GRIP']), _v(A['POLE_L'])),
               '~handR': (_v(A['NOCK_HALF']), _v(A['POLE_R']))})),
        (ev['ancla']['frame'], dict(
            _p(chest=(0, 0, -22), head=(-2, 0, 10), thighL=(-14, 0, 0), thighR=(14, 0, 0)),
            **{'~handL': (_v(A['GRIP']), _v(A['POLE_L'])),
               '~handR': (_v(A['NOCK_FULL']), _v(A['POLE_R']))})),
        (ev['liberacion']['frame'], dict(
            _p(chest=(2, 0, -18), head=(-2, 0, 8), thighL=(-14, 0, 0), thighR=(14, 0, 0)),
            **{'~handL': (_v(A['GRIP']), _v(A['POLE_L'])),
               '~handR': (_v(A['RELEASE']), _v(A['POLE_R']))})),
        (ev['recuperacion']['frame'], _p(chest=(0, 0, -8), upperArmL=(-55, 12, 0),
                                         foreArmL=(-22, 0, 0), upperArmR=(-25, -14, 0),
                                         foreArmR=(-35, 0, 0))),
        (cfg['clips']['Disparar']['f1'], _p()),
    ]


def build(arm, cfg, report):
    return core.build_clip(arm, 'Disparar', specs(cfg), report)
