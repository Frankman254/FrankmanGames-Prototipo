# Recorta las texturas de personaje de las láminas del creador (generadas con ChatGPT,
# 2026-11-05) en docs/texturas_diseño_personajes/ y las deja en assets/textures/personajes/.
#   python scripts/art/recortarLaminas.py
# Necesita Python 3 con numpy y opencv-python. Reproducible: no hay retoques a mano.
#
# Cada pieza se busca por un punto de anclaje dentro de ella: el script separa el fondo
# claro de la lámina, toma la mancha que contiene ese punto y la recorta entera, a la
# resolución original. Después, según el modo:
#   superficie  repetible en los dos ejes: se funde con su copia desplazada media
#               baldosa, de modo que los bordes casan (tela, cuero, madera, metal).
#   tira_x      repetible a lo ancho (cenefas, correas, cuerdas): busca el periodo del
#               dibujo y corta un número entero de periodos; si no lo encuentra, espejo.
#   tira_y      igual, a lo alto (empuñaduras enrolladas).
#   pieza       una sola vez, con transparencia donde estaba el fondo (escudo, medallón,
#               hebillas, amuletos, gemas).
#   lamina      una sola vez y sin transparencia (telas pintadas con su caída).
# También reescribe la tabla de estas texturas en PROCEDENCIA.md.
import os
import sys

import cv2
import numpy as np

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SRC = os.path.join(ROOT, 'docs', 'texturas_diseño_personajes')
OUT = os.path.join(ROOT, 'assets', 'textures', 'personajes')
LAMINAS = {
    'centinela': 'Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png',
    'oraculo': 'Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png',
    'cazador': 'Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png',
    'forjador': 'Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png',
}

