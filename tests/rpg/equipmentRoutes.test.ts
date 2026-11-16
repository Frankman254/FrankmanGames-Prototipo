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
});
