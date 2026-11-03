import { describe, expect, it } from 'vitest';
import { loadGameData, type GameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import { applyCraftQuality, needleAt, ProfessionLog, professionXpToNext, strikeScore } from '../../src/rpg/professions';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';

const DT = 1 / 60;

/** Las pruebas corren en la arena de 80 m: los recursos y talleres se traen a ella. */
function setup(seed = 1): { w: World; s: GameSession; data: GameData } {
  const data = loadGameData();
  const jobs = data.rpg.professions;
  const groves = jobs.groves.map((g, i) => ({ ...g, x: 15 + (i % 3) * 25, y: 20 + Math.floor(i / 3) * 30, radius: 8 }));
  const stations = Object.fromEntries(Object.values(jobs.stations).map((st, i) => [st.id, { ...st, x: 30 + i * 20, y: 60 }]));
  data.rpg = { ...data.rpg, professions: { ...jobs, groves, stations } };
  const rng = new Rng(seed);
  const s = new GameSession(data.rpg, Character.create(data.rpg, 'storm_weaver', 'Prueba', rng), rng);
  const w = new World(data, { encounter: false, character: s.character, seed });
  s.attach(w);
  return { w, s, data };
}

function moveTo(w: World, x: number, y: number): void {
  w.player.pos = { x, y };
  w.player.prevPos = { x, y };
  w.player.path = [];
  w.player.moveTarget = null;
}

function run(w: World, seconds: number, until?: () => boolean): void {
  for (let i = 0; i < seconds / DT && !until?.(); i++) w.tick(DT);
}

function gatherable(w: World, kind: string) {
  return w.gatherField!.nodes.find((n) => n.kind === kind)!;
}

describe('nivel de oficio', () => {
  const def = loadGameData().rpg.professions;

  it('sube aparte y se para en el máximo', () => {
    const log = new ProfessionLog(def);
    expect(log.level('miner')).toBe(1);
    expect(log.gain('miner', professionXpToNext(def.rules, 1))).toBe(1);
    expect(log.level('miner')).toBe(2);
    expect(log.level('woodcutter')).toBe(1);
    log.gain('miner', 1e9);
    expect(log.level('miner')).toBe(def.rules.maxLevel);
    expect(log.view().find((p) => p.id === 'miner')!.xpToNext).toBe(0);
    expect(log.gain('miner', 100)).toBe(0);
  });

  it('se guarda y se recupera, también sin datos o con datos raros', () => {
    const log = new ProfessionLog(def);
    log.gain('farmer', 30);
    const back = new ProfessionLog(def, JSON.parse(JSON.stringify(log.toSave())));
    expect(back.view()).toEqual(log.view());
    expect(new ProfessionLog(def, undefined).level('farmer')).toBe(1);
    expect(new ProfessionLog(def, { farmer: { level: 9999, xp: 5 } }).level('farmer')).toBe(def.rules.maxLevel);
  });
});

describe('recoger recursos', () => {
  it('hay recursos de los tres oficios de recolección en el mapa', () => {
    const { w, data } = setup();
    const total = data.rpg.professions.groves.reduce((a, g) => a + g.count, 0);
    expect(w.gatherField!.nodes).toHaveLength(total);
    for (const n of w.gatherField!.nodes) expect(w.grid.walkable(n), n.kind).toBe(true);
  });

  it('el bosque está en el mismo sitio en cada partida', () => {
    const a = setup(1).w.gatherField!.nodes.map((n) => [n.x, n.y]);
    const b = setup(99).w.gatherField!.nodes.map((n) => [n.x, n.y]);
    expect(a).toEqual(b);
  });

  it('camina, recoge, da material y experiencia, y el recurso vuelve', () => {
    const { w, s, data } = setup();
    const n = gatherable(w, 'cedar');
    const k = data.rpg.professions.nodes['cedar']!;
    moveTo(w, n.x + 6, n.y);
    expect(w.commandGather(n.id)).toBe(true);
    run(w, 30, () => s.character.inventory.count('wood_cedar') > 0);
    expect(s.character.inventory.count('wood_cedar')).toBeGreaterThanOrEqual(k.min);
    expect(s.character.professions.view().find((p) => p.id === 'woodcutter')!.xp).toBe(k.xp);
    expect(n.respawn).toBeGreaterThan(0);
    expect(w.commandGather(n.id)).toBe(false);
    run(w, k.respawnSeconds + 1);
    expect(n.respawn).toBe(0);
    expect(w.commandGather(n.id)).toBe(true);
  });

  it('moverse cancela la recogida y no da nada', () => {
    const { w, s } = setup();
    const n = gatherable(w, 'cedar');
    moveTo(w, n.x + 1, n.y);
    w.commandGather(n.id);
    run(w, 0.3);
    expect(w.gathering).not.toBeNull();
    w.commandMove({ x: n.x + 8, y: n.y });
    expect(w.gathering).toBeNull();
    run(w, 5);
    expect(s.character.inventory.count('wood_cedar')).toBe(0);
    expect(n.respawn).toBe(0);
  });

  it('un recurso de nivel alto pide nivel de oficio', () => {
    const { w, s } = setup();
    const n = gatherable(w, 'guayacan');
    moveTo(w, n.x + 1, n.y);
    w.commandGather(n.id);
    run(w, 5);
    expect(s.character.inventory.count('wood_guayacan')).toBe(0);
    s.character.professions.gain('woodcutter', 1e6);
    w.commandGather(n.id);
    run(w, 5);
    expect(s.character.inventory.count('wood_guayacan')).toBeGreaterThan(0);
  });

  it('pescar da experiencia de pescador', () => {
    const { s } = setup();
    s.character.gainProfessionXp('fisher', 5);
    expect(s.character.professions.view().find((p) => p.id === 'fisher')!.xp).toBe(5);
  });
});

describe('fabricar', () => {
  function atForge(): { w: World; s: GameSession; data: GameData } {
    const r = setup();
    const f = r.data.rpg.professions.stations['forge']!;
    moveTo(r.w, f.x + 1, f.y);
    return r;
  }

  it('pide taller, nivel y materiales, y no gasta nada si falta algo', () => {
    const { w, s, data } = atForge();
    expect(s.craft('short_sword').ok).toBe(false); // sin materiales
    s.character.give('ore', 3);
    s.character.give('wood_cedar', 1);
    const f = data.rpg.professions.stations['forge']!;
    moveTo(w, f.x + 40, f.y);
    expect(s.craft('short_sword').ok).toBe(false); // lejos del yunque
    expect(s.character.inventory.count('ore')).toBe(3);
    moveTo(w, f.x + 1, f.y);
    expect(s.craft('guayacan_club').ok).toBe(false); // nivel
    expect(s.craft('zzz').ok).toBe(false);
  });

  it('gasta materiales, entrega el objeto y da experiencia', () => {
    const { s, data } = atForge();
    s.character.give('ore', 5);
    s.character.give('wood_cedar', 1);
    const swords = s.character.inventory.count('short_sword');
    const r = s.craft('short_sword');
    expect(r.ok).toBe(true);
    expect(s.character.inventory.count('ore')).toBe(2);
    expect(s.character.inventory.count('wood_cedar')).toBe(0);
    expect(s.character.inventory.count('short_sword')).toBe(swords + 1);
    expect(s.character.professions.view().find((p) => p.id === 'smith')!.xp).toBe(data.rpg.professions.recipes['short_sword']!.xp);
  });

  it('el telar confecciona lo que no es arma ni escudo, y la forja sólo eso', () => {
    const { rpg } = loadGameData();
    for (const r of Object.values(rpg.professions.recipes)) {
      const slot = rpg.items[r.output]!.slot;
      const forged = slot === 'weapon' || slot === 'offhand';
      expect(r.profession, r.id).toBe(forged ? 'smith' : 'tailor');
    }
  });

  it('el minijuego acerca las tiradas al máximo y fallarlo no empeora nada', () => {
    const { rpg } = loadGameData();
    const def = rpg.items['padded_vest']!;
    const roll = def.rolls[0]!;
    const base = { uid: 'x', itemId: def.id, quantity: 1, rolled: [{ stat: roll.stat, op: roll.op, value: roll.min }] };
    const failed = structuredClone(base);
    applyCraftQuality(def, failed, 0, 0.7);
    expect(failed.rolled[0]!.value).toBe(roll.min);
    const perfect = structuredClone(base);
    applyCraftQuality(def, perfect, 1, 1);
    expect(perfect.rolled[0]!.value).toBe(roll.max);
    const fair = structuredClone(base);
    applyCraftQuality(def, fair, 1, 0.7);
    expect(fair.rolled[0]!.value).toBeGreaterThanOrEqual(roll.min);
    expect(fair.rolled[0]!.value).toBeLessThanOrEqual(roll.max);
  });

  it('la aguja va y viene, y el golpe puntúa según la cercanía a la banda', () => {
    expect(needleAt(0, 1)).toBe(0);
    expect(needleAt(1, 1)).toBe(1);
    expect(needleAt(1.5, 1)).toBeCloseTo(0.5);
    expect(strikeScore(0.5, 0.5, 0.1)).toBe(1);
    expect(strikeScore(0.55, 0.5, 0.1)).toBeCloseTo(0.5);
    expect(strikeScore(0.9, 0.5, 0.1)).toBe(0);
  });

  it('los niveles de oficio se guardan con la partida', () => {
    const { s, data } = atForge();
    s.character.gainProfessionXp('smith', 500);
    const level = s.character.professions.level('smith');
    expect(level).toBeGreaterThan(1);
    const save = JSON.parse(JSON.stringify(s.save()));
    const back = Character.fromSave(data.rpg, save, new Rng(2));
    expect(back.professions.level('smith')).toBe(level);
    delete save.professions;
    expect(Character.fromSave(data.rpg, save, new Rng(2)).professions.level('smith')).toBe(1);
  });
});
