// Ajustes visuales de prueba (Opciones › Desarrollo): imagen de la escena (LUZ-01) y
// letra de los números de daño (UI-05). Son de la máquina, no de la partida: se guardan
// en localStorage aparte de las opciones y avisan a quien escuche al cambiar.
// Las cifras por defecto son PROPUESTA de arte; se afinan jugando.

/** Curva de tono: ACES (filmica, colores vivos), Khronos neutra, o ninguna (como antes). */
export const TONEMAPS = ['aces', 'neutra', 'ninguna'] as const;
export type Tonemap = (typeof TONEMAPS)[number];

/** Letras de los números de daño: sólo fuentes del sistema (nada descargado). */
export const DAMAGE_FONTS = {
    sistema: { name: 'Sistema', css: 'system-ui, sans-serif', weight: 'bold' },
    impacto: { name: 'Impacto', css: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', weight: 'normal' },
    negrita: { name: 'Negra ancha', css: '"Arial Black", "Helvetica Neue", Arial, sans-serif', weight: '900' },
    libro: { name: 'Libro', css: 'Georgia, Cambria, "Times New Roman", serif', weight: 'bold' },
    redonda: { name: 'Redonda', css: '"Trebuchet MS", "Gill Sans", "Segoe UI", sans-serif', weight: 'bold' },
    tecnica: {
        name: 'Técnica',
        css: 'Bahnschrift, "DIN Alternate", "Eurostile", "Segoe UI", sans-serif',
        weight: 'bold',
    },
    maquina: { name: 'Máquina', css: '"Courier New", Courier, monospace', weight: 'bold' },
    tebeo: { name: 'Tebeo', css: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive', weight: 'bold' },
} as const;
export type DamageFont = keyof typeof DAMAGE_FONTS;

/** Acabado del número: plano (el de siempre), relieve (biselado con brillo) o bloque (extruido en 3D). */
export const DAMAGE_STYLES = ['plano', 'relieve', 'bloque'] as const;
export type DamageStyle = (typeof DAMAGE_STYLES)[number];

export interface DevVisual {
    tonemap: Tonemap;
    /** Exposición antes de la curva (1 = sin cambio). */
    exposure: number;
    contrast: number;
    /** Saturación extra de las curvas de color (0 = ninguna, 100 = máxima). */
    vibrance: number;
    /** Oscurecido de las esquinas (0–1). */
    vignette: number;
    /** Resplandor de lo muy brillante (pase extra: cuesta GPU). */
    bloom: boolean;
    damageFont: DamageFont;
    damageStyle: DamageStyle;
}

export const DEV_VISUAL_DEFAULTS: DevVisual = {
    tonemap: 'aces',
    exposure: 1.3,
    contrast: 1.18,
    vibrance: 20,
    vignette: 0.35,
    bloom: false,
    damageFont: 'impacto',
    damageStyle: 'bloque',
};

/** Límites de los deslizadores (también acotan lo que se lee del almacenamiento). */
export const DEV_VISUAL_LIMITS = {
    exposure: { min: 0.6, max: 2, step: 0.05 },
    contrast: { min: 0.8, max: 1.6, step: 0.02 },
    vibrance: { min: 0, max: 80, step: 2 },
    vignette: { min: 0, max: 1, step: 0.05 },
} as const;

const KEY = 'fg.devVisual';

function storage(): Storage | null {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
        return null;
    }
}

export function normalizeDevVisual(raw: unknown): DevVisual {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const d = DEV_VISUAL_DEFAULTS;
    const num = (k: keyof typeof DEV_VISUAL_LIMITS): number => {
        const v = o[k];
        const L = DEV_VISUAL_LIMITS[k];
        return typeof v === 'number' && Number.isFinite(v) ? Math.min(L.max, Math.max(L.min, v)) : d[k];
    };
    const pick = <T extends string>(k: string, list: readonly T[], def: T): T =>
        list.includes(o[k] as T) ? (o[k] as T) : def;
    return {
        tonemap: pick('tonemap', TONEMAPS, d.tonemap),
        exposure: num('exposure'),
        contrast: num('contrast'),
        vibrance: num('vibrance'),
        vignette: num('vignette'),
        bloom: typeof o.bloom === 'boolean' ? o.bloom : d.bloom,
        damageFont: pick('damageFont', Object.keys(DAMAGE_FONTS) as DamageFont[], d.damageFont),
        damageStyle: pick('damageStyle', DAMAGE_STYLES, d.damageStyle),
    };
}

let current: DevVisual | null = null;
const listeners = new Set<(v: DevVisual) => void>();

export function devVisual(): DevVisual {
    if (!current) {
        let raw: unknown = null;
        try {
            raw = JSON.parse(storage()?.getItem(KEY) ?? 'null');
        } catch {
            raw = null;
        }
        current = normalizeDevVisual(raw);
    }
    return current;
}

export function setDevVisual(patch: Partial<DevVisual>): DevVisual {
    current = normalizeDevVisual({ ...devVisual(), ...patch });
    try {
        storage()?.setItem(KEY, JSON.stringify(current));
    } catch {
        /* sin almacenamiento: vale para esta sesión */
    }
    for (const fn of listeners) fn(current);
    return current;
}

/** Escucha los cambios; devuelve la baja. */
export function onDevVisual(fn: (v: DevVisual) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
