/// <reference types="node" />
// Ejecutor de `npm run balance:t01` (ver t01.ts).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildData, rawData } from './data';
import { BOSS_TARGET_SECONDS, START_TARGET_SECONDS, duelTable, measureDuel, measureLate, measureStart, table } from './t01';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};
const seeds = Number(option('--seeds', '12'));
const solo = option('--solo', '');
const data = buildData(rawData());
const start = solo === 'tardio' ? [] : measureStart(data, seeds);
const late = solo === 'inicio' ? [] : measureLate(data, Math.max(3, Math.floor(seeds / 2)));
const duel = solo === 'inicio' ? [] : measureDuel(data, Math.max(3, Math.floor(seeds / 2)));
if (start.length) console.log(`A. Nivel 1 sin equipo contra nivel 1 (objetivo: ≤ ${START_TARGET_SECONDS} s)\n${table(start)}\n`);
if (late.length) console.log(`B. Jefes tardíos (objetivo: ${BOSS_TARGET_SECONDS.min}–${BOSS_TARGET_SECONDS.max} s)\n${table(late)}`);
if (duel.length) console.log(`
C. Presupuesto para PvP y jefes de nivel alto (no existe ese contenido: estimación)
${duelTable(duel)}`);
const json = option('--json', 'work/balance/T01.json');
mkdirSync(dirname(json), { recursive: true });
writeFileSync(json, JSON.stringify({ seeds, start, late, duel }, null, 2));
