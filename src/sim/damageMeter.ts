// Medidor de daño para las pruebas (sólo desarrollo): DPS hecho y recibido,
// golpe más alto, desglose por hechizo y tiempo en matar. Se alimenta de los
// mismos sucesos de `World` que la telemetría y no toca la simulación.
import type { GameEvent } from './events';

/** Nombre del ataque básico en el desglose (los sucesos lo marcan con `ability: null`). */
export const BASIC_ATTACK = 'basic';

export interface AbilityLine {
  ability: string;
  total: number;
  hits: number;
  crits: number;
  max: number;
}

export interface BiggestHit {
  amount: number;
  ability: string;
  crit: boolean;
}

export interface MeterReport {
  /** Segundos de combate medidos (desde el primer golpe tras reiniciar). */
  seconds: number;
  dealt: number;
  taken: number;
  healed: number;
  dps: number;
  dtps: number;
  hps: number;
  /** DPS de los últimos `windowSeconds`. */
  recentDps: number;
  biggestDealt: BiggestHit | null;
  biggestTaken: BiggestHit | null;
  /** De más a menos daño. */
  abilities: AbilityLine[];
  kills: number;
  /** Tiempo en matar: del primer golpe a cada enemigo hasta su muerte. */
  ttk: { last: number | null; mean: number | null; min: number | null; max: number | null };
  /** Últimas muertes con su tiempo, la más reciente primero. */
  recentKills: { archetype: string; seconds: number }[];
}

export interface MeterHost {
  /** El que hace el golpe es del jugador (él o sus mascotas). */
  isAlly(id: number): boolean;
  /** El objetivo es el jugador. */
  isPlayer(id: number): boolean;
}

export class DamageMeter {
  /** Ventana del DPS reciente, en segundos. */
  windowSeconds = 5;
  private start: number | null = null;
  private now = 0;
  private dealt = 0;
  private taken = 0;
  private healed = 0;
  private biggestDealt: BiggestHit | null = null;
  private biggestTaken: BiggestHit | null = null;
  private readonly lines = new Map<string, AbilityLine>();
  /** Primer golpe recibido por cada enemigo vivo (id → segundo). */
  private readonly firstHit = new Map<number, number>();
  private readonly ttks: number[] = [];
  private readonly kills: { archetype: string; seconds: number }[] = [];
  private readonly recent: { t: number; amount: number }[] = [];

  /** Empieza de cero (también al cambiar de partida o de escena). */
  reset(): void {
    this.start = null;
    this.dealt = this.taken = this.healed = 0;
    this.biggestDealt = this.biggestTaken = null;
    this.lines.clear();
    this.firstHit.clear();
    this.ttks.length = 0;
    this.kills.length = 0;
    this.recent.length = 0;
  }

  /** Mundo nuevo (otro piso, reinicio): los ids de enemigo vuelven a empezar, así que se olvidan los golpes a medias. */
  newScene(): void {
    this.firstHit.clear();
  }

  /** Sucesos del fotograma y segundo de simulación actual. */
  record(events: readonly GameEvent[], simSeconds: number, host: MeterHost): void {
    this.now = simSeconds;
    for (const e of events) {
      switch (e.type) {
        case 'damage': {
          if (e.amount <= 0) break;
          const ability = e.ability ?? BASIC_ATTACK;
          if (e.toPlayer || host.isPlayer(e.targetId)) {
            this.begin();
            this.taken += e.amount;
            if (!this.biggestTaken || e.amount > this.biggestTaken.amount) this.biggestTaken = { amount: e.amount, ability, crit: e.crit };
          } else if (host.isAlly(e.sourceId)) {
            this.begin();
            this.dealt += e.amount;
            this.recent.push({ t: simSeconds, amount: e.amount });
            if (!this.biggestDealt || e.amount > this.biggestDealt.amount) this.biggestDealt = { amount: e.amount, ability, crit: e.crit };
            let l = this.lines.get(ability);
            if (!l) this.lines.set(ability, (l = { ability, total: 0, hits: 0, crits: 0, max: 0 }));
            l.total += e.amount;
            l.hits++;
            if (e.crit) l.crits++;
            l.max = Math.max(l.max, e.amount);
            if (!this.firstHit.has(e.targetId)) this.firstHit.set(e.targetId, simSeconds);
          }
          break;
        }
        case 'heal':
          if (host.isPlayer(e.targetId) && e.amount > 0) {
            this.begin();
            this.healed += e.amount;
          }
          break;
        case 'enemyDeath': {
          const t0 = this.firstHit.get(e.enemyId);
          if (t0 === undefined) break; // no lo tocó el jugador
          this.firstHit.delete(e.enemyId);
          const s = Math.max(0, simSeconds - t0);
          this.ttks.push(s);
          this.kills.unshift({ archetype: e.archetype, seconds: s });
          if (this.kills.length > 8) this.kills.length = 8;
          break;
        }
        default:
          break;
      }
    }
    const from = simSeconds - this.windowSeconds;
    while (this.recent.length > 0 && this.recent[0]!.t < from) this.recent.shift();
  }

  private begin(): void {
    if (this.start === null) this.start = this.now;
  }

  report(): MeterReport {
    // Al menos un segundo: el primer golpe no da un DPS infinito.
    const seconds = this.start === null ? 0 : Math.max(1, this.now - this.start);
    const per = (v: number): number => (seconds > 0 ? v / seconds : 0);
    const recentSpan = Math.max(1, Math.min(this.windowSeconds, seconds));
    const sum = this.ttks.reduce((a, b) => a + b, 0);
    return {
      seconds: this.start === null ? 0 : this.now - this.start,
      dealt: this.dealt,
      taken: this.taken,
      healed: this.healed,
      dps: per(this.dealt),
      dtps: per(this.taken),
      hps: per(this.healed),
      recentDps: this.recent.reduce((a, r) => a + r.amount, 0) / recentSpan,
      biggestDealt: this.biggestDealt,
      biggestTaken: this.biggestTaken,
      abilities: [...this.lines.values()].sort((a, b) => b.total - a.total).map((l) => ({ ...l })),
      kills: this.ttks.length,
      ttk: {
        last: this.ttks.length ? this.ttks[this.ttks.length - 1]! : null,
        mean: this.ttks.length ? sum / this.ttks.length : null,
        min: this.ttks.length ? Math.min(...this.ttks) : null,
        max: this.ttks.length ? Math.max(...this.ttks) : null,
      },
      recentKills: this.kills.map((k) => ({ ...k })),
    };
  }
}
