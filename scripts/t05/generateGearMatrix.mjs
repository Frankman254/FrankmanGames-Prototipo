// T05 (H09): matriz categoría × franja del equipo.
// Franjas de 20 niveles sobre 1–100 (tope técnico del parser en
// `src/rpg/content.ts`, línea `level: … max: 100`). Cada categoría de equipo
// (12 armas + 9 huecos) debe tener al menos una pieza por franja; además dos
// sets multielementales para las franjas altas. Nombres, cifras e inglés se
// generan de forma determinista aquí; la aceptación la fija
// `tests/rpg/gearMatrix.test.ts`. Las monturas quedan fuera a propósito (R06:
// esperan el contrato de movilidad; las tres actuales son utilería de
// desarrollo).
//
// Uso:
//   node scripts/t05/generateGearMatrix.mjs          → informe sin tocar nada
//   node scripts/t05/generateGearMatrix.mjs --write  → aplica a data/
// Idempotente: los ids ya existentes no se regeneran ni se reescriben.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WRITE = process.argv.includes('--write');
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const BANDS = 5;
const bandOf = (level) => Math.min(BANDS, Math.ceil(level / 20));
const levelOf = (band) => band * 20 - 5;

const WEAPONS = ['sword', 'axe', 'mace', 'greatsword', 'hammer', 'spear', 'dagger', 'bow', 'crossbow', 'staff', 'wand', 'orb'];
const GEARS = ['offhand', 'head', 'chest', 'hands', 'feet', 'back', 'waist', 'ring', 'amulet'];
const CATEGORIES = [...WEAPONS, ...GEARS];

// familia de monstruos que cría el botín de cada franja (nivel de enemigo y
// tablas de data/rpg/enemies.json + data/rpg/loot.json)
const FAMILY = { 1: 'chame', 2: 'cerro_punta', 3: 'darien', 4: 'perlas', 5: 'ancon' };

// ── materiales por franja (es, en, clave-id) ─────────────────────────────────
const MATERIALS = {
  1: [['hueso', 'Bone', 'bone'], ['concha', 'Shell', 'concha'], ['piedra', 'Stone', 'piedra'], ['asta', 'Antler', 'asta'], ['totuma', 'Gourd', 'totuma']],
  2: [['cobre', 'Copper', 'cobre'], ['bronce', 'Bronze', 'bronce'], ['latón', 'Brass', 'laton'], ['estaño', 'Tin', 'estano'], ['plata', 'Silver', 'plata']],
  3: [['acero', 'Steel', 'acero'], ['forja', 'Forged', 'forja'], ['cobalto', 'Cobalt', 'cobalto'], ['verdin', 'Verdigris', 'verdin'], ['oro viejo', 'Old-Gold', 'oroviejo']],
  4: [['obsidiana', 'Obsidian', 'obsidiana'], ['granito', 'Granite', 'granito'], ['titán', 'Titan', 'titan'], ['nácar', 'Nacre', 'nacar2'], ['corindón', 'Corundum', 'corindon']],
  5: [['perla negra', 'Black-Pearl', 'perlanegra'], ['eclipse', 'Eclipse', 'eclipse'], ['crepúsculo', 'Twilight', 'crepusculo'], ['abismo', 'Abyssal', 'abismo'], ['relámpago', 'Lightning', 'relampago']],
};

