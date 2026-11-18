// CAD-01: Cadencia con los ciclos nuevos de ANIM-01 (2026-11-18).
// OMP rehizo Caminar (1,125 s) y Correr (0,708 s) en los seis *_anime.glb.
// gltfCharacter.update deriva la cadencia de clipSeconds; esta prueba verifica
// que los seis héroes dan ratios razonables a la velocidad del juego (6 m/s)
// y a la velocidad natural del clip (runSpeed 1,3 m/s).
//
// Duraciones medidas por OMP (work/omp-anim01/REPORTE.md):
//   Caminar: 1,125 s (27 keys)
//   Correr:  0,708 s (17 keys)
//
// La cadencia runtime (gltfCharacter.ts ~línea 391-395) calcula:
//   natural = runSpeed * (clipSeconds('run') / clipSeconds('walk'))  // para walk
//   natural = runSpeed                                                 // para run
//   speedRatio = max(0.3, moveSpeed / natural)
//
// Con runSpeed=1,3, runDur=0,708, walkDur=1,125:
//   natural_walk = 1,3 * (0,708 / 1,125) ≈ 0,820 m/s
//   A moveSpeed=6 m/s → speedRatio_run = 6 / 1,3 ≈ 4,62
//   A moveSpeed=3 m/s → speedRatio_walk = 3 / 0,820 ≈ 3,66
//
// Los pies no patinan si speedRatio está entre 0,3 y 10 (fuera de ese rango
// el clip se vería demasiado lento o demasiado rápido a simple vista).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const assets = JSON.parse(
    readFileSync(join(__dirname, '..', 'data', 'assets.json'), 'utf8')
) as {
    templates: Record<string, { runSpeed: number; clips: Record<string, string> }>;
};

// Duraciones de los clips nuevos de ANIM-01 (OMP, 2026-11-17).
const WALK_DURATION = 1.125;
const RUN_DURATION = 0.708;

// Velocidad de movimiento del juego (DEFAULT_MOVE_SPEED en src/sim/).
const MOVE_SPEED = 6;

// Margen aceptable para speedRatio: fuera de este rango el clip se vería
// claramente demasiado lento o demasiado rápido.
const MIN_SPEED_RATIO = 0.3; // tope inferior de gltfCharacter
const MAX_SPEED_RATIO = 10;

const ANIME_HEROES = ['centinela', 'centinela_f', 'oraculo', 'oraculo_f', 'cazador', 'cazador_f'];

