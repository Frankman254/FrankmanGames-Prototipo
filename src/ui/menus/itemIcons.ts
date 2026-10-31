// Iconos de objeto por tipo (`ItemDef.kind`), generados en código (`equipo-objetos`).
// Cada tipo tiene su silueta; la rareza tiñe los adornos y el aro de fondo, el
// elemento pone la gema o el brillo, y una semilla sacada del id cambia
// proporciones y detalles para que dos espadas no salgan iguales. Puro: sólo
// cadenas SVG (caja de 32×32), sin DOM.
import type { Element, ItemDef, ItemKind, Rarity } from '../../rpg/contracts';

export interface IconStyle {
  /** Color de la rareza: adornos (guarda, cinta, hebilla) y aro de fondo. */
  rarity: string;
  /** Color del elemento (gema, brillo); null = sin elemento. */
  element: string | null;
  /** Semilla (del id): proporciones y detalles. */
  seed: number;
  /** Tinte del contenido (pociones, peces). */
  liquid?: string;
  /** Fuerza una variante concreta (p. ej. el animal de un amuleto de mascota). */
  shape?: number;
}

const INK = '#1a140c';
const METALS = ['#cfd4dc', '#b9c0ca', '#c8955a', '#9aa1ab', '#d9c27a'];
const WOODS = ['#9a6a3c', '#7d5530', '#b07a46', '#8a5e3a'];
const LEATHER = ['#8a5a36', '#6f4a2e', '#a0703f'];
const CLOTH = ['#7a8fb0', '#9a6f5a', '#6f8f6a', '#a08060', '#8a6fa0'];