// ── cabezales de nombre por categoría (es/en) y kind/icono ──────────────────
const NOUN = {
  sword: ['Espada', 'Sword', 'sword', 'sword'],
  axe: ['Hacha', 'Axe', 'axe', 'axe'],
  mace: ['Maza', 'Mace', 'mace', 'mace'],
  greatsword: ['Montonera', 'Greatsword', 'greatsword', 'greatsword'],
  hammer: ['Mazo', 'Warhammer', 'hammer', 'hammer'],
  spear: ['Lanza', 'Spear', 'spear', 'spear'],
  dagger: ['Daga', 'Dagger', 'dagger', 'dagger'],
  bow: ['Arco', 'Bow', 'bow', 'bow'],
  crossbow: ['Ballesta', 'Crossbow', 'crossbow', 'crossbow'],
  staff: ['Bastón', 'Staff', 'staff', 'staff'],
  wand: ['Varita', 'Wand', 'wand', 'wand'],
  orb: ['Orbe', 'Orb', 'orb', 'orb'],
  offhand: ['Escudo', 'Shield', 'shield', 'buckler'],
  head: ['Yelmo', 'Helm', 'helmet', 'helmet'],
  chest: ['Coraza', 'Cuirass', 'armor', 'armor'],
  hands: ['Guantes', 'Gauntlets', 'gloves', 'gloves'],
  feet: ['Botas', 'Boots', 'boots', 'boots'],
  back: ['Capa', 'Cape', 'cape', 'cape'],
  waist: ['Cinturón', 'Belt', 'belt', 'belt'],
  ring: ['Anillo', 'Ring', 'ring', 'ring'],
  amulet: ['Amuleto', 'Amulet', 'amulet', 'amulet'],
};
const CATEGORY_KEY = { offhand: 'shield', head: 'helm', chest: 'cuirass', hands: 'gauntlets', feet: 'boots', back: 'cape', waist: 'belt', ring: 'ring', amulet: 'amulet' };

const PRIMARY_OF = { sword: 'strength', axe: 'strength', mace: 'strength', greatsword: 'strength', hammer: 'strength', spear: 'strength', dagger: 'agility', bow: 'agility', crossbow: 'agility', staff: 'intellect', wand: 'intellect', orb: 'intellect' };
const GEAR_PRIMARY = { offhand: 'vitality', head: 'calm', chest: 'vitality', hands: 'agility', feet: 'agility', back: 'will', waist: 'strength', ring: 'intellect', amulet: 'flow' };
const SPEED = { sword: 1.4, axe: 1.1, mace: 1.0, greatsword: 0.85, hammer: 0.9, spear: 1.2, dagger: 1.7, bow: 1.1, crossbow: 1.0, staff: 1.2, wand: 1.35, orb: 1.2 };
const RANGE = { sword: 1.3, axe: 1.3, mace: 1.3, greatsword: 1.6, hammer: 1.4, spear: 2.2, dagger: 1.1, bow: 10, crossbow: 9.5, staff: 1.5, wand: 6.5, orb: 8 };
const WEIGHT = { sword: 9, axe: 11, mace: 10, greatsword: 16, hammer: 14, spear: 8, dagger: 3, bow: 6, crossbow: 10, staff: 7, wand: 2, orb: 4, offhand: 10, head: 4, chest: 8, hands: 2, feet: 3, back: 3, waist: 2, ring: 1, amulet: 1 };
const ELEMENT_HEAVY = { sword: 'fire', axe: 'earth', mace: 'fire', greatsword: 'lightning', hammer: 'earth', spear: 'water', dagger: 'frost', bow: 'air', crossbow: 'lightning', staff: 'frost', wand: 'water', orb: 'lightning' };

const DESC_BANK = [
  ['Forjado para aguantar la sal y el tranco.', 'Forged to outlast salt and hard knocks.'],
  ['Nunca falla en la mano que trabaja.', 'Never fails in a working hand.'],
  ['Lo probó primero la gente del muelle.', 'The wharf folk tested it first.'],
  ['Remendado tres veces, y aguantando.', 'Mended three times, still holding.'],
  ['Pesa lo justo y protege lo necesario.', 'Weighs the least, protects the most.'],
  ['Huele a lluvia, a mar y a taller.', 'Smells of rain, sea, and workshop.'],
];

// curvas calibradas contra las piezas 90–99 existentes (tulivieja, last_bus_blade)
const primaryFlat = (l) => Math.max(1, Math.round(0.47 * l));
const rollMax = (l) => Math.max(2, Math.round(0.72 * l));
const weaponMin = (l) => Math.round(1.7 * l);
const weaponMax = (l) => Math.round(2.6 * l);
const resistFlat = (l) => Math.max(2, Math.round(6 + 0.26 * l));
const healthRoll = (l) => [Math.round(1.6 * l), Math.round(2.8 * l)];
const damageFlat = (l) => Math.max(2, Math.round(0.24 * l));
const valueOf = (l, rarity) => Math.round((10 + 4.8 * l + ({ uncommon: 0, rare: 120, epic: 260, legendary: 380 }[rarity] ?? 0)) / 5) * 5;

