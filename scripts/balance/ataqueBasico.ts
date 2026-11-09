/// <reference types="node" />
// `npm run balance:ataque-basico`: compara tres formas del ataque básico en las tres clases
// (petición del creador, 2026-11-09). No cambia datos: cada modo se aplica sobre una copia.
//   A-clic   : un clic = un golpe; la persona vuelve a hacer clic ~0,35 s después de cada orden.
//   A-spam   : un clic = un golpe, pero clic en cuanto se puede (el bot de balance de siempre).
//   B        : un clic sigue golpeando (autoRepeat) con cargas y enfriamiento, sin coste.
//   C r=k    : B + coste por golpe = k × regeneración por segundo × segundos de recarga.
//              k = 1 consume justo lo que regenera al ritmo sostenido de 1 golpe por recarga.
// Políticas: «hechizos» (rotación normal + básico) y «solo básico» (sin barra).
// Escenarios de Iguanera de `balance:inicio`, con habilidad «malo» (sin esquivar = sin
// posicionamiento) y «medio».
import type { GameData } from '../../src/data';
import type { BasicAttackDef } from '../../src/data/schema';
import type { LevelZoneDef } from '../../src/data/zonesSchema';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { PlayerBot } from './bot';
import { buildData, FIELD_CENTER, openField, rawData } from './data';
import { DT, makeSessionAt, SKILLS, type SkillId } from './scenarios';
import { placeZoneGroup } from './zones';

const base = buildData(rawData());
const classes = Object.keys(base.rpg.classes);
const SEEDS = Number(process.env['SEEDS'] ?? 6);
const LIMIT = 150;

interface Mode {
  id: string;
  basic: Partial<BasicAttackDef>;
  clickGap: number;
  /** Factor k del coste (C); 0 = sin coste. */
  k: number;
}

const MODES: Mode[] = [
  { id: 'A-clic', basic: { autoRepeat: false }, clickGap: 0.35, k: 0 },
  { id: 'A-spam', basic: { autoRepeat: false }, clickGap: 0, k: 0 },
  { id: 'B', basic: { autoRepeat: true }, clickGap: 0, k: 0 },
  ...[0.5, 1, 1.5, 2].map((k) => ({ id: `C k=${k}`, basic: { autoRepeat: true }, clickGap: 0, k })),
];

function costFor(k: number): Record<string, number> {
  const recharge = base.player.basicAttack.rechargeSeconds;
  const out: Record<string, number> = {};
  for (const [id, c] of Object.entries(base.rpg.classes)) out[id] = Math.round(k * c.resource.regenPerSecond * recharge * 10) / 10;
  return out;
}

function dataFor(m: Mode): GameData {
  const b = { ...base.player.basicAttack, ...m.basic, classCost: m.k > 0 ? costFor(m.k) : {} };
  return { ...base, player: { ...base.player, basicAttack: b } };
}

interface Run {
  win: boolean;
  died: boolean;
  seconds: number;
  basicHits: number;
  basicDamage: number;
  damage: number;
  minResource: number;
  blockedByResource: number;
}

function runOne(data: GameData, zone: LevelZoneDef, level: number, group: number, classId: string, skill: SkillId, seed: number, mode: Mode, basicOnly: boolean): Run {
  const d = openField(data);
  const s = makeSessionAt(d, classId, level, seed * 7919 + 17);
  const w = new World(d, { encounter: false, character: s.character, seed });
  s.attach(w);
  w.player.pos = { ...FIELD_CENTER };
  w.player.prevPos = { ...FIELD_CENTER };
  placeZoneGroup(w, zone, group, new Rng(seed ^ 0x51ed));
  const bot = new PlayerBot(w, s, { dodge: SKILLS[skill], seed: seed * 31 + 7, basicOnly, clickGap: mode.clickGap });
  const r: Run = { win: false, died: false, seconds: 0, basicHits: 0, basicDamage: 0, damage: 0, minResource: 1, blockedByResource: 0 };
  const max = s.character.maxResource;
  while (w.outcome === 'playing' && w.time < LIMIT) {
    bot.think();
    w.tick(DT);
    r.minResource = Math.min(r.minResource, w.player.resource / max);
    for (const e of w.drainEvents()) {
      if (e.type === 'cast' && e.ability === 'basic') r.basicHits++;
      else if (e.type === 'damage' && !e.toPlayer) {
        r.damage += e.amount;
        if (e.ability === 'basic') r.basicDamage += e.amount;
      } else if (e.type === 'castBlocked' && e.ability === 'basic' && e.reason === 'resource') r.blockedByResource++;
    }
  }
  r.win = w.outcome === 'victory';
  r.died = w.outcome === 'defeat';
  r.seconds = w.endTime ?? w.time;
  return r;
}

