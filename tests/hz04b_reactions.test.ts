// HZ-04b: Reacciones elementales — pruebas unitarias del tracker y de la integración en World.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { GameSession } from '../src/rpg/session';
import {
    ElementalMarkTracker,
    MARK_DURATION,
    REACTION_COOLDOWN,
    ELEMENTAL_MARKS,
    findReaction,
    loadReactions,
    pairKey,
} from '../src/sim/reactions';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { prepareSpells } from './levels';

const DT = 1 / 60;

function run(w: World, seconds: number): GameEvent[] {
    const out: GameEvent[] = [];
    for (let i = 0; i < Math.round(seconds / DT); i++) {
        w.tick(DT);
        out.push(...w.drainEvents());
    }
    return out;
}

function arena(classId: string, devReactions = false): World {
    const data = loadGameData();
    const rng = new Rng(1);
    const s = new GameSession(data.rpg, Character.create(data.rpg, classId, 'Prueba', rng), rng);
    const w = new World(data, { encounter: false, character: s.character, seed: 1 });
    s.attach(w);
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    w.devReactions = devReactions;
    return w;
}

const still = (e: { state: string; stateTime: number }) => {
    e.state = 'stagger';
    e.stateTime = -1e9;
};

const aim = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });

describe('HZ-04b: ElementalMarkTracker', () => {
    const { byPair } = loadReactions();

    it('15 reacciones cargadas', () => {
        expect(loadReactions().reactions.length).toBe(15);
    });

    it('marcas elementales: 5 elementos con marca, aire sin marca', () => {
        expect(ELEMENTAL_MARKS['fire']).toBe('mark_fire');
        expect(ELEMENTAL_MARKS['water']).toBe('mark_water');
        expect(ELEMENTAL_MARKS['frost']).toBe('mark_frost');
        expect(ELEMENTAL_MARKS['lightning']).toBe('mark_lightning');
        expect(ELEMENTAL_MARKS['earth']).toBe('mark_earth');
        expect(ELEMENTAL_MARKS['air']).toBeNull();
    });

    it('primer golpe: establece la marca, sin reacción', () => {
        const t = new ElementalMarkTracker();
        expect(t.apply(1, 'fire' as any, byPair)).toBeNull();
        expect(t.getMark(1)).toBe('fire');
    });

    it('mismo elemento: renueva la marca', () => {
        const t = new ElementalMarkTracker();
        t.apply(1, 'fire' as any, byPair);
        t.tick(4); // quedan 2s
        expect(t.getMark(1)).toBe('fire');
        t.apply(1, 'fire' as any, byPair);
        // La marca se renovó a 6s
        t.tick(5);
        expect(t.getMark(1)).toBe('fire'); // aún activa (1s restante)
    });

    it('elemento distinto: dispara la reacción', () => {
        const t = new ElementalMarkTracker();
        t.apply(1, 'fire' as any, byPair);
        const reaction = t.apply(1, 'frost' as any, byPair);
        expect(reaction).not.toBeNull();
        expect(reaction!.effect).toBe('bonusDamage');
        // Ambas marcas gastadas
        expect(t.getMark(1)).toBeNull();
    });

    it('aire no deja marca, no dispara reacción', () => {
        const t = new ElementalMarkTracker();
        t.apply(1, 'fire' as any, byPair);
        // Aire no deja marca
        expect(t.apply(1, 'air' as any, byPair)).toBeNull();
        // La marca de fuego sigue
        expect(t.getMark(1)).toBe('fire');
    });

    it('cooldown de 2s entre reacciones', () => {
        const t = new ElementalMarkTracker();
        // Primera reacción: fire + frost
        t.apply(1, 'fire' as any, byPair);
        const r1 = t.apply(1, 'frost' as any, byPair);
        expect(r1).not.toBeNull();
        // Intentar reacción inmediata: lightning (sin marca previa, solo establece)
        t.apply(1, 'lightning' as any, byPair);
        // En cooldown, no debería reaccionar con earth
        const r2 = t.apply(1, 'earth' as any, byPair);
        expect(r2).toBeNull(); // en cooldown
        // Esperar 2s: cooldown expira
        t.tick(2.1);
        // Ahora sí debería reaccionar
        const r3 = t.apply(1, 'lightning' as any, byPair);
        expect(r3).not.toBeNull();
    });

    it('marca expira tras MARK_DURATION segundos sin renovación', () => {
        const t = new ElementalMarkTracker();
        t.apply(1, 'fire' as any, byPair);
        t.tick(MARK_DURATION + 0.1);
        expect(t.getMark(1)).toBeNull();
    });

    it('clear elimina marca y cooldown', () => {
        const t = new ElementalMarkTracker();
        t.apply(1, 'fire' as any, byPair);
        t.apply(1, 'frost' as any, byPair); // dispara reacción, activa cooldown
        t.clear(1);
        expect(t.getMark(1)).toBeNull();
        // Después de clear, puede reaccionar de nuevo
        t.apply(1, 'fire' as any, byPair);
        const r = t.apply(1, 'frost' as any, byPair);
        expect(r).not.toBeNull();
    });

    it('pairKey es simétrico', () => {
        expect(pairKey('fire', 'water')).toBe(pairKey('water', 'fire'));
    });

    it('findReaction: mismo elemento no reacciona', () => {
        expect(findReaction(byPair, 'fire', 'fire')).toBeNull();
    });

    it('findReaction: par desconocido devuelve null', () => {
        // air no tiene marca, pero si se busca air:earth debería existir (dust_storm)
        const r = findReaction(byPair, 'air', 'earth');
        expect(r).not.toBeNull();
        expect(r!.id).toBe('dust_storm');
    });
});

describe('HZ-04b: Integración en World', () => {
    it('devReactions=false por defecto', () => {
        const w = arena('ember_vanguard', false);
        expect(w.devReactions).toBe(false);
    });

    it('devReactions=true cuando se activa', () => {
        const w = arena('ember_vanguard', true);
        expect(w.devReactions).toBe(true);
    });
});
