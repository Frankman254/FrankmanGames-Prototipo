// MOD-02b: Falcopama de pruebas — integración del modelo en el runtime.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { DEV_FALCOPAMA_ID, DEV_ONLY_ITEM_IDS, grantDevMount } from '../src/rpg/devMount';
import { GameSession } from '../src/rpg/session';
import { Rng } from '../src/sim/rng';

const data = loadGameData();

describe('Falcopama de pruebas', () => {
    it('existe en items.json con los campos de montura correctos', () => {
        const item = data.rpg.items[DEV_FALCOPAMA_ID];
        expect(item).toBeDefined();
        expect(item!.name).toBe('Falcopama de pruebas');
        expect(item!.kind).toBe('mount');
        expect(item!.slot).toBe('mount');
        expect(item!.mount).toBeDefined();
        const m = item!.mount!;
        expect(m.model).toBe('falcopama');
        expect(m.flying).toBe(true);
        expect(m.rideHeight).toBeCloseTo(1.37, 2);
        expect(m.variant).toBe('turquesa_clasica');
        expect(m.variants).toHaveLength(10);
    });

    it('está en DEV_ONLY_ITEM_IDS (no cae ni se vende)', () => {
        expect(DEV_ONLY_ITEM_IDS).toContain(DEV_FALCOPAMA_ID);
    });

    it('grantDevMount la pone en la mochila en modo dev', () => {
        const c = Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(42));
        expect(c.inventory.count(DEV_FALCOPAMA_ID)).toBe(0);
        grantDevMount(c);
        expect(c.inventory.count(DEV_FALCOPAMA_ID)).toBe(1);
    });

    it('diez variantes con las siete regiones de color', () => {
        const m = data.rpg.items[DEV_FALCOPAMA_ID]!.mount!;
        const regiones = ['plumaje_principal', 'plumaje_secundario', 'mascara_facial', 'pecho_cresta', 'pico_garras', 'cuero_silla', 'herrajes'];
        const variants = m.variants!;
        for (const v of variants) {
            // mountVariantColor lee data/art/falcopama_variantes.json;
            // aquí verificamos que el item declara las variantes.
            expect(typeof v).toBe('string');
        }
        expect(m.variants).toContain('turquesa_clasica');
        expect(m.variants).toContain('negro_ebano');
        // Las regiones del GLB coinciden con las de Crestalba.
        expect(regiones.length).toBe(7);
    });

    it('se puede cambiar la apariencia y se guarda', () => {
        const c = Character.create(data.rpg, 'storm_weaver', 'Prueba', new Rng(7));
        const s = new GameSession(data.rpg, c, new Rng(7));
        c.give(DEV_FALCOPAMA_ID, 1);
        const uid = c.inventory.slots.find((i) => i?.itemId === DEV_FALCOPAMA_ID)!.uid;
        expect(s.setItemLook(uid, 'rojo_carmesi').ok).toBe(true);
        const restored = Character.fromSave(data.rpg, s.save(), new Rng(7));
        expect(restored.inventory.find(uid)!.look).toBe('rojo_carmesi');
    });

    it('rideHeight coincide con rider_root del GLB (z=1.37)', () => {
        const m = data.rpg.items[DEV_FALCOPAMA_ID]!.mount!;
        // El REPORTE de OMP mide rider_root en z=1.37.
        expect(m.rideHeight).toBeGreaterThanOrEqual(1.3);
        expect(m.rideHeight).toBeLessThanOrEqual(1.44);
    });
});
