// `npm run server:poc [-- segundos]`: servidor local en 127.0.0.1 con el `World`
// compartido y dos clientes simulados sobre WebSocket real. Imprime ticks,
// coste del tick y bytes por segundo de cada cliente.
import { loadGameData } from '../src/data';
import { FrameStats } from '../src/sim/frameStats';
import { FixedStepClock } from '../src/sim/loop';
import { Bot } from './bot';
import { PocServer } from './pocServer';
import { connectLocal, listenLocal, type Connection } from './transport';

const seconds = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 10;
const data = loadGameData();
const server = new PocServer(data);
const listener = await listenLocal(0, (c) => server.accept(c));
const conns: Connection[] = await Promise.all([connectLocal(listener.port), connectLocal(listener.port)]);
const bots = [
  new Bot(conns[0]!, data, { name: 'Iris', seed: 11, moveEvery: 1.5 }),
  new Bot(conns[1]!, data, { name: 'Nilo', seed: 29, moveEvery: 1.8 }),
];

// Mismo reloj de paso fijo que el juego: el servidor no pierde ticks aunque el
// temporizador del sistema despierte tarde (en Windows, cada ~15,6 ms).
const clock = new FixedStepClock(server.tickHz, 8);
const tickMs = new FrameStats(seconds * server.tickHz + 64);
const started = performance.now();
let last = started;
console.log(`Servidor local en ws://127.0.0.1:${listener.port} · ${server.tickHz} Hz · instantáneas a ${server.snapshotHz} Hz · ${seconds} s`);

const timer = setInterval(() => {
  const now = performance.now();
  const frame = (now - last) / 1000;
  last = now;
  for (const b of bots) b.update(frame);
  const { steps } = clock.advance(frame);
  for (let i = 0; i < steps; i++) {
    const t0 = performance.now();
    server.step();
    tickMs.push(performance.now() - t0);
  }
}, 5);

setTimeout(async () => {
  clearInterval(timer);
  const real = (performance.now() - started) / 1000;
  console.log(
    `Ticks: ${server.tick} en ${real.toFixed(1)} s (${(server.tick / real).toFixed(1)}/s) · tick medio ${tickMs.mean().toFixed(3)} ms · p95 ${tickMs.percentile(95).toFixed(3)} ms · máx ${tickMs.percentile(100).toFixed(3)} ms`,
  );
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i]!;
    const s = conns[i]!.stats;
    console.log(
      `Cliente ${i + 1} (id ${b.entityId}): ${b.snapshots} instantáneas · ve ${b.entities.size} entidades · ` +
        `bajada ${(s.recvPayload / real).toFixed(0)} B/s carga, ${(s.recvWire / real).toFixed(0)} B/s con marco WS · ` +
        `subida ${(s.sentWire / real).toFixed(0)} B/s · el otro avatar se movió en ${b.otherAvatarMoves} instantáneas · ` +
        `desvío de predicción máx. ${b.maxPredictionError.toFixed(2)} m · rechazos ${b.rejects}`,
    );
    conns[i]!.close();
  }
  await listener.close();
}, seconds * 1000);
