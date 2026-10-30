import { loadGameData } from '../src/data';
import { Bot } from './bot';
import { PocServer } from './pocServer';
import { connectLocal, listenLocal } from './transport';

const data = loadGameData();
const server = new PocServer(data);
const listener = await listenLocal(0, (connection) => server.accept(connection));
const connections = await Promise.all([connectLocal(listener.port), connectLocal(listener.port)]);
const bots = [
  new Bot(connections[0], data, { name: 'Iris', seed: 11, moveEvery: 0.75 }),
  new Bot(connections[1], data, { name: 'Nilo', seed: 29, moveEvery: 0.9 }),
];

const started = performance.now();
const durationMs = 10_000;
let last = started;
const timer = setInterval(() => {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1_000);
  last = now;
  for (const bot of bots) bot.update(dt);
  server.step();
}, 1_000 / server.tickHz);

console.log(`Servidor local en ws://127.0.0.1:${listener.port}; ejecutando dos clientes durante 10 s...`);

setTimeout(async () => {
  clearInterval(timer);
  const seconds = (performance.now() - started) / 1_000;
  for (let i = 0; i < bots.length; i++) {
    const stats = connections[i].stats;
    console.log(
      `${i + 1}. ${bots[i].entityId}: ${bots[i].snapshots} snapshots, ` +
        `${(stats.recvWire / seconds).toFixed(0)} B/s recibidos, ` +
        `${(stats.sentWire / seconds).toFixed(0)} B/s enviados, ` +
        `error predicción máx. ${bots[i].maxPredictionError.toFixed(2)} m`,
    );
    connections[i].close();
  }
  await listener.close();
}, durationMs);
