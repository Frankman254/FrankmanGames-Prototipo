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
import type { EffectDef, Element, PetDef, StatusDef, StatId, StatModifier } from './contracts';
import type { RpgContent } from './content';

/** Id del estado que representa un escudo (requerido en `statuses.json`). */
export const SHIELD_STATUS = 'shield';

export function selfStackStatusId(spellId: string): string {
    return `selfStack_${spellId}`;
}

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
    /**
     * Decisión de crítico para `target` en ESTE lanzamiento: la primera línea de
     * daño del impacto la tira y el resto la repite (crítico compartido por
     * lanzamiento, no por línea). `undefined` = sin crítico en juego o contexto sin
     * decisión compartida (estados, contras, zonas: un golpe, una tirada).
     */
    critRollFor?(target: Actor): boolean | undefined;
    /** Daño base extra de este impacto (los saltos de una cadena con `damagePerJump`). */
    readonly baseBonus?: number;
    damage(target: Actor, hit: HitSpec): void;
    heal(target: Actor, amount: number): void;
    restoreResource(target: Actor, amount: number): void;
    applyStatus(target: Actor, def: StatusDef, duration: number, shield?: number, opts?: { shareTarget?: unknown; sharePercent?: number }): void;
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
        // HZ-04e: perLevel escala el daño con el nivel del lanzador.
        // Fórmula: (rng(min, max) + perLevel × nivel) × power + scaling × int
        const perLevel = d.perLevel ?? 0;
        const casterLevel = ctx.caster.level;
        const levelBonus = perLevel * casterLevel + (ctx.baseBonus ?? 0);
        ctx.damage(target, {
            min: (d.min + levelBonus) * power,
            max: (d.max + levelBonus) * power,
            element: d.element,
            scaling: d.scaling ?? 0,
            critChance: ctx.critChance,
            critBonus: ctx.critBonus,
            ...(ctx.critRollFor ? { critRoll: ctx.critRollFor(target) } : {}),
        });
    }
}

export class HealEffect extends Effect {
    readonly targeting = 'self';
    constructor(readonly def: Extract<EffectDef, { type: 'heal' }>) {
        super();
    }
    /** V4: Curación escala con Intelecto y bonificación explícita de healingPower (nunca con mainStat de clase). */
    amount(ctx: EffectContext, power: number): number {
        const c = ctx.caster;
        const intellect = c.stats.get('intellect');
        const healingPower = c.stats.get('healingPower');
        const bonusMult = 1 + Math.max(0, healingPower) / 100;
        // HZ-04e: perLevel escala la curación con el nivel del lanzador.
        const perLevel = this.def.perLevel ?? 0;
        const casterLevel = ctx.caster.level;
        const levelBonus = perLevel * casterLevel;
        const base = (ctx.rng.range(this.def.min, this.def.max) + levelBonus) * power + (this.def.scaling ?? 0) * intellect;
        return Math.floor(base * bonusMult);
    }
    apply(ctx: EffectContext, target: Actor, power: number): void {
        ctx.heal(target, this.amount(ctx, power));
    }
}

export class StatusEffect extends Effect {
    readonly targeting: Targeting;
    constructor(
        readonly def: Extract<EffectDef, { type: 'status' }>,
        readonly status: StatusDef,
    ) {
        super();
        // Las mejoras van al lanzador; los perjuicios a quien alcanza el hechizo.
        this.targeting = status.kind === 'buff' ? 'self' : 'hit';
    }
    apply(ctx: EffectContext, target: Actor, power: number): void {
        const chance = this.def.chance ?? 1;
        if (chance < 1 && !ctx.rng.chance(chance)) return;
        const isCrit = ctx.critRollFor ? (ctx.critRollFor(target) ?? false) : false;
        const durMult = isCrit ? 1.5 : 1;
        const effMult = (isCrit ? 1.5 : 1) * power;
        const statusToApply =
            effMult !== 1 && this.status.modifiers && this.status.modifiers.length > 0
                ? {
                      ...this.status,
                      modifiers: this.status.modifiers.map((m) => ({
                          ...m,
                          value: Math.round(m.value * effMult * 10) / 10,
                      })),
                  }
                : this.status;
        ctx.applyStatus(target, statusToApply, Math.round((this.def.duration ?? this.status.duration) * durMult));
    }
}

