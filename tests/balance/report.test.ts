import { describe, expect, it } from 'vitest';
import { keyMetrics, verdictOf } from '../../scripts/balance/analysis';
import { aggregate, measure, type BatteryOptions } from '../../scripts/balance/battery';
import { buildData, rawData } from '../../scripts/balance/data';
import { farmRun, fishRun, priceList } from '../../scripts/balance/economy';
import { applyProposals, PROPOSALS } from '../../scripts/balance/proposals';
import { renderReport } from '../../scripts/balance/report';
import { runScenario, SCENARIOS } from '../../scripts/balance/scenarios';
import { decode, encode } from '../../scripts/balance/serial';
import { loadGameData } from '../../src/data';

describe('ajustes propuestos', () => {
  it('se aplican a una copia: los datos de data/ no cambian', () => {
    const before = JSON.stringify(rawData());
    const raw = rawData();
    const changes = applyProposals(
      raw,
      PROPOSALS.map((p) => p.id),
    );
    expect(changes.length).toBeGreaterThan(10);
    expect(JSON.stringify(rawData())).toBe(before);
    expect(JSON.stringify(raw)).not.toBe(before);
    // Lo que carga el juego sigue igual.
    expect(loadGameData().rpg.progression.xp.base).toBe(rawData().rpg.progression.xp.base);
  });

  it('cada cambio apunta el valor de antes y el nuevo, y los datos siguen siendo válidos', () => {
    for (const p of PROPOSALS) {
      const raw = rawData();
      const changes = p.apply(raw);
      expect(changes.length, p.id).toBeGreaterThan(0);
      for (const c of changes) expect(c.from, `${p.id} ${c.path}`).not.toEqual(c.to);
      expect(() => buildData(raw), p.id).not.toThrow();
    }
  });

  it('un ajuste desconocido falla en vez de ignorarse', () => {
    expect(() => applyProposals(rawData(), ['no-existe'])).toThrow();
  });
});

describe('mediciones', () => {
  const data = buildData(rawData());

  it('agrega victorias, tiempos y lanzamientos', () => {
    const sc = SCENARIOS.find((s) => s.id === 'lobos3')!;
    const rs = [1, 2].map((seed) => runScenario(data, { scenario: sc, classId: 'storm_weaver', skill: 'medio', prep: 'inicial', seed }));
    const a = aggregate(rs);
    expect(a.n).toBe(2);
    expect(a.winRate).toBe(1);
    expect(a.ttk).toBeGreaterThan(0);
    expect(a.dps).toBeGreaterThan(0);
    expect(Object.values(a.casts).reduce((x, y) => x + y, 0)).toBeGreaterThan(0);
    expect(a.lost).toBeLessThanOrEqual(a.taken + 1e-9);
  });

  it('la granja sube de nivel, gana oro y apunta el botín', () => {
    const f = farmRun(data, 'ember_vanguard', 'medio', 1, 3);
    expect(f.checkpoints.map((c) => c.minute)).toEqual([1, 2, 3]);
    expect(f.finalLevel).toBeGreaterThan(2);
    expect(f.levelAt[2]).toBeGreaterThan(0);
    expect(f.coins + f.sales).toBeGreaterThan(0);
    expect(Object.values(f.drops).reduce((x, y) => x + y, 0)).toBeGreaterThan(0);
  });

  it('pescar reaccionando más saca más peces', () => {
    const slow = fishRun(data, 0.2, 1, 3);
    const fast = fishRun(data, 1, 1, 3);
    expect(fast.catches).toBeGreaterThan(slow.catches);
    expect(fast.gold).toBeGreaterThan(0);
  });

  it('la lista de precios sale de los mercaderes', () => {
    const rows = priceList(data);
    const stock = Object.values(data.rpg.merchants).reduce((x, m) => x + m.stock.length, 0);
    expect(rows.length).toBe(stock);
    expect(rows.every((r) => r.price >= 1)).toBe(true);
  });

  it('veredictos de hechizos', () => {
    expect(verdictOf(0.2, 0, 0, 0, 0.1)).toBe('obligatorio');
    expect(verdictOf(0, 0, 0, -0.2, 0.1)).toBe('obligatorio');
    expect(verdictOf(0.06, 0, 0, 0, 0.1)).toBe('importante');
    // +100 % de vida perdida sobre 2 puntos es ruido.
    expect(verdictOf(0, 1, 2, 0, 0.03)).toBe('prescindible');
    expect(verdictOf(0, 1, 20, 0, 0.03)).toBe('importante');
  });

  it('NaN e Infinity sobreviven al paso entre procesos', () => {
    const v = decode<{ a: number; b: number[] }>(encode({ a: NaN, b: [1, Infinity] }));
    expect(Number.isNaN(v.a)).toBe(true);
    expect(v.b).toEqual([1, Infinity]);
  });

  it('el informe sale con todas las secciones (batería mínima)', () => {
    const tiny: BatteryOptions = { seeds: 1, sideSeeds: 1, farmMinutes: 2, farmSeeds: 1, fishMinutes: 1, skip: { ablation: true, ladder: true } };
    const m = measure(data, tiny);
    const v = { data, m, k: keyMetrics(data, m) };
    const md = renderReport(
      {
        base: v,
        proposed: { ...v, changes: [] },
        quickBase: v,
        isolated: PROPOSALS.map((p) => ({ proposal: p, changes: p.apply(rawData()), v })),
        wallSeconds: 1,
        dataHash: 'prueba',
      },
      '2026-10-30',
    );
    for (const h of ['## Resumen', '## 1. Cómo se midió', '## 2. Clases', '## 3. Hechizos', '## 4.', '## 5. Progresión', '## 6. Botín', '## 7. Economía', '## 8. Ajustes propuestos', '## 9.']) {
      expect(md, h).toContain(h);
    }
    expect(md).not.toContain('undefined');
  }, 30_000);
});