const items = read('data/rpg/items.json').items;
const usedNames = new Set(Object.values(items).map((x) => x.name));

// ── huecos de la matriz ───────────────────────────────────────────────────────
const have = Object.fromEntries(CATEGORIES.map((c) => [c, new Set()]));
for (const x of Object.values(items)) {
  if (x.category === 'weapon') have[x.kind]?.add(bandOf(x.level));
  else if (x.category === 'armor' || x.category === 'jewel') have[x.slot === 'ring1' || x.slot === 'ring2' ? 'ring' : x.slot]?.add(bandOf(x.level));
}
const gaps = [];
for (const c of CATEGORIES) for (let b = 1; b <= BANDS; b++) if (!have[c].has(b)) gaps.push([c, b]);

const RARITY_BY_BAND = { 1: ['common', 'uncommon'], 2: ['uncommon'], 3: ['uncommon', 'rare'], 4: ['rare'], 5: ['rare', 'epic'] };
let salt = 0;
const nextOf = (arr) => arr[salt++ % arr.length];

function makeFiller(category, band) {
  const level = levelOf(band);
  const [nounEs, nounEn, kind, icon] = NOUN[category];
  const start = salt++ % MATERIALS[band].length;
  let es = ''; let en = ''; let id = '';
  for (let j = 0; j < MATERIALS[band].length; j++) {
    const cand = MATERIALS[band][(start + j) % MATERIALS[band].length];
    const cid = WEAPONS.includes(category) ? `${cand[2]}_${category}` : `${cand[2]}_${CATEGORY_KEY[category]}`;
    const cname = `${nounEs} de ${cand[0]}`;
    if (!items[cid] && !usedNames.has(cname)) { [es, en] = cand; id = cid; break; }
  }
  let name = `${nounEs} de ${es}`;
  let nameEn = `${nounEn} of ${en}`;
  if (!id) { const cand = MATERIALS[band][start]; id = `${cand[2]}_${CATEGORY_KEY[category] || category}${band}`; es = cand[0]; en = cand[1]; name = `${nounEs} de ${es} de la costa`; nameEn = `Coastal ${nounEn} of ${en}`; }
  usedNames.add(name);
  const rarity = nextOf(RARITY_BY_BAND[band]);
  const dropWeight = rarity === 'epic' ? 4 : rarity === 'rare' ? 8 : 20;
  const [dEs, dEn] = DESC_BANK[(band * 3 + CATEGORIES.indexOf(category)) % DESC_BANK.length];
  const def = {
    weight: WEIGHT[category],
    name, description: dEs, icon, kind,
    category: WEAPONS.includes(category) ? 'weapon' : category === 'ring' || category === 'amulet' ? 'jewel' : 'armor',
    slot: WEAPONS.includes(category) ? 'weapon' : category === 'ring' || category === 'amulet' ? category : category,
    rarity, level, value: valueOf(level, rarity), maxStack: 1,
    implicit: [], rolls: [], dropWeight,
  };
  if (WEAPONS.includes(category)) {
    const primary = PRIMARY_OF[category];
    const el = ELEMENT_HEAVY[category];
    def.weapon = { min: weaponMin(level), max: weaponMax(level), element: el, speed: SPEED[category], range: RANGE[category] };
    if (band >= 4) {
      def.implicit.push({ stat: `damage.${el}`, op: 'flat', value: damageFlat(level) });
      if (el === 'frost') def.implicit.push({ stat: 'calm', op: 'flat', value: Math.round(primaryFlat(level) * 0.4) });
      if (el === 'water') def.implicit.push({ stat: 'flow', op: 'flat', value: Math.round(primaryFlat(level) * 0.4) });
      if (el === 'lightning') def.implicit.push({ stat: 'will', op: 'flat', value: Math.round(primaryFlat(level) * 0.4) });
      if (el === 'air') def.implicit.push({ stat: 'agility', op: 'flat', value: Math.round(primaryFlat(level) * 0.4) });
    }
    def.implicit.push({ stat: primary, op: 'flat', value: primaryFlat(level) });
    def.rolls.push({ stat: primary, op: 'flat', min: primaryFlat(level), max: rollMax(level) });
    if (band >= 3) def.rolls.push({ stat: 'power', op: 'flat', min: 3, max: Math.round(0.2 * level) });
    if (category === 'dagger' || category === 'bow' || category === 'crossbow' || band >= 4) def.rolls.push({ stat: 'critChance', op: 'flat', min: 0.01, max: Math.min(0.12, Math.round((0.02 + level / 1200) * 100) / 100) });
    if (category === 'bow' || category === 'crossbow') def.hands = 2;
  } else {
    const primary = GEAR_PRIMARY[category];
    if (category === 'offhand') def.implicit.push({ stat: 'resist.' + (band >= 4 ? 'lightning' : 'fire'), op: 'flat', value: resistFlat(level) });
    if (category === 'head') def.implicit.push({ stat: 'resist.' + (band >= 4 ? 'frost' : 'earth'), op: 'flat', value: resistFlat(level) });
    if (category === 'chest') def.implicit.push({ stat: 'resist.' + (band >= 4 ? 'fire' : 'earth'), op: 'flat', value: resistFlat(level) + 4 });
    if (category === 'hands') def.implicit.push({ stat: 'critChance', op: 'flat', value: Math.min(0.05, Math.round((0.01 + level / 2500) * 1000) / 1000) });
    if (category === 'feet') def.implicit.push({ stat: 'moveSpeed', op: 'flat', value: Math.round((0.1 + level * 0.004) * 100) / 100 });
    if (category === 'back') def.implicit.push({ stat: 'resist.' + (band >= 4 ? 'fire' : 'air'), op: 'flat', value: resistFlat(level) });
    if (category === 'waist') def.implicit.push({ stat: 'carryCapacity', op: 'flat', value: Math.round(30 + level * 0.6) });
    if (category === 'ring') def.implicit.push({ stat: `damage.${band >= 3 ? 'lightning' : 'frost'}`, op: 'flat', value: Math.max(1, Math.round(0.14 * level)) });
    if (category === 'amulet') def.implicit.push({ stat: 'cooldownReduction', op: 'flat', value: Math.min(0.08, Math.round((0.01 + level / 1400) * 100) / 100) });
    def.rolls.push({ stat: primary, op: 'flat', min: Math.max(1, Math.round(primaryFlat(level) * 0.7)), max: primaryFlat(level) });
    if (category === 'chest' || category === 'offhand' || category === 'back' || category === 'waist') def.rolls.push({ stat: 'maxHealth', op: 'flat', min: healthRoll(level)[0], max: healthRoll(level)[1] });
    else def.rolls.push({ stat: primary === 'vitality' ? 'spirit' : 'vitality', op: 'flat', min: Math.round(primaryFlat(level) * 0.6), max: rollMax(level) });
    if (band >= 4) def.rolls.push({ stat: 'resist.water', op: 'flat', min: 4, max: Math.min(30, Math.round(0.25 * level)) });
  }
  return { id, def, nameEn, descEn: dEn, band };
}

