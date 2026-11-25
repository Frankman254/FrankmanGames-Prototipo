// Apariencias elegibles de una montura: nombre y muestra de color de cada variante.
// Los colores salen de la misma paleta que tiñe el modelo (`data/art/<modelo>_variantes.json`).
import type { ItemDef } from '../../rpg/contracts';
import { mountLookOptionsFromPalette, type MountLookOption } from './mountLooksLogic';

export type { MountLookOption } from './mountLooksLogic';

type Palette = { variantes: Record<string, Record<string, unknown>> };
const PALETTES: Record<string, Palette> = Object.fromEntries(
    Object.entries(
        import.meta.glob<Palette>('../../../data/art/*_variantes.json', { eager: true, import: 'default' }),
    ).map(([path, file]) => [/([^/]+)_variantes\.json$/.exec(path)![1]!, file]),
);

export function mountLookOptions(def: ItemDef | undefined): MountLookOption[] {
    const model = def?.mount?.model ?? '';
    const ids = def?.mount?.variants ?? [];
    return mountLookOptionsFromPalette(ids, PALETTES[model]?.variantes);
}
