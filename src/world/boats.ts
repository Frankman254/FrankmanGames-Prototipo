// Lanchas: un muelle donde se sube y el sitio donde te deja. Puro.
import { Reader } from '../data/validate';

export interface Vec2 {
  x: number;
  y: number;
}

export interface BoatDef extends Vec2 {
  id: string;
  /** Lo que se lee al subir: «Lancha a Pedasol». */
  name: string;
  /** Donde aparece el jugador al llegar. */
  to: Vec2;
  /** Aviso al llegar. */
  arrive: string;
  /** Misión que abre esta lancha la primera vez. */
  requires: string | null;
  /** Aviso si aún no se puede subir. */
  waitText: string;
}

export function parseBoats(raw: unknown): BoatDef[] {
  const r = new Reader('stones.json');
  const o = r.obj(raw);
  if (o['boats'] === undefined) return [];
  const ids = new Set<string>();
  return r.arr(o, 'boats').map((b, i) => {
    const c = r.child(`boats.${i}`);
    const bo = c.obj(b);
    const id = c.str(bo, 'id');
    if (ids.has(id)) c.fail('id', `id repetido "${id}"`);
    ids.add(id);
    const tc = c.child('to');
    const to = tc.obj(bo['to']);
    return { id, name: c.str(bo, 'name'), x: c.num(bo, 'x'), y: c.num(bo, 'y'), to: { x: tc.num(to, 'x'), y: tc.num(to, 'y') }, arrive: c.str(bo, 'arrive'), requires: bo['requires'] === undefined ? null : c.str(bo, 'requires'), waitText: bo['waitText'] === undefined ? '' : c.str(bo, 'waitText') };
  });
}

/** Metros alrededor del muelle en los que un clic cuenta como «subir a la lancha». */
export const BOAT_CLICK_RADIUS = 4;
/** Metros del muelle a los que ya se sube. */
export const BOAT_BOARD_RADIUS = 1.8;

/** La lancha cuyo muelle está bajo un clic, o null. */
export function boatAt(boats: readonly BoatDef[], p: Vec2): BoatDef | null {
  let best: BoatDef | null = null;
  let bestD = BOAT_CLICK_RADIUS;
  for (const b of boats) {
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d <= bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/**
 * ¿Puede subir? La primera salida espera a su misión; quien ya pisó tierra firme
 * (conoce otra Piedra) vuelve a subir sin repetirla.
 */
export function boatOpen(b: BoatDef, questDone: (id: string) => boolean, knownStones: readonly string[], start: string): boolean {
  return b.requires === null || questDone(b.requires) || knownStones.some((s) => s !== start);
}

/** ¿Ya está el jugador en el muelle? */
export function canBoard(b: BoatDef, p: Vec2): boolean {
  return Math.hypot(b.x - p.x, b.y - p.y) <= BOAT_BOARD_RADIUS;
}
