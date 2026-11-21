import { describe, it, expect } from 'vitest';
import { CastInput, CAST_MODES } from '../src/sim/castModes';
import { DEFAULT_OPTIONS, loadOptions, MemoryStore, normalizeOptions, saveOptions } from '../src/ui/menus/saveStore';

describe('JL-97: modo de lanzar se guarda y se recupera', () => {
    it('por defecto es pressClick', () => {
        expect(DEFAULT_OPTIONS.castMode).toBe('pressClick');
    });

    describe('ida y vuelta de opciones', () => {
        for (const mode of CAST_MODES) {
            it(`guarda y recupera '${mode}'`, () => {
                const mem = new MemoryStore();
                const opts = { ...DEFAULT_OPTIONS, castMode: mode };
                saveOptions(mem, opts);
                const loaded = loadOptions(mem);
                expect(loaded.castMode).toBe(mode);
            });
        }
    });

    describe('normalizeOptions valida el modo', () => {
        it('acepta los 3 modos válidos', () => {
            for (const mode of CAST_MODES) {
                expect(normalizeOptions({ castMode: mode }).castMode).toBe(mode);
            }
        });

        it('rechaza un modo inválido y vuelve a pressClick', () => {
            expect(normalizeOptions({ castMode: 'inválido' }).castMode).toBe('pressClick');
            expect(normalizeOptions({ castMode: '' }).castMode).toBe('pressClick');
            expect(normalizeOptions({}).castMode).toBe('pressClick');
        });
    });

    describe('CastInput usa el modo cargado', () => {
        it('con indicator: pulsar apunta, soltar lanza', () => {
            const mem = new MemoryStore();
            saveOptions(mem, { ...DEFAULT_OPTIONS, castMode: 'indicator' });
            const loaded = loadOptions(mem);
            const ci = new CastInput(loaded.castMode);
            expect(ci.press(0, true)).toEqual({ kind: 'aim', slot: 0 });
            expect(ci.release(0)).toEqual({ kind: 'cast', slot: 0 });
        });

        it('con press: pulsar lanza en el acto', () => {
            const mem = new MemoryStore();
            saveOptions(mem, { ...DEFAULT_OPTIONS, castMode: 'press' });
            const loaded = loadOptions(mem);
            const ci = new CastInput(loaded.castMode);
            expect(ci.press(0, true)).toEqual({ kind: 'cast', slot: 0 });
        });

        it('con pressClick: pulsar apunta, pulsar de nuevo confirma', () => {
            const mem = new MemoryStore();
            saveOptions(mem, { ...DEFAULT_OPTIONS, castMode: 'pressClick' });
            const loaded = loadOptions(mem);
            const ci = new CastInput(loaded.castMode);
            expect(ci.press(0, true)).toEqual({ kind: 'aim', slot: 0 });
            expect(ci.press(0, true)).toEqual({ kind: 'cast', slot: 0 });
        });
    });

    describe('slotModes no persisten', () => {
        it('los modos por hueco se pierden al recargar las opciones', () => {
            // Simula: el jugador configura modo propio en hueco 3, guarda las opciones y recarga.
            const mem = new MemoryStore();
            saveOptions(mem, { ...DEFAULT_OPTIONS, castMode: 'press' });
            const loaded = loadOptions(mem);
            const ci = new CastInput(loaded.castMode);
            ci.setSlotMode(3, 'indicator');
            expect(ci.effectiveMode(3)).toBe('indicator'); // modo propio activo

            // Recargar opciones no restaura slotModes (viven solo en memoria de CastInput).
            const reloaded = loadOptions(mem);
            const ci2 = new CastInput(reloaded.castMode);
            expect(ci2.effectiveMode(3)).toBe('press'); // vuelve al global
        });
    });

    it('migración de guardado antiguo sin optionsRev: indicator pasa a pressClick', () => {
        const mem = new MemoryStore();
        // Guardado viejo: sin optionsRev, con indicator.
        mem.setItem('frankmangames.options', JSON.stringify({ castMode: 'indicator', uiScale: 1 }));
        const loaded = loadOptions(mem);
        expect(loaded.castMode).toBe('pressClick');
    });

    it('guardado con optionsRev actual respeta indicator', () => {
        const mem = new MemoryStore();
        // Guardado actual: con optionsRev === 2 (vigente), indicator se respeta.
        mem.setItem('frankmangames.options', JSON.stringify({ castMode: 'indicator', uiScale: 1, optionsRev: 2 }));
        const loaded = loadOptions(mem);
        expect(loaded.castMode).toBe('indicator');
    });
});
