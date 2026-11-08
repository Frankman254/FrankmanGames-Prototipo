// Vuelo con montura voladora (F21), extraído de `World`. El módulo es puro
// (sin DOM ni Babylon): recibe un `FlightHost` estrecho y guarda el mando de
// vuelo (input WASD + destino del clic). `World` sigue siendo quien decide si
// se puede volar y quién escucha el aterrizaje; el contrato externo no cambia.
import type { NavGrid } from './navGrid';
import type { Player } from './world';
import { clamp, copy, type Vec2 } from './vec2';

/** Vuelo (cifras PROPUESTA): subida y bajada en m/s, techo en m y velocidad sobre la de la montura. */
export const FLIGHT = { climb: 6, sink: 2.5, ceiling: 40, speedFactor: 1.25, stealthAltitude: 8 } as const;

/** Lo mínimo que `FlightManager` necesita de `World`. */
export interface FlightHost {
  readonly player: Player;
  readonly grid: NavGrid;
  /** ¿Montura voladora equipada, fuera, vivo y no espectral? (lo decide `World`). */
  canFly(): boolean;
  stopFishing(): void;
  stopTalk(): void;
  /** Aviso de aterrizaje (limpia el gesto sostenido de movimiento). */
  landed(): void;
}

/**
 * Mando del vuelo: despegue/aterrizaje, WASD con Espacio para subir y el
 * destino del último clic (WASD lo cancela). El estado vive aquí; `World`
 * sólo llama a `toggle`, `setInput`, `click`, `tick` y mira `targetActive`.
 */
export class FlightManager {
  /** Mando de cada fotograma: dirección en el suelo (largo ≤ 1) y si se sube (Espacio). */
  private input: { dir: Vec2; climb: boolean } = { dir: { x: 0, y: 0 }, climb: false };
  /** Destino del último clic en vuelo (null = solo WASD). */
  private target: Vec2 | null = null;

  constructor(private readonly host: FlightHost) {}

  /** Hay un destino de clic pendiente (mantiene `moveTarget` vivo este fotograma). */
  get targetActive(): boolean {
    return this.target !== null;
  }

  setInput(dir: Vec2, climb: boolean): void {
    const l = Math.hypot(dir.x, dir.y);
    this.input = { dir: l > 1 ? { x: dir.x / l, y: dir.y / l } : { x: dir.x, y: dir.y }, climb };
  }

  /** Clic en el suelo mientras se vuela: línea recta hasta allí (dentro de la rejilla). */
  click(target: Vec2): void {
    const g = this.host.grid;
    this.target = {
      x: clamp(target.x, g.originX + 1, g.originX + g.width - 1),
      y: clamp(target.y, g.originY + 1, g.originY + g.depth - 1),
    };
    this.host.player.moveTarget = { ...this.target };
  }

  /** Despega o aterriza (Tab). Devuelve si vuela. */
  toggle(): boolean {
    const p = this.host.player;
    if (p.flight) {
      this.land();
      return false;
    }
    if (!this.host.canFly()) return false;
    p.flight = { altitude: 0 };
    this.target = null;
    this.host.stopTalk();
    p.path = [];
    p.moveTarget = null;
    p.attackTarget = null;
    p.pickupTarget = null;
    p.casting = null;
    this.host.stopFishing();
    return true;
  }

  /** Al aterrizar baja a la casilla pisable más cercana. */
  private land(): void {
    const p = this.host.player;
    p.flight = null;
    this.target = null;
    p.moveTarget = null;
    this.host.landed();
    if (!this.host.grid.walkable(p.pos)) {
      const cell = this.host.grid.nearestWalkable(p.pos);
      if (cell >= 0) {
        const c = this.host.grid.center(cell);
        p.pos = { x: c.x, y: c.y };
        p.prevPos = copy(p.pos);
      }
    }
  }

  tick(dt: number): void {
    const h = this.host;
    const p = h.player;
    const f = p.flight!;
    if (!h.canFly()) {
      this.land();
      return;
    }
    p.path = [];
    p.casting = null;
    p.attackTarget = null;
    const { climb } = this.input;
    let dir = this.input.dir;
    const v = p.speed * FLIGHT.speedFactor;
    if (dir.x !== 0 || dir.y !== 0) {
      this.target = null;
      p.moveTarget = null;
    } else if (this.target) {
      const dx = this.target.x - p.pos.x;
      const dy = this.target.y - p.pos.y;
      const d = Math.hypot(dx, dy);
      if (d <= v * dt) {
        p.pos = { ...this.target };
        this.target = null;
        p.moveTarget = null;
        dir = { x: 0, y: 0 };
      } else dir = { x: dx / d, y: dy / d };
    }
    const g = h.grid;
    const x0 = g.originX + 1;
    const y0 = g.originY + 1;
    p.pos = {
      x: Math.min(g.originX + g.width - 1, Math.max(x0, p.pos.x + dir.x * v * dt)),
      y: Math.min(g.originY + g.depth - 1, Math.max(y0, p.pos.y + dir.y * v * dt)),
    };
    if (dir.x !== 0 || dir.y !== 0) p.facing = Math.atan2(dir.y, dir.x);
    f.altitude = Math.min(FLIGHT.ceiling, Math.max(0, f.altitude + (climb ? FLIGHT.climb : -FLIGHT.sink) * dt));
  }
}
