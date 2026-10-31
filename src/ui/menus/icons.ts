// Iconos generados por código (SVG en línea, sin assets externos). Provisionales
// hasta que haya arte propio. Los objetos usan su `icon` si es conocido y, si
// no, su categoría; los hechizos se componen de elemento + forma del área, así
// funcionan igual con el contenido real de la rama A.
import type { AreaDef, Element, ItemDef, Rarity, SpellDef, StatusDef } from '../../rpg/contracts';

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#cfc6b2',
  uncommon: '#7cc46a',
  rare: '#5b9be6',
  epic: '#b77be8',
  legendary: '#eba94a',
};

export const ELEMENT_COLOR: Record<Element, string> = {
  physical: '#d8d2c4',
  fire: '#f08a3c',
  frost: '#8fd3f0',
  storm: '#c8a8ff',
  earth: '#9fc46a',
};

// Trazos en una caja de 32×32. `F` = relleno con el color, `S` = sólo trazo.
const GLYPHS: Record<string, string> = {
  sword: 'S:M8 24 L22 10 L25 7 L24 11 L10 25 Z|S:M7 19 L13 25|S:M5 27 L8 24',
  axe: 'S:M9 27 L21 11|F:M18 6 Q27 6 27 15 L21 13 L17 9 Z',
  mace: 'S:M8 26 L18 16|F:M22 6 a5 5 0 1 1 -0.1 0 Z|S:M22 4 L22 2 M27 9 L29 9 M26 5 L28 3',
  staff: 'S:M10 28 L22 6|F:M22 6 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0',
  wand: 'S:M9 25 L21 13|F:M23 9 l1.5 -3 l1.5 3 l3 1.5 l-3 1.5 l-1.5 3 l-1.5 -3 l-3 -1.5 Z',
  orb: 'F:M16 6 a9 9 0 1 1 -0.1 0 Z|S:M10 25 L22 25 M12 28 L20 28',
  head: 'F:M7 20 Q7 7 16 7 Q25 7 25 20 L22 20 L22 15 L10 15 L10 20 Z|S:M7 22 L25 22',
  chest: 'F:M9 7 L13 9 L19 9 L23 7 L27 12 L23 14 L23 26 L9 26 L9 14 L5 12 Z',
  hands: 'F:M10 26 L10 14 Q10 11 12 11 L12 8 Q14 6 15 8 L15 7 Q17 5 18 7 L18 8 Q20 7 21 9 L21 18 L24 15 Q26 15 25 18 L20 26 Z',
  feet: 'F:M10 6 L16 6 L16 19 L25 21 Q27 22 26 26 L8 26 L10 18 Z',
  shield: 'F:M16 5 L26 9 Q26 21 16 28 Q6 21 6 9 Z',
  ring: 'S:M16 11 a7 7 0 1 1 -0.1 0|F:M13 6 L19 6 L16 10 Z',
  amulet: 'S:M8 5 Q16 18 24 5|F:M16 15 L21 21 L16 28 L11 21 Z',
  potion_red: 'F:M13 5 L19 5 L19 11 Q26 14 25 21 Q24 27 16 27 Q8 27 7 21 Q6 14 13 11 Z',
  potion_blue: 'F:M13 5 L19 5 L19 11 Q26 14 25 21 Q24 27 16 27 Q8 27 7 21 Q6 14 13 11 Z',
  potion_green: 'F:M14 5 L18 5 L18 13 L24 25 Q25 27 22 27 L10 27 Q7 27 8 25 L14 13 Z',
  scroll: 'F:M8 8 L22 8 Q25 8 25 11 L25 24 L11 24 Q8 24 8 21 Z|S:M12 13 L21 13 M12 17 L21 17 M12 21 L18 21',
  charm_fox: 'F:M6 9 L12 14 L20 14 L26 9 L24 19 L16 26 L8 19 Z',
  charm_owl: 'F:M16 4 Q24 10 22 26 L16 22 L10 26 Q8 10 16 4 Z|S:M16 8 L16 24',
  charm_tortoise: 'F:M5 20 Q6 9 16 9 Q26 9 27 20 Z|S:M10 20 L13 14 L19 14 L22 20 M5 22 L27 22',
  fang: 'F:M11 6 L21 6 Q21 18 16 27 Q11 18 11 6 Z',
  hide: 'F:M8 8 L12 6 L20 6 L24 8 L26 16 L23 26 L9 26 L6 16 Z',
  ore: 'F:M6 22 L10 10 L18 7 L26 13 L25 24 L14 27 Z|S:M10 10 L14 18 L25 24 M14 18 L18 7',
  essence: 'F:M16 4 Q24 14 16 28 Q8 14 16 4 Z',
  coin: 'F:M16 6 a10 10 0 1 1 -0.1 0 Z|S:M16 10 L16 22 M12 13 L20 13',
  class_ember: 'F:M16 3 Q24 12 21 20 Q26 18 25 13 Q30 22 22 28 L10 28 Q2 22 7 13 Q6 18 11 20 Q8 12 16 3 Z',
  class_storm: 'F:M18 3 L8 18 L15 18 L12 29 L24 12 L17 12 Z',
  pet_fox: 'F:M6 7 L12 13 L20 13 L26 7 L24 19 L16 26 L8 19 Z',
  pet_owl: 'F:M8 6 L12 10 L20 10 L24 6 L25 20 Q22 28 16 28 Q10 28 7 20 Z',
  pet_tortoise: 'F:M5 21 Q6 10 16 10 Q26 10 27 21 Z|F:M26 18 Q30 16 30 20 Q29 22 26 21 Z',
  fire: 'F:M16 4 Q23 12 21 19 Q25 17 24 13 Q29 21 22 27 L10 27 Q3 21 8 13 Q7 17 11 19 Q9 12 16 4 Z',
  frost: 'S:M16 4 L16 28 M6 10 L26 22 M6 22 L26 10 M13 6 L16 9 L19 6 M13 26 L16 23 L19 26',
  storm: 'F:M18 3 L8 18 L15 18 L12 29 L24 12 L17 12 Z',
  earth: 'F:M4 24 L11 11 L15 17 L20 8 L28 24 Z',
  physical: 'S:M8 24 L22 10 L25 7 L24 11 L10 25 Z|S:M7 19 L13 25',
  buff: 'S:M8 17 L16 9 L24 17 M8 25 L16 17 L24 25',
  dash: 'S:M5 16 L22 16 M16 9 L23 16 L16 23 M5 10 L11 10 M5 22 L11 22',
  heal: 'F:M13 6 L19 6 L19 13 L26 13 L26 19 L19 19 L19 26 L13 26 L13 19 L6 19 L6 13 L13 13 Z',
};

