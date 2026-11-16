import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { ELEMENTS } from '../../src/rpg/contracts';

const data = loadGameData();
const items = Object.values(data.rpg.items);

const SPECIALIZED_FAMILIES = ['endurance', 'spirit', 'precision', 'support'] as const;

describe('rutas de equipo 1–200', () => {
  it('cada franja tiene un set de cuatro piezas para cada elemento', () => {
    for (let band = 1; band <= 10; band++) for (const element of ELEMENTS) {
      const id = `route_${String(band).padStart(2, '0')}_${element}`;
      const pieces = items.filter((item) => item.setId === id);
      expect(data.rpg.sets[id], id).toBeDefined();
      expect(pieces, id).toHaveLength(4);
      expect(pieces.every((item) => item.level >= (band - 1) * 20 + 1 && item.level <= band * 20), id).toBe(true);
      expect(pieces.every((item) => item.rolls.some((roll) => roll.stat === `damage.${element}`) || band < 4), id).toBe(true);
    }
  });

  it('cada franja tiene un set de aprendizaje puro sin poder de combate', () => {
    for (let band = 1; band <= 10; band++) {
      const id = `learning_${String(band).padStart(2, '0')}`;
      const pieces = items.filter((item) => item.setId === id);
      const set = data.rpg.sets[id]!;
      expect(pieces, id).toHaveLength(4);
      for (const item of pieces) {
        expect(item.implicit, item.id).toEqual([]);
        expect(item.rolls.map((roll) => roll.stat), item.id).toEqual(['experienceGain']);
      }
      expect(set.bonuses.flatMap((bonus) => bonus.modifiers).map((modifier) => modifier.stat), id)
        .toEqual(['experienceGain', 'experienceGain']);
    }
  });

  it('ninguna ruta elemental recibe Aprendizaje gratis', () => {
    const combat = items.filter((item) => item.setId?.startsWith('route_'));
    expect(combat).toHaveLength(240);
    expect(combat.some((item) => [...item.implicit, ...item.rolls].some((line) => line.stat === 'experienceGain'))).toBe(false);
  });

  it('las piezas generadas tienen una adquisición explícita', () => {
    const stock = new Set(Object.values(data.rpg.merchants).flatMap((merchant) => merchant.stock.map((entry) => entry.itemId)));
    const routes = items.filter((item) => item.setId?.startsWith('route_') || item.setId?.startsWith('learning_') || item.setId?.startsWith('spec_'));
    expect(routes.filter((item) => !stock.has(item.id)).map((item) => item.id)).toEqual([]);
  });

  // ─── JEQ-01: Sets especializados ───

  it('cada franja tiene un set de cuatro piezas para cada familia especializada', () => {
    for (let band = 1; band <= 10; band++) for (const family of SPECIALIZED_FAMILIES) {
      const id = `spec_${String(band).padStart(2, '0')}_${family}`;
      const pieces = items.filter((item) => item.setId === id);
      expect(data.rpg.sets[id], id).toBeDefined();
      expect(pieces, id).toHaveLength(4);
      expect(pieces.every((item) => item.level >= (band - 1) * 20 + 1 && item.level <= band * 20), id).toBe(true);
    }
  });

  it('ninguna ruta especializada recibe Aprendizaje', () => {
    const spec = items.filter((item) => item.setId?.startsWith('spec_'));
    expect(spec).toHaveLength(160);
    expect(spec.some((item) => [...item.implicit, ...item.rolls].some((line) => line.stat === 'experienceGain'))).toBe(false);
  });

  it('cada familia especializada tiene identidad exclusiva en sus rolls', () => {
    for (let band = 1; band <= 10; band++) {
      // Aguante: vitality + maxHealth + resist.* (resist desde band >= 2)
      const endurance = items.filter((item) => item.setId === `spec_${String(band).padStart(2, '0')}_endurance`);
      const enduranceStats = endurance.flatMap((item) => item.rolls.map((r) => r.stat));
      expect(enduranceStats.includes('vitality'), `endurance band ${band}`).toBe(true);
      expect(enduranceStats.includes('maxHealth'), `endurance band ${band}`).toBe(true);
      if (band >= 2) {
        expect(enduranceStats.some((s) => s.startsWith('resist.')), `endurance band ${band}`).toBe(true);
      }

      // Ánimo: spirit + maxResource + resourceRegen (resourceRegen desde band >= 2)
      const spirit = items.filter((item) => item.setId === `spec_${String(band).padStart(2, '0')}_spirit`);
      const spiritStats = spirit.flatMap((item) => item.rolls.map((r) => r.stat));
      expect(spiritStats.includes('spirit'), `spirit band ${band}`).toBe(true);
      expect(spiritStats.includes('maxResource'), `spirit band ${band}`).toBe(true);
      if (band >= 2) {
        expect(spiritStats.includes('resourceRegen'), `spirit band ${band}`).toBe(true);
      }

      // Precisión: critChance + critBonus + castStability (castStability desde band >= 2)
      const precision = items.filter((item) => item.setId === `spec_${String(band).padStart(2, '0')}_precision`);
      const precisionStats = precision.flatMap((item) => item.rolls.map((r) => r.stat));
      expect(precisionStats.includes('critChance'), `precision band ${band}`).toBe(true);
      expect(precisionStats.includes('critBonus'), `precision band ${band}`).toBe(true);
      if (band >= 2) {
        expect(precisionStats.includes('castStability'), `precision band ${band}`).toBe(true);
      }

      // Apoyo: healingPower + cooldownReduction + escape (escape desde band >= 2)
      const support = items.filter((item) => item.setId === `spec_${String(band).padStart(2, '0')}_support`);
      const supportStats = support.flatMap((item) => item.rolls.map((r) => r.stat));
      expect(supportStats.includes('healingPower'), `support band ${band}`).toBe(true);
      expect(supportStats.includes('cooldownReduction'), `support band ${band}`).toBe(true);
      if (band >= 2) {
        expect(supportStats.includes('escape'), `support band ${band}`).toBe(true);
      }
    }
  });

  it('los sets especializados respetan los topes de presupuesto', () => {
    const spec = items.filter((item) => item.setId?.startsWith('spec_'));
    for (const item of spec) {
      for (const roll of item.rolls) {
        // Resistencia elemental ≤ 10 %
        if (roll.stat.startsWith('resist.')) {
          expect(roll.max, `${item.id} ${roll.stat}`).toBeLessThanOrEqual(10);
        }
        // Crítico ≤ 4 %
        if (roll.stat === 'critChance') {
          expect(roll.max, `${item.id} critChance`).toBeLessThanOrEqual(4);
        }
        // Daño elemental plano ≤ 30
        if (roll.stat.startsWith('damage.')) {
          expect(roll.max, `${item.id} ${roll.stat}`).toBeLessThanOrEqual(30);
        }
      }
    }
  });

  it('el daño elemental de los sets especializados es inferior al mono-elemental en la misma franja', () => {
    for (let band = 1; band <= 10; band++) {
      const specItems = items.filter((item) => item.setId?.startsWith(`spec_${String(band).padStart(2, '0')}_`));
      const routeItems = items.filter((item) => item.setId?.startsWith(`route_${String(band).padStart(2, '0')}_`));
      const specMaxDamage = Math.max(0, ...specItems.flatMap((item) => item.rolls.filter((r) => r.stat.startsWith('damage.')).map((r) => r.max)));
      const routeMaxDamage = Math.max(0, ...routeItems.flatMap((item) => item.rolls.filter((r) => r.stat.startsWith('damage.')).map((r) => r.max)));
      // Los sets especializados tienen daño elemental significativamente menor que el mono-elemental
      if (routeMaxDamage > 0) {
        expect(specMaxDamage, `band ${band} (spec max ${specMaxDamage} < route max ${routeMaxDamage})`).toBeLessThan(routeMaxDamage);
      }
    }
  });

  it('los 40 sets especializados tienen bonos de set coherentes', () => {
    for (let band = 1; band <= 10; band++) for (const family of SPECIALIZED_FAMILIES) {
      const id = `spec_${String(band).padStart(2, '0')}_${family}`;
      const set = data.rpg.sets[id]!;
      expect(set.bonuses, id).toBeDefined();
      expect(set.bonuses.length, id).toBeGreaterThanOrEqual(2);
      // Cada bono tiene al menos un modificador
      for (const bonus of set.bonuses) {
        expect(bonus.modifiers.length, `${id} bonus ${bonus.pieces}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('los sets especializados tienen nombre y bonos definidos', () => {
    for (let band = 1; band <= 10; band++) for (const family of SPECIALIZED_FAMILIES) {
      const id = `spec_${String(band).padStart(2, '0')}_${family}`;
      const set = data.rpg.sets[id]!;
      expect(set.name, id).toBeDefined();
      expect(set.name.length, id).toBeGreaterThan(0);
    }
  });

  // ─── JEQ-02: Sets bielementales regionales ───

  const BI_ELEMENTAL_IDS = [
    'bi_diablico_sucio', 'bi_diablico_espejo', 'bi_mangle_rojo', 'bi_bocas',
    'bi_nube_baru', 'bi_tulivieja', 'bi_mareas_altas', 'bi_campanas_portobelo',
    'bi_camino_cruces', 'bi_perla_coiba',
  ] as const;

  it('cada set bielemental regional tiene cinco piezas', () => {
    for (const setId of BI_ELEMENTAL_IDS) {
      const pieces = items.filter((item) => item.setId === setId);
      expect(data.rpg.sets[setId], setId).toBeDefined();
      expect(pieces, setId).toHaveLength(5);
    }
  });

  it('ningún set bielemental recibe Aprendizaje', () => {
    const bi = items.filter((item) => item.setId?.startsWith('bi_'));
    expect(bi).toHaveLength(50);
    expect(bi.some((item) => [...item.implicit, ...item.rolls].some((line) => line.stat === 'experienceGain'))).toBe(false);
  });

  it('cada set bielemental tiene dos primarias distintas en sus rolls', () => {
    for (const setId of BI_ELEMENTAL_IDS) {
      const pieces = items.filter((item) => item.setId === setId);
      const allStats = pieces.flatMap((item) => item.rolls.map((r) => r.stat));
      const primaries = ['strength', 'intellect', 'agility', 'flow', 'calm', 'will'] as const;
      const found = primaries.filter((p) => allStats.includes(p));
      expect(found.length, `${setId} primaries: ${found.join(', ')}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('cada set bielemental tiene daño de ambos elementos', () => {
    for (const setId of BI_ELEMENTAL_IDS) {
      const pieces = items.filter((item) => item.setId === setId);
      const damageStats = pieces.flatMap((item) => item.rolls.filter((r) => r.stat.startsWith('damage.')).map((r) => r.stat));
      const uniqueElements = new Set(damageStats.map((s) => s.replace('damage.', '')));
      expect(uniqueElements.size, `${setId} elements: ${[...uniqueElements].join(', ')}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('los sets bielementales respetan los topes de presupuesto', () => {
    const bi = items.filter((item) => item.setId?.startsWith('bi_'));
    for (const item of bi) {
      for (const roll of item.rolls) {
        if (roll.stat.startsWith('resist.')) {
          expect(roll.max, `${item.id} ${roll.stat}`).toBeLessThanOrEqual(10);
        }
        if (roll.stat === 'critChance') {
          expect(roll.max, `${item.id} critChance`).toBeLessThanOrEqual(4);
        }
        if (roll.stat.startsWith('damage.')) {
          expect(roll.max, `${item.id} ${roll.stat}`).toBeLessThanOrEqual(30);
        }
      }
    }
  });

  it('el daño elemental de los sets bielementales es inferior al mono-elemental en franjas cercanas', () => {
    // Para cada set bielemental, compara el daño máximo de cada elemento con el mono-set
    // de la franja más cercana en nivel.
    for (const setId of BI_ELEMENTAL_IDS) {
      const pieces = items.filter((item) => item.setId === setId);
      const biMaxDamage = Math.max(0, ...pieces.flatMap((item) =>
        item.rolls.filter((r) => r.stat.startsWith('damage.')).map((r) => r.max)
      ));
      // Encuentra la franja mono-elemental más cercana por nivel promedio
      const avgLevel = pieces.reduce((sum, p) => sum + p.level, 0) / pieces.length;
      const band = Math.min(10, Math.max(1, Math.ceil(avgLevel / 20)));
      const routeItems = items.filter((item) => item.setId?.startsWith(`route_${String(band).padStart(2, '0')}_`));
      const routeMaxDamage = Math.max(0, ...routeItems.flatMap((item) =>
        item.rolls.filter((r) => r.stat.startsWith('damage.')).map((r) => r.max)
      ));
      if (routeMaxDamage > 0) {
        expect(biMaxDamage, `${setId} (bi max ${biMaxDamage} < route max ${routeMaxDamage} at band ${band})`).toBeLessThan(routeMaxDamage);
      }
    }
  });

  it('los 10 sets bielementales tienen bonos de set coherentes', () => {
    for (const setId of BI_ELEMENTAL_IDS) {
      const set = data.rpg.sets[setId]!;
      expect(set.bonuses, setId).toBeDefined();
      expect(set.bonuses.length, setId).toBeGreaterThanOrEqual(2);
      for (const bonus of set.bonuses) {
        expect(bonus.modifiers.length, `${setId} bonus ${bonus.pieces}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('los sets bielementales tienen nombre definido', () => {
    for (const setId of BI_ELEMENTAL_IDS) {
      const set = data.rpg.sets[setId]!;
      expect(set.name, setId).toBeDefined();
      expect(set.name.length, setId).toBeGreaterThan(0);
    }
  });

  it('las piezas bielementales tienen una adquisición explícita', () => {
    const stock = new Set(Object.values(data.rpg.merchants).flatMap((merchant) => merchant.stock.map((entry) => entry.itemId)));
    const bi = items.filter((item) => item.setId?.startsWith('bi_'));
    expect(bi.filter((item) => !stock.has(item.id)).map((item) => item.id)).toEqual([]);
  });

  // ─── JEQ-03: Sets trielementales tardíos ───

  const TRI_ELEMENTAL_IDS = [
    'tri_tres_corrientes', 'tri_tambor_azuerо', 'tri_dos_mares',
    'tri_compas_tierra_fuego_agua', 'tri_compas_aire_hielo_rayo', 'tri_compas_tierra_aire_rayo',
  ] as const;

  it('cada set trielemental tardío tiene cinco piezas', () => {
    for (const setId of TRI_ELEMENTAL_IDS) {
      const pieces = items.filter((item) => item.setId === setId);
      expect(data.rpg.sets[setId], setId).toBeDefined();
      expect(pieces, setId).toHaveLength(5);
    }
  });

  it('ningún set trielemental recibe Aprendizaje', () => {
    const tri = items.filter((item) => item.setId?.startsWith('tri_'));
    expect(tri).toHaveLength(30);
    expect(tri.some((item) => [...item.implicit, ...item.rolls].some((line) => line.stat === 'experienceGain'))).toBe(false);
  });

  it('cada set trielemental tiene tres primarias distintas en sus rolls', () => {
    for (const setId of TRI_ELEMENTAL_IDS) {
      const pieces = items.filter((item) => item.setId === setId);
      const allStats = pieces.flatMap((item) => item.rolls.map((r) => r.stat));
      const primaries = ['strength', 'intellect', 'agility', 'flow', 'calm', 'will'] as const;
      const found = primaries.filter((p) => allStats.includes(p));
      expect(found.length, `${setId} primaries: ${found.join(', ')}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('cada set trielemental tiene daño de tres elementos distintos', () => {
    for (const setId of TRI_ELEMENTAL_IDS) {
      const pieces = items.filter((item) => item.setId === setId);
      const damageStats = pieces.flatMap((item) => item.rolls.filter((r) => r.stat.startsWith('damage.')).map((r) => r.stat));
      const uniqueElements = new Set(damageStats.map((s) => s.replace('damage.', '')));
      expect(uniqueElements.size, `${setId} elements: ${[...uniqueElements].join(', ')}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('los sets trielementales respetan los topes de presupuesto', () => {
    const tri = items.filter((item) => item.setId?.startsWith('tri_'));
    for (const item of tri) {
      for (const roll of item.rolls) {
        if (roll.stat.startsWith('resist.')) {
          expect(roll.max, `${item.id} ${roll.stat}`).toBeLessThanOrEqual(10);
        }
        if (roll.stat === 'critChance') {
          expect(roll.max, `${item.id} critChance`).toBeLessThanOrEqual(4);
        }
        if (roll.stat.startsWith('damage.')) {
          expect(roll.max, `${item.id} ${roll.stat}`).toBeLessThanOrEqual(30);
        }
      }
    }
  });

  it('el daño elemental de los sets trielementales es inferior al mono-elemental en franjas cercanas', () => {
    // Para cada set trielemental, compara el daño máximo de cada elemento con el mono-set
    // de la franja más cercana en nivel.
    for (const setId of TRI_ELEMENTAL_IDS) {
      const pieces = items.filter((item) => item.setId === setId);
      const triMaxDamage = Math.max(0, ...pieces.flatMap((item) =>
        item.rolls.filter((r) => r.stat.startsWith('damage.')).map((r) => r.max)
      ));
      // Encuentra la franja mono-elemental más cercana por nivel promedio
      const avgLevel = pieces.reduce((sum, p) => sum + p.level, 0) / pieces.length;
      const band = Math.min(10, Math.max(1, Math.ceil(avgLevel / 20)));
      const routeItems = items.filter((item) => item.setId?.startsWith(`route_${String(band).padStart(2, '0')}_`));
      const routeMaxDamage = Math.max(0, ...routeItems.flatMap((item) =>
        item.rolls.filter((r) => r.stat.startsWith('damage.')).map((r) => r.max)
      ));
      if (routeMaxDamage > 0) {
        expect(triMaxDamage, `${setId} (tri max ${triMaxDamage} < route max ${routeMaxDamage} at band ${band})`).toBeLessThan(routeMaxDamage);
      }
    }
  });

  it('los 6 sets trielementales tienen bonos de set coherentes', () => {
    for (const setId of TRI_ELEMENTAL_IDS) {
      const set = data.rpg.sets[setId]!;
      expect(set.bonuses, setId).toBeDefined();
      expect(set.bonuses.length, setId).toBeGreaterThanOrEqual(2);
      for (const bonus of set.bonuses) {
        expect(bonus.modifiers.length, `${setId} bonus ${bonus.pieces}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('los sets trielementales tienen nombre definido', () => {
    for (const setId of TRI_ELEMENTAL_IDS) {
      const set = data.rpg.sets[setId]!;
      expect(set.name, setId).toBeDefined();
      expect(set.name.length, setId).toBeGreaterThan(0);
    }
  });

  it('las piezas trielementales tienen una adquisición explícita', () => {
    const stock = new Set(Object.values(data.rpg.merchants).flatMap((merchant) => merchant.stock.map((entry) => entry.itemId)));
    const tri = items.filter((item) => item.setId?.startsWith('tri_'));
    expect(tri.filter((item) => !stock.has(item.id)).map((item) => item.id)).toEqual([]);
  });

  // ─── Pruebas de dominancia JEQ-03 ───

  it('los sets trielementales tienen desventaja ofensiva respecto al mejor mono-set de la franja', () => {
    // Cada set trielemental debe tener un daño máximo inferior al mono-set de la franja más cercana.
    for (const setId of TRI_ELEMENTAL_IDS) {
      const pieces = items.filter((item) => item.setId === setId);
      const triMaxDamage = Math.max(0, ...pieces.flatMap((item) =>
        item.rolls.filter((r) => r.stat.startsWith('damage.')).map((r) => r.max)
      ));
      const avgLevel = pieces.reduce((sum, p) => sum + p.level, 0) / pieces.length;
      const band = Math.min(10, Math.max(1, Math.ceil(avgLevel / 20)));
      // Encuentra el máximo daño de cualquier mono-set en esa franja
      const routeItems = items.filter((item) => item.setId?.startsWith(`route_${String(band).padStart(2, '0')}_`));
      const routeMaxDamage = Math.max(0, ...routeItems.flatMap((item) =>
        item.rolls.filter((r) => r.stat.startsWith('damage.')).map((r) => r.max)
      ));
      if (routeMaxDamage > 0) {
        // El trielemental debe tener al menos 30% menos daño que el mono-set
        expect(triMaxDamage, `${setId} ofensiva (tri ${triMaxDamage} < route ${routeMaxDamage} at band ${band})`).toBeLessThanOrEqual(Math.floor(routeMaxDamage * 0.7));
      }
    }
  });

  it('los sets trielementales tienen desventaja defensiva respecto al mejor mono-set de la franja', () => {
    // Cada set trielemental debe tener menos vida máxima que el mono-set de la franja más cercana.
    for (const setId of TRI_ELEMENTAL_IDS) {
      const pieces = items.filter((item) => item.setId === setId);
      const triMaxHP = Math.max(0, ...pieces.flatMap((item) =>
        item.rolls.filter((r) => r.stat === 'maxHealth').map((r) => r.max)
      ));
      const avgLevel = pieces.reduce((sum, p) => sum + p.level, 0) / pieces.length;
      const band = Math.min(10, Math.max(1, Math.ceil(avgLevel / 20)));
      const routeItems = items.filter((item) => item.setId?.startsWith(`route_${String(band).padStart(2, '0')}_`));
      const routeMaxHP = Math.max(0, ...routeItems.flatMap((item) =>
        item.rolls.filter((r) => r.stat === 'maxHealth').map((r) => r.max)
      ));
      if (routeMaxHP > 0) {
        // El trielemental debe tener al menos 15% menos vida que el mono-set
        expect(triMaxHP, `${setId} defensiva (tri HP ${triMaxHP} < route HP ${routeMaxHP} at band ${band})`).toBeLessThanOrEqual(Math.floor(routeMaxHP * 0.85));
      }
    }
  });
});
