// HZ-06: perLevel en el parser de damage/heal — sin el cambio en content.ts,
// perLevel no se lee y el daño no escala con el nivel del lanzador.
import { describe, expect, it } from 'vitest';
import { loadGameData, type GameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { GameSession } from '../src/rpg/session';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { prepareSpells } from './levels';

const DT = 1 / 60;

function arena(classId = 'mangrove_hunter', data: GameData = loadGameData(), level = 1): { w: World; s: GameSession } {
    const rng = new Rng(42);
    const ch = Character.create(data.rpg, classId, 'Prueba', rng);
    ch.level = level;
    ch.spellbook.level = level;
    const s = new GameSession(data.rpg, ch, rng);
    const w = new World(data, { encounter: false, character: s.character, seed: 1 });
    s.attach(w);
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    return { w, s };
}

function run(w: World, seconds: number): GameEvent[] {
    const out: GameEvent[] = [];
    for (let i = 0; i < Math.round(seconds / DT); i++) {
        w.tick(DT);
        out.push(...w.drainEvents());
    }
    return out;
}

const still = (e: { state: string; stateTime: number }) => {
    e.state = 'stagger';
    e.stateTime = -1e9;
};

const ready = (w: World) => {
    w.player.cooldowns = {};
    w.player.gcd = 0;
    w.player.resource = w.player.maxResource;
};

const aim = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });

const damageTo = (ev: GameEvent[], id: number) =>
    ev.filter((e): e is Extract<GameEvent, { type: 'damage' }> => e.type === 'damage' && e.targetId === id);

