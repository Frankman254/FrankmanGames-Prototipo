import { describe, expect, it } from 'vitest';
import { driftOffset, seaLevelAt } from '../src/render/seaView';

describe('mar', () => {
  it('la marea oscila alrededor del nivel del mar, sin alejarse', () => {
    const values = Array.from({ length: 200 }, (_, i) => seaLevelAt(-8, i * 0.1));
    expect(Math.max(...values)).toBeLessThanOrEqual(-7.7);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-8.3);
    expect(Math.max(...values)).toBeGreaterThan(-8);
  });

  it('el desplazamiento de las olas queda en una repetición aunque pasen horas', () => {
    for (const rate of [0.012, -0.017]) {
      for (const t of [0, 10, 3600, 86400]) {
        const v = driftOffset(rate, t);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });
});
