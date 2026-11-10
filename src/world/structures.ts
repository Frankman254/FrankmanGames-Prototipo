// Estructuras del mundo abierto (casas, edificios, piedras, talleres, lanchas…) y cómo se
// asientan en el terreno. Una sola lista para tres usos: las plataformas que aplanan el
// suelo bajo cada huella (`terrain.pads`), la altura a la que se dibuja cada pieza y la
// auditoría que comprueba que ninguna queda enterrada ni flotando. Puro: sin DOM ni render.
import type { PadDef } from './terrain';

export interface Vec2 {
  x: number;
  y: number;
}

/** Reglas de asiento (data/terrain.json → structures). */
export interface StructureRules {
  /** Metros alrededor de la huella que quedan a nivel. */
  padMargin: number;
  /** Metros en los que la plataforma vuelve al relieve natural. */
  padFalloff: number;
  /** Lado mínimo de una huella para que se aplane el suelo; las menores se apoyan en su centro. */
  padMinSize: number;
  /** Huella (lado, en m) de lo que no la trae en sus datos. */
  footprints: { stone: number; station: number; resurrector: number; crypt: number };
  /** Modelos que flotan en el mar: metros del casco bajo el agua. */
  afloat: Record<string, { draft: number }>;
}

export type StructureKind = 'house' | 'landmark' | 'lamp' | 'log' | 'boulder' | 'bank' | 'crypt' | 'stone' | 'station' | 'resurrector';

/** Cómo decide su altura: plataforma aplanada, el suelo en su centro o la superficie del mar. */
export type SeatRule = 'pad' | 'point' | 'afloat';

export interface Structure {
  id: string;
  kind: StructureKind;
  model?: string;
  /** Centro y huella en X y Z del mundo. */
  x: number;
  y: number;
  w: number;
  d: number;
  /** Punto cuyo suelo fija la altura (la puerta, en las casas; si no, el centro). */
  anchor: Vec2;
  seat: SeatRule;
  /** Sólo `afloat`: metros bajo la superficie del mar. */
  draft?: number;
}

export interface StructureProp extends Vec2 {
  kind: 'landmark' | 'house' | 'log' | 'boulder' | 'lamp';
  model?: string;
  w: number;
  d: number;
  rotDeg: number;
}

export interface StructureSources {
  props: readonly StructureProp[];
  stones: readonly ({ id: string } & Vec2)[];
  stations: readonly ({ id: string } & Vec2)[];
  resurrectors: readonly ({ id: string } & Vec2)[];
  bank: Vec2 & { w: number; d: number };
  crypt: Vec2;
}

/** Punto medio del lado de la puerta de una casa (`rotDeg`: 0 = −Z, 90 = −X, 180 = +Z, 270 = +X). */
export function houseDoor(p: { x: number; y: number; w: number; d: number; rotDeg: number }): Vec2 {
  const a = (p.rotDeg * Math.PI) / 180;
  const dx = -Math.sin(a);
  const dz = -Math.cos(a);
  const half = Math.abs(dx) > 0.5 ? p.w / 2 : p.d / 2;
  return { x: p.x + dx * half, y: p.y + dz * half };
}

export function listStructures(src: StructureSources, rules: StructureRules): Structure[] {
  const out: Structure[] = [];
  const seatFor = (w: number, d: number): SeatRule => (Math.min(w, d) >= rules.padMinSize ? 'pad' : 'point');
  for (const p of src.props) {
    const id = `${p.model ?? p.kind}@${p.x},${p.y}`;
    const base = { id, kind: p.kind, x: p.x, y: p.y, w: p.w, d: p.d, ...(p.model ? { model: p.model } : {}) };
    const afloat = p.model ? rules.afloat[p.model] : undefined;
    if (afloat) out.push({ ...base, anchor: { x: p.x, y: p.y }, seat: 'afloat', draft: afloat.draft });
    else out.push({ ...base, anchor: p.kind === 'house' ? houseDoor(p) : { x: p.x, y: p.y }, seat: seatFor(p.w, p.d) });
  }
  const square = (kind: StructureKind, list: readonly ({ id: string } & Vec2)[], side: number): void => {
    for (const s of list) out.push({ id: `${kind}:${s.id}`, kind, x: s.x, y: s.y, w: side, d: side, anchor: { x: s.x, y: s.y }, seat: seatFor(side, side) });
  };
  const f = rules.footprints;
  square('stone', src.stones, f.stone);
  square('station', src.stations, f.station);
  square('resurrector', src.resurrectors, f.resurrector);
  square('crypt', [{ id: 'entrada', ...src.crypt }], f.crypt);
  const b = src.bank;
  out.push({ id: 'bank', kind: 'bank', x: b.x, y: b.y, w: b.w, d: b.d, anchor: { x: b.x, y: b.y }, seat: 'pad' });
  return out;
}

