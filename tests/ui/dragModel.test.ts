import { describe, expect, it } from 'vitest';
import { applyDrop, fitsSlot, resolveDrop } from '../../src/ui/menus/dragModel';
import { FakeSession } from '../../src/ui/menus/fake/fakeSession';

const defs: Record<string, { slot: 'weapon' | 'ring' | null }> = { sword: { slot: 'weapon' }, ring: { slot: 'ring' }, potion: { slot: null } };
const def = (uid: string) => defs[uid] ?? null;

describe('modelo de arrastre', () => {
  it('anillos en cualquiera de los dos huecos; el resto en el suyo', () => {
    expect(fitsSlot({ slot: 'ring' }, 'ring1')).toBe(true);
    expect(fitsSlot({ slot: 'ring' }, 'ring2')).toBe(true);
    expect(fitsSlot({ slot: 'ring' }, 'amulet')).toBe(false);
    expect(fitsSlot({ slot: 'weapon' }, 'weapon')).toBe(true);
    expect(fitsSlot({ slot: null }, 'weapon')).toBe(false);
  });

  it('mochila → mochila mueve; al mismo hueco no hace nada', () => {
    expect(resolveDrop({ kind: 'inventory', index: 2, uid: 'sword' }, { kind: 'inventory', index: 5 }, def)).toEqual({ op: 'move', from: 2, to: 5 });
    expect(resolveDrop({ kind: 'inventory', index: 2, uid: 'sword' }, { kind: 'inventory', index: 2 }, def)).toEqual({ op: 'none' });
  });

  it('mochila → equipo sólo si encaja', () => {
    expect(resolveDrop({ kind: 'inventory', index: 0, uid: 'sword' }, { kind: 'equipment', slot: 'weapon' }, def)).toEqual({ op: 'equip', uid: 'sword', slot: 'weapon' });
    expect(resolveDrop({ kind: 'inventory', index: 0, uid: 'sword' }, { kind: 'equipment', slot: 'head' }, def)).toEqual({ op: 'none' });
    expect(resolveDrop({ kind: 'inventory', index: 0, uid: 'potion' }, { kind: 'equipment', slot: 'weapon' }, def)).toEqual({ op: 'none' });
  });

  it('equipo → mochila quita; anillo 1 → anillo 2 intercambia', () => {
    expect(resolveDrop({ kind: 'equipment', slot: 'weapon', uid: 'sword' }, { kind: 'inventory', index: 3 }, def)).toEqual({ op: 'unequip', slot: 'weapon' });
    expect(resolveDrop({ kind: 'equipment', slot: 'ring1', uid: 'ring' }, { kind: 'equipment', slot: 'ring2' }, def)).toEqual({ op: 'swapEquip', from: 'ring1', to: 'ring2' });
    expect(resolveDrop({ kind: 'equipment', slot: 'weapon', uid: 'sword' }, { kind: 'trash' }, def)).toEqual({ op: 'none' });
  });

  it('fuera de los paneles se tira (con confirmación); sobre un panel se cancela', () => {
    expect(resolveDrop({ kind: 'inventory', index: 1, uid: 'potion' }, { kind: 'trash' }, def)).toEqual({ op: 'drop', uid: 'potion' });
    expect(resolveDrop({ kind: 'inventory', index: 1, uid: 'potion' }, { kind: 'none' }, def)).toEqual({ op: 'none' });
  });

  it('libro → barra asigna; barra → barra intercambia; barra → fuera vacía el hueco', () => {
    expect(resolveDrop({ kind: 'spell', spellId: 'spark' }, { kind: 'hotbar', index: 4 }, def)).toEqual({ op: 'assign', index: 4, spellId: 'spark' });
    expect(resolveDrop({ kind: 'spell', spellId: 'spark' }, { kind: 'inventory', index: 0 }, def)).toEqual({ op: 'none' });
    expect(resolveDrop({ kind: 'hotbar', index: 0, spellId: 'spark' }, { kind: 'hotbar', index: 3 }, def)).toEqual({ op: 'swapHotbar', a: 0, b: 3 });
    expect(resolveDrop({ kind: 'hotbar', index: 0, spellId: 'spark' }, { kind: 'trash' }, def)).toEqual({ op: 'assign', index: 0, spellId: null });
  });
});

describe('aplicar arrastres sobre la sesión', () => {
  const fresh = () => FakeSession.create('storm_weaver', 'Prueba', 7, { demo: true });

  it('intercambia dos huecos de la barra', () => {
    const s = fresh();
    const [a, b] = s.spellbook().hotbar;
    expect(applyDrop(s, { op: 'swapHotbar', a: 0, b: 1 }).ok).toBe(true);
    expect(s.spellbook().hotbar.slice(0, 2)).toEqual([b, a]);
  });

  it('intercambia una barra con un hueco vacío', () => {
    const s = fresh();
    s.assignHotbar(5, null);
    const a = s.spellbook().hotbar[0];
    expect(applyDrop(s, { op: 'swapHotbar', a: 0, b: 5 }).ok).toBe(true);
    expect(s.spellbook().hotbar[0]).toBeNull();
    expect(s.spellbook().hotbar[5]).toBe(a);
  });

  it('pasa el anillo de un hueco a otro y viceversa', () => {
    const s = fresh();
    const r1 = s.equipment().ring1!;
    expect(s.equipment().ring2).toBeNull();
    expect(applyDrop(s, { op: 'swapEquip', from: 'ring1', to: 'ring2' }).ok).toBe(true);
    expect(s.equipment().ring1).toBeNull();
    expect(s.equipment().ring2!.uid).toBe(r1.uid);
  });

  it('equipar desde la mochila devuelve lo anterior al mismo hueco de la mochila', () => {
    const s = fresh();
    const inv = s.inventory().slots;
    const idx = inv.findIndex((x) => x?.itemId === 'woodcutter_axe');
    const oldWeapon = s.equipment().weapon!;
    expect(applyDrop(s, { op: 'equip', uid: inv[idx]!.uid, slot: 'weapon' }).ok).toBe(true);
    expect(s.equipment().weapon!.itemId).toBe('woodcutter_axe');
    expect(s.inventory().slots[idx]!.uid).toBe(oldWeapon.uid);
  });
});
