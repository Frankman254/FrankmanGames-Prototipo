import { describe, expect, it } from 'vitest';
import { FILE_IDS, type FileId } from '../../src/editor/files';
import { hotApplyPlan, type HotApplyPlan } from '../../src/editor/hotApplyPlan';

const noActions: HotApplyPlan = {
    terrain: false,
    vegetation: false,
    navPaint: false,
    zones: false,
    rpgContent: false,
    fishing: false,
    stones: false,
};

const expectedActions: Record<FileId, Partial<HotApplyPlan>> = {
    terrain: { terrain: true },
    vegetation: { vegetation: true },
    npcs: { rpgContent: true },
    merchants: { rpgContent: true },
    zones: { zones: true },
    fishing: { rpgContent: true, fishing: true },
    navpaint: { navPaint: true },
    stones: { stones: true },
    professions: { rpgContent: true },
    death: { rpgContent: true },
};

describe('hotApplyPlan', () => {
    it('does not schedule work when no files changed', () => {
        expect(hotApplyPlan([])).toEqual(noActions);
    });

    it('maps every editable file to its existing application branch', () => {
        for (const file of FILE_IDS) {
            expect(hotApplyPlan([file]), file).toEqual({ ...noActions, ...expectedActions[file] });
        }
    });

    it('combines actions for multiple files and does not duplicate them', () => {
        expect(hotApplyPlan(['vegetation', 'fishing', 'fishing', 'stones'])).toEqual({
            ...noActions,
            vegetation: true,
            rpgContent: true,
            fishing: true,
            stones: true,
        });
    });
});
