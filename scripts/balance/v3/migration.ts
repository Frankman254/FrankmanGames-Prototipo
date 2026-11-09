import { PRIMARY_STATS, type LegacySaveDataV1, type PrimaryStat } from '../../../src/rpg/contracts';
import { cumulativeTierCost } from './experiments';

export interface AllocationMigration {
  stat: PrimaryStat;
  units: number;
  historicCapital: number;
  tieredCapital: number;
}

export interface MigrationPreview {
  sourceVersion: 1;
  level: number;
  xp: number;
  allocations: AllocationMigration[];
  storedUnspent: number;
  historicSpent: number;
  tieredEquivalent: number;
  warnings: string[];
}

/**
 * Inspección sin escritura de un guardado v1. No decide cuánto capital tendrá
 * v2: conserva por separado unidades históricas, capital almacenado y coste
 * hipotético por paliers para que la política futura sea explícita.
 */
export function previewV1Migration(save: LegacySaveDataV1): MigrationPreview {
  const warnings: string[] = [];
  const allocations: AllocationMigration[] = [];
  for (const stat of PRIMARY_STATS) {
    const raw = save.allocated[stat] ?? 0;
    const units = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    if (units !== raw) warnings.push(`${stat}: asignación ${String(raw)} normalizada a ${units}`);
    if (units > 0) allocations.push({ stat, units, historicCapital: units, tieredCapital: cumulativeTierCost(units) });
  }
  const storedUnspent = Number.isFinite(save.unspentStatPoints) ? Math.max(0, Math.floor(save.unspentStatPoints)) : 0;
  if (storedUnspent !== save.unspentStatPoints) warnings.push(`capital libre ${String(save.unspentStatPoints)} normalizado a ${storedUnspent}`);
  return {
    sourceVersion: 1,
    level: Math.max(1, Math.floor(save.level)),
    xp: Math.max(0, Math.floor(save.xp)),
    allocations,
    storedUnspent,
    historicSpent: allocations.reduce((a, x) => a + x.historicCapital, 0),
    tieredEquivalent: allocations.reduce((a, x) => a + x.tieredCapital, 0),
    warnings,
  };
}

export type MigrationCapitalPolicy = 'preserve-units' | 'refund-historic-capital' | 'grant-tiered-equivalent';

export function migrationCapital(preview: MigrationPreview, policy: MigrationCapitalPolicy): number {
  if (policy === 'preserve-units') return preview.storedUnspent;
  if (policy === 'refund-historic-capital') return preview.storedUnspent + preview.historicSpent;
  return preview.storedUnspent + preview.tieredEquivalent;
}