// ── sets multielementales de las franjas altas ────────────────────────────────
const SETS = {
  4: {
    id: 'bocas_gale', name: 'de Bocas del Vendaval', nameEn: 'of the Gale of Bocas',
    _build: 'lanzador de tormenta y agua (franja 61–80)', family: 'bocas', baseLevel: 64,
    pieces: [['head', 'helmet', 'Yelmo', 'Helm'], ['chest', 'armor', 'Coraza', 'Cuirass'], ['hands', 'gloves', 'Guantes', 'Gauntlets'], ['ring', 'ring', 'Anillo', 'Ring'], ['back', 'cape', 'Capa', 'Cape']],
    bonuses: [
      { pieces: 2, modifiers: [{ stat: 'intellect', op: 'flat', value: 14 }, { stat: 'resist.lightning', op: 'flat', value: 5 }] },
      { pieces: 3, modifiers: [{ stat: 'maxResource', op: 'flat', value: 70 }, { stat: 'cooldownReduction', op: 'flat', value: 0.04 }] },
      { pieces: 5, modifiers: [{ stat: 'damage.lightning', op: 'flat', value: 16 }, { stat: 'damage.water', op: 'flat', value: 16 }, { stat: 'critBonus', op: 'flat', value: 0.3 }] },
    ],
  },
  5: {
    id: 'istmo_tideplate', name: 'de Mareas Altas', nameEn: 'of the High Tides',
    _build: 'defensa de agua y tierra con flujo (franja 81–100)', family: 'ancon', baseLevel: 94,
    pieces: [['offhand', 'shield', 'Escudo', 'Shield'], ['chest', 'armor', 'Coraza', 'Cuirass'], ['feet', 'boots', 'Botas', 'Boots'], ['waist', 'belt', 'Cinturón', 'Belt'], ['amulet', 'amulet', 'Amuleto', 'Amulet']],
    bonuses: [
      { pieces: 2, modifiers: [{ stat: 'vitality', op: 'flat', value: 16 }, { stat: 'resist.water', op: 'flat', value: 6 }] },
      { pieces: 3, modifiers: [{ stat: 'healthRegen', op: 'flat', value: 3 }, { stat: 'carryCapacity', op: 'flat', value: 50 }] },
      { pieces: 5, modifiers: [{ stat: 'maxHealth', op: 'percent', value: 12 }, { stat: 'damage.water', op: 'flat', value: 18 }, { stat: 'damage.earth', op: 'flat', value: 10 }, { stat: 'flow', op: 'flat', value: 14 }] },
    ],
  },
};
function makeSetPieces(set, band) {
  const out = [];
  set.pieces.forEach(([slot, kind, nounEs, nounEn], i) => {
    const level = Math.min(100, set.baseLevel + i);
    const id = `${set.id}_${CATEGORY_KEY[slot] || slot}`;
    const el = ['lightning', 'water', 'earth', 'frost'][(i + band) % (band === 4 ? 2 : 3)];
    const primary = GEAR_PRIMARY[slot] || 'spirit';
    const name = `${nounEs} ${set.name}`;
    if (usedNames.has(name) || items[id]) return;
    usedNames.add(name);
    const def = {
      weight: WEIGHT[slot],
      name, description: `Pieza ${set.name}, tejida entre la tormenta y la marea.`, icon: kind, kind,
      category: slot === 'ring' || slot === 'amulet' ? 'jewel' : 'armor',
      slot: slot === 'ring' || slot === 'amulet' ? slot : slot,
      rarity: 'epic', level, value: valueOf(level, 'epic'), maxStack: 1,
      implicit: [
        { stat: `damage.${slot === 'chest' || slot === 'offhand' ? (band === 5 ? 'earth' : 'lightning') : 'water'}`, op: 'flat', value: Math.max(2, Math.round(0.16 * level)) },
        ...(slot === 'chest' || slot === 'offhand' ? [{ stat: 'resist.lightning', op: 'flat', value: resistFlat(level) }] : []),
        ...(slot === 'amulet' ? [{ stat: 'flow', op: 'flat', value: Math.round(0.2 * level) }] : []),
      ],
      rolls: [
        { stat: primary, op: 'flat', min: Math.max(1, Math.round(primaryFlat(level) * 0.75)), max: primaryFlat(level) },
        slot === 'chest' || slot === 'offhand' || slot === 'back' || slot === 'waist'
          ? { stat: 'maxHealth', op: 'flat', min: healthRoll(level)[0], max: healthRoll(level)[1] }
          : { stat: primary === 'vitality' ? 'spirit' : 'vitality', op: 'flat', min: Math.round(primaryFlat(level) * 0.6), max: rollMax(level) },
      ],
      setId: set.id, dropWeight: 3,
    };
    out.push({ id, def, nameEn: `${nounEn} ${set.nameEn}`, descEn: `Piece ${set.nameEn}, woven between lightning and tide.`, band, set: set.id });
  });
  return out;
}

