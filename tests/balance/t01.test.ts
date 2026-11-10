import { describe, expect, it } from 'vitest';
import { buildData, rawData } from '../../scripts/balance/data';
import { BOSS_TARGET_SECONDS, START_TARGET_SECONDS, bossOf, measureDuel, measureStart, summarize } from '../../scripts/balance/t01';

const data = buildData(rawData());

describe('T01: objetivos de duración del creador (simulación, no sensación humana)', () => {
  it('nivel 1 sin equipo vence a cada monstruo de nivel 1 de la isla en 30 s o menos, con varias semillas', () => {
    const rows = measureStart(data, 4, ['malo']);
    expect(rows.length).toBe(Object.keys(data.rpg.classes).length * 4);
    for (const r of rows) {
      expect(r.n, r.label).toBe(4);
      expect(r.winRate, `${r.label}: gana`).toBe(1);
      expect(r.max, `${r.label}: segundos de la pelea más larga`).toBeLessThanOrEqual(START_TARGET_SECONDS);
    }
  }, 120_000);

  it('el presupuesto de jefe sale del daño medido y del objetivo de 5–15 min', () => {
    const rows = measureDuel(data, 2, [100]);
    expect(rows.length).toBe(Object.keys(data.rpg.classes).length);
    for (const r of rows) {
      expect(r.dps, r.label).toBeGreaterThan(0);
      expect(r.bossHealthMin).toBeCloseTo(r.dps * BOSS_TARGET_SECONDS.min, 6);
      expect(r.bossHealthMax).toBeCloseTo(r.dps * BOSS_TARGET_SECONDS.max, 6);
      expect(r.mirrorSeconds).toBeCloseTo(r.health / r.dps, 6);
    }
  }, 120_000);

  it('resume sin victorias sin inventar duraciones y elige el monstruo menos frecuente de día', () => {
    const lost = summarize('x', [{ zone: 'z', playerLevel: 1, classId: 'c', skill: 'malo', win: false, died: true, oneShot: false, seconds: 9, kills: 0, maxHitFrac: 0.5, monsterLevel: 1, xp: 0, dealt: 3 }]);
    expect(lost.winRate).toBe(0);
    expect(lost.deathRate).toBe(1);
    expect(Number.isNaN(lost.median) && Number.isNaN(lost.max) && Number.isNaN(lost.dps)).toBe(true);
    const azuero = data.zones.zones.find((z) => z.id === 'azuero')!;
    expect(azuero.spawns.find((s) => s.archetype === bossOf(azuero))!.time).not.toBe('night');
  });
});
