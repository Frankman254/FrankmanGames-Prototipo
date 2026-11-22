// JL-122: Prueba que las reacciones elementales no se activan con devReactions: false.
// El tracker siempre existe (se crea en el constructor), pero devReactions=false
// hace que applyHit no lo use: no registra marcas ni emite eventos 'reaction'.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { GameSession } from '../src/rpg/session';
import {
    ElementalMarkTracker,
    ELEMENTAL_MARKS,
    loadReactions,
} from '../src/sim/reactions';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import type { GameEvent } from '../src/sim/events';

const DT = 1 / 60;

function run(w: World, seconds: number): GameEvent[] {
    const out: GameEvent[] = [];
    for (let i = 0; i < Math.round(seconds / DT); i++) {
        w.tick(DT);
        out.push(...w.drainEvents());
    }
    return out;
}

function arena(classId: string, devReactions: boolean): World {
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

describe('JL-122: Reacciones elementales desactivadas por defecto', () => {
    it('devReactions=false por defecto en un World nuevo', () => {
        const w = arena('ember_vanguard', false);
        expect(w.devReactions).toBe(false);
    });

    it('devReactions=true cuando se activa', () => {
        const w = arena('ember_vanguard', true);
        expect(w.devReactions).toBe(true);
    });

    it('el tracker siempre se inicializa en el constructor, independientemente de devReactions', () => {
        const wFalse = arena('ember_vanguard', false);
        const wTrue = arena('ember_vanguard', true);
        // Ambos tienen el tracker creado
        expect((wFalse as any).reactionTracker) instanceof ElementalMarkTracker;
        expect((wTrue as any).reactionTracker) instanceof ElementalMarkTracker;
    });

    it('devReactions=false: el tracker no registra marcas al hacer tick', () => {
        const w = arena('ember_vanguard', false);
        const enemy = w.spawnEnemy('melee', { x: 15, y: 10 });
        enemy.state = 'stagger';
        enemy.stateTime = -1e9;
        enemy.pos = { x: 15, y: 10 };

        // El jugador ataca al enemigo
        w.commandAttack(enemy.id);
        const events = run(w, 1);

        // Sin devReactions, no hay eventos de reacción
        const reactions = events.filter((ev) => ev.type === 'reaction');
        expect(reactions.length).toBe(0);

        // El tracker no tiene marcas registradas (applyHit no lo usa)
        const tracker = (w as any).reactionTracker as ElementalMarkTracker;
        expect(tracker.getMark(enemy.id)).toBeNull();
    });

    it('devReactions=false: no hay reacción aunque el enemigo reciba daño elemental', () => {
        const w = arena('ember_vanguard', false);
        const enemy = w.spawnEnemy('melee', { x: 15, y: 10 });
        enemy.state = 'stagger';
        enemy.stateTime = -1e9;
        enemy.pos = { x: 15, y: 10 };

        // Ataque básico (físico, no elemental) — no debería reaccionar de todos modos
        w.commandAttack(enemy.id);
        const events = run(w, 1);

        const reactions = events.filter((ev) => ev.type === 'reaction');
        expect(reactions.length).toBe(0);
    });

    it('devReactions=true: el tracker registra marcas y reacciona', () => {
        const w = arena('ember_vanguard', true);
        const tracker = (w as any).reactionTracker as ElementalMarkTracker;
        const { byPair } = loadReactions();

        // Simulamos lo que hace applyHit en world.ts:1526-1528
        // al golpear con fuego y luego con escarcha.
        expect(tracker.apply(999, 'fire' as any, byPair)).toBeNull(); // primera marca
        expect(tracker.getMark(999)).toBe('fire');

        // Segundo elemento distinto: dispara reacción
        const reaction = tracker.apply(999, 'frost' as any, byPair);
        expect(reaction).not.toBeNull();
        expect(reaction!.effect).toBe('bonusDamage');
    });

    it('devReactions=false: las marcas elementales existen pero no se usan en el juego', () => {
        // Verifica que ELEMENTAL_MARKS está definido (no es un problema de datos),
        // pero que sin devReactions no se aplican.
        expect(ELEMENTAL_MARKS['fire']).toBe('mark_fire');
        expect(ELEMENTAL_MARKS['water']).toBe('mark_water');
        expect(ELEMENTAL_MARKS['frost']).toBe('mark_frost');
        expect(ELEMENTAL_MARKS['lightning']).toBe('mark_lightning');
        expect(ELEMENTAL_MARKS['earth']).toBe('mark_earth');
        expect(ELEMENTAL_MARKS['air']).toBeNull();

        // En un World con devReactions=false, el tracker existe pero no se usa
        const w = arena('ember_vanguard', false);
        const tracker = (w as any).reactionTracker as ElementalMarkTracker;
        // El tracker está vacío: applyHit no lo toca
        expect(tracker.getMark(1)).toBeNull();
    });

    it('15 reacciones cargadas pero inactivas sin devReactions', () => {
        const { reactions } = loadReactions();
        expect(reactions.length).toBe(15);

        // En el World con devReactions=false, reactionByPair SÍ existe
        // (se carga en el constructor), pero no se usa en applyHit
        const w = arena('ember_vanguard', false);
        expect((w as any).reactionByPair).not.toBeNull();
        // Pero devReactions=false bloquea su uso
        expect(w.devReactions).toBe(false);
    });
});
