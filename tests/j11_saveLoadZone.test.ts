// J11: contrato de guardar/cargar — currentZone se establece tras crear el mundo
// en Iguanera y en Pedasol, y sobrevive a un ciclo de save/load simulado.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { buildOverworld, withOverworldZone } from '../src/world/overworld';
import { World } from '../src/sim/world';

const data = withOverworldZone(loadGameData(), buildOverworld(loadWorldData()));
const DT = 1 / 60;

/** Crea un mundo con el jugador en (x,y) y avanza hasta que currentZone se estabiliza. */
function worldAt(x: number, y: number, seed = 42) {
  const w = new World(data, { seed, zones: true });
  w.player.pos = { x, y };
  w.player.prevPos = { x, y };
  for (let i = 0; i < 120; i++) w.tick(DT); // 2 s para que trackZone anuncie.
  return w;
}

describe('J11: guardar y cargar conserva la zona', () => {
  it('Iguanera: currentZone se establece en iguanera_muelle al aparecer en el muelle', () => {
    const w = worldAt(592, 236);
    expect(w.currentZone?.id).toBe('iguanera_muelle');
  });

  it('Iguanera: tras simular save/load, currentZone vuelve a ser iguanera_muelle', () => {
    const w1 = worldAt(592, 236);
    expect(w1.currentZone?.id).toBe('iguanera_muelle');
    // Simula cargar: nuevo mundo, mismas coordenadas.
    const w2 = new World(data, { seed: 42, zones: true });
    w2.player.pos = { x: 592, y: 236 };
    w2.player.prevPos = { x: 592, y: 236 };
    // currentZone empieza null; trackZone lo establece tras zoneDwellSeconds.
    expect(w2.currentZone).toBeNull();
    for (let i = 0; i < 120; i++) w2.tick(DT);
    expect(w2.currentZone?.id).toBe('iguanera_muelle');
  });

  it('Pedasol: currentZone se establece al aparecer en el embarcadero', () => {
    const w = worldAt(478, 14);
    expect(w.currentZone?.id).not.toBeNull();
  });

  it('Pedasol: tras simular save/load, currentZone vuelve a la misma zona', () => {
    const w1 = worldAt(478, 14);
    const zoneId = w1.currentZone?.id;
    expect(zoneId).not.toBeNull();
    const w2 = new World(data, { seed: 42, zones: true });
    w2.player.pos = { x: 478, y: 14 };
    w2.player.prevPos = { x: 478, y: 14 };
    for (let i = 0; i < 120; i++) w2.tick(DT);
    expect(w2.currentZone?.id).toBe(zoneId);
  });

  it('el evento zoneEnter se emite al entrar en Iguanera tras cargar', () => {
    const w = new World(data, { seed: 42, zones: true });
    w.player.pos = { x: 592, y: 236 };
    w.player.prevPos = { x: 592, y: 236 };
    const seen: string[] = [];
    w.character.on((e) => {
      if (e.type === 'zoneEnter') seen.push(e.zoneId);
    });
    for (let i = 0; i < 120; i++) w.tick(DT);
    expect(seen).toContain('iguanera_muelle');
  });
});
