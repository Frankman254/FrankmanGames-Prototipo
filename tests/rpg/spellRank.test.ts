// D-01a: Rango automático por nivel — pruebas de la función pura y la integración.
import { describe, it, expect } from 'vitest';
import { rankAtLevel, effectiveRank, type SpellRankConfig } from '../../src/rpg/spellRank';
import { Character } from '../../src/rpg/character';
import { Rng } from '../../src/sim/rng';
import { content, hero } from './helpers';

const cfg: SpellRankConfig = {
  '5': [0.10, 0.25, 0.50, 0.90],
  '3': [0.30, 0.80],
};

describe('rankAtLevel — función pura', () => {
  it('hechizo de maxRank 5, aprendido en nivel 1, con maxLevel 200', () => {
    const def = { unlockLevel: 1, maxRank: 5 };
    // Tabla de 03: nivel 1 → rangos 21 · 51 · 101 · 181
    expect(rankAtLevel(def, 1, 200, cfg)).toBe(1);
    expect(rankAtLevel(def, 20, 200, cfg)).toBe(1);
    expect(rankAtLevel(def, 21, 200, cfg)).toBe(2);
    expect(rankAtLevel(def, 50, 200, cfg)).toBe(2);
    expect(rankAtLevel(def, 51, 200, cfg)).toBe(3);
    expect(rankAtLevel(def, 100, 200, cfg)).toBe(3);
    expect(rankAtLevel(def, 101, 200, cfg)).toBe(4);
    expect(rankAtLevel(def, 180, 200, cfg)).toBe(4);
    expect(rankAtLevel(def, 181, 200, cfg)).toBe(5);
    expect(rankAtLevel(def, 200, 200, cfg)).toBe(5);
  });

  it('hechizo de maxRank 5, aprendido en nivel 20, con maxLevel 200', () => {
    const def = { unlockLevel: 20, maxRank: 5 };
    // Tabla de 03: nivel 20 → rangos 38 · 65 · 110 · 182
    expect(rankAtLevel(def, 20, 200, cfg)).toBe(1);
    expect(rankAtLevel(def, 37, 200, cfg)).toBe(1);
    expect(rankAtLevel(def, 38, 200, cfg)).toBe(2);
    expect(rankAtLevel(def, 64, 200, cfg)).toBe(2);
    expect(rankAtLevel(def, 65, 200, cfg)).toBe(3);
    expect(rankAtLevel(def, 109, 200, cfg)).toBe(3);
    expect(rankAtLevel(def, 110, 200, cfg)).toBe(4);
    expect(rankAtLevel(def, 181, 200, cfg)).toBe(4);
    expect(rankAtLevel(def, 182, 200, cfg)).toBe(5);
    expect(rankAtLevel(def, 200, 200, cfg)).toBe(5);
  });

  it('hechizo de maxRank 3, aprendido en nivel 1, con maxLevel 200', () => {
    const def = { unlockLevel: 1, maxRank: 3 };
    // Tabla de 03: nivel 1 → rangos 61 · 161
    expect(rankAtLevel(def, 1, 200, cfg)).toBe(1);
    expect(rankAtLevel(def, 60, 200, cfg)).toBe(1);
    expect(rankAtLevel(def, 61, 200, cfg)).toBe(2);
    expect(rankAtLevel(def, 160, 200, cfg)).toBe(2);
    expect(rankAtLevel(def, 161, 200, cfg)).toBe(3);
    expect(rankAtLevel(def, 200, 200, cfg)).toBe(3);
  });

  it('hechizo de maxRank 5, aprendido en nivel 1, con maxLevel 400', () => {
    const def = { unlockLevel: 1, maxRank: 5 };
    // Tabla de 03: nivel 1 → rangos 41 · 101 · 201 · 361
    expect(rankAtLevel(def, 1, 400, cfg)).toBe(1);
    expect(rankAtLevel(def, 40, 400, cfg)).toBe(1);
    expect(rankAtLevel(def, 41, 400, cfg)).toBe(2);
    expect(rankAtLevel(def, 100, 400, cfg)).toBe(2);
    expect(rankAtLevel(def, 101, 400, cfg)).toBe(3);
    expect(rankAtLevel(def, 200, 400, cfg)).toBe(3);
    expect(rankAtLevel(def, 201, 400, cfg)).toBe(4);
    expect(rankAtLevel(def, 360, 400, cfg)).toBe(4);
    expect(rankAtLevel(def, 361, 400, cfg)).toBe(5);
    expect(rankAtLevel(def, 400, 400, cfg)).toBe(5);
  });

  it('hechizo de maxRank 3, aprendido en nivel 1, con maxLevel 400', () => {
    const def = { unlockLevel: 1, maxRank: 3 };
    // Tabla de 03: nivel 1 → rangos 121 · 321
    expect(rankAtLevel(def, 1, 400, cfg)).toBe(1);
    expect(rankAtLevel(def, 120, 400, cfg)).toBe(1);
    expect(rankAtLevel(def, 121, 400, cfg)).toBe(2);
    expect(rankAtLevel(def, 320, 400, cfg)).toBe(2);
    expect(rankAtLevel(def, 321, 400, cfg)).toBe(3);
    expect(rankAtLevel(def, 400, 400, cfg)).toBe(3);
  });

  it('nivel por debajo del de aprendizaje → rango 1', () => {
    const def = { unlockLevel: 20, maxRank: 5 };
    expect(rankAtLevel(def, 10, 200, cfg)).toBe(1);
    expect(rankAtLevel(def, 19, 200, cfg)).toBe(1);
  });

  it('sin factores para ese maxRank → rango 1', () => {
    const emptyCfg: SpellRankConfig = {};
    const def = { unlockLevel: 1, maxRank: 5 };
    expect(rankAtLevel(def, 200, 200, emptyCfg)).toBe(1);
  });

  it('maxRank 1 → siempre rango 1', () => {
    const def = { unlockLevel: 1, maxRank: 1 };
    expect(rankAtLevel(def, 200, 200, cfg)).toBe(1);
  });
});

