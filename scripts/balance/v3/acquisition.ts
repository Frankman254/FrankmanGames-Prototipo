import professionsJson from '../../../data/rpg/professions.json';
import questsJson from '../../../data/rpg/quests.json';
import type { GameData } from '../../../src/data';
import type { ItemDef } from '../../../src/rpg/contracts';

export const ACQUISITION_KINDS = ['starting', 'merchant', 'loot', 'quest', 'recipe', 'fishing'] as const;
export type AcquisitionKind = (typeof ACQUISITION_KINDS)[number];

export interface AcquisitionSource {
  kind: AcquisitionKind;
  id: string;
  label: string;
  /** Nivel de personaje mínimo demostrado por la ruta; no sustituye el requisito del objeto. */
  minLevel: number;
  /** false = la fuente sólo existe en contenido territorial planeado. */
  implemented: boolean;
  /** Clase concreta cuando el objeto sólo procede de su kit inicial. */
  classId?: string;
  details?: string;
}

export type AcquisitionIndex = Map<string, AcquisitionSource[]>;

function add(index: AcquisitionIndex, itemId: string, source: AcquisitionSource): void {
  const list = index.get(itemId) ?? [];
  if (!list.some((s) => s.kind === source.kind && s.id === source.id && s.classId === source.classId)) list.push(source);
  index.set(itemId, list);
}

function questMinLevels(): Map<string, number> {
  const quests = (questsJson as any).quests as Record<string, any>;
  const memo = new Map<string, number>();
  const visit = (id: string, stack = new Set<string>()): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (stack.has(id)) return 1;
    stack.add(id);
    const q = quests[id];
    const level = Math.max(1, q?.minLevel ?? 1, ...(q?.requires ?? []).map((r: string) => visit(r, stack)));
    stack.delete(id);
    memo.set(id, level);
    return level;
  };
  for (const id of Object.keys(quests)) visit(id);
  return memo;
}

/**
 * Catálogo conservador de procedencia. Sólo llama «implementada» a una ruta
 * que puede señalar a un kit, tienda, enemigo en territorio existente,
 * recompensa, receta con ingredientes existentes o punto de pesca real.
 */
export function buildAcquisitionIndex(data: GameData): AcquisitionIndex {
  const index: AcquisitionIndex = new Map();

  for (const cls of Object.values(data.rpg.classes)) {
    for (const it of cls.startingItems) {
      add(index, it.itemId, { kind: 'starting', id: cls.id, label: `kit inicial de ${cls.name}`, minLevel: 1, implemented: true, classId: cls.id });
    }
  }

  for (const merchant of Object.values(data.rpg.merchants)) {
    for (const offer of merchant.stock) add(index, offer.itemId, { kind: 'merchant', id: merchant.id, label: `${merchant.name} (${merchant.title})`, minLevel: 1, implemented: true });
  }

  const routes = new Map<string, { minLevel: number; implemented: boolean; zones: Set<string> }>();
  for (const zone of data.zones.zones.filter((z) => !z.safe)) {
    for (const spawn of zone.spawns) {
      const route = routes.get(spawn.archetype) ?? { minLevel: zone.levelMin, implemented: false, zones: new Set<string>() };
      route.minLevel = Math.min(route.minLevel, zone.levelMin);
      route.implemented ||= zone.areas.length > 0;
      route.zones.add(zone.id);
      routes.set(spawn.archetype, route);
    }
  }
  // Las misiones ya implementadas también pueden poner enemigos en el mundo.
  const questLevels = questMinLevels();
  for (const [questId, q] of Object.entries((questsJson as any).quests as Record<string, any>)) {
    for (const objective of q.objectives ?? []) {
      if (objective.type !== 'kill' || !objective.spawn) continue;
      for (const archetype of objective.archetypes ?? []) {
        const route = routes.get(archetype) ?? { minLevel: questLevels.get(questId) ?? 1, implemented: true, zones: new Set<string>() };
        route.minLevel = Math.min(route.minLevel, questLevels.get(questId) ?? 1);
        route.implemented = true;
        route.zones.add(`misión:${questId}`);
        routes.set(archetype, route);
      }
    }
  }
  for (const [archetype, enemy] of Object.entries(data.rpg.enemies)) {
    if (!enemy.lootTable) continue;
    const table = data.rpg.lootTables[enemy.lootTable];
    const route = routes.get(archetype);
    if (!table || !route) continue;
    for (const entry of table.entries) {
      add(index, entry.itemId, {
        kind: 'loot',
        id: `${archetype}:${table.id}`,
        label: `${enemy.name} · ${[...route.zones].join(', ')}`,
        minLevel: route.minLevel,
        implemented: route.implemented,
        details: `tabla ${table.id}`,
      });
    }
  }

  const questDefs = (questsJson as any).quests as Record<string, any>;
  for (const [id, q] of Object.entries(questDefs)) {
    for (const reward of q.rewards?.items ?? []) {
      add(index, reward.itemId, { kind: 'quest', id, label: `misión «${q.name}»`, minLevel: questLevels.get(id) ?? 1, implemented: true });
    }
  }

  for (const spot of Object.values(data.rpg.fishing.spots)) {
    for (const tableId of [spot.lootTable, spot.nightLootTable].filter((x): x is string => !!x)) {
      const table = data.rpg.lootTables[tableId];
      if (!table) continue;
      for (const entry of table.entries) add(index, entry.itemId, { kind: 'fishing', id: `${spot.id}:${tableId}`, label: `pesca en ${spot.name}`, minLevel: 1, implemented: true });
    }
  }

  const professions = professionsJson as any;
  const directMaterials = new Set<string>(Object.values(professions.nodes as Record<string, any>).map((n: any) => n.itemId));
  for (const [itemId, sources] of index) if (sources.some((s) => s.implemented)) directMaterials.add(itemId);
  for (const [id, recipe] of Object.entries(professions.recipes as Record<string, any>)) {
    const missing = Object.keys(recipe.inputs ?? {}).filter((itemId) => !directMaterials.has(itemId));
    add(index, recipe.output, {
      kind: 'recipe',
      id,
      label: `receta ${id} (${recipe.profession} ${recipe.level})`,
      minLevel: 1,
      implemented: missing.length === 0,
      details: missing.length ? `ingredientes sin ruta: ${missing.join(', ')}` : `taller ${recipe.station}`,
    });
  }

  return index;
}

export function obtainableSources(index: AcquisitionIndex, item: ItemDef, classId: string, level: number, implementedOnly = true): AcquisitionSource[] {
  if (item.level > level) return [];
  return (index.get(item.id) ?? []).filter((s) => s.minLevel <= level && (!implementedOnly || s.implemented) && (!s.classId || s.classId === classId));
}

export function acquisitionSummary(data: GameData, index = buildAcquisitionIndex(data)): { total: number; verified: number; plannedOnly: number; unverifiable: string[] } {
  const items = Object.values(data.rpg.items);
  const verified = items.filter((i) => (index.get(i.id) ?? []).some((s) => s.implemented)).length;
  const plannedOnly = items.filter((i) => {
    const s = index.get(i.id) ?? [];
    return s.length > 0 && s.every((x) => !x.implemented);
  }).length;
  return { total: items.length, verified, plannedOnly, unverifiable: items.filter((i) => !(index.get(i.id) ?? []).some((s) => s.implemented)).map((i) => i.id) };
}
