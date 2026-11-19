import { describe, expect, it } from 'vitest';
import { updateOccupants } from '../src/sim/areas';
import {
    createLabEconomy,
    DEFAULT_LAB_RULES,
    positioningMultiplier,
    spendCadence,
    spendImpetus,
    tickLabEconomy,
} from '../src/sim/combatLab';
import { activeField, advanceField, createField, fieldHits } from '../src/sim/fields';
import { labShapeHitsCircle, selectChain, type PlacedLabShape } from '../src/sim/labShapes';
import { ElementalMarkTracker, findReaction, loadReactions, pairKey } from '../src/sim/reactions';

describe('geometrías del laboratorio', () => {
    const placed = (def: PlacedLabShape['def'], elapsed = 0): PlacedLabShape => ({
        def,
        origin: { x: 0, y: 0 },
        dir: 0,
        elapsed,
    });

    it('resuelve anillo, onda, explosión demorada y zona creciente', () => {
        expect(labShapeHitsCircle(placed({ type: 'ring', innerRadius: 2, outerRadius: 4 }), { x: 3, y: 0 })).toBe(true);
        expect(labShapeHitsCircle(placed({ type: 'ring', innerRadius: 2, outerRadius: 4 }), { x: 1, y: 0 })).toBe(
            false,
        );
        expect(labShapeHitsCircle(placed({ type: 'wave', radius: 5, thickness: 2 }), { x: 5.5, y: 0 })).toBe(true);
        expect(labShapeHitsCircle(placed({ type: 'delayed', radius: 3, delay: 1 }, 0.9), { x: 1, y: 0 })).toBe(false);
        expect(labShapeHitsCircle(placed({ type: 'delayed', radius: 3, delay: 1 }, 1), { x: 1, y: 0 })).toBe(true);
        expect(
            labShapeHitsCircle(placed({ type: 'growing', startRadius: 1, endRadius: 5, duration: 2 }, 1), {
                x: 3,
                y: 0,
            }),
        ).toBe(true);
    });

    it('resuelve zigzag, espiral, vínculo y sectores rotatorios', () => {
        expect(
            labShapeHitsCircle(
                placed({ type: 'zigzag', length: 8, width: 0.6, amplitude: 1, segments: 4 }),
                { x: 2, y: 1 },
                0.1,
            ),
        ).toBe(true);
        expect(
            labShapeHitsCircle(placed({ type: 'spiral', radius: 5, width: 0.8, turns: 2 }), { x: 0, y: 0 }, 0.1),
        ).toBe(true);
        expect(
            labShapeHitsCircle({ ...placed({ type: 'tether', width: 1 }), end: { x: 8, y: 0 } }, { x: 4, y: 0.4 }),
        ).toBe(true);
        expect(
            labShapeHitsCircle(
                placed({ type: 'rotatingSectors', length: 6, angleDeg: 30, sectors: 2, radiansPerSecond: 1 }),
                { x: 4, y: 0 },
            ),
        ).toBe(true);
    });

    it('elige una cadena determinista sin repetir objetivos', () => {
        const chain = selectChain(
            { x: 0, y: 0 },
            [
                { id: 2, pos: { x: 2, y: 0 } },
                { id: 1, pos: { x: 2, y: 0 } },
                { id: 3, pos: { x: 5, y: 0 } },
            ],
            3,
            3.1,
        );
        expect(chain.map((x) => x.id)).toEqual([1, 2, 3]);
    });
});

describe('campos y áreas persistentes', () => {
    it('avanza pulsos y usa la edad en una onda creciente', () => {
        const field = createField(
            { shape: { type: 'growing', startRadius: 1, endRadius: 5, duration: 2 }, duration: 2, pulseEvery: 0.5 },
            { x: 0, y: 0 },
        );
        expect(advanceField(field, 1)).toBe(3);
        expect(fieldHits(field, { x: 3, y: 0 })).toBe(true);
        advanceField(field, 1);
        expect(activeField(field)).toBe(false);
    });

    it('informa entradas y salidas en orden estable', () => {
        const result = updateOccupants(
            new Set([1, 2]),
            [
                { id: 2, pos: { x: 0, y: 0 }, radius: 1 },
                { id: 3, pos: { x: 1, y: 0 }, radius: 1 },
            ],
            () => true,
        );
        expect(result.entered).toEqual([3]);
        expect(result.left).toEqual([1]);
    });
});

describe('reacciones elementales', () => {
    it('son simétricas y consumen la exposición al reaccionar', () => {
        const { byPair } = loadReactions();
        const r1 = findReaction(byPair, 'fire', 'frost');
        const r2 = findReaction(byPair, 'frost', 'fire');
        expect(r1?.id).toBe(r2?.id);
        expect(r1).not.toBeNull();
        const tracker = new ElementalMarkTracker();
        expect(tracker.apply(1, 'fire' as any, byPair)).toBeNull();
        expect(tracker.apply(1, 'frost' as any, byPair)?.id).toBe(r1!.id);
        expect(tracker.apply(1, 'lightning' as any, byPair)).toBeNull();
    });
});

describe('economías tácticas A/B/C', () => {
    it('Cadencia e Ímpetu son activables, consumibles y regeneran', () => {
        const rules = structuredClone(DEFAULT_LAB_RULES);
        const state = createLabEconomy(rules);
        expect(spendCadence(state, rules, true)).toBe(true);
        expect(spendImpetus(state, rules, 'teleport')).toBe(true);
        const spent = { ...state };
        tickLabEconomy(state, rules, 1);
        expect(state.cadence).toBeGreaterThan(spent.cadence);
        expect(state.impetus).toBeGreaterThan(spent.impetus);
        rules.cadence.enabled = false;
        state.cadence = 0;
        expect(spendCadence(state, rules, true)).toBe(true);
    });

    it('Posicionamiento premia flanco, alineación y separación sin barra', () => {
        const multiplier = positioningMultiplier(
            { x: -6, y: 0 },
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 6, y: 0 },
            DEFAULT_LAB_RULES,
        );
        expect(multiplier).toBeGreaterThan(1.2);
    });
});
