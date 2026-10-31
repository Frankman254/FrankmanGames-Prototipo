// Jerarquía de runtime: Entity → Actor (vida, estadísticas, estados) →
// Character (jugador), Enemy, Pet. Los actores no saben nada del mundo: la
// simulación (`src/sim/world.ts`) los mueve y les pasa los efectos.
import type { Element, PrimaryStat } from './contracts';
import { StatSheet, type DerivedRule } from './stats';
import { StatusSet, type Control } from './status';
import type { HinderLog } from './hinder';
import type { Vec2 } from '../sim/vec2';

export type Team = 'player' | 'enemy';

export abstract class Entity {
  /** Id de la simulación (lo asigna el mundo). */
  id = 0;
  abstract get pos(): Vec2;
}

export abstract class Actor extends Entity {
  readonly stats: StatSheet;
  readonly statuses: StatusSet;
  abstract readonly team: Team;
  abstract readonly name: string;
  /** Lo que aporta su clase al daño (ver `src/sim/damage.ts`). */
  mainStat: PrimaryStat | null = null;
  affinity: readonly Element[] = [];
  affinityBonus = 0;
  /** Combate táctico: rendimientos decrecientes de los controles recibidos. */
  readonly hinderLog: HinderLog = new Map();

  constructor(rules: readonly DerivedRule[] = []) {
    super();
    this.stats = new StatSheet(rules);
    this.statuses = new StatusSet(this.stats);
  }

  abstract get health(): number;
  abstract set health(v: number);

  get maxHealth(): number {
    return Math.max(1, Math.round(this.stats.get('maxHealth')));
  }

  get alive(): boolean {
    return this.health > 0;
  }

  get control(): Control | null {
    return this.statuses.control();
  }

  /** Daño ya calculado: los escudos absorben primero. Devuelve lo que llega a la vida. */
  takeDamage(amount: number): number {
    if (!this.alive || amount <= 0) return 0;
    const rest = amount - this.statuses.absorb(amount);
    if (rest > 0) this.loseHealth(rest);
    return rest;
  }

  protected loseHealth(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  /** Devuelve lo curado de verdad. */
  heal(amount: number): number {
    if (!this.alive || amount <= 0) return 0;
    const before = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health - before;
  }
}
