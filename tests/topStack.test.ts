import { describe, expect, it } from 'vitest';
import { stackTops } from '../src/ui/menus/topStack';

describe('Q04: una sola cola arriba en el centro', () => {
  it('cada visible empieza debajo del anterior, sin solapes', () => {
    const items = [
      { visible: true, pinned: false, height: 26 },
      { visible: true, pinned: false, height: 52 },
      { visible: true, pinned: false, height: 30 },
    ];
    const tops = stackTops(items, 10, 6) as number[];
    expect(tops).toEqual([10, 42, 100]);
    for (let i = 1; i < tops.length; i++) expect(tops[i]!).toBeGreaterThanOrEqual(tops[i - 1]! + items[i - 1]!.height);
  });

  it('los ocultos y los movidos a mano no ocupan sitio ni se recolocan', () => {
    const tops = stackTops([
      { visible: true, pinned: false, height: 20 },
      { visible: false, pinned: false, height: 400 },
      { visible: true, pinned: true, height: 400 },
      { visible: true, pinned: false, height: 10 },
    ], 10, 6);
    expect(tops).toEqual([10, null, null, 36]);
  });
});
