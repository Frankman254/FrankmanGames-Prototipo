// HZ-07: Hechizos desconectados por el rework.
// Prueba que parseEffect no pierde claves del JSON y que cada hechizo hace algo visible.
import { describe, expect, it } from 'vitest';
import type { EffectDef } from '../src/rpg/contracts';
import { parseEffect } from '../src/rpg/content';
import { Reader } from '../src/data/validate';
import { compileSpell } from '../src/rpg/spells';
import { RecordingContext, hero, content } from './rpg/helpers';
import type { Actor } from '../src/rpg/actor';
import { Rng } from '../src/sim/rng';

describe('HZ-07: Hechizos desconectados', () => {
    const c = content();

    describe('parseEffect no pierde claves', () => {
        it('cada efecto parseado tiene las propiedades obligatorias de su tipo', () => {
            const allMissing: { spell: string; effectIdx: number; keys: string[] }[] = [];

            for (const [spellId, def] of Object.entries(c.spells)) {
                if (def.devOnly) continue;
                for (let i = 0; i < def.effects.length; i++) {
                    const parsed = def.effects[i];
                    if (!parsed) continue;
                    const missing = verifyEffectComplete(parsed);
                    if (missing.length > 0) {
                        allMissing.push({ spell: spellId, effectIdx: i, keys: missing });
                    }
                }
            }

            if (allMissing.length > 0) {
                const lines = allMissing.map((m) =>
                    `  ${m.spell} efecto[${m.effectIdx}]: propiedades faltantes ${m.keys.join(', ')}`
                );
                expect(allMissing.length, 'Efectos con propiedades faltantes.\n' + lines.join('\n')).toBe(0);
            }
        });

        it('shield.perLevel se preserva al parsear', () => {
            const r = new Reader('test');
            const parsed = parseEffect(r, { type: 'shield', amount: 100, duration: 5, perLevel: 5 });
            expect(parsed.type).toBe('shield');
            const shieldDef = parsed as Extract<EffectDef, { type: 'shield' }>;
            expect(shieldDef.perLevel).toBe(5);
        });

        it('pushDamage.perLevel se preserva al parsear', () => {
            const r = new Reader('test');
            const parsed = parseEffect(r, { type: 'pushDamage', value: 10, duration: 8, perLevel: 0.5 });
            expect(parsed.type).toBe('pushDamage');
            const pushDef = parsed as Extract<EffectDef, { type: 'pushDamage' }>;
            expect(pushDef.perLevel).toBe(0.5);
        });
    });

    describe('cada hechizo hace algo visible', () => {
        // Para cada hechizo de las 3 clases, a nivel 1 y nivel 200,
        // compilarlo y aplicar los efectos a un objetivo falso.
        // Cada hechizo debe producir al menos un call en el contexto.

        const clases = ['ember_vanguard', 'storm_weaver', 'mangrove_hunter'];
        const niveles = [1, 200];

        for (const clase of clases) {
            for (const nivel of niveles) {
                it(`${clase} a nivel ${nivel}: todos los hechizos aprendidos producen efectos`, () => {
                    const h = hero(clase);
                    h.level = nivel;
                    h.xp = 0;

                    // Aprende todos los hechizos disponibles.
                    for (const [spellId, def] of Object.entries(c.spells)) {
                        if (def.devOnly) continue;
                        if (def.classId !== null && def.classId !== clase) continue;
                        if (def.unlockLevel && def.unlockLevel > nivel) continue;
                        h.spellbook.learn(spellId);
                    }

                    const target: Actor = {
                        id: 999,
                        alive: true,
                        pos: { x: 5, y: 0 },
                        statuses: {
                            has: () => false,
                            get: () => null,
                            list: [],
                            add: () => {},
                            remove: () => {},
                        } as any,
                    } as Actor;

                    const disconnected: string[] = [];

                    for (const [spellId] of h.spellbook.known) {
                        const def = c.spells[spellId];
                        if (!def || def.devOnly) continue;

                        const rank = h.spellbook.rank(spellId);
                        const compiled = compileSpell(c, def, rank);

                        const ctx = new RecordingContext(h, new Rng(42));

                        // Aplicar cada efecto al target.
                        for (const eff of compiled.effects) {
                            try {
                                if (eff.targeting === 'hit') {
                                    eff.apply(ctx, target, compiled.power);
                                } else {
                                    eff.apply(ctx, h, compiled.power);
                                }
                            } catch (e) {
                                // Si un efecto falla al crear la instancia (estado no encontrado, etc.),
                                // eso es un desconexión.
                                disconnected.push(`${spellId} (error: ${e instanceof Error ? e.message : String(e)})`);
                            }
                        }

                        // Algunos efectos operan sin llamar al contexto:
                        // - dispel: modifica target.statuses directamente.
                        // - pushDamage: solo se activa al hacer knockback en world.ts.
                        // - chain: solo marca el objetivo para world.ts.
                        // Si solo tiene estos efectos, no es desconectado.
                        const silentTypes = new Set(['dispel', 'pushDamage', 'chain']);
                        const allSilent = def.effects.every((e) => silentTypes.has(e.type));
                        if (ctx.calls.length === 0 && !allSilent) {
                            disconnected.push(spellId);
                        }
                    }

                    if (disconnected.length > 0) {
                        expect(
                            disconnected.length,
                            `Hechizos desconectados (${clase}, nivel ${nivel}): ${disconnected.join(', ')}`
                        ).toBe(0);
                    }
                });
            }
        }
    });
});

/**
 * Verifica que un efecto parseado tenga todas las propiedades obligatorias
 * que su tipo declara. Devuelve las propiedades faltantes.
 */