/** Hash FNV-1a de 32 bits: misma cadena, misma semilla. */
export function iconSeed(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Secuencia determinista 0..1 a partir de la semilla (xorshift). */
function variant(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const n = (v: number): string => String(Math.round(v * 10) / 10);
const fill = (d: string, color: string, op = 0.95): string =>
  `<path d="${d}" fill="${color}" fill-opacity="${op}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>`;
const line = (d: string, color: string, w = 2): string =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dot = (x: number, y: number, r: number, color: string): string =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${color}" stroke="${INK}" stroke-width="1"/>`;
const pick = <T>(list: readonly T[], r: number): T => list[Math.floor(r * list.length) % list.length]!;
/** Dibujo de pie (hoja hacia arriba) girado 45° para que cruce la casilla en diagonal. */
const diagonal = (inner: string): string => `<g transform="rotate(45 16 16)">${inner}</g>`;

type Drawer = (s: IconStyle, r: () => number) => string;

function swordLike(s: IconStyle, r: () => number, size: 'dagger' | 'sword' | 'greatsword'): string {
  const metal = pick(METALS, r());
  const len = size === 'dagger' ? 9 + r() * 3 : size === 'sword' ? 15 + r() * 3 : 18 + r() * 2;
  const w = (size === 'greatsword' ? 2.6 : size === 'dagger' ? 2 : 1.6) + r() * 0.8;
  const guardY = size === 'dagger' ? 19 : 21;
  const top = guardY - len;
  const curved = size !== 'greatsword' && r() > 0.7;
  const blade = curved
    ? `M${n(16 - w)} ${guardY} L${n(16 - w)} ${n(top + 5)} Q${n(16 - w)} ${n(top)} ${n(16 + w + 1)} ${n(top)} Q${n(16 + w)} ${n(top + 6)} ${n(16 + w)} ${guardY} Z`
    : `M${n(16 - w)} ${guardY} L${n(16 - w)} ${n(top + 3)} L16 ${n(top)} L${n(16 + w)} ${n(top + 3)} L${n(16 + w)} ${guardY} Z`;
  const gw = (size === 'dagger' ? 3 : size === 'sword' ? 5 : 6) + r() * 2;
  const grip = size === 'greatsword' ? 7 : 5;
  const out = [
    fill(blade, metal),
    line(`M16 ${guardY - 1} L16 ${n(top + 4)}`, '#ffffff', 0.7),
    fill(`M${n(16 - gw)} ${guardY} L${n(16 + gw)} ${guardY} L${n(16 + gw - 1)} ${guardY + 2} L${n(16 - gw + 1)} ${guardY + 2} Z`, s.rarity),
    fill(`M14.8 ${guardY + 2} L17.2 ${guardY + 2} L17.2 ${guardY + 2 + grip} L14.8 ${guardY + 2 + grip} Z`, pick(LEATHER, r())),
  ];
  const py = guardY + 3.4 + grip;
  out.push(r() > 0.5 ? dot(16, py, 1.8, s.rarity) : fill(`M16 ${n(py - 2)} L18 ${n(py)} L16 ${n(py + 2)} L14 ${n(py)} Z`, s.rarity));
  if (s.element) out.push(dot(16, guardY + 1, 1.2, s.element));
  return diagonal(out.join(''));
}

function hafted(s: IconStyle, r: () => number, length: number): { wood: string; shaft: string; top: number } {
  const wood = pick(WOODS, r());
  const top = 30 - length;
  return { wood, top, shaft: fill(`M15 ${top} L17 ${top} L17 30 L15 30 Z`, wood) };
}

const DRAW: Record<ItemKind, Drawer> = {
  sword: (s, r) => swordLike(s, r, 'sword'),
  dagger: (s, r) => swordLike(s, r, 'dagger'),
  greatsword: (s, r) => swordLike(s, r, 'greatsword'),
  axe: (s, r) => {
    const h = hafted(s, r, 24);
    const metal = pick(METALS, r());
    const double = r() > 0.65;
    const wing = 6 + r() * 3;
    const head = `M17 8 Q${n(17 + wing + 3)} 9 ${n(17 + wing)} 18 Q${n(17 + wing / 2)} 14 17 15 Z`;
    const back = double ? fill(`M15 8 Q${n(15 - wing - 3)} 9 ${n(15 - wing)} 18 Q${n(15 - wing / 2)} 14 15 15 Z`, metal) : fill('M15 9 L11 10 L11 13 L15 14 Z', metal);
    return diagonal(h.shaft + fill(head, metal) + back + fill('M14.5 15 L17.5 15 L17.5 17 L14.5 17 Z', s.rarity) + (s.element ? dot(20, 12, 1.2, s.element) : ''));
  },
  mace: (s, r) => {
    const h = hafted(s, r, 20);
    const metal = pick(METALS, r());
    const spikes = 4 + Math.floor(r() * 3);
    const rad = 4.5 + r();
    let sp = '';
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 - Math.PI / 2;
      const x = 16 + Math.cos(a) * (rad + 2.6);
      const y = 9 + Math.sin(a) * (rad + 2.6);
      sp += fill(`M${n(16 + Math.cos(a - 0.3) * rad)} ${n(9 + Math.sin(a - 0.3) * rad)} L${n(x)} ${n(y)} L${n(16 + Math.cos(a + 0.3) * rad)} ${n(9 + Math.sin(a + 0.3) * rad)} Z`, metal);
    }
    return diagonal(h.shaft + sp + dot(16, 9, rad, metal) + dot(16, 9, 1.6, s.element ?? s.rarity) + fill('M14.5 15 L17.5 15 L17.5 17 L14.5 17 Z', s.rarity));
  },
  hammer: (s, r) => {
    const h = hafted(s, r, 26);
    const metal = pick(METALS, r());
    const hw = 7 + r() * 2;
    const hh = 6 + r() * 2;
    return diagonal(
      h.shaft +
        fill(`M${n(16 - hw)} 5 L${n(16 + hw)} 5 L${n(16 + hw)} ${n(5 + hh)} L${n(16 - hw)} ${n(5 + hh)} Z`, metal) +
        fill(`M${n(16 - hw - 0.6)} 4 L${n(16 - hw + 1.6)} 4 L${n(16 - hw + 1.6)} ${n(6 + hh)} L${n(16 - hw - 0.6)} ${n(6 + hh)} Z`, s.rarity) +
        fill(`M${n(16 + hw - 1.6)} 4 L${n(16 + hw + 0.6)} 4 L${n(16 + hw + 0.6)} ${n(6 + hh)} L${n(16 + hw - 1.6)} ${n(6 + hh)} Z`, s.rarity) +
        (s.element ? dot(16, 5 + hh / 2, 1.4, s.element) : ''),
    );
  },
  spear: (s, r) => {
    const h = hafted(s, r, 27);
    const metal = pick(METALS, r());
    const tip = 7 + r() * 3;
    const w = 2.5 + r() * 1.5;
    return diagonal(
      h.shaft +
        fill(`M16 1 L${n(16 + w)} ${n(1 + tip * 0.6)} L16 ${n(1 + tip)} L${n(16 - w)} ${n(1 + tip * 0.6)} Z`, metal) +
        fill(`M14 ${n(2 + tip)} L18 ${n(2 + tip)} L17 ${n(4.5 + tip)} L15 ${n(4.5 + tip)} Z`, s.element ?? s.rarity) +
        line(`M15 ${n(5 + tip)} L13 ${n(9 + tip)} M17 ${n(5 + tip)} L19 ${n(9 + tip)}`, s.rarity, 1.4),
    );
  },
  bow: (s, r) => {
    const wood = pick(WOODS, r());
    const bend = 9 + r() * 4;
    const arrow = r() > 0.4;
    return (
      line(`M8 4 Q${n(8 + bend * 2)} 16 8 28`, INK, 4.2) +
      line(`M8 4 Q${n(8 + bend * 2)} 16 8 28`, wood, 2.6) +
      line('M8 4 L8 28', '#e8e2d0', 0.9) +
      dot(8 + bend * 0.98, 16, 1.6, s.rarity) +
      (arrow ? line('M7 16 L27 16', '#d8d2c4', 1.4) + fill('M27 16 L23.5 14 L23.5 18 Z', s.element ?? '#cfd4dc') + line('M7 14.5 L9.5 16 L7 17.5', s.rarity, 1.2) : '')
    );
  },
  crossbow: (s, r) => {
    const wood = pick(WOODS, r());
    const metal = pick(METALS, r());
    const span = 10 + r() * 3;
    return diagonal(
      fill('M14.5 6 L17.5 6 L17.5 28 L14.5 28 Z', wood) +
        line(`M${n(16 - span)} 11 Q16 4 ${n(16 + span)} 11`, INK, 3.6) +
        line(`M${n(16 - span)} 11 Q16 4 ${n(16 + span)} 11`, metal, 2.2) +
        line(`M${n(16 - span)} 11 L16 14 L${n(16 + span)} 11`, '#e8e2d0', 0.8) +
        fill('M16 1.5 L17.6 5 L14.4 5 Z', s.element ?? metal) +
        fill('M14 18 L18 18 L18 20 L14 20 Z', s.rarity),
    );
  },
  staff: (s, r) => {
    const h = hafted(s, r, 25);
    const style = Math.floor(r() * 3);
    const gem = s.element ?? s.rarity;
    const head =
      style === 0
        ? fill('M16 1 L19 5 L16 9 L13 5 Z', gem) + line('M12 9 Q12 4 14 3 M20 9 Q20 4 18 3', h.wood, 1.6)
        : style === 1
          ? dot(16, 5, 3.6, gem) + line('M12.5 9 Q16 6 19.5 9', s.rarity, 1.6)
          : line('M16 6 Q22 4 20 9 Q18 12 15.5 9', h.wood, 2.4) + dot(19.6, 4.6, 1.8, gem);
    return h.shaft + `<circle cx="16" cy="5" r="6" fill="${gem}" fill-opacity=".18"/>` + head + fill('M14.6 12 L17.4 12 L17.4 14 L14.6 14 Z', s.rarity);
  },
  wand: (s, r) => {
    const wood = pick(WOODS, r());
    const gem = s.element ?? s.rarity;
    const star = r() > 0.5;
    const tip = star
      ? fill('M23 3 L24.6 7 L28.6 8.4 L24.6 9.8 L23 13.8 L21.4 9.8 L17.4 8.4 L21.4 7 Z', gem)
      : fill('M23 4 L26.5 8.5 L23 13 L19.5 8.5 Z', gem);
    return `<circle cx="23" cy="8.5" r="6.5" fill="${gem}" fill-opacity=".16"/>` + line('M7 26 L21 11', INK, 4) + line('M7 26 L21 11', wood, 2.4) + line('M9.5 23.5 L11.5 21.5', s.rarity, 2.6) + tip;
  },
  orb: (s, r) => {
    const gem = s.element ?? s.rarity;
    const swirl = 0.3 + r() * 0.5;
    return (
      `<circle cx="16" cy="13" r="10" fill="${gem}" fill-opacity=".18"/>` +
      dot(16, 13, 8, gem) +
      line(`M11 ${n(13 - 3 * swirl)} Q16 ${n(8 + 4 * swirl)} 21 ${n(11 + swirl)}`, '#ffffff', 1.1) +
      dot(13, 10, 1.4, '#ffffff') +
      fill('M10 22 L22 22 L20 26 L12 26 Z', s.rarity) +
      fill('M12 26 L20 26 L21 28.5 L11 28.5 Z', pick(METALS, r()))
    );
  },
  shield: (s, r) => {
    const face = pick([...METALS, ...WOODS], r());
    const emblem = Math.floor(r() * 3);
    const mark =
      emblem === 0
        ? fill('M14.5 9 L17.5 9 L17.5 13 L21 13 L21 16 L17.5 16 L17.5 23 L14.5 23 L14.5 16 L11 16 L11 13 L14.5 13 Z', s.rarity)
        : emblem === 1
          ? fill('M9 11 L16 16 L23 11 L23 14.5 L16 19.5 L9 14.5 Z', s.rarity)
          : dot(16, 15, 3.4, s.rarity);
    return fill('M16 3 L27 7 Q27 21 16 29 Q5 21 5 7 Z', face) + line('M16 5.5 L24.8 8.7 Q24.6 19.8 16 26.4 Q7.4 19.8 7.2 8.7 Z', s.rarity, 1) + mark + (s.element ? dot(16, 7.5, 1.3, s.element) : '');
  },
  buckler: (s, r) => {
    const face = pick([...WOODS, ...METALS], r());
    const spokes = 4 + Math.floor(r() * 4);
    let sp = '';
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      sp += line(`M${n(16 + Math.cos(a) * 4)} ${n(16 + Math.sin(a) * 4)} L${n(16 + Math.cos(a) * 9.5)} ${n(16 + Math.sin(a) * 9.5)}`, INK, 0.9);
    }
    return dot(16, 16, 11.5, face) + `<circle cx="16" cy="16" r="10" fill="none" stroke="${s.rarity}" stroke-width="1.6"/>` + sp + dot(16, 16, 3.6, s.element ?? s.rarity);
  },
  helmet: (s, r) => {
    const metal = pick(METALS, r());
    const nasal = r() > 0.5;
    return (
      fill('M6 21 Q6 6 16 6 Q26 6 26 21 L22 21 L22 16 L10 16 L10 21 Z', metal) +
      fill('M5 20 L27 20 L27 23 L5 23 Z', s.rarity) +
      (nasal ? fill('M15 14 L17 14 L17 24 L15 24 Z', metal) : line('M10 16 L22 16', INK, 1.4)) +
      (r() > 0.5 ? fill('M15 6 Q16 1 19 2 Q17 3 17 6 Z', s.element ?? s.rarity) : dot(16, 8.5, 1.3, s.element ?? s.rarity))
    );
  },
  hat: (s, r) => {
    const straw = pick(['#e3cf9a', '#d6b979', '#c9a96a', '#3b3226'], r());
    const brim = 12 + r() * 2.5;
    const crown = 7 + r() * 3;
    const stripes = 1 + Math.floor(r() * 3);
    let bands = '';
    for (let i = 0; i < stripes; i++) bands += line(`M${n(11 + i * 0.4)} ${n(18 - i * 2.2)} L${n(21 - i * 0.4)} ${n(18 - i * 2.2)}`, i % 2 ? INK : s.rarity, 1.3);
    return (
      fill(`M${n(16 - brim)} 20 Q16 ${n(25 + r() * 2)} ${n(16 + brim)} 20 Q16 16 ${n(16 - brim)} 20 Z`, straw) +
      fill(`M10.5 19 Q10 ${n(19 - crown)} 16 ${n(19 - crown)} Q22 ${n(19 - crown)} 21.5 19 Z`, straw) +
      bands +
      (s.element ? dot(21, 16.5, 1.3, s.element) : '')
    );
  },
  hood: (s, r) => {
    const cloth = pick(CLOTH, r());
    return (
      fill('M16 3 Q27 5 26 18 L24 28 L8 28 L6 18 Q5 5 16 3 Z', cloth) +
      fill('M16 9 Q22 10 21.5 18 Q19 23 16 23 Q13 23 10.5 18 Q10 10 16 9 Z', '#2a2018') +
      line('M8 27 L24 27', s.rarity, 1.8) +
      (r() > 0.5 ? dot(16, 3.5, 1.4, s.element ?? s.rarity) : '')
    );
  },
  armor: (s, r) => {
    const metal = r() > 0.5 ? pick(METALS, r()) : pick(LEATHER, r());
    const plates = 1 + Math.floor(r() * 3);
    let pl = '';
    for (let i = 0; i < plates; i++) pl += line(`M10 ${n(16 + i * 3)} L22 ${n(16 + i * 3)}`, INK, 0.9);
    return fill('M9 6 L13 8 L19 8 L23 6 L28 12 L23 14 L23 27 L9 27 L9 14 L4 12 Z', metal) + fill('M13 8 L19 8 L16 12 Z', s.rarity) + pl + (s.element ? dot(16, 13.5, 1.6, s.element) : dot(16, 13.5, 1.2, s.rarity));
  },
  robe: (s, r) => {
    const cloth = pick(CLOTH, r());
    const flare = 2 + r() * 3;
    return (
      fill(`M11 5 L21 5 L24 10 L22 12 L${n(24 + flare)} 29 L${n(8 - flare)} 29 L10 12 L8 10 Z`, cloth) +
      fill('M14 5 L18 5 L16 10 Z', '#2a2018') +
      fill('M10 15 L22 15 L22 17.5 L10 17.5 Z', s.rarity) +
      line(`M16 18 L16 28`, INK, 0.8) +
      (s.element ? dot(16, 16.2, 1.2, s.element) : '')
    );
  },
  cape: (s, r) => {
    const cloth = pick(CLOTH, r());
    const wave = r() * 3;
    return (
      fill(`M10 5 L22 5 Q26 16 ${n(27 - wave)} 28 Q22 ${n(26 + wave)} 16 28 Q10 ${n(26 + wave)} ${n(5 + wave)} 28 Q6 16 10 5 Z`, cloth) +
      line('M12 6 Q16 9 20 6', INK, 0.9) +
      dot(11, 6.5, 1.8, s.rarity) +
      dot(21, 6.5, 1.8, s.rarity) +
      (s.element ? line(`M9 25 Q16 ${n(23 + wave)} 23 25`, s.element, 1.2) : '')
    );
  },
  belt: (s, r) => {
    const leather = pick(LEATHER, r());
    const round = r() > 0.5;
    const studs = Math.floor(r() * 3);
    let st = '';
    for (let i = 0; i < studs; i++) st += dot(5 + i * 3, 16, 0.8, s.rarity) + dot(27 - i * 3, 16, 0.8, s.rarity);
    return (
      fill('M2 12 L30 12 L30 20 L2 20 Z', leather) +
      st +
      (round ? `<circle cx="16" cy="16" r="5.2" fill="none" stroke="${INK}" stroke-width="3.6"/><circle cx="16" cy="16" r="5.2" fill="none" stroke="${s.rarity}" stroke-width="2"/>` : fill('M11 10 L21 10 L21 22 L11 22 Z M13.5 12.5 L18.5 12.5 L18.5 19.5 L13.5 19.5 Z', s.rarity)) +
      line('M16 13 L16 19', INK, 1.4) +
      (s.element ? dot(16, 16, 1.2, s.element) : '')
    );
  },
  gloves: (s, r) => {
    const leather = pick(LEATHER, r());
    return (
      fill('M10 27 L10 15 Q10 12 12 12 L12 7 Q13.5 5 15 7 L15 6 Q16.5 4 18 6 L18 7 Q19.5 5.5 21 8 L21 18 L24 15 Q26.5 15 25.5 18 L20 27 Z', leather) +
      fill('M9 24 L21 24 L20 28 L9.5 28 Z', s.rarity) +
      (r() > 0.5 ? line('M12.5 12 L12.5 16 M15 8 L15 15 M18 8 L18 15', INK, 0.7) : '') +
      (s.element ? dot(15.5, 19, 1.4, s.element) : '')
    );
  },
  bracers: (s, r) => {
    const leather = r() > 0.5 ? pick(LEATHER, r()) : pick(METALS, r());
    const one = (x: number): string => fill(`M${x} 7 L${x + 9} 6 L${x + 10} 26 L${x - 1} 27 Z`, leather) + fill(`M${x - 0.5} 10 L${x + 9.5} 9 L${x + 9.7} 11.5 L${x - 0.3} 12.5 Z`, s.rarity) + fill(`M${x} 21 L${x + 9.7} 20 L${x + 9.9} 22.5 L${x + 0.1} 23.5 Z`, s.rarity);
    return one(4) + one(18) + (s.element ? dot(8.5, 16.5, 1.3, s.element) + dot(22.5, 16, 1.3, s.element) : '');
  },
  boots: (s, r) => {
    const leather = pick(LEATHER, r());
    const toe = 24 + r() * 3;
    return (
      fill(`M10 4 L18 4 L18 18 L${n(toe)} 21 Q${n(toe + 2)} 23 ${n(toe)} 27 L8 27 L10 18 Z`, leather) +
      fill('M9.5 4 L18.5 4 L18.5 7.5 L9.5 7.5 Z', s.rarity) +
      fill(`M8 25 L${n(toe + 0.5)} 25 L${n(toe)} 28 L8 28 Z`, '#3a2a1c') +
      (s.element ? dot(14, 14, 1.3, s.element) : '')
    );
  },
  sandals: (s, r) => {
    const leather = pick(LEATHER, r());
    const straps = 2 + Math.floor(r() * 2);
    let st = '';
    for (let i = 0; i < straps; i++) st += line(`M${n(8 + i * 0.5)} ${n(14 + i * 4)} L${n(24 - i * 0.5)} ${n(12 + i * 4)}`, s.rarity, 1.8);
    return fill('M9 6 Q16 3 22 6 Q25 16 22 27 Q16 30 10 27 Q7 16 9 6 Z', leather) + st + (s.element ? dot(16, 9, 1.2, s.element) : '');
  },
  ring: (s, r) => {
    const metal = pick(['#e2c25a', '#cfd4dc', '#c8955a', '#e8e2d0'], r());
    const gem = s.element ?? s.rarity;
    const cut = Math.floor(r() * 3);
    const top =
      cut === 0 ? fill('M12 4 L20 4 L22 7 L16 12 L10 7 Z', gem) : cut === 1 ? dot(16, 7, 3.6, gem) : fill('M16 2.5 L20 7 L16 11.5 L12 7 Z', gem);
    return `<circle cx="16" cy="19" r="8" fill="none" stroke="${INK}" stroke-width="4.4"/><circle cx="16" cy="19" r="8" fill="none" stroke="${metal}" stroke-width="2.8"/>` + top + line('M14 6 L15 5', '#ffffff', 0.8);
  },
  amulet: (s, r) => {
    const gem = s.element ?? s.rarity;
    const shape = Math.floor(r() * 3);
    const drop =
      shape === 0 ? fill('M16 15 L21 21 L16 28 L11 21 Z', gem) : shape === 1 ? dot(16, 21, 5, gem) : fill('M16 14 Q22 19 16 28 Q10 19 16 14 Z', gem);
    return line('M7 4 Q16 19 25 4', pick(['#e2c25a', '#cfd4dc', '#c8955a'], r()), 1.6) + fill('M14 13 L18 13 L17.5 15.5 L14.5 15.5 Z', s.rarity) + drop;
  },
  potion: (s, r) => {
    const liquid = s.liquid ?? '#d9534a';
    const round = r() > 0.4;
    const body = round ? 'M13 5 L19 5 L19 11 Q26 14 25 21 Q24 28 16 28 Q8 28 7 21 Q6 14 13 11 Z' : 'M13 5 L19 5 L19 10 L23 13 L23 27 L9 27 L9 13 L13 10 Z';
    const level = round ? 'M8 19 Q16 16 24.6 19 Q24 27.5 16 27.6 Q8 27.5 7.4 19 Z' : 'M9.4 18 L22.6 18 L22.6 26.6 L9.4 26.6 Z';
    return fill(body, '#d8e4ea', 0.35) + fill(level, liquid) + fill('M12.5 3 L19.5 3 L19.5 6 L12.5 6 Z', s.rarity) + line(round ? 'M11 15 Q10 18 10.5 21' : 'M11 15 L11 22', '#ffffff', 1);
  },
  elixir: (s, r) => {
    const liquid = s.liquid ?? '#7cc46a';
    const tall = 3 + r() * 2;
    return fill(`M14 ${n(3 + tall)} L18 ${n(3 + tall)} L18 13 L23 25 Q24 28 21 28 L11 28 Q8 28 9 25 L14 13 Z`, '#d8e4ea', 0.35) + fill('M11.2 20 L20.8 20 L23 25 Q24 28 21 28 L11 28 Q8 28 9 25 Z', liquid) + fill(`M13 ${n(1 + tall)} L19 ${n(1 + tall)} L19 ${n(4 + tall)} L13 ${n(4 + tall)} Z`, s.rarity) + dot(18, 24, 1, '#ffffff');
  },
  food: (s, r) => {
    const leaf = pick(['#7a9a4a', '#8fb05a', '#c9a96a'], r());
    const sweet = r() > 0.5;
    return sweet
      ? fill('M6 12 L22 8 L27 18 L11 23 Z', '#b77a3c') + fill('M6 12 L11 23 L11 26 L6 15 Z', '#8a5a2c') + line('M10 14 L22 11 M12 18 L24 15', '#e8c890', 1)
      : fill('M5 16 Q16 4 27 16 Q16 28 5 16 Z', leaf) + fill('M9 16 Q16 9 23 16 Q16 23 9 16 Z', '#e8d27a') + line('M5 16 L27 16', INK, 0.8) + dot(16, 16, 1, s.rarity);
  },
  fish: (s, r) => {
    const body = s.element ?? pick(['#b9c6d2', '#9fb79a', '#a8b8e0', '#e0a070', '#c8c0a0'], r());
    const fat = 5 + r() * 3;
    return fill(`M4 16 Q14 ${n(16 - fat * 1.6)} 23 16 Q14 ${n(16 + fat * 1.6)} 4 16 Z`, body) + fill('M22 16 L29 10 L28 16 L29 22 Z', body) + dot(9, 15, 1.2, INK) + line(`M14 ${n(16 - fat)} Q16 16 14 ${n(16 + fat)}`, s.rarity, 1);
  },
  scroll: (s) =>
    fill('M8 8 L22 8 Q25 8 25 11 L25 24 L11 24 Q8 24 8 21 Z', '#e8dcb8') + fill('M6 6 Q6 4 8 4 L22 4 Q24 4 24 6 L24 8 L8 8 Q6 8 6 6 Z', '#d8c898') + line('M12 13 L21 13 M12 17 L21 17 M12 21 L18 21', INK, 1) + dot(21, 22, 1.8, s.element ?? s.rarity),
  charm: (s, r) => {
    const animals = [
      'M6 9 L12 14 L20 14 L26 9 L24 19 L16 26 L8 19 Z', // zorro
      'M16 4 Q24 10 22 26 L16 22 L10 26 Q8 10 16 4 Z', // búho
      'M5 20 Q6 9 16 9 Q26 9 27 20 Z', // tortuga
    ];
    const animal = s.shape !== undefined ? animals[s.shape % animals.length]! : pick(animals, r());
    return line('M11 3 Q16 8 21 3', s.rarity, 1.4) + fill(animal, s.rarity) + dot(16, 16, 1.6, s.element ?? '#ffffff');
  },
  material: (s, r) => fill('M7 12 L25 12 L23 27 L9 27 Z', pick(LEATHER, r())) + line('M7 12 Q16 6 25 12', INK, 1.2) + line(`M11 18 L21 18`, s.rarity, 1.4),
  ore: (s, r) => {
    const rock = pick(['#8d8a84', '#7a776f', '#9a948a'], r());
    return fill('M6 22 L10 10 L18 7 L26 13 L25 24 L14 27 Z', rock) + line('M10 10 L14 18 L25 24 M14 18 L18 7', INK, 0.8) + dot(19, 15, 1.6, s.element ?? s.rarity) + dot(12, 21, 1.1, s.rarity);
  },
  hide: (s, r) => fill('M8 8 L12 6 L20 6 L24 8 L26 16 L23 26 L9 26 L6 16 Z', pick(LEATHER, r())) + line('M11 11 Q16 14 21 11 M10 19 Q16 22 22 19', INK, 0.7) + dot(16, 16, 1, s.rarity),
  fang: (s, r) => fill(`M11 5 L21 5 Q${n(21 - r() * 2)} 18 16 28 Q11 18 11 5 Z`, '#ece4d0') + fill('M10 4 L22 4 L21 7 L11 7 Z', s.rarity),
  essence: (s) => `<circle cx="16" cy="16" r="11" fill="${s.element ?? s.rarity}" fill-opacity=".2"/>` + fill('M16 4 Q24 14 16 28 Q8 14 16 4 Z', s.element ?? s.rarity) + line('M14 11 Q12 15 14 20', '#ffffff', 1),
  gem: (s, r) => {
    const g = s.element ?? s.rarity;
    const tall = r() * 3;
    return fill(`M9 ${n(10 - tall)} L23 ${n(10 - tall)} L28 15 L16 29 L4 15 Z`, g) + line(`M4 15 L28 15 M9 ${n(10 - tall)} L12 15 L16 29 L20 15 L23 ${n(10 - tall)} M12 15 L16 ${n(10 - tall)} L20 15`, INK, 0.8) + line('M11 12 L13 12', '#ffffff', 1);
  },
  key: (s, r) => {
    const metal = pick(['#e2c25a', '#9aa1ab', '#c8955a'], r());
    return `<circle cx="10" cy="10" r="5.5" fill="none" stroke="${INK}" stroke-width="4"/><circle cx="10" cy="10" r="5.5" fill="none" stroke="${metal}" stroke-width="2.4"/>` + line('M14 14 L27 27 M22 22 L25 19 M25 25 L28 22', INK, 4) + line('M14 14 L27 27 M22 22 L25 19 M25 25 L28 22', metal, 2.4) + dot(10, 10, 1.4, s.rarity);
  },
  junk: (s, r) => fill(`M10 6 L16 6 L16 19 L25 21 Q27 22 26 26 L8 26 L10 18 Z`, pick(['#7a6a5a', '#6a5a4a'], r())) + line('M11 12 L15 13 M18 24 L20 22', INK, 1) + dot(23, 23, 0.9, s.rarity),
};

