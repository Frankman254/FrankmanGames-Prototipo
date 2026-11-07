import { EQUIP_SLOTS, type CommandResult, type EquipmentView, type ItemInstance } from '../../rpg/contracts';
import type { UiContext } from './context';
import { button, clear, h } from './dom';
import { formatModifier, itemTooltip, type TipLine } from './format';
import { mountLookOptions } from './mountLooks';
import { UI_LAYER_Z } from './windows';

export interface ItemContextActions {
  use?: () => CommandResult | void;
  useLabel?: string;
  sell?: () => CommandResult | void;
  deposit?: () => CommandResult | void;
  withdraw?: () => CommandResult | void;
}

/** Información de una copia sin depender de su ubicación ni tocar el equipo. */
export function itemInformationLines(ctx: UiContext, inst: ItemInstance): TipLine[] {
  const s = ctx.session();
  const emptyEquipment = Object.fromEntries(EQUIP_SLOTS.map((slot) => [slot, null])) as EquipmentView;
  return itemTooltip(inst, {
    content: s.content,
    equipment: emptyEquipment,
    equipped: false,
    compare: [],
    sellValue: 0,
    playerLevel: s.player().level,
    priceLine: `Cantidad: ${inst.quantity}`,
    inShop: true,
  });
}

let dismissCurrent: (() => void) | null = null;

/** Un menú contextual compartido; devuelve su cierre para el dueño del panel. */
export function showItemContextMenu(ctx: UiContext, anchor: HTMLElement, inst: ItemInstance, actions: ItemContextActions = {}): () => void {
  dismissCurrent?.();
  ctx.tooltip.hide();
  const menu = h('div.item-context-menu', { role: 'menu', 'aria-label': 'Opciones del objeto', tabindex: '-1' });
  menu.style.cssText = 'position:fixed;display:grid;gap:3px;padding:6px;min-width:170px;max-width:min(420px,90vw);max-height:80vh;overflow:auto;font-size:12px;background:var(--paper-1);color:var(--ink);border:1px solid #000;border-radius:6px;box-shadow:0 8px 24px #0009;pointer-events:auto';
  menu.style.zIndex = String(UI_LAYER_Z.auxiliary);
  const close = (): void => {
    menu.remove();
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', keydown, true);
    if (dismissCurrent === close) dismissCurrent = null;
  };
  const outside = (e: PointerEvent): void => {
    if (menu.contains(e.target as Node)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    close();
  };
  const keydown = (e: KeyboardEvent): void => {
    // Un menú abierto captura el teclado del juego, incluido Esc.
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); anchor.focus(); }
  };
  menu.addEventListener('pointerdown', (e) => e.stopPropagation());
  menu.addEventListener('click', (e) => e.stopPropagation());
  menu.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });
  const showLines = (title: string, lines: readonly TipLine[]): void => {
    clear(menu);
    menu.append(h('strong', { text: title }), ...lines.map((line) => h(`div.item-detail-line.${line.kind}` as 'div', { text: line.kind === 'sep' ? '—' : line.kind === 'fact' ? `${line.label}: ${line.value}` : line.text })), button('Volver', showOptions, 'small'), button('Cerrar', close, 'small'));
    place();
  };
  const actionButton = (label: string, action: () => CommandResult | void): HTMLButtonElement => button(label, () => {
    close();
    const result = action();
    if (result && !result.ok) ctx.toast(result.reason, 'warn');
  }, 'small');
  // Monturas con varias variantes de color: una muestra por variante; la elegida queda marcada.
  let currentLook: string | undefined = inst.look;
  const showLooks = (): void => {
    clear(menu);
    const s = ctx.session();
    const def = s.content.items[inst.itemId];
    const active = currentLook ?? def?.mount?.variant;
    const grid = h('div.mount-looks', { role: 'group', 'aria-label': 'Apariencias disponibles' });
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px';
    for (const o of mountLookOptions(def)) {
      const b = button(o.name, () => {
        const r = s.setItemLook?.(inst.uid, o.id);
        if (r && !r.ok) { ctx.toast(r.reason, 'warn'); return; }
        currentLook = o.id;
        showLooks();
      }, 'small');
      b.dataset['look'] = o.id;
      b.setAttribute('aria-pressed', String(o.id === active));
      b.style.cssText = `display:flex;align-items:center;gap:6px;justify-content:flex-start;text-align:left${o.id === active ? ';outline:2px solid var(--gold, #d8a540);outline-offset:-2px' : ''}`;
      const sw = h('span.mount-look-swatch', { 'aria-hidden': 'true' });
      sw.style.cssText = `flex:none;width:22px;height:16px;border-radius:4px;border:1px solid #0008;background:linear-gradient(135deg, ${o.swatch[0]} 0 45%, ${o.swatch[2]} 45% 60%, ${o.swatch[1]} 60% 100%)`;
      b.prepend(sw);
      grid.append(b);
    }
    menu.append(h('strong', { text: 'Cambiar apariencia' }), grid, button('Volver', showOptions, 'small'), button('Cerrar', close, 'small'));
    place();
  };
  const showOptions = (): void => {
    clear(menu);
    const s = ctx.session();
    const def = s.content.items[inst.itemId];
    menu.append(h('strong', { text: def?.name ?? inst.itemId }));
    if (actions.use) menu.append(actionButton(actions.useLabel ?? 'Usar / equipar', actions.use));
    if (actions.sell) menu.append(actionButton('Vender', actions.sell));
    if (actions.deposit) menu.append(actionButton('Depositar pila', actions.deposit));
    if (actions.withdraw) menu.append(actionButton('Retirar pila', actions.withdraw));
    if ((def?.mount?.variants?.length ?? 0) > 1 && s.setItemLook) menu.append(button('Cambiar apariencia', showLooks, 'small'));
    menu.append(button('Información', () => showLines('Información del objeto', itemInformationLines(ctx, inst)), 'small'));
    const set = def?.setId ? s.content.sets[def.setId] : undefined;
    const setButton = button('Conjunto', () => {
      if (!set) return;
      const members = Object.values(s.content.items).filter((item) => item.setId === set.id);
      const lines: TipLine[] = [
        { kind: 'text', text: set.name },
        ...members.map((item): TipLine => ({ kind: 'text', text: `• ${item.name} · nivel ${item.level}` })),
        ...set.bonuses.map((bonus): TipLine => ({ kind: 'text', text: `${bonus.pieces} piezas: ${bonus.modifiers.map(formatModifier).join(', ')}` })),
      ];
      showLines('Conjunto', lines);
    }, 'small');
    setButton.disabled = !set;
    if (!set) setButton.title = 'Este objeto no pertenece a un conjunto registrado';
    menu.append(setButton, button('Recetas', () => showLines('Recetas', [{ kind: 'text', text: 'No hay recetas registradas' }]), 'small'), button('Cerrar', close, 'small'));
    place();
  };
  const place = (): void => {
    const rect = anchor.getBoundingClientRect();
    const box = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(4, Math.min(rect.right + 6, window.innerWidth - box.width - 4))}px`;
    menu.style.top = `${Math.max(4, Math.min(rect.top, window.innerHeight - box.height - 4))}px`;
  };
  ctx.root.append(menu);
  showOptions();
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', keydown, true);
  dismissCurrent = close;
  menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  return close;
}
