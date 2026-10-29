// Estado de la simulación. Sólo datos y reglas; nada de DOM ni de render.
import type { GameData } from '../data';
import { clamp, copy, moveTowards, type Vec2 } from './vec2';

export interface Actor {
  id: number;
  pos: Vec2;
  /** Posición al inicio del último tick, para interpolar en el render. */
  prevPos: Vec2;
  radius: number;
  speed: number;
  /** Ángulo de orientación en el plano XZ (radianes, 0 = +X). */
  facing: number;
}

export interface Player extends Actor {
  moveTarget: Vec2 | null;
}

export class World {
  time = 0;
  tickCount = 0;
  readonly player: Player;
  private nextId = 1;

  constructor(readonly data: GameData) {
    const z = data.zone;
    this.player = {
      id: this.nextId++,
      pos: copy(z.playerStart),
      prevPos: copy(z.playerStart),
      radius: z.playerRadius,
      speed: z.playerSpeed,
      facing: 0,
      moveTarget: null,
    };
  }

  /** Orden del jugador: caminar hacia un punto del suelo. */
  commandMove(target: Vec2): void {
    const z = this.data.zone;
    const r = this.player.radius;
    this.player.moveTarget = { x: clamp(target.x, r, z.width - r), y: clamp(target.y, r, z.depth - r) };
  }

  tick(dt: number): void {
    const p = this.player;
    p.prevPos = copy(p.pos);
    if (p.moveTarget) {
      const next = moveTowards(p.pos, p.moveTarget, p.speed * dt);
      if (next.x !== p.pos.x || next.y !== p.pos.y) p.facing = Math.atan2(next.y - p.pos.y, next.x - p.pos.x);
      p.pos = next;
      if (p.pos.x === p.moveTarget.x && p.pos.y === p.moveTarget.y) p.moveTarget = null;
    }
    this.time += dt;
    this.tickCount++;
  }
}