describe('effectiveRank', () => {
  it('toma el mayor de guardado y automático', () => {
    expect(effectiveRank(1, 3, 5)).toBe(3);
    expect(effectiveRank(4, 2, 5)).toBe(4);
    expect(effectiveRank(3, 3, 5)).toBe(3);
  });

  it('nunca supera maxRank', () => {
    expect(effectiveRank(6, 5, 5)).toBe(5);
    expect(effectiveRank(5, 7, 5)).toBe(5);
  });
});

describe('rankAtLevel — integración con contenido real', () => {
  const ct = content();

  it('los factores se cargan en progression', () => {
    const factors = ct.progression.spellRankFactors;
    expect(factors).toBeDefined();
    expect(factors!['5']).toEqual([0.10, 0.25, 0.50, 0.90]);
    expect(factors!['3']).toEqual([0.30, 0.80]);
  });

  it('personaje de nivel máximo de cada clase tiene todos sus hechizos en rango máximo', () => {
    const cfg = ct.progression.spellRankFactors!;
    const maxLevel = ct.progression.maxLevel;

    for (const cls of Object.values(ct.classes)) {
      const spells = Object.values(ct.spells).filter((s) => s.classId === cls.id);
      for (const spell of spells) {
        const autoRank = rankAtLevel(spell, maxLevel, maxLevel, cfg);
        expect(autoRank, `${cls.id} — ${spell.id} en nivel ${maxLevel}`).toBe(spell.maxRank);
      }
    }
  });

  it('universales también llegan a rango máximo en nivel máximo', () => {
    const cfg = ct.progression.spellRankFactors!;
    const maxLevel = ct.progression.maxLevel;

    const universales = Object.values(ct.spells).filter((s) => s.classId === null);
    for (const spell of universales) {
      const autoRank = rankAtLevel(spell, maxLevel, maxLevel, cfg);
      expect(autoRank, `universal ${spell.id} en nivel ${maxLevel}`).toBe(spell.maxRank);
    }
  });

  it('Character.fromSave con guardado viejo no baja rangos', () => {
    const ch = Character.create(ct, 'ember_vanguard', 'Test', new Rng(1));
    const save = ch.toSave(new Date());
    save.level = 100;
    const gust = ct.spells['gust'];
    if (gust) {
      save.known = [{ spellId: 'gust', rank: 4 }];
      save.hotbar = new Array(ct.progression.hotbarSize).fill(null);
    }
    const loaded = Character.fromSave(ct, save, new Rng(1));
    const cfg = ct.progression.spellRankFactors!;
    const autoRank = gust ? rankAtLevel(gust, 100, ct.progression.maxLevel, cfg) : 0;
    const expected = Math.max(4, autoRank);
    expect(loaded.spellbook.rank('gust')).toBe(expected);
  });

  it('Spellbook.learn() sigue funcionando sin cambios', () => {
    const ch = hero();
    const result = ch.spellbook.learn('gust');
    expect(result).toEqual({ kind: 'learned' });
    expect(ch.spellbook.rank('gust')).toBe(1);

    const result2 = ch.spellbook.learn('gust');
    expect(result2).toEqual({ kind: 'rankUp', rank: 2 });
    expect(ch.spellbook.rank('gust')).toBe(2);

    const gust = ct.spells['gust'];
    for (let r = 3; r <= gust!.maxRank; r++) {
      const res = ch.spellbook.learn('gust');
      expect(res).toEqual({ kind: 'rankUp', rank: r });
    }
    const maxed = ch.spellbook.learn('gust');
    expect(maxed).toEqual({ kind: 'maxed' });
  });
});
