// Pantalla de título: sobre la escena 3D (el lienzo sigue pintando detrás).
import { button, h } from '../dom';
import type { SlotSummary } from '../saveStore';

export interface TitleActions {
  newGame(): void;
  continueLatest(): void;
  load(): void;
  options(): void;
  quit(): void;
}

export function titleScreen(latest: SlotSummary | null, className: (id: string) => string, a: TitleActions): HTMLElement {
  const cont = button('Continuar', a.continueLatest, 'primary');
  if (!latest) cont.disabled = true;
  const load = button('Cargar partida', a.load);
  if (!latest) load.disabled = true;
  return h('div.screen.title-screen', null,
    h('div.title-block', null,
      h('div.title-kicker', { text: 'Prototipo · Slice 03' }),
      h('h1.title-logo', { text: 'FrankmanGames' }),
      h('div.title-rule'),
      h('nav.title-menu', null,
        latest ? cont : null,
        latest ? h('div.title-continue-info', { text: `${latest.name} · ${className(latest.classId)} · nivel ${latest.level}` }) : null,
        button('Nueva partida', a.newGame, latest ? '' : 'primary'),
        latest ? load : null,
        button('Opciones', a.options),
        button('Salir', a.quit)),
    ),
    h('div.title-foot', { text: 'Prototipo — clases, hechizos, objetos y números son PROPUESTA y se revisarán.' }),
  );
}
