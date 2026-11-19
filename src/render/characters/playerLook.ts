// Aspecto del jugador: qué modelo, paleta, piezas y colores le tocan según su clase, sexo,
// apariencia elegida y lo que lleva puesto. Lo usan la vista del mundo (`arenaView`) y la
// vista previa del inventario (UI-06), así las dos enseñan el mismo personaje.
import type { AnimationDataDef, AssetEntry, AssetManifest, Palette } from '../../data/worldSchema';
import { appearanceKey, defaultAppearance, hexRgb } from '../../rpg/appearance';
import type { Character } from '../../rpg/character';
import { lookFor, lookKey, withGear, type CharacterLook } from '../../world/look';

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

export function playerLookSpec(ch: Character, chars: PlayerChars): PlayerLookSpec | null {
    const base = chars.assets['player'];
    if (!base) return null;
    const classId = ch.classDef.id;
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
        ch.weapon()?.id ?? null,
        ch.equipment.get('offhand')?.itemId ?? null,
        (id) => ch.content.items[id]?.kind,
        { head: ch.equipment.get('head')?.itemId ?? null, back: ch.equipment.get('back')?.itemId ?? null },
    );
    look.face = chosen.face;
    look.hairCut = chosen.hair;
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