const CATEGORY_FALLBACK: Record<string, string> = {
  weapon: 'sword',
  armor: 'chest',
  jewel: 'ring',
  consumable: 'potion_red',
  scroll: 'scroll',
  petCharm: 'charm_fox',
  material: 'ore',
  quest: 'scroll',
};

const POTION_TINT: Record<string, string> = { potion_red: '#d9534a', potion_blue: '#4f8fe0', potion_green: '#6fbf5a' };

function glyph(name: string, color: string, extra = ''): string {
  const spec = GLYPHS[name] ?? GLYPHS['coin']!;
  const parts = spec.split('|').map((p) => {
    const [mode, d] = p.split(':') as [string, string];
    return mode === 'F'
      ? `<path d="${d}" fill="${color}" fill-opacity=".9" stroke="#1a140c" stroke-width="1.2" stroke-linejoin="round"/>`
      : `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${extra}${parts.join('')}</svg>`;
}

export function itemIcon(def: Pick<ItemDef, 'icon' | 'category' | 'rarity'>): string {
  const name = GLYPHS[def.icon] ? def.icon : (CATEGORY_FALLBACK[def.category] ?? 'coin');
  return glyph(name, POTION_TINT[name] ?? RARITY_COLOR[def.rarity]);
}

/** Marco según la forma del área: anillo (círculo), abanico (cono), flecha (línea), halo (sobre sí). */
function areaMark(a: AreaDef, color: string): string {
  const st = `fill="none" stroke="${color}" stroke-opacity=".55" stroke-width="1.6"`;
  switch (a.type) {
    case 'circle':
      return `<circle cx="16" cy="16" r="13.5" ${st} stroke-dasharray="3 2"/>`;
    case 'cone':
      return `<path d="M16 29 L3 6 M16 29 L29 6 M3 6 Q16 0 29 6" ${st}/>`;
    case 'line':
      return `<path d="M3 29 L29 3 M22 3 L29 3 L29 10" ${st}/>`;
    case 'self':
      return `<circle cx="16" cy="16" r="14" fill="${color}" fill-opacity=".12" stroke="none"/>`;
    default:
      return '';
  }
}

export function spellIcon(sp: Pick<SpellDef, 'element' | 'area' | 'effects'> & { tags?: readonly string[] }): string {
  const color = ELEMENT_COLOR[sp.element];
  const isHeal = sp.effects.some((e) => e.type === 'heal');
  // Aumentos y cargas con su propio dibujo, para no confundirlos con un golpe del mismo elemento.
  const name = isHeal ? 'heal' : sp.tags?.includes('buff') ? 'buff' : sp.effects.some((e) => e.type === 'dash') ? 'dash' : sp.element;
  return glyph(name, isHeal ? '#9fe0a0' : color, areaMark(sp.area, color));
}

export function statusIcon(st: Pick<StatusDef, 'kind' | 'id' | 'control'>): string {
  const color = st.kind === 'buff' ? '#9fe0a0' : '#ef7a6a';
  const byId: Record<string, string> = { burn: 'fire', slow: 'frost', rooted: 'earth', stunned: 'storm', shielded: 'shield', iron_shout: 'class_ember', stoneskin: 'earth', regeneration: 'heal', haste: 'feet' };
  return glyph(byId[st.id] ?? (st.kind === 'buff' ? 'heal' : 'fang'), color);
}

export function namedIcon(name: string, color: string): string {
  return glyph(name, color);
}
