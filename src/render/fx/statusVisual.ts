import type { FxDef } from '../../data/fxSchema';
import type { StatusDef } from '../../rpg/contracts';

export function statusVisualFor(
    def: Pick<StatusDef, 'id' | 'kind'>,
    configuredStatuses: FxDef['statuses'],
): FxDef['statuses'][string] | null {
    const visual = configuredStatuses[def.id];
    if (visual) return visual;
    return def.kind === 'buff' ? { visual: 'aura', color: [0.9, 0.9, 0.6] } : null;
}
