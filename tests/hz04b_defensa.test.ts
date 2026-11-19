import { describe, expect, it } from 'vitest';
import type { Actor } from '../src/rpg/actor';
import type { EffectDef, StatusDef } from '../src/rpg/contracts';
import type { EffectContext, TrapSpec, ZoneSpec } from '../src/rpg/effects';
import {
    DispelEffect,
    ShareDamageEffect,
    ShieldEffect,
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

describe('HZ-04b-defensa: efectos nuevos de defensa', () => {
    const c = loadContent();

    describe('shield con perLevel', () => {
        it('escudo sin perLevel funciona como antes', () => {
            const h = hero();
            const eff = createEffect({ type: 'shield' as const, amount: 100, duration: 8 }, c);
            expect(eff).toBeInstanceOf(ShieldEffect);
            expect(eff.targeting).toBe('self');
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            expect(ctx.statusesApplied.length).toBe(1);
            expect(ctx.statusesApplied[0]!.shield).toBe(100);
        });

        it('perLevel suma daño por nivel del lanzador', () => {
            const h = hero();
            // Hero a nivel 1 por defecto.
            const eff = createEffect({ type: 'shield' as const, amount: 100, duration: 8, perLevel: 5 }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            // amount=100 + perLevel=5 * level=1 = 105
            expect(ctx.statusesApplied[0]!.shield).toBe(105);
        });

        it('perLevel escala con nivel alto', () => {
            const h = hero();
            // Simular nivel 200 en el caster.
            (h as any).level = 200;
            const eff = createEffect({ type: 'shield' as const, amount: 0, duration: 8, perLevel: 5 }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1);
            // amount=0 + perLevel=5 * level=200 = 1000
            expect(ctx.statusesApplied[0]!.shield).toBe(1000);
        });

        it('perLevel se combina con amount base y power', () => {
            const h = hero();
            (h as any).level = 50;
            const eff = createEffect({ type: 'shield' as const, amount: 100, duration: 8, perLevel: 5 }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, h, 1.2); // power 1.2
            // (100 + 5*50) * 1.2 = 350 * 1.2 = 420
            expect(ctx.statusesApplied[0]!.shield).toBe(420);
        });
    });

    describe('dispel', () => {
        it('crea DispelEffect con targeting hit', () => {
            const eff = createEffect({ type: 'dispel' as const }, c);
            expect(eff).toBeInstanceOf(DispelEffect);
            expect(eff.targeting).toBe('hit');
        });

        it('dispel sin parámetros quita todos los buffs', () => {
            const h = hero();
            const target = hero();
            // Aplicar dos buffs al target.
            const haste = c.statuses['haste']!;
            const ironShout = c.statuses['iron_shout']!;
            target.statuses.apply(haste, { duration: 10, source: h });
            target.statuses.apply(ironShout, { duration: 10, source: h });
            expect(target.statuses.list.length).toBe(2);

            const eff = createEffect({ type: 'dispel' as const }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, target, 1);

            // Los buffs deben estar quitados.
            expect(target.statuses.has('haste')).toBe(false);
            expect(target.statuses.has('iron_shout')).toBe(false);
        });

        it('dispel con kind=debuff quita solo debuffs', () => {
            const h = hero();
            const target = hero();
            const haste = c.statuses['haste']!;
            const soaked = c.statuses['soaked']!;
            target.statuses.apply(haste, { duration: 10, source: h });
            target.statuses.apply(soaked, { duration: 10, source: h });

            const eff = createEffect({ type: 'dispel' as const, kind: 'debuff' }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, target, 1);

            expect(target.statuses.has('haste')).toBe(true);
            expect(target.statuses.has('soaked')).toBe(false);
        });

        it('dispel con statusId quita solo ese estado', () => {
            const h = hero();
            const target = hero();
            const haste = c.statuses['haste']!;
            const ironShout = c.statuses['iron_shout']!;
            target.statuses.apply(haste, { duration: 10, source: h });
            target.statuses.apply(ironShout, { duration: 10, source: h });

            const eff = createEffect({ type: 'dispel' as const, statusId: 'haste' }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, target, 1);

            expect(target.statuses.has('haste')).toBe(false);
            expect(target.statuses.has('iron_shout')).toBe(true);
        });
    });

    describe('shareDamage', () => {
        it('crea ShareDamageEffect con targeting hit', () => {
            const eff = createEffect({ type: 'shareDamage' as const, percent: 30, duration: 6 }, c);
            expect(eff).toBeInstanceOf(ShareDamageEffect);
            expect(eff.targeting).toBe('hit');
        });

        it('aplica estado share_damage con shareTarget y sharePercent', () => {
            const h = hero();
            const target = hero();
            const eff = createEffect({ type: 'shareDamage' as const, percent: 30, duration: 6 }, c);
            const ctx = new FakeCtx(h);
            eff.apply(ctx, target, 1);

            expect(ctx.statusesApplied.length).toBe(1);
            const sa = ctx.statusesApplied[0]!;
            expect(sa.def.id).toBe('share_damage');
            expect(sa.duration).toBe(6);
            expect(sa.opts?.shareTarget).toBe(h);
            expect(sa.opts?.sharePercent).toBe(30);
        });
    });

    describe('invulnerable con vs (StatusDef)', () => {
        it('el campo vs existe en StatusDef', () => {
            // Verificar que un estado con immune y vs se parsea correctamente.
            const invulnRanged: StatusDef = {
                id: 'test_invuln_ranged',
                name: 'Invulnerable a distancia',
                description: 'Inmune a hechizos.',
                icon: '🛡',
                kind: 'buff',
                duration: 5,
                maxStacks: 1,
                modifiers: [],
                immune: true,
                vs: 'ranged',
            };
            expect(invulnRanged.vs).toBe('ranged');
            expect(invulnRanged.immune).toBe(true);
        });

        it('el campo vs=melee existe en StatusDef', () => {
            const invulnMelee: StatusDef = {
                id: 'test_invuln_melee',
                name: 'Invulnerable cuerpo a cuerpo',
                description: 'Inmune a ataques básicos.',
                icon: '🛡',
                kind: 'buff',
                duration: 5,
                maxStacks: 1,
                modifiers: [],
                immune: true,
                vs: 'melee',
            };
            expect(invulnMelee.vs).toBe('melee');
        });
    });

    describe('registro EFFECT_TYPES', () => {
        it('dispel y shareDamage están en EFFECT_TYPES', () => {
            expect(() => createEffect({ type: 'dispel' as const }, c)).not.toThrow();
            expect(() => createEffect({ type: 'shareDamage' as const, percent: 20, duration: 5 }, c)).not.toThrow();
        });
    });

    describe('share_damage en statuses.json', () => {
        it('el estado share_damage existe y es debuff', () => {
            const sd = c.statuses['share_damage'];
            expect(sd).toBeDefined();
            expect(sd!.kind).toBe('debuff');
            expect(sd!.maxStacks).toBe(1);
        });
    });
});
