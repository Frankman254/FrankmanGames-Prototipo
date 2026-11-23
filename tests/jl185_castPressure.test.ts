import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import type { GameEvent } from '../src/sim/events';
import type { CastBlock } from '../src/sim/combat';

import type { Aim } from '../src/sim/world';

const DT = 1 / 60;
const aim = (x: number, y: number, targetId: number | null = null): Aim => ({ point: { x, y }, targetId });

/**
 * JL-185: medir pulsaciones perdidas en una pelea simulada.
 *
 * Un bot pulsa los slots 0-3 (los 4 primeros hechizos de la barra) cada 0.35 s
 * durante 60 s simulados, contra un muñeco inmortal.
 * Se mide con cada clase a nivel 1 y 50.
 *
 * No cambia cifras ni reglas: solo cuenta y reporta.
 */

function run(w: World, seconds: number): GameEvent[] {
    for (let i = 0; i < Math.round(seconds / DT); i++) w.tick(DT);
    return w.drainEvents();
}

interface PressureResult {
    classId: string;
    level: number;
    totalPresses: number;
    casts: number;
    queued: number;
    blocks: Record<string, number>;
    lostPercent: number;
}

function castPressure(classId: string, level: number): PressureResult {
    const data = loadGameData();
    const character = Character.create(data.rpg, classId, 'Prueba', new Rng(42));
    // Subir al nivel deseado usando gainXp (recalcula stats y aprende hechizos).
    if (level > 1) {
        character.gainXp(50000 * level); // XP suficiente para llegar al nivel.
    }

    const w = new World(data, { encounter: false, character });
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    // Muñeco inmortal a 10 m.
    const e = w.spawnEnemy('melee', { x: 20, y: 10 });
    e.health = 1e9;

    // Asegurar recurso máximo para que no falte.
    w.player.resource = w.player.maxResource;

    const blocks: Record<string, number> = {};
    let casts = 0;
    let queued = 0;
    let totalPresses = 0;
    const duration = 60;
    const interval = 0.35;
    const slots: number[] = [0, 1, 2, 3]; // 4 primeros hechizos de la barra

    // Simular: pulsar slot 0, 1, 2, 3 en ciclo cada 0.35s.
    let slotIndex = 0;
    for (let t = 0; t < duration; t += interval) {
        const slot = slots[slotIndex % slots.length]!;
        totalPresses++;
        const block = w.commandCastSlot(slot, { point: { x: 20, y: 10 }, targetId: e.id ?? null });
        if (block === null) {
            // Lanzamiento exitoso (o approachToCast, que devuelve null).
            casts++;
        } else if (block === 'queued') {
            queued++;
        } else {
            blocks[block] = (blocks[block] ?? 0) + 1;
        }
        w.drainEvents(); // limpiar eventos para no acumular.

        // Avanzar la simulación el intervalo.
        for (let i = 0; i < Math.round(interval / DT); i++) {
            w.tick(DT);
        }
        w.drainEvents();
        // Restaurar recurso si se agotó (el bot tiene maná infinito para medir solo GCD).
        if (w.player.resource < w.player.maxResource * 0.3) {
            w.player.resource = w.player.maxResource;
        }
    }

    // Drenar eventos finales.
    w.drainEvents();

    const lost = totalPresses - casts;
    const lostPercent = totalPresses > 0 ? (lost / totalPresses) * 100 : 0;

    return {
        classId,
        level,
        totalPresses,
        casts,
        queued,
        blocks,
        lostPercent,
    };
}

describe('JL-185: Pulsaciones perdidas en una pelea (solo mide)', () => {
    const classes = ['ember_vanguard', 'storm_weaver', 'mangrove_hunter'];
    const levels = [1, 50];

    for (const classId of classes) {
        for (const level of levels) {
            it(`${classId} nivel ${level}: proporción de pulsaciones perdidas`, () => {
                const r = castPressure(classId, level);
                console.log(
                    `${classId} L${level}: ${r.casts}/${r.totalPresses} lanzados (${(100 - r.lostPercent).toFixed(1)}%), ` +
                    `${r.lostPercent.toFixed(1)}% perdidas (gcd:${r.blocks['gcd'] ?? 0}, cooldown:${r.blocks['cooldown'] ?? 0}, ` +
                    `resource:${r.blocks['resource'] ?? 0}, queued:${r.queued})`,
                );
                expect(r.totalPresses).toBeGreaterThan(0);
                // Con GCD 0.5-0.8s y pulsación cada 0.35s, se pierden muchas.
                expect(r.lostPercent).toBeGreaterThan(0);
            });
        }
    }

    it('resumen: las pulsaciones perdidas son significativas en todos los casos', () => {
        const results: PressureResult[] = [];
        for (const classId of classes) {
            for (const level of levels) {
                results.push(castPressure(classId, level));
            }
        }
        // Con GCD 0.5-0.8s y pulsación cada 0.35s, se pierden muchas pulsaciones.
        // La proporción perdida es siempre significativa (>50%).
        for (const r of results) {
            expect(r.lostPercent).toBeGreaterThan(50);
        }
        // Los bloques totales (gcd + cooldown + otros) son la mayoría de las pulsaciones.
        for (const r of results) {
            const totalBlocks = Object.values(r.blocks).reduce((a, b) => a + b, 0);
            expect(totalBlocks + r.queued).toBeGreaterThan(r.casts);
        }
    });
});
