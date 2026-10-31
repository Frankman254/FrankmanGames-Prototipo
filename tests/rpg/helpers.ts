// Utilidades compartidas por los tests de `src/rpg/`.
import { loadGameData } from '../../src/data';
import type { Actor } from '../../src/rpg/actor';
import { Character } from '../../src/rpg/character';
import type { RpgContent } from '../../src/rpg/content';
import type { PetDef, StatusDef } from '../../src/rpg/contracts';
import type { EffectContext, ZoneSpec } from '../../src/rpg/effects';
import { GameSession } from '../../src/rpg/session';
import type { HitSpec } from '../../src/sim/damage';
import { Rng } from '../../src/sim/rng';
import type { Vec2 } from '../../src/sim/vec2';

let cached: RpgContent | null = null;
export function content(): RpgContent {
  cached ??= loadGameData().rpg;
  return cached;
}

export function hero(classId = 'ember_vanguard', seed = 1): Character {
  return Character.create(content(), classId, 'Prueba', new Rng(seed));
}

export function session(classId = 'ember_vanguard', seed = 1): GameSession {
  const rng = new Rng(seed);
  return new GameSession(content(), Character.create(content(), classId, 'Prueba', rng), rng);
}

/** Rng que devuelve una secuencia fija (y luego repite la última). */
export function fixedRng(...values: number[]): Rng {
  const r = new Rng(0);
  let i = 0;
  r.next = () => values[Math.min(i++, values.length - 1)] ?? 0;
  return r;
}

export type Call = [string, ...unknown[]];

/** Contexto falso que apunta lo que le piden los efectos. */
export class RecordingContext implements EffectContext {
  readonly calls: Call[] = [];
  readonly origin: Vec2 = { x: 0, y: 0 };
  readonly aim: Vec2 = { x: 5, y: 0 };
  readonly dir = 0;
  critChance = 0;
  critBonus = 0;
  readonly tag = 'test';
  readonly content: RpgContent = content();
  constructor(readonly caster: Actor, readonly rng: Rng = new Rng(3)) {}
  damage(t: Actor, h: HitSpec): void {
    this.calls.push(['damage', t, h]);
  }
  heal(t: Actor, a: number): void {
    this.calls.push(['heal', t, a]);
  }
  restoreResource(t: Actor, a: number): void {
    this.calls.push(['restoreResource', t, a]);
  }
  applyStatus(t: Actor, d: StatusDef, dur: number, shield?: number): void {
    this.calls.push(['applyStatus', t, d.id, dur, shield]);
  }
  knockback(t: Actor, from: Vec2, d: number): void {
    this.calls.push(['knockback', t, from, d]);
  }
  dash(d: number): void {
    this.calls.push(['dash', d]);
  }
  teleport(d: number): void {
    this.calls.push(['teleport', d]);
  }
  blink(d: number): void {
    this.calls.push(['blink', d]);
  }
  swap(t: Actor): void {
    this.calls.push(['swap', t]);
  }
  pull(t: Actor, d: number): void {
    this.calls.push(['pull', t, d]);
  }
  recoil(d: number): void {
    this.calls.push(['recoil', d]);
  }
  summon(p: PetDef, n: number, d: number): void {
    this.calls.push(['summon', p.id, n, d]);
  }
  zone(z: ZoneSpec): void {
    this.calls.push(['zone', z]);
  }
}
