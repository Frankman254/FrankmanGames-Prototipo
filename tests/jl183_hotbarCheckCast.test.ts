// JL-183: La barra y checkCast dicen lo mismo.
// Con secuencias aleatorias de lanzamientos y semilla fija, 200 pasos con 3 clases
// y tick entre pulsaciones. En cada paso:
// - Si un hueco sale listo (cooldownRemaining<=0, affordable y inRange),
//   checkCast de ese hechizo no puede devolver 'cooldown', 'gcd' ni 'resource'.
// - Si checkCast devuelve 'gcd', el hueco debe mostrar barrido (cooldownRemaining > 0).
import { afterAll, describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { prepareSpells } from './levels';

const DT = 1 / 60;
const data = loadGameData();
const CLASS_IDS = ['ember_vanguard', 'storm_weaver', 'mangrove_hunter'] as const;

const results: string[] = [];

// Crea un mundo con un personaje a nivel 50, enemigo a 5 m y la barra llena.
function arenaWithEnemy(classId: string, rng: Rng): World {
    const character = Character.create(data.rpg, classId, 'Prueba', new Rng(42));
    while (character.level < 50) character.gainXp(character.xpToNext - character.xp);
    // Aprende los hechizos de la barra (hotbarFillOrder los llena).
    const hotbar = character.spellbook.hotbar;
    for (const spellId of hotbar) {
        if (spellId) prepareSpells(character, spellId);
    }
    const w = new World(data, { encounter: false, character });
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    w.player.resource = w.player.maxResource;
    w.player.cooldowns = {};
    w.player.gcd = 0;
    w.player.gcdTotal = 0;
    // Un enemigo a 5 m — dentro del rango de la mayoría de hechizos.
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    e.health = 1e6;
    e.state = 'stagger';
    e.stateTime = -1e9;
    // aimProvider apunta al enemigo.
    w.aimProvider = () => ({ point: { x: 15, y: 10 }, targetId: e.id });
    return w;
}

function run(w: World, frames: number) {
    for (let i = 0; i < frames; i++) w.tick(DT);
}

// Los motivos que hotbarState expone visualmente y que checkCast devuelve.
const HOTBAR_BLOCK_REASONS = ['cooldown', 'gcd', 'resource'] as const;

for (const classId of CLASS_IDS) {
    describe(`${classId}: barra y checkCast coherentes`, () => {
        it('200 pasos aleatorios: si el hueco está listo, checkCast no bloquea por cooldown/gcd/resource', () => {
            const rng = new Rng(12345 + CLASS_IDS.indexOf(classId));
            const w = arenaWithEnemy(classId, rng);
            const hotbar = w.character.spellbook.hotbar;
            const numSlots = hotbar.length;
            const issues: string[] = [];

            for (let step = 0; step < 200; step++) {
                // Elige un hueco al azar e intenta lanzarlo.
                const slotIdx = rng.range(0, numSlots - 1);
                const spellId = hotbar[slotIdx];
                if (!spellId) {
                    run(w, 1);
                    continue;
                }
                const s = w.spell(spellId);

                // Lee el estado de la barra ANTES de intentar lanzar.
                const state = w.hotbarState();
                const slotState = state.find((st) => st.spellId === spellId);
                if (!slotState) {
                    run(w, 1);
                    continue;
                }

                const isReady =
                    slotState.cooldownRemaining <= 0 &&
                    slotState.affordable === true &&
                    (slotState.inRange ?? true) === true;

                // Lee checkCast para el mismo hechizo.
                const targetId = w.aimProvider?.()?.targetId ?? null;
                const aimPoint = w.aimProvider?.()?.point ?? w.player.pos;
                const block = w.checkCast(s, targetId, aimPoint);

                if (isReady) {
                    // Si la barra dice "listo", checkCast no debe bloquear por cooldown/gcd/resource.
                    for (const reason of HOTBAR_BLOCK_REASONS) {
                        if (block === reason) {
                            issues.push(
                                `paso ${step}: ${spellId} — hueco listo pero checkCast='${reason}' ` +
                                `(cooldownRem=${slotState.cooldownRemaining}, affordable=${slotState.affordable}, inRange=${slotState.inRange})`,
                            );
                        }
                    }
                }

                // Intenta lanzar (puede encolarse o ejecutarse).
                w.commandCast(spellId, { point: aimPoint, targetId });

                // Avanza 1-3 frames para que los cooldowns bajen.
                run(w, 1 + rng.range(0, 2));

                // Recupera recurso de vez en cuando para mantener variedad.
                if (rng.chance(0.3)) {
                    w.player.resource = w.player.maxResource;
                }
            }

            if (issues.length > 0) {
                results.push(`${classId}: ${issues.length} desacuerdos:\n${issues.join('\n')}`);
            } else {
                results.push(`${classId}: 200 pasos — 0 desacuerdos (listo → checkCast OK)`);
            }
            expect(issues, `${classId}: hueco listo implica checkCast sin cooldown/gcd/resource`).toEqual([]);
        });

        it('200 pasos aleatorios: si checkCast devuelve gcd, el hueco muestra barrido', () => {
            const rng = new Rng(77777 + CLASS_IDS.indexOf(classId));
            const w = arenaWithEnemy(classId, rng);
            const hotbar = w.character.spellbook.hotbar;
            const numSlots = hotbar.length;
            const issues: string[] = [];

            for (let step = 0; step < 200; step++) {
                const slotIdx = rng.range(0, numSlots - 1);
                const spellId = hotbar[slotIdx];
                if (!spellId) {
                    run(w, 1);
                    continue;
                }
                const s = w.spell(spellId);

                // Lee checkCast primero.
                const targetId = w.aimProvider?.()?.targetId ?? null;
                const aimPoint = w.aimProvider?.()?.point ?? w.player.pos;
                const block = w.checkCast(s, targetId, aimPoint);

                // Lee el estado de la barra.
                const state = w.hotbarState();
                const slotState = state.find((st) => st.spellId === spellId);
                if (!slotState) {
                    run(w, 1);
                    continue;
                }

                if (block === 'gcd') {
                    // Si checkCast dice 'gcd', el hueco debe mostrar barrido.
                    if (slotState.cooldownRemaining <= 0) {
                        issues.push(
                            `paso ${step}: ${spellId} — checkCast='gcd' pero cooldownRemaining=${slotState.cooldownRemaining} (esperado > 0)`,
                        );
                    }
                }

                // Intenta lanzar.
                w.commandCast(spellId, { point: aimPoint, targetId });
                run(w, 1 + rng.range(0, 2));
                if (rng.chance(0.3)) {
                    w.player.resource = w.player.maxResource;
                }
            }

            if (issues.length > 0) {
                results.push(`${classId} (gcd→barrido): ${issues.length} desacuerdos:\n${issues.join('\n')}`);
            } else {
                results.push(`${classId} (gcd→barrido): 200 pasos — 0 desacuerdos`);
            }
            expect(issues, `${classId}: checkCast gcd implica barrido visible`).toEqual([]);
        });

        it('200 pasos aleatorios: si checkCast devuelve cooldown, el hueco muestra barrido', () => {
            const rng = new Rng(99999 + CLASS_IDS.indexOf(classId));
            const w = arenaWithEnemy(classId, rng);
            const hotbar = w.character.spellbook.hotbar;
            const numSlots = hotbar.length;
            const issues: string[] = [];

            for (let step = 0; step < 200; step++) {
                const slotIdx = rng.range(0, numSlots - 1);
                const spellId = hotbar[slotIdx];
                if (!spellId) {
                    run(w, 1);
                    continue;
                }
                const s = w.spell(spellId);

                const targetId = w.aimProvider?.()?.targetId ?? null;
                const aimPoint = w.aimProvider?.()?.point ?? w.player.pos;
                const block = w.checkCast(s, targetId, aimPoint);

                const state = w.hotbarState();
                const slotState = state.find((st) => st.spellId === spellId);
                if (!slotState) {
                    run(w, 1);
                    continue;
                }

                if (block === 'cooldown') {
                    if (slotState.cooldownRemaining <= 0) {
                        issues.push(
                            `paso ${step}: ${spellId} — checkCast='cooldown' pero cooldownRemaining=${slotState.cooldownRemaining} (esperado > 0)`,
                        );
                    }
                }

                w.commandCast(spellId, { point: aimPoint, targetId });
                run(w, 1 + rng.range(0, 2));
                if (rng.chance(0.3)) {
                    w.player.resource = w.player.maxResource;
                }
            }

            if (issues.length > 0) {
                results.push(`${classId} (cooldown→barrido): ${issues.length} desacuerdos:\n${issues.join('\n')}`);
            } else {
                results.push(`${classId} (cooldown→barrido): 200 pasos — 0 desacuerdos`);
            }
            expect(issues, `${classId}: checkCast cooldown implica barrido visible`).toEqual([]);
        });

        it('200 pasos aleatorios: si checkCast devuelve resource, el hueco no es affordable', () => {
            const rng = new Rng(55555 + CLASS_IDS.indexOf(classId));
            const w = arenaWithEnemy(classId, rng);
            const hotbar = w.character.spellbook.hotbar;
            const numSlots = hotbar.length;
            const issues: string[] = [];

            for (let step = 0; step < 200; step++) {
                const slotIdx = rng.range(0, numSlots - 1);
                const spellId = hotbar[slotIdx];
                if (!spellId) {
                    run(w, 1);
                    continue;
                }
                const s = w.spell(spellId);

                const targetId = w.aimProvider?.()?.targetId ?? null;
                const aimPoint = w.aimProvider?.()?.point ?? w.player.pos;
                const block = w.checkCast(s, targetId, aimPoint);

                const state = w.hotbarState();
                const slotState = state.find((st) => st.spellId === spellId);
                if (!slotState) {
                    run(w, 1);
                    continue;
                }

                if (block === 'resource') {
                    if (slotState.affordable === true) {
                        issues.push(
                            `paso ${step}: ${spellId} — checkCast='resource' pero affordable=true (esperado false)`,
                        );
                    }
                }

                w.commandCast(spellId, { point: aimPoint, targetId });
                run(w, 1 + rng.range(0, 2));
                // Agota recurso de vez en cuando para forzar el caso 'resource'.
                if (rng.chance(0.4)) {
                    w.player.resource = 0;
                } else if (rng.chance(0.3)) {
                    w.player.resource = w.player.maxResource;
                }
            }

            if (issues.length > 0) {
                results.push(`${classId} (resource→affordable): ${issues.length} desacuerdos:\n${issues.join('\n')}`);
            } else {
                results.push(`${classId} (resource→affordable): 200 pasos — 0 desacuerdos`);
            }
            expect(issues, `${classId}: checkCast resource implica !affordable`).toEqual([]);
        });
    });
}

// Escribe el informe.
import * as fs from 'fs';
import * as path from 'path';
afterAll(() => {
    const dir = path.join(__dirname, '..', 'work', 'junie-jl183');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
        path.join(dir, 'INFORME.md'),
        '# JL-183: La barra y checkCast dicen lo mismo\n\n' + results.join('\n\n') + '\n',
    );
});
