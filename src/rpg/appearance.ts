// Aspecto elegido al crear el personaje: cara, peinado, cejas, ojos, colores de piel, pelo y
// ropa, y proporciones (altura y complexión). Las listas y los valores por clase viven en
// data/appearance.json (PROPUESTA). Los guardados antiguos, sin los campos nuevos, cargan con
// los de `base`.
import data from '../../data/appearance.json';
import type { CharacterSex } from './contracts';

export const HAIR_CUTS = ['short', 'long', 'bun', 'bald'] as const;
export type HairCut = (typeof HAIR_CUTS)[number];
export const BROW_STYLES = ['natural', 'thick', 'thin', 'arched'] as const;
export type BrowStyle = (typeof BROW_STYLES)[number];

export interface Appearance {
    /** Índice de la variante de cara (`Cara_N` en el modelo). */
    face: number;
    hair: HairCut;
    /** Colores en hexadecimal sin «#». */
    skin: string;
    hairColor: string;
    cloth: string;
    trim: string;
    /** Forma de las cejas. */
    brows: BrowStyle;
    /** Color de ojos, hexadecimal sin «#». */
    eyes: string;
    /** Altura y complexión, de -1 a 1 (0 = la del modelo); sólo cambian el modelo, no la simulación. */
    height: number;
    build: number;
}

export const APPEARANCE_FACES: readonly string[] = data.faces;
export const HAIR_CUT_LABEL: Readonly<Record<HairCut, string>> = data.hair;
export const SKIN_TONES: readonly string[] = data.skin;
export const HAIR_COLORS: readonly string[] = data.hairColor;
export const CLOTH_COLORS: readonly string[] = data.cloth;
export const BROW_LABEL: Readonly<Record<BrowStyle, string>> = data.brows;
export const EYE_COLORS: readonly string[] = data.eyes;
/** Escala visual del modelo en los extremos de los deslizadores. */
export const BODY_RANGE: Readonly<Record<'height' | 'build', { min: number; max: number }>> = data.body;
/** Qué opciones se ven ya en el modelo; las demás se guardan pero esperan su pieza (COLA_OMP). */
export const MODEL_SUPPORT: Readonly<Record<'face' | 'hair' | 'brows' | 'eyes' | 'height' | 'build', boolean>> =
    data.modelSupport;

const HEX = /^[0-9a-f]{6}$/;
type Defaults = Record<string, Record<CharacterSex, Partial<Appearance>>>;
const BASE = data.base as Pick<Appearance, 'brows' | 'eyes' | 'height' | 'build'>;

/** Aspecto inicial de una clase y sexo (o el genérico); lo que la clase no fija sale de `base`. */
export function defaultAppearance(classId: string, sex: CharacterSex): Appearance {
    const d = data.defaults as unknown as Defaults;
    return { ...BASE, ...(d[classId] ?? d['default']!)[sex] } as Appearance;
}

/** Escala visual [alto, ancho] del modelo para una altura y complexión de -1 a 1. */
export function bodyScale(a: Pick<Appearance, 'height' | 'build'>): [number, number] {
    const lerp = (v: number, r: { min: number; max: number }): number =>
        v >= 0 ? 1 + v * (r.max - 1) : 1 + v * (1 - r.min);
    return [lerp(a.height, BODY_RANGE.height), lerp(a.build, BODY_RANGE.build)];
}

/** Aspecto válido a partir de algo guardado; lo que falte o no valga sale de `fallback`. */
export function normalizeAppearance(raw: unknown, fallback: Appearance): Appearance {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const hex = (k: keyof Appearance): string => {
        const v = typeof r[k] === 'string' ? (r[k] as string).replace(/^#/, '').toLowerCase() : '';
        return HEX.test(v) ? v : (fallback[k] as string);
    };
    const face =
        typeof r['face'] === 'number' &&
        Number.isInteger(r['face']) &&
        r['face'] >= 0 &&
        r['face'] < APPEARANCE_FACES.length
            ? r['face']
            : fallback.face;
    const hair = HAIR_CUTS.includes(r['hair'] as HairCut) ? (r['hair'] as HairCut) : fallback.hair;
    const brows = BROW_STYLES.includes(r['brows'] as BrowStyle) ? (r['brows'] as BrowStyle) : fallback.brows;
    // Proporciones: número en [-1, 1], redondeado a centésimas.
    const unit = (k: 'height' | 'build'): number => {
        const v = r[k];
        return typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(-1, Math.min(1, v)) * 100) / 100 : fallback[k];
    };
    return {
        face,
        hair,
        skin: hex('skin'),
        hairColor: hex('hairColor'),
        cloth: hex('cloth'),
        trim: hex('trim'),
        brows,
        eyes: hex('eyes'),
        height: unit('height'),
        build: unit('build'),
    };
}

export function appearanceKey(a: Appearance): string {
    return [a.face, a.hair, a.skin, a.hairColor, a.cloth, a.trim, a.brows, a.eyes, a.height, a.build].join('|');
}

/** Color hexadecimal a [r, g, b] en 0–1 (sRGB). */
export function hexRgb(h: string): [number, number, number] {
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
