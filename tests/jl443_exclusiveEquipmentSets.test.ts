import { describe, expect, it } from 'vitest';
import itemsRaw from '../data/rpg/items.json' with { type: 'json' };

type ItemWithSet = { setId?: string; [key: string]: unknown };

function piecesBySet(items: Record<string, ItemWithSet>): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const [itemId, item] of Object.entries(items)) {
        if (!item.setId) continue;
        const pieces = result.get(item.setId) ?? [];
        pieces.push(itemId);
        result.set(item.setId, pieces);
    }
    return result;
}

function sharedPieces(sets: ReadonlyMap<string, readonly string[]>): string[] {
    const setIdsByPiece = new Map<string, Set<string>>();
    for (const [setId, pieces] of sets) {
        for (const pieceId of pieces) {
            const setIds = setIdsByPiece.get(pieceId) ?? new Set<string>();
            setIds.add(setId);
            setIdsByPiece.set(pieceId, setIds);
        }
    }

    return [...setIdsByPiece]
        .filter(([, setIds]) => setIds.size > 1)
        .map(([pieceId, setIds]) => `${pieceId}: ${[...setIds].sort().join(', ')}`)
        .sort();
}

describe('JL-443: piezas exclusivas de cada set de equipo', () => {
    it('ninguna pieza del catálogo pertenece a más de un set', () => {
        const shared = sharedPieces(piecesBySet(itemsRaw.items));

        expect(shared, `piezas compartidas entre sets:\n${shared.join('\n')}`).toEqual([]);
    });

    it('detecta una pieza asignada a dos sets distintos', () => {
        const shared = sharedPieces(
            new Map([
                ['set_a', ['pieza_compartida']],
                ['set_b', ['pieza_compartida']],
            ]),
        );

        expect(shared).toEqual(['pieza_compartida: set_a, set_b']);
    });
});
