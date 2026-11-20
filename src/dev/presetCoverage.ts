import type { GameData } from '../data';
import type { DungeonDef } from '../data/dungeonSchema';
import type { PresetDef } from './presets';
import type { BalanceProfile, ProfileBuild } from '../../scripts/balance/v3/profiles';
import { rankAtLevel } from '../rpg/spellRank';

const ITEM_CHUNK = 24;
const BUILDS: readonly ProfileBuild[] = ['balanced', 'offense', 'defense', 'specialized'];

function stableSeed(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    return h >>> 0;
}

/** Lotes que ponen todos los objetos productivos en una mochila real, sin superar sus 30 huecos. */
export function itemCatalogPresets(data: GameData, homeZone: string): PresetDef[] {
    const classes = Object.keys(data.rpg.classes);
    const items = Object.values(data.rpg.items).sort(
        (a, b) => a.level - b.level || a.category.localeCompare(b.category) || a.id.localeCompare(b.id),
    );
    const out: PresetDef[] = [];
    for (let start = 0; start < items.length; start += ITEM_CHUNK) {
        const chunk = items.slice(start, start + ITEM_CHUNK);
        const classId = classes[out.length % classes.length]!;
        const level = Math.max(1, ...chunk.map((item) => item.level));
        const hotbar = Object.values(data.rpg.spells)
            .filter((spell) => spell.classId === classId && (spell.unlockLevel ?? 1) <= level)
            .sort((a, b) => (a.unlockLevel ?? 1) - (b.unlockLevel ?? 1) || a.id.localeCompare(b.id))
            .slice(0, data.rpg.progression.hotbarSize)
            .map((spell) => spell.id);
        out.push({
            id: `catalogo_objetos_${String(out.length + 1).padStart(2, '0')}`,
            name: `Catálogo de objetos ${out.length + 1}`,
            description: `${chunk.length} objetos reales · niveles ${Math.min(...chunk.map((item) => item.level))}–${level} · desde ${chunk[0]!.name} hasta ${chunk.at(-1)!.name}.`,
            group: 'especial',
            role: 'catálogo · objetos e iconos',
            classId,
            level,
            stats: {},
            equipment: {},
            spells: [],
            hotbar,
            inventory: chunk.map((item) => ({ itemId: item.id, quantity: 1 })),
            noKit: true,
            pet: null,
            gold: 100_000,
            place: { kind: 'zone', zone: homeZone, x: null, y: null },
            timeOfDay: 0.5,
            rollQuality: 1,
        });
    }
    return out;
}

/**
 * Un conjunto puesto entero, una partida por clase, a su nivel (EQ-10: el ajuar de La Diablica
 * Espeja). Los puntos quedan libres para repartirlos al gusto.
 */
export function setShowcasePresets(data: GameData, homeZone: string, setId: string): PresetDef[] {
    const pieces = Object.values(data.rpg.items)
        .filter((item) => item.setId === setId)
        .sort((a, b) => a.id.localeCompare(b.id));
    if (!pieces.length) return [];
    const level = Math.max(1, ...pieces.map((item) => item.level));
    const equipment: PresetDef['equipment'] = {};
    for (const item of pieces) {
        const slot = item.slot === 'ring' ? 'ring1' : item.slot === 'huaca' ? 'huaca1' : item.slot;
        if (slot) equipment[slot] = { itemId: item.id, bonus: [] };
    }
    const setName = (data.rpg.sets as Record<string, { name?: string }>)[setId]?.name ?? setId;
    return Object.values(data.rpg.classes).map((classDef) => ({
        id: `conjunto_${setId}_${classDef.id}`,
        name: `Ajuar ${setName} · ${classDef.name}`,
        description: `Las ${pieces.length} piezas puestas a nivel ${level}, con sus bonos de conjunto; puntos libres para repartir.`,
        group: 'especial',
        role: 'conjunto · ver y probar el set',
        classId: classDef.id,
        level,
        stats: {},
        equipment,
        spells: [],
        hotbar: Object.values(data.rpg.spells)
            .filter((spell) => spell.classId === classDef.id && (spell.unlockLevel ?? 1) <= level)
            .sort((a, b) => (a.unlockLevel ?? 1) - (b.unlockLevel ?? 1) || a.id.localeCompare(b.id))
            .slice(0, data.rpg.progression.hotbarSize)
            .map((spell) => spell.id),
        inventory: [
            { itemId: 'health_potion', quantity: 20 },
            { itemId: 'resource_tonic', quantity: 20 },
        ],
        pet: null,
        gold: 100_000,
        place: { kind: 'zone', zone: homeZone, x: null, y: null },
        timeOfDay: 0.5,
        rollQuality: 1,
    }));
}

