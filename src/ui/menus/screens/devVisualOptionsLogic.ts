import { DEV_VISUAL_LIMITS, type DevVisual } from '../../../render/devVisual';

export function devVisualOptionPatch(key: keyof DevVisual, value: string | boolean): Partial<DevVisual> {
    return {
        [key]: typeof value === 'string' && key in DEV_VISUAL_LIMITS ? Number(value) : value,
    } as Partial<DevVisual>;
}
