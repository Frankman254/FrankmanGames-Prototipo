import { describe, expect, it } from 'vitest';
import type { Actor } from '../src/rpg/actor';
import type { EffectDef, StatusDef } from '../src/rpg/contracts';
import type { EffectContext, TrapSpec, ZoneSpec } from '../src/rpg/effects';
import {
    CritChanceEffect,
    CritDamageEffect,
    FixedDamageEffect,
    PowerEffect,
    PushDamageEffect,
    createEffect,
} from '../src/rpg/effects';
import type { HitSpec } from '../src/sim/damage';
import { Rng } from '../src/sim/rng';
import type { Vec2 } from '../src/sim/vec2';
import { content as loadContent, hero } from './rpg/helpers';

/** Contexto falso que registra los estados aplicados y el daño. */
class FakeCtx implements EffectContext {
    readonly origin: Vec2 = { x: 0, y: 0 };
    readonly aim: Vec2 = { x: 5, y: 0 };
    readonly dir = 0;
    readonly critChance = 0;
    readonly critBonus = 0;
    readonly tag = 'test';
    readonly statusesApplied: { target: Actor; def: StatusDef; duration: number; shield?: number; opts?: { shareTarget?: unknown; sharePercent?: number } }[] = [];
    readonly damages: { target: Actor; hit: HitSpec }[] = [];
    constructor(
        readonly caster: Actor,
        readonly rng: Rng = new Rng(3),
        readonly content = loadContent(),
    ) {}
    damage(target: Actor, hit: HitSpec): void {
        this.damages.push({ target, hit });
    }
    heal(): void {}
    restoreResource(): void {}
    applyStatus(target: Actor, def: StatusDef, duration: number, shield?: number, opts?: { shareTarget?: unknown; sharePercent?: number }): void {
        this.statusesApplied.push({ target, def, duration, shield, opts });
    }
    knockback(): void {}
    dash(): void {}
    teleport(): void {}
    blink(): void {}
    swap(): void {}
    pull(): void {}
    recoil(): void {}
    summon(): void {}
    zone(): void {}
    trap(): void {}
    reveal(): void {}
}

describe('HZ-04b-potenciadores: efectos nuevos de potenciador', () => {
    const c = loadContent();

    describe('power', () => {
        it('crea PowerEffect con targeting self', () => {
            const eff = createEffect({ type: 'power', value: 20, duration: 10 }, c);
            expect(eff).toBeInstanceOf(PowerEffect);
            expect(eff.targeting).toBe('self');
        });

        it('aplica modificador de stat power al lanzador', () => {
            const h = hero();
            const eff = createEffect({ type: 'power', value: 20, duration: 10 }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            expect(ctx.statusesApplied.length).toBe(1);
            const sa = ctx.statusesApplied[0]!;
            expect(sa.def.kind).toBe('buff');
            expect(sa.def.modifiers![0]!.stat).toBe('power');
            expect(sa.def.modifiers![0]!.value).toBe(20);
            expect(sa.duration).toBe(10);
        });

        it('escala el valor con el power del hechizo', () => {
            const h = hero();
            const eff = createEffect({ type: 'power', value: 20, duration: 10 }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1.5);
            expect(ctx.statusesApplied[0]!.def.modifiers![0]!.value).toBe(30);
        });
    });

    describe('critChance', () => {
        it('crea CritChanceEffect con targeting self', () => {
            const eff = createEffect({ type: 'critChance', value: 10, duration: 8 }, c);
            expect(eff).toBeInstanceOf(CritChanceEffect);
            expect(eff.targeting).toBe('self');
        });

        it('aplica modificador de stat critChance', () => {
            const h = hero();
            const eff = createEffect({ type: 'critChance', value: 10, duration: 8 }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            expect(ctx.statusesApplied[0]!.def.modifiers![0]!.stat).toBe('critChance');
            expect(ctx.statusesApplied[0]!.def.modifiers![0]!.value).toBe(10);
        });
    });

    describe('critDamage', () => {
        it('crea CritDamageEffect con targeting self', () => {
            const eff = createEffect({ type: 'critDamage', value: 25, duration: 8 }, c);
            expect(eff).toBeInstanceOf(CritDamageEffect);
            expect(eff.targeting).toBe('self');
        });

        it('aplica modificador de stat critBonus', () => {
            const h = hero();
            const eff = createEffect({ type: 'critDamage', value: 25, duration: 8 }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            expect(ctx.statusesApplied[0]!.def.modifiers![0]!.stat).toBe('critBonus');
            expect(ctx.statusesApplied[0]!.def.modifiers![0]!.value).toBe(25);
        });
    });

    describe('fixedDamage', () => {
        it('crea FixedDamageEffect con targeting self', () => {
            const eff = createEffect({ type: 'fixedDamage', value: 50, duration: 12 }, c);
            expect(eff).toBeInstanceOf(FixedDamageEffect);
            expect(eff.targeting).toBe('self');
        });

        it('aplica modificador de stat elementalDamage', () => {
            const h = hero();
            const eff = createEffect({ type: 'fixedDamage', value: 50, duration: 12 }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            expect(ctx.statusesApplied[0]!.def.modifiers![0]!.stat).toBe('elementalDamage');
            expect(ctx.statusesApplied[0]!.def.modifiers![0]!.value).toBe(50);
        });
    });

    describe('pushDamage', () => {
        it('crea PushDamageEffect con targeting hit', () => {
            const eff = createEffect({ type: 'pushDamage', value: 15, duration: 6 }, c);
            expect(eff).toBeInstanceOf(PushDamageEffect);
            expect(eff.targeting).toBe('hit');
        });

        it('apply() no hace nada (lo maneja world.ts)', () => {
            const h = hero();
            const eff = createEffect({ type: 'pushDamage', value: 15, duration: 6 }, c);
            const ctx = new FakeCtx(h);
            // No debería lanzar ni registrar nada.
            eff.apply(ctx, h, 1);
            expect(ctx.statusesApplied.length).toBe(0);
            expect(ctx.damages.length).toBe(0);
        });
    });

    describe('registro EFFECT_TYPES', () => {
        it('los 5 nuevos tipos están en EFFECT_TYPES', () => {
            // Si el tipo no está en EFFECT_TYPES, createEffect lanza.
            expect(() => createEffect({ type: 'power', value: 10, duration: 5 }, c)).not.toThrow();
            expect(() => createEffect({ type: 'critChance', value: 5, duration: 5 }, c)).not.toThrow();
            expect(() => createEffect({ type: 'critDamage', value: 10, duration: 5 }, c)).not.toThrow();
            expect(() => createEffect({ type: 'fixedDamage', value: 20, duration: 5 }, c)).not.toThrow();
            expect(() => createEffect({ type: 'pushDamage', value: 10, duration: 5 }, c)).not.toThrow();
        });
    });
});
