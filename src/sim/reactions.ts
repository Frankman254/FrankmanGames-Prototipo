// HZ-04b: Reacciones elementales.
// Cada golpe elemental deja una marca de 6 s en el objetivo. Un elemento distinto
// sobre un objetivo marcado dispara la reacción y gasta las dos marcas.
// El mismo objetivo tiene 2 s de espera entre reacciones.
// Detrás de opción de desarrollo, apagada por defecto en producción.

import type { Element } from '../rpg/contracts';

/** Una marca elemental asociada a un elemento. */
export const ELEMENTAL_MARKS: Record<Element, string | null> = {
    fire: 'mark_fire',
    water: 'mark_water',
    frost: 'mark_frost',
    lightning: 'mark_lightning',
    earth: 'mark_earth',
    air: null, // el aire no deja marca
} as const;

/** Duración de las marcas en segundos. */
export const MARK_DURATION = 6;

/** Tiempo mínimo entre reacciones en el mismo objetivo. */
export const REACTION_COOLDOWN = 2;

/** Resultado de una reacción elemental. */
export interface ElementalReaction {
    id: string;
    label: string;
    /** Los dos elementos que la disparan (orden alfabético). */
    pair: readonly [Element, Element];
    /** Tipo de efecto. */
    effect:
        | 'status'
        | 'stun'
        | 'bonusDamage'
        | 'chain'
        | 'spread'
        | 'zone'
        | 'burst';
    /** Estado a aplicar (para status, stun, spread). */
    statusId?: string;
    /** Duración del estado o del stun. */
    duration?: number;
    /** % de daño extra (para bonusDamage). */
    bonusPercent?: number;
    /** Radio de la zona o del burst. */
    radius?: number;
    /** Número de saltos (para chain). */
    jumps?: number;
    /** Estado requerido para el salto (para chain con onlyStatus). */
    onlyStatus?: string;
    /** Bonus de daño para chain. */
    damageBonus?: number;
    /** Empuje del burst. */
    knockback?: number;
}

/** Carga las reacciones desde data/rpg/reactions.json. */
export function loadReactions(): {
    reactions: readonly ElementalReaction[];
    byPair: Map<string, ElementalReaction>;
} {
    // Carga sincrónica desde datos empaquetados por Vite.
    // En producción, `reactionsData` se importa como JSON.
    const raw = typeof require !== 'undefined'
        ? require('../../data/rpg/reactions.json')
        : null;

    // Fallback: reacciones hardcoded si la carga falla (tests sin Vite).
    const reactions: readonly ElementalReaction[] = raw?.reactions ?? FALLBACK_REACTIONS;
    const byPair = new Map<string, ElementalReaction>();
    for (const r of reactions) {
        byPair.set(pairKey(...r.pair), r);
    }
    return { reactions, byPair };
}

/** Reacciones de respaldo para tests sin Vite. */
const FALLBACK_REACTIONS: readonly ElementalReaction[] = [
    { id: 'vapor', label: 'Vaho', pair: ['fire', 'water'], effect: 'zone', statusId: 'reaction_vapor', duration: 4, radius: 3 },
    { id: 'frozen_reaction', label: 'Congelado', pair: ['frost', 'water'], effect: 'status', statusId: 'frozen', duration: 1.5 },
    { id: 'cramp', label: 'Calambre', pair: ['lightning', 'water'], effect: 'chain', jumps: 5, radius: 5, onlyStatus: 'soaked', damageBonus: 0.3 },
    { id: 'mud', label: 'Barrial', pair: ['earth', 'water'], effect: 'zone', statusId: 'reaction_mud', duration: 4, radius: 3 },
    { id: 'squall', label: 'Chubasco', pair: ['air', 'water'], effect: 'spread', statusId: 'soaked', radius: 4 },
    { id: 'thermal_shock', label: 'Choque térmico', pair: ['fire', 'frost'], effect: 'bonusDamage', bonusPercent: 40 },
    { id: 'explosion', label: 'Estallido', pair: ['fire', 'lightning'], effect: 'burst', radius: 3, knockback: 2 },
    { id: 'lava', label: 'Lava', pair: ['earth', 'fire'], effect: 'zone', duration: 4, radius: 3 },
    { id: 'firestorm', label: 'Incendio', pair: ['air', 'fire'], effect: 'spread', statusId: 'mark_fire', radius: 4 },
    { id: 'fracture', label: 'Quiebre', pair: ['frost', 'lightning'], effect: 'status', statusId: 'reaction_fracture', duration: 5 },
    { id: 'hard_frost', label: 'Helada dura', pair: ['earth', 'frost'], effect: 'status', statusId: 'reaction_hardFrost', duration: 5 },
    { id: 'blizzard', label: 'Ventisca', pair: ['air', 'frost'], effect: 'zone', statusId: 'mark_frost', duration: 4, radius: 4 },
    { id: 'grounding', label: 'Toma de tierra', pair: ['earth', 'lightning'], effect: 'stun', duration: 1 },
    { id: 'storm', label: 'Tormenta', pair: ['air', 'lightning'], effect: 'chain', jumps: 3, radius: 5 },
    { id: 'dust_storm', label: 'Polvareda', pair: ['air', 'earth'], effect: 'status', statusId: 'disoriented', duration: 3 },
] as const;

