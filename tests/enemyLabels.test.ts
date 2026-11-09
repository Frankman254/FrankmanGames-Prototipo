import { describe, expect, it } from 'vitest';
import { visibleEnemyLabelIds } from '../src/render/enemyLabels';

describe('rótulos de enemigos', () => {
  it('limita el ruido visual y conserva el objetivo', () => {
    const enemies = [
      { id: 1, state: 'pursue', pos: { x: 1, y: 0 } },
      { id: 2, state: 'pursue', pos: { x: 2, y: 0 } },
      { id: 3, state: 'dead', pos: { x: 0, y: 0 } },
      { id: 4, state: 'pursue', pos: { x: 40, y: 0 } },
      { id: 5, state: 'pursue', pos: { x: 3, y: 0 } },
    ];

    expect([...visibleEnemyLabelIds(enemies, { x: 0, y: 0 }, 4)]).toEqual([4, 1]);
  });
});
