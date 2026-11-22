// JL-119: el Buhonero de pruebas no existe fuera de `npm run dev`.
// La prueba mer01_devPlacement ya verifica que placeNpcs() saltea los devOnly.
// Esta prueba complementa verificando los datos, el parser y el World completo.
import { describe, expect, it } from 'vitest';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { gameData, withOverworldGameData } from './fixtures/overworld';

describe('JL-119: Buhonero de pruebas solo en desarrollo', () => {
    it('dev_buhonero tiene devOnly=true en los datos parseados', () => {
        const data = gameData();
        const m = data.rpg.merchants['dev_buhonero'];
        expect(m).toBeDefined();
        expect(m!.devOnly).toBe(true);
    });

    it('el NPC dev_buhonero está vinculado al mercader dev_buhonero', () => {
        const data = gameData();
        const npc = data.rpg.npcs['dev_buhonero'];
        expect(npc).toBeDefined();
        expect(npc!.merchantId).toBe('dev_buhonero');
    });

    it('un World recién creado no incluye al Buhonero sin placeDevNpc', () => {
        const data = withOverworldGameData();
        const rng = new Rng(42);
        const w = new World(data, {
            encounter: false,
            character: Character.create(data.rpg, 'ember_vanguard', 'Prueba', rng),
            seed: 42,
        });
        // Ningún NPC del mundo es el buhonero.
        const found = w.npcs.find((n) => n.npcId === 'dev_buhonero');
        expect(found).toBeUndefined();
    });

    it('ningún mercader devOnly aparece en los NPCs de un World sin placeDevNpc', () => {
        const data = withOverworldGameData();
        const devMerchantIds = Object.keys(data.rpg.merchants).filter(
            (id) => data.rpg.merchants[id]!.devOnly === true,
        );
        expect(devMerchantIds.length).toBeGreaterThan(0);

        const rng = new Rng(99);
        const w = new World(data, {
            encounter: false,
            character: Character.create(data.rpg, 'ember_vanguard', 'Prueba', rng),
            seed: 99,
        });
        for (const mid of devMerchantIds) {
            expect(w.npcs.some((n) => n.npcId === mid)).toBe(false);
        }
    });

    it('solo dev_buhonero tiene devOnly entre los mercaderes', () => {
        const data = gameData();
        const devOnlyMerchants = Object.entries(data.rpg.merchants).filter(
            ([, m]) => m.devOnly === true,
        );
        expect(devOnlyMerchants).toHaveLength(1);
        expect(devOnlyMerchants[0]![0]).toBe('dev_buhonero');
    });
});
