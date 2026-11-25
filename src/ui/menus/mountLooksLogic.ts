export interface MountLookOption {
    id: string;
    name: string;
    /** Pluma principal (cuerpo), región de acento (babero) y pico, para la muestra. */
    swatch: [string, string, string];
}

export function mountLookOptionsFromPalette(
    ids: readonly string[],
    palette: Record<string, Record<string, unknown>> | undefined,
): MountLookOption[] {
    return ids.map((id) => {
        const variant = palette?.[id] ?? {};
        const color = (key: string, fallback: string): string =>
            typeof variant[key] === 'string' ? (variant[key] as string) : fallback;
        return {
            id,
            name: color('nombre', id),
            swatch: [
                color('plumaje_principal', '#777777'),
                color('pecho_cresta', '#dddddd'),
                color('pico_garras', '#333333'),
            ],
        };
    });
}
