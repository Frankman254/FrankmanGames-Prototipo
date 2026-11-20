import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import {
    dungeonCoverageProfiles,
    itemCatalogPresets,
    regionCoverageProfiles,
    spellCatalogPresets,
    setShowcasePresets,
} from '../src/dev/presetCoverage';
import { buildPresetSave, presetProblems, type PresetWorld } from '../src/dev/presets';
import { ZoneMap } from '../src/sim/zones';
import { buildProfile } from '../scripts/balance/v3/profiles';
import { rankAtLevel } from '../src/rpg/spellRank';

const data = loadGameData();
const dungeon = loadDungeon(data);
const world: PresetWorld = {
    zones: new ZoneMap(data.zones),
    width: 1280,
    depth: 1152,
    dungeons: { crypt: { floors: dungeon.floors.length, title: (floor) => `${dungeon.name} · piso ${floor + 1}` } },
    stones: ['raspadura'],
    home: 'raspadura',
};

describe('cobertura generada de partidas de prueba', () => {
    it('cubre todos los hechizos actuales y monta un libro completo por clase', () => {
        const presets = spellCatalogPresets(data, 'raspadura');
        const covered = new Set(presets.flatMap((preset) => preset.spells.map((spell) => spell.spellId)));
        expect(presets).toHaveLength(Object.keys(data.rpg.classes).length);
        expect(covered).toEqual(new Set(Object.keys(data.rpg.spells)));
        expect(covered).toContain('double_monsoon');
        expect(covered).toContain('gale_star');
        for (const preset of presets) {
            expect(presetProblems(data.rpg, preset, world)).toEqual([]);
            const save = buildPresetSave(data.rpg, preset, world);
            expect(save.known.map((spell) => spell.spellId)).toEqual(
                expect.arrayContaining(preset.spells.map((spell) => spell.spellId)),
            );
            const ranks = new Map(save.known.map((spell) => [spell.spellId, spell.rank]));
            for (const spell of Object.values(data.rpg.spells)) {
                if (spell.classId === preset.classId) {
                    const expected = rankAtLevel(
                        spell,
                        preset.level,
                        data.rpg.progression.maxLevel,
                        data.rpg.progression.spellRankFactors!,
                    );
                    expect(ranks.get(spell.id), `${preset.id}: ${spell.id}`).toBe(expected);
                } else if (spell.classId === null) {
                    expect(ranks.get(spell.id), `${preset.id}: universal ${spell.id}`).toBe(spell.maxRank);
                }
            }
        }
    });

    it('EQ-10: una partida por clase con el ajuar de La Diablica Espeja puesto entero', () => {
        const presets = setShowcasePresets(data, 'raspadura', 'diablica_espeja');
        expect(presets).toHaveLength(Object.keys(data.rpg.classes).length);
        for (const preset of presets) {
            expect(preset.level).toBe(50);
            expect(presetProblems(data.rpg, preset, world)).toEqual([]);
            const save = buildPresetSave(data.rpg, preset, world);
            const worn = Object.values(save.equipment).map((it) => it?.itemId);
            expect(worn.filter((id) => id?.startsWith('diablica_espeja_'))).toHaveLength(8);
        }
    });

    it('pone cada objeto productivo exactamente una vez en lotes que caben en la mochila', () => {
        const presets = itemCatalogPresets(data, 'raspadura');
        const ids = presets.flatMap((preset) => preset.inventory.map((item) => item.itemId));
        expect(new Set(ids)).toEqual(new Set(Object.keys(data.rpg.items)));
        expect(ids).toHaveLength(Object.keys(data.rpg.items).length);
        expect(presets.every((preset) => preset.inventory.length <= 24)).toBe(true);
        expect(new Set(presets.map((preset) => preset.id)).size).toBe(presets.length);
        for (const preset of presets) {
            expect(presetProblems(data.rpg, preset, world)).toEqual([]);
            const save = buildPresetSave(data.rpg, preset, world);
            expect(save.inventory.filter(Boolean)).toHaveLength(preset.inventory.length);
        }
    });

    it('combina cada lugar del mapa con las tres clases, incluidos pueblos y lugares planificados', () => {
        const profiles = regionCoverageProfiles(data);
        const classes = Object.keys(data.rpg.classes);
        expect(profiles).toHaveLength(data.zones.zones.length * classes.length);
        for (const zone of data.zones.zones)
            for (const classId of classes) {
                expect(profiles.some((profile) => profile.band.id === zone.id && profile.classId === classId)).toBe(
                    true,
                );
            }
    });

    it('crea una build exclusiva para cada piso y rota clases y funciones', () => {
        const profiles = dungeonCoverageProfiles(data, dungeon);
        expect(profiles).toHaveLength(dungeon.floors.length);
        expect(profiles.map((profile) => profile.floor)).toEqual(dungeon.floors.map((_, index) => index));
        expect(new Set(profiles.map((entry) => entry.profile.classId))).toEqual(new Set(Object.keys(data.rpg.classes)));
        expect(new Set(profiles.map((entry) => entry.profile.build))).toEqual(
            new Set(['balanced', 'offense', 'defense', 'specialized']),
        );
        for (const entry of profiles) {
            const floor = dungeon.floors[entry.floor]!;
            expect(entry.floorLevelMin).toBe(floor.levelMin);
            expect(entry.floorLevelMax).toBe(floor.levelMax);
            expect(entry.profile.level).toBeGreaterThanOrEqual(floor.levelMin);
            expect(entry.profile.level).toBeLessThanOrEqual(floor.levelMax);
        }
        for (const index of [0, Math.floor(profiles.length / 2), profiles.length - 1]) {
            const entry = profiles[index]!;
            const built = buildProfile(data, entry.profile);
            expect(built.session.character.level).toBe(entry.profile.level);
            expect(built.session.character.classDef.id).toBe(entry.profile.classId);
        }
    });
});
