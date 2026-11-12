# Validador de los pilotos cazador anime (2026-11-12). Sin Blender: parsea los
# GLB de assets/models con el lector de `diagnostico.py` (numpy) y comprueba el
# contrato de la entrega. Uso: python3 scripts/blender/validar_cazador_anime.py
# [ruta_glb ...]. Sale con código 0 si todo pasa; imprime FALLO por criterio roto.
import os
import sys
from math import sqrt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import diagnostico as D

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

CLIPS_ESPERADOS = {'Reposo', 'Caminar', 'Correr', 'Rodar', 'Golpeado', 'Morir',
                   'Atacar', 'Lanzar', 'Disparar',
                   'Emote_wave', 'Emote_laugh', 'Emote_dance', 'Emote_cry',
                   'Emote_angry', 'Emote_love', 'Emote_sleep', 'Emote_doubt'}
HUESOS_PIEL = 16            # el skin del juego no cambió: sin clavículas nuevas
DERRAPE_PLANO_MAX = 2.5     # cm/frame con la suela a nivel (fix_slide interno)
ROLL = 0.02
ANCHORA_MAX = 45.0          # cm mano R→cabeza en tracción (dispara desde la barbilla)
ANCHORA_MIN = 15.0
CABEZA_ANCLA = (15, 17)     # frames de ancla/suelta revisados
NET_AVANCE_HIPS_MAX = 0.02  # m: walk-in-place, el avance lo pone el motor


def _m(arr):
    return (float(arr[0]), float(arr[1]), float(arr[2]))


def _sole_world(W, side):
    """(z_min, z_max, (x,z) puntera) en coords glTF (Y arriba)."""
    p, t = D.punta(W, side), D.talon(W, side)
    zs = (p[1], t[1])
    return min(zs), max(zs), (p[0], p[2])


def derrape_plano(Ws, nf):
    """Máx desplazamiento XY de puntera entre frames consecutivos con la suela
    a nivel (pie plano, no rodando). Coherente con fix_slide: glTF Y arriba."""
    worst = 0.0
    prev = {}
    for i in range(nf):
        W = Ws[i]
        soles = {s: _sole_world(W, s) for s in ('L', 'R')}
        ground = min(v[0] for v in soles.values())
        flat = {s for s, (z0, z1, _) in soles.items()
                if z1 - z0 < ROLL and z0 < ground + ROLL}
        for s in (set(prev) & flat):
            a, b = prev[s], soles[s][2]
            worst = max(worst, sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2))
        prev = {s: soles[s][2] for s in flat}
    return worst * 100


