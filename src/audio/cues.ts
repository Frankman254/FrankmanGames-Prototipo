// Parte pura del audio: qué sonidos dispara cada suceso de la simulación o de la
// sesión, y dónde suenan (paneo y atenuación según la posición respecto al
// jugador y la orientación de la cámara). Sin Web Audio: testeable.
import type { Element, Rarity, SessionEvent } from '../rpg/contracts';
import type { GameEvent } from '../sim/events';
import type { MixDef } from './data';

export interface Cue {
  sound: string;
  /** Posición en el plano XZ; sin ella, suena centrado y sin atenuación. */
  x?: number;
  z?: number;
  /** Multiplicadores sobre la receta. */
  gain?: number;
  pitch?: number;
  /** Segundos de retraso. */
  delay?: number;
  /** No baja de este volumen por distancia (avisos que hay que oír para esquivar). */
  minGain?: number;
}

export interface LootInfo {
  x: number;
  z: number;
  rarity: Rarity;
  gold: number;
  item: boolean;
}

/** Lo que el mapa necesita saber del mundo (lo rellena el director). */
export interface CueContext {
  positionOf(entityId: number): { x: number; z: number } | null;
  elementOf(tag: string | null): Element;
  /** Tipo de golpe del arma del jugador (blade, heavy, blunt, staff, wand, orb, unarmed). */
  weaponKind(): string;
  lootInfo(lootId: number): LootInfo | null;
  /** Corcho de la pesca en curso. */
  bobber(): { x: number; z: number } | null;
  playerId: number;
}

const RARE: readonly Rarity[] = ['rare', 'epic', 'legendary'];

function at(sound: string, p: { x: number; z: number } | null, extra: Partial<Cue> = {}): Cue {
  return p ? { sound, x: p.x, z: p.z, ...extra } : { sound, ...extra };
}

export function cuesForEvent(e: GameEvent, ctx: CueContext): Cue[] {
  const me = ctx.positionOf(ctx.playerId);
  switch (e.type) {
    case 'cast':
      return e.ability === 'basic' ? [at(`swing_${ctx.weaponKind()}`, me)] : [at(`cast_${ctx.elementOf(e.ability)}`, me)];
    case 'damage': {
      const p = ctx.positionOf(e.targetId);
      const el = e.toPlayer && e.ability === null ? 'physical' : ctx.elementOf(e.ability);
      // Los daños periódicos (estados, zonas) suenan más flojos para no saturar.
      const periodic = e.ability !== null && (e.ability.startsWith('status:') || e.ability.startsWith('pet:'));
      const out: Cue[] = [at(`impact_${el}`, p, { gain: periodic ? 0.45 : 1 })];
      // Combate v2: el crítico tiene su golpe propio (más grave si te lo hacen a ti).
      if (e.crit) out.push(at(e.toPlayer ? 'crit_taken' : 'crit', p));
      if (e.toPlayer) out.push({ sound: 'hurt' });
      return out;
    }
    case 'avoided':
      return [at('evade', me, { gain: 0.6 })];
    case 'immune':
      // El jugador ya lo oye con `avoided`; aquí, los demás (enemigos y mascotas inmunes).
      return e.targetId === ctx.playerId ? [] : [at('evade', ctx.positionOf(e.targetId), { gain: 0.5 })];
    case 'reflect':
      return [at('cast_storm', ctx.positionOf(e.fromId), { pitch: 1.4 })];
    case 'counter':
      return [at('impact_physical', ctx.positionOf(e.sourceId), { pitch: 0.8 })];
    case 'rewind':
      return [at('cast_frost', { x: e.to.x, z: e.to.y }, { pitch: 0.7 })];
    // Combate táctico: la trampa suena al saltar (no al ponerla: el rival no debe oírla).
    case 'trapTriggered':
      return [at('impact_earth', { x: e.x, z: e.y }, { pitch: 0.8 })];
    case 'reveal':
      return e.casterId === ctx.playerId ? [at('cast_earth', me, { pitch: 1.3 })] : [];
    case 'dazeFail':
      return [at('evade', ctx.positionOf(e.targetId), { pitch: 0.7, gain: 0.6 })];
    case 'telegraph':
      return [at('telegraph', ctx.positionOf(e.enemyId), { minGain: 0.55 })];
    case 'summon':
      return [at('summon', ctx.positionOf(e.enemyId))];
    case 'petSpawn':
      return [at('summon', ctx.positionOf(e.entityId), { pitch: 1.5 })];
    case 'enemyDeath':
      return [at('enemy_death', ctx.positionOf(e.enemyId))];
    case 'playerDeath':
      return [{ sound: 'player_death' }];
    case 'heal':
      return e.targetId === ctx.playerId && e.amount >= 1 ? [{ sound: 'heal', gain: 0.8 }] : [];
    case 'lootDrop': {
      const l = ctx.lootInfo(e.lootId);
      if (!l) return [];
      const out = [at('loot_drop', l)];
      if (l.item && RARE.includes(l.rarity)) out.push(at('loot_rare', l, { delay: 0.1 }));
      return out;
    }
    case 'lootPickup': {
      const l = ctx.lootInfo(e.lootId);
      if (!l) return [{ sound: 'pickup' }];
      if (!l.item || l.gold > 0) return [{ sound: 'coins', gain: e.byPet ? 0.7 : 1 }];
      return RARE.includes(l.rarity) ? [{ sound: 'pickup' }, { sound: 'loot_rare', delay: 0.05 }] : [{ sound: 'pickup', gain: e.byPet ? 0.7 : 1 }];
    }
    case 'levelUp':
      return [{ sound: 'level_up' }];
    case 'teleport':
      return [at('cast_storm', { x: e.to.x, z: e.to.y })];
    case 'fishCast':
      // El sedal silba y, al caer, el corcho hace plop donde ha caído.
      return [at('fish_cast', me), at('fish_plop', { x: e.x, z: e.y }, { delay: 0.55 })];
    case 'fishNibble':
      return [at('fish_nibble', ctx.bobber())];
    case 'fishBite':
      // Inconfundible y sin atenuar: hay que reaccionar.
      return [at('fish_bite', ctx.bobber(), { minGain: 0.9 })];
    case 'fishCatch': {
      const out: Cue[] = [at('fish_catch', ctx.bobber() ?? me)];
      if (e.gold > 0) out.push({ sound: 'coins', delay: 0.5 });
      return out;
    }
    case 'fishEscape':
      return [at('fish_escape', ctx.bobber() ?? me)];
    default:
      return [];
  }
}

