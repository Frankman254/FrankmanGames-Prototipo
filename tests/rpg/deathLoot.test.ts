// muerte-botin: Pulso en la sesión (muerte, penalización, consumible, guardado)
// y botín de fin de combate en el mundo (ventana en lugar del suelo).
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import type { SessionEvent } from '../../src/rpg/contracts';
import { Encounter } from '../../src/rpg/spoils';
import { GameSession, RpgSessionFactory } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { content, session } from './helpers';

const DT = 1 / 60;

describe('Pulso en la sesión', () => {
  it('cada muerte resta deathCost y a 0 aplica la penalización a la hoja', () => {
    const s = session();
    const def = s.content.energy;
    const power = s.character.stats.get('power');
    const hp = s.character.maxHealth;
    const deaths = Math.ceil(def.max / def.deathCost);
    let last = s.onDeath();
    expect(last.lost).toBe(def.deathCost);
    for (let i = 1; i < deaths; i++) last = s.onDeath();
    expect(last.value).toBe(0);
    expect(last.exhausted).toBe(true);
    expect(s.player().energy?.penalty?.name).toBe(def.penalty.name);
    expect(s.character.maxHealth).toBeLessThan(hp);
    expect(s.character.stats.get('power')).toBeCloseTo(power + def.penalty.modifiers.find((m) => m.stat === 'power')!.value);
    expect(s.player().stats.find((l) => l.stat === 'maxHealth')!.breakdown.some((b) => b.source === 'energy')).toBe(true);
    // Otra muerte a 0 no baja de 0 ni vuelve a avisar de que se agotó.
    expect(s.onDeath()).toMatchObject({ lost: 0, value: 0, justExhausted: false });
  });

  it('se recupera descansando, con el consumible y con el tiempo; la penalización se quita en clearAt', () => {
    const s = session();
    const def = s.content.energy;
    while (s.energy.value > 0) s.onDeath();
    s.restEnergy(1);
    expect(s.energy.value).toBeCloseTo(def.rest.perSecond);
    expect(s.character.give('pulse_draught', 1)).toBe(0);
    const uid = s.character.inventory.slots.find((x) => x?.itemId === 'pulse_draught')!.uid;
    expect(s.useItem(uid).ok).toBe(true);
    expect(s.energy.value).toBeCloseTo(def.rest.perSecond + def.items['pulse_draught']!);
    expect(s.character.inventory.slots.some((x) => x?.itemId === 'pulse_draught')).toBe(false);
    // El tiempo sólo corre con un mundo enlazado: regenPerMinute.
    const w = new World(loadGameData(), { encounter: false, character: s.character, seed: 2 });
    s.attach(w);
    const before = s.energy.value;
    s.tick(60);
    expect(s.energy.value).toBeCloseTo(before + def.regenPerMinute);
    expect(s.energy.value).toBeGreaterThanOrEqual(def.penalty.clearAt);
    expect(s.player().energy?.exhausted).toBe(false);
    expect(s.character.stats.has('energy')).toBe(false);
  });

  it('con el pulso lleno el consumible no se gasta', () => {
    const s = session();
    s.character.give('pulse_draught', 1);
    const uid = s.character.inventory.slots.find((x) => x?.itemId === 'pulse_draught')!.uid;
    expect(s.useItem(uid).ok).toBe(false);
    expect(s.character.inventory.find(uid)).toBeTruthy();
  });

  it('se guarda y se carga (también agotado); un guardado antiguo empieza con la energía inicial', () => {
    const s = session();
    while (s.energy.value > 0) s.onDeath();
    const save = s.save();
    expect(save.energy).toEqual({ value: 0, exhausted: true });
    const f = new RpgSessionFactory(content());
    const loaded = f.load(JSON.parse(JSON.stringify(save)), 3);
    expect(loaded.energy.value).toBe(0);
    expect(loaded.character.stats.has('energy')).toBe(true);
    const old = { ...save };
    delete old.energy;
    expect(f.load(old, 3).energy.value).toBe(content().energy.start);
  });
});

function arena(seed = 1): { w: World; s: GameSession; events: SessionEvent[] } {
  const data = loadGameData();
  const rng = new Rng(seed);
  const s = new GameSession(data.rpg, Character.create(data.rpg, 'ember_vanguard', 'Prueba', rng), rng);
  const w = new World(data, { encounter: false, character: s.character, seed });
  s.attach(w);
  w.player.pos = { x: 10, y: 10 };
  w.player.prevPos = { x: 10, y: 10 };
  const events: SessionEvent[] = [];
  s.on((e) => events.push(e));
  return { w, s, events };
}

