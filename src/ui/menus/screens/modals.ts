// Ventanas modales: pausa, opciones, ranuras de guardado y confirmación.
import { button, h } from '../dom';
import { OPTION_LIMITS, SLOT_COUNT, type GameOptions, type SlotSummary } from '../saveStore';

export function modal(title: string, cls: string, ...children: (HTMLElement | null)[]): HTMLElement {
  const box = h(`div.panel.modal.${cls}` as 'div', null, h('header.panel-head', null, h('h2', { text: title })), h('div.panel-body', null, ...children));
  const back = h('div.modal-backdrop', null, box);
  back.addEventListener('pointerdown', (e) => e.stopPropagation());
  return back;
}

export interface PauseActions {
  resume(): void;
  save(): void;
  load(): void;
  options(): void;
  quitToTitle(): void;
}

export function pauseModal(a: PauseActions, info: string): HTMLElement {
  return modal('Pausa', 'pause-modal',
    h('div.modal-info', { text: info }),
    h('nav.modal-menu', null,
      button('Continuar', a.resume, 'primary'),
      button('Guardar partida', a.save),
      button('Cargar partida', a.load),
      button('Opciones', a.options),
      button('Salir al título', a.quitToTitle)),
  );
}

export function optionsModal(o: GameOptions, onChange: (o: GameOptions) => void, onBack: () => void): HTMLElement {
  const cur = { ...o };
  const L = OPTION_LIMITS;
  const range = (label: string, key: 'cameraSensitivity' | 'volume', fmt: (v: number) => string): HTMLElement => {
    const out = h('output', { text: fmt(cur[key]) });
    const inp = h('input', { type: 'range', min: L[key].min, max: L[key].max, step: L[key].step, value: cur[key], 'data-opt': key });
    inp.addEventListener('input', () => {
      cur[key] = Number(inp.value);
      out.textContent = fmt(cur[key]);
      onChange({ ...cur });
    });
    return h('label.opt-row', null, h('span', { text: label }), inp, out);
  };
  const check = (label: string, key: 'invertCameraY' | 'showFps'): HTMLElement => {
    const inp = h('input', { type: 'checkbox', 'data-opt': key });
    inp.checked = cur[key];
    inp.addEventListener('change', () => {
      cur[key] = inp.checked;
      onChange({ ...cur });
    });
    return h('label.opt-row.check', null, h('span', { text: label }), inp);
  };
  return modal('Opciones', 'options-modal',
    h('h4', { text: 'Cámara' }),
    range('Sensibilidad', 'cameraSensitivity', (v) => `${v.toFixed(1).replace('.', ',')}×`),
    check('Invertir eje vertical', 'invertCameraY'),
    h('h4', { text: 'Pantalla' }),
    check('Mostrar FPS y tiempos', 'showFps'),
    h('h4', { text: 'Sonido' }),
    range('Volumen general', 'volume', (v) => `${Math.round(v * 100)} %`),
    h('p.hint', { text: 'Todavía no hay sonido. Las opciones se guardan en este equipo.' }),
    h('div.row-end', null, button('Volver', onBack, 'primary')),
  );
}

export function slotsModal(
  mode: 'save' | 'load',
  slots: (SlotSummary | null)[],
  current: number | null,
  className: (id: string) => string,
  a: { pick(slot: number): void; remove(slot: number): void; back(): void },
): HTMLElement {
  const list = h('div.slot-list');
  for (let i = 0; i < SLOT_COUNT; i++) {
    const s = slots[i] ?? null;
    const when = s ? new Date(s.savedAt) : null;
    const row = h(`div.slot-row${s ? '' : '.empty'}${i === current ? '.current' : ''}` as 'div', null,
      h('div.slot-num', { text: String(i + 1) }),
      h('div.slot-info', null,
        h('div.slot-name', { text: s ? `${s.name} · ${className(s.classId)}` : 'Ranura vacía' }),
        h('div.slot-meta', {
          text: s ? `Nivel ${s.level} · ${when && !isNaN(when.getTime()) ? when.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}${i === current ? ' · partida actual' : ''}` : '—',
        })),
    );
    const pick = button(mode === 'save' ? 'Guardar aquí' : 'Cargar', () => a.pick(i), 'small');
    if (mode === 'load' && !s) pick.disabled = true;
    row.appendChild(pick);
    if (s) row.appendChild(button('Borrar', () => a.remove(i), 'small danger'));
    list.appendChild(row);
  }
  return modal(mode === 'save' ? 'Guardar partida' : 'Cargar partida', 'slots-modal', list, h('div.row-end', null, button('Volver', a.back)));
}

export function confirmModal(
  title: string,
  text: string,
  yes: string,
  input: { min: number; max: number; value: number } | undefined,
  onYes: (n: number) => void,
  onNo: () => void,
): HTMLElement {
  const num = input ? h('input.qty-input', { type: 'number', min: input.min, max: input.max, value: input.value }) : null;
  const ok = button(yes, () => {
    const n = num ? Math.max(input!.min, Math.min(input!.max, Math.floor(Number(num.value) || input!.value))) : 1;
    onYes(n);
  }, 'primary danger');
  return modal(title, 'confirm-modal', h('p', { text }), num ? h('label.opt-row', null, h('span', { text: 'Cantidad' }), num) : null,
    h('div.row-end', null, button('Cancelar', onNo), ok));
}
