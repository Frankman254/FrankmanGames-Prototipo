#!/usr/bin/env node
/**
 * HZ-04c-vanguardia: Genera los 32 hechizos de la Vanguardia de Brasa
 * desde la tabla HZ-04d de docs/diseno/03_HECHIZOS_Y_RANGOS.md.
 *
 * Usa los nombres de campo exactos del validador (src/rpg/content.ts):
 *   selfStack: percent, max, duration
 *   power, critChance, critDamage, fixedDamage, pushDamage: value, duration
 *   damage: min, max, perLevel, element, scaling
 *   shield: amount, perLevel, duration
 *   status: statusId, duration
 *   knockback: distance, pushDamage, pushDamagePerLevel
 *   chain: jumps, radius, falloffPercent
 *   pull: distance, towardCaster
 *   zone: radius, duration, every, effects[]
 *   bonusVsStatus: statusId, bonusDamage, consume
 *   heal: min, max, perLevel
 *   dispel: kind
 *   dash, recoil, swap: sin campos
 *
 * Actualiza los 26 existentes y añade los 6 nuevos.
 * Las cifras son PROPUESTA.
 */

import { readFileSync, writeFileSync } from 'fs';

const spellsPath = 'data/rpg/spells.json';
const i18nPath = 'data/i18n/en.content.json';

const spells = JSON.parse(readFileSync(spellsPath, 'utf8'));
const i18n = JSON.parse(readFileSync(i18nPath, 'utf8'));

const ELEM = {
  'Tierra': 'earth',
  'Fuego': 'fire',
  'Rayo': 'lightning',
  'Agua': 'water',
  'Escarcha': 'frost',
  'Aire': 'air',
};

function parseArea(areaStr) {
  let a = areaStr.trim().replace(/×/g, 'x').replace(/(\d),(\d)/g, '$1.$2');
  if (a === 'uno mismo') return { type: 'self' };
  if (a.startsWith('uno')) return null;

  const m = a.match(/círculo\s+([\d.]+)\s*m/);
  if (m) return { type: 'circle', radius: parseFloat(m[1]) };
  const ml = a.match(/línea\s+([\d.]+)x([\d.]+)\s*m/);
  if (ml) return { type: 'line', length: parseFloat(ml[1]), width: parseFloat(ml[2]) };
  const mc = a.match(/cono\s+([\d.]+)\s*m\s+(\d+)°/);
  if (mc) return { type: 'cone', length: parseFloat(mc[1]), angleDeg: parseInt(mc[2]) };
  const mz = a.match(/cruz\s+([\d.]+)\s*m/);
  if (mz) return { type: 'cross', radius: parseFloat(mz[1]) };
  const me = a.match(/estrella\s+([\d.]+)\s*m/);
  if (me) return { type: 'star', radius: parseFloat(me[1]) };
  console.error('WARN: Unknown area format:', areaStr);
  return null;
}

