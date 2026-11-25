import { describe, expect, it } from 'vitest';
import type { DialogueView } from '../../src/rpg/contracts';
import { dialogueChoiceIndex, dialogueTransition } from '../../src/ui/menus/dialogueLogic';

const view: DialogueView = {
    npcId: 'npc',
    name: 'Vecina',
    title: 'Artesana',
    text: 'Buenas.',
    quest: null,
    options: [{ index: 0, text: 'Seguir', kind: 'talk' }],
};

describe('dialogueLogic', () => {
    it('solo devuelve el índice de una opción existente en la vista actual', () => {
        expect(dialogueChoiceIndex(null, 0)).toBeNull();
        expect(dialogueChoiceIndex(view, -1)).toBeNull();
        expect(dialogueChoiceIndex(view, 1)).toBeNull();
        expect(dialogueChoiceIndex(view, 0)).toBe(0);
    });

    it('avanza a la vista siguiente cuando la sesión devuelve otro nodo', () => {
        const next = { ...view, text: '¿Qué necesitas?' };

        expect(dialogueTransition(next)).toEqual({ type: 'next', view: next });
    });

    it('cierra la transición cuando la sesión no devuelve otro nodo', () => {
        expect(dialogueTransition(null)).toEqual({ type: 'close' });
    });
});
