// Validación de perfiles visuales por hechizo (data/spell-fx.json).
import spellFxJson from '../../data/spell-fx.json';
import { ELEMENTS, type Element } from '../rpg/contracts';
import type { SpellFxProfile } from '../render/fx/spellProfile';
import { Reader } from './validate';

export function parseSpellFx(raw: unknown): Record<string, SpellFxProfile> {
  const r = new Reader('spell-fx.json');
  const o = r.obj(raw);
  const profiles = r.obj(o['profiles']);
  const out: Record<string, SpellFxProfile> = {};

  for (const [id, rawProfile] of Object.entries(profiles)) {
    const pr = r.child(id);
    const p = pr.obj(rawProfile);
    const element = pr.str(p, 'element', ELEMENTS) as Element;

    // Anticipation
    const ant = pr.child('anticipation');
    const ap = ant.obj(p['anticipation']);
    const handBurst = parseBurstOptions(ant, ap, 'handBurst');
    const groundRing = parseRingDef(ant, ap, 'groundRing');

    // Cast
    const cast = pr.child('cast');
    const cp = cast.obj(p['cast']);
    const castPhase: any = {
      projectile: cp['projectile'] ? parseProjectileDef(cast, cp, 'projectile') : undefined,
      trail: cp['trail'] ? parseTrailOptions(cast, cp, 'trail') : undefined,
      ring: cp['ring'] ? parseRingDef(cast, cp, 'ring') : undefined,
      waveRing: cp['waveRing'] ? parseRingDef(cast, cp, 'waveRing') : undefined,
      cone: cp['cone'] ? parseConeMeshDef(cast, cp, 'cone') : undefined,
      upwardParticles: cp['upwardParticles'] ? parseBurstOptions(cast, cp, 'upwardParticles') : undefined,
      frostParticles: cp['frostParticles'] ? parseBurstOptions(cast, cp, 'frostParticles') : undefined,
      swirlParticles: cp['swirlParticles'] ? parseBurstOptions(cast, cp, 'swirlParticles') : undefined,
      emberParticles: cp['emberParticles'] ? parseBurstOptions(cast, cp, 'emberParticles') : undefined,
      crystalParticles: cp['crystalParticles'] ? parseBurstOptions(cast, cp, 'crystalParticles') : undefined,
      windParticles: cp['windParticles'] ? parseBurstOptions(cast, cp, 'windParticles') : undefined,
      waterParticles: cp['waterParticles'] ? parseBurstOptions(cast, cp, 'waterParticles') : undefined,
      decal: cp['decal'] ? parseDecalDef(cast, cp, 'decal') : undefined,
    };

    // Impact
    const imp = pr.child('impact');
    const ip = imp.obj(p['impact']);
    const burst = parseBurstOptions(imp, ip, 'burst');
    const impactPhase: any = {
      burst,
      ring: ip['ring'] ? parseRingDef(imp, ip, 'ring') : undefined,
      decal: ip['decal'] ? parseDecalDef(imp, ip, 'decal') : undefined,
      splash: ip['splash'] ? parseBurstOptions(imp, ip, 'splash') : undefined,
      crystals: ip['crystals'] ? parseBurstOptions(imp, ip, 'crystals') : undefined,
      iceShards: ip['iceShards'] ? parseBurstOptions(imp, ip, 'iceShards') : undefined,
      glow: ip['glow'] ? parseBurstOptions(imp, ip, 'glow') : undefined,
      slashLines: ip['slashLines'] ? parseSlashLinesDef(imp, ip, 'slashLines') : undefined,
      frostLine: ip['frostLine'] ? parseFrostLineDef(imp, ip, 'frostLine') : undefined,
    };

    // Dissipation
    const diss = pr.child('dissipation');
    const dp = diss.obj(p['dissipation']);
    const dissipation: any = {
      embers: dp['embers'] ? parseBurstOptions(diss, dp, 'embers') : undefined,
      frostMist: dp['frostMist'] ? parseBurstOptions(diss, dp, 'frostMist') : undefined,
      windMist: dp['windMist'] ? parseBurstOptions(diss, dp, 'windMist') : undefined,
      mist: dp['mist'] ? parseBurstOptions(diss, dp, 'mist') : undefined,
      fadeParticles: dp['fadeParticles'] ? parseBurstOptions(diss, dp, 'fadeParticles') : undefined,
    };

    out[id] = {
      element,
      anticipation: { handBurst, groundRing },
      cast: castPhase,
      impact: impactPhase,
      dissipation,
    };
  }

  return out;
}

function parseBurstOptions(parent: any, obj: any, key: string) {
  const c = parent.child(key);
  const b = c.obj(obj[key]);
  return {
    count: c.num(b, 'count', { int: true, min: 0, max: 200 }),
    color: readRgb(c, b, 'color'),
    core: readRgb(c, b, 'core'),
    radius: b['radius'] !== undefined ? c.num(b, 'radius', { min: 0, max: 10 }) : undefined,
    upward: b['upward'] ?? false,
    speed: readRange(c, b, 'speed'),
    size: b['size'] ? readRange(c, b, 'size') : undefined,
    life: b['life'] ? readRange(c, b, 'life') : undefined,
    gravity: b['gravity'] !== undefined ? c.num(b, 'gravity', { min: -10, max: 10 }) : undefined,
  };
}

