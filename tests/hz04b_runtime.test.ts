// HZ-04b en combate real: los rebotes y el daño extra contra empapados no solo
// están en los datos, el mundo los aplica (antes `ChainEffect` y
// `BonusVsStatusEffect` no hacían nada al lanzar).
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { chainTargets } from '../src/rpg/effects';
import { GameSession } from '../src/rpg/session';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { prepareSpells } from './levels';

const DT = 1 / 60;

function arena(classId: string): World {
    const data = loadGameData();
    const rng = new Rng(1);
    const s = new GameSession(data.rpg, Character.create(data.rpg, classId, 'Prueba', rng), rng);
    const w = new World(data, { encounter: false, character: s.character, seed: 1 });
    s.attach(w);
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    return w;
}

function run(w: World, seconds: number): GameEvent[] {
    const out: GameEvent[] = [];
    for (let i = 0; i < Math.round(seconds / DT); i++) {
        w.tick(DT);
        out.push(...w.drainEvents());
    }
    return out;
}

const aim = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });
const hitIds = (ev: GameEvent[]) =>
    new Set(ev.filter((e): e is Extract<GameEvent, { type: 'damage' }> => e.type === 'damage').map((e) => e.targetId));
const still = (e: { state: string; stateTime: number }) => {
    e.state = 'stagger';
    e.stateTime = -1e9;
};
const ready = (w: World) => {
    w.player.cooldowns = {};
    w.player.gcd = 0;
    w.player.resource = w.player.maxResource;
};

describe('HZ-04b en combate', () => {
    it('chainTargets: el más cercano no alcanzado, dentro del radio y con el estado pedido', () => {
        const mk = (id: number, x: number, soaked: boolean) => ({
            id,
            pos: { x, y: 0 },
            alive: true,
            statuses: { has: (s: string) => soaked && s === 'soaked' },
        });
        const list = [mk(1, 0, true), mk(2, 3, false), mk(3, 4, true), mk(4, 8, true), mk(5, 20, true)];
        const def = { type: 'chain' as const, jumps: 3, radius: 5 };
        expect(chainTargets(def, { x: 0, y: 0 }, new Set([1]), list).map((c) => c.id)).toEqual([2, 3, 4]);
        expect(
            chainTargets({ ...def, onlyStatus: 'soaked' }, { x: 0, y: 0 }, new Set([1]), list).map((c) => c.id),
        ).toEqual([3, 4]);
    });

    it('Aguacero de flechas empapa y Flecha de anguila salta solo entre los empapados', () => {
        const w = arena('mangrove_hunter');
        prepareSpells(w.character, 'arrow_downpour', 'eel_arrow');
        const a = w.spawnEnemy('melee', { x: 18, y: 10 });
        const b = w.spawnEnemy('melee', { x: 20, y: 10 });
        const far = w.spawnEnemy('melee', { x: 18, y: 18 }); // fuera del aguacero (radio 4)
        for (const e of [a, b, far]) {
            still(e);
            e.health = 1e6;
        }
        expect(w.commandCast('arrow_downpour', aim(19, 10))).toBeNull();
        run(w, 1);
        expect(w.enemyActor(a).statuses.has('soaked')).toBe(true);
        expect(w.enemyActor(b).statuses.has('soaked')).toBe(true);
        expect(w.enemyActor(far).statuses.has('soaked')).toBe(false);

        ready(w);
        // `far` (seco) está más cerca de `a` que nada fuera del radio, pero no está empapado: no salta a él.
        far.pos = { x: 18, y: 12 };
        expect(w.commandCast('eel_arrow', aim(18, 10, a.id))).toBeNull();
        const hit = hitIds(run(w, 2));
        expect(hit.has(a.id)).toBe(true);
        expect(hit.has(b.id)).toBe(true);
        expect(hit.has(far.id)).toBe(false);
    });

    it('Chispa de pedernal salta a dos enemigos cercanos (sin estado)', () => {
        const w = arena('ember_vanguard');
        prepareSpells(w.character, 'flint_spark');
        const t = w.spawnEnemy('melee', { x: 11.5, y: 10 });
        const n1 = w.spawnEnemy('melee', { x: 13, y: 10 });
        const n2 = w.spawnEnemy('melee', { x: 15, y: 10 });
        const n3 = w.spawnEnemy('melee', { x: 17, y: 10 });
        for (const e of [t, n1, n2, n3]) {
            still(e);
            e.health = 1e6;
        }
        expect(w.commandCast('flint_spark', aim(11.5, 10, t.id))).toBeNull();
        const hit = hitIds(run(w, 1));
        expect([t, n1, n2].every((e) => hit.has(e.id))).toBe(true);
        expect(hit.has(n3.id)).toBe(false); // solo dos saltos
    });

    it('Urdimbre de marea pega más a un empapado que a uno seco', () => {
        const dmg = (soaked: boolean): number => {
            const w = arena('storm_weaver');
            prepareSpells(w.character, 'warp_tide');
            const e = w.spawnEnemy('melee', { x: 13, y: 10 });
            still(e);
            e.health = 1e6;
            if (soaked)
                w.context(w.character, 'test', e.pos, 0).applyStatus(
                    w.enemyActor(e),
                    w.content.statuses['soaked']!,
                    30,
                );
            expect(w.commandCast('warp_tide', aim(16, 10))).toBeNull();
            return run(w, 1)
                .filter((x): x is Extract<GameEvent, { type: 'damage' }> => x.type === 'damage' && x.targetId === e.id)
                .reduce((sum, x) => sum + x.amount, 0);
        };
        // Misma semilla: la parte de daño normal sale igual; la diferencia es el extra.
        expect(dmg(true)).toBeGreaterThan(dmg(false));
    });
});
