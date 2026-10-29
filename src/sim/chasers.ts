// Perseguidores simples para la prueba de carga: van hacia el jugador en línea
// recta si lo ven y por A* si no, con re-planificación repartida entre ticks.
import type { LoadTestDef } from '../data/schema';
import { stepAlongPath } from './movement';
import type { NavGrid } from './navGrid';
import type { Pathfinder } from './pathfinder';
import { copy, distSq, type Vec2 } from './vec2';

export interface Chaser {
  id: number;
  pos: Vec2;
  prevPos: Vec2;
  radius: number;
  speed: number;
  facing: number;
  path: Vec2[];
  repathTimer: number;
}

export class ChaserSystem {
  readonly list: Chaser[] = [];
  /** Búsquedas A* hechas en el último tick (para el HUD). */
  lastRepaths = 0;

  constructor(private readonly def: LoadTestDef, private readonly grid: NavGrid, private readonly pf: Pathfinder) {}

  spawn(id: number, pos: Vec2, stagger: number): Chaser {
    const c: Chaser = {
      id,
      pos: copy(pos),
      prevPos: copy(pos),
      radius: this.def.radius,
      speed: this.def.speed,
      facing: 0,
      path: [],
      repathTimer: stagger * this.def.repathSeconds,
    };
    this.list.push(c);
    return c;
  }

  clear(): void {
    this.list.length = 0;
  }

  tick(dt: number, target: { pos: Vec2; radius: number }): void {
    let budget = this.def.maxRepathsPerTick;
    for (const c of this.list) {
      c.prevPos = copy(c.pos);
      const reach = c.radius + target.radius + 0.05;
      if (distSq(c.pos, target.pos) <= reach * reach) {
        c.path.length = 0;
        continue;
      }
      c.repathTimer -= dt;
      if (this.grid.lineOfSight(c.pos, target.pos)) {
        c.path = [copy(target.pos)];
      } else if ((c.repathTimer <= 0 || c.path.length === 0) && budget > 0) {
        budget--;
        c.path = this.pf.findPath(c.pos, target.pos);
        c.repathTimer = this.def.repathSeconds;
      }
      stepAlongPath(c, dt);
    }
    this.lastRepaths = this.def.maxRepathsPerTick - budget;
  }
}
