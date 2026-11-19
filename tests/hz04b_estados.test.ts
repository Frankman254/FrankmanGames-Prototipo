import { describe, expect, it } from 'vitest';
import { content, hero } from './rpg/helpers.js';
import { StatusSet } from '../src/rpg/status.js';
import { StatSheet } from '../src/rpg/stats.js';

describe('HZ-04b-estados: Congelado y Entumecido', () => {
    const c = content();

    describe('frozen (Congelado)', () => {
        it('existe en los datos con control root y duración 1,5 s', () => {
            const def = c.statuses['frozen'];
            expect(def).toBeDefined();
            expect(def!.name).toBe('Congelado');
            expect(def!.kind).toBe('debuff');
            expect(def!.duration).toBe(1.5);
            expect(def!.maxStacks).toBe(1);
            expect(def!.control).toBe('root');
        });

        it('inmoviliza al objetivo (control root)', () => {
            const def = c.statuses['frozen']!;
            const st = new StatusSet(new StatSheet());
            expect(st.control()).toBeNull();
            st.apply(def);
            expect(st.control()).toBe('root');
        });

        it('caduca a los 1,5 s', () => {
            const def = c.statuses['frozen']!;
            const st = new StatusSet(new StatSheet());
            st.apply(def, { duration: 1.5 });
            expect(st.has('frozen')).toBe(true);
            // Simular 1,5 s de ticks (onTick no-op)
            st.tick(1.5, () => {});
            expect(st.has('frozen')).toBe(false);
        });

        it('no se acumula (maxStacks 1)', () => {
            const def = c.statuses['frozen']!;
            const st = new StatusSet(new StatSheet());
            st.apply(def, { duration: 1.5 });
            const first = st.get('frozen')!;
            st.apply(def, { duration: 1.5 });
            // Debe renovar la duración, no duplicar
            expect(st.get('frozen')!.stacks).toBe(1);
        });
    });

    describe('numb (Entumecido)', () => {
        it('existe en los datos con hinder exhaust y cooldownSlow 0,2', () => {
            const def = c.statuses['numb'];
            expect(def).toBeDefined();
            expect(def!.name).toBe('Entumecido');
            expect(def!.kind).toBe('debuff');
            expect(def!.duration).toBe(4);
            expect(def!.maxStacks).toBe(1);
            expect(def!.hinder).toBeDefined();
            expect(def!.hinder!.family).toBe('exhaust');
            expect(def!.hinder!.cooldownSlow).toBe(0.2);
        });

        it('no es un control (no inmoviliza)', () => {
            const def = c.statuses['numb']!;
            const st = new StatusSet(new StatSheet());
            st.apply(def);
            // Entumecido no inmoviliza — solo ralentiza enfriamientos
            expect(st.control()).toBeNull();
        });

        it('caduca a los 4 s', () => {
            const def = c.statuses['numb']!;
            const st = new StatusSet(new StatSheet());
            st.apply(def, { duration: 4 });
            expect(st.has('numb')).toBe(true);
            st.tick(4, () => {});
            expect(st.has('numb')).toBe(false);
        });

        it('no se acumula (maxStacks 1)', () => {
            const def = c.statuses['numb']!;
            const st = new StatusSet(new StatSheet());
            st.apply(def, { duration: 4 });
            st.apply(def, { duration: 4 });
            expect(st.get('numb')!.stacks).toBe(1);
        });
    });

    describe('i18n', () => {
        it('los nombres en español están en los datos', () => {
            // Los nombres en español viven en statuses.json;
            // en.content.json los traduce para la UI.
            expect(c.statuses['frozen']!.name).toBe('Congelado');
            expect(c.statuses['numb']!.name).toBe('Entumecido');
        });
    });
});
