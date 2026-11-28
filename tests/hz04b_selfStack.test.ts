import { describe, expect, it } from 'vitest';
import type { Actor } from '../src/rpg/actor';
import type { StatusDef } from '../src/rpg/contracts';
import type { EffectContext, TrapSpec, ZoneSpec } from '../src/rpg/effects';
import { SelfStackEffect, createEffect } from '../src/rpg/effects';
import type { HitSpec } from '../src/sim/damage';
import { Rng } from '../src/sim/rng';
import type { Vec2 } from '../src/sim/vec2';
import { content as loadContent, hero } from './rpg/helpers';

/** Contexto que aplica los estados al actor real (no solo los registra). */
class LiveStatusContext implements EffectContext {
    readonly origin: Vec2 = { x: 0, y: 0 };
    readonly aim: Vec2 = { x: 5, y: 0 };
    readonly dir = 0;
    readonly critChance = 0;
    readonly critBonus = 0;
    readonly tag: string;
    constructor(
        readonly caster: Actor,
        readonly rng: Rng = new Rng(3),
        readonly content = loadContent(),
        tag = 'test',
    ) {
        this.tag = tag;
    }
    damage(): void {}
    heal(): void {}
    restoreResource(): void {}
    applyStatus(t: Actor, d: StatusDef, dur: number, shield?: number, opts?: { shareTarget?: unknown; sharePercent?: number }): void {
        t.statuses.apply(d, { duration: dur, source: this.caster, shield, shareTarget: opts?.shareTarget, sharePercent: opts?.sharePercent });
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

describe('HZ-04b: selfStack — carga acumulativa', () => {
    const c = loadContent();

    it('crea SelfStackEffect', () => {
        const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
        expect(eff).toBeInstanceOf(SelfStackEffect);
        expect(eff.targeting).toBe('self');
    });

    it('primer lanzamiento: suma 1 stack', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
        const ctx = new LiveStatusContext(h);
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('selfStack_test')).toBeDefined();
        expect(h.statuses.get('selfStack_test')!.stacks).toBe(1);
        expect(h.statuses.get('selfStack_test')!.remaining).toBe(6);
    });

    it('segundo lanzamiento: suma hasta max', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
        const ctx = new LiveStatusContext(h);
        // Lanzamiento 1
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('selfStack_test')!.stacks).toBe(1);
        // Lanzamiento 2
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('selfStack_test')!.stacks).toBe(2);
    });

    it('tercer lanzamiento: no pasa de max', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
        const ctx = new LiveStatusContext(h);
        eff.apply(ctx, h, 1);
        eff.apply(ctx, h, 1);
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('selfStack_test')!.stacks).toBe(2);
    });

    it('renueva la duración al relanzar', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
        const ctx = new LiveStatusContext(h);
        eff.apply(ctx, h, 1);
        // Simular que pasan 4 s
        h.statuses.tick(4, () => {});
        expect(h.statuses.get('selfStack_test')!.remaining).toBeCloseTo(2, 4);
        // Relanzar: renueva a 6 s
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('selfStack_test')!.remaining).toBe(6);
    });

    it('self_stack existe en content', () => {
        expect(c.statuses['self_stack']).toBeDefined();
        expect(c.statuses['self_stack']!.kind).toBe('buff');
        expect(c.statuses['self_stack']!.maxStacks).toBeGreaterThan(1);
    });

    it('mantiene cargas independientes por hechizo', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
        eff.apply(new LiveStatusContext(h, new Rng(3), c, 'fiery_slash'), h, 1);
        eff.apply(new LiveStatusContext(h, new Rng(3), c, 'spark'), h, 1);

        expect(h.statuses.get('selfStack_fiery_slash')?.stacks).toBe(1);
        expect(h.statuses.get('selfStack_spark')?.stacks).toBe(1);
    });

    it('caduca si no se relanza a tiempo', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
        const ctx = new LiveStatusContext(h);
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('selfStack_test')).toBeDefined();
        // Avanzar 7 s (> duration)
        h.statuses.tick(7, () => {});
        expect(h.statuses.get('selfStack_test')).toBeUndefined();
    });

    it('parámetros distintos: percent 10, max 5, duration 15', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 10, max: 5, duration: 15 }, c);
        const ctx = new LiveStatusContext(h);
        for (let i = 0; i < 5; i++) eff.apply(ctx, h, 1);
        expect(h.statuses.get('selfStack_test')!.stacks).toBe(5);
        expect(h.statuses.get('selfStack_test')!.remaining).toBe(15);
        // Un 6to lanzamiento no pasa de 5
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('selfStack_test')!.stacks).toBe(5);
    });
});
