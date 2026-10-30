// Progresión y economía a lo largo del tiempo:
//  · Granja: la arena del Slice 01 (el único encuentro del mundo) se limpia una
//    y otra vez, como si reapareciera. La vida y el recurso se arrastran entre
//    pasadas; entre una y otra el bot recoge, se equipa, gasta puntos, vende lo
//    que no usa, repone pociones y descansa. Morir cuesta un tiempo fijo.
//  · Pesca: lanzar, esperar y sacar al picar con una probabilidad dada.
//  · Tienda: minutos de granja o de pesca que cuesta cada objeto.
import type { GameData } from '../../src/data';
import { xpToNext } from '../../src/rpg/progression';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { PlayerBot } from './bot';
import { pondField } from './data';
import { equipUpgrades, learnScrolls, restockPotions, sellJunk, spendPoints } from './gear';
import { addTally, emptyRarities, emptyTally, Recorder, type CombatTally, type RarityCount } from './metrics';
import { DT, makeSession, SKILLS, type SkillId } from './scenarios';

/** Segundos que se pierden al morir (volver, recuperarse). PROPUESTA del simulador, no del juego. */
export const DEATH_PENALTY = 30;
/** Descansa hasta tener esta fracción de vida y de recurso (o `REST_MAX` s). */
const REST_TO = 0.8;
const REST_MAX = 120;
/** Pociones menores que repone entre pasadas. */
const KEEP_POTIONS = 3;
const SELL_TO = 'smith';
const BUY_FROM = 'apothecary';
const POTION = 'minor_health_potion';

export interface FarmCheckpoint {
  minute: number;
  level: number;
  xp: number;
  gold: number;
}

export interface FarmResult {
  classId: string;
  skill: SkillId;
  seed: number;
  minutes: number;
  /** Nivel (con fracción del siguiente) en cada minuto entero. */
  checkpoints: FarmCheckpoint[];
  /** Minuto en que se alcanzó cada nivel (índice = nivel). */
  levelAt: Record<number, number>;
  clears: number;
  deaths: number;
  xp: number;
  /** Monedas recogidas del suelo. */
  coins: number;
  /** Oro por vender lo que no usa (materiales, equipo, amuletos repetidos). */
  sales: number;
  /** Oro gastado en reponer pociones. */
  potionSpend: number;
  /** Segundos de descanso (sin enemigos, esperando a recuperarse). */
  restSeconds: number;
  tally: CombatTally;
  drops: RarityCount;
  potions: number;
  finalLevel: number;
}

/** Nivel con decimales: 3,5 = mitad del camino de 3 a 4. */
function fractionalLevel(data: GameData, level: number, xp: number): number {
  const need = xpToNext(data.rpg.progression, level);
  return need > 0 ? level + xp / need : level;
}

export function farmRun(data: GameData, classId: string, skill: SkillId, seed: number, minutes: number): FarmResult {
  const s = makeSession(data, classId, 'inicial', seed * 104729 + 3);
  const ch = s.character;
  const limit = minutes * 60;
  const out: FarmResult = {
    classId,
    skill,
    seed,
    minutes,
    checkpoints: [],
    levelAt: { 1: 0 },
    clears: 0,
    deaths: 0,
    xp: 0,
    coins: 0,
    sales: 0,
    potionSpend: 0,
    restSeconds: 0,
    tally: emptyTally(),
    drops: emptyRarities(),
    potions: 0,
    finalLevel: 1,
  };
  let clock = 0;
  let nextMinute = 1;
  let pass = 0;
  let carry: { health: number; resource: number } | null = null;
  const mark = (): void => {
    while (clock >= nextMinute * 60 && nextMinute <= minutes) {
      out.checkpoints.push({ minute: nextMinute, level: fractionalLevel(data, ch.level, ch.xp), xp: out.xp, gold: ch.gold });
      nextMinute++;
    }
  };
  while (clock < limit) {
    const w = new World(data, { character: ch, seed: seed * 1000 + pass++ });
    s.attach(w);
    if (carry) {
      ch.health = Math.min(ch.maxHealth, carry.health);
      ch.resource = Math.min(ch.maxResource, carry.resource);
    }
    const bot = new PlayerBot(w, s, { dodge: SKILLS[skill], seed: seed * 7 + pass });
    const rec = new Recorder(w);
    const coins0 = ch.gold;
    const level0 = ch.level;
    const step = (): void => {
      bot.think();
      w.tick(DT);
      rec.step(DT, bot.inCombat());
      clock += DT;
      if (ch.level > level0) for (let l = level0 + 1; l <= ch.level; l++) out.levelAt[l] ??= clock / 60;
      mark();
    };
    while (w.outcome === 'playing' && clock < limit && w.time < 600) step();
    if (w.outcome === 'victory') {
      out.clears++;
      const until = w.time + 30;
      while (w.loot.length > 0 && w.time < until && clock < limit) step();
    }
    out.coins += ch.gold - coins0;
    out.potions += bot.counters.potions;
    addTally(out.tally, rec.tally);
    if (w.outcome === 'defeat') {
      out.deaths++;
      clock += DEATH_PENALTY;
      mark();
      carry = null; // reaparece con todo lleno
      continue;
    }
    // Entre pasadas: equipo, puntos, pergaminos, venta y reposición.
    spendPoints(s);
    learnScrolls(s);
    equipUpgrades(s);
    out.sales += sellJunk(s, SELL_TO).gold;
    out.potionSpend += restockPotions(s, BUY_FROM, POTION, KEEP_POTIONS);
    // Descanso en el mundo ya vacío (la regeneración la aplica el propio tick).
    const restStart = w.time;
    while (clock < limit && w.time - restStart < REST_MAX && (ch.health < REST_TO * ch.maxHealth || ch.resource < REST_TO * ch.maxResource)) {
      w.tick(DT);
      w.drainEvents();
      clock += DT;
      mark();
    }
    out.restSeconds += w.time - restStart;
    carry = { health: ch.health, resource: ch.resource };
  }
  out.xp = out.tally.xp;
  out.drops = out.tally.drops;
  out.finalLevel = fractionalLevel(data, ch.level, ch.xp);
  return out;
}

