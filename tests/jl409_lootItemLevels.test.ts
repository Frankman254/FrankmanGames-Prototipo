import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { rpgRawFiles } from '../src/data';

type ItemSource = { level: number };
type EnemySource = { level: number; lootTable: string | null };
type LootTableSource = { entries: { itemId: string }[] };

const raw = rpgRawFiles();
const items = (raw.items as { items: Record<string, ItemSource> }).items;
const enemies = (raw.enemies as { enemies: Record<string, EnemySource> }).enemies;
const tables = (raw.loot as { tables: Record<string, LootTableSource> }).tables;

describe('JL-409: nivel de los objetos de botín', () => {
    it('mantiene identificadas todas las excepciones al margen de ±5', () => {
        const missing: string[] = [];
        const exceptions: string[] = [];

        for (const [enemyId, enemy] of Object.entries(enemies)) {
            if (!enemy.lootTable) continue;

            const table = tables[enemy.lootTable];
            if (!table) {
                missing.push(`${enemyId}: tabla ${enemy.lootTable} inexistente`);
                continue;
            }

            for (const entry of table.entries) {
                const item = items[entry.itemId];
                if (!item) {
                    missing.push(`${enemyId}: objeto ${entry.itemId} inexistente`);
                    continue;
                }

                const delta = item.level - enemy.level;
                if (Math.abs(delta) > 5)
                    exceptions.push([enemyId, enemy.level, enemy.lootTable, entry.itemId, item.level, delta].join('|'));
            }
        }

        const sortedExceptions = exceptions.sort();
        const fingerprint = createHash('sha256').update(sortedExceptions.join('\n')).digest('hex');

        expect(Object.keys(enemies), 'no se encontraron enemigos RPG').not.toHaveLength(0);
        expect(missing).toEqual([]);
        expect(sortedExceptions).toHaveLength(471);
        expect(fingerprint).toBe('6b4efde8d160de897b3d9d0342599ae6650c8cbd2549443c1f1625f1a9fdaa2c');
    });
});