function parseTrailOptions(parent: any, obj: any, key: string) {
  const c = parent.child(key);
  const b = c.obj(obj[key]);
  const burst: any = {
    count: c.num(b, 'count', { int: true, min: 0, max: 200 }),
    color: readRgb(c, b, 'color'),
    core: readRgb(c, b, 'core'),
    radius: b['radius'] !== undefined ? c.num(b, 'radius', { min: 0, max: 10 }) : undefined,
    upward: b['upward'] ?? false,
    speed: readRange(c, b, 'speed'),
    size: b['size'] ? readRange(c, b, 'size') : undefined,
    life: b['life'] ? readRange(c, b, 'life') : undefined,
    gravity: b['gravity'] !== undefined ? c.num(b, 'gravity', { min: -10, max: 10 }) : undefined,
  };
  return { ...burst, rate: c.num(b, 'rate', { min: 0, max: 500 }) };
}

function parseRingDef(parent: any, obj: any, key: string) {
  const c = parent.child(key);
  const r = c.obj(obj[key]);
  return {
    type: 'ring' as const,
    diameter: c.num(r, 'diameter', { min: 0.1, max: 20 }),
    thickness: c.num(r, 'thickness', { min: 0.01, max: 2 }),
    color: readRgb(c, r, 'color'),
    alpha: c.num(r, 'alpha', { min: 0, max: 1 }),
    growTo: c.num(r, 'growTo', { min: 0, max: 5 }),
    duration: c.num(r, 'duration', { min: 0.01, max: 5 }),
    rotateSpeed: r['rotateSpeed'] !== undefined ? c.num(r, 'rotateSpeed', { min: -10, max: 10 }) : undefined,
  };
}

function parseProjectileDef(parent: any, obj: any, key: string) {
  const c = parent.child(key);
  const p = c.obj(obj[key]);
  const type = c.str(p, 'type', ['sphere', 'cylinder']);
  return {
    type,
    diameter: p['diameter'] !== undefined ? c.num(p, 'diameter', { min: 0.01, max: 5 }) : undefined,
    height: p['height'] !== undefined ? c.num(p, 'height', { min: 0.01, max: 10 }) : undefined,
    diameterTop: p['diameterTop'] !== undefined ? c.num(p, 'diameterTop', { min: 0, max: 5 }) : undefined,
    diameterBottom: p['diameterBottom'] !== undefined ? c.num(p, 'diameterBottom', { min: 0.01, max: 5 }) : undefined,
    color: readRgb(c, p, 'color'),
    core: readRgb(c, p, 'core'),
  };
}

function parseConeMeshDef(parent: any, obj: any, key: string) {
  const c = parent.child(key);
  const p = c.obj(obj[key]);
  return {
    type: 'cone_mesh' as const,
    height: c.num(p, 'height', { min: 0.1, max: 20 }),
    diameter: c.num(p, 'diameter', { min: 0.1, max: 20 }),
    color: readRgb(c, p, 'color'),
    alpha: c.num(p, 'alpha', { min: 0, max: 1 }),
    fadeSeconds: c.num(p, 'fadeSeconds', { min: 0.01, max: 5 }),
  };
}

function parseDecalDef(parent: any, obj: any, key: string) {
  const c = parent.child(key);
  const p = c.obj(obj[key]);
  const type = c.str(p, 'type', ['disc', 'cone_decal', 'line_decal']);
  return {
    type,
    radius: p['radius'] !== undefined ? c.num(p, 'radius', { min: 0.1, max: 20 }) : undefined,
    width: p['width'] !== undefined ? c.num(p, 'width', { min: 0.01, max: 10 }) : undefined,
    color: readRgb(c, p, 'color'),
    alpha: c.num(p, 'alpha', { min: 0, max: 1 }),
    fadeSeconds: c.num(p, 'fadeSeconds', { min: 0.01, max: 10 }),
  };
}

function parseSlashLinesDef(parent: any, obj: any, key: string) {
  const c = parent.child(key);
  const p = c.obj(obj[key]);
  return {
    count: c.num(p, 'count', { int: true, min: 1, max: 20 }),
    type: 'lines' as const,
    length: c.num(p, 'length', { min: 0.1, max: 10 }),
    color: readRgb(c, p, 'color'),
    alpha: c.num(p, 'alpha', { min: 0, max: 1 }),
    fadeSeconds: c.num(p, 'fadeSeconds', { min: 0.01, max: 5 }),
  };
}

function parseFrostLineDef(parent: any, obj: any, key: string) {
  const c = parent.child(key);
  const p = c.obj(obj[key]);
  return {
    type: 'line_decal' as const,
    width: c.num(p, 'width', { min: 0.01, max: 5 }),
    color: readRgb(c, p, 'color'),
    alpha: c.num(p, 'alpha', { min: 0, max: 1 }),
    fadeSeconds: c.num(p, 'fadeSeconds', { min: 0.01, max: 10 }),
  };
}

function readRgb(parent: any, obj: any, key: string): [number, number, number] {
  const arr = parent.arr(obj, key);
  if (arr.length !== 3) parent.fail(key, 'se esperaba [r, g, b]');
  return [
    parent.num(arr, 0, { min: 0, max: 1 }),
    parent.num(arr, 1, { min: 0, max: 1 }),
    parent.num(arr, 2, { min: 0, max: 1 }),
  ];
}

function readRange(parent: any, obj: any, key: string): [number, number] {
  const arr = parent.arr(obj, key);
  if (arr.length !== 2) parent.fail(key, 'se esperaba [min, max]');
  return [parent.num(arr, 0, { min: 0, max: 100 }), parent.num(arr, 1, { min: 0, max: 100 })];
}

export function loadSpellFx(): Record<string, SpellFxProfile> {
  return parseSpellFx(spellFxJson);
}
