// JUI-02: Filtros combinables para catálogo grande (mochila, banco, tienda).
// Clasifica un ItemDef por elemento, conjunto y enfoque sin depender de UI.
import { tr } from '../../i18n';
import type { Element, ItemDef, ItemSetDef } from '../../rpg/contracts';
import { ELEMENTS } from '../../rpg/contracts';

/** Enfoques de equipo para filtrado rápido. */
export const ITEM_FOCUSES = ['damage', 'endurance', 'support', 'learning', 'noSet'] as const;
export type ItemFocus = (typeof ITEM_FOCUSES)[number];

/** Etiquetas en español para los enfoques (clave para i18n). */
export const FOCUS_LABEL_RAW: Record<ItemFocus, string> = {
    damage: 'Daño',
    endurance: 'Aguante',
    support: 'Apoyo',
    learning: 'Aprendizaje',
    noSet: 'Sin set',
};

/** Compatibilidad: el mismo objeto sin traducir. */
export const FOCUS_LABEL: Record<ItemFocus, string> = FOCUS_LABEL_RAW;

/** Etiquetas en español para los elementos (clave para i18n). */
export const ELEMENT_LABEL_RAW: Record<Element, string> = {
    earth: 'Tierra',
    fire: 'Fuego',
    air: 'Aire',
    water: 'Agua',
    frost: 'Hielo',
    lightning: 'Rayo',
};

/** Etiqueta traducida de un elemento. */
function elementLabel(elem: Element): string {
    return tr(ELEMENT_LABEL_RAW[elem]);
}

/** Compatibilidad: el mismo objeto sin traducir. */
export const ELEMENT_LABEL: Record<Element, string> = ELEMENT_LABEL_RAW;

/**
 * Filtro combinable para un catálogo de objetos.
 * Cada campo es opcional; 'all' significa sin filtrar.
 */
export interface ItemCatalogFilter {
    /** Elemento del arma o de los stats del item. */
    element: Element | 'all';
    /** Conjunto al que pertenece el item (setId). */
    setId: string | 'all';
    /** Enfoque del item: daño, aguante, apoyo, Aprendizaje o sin set. */
    focus: ItemFocus | 'all';
}

/** Primaria que potencia cada elemento (espejo de `rules.elementStat`; una prueba lo vigila). */
export const PRIMARY_ELEMENT: Readonly<Record<string, Element>> = {
    strength: 'earth',
    agility: 'air',
    intellect: 'fire',
    calm: 'frost',
    flow: 'water',
    will: 'lightning',
};

/**
 * Elementos de un item: el del arma y los de cualquier línea fija o tirada de
 * daño elemental o de primaria elemental (Agilidad cuenta como aire, etc.).
 * Antes solo se miraban el arma y el daño implícito, y unas botas de Agilidad
 * no aparecían al filtrar por aire.
 */
export function getElementsOf(def: ItemDef): Element[] {
    const out = new Set<Element>();
    if (def.weapon?.element) out.add(def.weapon.element);
    for (const mod of [...def.implicit, ...def.rolls]) {
        const stat = String(mod.stat);
        if (stat === 'elementalDamage') for (const e of ELEMENTS) out.add(e);
        const elem = stat.startsWith('damage.') ? stat.slice(7) : PRIMARY_ELEMENT[stat];
        if (elem && ELEMENTS.includes(elem as Element)) out.add(elem as Element);
    }
    return [...out];
}

/** Elemento principal de un item: el del arma o el primero de sus líneas. */
export function getElementOf(def: ItemDef): Element | null {
    return getElementsOf(def)[0] ?? null;
}

/**
 * Verifica si un set de Aprendizaje (tiene experienceGain en sus bonos).
 */
export function isLearningSet(setDef: ItemSetDef): boolean {
    for (const bonus of setDef.bonuses) {
        for (const mod of bonus.modifiers) {
            if (mod.stat === 'experienceGain') return true;
        }
    }
    return false;
}

/**
 * Clasifica el enfoque de un item según sus stats implicit y su set.
 * - learning: el setId apunta a un set con experienceGain
 * - noSet: no tiene setId
 * - endurance: tiene resist.* o maxHealth en implicit
 * - support: tiene healAmount, cooldownReduction o castStability
 * - damage: tiene damage.* o attackDamage (default)
 */
export function getFocusOf(def: ItemDef, sets: Readonly<Record<string, ItemSetDef>>): ItemFocus {
    // Sin set
    if (!def.setId) return 'noSet';

    // Aprendizaje: set con experienceGain
    const setDef = sets[def.setId];
    if (setDef && isLearningSet(setDef)) return 'learning';

    // Analizar implicit stats
    let hasDamage = false;
    let hasResist = false;
    let hasSupport = false;

    for (const mod of def.implicit) {
        const stat = mod.stat;
        if (typeof stat === 'string') {
            if (stat.startsWith('damage.')) hasDamage = true;
            if (stat.startsWith('resist.')) hasResist = true;
            if (stat === 'maxHealth') hasResist = true;
            if (stat === 'healingPower' || stat === 'cooldownReduction' || stat === 'castStability') hasSupport = true;
        }
    }

    // También verificar rolls
    for (const roll of def.rolls) {
        const stat = roll.stat;
        if (typeof stat === 'string') {
            if (stat.startsWith('damage.')) hasDamage = true;
            if (stat.startsWith('resist.')) hasResist = true;
            if (stat === 'maxHealth') hasResist = true;
            if (stat === 'healingPower' || stat === 'cooldownReduction' || stat === 'castStability') hasSupport = true;
        }
    }

    // Prioridad: apoyo > aguante > daño
    if (hasSupport) return 'support';
    if (hasResist) return 'endurance';
    return 'damage';
}

/**
 * Verifica si un item coincide con un filtro de catálogo.
 */
export function matchesCatalogFilter(
    def: ItemDef,
    filter: ItemCatalogFilter,
    sets: Readonly<Record<string, ItemSetDef>>,
): boolean {
    if (filter.element !== 'all') {
        if (!getElementsOf(def).includes(filter.element)) return false;
    }
    if (filter.setId !== 'all') {
        if (def.setId !== filter.setId) return false;
    }
    if (filter.focus !== 'all') {
        const focus = getFocusOf(def, sets);
        if (focus !== filter.focus) return false;
    }
    return true;
}

/**
 * Devuelve la lista de sets únicos presentes en un conjunto de items.
 * Útil para poblar el selector de conjuntos.
 */
export function getSetIds(items: readonly ItemDef[]): string[] {
    const seen = new Set<string>();
    for (const def of items) {
        if (def.setId && !seen.has(def.setId)) {
            seen.add(def.setId);
        }
    }
    return [...seen].sort();
}

/**
 * Devuelve la lista de elementos presentes en un conjunto de items.
 */
export function getElements(items: readonly ItemDef[]): Element[] {
    const seen = new Set<Element>();
    for (const def of items) {
        for (const elem of getElementsOf(def)) seen.add(elem);
    }
    return [...seen].sort();
}
