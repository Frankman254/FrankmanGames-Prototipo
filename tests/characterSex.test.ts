// P09: el sexo se elige al crear la partida, se guarda y los guardados antiguos quedan en masculino.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { RpgSessionFactory } from '../src/rpg/session';

const data = loadGameData();

describe('sexo del personaje', () => {
  it('se guarda y se carga; sin dato, masculino', () => {
    const f = new RpgSessionFactory(data.rpg);
    const s = f.newGame('mangrove_hunter', 'Rosa', 7, 'femenino');
    expect(s.character.sex).toBe('femenino');
    const save = s.save();
    expect(save.sex).toBe('femenino');
    expect(f.load(save, 7).character.sex).toBe('femenino');
    const { sex: _drop, ...old } = save;
    expect(f.load(old, 7).character.sex).toBe('masculino');
  });
});
