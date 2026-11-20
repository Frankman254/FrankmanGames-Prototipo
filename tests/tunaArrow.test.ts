// Creador (2026-11-20): Flecha de tuna (nombre panameño: la tuna de carnaval crece al pasar).
// Salta al enemigo a ≤ 2 m del último alcanzado, +10 de daño base por salto, máx. 10; sin
// nadie a 2 m, se corta.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { prepareSpells } from './levels';

const DT = 1 / 60;
const data = loadGameData();

function arena(xs: number[]) {
    const character = Character.create(data.rpg, 'mangrove_hunter', 'Prueba', new Rng(1));
    prepareSpells(character, 'tuna_arrow');
    const w = new World(data, { encounter: false, character, seed: 3 });
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    const ids = xs.map((x) => {
        const e = w.spawnEnemy('melee', { x, y: 10 });
        e.state = 'stagger';
        e.stateTime = -1e9;
        e.health = 1e6;
        return e.id;
    });
    // Sin crítico: los importes se pueden comparar.
    w.character.stats.set('qa-nocrit', [{ stat: 'critChance', op: 'flat', value: -5 }]);
    return { w, ids };
}
function cast(w: World, target: number): Map<number, number> {
    expect(w.commandCast('tuna_arrow', { point: { x: 0, y: 0 }, targetId: target })).toBeNull();
    let ev: GameEvent[] = [];
    for (let i = 0; i < 120; i++) {
        w.tick(DT);
        ev = ev.concat(w.drainEvents());
    }
    const out = new Map<number, number>();
    for (const e of ev)
        if (e.type === 'damage' && e.ability === 'tuna_arrow' && !e.toPlayer)
            out.set(e.targetId, (out.get(e.targetId) ?? 0) + e.amount);
    return out;
}

describe('Flecha de tuna', () => {
    it('está en el libro del Cazador y salta hasta 10 veces a ≤ 2 m, +10 de base por salto', () => {
        const s = data.rpg.spells.tuna_arrow!;
        expect(s.classId).toBe('mangrove_hunter');
        expect(s.effects).toContainEqual({ type: 'chain', jumps: 10, radius: 2, damagePerJump: 10 });
    });

    it('salta en fila mientras haya alguien a 2 m y cada salto pega más', () => {
        // Cinco en fila a 1,5 m y uno suelto a 5 m del último: no le llega.
        const { w, ids } = arena([16, 17.5, 19, 20.5, 22, 27]);
        const hits = cast(w, ids[0]!);
        expect([...hits.keys()].sort()).toEqual(ids.slice(0, 5).sort());
        const amounts = ids.slice(0, 5).map((id) => hits.get(id)!);
        for (let i = 1; i < amounts.length; i++) expect(amounts[i]!, `salto ${i}`).toBeGreaterThan(amounts[i - 1]!);
    });

    it('sin nadie a 2 m no salta', () => {
        const { w, ids } = arena([16, 19]);
        expect([...cast(w, ids[0]!).keys()]).toEqual([ids[0]]);
    });
});
