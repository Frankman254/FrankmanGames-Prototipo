import { describe, expect, it } from 'vitest';
import { chatLineMatchesView } from '../../src/ui/menus/chatLogic';

describe('chatLineMatchesView', () => {
    const allFilters = { combat: true, loot: true, system: true };

    it('matches the selected channel, or every channel when none is selected', () => {
        const line = { channel: 'general', author: null, text: 'hola' };

        expect(chatLineMatchesView('general', line, allFilters)).toBe(true);
        expect(chatLineMatchesView('group', line, allFilters)).toBe(false);
        expect(chatLineMatchesView(null, line, allFilters)).toBe(true);
    });

    it('uses the enabled category and treats lines without one as system', () => {
        const filters = { combat: false, loot: true, system: false };

        expect(
            chatLineMatchesView(null, { channel: 'general', author: null, text: 'golpe', category: 'combat' }, filters),
        ).toBe(false);
        expect(
            chatLineMatchesView(null, { channel: 'general', author: null, text: 'botín', category: 'loot' }, filters),
        ).toBe(true);
        expect(chatLineMatchesView(null, { channel: 'system', author: null, text: 'aviso' }, filters)).toBe(false);
    });
});
