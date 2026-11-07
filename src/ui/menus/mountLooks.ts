// Apariencias elegibles de una montura: nombre y muestra de color de cada variante.
// Los colores salen de la misma paleta que tiñe el modelo (`data/art/<modelo>_variantes.json`).
import type { ItemDef } from '../../rpg/contracts';

export interface MountLookOption {
  id: string;
  name: string;
  /** Pluma principal (cuerpo), región de acento (babero) y pico, para la muestra. */
  swatch: [string, string, string];
}

type Palette = { variantes: Record<string, Record<string, unknown>> };
const PALETTES: Record<string, Palette> = Object.fromEntries(
  Object.entries(import.meta.glob<Palette>('../../../data/art/*_variantes.json', { eager: true, import: 'default' }))
    .map(([path, file]) => [/([^/]+)_variantes\.json$/.exec(path)![1]!, file]),
);

export function mountLookOptions(def: ItemDef | undefined): MountLookOption[] {
  const model = def?.mount?.model ?? '';
  const ids = def?.mount?.variants ?? [];
  return ids.map((id) => {
    const v = PALETTES[model]?.variantes[id] ?? {};
    const color = (k: string, fallback: string): string => (typeof v[k] === 'string' ? (v[k] as string) : fallback);
    return {
      id,
      name: color('nombre', id),
      swatch: [color('plumaje_principal', '#777777'), color('pecho_cresta', '#dddddd'), color('pico_garras', '#333333')],
    };
  });
}
