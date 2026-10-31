// Servidor autoritativo de la prueba de concepto (PROPUESTA). Hace avanzar el
// `World` compartido de `src/sim` a 60 Hz y, encima, una capa de avatares de
// jugadores conectados que reutiliza su rejilla, su A* y `stepAlongPath`.
//
// El `World` de hoy sólo tiene un jugador (`world.player`): aquí queda aparcado
// e invulnerable y no se envía. Convertirlo en multijugador es la refactorización
// R1 de docs/ARQUITECTURA_ONLINE.md; esta capa muestra la forma que tendrá.
import type { GameData } from '../src/data';
import { stepAlongPath, type Mover } from '../src/sim/movement';
import { clamp, copy, distSq, type Vec2 } from '../src/sim/vec2';
import { World } from '../src/sim/world';
import {
  decodeClient,
  encodeServer,
  KIND,
  PROTOCOL_VERSION,
  quantizeFacing,
  quantizePos,
  REJECT,
  type ClientMsg,
  type EntityState,
} from './protocol';
import type { Connection } from './transport';

export interface PocServerOptions {
  tickHz?: number;
  /** Instantáneas por segundo a cada cliente (divide a `tickHz`). */
  snapshotHz?: number;
  /** Radio (m) del área de interés alrededor de cada avatar. */
  interestRadius?: number;
  /** Órdenes de movimiento por segundo permitidas (cubo de fichas) y ráfaga. */
  moveRate?: number;
  moveBurst?: number;
  seed?: number;
}

interface Avatar extends Mover {
  id: number;
  name: string;
  conn: Connection;
  /** Última orden aplicada. */
  ackSeq: number;
  tokens: number;
  /** Lo último que se envió a este cliente de cada entidad visible. */
  known: Map<number, EntityState>;
  rejected: number;
}

const AVATAR_ID_BASE = 1_000_000;

export class PocServer {
  readonly world: World;
  readonly tickHz: number;
  readonly snapshotHz: number;
  readonly interestRadius: number;
  private readonly moveRate: number;
  private readonly moveBurst: number;
  private readonly avatars = new Map<number, Avatar>();
  private nextAvatar = AVATAR_ID_BASE;
  private readonly ticksPerSnapshot: number;

  constructor(readonly data: GameData, opts: PocServerOptions = {}) {
    this.tickHz = opts.tickHz ?? 60;
    this.snapshotHz = opts.snapshotHz ?? 20;
    this.ticksPerSnapshot = Math.max(1, Math.round(this.tickHz / this.snapshotHz));
    this.interestRadius = opts.interestRadius ?? 40;
    this.moveRate = opts.moveRate ?? 10;
    this.moveBurst = opts.moveBurst ?? 10;
    this.world = new World(data, { seed: opts.seed ?? 1 });
    // El jugador único del `World` actual no lo controla nadie (ver cabecera).
    this.world.player.invulnerable = Number.POSITIVE_INFINITY;
  }

  get tick(): number {
    return this.world.tickCount;
  }

  get clientCount(): number {
    return this.avatars.size;
  }

  /** Acepta una conexión: espera el saludo y crea su avatar. */
  accept(conn: Connection): void {
    let avatar: Avatar | null = null;
    conn.onMessage((bytes) => {
      const msg = decodeClient(bytes);
      if (!msg) {
        if (avatar) avatar.rejected++;
        return;
      }
      if (!avatar) {
        if (msg.type !== 'hello' || msg.version !== PROTOCOL_VERSION) return conn.close();
        avatar = this.spawn(conn, msg.name);
        return;
      }
      this.handle(avatar, msg);
    });
    conn.onClose(() => {
      if (avatar) this.avatars.delete(avatar.id);
    });
  }

  private spawn(conn: Connection, name: string): Avatar {
    const id = this.nextAvatar++;
    const n = this.avatars.size;
    const start = this.world.grid.center(this.world.grid.nearestWalkable({ x: 10 + n * 2, y: 10 }));
    const avatar: Avatar = {
      id,
      name,
      conn,
      pos: start,
      speed: this.data.zone.playerSpeed,
      facing: 0,
      path: [],
      ackSeq: 0,
      tokens: this.moveBurst,
      known: new Map(),
      rejected: 0,
    };
    this.avatars.set(id, avatar);
    conn.send(encodeServer({ type: 'welcome', version: PROTOCOL_VERSION, entityId: id, tickHz: this.tickHz, snapshotHz: this.snapshotHz }));
    return avatar;
  }

