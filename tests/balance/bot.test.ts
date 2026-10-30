import { describe, expect, it } from 'vitest';
import { PlayerBot } from '../../scripts/balance/bot';
import { buildData, FIELD_CENTER, openField, rawData } from '../../scripts/balance/data';
import { equipUpgrades, isMelee, sellJunk, spendPoints } from '../../scripts/balance/gear';
import { makeSession, runScenario, SCENARIOS } from '../../scripts/balance/scenarios';
import { World } from '../../src/sim/world';

const data = buildData(rawData());
const scenario = (id: string) => SCENARIOS.find((s) => s.id === id)!;

describe('bot de equilibrio', () => {
  it('juega igual con la misma semilla', () => {
    const spec = { scenario: scenario('lobos3'), classId: 'ember_vanguard', skill: 'medio' as const, prep: 'inicial' as const, seed: 4 };
    const a = runScenario(data, spec);
    const b = runScenario(data, spec);
    expect(a.seconds).toBe(b.seconds);
    expect(a.tally.dealt).toBe(b.tally.dealt);
    expect(a.tally.casts).toEqual(b.tally.casts);
  });

  it('limpia un grupo pequeño con las dos clases usando la barra', () => {
    for (const classId of Object.keys(data.rpg.classes)) {
      const r = runScenario(data, { scenario: scenario('lobos3'), classId, skill: 'medio', prep: 'inicial', seed: 1 });
      expect(r.win, classId).toBe(true);
      const spells = Object.keys(r.tally.casts).filter((k) => k !== 'basic');
      expect(spells.length, classId).toBeGreaterThanOrEqual(3);
      expect(r.tally.xp).toBe(3 * data.rpg.enemies.melee!.xp);
    }
  });

  it('esquivar más recibe menos golpes', () => {
    let bad = 0;
    let good = 0;
    for (const seed of [1, 2, 3]) {
      for (const classId of Object.keys(data.rpg.classes)) {
        bad += runScenario(data, { scenario: scenario('lobos8'), classId, skill: 'malo', prep: 'inicial', seed }).tally.hitsTaken;
        good += runScenario(data, { scenario: scenario('lobos8'), classId, skill: 'bueno', prep: 'inicial', seed }).tally.hitsTaken;
      }
    }
    expect(good).toBeLessThan(bad * 0.5);
  });

  it('bebe una poción con poca vida', () => {
    const d = openField(data);
    const s = makeSession(d, 'ember_vanguard', 'inicial', 2);
    const w = new World(d, { encounter: false, character: s.character, seed: 2 });
    s.attach(w);
    w.spawnEnemy('melee', { x: FIELD_CENTER.x + 6, y: FIELD_CENTER.y });
    const bot = new PlayerBot(w, s, { dodge: 0, seed: 1 });
    s.character.health = 10;
    bot.think();
    expect(bot.counters.potions).toBe(1);
    expect(s.character.health).toBeGreaterThan(10);
  });
});

describe('reglas fuera de combate', () => {
  it('equipa lo que mejora y no cambia de tipo de arma', () => {
    const w = makeSession(data, 'storm_weaver', 'inicial', 3);
    w.character.gainXp(10_000);
    w.character.give('storm_orb', 1);
    w.character.give('woodcutter_axe', 1);
    equipUpgrades(w);
    expect(w.character.weapon()?.id).toBe('storm_orb');
    const v = makeSession(data, 'ember_vanguard', 'inicial', 3);
    v.character.give('storm_orb', 1);
    v.character.gainXp(10_000);
    equipUpgrades(v);
    expect(v.character.weapon()?.weapon?.range).toBeLessThanOrEqual(3);
    expect(isMelee(v.character)).toBe(true);
    expect(isMelee(w.character)).toBe(false);
  });

  it('gasta los puntos: dos a la principal por cada uno a vitalidad', () => {
    const s = makeSession(data, 'ember_vanguard', 'inicial', 5);
    s.character.gainXp(10_000);
    const pts = s.character.unspentStatPoints;
    spendPoints(s);
    expect(s.character.unspentStatPoints).toBe(0);
    const main = s.character.allocated.strength ?? 0;
    const vit = s.character.allocated.vitality ?? 0;
    expect(main + vit).toBe(pts);
    expect(Math.abs(main - 2 * vit)).toBeLessThanOrEqual(2);
  });

  it('vende materiales y equipo sobrante, no las pociones ni lo de nivel mayor', () => {
    const s = makeSession(data, 'storm_weaver', 'inicial', 6);
    const ch = s.character;
    ch.give('fang', 5);
    ch.give('padded_vest', 1);
    const potions = ch.inventory.count('minor_health_potion');
    const sold = sellJunk(s, 'smith');
    expect(sold.gold).toBeGreaterThan(0);
    expect(ch.inventory.count('fang')).toBe(0);
    expect(ch.inventory.count('padded_vest')).toBe(0);
    expect(ch.inventory.count('minor_health_potion')).toBe(potions);
    expect(ch.inventory.count('storm_orb')).toBe(1); // nivel 4: se guarda
  });
});
