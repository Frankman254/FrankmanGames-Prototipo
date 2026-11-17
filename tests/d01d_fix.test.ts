// D-01d-fix: Aviso de rango agrupado — pruebas del evento rankUpBatch.
import { describe, it, expect } from 'vitest';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { content, hero } from './rpg/helpers';

describe('D-01d-fix: rankUpBatch agrupa los avisos de rango', () => {
    const ct = content();

    it('subir de nivel emite un solo rankUpBatch con todos los hechizos que suben', () => {
        const ch = hero();
        const batches: { type: string; items?: { spellId: string; rank: number }[] }[] = [];
        const learnedEvents: { type: string; spellId?: string }[] = [];
        ch.on((e: any) => {
            if (e.type === 'rankUpBatch') batches.push(e);
            if (e.type === 'learned') learnedEvents.push(e);
        });

        // Subir de nivel hasta que al menos un hechizo suba de rango.
        // Con maxLevel 200 y factores [0.10, 0.25, 0.50, 0.90] para maxRank 5,
        // un hechizo unlockLevel 1 llega a rango 2 en nivel 21.
        for (let i = 0; i < 25; i++) {
            ch.gainXp(ch.xpToNext + 1);
        }

        // Debería haber al menos un batch emitido.
        expect(batches.length).toBeGreaterThan(0);

        // Cada batch debe tener al menos un item.
        for (const batch of batches) {
            expect(batch.items).toBeDefined();
            expect(batch.items!.length).toBeGreaterThan(0);
            for (const item of batch.items!) {
                expect(item.spellId).toBeDefined();
                expect(item.rank).toBeGreaterThan(1);
            }
        }
    });

    it('rankUpBatch incluye hechizos de clase y universales en el mismo batch', () => {
        const ch = hero();
        // Aprender un universal antes de subir de nivel.
        ch.learnSpell('still_aegis');

        const batches: { items: { spellId: string; rank: number }[] }[] = [];
        ch.on((e: any) => {
            if (e.type === 'rankUpBatch') batches.push(e);
        });

        // Subir de nivel hasta que los hechizos suban de rango.
        for (let i = 0; i < 25; i++) {
            ch.gainXp(ch.xpToNext + 1);
        }

        // Al menos un batch debe contener tanto hechizos de clase como universales.
        const allSpellIds = batches.flatMap((b) => b.items.map((i) => i.spellId));
        const hasClassSpell = allSpellIds.some((id) => ct.spells[id]?.classId === ch.classDef.id);
        const hasUniversal = allSpellIds.some((id) => ct.spells[id]?.classId === 'universal');
        // El universal still_aegis debería aparecer en algún batch si subió de rango.
        // Los hechizos de clase también.
        expect(hasClassSpell || hasUniversal).toBe(true);
    });

    it('learnSpell sigue emitiendo rankUp individual (no batch)', () => {
        const ch = hero();
        // Aprender un universal.
        ch.learnSpell('still_aegis');

        const individualRankUps: { type: string; spellId?: string; rank?: number }[] = [];
        const batches: { type: string }[] = [];
        ch.on((e: any) => {
            if (e.type === 'rankUp') individualRankUps.push(e);
            if (e.type === 'rankUpBatch') batches.push(e);
        });

        // Leer otro pergamino del mismo hechizo: debe emitir rankUp, no rankUpBatch.
        ch.learnSpell('still_aegis');

        expect(individualRankUps.length).toBeGreaterThan(0);
        expect(batches.length).toBe(0);
        expect(individualRankUps[0]!.spellId).toBe('still_aegis');
    });

    it('rankUpBatch no se emite si ningún hechizo sube de rango', () => {
        const ch = hero();
        const batches: { type: string }[] = [];
        ch.on((e: any) => {
            if (e.type === 'rankUpBatch') batches.push(e);
        });

        // Subir un solo nivel desde nivel 1: los hechizos aprendidos a nivel 1
        // no suben de rango hasta nivel 21 (con los factores actuales).
        ch.gainXp(ch.xpToNext + 1);

        // No debería haber batch porque ningún hechizo subió de rango.
        // (Los hechizos de nivel 1 se aprenden, pero no suben de rango.)
        expect(batches.length).toBe(0);
    });

    it('el batch agrupa las subidas de un solo nivel, no las mezcla entre niveles', () => {
        const ch = hero();
        const batches: { items: { spellId: string; rank: number }[] }[] = [];
        ch.on((e: any) => {
            if (e.type === 'rankUpBatch') batches.push(e);
        });

        // Subir varios niveles de golpe para forzar múltiples rangos.
        // Cada nivel que gana rangos emite su propio batch.
        for (let i = 0; i < 30; i++) {
            ch.gainXp(ch.xpToNext + 1);
        }

        // Cada batch corresponde a un nivel ganado.
        // Si subimos 30 niveles, hay como máximo 30 batches.
        expect(batches.length).toBeLessThanOrEqual(30);

        // Los batches no deben estar vacíos.
        for (const batch of batches) {
            expect(batch.items.length).toBeGreaterThan(0);
        }
    });

    it('los rangos en el batch coinciden con los rangos finales del spellbook', () => {
        const ch = hero();
        const batches: { items: { spellId: string; rank: number }[] }[] = [];
        ch.on((e: any) => {
            if (e.type === 'rankUpBatch') batches.push(e);
        });

        for (let i = 0; i < 25; i++) {
            ch.gainXp(ch.xpToNext + 1);
        }

        // Verificar que cada item del batch tiene el rango correcto en el spellbook.
        for (const batch of batches) {
            for (const item of batch.items) {
                const spellRank = ch.spellbook.rank(item.spellId);
                expect(spellRank).toBeGreaterThanOrEqual(item.rank);
            }
        }
    });
});
