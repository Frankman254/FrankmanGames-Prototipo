import type { ContentDb, ItemInstance } from './contracts';
import { Inventory, ItemFactory } from './items';

function copy(inst: ItemInstance): ItemInstance {
  return {
    ...inst,
    rolled: inst.rolled.map((mod) => ({ ...mod })),
    ...(inst.bonus ? { bonus: inst.bonus.map((mod) => ({ ...mod })) } : {}),
  };
}

/** Almacén ilimitado: sólo transfiere objetos de la mochila, nunca equipo. */
export class BankStorage {
  private readonly stored = new Map<string, ItemInstance>();

  constructor(private readonly content: ContentDb, private readonly factory: ItemFactory) {}

  view(): ItemInstance[] {
    return [...this.stored.values()].map(copy);
  }

  toSave(): ItemInstance[] {
    return this.view();
  }

  restore(raw: readonly ItemInstance[] | undefined): void {
    this.stored.clear();
    for (const inst of Array.isArray(raw) ? raw : []) {
      if (!inst || typeof inst.uid !== 'string' || !inst.uid || this.stored.has(inst.uid)
        || !this.content.items[inst.itemId] || !Number.isSafeInteger(inst.quantity) || inst.quantity <= 0
        || !Array.isArray(inst.rolled) || inst.rolled.some((mod: ItemInstance['rolled'][number]) => !mod || typeof mod.stat !== 'string' || !Number.isFinite(mod.value) || !['flat', 'percent'].includes(mod.op))
        || (inst.bonus !== undefined && (!Array.isArray(inst.bonus) || inst.bonus.some((mod: ItemInstance['rolled'][number]) => !mod || typeof mod.stat !== 'string' || !Number.isFinite(mod.value) || !['flat', 'percent'].includes(mod.op))))) continue;
      const restored = copy(inst);
      this.stored.set(restored.uid, restored);
      this.factory.observe(restored.uid);
    }
  }

  /** Devuelve el número de pilas efectivamente trasladadas. */
  deposit(bag: Inventory, uids: readonly string[]): number {
    let moved = 0;
    for (const uid of new Set(uids)) {
      const inst = bag.find(uid);
      if (!inst || this.stored.has(uid)) continue;
      const removed = bag.remove(uid, inst.quantity);
      if (!removed) continue;
      this.stored.set(uid, removed);
      this.factory.observe(uid);
      moved++;
    }
    return moved;
  }

  /** Retira lo que permite el peso; el resto permanece en el banco. */
  withdraw(bag: Inventory, uids: readonly string[]): { moved: number; blocked: boolean } {
    let moved = 0;
    let blocked = false;
    for (const uid of new Set(uids)) {
      const inst = this.stored.get(uid);
      if (!inst) continue;
      if (bag.find(uid)) {
        blocked = true;
        continue;
      }
      const accepted = bag.capacityFor(inst);
      if (accepted < inst.quantity) blocked = true;
      if (accepted <= 0) continue;
      const empty = bag.slots.findIndex((slot) => slot === null);
      const destination = empty < 0 ? bag.size : empty;
      // No fusionar: cada depósito conserva sus tiradas, bonos e identidad.
      if (accepted === inst.quantity) {
        this.stored.delete(uid);
        bag.restoreAt(destination, inst);
      } else {
        const part = this.factory.split(inst, accepted);
        inst.quantity -= accepted;
        bag.restoreAt(destination, part);
      }
      moved++;
    }
    return { moved, blocked };
  }
}
