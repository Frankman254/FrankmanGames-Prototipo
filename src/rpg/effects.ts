// Efectos: un hechizo, un consumible, un estado periódico o el aura de una
// mascota son listas de efectos. Cada tipo de `EffectDef` es una subclase de
// `Effect`, creada por el registro `EFFECT_TYPES`. Añadir un tipo = una clase
// nueva + una línea en el registro; el contenido sigue siendo datos.
//
// Los efectos calculan sus números y piden al contexto (el mundo, o la sesión
// fuera de combate) que los aplique: así se testean con un contexto falso.
import type { HitSpec } from '../sim/damage';
import type { Rng } from '../sim/rng';
import type { Vec2 } from '../sim/vec2';
import type { Actor } from './actor';
import type { EffectDef, PetDef, StatusDef } from './contracts';
import type { RpgContent } from './content';

/** Id del estado que representa un escudo (requerido en `statuses.json`). */
export const SHIELD_STATUS = 'shield';

export interface ZoneSpec {
  radius: number;
  /** También alcanza a aliados y mascotas (lo hereda del hechizo). */
  friendlyFire?: boolean;
  duration: number;
  every: number;
  effects: Effect[];
  power: number;
}

/** Trampa invisible (combate táctico): lo que pone `TrapEffect`. */
export interface TrapSpec {
  radius: number;
  duration: number;
  maxActive: number | null;
  minSpacing: number | null;
  /** Efectos sobre quien la pisa. */
  effects: Effect[];
  power: number;
}

/** Lo que un efecto puede pedir. Lo implementa `World` (y la sesión fuera de combate). */
export interface EffectContext {
  readonly rng: Rng;
  readonly content: RpgContent;
  readonly caster: Actor;
  /** Origen para los sucesos: id de hechizo, "status:<id>", "item:<id>"… */
  readonly tag: string;
  /** Posición del lanzador al lanzar, punto apuntado y dirección. */
  readonly origin: Vec2;
  readonly aim: Vec2;
  readonly dir: number;
  /** Crítico propio del hechizo (se suma al del lanzador). */
  readonly critChance: number;
  readonly critBonus: number;
  damage(target: Actor, hit: HitSpec): void;
  heal(target: Actor, amount: number): void;
  restoreResource(target: Actor, amount: number): void;
  applyStatus(target: Actor, def: StatusDef, duration: number, shield?: number): void;
  knockback(target: Actor, from: Vec2, distance: number): void;
  dash(distance: number): void;
  teleport(maxDistance: number): void;
  /** Combate v2: desplazamientos. */
  blink(maxDistance: number): void;
  swap(target: Actor): void;
  pull(target: Actor, distance: number): void;
  recoil(distance: number): void;
  summon(pet: PetDef, count: number, duration: number): void;
  zone(spec: ZoneSpec): void;
  /** Combate táctico: trampa en el punto apuntado y revelar trampas rivales. */
  trap(spec: TrapSpec): void;
  reveal(radius: number, duration: number): void;
}

/** A quién se aplica un efecto de hechizo: al lanzador una vez, o a cada objetivo alcanzado. */
export type Targeting = 'self' | 'hit';

export abstract class Effect {
  abstract readonly targeting: Targeting;
  /** `power` multiplica los números del efecto (rango del hechizo: 1 + %·(rango − 1)). */
  abstract apply(ctx: EffectContext, target: Actor, power: number): void;
}

export class DamageEffect extends Effect {
  readonly targeting = 'hit';
  constructor(readonly def: Extract<EffectDef, { type: 'damage' }>) {
    super();
  }
  apply(ctx: EffectContext, target: Actor, power: number): void {
    const d = this.def;
    ctx.damage(target, { min: d.min * power, max: d.max * power, element: d.element, scaling: d.scaling ?? 0, critChance: ctx.critChance, critBonus: ctx.critBonus });
  }
}

export class HealEffect extends Effect {
  readonly targeting = 'self';
  constructor(readonly def: Extract<EffectDef, { type: 'heal' }>) {
    super();
  }
  /** Tirada [min, max]·power + scaling · estadística principal del lanzador. */
  amount(ctx: EffectContext, power: number): number {
    const c = ctx.caster;
    const main = c.mainStat ? c.stats.get(c.mainStat) : 0;
    return Math.floor(ctx.rng.range(this.def.min, this.def.max) * power + (this.def.scaling ?? 0) * main);
  }
  apply(ctx: EffectContext, target: Actor, power: number): void {
    ctx.heal(target, this.amount(ctx, power));
  }
}

export class StatusEffect extends Effect {
  readonly targeting: Targeting;
  constructor(readonly def: Extract<EffectDef, { type: 'status' }>, readonly status: StatusDef) {
    super();
    // Las mejoras van al lanzador; los perjuicios a quien alcanza el hechizo.
    this.targeting = status.kind === 'buff' ? 'self' : 'hit';
  }
  apply(ctx: EffectContext, target: Actor): void {
    const chance = this.def.chance ?? 1;
    if (chance < 1 && !ctx.rng.chance(chance)) return;
    ctx.applyStatus(target, this.status, this.def.duration ?? this.status.duration);
  }
}

export class ShieldEffect extends Effect {
  readonly targeting = 'self';
  constructor(readonly def: Extract<EffectDef, { type: 'shield' }>, readonly status: StatusDef) {
    super();
  }
  apply(ctx: EffectContext, target: Actor, power: number): void {
    ctx.applyStatus(target, this.status, this.def.duration, Math.floor(this.def.amount * power));
  }
}

export class KnockbackEffect extends Effect {
  readonly targeting = 'hit';
  constructor(readonly def: Extract<EffectDef, { type: 'knockback' }>) {
    super();
  }
  apply(ctx: EffectContext, target: Actor): void {
    ctx.knockback(target, ctx.origin, this.def.distance);
  }
}

