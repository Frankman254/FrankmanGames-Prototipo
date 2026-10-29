// Estado de la simulación. Sólo datos y reglas; nada de DOM ni de render.
import type { GameData } from '../data';
import { ChaserSystem } from './chasers';
import { separate } from './crowd';
import { stepAlongPath, type Mover } from './movement';
import { NavGrid } from './navGrid';
import { Pathfinder } from './pathfinder';
import { Rng } from './rng';
import { SpatialHash } from './spatialHash';
import { clamp, copy, dist, distSq, type Vec2 } from './vec2';

export interface Actor extends Mover {
  id: number;
  /** Posición al inicio del último tick, para interpolar en el render. */
  prevPos: Vec2;
  radius: number;
}

export interface Player extends Actor {
  /** Destino final pedido por el jugador (para el marcador del render). */
  moveTarget: Vec2 | null;
}

export class World {
  time = 0;
  tickCount = 0;
  readonly grid: NavGrid;
  readonly pathfinder: Pathfinder;
  readonly rng: Rng;
  readonly player: Player;
  readonly chasers: ChaserSystem;
  private readonly hash: SpatialHash;
  private nextId = 1;

  constructor(readonly data: GameData) {
    const z = data.zone;
    this.rng = new Rng(data.loadTest.seed);
    this.grid = NavGrid.fromObstacles(z.width, z.depth, z.cellSize, z.obstacles, z.navRadius);
    this.pathfinder = new Pathfinder(this.grid);
    this.hash = new SpatialHash(z.width, z.depth, 2);
    this.chasers = new ChaserSystem(data.loadTest, this.grid, this.pathfinder);
    const start = this.grid.walkable(z.playerStart) ? copy(z.playerStart) : this.grid.center(this.grid.nearestWalkable(z.playerStart));
    this.player = {
      id: this.nextId++,
      pos: start,
      prevPos: copy(start),
      radius: z.playerRadius,
      speed: z.playerSpeed,
      facing: 0,
      path: [],
      moveTarget: null,
    };
  }

  /** Punto caminable aleatorio a más de `minDist` del jugador. */
  randomSpawnPoint(minDist: number): Vec2 {
    const z = this.data.zone;
    for (let tries = 0; tries < 200; tries++) {
      const p = { x: this.rng.range(0, z.width), y: this.rng.range(0, z.depth) };
      if (this.grid.walkable(p) && dist(p, this.player.pos) >= minDist) return p;
    }
    return this.grid.center(this.grid.nearestWalkable({ x: z.width / 2, y: z.depth / 2 }));
  }

  /** Prueba de carga: sustituye los perseguidores por `n` nuevos. */
  spawnChasers(n: number): void {
    this.chasers.clear();
    for (let i = 0; i < n; i++) {
      this.chasers.spawn(this.nextId++, this.randomSpawnPoint(this.data.loadTest.minSpawnDistance), i / Math.max(1, n));
    }
  }

  /**
   * Orden del jugador: caminar hacia un punto del suelo. Si no es caminable,
   * va al punto alcanzable más cercano. Gira hacia el destino en el mismo tick.
   */
  commandMove(target: Vec2): void {
    const p = this.player;
    const z = this.data.zone;
    const t = { x: clamp(target.x, 0, z.width), y: clamp(target.y, 0, z.depth) };
    if (distSq(p.pos, t) < 1e-4) return;
    p.path = this.pathfinder.findPath(p.pos, t);
    const first = p.path[0];
    if (first) p.facing = Math.atan2(first.y - p.pos.y, first.x - p.pos.x);
    p.moveTarget = p.path.length > 0 ? copy(p.path[p.path.length - 1]!) : null;
  }

  tick(dt: number): void {
    const p = this.player;
    p.prevPos = copy(p.pos);
    stepAlongPath(p, dt);
    if (p.path.length === 0) p.moveTarget = null;

    if (this.chasers.list.length > 0) {
      this.chasers.tick(dt, p);
      separate(this.grid, this.hash, this.chasers.list, this.data.loadTest.radius, p);
    }
    this.time += dt;
    this.tickCount++;
  }
}