function parseRange(areaAlcance) {
  const parts = areaAlcance.split('·').map(s => s.trim());
  if (parts.length < 2) return 0;
  const alcance = parts[1];
  if (alcance === 'cuerpo' || alcance === 'cuerpo a cuerpo') return 0;
  const n = parseFloat(alcance.replace('m', '').trim().replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function parseAreaFromCol(areaAlcance) {
  const parts = areaAlcance.split('·').map(s => s.trim());
  if (parts.length < 1) return null;
  return parseArea(parts[0]);
}

function parseEffects(effectsStr, element, papel) {
  const effects = [];
  const elem = ELEM[element] || element.toLowerCase();
  const e = effectsStr.replace(/–/g, '-').replace(/(\d),(\d)/g, '$1.$2');

  // damage min-max + perLevel/nv
  const dmg = e.match(/damage\s+([\d.]+)-([\d.]+)\s*\+\s*([\d.]+)\/nv/);
  if (dmg) {
    effects.push({
      type: 'damage',
      min: parseInt(dmg[1]),
      max: parseInt(dmg[2]),
      perLevel: parseFloat(dmg[3]),
      element: elem,
      scaling: papel === 'Daño' ? 0.4 : 0.3,
    });
  }

  // knockback + pushDamage
  const kb = e.match(/knockback\s+([\d.]+)\s*m/);
  if (kb) {
    const kbEffect = { type: 'knockback', distance: parseFloat(kb[1]) };
    const pd = e.match(/pushDamage\s+([\d.]+)\s*\+\s*([\d.]+)\/nv/);
    if (pd) {
      kbEffect.pushDamage = parseFloat(pd[1]);
      kbEffect.pushDamagePerLevel = parseFloat(pd[2]);
    }
    effects.push(kbEffect);
  }

  // pushDamage standalone (no knockback) — not used in current table
  if (!kb) {
    const pd = e.match(/pushDamage\s+([\d.]+)\s*\+\s*([\d.]+)\/nv/);
    if (pd) {
      // pushDamage is part of knockback, not standalone
    }
  }

  // burn N s
  const burn = e.match(/burn\s+([\d.]+)\s*s/);
  if (burn) {
    effects.push({ type: 'status', statusId: 'burn', duration: parseFloat(burn[1]) });
  }

  // soaked N s
  const soaked = e.match(/soaked\s+([\d.]+)\s*s/);
  if (soaked) {
    effects.push({ type: 'status', statusId: 'soaked', duration: parseFloat(soaked[1]) });
  }

  // chilled N s
  const chilled = e.match(/chilled\s+([\d.]+)\s*s/);
  if (chilled) {
    effects.push({ type: 'status', statusId: 'chilled', duration: parseFloat(chilled[1]) });
  }

  // static_charge N s
  const sc = e.match(/static_charge\s+([\d.]+)\s*s/);
  if (sc) {
    effects.push({ type: 'status', statusId: 'static_charge', duration: parseFloat(sc[1]) });
  }

  // dazed
  if (e.includes('dazed')) {
    effects.push({ type: 'status', statusId: 'dazed', duration: 1.5 });
  }

  // rooted N s
  const rooted = e.match(/rooted\s+([\d.]+)\s*s/);
  if (rooted) {
    effects.push({ type: 'status', statusId: 'rooted', duration: parseFloat(rooted[1]) });
  }

  // numb N s
  const numb = e.match(/numb\s+([\d.]+)\s*s/);
  if (numb) {
    effects.push({ type: 'status', statusId: 'numb', duration: parseFloat(numb[1]) });
  }

  // weariness N s
  const wear = e.match(/weariness\s+([\d.]+)\s*s/);
  if (wear) {
    effects.push({ type: 'status', statusId: 'weariness', duration: parseFloat(wear[1]) });
  }

  // selfStack: percent (0.1-500), max (int 1-50), duration (1-600)
  const ss = e.match(/selfStack\s+([\d.]+)\s*%/);
  if (ss) {
    const ssMax = e.match(/máx\.\s*([\d.]+)/);
    const ssDur = e.match(/([\d.]+)\s*s\s*\(Carga\)/);
    effects.push({
      type: 'selfStack',
      percent: parseFloat(ss[1]),
      max: ssMax ? parseInt(ssMax[1]) : 2,
      duration: ssDur ? parseFloat(ssDur[1]) : 6,
    });
  }

  // chain N saltos, R m, falloff
  const chain = e.match(/chain\s+([\d.]+)\s*saltos,\s*([\d.]+)\s*m/);
  if (chain) {
    const chainEffect = {
      type: 'chain',
      jumps: parseInt(chain[1]),
      radius: parseFloat(chain[2]),
    };
    const falloff = e.match(/−([\d.]+)\s*%/);
    if (falloff) {
      chainEffect.falloffPercent = parseFloat(falloff[1]);
    }
    effects.push(chainEffect);
  }

  // pull N m
  const pull = e.match(/pull\s+([\d.]+)\s*m/);
  if (pull) {
    effects.push({ type: 'pull', distance: parseFloat(pull[1]) });
  }

  // dash — needs distance (0.1-30). Default 5m if not specified.
  if (e.includes('dash') && !e.includes('pushDamage')) {
    effects.push({ type: 'dash', distance: 5 });
  }

  // dash without distance check (for river_shoulder which has "dash · pull")
  if (e.includes(' · dash') || e.match(/·\s*dash\s*$/)) {
    const existingDash = effects.find(ef => ef.type === 'dash');
    if (!existingDash) {
      effects.push({ type: 'dash', distance: 5 });
    }
  }

  // shield amount + perLevel/nv, duration
  const shield = e.match(/shield\s+([\d.]+)\s*\+\s*([\d.]+)\/nv/);
  if (shield) {
    const dur = e.match(/([\d.]+)\s*s/);
    effects.push({
      type: 'shield',
      amount: parseFloat(shield[1]),
      perLevel: parseFloat(shield[2]),
      duration: dur ? parseFloat(dur[1]) : 8,
    });
  }

  // status iron_shout
  if (e.includes('status iron_shout')) {
    effects.push({ type: 'status', statusId: 'iron_shout', duration: 8 });
  }

  // status retaliation
  if (e.includes('status retaliation')) {
    effects.push({ type: 'status', statusId: 'retaliation', duration: 12 });
  }

  // status stone_skin N s
  if (e.includes('status stone_skin')) {
    const dur = e.match(/stone_skin\s+([\d.]+)\s*s/);
    effects.push({ type: 'status', statusId: 'stone_skin', duration: dur ? parseFloat(dur[1]) : 6 });
  }

  // status haste N s
  if (e.includes('status haste')) {
    const dur = e.match(/haste\s+([\d.]+)\s*s/);
    effects.push({ type: 'status', statusId: 'haste', duration: dur ? parseFloat(dur[1]) : 8 });
  }

  // status ward_ranged N s
  if (e.includes('status ward_ranged')) {
    const dur = e.match(/ward_ranged\s+([\d.]+)\s*s/);
    effects.push({ type: 'status', statusId: 'ward_ranged', duration: dur ? parseFloat(dur[1]) : 3 });
  }

  // status ward_melee N s
  if (e.includes('status ward_melee')) {
    const dur = e.match(/ward_melee\s+([\d.]+)\s*s/);
    effects.push({ type: 'status', statusId: 'ward_melee', duration: dur ? parseFloat(dur[1]) : 3 });
  }

  // zone N m, D s (sin cambio) — smoke_screen: zone 3 m, 5 s
  const zone = e.match(/zone\s+([\d.]+)\s*m,\s*([\d.]+)\s*s/);
  if (zone) {
    effects.push({
      type: 'zone',
      radius: parseFloat(zone[1]),
      duration: parseFloat(zone[2]),
      every: 1,
      effects: [{ type: 'status', statusId: 'disoriented', duration: 2 }],
    });
  }
  // zone línea, D s (sin cambio) — flood_furrow: zone línea, 6 s
  // Original: radius:1, duration:6, every:1, effects: chilled 2s
  const zoneLine = e.match(/zone\s+línea,\s*([\d.]+)\s*s/);
  if (zoneLine) {
    effects.push({
      type: 'zone',
      radius: 1,
      duration: parseFloat(zoneLine[1]),
      every: 1,
      effects: [{ type: 'status', statusId: 'chilled', duration: 2 }],
    });
  }

  // power +N % D s → value (0.1-500), duration (0.1-600)
  const power = e.match(/power\s*\+([\d.]+)\s*%/);
  if (power) {
    const dur = e.match(/([\d.]+)\s*s/);
    effects.push({
      type: 'power',
      value: parseFloat(power[1]),
      duration: dur ? parseFloat(dur[1]) : 8,
    });
  }

  // critChance +N % → value (0.1-100), duration (0.1-600)
  const cc = e.match(/critChance\s*\+([\d.]+)\s*%/);
  if (cc) {
    effects.push({ type: 'critChance', value: parseFloat(cc[1]), duration: 8 });
  }

  // critDamage +N → value (0.1-500), duration (0.1-600)
  const cd = e.match(/critDamage\s*\+([\d.]+)/);
  if (cd) {
    effects.push({ type: 'critDamage', value: parseFloat(cd[1]), duration: 8 });
  }

  // trap → damage
  if (e.startsWith('trap')) {
    const trapIdx = effects.findIndex(ef => ef.type === 'damage');
    if (trapIdx >= 0) {
      effects[trapIdx].trap = true;
    }
  }

  // bonusVsStatus soaked +N %, consume
  const bvs = e.match(/bonusVsStatus\s+(\w+)\s*\+([\d.]+)\s*%/);
  if (bvs) {
    effects.push({
      type: 'bonusVsStatus',
      statusId: bvs[1],
      bonusDamage: parseFloat(bvs[2]) / 100,
      consume: true,
    });
  }

  // heal min-max + perLevel/nv
  const heal = e.match(/heal\s+([\d.]+)-([\d.]+)\s*\+\s*([\d.]+)\/nv/);
  if (heal) {
    effects.push({
      type: 'heal',
      min: parseInt(heal[1]),
      max: parseInt(heal[2]),
      perLevel: parseFloat(heal[3]),
    });
  }

  // recoil
  if (e.includes('recoil') && !e.includes('pushDamage')) {
    effects.push({ type: 'recoil' });
  }

  // swap
  if (e.includes('swap') && !e.includes('storm_swap')) {
    effects.push({ type: 'swap' });
  }

  // dispel kind buff
  if (e.includes('dispel kind buff')) {
    effects.push({ type: 'dispel', kind: 'buff' });
  }

  // pull toward caster
  if (e.includes('pull') && e.includes('hacia el lanzador')) {
    const pe = effects.find(ef => ef.type === 'pull');
    if (pe) pe.towardCaster = true;
  }

  return effects;
}

function parseCostCooldown(ccStr) {
  const parts = ccStr.split('·').map(s => s.trim());
  const cost = parseInt(parts[0]);
  const cd = parseFloat(parts[1].replace('s', '').trim().replace(',', '.'));
  return { cost, cooldown: cd };
}

// The 32 Vanguard spells from HZ-04d table
const vanguardiaSpells = [
  { nv: 1, id: 'charge', name: 'Embestida', elem: 'Tierra', papel: 'Daño', areaAlcance: 'línea 6×1,9 m · cuerpo', cc: '15 · 6 s', effects: 'damage 12–16 + 0,11/nv · knockback 3 m + pushDamage 3 + 0,04/nv por m · dash' },
  { nv: 1, id: 'ember_whirl', name: 'Remolino de brasas', elem: 'Fuego', papel: 'Daño', areaAlcance: 'círculo 3,2 m · cuerpo', cc: '18 · 5 s', effects: 'damage 13–17 + 0,11/nv · burn 3 s' },
  { nv: 1, id: 'iron_shout', name: 'Rugido de hierro', elem: 'Tierra', papel: 'Potenc.', areaAlcance: 'uno mismo', cc: '10 · 16 s', effects: 'status iron_shout (sin cambio)' },
  { nv: 2, id: 'ember_mine', name: 'Mina de brasa', elem: 'Fuego', papel: 'Daño', areaAlcance: 'círculo 1 m · 6 m', cc: '14 · 6 s', effects: 'trap → damage 10–14 + 0,09/nv · burn 3 s' },
  { nv: 3, id: 'fiery_slash', name: 'Tajo sísmico', elem: 'Tierra', papel: 'Daño', areaAlcance: 'uno · 1,8 m', cc: '12 · 2,5 s', effects: 'damage 15–21 + 0,14/nv · selfStack 25 %, máx. 2, 6 s (Carga)' },
  { nv: 5, id: 'searing_mark', name: 'Marca abrasadora', elem: 'Fuego', papel: 'Daño', areaAlcance: 'uno · 8 m', cc: '10 · 4 s', effects: 'damage 10–13 + 0,08/nv · burn 6 s' },
  { nv: 6, id: 'stunning_pommel', name: 'Golpe aturdidor', elem: 'Rayo', papel: 'Control', areaAlcance: 'uno · 1,8 m', cc: '12 · 8 s', effects: 'damage 11–14 + 0,09/nv · dazed' },
  { nv: 7, id: 'bulwark', name: 'Baluarte de roca', elem: 'Tierra', papel: 'Defensa', areaAlcance: 'uno mismo', cc: '20 · 18 s', effects: 'shield 20 + 5,5/nv, 8 s' },
  { nv: 9, id: 'ember_chain', name: 'Cadena de brasa', elem: 'Fuego', papel: 'Control', areaAlcance: 'uno · 7 m', cc: '14 · 9 s', effects: 'damage 10–14 + 0,09/nv · pull 4 m' },
  { nv: 12, id: 'retaliation', name: 'Retaliación', elem: 'Tierra', papel: 'Defensa', areaAlcance: 'uno mismo', cc: '15 · 18 s', effects: 'status retaliation (sin cambio)' },
  { nv: 16, id: 'tide_cleave', name: 'Tajo de marea', elem: 'Agua', papel: 'Daño', areaAlcance: 'cono 4,5 m 85° · cuerpo', cc: '18 · 7 s', effects: 'damage 14–19 + 0,12/nv · soaked 4 s · knockback 2 m + pushDamage 3 + 0,04/nv por m' },
  { nv: 18, id: 'salt_temper', name: 'Templado de sal', elem: 'Escarcha', papel: 'Daño', areaAlcance: 'cono 4,5 m 85° · cuerpo', cc: '18 · 7 s', effects: 'damage 16–22 + 0,14/nv · chilled 2 s' },
  { nv: 20, id: 'thunder_maul', name: 'Mazo de trueno', elem: 'Rayo', papel: 'Daño', areaAlcance: 'círculo 3 m · cuerpo', cc: '24 · 10 s', effects: 'damage 18–25 + 0,15/nv · static_charge 4 s' },
  { nv: 25, id: 'forge_fervor', name: 'Fervor de fragua', elem: 'Fuego', papel: 'Potenc.', areaAlcance: 'uno · 6 m', cc: '20 · 24 s', effects: 'power +25 % 8 s, a uno mismo o a un aliado (rango 6: +30 %)', nuevo: true },
  { nv: 30, id: 'guarapo_splash', name: 'Baldazo de guarapo', elem: 'Agua', papel: 'Daño', areaAlcance: 'cono 4 m 80° · cuerpo', cc: '14 · 5 s', effects: 'damage 15–20 + 0,12/nv · soaked 5 s' },
  { nv: 35, id: 'night_dew', name: 'Sereno', elem: 'Escarcha', papel: 'Daño', areaAlcance: 'uno · 1,8 m', cc: '13 · 4 s', effects: 'damage 17–23 + 0,14/nv · chilled 3 s' },
  { nv: 40, id: 'flint_spark', name: 'Chispa de pedernal', elem: 'Rayo', papel: 'Daño', areaAlcance: 'uno · 1,8 m', cc: '15 · 5 s', effects: 'damage 17–23 + 0,14/nv · chain 2 saltos, 4 m, −30 %' },
  { nv: 45, id: 'smoke_screen', name: 'Humareda', elem: 'Aire', papel: 'Control', areaAlcance: 'círculo 3 m · 8 m', cc: '18 · 12 s', effects: 'zone 3 m, 5 s (sin cambio)' },
  { nv: 50, id: 'salt_crust', name: 'Costra de salitre', elem: 'Escarcha', papel: 'Defensa', areaAlcance: 'uno mismo', cc: '22 · 15 s', effects: 'status stone_skin 6 s (sin cambio)' },
  { nv: 60, id: 'quarry_pull', name: 'Tirón de cantera', elem: 'Tierra', papel: 'Control', areaAlcance: 'círculo 5 m · cuerpo', cc: '22 · 14 s', effects: 'pull 3 m hacia el lanzador, a todos los del área', nuevo: true },
  { nv: 70, id: 'bellows', name: 'Fuelle', elem: 'Aire', papel: 'Daño', areaAlcance: 'cono 5 m 85° · cuerpo', cc: '16 · 6 s', effects: 'damage 15–20 + 0,11/nv · knockback 3 m + pushDamage 3 + 0,04/nv por m' },
  { nv: 80, id: 'ash_ward', name: 'Guardia de ceniza', elem: 'Fuego', papel: 'Defensa', areaAlcance: 'uno mismo', cc: '20 · 30 s', effects: 'status ward_ranged 3 s (invulnerable a distancia)', nuevo: true },
  { nv: 90, id: 'flood_furrow', name: 'Surco anegado', elem: 'Agua', papel: 'Control', areaAlcance: 'línea 6×2 m · 8 m', cc: '24 · 14 s', effects: 'zone línea, 6 s (sin cambio)' },
  { nv: 100, id: 'machete_whirl', name: 'Molinete', elem: 'Aire', papel: 'Daño', areaAlcance: 'línea 5×2 m · cuerpo', cc: '20 · 7 s', effects: 'damage 20–27 + 0,14/nv · dash' },
  { nv: 110, id: 'cold_ash', name: 'Ceniza fría', elem: 'Escarcha', papel: 'Daño', areaAlcance: 'círculo 3,5 m · cuerpo', cc: '22 · 8 s', effects: 'damage 20–27 + 0,14/nv · weariness 4 s' },
  { nv: 120, id: 'quema_wind', name: 'Viento de quema', elem: 'Aire', papel: 'Potenc.', areaAlcance: 'uno mismo', cc: '26 · 18 s', effects: 'status haste 8 s (sin cambio)' },
  { nv: 135, id: 'anvil_rhythm', name: 'Compás del yunque', elem: 'Rayo', papel: 'Potenc.', areaAlcance: 'uno mismo', cc: '20 · 30 s', effects: 'critChance +15 % · critDamage +0,15, 8 s', nuevo: true },
  { nv: 150, id: 'river_shoulder', name: 'Hombro de río', elem: 'Agua', papel: 'Daño', areaAlcance: 'línea 6×2 m · cuerpo', cc: '28 · 8 s', effects: 'damage 24–33 + 0,16/nv · dash · pull' },
  { nv: 165, id: 'frozen_furrow', name: 'Helada del surco', elem: 'Escarcha', papel: 'Daño', areaAlcance: 'línea 6×2 m · cuerpo', cc: '26 · 9 s', effects: 'damage 28–38 + 0,18/nv · rooted 2 s' },
  { nv: 180, id: 'numbing_stomp', name: 'Pisotón entumecedor', elem: 'Tierra', papel: 'Control', areaAlcance: 'círculo 4 m · cuerpo', cc: '24 · 16 s', effects: 'damage 10–14 + 0,06/nv · numb 4 s', nuevo: true },
  { nv: 190, id: 'magma_ram', name: 'Ariete de magma', elem: 'Fuego', papel: 'Daño', areaAlcance: 'línea 6×1,5 m · cuerpo', cc: '30 · 10 s', effects: 'damage 31–42 + 0,18/nv · knockback 2 m + pushDamage 3 + 0,04/nv por m · burn 3 s', nuevo: true },
  { nv: 200, id: 'volcanic_fury', name: 'Furia volcánica', elem: 'Fuego', papel: 'Daño', areaAlcance: 'círculo 4 m · cuerpo', cc: '40 · 20 s', effects: 'damage 48–65 + 0,28/nv · burn 4 s' },
];

const ICONS = {
  charge: '🐂', ember_whirl: '🌀', iron_shout: '🗣️', ember_mine: '💣',
  fiery_slash: '🪨', searing_mark: '🔥', stunning_pommel: '⚡', bulwark: '🛡️',
  ember_chain: '⛓️', retaliation: '🔄', tide_cleave: '🌊', salt_temper: '❄️',
  thunder_maul: '🔨', forge_fervor: '🔥', guarapo_splash: '💧', night_dew: '🌙',
  flint_spark: '⚡', smoke_screen: '💨', salt_crust: '🧂', quarry_pull: '🪨',
  bellows: '🌬️', ash_ward: '🔥', flood_furrow: '🌊', machete_whirl: '🌪️',
  cold_ash: '🌫️', quema_wind: '💨', anvil_rhythm: '⚡', river_shoulder: '🌊',
  frozen_furrow: '❄️', numbing_stomp: '🦶', magma_ram: '🌋', volcanic_fury: '🌋',
};

function getDescription(s) {
  const descs = {
    charge: 'Apunta hacia donde quieres cargar: avanzas, dañas y apartas a todos los enemigos del trayecto.',
    ember_whirl: 'Golpe de fuego en área inmediata alrededor de ti. Úsalo cuando quedes rodeado.',
    iron_shout: 'Aumenta tu resistencia con un rugido. Efecto de endurecimiento.',
    ember_mine: 'Coloca una mina de brasa en el suelo. Explota cuando un enemigo la pisa.',
    fiery_slash: 'Golpe corto de tierra con carga acumulativa. Cada lanzamiento suma daño al siguiente.',
    searing_mark: 'Marca a un enemigo con fuego a distancia. El daño es bajo pero quema durante varios segundos.',
    stunning_pommel: 'Golpe de rayo que aturde al objetivo brevemente.',
    bulwark: 'Escudo de roca que escala con tu nivel. Absorbe daño durante varios segundos.',
    ember_chain: 'Atrae a un enemigo hacia ti con una cadena de fuego.',
    retaliation: 'Activa un efecto de retaliación: el daño recibido se devuelve.',
    tide_cleave: 'Golpe de agua en cono que empuja y empapa a los enemigos.',
    salt_temper: 'Golpe de escarcha en cono que enfría al objetivo.',
    thunder_maul: 'Golpe pesado de rayo en área que deja carga estática.',
    forge_fervor: 'Potencia a un aliado o a ti mismo con el fuego de la fragua.',
    guarapo_splash: 'Salpica agua a los enemigos cercanos, empapándolos.',
    night_dew: 'Golpe frío de escarcha a corta distancia.',
    flint_spark: 'Chispa de rayo que salta a enemigos cercanos.',
    smoke_screen: 'Crea una nube de humo que oculta el área.',
    salt_crust: 'Endurece tu piel como salitre. Resistencia temporal.',
    quarry_pull: 'Tira a todos los enemigos del área hacia ti.',
    bellows: 'Sopla aire con fuerza, empujando a los enemigos.',
    ash_ward: 'Te hace invulnerable al daño a distancia durante unos segundos.',
    flood_furrow: 'Crea una zona anegada en línea que controla el terreno.',
    machete_whirl: 'Carga en línea con el machete, dañando todo a tu paso.',
    cold_ash: 'Nube de ceniza fría que agota a los enemigos cercanos.',
    quema_wind: 'Aumenta tu velocidad de movimiento con el viento.',
    anvil_rhythm: 'Aumenta tu probabilidad y daño crítico durante varios segundos.',
    river_shoulder: 'Carga de agua que empuja y atrae a los enemigos.',
    frozen_furrow: 'Carga helada que inmoviliza a los enemigos en su camino.',
    numbing_stomp: 'Pisotón que entumece a los enemigos cercanos, ralentizando sus enfriamientos.',
    magma_ram: 'Carga de magma que empuja y quema a los enemigos.',
    volcanic_fury: 'Explosión volcánica de fuego en área. El golpe más fuerte de la Vanguardia.',
  };
  return descs[s.id] || 'Hechizo de la Vanguardia.';
}

function getDescriptionEn(s) {
  const descs = {
    charge: 'Aim where you want to charge: advance, damage and push back enemies in your path.',
    ember_whirl: 'Close-range fire AoE around you. Use when surrounded.',
    iron_shout: 'Boost your resistance with a roar. Hardening effect.',
    ember_mine: 'Place an ember mine on the ground. Explodes when an enemy steps on it.',
    fiery_slash: 'Short earth strike with stacking charge. Each cast adds damage to the next.',
    searing_mark: 'Mark a distant enemy with fire. Low damage but burns for several seconds.',
    stunning_pommel: 'Lightning strike that briefly stuns the target.',
    bulwark: 'Rock shield that scales with your level. Absorbs damage for several seconds.',
    ember_chain: 'Pull an enemy toward you with a chain of fire.',
    retaliation: 'Activate retaliation: damage received is reflected.',
    tide_cleave: 'Cone water strike that pushes and soaks enemies.',
    salt_temper: 'Cone ice strike that chills the target.',
    thunder_maul: 'Heavy lightning AoE strike that leaves static charge.',
    forge_fervor: 'Empower an ally or yourself with forge fire.',
    guarapo_splash: 'Splash water on nearby enemies, soaking them.',
    night_dew: 'Cold ice strike at short range.',
    flint_spark: 'Lightning spark that jumps to nearby enemies.',
    smoke_screen: 'Create a smoke cloud that obscures the area.',
    salt_crust: 'Harden your skin like salt. Temporary resistance.',
    quarry_pull: 'Pull all enemies in the area toward you.',
    bellows: 'Blow air with force, pushing enemies back.',
    ash_ward: 'Makes you immune to ranged damage for a few seconds.',
    flood_furrow: 'Create a flooded zone in a line that controls the terrain.',
    machete_whirl: 'Charge in a line with your machete, damaging everything in your path.',
    cold_ash: 'Cloud of cold ash that exhausts nearby enemies.',
    quema_wind: 'Increase your movement speed with the wind.',
    anvil_rhythm: 'Increase your critical chance and damage for several seconds.',
    river_shoulder: 'Water charge that pushes and pulls enemies.',
    frozen_furrow: 'Ice charge that immobilizes enemies in its path.',
    numbing_stomp: 'Stomp that numbs nearby enemies, slowing their cooldowns.',
    magma_ram: 'Magma charge that pushes and burns enemies.',
    volcanic_fury: 'Volcanic fire explosion in an area. The Vanguard\'s strongest strike.',
  };
  return descs[s.id] || 'Vanguard spell.';
}

function getNameEn(s) {
  const names = {
    charge: 'Charge', ember_whirl: 'Ember Whirl', iron_shout: 'Iron Shout',
    ember_mine: 'Ember Mine', fiery_slash: 'Seismic Slash', searing_mark: 'Searing Mark',
    stunning_pommel: 'Stunning Pommel', bulwark: 'Rock Bulwark', ember_chain: 'Ember Chain',
    retaliation: 'Retaliation', tide_cleave: 'Tide Cleave', salt_temper: 'Salt Temper',
    thunder_maul: 'Thunder Maul', forge_fervor: 'Forge Fervor', guarapo_splash: 'Guarapo Splash',
    night_dew: 'Night Dew', flint_spark: 'Flint Spark', smoke_screen: 'Smoke Screen',
    salt_crust: 'Salt Crust', quarry_pull: 'Quarry Pull', bellows: 'Bellows',
    ash_ward: 'Ash Ward', flood_furrow: 'Flood Furrow', machete_whirl: 'Machete Whirl',
    cold_ash: 'Cold Ash', quema_wind: 'Burn Wind', anvil_rhythm: 'Anvil Rhythm',
    river_shoulder: 'River Shoulder', frozen_furrow: 'Frozen Furrow', numbing_stomp: 'Numbing Stomp',
    magma_ram: 'Magma Ram', volcanic_fury: 'Volcanic Fury',
  };
  return names[s.id] || s.name;
}

let updated = 0;
let added = 0;

for (const s of vanguardiaSpells) {
  const { cost, cooldown } = parseCostCooldown(s.cc);
  const range = parseRange(s.areaAlcance);
  const area = parseAreaFromCol(s.areaAlcance);
  const effects = parseEffects(s.effects, s.elem, s.papel);

  const spell = {
    name: s.name,
    description: getDescription(s),
    icon: ICONS[s.id] || '✨',
    element: ELEM[s.elem] || s.elem.toLowerCase(),
    classId: 'ember_vanguard',
    unlockLevel: s.nv,
    resourceCost: cost,
    cooldown: cooldown,
    globalCooldown: 0.6,
    castTime: 0,
    range: range,
    area: area || { type: 'single' },
    projectileSpeed: null,
    effects: effects,
    maxRank: 6,
    perRank: {
      effectPercent: 12,
      costPercent: 4,
    },
    critChance: s.papel === 'Control' ? 0.05 : s.papel === 'Potenc.' ? 0.05 : s.papel === 'Defensa' ? 0.05 : 0.15,
    critBonus: 0.25,
    tags: [],
    castWhileMoving: false,
  };

  // Tags
  if (area === null || (spell.area && spell.area.type === 'single')) {
    if (range === 0) spell.tags.push('melee');
    else spell.tags.push('ranged');
  } else {
    spell.tags.push('aoe');
  }
  if (s.papel === 'Control') spell.tags.push('control');
  if (s.papel === 'Potenc.') spell.tags.push('buff');
  if (s.papel === 'Defensa') spell.tags.push('defense');

  if (s.effects.includes('dash')) {
    spell.castWhileMoving = true;
  }

  if (s.id === 'forge_fervor') {
    spell.friendlyFire = false;
    spell.allyTargetable = true;
  }

  if (spells.spells[s.id]) {
    const old = spells.spells[s.id];
    if (old.globalCooldown) spell.globalCooldown = old.globalCooldown;
    if (old.projectileSpeed !== undefined) spell.projectileSpeed = old.projectileSpeed;
    if (old.friendlyFire !== undefined) spell.friendlyFire = old.friendlyFire;
    if (old.castWhileMoving !== undefined && !s.effects.includes('dash')) spell.castWhileMoving = old.castWhileMoving;
    spells.spells[s.id] = spell;
    updated++;
  } else {
    spells.spells[s.id] = spell;
    added++;
  }

  // i18n — always update (key = Spanish text, value = English text)
  const nameKey = `spell.${s.id}.name`;
  const descKey = `spell.${s.id}.description`;
  i18n[nameKey] = getNameEn(s);
  i18n[descKey] = getDescriptionEn(s);
  // The i18n system also uses the Spanish text itself as a key
  const desc = getDescription(s);
  if (!i18n[desc]) {
    i18n[desc] = getDescriptionEn(s);
  }
  // Spell name as key too
  if (!i18n[s.name]) {
    i18n[s.name] = getNameEn(s);
  }
}

writeFileSync(spellsPath, JSON.stringify(spells, null, 2) + '\n');
writeFileSync(i18nPath, JSON.stringify(i18n, null, 2) + '\n');

console.log(`HZ-04c-vanguardia: ${updated} actualizados, ${added} nuevos. Total: ${updated + added}/32`);
console.log('IDs nuevos:', vanguardiaSpells.filter(s => s.nuevo).map(s => s.id).join(', '));
