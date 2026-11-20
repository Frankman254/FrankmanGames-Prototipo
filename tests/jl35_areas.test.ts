import { describe, expect, it } from 'vitest';
import { updateOccupants } from '../src/sim/areas';
import type { AreaTarget } from '../src/sim/areas';

describe('updateOccupants', () => {
    function targets(ids: number[]): AreaTarget[] {
        return ids.map((id) => ({ id, pos: { x: 0, y: 0 }, radius: 1 }));
    }

    function containsAll(ids: number[]) {
        return (t: AreaTarget) => ids.includes(t.id);
    }

    it('zona vacía al inicio no reporta entradas ni salidas', () => {
        const prev = new Set<number>();
        const result = updateOccupants(prev, [], containsAll([]));
        expect(result.inside).toEqual(new Set<number>());
        expect(result.entered).toEqual([]);
        expect(result.left).toEqual([]);
    });

    it('detecta entradas cuando aparecen nuevos ocupantes', () => {
        const prev = new Set<number>();
        const t = targets([10, 20, 30]);
        const result = updateOccupants(prev, t, containsAll([10, 20, 30]));
        expect(result.inside).toEqual(new Set([10, 20, 30]));
        expect(result.entered).toEqual([10, 20, 30]);
        expect(result.left).toEqual([]);
    });

    it('detecta salidas cuando ocupantes abandonan la zona', () => {
        const prev = new Set([10, 20, 30]);
        const t = targets([10, 20, 30]);
        const result = updateOccupants(prev, t, containsAll([10]));
        expect(result.inside).toEqual(new Set([10]));
        expect(result.entered).toEqual([]);
        expect(result.left).toEqual([20, 30]);
    });

    it('detecta entradas y salidas al mismo tiempo', () => {
        const prev = new Set([10, 20]);
        const t = targets([10, 30, 40]);
        const result = updateOccupants(prev, t, containsAll([10, 30, 40]));
        expect(result.inside).toEqual(new Set([10, 30, 40]));
        expect(result.entered).toEqual([30, 40]);
        expect(result.left).toEqual([20]);
    });

    it('no reporta cambios cuando el conjunto es idéntico', () => {
        const prev = new Set([10, 20]);
        const t = targets([10, 20]);
        const result = updateOccupants(prev, t, containsAll([10, 20]));
        expect(result.inside).toEqual(new Set([10, 20]));
        expect(result.entered).toEqual([]);
        expect(result.left).toEqual([]);
    });

    it('entradas y salidas están ordenadas ascendente', () => {
        const prev = new Set([5, 100, 50]);
        const t = targets([1, 200, 50, 100]);
        const result = updateOccupants(prev, t, containsAll([1, 200, 50]));
        expect(result.entered).toEqual([1, 200]);
        expect(result.left).toEqual([5, 100]);
    });

    it('ignora duplicados de id en targets (Set los deduplica)', () => {
        const prev = new Set<number>();
        const t: AreaTarget[] = [
            { id: 1, pos: { x: 0, y: 0 }, radius: 1 },
            { id: 1, pos: { x: 0, y: 0 }, radius: 1 },
        ];
        const result = updateOccupants(prev, t, containsAll([1]));
        expect(result.inside).toEqual(new Set([1]));
        expect(result.entered).toEqual([1]);
    });

    it('toda la zona sale y entra de nuevo', () => {
        const prev = new Set([10, 20]);
        const t = targets([10, 20]);
        const result = updateOccupants(prev, t, containsAll([]));
        expect(result.inside).toEqual(new Set<number>());
        expect(result.entered).toEqual([]);
        expect(result.left).toEqual([10, 20]);
    });

    it('previous es ReadonlySet y no se modifica', () => {
        const prev = new Set([10]);
        const t = targets([10, 20]);
        updateOccupants(prev, t, containsAll([10, 20]));
        expect(prev.size).toBe(1);
        expect(prev.has(10)).toBe(true);
    });
});
