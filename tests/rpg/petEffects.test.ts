import { describe, expect, it } from 'vitest';
import { loadGameData, rpgRawFiles } from '../../src/data';
import { parseRpgContent } from '../../src/rpg/content';
import { Character } from '../../src/rpg/character';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';

const DT = 1 / 60;

/** Zorro con un efecto al impacto, en una arena con un enemigo que no le da tiempo a morir. */
function setup(onHit: { statusId: string; chance: number; cooldown: number; duration?: number }) {
  const data = loadGameData();
  const fox = data.rpg.pets['ash_fox']!;
  data.rpg = { ...data.rpg, pets: { ...data.rpg.pets, ash_fox: { ...fox, attack: { ...fox.attack!, min: 0, max: 0, onHit } } } };
  const rng = new Rng(1);
  const s = new GameSession(data.rpg, Character.create(data.rpg, 'storm_weaver', 'Prueba', rng), rng);
  const w = new World(data, { encounter: false, character: s.character, seed: 1 });
  s.attach(w);
  s.character.give('charm_ash_fox', 1);
  expect(s.useItem(s.character.inventory.slots.find((i) => i?.itemId === 'charm_ash_fox')!.uid).ok).toBe(true);
  const at = { x: w.player.pos.x + 2, y: w.player.pos.y };
  w.spawnQuestEnemies('melee', 1, at, 0);
  const enemy = w.enemyActor(w.enemies.list[w.enemies.list.length - 1]!);
  return { w, enemy, data };
}

function run(w: World, seconds: number): void {
  for (let i = 0; i < seconds / DT; i++) w.tick(DT);
}

describe('efectos de mascota al impacto', () => {
  it('sin efecto configurado, las mascotas de los datos sólo pegan', () => {
    for (const p of Object.values(loadGameData().rpg.pets)) expect(p.attack?.onHit, p.id).toBeUndefined();
  });

  it('aplica el estado al objetivo y no a otro', () => {
    const { w, enemy } = setup({ statusId: 'burn', chance: 1, cooldown: 0.5 });
    run(w, 3);
    expect(enemy.statuses.has('burn')).toBe(true);
    expect(w.character.statuses.has('burn')).toBe(false);
  });

  it('la cadencia limita cuántas veces se aplica, sin duplicar en un mismo golpe', () => {
    const { w } = setup({ statusId: 'burn', chance: 1, cooldown: 60 });
    let applied = 0;
    for (let i = 0; i < 5 / DT; i++) {
      w.tick(DT);
      applied += w.drainEvents().filter((e) => e.type === 'status' && e.statusId === 'burn').length;
    }
    expect(applied).toBe(1);
  });

  it('el estado expira con su duración', () => {
    const { w, enemy } = setup({ statusId: 'burn', chance: 1, cooldown: 1000, duration: 1 });
    for (let i = 0; i < 5 / DT && !enemy.statuses.has('burn'); i++) w.tick(DT);
    expect(enemy.statuses.has('burn')).toBe(true);
    run(w, 1.5);
    expect(enemy.statuses.has('burn')).toBe(false);
  });

  it('la inmunidad del objetivo lo anula', () => {
    const { w, enemy, data } = setup({ statusId: 'burn', chance: 1, cooldown: 0.5 });
    const immune = Object.values(data.rpg.statuses).find((d) => d.immune);
    expect(immune).toBeDefined();
    enemy.statuses.apply(immune!, { duration: 100, source: enemy, shield: 0 });
    run(w, 3);
    expect(enemy.statuses.has('burn')).toBe(false);
  });

  it('con probabilidad 0 no se aplica nunca', () => {
    const { w, enemy } = setup({ statusId: 'burn', chance: 0, cooldown: 0.1 });
    run(w, 3);
    expect(enemy.statuses.has('burn')).toBe(false);
  });

  it('los datos rechazan un estado que no existe', () => {
    const raw = structuredClone(rpgRawFiles()) as ReturnType<typeof rpgRawFiles> & { pets: { pets: Record<string, { attack?: Record<string, unknown> }> } };
    raw.pets.pets['ash_fox']!.attack!['onHit'] = { statusId: 'zzz', chance: 1, cooldown: 1 };
    expect(() => parseRpgContent(raw, Object.keys(loadGameData().enemies.archetypes))).toThrow(/zzz/);
  });
});
