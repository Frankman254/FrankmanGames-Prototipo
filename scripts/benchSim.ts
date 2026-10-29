// Prueba de carga de la simulación sin render: N perseguidores durante S
// segundos simulados. Uso: npm run bench:sim [-- 20 200 ...]
import { loadGameData } from '../src/data';
import { FrameStats } from '../src/sim/frameStats';
import { World } from '../src/sim/world';
import { dist } from '../src/sim/vec2';

declare const process: { argv: string[] };

const counts = process.argv.slice(2).map(Number).filter((n) => n > 0);
const SIM_SECONDS = 20;
const DT = 1 / 60;

for (const n of counts.length ? counts : [20, 200]) {
  const w = new World(loadGameData(), { encounter: false });
  w.spawnChasers(n);
  const stats = new FrameStats(SIM_SECONDS * 60);
  // El jugador da vueltas para forzar re-planificaciones.
  const waypoints = [{ x: 10, y: 10 }, { x: 70, y: 10 }, { x: 70, y: 70 }, { x: 10, y: 70 }];
  let wp = 0;
  let repaths = 0;
  for (let i = 0; i < SIM_SECONDS * 60; i++) {
    if (w.player.path.length === 0) w.commandMove(waypoints[wp++ % waypoints.length]!);
    const t0 = performance.now();
    w.tick(DT);
    stats.push(performance.now() - t0);
    repaths += w.chasers.lastRepaths;
  }
  const list = w.chasers.list;
  let overlaps = 0;
  let worst = 0;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const o = list[i]!.radius + list[j]!.radius - dist(list[i]!.pos, list[j]!.pos);
      if (o > 0.05) overlaps++;
      worst = Math.max(worst, o);
    }
  }
  console.log(
    `${String(n).padStart(4)} perseguidores · tick medio ${stats.mean().toFixed(3)} ms · p95 ${stats.percentile(95).toFixed(3)} ms` +
      ` · máx ${stats.percentile(100).toFixed(3)} ms · A* ${repaths} · solapes>5cm ${overlaps} (peor ${worst.toFixed(2)} m)`,
  );
}
