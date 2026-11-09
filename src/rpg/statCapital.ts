import { PRIMARY_STATS, type PrimaryStat } from './contracts';

/** Coste del siguiente punto de una primaria: 1 hasta 100, 2 hasta 200, etc. */
export function statPointCost(alreadyAllocated: number): number {
  return 1 + Math.floor(Math.max(0, Math.floor(alreadyAllocated)) / 100);
}

/** Capital total invertido en una cantidad de unidades de una primaria. */
export function statCapitalForUnits(units: number): number {
  const n = Math.max(0, Math.floor(units));
  const fullTiers = Math.floor(n / 100);
  const remainder = n % 100;
  return 100 * fullTiers * (fullTiers + 1) / 2 + remainder * (fullTiers + 1);
}

export function allocatedStatCapital(allocated: Partial<Record<PrimaryStat, number>>): number {
  return PRIMARY_STATS.reduce((sum, stat) => sum + statCapitalForUnits(allocated[stat] ?? 0), 0);
}
