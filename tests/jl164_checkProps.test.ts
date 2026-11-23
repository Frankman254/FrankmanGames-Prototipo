import { describe, it, expect } from 'vitest';
import designedDungeonJson from '../data/dungeons/cripta-tulivieja.json';
import type { DesignedDungeonDef } from '../src/world/designedDungeon';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor } from '../src/world/dungeon';

const DESIGNED_DUNGEON = designedDungeonJson as unknown as DesignedDungeonDef;

describe('JL-164: floor.props en runtime', () => {
    it('JSON raw tiene props en los 5 pisos a mano', () => {
        for (let i = 0; i < 5; i++) {
            const raw = (designedDungeonJson as any).floors[i];
            expect(raw.props, `floor ${i} (${raw.id}) tiene props`).toBeDefined();
            expect(Array.isArray(raw.props), `floor ${i} props es array`).toBe(true);
            expect(raw.props.length, `floor ${i} props no vacío`).toBeGreaterThan(0);
        }
    });

    it('DESIGNED_DUNGEON (cast) tiene props en los 5 pisos a mano', () => {
        for (let i = 0; i < 5; i++) {
            const floor = DESIGNED_DUNGEON.floors[i]!;
            expect(floor.props, `floor ${i} (${floor.id}) tiene props tras cast`).toBeDefined();
            expect(Array.isArray(floor.props), `floor ${i} props es array tras cast`).toBe(true);
            expect(floor.props!.length, `floor ${i} props no vacío tras cast`).toBeGreaterThan(0);
        }
    });

    it('generateHandFloor pasa props al DungeonFloor', () => {
        const data = loadGameData();
        const def = loadDungeon(data);
        for (let i = 0; i < 5; i++) {
            const floor = generateFloor(def, i);
            expect(floor.props.length, `floor ${i} tiene ${floor.props.length} props en DungeonFloor`).toBeGreaterThan(0);
            // Verificar que cada prop tiene piece y pos
            for (const p of floor.props) {
                expect(p.piece).toBeDefined();
                expect(p.pos).toBeDefined();
            }
        }
    });
});