/** Plataformas de terreno de las estructuras que se asientan en suelo aplanado. */
export function structurePads(list: readonly Structure[], rules: StructureRules): PadDef[] {
  return list
    .filter((s) => s.seat === 'pad')
    .map((s) => ({ x: s.x, y: s.y, hw: s.w / 2 + rules.padMargin, hd: s.d / 2 + rules.padMargin, falloff: rules.padFalloff, ax: s.anchor.x, ay: s.anchor.y }));
}

/**
 * Altura de la base de una pieza. `ground` debe ser el terreno calculado (`terrainHeight`),
 * no el campo de alturas cargado: las páginas lejanas aún no existen al colocar las piezas.
 */
export function structureBaseY(s: Structure, ground: (x: number, z: number) => number, seaLevel: number): number {
  return s.seat === 'afloat' ? seaLevel - (s.draft ?? 0) : ground(s.anchor.x, s.anchor.y);
}

export interface StructureFit {
  structure: Structure;
  /** Altura de la base de la pieza. */
  base: number;
  /** Suelo más bajo y más alto bajo la huella (centro, lados y esquinas). */
  groundMin: number;
  groundMax: number;
  groundCenter: number;
  /** Metros que la base queda sobre el punto más bajo de la huella. */
  floating: number;
  /** Metros que el suelo sube por encima de la base en el punto más alto de la huella. */
  buried: number;
  /** Lo que se sale del umbral, en palabras; vacío si está bien. */
  problems: string[];
}

/** Muestras por lado de la huella: centro, esquinas, lados y puntos intermedios. */
const FIT_SAMPLES = 5;

/**
 * Cuánto se separa una pieza del suelo bajo su huella. `ground` es el terreno tal como se
 * dibuja; `base`, la altura a la que se coloca la pieza. Las que flotan en el mar se
 * comparan con el agua: el casco a `draft` bajo la superficie y fondo marino debajo.
 */
export function fitStructure(s: Structure, base: number, ground: (x: number, z: number) => number, seaLevel: number, tolerance: number): StructureFit {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < FIT_SAMPLES; i++) {
    for (let k = 0; k < FIT_SAMPLES; k++) {
      const h = ground(s.x + (i / (FIT_SAMPLES - 1) - 0.5) * s.w, s.y + (k / (FIT_SAMPLES - 1) - 0.5) * s.d);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  }
  const problems: string[] = [];
  let floating = base - lo;
  let buried = hi - base;
  const m = (v: number): string => v.toFixed(2).replace('.', ',');
  if (s.seat === 'afloat') {
    const keel = seaLevel - (s.draft ?? 0);
    floating = base - keel;
    buried = keel - base;
    if (floating > tolerance) problems.push(`flota ${m(floating)} m sobre el agua`);
    if (buried > tolerance) problems.push(`hundida ${m(buried)} m bajo el agua`);
    if (hi > keel) problems.push(`hay tierra bajo el casco (suelo ${m(hi - seaLevel)} m sobre el mar)`);
  } else {
    if (floating > tolerance) problems.push(`flota ${m(floating)} m`);
    if (buried > tolerance) problems.push(`enterrada ${m(buried)} m`);
    if (base < seaLevel) problems.push(`base ${m(seaLevel - base)} m bajo el mar`);
  }
  return { structure: s, base, groundMin: lo, groundMax: hi, groundCenter: ground(s.x, s.y), floating, buried, problems };
}
