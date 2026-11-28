// HZ-04b, casos límite pedidos por el creador (2026-11-18): rebote cuando el
// primer blanco muere, varios blancos de un hechizo de línea con extra contra
// empapados, rebote en cadena salto a salto y carga real de `selfStack`.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { createEffect } from '../src/rpg/effects';
import { GameSession } from '../src/rpg/session';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { prepareSpells } from './levels';

const DT = 1 / 60;

function arena(classId: string, configure?: (data: ReturnType<typeof loadGameData>) => void): World {
    const data = loadGameData();
    configure?.(data);
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
const damageOn = (ev: GameEvent[], id: number) =>
    ev
        .filter((e): e is Extract<GameEvent, { type: 'damage' }> => e.type === 'damage' && e.targetId === id)
        .reduce((sum, e) => sum + e.amount, 0);
const still = (e: { state: string; stateTime: number }) => {
    e.state = 'stagger';
    e.stateTime = -1e9;
};

describe('HZ-04b: casos límite en combate', () => {
    it('si el primer blanco muere con el golpe, la chispa sigue saltando a sus vecinos', () => {
        const w = arena('ember_vanguard');
        prepareSpells(w.character, 'flint_spark');
        const t = w.spawnEnemy('melee', { x: 11.5, y: 10 });
        const n1 = w.spawnEnemy('melee', { x: 13, y: 10 });
        const n2 = w.spawnEnemy('melee', { x: 15, y: 10 });
        for (const e of [t, n1, n2]) {
            still(e);
            e.health = 1e6;
        }
        t.health = 1;
        expect(w.commandCast('flint_spark', aim(11.5, 10, t.id))).toBeNull();
        const ev = run(w, 1);
        expect(t.state).toBe('dead');
        expect(damageOn(ev, n1.id)).toBeGreaterThan(0);
        expect(damageOn(ev, n2.id)).toBeGreaterThan(0);
    });

    it('el rebote va de blanco en blanco: llega a 8 m del primero con radio 4', () => {
        const w = arena('ember_vanguard');
        prepareSpells(w.character, 'flint_spark');
        const t = w.spawnEnemy('melee', { x: 11.5, y: 10 });
        const n1 = w.spawnEnemy('melee', { x: 15, y: 10 }); // 3.5m from t, within radius 4
        const n2 = w.spawnEnemy('melee', { x: 18.5, y: 10 }); // 3.5m from n1, within radius 4
        for (const e of [t, n1, n2]) {
            still(e);
            e.health = 1e6;
        }
        expect(w.commandCast('flint_spark', aim(11.5, 10, t.id))).toBeNull();
        const ev = run(w, 1);
        expect(damageOn(ev, n2.id)).toBeGreaterThan(0);
    });

    it('Urdimbre de marea (línea) da el extra a cada empapado que cruza, no solo al primero', () => {
        const total = (soaked: boolean): [number, number] => {
            const w = arena('storm_weaver');
            prepareSpells(w.character, 'warp_tide');
            const a = w.spawnEnemy('melee', { x: 12, y: 10 });
            const b = w.spawnEnemy('melee', { x: 14, y: 10 });
            for (const e of [a, b]) {
                still(e);
                e.health = 1e6;
                if (soaked)
                    w.context(w.character, 'test', e.pos, 0).applyStatus(
                        w.enemyActor(e),
                        w.content.statuses['soaked']!,
                        30,
                    );
            }
            expect(w.commandCast('warp_tide', aim(16, 10))).toBeNull();
            const ev = run(w, 1);
            return [damageOn(ev, a.id), damageOn(ev, b.id)];
        };
        const [dryA, dryB] = total(false);
        const [wetA, wetB] = total(true);
        expect(dryA).toBeGreaterThan(0);
        expect(dryB).toBeGreaterThan(0);
        expect(wetA).toBeGreaterThan(dryA);
        expect(wetB).toBeGreaterThan(dryB);
    });

    it('selfStack: respeta el `max` del efecto y acumula stacks con duración', () => {
        // HZ-04b-carga: el efecto respeta `max` del efecto (no el del estado) y
        // cada lanzamiento suma 1 stack durante `duration` s.
        const data = loadGameData();
        const w = arena('ember_vanguard');
        const eff = createEffect({ type: 'selfStack', percent: 10, max: 3, duration: 15 }, data.rpg);
        const ctx = w.context(w.character, 'test', w.player.pos, 0);
        const me = w.character;
        for (let i = 0; i < 6; i++) eff.apply(ctx, me, 1);
        const s = me.statuses.get('selfStack_test');
        expect(s?.stacks).toBe(3); // respetado `max: 3`
        expect(s?.remaining).toBe(15); // duración del efecto
    });

    it('selfStack acumula por hechizo y potencia el siguiente impacto hasta el máximo', () => {
        const w = arena('ember_vanguard', (data) => {
            const spell = data.rpg.spells['fiery_slash']!;
            const damage = spell.effects.find((effect) => effect.type === 'damage');
            if (damage?.type !== 'damage') throw new Error('fiery_slash debe tener daño directo');
            damage.min = 100;
            damage.max = 100;
            damage.scaling = 0;
            spell.critChance = 0;
            spell.critBonus = 0;
        });
        prepareSpells(w.character, 'fiery_slash');
        const target = w.spawnEnemy('melee', { x: 11.5, y: 10 });
        still(target);
        target.health = 1e6;

        const damage: number[] = [];
        const stacks: number[] = [];
        for (let cast = 0; cast < 3; cast++) {
            w.player.cooldowns = {};
            w.player.gcd = 0;
            w.player.resource = w.player.maxResource;
            expect(w.commandCast('fiery_slash', aim(11.5, 10, target.id))).toBeNull();
            damage.push(damageOn(w.drainEvents(), target.id));
            stacks.push(w.character.statuses.get('selfStack_fiery_slash')?.stacks ?? 0);
        }

        expect(damage[1]).toBeGreaterThan(damage[0]!);
        expect(damage[2]).toBeGreaterThan(damage[1]!);
        expect(stacks).toEqual([1, 2, 2]);
    });
});
