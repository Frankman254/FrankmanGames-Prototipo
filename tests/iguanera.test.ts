import { describe, expect, it } from 'vitest';
import stonesJson from '../data/stones.json';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { ZoneMap } from '../src/sim/zones';
import { regionAt } from '../src/world/atlas';
import { boatAt, canBoard, parseBoats } from '../src/world/boats';
import { StoneBook, parseStones } from '../src/world/stones';

const def = parseStones(stonesJson);
const boats = parseBoats(stonesJson);
const atlas = loadWorldData().atlas;

describe('Iguanera, la isla de inicio', () => {
  it('un personaje nuevo empieza en la isla y solo conoce su Piedra', () => {
    expect(def.start).toBe('iguanera');
    const b = new StoneBook(def);
    expect(b.progress).toEqual({ known: ['iguanera'], respawn: 'iguanera' });
  });

  it('un guardado de antes sigue conociendo Villa Raspadura', () => {
    const b = new StoneBook(def, { known: ['garza'], respawn: 'garza' });
    expect(b.progress.known).toEqual(['raspadura', 'garza']);
    expect(new StoneBook(def, { known: [], respawn: 'x' }).progress.respawn).toBe('raspadura');
  });

  it('la isla es de Los Santos, está separada de la costa y su zona va del 1 al 3', () => {
    const island = def.stones.find((s) => s.id === 'iguanera')!;
    expect(regionAt(atlas, island.x, island.y)?.id).toBe('los_santos');
    for (let x = 500; x <= 530; x += 5) expect(regionAt(atlas, x, island.y), `${x}`).toBeNull();
    const z = new ZoneMap(loadGameData().zones).zoneAt({ x: 700, y: 230 })!; // el centro de la isla (la Piedra está en el campamento seguro)
    expect([z.id, z.levelMin, z.levelMax]).toEqual(['iguanera', 1, 3]);
  });

  it('las lanchas van y vuelven entre la isla y Pedasol', () => {
    const go = boats.find((b) => b.id === 'iguanera_pedasol')!;
    const back = boats.find((b) => b.id === 'pedasol_iguanera')!;
    expect(go.to).toEqual({ x: back.x, y: back.y });
    expect(back.to).toEqual({ x: go.x, y: go.y });
    expect(boatAt(boats, { x: go.x + 3, y: go.y })?.id).toBe(go.id);
    expect(boatAt(boats, { x: go.x + 6, y: go.y })).toBeNull();
    expect(canBoard(go, { x: go.x + 1, y: go.y })).toBe(true);
    expect(canBoard(go, { x: go.x + 3, y: go.y })).toBe(false);
  });
});
