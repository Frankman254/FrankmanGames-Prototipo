// Fin de combate y reparto del botín por participación (`data/rpg/spoils.json`).
// Lógica pura: el mundo le cuenta el daño, la curación, las bajas y cuántos
// enemigos tienen agro; ella decide cuándo acabó el combate y qué le toca a
// cada participante. Hoy sólo participa el jugador (sus mascotas cuentan para
// él); el modelo ya admite varios para el cooperativo.
import type { Rng } from '../sim/rng';
import type { ItemInstance } from './contracts';
import { weightedPick } from './progression';

export interface SpoilsRules {
  lootMode: 'window' | 'ground';
  calmSeconds: number;
  autoCloseSeconds: number;
  weights: { damage: number; healing: number; time: number };
  minXpShare: number;
}

/** Aporte de un participante a un combate. */
export interface Contribution {
  damage: number;
  healing: number;
  /** Segundos en combate con vida. */
  time: number;
}

export interface SpoilsPool {
  gold: number;
  xp: number;
  kills: number;
  items: ItemInstance[];
}

/** Lo que le toca a un participante. */
export interface Allotment {
  participant: string;
  share: number;
  gold: number;
  xp: number;
  items: ItemInstance[];
}

/** Resultado de un combate terminado. */
export interface CombatResult {
  seconds: number;
  kills: number;
  /** Cayó todo el grupo. */
  wiped: boolean;
  allotments: Allotment[];
}

const METRICS = ['damage', 'healing', 'time'] as const;

/**
 * Parte de cada participante (suman 1): Σ peso · (aporte / aporte total) entre
 * los aportes con algo, dividido por la suma de esos pesos. Sin aportes, a
 * partes iguales.
 */
export function shares(parts: ReadonlyMap<string, Contribution>, weights: SpoilsRules['weights']): Map<string, number> {
  const out = new Map<string, number>();
  if (parts.size === 0) return out;
  const totals = { damage: 0, healing: 0, time: 0 };
  for (const c of parts.values()) for (const k of METRICS) totals[k] += Math.max(0, c[k]);
  let wsum = 0;
  for (const k of METRICS) if (totals[k] > 0) wsum += Math.max(0, weights[k]);
  for (const [id, c] of parts) {
    let s = 0;
    if (wsum > 0) for (const k of METRICS) if (totals[k] > 0) s += (Math.max(0, weights[k]) * Math.max(0, c[k])) / totals[k];
    out.set(id, wsum > 0 ? s / wsum : 1 / parts.size);
  }
  return out;
}

/**
 * Reparte un botín: cada objeto se sortea con probabilidad ∝ parte; las monedas
 * ∝ parte (el resto del redondeo, al de más parte); la XP a cada uno × max(minXpShare, parte).
 */
export function distribute(rng: Rng, pool: SpoilsPool, parts: ReadonlyMap<string, Contribution>, rules: SpoilsRules): Allotment[] {
  const sh = shares(parts, rules.weights);
  const list: Allotment[] = [...sh].map(([participant, share]) => ({ participant, share, gold: 0, xp: 0, items: [] }));
  if (list.length === 0) return [];
  list.sort((a, b) => b.share - a.share);
  let given = 0;
  for (const a of list) {
    a.gold = Math.floor(pool.gold * a.share);
    given += a.gold;
    a.xp = a.share > 0 ? Math.round(pool.xp * Math.max(rules.minXpShare, a.share)) : 0;
  }
  list[0]!.gold += pool.gold - given;
  for (const it of pool.items) (weightedPick(rng, list, (a) => a.share) ?? list[0]!).items.push(it);
  return list;
}

/** Un combate en curso: aportes, botín acumulado y calma. */
export class Encounter {
  active = false;
  elapsed = 0;
  private calm = 0;
  readonly parts = new Map<string, Contribution>();
  pool: SpoilsPool = { gold: 0, xp: 0, kills: 0, items: [] };

  constructor(readonly rules: SpoilsRules, private readonly rng: Rng) {}

  private part(id: string): Contribution {
    let c = this.parts.get(id);
    if (!c) this.parts.set(id, (c = { damage: 0, healing: 0, time: 0 }));
    return c;
  }

  /** Daño a un enemigo: también empieza el combate (golpear a uno que aún no te vio). */
  damage(participant: string, amount: number): void {
    if (!(amount > 0)) return;
    this.active = true;
    this.calm = 0;
    this.part(participant).damage += amount;
  }

  /** Curación a un aliado; fuera de combate no cuenta. */
  healing(participant: string, amount: number): void {
    if (!this.active || !(amount > 0)) return;
    this.part(participant).healing += amount;
  }

  /** Recompensa de un enemigo abatido (las monedas y objetos se reparten al acabar). */
  addKill(xp: number, gold: number, items: ItemInstance[]): void {
    this.active = true;
    this.pool.kills++;
    this.pool.xp += Math.max(0, xp);
    this.pool.gold += Math.max(0, gold);
    this.pool.items.push(...items);
  }

  /**
   * Avanza el combate. `aggro` = enemigos que persiguen o atacan al grupo;
   * `present` = participantes con vida (suman tiempo en combate). Devuelve el
   * resultado al terminar (calma o grupo caído) y null mientras sigue.
   */
  tick(dt: number, aggro: number, present: readonly string[]): CombatResult | null {
    if (aggro > 0) {
      this.active = true;
      this.calm = 0;
    }
    if (!this.active) return null;
    this.elapsed += dt;
    for (const id of present) this.part(id).time += dt;
    const wiped = present.length === 0;
    if (aggro === 0) this.calm += dt;
    if (!wiped && this.calm < this.rules.calmSeconds) return null;
    const result: CombatResult = {
      seconds: this.elapsed,
      kills: this.pool.kills,
      wiped,
      allotments: distribute(this.rng, this.pool, this.parts, this.rules),
    };
    this.reset();
    return result;
  }

  reset(): void {
    this.active = false;
    this.elapsed = 0;
    this.calm = 0;
    this.parts.clear();
    this.pool = { gold: 0, xp: 0, kills: 0, items: [] };
  }
}
