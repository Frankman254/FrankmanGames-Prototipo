import { describe, expect, it } from 'vitest';
import type { Actor } from '../src/rpg/actor';
import type { EffectDef, StatusDef } from '../src/rpg/contracts';
import type { EffectContext, TrapSpec, ZoneSpec } from '../src/rpg/effects';
import {
    DamageEffect,
    DispelEffect,
    FixedDamageEffect,
    HealEffect,
    PowerEffect,
    createEffect,
} from '../src/rpg/effects';
import type { HitSpec } from '../src/sim/damage';
import { Rng } from '../src/sim/rng';
import type { Vec2 } from '../src/sim/vec2';
import { content as loadContent, hero } from './rpg/helpers';

/** Contexto falso que registra los efectos aplicados. */
class FakeCtx implements EffectContext {
    readonly origin: Vec2 = { x: 0, y: 0 };
    readonly aim: Vec2 = { x: 5, y: 0 };
    readonly dir = 0;
    readonly critChance = 0;
    readonly critBonus = 0;
    readonly tag = 'test';
    readonly damages: { target: Actor; hit: HitSpec }[] = [];
    readonly heals: { target: Actor; amount: number }[] = [];
    readonly statusesApplied: { target: Actor; def: StatusDef; duration: number; shield?: number }[] = [];
    constructor(
        readonly caster: Actor,
        readonly rng: Rng = new Rng(42),
        readonly content = loadContent(),
    ) {}
    damage(target: Actor, hit: HitSpec): void {
        this.damages.push({ target, hit });
    }
    heal(target: Actor, amount: number): void {
        this.heals.push({ target, amount });
    }
    restoreResource(): void {}
    applyStatus(target: Actor, def: StatusDef, duration: number, shield?: number): void {
        this.statusesApplied.push({ target, def, duration, shield });
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

describe('HZ-04e: Motor para los hechizos nuevos', () => {
    const c = loadContent();

    // ─── 1. perLevel en damage ────────────────────────────────────────

    describe('perLevel en damage', () => {
        it('sin perLevel funciona como antes', () => {
            const h = hero();
            const eff = createEffect(
                { type: 'damage' as const, min: 10, max: 20, element: 'fire' },
                c,
            );
            expect(eff).toBeInstanceOf(DamageEffect);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            expect(ctx.damages.length).toBe(1);
            expect(ctx.damages[0]!.hit.min).toBe(10);
            expect(ctx.damages[0]!.hit.max).toBe(20);
        });

        it('perLevel suma al daño según el nivel del lanzador', () => {
            const h = hero();
            (h as any).level = 50;
            const eff = createEffect(
                { type: 'damage' as const, min: 10, max: 20, element: 'fire', perLevel: 0.1 },
                c,
            );
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            // perLevel=0.1 * level=50 = 5 → min=15, max=25
            expect(ctx.damages[0]!.hit.min).toBe(15);
            expect(ctx.damages[0]!.hit.max).toBe(25);
        });

        it('perLevel escala con nivel alto', () => {
            const h = hero();
            (h as any).level = 200;
            const eff = createEffect(
                { type: 'damage' as const, min: 0, max: 0, element: 'fire', perLevel: 0.2 },
                c,
            );
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            // perLevel=0.2 * level=200 = 40 → min=40, max=40
            expect(ctx.damages[0]!.hit.min).toBe(40);
            expect(ctx.damages[0]!.hit.max).toBe(40);
        });

        it('perLevel se combina con power', () => {
            const h = hero();
            (h as any).level = 100;
            const eff = createEffect(
                { type: 'damage' as const, min: 10, max: 20, element: 'fire', perLevel: 0.1 },
                c,
            );
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1.5);
            // perLevel=0.1 * level=100 = 10 → (10+10)*1.5=30, (20+10)*1.5=45
            expect(ctx.damages[0]!.hit.min).toBe(30);
            expect(ctx.damages[0]!.hit.max).toBe(45);
        });
    });

    // ─── 2. perLevel en heal ──────────────────────────────────────────

    describe('perLevel en heal', () => {
        it('sin perLevel funciona como antes', () => {
            const h = hero();
            const eff = createEffect(
                { type: 'heal' as const, min: 20, max: 30 },
                c,
            );
            expect(eff).toBeInstanceOf(HealEffect);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            expect(ctx.heals.length).toBe(1);
            // rng.range(20,30) con seed 42 + scaling 0 * intellect
            const amount = ctx.heals[0]!.amount;
            expect(amount).toBeGreaterThanOrEqual(20);
            expect(amount).toBeLessThanOrEqual(30);
        });

        it('perLevel suma a la curación según el nivel', () => {
            const h = hero();
            (h as any).level = 100;
            const eff = createEffect(
                { type: 'heal' as const, min: 10, max: 10, perLevel: 0.1 },
                c,
            );
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            // perLevel=0.1 * level=100 = 10 → (10+10)*1 = 20 + scaling*intellect
            // scaling=0, intellect del hero a nivel 1 es bajo → amount ≈ 20
            expect(ctx.heals[0]!.amount).toBeGreaterThanOrEqual(20);
        });

        it('perLevel escala con nivel alto', () => {
            const h = hero();
            (h as any).level = 200;
            const eff = createEffect(
                { type: 'heal' as const, min: 0, max: 0, perLevel: 0.15 },
                c,
            );
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            // perLevel=0.15 * level=200 = 30 → (0+30)*1 = 30 + scaling*intellect
            expect(ctx.heals[0]!.amount).toBeGreaterThanOrEqual(30);
        });
    });

    // ─── 3. perLevel en fixedDamage ───────────────────────────────────

    describe('perLevel en fixedDamage', () => {
        it('sin perLevel funciona como antes', () => {
            const h = hero();
            const eff = createEffect(
                { type: 'fixedDamage' as const, value: 10, duration: 8 },
                c,
            );
            expect(eff).toBeInstanceOf(FixedDamageEffect);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            expect(ctx.statusesApplied.length).toBe(1);
            const mod = ctx.statusesApplied[0]!.def.modifiers![0]!;
            expect(mod.stat).toBe('elementalDamage');
            expect(mod.value).toBe(10);
        });

        it('perLevel suma daño fijo según el nivel', () => {
            const h = hero();
            (h as any).level = 100;
            const eff = createEffect(
                { type: 'fixedDamage' as const, value: 0, duration: 8, perLevel: 0.03 },
                c,
            );
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            // perLevel=0.03 * level=100 = 3 → value=0+3=3
            const mod = ctx.statusesApplied[0]!.def.modifiers![0]!;
            expect(mod.value).toBe(3);
        });

        it('perLevel con nivel alto', () => {
            const h = hero();
            (h as any).level = 200;
            const eff = createEffect(
                { type: 'fixedDamage' as const, value: 0, duration: 8, perLevel: 0.045 },
                c,
            );
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            // perLevel=0.045 * level=200 = 9
            const mod = ctx.statusesApplied[0]!.def.modifiers![0]!;
            expect(mod.value).toBe(9);
        });
    });

    // ─── 4. Estados ward_ranged y ward_melee ──────────────────────────

    describe('estados ward', () => {
        it('ward_ranged existe con immune y vs ranged', () => {
            const ward = c.statuses['ward_ranged'];
            expect(ward).toBeDefined();
            expect(ward!.immune).toBe(true);
            expect(ward!.vs).toBe('ranged');
            expect(ward!.kind).toBe('buff');
            expect(ward!.duration).toBe(3);
        });

        it('ward_melee existe con immune y vs melee', () => {
            const ward = c.statuses['ward_melee'];
            expect(ward).toBeDefined();
            expect(ward!.immune).toBe(true);
            expect(ward!.vs).toBe('melee');
            expect(ward!.kind).toBe('buff');
            expect(ward!.duration).toBe(3);
        });
    });

    // ─── 5. Buffs sobre aliados (verificación de tipos) ───────────────

    describe('buffs sobre aliados', () => {
        it('PowerEffect es targeting self', () => {
            const eff = createEffect(
                { type: 'power' as const, value: 25, duration: 8 },
                c,
            );
            expect(eff).toBeInstanceOf(PowerEffect);
            expect(eff.targeting).toBe('self');
        });

        it('FixedDamageEffect es targeting self', () => {
            const eff = createEffect(
                { type: 'fixedDamage' as const, value: 5, duration: 8 },
                c,
            );
            expect(eff).toBeInstanceOf(FixedDamageEffect);
            expect(eff.targeting).toBe('self');
        });
    });

    // ─── 6. dispel kind buff quita escudos ────────────────────────────

    describe('dispel quita escudos', () => {
        it('dispel con kind buff quita el estado shield', () => {
            const h = hero();
            const target = hero();
            // Aplicar escudo al target.
            const shield = c.statuses['shield']!;
            target.statuses.apply(shield, { duration: 8, source: h, shield: 100 });
            expect(target.statuses.has('shield')).toBe(true);

            // Dispel con kind buff.
            const eff = createEffect({ type: 'dispel' as const, kind: 'buff' as const }, c);
            expect(eff).toBeInstanceOf(DispelEffect);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, target, 1);

            // El escudo debe haberse quitado (es kind buff).
            expect(target.statuses.has('shield')).toBe(false);
        });

        it('dispel sin kind quita los buffs por defecto', () => {
            const h = hero();
            const target = hero();
            const shield = c.statuses['shield']!;
            const haste = c.statuses['haste']!;
            target.statuses.apply(shield, { duration: 8, source: h, shield: 100 });
            target.statuses.apply(haste, { duration: 10, source: h });
            expect(target.statuses.has('shield')).toBe(true);
            expect(target.statuses.has('haste')).toBe(true);

            const eff = createEffect({ type: 'dispel' as const }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, target, 1);

            // Sin kind, por defecto quita buffs.
            expect(target.statuses.has('shield')).toBe(false);
            expect(target.statuses.has('haste')).toBe(false);
        });
    });
});
