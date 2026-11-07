// Iconos de arte (Codex, docs/GUIA_INTEGRACION_ARTE_AUDIO.md): PNG 256×256 por id en
// `assets/icons/<familia>/<id>.png`. Si un id no tiene PNG, quien llama dibuja el de siempre
// (SVG por código o emoji). No se recolorean: rareza, cantidad o duración son capas de interfaz.
const FILES: Record<string, string> = import.meta.glob('/assets/icons/*/*.png', { query: '?url', import: 'default', eager: true });

export type ArtIconFamily = 'items' | 'spells' | 'statuses' | 'stats' | 'ui' | 'map';

/** URL del PNG de un id, o null si no hay. */
export function artIconUrl(family: ArtIconFamily, id: string): string | null {
  return FILES[`/assets/icons/${family}/${id}.png`] ?? null;
}

/** `<img>` listo para `innerHTML`, o null si no hay PNG para ese id. */
export function artIcon(family: ArtIconFamily, id: string | undefined): string | null {
  if (!id) return null;
  const url = artIconUrl(family, id);
  return url ? `<img class="art-icon" src="${url}" alt="" draggable="false">` : null;
}

/** Cuántos PNG hay por familia (para la prueba de cobertura). */
export function artIconIds(family: ArtIconFamily): string[] {
  const prefix = `/assets/icons/${family}/`;
  return Object.keys(FILES)
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length, -4));
}
