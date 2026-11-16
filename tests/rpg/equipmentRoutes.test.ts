import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { ELEMENTS } from '../../src/rpg/contracts';

const data = loadGameData();
const items = Object.values(data.rpg.items);

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

  it('las 280 piezas tienen una adquisición explícita', () => {
    const stock = new Set(Object.values(data.rpg.merchants).flatMap((merchant) => merchant.stock.map((entry) => entry.itemId)));
    const routes = items.filter((item) => item.setId?.startsWith('route_') || item.setId?.startsWith('learning_'));
    expect(routes).toHaveLength(280);
    expect(routes.filter((item) => !stock.has(item.id)).map((item) => item.id)).toEqual([]);
  });
});
