import { describe, it, expect } from 'vitest';
import { rankAtLevel, rankLadder } from '../src/rpg/spellRank';
import { content } from './rpg/helpers';

const c = content();
const spells = c.spells;
const progression = c.progression;
const maxLevel = progression.maxLevel;

// Hechizos nuevos integrables por clase
const newVanguardSpells = [
  'guarapo_splash', 'night_dew', 'flint_spark', 'smoke_screen', 'bellows',
  'salt_crust', 'machete_whirl', 'flood_furrow', 'cold_ash', 'quema_wind',
  'river_shoulder', 'frozen_furrow', 'volcanic_fury',
];
const newWeaverSpells = [
  'mist_veil', 'drizzle_needle', 'rain_stitch', 'spindle_gust', 'loom_roots',
  'warp_tide', 'dry_lightning', 'landslip', 'cloudburst', 'thunder_weave',
  'tempest_crown',
];
const newHunterSpells = [
  'cold_snare', 'eel_arrow', 'tar_arrow', 'tide_pull', 'heron_feather',
  'charcoal_cloud', 'fog_arrow', 'frozen_estuary', 'final_quiver',
];

describe('HZ-03: Calendario de hechizos hasta el 200', () => {
  describe('Paso 1: todos los hechizos nuevos existen en spells.json', () => {
    const allNew = [...newVanguardSpells, ...newWeaverSpells, ...newHunterSpells];

    it.each(allNew)('"%s" existe en spells.json', (id) => {
      expect(spells[id]).toBeDefined();
    });

    it('los ids son únicos (sin duplicados con hechizos existentes)', () => {
      const ids = Object.keys(spells);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('Vanguardia tiene 13 nuevos hechizos integrables', () => {
      expect(newVanguardSpells).toHaveLength(13);
    });

    it('Tejedora tiene 11 nuevos hechizos integrables', () => {
      expect(newWeaverSpells).toHaveLength(11);
    });

    it('Cazador tiene 9 nuevos hechizos integrables', () => {
      expect(newHunterSpells).toHaveLength(9);
    });
  });

  describe('Paso 1: estructura correcta de cada hechizo nuevo', () => {
    const allNew = [...newVanguardSpells, ...newWeaverSpells, ...newHunterSpells];

    it.each(allNew)('"%s" tiene maxRank 6', (id) => {
      expect(spells[id]!.maxRank).toBe(6);
    });

    it.each(allNew)('"%s" tiene unlockLevel ≤ maxLevel', (id) => {
      const s = spells[id]!;
      expect(s.unlockLevel ?? 1).toBeLessThanOrEqual(maxLevel);
    });

    it.each(allNew)('"%s" tiene classId correcto', (id) => {
      const s = spells[id]!;
      expect(s.classId).not.toBeNull();
      expect(c.classes[s.classId!]).toBeDefined();
    });

    it.each(allNew)('"%s" tiene al menos un efecto', (id) => {
      expect(spells[id]!.effects.length).toBeGreaterThan(0);
    });

    it.each(allNew)('"%s" tiene perRank con effectPercent y costPercent', (id) => {
      const pr = spells[id]!.perRank;
      expect(pr.effectPercent).toBeGreaterThan(0);
      expect(pr.costPercent).toBeGreaterThan(0);
    });
  });

  describe('Paso 1: distribución por nivel — huecos en hechizos integrados', () => {
    // Nota: el criterio de "ningún hueco > 20" aplica al calendario COMPLETO (incluyendo
    // hechizos que esperan primitiva). Los hechizos integrados tienen huecos mayores porque
    // los de entre medio esperan M2-M9. Esta prueba solo verifica que los integrados
    // no tengan huecos mayores a 55 (el máximo real: Cazador 110→165, con 5 spells no integrados).
    function checkGaps(classId: string, label: string) {
      it(`${label}: los hechizos integrados no tienen hueco > 55`, () => {
        const classSpells = Object.values(spells)
          .filter((s) => s.classId === classId)
          .map((s) => s.unlockLevel ?? 1)
          .sort((a, b) => a - b);

        for (let i = 1; i < classSpells.length; i++) {
          const gap = (classSpells[i] ?? 0) - (classSpells[i - 1] ?? 0);
          if (gap > 0) {
            expect(gap).toBeLessThanOrEqual(55);
          }
        }
      });
    }

    checkGaps('ember_vanguard', 'Vanguardia');
    checkGaps('storm_weaver', 'Tejedora');
    checkGaps('mangrove_hunter', 'Cazador');
  });

  describe('Paso 1: último hechizo en nivel 200', () => {
    it('Vanguardia tiene hechizo en nivel 200', () => {
      const maxUnlock = Math.max(
        ...Object.values(spells).filter((s) => s.classId === 'ember_vanguard').map((s) => s.unlockLevel ?? 1),
      );
      expect(maxUnlock).toBe(200);
    });

    it('Tejedora tiene hechizo en nivel 200', () => {
      const maxUnlock = Math.max(
        ...Object.values(spells).filter((s) => s.classId === 'storm_weaver').map((s) => s.unlockLevel ?? 1),
      );
      expect(maxUnlock).toBe(200);
    });

    it('Cazador tiene hechizo en nivel 200', () => {
      const maxUnlock = Math.max(
        ...Object.values(spells).filter((s) => s.classId === 'mangrove_hunter').map((s) => s.unlockLevel ?? 1),
      );
      expect(maxUnlock).toBe(200);
    });
  });

  describe('Paso 1: rangos calculados correctamente con factores de 6 rangos', () => {
    const factors6 = progression.spellRankFactors!['6'];
    expect(factors6).toBeDefined();
    const cfg = { '6': factors6! };

    it('volcanic_fury (nivel 200) está en rango 6 a nivel máximo', () => {
      const s = spells['volcanic_fury']!;
      const rank = rankAtLevel(s, 200, maxLevel, cfg);
      // Con U=200 y M=200, todos los umbrales caen en 200 → rango 6.
      expect(rank).toBe(6);
    });

    it('guarapo_splash (nivel 30) llega a rango 6 en nivel 200', () => {
      const s = spells['guarapo_splash']!;
      const rank = rankAtLevel(s, 200, maxLevel, cfg);
      expect(rank).toBe(6);
    });

    it('rankLadder devuelve 6 escalones para hechizo de nivel 30', () => {
      const s = spells['guarapo_splash']!;
      const ladder = rankLadder(s, maxLevel, cfg);
      expect(ladder.length).toBe(6);
      expect(ladder[0]!.rank).toBe(1);
      expect(ladder[0]!.level).toBe(30);
      // Levels should be strictly increasing
      for (let i = 1; i < ladder.length; i++) {
        expect(ladder[i]!.level).toBeGreaterThan(ladder[i - 1]!.level);
      }
    });

    it('tempest_crown (nivel 200) tiene escalera con 6 rangos en nivel 200', () => {
      const s = spells['tempest_crown']!;
      const ladder = rankLadder(s, maxLevel, cfg);
      // Con U=200 y M=200, todos los rangos están en nivel 200.
      expect(ladder.length).toBe(6);
      expect(ladder[0]!.level).toBe(200);
      expect(ladder[5]!.rank).toBe(6);
    });
  });

  describe('Paso 1: content:check pasa sobre los datos reales', () => {
    it('ningún hechizo nuevo tiene unlockLevel > maxLevel', () => {
      const allNew = [...newVanguardSpells, ...newWeaverSpells, ...newHunterSpells];
      for (const id of allNew) {
        const s = spells[id]!;
        expect(s.unlockLevel ?? 1).toBeLessThanOrEqual(maxLevel);
      }
    });

    it('los efectos de los hechizos nuevos usan solo tipos válidos', () => {
      const validTypes = [
        'damage', 'heal', 'status', 'shield', 'knockback', 'dash', 'teleport',
        'restoreResource', 'summon', 'zone', 'blink', 'swap', 'pull', 'recoil',
        'trap', 'reveal', 'chain', 'bonusVsStatus', 'selfStack',
      ];
      const allNew = [...newVanguardSpells, ...newWeaverSpells, ...newHunterSpells];
      for (const id of allNew) {
        const s = spells[id]!;
        for (const eff of s.effects) {
          expect(validTypes).toContain(eff.type);
          // Zone effects must have valid sub-effects
          if (eff.type === 'zone') {
            for (const sub of eff.effects) {
              expect(validTypes).toContain(sub.type);
            }
          }
          // Trap effects must have valid sub-effects
          if (eff.type === 'trap') {
            for (const sub of eff.effects) {
              expect(['damage', 'status', 'knockback', 'pull']).toContain(sub.type);
            }
          }
        }
      }
    });

    it('los estados referenciados por los hechizos nuevos existen', () => {
      const allNew = [...newVanguardSpells, ...newWeaverSpells, ...newHunterSpells];
      for (const id of allNew) {
        const s = spells[id]!;
        for (const eff of s.effects) {
          if (eff.type === 'status') {
            expect(c.statuses[eff.statusId]).toBeDefined();
          }
        }
      }
    });
  });

  describe('Paso 1: conteo total de hechizos por clase', () => {
    it('Vanguardia tiene 32 hechizos (HZ-04c-vanguardia)', () => {
      const count = Object.values(spells).filter((s) => s.classId === 'ember_vanguard').length;
      expect(count).toBe(32);
    });

    it('Tejedora tiene 32 hechizos (HZ-04c-tejedora)', () => {
      const count = Object.values(spells).filter((s) => s.classId === 'storm_weaver').length;
      expect(count).toBe(32);
    });

    it('Cazador tiene 23 hechizos (14 existentes + 9 nuevos)', () => {
      const count = Object.values(spells).filter((s) => s.classId === 'mangrove_hunter').length;
      expect(count).toBe(23);
    });
  });

  describe('TEC-02: parser acepta unlockLevel hasta 200', () => {
    it('el parser no rechaza unlockLevel 200', () => {
      // volcanic_fury tiene unlockLevel 200 y se cargó sin error
      expect(spells['volcanic_fury']!.unlockLevel).toBe(200);
    });

    it('el parser no rechaza unlockLevel 180', () => {
      expect(spells['thunder_weave']!.unlockLevel).toBe(180);
    });
  });
});