function verifyEffectComplete(e: EffectDef): string[] {
    const missing: string[] = [];
    switch (e.type) {
        case 'damage': {
            const d = e as Extract<EffectDef, { type: 'damage' }>;
            if (d.min === undefined) missing.push('min');
            if (d.max === undefined) missing.push('max');
            if (d.element === undefined) missing.push('element');
            break;
        }
        case 'heal': {
            const h = e as Extract<EffectDef, { type: 'heal' }>;
            if (h.min === undefined) missing.push('min');
            if (h.max === undefined) missing.push('max');
            break;
        }
        case 'status': {
            const s = e as Extract<EffectDef, { type: 'status' }>;
            if (s.statusId === undefined) missing.push('statusId');
            break;
        }
        case 'shield': {
            const s = e as Extract<EffectDef, { type: 'shield' }>;
            if (s.amount === undefined) missing.push('amount');
            if (s.duration === undefined) missing.push('duration');
            // perLevel es opcional, pero si el JSON lo tenía, debería estar aquí.
            break;
        }
        case 'knockback': {
            const k = e as Extract<EffectDef, { type: 'knockback' }>;
            if (k.distance === undefined) missing.push('distance');
            break;
        }
        case 'dash': {
            const d = e as Extract<EffectDef, { type: 'dash' }>;
            if (d.distance === undefined) missing.push('distance');
            break;
        }
        case 'teleport': {
            const t = e as Extract<EffectDef, { type: 'teleport' }>;
            if (t.maxDistance === undefined) missing.push('maxDistance');
            break;
        }
        case 'restoreResource': {
            const r = e as Extract<EffectDef, { type: 'restoreResource' }>;
            if (r.amount === undefined) missing.push('amount');
            break;
        }
        case 'summon': {
            const s = e as Extract<EffectDef, { type: 'summon' }>;
            if (s.archetype === undefined) missing.push('archetype');
            if (s.count === undefined) missing.push('count');
            if (s.duration === undefined) missing.push('duration');
            break;
        }
        case 'zone': {
            const z = e as Extract<EffectDef, { type: 'zone' }>;
            if (z.radius === undefined) missing.push('radius');
            if (z.duration === undefined) missing.push('duration');
            if (z.every === undefined) missing.push('every');
            // effects puede estar vacío en datos (el parser debería fallar, pero si no, es hallazgo).
            if (!z.effects) missing.push('effects');
            break;
        }
        case 'blink': {
            const b = e as Extract<EffectDef, { type: 'blink' }>;
            if (b.maxDistance === undefined) missing.push('maxDistance');
            break;
        }
        case 'swap':
            break; // Sin propiedades obligatorias.
        case 'pull': {
            const p = e as Extract<EffectDef, { type: 'pull' }>;
            if (p.distance === undefined) missing.push('distance');
            break;
        }
        case 'recoil': {
            const r = e as Extract<EffectDef, { type: 'recoil' }>;
            if (r.distance === undefined) missing.push('distance');
            break;
        }
        case 'trap': {
            const t = e as Extract<EffectDef, { type: 'trap' }>;
            if (t.radius === undefined) missing.push('radius');
            if (t.duration === undefined) missing.push('duration');
            if (!t.effects) missing.push('effects');
            break;
        }
        case 'reveal': {
            const r = e as Extract<EffectDef, { type: 'reveal' }>;
            if (r.radius === undefined) missing.push('radius');
            if (r.duration === undefined) missing.push('duration');
            break;
        }
        case 'chain': {
            const c = e as Extract<EffectDef, { type: 'chain' }>;
            if (c.jumps === undefined) missing.push('jumps');
            if (c.radius === undefined) missing.push('radius');
            break;
        }
        case 'bonusVsStatus': {
            const b = e as Extract<EffectDef, { type: 'bonusVsStatus' }>;
            if (b.statusId === undefined) missing.push('statusId');
            if (b.bonusDamage === undefined) missing.push('bonusDamage');
            break;
        }
        case 'selfStack': {
            const s = e as Extract<EffectDef, { type: 'selfStack' }>;
            if (s.percent === undefined) missing.push('percent');
            if (s.max === undefined) missing.push('max');
            if (s.duration === undefined) missing.push('duration');
            break;
        }
        case 'power': {
            const p = e as Extract<EffectDef, { type: 'power' }>;
            if (p.value === undefined) missing.push('value');
            if (p.duration === undefined) missing.push('duration');
            break;
        }
        case 'critChance': {
            const c = e as Extract<EffectDef, { type: 'critChance' }>;
            if (c.value === undefined) missing.push('value');
            if (c.duration === undefined) missing.push('duration');
            break;
        }
        case 'critDamage': {
            const c = e as Extract<EffectDef, { type: 'critDamage' }>;
            if (c.value === undefined) missing.push('value');
            if (c.duration === undefined) missing.push('duration');
            break;
        }
        case 'fixedDamage': {
            const f = e as Extract<EffectDef, { type: 'fixedDamage' }>;
            if (f.value === undefined) missing.push('value');
            if (f.duration === undefined) missing.push('duration');
            break;
        }
        case 'pushDamage': {
            const p = e as Extract<EffectDef, { type: 'pushDamage' }>;
            if (p.value === undefined) missing.push('value');
            if (p.duration === undefined) missing.push('duration');
            break;
        }
        case 'dispel':
            break; // kind y statusId son opcionales.
        case 'shareDamage': {
            const s = e as Extract<EffectDef, { type: 'shareDamage' }>;
            if (s.percent === undefined) missing.push('percent');
            if (s.duration === undefined) missing.push('duration');
            break;
        }
    }
    return missing;
}