const igu = base.zones.zones.find((z) => z.id === 'iguanera')!;
const azuero = base.zones.zones.find((z) => z.id === 'azuero')!;
const SCENARIOS: [string, number, LevelZoneDef, number][] = [
  ['N1 · grupo de 2 (nv 1-2)', 1, { ...igu, levelMin: 1, levelMax: 2 }, 2],
  ['N2 · sato grande nv 3', 2, { ...igu, levelMin: 3, levelMax: 3, spawns: [{ archetype: 'alpha_wolf', weight: 1, levelBonus: 0, time: 'any' as const }] }, 1],
  ['N3 · sato grande + 2 satos nv 3', 3, { ...igu, levelMin: 3, levelMax: 3, spawns: [{ archetype: 'alpha_wolf', weight: 1, levelBonus: 0, time: 'any' as const }, { archetype: 'melee', weight: 2, levelBonus: 0, time: 'any' as const }] }, 3],
  // Combates difíciles: grupos de 3 por encima del nivel del jugador (tabla de Azuero).
  ['N5 · grupo de 3 nv 6-7 (Azuero)', 5, { ...azuero, levelMin: 6, levelMax: 7 }, 3],
  ['N10 · grupo de 3 nv 11-12 (Azuero)', 10, { ...azuero, levelMin: 11, levelMax: 12 }, 3],
];

const pct = (x: number) => `${Math.round(x * 100)}`;

console.log('Ritmo y coste por clase (datos actuales)');
for (const c of classes) {
  const cls = base.rpg.classes[c]!;
  const s = makeSessionAt(base, c, 1, 1);
  const w = new World(base, { encounter: false, character: s.character, seed: 1 });
  const b = w.basicAttack();
  const sustained = Math.max(b.cooldown, base.player.basicAttack.rechargeSeconds);
  console.log(
    `  ${c}: ${cls.resource.name} ${cls.resource.max} (+${cls.resource.regenPerSecond}/s) · enfriamiento del arma ${b.cooldown.toFixed(2)} s · alcance ${b.range} m · golpe sostenido cada ${sustained.toFixed(2)} s · coste C k=1: ${costFor(1)[c]}`,
  );
}

console.log('\nclase | escenario | habilidad | política | modo | gana % | muere % | s | golpes/s | % daño básico | recurso mín % | bloqueos por recurso');
for (const [label, level, zone, group] of SCENARIOS) {
  for (const skill of ['malo', 'medio'] as const) {
    for (const basicOnly of [false, true]) {
      for (const mode of MODES) {
        const data = dataFor(mode);
        for (const c of classes) {
          const runs = Array.from({ length: SEEDS }, (_, i) => runOne(data, zone, level, group, c, skill, 300 + i, mode, basicOnly));
          const n = runs.length;
          const sum = (f: (r: Run) => number) => runs.reduce((a, r) => a + f(r), 0);
          const secs = sum((r) => r.seconds);
          console.log(
            [
              c,
              label,
              skill,
              basicOnly ? 'solo básico' : 'hechizos',
              mode.id,
              pct(runs.filter((r) => r.win).length / n),
              pct(runs.filter((r) => r.died).length / n),
              (secs / n).toFixed(1),
              (sum((r) => r.basicHits) / secs).toFixed(2),
              pct(sum((r) => r.basicDamage) / Math.max(1, sum((r) => r.damage))),
              pct(sum((r) => r.minResource) / n),
              (sum((r) => r.blockedByResource) / n).toFixed(0),
            ].join(' | '),
          );
        }
      }
    }
  }
}
