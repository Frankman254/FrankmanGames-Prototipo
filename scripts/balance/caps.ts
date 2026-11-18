// BAL-01: Topes de estadísticas — helper puro para auditorías.
// No importa nada de src/rpg ni src/sim: solo lee constantes y aplica topes.
// Los topes reales viven en el juego; aquí se declaran para que las auditorías
// distingan "suma bruta" de "efecto en juego".

import type { Element } from '../../src/rpg/contracts';

/** Tope de experiencia de aprendizaje: Math.min(100, experienceGain) en character.ts. */
export const XP_GAIN_CAP = 100;

/**
 * Tope de resistencia por elemento: se lee de data/rpg/progression.json
 * (resistCap).  Valor por defecto 50 si no se pasa.
 */
export function getResistCap(cfg?: { resistCap?: number }): number {
    return cfg?.resistCap ?? 50;
}

/**
 * Efecto real de experienceGain tras aplicar el tope.
 * El juego usa Math.max(0, Math.min(100, value)).
 */
export function effectiveXpGain(raw: number): number {
    return Math.max(0, Math.min(XP_GAIN_CAP, raw));
}

/**
 * Efecto real de resistencia a un elemento tras aplicar el tope.
 * El juego usa Math.min(resist, resistCap).
 */
export function effectiveResist(raw: number, resistCap: number): number {
    return Math.min(raw, resistCap);
}

/**
 * Resumen de una estadística topada: bruta, efectiva y si se recortó.
 */
export interface CappedStat {
    /** Valor bruto (suma de todas las fuentes). */
    raw: number;
    /** Valor que realmente aplica el juego. */
    effective: number;
    /** Tope que se aplicó. */
    cap: number;
    /** true si el valor bruto superó el tope. */
    capped: boolean;
}

/** Calcula el efecto de experienceGain con tope. */
export function capXpGain(raw: number): CappedStat {
    const effective = effectiveXpGain(raw);
    return { raw, effective, cap: XP_GAIN_CAP, capped: raw > XP_GAIN_CAP };
}

/** Calcula el efecto de la resistencia a un elemento con tope. */
export function capResist(raw: number, resistCap: number): CappedStat {
    const effective = effectiveResist(raw, resistCap);
    return { raw, effective, cap: resistCap, capped: raw > resistCap };
}

/**
 * Dado un mapa de resistencias brutas por elemento, devuelve el mapa de
 * resistencias efectivas y un conjunto de elementos que se recortaron.
 */
export function applyResistCaps(
    rawResists: Record<Element, number>,
    resistCap: number,
): { effective: Record<Element, number>; cappedElements: Element[] } {
    const effective: Record<Element, number> = {} as Record<Element, number>;
    const cappedElements: Element[] = [];
    for (const [el, raw] of Object.entries(rawResists)) {
        const eff = effectiveResist(raw, resistCap);
        effective[el as Element] = eff;
        if (raw > resistCap) {
            cappedElements.push(el as Element);
        }
    }
    return { effective, cappedElements };
}
