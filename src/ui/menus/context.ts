// Lo que comparten las pantallas y paneles de la interfaz.
import type { GameSessionApi, ItemInstance } from '../../rpg/contracts';
import type { DragController } from './drag';
import { itemTooltip, sourceLabel, type TipLine } from './format';
import type { KeyMap } from './keybindings';
import type { Tooltip } from './tooltip';

export type ToastTone = 'info' | 'loot' | 'gold' | 'level' | 'warn';

export interface UiContext {
  root: HTMLElement;
  /** Sesión en curso. Sólo se llama con partida activa. */
  session(): GameSessionApi;
  tooltip: Tooltip;
  drag: DragController;
  keys: KeyMap;
  toast(text: string, tone?: ToastTone, color?: string): void;
  /** Diálogo de confirmación modal. `input` añade un campo numérico (cantidad). */
  confirm(opts: { title: string; text: string; yes: string; input?: { min: number; max: number; value: number }; onYes: (n: number) => void }): void;
}

/** Busca un objeto por uid en la mochila o el equipo. */
export function findItem(s: GameSessionApi, uid: string): ItemInstance | null {
  for (const it of s.inventory().slots) if (it?.uid === uid) return it;
  for (const it of Object.values(s.equipment())) if (it?.uid === uid) return it;
  return null;
}

export function itemTip(ctx: UiContext, uid: string, equipped: boolean): TipLine[] | null {
  const s = ctx.session();
  const it = findItem(s, uid);
  if (!it) return null;
  return itemTooltip(it, {
    content: s.content,
    equipment: s.equipment(),
    equipped,
    compare: equipped ? [] : s.compareEquip(uid),
    sellValue: s.sellValue(uid),
    playerLevel: s.player().level,
  });
}

export function sourceName(ctx: UiContext, source: string): string {
  const s = ctx.session();
  return sourceLabel(source, s.content, (uid) => findItem(s, uid));
}