export class DashEffect extends Effect {
  readonly targeting = 'self';
  constructor(readonly def: Extract<EffectDef, { type: 'dash' }>) {
    super();
  }
  apply(ctx: EffectContext): void {
    ctx.dash(this.def.distance);
  }
}

export class TeleportEffect extends Effect {
  readonly targeting = 'self';
  constructor(readonly def: Extract<EffectDef, { type: 'teleport' }>) {
    super();
  }
  apply(ctx: EffectContext): void {
    ctx.teleport(this.def.maxDistance);
  }
}

/** Aparecer en el punto apuntado (sin línea de visión). */
export class BlinkEffect extends Effect {
  readonly targeting = 'self';
  constructor(readonly def: Extract<EffectDef, { type: 'blink' }>) {
    super();
  }
  apply(ctx: EffectContext): void {
    ctx.blink(this.def.maxDistance);
  }
}

/** Cambiar el sitio con el objetivo. */
export class SwapEffect extends Effect {
  readonly targeting = 'hit';
  constructor(readonly def: Extract<EffectDef, { type: 'swap' }>) {
    super();
  }
  apply(ctx: EffectContext, target: Actor): void {
    ctx.swap(target);
  }
}

/** Atraer al objetivo hacia el lanzador. */
export class PullEffect extends Effect {
  readonly targeting = 'hit';
  constructor(readonly def: Extract<EffectDef, { type: 'pull' }>) {
    super();
  }
  apply(ctx: EffectContext, target: Actor): void {
    ctx.pull(target, this.def.distance);
  }
}

/** Empujarse a uno mismo lejos del punto apuntado. */
export class RecoilEffect extends Effect {
  readonly targeting = 'self';
  constructor(readonly def: Extract<EffectDef, { type: 'recoil' }>) {
    super();
  }
  apply(ctx: EffectContext): void {
    ctx.recoil(this.def.distance);
  }
}

export class RestoreResourceEffect extends Effect {
  readonly targeting = 'self';
  constructor(readonly def: Extract<EffectDef, { type: 'restoreResource' }>) {
    super();
  }
  apply(ctx: EffectContext, target: Actor, power: number): void {
    ctx.restoreResource(target, Math.floor(this.def.amount * power));
  }
}

export class SummonEffect extends Effect {
  readonly targeting = 'self';
  constructor(readonly def: Extract<EffectDef, { type: 'summon' }>, readonly pet: PetDef) {
    super();
  }
  apply(ctx: EffectContext): void {
    ctx.summon(this.pet, this.def.count, this.def.duration);
  }
}

export class ZoneEffect extends Effect {
  readonly targeting = 'self';
  readonly children: Effect[];
  constructor(readonly def: Extract<EffectDef, { type: 'zone' }>, content: RpgContent) {
    super();
    this.children = def.effects.map((e) => createEffect(e, content));
  }
  apply(ctx: EffectContext, _target: Actor, power: number): void {
    ctx.zone({ radius: this.def.radius, duration: this.def.duration, every: this.def.every, effects: this.children, power });
  }
}

/** Combate táctico: deja una trampa invisible que se dispara al pisarla un rival. */
export class TrapEffect extends Effect {
  readonly targeting = 'self';
  readonly children: Effect[];
  constructor(readonly def: Extract<EffectDef, { type: 'trap' }>, content: RpgContent) {
    super();
    this.children = def.effects.map((e) => createEffect(e, content));
  }
  apply(ctx: EffectContext, _target: Actor, power: number): void {
    const d = this.def;
    ctx.trap({ radius: d.radius, duration: d.duration, maxActive: d.maxActive ?? null, minSpacing: d.minSpacing ?? null, effects: this.children, power });
  }
}

/** Combate táctico: revela las trampas rivales cercanas un rato. */
export class RevealEffect extends Effect {
  readonly targeting = 'self';
  constructor(readonly def: Extract<EffectDef, { type: 'reveal' }>) {
    super();
  }
  apply(ctx: EffectContext): void {
    ctx.reveal(this.def.radius, this.def.duration);
  }
}

type Ctor<K extends EffectDef['type']> = (def: Extract<EffectDef, { type: K }>, content: RpgContent) => Effect;

/** Registro tipo → clase. Es el único sitio que hay que tocar para un tipo nuevo. */
export const EFFECT_TYPES: { [K in EffectDef['type']]: Ctor<K> } = {
  damage: (d) => new DamageEffect(d),
  heal: (d) => new HealEffect(d),
  status: (d, c) => new StatusEffect(d, need(c.statuses[d.statusId], `estado ${d.statusId}`)),
  shield: (d, c) => new ShieldEffect(d, need(c.statuses[SHIELD_STATUS], `estado ${SHIELD_STATUS}`)),
  knockback: (d) => new KnockbackEffect(d),
  dash: (d) => new DashEffect(d),
  teleport: (d) => new TeleportEffect(d),
  restoreResource: (d) => new RestoreResourceEffect(d),
  summon: (d, c) => new SummonEffect(d, need(c.pets[d.archetype], `mascota ${d.archetype}`)),
  zone: (d, c) => new ZoneEffect(d, c),
  blink: (d) => new BlinkEffect(d),
  swap: (d) => new SwapEffect(d),
  pull: (d) => new PullEffect(d),
  recoil: (d) => new RecoilEffect(d),
  trap: (d, c) => new TrapEffect(d, c),
  reveal: (d) => new RevealEffect(d),
};

function need<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`efecto: ${what} desconocido`);
  return v;
}

export function createEffect(def: EffectDef, content: RpgContent): Effect {
  const make = EFFECT_TYPES[def.type] as Ctor<EffectDef['type']>;
  return make(def as never, content);
}
