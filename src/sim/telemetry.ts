// Telemetría local de la sesión: se alimenta de los sucesos de `World` y se
// vuelca como JSON (consola o archivo). Nada sale del equipo.
import type { GameEvent } from './events';

export type RunOutcome = 'victory' | 'defeat' | 'abandoned';

export interface RunRecord {
  run: number;
  /** Marca de tiempo ISO al empezar (la pone quien llama; la sim no lee el reloj). */
  startedAt: string;
  seconds: number;
  outcome: RunOutcome | null;
  damageTaken: number;
  hitsTaken: number;
  hitsAvoided: number;
  damageDealt: number;
  crits: number;
  abilityUses: Record<string, number>;
  castsBlocked: Record<string, number>;
  kills: Record<string, number>;
  deaths: number;
}

export interface SessionReport {
  format: 'frankmangames-telemetry';
  version: 1;
  runs: RunRecord[];
  totals: { runs: number; victories: number; defeats: number; deaths: number; seconds: number; damageTaken: number; damageDealt: number };
}

const bump = (m: Record<string, number>, k: string, n = 1): void => {
  m[k] = (m[k] ?? 0) + n;
};

export class Telemetry {
  readonly runs: RunRecord[] = [];

  get current(): RunRecord | null {
    const r = this.runs[this.runs.length - 1];
    return r && r.outcome === null ? r : null;
  }

  begin(startedAt: string): RunRecord {
    if (this.current) this.end('abandoned', this.current.seconds);
    const r: RunRecord = {
      run: this.runs.length + 1,
      startedAt,
      seconds: 0,
      outcome: null,
      damageTaken: 0,
      hitsTaken: 0,
      hitsAvoided: 0,
      damageDealt: 0,
      crits: 0,
      abilityUses: {},
      castsBlocked: {},
      kills: {},
      deaths: 0,
    };
    this.runs.push(r);
    return r;
  }

  record(events: readonly GameEvent[], simSeconds: number): void {
    const r = this.current;
    if (!r) return;
    r.seconds = simSeconds;
    for (const e of events) {
      switch (e.type) {
        case 'damage':
          if (e.toPlayer) {
            r.damageTaken += e.amount;
            r.hitsTaken++;
          } else {
            r.damageDealt += e.amount;
            if (e.crit) r.crits++;
          }
          break;
        case 'avoided':
          r.hitsAvoided++;
          break;
        case 'cast':
          bump(r.abilityUses, e.ability);
          break;
        case 'evade':
          bump(r.abilityUses, 'evade');
          break;
        case 'castBlocked':
          bump(r.castsBlocked, `${e.ability}:${e.reason}`);
          break;
        case 'enemyDeath':
          bump(r.kills, e.archetype);
          break;
        case 'playerDeath':
          r.deaths++;
          break;
        case 'outcome':
          r.outcome = e.outcome;
          break;
        default:
          break;
      }
    }
  }

  end(outcome: RunOutcome, simSeconds: number): void {
    const r = this.current;
    if (!r) return;
    r.seconds = simSeconds;
    r.outcome = outcome;
  }

  report(): SessionReport {
    const t = { runs: this.runs.length, victories: 0, defeats: 0, deaths: 0, seconds: 0, damageTaken: 0, damageDealt: 0 };
    for (const r of this.runs) {
      if (r.outcome === 'victory') t.victories++;
      if (r.outcome === 'defeat') t.defeats++;
      t.deaths += r.deaths;
      t.seconds += r.seconds;
      t.damageTaken += r.damageTaken;
      t.damageDealt += r.damageDealt;
    }
    t.seconds = Math.round(t.seconds * 100) / 100;
    return { format: 'frankmangames-telemetry', version: 1, runs: this.runs.map((r) => ({ ...r, seconds: Math.round(r.seconds * 100) / 100 })), totals: t };
  }

  toJSON(): string {
    return JSON.stringify(this.report(), null, 2);
  }
}
