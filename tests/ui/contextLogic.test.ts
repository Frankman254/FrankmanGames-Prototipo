import { describe, expect, it } from 'vitest';
import { findItemByUid } from '../../src/ui/menus/contextLogic';

describe('contextLogic', () => {
    it('busca primero en la mochila y después en el equipo', () => {
        const carried = { uid: 'shared', itemId: 'potion' };
        const equipped = { uid: 'shared', itemId: 'ring' };

        expect(findItemByUid([null, carried], [equipped], 'shared')).toBe(carried);
        expect(findItemByUid([null], [equipped], 'shared')).toBe(equipped);
    });

    it('devuelve null si el uid no está en la mochila ni en el equipo', () => {
        expect(findItemByUid([null], [null], 'missing')).toBeNull();
    });
});