function run(w: World, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    w.tick(DT);
    w.drainEvents();
  }
}

describe('botín de fin de combate en el mundo', () => {
  it('en modo ventana no cae nada al suelo y, tras la calma, la sesión tiene el botín', () => {
    const { w, s, events } = arena();
    expect(w.content.spoils.lootMode).toBe('window');
    const e = w.spawnEnemy('alpha_wolf', { x: 30, y: 30 });
    w.enemies.damage(e, 1e6, () => {});
    run(w, 0.2);
    expect(w.loot).toHaveLength(0);
    expect(s.spoils()).toBeNull();
    run(w, w.content.spoils.calmSeconds + 0.2);
    const v = s.spoils();
    expect(v).not.toBeNull();
    expect(v!.kills).toBe(1);
    expect(v!.gold).toBeGreaterThan(0); // el lobo alfa siempre suelta monedas
    expect(v!.share).toBe(1);
    expect(v!.autoCloseSeconds).toBe(w.content.spoils.autoCloseSeconds);
    expect(events.filter((x) => x.type === 'spoils')).toHaveLength(1);
    const gold = s.character.gold;
    expect(s.takeSpoils('all').ok).toBe(true);
    expect(s.character.gold).toBe(gold + v!.gold);
    expect(s.spoils()).toBeNull();
  });

  it('el daño de una mascota del jugador cuenta para el jugador', () => {
    const { w, s } = arena();
    s.character.give('charm_moss_turtle', 1);
    const charm = s.character.inventory.slots.find((x) => x?.itemId === 'charm_moss_turtle')!;
    expect(s.useItem(charm.uid).ok).toBe(true);
    run(w, 0.1);
    const pet = w.pets.find((p) => p.itemUid === charm.uid)!;
    expect(pet).toBeTruthy();
    const e = w.spawnEnemy('alpha_wolf', { x: 40, y: 40 });
    const me = `player:${w.player.id}`;
    (w as unknown as { events: unknown[] }).events.push({ type: 'damage', sourceId: pet.id, targetId: e.id, amount: 30, crit: false, toPlayer: false, ability: null });
    w.tick(DT);
    expect(w.encounter.parts.get(me)?.damage).toBe(30);
  });

  it('cerrar la ventana recoge lo que cabe y deja lo demás a los pies', () => {
    const { w, s } = arena();
    while (s.character.inventory.slots.some((x) => x === null)) s.character.give('short_sword', 1);
    const sword = s.character.items.create('short_sword', 1);
    s.character.emit({ type: 'spoils', spoils: { id: 0, gold: 5, xp: 0, kills: 1, seconds: 3, share: 1, items: [sword], participants: [] } });
    expect(s.takeSpoils(sword.uid).ok).toBe(false); // no cabe
    expect(s.spoils()!.items).toHaveLength(1);
    s.closeSpoils();
    expect(s.spoils()).toBeNull();
    expect(w.loot.some((l) => l.item?.uid === sword.uid)).toBe(true);
  });

  it('dos combates seguidos sin recoger se juntan', () => {
    const s = session();
    const a = s.character.items.create('fang', 2);
    const b = s.character.items.create('hide', 1);
    s.character.emit({ type: 'spoils', spoils: { id: 0, gold: 3, xp: 10, kills: 1, seconds: 4, share: 1, items: [a], participants: [] } });
    s.character.emit({ type: 'spoils', spoils: { id: 0, gold: 4, xp: 5, kills: 2, seconds: 6, share: 1, items: [b], participants: [] } });
    expect(s.spoils()).toMatchObject({ gold: 7, xp: 15, kills: 3, seconds: 10 });
    expect(s.spoils()!.items.map((i) => i.itemId)).toEqual(['fang', 'hide']);
  });
});

describe('reparto por participación', () => {
  it('cada objeto le toca a uno; con mucha más parte, casi siempre al que más aportó', () => {
    const rules = content().spoils;
    let topWins = 0;
    for (let seed = 0; seed < 200; seed++) {
      const enc = new Encounter(rules, new Rng(seed));
      enc.damage('a', 950);
      enc.damage('b', 50);
      enc.addKill(20, 10, [{ uid: `x${seed}`, itemId: 'fang', quantity: 1, rolled: [] }]);
      const r = enc.tick(rules.calmSeconds + 0.01, 0, ['a', 'b'])!;
      expect(r.allotments.reduce((n, x) => n + x.items.length, 0)).toBe(1);
      if (r.allotments.find((x) => x.participant === 'a')!.items.length === 1) topWins++;
    }
    expect(topWins).toBeGreaterThan(120);
    expect(topWins).toBeLessThan(200);
  });
});
