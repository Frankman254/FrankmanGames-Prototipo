import { describe, expect, it } from 'vitest';
import {
    BANDS,
    classRoster,
    equipmentSources,
    obtainableEquipment,
    parsePlayerCounts,
    runFiel,
} from '../../scripts/balance/fiel';
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

    it('parsea cantidades de jugadores de 1 a 4 y rechaza listas inválidas', () => {
        expect(parsePlayerCounts('1,2,3,4')).toEqual([1, 2, 3, 4]);
        expect(parsePlayerCounts('4, 2')).toEqual([4, 2]);
        expect(() => parsePlayerCounts('0')).toThrow(/1 a 4/);
        expect(() => parsePlayerCounts('2,2')).toThrow(/repetidos/);
        expect(() => parsePlayerCounts('uno')).toThrow(/1 a 4/);
    });

    it('rota clases distintas en grupos de hasta tres y repite la inicial para cuatro', () => {
        const classes = Object.keys(field.rpg.classes);

        expect(classRoster(classes, 'ember_vanguard', 1)).toEqual(['ember_vanguard']);
        expect(classRoster(classes, 'ember_vanguard', 3)).toEqual([
            'ember_vanguard',
            'storm_weaver',
            'mangrove_hunter',
        ]);
        expect(classRoster(classes, 'mangrove_hunter', 4)).toEqual([
            'mangrove_hunter',
            'ember_vanguard',
            'storm_weaver',
            'mangrove_hunter',
        ]);
    });

    it('simula count 2 con dos bots de clases distintas al nivel del enemigo', () => {
        const result = runFiel(field, {
            classId: 'ember_vanguard',
            foe,
            count: 2,
            players: 2,
            profile: 'sin_puntos',
            skill: 'medio',
            seed: 1,
            limit: 120,
        });

        expect(result.count).toBe(2);
        expect(result.players).toBe(2);
        expect(result.classIds).toEqual(['ember_vanguard', 'storm_weaver']);
        expect(result.level).toBe(field.rpg.enemies[foe.id]!.level);
        expect(result.playerLevels).toEqual([result.level, result.level]);
        expect(result.win || result.died).toBe(true);
        for (const value of Object.values(result)) {
            if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
        }
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
