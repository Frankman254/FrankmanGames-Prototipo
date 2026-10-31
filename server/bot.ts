// Cliente simulado de la prueba de concepto: pide caminar a puntos al azar
// (semilla fija), aplica las instantáneas delta y predice su propio movimiento
// con el mismo A* y `stepAlongPath` que el servidor (predicción en el cliente).
import type { GameData } from '../src/data';
import { stepAlongPath, type Mover } from '../src/sim/movement';
import { buildZoneGrid } from '../src/sim/navGrid';
import { Pathfinder } from '../src/sim/pathfinder';
import { Rng } from '../src/sim/rng';
import { dist } from '../src/sim/vec2';
import { decodeServer, encodeClient, KIND, PROTOCOL_VERSION, type EntityState } from './protocol';
import type { Connection } from './transport';

export interface BotOptions {
  name: string;
  seed: number;
  /** Segundos entre órdenes de movimiento. */
  moveEvery?: number;
}

export class Bot {
  entityId: number | null = null;
  /** Entidades conocidas, en centímetros, tal como llegan. */
  readonly entities = new Map<number, EntityState>();
  snapshots = 0;
  rejects = 0;
  lastTick = 0;
  /** Veces que otro avatar cambió de posición en una instantánea. */
  otherAvatarMoves = 0;
  /** Desvío (m) entre la posición predicha y la del servidor al confirmar una orden. */
  maxPredictionError = 0;
  private readonly rng: Rng;
  private readonly pathfinder: Pathfinder;
  private readonly predicted: Mover;
  private seq = 0;
  private sinceMove = 0;
  private readonly moveEvery: number;

  constructor(readonly conn: Connection, private readonly data: GameData, opts: BotOptions) {
    this.rng = new Rng(opts.seed);
    this.moveEvery = opts.moveEvery ?? 1.5;
    const z = data.zone;
    this.pathfinder = new Pathfinder(buildZoneGrid(z, Object.values(data.rpg.fishing.spots)));
    this.predicted = { pos: { x: 0, y: 0 }, speed: z.playerSpeed, facing: 0, path: [] };
    conn.onMessage((b) => this.receive(b));
    conn.send(encodeClient({ type: 'hello', version: PROTOCOL_VERSION, name: opts.name }));
  }

  private receive(b: Uint8Array): void {
    const m = decodeServer(b);
    if (m.type === 'welcome') {
      this.entityId = m.entityId;
      return;
    }
    if (m.type === 'reject') {
      this.rejects++;
      return;
    }
    this.snapshots++;
    this.lastTick = m.tick;
    for (const e of m.entities) {
      const prev = this.entities.get(e.id);
      if (e.kind === KIND.avatar && e.id !== this.entityId && prev && (prev.x !== e.x || prev.y !== e.y)) this.otherAvatarMoves++;
      this.entities.set(e.id, e);
      if (e.id === this.entityId) this.reconcile(e, m.ackSeq);
    }
    for (const id of m.removed) this.entities.delete(id);
  }

  /** Reconciliación mínima: medir el desvío y, si es grande, ajustarse al servidor. */
  private reconcile(e: EntityState, ackSeq: number): void {
    const server = { x: e.x / 100, y: e.y / 100 };
    if (this.seq === 0) {
      this.predicted.pos = server;
      return;
    }
    if (ackSeq !== this.seq) return;
    const err = dist(server, this.predicted.pos);
    this.maxPredictionError = Math.max(this.maxPredictionError, err);
    if (err > 0.5) this.predicted.pos = server;
  }

  /** Avanza el reloj del cliente: predice su movimiento y, de vez en cuando, ordena otro. */
  update(dt: number): void {
    if (this.entityId === null) return;
    // Primero la orden y luego el paso, como el servidor (orden → tick): si no,
    // la predicción va un tick por delante (0,1 m a 6 m/s).
    this.sinceMove += dt;
    if (this.sinceMove >= this.moveEvery) this.order();
    stepAlongPath(this.predicted, dt);
  }

  private order(): void {
    this.sinceMove = 0;
    const z = this.data.zone;
    const target = { x: this.rng.range(4, z.width - 4), y: this.rng.range(4, z.depth - 4) };
    this.seq++;
    this.predicted.path = this.pathfinder.findPath(this.predicted.pos, target);
    this.conn.send(encodeClient({ type: 'move', seq: this.seq, x: target.x, y: target.y }));
  }

  /** Posición predicha del propio avatar (m). */
  get position(): { x: number; y: number } {
    return { ...this.predicted.pos };
  }
}