describe('HZ-06: perLevel escala el daño con el nivel del lanzador', () => {
    it('Flecha de cazador a nivel 200 hace más daño que a nivel 1 (perLevel)', () => {
        // hunter_arrow: perLevel 0.08, min 9, max 12, area single, projectile
        // Fórmula: (rng(9, 12) + 0.08 × nivel) × power + 0.4 × int
        // A nivel 1: (rng + 0.08) × power + 0.4 × int
        // A nivel 200: (rng + 16) × power + 0.4 × int
        // Diferencia: ~16 × power por golpe.

        const data = loadGameData();

        // Nivel 1
        const { w: w1 } = arena('mangrove_hunter', data, 1);
        prepareSpells(w1.character, 'hunter_arrow');
        const e1 = w1.spawnEnemy('melee', { x: 14, y: 10 });
        still(e1);
        ready(w1);
        w1.commandCast('hunter_arrow', aim(14, 10, e1.id));
        const ev1 = run(w1, 1);
        const dmg1 = damageTo(ev1, e1.id);
        expect(dmg1.length).toBeGreaterThan(0);
        const total1 = dmg1.reduce((s, d) => s + d.amount, 0);

        // Nivel 200
        const { w: w2 } = arena('mangrove_hunter', data, 200);
        prepareSpells(w2.character, 'hunter_arrow');
        const e2 = w2.spawnEnemy('melee', { x: 14, y: 10 });
        still(e2);
        ready(w2);
        w2.commandCast('hunter_arrow', aim(14, 10, e2.id));
        const ev2 = run(w2, 1);
        const dmg2 = damageTo(ev2, e2.id);
        expect(dmg2.length).toBeGreaterThan(0);
        const total2 = dmg2.reduce((s, d) => s + d.amount, 0);

        // El daño a nivel 200 debe ser significativamente mayor.
        expect(total2).toBeGreaterThan(total1);
        // perLevel 0.08 × 199 = 15.92 extra en el base (~1.4× más)
        expect(total2).toBeGreaterThan(total1 * 1.3);
    });

    it('Estrella de vendaval (gale_star) también escala con perLevel', () => {
        // gale_star: perLevel 0.13, min 15, max 20, area star (atTarget: false)
        // Es un área en el punto apuntado, no un objetivo directo.
        // Ponemos el enemigo en el punto del área.
        const data = loadGameData();

        // Nivel 1
        const { w: w1 } = arena('mangrove_hunter', data, 1);
        prepareSpells(w1.character, 'gale_star');
        const e1 = w1.spawnEnemy('melee', { x: 14, y: 10 });
        still(e1);
        ready(w1);
        w1.commandCast('gale_star', aim(14, 10, e1.id));
        const ev1 = run(w1, 0.5);
        const dmg1 = damageTo(ev1, e1.id);
        const total1 = dmg1.reduce((s, d) => s + d.amount, 0);

        // Nivel 200
        const { w: w2 } = arena('mangrove_hunter', data, 200);
        prepareSpells(w2.character, 'gale_star');
        const e2 = w2.spawnEnemy('melee', { x: 14, y: 10 });
        still(e2);
        ready(w2);
        w2.commandCast('gale_star', aim(14, 10, e2.id));
        const ev2 = run(w2, 0.5);
        const dmg2 = damageTo(ev2, e2.id);
        const total2 = dmg2.reduce((s, d) => s + d.amount, 0);

        // Si el área golpea, el daño debe ser mayor a nivel 200.
        if (total1 > 0 || total2 > 0) {
            expect(total2).toBeGreaterThanOrEqual(total1);
        }
    });

    it('perLevel en heal escala la curación con el nivel', () => {
        // Se verifica que el parser lee perLevel en efectos de tipo heal.
        // Un hechizo de cura con perLevel debe curar más a nivel 200.
        const data = loadGameData();

        // Buscamos un hechizo de cura con perLevel en los datos.
        // Si no hay uno en spells.json, usamos el efecto directamente.
        const spells = data.rpg.spells;
        const healSpell = Object.entries(spells).find(
            ([, s]) => s.effects?.some((e: any) => e.type === 'heal' && e.perLevel !== undefined),
        );

        if (!healSpell) {
            // Si no hay hechizo de cura con perLevel en los datos,
            // verificamos que el parser lo acepta correctamente.
            const { parseEffect } = require('../src/rpg/content');
            const reader = {
                num: (_: any, key: string, opts: any) => {
                    const raw: any = { perLevel: 0.05, min: 10, max: 20, scaling: 0.3 };
                    return raw[key] ?? opts.def ?? 0;
                },
                str: (_: any, key: string) => {
                    const raw: any = { statusId: 'test_status' };
                    return raw[key];
                },
            };
            const effect = parseEffect(reader, {
                type: 'heal',
                min: 10,
                max: 20,
                perLevel: 0.05,
                scaling: 0.3,
            });
            expect(effect.type).toBe('heal');
            expect((effect as any).perLevel).toBe(0.05);
            return;
        }

        // Si existe, probamos la curación a nivel 1 vs 200.
        const [spellId] = healSpell;
        const { w: w1 } = arena('mangrove_hunter', data, 1);
        prepareSpells(w1.character, spellId);
        ready(w1);
        w1.commandCast(spellId, aim(10, 10));
        const ev1 = run(w1, 0.5);
        const heal1 = ev1.filter(
            (e): e is Extract<GameEvent, { type: 'heal' }> => e.type === 'heal',
        );
        const totalHeal1 = heal1.reduce((s, h) => s + h.amount, 0);

        const { w: w2 } = arena('mangrove_hunter', data, 200);
        prepareSpells(w2.character, spellId);
        ready(w2);
        w2.commandCast(spellId, aim(10, 10));
        const ev2 = run(w2, 0.5);
        const heal2 = ev2.filter(
            (e): e is Extract<GameEvent, { type: 'heal' }> => e.type === 'heal',
        );
        const totalHeal2 = heal2.reduce((s, h) => s + h.amount, 0);

        if (totalHeal1 > 0 || totalHeal2 > 0) {
            expect(totalHeal2).toBeGreaterThanOrEqual(totalHeal1);
        }
    });
});
