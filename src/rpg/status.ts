// Estados activos sobre un actor (quemadura, ralentización, escudo…). Cada
// estado aporta sus modificadores a la `StatSheet` como fuente
// "status:<id>" (× acumulaciones) y puede repetir un efecto cada `tick.every` s.
import type { StatusDef } from './contracts';
import type { StatSheet } from './stats';

export interface ActiveStatus {
  def: StatusDef;
  remaining: number;
  /** Duración con la que se aplicó la última vez (para barridos de la interfaz). */
  duration: number;
  stacks: number;
  tickTimer: number;
  /** Quién lo puso (escala el daño o la curación periódicos); null = el entorno. */
  source: unknown;
  /** Puntos de escudo que quedan (sólo estados de escudo). */
  shield: number;
}

export interface ApplyOptions {
  duration?: number;
  source?: unknown;
  shield?: number;
}

const CONTROL_ORDER = { stun: 3, root: 2, silence: 1 } as const;
export type Control = keyof typeof CONTROL_ORDER;

export class StatusSet {
  readonly list: ActiveStatus[] = [];

  constructor(private readonly sheet: StatSheet) {}

  get(id: string): ActiveStatus | undefined {
    return this.list.find((s) => s.def.id === id);
  }

  has(id: string): boolean {
    return this.get(id) !== undefined;
  }

  /** Aplica o refresca: renueva la duración (la mayor) y suma una acumulación hasta el tope. */
  apply(def: StatusDef, opts: ApplyOptions = {}): ActiveStatus {
    const duration = opts.duration ?? def.duration;
    let s = this.get(def.id);
    if (s) {
      s.stacks = Math.min(def.maxStacks, s.stacks + 1);
      s.remaining = Math.max(s.remaining, duration);
      s.duration = Math.max(s.remaining, duration);
      if (opts.source !== undefined) s.source = opts.source;
      if (opts.shield) s.shield = Math.max(s.shield, opts.shield);
    } else {
      s = { def, remaining: duration, duration, stacks: 1, tickTimer: 0, source: opts.source ?? null, shield: opts.shield ?? 0 };
      this.list.push(s);
    }
    this.syncMods(s);
    return s;
  }

  remove(id: string): void {
    const i = this.list.findIndex((s) => s.def.id === id);
    if (i < 0) return;
    this.list.splice(i, 1);
    this.sheet.remove(`status:${id}`);
  }

  clear(): void {
    for (const s of [...this.list]) this.remove(s.def.id);
  }

  private syncMods(s: ActiveStatus): void {
    this.sheet.set(
      `status:${s.def.id}`,
      s.def.modifiers.map((m) => ({ stat: m.stat, op: m.op, value: m.value * s.stacks })),
    );
  }

  /**
   * Avanza el tiempo: dispara los efectos periódicos (`onTick`, una vez por
   * acumulación) y quita los que caducan. El último tick coincide con el final.
   */
  tick(dt: number, onTick: (s: ActiveStatus) => void): void {
    for (const s of [...this.list]) {
      const step = Math.min(dt, s.remaining);
      s.remaining -= dt;
      if (s.def.tick) {
        s.tickTimer += step;
        while (s.tickTimer >= s.def.tick.every - 1e-9) {
          s.tickTimer -= s.def.tick.every;
          for (let k = 0; k < s.stacks; k++) onTick(s);
        }
      }
      if (s.remaining <= 1e-9) this.remove(s.def.id);
    }
  }

  /** Consume escudos ante `amount` de daño; devuelve lo absorbido. */
  absorb(amount: number): number {
    let left = amount;
    for (const s of [...this.list]) {
      if (s.shield <= 0 || left <= 0) continue;
      const take = Math.min(s.shield, left);
      s.shield -= take;
      left -= take;
      if (s.shield <= 0) this.remove(s.def.id);
    }
    return amount - left;
  }

  shieldTotal(): number {
    let n = 0;
    for (const s of this.list) n += s.shield;
    return n;
  }

  /** Control más fuerte activo (aturdido > inmovilizado > silencio). */
  control(): Control | null {
    let best: Control | null = null;
    for (const s of this.list) {
      const c = s.def.control;
      if (c && (!best || CONTROL_ORDER[c] > CONTROL_ORDER[best])) best = c;
    }
    return best;
  }

  view(): { statusId: string; remaining: number; stacks: number }[] {
    return this.list.map((s) => ({ statusId: s.def.id, remaining: Math.max(0, s.remaining), stacks: s.stacks }));
  }
}
