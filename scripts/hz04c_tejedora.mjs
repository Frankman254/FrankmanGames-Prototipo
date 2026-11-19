#!/usr/bin/env node
/**
 * HZ-04c-tejedora: Genera los 32 hechizos de la Tejedora de Tormentas
 * desde la tabla HZ-04d de docs/diseno/03_HECHIZOS_Y_RANGOS.md.
 *
 * Replica el patrón de hz04c_vanguardia.mjs.
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
  if (mz) return { type: 'cross', arm: parseFloat(mz[1]), width: 1 };
  const me = a.match(/estrella\s+([\d.]+)\s*m/);
  if (me) return { type: 'star', arm: parseFloat(me[1]), width: 1 };
  console.error('WARN: Unknown area format:', areaStr);
  return null;
}

function parseRange(areaAlcance) {
  const parts = areaAlcance.split('·').map(s => s.trim());
  if (parts.length < 2) return 0;
  const alcance = parts[1];
  if (alcance === 'cuerpo' || alcance === 'cuerpo a cuerpo') return 0;
  const n = parseFloat(alcance.replace('m', '').trim());
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

  // knockback standalone (no pushDamage)
  if (e.includes('knockback') && !kb) {
    effects.push({ type: 'knockback', distance: 3 });
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

  // stunned N s
  const stunned = e.match(/stunned\s+([\d.]+)\s*s/);
  if (stunned) {
    effects.push({ type: 'status', statusId: 'stunned', duration: parseFloat(stunned[1]) });
  }

  // rooted N s (or just "rooted")
  const rooted = e.match(/rooted\s+([\d.]+)\s*s/);
  if (rooted) {
    effects.push({ type: 'status', statusId: 'rooted', duration: parseFloat(rooted[1]) });
  } else if (e.includes('rooted') && !rooted) {
    effects.push({ type: 'status', statusId: 'rooted', duration: 2 });
  }

  // disoriented
  if (e.includes('disoriented')) {
    effects.push({ type: 'status', statusId: 'disoriented', duration: 2 });
  }

  // weariness N s (or just "weariness")
  const wear = e.match(/weariness\s+([\d.]+)\s*s/);
  if (wear) {
    effects.push({ type: 'status', statusId: 'weariness', duration: parseFloat(wear[1]) });
  } else if (e.includes('weariness')) {
    effects.push({ type: 'status', statusId: 'weariness', duration: 4 });
  }

  // numb N s
  const numb = e.match(/numb\s+([\d.]+)\s*s/);
  if (numb) {
    effects.push({ type: 'status', statusId: 'numb', duration: parseFloat(numb[1]) });
  }

  // selfStack
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
  const chain = e.match(/chain\s+([\d.]+)\s*saltos/);
  if (chain) {
    const chainEffect = {
      type: 'chain',
      jumps: parseInt(chain[1]),
      radius: 4,
    };
    const radius = e.match(/([\d.]+)\s*m/);
    if (radius) chainEffect.radius = parseFloat(radius[1]);
    const falloff = e.match(/−([\d.]+)\s*%/);
    if (falloff) chainEffect.falloffPercent = parseFloat(falloff[1]);
    effects.push(chainEffect);
  }

  // pull N m
  const pull = e.match(/pull\s+([\d.]+)\s*m/);
  if (pull) {
    effects.push({ type: 'pull', distance: parseFloat(pull[1]) });
  }

  // pull standalone (no distance)
  if (e.includes('pull') && !pull && !e.includes('tide_pull')) {
    effects.push({ type: 'pull', distance: 3 });
  }

  // blink — needs maxDistance (0.5-40)
  if (e.includes('blink')) {
    effects.push({ type: 'blink', maxDistance: 8 });
  }

  // recoil — needs distance (0.1-20)
  if (e.includes('recoil') && !e.includes('pushDamage')) {
    effects.push({ type: 'recoil', distance: 5 });
  }

  // swap
  if (e.includes('swap') && !e.includes('storm_swap')) {
    effects.push({ type: 'swap' });
  }

  // swap + chilled
  if (e.includes('swap') && e.includes('chilled')) {
    const existingChilled = effects.find(ef => ef.type === 'status' && ef.statusId === 'chilled');
    if (!existingChilled) {
      const chDur = e.match(/chilled\s+([\d.]+)\s*s/);
      effects.push({ type: 'status', statusId: 'chilled', duration: chDur ? parseFloat(chDur[1]) : 1.5 });
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

  // zone N m, D s
  const zone = e.match(/zone\s+([\d.]+)\s*m,\s*([\d.]+)\s*s/);
  if (zone) {
    const zoneRadius = parseFloat(zone[1]);
    const zoneDur = parseFloat(zone[2]);
    const zoneEffect = {
      type: 'zone',
      radius: zoneRadius,
      duration: zoneDur,
      every: 1,
      effects: [],
    };
    // Check for zone damage effect
    const zoneDmg = e.match(/damage\s+([\d.]+)-([\d.]+)\s*\+\s*([\d.]+)\/nv/);
    if (zoneDmg) {
      zoneEffect.effects.push({
        type: 'damage',
        min: parseInt(zoneDmg[1]),
        max: parseInt(zoneDmg[2]),
        perLevel: parseFloat(zoneDmg[3]),
        element: elem,
        scaling: 0.3,
      });
    }
    // Check for static_charge in zone
    if (e.includes('static_charge')) {
      const scDur = e.match(/static_charge\s+([\d.]+)\s*s/);
      zoneEffect.effects.push({ type: 'status', statusId: 'static_charge', duration: scDur ? parseFloat(scDur[1]) : 2 });
    }
    // Check for chilled in zone
    if (e.includes('chilled') && !e.includes('zoneDmg')) {
      const chDur = e.match(/chilled\s+([\d.]+)\s*s/);
      zoneEffect.effects.push({ type: 'status', statusId: 'chilled', duration: chDur ? parseFloat(chDur[1]) : 2 });
    }
    // Check for disoriented in zone
    if (e.includes('disoriented')) {
      zoneEffect.effects.push({ type: 'status', statusId: 'disoriented', duration: 2 });
    }
    effects.push(zoneEffect);
  }

  // zone N m, D s (sin cambio) — mist_veil
  const zoneNoChange = e.match(/zone\s+([\d.]+)\s*m,\s*([\d.]+)\s*s\s*\(sin cambio\)/);
  if (zoneNoChange) {
    effects.push({
      type: 'zone',
      radius: parseFloat(zoneNoChange[1]),
      duration: parseFloat(zoneNoChange[2]),
      every: 1,
      effects: [{ type: 'status', statusId: 'disoriented', duration: 2 }],
    });
  }

  // power +N % D s
  const power = e.match(/power\s*\+([\d.]+)\s*%/);
  if (power) {
    const dur = e.match(/([\d.]+)\s*s/);
    effects.push({
      type: 'power',
      value: parseFloat(power[1]),
      duration: dur ? parseFloat(dur[1]) : 8,
    });
  }

  // critChance +N %
  const cc = e.match(/critChance\s*\+([\d.]+)\s*%/);
  if (cc) {
    effects.push({ type: 'critChance', value: parseFloat(cc[1]), duration: 8 });
  }

  // critDamage +N
  const cd = e.match(/critDamage\s*\+([\d.]+)/);
  if (cd) {
    effects.push({ type: 'critDamage', value: parseFloat(cd[1]), duration: 8 });
  }

  // fixedDamage 0 + N/nv
  const fd = e.match(/fixedDamage\s+0\s*\+\s*([\d.]+)\/nv/);
  if (fd) {
    effects.push({ type: 'fixedDamage', value: 0, perLevel: parseFloat(fd[1]), duration: 8 });
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

  // regeneration N s
  const regen = e.match(/regeneration\s+([\d.]+)\s*s/);
  if (regen) {
    effects.push({ type: 'status', statusId: 'regeneration', duration: parseFloat(regen[1]) });
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

  // dispel kind buff
  if (e.includes('dispel kind buff')) {
    effects.push({ type: 'dispel', kind: 'buff' });
  }

  // status iron_shout
  if (e.includes('status iron_shout')) {
    effects.push({ type: 'status', statusId: 'iron_shout', duration: 8 });
  }

  // status storm_focus
  if (e.includes('status storm_focus')) {
    effects.push({ type: 'status', statusId: 'storm_focus', duration: 8 });
  }

  // status storm_mirror
  if (e.includes('status storm_mirror')) {
    effects.push({ type: 'status', statusId: 'storm_mirror', duration: 12 });
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

  // status haste N s
  if (e.includes('status haste')) {
    const dur = e.match(/haste\s+([\d.]+)\s*s/);
    effects.push({ type: 'status', statusId: 'haste', duration: dur ? parseFloat(dur[1]) : 8 });
  }

  // status thorn_ward
  if (e.includes('status thorn_ward')) {
    effects.push({ type: 'status', statusId: 'thorn_ward', duration: 12 });
  }

  // status stone_skin N s
  if (e.includes('status stone_skin')) {
    const dur = e.match(/stone_skin\s+([\d.]+)\s*s/);
    effects.push({ type: 'status', statusId: 'stone_skin', duration: dur ? parseFloat(dur[1]) : 6 });
  }

  // shareDamage
  const sd = e.match(/shareDamage\s+([\d.]+)\s*%/);
  if (sd) {
    const dur = e.match(/([\d.]+)\s*s/);
    effects.push({ type: 'shareDamage', value: parseFloat(sd[1]) / 100, duration: dur ? parseFloat(dur[1]) : 6 });
  }

  return effects;
}

function parseCostCooldown(ccStr) {
  const parts = ccStr.split('·').map(s => s.trim());
  const cost = parseInt(parts[0]);
  const cd = parseFloat(parts[1].replace('s', '').trim());
  return { cost, cooldown: cd };
}

// The 32 Weaver spells from HZ-04d table
const tejedoraSpells = [
  { nv: 1, id: 'spark', name: 'Chispa', elem: 'Rayo', papel: 'Daño', areaAlcance: 'uno · 10 m', cc: '9 · 0 s', effects: 'damage 10–13 + 0,09/nv · selfStack 25 %, máx. 2, 6 s (Carga)' },
  { nv: 1, id: 'frost_nova', name: 'Nova de escarcha', elem: 'Escarcha', papel: 'Control', areaAlcance: 'círculo 3,5 m · cuerpo', cc: '30 · 12 s', effects: 'damage 9–12 + 0,08/nv · rooted (sin cambio)' },
  { nv: 1, id: 'storm_focus', name: 'Enfoque de tormenta', elem: 'Rayo', papel: 'Potenc.', areaAlcance: 'uno mismo', cc: '10 · 16 s', effects: 'status storm_focus (sin cambio)' },
  { nv: 2, id: 'leaden_gale', name: 'Vendaval de plomo', elem: 'Escarcha', papel: 'Daño', areaAlcance: 'cono 6 m 60° · cuerpo', cc: '14 · 7 s', effects: 'damage 9–13 + 0,08/nv · weariness' },
  { nv: 3, id: 'lightning_step', name: 'Paso de relámpago', elem: 'Rayo', papel: 'Control', areaAlcance: 'círculo 0,6 m · 8 m', cc: '15 · 7 s', effects: 'blink (sin cambio)' },
  { nv: 4, id: 'vertigo_whistle', name: 'Silbido de vértigo', elem: 'Aire', papel: 'Control', areaAlcance: 'uno · 9 m', cc: '12 · 9 s', effects: 'damage 8–10 + 0,07/nv · disoriented' },
  { nv: 5, id: 'glacial_lance', name: 'Lanza glacial', elem: 'Escarcha', papel: 'Daño', areaAlcance: 'línea 12×1 m · cuerpo', cc: '22 · 5 s', effects: 'damage 16–22 + 0,14/nv · chilled' },
  { nv: 7, id: 'voltaic_arc', name: 'Arco voltaico', elem: 'Rayo', papel: 'Daño', areaAlcance: 'cono 6 m 70° · cuerpo', cc: '28 · 6 s', effects: 'damage 17–23 + 0,15/nv · stunned 0,8 s' },
  { nv: 9, id: 'frost_recoil', name: 'Retroceso helado', elem: 'Escarcha', papel: 'Control', areaAlcance: 'cono 3,5 m 90° · cuerpo', cc: '16 · 10 s', effects: 'damage 6–8 + 0,05/nv · chilled · recoil' },
  { nv: 11, id: 'storm_mirror', name: 'Espejo de tormenta', elem: 'Rayo', papel: 'Defensa', areaAlcance: 'uno mismo', cc: '20 · 20 s', effects: 'status storm_mirror (sin cambio)' },
  { nv: 13, id: 'storm_swap', name: 'Trueque de tormenta', elem: 'Escarcha', papel: 'Control', areaAlcance: 'uno · 9 m', cc: '18 · 12 s', effects: 'swap · chilled 1,5 s' },
  { nv: 15, id: 'static_field', name: 'Campo estático', elem: 'Rayo', papel: 'Daño', areaAlcance: 'círculo 2,5 m · 10 m', cc: '35 · 10 s', effects: 'zone 2,5 m, 5 s, cada 1 s → damage 6–8 + 0,05/nv · static_charge' },
  { nv: 16, id: 'waterspout', name: 'Remolino de agua', elem: 'Agua', papel: 'Daño', areaAlcance: 'círculo 2,6 m · 11 m', cc: '24 · 7 s', effects: 'damage 16–22 + 0,14/nv · soaked 4 s' },
  { nv: 18, id: 'midday_cinder', name: 'Brasa del mediodía', elem: 'Fuego', papel: 'Daño', areaAlcance: 'círculo 2,6 m · 11 m', cc: '24 · 7 s', effects: 'damage 16–22 + 0,14/nv · burn 3 s' },
  { nv: 20, id: 'clay_spire', name: 'Aguja de arcilla', elem: 'Tierra', papel: 'Daño', areaAlcance: 'uno · 10 m', cc: '20 · 8 s', effects: 'damage 19–25 + 0,16/nv · rooted 1,2 s' },
  { nv: 25, id: 'mist_veil', name: 'Velo de bajareque', elem: 'Aire', papel: 'Control', areaAlcance: 'círculo 3 m · 8 m', cc: '16 · 12 s', effects: 'zone 3 m, 6 s (sin cambio)' },
  { nv: 30, id: 'drizzle_needle', name: 'Aguja de llovizna', elem: 'Agua', papel: 'Daño', areaAlcance: 'uno · 12 m', cc: '10 · 3 s', effects: 'damage 14–19 + 0,11/nv · soaked 4 s' },
  { nv: 40, id: 'woven_power', name: 'Hebra de poder', elem: 'Rayo', papel: 'Potenc.', areaAlcance: 'uno · 10 m', cc: '20 · 24 s', effects: 'power +25 % 8 s, a uno mismo o a un aliado (rango 6: +30 %)', nuevo: true },
  { nv: 50, id: 'spindle_gust', name: 'Huso de viento', elem: 'Aire', papel: 'Daño', areaAlcance: 'línea 5×2 m · 10 m', cc: '18 · 6 s', effects: 'damage 15–20 + 0,12/nv · knockback · chilled 2 s' },
  { nv: 60, id: 'rain_stitch', name: 'Puntada de lluvia', elem: 'Agua', papel: 'Defensa', areaAlcance: 'círculo 3 m · 8 m', cc: '22 · 14 s', effects: 'heal 19–26 + 0,15/nv · regeneration 4 s' },
  { nv: 70, id: 'dispel_gust', name: 'Ráfaga desechizante', elem: 'Aire', papel: 'Defensa', areaAlcance: 'uno · 10 m', cc: '16 · 14 s', effects: 'dispel kind buff: quita potenciadores y escudos del enemigo', nuevo: true },
  { nv: 80, id: 'loom_roots', name: 'Raíces del telar', elem: 'Tierra', papel: 'Daño', areaAlcance: 'círculo 2,5 m · 10 m', cc: '22 · 8 s', effects: 'damage 17–23 + 0,12/nv · rooted 2,5 s' },
  { nv: 90, id: 'warp_tide', name: 'Urdimbre de marea', elem: 'Agua', papel: 'Daño', areaAlcance: 'línea 6×2 m · 12 m', cc: '24 · 7 s', effects: 'damage 19–26 + 0,14/nv · bonusVsStatus soaked +40 %, consume' },
  { nv: 100, id: 'kiln_thread', name: 'Hilo de fogón', elem: 'Fuego', papel: 'Daño', areaAlcance: 'uno · 12 m', cc: '22 · 8 s', effects: 'damage 26–35 + 0,18/nv · bonusVsStatus burn +50 %, consume', nuevo: true },
  { nv: 110, id: 'dry_lightning', name: 'Rayo seco', elem: 'Fuego', papel: 'Daño', areaAlcance: 'cono 6 m 70° · 12 m', cc: '30 · 8 s', effects: 'damage 29–40 + 0,2/nv' },
  { nv: 120, id: 'charged_loom', name: 'Telar cargado', elem: 'Rayo', papel: 'Potenc.', areaAlcance: 'uno · 10 m', cc: '22 · 30 s', effects: 'critChance +15 % · critDamage +0,15, 8 s, a uno mismo o a un aliado', nuevo: true },
  { nv: 135, id: 'landslip', name: 'Derrumbe', elem: 'Tierra', papel: 'Daño', areaAlcance: 'línea 7×2,5 m · 12 m', cc: '28 · 9 s', effects: 'damage 26–35 + 0,17/nv · knockback' },
  { nv: 150, id: 'gale_tempo', name: 'Compás de viento', elem: 'Aire', papel: 'Potenc.', areaAlcance: 'uno · 10 m', cc: '20 · 30 s', effects: 'haste 6 s · fixedDamage 0 + 0,03/nv, 8 s, a uno mismo o a un aliado', nuevo: true },
  { nv: 165, id: 'null_veil', name: 'Velo nulo', elem: 'Escarcha', papel: 'Defensa', areaAlcance: 'uno · 10 m', cc: '22 · 30 s', effects: 'status ward_melee 3 s (invulnerable cuerpo a cuerpo), a uno mismo o a un aliado', nuevo: true },
  { nv: 180, id: 'thunder_weave', name: 'Tejido de trueno', elem: 'Rayo', papel: 'Daño', areaAlcance: 'estrella 3 m · 12 m', cc: '32 · 10 s', effects: 'damage 29–40 + 0,18/nv · static_charge 3 s' },
  { nv: 190, id: 'cloudburst', name: 'Reventón de nube', elem: 'Agua', papel: 'Daño', areaAlcance: 'círculo 3,5 m · 15 m', cc: '35 · 12 s', effects: 'damage 33–45 + 0,2/nv · soaked 4 s' },
  { nv: 200, id: 'tempest_crown', name: 'Corona de tempestad', elem: 'Rayo', papel: 'Daño', areaAlcance: 'círculo 4 m · cuerpo', cc: '40 · 20 s', effects: 'damage 41–55 + 0,24/nv · stunned 1 s' },
];

const ICONS = {
  spark: '⚡', frost_nova: '❄️', storm_focus: '🌩️', leaden_gale: '🌬️',
  lightning_step: '⚡', vertigo_whistle: '🌪️', glacial_lance: '🗡️', voltaic_arc: '⚡',
  frost_recoil: '❄️', storm_mirror: '🪞', storm_swap: '🔄', static_field: '⚡',
  waterspout: '🌊', midday_cinder: '🔥', clay_spire: '🪨', mist_veil: '🌫️',
  drizzle_needle: '💧', woven_power: '⚡', spindle_gust: '🌬️', rain_stitch: '💧',
  dispel_gust: '🌬️', loom_roots: '🌿', warp_tide: '🌊', kiln_thread: '🔥',
  dry_lightning: '⚡', charged_loom: '⚡', landslip: '🪨', gale_tempo: '🌬️',
  null_veil: '🛡️', thunder_weave: '⚡', cloudburst: '🌧️', tempest_crown: '👑',
};

function getDescription(s) {
  const descs = {
    spark: 'Golpe rápido de rayo con carga acumulativa. Cada lanzamiento suma daño al siguiente.',
    frost_nova: 'Explosión de escarcha que inmoviliza a los enemigos cercanos.',
    storm_focus: 'Concéntrate para mejorar tu siguiente hechizo. Efecto de enfoque.',
    leaden_gale: 'Golpe de escarcha en cono que agota a los enemigos.',
    lightning_step: 'Telepórtate a una casilla vacía a distancia.',
    vertigo_whistle: 'Silbido que desorienta al enemigo a distancia.',
    glacial_lance: 'Lanza un proyectil de escarcha en línea recta que hiela.',
    voltaic_arc: 'Arco de electricidad en cono que aturde brevemente.',
    frost_recoil: 'Retrocede dejando un cono de escarcha que hiela.',
    storm_mirror: 'Refleja los hechizos enemigos durante unos segundos.',
    storm_swap: 'Cambia de posición con un enemigo y lo hiela.',
    static_field: 'Crea un campo eléctrico que daña y deja carga estática a los enemigos dentro.',
    waterspout: 'Lanza un remolino de agua que empapa a los enemigos.',
    midday_cinder: 'Lanza una brasa de fuego que quema a los enemigos.',
    clay_spire: 'Dispara una aguja de arcilla que inmoviliza al objetivo.',
    mist_veil: 'Crea una nube de niebla que oculta el área.',
    drizzle_needle: 'Golpe de agua a larga distancia que empapa.',
    woven_power: 'Potencia a un aliado o a ti mismo con la energía de la tormenta.',
    spindle_gust: 'Ráfaga de viento que empuja y hiela a los enemigos.',
    rain_stitch: 'Cura en área y deja regeneración.',
    dispel_gust: 'Ráfaga que quita potenciadores y escudos del enemigo.',
    loom_roots: 'Raíces de tierra que brotan y inmovilizan a los enemigos.',
    warp_tide: 'Línea de agua que pega más a los empapados.',
    kiln_thread: 'Hilo de fuego que pega más a los quemados.',
    dry_lightning: 'Rayo seco en cono que daña sin dejar marca.',
    charged_loom: 'Aumenta tu probabilidad y daño crítico durante varios segundos.',
    landslip: 'Derrumbe de tierra en línea que empuja a los enemigos.',
    gale_tempo: 'Velocidad y daño fijo para ti o un aliado.',
    null_veil: 'Te hace invulnerable al daño cuerpo a cuerpo durante unos segundos.',
    thunder_weave: 'Tejido de rayo en estrella que deja carga estática.',
    cloudburst: 'Explosión de agua a larga distancia que empapa.',
    tempest_crown: 'La tormenta más poderosa: aturde y daña en área.',
  };
  return descs[s.id] || 'Hechizo de la Tejedora.';
}

function getDescriptionEn(s) {
  const descs = {
    spark: 'Fast lightning strike with stacking charge. Each cast adds damage to the next.',
    frost_nova: 'Frost explosion that immobilizes nearby enemies.',
    storm_focus: 'Focus to improve your next spell. Focus effect.',
    leaden_gale: 'Cone ice strike that exhausts enemies.',
    lightning_step: 'Teleport to an empty tile at range.',
    vertigo_whistle: 'Whistle that disorients a distant enemy.',
    glacial_lance: 'Fire a line ice projectile that chills.',
    voltaic_arc: 'Lightning arc in a cone that briefly stuns.',
    frost_recoil: 'Recoil leaving a cone of ice that chills.',
    storm_mirror: 'Reflect enemy spells for a few seconds.',
    storm_swap: 'Swap positions with an enemy and chill them.',
    static_field: 'Create an electric field that damages and leaves static charge on enemies inside.',
    waterspout: 'Launch a water whirlwind that soaks enemies.',
    midday_cinder: 'Launch a fire ember that burns enemies.',
    clay_spire: 'Fire a clay spike that immobilizes the target.',
    mist_veil: 'Create a fog cloud that obscures the area.',
    drizzle_needle: 'Long-range water strike that soaks.',
    woven_power: 'Empower an ally or yourself with storm energy.',
    spindle_gust: 'Wind gust that pushes and chills enemies.',
    rain_stitch: 'Heal in an area and leave regeneration.',
    dispel_gust: 'Gust that removes buffs and shields from the enemy.',
    loom_roots: 'Earth roots that sprout and immobilize enemies.',
    warp_tide: 'Line of water that hits soaked targets harder.',
    kiln_thread: 'Fire thread that hits burned targets harder.',
    dry_lightning: 'Cone of dry lightning that damages without leaving a mark.',
    charged_loom: 'Increase your critical chance and damage for several seconds.',
    landslip: 'Earth slide in a line that pushes enemies.',
    gale_tempo: 'Speed and fixed damage for yourself or an ally.',
    null_veil: 'Makes you immune to melee damage for a few seconds.',
    thunder_weave: 'Lightning weave in a star pattern that leaves static charge.',
    cloudburst: 'Long-range water explosion that soaks.',
    tempest_crown: 'The most powerful storm: stuns and damages in an area.',
  };
  return descs[s.id] || 'Weaver spell.';
}

function getNameEn(s) {
  const names = {
    spark: 'Spark', frost_nova: 'Frost Nova', storm_focus: 'Storm Focus',
    leaden_gale: 'Leaden Gale', lightning_step: 'Lightning Step', vertigo_whistle: 'Vertigo Whistle',
    glacial_lance: 'Glacial Lance', voltaic_arc: 'Voltaic Arc', frost_recoil: 'Frost Recoil',
    storm_mirror: 'Storm Mirror', storm_swap: 'Storm Swap', static_field: 'Static Field',
    waterspout: 'Waterspout', midday_cinder: 'Midday Cinder', clay_spire: 'Clay Spire',
    mist_veil: 'Mist Veil', drizzle_needle: 'Drizzle Needle', woven_power: 'Woven Power',
    spindle_gust: 'Spindle Gust', rain_stitch: 'Rain Stitch', dispel_gust: 'Dispel Gust',
    loom_roots: 'Loom Roots', warp_tide: 'Warp Tide', kiln_thread: 'Kiln Thread',
    dry_lightning: 'Dry Lightning', charged_loom: 'Charged Loom', landslip: 'Landslip',
    gale_tempo: 'Gale Tempo', null_veil: 'Null Veil', thunder_weave: 'Thunder Weave',
    cloudburst: 'Cloudburst', tempest_crown: 'Tempest Crown',
  };
  return names[s.id] || s.name;
}

let updated = 0;
let added = 0;

for (const s of tejedoraSpells) {
  const { cost, cooldown } = parseCostCooldown(s.cc);
  const range = parseRange(s.areaAlcance);
  const area = parseAreaFromCol(s.areaAlcance);
  const effects = parseEffects(s.effects, s.elem, s.papel);

  const spell = {
    name: s.name,
    description: getDescription(s),
    icon: ICONS[s.id] || '✨',
    element: ELEM[s.elem] || s.elem.toLowerCase(),
    classId: 'storm_weaver',
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

  // Ally-targetable buffs
  if (s.id === 'woven_power' || s.id === 'charged_loom' || s.id === 'gale_tempo' || s.id === 'null_veil') {
    spell.friendlyFire = false;
    spell.allyTargetable = true;
  }

  if (spells.spells[s.id]) {
    const old = spells.spells[s.id];
    if (old.globalCooldown) spell.globalCooldown = old.globalCooldown;
    if (old.projectileSpeed !== undefined) spell.projectileSpeed = old.projectileSpeed;
    if (old.friendlyFire !== undefined) spell.friendlyFire = old.friendlyFire;
    if (old.castWhileMoving !== undefined) spell.castWhileMoving = old.castWhileMoving;
    // Preserve atTarget from old area only if the old spell had range > 0 (targeted at a point)
    if (old.area && old.area.atTarget && old.range > 0 && spell.area && spell.area.type === 'circle') {
      spell.area.atTarget = true;
    }
    spells.spells[s.id] = spell;
    updated++;
  } else {
    spells.spells[s.id] = spell;
    added++;
  }

  // i18n
  const nameKey = `spell.${s.id}.name`;
  const descKey = `spell.${s.id}.description`;
  i18n[nameKey] = getNameEn(s);
  i18n[descKey] = getDescriptionEn(s);
  const desc = getDescription(s);
  if (!i18n[desc]) {
    i18n[desc] = getDescriptionEn(s);
  }
  if (!i18n[s.name]) {
    i18n[s.name] = getNameEn(s);
  }
}

writeFileSync(spellsPath, JSON.stringify(spells, null, 2) + '\n');
writeFileSync(i18nPath, JSON.stringify(i18n, null, 2) + '\n');

console.log(`HZ-04c-tejedora: ${updated} actualizados, ${added} nuevos. Total: ${updated + added}/32`);
console.log('IDs nuevos:', tejedoraSpells.filter(s => s.nuevo).map(s => s.id).join(', '));
