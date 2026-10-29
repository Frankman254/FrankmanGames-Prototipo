// Modelo de arrastrar y soltar: qué orden de la sesión corresponde a soltar
// algo de un sitio en otro. Puro (sin DOM): la parte visual está en `drag.ts`.
import type { EquipSlot, GameSessionApi, ItemDef } from '../../rpg/contracts';

export type DragSource =
  | { kind: 'inventory'; index: number; uid: string }
  | { kind: 'equipment'; slot: EquipSlot; uid: string }
  | { kind: 'spell'; spellId: string } // desde el libro de hechizos
  | { kind: 'hotbar'; index: number; spellId: string };

export type DropTarget =
  | { kind: 'inventory'; index: number }
  | { kind: 'equipment'; slot: EquipSlot }
  | { kind: 'hotbar'; index: number }
  | { kind: 'shop' } // soltar sobre la tienda abierta = vender
  | { kind: 'trash' } // soltar fuera de todo panel
  | { kind: 'none' }; // soltar sobre un panel que no acepta nada: se cancela

export type DropCommand =
  | { op: 'move'; from: number; to: number }
  | { op: 'equip'; uid: string; slot: EquipSlot }
  | { op: 'unequip'; slot: EquipSlot }
  | { op: 'swapEquip'; from: EquipSlot; to: EquipSlot } // anillo 1 ↔ anillo 2
  | { op: 'assign'; index: number; spellId: string | null }
  | { op: 'swapHotbar'; a: number; b: number }
  | { op: 'drop'; uid: string } // pide confirmación antes de tirar
  | { op: 'sell'; uid: string } // pide cantidad si es una pila
  | { op: 'none' };

/** ¿Puede ir este objeto en este hueco? Los anillos valen para ring1 y ring2. */
export function fitsSlot(def: Pick<ItemDef, 'slot'>, slot: EquipSlot): boolean {
  if (def.slot === 'ring') return slot === 'ring1' || slot === 'ring2';
  return def.slot === slot;
}

/**
 * Traduce un arrastre a una orden. `slotOf` da el hueco de un objeto por uid
 * (null si no es equipable). No consulta el estado: la sesión valida al ejecutar.
 */
export function resolveDrop(
  src: DragSource,
  dst: DropTarget,
  itemDef: (uid: string) => Pick<ItemDef, 'slot'> | null,
): DropCommand {
  switch (src.kind) {
    case 'inventory':
      if (dst.kind === 'inventory') return src.index === dst.index ? { op: 'none' } : { op: 'move', from: src.index, to: dst.index };
      if (dst.kind === 'equipment') {
        const def = itemDef(src.uid);
        return def && fitsSlot(def, dst.slot) ? { op: 'equip', uid: src.uid, slot: dst.slot } : { op: 'none' };
      }
      if (dst.kind === 'trash') return { op: 'drop', uid: src.uid };
      if (dst.kind === 'shop') return { op: 'sell', uid: src.uid };
      return { op: 'none' };
    case 'equipment':
      if (dst.kind === 'inventory') return { op: 'unequip', slot: src.slot };
      if (dst.kind === 'equipment' && dst.slot !== src.slot) {
        const def = itemDef(src.uid);
        return def && fitsSlot(def, dst.slot) ? { op: 'swapEquip', from: src.slot, to: dst.slot } : { op: 'none' };
      }
      return { op: 'none' };
    case 'spell':
      return dst.kind === 'hotbar' ? { op: 'assign', index: dst.index, spellId: src.spellId } : { op: 'none' };
    case 'hotbar':
      if (dst.kind === 'hotbar') return dst.index === src.index ? { op: 'none' } : { op: 'swapHotbar', a: src.index, b: dst.index };
      // Sacar un hechizo de la barra (al libro o fuera) deja el hueco libre.
      if (dst.kind === 'trash' || dst.kind === 'none') return { op: 'assign', index: src.index, spellId: null };
      return { op: 'none' };
  }
}

/** Ejecuta la orden contra la sesión. `drop` no se ejecuta aquí (necesita confirmación). */
export function applyDrop(session: GameSessionApi, cmd: DropCommand): { ok: true } | { ok: false; reason: string } {
  switch (cmd.op) {
    case 'move':
      return session.moveItem(cmd.from, cmd.to);
    case 'equip':
      return session.equip(cmd.uid, cmd.slot);
    case 'unequip':
      return session.unequip(cmd.slot);
    case 'swapEquip': {
      // Con la API actual: quitar el de origen y ponerlo en el destino (el que
      // estuviera en el destino vuelve a la mochila y luego al origen).
      const eq = session.equipment();
      const a = eq[cmd.from];
      const b = eq[cmd.to];
      if (!a) return { ok: false, reason: 'Hueco vacío' };
      const r1 = session.unequip(cmd.from);
      if (!r1.ok) return r1;
      const r2 = session.equip(a.uid, cmd.to);
      if (!r2.ok) return r2;
      return b ? session.equip(b.uid, cmd.from) : { ok: true };
    }
    case 'assign':
      return session.assignHotbar(cmd.index, cmd.spellId);
    case 'swapHotbar': {
      const bar = session.spellbook().hotbar;
      const a = bar[cmd.a] ?? null;
      const b = bar[cmd.b] ?? null;
      if (a === null) return { ok: false, reason: 'Hueco vacío' };
      // assignHotbar ya intercambia si el hechizo estaba en otro hueco; se
      // hace explícito para no depender de esa regla.
      const r = session.assignHotbar(cmd.b, a);
      if (!r.ok) return r;
      if (session.spellbook().hotbar[cmd.a] !== b) return session.assignHotbar(cmd.a, b);
      return { ok: true };
    }
    case 'drop':
    case 'sell':
    case 'none':
      return { ok: true };
  }
}