// ── construir todo ────────────────────────────────────────────────────────────
const fillers = gaps.map(([c, b]) => makeFiller(c, b));
const setPieces = [makeSetPieces(SETS[4], 4), makeSetPieces(SETS[5], 5)].flat();
const all = [...fillers, ...setPieces];

// rutas de obtención: botín por familia de franja + tienda en las tempranas
const byLootTable = {};
for (const f of all) {
  const family = f.set ? SETS[f.band].family : FAMILY[f.band];
  const suffix = f.set ? ['caster', 'elite'] : ['beast', 'ranged'];
  for (const s of suffix) {
    const table = s === 'elite' ? `${family}_elite` : `${family}_${s}`;
    (byLootTable[table] = byLootTable[table] || []).push({ itemId: f.id, weight: f.set ? 2 : f.def.rarity === 'epic' ? 1 : f.def.rarity === 'rare' ? 2 : 3 });
  }
}
const toShop = fillers.filter((f) => f.band <= 2).map((f) => ({ itemId: f.id, quantity: null }));

console.log(`huecos: ${gaps.length} · relleno: ${fillers.length} · piezas de set: ${setPieces.length} · total nuevo: ${all.length}`);
for (const f of all) console.log(String(f.def.level).padStart(3), (f.def.slot || 'weapon').padEnd(9), f.id.padEnd(30), f.def.name, f.def.rarity, f.def.setId || '');
for (const [t, es] of Object.entries(byLootTable)) console.log('loot:', t, es.length);
console.log('tienda (smith):', toShop.length);
if (!WRITE) { console.log('(informativo; usa --write para aplicar)'); process.exit(0); }

