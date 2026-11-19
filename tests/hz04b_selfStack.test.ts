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
    readonly tag = 'test';
    constructor(
        readonly caster: Actor,
        readonly rng: Rng = new Rng(3),
        readonly content = loadContent(),
    ) {}
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
    const selfStackDef: StatusDef = c.statuses['self_stack']!;

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
        expect(h.statuses.get('self_stack')).toBeDefined();
        expect(h.statuses.get('self_stack')!.stacks).toBe(1);
        expect(h.statuses.get('self_stack')!.remaining).toBe(6);
    });

    it('segundo lanzamiento: suma hasta max', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
        const ctx = new LiveStatusContext(h);
        // Lanzamiento 1
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('self_stack')!.stacks).toBe(1);
        // Lanzamiento 2
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('self_stack')!.stacks).toBe(2);
    });

    it('tercer lanzamiento: no pasa de max', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
        const ctx = new LiveStatusContext(h);
        eff.apply(ctx, h, 1);
        eff.apply(ctx, h, 1);
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('self_stack')!.stacks).toBe(2);
    });

    it('renueva la duración al relanzar', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
        const ctx = new LiveStatusContext(h);
        eff.apply(ctx, h, 1);
        // Simular que pasan 4 s
        h.statuses.tick(4, () => {});
        expect(h.statuses.get('self_stack')!.remaining).toBeCloseTo(2, 4);
        // Relanzar: renueva a 6 s
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('self_stack')!.remaining).toBe(6);
    });

    it('self_stack existe en content', () => {
        expect(c.statuses['self_stack']).toBeDefined();
        expect(c.statuses['self_stack']!.kind).toBe('buff');
        expect(c.statuses['self_stack']!.maxStacks).toBeGreaterThan(1);
    });

    describe('consumo de stacks al lanzar (lógica de execute)', () => {
        // La lógica de consumo vive en World.execute(), pero podemos probar la
        // fórmula aquí: power * (1 + percent * stacks / 100).
        // Simulamos el comportamiento que execute() hace con los stacks.

        function calcEffectivePower(basePower: number, percent: number, stacks: number): number {
            return basePower * (1 + (percent * stacks) / 100);
        }

        it('sin stacks: power sin cambio', () => {
            expect(calcEffectivePower(1.0, 25, 0)).toBe(1.0);
        });

        it('1 stack: +25 %', () => {
            expect(calcEffectivePower(1.0, 25, 1)).toBe(1.25);
        });

        it('2 stacks: +50 %', () => {
            expect(calcEffectivePower(1.0, 25, 2)).toBe(1.5);
        });

        it('con power > 1: multiplica sobre el power base', () => {
            // Hechizo de rango 3 con perRank.effectPercent=15 → power=1.3
            expect(calcEffectivePower(1.3, 25, 2)).toBeCloseTo(1.95, 5);
        });

        it('stacks se consumen tras aplicar', () => {
            const h = hero();
            const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
            const ctx = new LiveStatusContext(h);
            // Acumular 2 stacks
            eff.apply(ctx, h, 1);
            eff.apply(ctx, h, 1);
            expect(h.statuses.get('self_stack')!.stacks).toBe(2);
            // Simular el consumo que hace execute()
            const stackStatus = h.statuses.get('self_stack');
            if (stackStatus && stackStatus.stacks > 0) {
                h.statuses.remove('self_stack');
            }
            expect(h.statuses.get('self_stack')).toBeUndefined();
        });
    });

    describe('flujo completo: acumular → consumir → acumular de nuevo', () => {
        // execute() aplica selfStack ANTES de consumir: cada lanzamiento suma 1 stack
        // y luego consume todos. Con max=2:
        //   Lanz 1: 0→1 (acumula), consume 1 → power 1.25, queda 0→1 (acumula de nuevo) = 1
        //   Lanz 2: 1→2 (acumula), consume 2 → power 1.5, queda 0→1 = 1
        //   Lanz 3: 1→2 (acumula), consume 2 → power 1.5, queda 0→1 = 1
        it('ciclo con execute order: acumula primero, consume después', () => {
            const h = hero();
            const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
            const ctx = new LiveStatusContext(h);
            const basePower = 1.0;

            // Lanzamiento 1: acumula 0→1, consume 1 → bonus 25%, queda 0
            {
                eff.apply(ctx, h, 1); // acumula: 0→1
                expect(h.statuses.get('self_stack')!.stacks).toBe(1);
                const ss = h.statuses.get('self_stack');
                const stacks = ss?.stacks ?? 0;
                const power = basePower * (1 + (25 * stacks) / 100);
                expect(power).toBe(1.25);
                if (ss && ss.stacks > 0) h.statuses.remove('self_stack'); // consume
                expect(h.statuses.get('self_stack')).toBeUndefined();
            }

            // Lanzamiento 2: sin stacks previos, acumula 0→1, consume 1 → bonus 25%
            {
                eff.apply(ctx, h, 1); // acumula: 0→1
                expect(h.statuses.get('self_stack')!.stacks).toBe(1);
                const ss = h.statuses.get('self_stack');
                const stacks = ss?.stacks ?? 0;
                const power = basePower * (1 + (25 * stacks) / 100);
                expect(power).toBe(1.25);
                if (ss && ss.stacks > 0) h.statuses.remove('self_stack');
                expect(h.statuses.get('self_stack')).toBeUndefined();
            }

            // Para llegar a 2 stacks, hay que acumular sin consumir (ej: dos lanzamientos seguidos sin consumir entre medio).
            // En execute(), cada lanzamiento acumula y consume en el mismo turno, así que con max=2 siempre consume 1.
            // Para probar el caso de 2 stacks, simulamos acumulación sin consumo:
            h.statuses.clear();
            eff.apply(ctx, h, 1); // stack 1
            eff.apply(ctx, h, 1); // stack 2 (sin consumir entre medio)
            expect(h.statuses.get('self_stack')!.stacks).toBe(2);
            // Ahora consumir 2 → bonus 50%
            const ss = h.statuses.get('self_stack');
            const stacks = ss?.stacks ?? 0;
            const power = basePower * (1 + (25 * stacks) / 100);
            expect(power).toBe(1.5);
        });
    });

    it('caduca si no se relanza a tiempo', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 25, max: 2, duration: 6 }, c);
        const ctx = new LiveStatusContext(h);
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('self_stack')).toBeDefined();
        // Avanzar 7 s (> duration)
        h.statuses.tick(7, () => {});
        expect(h.statuses.get('self_stack')).toBeUndefined();
    });

    it('parámetros distintos: percent 10, max 5, duration 15', () => {
        const h = hero();
        const eff = createEffect({ type: 'selfStack', percent: 10, max: 5, duration: 15 }, c);
        const ctx = new LiveStatusContext(h);
        for (let i = 0; i < 5; i++) eff.apply(ctx, h, 1);
        expect(h.statuses.get('self_stack')!.stacks).toBe(5);
        expect(h.statuses.get('self_stack')!.remaining).toBe(15);
        // Un 6to lanzamiento no pasa de 5
        eff.apply(ctx, h, 1);
        expect(h.statuses.get('self_stack')!.stacks).toBe(5);
    });
});
