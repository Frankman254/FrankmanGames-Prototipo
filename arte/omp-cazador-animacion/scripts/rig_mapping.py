# Mapeo y compatibilidad de rigs humanoide. Comprueba que el armazón tiene los
# huesos que el pipeline espera y propone fallbacks documentados si faltan.
#
# Fallbacks (aviso + sustituto, nunca movimiento corrupto):
#  - sin 'footL/R': los marcadores de suela se ponen en la cola del hueso
#    tobillo (head+0.92*tail) sin drop -> contacto menos fino, el pipeline lo
#    avisa y el validador baja el umbral;
#  - sin 'spine' (Blender-chan): el torso se resuelve con 'chest' como raíz
#    de brazos y elIK de brazo usa cadena (upperArm, foreArm) igual;
#  - huesos extra (clavículas, dedos): ignorados al exportar si no tienen
#    canales, preservados si los tienen (el fix no los toca).
REQUIRED = ['hips', 'chest', 'head',
            'upperArmL', 'foreArmL', 'handL', 'upperArmR', 'foreArmR', 'handR',
            'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR']
OPTIONAL = ['spine', 'toeL', 'toeR']


def check(arm, cfg):
    """(ok, avisos): arm es Object ARMATURE. Busca cada nombre esperado por
    alias del config y por nombre exacto de hueso."""
    B = cfg['bones']
    have = set(arm.data.bones.keys())
    avisos = []
    resuelto = {}
    for key in REQUIRED:
        b = B.get(key, key)
        if b in have:
            resuelto[key] = b
        else:
            alt = _buscar_alias(have, key)
            if alt:
                resuelto[key] = alt
                avisos.append(f'AVISO: hueso {key} no existe; usado alias {alt}')
            else:
                avisos.append(f'AVISO: hueso obligatorio {key} FALTA -> el '
                              f'pipeline no puede reconstruir la parte afectada')
    for key in OPTIONAL:
        b = B.get(key, key)
        if b in have:
            resuelto[key] = b
    ok = all(k in resuelto for k in REQUIRED)
    return ok, resuelto, avisos


def _buscar_alias(have, key):
    """Sinónimos típicos de los rigs del proyecto (mayúsculas, prefijos)."""
    k = key.lower()
    for cand in (key, key[0].upper() + key[1:], f'bone_{k}', f'{k}_ik'):
        if cand in have:
            return cand
    for b in have:
        if b.lower() == k:
            return b
    return None


def bones_report(arm):
    """Firma del rig para comparar compatibilidad entre personajes."""
    return sorted((b.name, round(b.length, 3)) for b in arm.data.bones)
