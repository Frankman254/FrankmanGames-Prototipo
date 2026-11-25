import { describe, expect, it } from 'vitest';
import { damageMeterAbilityRows } from '../../src/ui/dev/damageMeterLogic';

describe('damageMeterAbilityRows', () => {
    it('preserves the report order and calculates rounded damage percentages', () => {
        const abilities = [
            { ability: 'first', total: 33, hits: 2, crits: 0, max: 20 },
            { ability: 'second', total: 67, hits: 3, crits: 1, max: 30 },
        ];

        expect(damageMeterAbilityRows(abilities, 100)).toEqual([
            { ...abilities[0], percentage: 33 },
            { ...abilities[1], percentage: 67 },
        ]);
    });

    it('rounds each percentage to the nearest integer', () => {
        const abilities = [
            { ability: 'third', total: 1, hits: 1, crits: 0, max: 1 },
            { ability: 'two thirds', total: 2, hits: 1, crits: 0, max: 2 },
        ];

        expect(damageMeterAbilityRows(abilities, 3).map((row) => row.percentage)).toEqual([33, 67]);
    });

    it('uses one as the denominator when total damage is zero', () => {
        const abilities = [{ ability: 'zero', total: 0, hits: 0, crits: 0, max: 0 }];

        expect(damageMeterAbilityRows(abilities, 0)[0]?.percentage).toBe(0);
    });
});
