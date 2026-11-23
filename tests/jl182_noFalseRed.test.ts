// JL-182: Ningún hueco en rojo sin motivo.
// Recorre todos los hechizos de las 3 clases y los universales.
// Sin enemigos y con el cursor a 2 m, hotbarState() debe dar inRange: true y cooldownRemaining: 0.
// Con un enemigo a 2 m bajo el cursor, igual.
import { afterAll, describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { prepareSpells } from './levels';

const DT = 1 / 60;
const data = loadGameData();
const CLASS_IDS = ['ember_vanguard', 'storm_weaver', 'mangrove_hunter'] as const;

// Recupera los ids de hechizo de una clase y los universales.
function getSpellIds(classId: string): { classSpells: string[]; universalSpells: string[] } {
    const spells = data.rpg.spells;
    const classSpells: string[] = [];
    const universalSpells: string[] = [];
    for (const [id, s] of Object.entries(spells)) {
        if (s.classId === classId) classSpells.push(id);
        else if (!s.classId) universalSpells.push(id);
    }
    return { classSpells, universalSpells };
}

// Crea un mundo con el personaje a nivel 200 y todos los hechizos aprendidos y en la barra.
function arenaWithAllSpells(classId: string): World {
    const character = Character.create(data.rpg, classId, 'Prueba', new Rng(42));
    // Subir a nivel 200 para desbloquear todo.
    while (character.level < 200) character.gainXp(character.xpToNext - character.xp);
    const { classSpells, universalSpells } = getSpellIds(classId);
    const allSpells = [...classSpells, ...universalSpells];
    for (const id of allSpells) {
        prepareSpells(character, id);
    }
    const w = new World(data, { encounter: false, character });
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    // Llenar recurso para que todos sean asequibles.
    w.player.resource = w.player.maxResource;
    // Limpiar enfriamientos.
    w.player.cooldowns = {};
    w.player.gcd = 0;
    w.player.gcdTotal = 0;
    return w;
}

const aim = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });

function run(w: World, seconds: number) {
    for (let i = 0; i < Math.round(seconds / DT); i++) w.tick(DT);
}

// Escribe la lista de resultados.
const results: string[] = [];

for (const classId of CLASS_IDS) {
    const { classSpells, universalSpells } = getSpellIds(classId);
    const allSpells = [...classSpells, ...universalSpells];

    describe(`${classId}: ningún hueco en rojo sin motivo`, () => {
        it('sin enemigos: todos inRange y sin enfriamiento', () => {
            const w = arenaWithAllSpells(classId);
            // aimProvider apunta a 2 m del jugador, sin enemigo.
            w.aimProvider = () => aim(12, 10);
            const state = w.hotbarState();
            const issues: string[] = [];
            for (const slot of state) {
                if (slot.spellId === null) continue;
                if (slot.cooldownRemaining > 0) {
                    issues.push(`${slot.spellId}: cooldownRemaining=${slot.cooldownRemaining} (esperado 0)`);
                }
                if (slot.inRange === false) {
                    issues.push(`${slot.spellId}: inRange=false (esperado true)`);
                }
            }
            if (issues.length > 0) {
                results.push(`${classId} (sin enemigos): ${issues.length} problemas: ${issues.join('; ')}`);
            } else {
                results.push(`${classId} (sin enemigos): OK — ${state.filter((s) => s.spellId).length} hechizos en la barra`);
            }
            expect(issues, `Sin enemigos: ${classId}`).toEqual([]);
        });

        it('con enemigo a 2 m bajo el cursor: todos inRange y sin enfriamiento', () => {
            const w = arenaWithAllSpells(classId);
            const e = w.spawnEnemy('melee', { x: 12, y: 10 });
            e.health = 1e6;
            e.state = 'stagger';
            e.stateTime = -1e9;
            // aimProvider apunta al enemigo.
            w.aimProvider = () => aim(12, 10, e.id);
            // Esperar un poco para que los enfriamientos se asienten.
            run(w, 0.1);
            w.player.resource = w.player.maxResource;
            w.player.cooldowns = {};
            w.player.gcd = 0;
            w.player.gcdTotal = 0;
            const state = w.hotbarState();
            const issues: string[] = [];
            for (const slot of state) {
                if (slot.spellId === null) continue;
                if (slot.cooldownRemaining > 0) {
                    issues.push(`${slot.spellId}: cooldownRemaining=${slot.cooldownRemaining} (esperado 0)`);
                }
                if (slot.inRange === false) {
                    const spell = w.spell(slot.spellId);
                    issues.push(`${slot.spellId}: inRange=false (rango=${spell.range}, esperado true)`);
                }
            }
            if (issues.length > 0) {
                results.push(`${classId} (con enemigo): ${issues.length} problemas: ${issues.join('; ')}`);
            } else {
                results.push(`${classId} (con enemigo): OK — ${state.filter((s) => s.spellId).length} hechizos en la barra`);
            }
            expect(issues, `Con enemigo: ${classId}`).toEqual([]);
        });
    });
}

// Al final, escribe la lista.
import * as fs from 'fs';
import * as path from 'path';
afterAll(() => {
    const dir = path.join(__dirname, '..', 'work', 'junie-jl182');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'LISTA.md'), '# JL-182: Ningún hueco en rojo sin motivo\n\n' + results.join('\n') + '\n');
});
