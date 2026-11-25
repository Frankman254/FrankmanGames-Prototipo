import type { FileId } from './files';

export interface HotApplyPlan {
    terrain: boolean;
    vegetation: boolean;
    navPaint: boolean;
    zones: boolean;
    rpgContent: boolean;
    fishing: boolean;
    stones: boolean;
}

const RPG_CONTENT_FILES: readonly FileId[] = ['npcs', 'merchants', 'professions', 'death', 'fishing'];

export function hotApplyPlan(files: readonly FileId[]): HotApplyPlan {
    const touched = new Set(files);
    return {
        terrain: touched.has('terrain'),
        vegetation: touched.has('vegetation'),
        navPaint: touched.has('navpaint'),
        zones: touched.has('zones'),
        rpgContent: RPG_CONTENT_FILES.some((file) => touched.has(file)),
        fishing: touched.has('fishing'),
        stones: touched.has('stones'),
    };
}
