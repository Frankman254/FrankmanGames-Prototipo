// JUG-06 y CLA-COLA (2026-11-24): cola de órdenes. Un hechizo pulsado cuando al jugador le
// faltan `commandQueueWindow` segundos o menos para quedar libre se guarda y sale en cuanto
// puede. Se guarda una sola orden: la última pulsación sustituye a la anterior.
// Antes la ventana contaba desde el principio de la animación y, con GCD de 0,5–0,8 s, la
// pulsación de quien vuelve a pulsar al final de la espera se perdía siempre (JL-185).
import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import type { GameEvent } from '../src/sim/events';

const DT = 1 / 60;
const aim = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });

function run(w: World, seconds: number): GameEvent[] {
    for (let i = 0; i < Math.round(seconds / DT); i++) w.tick(DT);
    return w.drainEvents();
}

function arena(): World {
    const data = loadGameData();
    const character = Character.create(data.rpg, 'storm_weaver', 'Prueba', new Rng(1));
    const w = new World(data, { encounter: false, character });
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    return w;
}

const casts = (ev: GameEvent[]): string[] =>
    ev.filter((x): x is Extract<GameEvent, { type: 'cast' }> => x.type === 'cast').map((x) => x.ability);

describe('JUG-06 / CLA-COLA: cola de órdenes', () => {
    it('pulsar al final del GCD encola y el hechizo sale al acabar', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        e.health = 1e6;
        const spark = w.spell('spark');
        expect(w.commandCast('spark', aim(15, 10, e.id))).toBeNull();
        w.drainEvents();
        run(w, spark.globalCooldown - 0.2);
        expect(w.player.gcd).toBeGreaterThan(0);
        expect(w.commandCast('spark', aim(15, 10, e.id))).toBe('queued');
        w.drainEvents();
        expect(casts(run(w, 0.3))).toEqual(['spark']);
    });

    it('pulsar al principio del GCD no encola', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        const spark = w.spell('spark');
        expect(spark.globalCooldown).toBeGreaterThan(w.data.player.commandQueueWindow);
        w.commandCast('spark', aim(15, 10, e.id));
        expect(w.commandCast('spark', aim(15, 10, e.id))).toBe('gcd');
    });

    it('durante un lanzamiento con tiempo, cuenta lo que falta del lanzamiento y su GCD', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        e.health = 1e6;
        w.player.resource = w.player.maxResource;
        // Venda ligera es el hechizo con tiempo de lanzamiento más cercano; pide subir de nivel.
        w.character.spellbook.level = 99;
        expect(w.character.learnSpell('light_bandage').ok).toBe(true);
        const lento = w.spell('light_bandage');
        expect(lento.castTime).toBeGreaterThan(w.data.player.commandQueueWindow);
        expect(w.commandCast(lento.id, aim(15, 10, e.id))).toBeNull();
        expect(w.player.casting).not.toBeNull();
        expect(w.commandCast('spark', aim(15, 10, e.id))).toBe('busy');
        // Hasta que falte la ventana o menos para quedar libre.
        const libre = lento.castTime + lento.globalCooldown;
        run(w, libre - w.data.player.commandQueueWindow / 2);
        expect(w.commandCast('spark', aim(15, 10, e.id))).toBe('queued');
        expect(casts(run(w, 1))).toContain('spark');
    });

    it('la última pulsación sustituye a la encolada', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        e.health = 1e6;
        w.player.resource = w.player.maxResource;
        w.commandCast('spark', aim(15, 10, e.id));
        w.player.gcd = 0.1;
        expect(w.commandCast('spark', aim(15, 10, e.id))).toBe('queued');
        expect(w.commandCast('frost_nova', aim(15, 10, e.id))).toBe('queued');
        w.drainEvents();
        const salen = casts(run(w, 1));
        expect(salen).toEqual(['frost_nova']);
    });

    it('no encola si el bloqueo no es busy ni gcd', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        w.player.resource = 0;
        expect(w.commandCast('spark', aim(15, 10, e.id))).toBe('resource');
    });

    it('emite castBlocked con reason queued al encolar', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        w.commandCast('spark', aim(15, 10, e.id));
        w.drainEvents();
        w.player.gcd = 0.1;
        expect(w.commandCast('spark', aim(15, 10, e.id))).toBe('queued');
        const blocked = w
            .drainEvents()
            .filter((x): x is Extract<GameEvent, { type: 'castBlocked' }> => x.type === 'castBlocked' && x.reason === 'queued');
        expect(blocked.map((b) => b.ability)).toEqual(['spark']);
    });

    it('con ventana en 0, no encola nada', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        w.data.player.commandQueueWindow = 0;
        w.commandCast('spark', aim(15, 10, e.id));
        w.player.gcd = 0.01;
        expect(w.commandCast('spark', aim(15, 10, e.id))).toBe('gcd');
    });

    it('machacar la tecla no pierde lanzamientos: sale uno por cada GCD', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        e.health = 1e6;
        const spark = w.spell('spark');
        let lanzados = 0;
        const segundos = 6;
        const paso = 0.1;
        for (let t = 0; t < segundos; t += paso) {
            w.player.resource = w.player.maxResource;
            w.commandCast('spark', aim(15, 10, e.id));
            lanzados += casts(run(w, paso)).length;
        }
        // Sin cola real saldría uno cada GCD más el hueco hasta la siguiente pulsación.
        // Con ella, uno por GCD, con una tolerancia de un tick por lanzamiento.
        expect(lanzados).toBeGreaterThanOrEqual(Math.floor(segundos / (spark.globalCooldown + DT)) - 1);
    });
});
