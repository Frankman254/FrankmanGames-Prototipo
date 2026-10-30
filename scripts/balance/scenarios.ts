// Batería de escenarios de combate: la arena del Slice 01, grupos crecientes y
// jefes de prueba. Cada partida usa un `World` y una `GameSession` reales con
// el bot de `bot.ts` a 60 Hz.
import type { GameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import type { ItemDef } from '../../src/rpg/contracts';
import { slotsFor } from '../../src/rpg/items';
import { xpToNext } from '../../src/rpg/progression';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { PlayerBot } from './bot';
import { FIELD_CENTER, openField } from './data';
import { equipUpgrades, learnScrolls, spendPoints, summonPet } from './gear';
import { Recorder, type CombatTally } from './metrics';

export const DT = 1 / 60;

export const SKILLS = { malo: 0, medio: 0.5, bueno: 0.9 } as const;
export type SkillId = keyof typeof SKILLS;
export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

/** inicial = nivel 1 con el kit de la clase; preparado = nivel 4, puntos gastados y lo mejor de cada objeto de nivel ≤ 4. */
export type PrepId = 'inicial' | 'preparado';

export interface ScenarioDef {
  id: string;
  label: string;
  kind: 'arena' | 'grupo' | 'jefe';
  /** Enemigos (no se usa en la arena, que trae los suyos). */
  spawns: { archetype: string; count: number }[];
  /** Segundos máximos de la partida. */
  limit: number;
}

const g = (id: string, label: string, kind: ScenarioDef['kind'], spawns: ScenarioDef['spawns'], limit = 150): ScenarioDef => ({ id, label, kind, spawns, limit });

export const SCENARIOS: ScenarioDef[] = [
  g('arena', 'Arena del Slice 01 (7 enemigos repartidos)', 'arena', [], 300),
  g('lobos1', '1 lobo', 'grupo', [{ archetype: 'melee', count: 1 }]),
  g('lobos3', '3 lobos', 'grupo', [{ archetype: 'melee', count: 3 }]),
  g('lobos5', '5 lobos', 'grupo', [{ archetype: 'melee', count: 5 }]),
  g('lobos8', '8 lobos', 'grupo', [{ archetype: 'melee', count: 8 }]),
  g('goblins1', '1 goblin', 'grupo', [{ archetype: 'ranged', count: 1 }]),
  g('goblins2', '2 goblins', 'grupo', [{ archetype: 'ranged', count: 2 }]),
  g('goblins4', '4 goblins', 'grupo', [{ archetype: 'ranged', count: 4 }]),
  g('goblins6', '6 goblins', 'grupo', [{ archetype: 'ranged', count: 6 }]),
  g('chaman1', '1 chamán', 'grupo', [{ archetype: 'summoner', count: 1 }]),
  g('chaman2', '2 chamanes', 'grupo', [{ archetype: 'summoner', count: 2 }]),
  g('chaman3', '3 chamanes', 'grupo', [{ archetype: 'summoner', count: 3 }]),
  g('mixto', '2 lobos + goblin + chamán', 'grupo', [
    { archetype: 'melee', count: 2 },
    { archetype: 'ranged', count: 1 },
    { archetype: 'summoner', count: 1 },
  ]),
  g('alfa2', 'Lobo alfa + 2 lobos', 'jefe', [
    { archetype: 'alpha_wolf', count: 1 },
    { archetype: 'melee', count: 2 },
  ]),
  g('alfa4', 'Lobo alfa + 4 lobos', 'jefe', [
    { archetype: 'alpha_wolf', count: 1 },
    { archetype: 'melee', count: 4 },
  ]),
  g('alfaVet', 'Lobo alfa + 2 lobos + veterano', 'jefe', [
    { archetype: 'alpha_wolf', count: 1 },
    { archetype: 'melee', count: 2 },
    { archetype: 'goblin_veteran', count: 1 },
  ]),
  g('alfa6', 'Lobo alfa + 6 lobos', 'jefe', [
    { archetype: 'alpha_wolf', count: 1 },
    { archetype: 'melee', count: 6 },
  ]),
  g('dobleAlfa', '2 lobos alfa + 2 veteranos + 2 lobos', 'jefe', [
    { archetype: 'alpha_wolf', count: 2 },
    { archetype: 'goblin_veteran', count: 2 },
    { archetype: 'melee', count: 2 },
  ]),
];

export interface RunSpec {
  scenario: ScenarioDef;
  classId: string;
  skill: SkillId;
  prep: PrepId;
  seed: number;
  /** Barra alternativa (ablaciones y sustituciones); null en un hueco = vacío. */
  hotbar?: (string | null)[];
}

export interface RunResult {
  scenario: string;
  classId: string;
  skill: SkillId;
  prep: PrepId;
  seed: number;
  win: boolean;
  died: boolean;
  /** Segundos hasta limpiar el escenario (o hasta caer / el límite). */
  seconds: number;
  potions: number;
  tonics: number;
  threats: number;
  dodgeTries: number;
  evades: number;
  /** Fracción de decisiones en combate con un hechizo listo que no se podía pagar. */
  starved: number;
  /** Vida restante al acabar (fracción). */
  healthLeft: number;
  /** Oro de monedas + valor de venta de los objetos que se llevó. */
  gold: number;
  tally: CombatTally;
}

/** Objetos equipables de nivel ≤ `level` (una copia de cada uno). */
function gearUpTo(data: GameData, level: number): ItemDef[] {
  return Object.values(data.rpg.items).filter((d) => slotsFor(d).length > 0 && d.level <= level);
}

/** Sesión nueva de la clase según la preparación. La mascota luchadora queda invocada. */
export function makeSession(data: GameData, classId: string, prep: PrepId, seed: number): GameSession {
  return makeSessionAt(data, classId, prep === 'preparado' ? 4 : 1, seed, prep === 'preparado');
}

/**
 * Sesión de la clase a nivel `target`: con `prepared`, puntos gastados, lo mejor
 * de cada objeto de nivel ≤ `target` y los pergaminos aprendidos (así es el
 * «preparado» de nivel 4). La mascota luchadora queda invocada.
 */
export function makeSessionAt(data: GameData, classId: string, target: number, seed: number, prepared = true): GameSession {
  const rng = new Rng(seed);
  const s = new GameSession(data.rpg, Character.create(data.rpg, classId, 'Bot', rng), rng);
  const ch = s.character;
  if (prepared) {
    let xp = 0;
    for (let l = 1; l < target; l++) xp += xpToNext(data.rpg.progression, l);
    ch.gainXp(xp);
    spendPoints(s);
    const before = new Set(ch.inventory.slots.filter((i) => i).map((i) => i!.uid));
    for (const d of gearUpTo(data, target)) {
      // Dos anillos para poder llenar los dos huecos.
      for (let k = 0; k < (d.slot === 'ring' ? 2 : 1); k++) ch.give(d.id, 1);
    }
    equipUpgrades(s);
    for (const inst of [...ch.inventory.slots]) if (inst && !before.has(inst.uid) && s.content.items[inst.itemId]!.slot) ch.inventory.remove(inst.uid, inst.quantity);
    learnScrolls(s);
    ch.restore();
  }
  summonPet(s);
  return s;
}

/** Pone los enemigos de un escenario de grupo en un arco a 9–11 m del jugador. */
export function placeGroup(w: World, spawns: ScenarioDef['spawns'], rng: Rng): void {
  const p = w.player.pos;
  const base = rng.range(0, Math.PI * 2);
  const list = spawns.flatMap((s) => Array.from({ length: s.count }, () => s.archetype));
  list.forEach((arch, i) => {
    const a = base + (list.length > 1 ? (i / (list.length - 1) - 0.5) * 1.4 : 0) + rng.range(-0.1, 0.1);
    const r = rng.range(9, 11);
    const at = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
    w.spawnEnemy(arch, w.grid.walkable(at) ? at : w.grid.center(w.grid.nearestWalkable(at)));
  });
}

/** Valor de venta de lo que hay ahora en la mochila que no estaba en `before`. */
export function newItemsValue(s: GameSession, before: Map<string, number>): number {
  let v = 0;
  for (const inst of s.character.inventory.slots) {
    if (!inst) continue;
    const prevQty = before.get(inst.uid) ?? 0;
    if (inst.quantity <= prevQty) continue;
    v += (s.sellValue(inst.uid) / inst.quantity) * (inst.quantity - prevQty);
  }
  return v;
}

export function inventorySnapshot(s: GameSession): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of s.character.inventory.slots) if (i) m.set(i.uid, i.quantity);
  return m;
}

