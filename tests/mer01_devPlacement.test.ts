// MER-01 (QA 2026-11-18): el Buhonero de pruebas no lo coloca el mundo por su cuenta (salía también en la
// versión empaquetada y dos veces en desarrollo); solo `placeDevNpc`, que `main.ts` llama en desarrollo.
import { describe, expect, it } from 'vitest';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { withOverworldGameData } from './fixtures/overworld';

describe('MER-01: colocación del Buhonero de pruebas', () => {
    it('el mundo no coloca mercaderes devOnly; placeDevNpc lo pone una sola vez, en suelo libre', () => {
        const data = withOverworldGameData();
        const rng = new Rng(3);
        const w = new World(data, {
            encounter: false,
            character: Character.create(data.rpg, 'ember_vanguard', 'Prueba', rng),
            seed: 3,
        });
        const dev = Object.values(data.rpg.merchants).filter((m) => m.devOnly);
        expect(dev.length).toBeGreaterThan(0);
        for (const m of dev) expect(w.npcs.some((n) => n.npcId === m.id)).toBe(false);
        const buhonero = data.rpg.merchants['dev_buhonero']!;
        w.placeDevNpc('dev_buhonero', 'dev_buhonero', buhonero.position);
        const placed = w.npcs.filter((n) => n.npcId === 'dev_buhonero');
        expect(placed).toHaveLength(1);
        expect(w.grid.walkable(placed[0]!.pos)).toBe(true);
    });
});
