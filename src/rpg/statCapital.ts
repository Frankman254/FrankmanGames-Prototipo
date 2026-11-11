// Coste de puntos de características (V3, decisión del creador 2026-11-10).
// El coste depende SOLO de las unidades naturales compradas en ESA
// característica: nada de equipo, nivel ni bonificaciones de clase.
//   - Fuerza, Agilidad, Intelecto, Calma y Caudal: tramos de 100 unidades.
//     El primer tramo cuesta 1 por unidad, el segundo 2, el tercero 3…
//   - Vitalidad: fijo 1 capital por unidad, SIEMPRE.
//   - Espíritu: fijo 2 capital por unidad, SIEMPRE.
// La tabla vigente se declara en `data/rpg/characteristics.json`; estos
// valores por defecto son idénticos y sólo actúan de respaldo.
import { PRIMARY_STATS, type PrimaryStat } from './contracts';

export type PointCost =
  | { type: 'tiered'; tierSize: number; baseCost: number; increment: number }
  | { type: 'fixed'; cost: number };

export type PointCosts = Readonly<Partial<Record<PrimaryStat, PointCost>>>;

/** Tramos universales de 100: 1, 2, 3… capital por unidad. */
export const TIERED_100: PointCost = { type: 'tiered', tierSize: 100, baseCost: 1, increment: 1 };

/** Regla vigente para todas las primarias; espejo de `data/rpg/characteristics.json` (test). */
export const DEFAULT_POINT_COSTS: Record<PrimaryStat, PointCost> = {
  strength: TIERED_100,
  agility: TIERED_100,
  intellect: TIERED_100,
  calm: TIERED_100,
  flow: TIERED_100,
  will: TIERED_100,
  vitality: { type: 'fixed', cost: 1 },
  spirit: { type: 'fixed', cost: 2 },
};

/** Coste del siguiente punto de `stat` con `alreadyAllocated` unidades naturales compradas. */
export function statPointCost(stat: PrimaryStat, alreadyAllocated: number, costs: PointCosts = {}): number {
  const c = costs[stat] ?? TIERED_100;
  if (c.type === 'fixed') return c.cost;
  const n = Math.max(0, Math.floor(alreadyAllocated));
  return c.baseCost + Math.floor(n / c.tierSize) * c.increment;
}

/** Capital total invertido en `units` unidades de `stat` bajo la regla dada. */
export function statCapitalForUnits(stat: PrimaryStat, units: number, costs: PointCosts = {}): number {
  const c = costs[stat] ?? TIERED_100;
  const n = Math.max(0, Math.floor(units));
  if (c.type === 'fixed') return n * c.cost;
  const full = Math.floor(n / c.tierSize);
  const rest = n % c.tierSize;
  let spent = 0;
  for (let t = 0; t < full; t++) spent += c.tierSize * (c.baseCost + t * c.increment);
  return spent + rest * (c.baseCost + full * c.increment);
}

export function allocatedStatCapital(allocated: Partial<Record<PrimaryStat, number>>, costs: PointCosts = {}): number {
  return PRIMARY_STATS.reduce((sum, stat) => sum + statCapitalForUnits(stat, allocated[stat] ?? 0, costs), 0);
}
