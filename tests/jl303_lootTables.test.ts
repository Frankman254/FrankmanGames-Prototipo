import { describe, expect, it } from 'vitest';
import { rpgRawFiles } from '../src/data';

type LootItemSource = { dropWeight?: number };
type LootTableSource = {
    chance: number;
    rolls: number;
    gold: { chance: number };
    entries: { itemId: string; weight: number }[];
};

const raw = rpgRawFiles();
const items = (raw.items as { items: Record<string, LootItemSource> }).items;
const tables = (raw.loot as { tables: Record<string, LootTableSource> }).tables;

const validProbability = (value: number): boolean => Number.isFinite(value) && value >= 0 && value <= 1;
const validWeight = (value: number | undefined): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0;

describe('JL-303: integridad de las tablas de botín', () => {
    it('cada entrada apunta a un objeto existente', () => {
        const missing = Object.entries(tables).flatMap(([tableId, table]) =>
            table.entries.flatMap((entry, index) =>
                items[entry.itemId] ? [] : [`${tableId}.entries[${index}]: ${entry.itemId}`],
            ),
        );

        expect(Object.keys(tables), 'no se encontraron tablas de botín').not.toHaveLength(0);
        expect(missing).toEqual([]);
    });

    it('las probabilidades por tirada son válidas y suman uno incluyendo el resultado vacío', () => {
        const problems: string[] = [];

        for (const [tableId, table] of Object.entries(tables)) {
            if (!validProbability(table.chance)) problems.push(`${tableId}.chance fuera de 0..1`);
            if (!validProbability(table.gold.chance)) problems.push(`${tableId}.gold.chance fuera de 0..1`);

            const effectiveWeights = table.entries.map((entry, index) => {
                const item = items[entry.itemId];
                if (!validWeight(entry.weight)) problems.push(`${tableId}.entries[${index}].weight no válido`);
                if (!validWeight(item?.dropWeight)) problems.push(`${tableId}.entries[${index}].dropWeight no válido`);
                return validWeight(entry.weight) && validWeight(item?.dropWeight) ? entry.weight * item.dropWeight : 0;
            });
            const totalWeight = effectiveWeights.reduce((sum, weight) => sum + weight, 0);
            const canPickItem = Number.isFinite(totalWeight) && totalWeight > 0;

            if (table.rolls > 0 && table.chance > 0 && !canPickItem)
                problems.push(`${tableId}: tiene probabilidad de botín, pero no hay peso efectivo`);
            if (!Number.isFinite(totalWeight)) problems.push(`${tableId}: peso efectivo total no finito`);

            const itemProbabilities = effectiveWeights.map((weight) =>
                canPickItem && validProbability(table.chance) ? (table.chance * weight) / totalWeight : 0,
            );
            const noItemProbability = canPickItem && validProbability(table.chance) ? 1 - table.chance : 1;
            const outcomes = [...itemProbabilities, noItemProbability];

            for (const probability of outcomes)
                if (!validProbability(probability))
                    problems.push(`${tableId}: probabilidad de resultado fuera de 0..1`);

            const sum = outcomes.reduce((total, probability) => total + probability, 0);
            if (!Number.isFinite(sum) || Math.abs(sum - 1) > 1e-12)
                problems.push(`${tableId}: la suma por tirada es ${sum}, no 1`);
        }

        expect(problems).toEqual([]);
    });
});