export class ShieldEffect extends Effect {
    readonly targeting = 'self';
    constructor(
        readonly def: Extract<EffectDef, { type: 'shield' }>,
        readonly status: StatusDef,
    ) {
        super();
    }
    apply(ctx: EffectContext, target: Actor, power: number): void {
        const isCrit = ctx.critRollFor ? (ctx.critRollFor(target) ?? false) : false;
        const mult = isCrit ? 1.5 : 1;
        // HZ-04b-defensa: perLevel escala el escudo con el nivel del lanzador.
        const perLevel = this.def.perLevel ?? 0;
        const casterLevel = ctx.caster.level;
        const levelBonus = perLevel * casterLevel;
        const baseAmount = this.def.amount + levelBonus;
        ctx.applyStatus(
            target,
            this.status,
            Math.round(this.def.duration * mult),
            Math.floor(baseAmount * power * mult),
        );
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
    constructor(
        readonly def: Extract<EffectDef, { type: 'summon' }>,
        readonly pet: PetDef,
    ) {
        super();
    }
    apply(ctx: EffectContext): void {
        ctx.summon(this.pet, this.def.count, this.def.duration);
    }
}

export class ZoneEffect extends Effect {
    readonly targeting = 'self';
    readonly children: Effect[];
    constructor(
        readonly def: Extract<EffectDef, { type: 'zone' }>,
        content: RpgContent,
    ) {
        super();
        this.children = def.effects.map((e) => createEffect(e, content));
    }
    apply(ctx: EffectContext, _target: Actor, power: number): void {
        ctx.zone({
            radius: this.def.radius,
            duration: this.def.duration,
            every: this.def.every,
            effects: this.children,
            power,
        });
    }
}

/** Combate táctico: deja una trampa invisible que se dispara al pisarla un rival. */
export class TrapEffect extends Effect {
    readonly targeting = 'self';
    readonly children: Effect[];
    constructor(
        readonly def: Extract<EffectDef, { type: 'trap' }>,
        content: RpgContent,
    ) {
        super();
        this.children = def.effects.map((e) => createEffect(e, content));
    }
    apply(ctx: EffectContext, _target: Actor, power: number): void {
        const d = this.def;
        ctx.trap({
            radius: d.radius,
            duration: d.duration,
            maxActive: d.maxActive ?? null,
            minSpacing: d.minSpacing ?? null,
            effects: this.children,
            power,
        });
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

/**
 * HZ-04b: Rebote — tras el impacto, el hechizo salta a otros objetivos cercanos.
 * No hace nada por sí solo: `World.execute` lo ve y repite los demás efectos de
 * impacto sobre cada salto (`chainTargets` elige a quién).
 */
export class ChainEffect extends Effect {
    readonly targeting = 'hit';
    constructor(readonly def: Extract<EffectDef, { type: 'chain' }>) {
        super();
    }
    apply(): void {}
    /** Multiplicador de efecto del salto `n` (1 = primer salto). */
    falloff(n: number): number {
        return Math.max(0, 1 - ((this.def.falloffPercent ?? 0) * (n - 1)) / 100);
    }
}

/** HZ-04b: Daño extra (del elemento del hechizo) si el objetivo tiene un estado. */
export class BonusVsStatusEffect extends Effect {
    readonly targeting = 'hit';
    /** Lo fija `compileSpell` con el elemento del daño del hechizo. */
    element: Element | undefined;
    constructor(
        readonly def: Extract<EffectDef, { type: 'bonusVsStatus' }>,
        readonly status: StatusDef,
    ) {
        super();
    }
    apply(ctx: EffectContext, target: Actor, power: number): void {
        if (!this.element || !target.statuses.has(this.def.statusId)) return;
        const amount = this.def.bonusDamage * power;
        ctx.damage(target, {
            min: amount,
            max: amount,
            element: this.element,
            scaling: 0,
            critChance: ctx.critChance,
            critBonus: ctx.critBonus,
            ...(ctx.critRollFor ? { critRoll: ctx.critRollFor(target) } : {}),
        });
        if (this.def.consume) target.statuses.consumeStack(this.def.statusId);
    }
}

/**
 * HZ-04b: a quién salta un rebote. Desde `from`, el más cercano aún no alcanzado
 * dentro de `radius` (y con `onlyStatus`, si lo pide), y así `jumps` veces.
 * Función pura para poder probarla sin mundo.
 */
export function chainTargets<
    T extends { id: number; pos: Vec2; alive: boolean; statuses: { has(id: string): boolean } },
>(def: Extract<EffectDef, { type: 'chain' }>, from: Vec2, already: ReadonlySet<number>, candidates: readonly T[]): T[] {
    const out: T[] = [];
    const used = new Set(already);
    let at = from;
    for (let j = 0; j < def.jumps; j++) {
        let best: T | null = null;
        let bestD = def.radius * def.radius;
        for (const c of candidates) {
            if (!c.alive || used.has(c.id)) continue;
            if (def.onlyStatus && !c.statuses.has(def.onlyStatus)) continue;
            const d = (c.pos.x - at.x) ** 2 + (c.pos.y - at.y) ** 2;
            if (d <= bestD) {
                best = c;
                bestD = d;
            }
        }
        if (!best) break;
        out.push(best);
        used.add(best.id);
        at = best.pos;
    }
    return out;
}

/**
 * HZ-04b: Carga acumulativa al lanzar.
 * Cada lanzamiento usa las acumulaciones previas del mismo hechizo para el daño y añade
 * una carga para el siguiente, hasta `max`. Caduca tras `duration` s sin relanzarlo.
 * El estado se identifica como `selfStack_<spellId>`.
 */
export class SelfStackEffect extends Effect {
    readonly targeting = 'self';
    constructor(readonly def: Extract<EffectDef, { type: 'selfStack' }>) {
        super();
    }
    apply(ctx: EffectContext, target: Actor, _power: number): void {
        const baseStatus = ctx.content.statuses['self_stack'];
        if (!baseStatus) return;
        ctx.applyStatus(
            target,
            { ...baseStatus, id: selfStackStatusId(ctx.tag), maxStacks: this.def.max },
            this.def.duration,
        );
    }
}

/**
 * HZ-04b-potenciadores: efecto genérico de buff inline.
 * Aplica un modificador de stat al lanzador durante `duration` segundos.
 * Se usa para power, critChance, critDamage y fixedDamage.
 */
abstract class BuffEffect extends Effect {
    readonly targeting = 'self';
    abstract getStat(): string;
    abstract getValue(): number;
    abstract getDuration(): number;
    apply(ctx: EffectContext, target: Actor, power: number): void {
        const stat = this.getStat();
        const val = this.getValue();
        const dur = this.getDuration();
        const modStatus: StatusDef = {
            id: `buff_${stat}`,
            name: `Buff ${stat}`,
            description: `Modificador temporal de ${stat}`,
            icon: '✨',
            kind: 'buff',
            duration: dur,
            maxStacks: 1,
            modifiers: [{ stat: stat as StatId, op: 'flat', value: Math.round(val * power * 10) / 10 }],
        };
        ctx.applyStatus(target, modStatus, dur);
    }
}

export class PowerEffect extends BuffEffect {
    constructor(readonly def: Extract<EffectDef, { type: 'power' }>) {
        super();
    }
    getStat(): string { return 'power'; }
    getValue(): number { return this.def.value; }
    getDuration(): number { return this.def.duration; }
}

export class CritChanceEffect extends BuffEffect {
    constructor(readonly def: Extract<EffectDef, { type: 'critChance' }>) {
        super();
    }
    getStat(): string { return 'critChance'; }
    getValue(): number { return this.def.value; }
    getDuration(): number { return this.def.duration; }
}

export class CritDamageEffect extends BuffEffect {
    constructor(readonly def: Extract<EffectDef, { type: 'critDamage' }>) {
        super();
    }
    getStat(): string { return 'critBonus'; }
    getValue(): number { return this.def.value; }
    getDuration(): number { return this.def.duration; }
}

export class FixedDamageEffect extends BuffEffect {
    constructor(readonly def: Extract<EffectDef, { type: 'fixedDamage' }>) {
        super();
    }
    getStat(): string { return 'elementalDamage'; }
    getValue(): number { return this.def.value; }
    getDuration(): number { return this.def.duration; }
    override apply(ctx: EffectContext, target: Actor, power: number): void {
        // HZ-04e: perLevel escala el daño fijo con el nivel del lanzador.
        const perLevel = this.def.perLevel ?? 0;
        const casterLevel = ctx.caster.level;
        const val = this.def.value + perLevel * casterLevel;
        const dur = this.def.duration;
        const stat = this.getStat();
        const modStatus: StatusDef = {
            id: `buff_${stat}`,
            name: `Buff ${stat}`,
            description: `Modificador temporal de ${stat}`,
            icon: '✨',
            kind: 'buff',
            duration: dur,
            maxStacks: 1,
            modifiers: [{ stat: stat as StatId, op: 'flat', value: Math.round(val * power * 10) / 10 }],
        };
        ctx.applyStatus(target, modStatus, dur);
    }
}

/**
 * HZ-04b-potenciadores: daño de empuje.
 * Cuando un empujado choca con un muro, obstáculo u otro cuerpo, recibe daño
 * según la distancia que no pudo recorrer y el `pushDamage` del lanzador.
 * targeting = 'hit' porque se registra sobre el objetivo empujado.
 * El efecto en sí no hace nada en apply: world.ts lo detecta al hacer knockback
 * y calcula el daño cuando el empujón se detiene antes de recorrer toda la distancia.
 */
export class PushDamageEffect extends Effect {
    readonly targeting = 'hit';
    constructor(readonly def: Extract<EffectDef, { type: 'pushDamage' }>) {
        super();
    }
    apply(): void {}
}

/**
 * HZ-04b-defensa: Dispel — quita los estados buff y los escudos del objetivo.
 * Si `kind` está, solo quita buffs o debuffs; sin él, quita todos los buffs.
 * Si `statusId` está, solo quita ese estado.
 */
export class DispelEffect extends Effect {
    readonly targeting = 'hit';
    constructor(readonly def: Extract<EffectDef, { type: 'dispel' }>) {
        super();
    }
    apply(ctx: EffectContext, target: Actor, _power: number): void {
        if (this.def.statusId) {
            // Solo quita un estado específico.
            target.statuses.remove(this.def.statusId);
            return;
        }
        // Sin statusId: quita todos los buffs (o debuffs si kind='debuff').
        const kind = this.def.kind ?? 'buff';
        const toRemove = target.statuses.list.filter((s) => s.def.kind === kind);
        for (const s of toRemove) {
            target.statuses.remove(s.def.id);
        }
    }
}

/**
 * HZ-04b-defensa: ShareDamage — el objetivo comparte un % del daño con un aliado.
 * Se aplica como estado 'share_damage' en el objetivo; cuando recibe daño,
 * world.ts transfiere el % al aliado.
 */
export class ShareDamageEffect extends Effect {
    readonly targeting = 'hit';
    constructor(readonly def: Extract<EffectDef, { type: 'shareDamage' }>) {
        super();
    }
    apply(ctx: EffectContext, target: Actor, _power: number): void {
        const shareStatus = ctx.content.statuses['share_damage'];
        if (!shareStatus) return;
        ctx.applyStatus(target, shareStatus, this.def.duration, undefined, {
            shareTarget: ctx.caster,
            sharePercent: this.def.percent,
        });
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
    chain: (d) => new ChainEffect(d),
    bonusVsStatus: (d, c) => new BonusVsStatusEffect(d, need(c.statuses[d.statusId], `estado ${d.statusId}`)),
    selfStack: (d) => new SelfStackEffect(d),
    power: (d) => new PowerEffect(d),
    critChance: (d) => new CritChanceEffect(d),
    critDamage: (d) => new CritDamageEffect(d),
    fixedDamage: (d) => new FixedDamageEffect(d),
    pushDamage: (d) => new PushDamageEffect(d),
    dispel: (d) => new DispelEffect(d),
    shareDamage: (d) => new ShareDamageEffect(d),
};

function need<T>(v: T | undefined, what: string): T {
    if (v === undefined) throw new Error(`efecto: ${what} desconocido`);
    return v;
}

export function createEffect(def: EffectDef, content: RpgContent): Effect {
    const make = EFFECT_TYPES[def.type] as Ctor<EffectDef['type']>;
    return make(def as never, content);
}
