// EQ-12: Huacas en la interfaz.
// 1. Tooltip de comparación al pasar una huaca sobre un hueco ocupado.
// 2. Que arrastrar una huaca a un hueco concreto funcione.
// 3. Que una huaca repetida dé el aviso en la ventana, no solo en el chat.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { HUACA_SLOTS, type EquipSlot } from '../src/rpg/contracts';
import { slotsFor } from '../src/rpg/items';
import { Rng } from '../src/sim/rng';
import { resolveDrop, applyDrop, type DragSource, type DropTarget } from '../src/ui/menus/dragModel';

const data = loadGameData();
const items = data.rpg.items;
const HUACAS = Object.values(items).filter((d) => d.slot === 'huaca');

/** Cazador de nivel 100 con las huacas en la mochila. */
function hunterWithHuacas(huacaIds?: string[]): Character {
    const ids = huacaIds ?? HUACAS.slice(0, 6).map((h) => h!.id);
    const base = Character.create(data.rpg, 'mangrove_hunter', 'Prueba', new Rng(1));
    const save = base.toSave(new Date(0));
    save.level = 100;
    const c = Character.fromSave(data.rpg, save, new Rng(1));
    for (const id of ids) c.give(id, 1);
    return c;
}

describe('EQ-12: Huacas en la interfaz', () => {
    describe('tooltip de comparación', () => {
        it('compareEquip devuelve las diferencias de stats al cambiar una huaca por otra', () => {
            const c = hunterWithHuacas();
            const [a, b] = HUACAS;
            // Equipa la primera.
            const instA = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            expect(c.equip(instA.uid, 'huaca1')).toEqual({ ok: true });
            // Compara con la segunda (en la mochila).
            const instB = c.inventory.slots.find((s) => s?.itemId === b!.id)!;
            const deltas = c.compareEquip(instB.uid, 'huaca1');
            // Las huacas tienen stats distintos; debe haber al menos una diferencia.
            expect(deltas.length).toBeGreaterThan(0);
            // Cada delta tiene before y after distintos.
            for (const d of deltas) {
                expect(Math.abs(d.after - d.before)).toBeGreaterThan(1e-9);
            }
        });

        it('compareEquip con la misma huaca no devuelve diferencias', () => {
            const c = hunterWithHuacas();
            const [a] = HUACAS;
            const instA = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            expect(c.equip(instA.uid, 'huaca1')).toEqual({ ok: true });
            // Ya no está en la mochila; compareEquip con un uid que no existe devuelve [].
            const deltas = c.compareEquip(instA.uid, 'huaca1');
            expect(deltas).toEqual([]);
        });
    });

    describe('arrastrar a hueco específico', () => {
        it('resolveDrop: inventario → huacaN devuelve equip con el slot correcto', () => {
            const c = hunterWithHuacas();
            const [a] = HUACAS;
            const instA = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            const src: DragSource = { kind: 'inventory', index: 0, uid: instA.uid };
            const dst: DropTarget = { kind: 'equipment', slot: 'huaca3' };
            const cmd = resolveDrop(src, dst, (uid) => {
                const it = c.inventory.slots.find((s) => s?.uid === uid);
                return it ? items[it.itemId] ?? null : null;
            });
            expect(cmd).toEqual({ op: 'equip', uid: instA.uid, slot: 'huaca3' });
        });

        it('applyDrop equip a huaca3 coloca la huaca en el hueco correcto', () => {
            const c = hunterWithHuacas();
            const [a] = HUACAS;
            const instA = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            // Simular la sesión mínima que necesita applyDrop.
            const session: any = {
                moveItem: () => ({ ok: true }),
                equip: (uid: string, slot?: EquipSlot) => c.equip(uid, slot),
                unequip: (slot: EquipSlot) => c.unequip(slot),
                spellbook: () => ({ hotbar: [] }),
                assignHotbar: () => ({ ok: true }),
                equipment: () => c.equipment.slots,
            };
            const cmd = { op: 'equip' as const, uid: instA.uid, slot: 'huaca3' as EquipSlot };
            const r = applyDrop(session, cmd);
            expect(r).toEqual({ ok: true });
            expect(c.equipment.slots.huaca3?.itemId).toBe(a!.id);
        });

        it('resolveDrop: equipo huaca1 → inventario devuelve unequip', () => {
            const c = hunterWithHuacas();
            const [a] = HUACAS;
            const instA = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            c.equip(instA.uid, 'huaca1');
            const src: DragSource = { kind: 'equipment', slot: 'huaca1', uid: instA.uid };
            const dst: DropTarget = { kind: 'inventory', index: 0 };
            const cmd = resolveDrop(src, dst, () => null);
            expect(cmd).toEqual({ op: 'unequip', slot: 'huaca1' });
        });

        it('resolveDrop: equipo huaca1 → huaca2 devuelve swapEquip', () => {
            const c = hunterWithHuacas();
            const [a, b] = HUACAS;
            const instA = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            const instB = c.inventory.slots.find((s) => s?.itemId === b!.id)!;
            c.equip(instA.uid, 'huaca1');
            c.equip(instB.uid, 'huaca2');
            const src: DragSource = { kind: 'equipment', slot: 'huaca1', uid: instA.uid };
            const dst: DropTarget = { kind: 'equipment', slot: 'huaca2' };
            const cmd = resolveDrop(src, dst, (uid) => {
                const eq = c.equipment.slots;
                const it = eq.huaca1?.uid === uid ? eq.huaca1 : eq.huaca2;
                return it ? items[it.itemId] ?? null : null;
            });
            expect(cmd).toEqual({ op: 'swapEquip', from: 'huaca1', to: 'huaca2' });
        });

        it('cada huaca vale para los 6 slots, no para otros', () => {
            for (const def of HUACAS) {
                const slots = slotsFor(def);
                expect(slots).toEqual([...HUACA_SLOTS]);
                // No vale en weapon, head, etc.
                expect(slots).not.toContain('weapon');
                expect(slots).not.toContain('head');
            }
        });
    });

    describe('aviso de huaca repetida', () => {
        it('equipar la misma huaca en otro slot devuelve el mensaje de error (con dos copias)', () => {
            const c = hunterWithHuacas();
            const [a] = HUACAS;
            // Dar dos copias de la misma huaca.
            c.give(a!.id, 1);
            const instA1 = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            expect(c.equip(instA1.uid, 'huaca1' as EquipSlot)).toEqual({ ok: true });
            // Intentar poner la segunda copia en huaca2.
            const instA2 = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            const r = c.equip(instA2.uid, 'huaca2' as EquipSlot);
            if (!r.ok) expect(r.reason).toBe('Esa huaca ya la llevas puesta');
            else throw new Error('debería fallar');
        });

        it('canEquip rechaza la misma huaca en slot distinto', () => {
            const c = hunterWithHuacas();
            const [a] = HUACAS;
            const instA = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            c.equip(instA.uid, 'huaca1' as EquipSlot);
            // La misma huaca ya no está en la mochila, pero canEquip con el def sí detecta.
            const r = c.canEquip(a!, 'huaca3' as EquipSlot);
            if (!r.ok) expect(r.reason).toBe('Esa huaca ya la llevas puesta');
            else throw new Error('debería fallar');
        });

        it('cambiar la misma huaca en su propio slot sí vale', () => {
            const c = hunterWithHuacas();
            const [a] = HUACAS;
            const instA = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            c.equip(instA.uid, 'huaca1');
            // Desequipar y volver a equipar en el mismo slot.
            c.unequip('huaca1');
            const instA2 = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            const r = c.equip(instA2.uid, 'huaca1');
            expect(r).toEqual({ ok: true });
        });

        it('dos huacas distintas sí se pueden equipar juntas', () => {
            const c = hunterWithHuacas();
            const [a, b] = HUACAS;
            const instA = c.inventory.slots.find((s) => s?.itemId === a!.id)!;
            const instB = c.inventory.slots.find((s) => s?.itemId === b!.id)!;
            expect(c.equip(instA.uid, 'huaca1')).toEqual({ ok: true });
            expect(c.equip(instB.uid, 'huaca2')).toEqual({ ok: true });
            expect(c.equipment.slots.huaca1?.itemId).toBe(a!.id);
            expect(c.equipment.slots.huaca2?.itemId).toBe(b!.id);
        });
    });
});
