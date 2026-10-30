// Lo que se mide de una partida: se alimenta con los sucesos del mundo
// (`drainEvents`) y con una muestra del estado del jugador por tick.
import type { Character } from '../../src/rpg/character';
import type { Rarity } from '../../src/rpg/contracts';
import { RARITIES } from '../../src/rpg/contracts';
import type { GameEvent } from '../../src/sim/events';
import type { World } from '../../src/sim/world';

export type RarityCount = Record<Rarity, number>;

export function emptyRarities(): RarityCount {
  return Object.fromEntries(RARITIES.map((r) => [r, 0])) as RarityCount;
}

export interface CombatTally {
  /** Daño del jugador (hechizos, básico, estados y zonas suyos) a enemigos. */
  dealt: number;
  /** Daño de mascotas e invocaciones. */
  petDealt: number;
  /** Daño de los golpes al jugador antes del escudo, y vida que perdió de verdad (tras el escudo). */
  taken: number;
  healthLost: number;
  /** Golpes enemigos que conectaron / que la invulnerabilidad anuló. */
  hitsTaken: number;
  avoided: number;
  /** Lanzamientos por hechizo ("basic" = ataque del arma). */
  casts: Record<string, number>;
  /** Daño del jugador por origen (hechizo, "status:burn"…). */
  damageBy: Record<string, number>;
  xp: number;
  kills: number;
  /** Monedas que cayeron al suelo. */
  coinsDropped: number;
  /** Objetos que cayeron, por rareza. */
  drops: RarityCount;
  /** Segundos con algún enemigo despierto, recurso medio y segundos con el recurso lleno en ellos. */
  combatSeconds: number;
  resourceSum: number;
  resourceFullSeconds: number;
}

export function emptyTally(): CombatTally {
  return {
    dealt: 0,
    petDealt: 0,
    taken: 0,
    healthLost: 0,
    hitsTaken: 0,
    avoided: 0,
    casts: {},
    damageBy: {},
    xp: 0,
    kills: 0,
    coinsDropped: 0,
    drops: emptyRarities(),
    combatSeconds: 0,
    resourceSum: 0,
    resourceFullSeconds: 0,
  };
}

/** Suma `b` en `a`. */
export function addTally(a: CombatTally, b: CombatTally): void {
  for (const k of ['dealt', 'petDealt', 'taken', 'healthLost', 'hitsTaken', 'avoided', 'xp', 'kills', 'coinsDropped', 'combatSeconds', 'resourceSum', 'resourceFullSeconds'] as const) a[k] += b[k];
  for (const [k, v] of Object.entries(b.casts)) a.casts[k] = (a.casts[k] ?? 0) + v;
  for (const [k, v] of Object.entries(b.damageBy)) a.damageBy[k] = (a.damageBy[k] ?? 0) + v;
  for (const r of RARITIES) a.drops[r] += b.drops[r];
}

/** Grabadora activa de cada personaje (la vida perdida se lee envolviendo `takeDamage` una sola vez). */
const active = new WeakMap<Character, { rec: Recorder | null }>();

function watchHealth(ch: Character, rec: Recorder): void {
  let slot = active.get(ch);
  if (!slot) {
    const s = { rec: null as Recorder | null };
    const take = ch.takeDamage.bind(ch);
    ch.takeDamage = (amount: number) => {
      const lost = take(amount);
      if (s.rec) s.rec.tally.healthLost += lost;
      return lost;
    };
    active.set(ch, s);
    slot = s;
  }
  slot.rec = rec;
}

export class Recorder {
  readonly tally = emptyTally();

  constructor(readonly world: World) {
    watchHealth(world.character, this);
    // El botín puede recogerse en el mismo tick en que cae (radio de recogida),
    // antes de leer los sucesos: se cuenta al caer envolviendo `dropLoot`.
    const drop = world.dropLoot.bind(world);
    world.dropLoot = (at, item, gold = 0) => {
      if (item) this.tally.drops[world.content.items[item.itemId]!.rarity]++;
      else this.tally.coinsDropped += gold;
      return drop(at, item, gold);
    };
  }

  /** Llamar tras cada `world.tick(dt)`. */
  step(dt: number, inCombat: boolean): void {
    const w = this.world;
    const me = w.player.id;
    for (const e of w.drainEvents()) this.event(e, me);
    if (inCombat && w.player.alive) {
      const ch = w.character;
      const frac = ch.maxResource > 0 ? ch.resource / ch.maxResource : 1;
      this.tally.combatSeconds += dt;
      this.tally.resourceSum += frac * dt;
      if (frac >= 0.999) this.tally.resourceFullSeconds += dt;
    }
  }

  private event(e: GameEvent, me: number): void {
    const t = this.tally;
    switch (e.type) {
      case 'damage':
        if (e.toPlayer) {
          t.taken += e.amount;
          if (e.ability === null) t.hitsTaken++;
        } else if (e.sourceId === me) {
          t.dealt += e.amount;
          const k = e.ability ?? '?';
          t.damageBy[k] = (t.damageBy[k] ?? 0) + e.amount;
        } else if (this.world.pets.some((p) => p.id === e.sourceId)) {
          t.petDealt += e.amount;
        }
        return;
      case 'avoided':
        t.avoided++;
        return;
      case 'cast':
        t.casts[e.ability] = (t.casts[e.ability] ?? 0) + 1;
        return;
      case 'xp':
        t.xp += e.amount;
        return;
      case 'enemyDeath':
        t.kills++;
        return;
      default:
        return;
    }
  }
}

// ─── Estadística descriptiva ───────────────────────────────────────────────

export function mean(xs: readonly number[]): number {
  return xs.length === 0 ? NaN : xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}
