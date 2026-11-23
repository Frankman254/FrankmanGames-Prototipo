// Pantalla de título: sobre la escena 3D (el lienzo sigue pintando detrás).
import { button, h } from '../dom';
import { artIcon } from '../artIcons';
import type { SlotSummary } from '../saveStore';

export interface TitleActions {
    newGame(): void;
    continueLatest(): void;
    load(): void;
    options(): void;
    quit(): void;
    /** Sólo desarrollo (o con la marca): «Partidas de prueba». */
    presets?: () => void;
}

/** «1 h 05 min» / «12 min» a partir de segundos jugados. */
function playTimeText(seconds: number): string {
    const m = Math.floor(seconds / 60);
    if (m < 1) return seconds > 0 ? '< 1 min' : '';
    const hh = Math.floor(m / 60);
    return hh > 0 ? `${hh} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
}

export function titleScreen(
    latest: SlotSummary | null,
    className: (id: string) => string,
    a: TitleActions,
): HTMLElement {
    const menuButton = (label: string, icon: string, action: () => void, cls = ''): HTMLButtonElement => {
        const b = button(label, action, cls);
        const art = artIcon('ui', icon);
        if (art) b.innerHTML = `<span class="title-btn-icon">${art}</span><span>${label}</span>`;
        return b;
    };
    const cont = menuButton('Continuar', 'continue', a.continueLatest, 'primary');
    if (!latest) cont.disabled = true;
    const load = menuButton('Cargar partida', 'load_game', a.load);
    if (!latest) load.disabled = true;

    // PRE-01: "Continuar" muestra claramente qué partida es.
    const continueInfo = latest
        ? (() => {
              const when = new Date(latest.savedAt);
              const dateStr = !isNaN(when.getTime())
                  ? when.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                  : '';
              const timeStr = playTimeText(latest.playSeconds);
              const timePart = [dateStr, timeStr].filter(Boolean).join(' · ');
              const placePart = latest.place ? ` · ${latest.place}` : '';
              return h('div.title-continue-info', {
                  text: `${latest.label} · ${className(latest.classId)} · nivel ${latest.level}${placePart}${timePart ? ` · ${timePart}` : ''}`,
              });
          })()
        : null;

    return h(
        'div.screen.title-screen',
        null,
        h(
            'div.title-block',
            null,
            h('div.title-kicker', { text: 'Prototipo · Slice 03' }),
            h('h1.title-logo', { text: 'FrankmanGames' }),
            h('div.title-rule'),
            h(
                'nav.title-menu',
                null,
                latest ? cont : null,
                continueInfo,
                (() => {
                    const b = menuButton('Nueva partida', 'new_game', a.newGame, latest ? '' : 'primary');
                    b.setAttribute('data-testid', 'new-game');
                    return b;
                })(),
                latest ? load : null,
                a.presets ? menuButton('Partidas de prueba', 'test_game', a.presets) : null,
                menuButton('Opciones', 'options', a.options),
                menuButton('Salir', 'quit', a.quit),
            ),
        ),
        h('div.title-foot', { text: 'Prototipo — clases, hechizos, objetos y números son PROPUESTA y se revisarán.' }),
    );
}
