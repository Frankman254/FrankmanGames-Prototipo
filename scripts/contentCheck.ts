// contentCheck — ids únicos y referencias cruzadas en data/
//
// Uso: vite-node scripts/contentCheck.ts
// Salida: lista de problemas con archivo e id; código 1 si hay alguno.
// No corrige datos: solo informa.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Problem = { file: string; id: string; detail: string };

type Json = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

const DATA = join(import.meta.dirname, '..', 'data');

function readJson(rel: string): Json {
  const path = join(DATA, rel);
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Json;
  } catch {
    // Si el archivo no existe, se devuelve vacío (algunos son opcionales).
    return {};
  }
}

/** Extrae el mapa { id: entry } de una colección, ignorando las claves `_...`. */
function collection(obj: Json, key: string): Record<string, Json> {
  const raw = obj[key];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, Json> = {};
  for (const [id, v] of Object.entries(raw as Json)) {
    if (!id.startsWith('_')) out[id] = v as Json;
  }
  return out;
}

/** Extrae los ids de un array de objetos `{ id: ... }`. */
function idsFromArray(arr: unknown[]): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const entry of arr) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const id = (entry as Json)['id'];
      if (typeof id === 'string') out.push(id);
    }
  }
  return out;
}

/** Los ids de una colección, dados el json y la clave. */
function ids(obj: Json, key: string): string[] {
  return Object.keys(collection(obj, key));
}

// ---------------------------------------------------------------------------
// Detección de duplicados
// ---------------------------------------------------------------------------

function findDuplicates(problems: Problem[], file: string, key: string, obj: Json): void {
  // No hay duplicados dentro de una colección porque usamos un objeto JSON
  // (las claves son únicas por definición). Pero verificamos que la colección
  // exista y sea un objeto.
  const raw = obj[key];
  if (raw === undefined) return; // colección opcional, no presente
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    problems.push({ file, id: key, detail: `se esperaba un objeto, llegó ${Array.isArray(raw) ? 'array' : typeof raw}` });
  }
}

// ---------------------------------------------------------------------------
// Referencias cruzadas
// ---------------------------------------------------------------------------

/** Verifica que cada id de `refIds` exista en `targetIds`. */
function checkRefs(problems: Problem[], file: string, contextId: string, refIds: string[], targetIds: string[], label: string): void {
  const set = new Set(targetIds);
  for (const ref of refIds) {
    if (!set.has(ref)) {
      problems.push({ file, id: contextId, detail: `${label} "${ref}" no encontrado` });
    }
  }
}

// ---------------------------------------------------------------------------
// Recolección de referencias de cada colección
// ---------------------------------------------------------------------------

/** Tipos de efecto que el motor reconoce (parseEffect en content.ts). */
const KNOWN_EFFECT_TYPES = new Set([
  'damage',
  'heal',
  'status',
  'shield',
  'knockback',
  'dash',
  'teleport',
  'restoreResource',
  'summon',
  'zone',
  'blink',
  'swap',
  'pull',
  'recoil',
  'trap',
  'reveal',
  'chain',
  'bonusVsStatus',
  'selfStack',
  'power',
  'critChance',
  'critDamage',
  'fixedDamage',
  'pushDamage',
  'dispel',
  'shareDamage',
]);

/** Extrae los statusIds y los tipos de efecto de un hechizo. */
function spellStatusIds(spell: Json): string[] {
  const out: string[] = [];
  const effects = spell['effects'];
  if (!Array.isArray(effects)) return out;
  for (const fx of effects) {
    if (fx && typeof fx === 'object' && !Array.isArray(fx)) {
      if ((fx as Json)['type'] === 'status') {
        const sid = (fx as Json)['statusId'];
        if (typeof sid === 'string') out.push(sid);
      }
    }
  }
  return out;
}

