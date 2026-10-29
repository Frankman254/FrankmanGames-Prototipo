// Estado de la simulación. Sólo datos y reglas; nada de DOM ni de render.
import type { GameData } from '../data';
import { stepAlongPath, type Mover } from './movement';
import { NavGrid } from './navGrid';
import { Pathfinder } from './pathfinder';
import { clamp, copy, distSq, type Vec2 } from './vec2';

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
  readonly player: Player;
  private nextId = 1;

  constructor(readonly data: GameData) {
    const z = data.zone;
    this.grid = NavGrid.fromObstacles(z.width, z.depth, z.cellSize, z.obstacles, z.navRadius);
    this.pathfinder = new Pathfinder(this.grid);
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
    this.time += dt;
    this.tickCount++;
  }
}
