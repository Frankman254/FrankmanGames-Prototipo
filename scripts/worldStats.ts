// Estadísticas del mundo generado (tiempos y número de ejemplares): `npx vite-node scripts/worldStats.ts`.
import { loadWorldData } from '../src/data/worldData';
import { buildOverworld } from '../src/world/overworld';

const t0 = performance.now();
const ow = buildOverworld(loadWorldData());
console.log(`buildOverworld: ${(performance.now() - t0).toFixed(0)} ms`);
for (const [k, l] of ow.scatter.byKind) console.log(`${k}: ${l.length}`);
console.log(`obstáculos: ${ow.obstacles.length}`);
