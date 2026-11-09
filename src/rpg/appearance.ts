// Aspecto elegido al crear el personaje: cara, peinado y colores de piel, pelo y ropa.
// Las listas y los valores por clase viven en data/appearance.json (PROPUESTA).
import data from '../../data/appearance.json';
import type { CharacterSex } from './contracts';

export const HAIR_CUTS = ['short', 'long', 'bun', 'bald'] as const;
export type HairCut = (typeof HAIR_CUTS)[number];

export interface Appearance {
  /** Índice de la variante de cara (`Cara_N` en el modelo). */
  face: number;
  hair: HairCut;
  /** Colores en hexadecimal sin «#». */
  skin: string;
  hairColor: string;
  cloth: string;
  trim: string;
}

export const APPEARANCE_FACES: readonly string[] = data.faces;
export const HAIR_CUT_LABEL: Readonly<Record<HairCut, string>> = data.hair;
export const SKIN_TONES: readonly string[] = data.skin;
export const HAIR_COLORS: readonly string[] = data.hairColor;
export const CLOTH_COLORS: readonly string[] = data.cloth;

const HEX = /^[0-9a-f]{6}$/;
type Defaults = Record<string, Record<CharacterSex, Appearance>>;

/** Aspecto inicial de una clase y sexo (o el genérico). */
export function defaultAppearance(classId: string, sex: CharacterSex): Appearance {
  const d = data.defaults as unknown as Defaults;
  return { ...(d[classId] ?? d['default']!)[sex] };
}

/** Aspecto válido a partir de algo guardado; lo que falte o no valga sale de `fallback`. */
export function normalizeAppearance(raw: unknown, fallback: Appearance): Appearance {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const hex = (k: keyof Appearance): string => {
    const v = typeof r[k] === 'string' ? (r[k] as string).replace(/^#/, '').toLowerCase() : '';
    return HEX.test(v) ? v : (fallback[k] as string);
  };
  const face = typeof r['face'] === 'number' && Number.isInteger(r['face']) && r['face'] >= 0 && r['face'] < APPEARANCE_FACES.length ? r['face'] : fallback.face;
  const hair = HAIR_CUTS.includes(r['hair'] as HairCut) ? (r['hair'] as HairCut) : fallback.hair;
  return { face, hair, skin: hex('skin'), hairColor: hex('hairColor'), cloth: hex('cloth'), trim: hex('trim') };
}

export function appearanceKey(a: Appearance): string {
  return [a.face, a.hair, a.skin, a.hairColor, a.cloth, a.trim].join('|');
}

/** Color hexadecimal a [r, g, b] en 0–1 (sRGB). */
export function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
