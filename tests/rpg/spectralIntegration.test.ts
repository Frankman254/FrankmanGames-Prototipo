import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { RpgSessionFactory, type GameSession } from '../../src/rpg/session';
import { MemoryStore, SaveStore } from '../../src/ui/menus/saveStore';
import { World } from '../../src/sim/world';
import { loadWorldData } from '../../src/data/worldData';
import { buildOverworld, withOverworldZone } from '../../src/world/overworld';

const DT = 1 / 60;
/** La derrota que deja el Pulso en 0: la que convierte en fantasma. */
function kill(s: GameSession) {
  s.energy.value = s.content.energy.deathCost;
  return s.onDeath();
}
function setup(interior = false) {
  const data = loadGameData();
  const factory = new RpgSessionFactory(data.rpg);
  const session = factory.newGame('ember_vanguard', 'Espectral', 13);
  const expanded = { ...data, zone: { ...data.zone, width: 256, depth: 256, playerStart: { x: 130, y: 120 } } };
  const world = new World(expanded, { character: session.character, encounter: false, interior });
  session.attach(world);
  return { data: expanded, factory, session, world };
}

describe('muerte espectral integrada', () => {
  it('los tres Alzadores tienen una llegada pisable dentro del radio en el mapa real', () => {
    const data = withOverworldZone(loadGameData(), buildOverworld(loadWorldData()));
    const w = new World(data, { encounter: false });
    for (const altar of data.rpg.spectral.resurrectors) {
      const point = { x: altar.x, y: altar.y };
      const cell = w.grid.nearestWalkable(point);
      expect(cell, altar.name).toBeGreaterThanOrEqual(0);
      const arrival = w.grid.walkable(point) ? point : w.grid.center(cell);
      expect(Math.hypot(arrival.x - altar.x, arrival.y - altar.y), altar.name).toBeLessThanOrEqual(data.rpg.spectral.resurrectRadius);
      w.commandMove(arrival);
      expect(w.player.path.length, altar.name).toBeGreaterThan(0);
      const end = w.player.path[w.player.path.length - 1]!;
      expect(Math.hypot(end.x - altar.x, end.y - altar.y), altar.name).toBeLessThanOrEqual(data.rpg.spectral.resurrectRadius);
    }
  });
  it('una caída pierde Pulso una sola vez y el estado sobrevive al mundo de reaparición', () => {
    const { data, session: s, world } = setup();
    world.player.health = 0;
    world.tick(DT);
    expect(world.drainEvents().filter((e) => e.type === 'playerDeath')).toHaveLength(1);
    s.energy.value = s.content.energy.deathCost;
    const before = s.energy.value;
    expect(s.onDeath().lost).toBe(s.content.energy.deathCost);
    expect(s.onDeath().lost).toBe(0);
    expect(s.energy.value).toBe(before - s.content.energy.deathCost);
    const next = new World(data, { character: s.character, encounter: false });
    s.attach(next);
    expect(next.player.alive).toBe(true);
    expect(s.player().spectral).toEqual({ active: true, deaths: 1 });
  });

  it('permite andar más lento y bloquea combate, mascotas, pesca y botín', () => {
    const { data, session: s } = setup();
    const charm = s.character.inventory.slots.find((i) => i?.itemId === 'charm_ash_fox')!;
    expect(s.useItem(charm.uid).ok).toBe(true);
    kill(s);
    const w = new World(data, { character: s.character, encounter: false });
    s.attach(w);
    const enemy = w.spawnEnemy('melee', { x: 131, y: 120 });
    w.commandAttack(enemy.id);
    expect(w.player.attackTarget).toBeNull();
    expect(w.checkCast(w.basicAttack(), enemy.id)).toBe('spectral');
    expect(w.precheckCast(w.spell('charge'))).toBe('spectral');
    expect(w.commandFish({ x: 10, y: 10 })).toBe(false);
    w.dropToGround(s.character.items.create('fang', 1));
    const loot = w.loot[0]!;
    expect(w.collect(loot.id)).toBe(false);
    w.commandPickup(loot.id);
    expect(w.player.pickupTarget).toBeNull();
    const before = { ...w.player.pos };
    const baseSpeed = s.character.stats.get('moveSpeed');
    w.commandMove({ x: 132, y: 120 });
    w.tick(0.1);
    expect(w.player.pos.x).toBeGreaterThan(before.x);
    expect(w.player.pos.x - before.x).toBeLessThanOrEqual(baseSpeed * s.content.spectral.speedMultiplier * 0.1 + 1e-8);
    expect(w.pets).toHaveLength(0);
    expect(s.pet()).toBeNull();
    expect(w.loot).toHaveLength(1);
    expect(s.useItem(charm.uid).ok).toBe(false);
  });

  it('los enemigos ignoran al espectro y no hay daño ni estados en ninguno de los sentidos', () => {
    const { session: s, world: w } = setup();
    kill(s);
    const enemy = w.spawnEnemy('melee', { x: 131, y: 120 });
    const actor = w.enemyActor(enemy);
    const playerHp = s.character.health, enemyHp = enemy.health;
    const hit = { min: 100, max: 100, element: 'earth' as const, scaling: 0, critChance: 0, critBonus: 0 };
    w.context(actor, 'prueba', w.player.pos, 0).damage(s.character, hit);
    w.context(s.character, 'prueba', enemy.pos, 0).damage(actor, hit);
    w.context(actor, 'prueba', w.player.pos, 0).applyStatus(s.character, w.content.statuses['burn']!, 5);
    for (let i = 0; i < 180; i++) w.tick(DT);
    expect(s.character.health).toBe(playerHp);
    expect(enemy.health).toBe(enemyHp);
    expect(s.character.statuses.has('burn')).toBe(false);
    expect(enemy.state).toBe('idle');
    expect(w.drainEvents().some((e) => e.type === 'damage')).toBe(false);
  });

  it('solo recupera forma viva dentro del radio del Alzador y en el exterior', () => {
    const { session: s, world: w } = setup();
    kill(s);
    const altar = w.content.spectral.resurrectors[0]!;
    w.player.pos = { x: altar.x + w.content.spectral.resurrectRadius + 0.01, y: altar.y };
    w.tick(DT);
    expect(s.character.spectral.active).toBe(true);
    w.player.pos = { x: altar.x, y: altar.y };
    w.tick(DT);
    expect(s.character.spectral.active).toBe(false);
    expect(s.character.health).toBe(s.character.maxHealth);
    expect(w.checkCast(w.basicAttack(), null)).not.toBe('spectral');
    w.tick(DT);
    expect(s.character.spectral.deaths).toBe(1);
    const inside = setup(true);
    kill(inside.session);
    inside.world.player.pos = { x: altar.x, y: altar.y };
    inside.world.tick(DT);
    expect(inside.session.character.spectral.active).toBe(true);
  });

  it('guardado de ranura y fábrica conservan espectro y Pulso; guardado antiguo empieza vivo', () => {
    const { session: s, factory, data } = setup();
    kill(s);
    const store = new SaveStore(new MemoryStore());
    store.write(0, s.save());
    const loaded = factory.load(store.read(0)!, 14);
    const next = new World(data, { character: loaded.character, encounter: false });
    loaded.attach(next);
    expect(loaded.player().spectral).toEqual({ active: true, deaths: 1 });
    expect(loaded.energy.value).toBe(s.energy.value);
    const old = { ...s.save() };
    delete old.spectral;
    expect(factory.load(old, 15).character.spectral.active).toBe(false);
  });

  it('cada derrota quita 20 de Pulso sin matar; solo a 0 hay fantasma, y al revivir vuelve a 20', () => {
    const { session: s, world } = setup();
    expect(s.content.energy.deathCost).toBe(20);
    expect(s.content.energy.reviveAt).toBe(20);
    for (const left of [80, 60, 40, 20]) {
      expect(s.onDeath().value).toBe(left);
      expect(s.character.spectral.active).toBe(false);
    }
    expect(s.onDeath().value).toBe(0);
    expect(s.character.spectral.active).toBe(true);
    s.tick(0);
    expect(s.character.spectral.resurrectByAlly()).toBe(true);
    s.tick(0);
    expect(world.character.spectral.active).toBe(false);
    expect(s.energy.value).toBe(20);
    expect(s.player().energy?.exhausted).toBe(false);
  });

  it('el fantasma no puede hablar, comerciar ni cambiar de equipo', () => {
    const { session: s } = setup();
    const worn = Object.keys(s.equipment())[0]!;
    kill(s);
    expect(s.talk(Object.keys(s.content.npcs)[0]!)).toBeNull();
    expect(s.unequip(worn as never).ok).toBe(false);
    expect(s.equip('cualquiera').ok).toBe(false);
    expect(s.buy(Object.keys(s.content.merchants)[0]!, 0, 1).ok).toBe(false);
  });

  it('morir deja el Pulso en 0; sólo sube tras revivir, y despacio', () => {
    const { session: s, world: w } = setup();
    kill(s);
    const before = s.energy.value;
    expect(before).toBe(0);
    const def = s.content.energy;
    s.tick(60);
    s.restEnergy(10);
    expect(s.energy.value).toBe(before);
    const altar = w.content.spectral.resurrectors[0]!;
    w.player.pos = { x: altar.x, y: altar.y };
    w.tick(DT);
    s.tick(60);
    expect(s.energy.value).toBeCloseTo(def.reviveAt + def.regenPerMinute);
    s.restEnergy(1);
    expect(s.energy.value).toBeCloseTo(def.reviveAt + def.regenPerMinute + def.rest.perSecond);
  });

  it('cerrar la ventana de botín en espectro no pierde la recompensa pendiente', () => {
    const { session: s, world: w } = setup();
    s.character.emit({ type: 'spoils', spoils: { id: 1, gold: 9, xp: 0, kills: 1, seconds: 1, share: 1, items: [], participants: [] } });
    const gold = s.character.gold;
    kill(s);
    expect(s.takeSpoils('all').ok).toBe(false);
    s.closeSpoils();
    expect(s.spoils()?.gold).toBe(9);
    expect(s.character.gold).toBe(gold);
    const altar = w.content.spectral.resurrectors[0]!;
    w.player.pos = { x: altar.x, y: altar.y };
    w.tick(DT);
    expect(s.takeSpoils('all').ok).toBe(true);
    expect(s.character.gold).toBe(gold + 9);
  });

  it('guardar y cargar en espectro conserva el botín y permite recogerlo una sola vez al resucitar', () => {
    const { session: s, factory, data } = setup();
    const item = s.character.items.create('fang', 2);
    s.character.emit({ type: 'spoils', spoils: { id: 1, gold: 9, xp: 5, kills: 1, seconds: 1, share: 1, items: [item], participants: [] } });
    kill(s);
    const store = new SaveStore(new MemoryStore());
    store.write(0, s.save());
    const loaded = factory.load(store.read(0)!, 30);
    expect(loaded.spoils()?.items).toEqual([item]);
    expect(loaded.spoils()?.gold).toBe(9);
    expect(loaded.character.xp).toBe(s.character.xp);
    const world = new World(data, { character: loaded.character, encounter: false });
    loaded.attach(world);
    expect(loaded.takeSpoils('all').ok).toBe(false);
    const altar = world.content.spectral.resurrectors[0]!;
    world.player.pos = { x: altar.x, y: altar.y };
    world.tick(DT);
    const gold = loaded.character.gold;
    expect(loaded.takeSpoils('all').ok).toBe(true);
    expect(loaded.character.gold).toBe(gold + 9);
    expect(loaded.character.inventory.count('fang')).toBe(2);
    expect(loaded.takeSpoils('all').ok).toBe(false);
  });
});