/** Extrae los tipos de efecto usados en un hechizo (incluidos los de trap/zone). */
function spellEffectTypes(spell: Json): string[] {
  const out: string[] = [];
  const effects = spell['effects'];
  if (!Array.isArray(effects)) return out;
  for (const fx of effects) {
    if (fx && typeof fx === 'object' && !Array.isArray(fx)) {
      const t = (fx as Json)['type'];
      if (typeof t === 'string') out.push(t);
      // Dentro de trap/zone hay sub-efectos
      const sub = (fx as Json)['effects'];
      if (Array.isArray(sub)) {
        for (const sf of sub) {
          if (sf && typeof sf === 'object' && !Array.isArray(sf)) {
            const st = (sf as Json)['type'];
            if (typeof st === 'string') out.push(st);
          }
        }
      }
    }
  }
  return out;
}

/** Extrae el classId de un hechizo. */
function spellClassId(spell: Json): string | null {
  const v = spell['classId'];
  return typeof v === 'string' ? v : null;
}

/** Extrae el learnSpell de un objeto (pergaminos). */
function itemSpellId(item: Json): string | null {
  const use = item['use'];
  if (use && typeof use === 'object' && !Array.isArray(use)) {
    const v = (use as Json)['learnSpell'];
    return typeof v === 'string' ? v : null;
  }
  return null;
}

/** Extrae el setId de un objeto. */
function itemSetId(item: Json): string | null {
  const v = item['setId'];
  return typeof v === 'string' ? v : null;
}

/** Extrae los itemIds de un set. */
function setItemIds(setDef: Json): string[] {
  // Los sets no referencian items directamente en la estructura actual;
  // los items referencian el set. Pero verificamos si hay itemIds.
  const v = setDef['itemIds'];
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string') as string[];
  return [];
}

/** Extrae el lootTable de un enemigo RPG. */
function enemyLootTable(enemy: Json): string | null {
  const v = enemy['lootTable'];
  return typeof v === 'string' ? v : null;
}

/** Extrae los itemIds de una tabla de botín. */
function lootTableItemIds(table: Json): string[] {
  const out: string[] = [];
  const entries = table['entries'];
  if (!Array.isArray(entries)) return out;
  for (const e of entries) {
    if (e && typeof e === 'object' && !Array.isArray(e)) {
      const itemId = (e as Json)['itemId'];
      if (typeof itemId === 'string') out.push(itemId);
    }
  }
  return out;
}

/** Extrae los itemIds del stock de un mercader. */
function merchantItemIds(merchant: Json): string[] {
  const out: string[] = [];
  const stock = merchant['stock'];
  if (!Array.isArray(stock)) return out;
  for (const s of stock) {
    if (s && typeof s === 'object' && !Array.isArray(s)) {
      const itemId = (s as Json)['itemId'];
      if (typeof itemId === 'string') out.push(itemId);
    }
  }
  return out;
}

/** Extrae los npcIds referenciados en una misión (giver, turnIn). */
function questNpcIds(quest: Json): string[] {
  const out: string[] = [];
  const giver = quest['giver'];
  if (typeof giver === 'string') out.push(giver);
  const turnIn = quest['turnIn'];
  if (typeof turnIn === 'string') out.push(turnIn);
  return out;
}

/** Extrae los itemIds de los objetivos y recompensas de una misión. */
function questItemIds(quest: Json): string[] {
  const out: string[] = [];
  // Objetivos
  const objectives = quest['objectives'];
  if (Array.isArray(objectives)) {
    for (const obj of objectives) {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const itemId = (obj as Json)['itemId'];
        if (typeof itemId === 'string') out.push(itemId);
      }
    }
  }
  // Recompensas
  const rewards = quest['rewards'];
  if (rewards && typeof rewards === 'object' && !Array.isArray(rewards)) {
    const items = (rewards as Json)['items'];
    if (Array.isArray(items)) {
      for (const it of items) {
        if (it && typeof it === 'object' && !Array.isArray(it)) {
          const itemId = (it as Json)['itemId'];
          if (typeof itemId === 'string') out.push(itemId);
        }
      }
    }
    // learnSpell es un spellId, no un itemId — no lo incluimos aquí.
  }
  return out;
}