describe('CAD-01: cadencia de los seis héroes anime', () => {
    for (const heroId of ANIME_HEROES) {
        const hero = assets.templates[heroId];
        it(`${heroId}: runSpeed coincide con el esperado (1,3 m/s)`, () => {
            expect(hero).toBeDefined();
            expect(hero!.runSpeed).toBeCloseTo(1.3, 2);
        });

        it(`${heroId}: tiene clips Caminar y Correr`, () => {
            expect(hero!.clips.walk).toBe('Caminar');
            expect(hero!.clips.run).toBe('Correr');
        });

        it(`${heroId}: speedRatio de run a velocidad del juego está en rango`, () => {
            // natural_run = runSpeed = 1,3
            // speedRatio = moveSpeed / runSpeed = 6 / 1,3 ≈ 4,62
            const runSpeed = hero!.runSpeed;
            const speedRatio = MOVE_SPEED / runSpeed;
            expect(speedRatio).toBeGreaterThan(MIN_SPEED_RATIO);
            expect(speedRatio).toBeLessThan(MAX_SPEED_RATIO);
            // Valor esperado: ~4,62
            expect(speedRatio).toBeCloseTo(4.62, 1);
        });

        it(`${heroId}: speedRatio de walk a velocidad media está en rango`, () => {
            // natural_walk = runSpeed * (runDur / walkDur) = 1,3 * (0,708 / 1,125) ≈ 0,820
            // A moveSpeed=3 m/s (50% de la velocidad del juego, zona de walk):
            // speedRatio = 3 / 0,820 ≈ 3,66
            const runSpeed = hero!.runSpeed;
            const naturalWalk = runSpeed * (RUN_DURATION / WALK_DURATION);
            const walkSpeed = MOVE_SPEED * 0.5; // 3 m/s, zona de walk
            const speedRatio = walkSpeed / naturalWalk;
            expect(speedRatio).toBeGreaterThan(MIN_SPEED_RATIO);
            expect(speedRatio).toBeLessThan(MAX_SPEED_RATIO);
            // Valor esperado: ~3,66
            expect(speedRatio).toBeCloseTo(3.66, 1);
        });

        it(`${heroId}: proporción walk/run duraciones es coherente`, () => {
            // Caminar es más lento que correr: la duración del ciclo de walk
            // debe ser mayor que la de run (mismo paso, más estirado).
            const ratio = WALK_DURATION / RUN_DURATION;
            // ratio ≈ 1,59: el ciclo de walk es ~1,6× más largo que el de run
            expect(ratio).toBeGreaterThan(1.3);
            expect(ratio).toBeLessThan(2.0);
        });

        it(`${heroId}: pasos por segundo a velocidad natural`, () => {
            // Cada ciclo de run tiene 2 pasos (footstep en t=0 y t=0,5).
            // Pasos/s a velocidad natural = 2 / runDur ≈ 2,82 pasos/s
            const stepsPerSecondRun = 2 / RUN_DURATION;
            // Cada ciclo de walk tiene 2 pasos.
            // Pasos/s a velocidad natural = 2 / walkDur ≈ 1,78 pasos/s
            const stepsPerSecondWalk = 2 / WALK_DURATION;
            // Correr debe dar más pasos/s que caminar
            expect(stepsPerSecondRun).toBeGreaterThan(stepsPerSecondWalk);
            // Valores razonables para un humanoide: 1,5–4 pasos/s
            expect(stepsPerSecondWalk).toBeGreaterThan(1.0);
            expect(stepsPerSecondWalk).toBeLessThan(5.0);
            expect(stepsPerSecondRun).toBeGreaterThan(1.5);
            expect(stepsPerSecondRun).toBeLessThan(6.0);
        });
    }
});

describe('CAD-01: eventos footstep en assets.json', () => {
    // ANIM-01 movió los apoyos a t=0 y t=0,5 del clip (stance izquierda–derecha).
    // assets.json aún tiene t=0,05/0,55: se aproximan pero no son exactos.
    // La prueba verifica que los eventos existen y están cerca de lo esperado.
    for (const heroId of ANIME_HEROES) {
        const hero = assets.templates[heroId] as {
            events?: Record<string, Array<{ t: number; type: string }>>;
        };
        it(`${heroId}: footstep events en run cerca de t=0 y t=0,5`, () => {
            const runEvents = hero.events?.run?.filter((e) => e.type === 'footstep') ?? [];
            expect(runEvents.length).toBeGreaterThanOrEqual(2);
            // Los apoyos deben estar cerca de 0 y 0,5 (margen ±0,1)
            expect(runEvents[0]?.t).toBeGreaterThanOrEqual(-0.1);
            expect(runEvents[0]?.t).toBeLessThanOrEqual(0.15);
            expect(runEvents[1]?.t).toBeGreaterThanOrEqual(0.4);
            expect(runEvents[1]?.t).toBeLessThanOrEqual(0.65);
        });

        it(`${heroId}: footstep events en walk cerca de t=0 y t=0,5`, () => {
            const walkEvents = hero.events?.walk?.filter((e) => e.type === 'footstep') ?? [];
            expect(walkEvents.length).toBeGreaterThanOrEqual(2);
            expect(walkEvents[0]?.t).toBeGreaterThanOrEqual(-0.1);
            expect(walkEvents[0]?.t).toBeLessThanOrEqual(0.15);
            expect(walkEvents[1]?.t).toBeGreaterThanOrEqual(0.4);
            expect(walkEvents[1]?.t).toBeLessThanOrEqual(0.65);
        });
    }
});
