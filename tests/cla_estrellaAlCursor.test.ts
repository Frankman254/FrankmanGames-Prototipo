import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { World } from '../src/sim/world';
import { openField, FIELD_CENTER } from '../scripts/balance/data';
import { makeSessionAt, DT } from '../scripts/balance/scenarios';

// El creador (2026-11-25): «tiro el hechizo y a veces no hace daño». El parser dejaba
// `atTarget: false` y el daño de la estrella salía alrededor del lanzador, no en el cursor.
const data = openField(loadGameData());

function damageAt(enemyOffset: { x: number; y: number }): number {
    const s = makeSessionAt(data, 'mangrove_hunter', 8, 3);
    const w = new World(data, { encounter: false, character: s.character, seed: 3 });
    s.attach(w);
    w.player.pos = { ...FIELD_CENTER };
    w.player.prevPos = { ...FIELD_CENTER };
    const aim = { x: FIELD_CENTER.x + 7, y: FIELD_CENTER.y };
    const e = w.spawnEnemy('melee', { x: aim.x + enemyOffset.x, y: aim.y + enemyOffset.y });
    expect(w.commandCast('gale_star', { point: aim, targetId: null })).toBeNull();
    let dmg = 0;
    for (let i = 0; i < 10; i++) {
        w.tick(DT);
        for (const ev of w.drainEvents()) if (ev.type === 'damage' && ev.targetId === e.id) dmg += ev.amount;
    }
    return dmg;
}

describe('las estrellas caen en el punto apuntado', () => {
    it('las tres estrellas se leen con atTarget (gale_star, thunder_weave, final_quiver)', () => {
        for (const id of ['gale_star', 'thunder_weave', 'final_quiver'])
            expect(data.rpg.spells[id]!.area).toMatchObject({ type: 'star', atTarget: true });
    });
    it('Estrella de vendaval daña en el centro y en un brazo, a 7 m del cazador', () => {
        expect(damageAt({ x: 0, y: 0 })).toBeGreaterThan(0);
        expect(damageAt({ x: 0, y: 2 })).toBeGreaterThan(0);
    });
});
