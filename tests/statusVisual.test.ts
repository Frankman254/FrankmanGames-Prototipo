import { describe, expect, it } from 'vitest';
import type { FxDef } from '../src/data/fxSchema';
import { statusVisualFor } from '../src/render/fx/statusVisual';

const statuses: FxDef['statuses'] = {
    burn: { visual: 'flames', color: [0.9, 0.2, 0.1] },
};

describe('statusVisualFor', () => {
    it('uses the visual and color configured for the status', () => {
        expect(statusVisualFor({ id: 'burn', kind: 'debuff' }, statuses)).toEqual({
            visual: 'flames',
            color: [0.9, 0.2, 0.1],
        });
    });

    it('falls back to the default aura for an unconfigured buff', () => {
        expect(statusVisualFor({ id: 'unknown-buff', kind: 'buff' }, statuses)).toEqual({
            visual: 'aura',
            color: [0.9, 0.9, 0.6],
        });
    });

    it('omits an unconfigured debuff', () => {
        expect(statusVisualFor({ id: 'unknown-debuff', kind: 'debuff' }, statuses)).toBeNull();
    });
});
