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

describe('estanques con fondo', () => {
  it('el agua es clara y transparente en la orilla y oscura y opaca en el centro', async () => {
    const { pondColor } = await import('../src/render/waterView');
    const center = pondColor(0);
    const edge = pondColor(1);
    expect(center[3]).toBeGreaterThan(edge[3]);
    expect(center[0] + center[1] + center[2]).toBeLessThan(edge[0] + edge[1] + edge[2]);
    expect(pondColor(2)).toEqual(edge);
  });
});
