import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { CRYPT_WARDEN_NPC, entranceExit } from '../src/world/dungeon';

// Creador (2026-11-25): «para entrar solo debe poderse al hablar con berto y este debe estar en
// frente de la puerta de la mazmorra» y «berto debe estar en la propia puerta de la mazmorra».
describe('Berto Candado delante de la reja', () => {
    const data = loadGameData();
    const def = loadDungeon(data);

    it('el portero es el PNJ de la cripta', () => {
        expect(data.rpg.npcs[CRYPT_WARDEN_NPC]?.name).toBe('Berto Candado');
    });

    it('está en la reja: a menos de 3 m de ella y de su salida', () => {
        const p = data.rpg.npcs[CRYPT_WARDEN_NPC]!.position;
        const exit = entranceExit(def);
        expect(Math.hypot(p.x - exit.x, p.y - exit.y)).toBeLessThan(3);
        expect(Math.hypot(p.x - def.entrance.x, p.y - def.entrance.y)).toBeLessThan(3);
    });
});
