/// <reference types="node" />
// `npm run balance:inicio`: ¿se puede subir tranquilo en la zona inicial? Enfrenta a cada
// clase con grupos de la franja que tocaría a su nivel, y estima el tiempo hasta el nivel 10.
import { xpToNext } from '../../src/rpg/progression';
import { buildData, rawData } from './data';
import type { LevelZoneDef } from '../../src/data/zonesSchema';
import { runZone, ZONE_FULL } from './zones';

const data = buildData(rawData());
const azuero = data.zones.zones.find((z) => z.id === 'azuero')!;
const classes = Object.keys(data.rpg.classes);
const SEEDS = 6;
/** Segundos entre pelea y pelea: caminar, recoger y recuperarse. */
const BETWEEN = 12;

let minutes = 0;
console.log('nivel | monstruos | gana % | muere % | golpe máx % vida | s por pelea | muertes');
for (const [player, lo, hi] of [[1, 1, 2], [3, 2, 4], [5, 4, 6], [8, 7, 9], [10, 9, 11]] as const) {
  const zone = { ...azuero, levelMin: lo, levelMax: hi };
  const runs = classes.flatMap((c) => Array.from({ length: SEEDS }, (_, s) => runZone(data, zone, player, c, 'medio', 100 + s, ZONE_FULL)));
  const win = runs.filter((r) => r.win).length / runs.length;
  const died = runs.filter((r) => r.died).length / runs.length;
  const hit = runs.reduce((a, r) => Math.max(a, r.maxHitFrac), 0);
  const secs = runs.reduce((a, r) => a + r.seconds, 0) / runs.length;
  console.log(`${player} | ${lo}-${hi} | ${(win * 100).toFixed(0)} | ${(died * 100).toFixed(0)} | ${(hit * 100).toFixed(0)} | ${secs.toFixed(1)} | ${runs.filter((r) => r.oneShot).length}`);
  if (player < 10) {
    const kills = runs.reduce((a, r) => a + r.kills, 0) / runs.length;
    const fights = player === 1 ? 2 : player === 3 ? 2 : player === 5 ? 3 : 2;
    let need = 0;
    for (let l = player; l < player + fights && l < 10; l++) need += xpToNext(data.rpg.progression, l);
    const xpEach = data.rpg.enemies['melee']!.xp * (1 + 0.2 * (hi - 1)) * Math.pow(1.06, hi - 1);
    minutes += ((need / (xpEach * Math.max(1, kills))) * (secs + BETWEEN)) / 60;
  }
}
console.log(`Minutos estimados hasta el nivel 10: ${minutes.toFixed(0)}`);

// Iguanera: la isla de inicio (niveles 1–3) y el sato grande que cierra el aprendizaje, solo.
const igu = data.zones.zones.find((z) => z.id === 'iguanera')!;
console.log('\nIguanera | monstruos | gana % | muere % | golpe máx % vida | s por pelea');
for (const [label, player, zone, group] of [
  ['nivel 1, grupos de la isla', 1, { ...igu, levelMin: 1, levelMax: 2 }, ZONE_FULL.group],
  ['nivel 2, sato grande de nivel 3', 2, { ...igu, levelMin: 3, levelMax: 3, spawns: [{ archetype: 'alpha_wolf', weight: 1, levelBonus: 0, time: 'any' as const }] }, 1],
  ['nivel 3, sato grande y dos satos de nivel 3', 3, { ...igu, levelMin: 3, levelMax: 3, spawns: [{ archetype: 'alpha_wolf', weight: 1, levelBonus: 0, time: 'any' as const }, { archetype: 'melee', weight: 2, levelBonus: 0, time: 'any' as const }] }, 3],
] as [string, number, LevelZoneDef, number][]) {
  for (const skill of ['malo', 'medio'] as const) {
    const runs = classes.flatMap((c) => Array.from({ length: SEEDS }, (_, s) => runZone(data, zone, player, c, skill, 300 + s, { ...ZONE_FULL, group })));
    const win = runs.filter((r) => r.win).length / runs.length;
    const died = runs.filter((r) => r.died).length / runs.length;
    const hit = runs.reduce((a, r) => Math.max(a, r.maxHitFrac), 0);
    const secs = runs.reduce((a, r) => a + r.seconds, 0) / runs.length;
    console.log(`${label} (${skill}) | ${(win * 100).toFixed(0)} | ${(died * 100).toFixed(0)} | ${(hit * 100).toFixed(0)} | ${secs.toFixed(1)}`);
  }
}
