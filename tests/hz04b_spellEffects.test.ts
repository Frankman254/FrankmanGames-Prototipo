import { describe, expect, it } from 'vitest';
import { BonusVsStatusEffect, ChainEffect, createEffect, SelfStackEffect } from '../src/rpg/effects';
import { content } from './rpg/helpers';

describe('HZ-04b: Efectos de hechizo que faltan', () => {
    const c = content();

    describe('arrow_downpour deja soaked', () => {
        it('tiene un efecto status soaked', () => {
            const s = c.spells['arrow_downpour']!;
            const statusEff = s.effects.find((e) => e.type === 'status' && e.statusId === 'soaked');
            expect(statusEff).toBeDefined();
            expect(statusEff?.type === 'status' ? statusEff.duration : undefined).toBe(6);
        });
    });

    describe('flint_spark rebota', () => {
        it('tiene un efecto chain con 2 saltos', () => {
            const s = c.spells['flint_spark']!;
            const chain = s.effects.find((e) => e.type === 'chain');
            expect(chain).toBeDefined();
            expect(chain!.jumps).toBe(2);
            expect(chain!.radius).toBe(4); // HZ-04d: 4 m
            // No filtra por estado
            expect(chain!.onlyStatus).toBeUndefined();
        });
    });

    describe('eel_arrow rebota entre empapados', () => {
        it('tiene un efecto chain con onlyStatus soaked', () => {
            const s = c.spells['eel_arrow']!;
            const chain = s.effects.find((e) => e.type === 'chain');
            expect(chain).toBeDefined();
            expect(chain!.onlyStatus).toBe('soaked');
        });
    });

    describe('warp_tide pega más a empapados', () => {
        it('tiene un efecto bonusVsStatus contra soaked', () => {
            const s = c.spells['warp_tide']!;
            const bonus = s.effects.find((e) => e.type === 'bonusVsStatus');
            expect(bonus).toBeDefined();
            expect(bonus!.statusId).toBe('soaked');
            expect(bonus!.bonusDamage).toBeGreaterThan(0);
        });
    });

    describe('nuevos tipos de efecto', () => {
        it('chain crea ChainEffect', () => {
            const eff = createEffect({ type: 'chain', jumps: 2, radius: 5 }, c);
            expect(eff).toBeInstanceOf(ChainEffect);
        });

        it('bonusVsStatus crea BonusVsStatusEffect', () => {
            const eff = createEffect({ type: 'bonusVsStatus', statusId: 'soaked', bonusDamage: 10 }, c);
            expect(eff).toBeInstanceOf(BonusVsStatusEffect);
        });

        it('selfStack crea SelfStackEffect', () => {
            const eff = createEffect({ type: 'selfStack', percent: 10, max: 5, duration: 15 }, c);
            expect(eff).toBeInstanceOf(SelfStackEffect);
        });
    });

    describe('prueba de contenido: hechizos con descripción de rebote/carga/empapado', () => {
        it('cada hechizo cuya descripción hable de saltar, rebotar, cargar, mojados o empapados tiene el efecto correspondiente', () => {
            // "salta a" / "salta entre" = chain; "salta hacia atrás" = recoil (no chain).
            const soakedKeywords = ['mojado', 'empapado', 'mojados'];

            for (const [id, s] of Object.entries(c.spells)) {
                const desc = s.description.toLowerCase();

                // Si dice que salta a/entre enemigos, debe tener chain
                if (desc.includes('salta a') || desc.includes('salta entre') || desc.includes('rebota')) {
                    const hasChain = s.effects.some((e) => e.type === 'chain');
                    expect(hasChain, `${id}: descripción menciona rebote pero no tiene efecto chain`).toBe(true);
                }

                // Si dice que pega más a mojados/empapados, debe tener bonusVsStatus o status soaked
                if (soakedKeywords.some((k) => desc.includes(k)) && desc.includes('más')) {
                    const hasBonus = s.effects.some((e) => e.type === 'bonusVsStatus');
                    const hasSoakedStatus = s.effects.some((e) => e.type === 'status' && e.statusId === 'soaked');
                    const hasChainSoaked = s.effects.some((e) => e.type === 'chain' && e.onlyStatus === 'soaked');
                    expect(
                        hasBonus || hasSoakedStatus || hasChainSoaked,
                        `${id}: descripción menciona empapado pero no tiene efecto relacionado`,
                    ).toBe(true);
                }
            }
        });
    });

    describe('estado self_stack existe', () => {
        it('self_stack está registrado en statuses', () => {
            const ss = c.statuses['self_stack'];
            expect(ss).toBeDefined();
            expect(ss!.kind).toBe('buff');
            expect(ss!.maxStacks).toBeGreaterThan(1);
        });
    });
});