/** Tinte del contenido de pociones y elixires por su efecto principal. */
export function liquidOf(def: Pick<ItemDef, 'use' | 'id'>): string | undefined {
  const use = def.use;
  if (use?.kind !== 'effects') return undefined;
  const types = use.effects.map((e) => e.type);
  if (types.includes('heal')) return '#d9534a';
  if (types.includes('restoreResource')) return '#4f8fe0';
  if (types.includes('status')) return '#7cc46a';
  return '#c25a8a'; // sin efecto directo (p. ej. el trago de pulso)
}

/** Elemento del objeto: el del arma, si no el primer daño o resistencia no física de sus modificadores. */
export function elementOf(def: Partial<Pick<ItemDef, 'weapon' | 'implicit' | 'rolls'>>): Element | null {
  if (def.weapon) return def.weapon.element === 'physical' ? null : def.weapon.element;
  for (const m of [...(def.implicit ?? []), ...(def.rolls ?? [])]) {
    const [head, el] = m.stat.split('.') as [string, Element | undefined];
    if ((head === 'damage' || head === 'resist') && el && el !== 'physical') return el;
  }
  return null;
}

/** Aro de fondo por rareza (más marcado cuanto más rara). */
function backdrop(rarity: Rarity, color: string): string {
  const strength: Record<Rarity, number> = { common: 0, uncommon: 0.08, rare: 0.12, epic: 0.16, legendary: 0.22 };
  const a = strength[rarity];
  return a > 0 ? `<circle cx="16" cy="16" r="15" fill="${color}" fill-opacity="${a}"/>` : '';
}

/** SVG del tipo `kind` con su estilo. */
export function drawKind(kind: ItemKind, style: IconStyle, rarity: Rarity = 'common'): string {
  const body = DRAW[kind](style, variant(style.seed));
  return `<svg viewBox="0 0 32 32" aria-hidden="true" data-kind="${kind}">${backdrop(rarity, style.rarity)}${body}</svg>`;
}

export const ICON_KINDS = Object.keys(DRAW) as ItemKind[];
