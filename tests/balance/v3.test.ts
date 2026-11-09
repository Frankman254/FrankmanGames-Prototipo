import { describe, expect, it } from 'vitest';
import { buildData, rawData } from '../../scripts/balance/data';
import { buildAcquisitionIndex, obtainableSources } from '../../scripts/balance/v3/acquisition';
import { BRIZNAS_VARIANTS, PROGRESSION_VARIANTS, briznasCapacity, compareDoubleScaling, cumulativeTierCost, progressionAt } from '../../scripts/balance/v3/experiments';
import { migrationCapital, previewV1Migration } from '../../scripts/balance/v3/migration';
import { buildProfile, generateProfiles, profileCoverage } from '../../scripts/balance/v3/profiles';
import { Character } from '../../src/rpg/character';
import { Rng } from '../../src/sim/rng';

const data = buildData(rawData());

describe('V3: procedencia y perfiles aislados', () => {
  const index = buildAcquisitionIndex(data);

  it('distingue requisito de nivel de ruta demostrable', () => {
    const bow = data.rpg.items.reed_bow!;
    expect(obtainableSources(index, bow, 'mangrove_hunter', 1).some((s) => s.kind === 'starting')).toBe(true);
    expect(obtainableSources(index, bow, 'ember_vanguard', 1).some((s) => s.kind === 'merchant')).toBe(true);
    const high = Object.values(data.rpg.items).find((x) => x.level > 20)!;
    expect(obtainableSources(index, high, 'ember_vanguard', 20)).toEqual([]);
  });

  it('genera todas las clases, builds, niveles y tres estratos de equipo', () => {
    const ps = generateProfiles(data);
    const coverage = profileCoverage(data, ps);
    expect(coverage.total).toBeGreaterThan(200);
    for (const id of Object.keys(data.rpg.classes)) expect(coverage.byClass[id]).toBeGreaterThan(0);
    expect(coverage.playable).toBeGreaterThan(0);
    expect(coverage.hypothetical).toBeGreaterThan(0);
    expect(new Set(ps.map((p) => p.seed)).size).toBe(ps.length);
  });

  it('monta un perfil optimizado sólo con equipo obtenido y legal por nivel', () => {
    const p = generateProfiles(data).find((x) => x.classId === 'mangrove_hunter' && x.level >= 15 && x.band.territory === 'playable' && x.build === 'balanced' && x.equipmentTier === 'optimized-obtainable')!;
    const built = buildProfile(data, p, index);
    expect(built.session.character.level).toBe(p.level);
    expect(built.session.character.unspentStatPoints).toBe(0);
    expect(built.equipment.length).toBeGreaterThan(0);
    for (const e of built.equipment) {
      expect(e.source.implemented).toBe(true);
      expect(data.rpg.items[e.itemId]!.level).toBeLessThanOrEqual(p.level);
    }
  });
});

describe('V3: experimentos no productivos', () => {
  it('fija los límites de paliers 100/101/200/201', () => {
    expect(cumulativeTierCost(100)).toBe(100);
    expect(cumulativeTierCost(101)).toBe(102);
    expect(cumulativeTierCost(200)).toBe(300);
    expect(cumulativeTierCost(201)).toBe(303);
  });

  it('mantiene actual y propuestas como variantes separadas', () => {
    expect(progressionAt(200, PROGRESSION_VARIANTS[0]!)).toEqual({ capital: 597, health: 0, briznas: 0 });
    expect(progressionAt(200, PROGRESSION_VARIANTS[1]!)).toEqual({ capital: 995, health: 995, briznas: 995 });
    expect(briznasCapacity(1, 0, BRIZNAS_VARIANTS[0]!)).toBe(1500);
  });

  it('cuantifica, sin corregirlo, el doble escalado actual', () => {
    const r = compareDoubleScaling(20, 0.6, 100, 100, 0, 10);
    expect(r.current).toBeGreaterThan(r.noDoubleScaling);
    expect(r.duplicateGain).toBe(r.current - r.noDoubleScaling);
  });
});

describe('V3: previsualización de migración v1', () => {
  it('no muta el guardado y separa tres políticas de capital', () => {
    const save = Character.create(data.rpg, 'ember_vanguard', 'V1', new Rng(1)).toSave(new Date('2026-11-09T00:00:00Z'));
    save.level = 100;
    save.allocated = { strength: 101, vitality: 20 };
    save.unspentStatPoints = 7;
    const before = structuredClone(save);
    const preview = previewV1Migration(save);
    expect(save).toEqual(before);
    expect(preview.historicSpent).toBe(121);
    expect(preview.tieredEquivalent).toBe(122);
    expect(migrationCapital(preview, 'preserve-units')).toBe(7);
    expect(migrationCapital(preview, 'refund-historic-capital')).toBe(128);
    expect(migrationCapital(preview, 'grant-tiered-equivalent')).toBe(129);
  });
});
