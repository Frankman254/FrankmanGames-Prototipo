// Compendio: criaturas, objetos y zonas sacados de los datos, para consultar en
// el juego y para depurar. Puro: sin DOM. Las probabilidades de botín son las de
// una tirada de la tabla, redondeadas para leer (no garantizan el resultado).
import type { ContentDb, Element, LootTableDef, Rarity, StatBlock } from './contracts';

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
    /** Rango de niveles en el que sale (F20); sin datos de rango, el nivel base. */
    levelMin: number;
    levelMax: number;
    xp: number;
    element: Element;
    maxHealth: number;
    speed: number;
    attackRange: number;
    zones: string[];
    drops: CompendiumDrop[];
    gold: { min: number; max: number; chance: number } | null;
    /** Resistencias elementales (porcentaje). Vacío si la criatura no declara ninguna. */
    resists: Partial<Record<Element, number>>;
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
    /** Ranura de equipo (weapon, offhand, chest, head, feet, hands, waist, ring, amulet, huaca). null si no es equipable. */
    slot?: string | null;
    /** Categoría del objeto (weapon, armor, jewel, consumable, scroll, petCharm, misc). */
    category?: string;
    /** Tipo de objeto (sword, dagger, robe, helmet, …). */
    kind?: string;
    /** Modificadores fijos del prototipo. */
    implicit?: { stat: string; op: 'flat' | 'percent'; value: number }[];
    /** Tiradas por instancia: cada una sale entre min y max al crear el objeto. */
    rolls?: { stat: string; op: 'flat' | 'percent'; min: number; max: number }[];
    /** Arma: daño del ataque básico. */
    weapon?: { min: number; max: number; element: string; speed: number; range: number };
    /** Conjunto al que pertenece. */
    setId?: string;
    /** Peso del objeto. */
    weight?: number;
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
        enemies: Record<
            string,
            { name: string; level: number; xp: number; lootTable: string | null; element: Element; stats?: StatBlock }
        >;
        merchants: Record<string, { name: string; stock: readonly { itemId: string }[] }>;
    };
    archetypes: Record<string, { maxHealth: number; speed: number; attack: { range: number } }>;
    zones: readonly {
        id: string;
        name: string;
        levelMin: number;
        levelMax: number;
        climate: string;
        safe?: boolean;
        spawns: readonly { archetype: string }[];
    }[];
    /** Rango propio de un arquetipo (F20). */
    levelRange?(archetype: string, base: number): { min: number; max: number };
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

export function buildCompendium(sources: CompendiumSources): Compendium {
    const { content, archetypes, zones } = sources;
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
            drops.push({
                itemId: entry.itemId,
                name: item.name,
                rarity: item.rarity,
                chance: dropChance(table!, entry.itemId),
            });
            const who = droppedBy.get(entry.itemId) ?? [];
            who.push(e.name);
            droppedBy.set(entry.itemId, who);
        }
        drops.sort((a, b) => b.chance - a.chance);
        const a = archetypes[id];
        // Extraer resistencias elementales de stats (resist.<element>).
        const resists: Partial<Record<Element, number>> = {};
        if (e.stats) {
            for (const el of ['earth', 'fire', 'air', 'water', 'frost', 'lightning'] as Element[]) {
                const key = `resist.${el}` as const;
                const val = e.stats[key];
                if (typeof val === 'number' && val !== 0) {
                    resists[el] = val;
                }
            }
        }
        return {
            id,
            name: e.name,
            level: e.level,
            ...(() => {
                const r = sources.levelRange?.(id, e.level);
                return { levelMin: r?.min ?? e.level, levelMax: r?.max ?? e.level };
            })(),
            xp: e.xp,
            element: e.element,
            maxHealth: a?.maxHealth ?? 0,
            speed: a?.speed ?? 0,
            attackRange: a?.attack.range ?? 0,
            zones: zonesOf.get(id) ?? [],
            drops,
            gold: table && table.gold.chance > 0 ? table.gold : null,
            resists,
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
        slot: d.slot,
        category: d.category,
        kind: d.kind,
        implicit: d.implicit,
        rolls: d.rolls,
        weapon: d.weapon,
        setId: d.setId,
        weight: d.weight,
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
