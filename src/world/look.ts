// Aspecto del humanoide procedural: complexión, peinado, ropa por capas y lo que
// lleva en las manos. Viene de `data/assets.json` (`looks` por clase o por PNJ,
// `gear` por objeto equipado). Puro: el render lo traduce a piezas.

export const BODY_TYPES = ['slim', 'average', 'stout'] as const;
export const HAIR_STYLES = ['short', 'spiky', 'long', 'ponytail', 'bun', 'bald'] as const;
export const OUTFITS = ['tunic', 'plate', 'robe', 'apron'] as const;
export const HEADGEAR = ['none', 'hood', 'helm', 'band'] as const;
export const WEAPON_LOOKS = ['none', 'sword', 'axe', 'mace', 'staff', 'wand', 'orb'] as const;
export const OFFHAND_LOOKS = ['none', 'shield'] as const;

export type BodyType = (typeof BODY_TYPES)[number];
export type HairStyle = (typeof HAIR_STYLES)[number];
export type Outfit = (typeof OUTFITS)[number];
export type Headgear = (typeof HEADGEAR)[number];
export type WeaponLook = (typeof WEAPON_LOOKS)[number];
export type OffhandLook = (typeof OFFHAND_LOOKS)[number];
/** Lo que un objeto equipado pinta en la mano: arma (derecha) o escudo (izquierda). */
export type GearLook = Exclude<WeaponLook, 'none'> | Exclude<OffhandLook, 'none'>;

export interface CharacterLook {
  bodyType: BodyType;
  hairStyle: HairStyle;
  outfit: Outfit;
  headgear: Headgear;
  cape: boolean;
  beard: boolean;
  weapon: WeaponLook;
  offhand: OffhandLook;
}

export const DEFAULT_LOOK: CharacterLook = {
  bodyType: 'average',
  hairStyle: 'short',
  outfit: 'tunic',
  headgear: 'none',
  cape: false,
  beard: false,
  weapon: 'sword',
  offhand: 'none',
};

/** Armas de magia: el ataque y el hechizo se hacen con el báculo, no con un tajo. */
export function isCasterWeapon(w: WeaponLook): boolean {
  return w === 'staff' || w === 'wand' || w === 'orb';
}

/** Aspecto de una clase o PNJ: el suyo, si no el `default`, si no el de serie. */
export function lookFor(looks: Readonly<Record<string, CharacterLook>> | undefined, id: string): CharacterLook {
  return looks?.[id] ?? looks?.['default'] ?? DEFAULT_LOOK;
}

/**
 * El aspecto con lo que lleva equipado: el arma de la mano derecha sale del
 * objeto (sin arma, manos vacías) y el escudo, del de la mano izquierda. Un
 * objeto sin entrada en `gear` pinta una espada (arma) o nada (mano izquierda).
 */
export function withGear(look: CharacterLook, gear: Readonly<Record<string, GearLook>>, weaponItem: string | null, offhandItem: string | null): CharacterLook {
  const w = weaponItem === null ? 'none' : (gear[weaponItem] ?? 'sword');
  const o = offhandItem === null ? undefined : gear[offhandItem];
  return {
    ...look,
    weapon: w === 'shield' ? 'none' : w,
    offhand: o === 'shield' ? 'shield' : 'none',
  };
}

/** Clave estable para saber si hay que reconstruir el modelo. */
export function lookKey(l: CharacterLook): string {
  return [l.bodyType, l.hairStyle, l.outfit, l.headgear, l.cape ? 1 : 0, l.beard ? 1 : 0, l.weapon, l.offhand].join('|');
}
