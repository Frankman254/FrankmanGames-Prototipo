// Color de las monturas con paleta (creador, 2026-11-17). Además de sus variantes de
// `data/art/<modelo>_variantes.json`, la apariencia de una montura puede ser:
//   · «camuflaje»: sigue la ropa del jinete (color de ropa y de adorno elegidos al crear el personaje);
//   · un color fijo `#rrggbb` que elige el jugador.
// Las dos se reparten por las regiones de la paleta según su papel; la geometría no cambia.
// Lógica pura: sin DOM ni Babylon.

/** Apariencia que sigue los colores de la ropa del jinete. */
export const MOUNT_CAMO = 'camuflaje';
const HEX = /^#[0-9a-f]{6}$/;

/** Camuflaje o color fijo (lo que no es una variante de la paleta). */
export function isCustomMountLook(look: string): boolean {
    return look === MOUNT_CAMO || HEX.test(look);
}

/** Una montura con paleta (con variantes) acepta sus variantes, el camuflaje y cualquier color fijo. */
export function mountLookAllowed(variants: readonly string[] | undefined, look: string): boolean {
    if (!variants?.length) return false;
    return variants.includes(look) || isCustomMountLook(look);
}

/** Colores de la ropa del jinete, en hexadecimal sin «#» (como en `Appearance`). */
export interface RiderColors {
    cloth: string;
    trim: string;
}

type Hsl = [number, number, number];

function toHsl(hex: string): Hsl {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
}

function fromHsl([h, s, l]: Hsl): string {
    const f = (n: number): number => {
        const k = (n + h * 12) % 12;
        const a = s * Math.min(l, 1 - l);
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    const c = (v: number): string =>
        Math.round(Math.max(0, Math.min(1, v)) * 255)
            .toString(16)
            .padStart(2, '0');
    return `#${c(f(0))}${c(f(8))}${c(f(4))}`;
}

const mixWhite = (hex: string, t: number): string => {
    const [h, s, l] = toHsl(hex);
    return fromHsl([h, s * (1 - t * 0.5), l + (1 - l) * t]);
};
const darken = (hex: string, k: number): string => {
    const [h, s, l] = toHsl(hex);
    return fromHsl([h, s, l * k]);
};
/** Tono del color clave sobre la saturación y la luz de la base: el crema sigue crema, el teal cambia de tono. */
const hueOf = (base: string, key: string): string => {
    const [, s, l] = toHsl(base);
    const [h, ks] = toHsl(key);
    return fromHsl([h, ks < 0.08 ? ks : s, l]);
};

/**
 * Color por región para el camuflaje o el color fijo, a partir de la paleta base del modelo.
 * Papeles: `plumaje_secundario` toma el color; la máscara, el adorno (o el color oscurecido);
 * `pecho_cresta`, el color aclarado; `plumaje_principal`, solo su tono. Pico, cuero y herrajes no cambian.
 * Devuelve null si `look` es una variante de la paleta (o el camuflaje sin colores del jinete).
 */
export function customMountColors(
    look: string | undefined,
    base: Readonly<Record<string, string>>,
    rider: RiderColors | null,
): Record<string, string> | null {
    if (!look || !isCustomMountLook(look)) return null;
    let key: string;
    let accent: string;
    if (look === MOUNT_CAMO) {
        if (!rider) return null;
        key = `#${rider.cloth}`;
        accent = darken(`#${rider.trim}`, 0.75);
    } else {
        key = look;
        accent = darken(look, 0.42);
    }
    const out: Record<string, string> = { ...base };
    for (const region of Object.keys(base)) {
        if (region === 'plumaje_secundario') out[region] = key;
        else if (region === 'mascara' || region === 'mascara_facial') out[region] = accent;
        else if (region === 'pecho_cresta') out[region] = mixWhite(key, 0.45);
        else if (region === 'plumaje_principal') out[region] = hueOf(base[region]!, key);
    }
    return out;
}
