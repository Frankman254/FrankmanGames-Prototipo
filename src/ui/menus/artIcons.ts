// Iconos de arte (Codex, docs/GUIA_INTEGRACION_ARTE_AUDIO.md): PNG 256×256 por id en
// `assets/icons/<familia>/<id>.png`. Si un id no tiene PNG, quien llama dibuja el de siempre
// (SVG por código o emoji). No se recolorean: rareza, cantidad o duración son capas de interfaz.
const FILES: Record<string, string> = import.meta.glob('/assets/icons/*/*.png', {
    query: '?url',
    import: 'default',
    eager: true,
});

// Retratos: PNG en `assets/portraits/<id>.png`.
const PORTRAITS: Record<string, string> = import.meta.glob('/assets/portraits/*.png', {
    query: '?url',
    import: 'default',
    eager: true,
});

export type ArtIconFamily = 'items' | 'spells' | 'statuses' | 'stats' | 'ui' | 'map';

/** URL del PNG de un id, o null si no hay. */
export function artIconUrl(family: ArtIconFamily, id: string): string | null {
    return FILES[`/assets/icons/${family}/${id}.png`] ?? null;
}

/** `<img>` listo para `innerHTML`, o null si no hay PNG para ese id. */
export function artIcon(family: ArtIconFamily, id: string | undefined): string | null {
    if (!id) return null;
    const url = artIconUrl(family, id);
    return url
        ? `<img class="art-icon art-icon-${family} art-icon-${family}-${id}" data-id="${id}" src="${url}" alt="" draggable="false">`
        : null;
}

/** Cuántos PNG hay por familia (para la prueba de cobertura). */
export function artIconIds(family: ArtIconFamily): string[] {
    const prefix = `/assets/icons/${family}/`;
    return Object.keys(FILES)
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length, -4));
}

/** URL del retrato PNG por id, o null si no hay. */
export function portraitUrl(id: string): string | null {
    return PORTRAITS[`/assets/portraits/${id}.png`] ?? null;
}

/** `<img>` listo para innerHTML con el retrato, o null si no hay PNG. */
export function portraitImg(id: string): string | null {
    const url = portraitUrl(id);
    return url
        ? `<img class="portrait-img" src="${url}" alt="Retrato" draggable="false" loading="lazy">`
        : null;
}

/** Lista de ids de retratos disponibles. */
export function portraitIds(): string[] {
    const prefix = '/assets/portraits/';
    return Object.keys(PORTRAITS)
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length, -4));
}
