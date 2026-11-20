// Aspecto del jugador: qué modelo, paleta, piezas y colores le tocan según su clase, sexo,
// apariencia elegida y lo que lleva puesto. Lo usan la vista del mundo (`arenaView`) y la
// vista previa del inventario (UI-06), así las dos enseñan el mismo personaje.
import type { AnimationDataDef, AssetEntry, AssetManifest, Palette } from '../../data/worldSchema';
import { appearanceKey, bodyScale, defaultAppearance, hexRgb, type Appearance } from '../../rpg/appearance';
import type { Character } from '../../rpg/character';
import type { CharacterSex } from '../../rpg/contracts';
import { lookFor, lookKey, withGear, type CharacterLook } from '../../world/look';

/** Huecos del cuerpo que se ven puestos si el objeto tiene modelo a medida (EQ-10). */
const BODY_SLOTS = ['chest', 'waist', 'hands', 'feet', 'amulet'] as const;

export interface PlayerChars {
    assets: AssetManifest;
    animation: AnimationDataDef;
}

export interface PlayerLookSpec {
    assetId: string;
    entry: AssetEntry;
    palette: string;
    look: CharacterLook;
    colors: Palette;
    /** Cambia si y sólo si hay que rehacer el modelo. */
    key: string;
}

/** Lo que hace falta para vestir al jugador: clase, sexo, aspecto y lo puesto (vacío al crearlo). */
export interface PlayerLookInput {
    classId: string;
    sex: CharacterSex;
    appearance: Appearance | null;
    weapon: string | null;
    offhand: string | null;
    worn: { head: string | null; back: string | null; body: (string | null)[] };
    kindOf: (itemId: string) => string | undefined;
}

export function playerLookSpec(ch: Character, chars: PlayerChars): PlayerLookSpec | null {
    return lookSpecFor(
        {
            classId: ch.classDef.id,
            sex: ch.sex,
            appearance: ch.appearance,
            weapon: ch.weapon()?.id ?? null,
            offhand: ch.equipment.get('offhand')?.itemId ?? null,
            worn: {
                head: ch.equipment.get('head')?.itemId ?? null,
                back: ch.equipment.get('back')?.itemId ?? null,
                body: BODY_SLOTS.map((s) => ch.equipment.get(s)?.itemId ?? null),
            },
            kindOf: (id) => ch.content.items[id]?.kind,
        },
        chars,
    );
}

/** Creación de personaje: clase, sexo y aspecto elegidos, sin equipo puesto. */
export function creationLookSpec(
    classId: string,
    sex: CharacterSex,
    appearance: Appearance,
    chars: PlayerChars,
): PlayerLookSpec | null {
    return lookSpecFor(
        {
            classId,
            sex,
            appearance,
            weapon: null,
            offhand: null,
            worn: { head: null, back: null, body: [] },
            kindOf: () => undefined,
        },
        chars,
    );
}

export function lookSpecFor(ch: PlayerLookInput, chars: PlayerChars): PlayerLookSpec | null {
    const base = chars.assets['player'];
    if (!base) return null;
    const classId = ch.classId;
    // Una clase con modelo propio (`classModels`) usa esa entrada entera; si no, la común.
    // P09: femenino usa `<clase>_f` (modelo propio o figura); sin modelo femenino, el humanoide.
    const fem = ch.sex === 'femenino';
    const modelKey = fem ? `${classId}_f` : classId;
    const assetId = (base.kind === 'gltf' && base.classModels[modelKey]) || 'player';
    const entry = chars.assets[assetId] ?? base;
    const palette = entry.palettes[classId] ? classId : 'default';
    const chosen = ch.appearance ?? defaultAppearance(classId, ch.sex);
    const look = withGear(
        lookFor(base.looks, fem && base.looks?.[`${classId}_f`] ? `${classId}_f` : classId),
        base.gear,
        ch.weapon,
        ch.offhand,
        ch.kindOf,
        ch.worn,
    );
    look.face = chosen.face;
    look.hairCut = chosen.hair;
    const scale = bodyScale(chosen);
    if (scale[0] !== 1 || scale[1] !== 1) look.bodyScale = scale;
    // Los colores elegidos tiñen piel, pelo y ropa; `gear` sigue siendo el de la clase.
    const gear = (
        entry.palettes[palette] ??
        entry.palettes['default'] ??
        base.palettes[classId] ??
        base.palettes['default']
    )?.gear ?? [0.5, 0.5, 0.5];
    const colors: Palette = {
        gear,
        skin: hexRgb(chosen.skin),
        hair: hexRgb(chosen.hairColor),
        cloth: hexRgb(chosen.cloth),
        trim: hexRgb(chosen.trim),
    };
    const key = `${assetId}|${palette}|${lookKey(look)}|${appearanceKey(chosen)}`;
    return { assetId, entry, palette, look, colors, key };
}
