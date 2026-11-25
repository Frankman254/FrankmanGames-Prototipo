import type { DialogueView } from '../../rpg/contracts';

export function dialogueChoiceIndex(view: DialogueView | null, index: number): number | null {
    if (!view || !view.options[index]) return null;
    return index;
}

export type DialogueTransition = { type: 'next'; view: DialogueView } | { type: 'close' };

export function dialogueTransition(next: DialogueView | null): DialogueTransition {
    return next ? { type: 'next', view: next } : { type: 'close' };
}