  /** Validación de órdenes: ritmo (cubo de fichas), secuencia y límites del mundo. */
  private handle(a: Avatar, msg: ClientMsg): void {
    if (msg.type !== 'move') return;
    const z = this.data.zone;
    if (msg.seq <= a.ackSeq || msg.x < 0 || msg.y < 0 || msg.x > z.width || msg.y > z.depth) {
      a.rejected++;
      a.conn.send(encodeServer({ type: 'reject', seq: msg.seq, reason: REJECT.invalid }));
      return;
    }
    if (a.tokens < 1) {
      a.rejected++;
      a.conn.send(encodeServer({ type: 'reject', seq: msg.seq, reason: REJECT.rate }));
      return;
    }
    a.tokens -= 1;
    a.ackSeq = msg.seq;
    const t = { x: clamp(msg.x, 0, z.width), y: clamp(msg.y, 0, z.depth) };
    if (distSq(a.pos, t) < 1e-4) return;
    a.path = this.world.pathfinder.findPath(a.pos, t);
  }

  /** Un tick de simulación; cada `ticksPerSnapshot` envía instantáneas. */
  step(): void {
    const dt = 1 / this.tickHz;
    this.world.tick(dt);
    for (const a of this.avatars.values()) {
      a.tokens = Math.min(this.moveBurst, a.tokens + this.moveRate * dt);
      stepAlongPath(a, dt);
    }
    if (this.world.tickCount % this.ticksPerSnapshot === 0) this.broadcast();
  }

  /** Estado cuantizado de todo lo que se puede ver, con su posición real. */
  private visibleEntities(): { pos: Vec2; state: EntityState }[] {
    const out: { pos: Vec2; state: EntityState }[] = [];
    for (const a of this.avatars.values()) {
      out.push({ pos: a.pos, state: { id: a.id, kind: KIND.avatar, x: quantizePos(a.pos.x), y: quantizePos(a.pos.y), facing: quantizeFacing(a.facing), flags: 1 | (a.path.length > 0 ? 2 : 0) } });
    }
    for (const e of this.world.enemies.list) {
      if (e.state === 'dead') continue;
      out.push({ pos: e.pos, state: { id: e.id, kind: KIND.enemy, x: quantizePos(e.pos.x), y: quantizePos(e.pos.y), facing: quantizeFacing(e.facing), flags: 1 | (e.path.length > 0 ? 2 : 0) } });
    }
    return out;
  }

  /** Instantánea delta por cliente: sólo lo nuevo o cambiado dentro de su área de interés. */
  private broadcast(): void {
    const all = this.visibleEntities();
    const r2 = this.interestRadius * this.interestRadius;
    for (const a of this.avatars.values()) {
      const changed: EntityState[] = [];
      const seen = new Set<number>();
      for (const { pos, state } of all) {
        if (state.id !== a.id && distSq(pos, a.pos) > r2) continue;
        seen.add(state.id);
        const prev = a.known.get(state.id);
        if (prev && prev.x === state.x && prev.y === state.y && prev.facing === state.facing && prev.flags === state.flags) continue;
        changed.push(state);
        a.known.set(state.id, state);
      }
      const removed: number[] = [];
      for (const id of a.known.keys()) {
        if (!seen.has(id)) removed.push(id);
      }
      for (const id of removed) a.known.delete(id);
      // El transporte es fiable y ordenado: el delta contra lo último enviado basta.
      a.conn.send(encodeServer({ type: 'snapshot', tick: this.world.tickCount, ackSeq: a.ackSeq, entities: changed, removed }));
    }
  }

  /** Posición autoritativa de un avatar (tests). */
  avatarPos(id: number): Vec2 | null {
    const a = this.avatars.get(id);
    return a ? copy(a.pos) : null;
  }

  rejectedCount(id: number): number {
    return this.avatars.get(id)?.rejected ?? 0;
  }
}