# (archivo, lámina, ancla (x, y) o rectángulo (x0, y0, x1, y1), modo, uso en el juego)
# `sub` opcional: fracción (x0, y0, x1, y1) de la pieza encontrada que se queda.
S, TX, TY, P, L = 'superficie', 'tira_x', 'tira_y', 'pieza', 'lamina'
PIEZAS = [
    # Lámina del Centinela del Istmo.
    ('tela_beige', 'centinela', (110, 400), S, 'Camisa del Centinela del Istmo'),
    ('tela_azul', 'centinela', (340, 400), S, 'Capa del Centinela del Istmo'),
    ('tela_roja', 'centinela', (575, 400), S, 'Faja del Centinela del Istmo'),
    ('tela_beige_drapeada', 'centinela', (170, 150), S, 'Reserva: tela con caída pintada'),
    ('tela_azul_drapeada', 'centinela', (490, 150), S, 'Reserva: tela con caída pintada'),
    ('tela_roja_drapeada', 'centinela', (800, 150), S, 'Faldón de la faja del Centinela del Istmo'),
    ('cuero_marron', 'centinela', (140, 590), S, 'Botas, bolsas y brazales del Centinela del Istmo'),
    ('cuero_costura', 'centinela', (370, 590), TY, 'Reserva: cuero con pespunte'),
    ('cuero_costura_cruz', 'centinela', (575, 590), TX, 'Reserva: cuero con pespunte en cruz'),
    ('escudo_rombos', 'centinela', (820, 490), P, 'Cara del escudo del Centinela del Istmo'),
    ('cenefa_azul_triangulos', 'centinela', (1100, 75), TX, 'Reserva: cenefa'),
    ('cenefa_azul_triangulos_fina', 'centinela', (1100, 200), TX, 'Ribete de la capa del Centinela del Istmo'),
    ('cenefa_roja_zigzag', 'centinela', (1100, 318), TX, 'Cintas de la lanza del Centinela del Istmo'),
    ('cenefa_roja_greca', 'centinela', (1100, 450), TX, 'Faldón de la faja del Centinela del Istmo'),
    ('cenefa_roja_espiral', 'centinela', (1100, 600), TX, 'Mangas de la camisa del Centinela del Istmo'),
    ('correa_hebilla', 'centinela', (250, 730), P, 'Reserva: correa con hebilla'),
    ('correa_hebilla_2', 'centinela', (250, 820), P, 'Reserva: correa con hebilla'),
    ('correa_costura_cruz', 'centinela', (250, 908), P, 'Reserva: correa con remates'),
    ('correa_marron', 'centinela', (250, 908), TX, 'Cinturones y correas del Centinela del Istmo', (0.2, 0.08, 0.78, 0.92)),
    ('tachuela_piramide', 'centinela', (540, 730), P, 'Reserva: tachuela'),
    ('tachuela_redonda', 'centinela', (540, 820), P, 'Reserva: tachuela'),
    ('parche_cuero_cruz', 'centinela', (540, 905), P, 'Reserva: parche de cuero'),
    ('metal_dorado', 'centinela', (765, 723), S, 'Hebillas, punta y virolas del Centinela del Istmo', (0.04, 0.12, 0.96, 0.88)),
    ('barra_dorada_triangulos', 'centinela', (765, 807), TX, 'Reserva: barra de metal'),
    ('barra_dorada_lisa', 'centinela', (765, 873), TX, 'Reserva: barra de metal'),
    ('barra_dorada_trenzada', 'centinela', (765, 925), TX, 'Aros de la lanza del Centinela del Istmo'),
    ('medallon_sol', 'centinela', (943, 688, 1106, 845), P, 'Broche de la capa del Centinela del Istmo'),
    ('placa_dorada_rombo', 'centinela', (948, 850, 1241, 949), P, 'Reserva: placa de metal'),
    ('cuerda_trenzada', 'centinela', (120, 1035), S, 'Reserva: cuerda'),
    ('tela_roja_vendaje', 'centinela', (340, 1035), S, 'Vendas de los antebrazos del Centinela del Istmo'),
    ('empunadura_cuerda', 'centinela', (490, 1035), TY, 'Reserva: empuñadura', (0, 0.2, 1, 0.8)),
    ('empunadura_lino', 'centinela', (562, 1035), TY, 'Puño de la lanza del Centinela del Istmo', (0, 0.2, 1, 0.8)),
    ('empunadura_roja', 'centinela', (634, 1035), TY, 'Reserva: empuñadura', (0, 0.2, 1, 0.8)),
    ('empunadura_marron', 'centinela', (707, 1035), TY, 'Asta de la lanza del Centinela del Istmo', (0, 0.2, 1, 0.8)),
    ('empunadura_azul', 'centinela', (780, 1035), TY, 'Reserva: empuñadura', (0, 0.2, 1, 0.8)),
    ('empunadura_trenzada', 'centinela', (853, 1035), TY, 'Reserva: empuñadura', (0, 0.1, 1, 0.9)),
    ('cenefa_marron_espiral', 'centinela', (320, 1190), TX, 'Reserva: cenefa'),
    ('cenefa_azul_espiral', 'centinela', (940, 1190), TX, 'Reserva: cenefa'),
    # Lámina del Oráculo de Bruma.
    ('tela_turquesa_drapeada', 'oraculo', (400, 150), L, 'Reserva: tela pintada con caída'),
    ('tela_violeta_drapeada', 'oraculo', (848, 150), L, 'Reserva: tela pintada con caída'),
    ('tela_violeta_hojas', 'oraculo', (360, 420), L, 'Reserva: tela pintada'),
    ('cenefa_azul_rombos', 'oraculo', (675, 333), TX, 'Reserva: cenefa'),
    ('cenefa_turquesa_olas', 'oraculo', (675, 397), TX, 'Reserva: cenefa'),
    ('cenefa_violeta_lunas', 'oraculo', (488, 425, 863, 477), TX, 'Reserva: cenefa'),
    ('cenefa_plata_hojas', 'oraculo', (488, 482, 863, 511), TX, 'Reserva: cenefa'),
    ('agua_turquesa', 'oraculo', (1170, 480), S, 'Reserva: agua'),
    ('panel_greca_violeta', 'oraculo', (90, 640), P, 'Reserva: panel tejido'),
    ('panel_ave', 'oraculo', (270, 640), P, 'Reserva: panel tejido'),
    ('panel_estrella', 'oraculo', (455, 640), P, 'Reserva: panel tejido'),
    ('borla_lino', 'oraculo', (470, 800), P, 'Reserva: amuleto'),
    ('borla_turquesa', 'oraculo', (530, 800), P, 'Reserva: amuleto'),
    ('borla_violeta', 'oraculo', (600, 800), P, 'Reserva: amuleto'),
    ('perla', 'oraculo', (40, 775), P, 'Reserva: gema'),
    ('gema_turquesa', 'oraculo', (100, 773), P, 'Reserva: gema'),
    ('gema_azul', 'oraculo', (157, 772), P, 'Reserva: gema'),
    ('piedra_turquesa', 'oraculo', (269, 771), P, 'Reserva: gema'),
    ('flor_hibisco', 'oraculo', (1140, 810), P, 'Reserva: adorno de pelo'),
    ('corteza_musgo', 'oraculo', (160, 1000), S, 'Reserva: corteza'),
    ('cenefa_turquesa_olas_ancha', 'oraculo', (160, 1195), TX, 'Reserva: cenefa'),
    ('cenefa_violeta_rombos', 'oraculo', (470, 1195), TX, 'Reserva: cenefa'),
    ('cenefa_azul_escalones', 'oraculo', (760, 1195), TX, 'Reserva: cenefa'),
    # Lámina del Cazador del Manglar.
    ('cuero_oscuro', 'cazador', (660, 150), S, 'Reserva: cuero', (0.06, 0.05, 0.86, 0.95)),
    ('tela_azul_olas', 'cazador', (910, 150), L, 'Reserva: tela pintada'),
    ('cuerda_gruesa', 'cazador', (1145, 38), TX, 'Reserva: cuerda'),
    ('cuerda_fina', 'cazador', (1145, 90), TX, 'Reserva: cuerda'),
    ('red_cuerda', 'cazador', (1145, 210), P, 'Reserva: red'),
    ('madera_musgo', 'cazador', (150, 425), S, 'Reserva: madera', (0.03, 0.04, 0.97, 0.96)),
    ('madera_tablas', 'cazador', (430, 425), S, 'Reserva: madera', (0.03, 0.04, 0.97, 0.96)),
    ('madera_vertical', 'cazador', (620, 425), TY, 'Reserva: madera', (0.05, 0.03, 0.95, 0.97)),
    ('camuflaje', 'cazador', (130, 680), S, 'Reserva: tela'),
    ('hojarasca', 'cazador', (400, 680), S, 'Reserva: follaje'),
    ('raices_manglar', 'cazador', (675, 680), S, 'Reserva: raíces'),
    ('cenefa_tejida_espiral', 'cazador', (200, 925), TX, 'Reserva: cenefa'),
    ('panel_colibri', 'cazador', (585, 925), P, 'Reserva: panel tejido'),
    ('cenefa_tejida_greca_azul', 'cazador', (925, 925), TX, 'Reserva: cenefa'),
    ('panel_tejido_cruz', 'cazador', (1165, 925), P, 'Reserva: panel tejido'),
    ('correa_oscura', 'cazador', (150, 1085), TX, 'Reserva: correa', (0.0, 0.05, 1.0, 0.95)),
    ('correa_oscura_ancha', 'cazador', (260, 1188), TX, 'Reserva: correa', (0.0, 0.05, 1.0, 0.95)),
    ('cuero_cordon', 'cazador', (705, 1140), P, 'Reserva: cuero con cordón'),
    ('empunadura_verde', 'cazador', (1045, 1135), TY, 'Reserva: empuñadura', (0, 0.1, 1, 0.9)),
    # Lámina del Forjador del Trueno.
    ('hierro_martillado', 'forjador', (960, 130), S, 'Reserva: metal'),
    ('lava', 'forjador', (1155, 130), S, 'Reserva: magma'),
    ('cenefa_greca_naranja', 'forjador', (136, 328), TX, 'Reserva: cenefa'),
    ('panel_rana', 'forjador', (376, 328), P, 'Reserva: panel tejido'),
    ('cenefa_zigzag_naranja', 'forjador', (782, 328), TX, 'Reserva: cenefa'),
    ('tela_carbon', 'forjador', (950, 328), S, 'Reserva: tela'),
    ('tela_gris', 'forjador', (1070, 328), S, 'Reserva: tela'),
    ('tela_naranja', 'forjador', (1190, 328), S, 'Reserva: tela'),
    ('correa_marron_lisa', 'forjador', (250, 436), TX, 'Reserva: correa'),
    ('correa_tachas', 'forjador', (8, 475, 496, 530), TX, 'Reserva: correa'),
    ('bronce_remaches', 'forjador', (595, 500), P, 'Reserva: placa de metal'),
    ('hierro_remaches', 'forjador', (780, 500), P, 'Reserva: placa de metal'),
    ('cuerda_lino', 'forjador', (1160, 430), TX, 'Reserva: cuerda'),
    ('cuerda_negra', 'forjador', (1160, 488), TX, 'Reserva: cuerda'),
    ('cuerda_naranja', 'forjador', (1160, 550), TX, 'Reserva: cuerda'),
    ('runa_rayo', 'forjador', (100, 700), P, 'Reserva: runa'),
    ('runa_nube', 'forjador', (306, 700), P, 'Reserva: runa'),
    ('runa_espiral', 'forjador', (500, 700), P, 'Reserva: runa'),
    ('runa_sol', 'forjador', (695, 700), P, 'Reserva: runa'),
    ('grietas_rayo', 'forjador', (200, 860), TX, 'Reserva: cenefa'),
    ('cenefa_cadena_cian', 'forjador', (550, 860), TX, 'Reserva: cenefa'),
    ('cenefa_greca_crema', 'forjador', (1110, 948), TX, 'Reserva: cenefa'),
    ('cenefa_rombos_naranja', 'forjador', (1110, 1013), TX, 'Reserva: cenefa'),
    ('cenefa_olas_crema', 'forjador', (1110, 1083), TX, 'Reserva: cenefa'),
    ('barra_bronce_greca', 'forjador', (200, 1180), TX, 'Reserva: barra de metal'),
    ('barra_bronce_rayo', 'forjador', (625, 1180), TX, 'Reserva: barra de metal'),
]

