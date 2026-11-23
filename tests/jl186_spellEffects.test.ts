// JL-186: Hechizos que se lanzan y no hacen nada.
// Prueba que lanza cada hechizo de clase con un blanco válido, a nivel 1 y 50,
// y espera 3 s. Debe salir un cast y al menos un efecto: daño, curación, estado,
// zona, invocación, escudo o movimiento.
import { describe, expect, it } from 'vitest';
import { loadGameData, type GameData } from '../src/data';
import { Character } from '../src/rpg/character';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { prepareSpells } from './levels';

const DT = 1 / 60;

function arena(data: GameData = loadGameData(), classId: string, level: number): World {
    const character = Character.create(data.rpg, classId, 'Prueba', new Rng(1));
    character.level = level;
    character.spellbook.level = level; // Sincronizar spellbook.level con character.level
    character.xp = 0;
    // Aprende todos los hechizos disponibles.
    for (const [spellId, def] of Object.entries(data.rpg.spells)) {
        if (def.devOnly) continue;
        if (def.classId !== null && def.classId !== classId) continue;
        if (def.unlockLevel && def.unlockLevel > level) continue;
        character.spellbook.learn(spellId);
    }
    const w = new World(data, { encounter: false, character });
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    w.player.invulnerable = 1e9; // no muere durante la prueba
    return w;
}

function run(w: World, seconds: number): GameEvent[] {
    for (let i = 0; i < Math.round(seconds / DT); i++) w.tick(DT);
    return w.drainEvents();
}

const aim = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });

// Efectos que no producen eventos inmediatos en el contexto (se activan en world.ts).
const silentTypes = new Set(['dispel', 'pushDamage', 'chain', 'bonusVsStatus', 'selfStack', 'reveal']);

// Efectos de movimiento que no producen eventos de daño/status.
const movementTypes = new Set(['dash', 'teleport', 'blink', 'swap', 'pull', 'recoil']);

// Bloqueos esperados que no significan que el hechizo esté roto.
const expectedBlocks = new Set(['gcd', 'cooldown', 'resource', 'casting']);

function hasSilentEffectsOnly(data: GameData, spellId: string): boolean {
    const def = data.rpg.spells[spellId];
    if (!def || def.effects.length === 0) return false;
    return def.effects.every((e) => silentTypes.has(e.type));
}

function hasMovementEffects(data: GameData, spellId: string): boolean {
    const def = data.rpg.spells[spellId];
    if (!def) return false;
    return def.effects.some((e) => movementTypes.has(e.type));
}

describe('JL-186: Hechizos que se lanzan y no hacen nada', () => {
    const data = loadGameData();
    const clases = ['ember_vanguard', 'storm_weaver', 'mangrove_hunter'];
    const niveles = [1, 50];

    for (const clase of clases) {
        for (const nivel of niveles) {
            it(`${clase} a nivel ${nivel}: cada hechizo produce efecto`, () => {
                const w = arena(data, clase, nivel);
                const e = w.spawnEnemy('melee', { x: 15, y: 10 });
                e.health = 1e9; // no muere

                const disconnected: string[] = [];

                for (const [spellId] of w.character.spellbook.known) {
                    const def = data.rpg.spells[spellId];
                    if (!def || def.devOnly) continue;

                    // Si solo tiene efectos silenciosos, no se verifica con eventos.
                    if (hasSilentEffectsOnly(data, spellId)) continue;

                    // Resetear estado del jugador para cada hechizo.
                    w.player.resource = w.player.maxResource;
                    w.player.cooldowns = {};
                    w.player.gcd = 0;
                    w.player.basicCharges = data.player.basicAttack.charges;

                    // Preparar el hechizo si no está en la barra.
                    prepareSpells(w.character, spellId);

                    // Colocar el enemigo a una distancia adecuada para el rango del hechizo.
                    // Los hechizos con range=0 son de área/melee: enemigo a 1.5m.
                    // Los demás: enemigo a min(rango-0.5, 2m) para asegurar que esté en alcance.
                    w.enemies.list.length = 0;
                    const spellRange = def.range ?? 0;
                    const enemyDist = spellRange === 0 ? 1.5 : Math.min(spellRange - 0.5, 3);
                    const enemyX = w.player.pos.x + enemyDist;
                    const enemyY = w.player.pos.y;
                    const e2 = w.spawnEnemy('melee', { x: enemyX, y: enemyY });
                    e2.health = 1e9;

                    // Intentar lanzar.
                    const result = w.commandCast(spellId, aim(enemyX, enemyY, e2.id));

                    // Si el lanzamiento fue bloqueado por un motivo esperado, no está roto.
                    if (result !== null && !expectedBlocks.has(result)) {
                        // Bloqueo inesperado: fuera de alcance, sin blanco, etc.
                        // Los hechizos de movimiento no necesitan blanco.
                        if (!hasMovementEffects(data, spellId)) {
                            disconnected.push(spellId);
                            continue;
                        }
                    }

                    // Esperar 3 segundos para que los efectos se activen.
                    const ev = run(w, 3);

                    // Verificar que hubo al menos un efecto.
                    const castEvents = ev.filter((x) => x.type === 'cast' && x.ability === spellId);
                    const damageToEnemy = ev.filter((x) => x.type === 'damage' && x.targetId === e2.id);
                    const healEvents = ev.filter((x) => x.type === 'heal');
                    const statusEvents = ev.filter((x) => x.type === 'status');
                    const summonEvents = ev.filter((x) => x.type === 'summon');

                    const hasEffect =
                        damageToEnemy.length > 0 ||
                        healEvents.length > 0 ||
                        statusEvents.length > 0 ||
                        summonEvents.length > 0;

                    // Si hay cast y efectos de movimiento, no es desconectado.
                    if (!hasEffect && castEvents.length > 0 && hasMovementEffects(data, spellId)) {
                        // Movimiento cuenta como efecto.
                    } else if (!hasEffect && castEvents.length === 0) {
                        // Ni cast ni efecto: desconectado.
                        disconnected.push(spellId);
                    } else if (!hasEffect && castEvents.length > 0) {
                        // Hay cast pero no efecto visible en 3s y no es movimiento.
                        disconnected.push(spellId);
                    }
                }

                if (disconnected.length > 0) {
                    expect(
                        disconnected.length,
                        `Hechizos desconectados (${clase}, nivel ${nivel}): ${disconnected.join(', ')}`
                    ).toBe(0);
                }
            });
        }
    }
});
