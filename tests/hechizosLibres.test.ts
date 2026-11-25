// GCD-01, opción A (creador 2026-11-24: «los hechizos deberían ser eventos asíncronos y poder
// tirar 2 a la vez»; eligió «Hechizos libres de GCD»). Un hechizo con `offGlobalCooldown` ni
// pone ni espera el enfriamiento global: se lanza encima de otro en el mismo instante.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { prepareSpells } from './levels';

const data = loadGameData();
const spells = data.rpg.spells;

function arena(...ids: string[]): World {
    const character = Character.create(data.rpg, 'storm_weaver', 'Prueba', new Rng(1));
    prepareSpells(character, ...ids);
    const w = new World(data, { encounter: false, character });
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    w.player.resource = 1e6;
    return w;
}
function target(w: World) {
    const e = w.spawnEnemy('melee', { x: 13, y: 10 });
    e.state = 'stagger';
    e.stateTime = -1e9;
    e.health = 1e6;
    return e;
}
const at = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });

describe('hechizos libres del enfriamiento global', () => {
    it('los datos marcan defensas y movimientos instantáneos, nunca un hechizo con carga', () => {
        const free = Object.values(spells).filter((s) => s.offGlobalCooldown);
        expect(free.length).toBeGreaterThan(0);
        for (const s of free) expect(s.castTime, s.id).toBe(0);
        expect(spells['storm_focus']!.offGlobalCooldown).toBe(true);
        expect(spells['spark']!.offGlobalCooldown).toBeFalsy();
    });

    it('tras un hechizo normal, uno libre se lanza en el mismo instante', () => {
        const w = arena('spark', 'storm_focus');
        const e = target(w);
        expect(w.commandCast('spark', at(e.pos.x, e.pos.y, e.id))).toBeNull();
        expect(w.player.gcd).toBeGreaterThan(0);
        expect(w.commandCast('storm_focus', at(10, 10))).toBeNull();
        const casts = w.drainEvents().filter((ev) => ev.type === 'cast').map((ev) => ev.type === 'cast' && ev.ability);
        expect(casts).toEqual(['spark', 'storm_focus']);
    });

    it('un hechizo libre no pone enfriamiento global: el normal sale justo detrás', () => {
        const w = arena('spark', 'storm_focus');
        const e = target(w);
        expect(w.commandCast('storm_focus', at(10, 10))).toBeNull();
        expect(w.player.gcd).toBe(0);
        expect(w.commandCast('spark', at(e.pos.x, e.pos.y, e.id))).toBeNull();
    });

    it('dos hechizos normales siguen esperando el enfriamiento global', () => {
        const w = arena('spark', 'glacial_lance');
        const e = target(w);
        expect(w.commandCast('spark', at(e.pos.x, e.pos.y, e.id))).toBeNull();
        expect(w.checkCast(w.spell('glacial_lance'), null, e.pos)).toBe('gcd');
    });

    it('la barra no pinta el barrido del enfriamiento global sobre un hechizo libre', () => {
        const w = arena('spark', 'storm_focus');
        const e = target(w);
        const bar = w.character.spellbook.hotbar;
        const iFocus = bar.indexOf('storm_focus');
        const iSpark = bar.indexOf('spark');
        expect(iFocus).toBeGreaterThanOrEqual(0);
        w.commandCast('spark', at(e.pos.x, e.pos.y, e.id));
        w.tick(1 / 60); // el chispazo arranca su propio enfriamiento si lo tiene; aquí solo importa el GCD
        const state = w.hotbarState();
        expect(state[iFocus]!.cooldownRemaining).toBe(0);
        if (iSpark >= 0 && w.spell('spark').cooldown === 0) expect(state[iSpark]!.cooldownRemaining).toBeGreaterThan(0);
    });
});

describe('ficha de un hechizo libre', () => {
    it('dice «Ritmo: libre» solo en los hechizos libres', async () => {
        const { spellTooltip } = await import('../src/ui/menus/format');
        const ritmo = (id: string) =>
            spellTooltip(spells[id]!, 1, data.rpg, 'Maná').find((l) => l.kind === 'fact' && l.label === 'Ritmo');
        expect(ritmo('storm_focus')).toBeTruthy();
        expect(ritmo('spark')).toBeUndefined();
    });
});
