import { describe, it, expect } from 'vitest';
import { ladderCells } from '../src/ui/menus/spellbook';
import type { RankLadderStep } from '../src/rpg/spellRank';

/**
 * HZ-UI-01: la escalera compacta del libro muestra sólo niveles en una línea.
 * `ladderCells` decide qué tramo va resaltado (rango actual), atenuado (futuro)
 * o normal (pasado). El detalle («Rango r · nivel n») se queda en el tooltip.
 */
describe('HZ-UI-01: ladderCells', () => {
    const steps: RankLadderStep[] = [
        { rank: 1, level: 1 },
        { rank: 2, level: 17 },
        { rank: 3, level: 41 },
        { rank: 4, level: 81 },
        { rank: 5, level: 131 },
        { rank: 6, level: 181 },
    ];

    it('resalta el rango actual y atenúa los futuros', () => {
        const cells = ladderCells(steps, 3);
        expect(cells.map((c) => c.cls)).toEqual(['', '', '.current', '.future', '.future', '.future']);
    });

    it('con rango 1 el primero va actual y el resto futuro', () => {
        const cells = ladderCells(steps, 1);
        expect(cells[0]!.cls).toBe('.current');
        expect(cells.slice(1).every((c) => c.cls === '.future')).toBe(true);
    });

    it('sin rango conocido (hechizo no aprendido) todo va como futuro', () => {
        expect(ladderCells(steps).every((c) => c.cls === '.future')).toBe(true);
        expect(ladderCells(steps, undefined).every((c) => c.cls === '.future')).toBe(true);
    });

    it('los niveles salen en orden, sin duplicados, para poder unirlas con punto', () => {
        const levels = ladderCells(steps, 2).map((c) => c.level);
        expect(levels).toEqual([1, 17, 41, 81, 131, 181]);
        expect(new Set(levels).size).toBe(levels.length);
    });

    it('un solo peldaño (maxRank 1) se marca actual si hay rango', () => {
        expect(ladderCells([{ rank: 1, level: 10 }], 1)).toEqual([{ level: 10, cls: '.current' }]);
    });
});
