import { describe, expect, it } from 'vitest';
import type { QuestView } from '../../src/rpg/contracts';
import { questJournalSections, questJournalText, questTrackerPresentation } from '../../src/ui/menus/questViewLogic';
import { session } from '../rpg/helpers';

function quest(id: string, state: QuestView['state']): QuestView {
    return {
        id,
        name: 'La pesca',
        summary: 'Consigue pescado para Celso.',
        chain: 'La mesa de Celso',
        state,
        giver: { id: 'celso', name: 'Celso' },
        turnIn: { id: 'marina', name: 'Marina Junco' },
        objectives: [{ text: 'Perca', current: 2, required: 3, done: false }],
        rewards: {
            xp: 40,
            gold: 12,
            items: [{ itemId: 'minor_health_potion', quantity: 3 }],
            learnSpell: 'gust',
        },
        tracked: false,
    };
}

describe('questViewLogic', () => {
    it('separa las misiones del diario sin cambiar el orden de aceptación', () => {
        const completed = quest('completed', 'completed');
        const ready = quest('ready', 'ready');
        const available = quest('available', 'available');
        const active = quest('active', 'active');
        const locked = quest('locked', 'locked');

        expect(questJournalSections([completed, ready, available, active, locked])).toEqual({
            open: [ready, active],
            done: [completed],
        });
    });

    it('prepara las cadenas del diario y conserva sus objetivos y recompensa', () => {
        const s = session();
        const active = questJournalText(quest('active', 'active'), s.content);

        expect(active.meta).toBe('Encargo de Celso · se entrega a Marina Junco');
        expect(questJournalText(quest('ready', 'ready'), s.content)).toEqual({
            name: 'La pesca',
            chain: 'La mesa de Celso',
            summary: 'Consigue pescado para Celso.',
            state: 'Por entregar',
            objectives: [{ text: 'Perca 2/3', done: false }],
            meta: 'Entrégasela a Marina Junco',
            reward: 'Recompensa: 40 XP · 12 monedas · Poción de vida menor ×3 · Hechizo: Ráfaga',
        });
    });

    it('prepara el nombre, avance, destino y firma del seguidor', () => {
        const active = questTrackerPresentation(quest('fishing', 'active'));
        const ready = questTrackerPresentation(quest('fishing', 'ready'));

        expect(active).toEqual({
            key: 'fishing|active|2',
            name: 'La pesca',
            objectives: [{ text: 'Perca 2/3', done: false }],
            next: null,
        });
        expect(ready).toMatchObject({
            key: 'fishing|ready|2',
            next: 'Entrégasela a Marina Junco',
        });
    });
});
