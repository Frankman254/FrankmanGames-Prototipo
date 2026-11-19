#!/usr/bin/env node
/**
 * HZ-04c-cazador: Genera los 32 hechizos del Cazador del Manglar
 * desde la tabla HZ-04d de docs/diseno/03_HECHIZOS_Y_RANGOS.md.
 *
 * Replica el patrón de hz04c_tejedora.mjs.
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

  // weariness N s
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

  // chain N saltos, R m, falloff, onlyStatus
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
    const onlyStatus = e.match(/onlyStatus\s+(\w+)/);
    if (onlyStatus) chainEffect.onlyStatus = onlyStatus[1];
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

  // blink
  if (e.includes('blink')) {
    effects.push({ type: 'blink', maxDistance: 8 });
  }

  // recoil
  if (e.includes('recoil') && !e.includes('pushDamage')) {
    effects.push({ type: 'recoil', distance: 5 });
  }

  // dash
  if (e.includes('dash')) {
    effects.push({ type: 'dash', distance: 5 });
  }

  // swap
  if (e.includes('swap') && !e.includes('storm_swap')) {
    effects.push({ type: 'swap' });
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

  // zone N m, D s (sin cambio) — charcoal_cloud, tar_arrow
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

  // trap → rooted N s
  if (e.includes('trap →')) {
    const trapRooted = e.match(/rooted\s+([\d.]+)\s*s/);
    effects.push({
      type: 'trap',
      radius: 0.8,
      duration: 10,
      effects: [{ type: 'status', statusId: 'rooted', duration: trapRooted ? parseFloat(trapRooted[1]) : 2 }],
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

  // status hawk_eye
  if (e.includes('status hawk_eye')) {
    effects.push({ type: 'status', statusId: 'hawk_eye', duration: 8 });
  }

  // status thorn_ward
  if (e.includes('status thorn_ward')) {
    effects.push({ type: 'status', statusId: 'thorn_ward', duration: 12 });
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
  if (e.includes('haste')) {
    const dur = e.match(/haste\s+([\d.]+)\s*s/);
    effects.push({ type: 'status', statusId: 'haste', duration: dur ? parseFloat(dur[1]) : 6 });
  }

  // shareDamage
  const sd = e.match(/shareDamage\s+([\d.]+)\s*%/);
  if (sd) {
    const dur = e.match(/([\d.]+)\s*s/);
    effects.push({ type: 'shareDamage', percent: parseFloat(sd[1]) / 100, duration: dur ? parseFloat(dur[1]) : 6 });
  }

  return effects;
}

function parseCostCooldown(ccStr) {
  const parts = ccStr.split('·').map(s => s.trim());
  const cost = parseInt(parts[0]);
  const cd = parseFloat(parts[1].replace('s', '').trim());
  return { cost, cooldown: cd };
}

// The 32 Hunter spells from HZ-04d table
const cazadorSpells = [
  { nv: 1, id: 'hunter_arrow', name: 'Flecha de caza', elem: 'Aire', papel: 'Daño', areaAlcance: 'uno · 13 m', cc: '8 · 0 s', effects: 'damage 9–12 + 0,08/nv · selfStack 25 %, máx. 2, 6 s (Carga)' },
  { nv: 1, id: 'powder_arrow', name: 'Flecha de pólvora', elem: 'Fuego', papel: 'Daño', areaAlcance: 'círculo 2,4 m · 11 m', cc: '16 · 6 s', effects: 'damage 12–17 + 0,11/nv · burn 3 s' },
  { nv: 1, id: 'hawk_eye', name: 'Ojo de halcón', elem: 'Aire', papel: 'Potenc.', areaAlcance: 'uno mismo', cc: '10 · 16 s', effects: 'status hawk_eye (sin cambio)' },
  { nv: 3, id: 'reed_cross', name: 'Cruz de junco', elem: 'Tierra', papel: 'Daño', areaAlcance: 'cruz 3 m · 10 m', cc: '14 · 5 s', effects: 'damage 12–17 + 0,11/nv' },
  { nv: 4, id: 'gale_star', name: 'Estrella de vendaval', elem: 'Aire', papel: 'Daño', areaAlcance: 'estrella 3,2 m · 12 m', cc: '16 · 7 s', effects: 'damage 15–20 + 0,13/nv' },
  { nv: 5, id: 'piercing_shot', name: 'Disparo perforante', elem: 'Agua', papel: 'Daño', areaAlcance: 'línea 15×1 m · cuerpo', cc: '15 · 6 s', effects: 'damage 15–21 + 0,13/nv' },
  { nv: 7, id: 'vine_arrow', name: 'Flecha de enredadera', elem: 'Tierra', papel: 'Control', areaAlcance: 'uno · 12 m', cc: '12 · 8 s', effects: 'damage 7–10 + 0,06/nv · rooted 1,5 s' },
  { nv: 9, id: 'heron_leap', name: 'Salto de garza', elem: 'Aire', papel: 'Control', areaAlcance: 'cono 3 m 70° · cuerpo', cc: '10 · 10 s', effects: 'damage 5–7 + 0,04/nv · recoil' },
  { nv: 11, id: 'powder_dash', name: 'Carga de pólvora', elem: 'Fuego', papel: 'Control', areaAlcance: 'línea 7×1,4 m · cuerpo', cc: '14 · 9 s', effects: 'damage 7–9 + 0,06/nv · dash' },
  { nv: 12, id: 'arrow_downpour', name: 'Lluvia de flechas', elem: 'Agua', papel: 'Daño', areaAlcance: 'círculo 4 m · 12 m', cc: '24 · 12 s', effects: 'damage 15–20 + 0,13/nv · soaked 6 s' },
  { nv: 14, id: 'thorn_ward', name: 'Guardia de espinas', elem: 'Tierra', papel: 'Defensa', areaAlcance: 'uno mismo', cc: '14 · 18 s', effects: 'status thorn_ward (sin cambio)' },
  { nv: 16, id: 'estuary_arrow', name: 'Flecha de estero', elem: 'Agua', papel: 'Daño', areaAlcance: 'círculo 2,2 m · 12 m', cc: '18 · 7 s', effects: 'damage 14–19 + 0,12/nv · soaked 4 s' },
  { nv: 18, id: 'dew_arrow', name: 'Flecha de rocío', elem: 'Escarcha', papel: 'Daño', areaAlcance: 'círculo 2,2 m · 12 m', cc: '18 · 7 s', effects: 'damage 14–19 + 0,12/nv · chilled 2 s' },
  { nv: 20, id: 'lightning_arrow', name: 'Flecha de relámpago', elem: 'Rayo', papel: 'Daño', areaAlcance: 'línea 14×1,2 m · cuerpo', cc: '21 · 8 s', effects: 'damage 18–25 + 0,15/nv · static_charge 4 s' },
  { nv: 25, id: 'steady_aim', name: 'Pulso firme', elem: 'Aire', papel: 'Potenc.', areaAlcance: 'uno mismo', cc: '20 · 30 s', effects: 'critChance +15 % · critDamage +0,15 · fixedDamage 0 + 0,03/nv, 8 s (Puntería)', nuevo: true },
  { nv: 30, id: 'cold_snare', name: 'Lazo de sereno', elem: 'Escarcha', papel: 'Control', areaAlcance: 'círculo 0,8 m · 8 m', cc: '12 · 6 s', effects: 'trap → rooted 2 s · damage (sin cambio)' },
  { nv: 35, id: 'eel_arrow', name: 'Flecha de anguila', elem: 'Rayo', papel: 'Daño', areaAlcance: 'uno · 14 m', cc: '14 · 4 s', effects: 'damage 14–18 + 0,11/nv · chain 2 saltos, onlyStatus soaked' },
  { nv: 40, id: 'tar_arrow', name: 'Flecha de brea', elem: 'Fuego', papel: 'Daño', areaAlcance: 'círculo 2 m · 12 m', cc: '16 · 6 s', effects: 'damage 9–12 + 0,07/nv · zone 2 m, 5 s (sin cambio)' },
  { nv: 50, id: 'mud_cloak', name: 'Capa de fango', elem: 'Tierra', papel: 'Defensa', areaAlcance: 'uno mismo', cc: '18 · 30 s', effects: 'status ward_melee 3 s (invulnerable cuerpo a cuerpo)', nuevo: true },
  { nv: 60, id: 'tide_pull', name: 'Resaca', elem: 'Agua', papel: 'Control', areaAlcance: 'uno · 12 m', cc: '16 · 8 s', effects: 'pull (sin cambio)' },
  { nv: 70, id: 'heron_feather', name: 'Pluma de garza', elem: 'Escarcha', papel: 'Daño', areaAlcance: 'uno · 14 m', cc: '14 · 5 s', effects: 'damage 19–26 + 0,15/nv · chilled 3 s' },
  { nv: 80, id: 'charcoal_cloud', name: 'Nube de carbón', elem: 'Fuego', papel: 'Control', areaAlcance: 'círculo 3 m · 10 m', cc: '20 · 12 s', effects: 'zone 3 m, 5 s (sin cambio)' },
  { nv: 90, id: 'mangrove_spike', name: 'Púa de mangle', elem: 'Tierra', papel: 'Daño', areaAlcance: 'cruz 3 m · 12 m', cc: '18 · 6 s', effects: 'damage 15–20 + 0,11/nv · rooted 1 s', nuevo: true },
  { nv: 100, id: 'cleansing_arrow', name: 'Flecha limpia', elem: 'Agua', papel: 'Defensa', areaAlcance: 'uno · 12 m', cc: '16 · 14 s', effects: 'dispel kind buff: quita potenciadores y escudos del enemigo', nuevo: true },
  { nv: 110, id: 'fog_arrow', name: 'Flecha de neblina', elem: 'Escarcha', papel: 'Daño', areaAlcance: 'círculo 2,5 m · 14 m', cc: '20 · 6 s', effects: 'damage 18–24 + 0,12/nv · chilled 4 s' },
  { nv: 120, id: 'macabre_shot', name: 'Disparo macabro', elem: 'Aire', papel: 'Potenc.', areaAlcance: 'uno mismo', cc: '24 · 36 s', effects: 'fixedDamage 0 + 0,045/nv · critChance +10 %, 8 s (rango 6: +25 % y power +25 %)', nuevo: true },
  { nv: 135, id: 'kiln_burst', name: 'Horno de mangle', elem: 'Fuego', papel: 'Daño', areaAlcance: 'círculo 3 m · 12 m', cc: '26 · 9 s', effects: 'damage 22–30 + 0,15/nv · bonusVsStatus burn +50 %, consume', nuevo: true },
  { nv: 150, id: 'tether_feather', name: 'Pluma compartida', elem: 'Aire', papel: 'Defensa', areaAlcance: 'uno · 12 m', cc: '20 · 24 s', effects: 'shareDamage 30 %, 6 s: el Cazador carga con parte del daño de un aliado', nuevo: true },
  { nv: 165, id: 'frozen_estuary', name: 'Estero helado', elem: 'Escarcha', papel: 'Daño', areaAlcance: 'círculo 3,5 m · 12 m', cc: '28 · 10 s', effects: 'damage 25–34 + 0,16/nv · zone 3,5 m, 6 s (sin cambio)' },
  { nv: 180, id: 'thunder_flock', name: 'Bandada de trueno', elem: 'Rayo', papel: 'Daño', areaAlcance: 'uno · 14 m', cc: '28 · 10 s', effects: 'damage 30–41 + 0,18/nv · chain 4 saltos, 5 m, −20 %', nuevo: true },
  { nv: 190, id: 'hunt_drum', name: 'Tambor de caza', elem: 'Tierra', papel: 'Potenc.', areaAlcance: 'uno · 12 m', cc: '22 · 30 s', effects: 'power +20 % · haste 6 s, a uno mismo o a un aliado', nuevo: true },
  { nv: 200, id: 'final_quiver', name: 'Carcaj final', elem: 'Aire', papel: 'Daño', areaAlcance: 'estrella 4 m · 15 m', cc: '40 · 20 s', effects: 'damage 48–65 + 0,28/nv' },
];

const ICONS = {
  hunter_arrow: '🏹', powder_arrow: '💥', hawk_eye: '🦅', reed_cross: '✚',
  gale_star: '✦', piercing_shot: '➶', vine_arrow: '🌿', heron_leap: '🦢',
  powder_dash: '🔥', arrow_downpour: '🌧️', thorn_ward: '🌵', estuary_arrow: '🌊',
  dew_arrow: '❄️', lightning_arrow: '⚡', steady_aim: '🎯', cold_snare: '❄️',
  eel_arrow: '⚡', tar_arrow: '🔥', mud_cloak: '🛡️', tide_pull: '🌊',
  heron_feather: '🪶', charcoal_cloud: '💨', mangrove_spike: '🌿', cleansing_arrow: '💧',
  fog_arrow: '🌫️', macabre_shot: '💀', kiln_burst: '🔥', tether_feather: '🪶',
  frozen_estuary: '❄️', thunder_flock: '⚡', hunt_drum: '🥁', final_quiver: '🏹',
};

function getDescription(s) {
  const descs = {
    hunter_arrow: 'Proyectil básico del arco impulsado por viento cortante. Gana carga acumulativa: cada lanzamiento suma daño al siguiente.',
    powder_arrow: 'Una flecha con carga de pólvora que estalla donde cae: daña a todos en un círculo y los deja ardiendo.',
    hawk_eye: 'Afinas la vista del cazador: aumenta tu potencia y la probabilidad de golpe crítico.',
    reed_cross: 'Flecha que estalla en cruz, dañando en cuatro direcciones.',
    gale_star: 'Estrella de viento que daña en múltiples direcciones.',
    piercing_shot: 'Disparo en línea recta que perfora al objetivo.',
    vine_arrow: 'Flecha de enredadera que inmoviliza al objetivo.',
    heron_leap: 'Salto hacia atrás que daña a los enemigos cercanos.',
    powder_dash: 'Carga hacia adelante dejando una estela de pólvora.',
    arrow_downpour: 'Lluvia de flechas que cae en un área grande y empapa a los enemigos.',
    thorn_ward: 'Guardia de espinas que refleja daño a los atacantes.',
    estuary_arrow: 'Flecha de estero que empapa a los enemigos en un área.',
    dew_arrow: 'Flecha de rocío que hiela a los enemigos en un área.',
    lightning_arrow: 'Flecha de relámpago que deja carga estática.',
    steady_aim: 'Concéntrate para mejorar tu puntería: más crítico, más daño crítico y daño fijo.',
    cold_snare: 'Trampa de hielo que inmoviliza a quien la pisa.',
    eel_arrow: 'Flecha de rayo que salta entre enemigos.',
    tar_arrow: 'Flecha de brea que deja un charco ardiente.',
    mud_cloak: 'Capa de fango que te hace invulnerable al daño cuerpo a cuerpo.',
    tide_pull: 'Arrastra al enemigo hacia ti.',
    heron_feather: 'Flecha que hiela y marca al objetivo para un golpe crítico.',
    charcoal_cloud: 'Nube de humo que oculta el área.',
    mangrove_spike: 'Púas de mangle que brotan en cruz e inmovilizan.',
    cleansing_arrow: 'Flecha que quita potenciadores y escudos del enemigo.',
    fog_arrow: 'Flecha de neblina que hiela y frena a los enemigos.',
    macabre_shot: 'Disparo macabro que otorga daño fijo y probabilidad de crítico.',
    kiln_burst: 'Explosión de fuego que pega más a los quemados.',
    tether_feather: 'Enlaza tu vida con la de un aliado: cargas con parte de su daño.',
    frozen_estuary: 'Helada que cubre el suelo y deja una zona de hielo.',
    thunder_flock: 'Bandada de trueno que salta entre múltiples enemigos.',
    hunt_drum: 'Tambor de caza que potencia a un aliado o a ti mismo.',
    final_quiver: 'El último recurso del cazador: estrella de viento devastadora.',
  };
  return descs[s.id] || 'Hechizo del Cazador.';
}

function getDescriptionEn(s) {
  const descs = {
    hunter_arrow: 'Basic wind-driven arrow shot. Gains stacking charge: each cast adds damage to the next.',
    powder_arrow: 'Powder charge arrow that explodes on impact, damaging and burning enemies in an area.',
    hawk_eye: 'Sharpen your hunter sight: increases power and critical hit chance.',
    reed_cross: 'Arrow that explodes in a cross pattern, damaging in four directions.',
    gale_star: 'Wind star that damages in multiple directions.',
    piercing_shot: 'Line shot that pierces the target.',
    vine_arrow: 'Vine arrow that immobilizes the target.',
    heron_leap: 'Backward leap that damages nearby enemies.',
    powder_dash: 'Charge forward leaving a trail of powder.',
    arrow_downpour: 'Rain of arrows falling on a large area, soaking enemies.',
    thorn_ward: 'Thorn guard that reflects damage to attackers.',
    estuary_arrow: 'Estuary arrow that soaks enemies in an area.',
    dew_arrow: 'Dew arrow that chills enemies in an area.',
    lightning_arrow: 'Lightning arrow that leaves static charge.',
    steady_aim: 'Focus to improve your aim: more crit chance, crit damage, and fixed damage.',
    cold_snare: 'Ice trap that immobilizes anyone who steps on it.',
    eel_arrow: 'Lightning arrow that jumps between enemies.',
    tar_arrow: 'Tar arrow that leaves a burning puddle.',
    mud_cloak: 'Mud cloak that makes you immune to melee damage.',
    tide_pull: 'Pull the enemy toward you.',
    heron_feather: 'Arrow that chills and marks the target for a critical hit.',
    charcoal_cloud: 'Smoke cloud that obscures the area.',
    mangrove_spike: 'Mangrove spikes that sprout in a cross pattern and immobilize.',
    cleansing_arrow: 'Arrow that removes buffs and shields from the enemy.',
    fog_arrow: 'Fog arrow that chills and slows enemies.',
    macabre_shot: 'Macabre shot that grants fixed damage and critical chance.',
    kiln_burst: 'Fire explosion that hits burned targets harder.',
    tether_feather: 'Link your life with an ally: you bear part of their damage.',
    frozen_estuary: 'Frost that covers the ground and leaves an ice zone.',
    thunder_flock: 'Thunder flock that jumps between multiple enemies.',
    hunt_drum: 'Hunt drum that empowers an ally or yourself.',
    final_quiver: 'The hunter\'s last resort: devastating wind star.',
  };
  return descs[s.id] || 'Hunter spell.';
}

function getNameEn(s) {
  const names = {
    hunter_arrow: 'Hunter Arrow', powder_arrow: 'Powder Arrow', hawk_eye: 'Hawk Eye',
    reed_cross: 'Reed Cross', gale_star: 'Gale Star', piercing_shot: 'Piercing Shot',
    vine_arrow: 'Vine Arrow', heron_leap: 'Heron Leap', powder_dash: 'Powder Dash',
    arrow_downpour: 'Arrow Downpour', thorn_ward: 'Thorn Ward', estuary_arrow: 'Estuary Arrow',
    dew_arrow: 'Dew Arrow', lightning_arrow: 'Lightning Arrow', steady_aim: 'Steady Aim',
    cold_snare: 'Cold Snare', eel_arrow: 'Eel Arrow', tar_arrow: 'Tar Arrow',
    mud_cloak: 'Mud Cloak', tide_pull: 'Tide Pull', heron_feather: 'Heron Feather',
    charcoal_cloud: 'Charcoal Cloud', mangrove_spike: 'Mangrove Spike', cleansing_arrow: 'Cleansing Arrow',
    fog_arrow: 'Fog Arrow', macabre_shot: 'Macabre Shot', kiln_burst: 'Kiln Burst',
    tether_feather: 'Tether Feather', frozen_estuary: 'Frozen Estuary', thunder_flock: 'Thunder Flock',
    hunt_drum: 'Hunt Drum', final_quiver: 'Final Quiver',
  };
  return names[s.id] || s.name;
}

let updated = 0;
let added = 0;

for (const s of cazadorSpells) {
  const { cost, cooldown } = parseCostCooldown(s.cc);
  const range = parseRange(s.areaAlcance);
  const area = parseAreaFromCol(s.areaAlcance);
  const effects = parseEffects(s.effects, s.elem, s.papel);

  const spell = {
    name: s.name,
    description: getDescription(s),
    icon: ICONS[s.id] || '✨',
    element: ELEM[s.elem] || s.elem.toLowerCase(),
    classId: 'mangrove_hunter',
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
  if (s.id === 'tether_feather' || s.id === 'hunt_drum') {
    spell.friendlyFire = false;
    spell.allyTargetable = true;
  }

  if (spells.spells[s.id]) {
    const old = spells.spells[s.id];
    if (old.globalCooldown) spell.globalCooldown = old.globalCooldown;
    if (old.projectileSpeed !== undefined) spell.projectileSpeed = old.projectileSpeed;
    if (old.friendlyFire !== undefined) spell.friendlyFire = old.friendlyFire;
    if (old.castWhileMoving !== undefined) spell.castWhileMoving = old.castWhileMoving;
    // Preserve atTarget from old area only if the old spell had range > 0
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

console.log(`HZ-04c-cazador: ${updated} actualizados, ${added} nuevos. Total: ${updated + added}/32`);
console.log('IDs nuevos:', cazadorSpells.filter(s => s.nuevo).map(s => s.id).join(', '));
