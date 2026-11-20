// Creador (2026-11-20): «cuando pego con un hechizo en área (...) deberia ser un solo dado para
// el propio hechizo y replicar el efecto a los enemigos en el área». Un lanzamiento de área es
// crítico para todos sus blancos o para ninguno.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import type { GameEvent } from '../../src/sim/events';
import { Character } from '../../src/rpg/character';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { prepareSpells } from '../levels';

const DT = 1 / 60;
const data = loadGameData();

function castWhirl(seed: number): boolean[] {
    const rng = new Rng(seed);
    const s = new GameSession(data.rpg, Character.create(data.rpg, 'ember_vanguard', `S${seed}`, rng), rng);
    const w = new World(data, { encounter: false, character: s.character, seed });
    s.attach(w);
    prepareSpells(s.character, 'ember_whirl');
    w.player.pos = { x: 30, y: 30 };
    w.player.prevPos = { x: 30, y: 30 };
    for (const [x, y] of [
        [31.5, 30],
        [28.5, 30],
        [30, 31.5],
    ] as const) {
        const e = w.spawnEnemy('melee', { x, y });
        e.state = 'stagger';
        e.stateTime = -1e9;
        e.health = 1e6;
    }
    expect(w.commandCast('ember_whirl', { point: { x: 30, y: 30 }, targetId: null })).toBeNull();
    for (let i = 0; i < 90; i++) w.tick(DT);
    const hits = w
        .drainEvents()
        .filter(
            (ev): ev is Extract<GameEvent, { type: 'damage' }> =>
                ev.type === 'damage' && ev.ability === 'ember_whirl' && !ev.toPlayer,
        );
    expect(new Set(hits.map((h) => h.targetId)).size).toBe(3);
    return hits.map((h) => h.crit);
}

describe('crítico de área: un dado por lanzamiento', () => {
    it('los tres enemigos del área comparten el veredicto, y hay lanzamientos de los dos tipos', () => {
        let crits = 0;
        let plain = 0;
        for (let seed = 1; seed <= 40 && (crits === 0 || plain === 0); seed++) {
            const c = castWhirl(seed);
            expect(new Set(c).size, `semilla ${seed}: ${c}`).toBe(1);
            if (c[0]) crits++;
            else plain++;
        }
        expect(crits).toBeGreaterThan(0);
        expect(plain).toBeGreaterThan(0);
    });
});

// Creador (2026-11-20): «cada rango debe ir aumentando el área de efecto y su daño».
describe('las áreas crecen con el rango', () => {
    it('todo hechizo de área sube tamaño y daño con cada rango', async () => {
        const { compileSpell } = await import('../../src/rpg/spells');
        for (const def of Object.values(data.rpg.spells)) {
            if (def.area.type === 'self' || def.area.type === 'single') continue;
            expect(def.perRank.areaPercent ?? 0, def.id).toBeGreaterThan(0);
            const r1 = compileSpell(data.rpg, def, 1);
            const top = compileSpell(data.rpg, def, def.maxRank);
            if (def.maxRank > 1) {
                expect(JSON.stringify(top.area), def.id).not.toBe(JSON.stringify(r1.area));
                expect(top.power, def.id).toBeGreaterThan(r1.power);
            }
        }
    });
});