# Derivadas: (archivo, base, color medio RGB buscado, uso). La base se tiñe conservando su trama.
DERIVADAS = [
    ('tela_oliva', 'tela_beige', (104, 98, 64), 'Pantalón cargo del Centinela del Istmo'),
]


def load(path):
    im = cv2.imdecode(np.fromfile(path, np.uint8), cv2.IMREAD_COLOR)
    if im is None:
        sys.exit(f'no se pudo leer {path}')
    return im


def components(im):
    """Manchas que no son el fondo claro de la lámina: (etiquetas, cajas)."""
    corners = np.concatenate([im[:6, :6].reshape(-1, 3), im[-6:, -6:].reshape(-1, 3), im[:6, -6:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    diff = np.abs(im.astype(np.int32) - bg).max(axis=2)
    mask = cv2.morphologyEx((diff > 22).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    _, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    return bg, diff, labels, stats


def find_box(sheet, where):
    if len(where) == 4:
        return where
    x, y = where
    # La mancha más presente alrededor del ancla (las piezas recortadas tienen huecos).
    win = sheet['labels'][max(0, y - 25):y + 25, max(0, x - 25):x + 25].ravel()
    win = win[win > 0]
    if win.size == 0:
        sys.exit(f'el ancla {where} cae en el fondo')
    lab = np.bincount(win).argmax()
    bx, by, bw, bh, _ = sheet['stats'][lab]
    return bx, by, bx + bw, by + bh


def edge_blend(img):
    """Repetible en los dos ejes: los bordes vienen de la copia desplazada media baldosa."""
    h, w = img.shape[:2]
    f = img.astype(np.float32)
    rolled = np.roll(f, (h // 2, w // 2), axis=(0, 1))

    def ramp(n):
        d = np.minimum(np.arange(n), np.arange(n)[::-1]) / (n * 0.28)
        d = np.clip(d, 0, 1)
        return d * d * (3 - 2 * d)

    wgt = (ramp(h)[:, None] * ramp(w)[None, :])[..., None]
    return np.clip(f * wgt + rolled * (1 - wgt), 0, 255).astype(np.uint8)


def period_crop(img, axis):
    """Tira repetible: corta un número entero de periodos del dibujo; si no hay periodo claro, espejo."""
    a = img if axis == 1 else img.transpose(1, 0, 2)
    g = cv2.cvtColor(np.ascontiguousarray(a), cv2.COLOR_BGR2GRAY).astype(np.float32)
    g -= g.mean()
    n = g.shape[1]
    best, score = 0, 0.0
    scores = {}
    for lag in range(max(12, n // 12), int(n * 0.55)):
        x, y = g[:, :n - lag], g[:, lag:]
        den = np.sqrt((x * x).sum() * (y * y).sum()) + 1e-6
        scores[lag] = float((x * y).sum() / den)
    if scores:
        top = max(scores.values())
        # El primer pico que llega cerca del máximo: el periodo más corto.
        for lag in sorted(scores):
            s = scores[lag]
            if s >= top * 0.92 and s >= scores.get(lag - 1, -1) and s >= scores.get(lag + 1, -1):
                best, score = lag, s
                break
    if best and score > 0.6:
        reps = max(1, (n - 4) // best)
        start = (n - reps * best) // 2
        out = a[:, start:start + reps * best]
        how = f'periodo {best}px x{reps} (correlacion {score:.2f})'
    else:
        out = np.concatenate([a, a[:, ::-1]], axis=1)
        how = 'espejo'
    out = out if axis == 1 else out.transpose(1, 0, 2)
    return np.ascontiguousarray(out), how


def cutout(img, bg):
    """Pieza suelta: transparente donde la lámina enseña su fondo."""
    diff = np.abs(img.astype(np.int32) - bg).max(axis=2).astype(np.float32)
    alpha = np.clip((diff - 14) / 26, 0, 1)
    # Lo de dentro se queda opaco aunque se parezca al fondo (brillos del metal).
    solid = (alpha > 0.5).astype(np.uint8)
    cnts, _ = cv2.findContours(solid, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    fill = np.zeros_like(solid)
    cv2.drawContours(fill, cnts, -1, 1, thickness=cv2.FILLED)
    fill = cv2.erode(fill, np.ones((3, 3), np.uint8))
    alpha = np.maximum(alpha, fill.astype(np.float32))
    return np.dstack([img, (alpha * 255).astype(np.uint8)])


def main():
    os.makedirs(OUT, exist_ok=True)
    sheets = {}
    for key, fname in LAMINAS.items():
        im = load(os.path.join(SRC, fname))
        bg, diff, labels, stats = components(im)
        sheets[key] = {'im': im, 'bg': bg, 'labels': labels, 'stats': stats}
    rows = []
    names = set()
    for entry in PIEZAS:
        name, sheet_key, where, mode, use = entry[:5]
        sub = entry[5] if len(entry) > 5 else None
        if name in names:
            sys.exit(f'nombre repetido: {name}')
        names.add(name)
        sheet = sheets[sheet_key]
        x0, y0, x1, y1 = find_box(sheet, where)
        if sub:
            w, h = x1 - x0, y1 - y0
            x0, y0, x1, y1 = x0 + int(w * sub[0]), y0 + int(h * sub[1]), x0 + int(w * sub[2]), y0 + int(h * sub[3])
        inset = 0 if mode == P else 4
        crop = sheet['im'][y0 + inset:y1 - inset, x0 + inset:x1 - inset].copy()
        how = ''
        if mode == S:
            out = edge_blend(crop)
        elif mode == TX:
            out, how = period_crop(crop, 1)
        elif mode == TY:
            out, how = period_crop(crop, 0)
        elif mode == P:
            out = cutout(crop, sheet['bg'])
        else:
            out = crop
        path = os.path.join(OUT, f'{name}.png')
        ok, buf = cv2.imencode('.png', out, [cv2.IMWRITE_PNG_COMPRESSION, 9])
        buf.tofile(path)
        rel = f'assets/textures/personajes/{name}.png'
        print(f'{rel}: {out.shape[1]}x{out.shape[0]} {mode} {how}')
        rows.append((rel, sheet_key, (x0, y0, x1, y1), mode, use))
    for name, base, rgb, use in DERIVADAS:
        names.add(name)
        img = cv2.imread(os.path.join(OUT, f'{base}.png'), cv2.IMREAD_COLOR).astype(np.float32)
        gain = np.array(rgb[::-1], np.float32) / img.reshape(-1, 3).mean(axis=0)
        out = np.clip(img * gain, 0, 255).astype(np.uint8)
        cv2.imencode('.png', out, [cv2.IMWRITE_PNG_COMPRESSION, 9])[1].tofile(os.path.join(OUT, f'{name}.png'))
        rel = f'assets/textures/personajes/{name}.png'
        print(f'{rel}: derivada de {base}')
        rows.append((rel, None, base, 'derivada', use))
    stale = [f for f in os.listdir(OUT) if f.endswith('.png') and f[:-4] not in names]
    for f in stale:
        os.remove(os.path.join(OUT, f))
        print('borrado (ya no está en la lista):', f)
    write_procedencia(rows)


START = '<!-- texturas-personajes: generado por scripts/art/recortarLaminas.py -->'
END = '<!-- /texturas-personajes -->'


def write_procedencia(rows):
    path = os.path.join(ROOT, 'PROCEDENCIA.md')
    text = open(path, encoding='utf-8').read()
    lines = [START, '', '## Texturas de personaje recortadas de las láminas del creador', '',
             'Autor: el creador (Frankman254), generadas con ChatGPT el 2026-11-05 a partir de su propio encargo. '
             'Originales en `docs/texturas_diseño_personajes/`. Recorte reproducible con `scripts/art/recortarLaminas.py` '
             '(modo `superficie` = repetible en dos ejes por fundido de bordes; `tira_x`/`tira_y` = repetible en un eje; '
             '`pieza` = una vez, con transparencia; `lamina` = una vez).', '',
             '| Fecha | Archivo | Origen | Autor | Licencia | Uso en el juego |', '|---|---|---|---|---|---|']
    for rel, sheet, box, mode, use in rows:
        if sheet is None:
            lines.append(f'| 2026-11-05 | `{rel}` | `assets/textures/personajes/{box}.png` teñida por el script (misma trama, otro color) | El creador, con ChatGPT | Propia del proyecto | {use} |')
            continue
        lines.append(f'| 2026-11-05 | `{rel}` | Lámina «{sheet}» ({LAMINAS[sheet]}), recorte {box[0]},{box[1]}–{box[2]},{box[3]}, modo `{mode}` | El creador, con ChatGPT | Propia del proyecto | {use} |')
    lines += ['', END]
    block = '\n'.join(lines)
    if START in text:
        a = text.index(START)
        b = text.index(END) + len(END)
        text = text[:a] + block + text[b:]
    else:
        text = text.rstrip('\n') + '\n\n' + block + '\n'
    open(path, 'w', encoding='utf-8', newline='\n').write(text)


if __name__ == '__main__':
    main()
