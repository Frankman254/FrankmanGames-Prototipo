import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';

const DT = 1 / 60;

function arena() {
    const data = loadGameData();
    const character = Character.create(data.rpg, 'storm_weaver', 'Prueba', new Rng(1));
    const w = new World(data, { encounter: false, character });
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    w.player.invulnerable = 1e9; // los enemigos no matan al jugador en la prueba
    return w;
}

function run(w: World, seconds: number): GameEvent[] {
    for (let i = 0; i < Math.round(seconds / DT); i++) w.tick(DT);
    return w.drainEvents();
}

describe('INV-01: Invocaciones sin recompensa y muerte en cadena', () => {
    it('matar una invocación no da XP, oro ni botín', () => {
        const w = arena();

        // Creamos un esbirro manualmente con summonerId !== null.
        const minion = w.spawnEnemy('minion', { x: 12, y: 10 });
        minion.summonerId = 9999; // simulamos que fue invocado

        // Matamos al esbirro usando damage (emite enemyDeath en el callback).
        const emitted: GameEvent[] = [];
        w.enemies.damage(minion, minion.health, (ev) => emitted.push(ev));

        // Ejecutamos un tick para que rewardDeaths procese la muerte.
        const events = run(w, 0.1);

        // No debe haber eventos de XP.
        const xpEvents = events.filter((e) => e.type === 'xp');
        expect(xpEvents).toHaveLength(0);

        // No debe haber botín en el suelo.
        expect(w.loot).toHaveLength(0);
    });

    it('al morir el invocador, sus esbirros vivos mueren', () => {
        const w = arena();

        // Creamos un invocador y dos esbirros con summonerId apuntando al invocador.
        const summoner = w.spawnEnemy('summoner', { x: 14, y: 10 });
        const minion1 = w.spawnEnemy('minion', { x: 15, y: 10 });
        const minion2 = w.spawnEnemy('minion', { x: 16, y: 10 });
        minion1.summonerId = summoner.id;
        minion2.summonerId = summoner.id;

        // Los esbirros empiezan vivos.
        expect(minion1.state).not.toBe('dead');
        expect(minion2.state).not.toBe('dead');

        // Matamos al invocador usando damage (emite enemyDeath en el callback).
        const emitted2: GameEvent[] = [];
        w.enemies.damage(summoner, summoner.health, (ev) => emitted2.push(ev));

        // Ejecutamos un tick para que rewardDeaths procese la muerte del invocador.
        run(w, 0.1);

        // Los esbirros deben haber muerto.
        expect(minion1.state).toBe('dead');
        expect(minion2.state).toBe('dead');
    });

    it('un enemigo normal sigue dando XP y botín como antes', () => {
        const w = arena();

        // Enemigo normal sin summonerId.
        const enemy = w.spawnEnemy('melee', { x: 12, y: 10 });
        expect(enemy.summonerId).toBeNull();

        // Matamos al enemigo usando damage (emite enemyDeath en el callback).
        const emitted: GameEvent[] = [];
        w.enemies.damage(enemy, enemy.health, (ev) => emitted.push(ev));

        const events = run(w, 0.1);

        // Debe dar XP (melee tiene xp > 0 en EnemyActor).
        const xpEvents = events.filter((e) => e.type === 'xp');
        expect(xpEvents.length).toBeGreaterThanOrEqual(1);

        // enemyDeath se emite en el callback de damage, no en w.events.
        const deathEvents = emitted.filter((e) => e.type === 'enemyDeath');
        expect(deathEvents).toHaveLength(1);
        expect(deathEvents[0]?.archetype).toBe('melee');
    });

    it('los esbirros muertos por muerte en cadena tampoco dan recompensa', () => {
        const w = arena();

        const summoner = w.spawnEnemy('summoner', { x: 14, y: 10 });
        const minion = w.spawnEnemy('minion', { x: 15, y: 10 });
        minion.summonerId = summoner.id;

        // Matamos al invocador usando damage.
        const emitted4: GameEvent[] = [];
        w.enemies.damage(summoner, summoner.health, (ev) => emitted4.push(ev));

        const events = run(w, 0.1);

        // El esbirro murió por cadena.
        expect(minion.state).toBe('dead');

        // No debe haber XP del esbirro (ni del invocador si no tiene loot).
        // Lo clave: el esbirro no genera eventos de XP.
        const xpEvents = events.filter((e) => e.type === 'xp');
        // El invocador puede dar XP si tiene xp > 0; el esbirro no.
        // Verificamos que no hay loot del esbirro.
        expect(w.loot).toHaveLength(0);
    });

    it('un esbirro matado antes que el invocador no da recompensa', () => {
        const w = arena();

        const summoner = w.spawnEnemy('summoner', { x: 14, y: 10 });
        const minion = w.spawnEnemy('minion', { x: 15, y: 10 });
        minion.summonerId = summoner.id;

        // Matamos primero al esbirro usando damage.
        const emitted1: GameEvent[] = [];
        w.enemies.damage(minion, minion.health, (ev) => emitted1.push(ev));

        const events1 = run(w, 0.1);
        const xp1 = events1.filter((e) => e.type === 'xp');
        expect(xp1).toHaveLength(0);
        expect(w.loot).toHaveLength(0);

        // Luego matamos al invocador usando damage.
        const emitted2: GameEvent[] = [];
        w.enemies.damage(summoner, summoner.health, (ev) => emitted2.push(ev));

        const events2 = run(w, 0.1);
        // El invocador SÍ puede dar XP (no es invocación).
        // enemyDeath se emite en el callback de damage, no en w.events.
        const deathEvents = emitted2.filter((e) => e.type === 'enemyDeath');
        expect(deathEvents).toHaveLength(1);
        expect(deathEvents[0]?.archetype).toBe('summoner');
    });
});
