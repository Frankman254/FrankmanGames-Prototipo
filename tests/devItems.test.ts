// Catálogo de pruebas: todos los objetos del juego, en la mochila o en el banco.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { grantAllItems, missingItems } from '../src/rpg/devItems';
import { Rng } from '../src/sim/rng';

const data = loadGameData();

describe('catálogo de pruebas', () => {
  it('da una unidad de cada objeto: lo que no cabe va al banco, y no repite', () => {
    const c = new Character(data.rpg, 'ember_vanguard', 'Catalogo', new Rng(1));
    const before = missingItems(c).length;
    expect(before).toBeGreaterThan(50);
    const got = grantAllItems(c);
    expect(got.bag + got.bank).toBe(before);
    expect(missingItems(c)).toEqual([]);
    expect(grantAllItems(c)).toEqual({ bag: 0, bank: 0 });
  });
});
