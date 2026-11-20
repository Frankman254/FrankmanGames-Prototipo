// UI-12: Filtros de categoría del chat (combate, botín, sistema)
// y verificación de que la regeneración no inunda el chat.
import { describe, expect, it } from 'vitest';
import { ChatLog, type ChatCategory } from '../src/ui/chatLog';
import { CombatLog } from '../src/ui/combatLog';

describe('UI-12: filtros de categoría del chat', () => {
    const maxLines = 200;

    describe('ChatLog.viewWithFilters', () => {
        it('sin filtros activos oculta todo', () => {
            const log = new ChatLog(maxLines);
            log.add({ channel: 'combat', author: null, text: 'daño', category: 'combat' });
            log.add({ channel: 'combat', author: null, text: 'botín', category: 'loot' });
            log.add({ channel: 'system', author: null, text: 'zona', category: 'system' });
            const filters = { combat: false, loot: false, system: false };
            expect(log.viewWithFilters(null, filters)).toHaveLength(0);
        });

        it('con todos activos muestra todo', () => {
            const log = new ChatLog(maxLines);
            log.add({ channel: 'combat', author: null, text: 'daño', category: 'combat' });
            log.add({ channel: 'combat', author: null, text: 'botín', category: 'loot' });
            log.add({ channel: 'system', author: null, text: 'zona', category: 'system' });
            const filters = { combat: true, loot: true, system: true };
            expect(log.viewWithFilters(null, filters)).toHaveLength(3);
        });

        it('desactivar combate oculta solo combate', () => {
            const log = new ChatLog(maxLines);
            log.add({ channel: 'combat', author: null, text: 'daño', category: 'combat' });
            log.add({ channel: 'combat', author: null, text: 'botín', category: 'loot' });
            log.add({ channel: 'system', author: null, text: 'zona', category: 'system' });
            const filters = { combat: false, loot: true, system: true };
            const visible = log.viewWithFilters(null, filters);
            expect(visible).toHaveLength(2);
            expect(visible[0]!.text).toBe('botín');
            expect(visible[1]!.text).toBe('zona');
        });

        it('desactivar botín oculta solo botín', () => {
            const log = new ChatLog(maxLines);
            log.add({ channel: 'combat', author: null, text: 'daño', category: 'combat' });
            log.add({ channel: 'combat', author: null, text: 'botín', category: 'loot' });
            log.add({ channel: 'system', author: null, text: 'zona', category: 'system' });
            const filters = { combat: true, loot: false, system: true };
            const visible = log.viewWithFilters(null, filters);
            expect(visible).toHaveLength(2);
            expect(visible[0]!.text).toBe('daño');
            expect(visible[1]!.text).toBe('zona');
        });

        it('desactivar sistema oculta solo sistema', () => {
            const log = new ChatLog(maxLines);
            log.add({ channel: 'combat', author: null, text: 'daño', category: 'combat' });
            log.add({ channel: 'combat', author: null, text: 'botín', category: 'loot' });
            log.add({ channel: 'system', author: null, text: 'zona', category: 'system' });
            const filters = { combat: true, loot: true, system: false };
            const visible = log.viewWithFilters(null, filters);
            expect(visible).toHaveLength(2);
            expect(visible[0]!.text).toBe('daño');
            expect(visible[1]!.text).toBe('botín');
        });

        it('línea sin categoría se trata como sistema', () => {
            const log = new ChatLog(maxLines);
            log.add({ channel: 'combat', author: null, text: 'sin cat' });
            const filters = { combat: true, loot: true, system: false };
            const visible = log.viewWithFilters(null, filters);
            expect(visible).toHaveLength(0);
        });

        it('combina canal y filtros', () => {
            const log = new ChatLog(maxLines);
            log.add({ channel: 'combat', author: null, text: 'daño', category: 'combat' });
            log.add({ channel: 'system', author: null, text: 'zona', category: 'system' });
            const filters = { combat: true, loot: true, system: true };
            // Solo canal combat
            const visible = log.viewWithFilters('combat', filters);
            expect(visible).toHaveLength(1);
            expect(visible[0]!.text).toBe('daño');
        });

        it('dos categorías desactivadas deja solo una', () => {
            const log = new ChatLog(maxLines);
            log.add({ channel: 'combat', author: null, text: 'daño', category: 'combat' });
            log.add({ channel: 'combat', author: null, text: 'botín', category: 'loot' });
            log.add({ channel: 'system', author: null, text: 'zona', category: 'system' });
            const filters = { combat: false, loot: false, system: true };
            const visible = log.viewWithFilters(null, filters);
            expect(visible).toHaveLength(1);
            expect(visible[0]!.category).toBe('system');
        });
    });

    describe('CombatLog: categorías en las líneas', () => {
        it('subir de nivel tiene categoría system', () => {
            const logLines: Array<{ channel: string; category?: ChatCategory }> = [];
            const log = new CombatLog((ch, _parts, cat) => logLines.push({ channel: ch, category: cat }));
            const events = [{ type: 'levelUp' as const, level: 5 }];
            log.handle({} as any, events);
            expect(logLines).toHaveLength(1);
            expect(logLines[0]!.channel).toBe('system');
            expect(logLines[0]!.category).toBe('system');
        });

        it('XP tiene categoría combat', () => {
            const logLines: Array<{ channel: string; category?: ChatCategory }> = [];
            const log = new CombatLog((ch, _parts, cat) => logLines.push({ channel: ch, category: cat }));
            const events = [{ type: 'xp' as const, amount: 50 }];
            log.handle({} as any, events);
            expect(logLines).toHaveLength(1);
            expect(logLines[0]!.category).toBe('combat');
        });

        it('lootPickup de mascota tiene categoría loot', () => {
            const logLines: Array<{ channel: string; category?: ChatCategory }> = [];
            const log = new CombatLog((ch, _parts, cat) => logLines.push({ channel: ch, category: cat }));
            const events = [{ type: 'lootPickup' as const, lootId: 1, byPet: true }];
            log.handle({} as any, events);
            expect(logLines).toHaveLength(1);
            expect(logLines[0]!.category).toBe('loot');
        });

        it('lootPickup del jugador no genera línea', () => {
            const logLines: Array<{ channel: string; category?: ChatCategory }> = [];
            const log = new CombatLog((ch, _parts, cat) => logLines.push({ channel: ch, category: cat }));
            const events = [{ type: 'lootPickup' as const, lootId: 1, byPet: false }];
            log.handle({} as any, events);
            expect(logLines).toHaveLength(0);
        });

        it('regeneración natural no genera línea en el chat', () => {
            const logLines: Array<{ channel: string; category?: ChatCategory }> = [];
            const log = new CombatLog((ch, _parts, cat) => logLines.push({ channel: ch, category: cat }));
            const events = [{ type: 'heal' as const, targetId: 0, amount: 5, source: 'regen' }];
            log.handle({} as any, events);
            expect(logLines).toHaveLength(0);
        });

        it('curas fraccionarias < 1 no generan línea', () => {
            const logLines: Array<{ channel: string; category?: ChatCategory }> = [];
            const log = new CombatLog((ch, _parts, cat) => logLines.push({ channel: ch, category: cat }));
            const events = [{ type: 'heal' as const, targetId: 0, amount: 0.3, source: 'some_status' }];
            log.handle({} as any, events);
            expect(logLines).toHaveLength(0);
        });
    });
});
