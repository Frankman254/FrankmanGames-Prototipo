/**
 * Hipótesis V3 puras. Ninguna función importa contratos RPG ni escribe datos:
 * son calculadoras aisladas para comparar cifras antes de aprobar mecánicas.
 */

export interface ProgressionVariant {
  id: string;
  pointsPerLevel: number;
  healthPerLevel: number;
  briznasPerLevel: number;
}

export const PROGRESSION_VARIANTS: readonly ProgressionVariant[] = [
  { id: 'actual-v2', pointsPerLevel: 5, healthPerLevel: 5, briznasPerLevel: 5 },
  { id: 'histórico-v1', pointsPerLevel: 3, healthPerLevel: 0, briznasPerLevel: 0 },
  { id: 'histórico-configInicial', pointsPerLevel: 5, healthPerLevel: 20, briznasPerLevel: 30 },
];

export function progressionAt(level: number, variant: ProgressionVariant): { capital: number; health: number; briznas: number } {
  const gains = Math.max(0, Math.floor(level) - 1);
  return { capital: gains * variant.pointsPerLevel, health: gains * variant.healthPerLevel, briznas: gains * variant.briznasPerLevel };
}

export function cumulativeTierCost(points: number): number {
  let cost = 0;
  for (let allocated = 0; allocated < Math.max(0, Math.floor(points)); allocated++) cost += 1 + Math.floor(allocated / 100);
  return cost;
}

export interface DamageExperiment {
  current: number;
  noDoubleScaling: number;
  duplicateGain: number;
}

/** Conserva la comparación entre la fórmula histórica duplicada y la fórmula v2 activa. */
export function compareDoubleScaling(base: number, scaling: number, mainStat: number, elementStat: number, power = 0, affinity = 0): DamageExperiment {
  const scaledBase = Math.floor(base + scaling * mainStat);
  const current = Math.floor(scaledBase * Math.max(0, 1 + (elementStat + power + affinity) / 100));
  const singleElement = elementStat === mainStat ? 0 : elementStat;
  const noDoubleScaling = Math.floor(scaledBase * Math.max(0, 1 + (singleElement + power + affinity) / 100));
  return { current, noDoubleScaling, duplicateGain: current - noDoubleScaling };
}

export interface ActionVariant {
  id: string;
  maxMultiplierPerUnit: number;
  regenMultiplierPerUnit: number;
  cooldownMultiplierPerUnit: number;
}

export const ACTION_VARIANTS: readonly ActionVariant[] = [
  { id: 'capacidad', maxMultiplierPerUnit: 1 / 6, regenMultiplierPerUnit: 0, cooldownMultiplierPerUnit: 0 },
  { id: 'capacidad-regeneracion', maxMultiplierPerUnit: 0.1, regenMultiplierPerUnit: 0.05, cooldownMultiplierPerUnit: 0 },
  { id: 'ventana-accion', maxMultiplierPerUnit: 0.06, regenMultiplierPerUnit: 0.03, cooldownMultiplierPerUnit: 0.025 },
];

export function actionBudget(baseMax: number, baseRegen: number, baseCooldown: number, extraUnits: number, seconds: number, variant: ActionVariant): { openingBudget: number; sustainedBudget: number; cooldown: number } {
  const max = baseMax * (1 + extraUnits * variant.maxMultiplierPerUnit);
  const regen = baseRegen * (1 + extraUnits * variant.regenMultiplierPerUnit);
  const cooldown = baseCooldown * Math.max(0.5, 1 - extraUnits * variant.cooldownMultiplierPerUnit);
  return { openingBudget: max, sustainedBudget: max + regen * seconds, cooldown };
}

export interface MobilityVariant {
  id: string;
  gainPerUnit: number;
}

export const MOBILITY_VARIANTS: readonly MobilityVariant[] = [
  { id: 'prudente-5pct', gainPerUnit: 0.05 },
  { id: 'media-8pct', gainPerUnit: 0.08 },
  { id: 'alta-12pct', gainPerUnit: 0.12 },
];

export function mobilitySpeed(baseSpeed: number, units: number, variant: MobilityVariant): number {
  return baseSpeed * (1 + variant.gainPerUnit * (units - 3));
}

export function xpToLevel(targetLevel: number, base: number, exponent = 1.5): number {
  let total = 0;
  for (let level = 1; level < targetLevel; level++) total += Math.round(base * Math.pow(level, exponent));
  return total;
}

export function controlledDuration(baseDuration: number, slowResist: number, repeatFactor: number, cap = 60): number {
  return baseDuration * Math.max(0, 1 - Math.min(cap, Math.max(0, slowResist)) / 100) * Math.max(0, repeatFactor);
}

export interface BriznasVariant {
  id: string;
  base: number;
  perLevel: number;
  perStrength: number;
}

export const BRIZNAS_VARIANTS: readonly BriznasVariant[] = [
  { id: 'actual-fija', base: 1500, perLevel: 0, perStrength: 0 },
  { id: 'exp-5-nivel-5-fuerza', base: 150, perLevel: 5, perStrength: 5 },
  { id: 'exp-30-nivel-5-fuerza', base: 150, perLevel: 30, perStrength: 5 },
];

export function briznasCapacity(level: number, effectiveStrength: number, variant: BriznasVariant): number {
  return variant.base + Math.max(0, level - 1) * variant.perLevel + Math.max(0, effectiveStrength) * variant.perStrength;
}

export interface OffensiveModel {
  normal: number;
  critical: number;
  expected: number;
}

/** Orden experimental: porcentaje → fijo universal → crítico. */
export function offensiveModel(base: number, elementPercent: number, power: number, flatUniversal: number, critChance: number, critBonus: number): OffensiveModel {
  const normal = Math.floor(base * Math.max(0, 1 + (elementPercent + power) / 100) + flatUniversal);
  const critical = Math.floor(normal * (1 + critBonus));
  const chance = Math.min(1, Math.max(0, critChance));
  return { normal, critical, expected: normal * (1 - chance) + critical * chance };
}
