import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { bagCellCount, rowsThatFit } from '../src/ui/menus/gridFill';

describe('C04: casillas de la mochila según la ventana', () => {
  it('rellena el espacio disponible, en ventana estrecha o ancha', () => {
    expect(bagCellCount(-1, { columns: 4, rows: 5 })).toBe(20);
    expect(bagCellCount(-1, { columns: 12, rows: 5 })).toBe(60);
  });

  it('siempre queda una fila libre tras el último objeto, aunque haya que desplazarse', () => {
    expect(bagCellCount(19, { columns: 4, rows: 5 })).toBe(24);
    expect(bagCellCount(100, { columns: 10, rows: 3 })).toBe(120);
  });

  it('nunca deja objetos fuera al estrechar la ventana', () => {
    for (const columns of [1, 2, 3, 7, 13]) {
      for (const last of [0, 5, 29, 57]) expect(bagCellCount(last, { columns, rows: 2 })).toBeGreaterThan(last);
    }
  });

  it('calcula las filas que caben', () => {
    expect(rowsThatFit(100, 46, 4)).toBe(2);
    expect(rowsThatFit(96, 46, 4)).toBe(2);
    expect(rowsThatFit(10, 46, 4)).toBe(1);
    expect(rowsThatFit(100, 0, 4)).toBe(1);
  });

  it('soltar en una casilla de relleno mueve el objeto sin perderlo y el peso no cambia', () => {
    const c = new Character(loadGameData().rpg, 'ember_vanguard', 'Rejilla', new Rng(1));
    c.give('fang', 2);
    const from = c.inventory.slots.findIndex(Boolean);
    const weight = c.inventory.bagWeight;
    const far = c.inventory.size + 25;
    expect(c.inventory.move(from, far)).toBe(true);
    expect(c.inventory.slots[far]?.itemId).toBe('fang');
    expect(c.inventory.slots[from]).toBeNull();
    expect(c.inventory.count('fang')).toBe(2);
    expect(c.inventory.bagWeight).toBe(weight);
  });
});
