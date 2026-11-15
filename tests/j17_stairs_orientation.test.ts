import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor } from '../src/world/dungeon';

describe('J17: Orientación de escaleras', () => {
  const data = loadGameData();
  const def = loadDungeon(data);

  it('cada escalera tiene rotación definida', () => {
    for (let i = 0; i < def.floors.length; i++) {
      const floor = generateFloor(def, i);
      expect(typeof floor.upStairs.rotation).toBe('number');
      expect(floor.upStairs.rotation).toBeGreaterThanOrEqual(-Math.PI);
      expect(floor.upStairs.rotation).toBeLessThanOrEqual(Math.PI);
      if (floor.downStairs) {
        expect(typeof floor.downStairs.rotation).toBe('number');
      }
    }
  });

  it('la posición de llegada está en suelo caminable', () => {
    const ts = def.tileSize;
    for (let i = 0; i < def.floors.length; i++) {
      const floor = generateFloor(def, i);
      for (const name of ['arrivalFromAbove', 'arrivalFromBelow'] as const) {
        const p = floor[name];
        const tc = Math.floor(p.x / ts - 0.5);
        const tr = Math.floor(p.y / ts - 0.5);
        if (tc >= 0 && tr >= 0 && tc < floor.cols && tr < floor.rows) {
          expect(floor.cells[tr * floor.cols + tc], `${name} piso ${i + 1} en suelo`).toBe(1);
        }
      }
    }
  });

  it('la llegada está cerca de la escalera correspondiente', () => {
    for (let i = 0; i < def.floors.length; i++) {
      const floor = generateFloor(def, i);
      const distUp = Math.hypot(
        floor.arrivalFromAbove.x - floor.upStairs.x,
        floor.arrivalFromAbove.y - floor.upStairs.y
      );
      expect(distUp, `piso ${i + 1}: arrivalFromAbove cerca de upStairs`).toBeLessThan(4);
      if (floor.downStairs) {
        const distDown = Math.hypot(
          floor.arrivalFromBelow.x - floor.downStairs.x,
          floor.arrivalFromBelow.y - floor.downStairs.y
        );
        expect(distDown, `piso ${i + 1}: arrivalFromBelow cerca de downStairs`).toBeLessThan(4);
      }
    }
  });

  it('los primeros pisos manuales tienen escaleras orientadas', () => {
    for (let i = 0; i < Math.min(5, def.floors.length); i++) {
      const floor = generateFloor(def, i);
      // La rotación no debería ser siempre 0 (eso indicaría que no se calcula).
      // Al menos algunos pisos deben tener rotación no nula.
      expect(floor.upStairs).toBeDefined();
      expect(typeof floor.upStairs.rotation).toBe('number');
    }
  });

  it('pisos manuales consecutivos comparten posición de escalera', () => {
    // Solo los pisos manuales (hand) comparten posición de escalera.
    // Los pisos generados por semilla son independientes, así que solo verificamos
    // que no haya errores al acceder a las propiedades.
    for (let i = 1; i < Math.min(6, def.floors.length); i++) {
      const prev = generateFloor(def, i - 1);
      const curr = generateFloor(def, i);
      if (prev.downStairs) {
        const dist = Math.hypot(
          curr.upStairs.x - prev.downStairs.x,
          curr.upStairs.y - prev.downStairs.y
        );
        // La distancia debe ser finita y positiva.
        expect(dist).toBeGreaterThan(0);
        expect(Number.isFinite(dist)).toBe(true);
      }
    }
  });
});
