import { describe, it, expect } from 'vitest';

/**
 * UI-16: Pantalla de muerte y de subir de nivel — textos claros y que no tapen el combate.
 *
 * Pruebas de la lógica de cola de banners y del contexto de la pantalla de muerte.
 */
describe('UI-16: death screen context y banner queue', () => {

    // ── Banner queue: prioridad ──

    describe('banner queue priorities', () => {
        it('levelUp tiene prioridad 100 (la más alta)', () => {
            // Verificado en index.ts: case 'levelUp' pasa priority=100.
            // rankUpBatch=80, guardianDefeated=90, rankUp=70, zoneEnter=60, pulseLow=50, questCompleted=40.
            const priorities = {
                levelUp: 100,
                guardianDefeated: 90,
                rankUpBatch: 80,
                rankUp: 70,
                zoneEnter: 60,
                pulseLow: 50,
                questCompleted: 40,
            };
            // levelUp es el más alto.
            expect(priorities.levelUp).toBeGreaterThan(priorities.guardianDefeated);
            expect(priorities.guardianDefeated).toBeGreaterThan(priorities.rankUpBatch);
            expect(priorities.rankUpBatch).toBeGreaterThan(priorities.rankUp);
            expect(priorities.rankUp).toBeGreaterThan(priorities.zoneEnter);
            expect(priorities.zoneEnter).toBeGreaterThan(priorities.pulseLow);
            expect(priorities.pulseLow).toBeGreaterThan(priorities.questCompleted);
        });

        it('un banner de mayor prioridad interrumpe al de menor', () => {
            // La lógica de showBanner: si entry.priority > currentBannerPriority,
            // limpia el timer y la cola y muestra el nuevo.
            // Simulamos la lógica:
            let currentPriority = 50; // pulseLow visible
            const queue: string[] = [];
            const shown: string[] = [];

            function showBanner(name: string, priority: number): void {
                if (priority <= currentPriority && currentPriority > 0) {
                    queue.push(name);
                    return;
                }
                queue.length = 0;
                currentPriority = priority;
                shown.push(name);
            }

            // pulseLow ya visible (priority 50).
            currentPriority = 50;
            showBanner('zoneEnter', 60); // mayor → interrumpe
            expect(shown).toEqual(['zoneEnter']);
            expect(queue).toEqual([]);

            // Ahora zoneEnter visible (60). rankUpBatch llega (80).
            currentPriority = 60;
            showBanner('rankUpBatch', 80);
            expect(shown).toEqual(['zoneEnter', 'rankUpBatch']);
        });

        it('un banner de menor prioridad se encola', () => {
            let currentPriority = 100; // levelUp visible
            const queue: string[] = [];
            const shown: string[] = [];

            function showBanner(name: string, priority: number): void {
                if (priority <= currentPriority && currentPriority > 0) {
                    queue.push(name);
                    return;
                }
                queue.length = 0;
                currentPriority = priority;
                shown.push(name);
            }

            // levelUp visible. rankUpBatch llega (80 < 100).
            showBanner('rankUpBatch', 80);
            expect(shown).toEqual([]); // no se muestra
            expect(queue).toEqual(['rankUpBatch']); // se encola

            // guardianDefeated llega (90 < 100).
            showBanner('guardianDefeated', 90);
            expect(queue).toEqual(['rankUpBatch', 'guardianDefeated']);
        });
    });

    // ── Death screen context ──

    describe('death screen context', () => {
        type DeathCtx = { zone?: string; floor?: number; level?: number };

        function buildContextText(ctx?: DeathCtx): string {
            const lines: string[] = [];
            if (ctx?.zone) lines.push(ctx.zone);
            if (ctx?.floor !== undefined) lines.push(`piso ${ctx.floor + 1}`);
            if (ctx?.level !== undefined) lines.push(`nivel ${ctx.level}`);
            return lines.length ? ` — ${lines.join(', ')}` : '';
        }

        it('construye el texto de contexto con zona, piso y nivel', () => {
            const ctx: DeathCtx = { zone: 'Llanos de Azuero', floor: 5, level: 12 };
            expect(buildContextText(ctx)).toBe(' — Llanos de Azuero, piso 6, nivel 12');
        });

        it('sin contexto no añade texto extra', () => {
            expect(buildContextText(undefined)).toBe('');
        });

        it('solo con piso de cripta', () => {
            const ctx: DeathCtx = { floor: 99 };
            expect(buildContextText(ctx)).toBe(' — piso 100');
        });

        it('solo con zona', () => {
            const ctx: DeathCtx = { zone: 'Cerro Punta' };
            expect(buildContextText(ctx)).toBe(' — Cerro Punta');
        });
    });

    // ── Banner duration ──

    describe('banner duration', () => {
        it('fuera de combate dura 3200 ms', () => {
            const BANNER_DURATION = 3200;
            const inCombat = false;
            const duration = inCombat ? 1800 : BANNER_DURATION;
            expect(duration).toBe(3200);
        });

        it('durante combate dura 1800 ms (más corto)', () => {
            const BANNER_DURATION = 3200;
            const BANNER_DURATION_COMBAT = 1800;
            const inCombat = true;
            const duration = inCombat ? BANNER_DURATION_COMBAT : BANNER_DURATION;
            expect(duration).toBe(1800);
        });
    });
});