/** Juega un escenario completo. Al ganar, recoge el botín (hasta 30 s, fuera del cronómetro). */
export function runScenario(data: GameData, spec: RunSpec): RunResult {
  const sc = spec.scenario;
  const arena = sc.kind === 'arena';
  const d = arena ? data : openField(data);
  const s = makeSession(d, spec.classId, spec.prep, spec.seed * 7919 + 17);
  if (spec.hotbar) {
    const book = s.character.spellbook;
    for (const id of spec.hotbar) if (id && !book.known.has(id)) book.learn(id);
    spec.hotbar.forEach((id, i) => (book.hotbar[i] = id));
  }
  const w = new World(d, { encounter: arena, character: s.character, seed: spec.seed });
  s.attach(w);
  if (!arena) {
    w.player.pos = { ...FIELD_CENTER };
    w.player.prevPos = { ...FIELD_CENTER };
    placeGroup(w, sc.spawns, new Rng(spec.seed ^ 0x9e3779b9));
  }
  const bot = new PlayerBot(w, s, { dodge: SKILLS[spec.skill], seed: spec.seed * 31 + 7 });
  const rec = new Recorder(w);
  const coins0 = s.character.gold;
  const inv0 = inventorySnapshot(s);
  while (w.outcome === 'playing' && w.time < sc.limit) {
    bot.think();
    w.tick(DT);
    rec.step(DT, bot.inCombat());
  }
  const seconds = w.endTime ?? w.time;
  const win = w.outcome === 'victory';
  if (win) {
    const until = w.time + 30;
    while (w.loot.length > 0 && w.time < until) {
      bot.think();
      w.tick(DT);
      rec.step(DT, false);
    }
  }
  const ch = s.character;
  return {
    scenario: sc.id,
    classId: spec.classId,
    skill: spec.skill,
    prep: spec.prep,
    seed: spec.seed,
    win,
    died: w.outcome === 'defeat',
    seconds,
    potions: bot.counters.potions,
    tonics: bot.counters.tonics,
    threats: bot.counters.threats,
    dodgeTries: bot.counters.dodgeTries,
    evades: bot.counters.evades,
    starved: bot.counters.decisions > 0 ? bot.counters.starved / bot.counters.decisions : 0,
    healthLeft: ch.alive ? ch.health / ch.maxHealth : 0,
    gold: ch.gold - coins0 + newItemsValue(s, inv0),
    tally: rec.tally,
  };
}