/** Sucesos de la sesión (oro, mercader) → sonidos de la tienda. */
export function cuesForSession(e: SessionEvent, shopOpen: boolean): Cue[] {
  if (e.type === 'gold' && shopOpen && e.amount !== 0) return [{ sound: e.amount < 0 ? 'shop_buy' : 'shop_sell' }];
  if (e.type === 'openMerchant') return [{ sound: 'ui_open' }];
  return [];
}

export interface Listener {
  x: number;
  z: number;
  /** Orientación de la cámara (grados, la de `CameraRig`). */
  yawDeg: number;
}

/**
 * Paneo (−1 izquierda, 1 derecha) y ganancia por distancia de un sonido en (x, z)
 * oído desde el jugador con la orientación de la cámara: derecha de la
 * pantalla = (cos yaw, −sin yaw) en el plano XZ.
 */
export function spatialize(l: Listener, x: number, z: number, s: MixDef['spatial']): { pan: number; gain: number } {
  const dx = x - l.x;
  const dz = z - l.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return { pan: 0, gain: 1 };
  const yaw = (l.yawDeg * Math.PI) / 180;
  const right = (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / d;
  // Cerca, menos paneo (el sonido «envuelve»); lejos, el paneo completo.
  const width = s.panWidth * Math.min(1, d / s.refDistance);
  let gain = 1;
  if (d > s.refDistance) gain = d >= s.maxDistance ? 0 : 1 - (d - s.refDistance) / (s.maxDistance - s.refDistance);
  return { pan: Math.max(-1, Math.min(1, right * width)), gain: gain * gain };
}

/** Tipo de golpe de un arma: por tabla de datos o, si no figura, por su alcance. */
export function weaponKindOf(itemId: string | null, range: number | null, table: Record<string, string>): string {
  if (!itemId) return 'unarmed';
  return table[itemId] ?? (range !== null && range > 3 ? 'wand' : 'blade');
}
