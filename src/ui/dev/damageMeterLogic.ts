import type { AbilityLine } from '../../sim/damageMeter';

export interface DamageMeterAbilityRow extends AbilityLine {
    percentage: number;
}

export function damageMeterAbilityRows(abilities: readonly AbilityLine[], dealt: number): DamageMeterAbilityRow[] {
    const total = Math.max(1, dealt);
    return abilities.map((line) => ({
        ...line,
        percentage: Math.round((line.total / total) * 100),
    }));
}
