// Aspecto del humanoide procedural: complexión, peinado, ropa por capas y lo que
// lleva en las manos. Viene de `data/assets.json` (`looks` por clase o por PNJ,
// `gear` por objeto equipado). Puro: el render lo traduce a piezas.

export const BODY_TYPES = ['slim', 'average', 'stout'] as const;
export const HAIR_STYLES = ['short', 'spiky', 'long', 'ponytail', 'bun', 'bald'] as const;
export const OUTFITS = ['tunic', 'plate', 'robe', 'apron'] as const;
export const HEADGEAR = ['none', 'hood', 'helm', 'band'] as const;
/** Las seis primeras son las del Slice 03; el resto, de `equipo-objetos`. */
export const WEAPON_LOOKS = ['none', 'sword', 'axe', 'mace', 'staff', 'wand', 'orb', 'dagger', 'greatsword', 'hammer', 'spear', 'bow', 'crossbow'] as const;
/** Armas que caben en una mano (y, por tanto, en la izquierda). */
export const ONE_HAND_LOOKS = ['sword', 'axe', 'mace', 'wand', 'orb', 'dagger'] as const;
/** Mano izquierda: nada, escudo, rodela o un arma de una mano (dos armas). */
export const OFFHAND_LOOKS = ['none', 'shield', 'buckler', ...ONE_HAND_LOOKS] as const;

export type BodyType = (typeof BODY_TYPES)[number];
export type HairStyle = (typeof HAIR_STYLES)[number];
export type Outfit = (typeof OUTFITS)[number];
export type Headgear = (typeof HEADGEAR)[number];
export type WeaponLook = (typeof WEAPON_LOOKS)[number];
export type OffhandLook = (typeof OFFHAND_LOOKS)[number];
/** Lo que un objeto equipado pinta en la mano: arma, escudo o rodela. */
export type GearLook = Exclude<WeaponLook, 'none'> | Exclude<OffhandLook, 'none'>;

/** Dibujo por tipo de objeto (`ItemDef.kind`) cuando el objeto no tiene entrada en `gear`. */
const KIND_LOOK: Readonly<Record<string, GearLook>> = {
  sword: 'sword', dagger: 'dagger', axe: 'axe', mace: 'mace', wand: 'wand', orb: 'orb',
  greatsword: 'greatsword', hammer: 'hammer', spear: 'spear', bow: 'bow', crossbow: 'crossbow', staff: 'staff',
  shield: 'shield', buckler: 'buckler',
};

/** Dibujo de un objeto: su entrada en `gear`, si no el de su tipo, si no undefined. */
export function gearLookFor(gear: Readonly<Record<string, GearLook>>, itemId: string, kind?: string): GearLook | undefined {
  return gear[itemId] ?? (kind === undefined ? undefined : KIND_LOOK[kind]);
}

export function isShieldLook(g: string | undefined): g is 'shield' | 'buckler' {
  return g === 'shield' || g === 'buckler';
}

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
export function isCasterWeapon(w: WeaponLook | OffhandLook): boolean {
  return w === 'staff' || w === 'wand' || w === 'orb';
}

/** Aspecto de una clase o PNJ: el suyo, si no el `default`, si no el de serie. */
export function lookFor(looks: Readonly<Record<string, CharacterLook>> | undefined, id: string): CharacterLook {
  return looks?.[id] ?? looks?.['default'] ?? DEFAULT_LOOK;
}

/**
 * El aspecto con lo que lleva equipado: el arma de la mano derecha sale del
 * objeto (sin arma, manos vacías) y la mano izquierda lleva escudo, rodela o
 * un arma de una mano. Un objeto sin entrada en `gear` usa el dibujo de su tipo
 * (`kindOf`); si tampoco, pinta una espada (arma) o nada (mano izquierda).
 */
export function withGear(
  look: CharacterLook,
  gear: Readonly<Record<string, GearLook>>,
  weaponItem: string | null,
  offhandItem: string | null,
  kindOf: (itemId: string) => string | undefined = () => undefined,
): CharacterLook {
  const w = weaponItem === null ? 'none' : (gearLookFor(gear, weaponItem, kindOf(weaponItem)) ?? 'sword');
  const o = offhandItem === null ? undefined : gearLookFor(gear, offhandItem, kindOf(offhandItem));
  return {
    ...look,
    weapon: isShieldLook(w) ? 'none' : w,
    offhand: o !== undefined && (OFFHAND_LOOKS as readonly string[]).includes(o) ? (o as OffhandLook) : 'none',
  };
}

/** Clave estable para saber si hay que reconstruir el modelo. */
export function lookKey(l: CharacterLook): string {
  return [l.bodyType, l.hairStyle, l.outfit, l.headgear, l.cape ? 1 : 0, l.beard ? 1 : 0, l.weapon, l.offhand].join('|');
}
