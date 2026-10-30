import { describe, expect, it } from 'vitest';
import { StatSheet } from '../../src/rpg/stats';

describe('StatSheet', () => {
  it('suma planos y multiplica por (1 + Σ%/100), con desglose por fuente', () => {
    const s = new StatSheet();
    s.set('class', [{ stat: 'strength', op: 'flat', value: 10 }]);
    s.set('item:a', [{ stat: 'strength', op: 'flat', value: 5 }]);
    s.set('status:x', [{ stat: 'strength', op: 'percent', value: 20 }]);
    expect(s.get('strength')).toBeCloseTo(18);
    const line = s.line('strength');
    expect(line.breakdown.map((b) => b.source)).toEqual(['class', 'item:a', 'status:x']);
    s.remove('status:x');
    expect(s.get('strength')).toBe(15);
    s.removePrefix('item:');
    expect(s.get('strength')).toBe(10);
    expect(s.get('agility')).toBe(0);
  });

  it('las reglas derivadas salen de las primarias y aparecen en el desglose', () => {
    const s = new StatSheet([{ from: 'vitality', to: 'maxHealth', op: 'flat', per: 5 }]);
    s.set('class', [
      { stat: 'vitality', op: 'flat', value: 4 },
      { stat: 'maxHealth', op: 'flat', value: 50 },
    ]);
    expect(s.get('maxHealth')).toBe(70);
    s.set('points', [{ stat: 'vitality', op: 'flat', value: 2 }]);
    expect(s.get('maxHealth')).toBe(80);
    expect(s.line('maxHealth').breakdown).toContainEqual({ source: 'derived:vitality', op: 'flat', value: 30 });
  });

  it('versión y clon independientes', () => {
    const s = new StatSheet();
    const v = s.version;
    s.set('a', [{ stat: 'pickupRadius', op: 'flat', value: 3 }]);
    expect(s.version).toBeGreaterThan(v);
    const c = s.clone();
    c.set('b', [{ stat: 'pickupRadius', op: 'flat', value: 2 }]);
    expect(s.get('pickupRadius')).toBe(3);
    expect(c.get('pickupRadius')).toBe(5);
  });

  it('la hoja lista primarias y derivadas, y los elementos sólo si no son 0', () => {
    const s = new StatSheet();
    expect(s.lines().some((l) => l.stat === 'resist.fire')).toBe(false);
    s.set('x', [{ stat: 'resist.fire', op: 'flat', value: 10 }]);
    expect(s.lines().find((l) => l.stat === 'resist.fire')?.value).toBe(10);
    expect(s.lines()[0]!.stat).toBe('strength');
  });
});
