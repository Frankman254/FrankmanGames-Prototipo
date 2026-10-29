import { describe, expect, it } from 'vitest';
import { FixedStepClock } from '../src/sim/loop';
import { FrameStats } from '../src/sim/frameStats';

describe('FixedStepClock', () => {
  it('acumula fracciones y ejecuta ticks enteros', () => {
    const c = new FixedStepClock(60);
    const a = c.advance(1 / 120);
    expect(a.steps).toBe(0);
    expect(a.alpha).toBeCloseTo(0.5);
    const b = c.advance(1 / 120);
    expect(b.steps).toBe(1);
    expect(b.alpha).toBeCloseTo(0, 6);
  });

  it('el número total de ticks no depende del ritmo de fotogramas', () => {
    const fast = new FixedStepClock(60);
    const slow = new FixedStepClock(60);
    let nFast = 0;
    let nSlow = 0;
    for (let i = 0; i < 144; i++) nFast += fast.advance(1 / 144).steps;
    for (let i = 0; i < 30; i++) nSlow += slow.advance(1 / 30).steps;
    expect(nFast).toBeGreaterThanOrEqual(59);
    expect(nFast).toBeLessThanOrEqual(60);
    expect(nSlow).toBeGreaterThanOrEqual(59);
    expect(nSlow).toBeLessThanOrEqual(60);
  });

  it('limita los ticks tras un parón y descarta el resto', () => {
    const c = new FixedStepClock(60, 5);
    const r = c.advance(1);
    expect(r.steps).toBe(5);
    expect(r.droppedSeconds).toBeCloseTo(55 / 60);
    expect(r.alpha).toBeGreaterThanOrEqual(0);
    expect(r.alpha).toBeLessThan(1);
  });
});

describe('FrameStats', () => {
  it('calcula media y p95 en una ventana deslizante', () => {
    const s = new FrameStats(100);
    for (let i = 1; i <= 100; i++) s.push(i);
    expect(s.mean()).toBeCloseTo(50.5);
    expect(s.percentile(95)).toBe(95);
    for (let i = 0; i < 100; i++) s.push(10);
    expect(s.mean()).toBe(10);
  });
});
