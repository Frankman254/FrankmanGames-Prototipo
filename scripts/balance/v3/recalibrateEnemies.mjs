import fs from 'node:fs';

const visualPath = 'data/enemies.json';
const rpgPath = 'data/rpg/enemies.json';
const visual = JSON.parse(fs.readFileSync(visualPath, 'utf8'));
const rpg = JSON.parse(fs.readFileSync(rpgPath, 'utf8'));

const HEALTH_PER_LEVEL = 0.40;
const DAMAGE_PER_LEVEL = 0.08;

function inherited(id, key) {
  const def = visual.archetypes[id];
  if (!def) throw new Error(`Arquetipo desconocido: ${id}`);
  if (def[key] !== undefined) return def[key];
  if (!def.base) throw new Error(`${id} no define ${key}`);
  return inherited(def.base, key);
}

function rootRole(id) {
  const def = visual.archetypes[id];
  return def?.base ? rootRole(def.base) : id;
}

function replaceEntry(text, id, mutate) {
  const marker = `    "${id}": {`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`No se encontró ${id}`);
  const next = text.indexOf('\n    "', start + marker.length);
  const end = next < 0 ? text.lastIndexOf('\n  }') : next;
  return text.slice(0, start) + mutate(text.slice(start, end)) + text.slice(end);
}

function number(value, digits = 3) {
  return String(Number(value.toFixed(digits)));
}

function replaceNumber(block, key, value) {
  const pattern = new RegExp(`("${key}"\\s*:\\s*)-?[0-9]+(?:\\.[0-9]+)?`);
  if (!pattern.test(block)) return block;
  return block.replace(pattern, `$1${number(value)}`);
}

const generated = Object.entries(visual.archetypes)
  .filter(([, def]) => typeof def.damageScale === 'number')
  .map(([id]) => id);

let visualText = fs.readFileSync(visualPath, 'utf8');
let rpgText = fs.readFileSync(rpgPath, 'utf8');

for (const id of generated) {
  const level = rpg.enemies[id]?.level;
  if (!Number.isInteger(level)) throw new Error(`${id} no tiene nivel RPG`);
  const baseHealth = inherited(visual.archetypes[id].base, 'maxHealth');
  const baseStagger = inherited(visual.archetypes[id].base, 'staggerDamage');
  const health = Math.round(baseHealth * (1 + HEALTH_PER_LEVEL * (level - 1)));
  const stagger = baseHealth > 0 ? health * baseStagger / baseHealth : 0;
  const damage = 1 + DAMAGE_PER_LEVEL * (level - 1);
  visualText = replaceEntry(visualText, id, (block) => {
    let next = replaceNumber(block, 'maxHealth', health);
    next = replaceNumber(next, 'staggerDamage', stagger);
    return replaceNumber(next, 'damageScale', damage);
  });

  const role = rootRole(id);
  const roleMult = role === 'minion' ? 0.30 : role === 'alpha_wolf' ? 2.2 : role === 'grave_brute' ? 1.5 : role === 'summoner' ? 1.25 : 1.0;
  const xp = Math.max(1, Math.round(3.0 * (level ** 2.18) * roleMult));
  const sheet = rpg.enemies[id].stats ?? {};
  const positiveResists = Object.entries(sheet).filter(([key, value]) => key.startsWith('resist.') && value > 0);
  const maxResist = Math.max(0, ...positiveResists.map(([, value]) => value));
  const resistTarget = Math.min(40, 15 + level * 0.25);
  const resistFactor = maxResist > resistTarget ? resistTarget / maxResist : 1;
  rpgText = replaceEntry(rpgText, id, (block) => {
    let next = replaceNumber(block, 'xp', xp);
    if (typeof sheet.power === 'number') next = replaceNumber(next, 'power', Math.min(sheet.power, 5 + level * 0.3));
    if (typeof sheet.armor === 'number') next = replaceNumber(next, 'armor', Math.min(sheet.armor, 5 + level * 0.15));
    if (typeof sheet.critChance === 'number') next = replaceNumber(next, 'critChance', Math.min(sheet.critChance, 0.05 + level * 0.001));
    if (typeof sheet.critBonus === 'number') next = replaceNumber(next, 'critBonus', Math.min(sheet.critBonus, 0.5 + level * 0.002));
    for (const [key, value] of positiveResists) next = replaceNumber(next, key, value * resistFactor);
    return next;
  });
}

fs.writeFileSync(visualPath, visualText);
fs.writeFileSync(rpgPath, rpgText);
console.log(`Recalibrados ${generated.length} arquetipos de nivel alto.`);