// ── aplicar a data/ (inserción quirúrgica: conserva el formato existente) ─────
function nlOf(text) { return text.includes('\r\n') ? '\r\n' : '\n'; }
function splitTail(text, tailPattern) {
  const m = text.match(tailPattern);
  if (!m) throw new Error('no se encontró el cierre esperado');
  return { i: m.index, nl: nlOf(text), tail: text.slice(m.index) };
}
// Inserta líneas justo antes del `]` que cierra el array abierto en openIdx.
function appendToArray(text, openIdx, lines, indent) {
  const close = text.indexOf(']', openIdx);
  if (close < 0) throw new Error('array sin cierre');
  const nl = nlOf(text);
  const lastContent = text.lastIndexOf('}', close);
  const chunk = ',' + lines.map((l) => nl + indent + l).join(',');
  return text.slice(0, lastContent + 1) + chunk + text.slice(lastContent + 1);
}
// items.json: entradas de una línea antes del cierre de "items"
{
  const p = path.join(ROOT, 'data/rpg/items.json');
  const text = readFileSync(p, 'utf8');
  const { i, nl, tail } = splitTail(text, /(\r?\n) {2}\}\r?\n\}\r?\n?$/);
  const chunk = all.map((f) => `    ${JSON.stringify(f.id)}: ${JSON.stringify(f.def)}`).join(`,${nl}`);
  writeFileSync(p, `${text.slice(0, i)},${nl}${chunk}${tail}`);
}
// loot.json: ampliar "entries" de cada tabla, conservando el formato
{
  const p = path.join(ROOT, 'data/rpg/loot.json');
  const data = read('data/rpg/loot.json');
  let text = readFileSync(p, 'utf8');
  for (const [table, entries] of Object.entries(byLootTable)) {
    const t = data.tables[table];
    if (!t) throw new Error(`tabla de botín inexistente: ${table}`);
    const seen = new Set(t.entries.map((e) => e.itemId));
    const fresh = entries.filter((e) => !seen.has(e.itemId));
    if (!fresh.length) continue;
    const keyIdx = text.indexOf(`"${table}"`);
    const open = text.indexOf('"entries"', keyIdx);
    const lines = fresh.map((e) => `{ "itemId": ${JSON.stringify(e.itemId)}, "weight": ${e.weight} }`);
    text = appendToArray(text, open, lines, '        ');
  }
  writeFileSync(p, text);
}
// merchants.json: stock de la herrería
{
  const p = path.join(ROOT, 'data/rpg/merchants.json');
  const data = read('data/rpg/merchants.json');
  let text = readFileSync(p, 'utf8');
  const seen = new Set(data.merchants.smith.stock.map((s) => s.itemId));
  const fresh = toShop.filter((s) => !seen.has(s.itemId));
  if (fresh.length) {
    const keyIdx = text.indexOf('"smith"');
    const open = text.indexOf('"stock"', keyIdx);
    text = appendToArray(text, open, fresh.map((s) => `{ "itemId": ${JSON.stringify(s.itemId)}, "quantity": null }`), '        ');
    writeFileSync(p, text);
  }
}
// sets.json: los dos conjuntos nuevos, antes del cierre de "sets"
{
  const p = path.join(ROOT, 'data/rpg/sets.json');
  const data = read('data/rpg/sets.json');
  const text = readFileSync(p, 'utf8');
  const fresh = [4, 5].filter((b) => !data.sets[SETS[b].id]);
  if (fresh.length) {
    const { i, nl, tail } = splitTail(text, /(\r?\n) {2}\}\r?\n\}\r?\n?$/);
    const chunk = fresh.map((b) => `    ${JSON.stringify(SETS[b].id)}: ${JSON.stringify({ name: SETS[b].name, _build: SETS[b]._build, bonuses: SETS[b].bonuses })}`).join(`,${nl}`);
    writeFileSync(p, `${text.slice(0, i)},${nl}${chunk}${tail}`);
  }
}
// en.content.json: cada nombre/descripción nuevo con su inglés
{
  const p = path.join(ROOT, 'data/i18n/en.content.json');
  const cur = read('data/i18n/en.content.json');
  const pairs = new Map();
  const add = (a, b) => { if (!(a in cur) && !pairs.has(a)) pairs.set(a, b); };
  for (const f of all) {
    add(f.def.name, f.nameEn);
    add(f.def.description, f.descEn);
  }
  for (const s of [4, 5]) add(SETS[s].name, SETS[s].nameEn);
  if (pairs.size) {
    let text = readFileSync(p, 'utf8');
    const { i, nl } = splitTail(text, /(\r?\n)\}\r?\n?$/);
    text = `${text.slice(0, i)},${nl}${[...pairs].map(([a, b]) => `  ${JSON.stringify(a)}: ${JSON.stringify(b)}`).join(`,${nl}`)}${text.slice(i)}`;
    writeFileSync(p, text);
  }
}
// PROCEDENCIA.md: fila nueva bajo la cabecera de la tabla (orden newest-first)
{
  const p = path.join(ROOT, 'PROCEDENCIA.md');
  let text = readFileSync(p, 'utf8');
  const nl = nlOf(text);
  const marker = 'renderNewItemIcons.py';
  if (!text.includes(marker)) {
    const sep = text.indexOf('|---|');
    const eol = text.indexOf(nl, sep);
    const row = `| 2026-11-10 | ${all.map((f) => `\`assets/icons/items/${f.id}.png\``).join(', ')} | Composiciones deterministas originales con \`scripts/t05/renderNewItemIcons.py\` (envoltura de \`scripts/art/render_item_icons.py\`, Pillow); sin imágenes externas ni fuentes | FrankmanGames | Propia del proyecto | Matriz categoría × franja H09: relleno + sets \`bocas_gale\` y \`istmo_tideplate\`; cifras PROPUESTA |`;
    text = text.slice(0, eol + nl.length) + row + nl + text.slice(eol + nl.length);
    writeFileSync(p, text);
  }
}
console.log(`aplicado: ${all.length} objetos, ${Object.keys(byLootTable).length} tablas de botín, ${toShop.length} en tienda, 2 sets.`);
writeFileSync(path.join(ROOT, 'scripts/t05/new_items.json'), JSON.stringify(all.map((f) => f.id), null, 2) + '\n');
console.log('Ahora: python scripts/t05/renderNewItemIcons.py && python scripts/art/validar_item_icons.py');
