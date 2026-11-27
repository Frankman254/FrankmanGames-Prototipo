import { describe, expect, it } from 'vitest';
import { BANDS, equipmentSources, obtainableEquipment, runFiel } from '../../scripts/balance/fiel';
import { buildData, rawData } from '../../scripts/balance/data';

const field = buildData(rawData());
const foe = BANDS[0]![0]!;
const profiles = ['sin_puntos', 'preparado', 'razonable'] as const;
const seeds = [1, 2] as const;

describe('balance fiel', () => {
    it('termina melee con dos semillas y los tres perfiles en menos de 10 segundos', () => {
        const specs = seeds.flatMap((seed) =>
            profiles.map((profile) => ({
                classId: 'ember_vanguard',
                foe,
                count: 1,
                profile,
                skill: 'medio' as const,
                seed,
                limit: 120,
            })),
        );
        const startedAt = Date.now();
        const results = specs.map((spec) => runFiel(field, spec));
        const elapsedMs = Date.now() - startedAt;

        expect(foe.id).toBe('melee');
        expect(elapsedMs).toBeLessThan(10_000);
        for (const result of results) {
            expect(result.win || result.died).toBe(true);
            expect(result.win && result.died).toBe(false);
            for (const value of Object.values(result)) {
                if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
            }
        }
    });

    it('repite el mismo resultado con la misma semilla', () => {
        const spec = {
            classId: 'ember_vanguard',
            foe,
            count: 1,
            profile: 'sin_puntos' as const,
            skill: 'medio' as const,
            seed: seeds[0],
            limit: 120,
        };

        expect(runFiel(field, spec)).toEqual(runFiel(field, spec));
    });

    it('excluye equipo sin fuente de botín o tienda', () => {
        const itemId = 'jl385_equipo_sin_fuente';
        const orphan = { ...field.rpg.items.short_sword!, id: itemId, name: 'Equipo sin fuente' };
        const data = { ...field, rpg: { ...field.rpg, items: { ...field.rpg.items, [itemId]: orphan } } };
        const sources = equipmentSources(data, foe.id, 1);

        expect(sources.get('short_sword')).toContain('tienda:smith');
        expect(sources.has(itemId)).toBe(false);
        expect(obtainableEquipment(data, foe.id, 1).some((item) => item.id === itemId)).toBe(false);
    });
});
