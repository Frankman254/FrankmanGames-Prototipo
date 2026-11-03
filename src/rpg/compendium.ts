// Compendio: criaturas, objetos y zonas sacados de los datos, para consultar en
// el juego y para depurar. Puro: sin DOM. Las probabilidades de botín son las de
// una tirada de la tabla, redondeadas para leer (no garantizan el resultado).
import type { ContentDb, Element, LootTableDef, Rarity } from './contracts';

export interface CompendiumDrop {
  itemId: string;
  name: string;
  rarity: Rarity;
  /** Probabilidad (0–1) de que caiga al menos una vez al morir la criatura. */
  chance: number;
}

export interface CompendiumCreature {
  id: string;
  name: string;
  level: number;
  xp: number;
  element: Element;
  maxHealth: number;
  speed: number;
  attackRange: number;
  zones: string[];
  drops: CompendiumDrop[];
  gold: { min: number; max: number; chance: number } | null;
}

export interface CompendiumItem {
  id: string;
  name: string;
  rarity: Rarity;
  level: number;
  description: string;
  value: number;
  /** Criaturas que lo pueden soltar. */
  droppedBy: string[];
  /** Mercaderes que lo venden. */
  soldBy: string[];
}

export interface CompendiumZone {
  id: string;
  name: string;
  levelMin: number;
  levelMax: number;
  climate: string;
  safe: boolean;
  creatures: string[];
}

export interface Compendium {
  creatures: CompendiumCreature[];
  items: CompendiumItem[];
  zones: CompendiumZone[];
}

export interface CompendiumSources {
  content: ContentDb & {
    enemies: Record<string, { name: string; level: number; xp: number; lootTable: string | null; element: Element }>;
    merchants: Record<string, { name: string; stock: readonly { itemId: string }[] }>;
  };
  archetypes: Record<string, { maxHealth: number; speed: number; attack: { range: number } }>;
  zones: readonly { id: string; name: string; levelMin: number; levelMax: number; climate: string; safe?: boolean; spawns: readonly { archetype: string }[] }[];
}

/** Probabilidad de que un objeto salga al menos una vez en `rolls` tiradas de la tabla. */
export function dropChance(table: LootTableDef, itemId: string): number {
  const total = table.entries.reduce((a, e) => a + e.weight, 0);
  const weight = table.entries.filter((e) => e.itemId === itemId).reduce((a, e) => a + e.weight, 0);
  if (total <= 0 || weight <= 0) return 0;
  const perRoll = table.chance * (weight / total);
  return 1 - Math.pow(1 - perRoll, table.rolls);
}

const byName = <T extends { name: string }>(a: T, b: T): number => a.name.localeCompare(b.name, 'es');

export function buildCompendium({ content, archetypes, zones }: CompendiumSources): Compendium {
  const zonesOf = new Map<string, string[]>();
  for (const z of zones) {
    for (const s of z.spawns) {
      const list = zonesOf.get(s.archetype) ?? [];
      if (!list.includes(z.name)) list.push(z.name);
      zonesOf.set(s.archetype, list);
    }
  }
  const droppedBy = new Map<string, string[]>();
  const creatures = Object.entries(content.enemies).map(([id, e]): CompendiumCreature => {
    const table = e.lootTable ? content.lootTables[e.lootTable] : undefined;
    const seen = new Set<string>();
    const drops: CompendiumDrop[] = [];
    for (const entry of table?.entries ?? []) {
      const item = content.items[entry.itemId];
      if (!item || seen.has(entry.itemId)) continue;
      seen.add(entry.itemId);
      drops.push({ itemId: entry.itemId, name: item.name, rarity: item.rarity, chance: dropChance(table!, entry.itemId) });
      const who = droppedBy.get(entry.itemId) ?? [];
      who.push(e.name);
      droppedBy.set(entry.itemId, who);
    }
    drops.sort((a, b) => b.chance - a.chance);
    const a = archetypes[id];
    return {
      id,
      name: e.name,
      level: e.level,
      xp: e.xp,
      element: e.element,
      maxHealth: a?.maxHealth ?? 0,
      speed: a?.speed ?? 0,
      attackRange: a?.attack.range ?? 0,
      zones: zonesOf.get(id) ?? [],
      drops,
      gold: table && table.gold.chance > 0 ? table.gold : null,
    };
  });
  const soldBy = new Map<string, string[]>();
  for (const m of Object.values(content.merchants)) {
    for (const s of m.stock) {
      const list = soldBy.get(s.itemId) ?? [];
      if (!list.includes(m.name)) list.push(m.name);
      soldBy.set(s.itemId, list);
    }
  }
  const items = Object.entries(content.items).map(([id, d]): CompendiumItem => ({
    id,
    name: d.name,
    rarity: d.rarity,
    level: d.level,
    description: d.description,
    value: d.value,
    droppedBy: droppedBy.get(id) ?? [],
    soldBy: soldBy.get(id) ?? [],
  }));
  const zoneRows = zones.map((z): CompendiumZone => ({
    id: z.id,
    name: z.name,
    levelMin: z.levelMin,
    levelMax: z.levelMax,
    climate: z.climate,
    safe: z.safe === true,
    creatures: [...new Set(z.spawns.map((s) => content.enemies[s.archetype]?.name ?? s.archetype))],
  }));
  return {
    creatures: creatures.sort((a, b) => a.level - b.level || byName(a, b)),
    items: items.sort(byName),
    zones: zoneRows.sort((a, b) => a.levelMin - b.levelMin || byName(a, b)),
  };
}

/** Filtro por texto, sin distinguir mayúsculas ni acentos. */
export function matchesSearch(name: string, query: string): boolean {
  const norm = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return norm(name).includes(norm(query.trim()));
}