/** Un libro completo por clase. Incluye universales y hechizos devOnly para que ningún icono o efecto quede sin una partida reproducible. */
export function spellCatalogPresets(data: GameData, homeZone: string): PresetDef[] {
    const spells = Object.values(data.rpg.spells);
    return Object.values(data.rpg.classes).map((classDef) => {
        const known = spells
            .filter((spell) => spell.classId === classDef.id || spell.classId === null)
            .sort((a, b) => (a.unlockLevel ?? 1) - (b.unlockLevel ?? 1) || a.id.localeCompare(b.id));
        const level = Math.min(
            data.rpg.progression.maxLevel,
            Math.max(1, ...known.map((spell) => spell.unlockLevel ?? 1)),
        );
        const rankFactors = data.rpg.progression.spellRankFactors;
        return {
            id: `catalogo_hechizos_${classDef.id}`,
            name: `Hechizos · ${classDef.name}`,
            description: `${known.length} hechizos actuales de clase y universales, incluidos los de QA; barra inicial con ${Math.min(known.length, data.rpg.progression.hotbarSize)} para revisar iconos y efectos.`,
            group: 'especial',
            role: 'catálogo · hechizos, iconos y efectos',
            classId: classDef.id,
            level,
            stats: {},
            equipment: {},
            spells: known.map((spell) => ({
                spellId: spell.id,
                // Los hechizos propios progresan con el nivel. Los universales de este
                // catálogo representan pergaminos ya consumidos para poder probarlos.
                rank:
                    spell.classId === classDef.id && rankFactors
                        ? rankAtLevel(spell, level, data.rpg.progression.maxLevel, rankFactors)
                        : spell.maxRank,
            })),
            hotbar: known.slice(0, data.rpg.progression.hotbarSize).map((spell) => spell.id),
            inventory: [],
            pet: null,
            gold: 100_000,
            place: { kind: 'zone', zone: homeZone, x: null, y: null },
            timeOfDay: 0.5,
            rollQuality: 1,
        };
    });
}

/** Cada lugar del atlas, seguro o de combate, con las tres clases. */
export function regionCoverageProfiles(data: GameData): BalanceProfile[] {
    const out: BalanceProfile[] = [];
    for (const zone of data.zones.zones) {
        for (const classId of Object.keys(data.rpg.classes)) {
            const level = zone.safe
                ? 1
                : Math.min(data.rpg.progression.maxLevel, Math.floor((zone.levelMin + zone.levelMax) / 2));
            const id = `region:${zone.id}:${classId}`;
            out.push({
                id,
                seed: stableSeed(id),
                classId,
                level,
                build: 'balanced',
                equipmentTier: 'optimized-obtainable',
                band: {
                    id: zone.id,
                    label: zone.name,
                    level,
                    zone,
                    territory: zone.areas.length ? 'playable' : 'hypothetical',
                },
            });
        }
    }
    return out;
}

export interface DungeonCoverageProfile {
    floor: number;
    floorLevelMin: number;
    floorLevelMax: number;
    profile: BalanceProfile;
}

/** Un banco exclusivo por piso: rota clase y función y equipa lo mejor obtenible a ese nivel. */
export function dungeonCoverageProfiles(data: GameData, dungeon: DungeonDef): DungeonCoverageProfile[] {
    const classes = Object.keys(data.rpg.classes);
    return dungeon.floors.map((floor, index) => {
        const classId = classes[index % classes.length]!;
        const build = BUILDS[index % BUILDS.length]!;
        const level = Math.min(
            data.rpg.progression.maxLevel,
            Math.max(1, Math.floor((floor.levelMin + floor.levelMax) / 2)),
        );
        const id = `dungeon:crypt:${index + 1}:${classId}:${build}`;
        return {
            floor: index,
            floorLevelMin: floor.levelMin,
            floorLevelMax: floor.levelMax,
            profile: {
                id,
                seed: stableSeed(id),
                classId,
                level,
                build,
                equipmentTier: 'optimized-obtainable',
                band: {
                    id: `crypt-${index + 1}`,
                    label: `${dungeon.name} · piso ${index + 1}`,
                    level,
                    zone: null,
                    territory: 'hypothetical',
                },
            },
        };
    });
}

/** Un jefe de la cripta para una partida de prueba: piso con guardián, una build por clase. */
export interface GuardianCoverageProfile extends DungeonCoverageProfile {
    guardian: { archetype: string; level: number };
}

/**
 * Partidas para enfrentarse a cada guardián: las tres clases con build equilibrada al nivel del
 * guardián y lo mejor obtenible a ese nivel (sin tocar cifras: se usan las reglas de los perfiles).
 */
export function guardianCoverageProfiles(data: GameData, dungeon: DungeonDef): GuardianCoverageProfile[] {
    const out: GuardianCoverageProfile[] = [];
    dungeon.floors.forEach((floor, index) => {
        if (!floor.guardian) return;
        const level = Math.min(data.rpg.progression.maxLevel, floor.guardian.level);
        for (const classId of Object.keys(data.rpg.classes)) {
            const id = `boss:crypt:${index + 1}:${classId}`;
            out.push({
                floor: index,
                floorLevelMin: floor.levelMin,
                floorLevelMax: floor.levelMax,
                guardian: floor.guardian,
                profile: {
                    id,
                    seed: stableSeed(id),
                    classId,
                    level,
                    build: 'balanced',
                    equipmentTier: 'optimized-obtainable',
                    band: {
                        id: `crypt-boss-${index + 1}`,
                        label: `${dungeon.name} · jefe del piso ${index + 1}`,
                        level,
                        zone: null,
                        territory: 'hypothetical',
                    },
                },
            });
        }
    });
    return out;
}
