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

/** Arena con la Tejedora (tiene hechizos con castTime > 0). */
function arena(): World {
    const data = loadGameData();
    const character = Character.create(data.rpg, 'storm_weaver', 'Prueba', new Rng(1));
    const w = new World(data, { encounter: false, character });
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    return w;
}

describe('JUG-06: Cola de órdenes', () => {
    it('encola un hechizo instantáneo pulsado durante GCD', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        // spark es instantáneo con GCD.
        const spark = w.spell('spark');
        expect(w.commandCast('spark', aim(15, 10, e.id))).toBeNull();
        expect(w.player.gcd).toBeGreaterThan(0);
        w.drainEvents(); // limpiar el cast del primero.

        // Segundo spark durante GCD → encolado.
        const block2 = w.commandCast('spark', aim(15, 10, e.id));
        expect(block2).toBe('queued');
        w.drainEvents(); // limpiar el castBlocked queued.

        // Esperar a que termine el GCD y se desencolde.
        const ev = run(w, spark.globalCooldown + 0.1);

        // El segundo spark debería haberse lanzado.
        const casts = ev.filter((x) => x.type === 'cast');
        expect(casts.length).toBeGreaterThanOrEqual(1);
    });

    it('encola durante casting con castTime > 0', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        // Se necesita un hechizo con castTime > 0. La Tejedora tiene 'searing_mark' con castTime.
        const spell = w.spell('searing_mark');
        if (spell.castTime <= 0) {
            // Si no tiene castTime, saltar.
            return;
        }
        expect(w.commandCast('searing_mark', aim(15, 10, e.id))).toBeNull();
        expect(w.player.casting).not.toBeNull();

        // Intentar spark mientras está casting → encolado.
        const block = w.commandCast('spark', aim(15, 10, e.id));
        expect(block).toBe('queued');

        // Esperar a que termine el casting + GCD.
        run(w, spell.castTime + spell.globalCooldown + 0.2);
        const ev = w.drainEvents();
        const casts = ev.filter((x) => x.type === 'cast');
        const abilities = casts.map((x) => x.ability);
        expect(abilities).toContain('searing_mark');
        expect(abilities).toContain('spark');
    });

    it('no encola si la ventana expiró', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        const spell = w.spell('searing_mark');
        if (spell.castTime <= 0) return;
        w.commandCast('searing_mark', aim(15, 10, e.id));
        // Avanzar más allá de la ventana de 0.3s.
        run(w, 0.35);
        const block = w.commandCast('spark', aim(15, 10, e.id));
        expect(block).toBe('busy');
    });

    it('no encola si la cola ya tiene 4 elementos', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        const spell = w.spell('searing_mark');
        if (spell.castTime <= 0) return;
        w.commandCast('searing_mark', aim(15, 10, e.id));
        for (let i = 0; i < 4; i++) {
            const block = w.commandCast('spark', aim(15, 10, e.id));
            expect(block).toBe('queued');
        }
        const block5 = w.commandCast('spark', aim(15, 10, e.id));
        expect(block5).toBe('busy');
    });

    it('no encola si el bloqueo no es busy ni gcd', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        w.player.resource = 0;
        const block = w.commandCast('spark', aim(15, 10, e.id));
        expect(block).toBe('resource');
    });

    it('emite castBlocked con reason queued al encolar', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        w.commandCast('spark', aim(15, 10, e.id));
        w.drainEvents(); // limpiar el cast del primero.
        const ev2 = w.commandCast('spark', aim(15, 10, e.id));
        expect(ev2).toBe('queued');
        const blocked = w.drainEvents().filter((x): x is Extract<typeof x, { type: 'castBlocked' }> => x.type === 'castBlocked' && x.reason === 'queued');
        expect(blocked.length).toBe(1);
        expect(blocked[0]!.ability).toBe('spark');
    });

    it('con ventana en 0, no encola nada', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        // Desactivar la cola.
        w.data.player.commandQueueWindow = 0;
        w.commandCast('spark', aim(15, 10, e.id));
        const block = w.commandCast('spark', aim(15, 10, e.id));
        expect(block).toBe('gcd');
    });

    it('desencola varios hechizos en cadena', () => {
        const w = arena();
        const e = w.spawnEnemy('melee', { x: 15, y: 10 });
        e.health = 1e6; // inmortal para que no muera al primer spark
        const spark = w.spell('spark');
        w.player.resource = w.player.maxResource; // asegurar recurso
        // Lanzar el primero.
        w.commandCast('spark', aim(15, 10, e.id));
        w.drainEvents();
        // Encolar dos más.
        w.commandCast('spark', aim(15, 10, e.id));
        w.commandCast('spark', aim(15, 10, e.id));
        w.drainEvents(); // limpiar los queued.
        // Esperar a que se procesen los dos encolados (cada GCD = 0.8s).
        const ev = run(w, spark.globalCooldown * 3 + 0.3);
        // run() ya devuelve los eventos drenados.
        const casts = ev.filter((x) => x.type === 'cast');
        expect(casts.length).toBeGreaterThanOrEqual(2);
    });
});
