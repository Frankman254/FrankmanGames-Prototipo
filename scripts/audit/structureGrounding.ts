// Auditoría de asiento: ¿alguna casa, edificio, Piedra, taller o lancha queda enterrada
// en el terreno o flotando sobre él? Recorre TODAS las estructuras del mundo abierto
// (src/world/structures.ts) y compara la base de cada una con el suelo bajo su huella
// (centro, lados y esquinas). Sin ventana: usa el mismo terreno que dibuja el juego.
//
//   npm run audit:structures             estado actual
//   npm run audit:structures -- --antes  cómo estaba antes de las plataformas (2026-11-10):
//                                        sin aplanar y con la altura leída al arrancar,
//                                        cuando las páginas fuera de la parcela aún valen 0
//
// Escribe el detalle en work/auditoria-estructuras/ (ignorado por Git).
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import stonesJson from '../../data/stones.json';
import { loadWorldData, worldStructures } from '../../src/data/worldData';
import { atlasToShape } from '../../src/world/pageContext';
import { fitStructure, structureBaseY, type StructureFit } from '../../src/world/structures';
import { terrainHeight } from '../../src/world/terrain';

const before = process.argv.includes('--antes');
const wd = loadWorldData();
const rules = wd.terrain.structures;
const structures = worldStructures(wd.terrain, wd.vegetation);
const def = before ? { ...wd.terrain, pads: [] } : wd.terrain;
const bounds = def.world!;
const shape = atlasToShape({ terrain: def, vegetation: wd.vegetation, atlas: wd.atlas, bounds, cellSize: bounds.cellSize });
const ground = (x: number, z: number): number => terrainHeight(def, x, z, shape);
const sea = wd.atlas.seaLevel;

/** Antes: la altura se leía una vez del campo cargado, que fuera de la parcela inicial era 0. */
const inPlot = (x: number, z: number): boolean => x >= 0 && z >= 0 && x <= def.width && z <= def.depth;
const legacyBase = (x: number, z: number): number => (inPlot(x, z) ? ground(x, z) : 0);

const town = (x: number, y: number): string => {
  let best = '';
  let bd = Infinity;
  for (const s of stonesJson.stones) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) {
      bd = d;
      best = s.name.replace(/^Piedra Pintada (de |del )/, '');
    }
  }
  return best;
};

const fits: Array<StructureFit & { town: string }> = structures.map((s) => {
  // Las Piedras ya releían su altura en cada fotograma: antes tampoco dependían del arranque.
  const base = before ? (s.kind === 'stone' ? ground(s.x, s.y) : legacyBase(s.anchor.x, s.anchor.y)) : structureBaseY(s, ground, sea);
  return { ...fitStructure(s, base, ground, sea, rules.tolerance), town: town(s.x, s.y) };
});

const n = (v: number): string => v.toFixed(2).padStart(7);
console.log(`Asiento de estructuras — ${before ? 'ANTES (sin plataformas, altura leída al arrancar)' : 'estado actual'}`);
console.log(`Umbral: ${rules.tolerance} m enterrada o flotando. Mar a ${sea} m.\n`);
console.log('estructura'.padEnd(34), 'pueblo'.padEnd(22), '   base  sueloMín sueloMáx  flota enterr.  problema');
for (const f of fits) {
  const s = f.structure;
  console.log(s.id.padEnd(34).slice(0, 34), f.town.padEnd(22).slice(0, 22), n(f.base), n(f.groundMin), n(f.groundMax), n(f.floating), n(f.buried), ' ', f.problems.join('; ') || 'ok');
}
const byTown = new Map<string, { total: number; bad: number }>();
for (const f of fits) {
  const t = byTown.get(f.town) ?? { total: 0, bad: 0 };
  t.total++;
  if (f.problems.length > 0) t.bad++;
  byTown.set(f.town, t);
}
console.log('\nPor pueblo (fuera de umbral / total):');
for (const [name, t] of byTown) console.log(`  ${name.padEnd(24)} ${t.bad} / ${t.total}`);
const bad = fits.filter((f) => f.problems.length > 0);
console.log(`\nTotal: ${bad.length} de ${fits.length} estructuras fuera de umbral.`);

const out = path.resolve('work', 'auditoria-estructuras');
mkdirSync(out, { recursive: true });
const file = path.join(out, before ? 'antes.json' : 'actual.json');
writeFileSync(file, JSON.stringify({ tolerance: rules.tolerance, seaLevel: sea, byTown: Object.fromEntries(byTown), structures: fits.map((f) => ({ id: f.structure.id, kind: f.structure.kind, seat: f.structure.seat, town: f.town, base: f.base, groundMin: f.groundMin, groundMax: f.groundMax, floating: f.floating, buried: f.buried, problems: f.problems })) }, null, 2));
console.log(`Detalle: ${file}`);
