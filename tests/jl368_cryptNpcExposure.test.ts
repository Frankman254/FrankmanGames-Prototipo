import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { buildCompendium } from '../src/rpg/compendium';
import { GameSession } from '../src/rpg/session';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { buildMapFrame } from '../src/ui/map/mapFeed';

const data = loadGameData();
const compendium = buildCompendium({
    content: data.rpg,
    archetypes: data.enemies.archetypes,
    zones: data.zones.zones,
});

describe('JL-368: exposición de los PNJ de la cripta', () => {
    it('incluye a Chalo como vendedor en las fichas de sus seis productos', () => {
        const chalo = data.rpg.merchants.crypt_peddler!;

        expect(chalo.crypt).toBe(true);
        expect(chalo.stock).toHaveLength(6);
        for (const offer of chalo.stock) {
            const item = compendium.items.find((candidate) => candidate.id === offer.itemId);
            expect(item?.soldBy, offer.itemId).toContain(chalo.name);
        }
    });

    it('no crea fichas propias para Chalo o Nina ni muestra a Nina como vendedora', () => {
        const chalo = data.rpg.merchants.crypt_peddler!;
        const nina = data.rpg.npcs.crypt_guide!;
        const entries = [...compendium.creatures, ...compendium.items, ...compendium.zones];

        expect(entries.some((entry) => entry.id === 'crypt_peddler' || entry.name === chalo.name)).toBe(false);
        expect(entries.some((entry) => entry.id === nina.id || entry.name === nina.name)).toBe(false);
        expect(compendium.items.flatMap((item) => item.soldBy)).not.toContain(nina.name);
    });

    it('el marco del mapa exterior no recibe a Chalo ni a Nina', () => {
        const zone = { ...data.zone, originX: 0, originY: 0, width: 256, depth: 256 };
        const session = new GameSession(
            data.rpg,
            Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(1)),
            new Rng(1),
        );
        const world = new World({ ...data, zone }, { seed: 1, encounter: false, character: session.character });
        session.attach(world);
        const frame = buildMapFrame({
            world,
            session,
            cameraYawDeg: 0,
            inside: null,
            zones: data.zones,
            waters: [],
            names: { ...data.rpg.merchants, ...data.rpg.npcs },
            stones: [],
            landmarks: [],
        });

        expect(frame.npcs.map((npc) => npc.id)).toContain('crypt_warden');
        expect(frame.npcs.map((npc) => npc.id)).not.toContain('crypt_peddler');
        expect(frame.npcs.map((npc) => npc.id)).not.toContain('crypt_guide');
    });
});
