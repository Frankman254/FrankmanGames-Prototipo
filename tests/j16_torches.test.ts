// J16: Antorchas visibles y correctamente orientadas en todos los pisos.
import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor } from '../src/world/dungeon';

const data = loadGameData();
const def = loadDungeon(data);

describe('J16: antorchas correctamente orientadas', () => {
  // 1. Normales: cada antorcha debe tener una normal válida (±X o ±Z).
  it('todas las antorchas tienen una normal cardinal válida', () => {
    for (let i = 0; i < Math.min(20, def.floors.length); i++) {
      const floor = generateFloor(def, i);
      for (const t of floor.torches) {
        const mag = Math.abs(t.nx) + Math.abs(t.ny);
        expect(mag, `piso ${i + 1} antorcha (${t.x},${t.y}) normal (${t.nx},${t.ny})`).toBe(1);
      }
    }
  });

  // 2. Normales ±X y ±Z: los 4 ejes deben aparecer en pisos generados.
  it('pisos generados usan normales en los 4 ejes', () => {
    const axes = new Set<string>();
    for (let i = 5; i < Math.min(25, def.floors.length); i++) {
      const floor = generateFloor(def, i);
      for (const t of floor.torches) {
        axes.add(`${t.nx},${t.ny}`);
      }
    }
    expect(axes.has('1,0')).toBe(true);
    expect(axes.has('-1,0')).toBe(true);
    expect(axes.has('0,1')).toBe(true);
    expect(axes.has('0,-1')).toBe(true);
  });

  // 3. La normal apunta a baldosa de suelo, no a roca.
  it('la normal de cada antorcha apunta a baldosa caminable', () => {
    for (let i = 0; i < Math.min(10, def.floors.length); i++) {
      const floor = generateFloor(def, i);
      const ts = floor.tileSize;
      for (const t of floor.torches) {
        // La posición de la antorcha está en el borde entre roca y suelo.
        // La baldosa de roca está un medio tile detrás de la posición.
        const tc = Math.floor((t.x - t.nx * ts * 0.45) / ts - 0.5);
        const tr = Math.floor((t.y - t.ny * ts * 0.45) / ts - 0.5);
        const nc = tc + t.nx;
        const nr = tr + t.ny;
        if (nc >= 0 && nr >= 0 && nc < floor.cols && nr < floor.rows) {
          const idx = nr * floor.cols + nc;
          expect(floor.cells[idx], `piso ${i + 1}: normal (${t.nx},${t.ny}) desde (${tc},${tr}) apunta a (${nc},${nr})`).toBe(1);
        }
      }
    }
  });

  // 4. Cero antorchas sobre puertas.
  it('no hay antorcha en la misma baldosa que una puerta', () => {
    for (let i = 0; i < Math.min(20, def.floors.length); i++) {
      const floor = generateFloor(def, i);
      const ts = floor.tileSize;
      for (const t of floor.torches) {
        const tc = Math.floor(t.x / ts - 0.5);
        const tr = Math.floor(t.y / ts - 0.5);
        for (const door of floor.doors) {
          for (const cell of door.cells) {
            expect(
              !(tc === cell.c && tr === cell.r),
              `piso ${i + 1}: antorcha en baldosa de puerta ${door.id} (${tc},${tr})`
            ).toBe(true);
          }
        }
      }
    }
  });

  // 5. Cero antorchas cerca de escaleras.
  it('no hay antorcha demasiado cerca de escaleras', () => {
    const STAIRS_CLEARANCE = 2.0;
    for (let i = 0; i < Math.min(20, def.floors.length); i++) {
      const floor = generateFloor(def, i);
      for (const t of floor.torches) {
        const points = [floor.upStairs, floor.downStairs, floor.arrivalFromAbove, floor.arrivalFromBelow];
        for (const p of points) {
          if (p) {
            const dist = Math.hypot(t.x - p.x, t.y - p.y);
            expect(dist, `piso ${i + 1}: antorcha a ${dist.toFixed(1)}m de escalera`).toBeGreaterThan(STAIRS_CLEARANCE);
          }
        }
      }
    }
  });

  // 6. Pisos manuales: normales correctas (no todas (0,1)).
  it('pisos manuales tienen normales variadas, no todas (0,1)', () => {
    // Los primeros 5 pisos son manuales.
    for (let i = 0; i < 5; i++) {
      const floor = generateFloor(def, i);
      if (floor.torches.length === 0) continue;
      const allSame = floor.torches.every((t) => t.nx === 0 && t.ny === 1);
      expect(
        !allSame,
        `piso manual ${i + 1}: todas las antorchas tienen normal (0,1) — deberían variar según la cara del muro`
      ).toBe(true);
    }
  });

  // 7. Correspondencia: la antorcha está junto a una baldosa de roca.
  it('la antorcha está junto a una baldosa de roca', () => {
    for (let i = 0; i < Math.min(10, def.floors.length); i++) {
      const floor = generateFloor(def, i);
      const ts = floor.tileSize;
      for (const t of floor.torches) {
        // La antorcha está en el borde entre roca y suelo.
        // Retroceder en la dirección opuesta a la normal para encontrar la baldosa de roca.
        const rockX = t.x - t.nx * (ts * 0.5 - 0.05);
        const rockY = t.y - t.ny * (ts * 0.5 - 0.05);
        const tc = Math.floor(rockX / ts - 0.5);
        const tr = Math.floor(rockY / ts - 0.5);
        if (tc >= 0 && tr >= 0 && tc < floor.cols && tr < floor.rows) {
          const idx = tr * floor.cols + tc;
          expect(
            floor.cells[idx],
            `piso ${i + 1}: antorcha en (${t.x.toFixed(1)},${t.y.toFixed(1)}) → baldosa de roca (${tc},${tr}) debe ser roca (0)`
          ).toBe(0);
        }
      }
    }
  });

  // 8. Determinismo: los pisos se generan igual con la misma semilla.
  it('generación determinista de antorchas', () => {
    for (let i = 0; i < Math.min(10, def.floors.length); i++) {
      const a = generateFloor(def, i);
      const b = generateFloor(def, i);
      expect(a.torches).toEqual(b.torches);
    }
  });

  // 9. Presupuesto: hay antorchas en cada piso.
  it('cada piso tiene al menos una antorcha', () => {
    for (let i = 0; i < def.floors.length; i++) {
      const floor = generateFloor(def, i);
      expect(floor.torches.length, `piso ${i + 1}`).toBeGreaterThan(0);
    }
  });

  // 10. El helper torchPosition es consistente (prueba pura del cálculo).
  it('torchPosition produce posiciones coherentes con la normal', () => {
    // Reproducimos la lógica de torchPosition() sin importar dungeonView
    // (que depende de Babylon.js no disponible en Vitest).
    const torchPosition = (t: { x: number; y: number; nx: number; ny: number }, offset: number) => ({
      x: t.x + t.nx * offset,
      z: t.y + t.ny * offset,
    });
    const torch = { x: 5, y: 10, nx: 1, ny: 0 };
    const pos = torchPosition(torch, 0.12);
    expect(pos.x).toBe(5.12);
    expect(pos.z).toBe(10);

    const torch2 = { x: 5, y: 10, nx: 0, ny: -1 };
    const pos2 = torchPosition(torch2, 0.5);
    expect(pos2.x).toBe(5);
    expect(pos2.z).toBe(9.5);
  });
});
