// JUI-02: Filtros combinables para catálogo grande (mochila, banco, tienda).
// Clasifica un ItemDef por elemento, conjunto y enfoque sin depender de UI.
import type { Element, ItemDef, ItemSetDef } from '../../rpg/contracts';
import { ELEMENTS } from '../../rpg/contracts';

/** Enfoques de equipo para filtrado rápido. */
export const ITEM_FOCUSES = ['damage', 'endurance', 'support', 'learning', 'noSet'] as const;
export type ItemFocus = (typeof ITEM_FOCUSES)[number];

/** Etiquetas en español para los enfoques. */
export const FOCUS_LABEL: Record<ItemFocus, string> = {
  damage: 'Daño',
  endurance: 'Aguante',
  support: 'Apoyo',
  learning: 'Aprendizaje',
  noSet: 'Sin set',
};

/** Etiquetas en español para los elementos. */
export const ELEMENT_LABEL: Record<Element, string> = {
  earth: 'Tierra',
  fire: 'Fuego',
  air: 'Aire',
  water: 'Agua',
  frost: 'Hielo',
  lightning: 'Rayo',
};

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

/**
 * Devuelve el elemento principal de un item.
 * Prioriza weapon?.element, luego busca en implicit stats `damage.<element>`.
 */
export function getElementOf(def: ItemDef): Element | null {
  if (def.weapon?.element) return def.weapon.element;
  // Buscar daño elemental en implicit stats
  for (const mod of def.implicit) {
    const stat = mod.stat;
    if (typeof stat === 'string' && stat.startsWith('damage.')) {
      const elem = stat.slice(7);
      if (ELEMENTS.includes(elem as Element)) return elem as Element;
    }
  }
  return null;
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
export function matchesCatalogFilter(def: ItemDef, filter: ItemCatalogFilter, sets: Readonly<Record<string, ItemSetDef>>): boolean {
  if (filter.element !== 'all') {
    const elem = getElementOf(def);
    if (elem !== filter.element) return false;
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
    const elem = getElementOf(def);
    if (elem) seen.add(elem);
  }
  return [...seen].sort();
}
