import { NullEngine, Scene } from '@babylonjs/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { registerStaticGlb } from '../src/render/staticModels';
import { loadGameData, type GameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { buildOverworld, withOverworldZone } from '../src/world/overworld';
import type { ArenaView } from '../src/render/arenaView';
import { BANK_LOCATION, BankScene } from '../src/scenes/bankScene';
import { World } from '../src/sim/world';

beforeAll(() => {
  for (const file of ['interiores.glb', 'mazmorra.glb']) {
    const raw = readFileSync(join(__dirname, '..', 'assets', 'models', file));
    registerStaticGlb(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer);
  }
});

function setup() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const data = withOverworldZone(loadGameData(), buildOverworld(loadWorldData()));
  data.zone.obstacles.push({ ...BANK_LOCATION.building });
  let world = new World(data, { encounter: false });
  const switchInside = vi.fn(); const onBank = vi.fn();
  const rig = { zoom: 28, jumpTo: vi.fn() };
  const bank = new BankScene({ data, view: { scene, rig } as unknown as ArenaView,
    world: () => world, install: w => { world = w; }, switchInside, onBank });
  return { scene, bank, get world() { return world; }, switchInside, onBank,
    dispose() { bank.dispose(); scene.dispose(); engine.dispose(); } };
}

describe('Banco del Cruce', () => {
  it('genera edificio, mostrador, cofre y PNJ sin DOM ni assets, y libera las mallas', () => {
    const engine = new NullEngine(); const scene = new Scene(engine);
    const onBank = vi.fn(); const switchInside = vi.fn();
    const world = { character: { spectral: { active: true } } } as unknown as World;
    const bank = new BankScene({ data: {} as GameData,
      view: { scene, rig: { zoom: 28, jumpTo: vi.fn() } } as unknown as ArenaView,
      world: () => world, install: vi.fn(), switchInside, onBank });
    try {
      expect(scene.getMeshByName('bank-door')).not.toBeNull();
      expect(scene.getMeshByName('bank-counter')).not.toBeNull();
      expect(scene.getMeshByName('bank-clerk-head')).not.toBeNull();
      expect(scene.getMeshByName('bank-chest')).not.toBeNull();
      expect(bank.exterior.isEnabled()).toBe(true);
      expect(bank.interior.isEnabled()).toBe(false);
      expect(bank.enter()).toBe(false);
      expect(switchInside).not.toHaveBeenCalled();
      bank.dispose();
      expect(scene.meshes).toHaveLength(0);
    } finally { scene.dispose(); engine.dispose(); }
  });
  it('conserva personaje, mochila, vida y pulso al entrar/salir y usa mundos transitables', () => {
    const s = setup();
    try {
      const character = s.world.character;
      character.health = 12; character.resource = 7;
      const inventory = character.inventory;
      expect(s.bank.enter()).toBe(true);
      expect(s.world.interior).toBe(true);
      expect(s.world.character).toBe(character);
      expect(character.inventory).toBe(inventory);
      expect(character.health).toBe(12); expect(character.resource).toBe(7);
      expect(s.world.grid.walkable({ x: 10, y: 9.4 })).toBe(true);
      expect(s.world.grid.walkable({ x: 16, y: 7 })).toBe(true);
      expect(s.world.grid.walkable({ x: 10, y: 11 })).toBe(false);
      expect(s.bank.exterior.isEnabled()).toBe(false);
      expect(s.bank.interior.isEnabled()).toBe(true);
      s.bank.leave();
      expect(s.world.interior).toBe(false);
      expect(s.world.player.pos).toEqual(BANK_LOCATION.returnPoint);
      expect(character.health).toBe(12); expect(character.resource).toBe(7);
      expect(s.switchInside.mock.calls).toEqual([[true], [false]]);
    } finally { s.dispose(); }
  });

  it('impide la entrada espectral', () => {
    const s = setup();
    try {
      s.world.character.spectral.die();
      expect(s.bank.enter()).toBe(false);
      expect(s.switchInside).not.toHaveBeenCalled();
    } finally { s.dispose(); }
  });
});