/** Extrae el learnSpell de las recompensas de una misión. */
function questSpellIds(quest: Json): string[] {
  const out: string[] = [];
  const rewards = quest['rewards'];
  if (rewards && typeof rewards === 'object' && !Array.isArray(rewards)) {
    const learnSpell = (rewards as Json)['learnSpell'];
    if (typeof learnSpell === 'string') out.push(learnSpell);
  }
  return out;
}

/** Extrae los archetypes de los spawns de una zona. */
function zoneArchetypeIds(zone: Json): string[] {
  const out: string[] = [];
  const spawns = zone['spawns'];
  if (!Array.isArray(spawns)) return out;
  for (const s of spawns) {
    if (s && typeof s === 'object' && !Array.isArray(s)) {
      const archetype = (s as Json)['archetype'];
      if (typeof archetype === 'string') out.push(archetype);
    }
  }
  return out;
}

/** Extrae los statusIds de los hechizos de un arquetipo de enemigo (data/enemies.json). */
function enemyArchetypeStatusIds(archetype: Json): string[] {
  const out: string[] = [];
  const spells = archetype['spells'];
  if (!Array.isArray(spells)) return out;
  for (const sp of spells) {
    if (sp && typeof sp === 'object' && !Array.isArray(sp)) {
      const status = (sp as Json)['status'];
      if (status && typeof status === 'object' && !Array.isArray(status)) {
        const sid = (status as Json)['id'];
        if (typeof sid === 'string') out.push(sid);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Referencias en NPCs (diálogo)
// ---------------------------------------------------------------------------

/** Extrae los questIds y itemIds de un NPC (condiciones del diálogo). */
function npcQuestIds(npc: Json): string[] {
  const out: string[] = [];
  const dialogue = npc['dialogue'];
  if (!dialogue || typeof dialogue !== 'object' || Array.isArray(dialogue)) return out;
  const nodes = (dialogue as Json)['nodes'];
  if (!nodes || typeof nodes !== 'object' || Array.isArray(nodes)) return out;
  for (const [, node] of Object.entries(nodes as Json)) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
    const options = (node as Json)['options'];
    if (Array.isArray(options)) {
      for (const opt of options) {
        if (!opt || typeof opt !== 'object' || Array.isArray(opt)) continue;
        const conditions = (opt as Json)['conditions'];
        if (Array.isArray(conditions)) {
          for (const c of conditions) {
            if (!c || typeof c !== 'object' || Array.isArray(c)) continue;
            if ((c as Json)['type'] === 'quest') {
              const qid = (c as Json)['questId'];
              if (typeof qid === 'string') out.push(qid);
            }
          }
        }
      }
    }
    // También en entry
    const entry = (dialogue as Json)['entry'];
    if (Array.isArray(entry)) {
      for (const e of entry) {
        if (!e || typeof e !== 'object' || Array.isArray(e)) continue;
        const conditions = (e as Json)['conditions'];
        if (Array.isArray(conditions)) {
          for (const c of conditions) {
            if (!c || typeof c !== 'object' || Array.isArray(c)) continue;
            if ((c as Json)['type'] === 'quest') {
              const qid = (c as Json)['questId'];
              if (typeof qid === 'string') out.push(qid);
            }
          }
        }
      }
    }
  }
  return out;
}

function npcItemIds(npc: Json): string[] {
  const out: string[] = [];
  const dialogue = npc['dialogue'];
  if (!dialogue || typeof dialogue !== 'object' || Array.isArray(dialogue)) return out;
  const nodes = (dialogue as Json)['nodes'];
  if (!nodes || typeof nodes !== 'object' || Array.isArray(nodes)) return out;
  for (const [, node] of Object.entries(nodes as Json)) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
    const options = (node as Json)['options'];
    if (Array.isArray(options)) {
      for (const opt of options) {
        if (!opt || typeof opt !== 'object' || Array.isArray(opt)) continue;
        const conditions = (opt as Json)['conditions'];
        if (Array.isArray(conditions)) {
          for (const c of conditions) {
            if (!c || typeof c !== 'object' || Array.isArray(c)) continue;
            if ((c as Json)['type'] === 'hasItem') {
              const itemId = (c as Json)['itemId'];
              if (typeof itemId === 'string') out.push(itemId);
            }
          }
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pesca: loot tables
// ---------------------------------------------------------------------------

function fishingLootTables(fishing: Json): string[] {
  const out: string[] = [];
  const spots = fishing['spots'];
  if (!spots || typeof spots !== 'object' || Array.isArray(spots)) return out;
  for (const [, spot] of Object.entries(spots as Json)) {
    if (!spot || typeof spot !== 'object' || Array.isArray(spot)) continue;
    const lt = (spot as Json)['lootTable'];
    if (typeof lt === 'string') out.push(lt);
    const nlt = (spot as Json)['nightLootTable'];
    if (typeof nlt === 'string') out.push(nlt);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export interface SyntheticData {
  rpgItems: Json;
  rpgSets: Json;
  rpgSpells: Json;
  rpgStatuses: Json;
  rpgClasses: Json;
  rpgEnemies: Json;
  rpgLoot: Json;
  rpgMerchants: Json;
  rpgNpcs: Json;
  rpgQuests: Json;
  rpgPets: Json;
  dataEnemies: Json;
  dataZones: Json;
  dataFishing: Json;
}

/**
 * Verifica el contenido. Si `data` se pasa, usa esos datos en lugar de leer
 * los archivos reales (para pruebas con datos sintéticos).
 */
export function checkContent(data?: SyntheticData): Problem[] {
  const problems: Problem[] = [];

  // Cargar JSON (o usar los datos sintéticos)
  const rpgItems = data?.rpgItems ?? readJson('rpg/items.json');
  const rpgSets = data?.rpgSets ?? readJson('rpg/sets.json');
  const rpgSpells = data?.rpgSpells ?? readJson('rpg/spells.json');
  const rpgStatuses = data?.rpgStatuses ?? readJson('rpg/statuses.json');
  const rpgClasses = data?.rpgClasses ?? readJson('rpg/classes.json');
  const rpgEnemies = data?.rpgEnemies ?? readJson('rpg/enemies.json');
  const rpgLoot = data?.rpgLoot ?? readJson('rpg/loot.json');
  const rpgMerchants = data?.rpgMerchants ?? readJson('rpg/merchants.json');
  const rpgNpcs = data?.rpgNpcs ?? readJson('rpg/npcs.json');
  const rpgQuests = data?.rpgQuests ?? readJson('rpg/quests.json');
  const rpgPets = data?.rpgPets ?? readJson('rpg/pets.json');
  const dataEnemies = data?.dataEnemies ?? readJson('enemies.json');
  const dataZones = data?.dataZones ?? readJson('zones.json');
  const dataFishing = data?.dataFishing ?? readJson('rpg/fishing.json');

  // Colecciones
  const items = collection(rpgItems, 'items');
  const sets = collection(rpgSets, 'sets');
  const spells = collection(rpgSpells, 'spells');
  const statuses = collection(rpgStatuses, 'statuses');
  const classes = collection(rpgClasses, 'classes');
  const enemies = collection(rpgEnemies, 'enemies');
  const lootTables = collection(rpgLoot, 'tables');
  const merchants = collection(rpgMerchants, 'merchants');
  const npcs = collection(rpgNpcs, 'npcs');
  const quests = collection(rpgQuests, 'quests');
  const pets = collection(rpgPets, 'pets');
  const enemyArchetypes = collection(dataEnemies, 'archetypes');

  // IDs
  const itemIds = Object.keys(items);
  const setIdIds = Object.keys(sets);
  const spellIds = Object.keys(spells);
  const statusIds = Object.keys(statuses);
  const classIds = Object.keys(classes);
  const enemyIds = Object.keys(enemies);
  const lootTableIds = Object.keys(lootTables);
  const merchantIds = Object.keys(merchants);
  const npcIds = Object.keys(npcs);
  const questIds = Object.keys(quests);
  const petIds = Object.keys(pets);
  const archetypeIds = Object.keys(enemyArchetypes);

  // Verificar estructura de colecciones
  findDuplicates(problems, 'rpg/items.json', 'items', rpgItems);
  findDuplicates(problems, 'rpg/sets.json', 'sets', rpgSets);
  findDuplicates(problems, 'rpg/spells.json', 'spells', rpgSpells);
  findDuplicates(problems, 'rpg/statuses.json', 'statuses', rpgStatuses);
  findDuplicates(problems, 'rpg/classes.json', 'classes', rpgClasses);
  findDuplicates(problems, 'rpg/enemies.json', 'enemies', rpgEnemies);
  findDuplicates(problems, 'rpg/loot.json', 'tables', rpgLoot);
  findDuplicates(problems, 'rpg/merchants.json', 'merchants', rpgMerchants);
  findDuplicates(problems, 'rpg/npcs.json', 'npcs', rpgNpcs);
  findDuplicates(problems, 'rpg/quests.json', 'quests', rpgQuests);
  findDuplicates(problems, 'rpg/pets.json', 'pets', rpgPets);
  findDuplicates(problems, 'enemies.json', 'archetypes', dataEnemies);

  // ---- Referencias: hechizo → estado ----
  for (const [sid, spell] of Object.entries(spells)) {
    const statusRefs = spellStatusIds(spell);
    checkRefs(problems, 'rpg/spells.json', sid, statusRefs, statusIds, 'statusId');
  }

  // ---- Tipos de efecto: cada efecto debe ser conocido ----
  for (const [sid, spell] of Object.entries(spells)) {
    const types = spellEffectTypes(spell);
    for (const t of types) {
      if (!KNOWN_EFFECT_TYPES.has(t)) {
        problems.push({ file: 'rpg/spells.json', id: sid, detail: `tipo de efecto "${t}" no reconocido` });
      }
    }
  }

  // ---- Referencias: hechizo → clase ----
  for (const [sid, spell] of Object.entries(spells)) {
    const cid = spellClassId(spell);
    if (cid && !classIds.includes(cid)) {
      problems.push({ file: 'rpg/spells.json', id: sid, detail: `classId "${cid}" no encontrado en classes` });
    }
  }

  // ---- Referencias: objeto → hechizo (pergaminos) ----
  for (const [iid, item] of Object.entries(items)) {
    const spellRef = itemSpellId(item);
    if (spellRef && !spellIds.includes(spellRef)) {
      problems.push({ file: 'rpg/items.json', id: iid, detail: `learnSpell "${spellRef}" no encontrado en spells` });
    }
  }

  // ---- Referencias: objeto → set ----
  for (const [iid, item] of Object.entries(items)) {
    const setRef = itemSetId(item);
    if (setRef && !setIdIds.includes(setRef)) {
      problems.push({ file: 'rpg/items.json', id: iid, detail: `setId "${setRef}" no encontrado en sets` });
    }
  }

  // ---- Referencias: set → objeto ----
  for (const [sid, setDef] of Object.entries(sets)) {
    const itemRefs = setItemIds(setDef);
    checkRefs(problems, 'rpg/sets.json', sid, itemRefs, itemIds, 'itemId');
  }

  // ---- Referencias: enemigo RPG → tabla de botín ----
  for (const [eid, enemy] of Object.entries(enemies)) {
    const lt = enemyLootTable(enemy);
    if (lt && !lootTableIds.includes(lt)) {
      problems.push({ file: 'rpg/enemies.json', id: eid, detail: `lootTable "${lt}" no encontrado en loot tables` });
    }
  }

  // ---- Referencias: tabla de botín → objeto ----
  for (const [tid, table] of Object.entries(lootTables)) {
    const itemRefs = lootTableItemIds(table);
    checkRefs(problems, 'rpg/loot.json', tid, itemRefs, itemIds, 'itemId');
  }

  // ---- Referencias: mercader → objeto ----
  for (const [mid, merchant] of Object.entries(merchants)) {
    const itemRefs = merchantItemIds(merchant);
    checkRefs(problems, 'rpg/merchants.json', mid, itemRefs, itemIds, 'itemId');
  }

  // ---- Referencias: misión → PNJ (giver, turnIn) ----
  for (const [qid, quest] of Object.entries(quests)) {
    const npcRefs = questNpcIds(quest);
    checkRefs(problems, 'rpg/quests.json', qid, npcRefs, npcIds, 'npcId');
  }

  // ---- Referencias: misión → objeto ----
  for (const [qid, quest] of Object.entries(quests)) {
    const itemRefs = questItemIds(quest);
    checkRefs(problems, 'rpg/quests.json', qid, itemRefs, itemIds, 'itemId');
  }

  // ---- Referencias: misión → hechizo (learnSpell) ----
  for (const [qid, quest] of Object.entries(quests)) {
    const spellRefs = questSpellIds(quest);
    checkRefs(problems, 'rpg/quests.json', qid, spellRefs, spellIds, 'learnSpell');
  }

  // ---- Referencias: NPC → misión ----
  for (const [nid, npc] of Object.entries(npcs)) {
    const questRefs = npcQuestIds(npc);
    checkRefs(problems, 'rpg/npcs.json', nid, questRefs, questIds, 'questId');
  }

  // ---- Referencias: NPC → objeto (condiciones hasItem) ----
  for (const [nid, npc] of Object.entries(npcs)) {
    const itemRefs = npcItemIds(npc);
    checkRefs(problems, 'rpg/npcs.json', nid, itemRefs, itemIds, 'itemId');
  }

  // ---- Referencias: zona → arquetipo de enemigo ----
  const zones = dataZones['zones'];
  if (Array.isArray(zones)) {
    for (const zone of zones) {
      if (!zone || typeof zone !== 'object' || Array.isArray(zone)) continue;
      const zoneId = (zone as Json)['id'];
      const zid = typeof zoneId === 'string' ? zoneId : '(sin id)';
      const archRefs = zoneArchetypeIds(zone);
      checkRefs(problems, 'zones.json', zid, archRefs, archetypeIds, 'archetype');
    }
  }

  // ---- Referencias: arquetipo de enemigo → estado ----
  for (const [aid, archetype] of Object.entries(enemyArchetypes)) {
    const statusRefs = enemyArchetypeStatusIds(archetype);
    checkRefs(problems, 'enemies.json', aid, statusRefs, statusIds, 'statusId');
  }

  // ---- Referencias: pesca → tabla de botín ----
  const fishingLts = fishingLootTables(dataFishing);
  checkRefs(problems, 'rpg/fishing.json', '(spots)', fishingLts, lootTableIds, 'lootTable');

  // Dedicar problemas por archivo
  const byFile = new Map<string, Problem[]>();
  for (const p of problems) {
    const list = byFile.get(p.file) ?? [];
    list.push(p);
    byFile.set(p.file, list);
  }

  // Imprimir
  if (problems.length === 0) {
    console.log('content:check — OK (sin problemas)');
  } else {
    console.log(`content:check — ${problems.length} problema(s):\n`);
    for (const [file, list] of byFile) {
      console.log(`  ${file}:`);
      for (const p of list) {
        console.log(`    [${p.id}] ${p.detail}`);
      }
    }
  }

  return problems;
}

// Ejecución directa: siempre ejecutar checkContent; process.exit solo si es el entry point.
const _problems = checkContent();
if (_problems.length > 0 && process.argv[1]) {
  // vite-node pasa el script como argv[1] cuando es el entry point.
  // Cuando se importa desde tests/, argv[1] es vite-node, no este script.
  // Usamos un flag en globalThis para distinguir.
  if (!(globalThis as any).__CONTENT_CHECK_IMPORT_ONLY) {
    process.exit(1);
  }
}