def validar(path):
    g, buf = D.load(path)
    errs, infos = [], []
    anims = {a.get('name'): a for a in g['animations']}
    faltan = CLIPS_ESPERADOS - set(anims)
    if faltan:
        errs.append(f'clips faltantes: {sorted(faltan)}')
    sobran = set(anims) - CLIPS_ESPERADOS
    if sobran:
        errs.append(f'clips inesperados (duplicados?): {sorted(sobran)}')
    # skin sin cambios: 16 joints por skin
    for sk in g.get('skins', []):
        if len(sk['joints']) != HUESOS_PIEL:
            errs.append(f'skin con {len(sk["joints"])} joints (esperados {HUESOS_PIEL})')
    # huesos nuevos tipo clavícula no admitidos
    nombres = {n['name'] for n in g['nodes']}
    for malo in ('clavicleL', 'clavicleR', 'upperArmL.001'):
        if malo in nombres:
            errs.append(f'hueso/nodo inesperado: {malo}')

    def Ws_de(name):
        a = anims[name]
        ch = D.canales(a, g, buf)
        dur = max(float(D.acc(g, buf, s['input'])[-1][0]) for s in a['samplers'])
        nf = max(2, round(dur * D.FPS))
        return [D.world(D.pose_local(a, g, buf, ch, i / D.FPS)) for i in range(nf)], nf, dur

    # marcha: walk-in-place y plano sin deslizamiento
    for cn in ('Caminar', 'Correr'):
        if cn not in anims:
            continue
        Ws, nf, _ = Ws_de(cn)
        h0, h1 = Ws[0]['hips'][1], Ws[-1]['hips'][1]
        net = sqrt((h1[0] - h0[0]) ** 2 + (h1[2] - h0[2]) ** 2)
        if net > NET_AVANCE_HIPS_MAX:
            errs.append(f'{cn}: hips avanza {net*100:.1f} cm en el bucle (debe ir en sitio)')
        d = derrape_plano(Ws, nf)
        infos.append(f'{cn}: derrape plano máx {d:.1f} cm/f; avance hips {net*100:.1f} cm')
        if d > DERRAPE_PLANO_MAX:
            errs.append(f'{cn}: derrape plano {d:.1f} cm/f > {DERRAPE_PLANO_MAX}')

    # Disparar: ancla en la cara, y bucle que vuelve al reposo
    if 'Disparar' in anims:
        Ws, nf, dur = Ws_de('Disparar')
        for f in CABEZA_ANCLA:
            W = Ws[min(f - 1, nf - 1)]
            head, hr = _m(W['head'][1]), _m(W['handR'][1])
            d = sqrt((head[0] - hr[0]) ** 2 + (head[1] - hr[1]) ** 2 + (head[2] - hr[2]) ** 2) * 100
            infos.append(f'Disparar f{f}: manoR-cabeza {d:.1f} cm')
            if not (ANCHORA_MIN <= d <= ANCHORA_MAX):
                errs.append(f'Disparar f{f}: manoR-cabeza {d:.1f} cm fuera de [{ANCHORA_MIN},{ANCHORA_MAX}]')
        jump = max(sqrt(sum((Ws[i]['hips'][1][k] - Ws[i - 1]['hips'][1][k]) ** 2 for k in (0, 1, 2)))
                   for i in range(1, nf)) * 100
        if jump > 5:
            errs.append(f'Disparar: salto de cadera {jump:.1f} cm/frame')
        ch = D.canales(anims['Disparar'], g, buf)
        hl0 = _m(Ws[0]['handL'][1])
        tend = _m(D.world(D.pose_local(anims['Disparar'], g, buf, ch, dur))['handL'][1])
        drift = sqrt(sum((hl0[k] - tend[k]) ** 2 for k in range(3))) * 100
        infos.append(f'Disparar: cierre de bucle muñecaL {drift:.1f} cm')
        if drift > 3:
            errs.append(f'Disparar: bucle roto, muñecaL f1 vs ffin {drift:.1f} cm')

    # Lanzar: la mano derecha pasa de detrás de la nuca a delante del pecho
    if 'Lanzar' in anims:
        Ws, nf, _ = Ws_de('Lanzar')
        # signo de Y glTF: -Y es delante (el modelo mira a -Y; la exportación
        # yup conserva ese eje relativo al cuerpo por rotación de 90°)
        z_back = _m(Ws[min(5, nf - 1)]['handR'][1])
        z_fwd = _m(Ws[min(12, nf - 1)]['handR'][1])
        moved = sqrt(sum((z_back[k] - z_fwd[k]) ** 2 for k in range(3))) * 100
        infos.append(f'Lanzar: recorrido manoR f6→f13 {moved:.1f} cm')
        if moved < 60:
            errs.append(f'Lanzar: recorrido de lanzamiento sólo {moved:.1f} cm (esperado > 60)')

    # todos los clips: duraciones y muestreos sanos, sin NaN
    for cn, a in anims.items():
        ch = D.canales(a, g, buf)
        try:
            dur = max(float(D.acc(g, buf, s['input'])[-1][0]) for s in a['samplers'])
            if not (0.03 < dur < 10.0):
                errs.append(f'{cn}: duración {dur}s fuera de rango')
            for s in a['samplers']:
                vals = D.acc(g, buf, s['output'])
                if not D.np.isfinite(vals).all():
                    errs.append(f'{cn}: NaN/Inf en keyframes')
                    break
        except Exception as e:            # noqa: BLE001
            errs.append(f'{cn}: ilegible ({e})')
    return errs, infos


def main(argv):
    paths = argv or [os.path.join(RAIZ, 'assets', 'models', n)
                     for n in ('cazador_anime.glb', 'cazador_f_anime.glb')]
    ok = True
    for pth in paths:
        errs, infos = validar(pth)
        print(f'== {pth}')
        for s in infos:
            print('   ', s)
        for e in errs:
            ok = False
            print('  FALLO:', e)
        print('   RESULTADO:', 'OK' if not errs else f'{len(errs)} FALLOS')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