/** Clave ordenada para buscar en el mapa. */
export function pairKey(a: Element, b: Element): string {
    return [a, b].sort().join(':');
}

/** Busca la reacción para dos elementos. */
export function findReaction(byPair: Map<string, ElementalReaction>, a: Element, b: Element): ElementalReaction | null {
    if (a === b) return null;
    return byPair.get(pairKey(a, b)) ?? null;
}

/**
 * Tracker de marcas elementales por objetivo.
 * Cada objetivo tiene una marca activa (elemento + tiempo restante)
 * y un cooldown entre reacciones.
 */
export class ElementalMarkTracker {
    /** Marca activa por targetId: elemento + tiempo restante en segundos. */
    private marks = new Map<number, { element: Element; remaining: number }>();
    /** Cooldown por targetId: tiempo restante hasta que pueda reaccionar de nuevo. */
    private cooldowns = new Map<number, number>();

    /**
     * Aplica una marca elemental al objetivo y verifica si hay reacción.
     * @returns la reacción si se disparó, null en caso contrario.
     */
    apply(
        targetId: number,
        element: Element,
        byPair: Map<string, ElementalReaction>,
    ): ElementalReaction | null {
        // El aire no deja marca.
        const markId = ELEMENTAL_MARKS[element];
        if (markId === null) return null;

        const existing = this.marks.get(targetId);

        // Mismo elemento: renueva la marca.
        if (existing && existing.element === element) {
            existing.remaining = MARK_DURATION;
            return null;
        }

        // Elemento distinto y hay marca previa: verificar reacción.
        if (existing) {
            // Verificar cooldown.
            const cd = this.cooldowns.get(targetId) ?? 0;
            if (cd > 0) {
                // En cooldown: solo se renueva la marca, no hay reacción.
                this.marks.set(targetId, { element, remaining: MARK_DURATION });
                return null;
            }

            const reaction = findReaction(byPair, existing.element, element);
            if (reaction) {
                // Reacción disparada: se gastan ambas marcas y se activa cooldown.
                this.marks.delete(targetId);
                this.cooldowns.set(targetId, REACTION_COOLDOWN);
                return reaction;
            }
        }

        // Sin marca previa o sin reacción: se establece la nueva marca.
        this.marks.set(targetId, { element, remaining: MARK_DURATION });
        return null;
    }

    /**
     * Avanza el tiempo para todas las marcas y cooldowns.
     * Devuelve los IDs de objetivos que perdieron su marca.
     */
    tick(dt: number): number[] {
        const expired: number[] = [];
        for (const [id, mark] of this.marks) {
            mark.remaining -= dt;
            if (mark.remaining <= 0) {
                this.marks.delete(id);
                expired.push(id);
            }
        }
        for (const [id, cd] of this.cooldowns) {
            const newCd = cd - dt;
            if (newCd <= 0) {
                this.cooldowns.delete(id);
            } else {
                this.cooldowns.set(id, newCd);
            }
        }
        return expired;
    }

    /** Limpia la marca de un objetivo (muerte, etc.). */
    clear(targetId: number): void {
        this.marks.delete(targetId);
        this.cooldowns.delete(targetId);
    }

    /** Devuelve el elemento de la marca actual de un objetivo, o null. */
    getMark(targetId: number): Element | null {
        return this.marks.get(targetId)?.element ?? null;
    }
}