// ─── Pesca ─────────────────────────────────────────────────────────────────

export interface FishResult {
  react: number;
  seed: number;
  minutes: number;
  casts: number;
  catches: number;
  escapes: number;
  early: number;
  /** Monedas tragadas + valor de venta de todo lo pescado. */
  gold: number;
  byItem: Record<string, number>;
}

/**
 * Pesca durante `minutes`. Al picar saca el sedal con probabilidad `react`
 * (tras 0,25–0,8 s); si no, deja que se escape. En los amagos tira antes de
 * tiempo con probabilidad (1 − react) / 2. Vuelve a lanzar 1 s después.
 */
export function fishRun(data: GameData, react: number, seed: number, minutes: number): FishResult {
  const { data: d, spotId } = pondField(data);
  const s = makeSession(d, Object.keys(d.rpg.classes)[0]!, 'inicial', seed);
  const ch = s.character;
  const spot = d.rpg.fishing.spots[spotId]!;
  const w = new World(d, { encounter: false, character: ch, seed });
  s.attach(w);
  w.player.pos = { x: spot.x, y: spot.y + spot.radius + 4 };
  w.player.prevPos = { ...w.player.pos };
  const rng = new Rng(seed ^ 0xf15);
  const out: FishResult = { react, seed, minutes, casts: 0, catches: 0, escapes: 0, early: 0, gold: 0, byItem: {} };
  let reelAt: number | null = null;
  let castAt = 0;
  const gold0 = ch.gold;
  const seen = new Map<string, number>();
  for (const i of ch.inventory.slots) if (i) seen.set(i.uid, i.quantity);
  while (w.time < minutes * 60) {
    if (!w.fishing && reelAt === null && w.time >= castAt) {
      if (w.commandFish({ x: spot.x, y: spot.y + spot.radius * 0.5 })) out.casts++;
    }
    if (reelAt !== null && w.time >= reelAt) {
      reelAt = null;
      w.commandFish(null);
    }
    w.tick(DT);
    for (const e of w.drainEvents()) {
      if (e.type === 'fishBite' && rng.chance(react)) reelAt = w.time + rng.range(0.25, 0.8);
      else if (e.type === 'fishNibble' && rng.chance((1 - react) / 2)) reelAt = w.time + rng.range(0.2, 0.5);
      else if (e.type === 'fishCatch') {
        out.catches++;
        if (e.itemId) out.byItem[e.itemId] = (out.byItem[e.itemId] ?? 0) + 1;
        castAt = w.time + 1;
      } else if (e.type === 'fishEscape') {
        if (e.reason === 'early') out.early++;
        else out.escapes++;
        castAt = w.time + 1;
      }
    }
  }
  let value = ch.gold - gold0;
  for (const i of ch.inventory.slots) {
    if (!i) continue;
    const q = i.quantity - (seen.get(i.uid) ?? 0);
    if (q > 0) value += (s.sellValue(i.uid) / i.quantity) * q;
  }
  out.gold = value;
  return out;
}

// ─── Tienda ────────────────────────────────────────────────────────────────

export interface PriceRow {
  merchantId: string;
  itemId: string;
  name: string;
  rarity: string;
  level: number;
  price: number;
}

/** Precio de compra de cada objeto de cada mercader (tal y como lo calcula `Shop`). */
export function priceList(data: GameData): PriceRow[] {
  const s = makeSession(data, Object.keys(data.rpg.classes)[0]!, 'inicial', 1);
  const rows: PriceRow[] = [];
  for (const m of Object.values(data.rpg.merchants)) {
    for (const o of s.merchant(m.id)?.stock ?? []) {
      const def = data.rpg.items[o.item.itemId]!;
      rows.push({ merchantId: m.id, itemId: def.id, name: def.name, rarity: def.rarity, level: def.level, price: o.price });
    }
  }
  return rows;
}
